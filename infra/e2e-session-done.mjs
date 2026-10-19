// End-to-end check: when the TV ends a workout (its coach request), the relay tells the phone,
// so the phone can stop its camera and go back to its start screen.
// Usage: node e2e-session-done.mjs wss://<api>.execute-api.<region>.amazonaws.com/live
import WebSocket from "ws";

const url = process.argv[2];
const open = (query) =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(`${url}?${query}`);
    ws.once("open", () => resolve(ws));
    ws.once("error", reject);
  });
// Waits for the first message that matches, ignoring others (the phone also gets pongs and status).
const waitFor = (ws, match, ms) =>
  new Promise((resolve) => {
    const timer = setTimeout(() => {
      ws.off("message", onMessage);
      resolve(null);
    }, ms);
    const onMessage = (d) => {
      const msg = JSON.parse(d);
      if (!match(msg)) return;
      clearTimeout(timer);
      ws.off("message", onMessage);
      resolve(msg);
    };
    ws.on("message", onMessage);
  });

const coachRequest = {
  action: "coach",
  exercise: "squat",
  reps: 6,
  summary: {
    headline: "6 squats done",
    insights: ["Steady pace: 2.1 s per rep."],
    next: "Next time: 6 squats, every rep to full depth.",
    target: 6,
  },
};

const results = [];
const check = (name, pass, detail = "") => results.push({ name, pass, detail });

const tv = await open("role=tv");
tv.send(JSON.stringify({ action: "host" }));
const { code } = await waitFor(tv, (m) => m.type === "session", 5000);
const phone = await open(`role=phone&code=${code}`);

const phoneDone = waitFor(phone, (m) => m.type === "session-done", 5000);
const tvCoach = waitFor(tv, (m) => m.type === "coach", 15000);
tv.send(JSON.stringify(coachRequest));
check("phone hears the session is done", (await phoneDone) !== null);
check("TV still gets its coach reply", (await tvCoach) !== null);

// A second finish inside the coach cooldown gets no AI reply, but the phone must still hear it.
const again = waitFor(phone, (m) => m.type === "session-done", 5000);
tv.send(JSON.stringify(coachRequest));
check("phone hears a finish inside the coach cooldown", (await again) !== null);

// Only the TV can end a session.
const tvGot = waitFor(tv, (m) => m.type === "session-done", 3000);
const phoneGot = waitFor(phone, (m) => m.type === "session-done", 3000);
phone.send(JSON.stringify(coachRequest));
check("a phone cannot end the session", (await tvGot) === null && (await phoneGot) === null);

phone.close();
tv.close();
for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  (${r.detail})` : ""}`);
process.exit(results.every((r) => r.pass) ? 0 : 1);
