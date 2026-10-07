// End-to-end check of the between-set coach (docs/set-coach.md), against the deployed stack:
// a TV asks for a line during a rest, the relay rewrites and voices it, the site serves the clip.
// Usage: node e2e-set-coach.mjs <relay wss url> <phone site url>
import WebSocket from "ws";

const [relayUrl, siteUrl] = process.argv.slice(2);
if (!relayUrl || !siteUrl) {
  console.error("usage: node e2e-set-coach.mjs <wss url> <site url>");
  process.exit(2);
}

const open = (query) =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(`${relayUrl}?${query}`);
    ws.once("open", () => resolve(ws));
    ws.once("error", reject);
  });
const next = (ws, ms) =>
  new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    ws.once("message", (d) => {
      clearTimeout(timer);
      resolve(JSON.parse(d));
    });
  });

const request = {
  action: "set-coach",
  exercise: "squat",
  set: 2,
  sets: 3,
  focus: "depth",
  line: "Your depth faded from 88° to 99°. Next set: hold your depth to the last rep.",
  facts: { reps: 12, target: 12, shallow: 0, rushed: 0, leftFrame: 0, depthFirst: 88, depthLast: 99 },
  name: "Ramy",
};

const results = [];
const check = (name, pass, detail = "") => results.push({ name, pass, detail });

const tv = await open("role=tv");
tv.send(JSON.stringify({ action: "host" }));
const { code } = await next(tv, 5000);

const started = Date.now();
tv.send(JSON.stringify(request));
const reply = await next(tv, 15000);
check("TV gets a set-coach reply for the same set", reply?.type === "set-coach" && reply.set === 2, `${Date.now() - started} ms`);
if (reply?.line) {
  console.log(`line: ${reply.line}`);
  check("reply keeps the numbers", /88/.test(reply.line) && /99/.test(reply.line), reply.line);
  check("the model never saw the name", !/Ramy/.test(reply.line), reply.line);
  check("reply has a clip id", /^line-[0-9a-f]{16}$/.test(reply.clip ?? ""), reply.clip);
  if (reply.clip) {
    const res = await fetch(new URL(`audio/${reply.clip}.mp3`, siteUrl));
    const bytes = (await res.arrayBuffer()).byteLength;
    check("site serves the clip", res.status === 200 && res.headers.get("content-type") === "audio/mpeg" && bytes > 1000, `${res.status} ${bytes} bytes`);
  }
} else {
  check("reply line is null (model rejected or failed; TV keeps its line)", reply?.line === null);
}

const missing = await fetch(new URL("audio/line-0000000000000000.mp3", siteUrl));
check("site: a line never made is a 404", missing.status === 404, String(missing.status));

tv.send(JSON.stringify(request));
check("second request inside the cooldown gets no answer", (await next(tv, 4000)) === null);

const phone = await open(`role=phone&code=${code}`);
phone.send(JSON.stringify(request));
check("a phone can't ask for a line", (await next(phone, 4000)) === null);

phone.close();
tv.close();
for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  (${r.detail})` : ""}`);
const ok = results.every((r) => r.pass);
console.log(ok ? "PASS" : "FAIL");
process.exit(ok ? 0 : 1);
