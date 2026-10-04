import { test } from "node:test";
import assert from "node:assert/strict";
import { CODE_ALPHABET, CODE_LENGTH, MAX_FRAME_BYTES, isValidCode, newPairingCode, parseMessage } from "./pairing.mjs";

const frame = (overrides = {}) =>
  JSON.stringify({ kp: Array.from({ length: 33 }, () => [0.5, 0.5, 0.9]), sentTs: 12.5, ...overrides });

test("generated codes use only the unambiguous alphabet and the right length", () => {
  for (let i = 0; i < 1000; i++) {
    const code = newPairingCode();
    assert.equal(code.length, CODE_LENGTH);
    assert.ok(isValidCode(code), code);
  }
  assert.ok(!/[01OIL]/.test(CODE_ALPHABET));
});

test("isValidCode rejects wrong length, ambiguous characters and non-strings", () => {
  assert.equal(isValidCode("ABC23"), false);
  assert.equal(isValidCode("ABC0DE"), false);
  assert.equal(isValidCode("abcdef"), false);
  assert.equal(isValidCode(undefined), false);
  assert.equal(isValidCode(123456), false);
});

test("parseMessage accepts a host request and a well-formed pose frame", () => {
  assert.deepEqual(parseMessage('{"action":"host"}'), { type: "host" });
  const parsed = parseMessage(frame());
  assert.equal(parsed.type, "frame");
  assert.equal(parsed.kp.length, 33);
  assert.equal(parsed.sentTs, 12.5);
  assert.equal(parseMessage(frame({ t: 1234 })).t, 1234);
  assert.equal(parseMessage(frame({ t: "soon" })).t, undefined);
});

test("parseMessage rejects malformed or oversized input", () => {
  assert.equal(parseMessage("not json"), null);
  assert.equal(parseMessage(undefined), null);
  assert.equal(parseMessage(frame({ kp: [[0, 0, 0]] })), null);
  assert.equal(parseMessage(frame({ kp: Array.from({ length: 33 }, () => [0, "x", 0]) })), null);
  assert.equal(parseMessage(frame({ kp: Array.from({ length: 33 }, () => [0, 0]) })), null);
  assert.equal(parseMessage("x".repeat(MAX_FRAME_BYTES + 1)), null);
});

test("parseMessage accepts a say request with valid clip ids only", () => {
  assert.deepEqual(parseMessage('{"action":"say","clips":["count-5","praise-3"]}'), { type: "say", clips: ["count-5", "praise-3"] });
  assert.equal(parseMessage('{"action":"say","clips":[]}'), null);
  assert.equal(parseMessage('{"action":"say","clips":["a","b","c","d"]}'), null);
  assert.equal(parseMessage('{"action":"say","clips":["../etc/passwd"]}'), null);
  assert.equal(parseMessage('{"action":"say","clips":["Count-5"]}'), null);
  assert.equal(parseMessage('{"action":"say","clips":"count-5"}'), null);
});

test("parseMessage accepts a status update with a valid rep count and exercise only", () => {
  assert.deepEqual(parseMessage('{"action":"status","reps":7,"exercise":"squat"}'), { type: "status", reps: 7, exercise: "squat" });
  assert.equal(parseMessage('{"action":"status","reps":-1,"exercise":"squat"}'), null);
  assert.equal(parseMessage('{"action":"status","reps":2.5,"exercise":"squat"}'), null);
  assert.equal(parseMessage('{"action":"status","reps":3,"exercise":"<b>hi</b>"}'), null);
});

test("parseMessage accepts a voice-name request only for a speakable name", () => {
  assert.deepEqual(parseMessage('{"action":"voice-name","name":"Ramy"}'), { type: "voice-name", name: "Ramy" });
  assert.equal(parseMessage('{"action":"voice-name","name":"Player 1"}'), null);
  assert.equal(parseMessage('{"action":"voice-name","name":"Say something very rude"}'), null); // spaces
  assert.equal(parseMessage('{"action":"voice-name"}'), null);
});

test("parseMessage accepts the TV's name prompt (open or closed) and nothing else", () => {
  assert.deepEqual(parseMessage('{"action":"name-prompt","open":true}'), { type: "name-prompt", open: true });
  assert.deepEqual(parseMessage('{"action":"name-prompt","open":false}'), { type: "name-prompt", open: false });
  assert.equal(parseMessage('{"action":"name-prompt","open":"yes"}'), null);
});

test("parseMessage accepts a name typed on the phone, tidied, in any script", () => {
  assert.deepEqual(parseMessage('{"action":"name","name":"  Salah "}'), { type: "name", name: "Salah" });
  assert.equal(parseMessage('{"action":"name","name":"Mo Salah"}'), null); // no spaces in a name
  assert.deepEqual(parseMessage(JSON.stringify({ action: "name", name: "رامي" })), { type: "name", name: "رامي" });
  assert.equal(parseMessage('{"action":"name","name":"   "}'), null);
  assert.equal(parseMessage('{"action":"name","name":"Abcdefghijklmnopq"}'), null); // 17 letters
  assert.equal(parseMessage('{"action":"name","name":"a\\u0007b"}'), null);
  assert.equal(parseMessage('{"action":"name","name":42}'), null);
});

test("parseMessage passes set and rest progress in a status update, and drops bad values", () => {
  assert.deepEqual(
    parseMessage('{"action":"status","reps":7,"exercise":"squat","set":2,"sets":3,"stage":"rest","restLeft":45}'),
    { type: "status", reps: 7, exercise: "squat", set: 2, sets: 3, stage: "rest", restLeft: 45 },
  );
  // Old TVs send only reps and exercise.
  assert.deepEqual(parseMessage('{"action":"status","reps":7,"exercise":"squat"}'), { type: "status", reps: 7, exercise: "squat" });
  assert.equal(parseMessage('{"action":"status","reps":7,"exercise":"squat","set":0,"sets":3}'), null);
  assert.equal(parseMessage('{"action":"status","reps":7,"exercise":"squat","set":4,"sets":3}'), null);
  assert.equal(parseMessage('{"action":"status","reps":7,"exercise":"squat","stage":"nap"}'), null);
  assert.equal(parseMessage('{"action":"status","reps":7,"exercise":"squat","stage":"rest","restLeft":9999}'), null);
});
