import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMessages, parseCoachRequest, validateCoachReply } from "./coach.mjs";

const facts = {
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

const good = {
  headline: "Strong set, six squats!",
  insights: ["You went from 86° to 102° as you tired, so take 30 s before the next set.", "Your 2.1 s pace was nice and steady."],
  next: "Next session, aim for 6 squats with every rep reaching full depth.",
  target: 6,
};

test("parseCoachRequest accepts a well-formed request and rejects bad ones", () => {
  assert.deepEqual(parseCoachRequest({ action: "coach", ...facts }), facts);
  assert.equal(parseCoachRequest({ ...facts, exercise: "deadlift" }), null);
  assert.equal(parseCoachRequest({ ...facts, reps: -1 }), null);
  assert.equal(parseCoachRequest({ ...facts, summary: { ...facts.summary, insights: Array(5).fill("x") } }), null);
  assert.equal(parseCoachRequest({ ...facts, summary: { ...facts.summary, headline: "x".repeat(61) } }), null);
  assert.equal(parseCoachRequest({ ...facts, summary: { ...facts.summary, target: 2.5 } }), null);
});

test("buildMessages puts the facts in the user message and the rules in the system message", () => {
  const [system, user] = buildMessages(facts);
  assert.match(system.content, /never add numbers/);
  assert.deepEqual(JSON.parse(user.content), facts);
});

test("validateCoachReply accepts a faithful rewrite and keeps the original target", () => {
  assert.deepEqual(validateCoachReply(good, facts), good);
});

test("rejects invented numbers (the real failure: 'target 95', 'below 90 degrees')", () => {
  assert.equal(validateCoachReply({ ...good, insights: ["Most reps reached below 90 degrees."] }, facts), null);
  assert.equal(validateCoachReply({ ...good, next: "Next time, do 95 squats." }, facts), null);
});

test("rejects a reply that drops a number the rule-based insights gave (less informative)", () => {
  const terse = { ...good, insights: ["Depth faded to 102°.", "Steady pace: 2.1 s."] };
  assert.equal(validateCoachReply(terse, facts), null);
});

test("rejects a reply that drops the target from the next-session line", () => {
  assert.equal(validateCoachReply({ ...good, next: "Next time, keep going strong!" }, facts), null);
});

test("rejects weights, equipment and medical talk", () => {
  assert.equal(validateCoachReply({ ...good, next: "Next time: 6 squats holding weights." }, facts), null);
  assert.equal(validateCoachReply({ ...good, insights: ["See a doctor if your knees hurt."] }, facts), null);
});

test("rejects malformed or oversized replies", () => {
  assert.equal(validateCoachReply(null, facts), null);
  assert.equal(validateCoachReply("text", facts), null);
  assert.equal(validateCoachReply({ ...good, insights: [] }, facts), null);
  assert.equal(validateCoachReply({ ...good, headline: "x".repeat(61) }, facts), null);
});
