// End-to-end check of the TV's live progress reaching the phone, against the deployed relay:
// rep count with the set, the rest countdown, and invalid updates dropped.
// Usage: node e2e-status.mjs <relay wss url>
import WebSocket from "ws";

const relayUrl = process.argv[2];
if (!relayUrl) {
  console.error("usage: node e2e-status.mjs <wss url>");
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

tv.ws.send(JSON.stringify({ action: "status", reps: 7, exercise: "squat", set: 2, sets: 3, stage: "set" }));
const working = await waitFor(phone.inbox, (m) => m.type === "status" && m.reps === 7, "set status");
check("phone gets reps with the set", working.set === 2 && working.sets === 3 && working.stage === "set", JSON.stringify(working));

tv.ws.send(JSON.stringify({ action: "status", reps: 12, exercise: "squat", set: 2, sets: 3, stage: "rest", restLeft: 45 }));
const resting = await waitFor(phone.inbox, (m) => m.type === "status" && m.stage === "rest", "rest status");
check("phone gets the rest countdown", resting.restLeft === 45, JSON.stringify(resting));

tv.ws.send(JSON.stringify({ action: "status", reps: 1, exercise: "squat", set: 5, sets: 3, stage: "set" }));
tv.ws.send(JSON.stringify({ action: "status", reps: 2, exercise: "squat", set: 1, sets: 3, stage: "set" }));
await waitFor(phone.inbox, (m) => m.type === "status" && m.reps === 2, "marker status");
check("an impossible set is dropped", !phone.inbox.some((m) => m.type === "status" && m.reps === 1));

// Only a TV can send status.
phone.ws.send(JSON.stringify({ action: "status", reps: 99, exercise: "squat" }));
await new Promise((r) => setTimeout(r, 1500));
check("a phone cannot send status", !phone.inbox.some((m) => m.reps === 99) && !tv.inbox.some((m) => m.reps === 99));

tv.ws.close();
phone.ws.close();
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}  ${r.detail}`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
