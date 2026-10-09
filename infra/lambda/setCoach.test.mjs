import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildLineMessages,
  lineRejectionReason,
  parseLineClipPath,
  parseSetCoachRequest,
  spokenLine,
} from "./setCoach.mjs";

const request = {
  action: "set-coach",
  exercise: "squat",
  set: 2,
  sets: 3,
  focus: "depth",
  line: "Your depth faded from 88° to 99°. Next set: hold your depth to the last rep.",
  facts: { reps: 12, target: 12, shallow: 0, rushed: 1, leftFrame: 0, depthFirst: 88, depthLast: 99 },
  name: "Ramy",
};
const req = parseSetCoachRequest(request);

test("parseSetCoachRequest keeps the facts and sets the name apart", () => {
  assert.deepEqual(req, {
    exercise: "squat",
    set: 2,
    sets: 3,
    focus: "depth",
    line: request.line,
    facts: request.facts,
    name: "Ramy",
  });
  assert.equal(parseSetCoachRequest({ ...request, name: "Player 2" }).name, null);
  assert.equal(parseSetCoachRequest({ ...request, name: "Mo Salah" }).name, null);
});

test("parseSetCoachRequest rejects anything malformed", () => {
  for (const bad of [
    { exercise: "deadlift" },
    { focus: "speed" },
    { set: 1 },
    { set: 4 },
    { line: "" },
    { line: "x".repeat(161) },
    { facts: { ...request.facts, reps: -1 } },
    { facts: { ...request.facts, depthFirst: "88" } },
    { facts: null },
  ]) {
    assert.equal(parseSetCoachRequest({ ...request, ...bad }), null, JSON.stringify(bad));
  }
});

test("the model never sees the player's name", () => {
  const text = JSON.stringify(buildLineMessages(req));
  assert.doesNotMatch(text, /Ramy/);
  assert.match(text, /88° to 99°/);
  assert.doesNotMatch(text, /nextSet|"sets"/); // set numbers read awkwardly when the model weaves them in
});

test("lineRejectionReason accepts a faithful rewrite", () => {
  assert.equal(
    lineRejectionReason({ line: "You slipped from 88° to 99° by the end; next set, hold that depth to the very last rep." }, req),
    null,
  );
});

test("lineRejectionReason counts a number written as a word ('Two reps' keeps the 2)", () => {
  const shallow = parseSetCoachRequest({
    ...request,
    line: "2 reps didn't reach full depth. Next set: every rep all the way down.",
    facts: { reps: 14, target: 14, shallow: 2, rushed: 0, leftFrame: 0, depthFirst: null, depthLast: null },
  });
  assert.equal(lineRejectionReason({ line: "Two reps stopped short, so take every rep all the way down next set." }, shallow), null);
  assert.equal(lineRejectionReason({ line: "Three reps stopped short; go all the way down." }, shallow), "invented number 3");
});

test("lineRejectionReason refuses invented or dropped numbers, banned topics and long lines", () => {
  assert.equal(lineRejectionReason({ line: "From 88° to 99°: do 15 more reps next set." }, req), "invented number 15");
  assert.equal(lineRejectionReason({ line: "Your depth faded to 99°; hold it next set." }, req), "dropped number 88");
  assert.equal(lineRejectionReason({ line: "From 88° to 99°, add some weights next set." }, req), "banned topic: weights");
  assert.equal(lineRejectionReason({ line: `From 88° to 99° ${"go ".repeat(24)}` }, req), "too many words");
  assert.equal(lineRejectionReason({ line: "x".repeat(161) }, req), "line missing or too long");
  assert.equal(lineRejectionReason("From 88° to 99°", req), "not an object");
});

test("spokenLine puts the name in front", () => {
  assert.equal(spokenLine("Your depth faded.", "Ramy"), "Ramy, your depth faded.");
  assert.equal(spokenLine("I saw 2 shallow reps.", "Ramy"), "Ramy, I saw 2 shallow reps.");
  assert.equal(spokenLine(" Your depth faded. ", null), "Your depth faded.");
  assert.equal(spokenLine("From 88° to 99 °.", null), "From 88 degrees to 99 degrees.");
});

test("parseLineClipPath only accepts a random line id", () => {
  assert.equal(parseLineClipPath("/audio/line-0123456789abcdef.mp3"), "line-0123456789abcdef");
  assert.equal(parseLineClipPath("/audio/line-0123.mp3"), null);
  assert.equal(parseLineClipPath("/audio/line-0123456789ABCDEF.mp3"), null);
  assert.equal(parseLineClipPath("/audio/name/start/Ramy.mp3"), null);
});
