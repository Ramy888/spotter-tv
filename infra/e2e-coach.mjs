// End-to-end check of the AI coach through the deployed relay.
// Usage: node e2e-coach.mjs wss://<api>.execute-api.<region>.amazonaws.com/live
import WebSocket from "ws";

const url = process.argv[2];
const open = (query) =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(`${url}?${query}`);
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
  action: "coach",
  exercise: "squat",
  reps: 6,
  summary: {
    headline: "6 squats done",
    insights: [
      "Your depth faded in the second half (86° → 102° at the bottom). That's fatigue: rest 30 s before the next set.",
      "Steady pace: 2.1 s per rep.",
    ],
    next: "Next time: 6 squats, every rep to full depth.",
    target: 6,
  },
};

const results = [];
const check = (name, pass, detail = "") => results.push({ name, pass, detail });

const tv = await open("role=tv");
tv.send(JSON.stringify({ action: "host" }));
const { code } = await next(tv, 5000);

const started = Date.now();
tv.send(JSON.stringify(request));
const reply = await next(tv, 15000);
const ms = Date.now() - started;
check("TV gets a coach reply", reply?.type === "coach", `${ms} ms, provider ${reply?.provider}`);
if (reply?.summary) {
  check("reply keeps the target", reply.summary.target === 6, reply.summary.next);
  check("reply has 1-4 insights", reply.summary.insights.length >= 1 && reply.summary.insights.length <= 4);
  console.log(JSON.stringify(reply.summary, null, 2));
} else {
  check("reply summary present (or rejected by validation)", reply?.summary === null, "model output rejected; TV keeps rule-based");
}

tv.send(JSON.stringify(request));
check("second request inside the cooldown gets no answer", (await next(tv, 4000)) === null);

const phone = await open(`role=phone&code=${code}`);
phone.send(JSON.stringify(request));
check("a phone cannot request coaching", (await next(phone, 4000)) === null);

phone.close();
tv.close();
for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  (${r.detail})` : ""}`);
process.exit(results.every((r) => r.pass) ? 0 : 1);
