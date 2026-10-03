// End-to-end check of typing the player's name on the phone, against the deployed relay:
// the TV opens its name prompt, the phone gets it, the phone answers, the TV gets the name.
// Usage: node e2e-name-prompt.mjs <relay wss url>
import WebSocket from "ws";

const relayUrl = process.argv[2];
if (!relayUrl) {
  console.error("usage: node e2e-name-prompt.mjs <wss url>");
  process.exit(2);
}

const open = (url) =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const inbox = [];
    ws.on("message", (d) => inbox.push(JSON.parse(String(d))));
    ws.on("open", () => resolve({ ws, inbox }));
    ws.on("error", reject);
  });
const waitFor = async (inbox, pred, what) => {
  for (let i = 0; i < 100; i++) {
    const hit = inbox.find(pred);
    if (hit) return hit;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`timed out waiting for ${what}`);
};
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok, detail });

const tv = await open(`${relayUrl}?role=tv`);
tv.ws.send(JSON.stringify({ action: "host" }));
const { code } = await waitFor(tv.inbox, (m) => m.type === "session", "session");
const phone = await open(`${relayUrl}?role=phone&code=${code}`);

tv.ws.send(JSON.stringify({ action: "name-prompt", open: true }));
const prompt = await waitFor(phone.inbox, (m) => m.type === "name-prompt", "prompt on phone");
check("phone gets the TV's name prompt", prompt.open === true, JSON.stringify(prompt));

phone.ws.send(JSON.stringify({ action: "name", name: "Mo Salah" })); // dropped: no spaces in a name
phone.ws.send(JSON.stringify({ action: "name", name: "  Salah " }));
const named = await waitFor(tv.inbox, (m) => m.type === "name", "name on TV");
check("TV gets the name, trimmed (and not the one with a space)", named.name === "Salah", JSON.stringify(named));

phone.ws.send(JSON.stringify({ action: "name", name: "x".repeat(40) }));
tv.ws.send(JSON.stringify({ action: "name-prompt", open: false }));
await waitFor(phone.inbox, (m) => m.type === "name-prompt" && m.open === false, "prompt closed");
check("an over-long name is dropped", tv.inbox.filter((m) => m.type === "name").length === 1);

// A TV can't send itself a "name" (only a paired phone can).
tv.ws.send(JSON.stringify({ action: "name", name: "Spoof" }));
await new Promise((r) => setTimeout(r, 1500));
check("a TV cannot inject a name", !tv.inbox.some((m) => m.type === "name" && m.name === "Spoof"));

tv.ws.close();
phone.ws.close();
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}  ${r.detail}`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
