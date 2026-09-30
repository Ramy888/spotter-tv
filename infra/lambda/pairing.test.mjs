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
});

test("parseMessage rejects malformed or oversized input", () => {
  assert.equal(parseMessage("not json"), null);
  assert.equal(parseMessage(undefined), null);
  assert.equal(parseMessage(frame({ kp: [[0, 0, 0]] })), null);
  assert.equal(parseMessage(frame({ kp: Array.from({ length: 33 }, () => [0, "x", 0]) })), null);
  assert.equal(parseMessage(frame({ kp: Array.from({ length: 33 }, () => [0, 0]) })), null);
  assert.equal(parseMessage("x".repeat(MAX_FRAME_BYTES + 1)), null);
});
