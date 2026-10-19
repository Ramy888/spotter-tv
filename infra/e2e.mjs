// End-to-end check against the deployed relay: pairing, forwarding, latency, and rejection rules.
// Usage: node e2e.mjs wss://<api>.execute-api.<region>.amazonaws.com/live
import WebSocket from "ws";

const url = process.argv[2];
if (!url) throw new Error("usage: node e2e.mjs <relay wss url>");

const open = (query) =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(`${url}?${query}`);
    ws.once("open", () => resolve(ws));
    ws.once("unexpected-response", (_req, res) => reject(new Error(`HTTP ${res.statusCode}`)));
    ws.once("error", reject);
  });
const nextMessage = (ws) => new Promise((resolve) => ws.once("message", (d) => resolve(JSON.parse(d))));
const pct = (xs, p) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length * p)];
const results = [];
const check = (name, pass, detail = "") => results.push({ name, pass, detail });

const tv = await open("role=tv");
tv.send(JSON.stringify({ action: "host" }));
const { code } = await nextMessage(tv);
check("TV gets a pairing code", /^[A-Z2-9]{6}$/.test(code), code);

await open("role=phone&code=ZZZZZZ").then(
  (ws) => { check("unknown code is rejected", false); ws.close(); },
  (err) => check("unknown code is rejected", true, err.message),
);

const phone = await open(`role=phone&code=${code}`);
check("phone pairs with the code", true);

await open(`role=phone&code=${code}`).then(
  (ws) => { check("second phone on the same code is rejected", false); ws.close(); },
  (err) => check("second phone on the same code is rejected", true, err.message),
);

// Stream 15 frames/s for 10 s (the rate the phone page will use over the internet).
const endToEnd = [];
const rtt = [];
let received = 0;
let malformedLeaked = false;
let awayReceived = false;
tv.on("message", (d) => {
  const msg = JSON.parse(d);
  if (msg.kp?.length !== 33) return;
  if (msg.kp[0][0] === -1) malformedLeaked = true;
  if (msg.kp.every((p) => p[0] === 0 && p[1] === 0 && p[2] === 0)) { awayReceived = true; return; }
  received++;
  endToEnd.push(performance.now() - msg.kp[0][1] * 1e6);
});
phone.on("message", (d) => {
  const { pong } = JSON.parse(d);
  if (pong !== undefined) rtt.push(performance.now() - pong);
});

const kp = () => Array.from({ length: 33 }, () => [0.5, 0.5, 0.9]);
let sent = 0;
await new Promise((resolve) => {
  const iv = setInterval(() => {
    const now = performance.now();
    const frame = kp();
    frame[0][1] = now / 1e6; // stash the send time inside the frame to time phone -> TV
    phone.send(JSON.stringify({ kp: frame, sentTs: now }));
    sent++;
  }, 1000 / 15);
  setTimeout(() => { clearInterval(iv); resolve(); }, 10_000);
});

phone.send(JSON.stringify({ kp: [[-1, 0, 0]] })); // wrong shape: must not reach the TV
await new Promise((r) => setTimeout(r, 1500));

check("frames delivered to TV", received >= sent * 0.98, `${received}/${sent}`);
check("malformed frame is dropped", !malformedLeaked);
check("phone -> TV latency p50 < 250 ms", pct(endToEnd, 0.5) < 250,
  `p50 ${pct(endToEnd, 0.5).toFixed(0)} ms, p95 ${pct(endToEnd, 0.95).toFixed(0)} ms`);
check("phone round trip measured", rtt.length > 0, `p50 ${pct(rtt, 0.5)?.toFixed(0)} ms`);

// Nobody in view: the phone sends every joint invisible so the TV knows it is still there.
phone.send(JSON.stringify({ t: 1, kp: Array.from({ length: 33 }, () => [0, 0, 0]) }));
await new Promise((r) => setTimeout(r, 1500));
check("an empty frame (nobody in view) reaches the TV", awayReceived);

const tvLeft = nextMessage(phone).catch(() => null);
tv.close();
phone.send(JSON.stringify({ kp: kp() }));
const notice = await Promise.race([tvLeft, new Promise((r) => setTimeout(() => r(null), 5000))]);
check("phone is told when the TV leaves", notice?.type === "tv-left", JSON.stringify(notice));
phone.close();

for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  (${r.detail})` : ""}`);
process.exit(results.every((r) => r.pass) ? 0 : 1);
