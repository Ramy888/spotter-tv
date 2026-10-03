import { test } from "node:test";
import assert from "node:assert/strict";
import { NAME_TEMPLATES, isSpokenName, nameClipKey, parseNameClipPath, phraseFor, quotaKey } from "./voiceNames.mjs";

// Same vectors as tv-app/test/profiles.spec.ts (spokenName), so the TV and the server agree.
test("speaks real Latin names only", () => {
  assert.equal(isSpokenName("Ramy"), true);
  assert.equal(isSpokenName("O'Neil"), true);
  assert.equal(isSpokenName("Mary-Jo"), true);
  assert.equal(isSpokenName("Player 2"), false);
  assert.equal(isSpokenName("رامي"), false);
  assert.equal(isSpokenName("R2D2"), false);
  assert.equal(isSpokenName("Abcdefghijklmnopq"), false); // 17 letters
  assert.equal(isSpokenName("Mo Salah"), false); // no spaces in a name
  assert.equal(isSpokenName(undefined), false);
});

test("phrases come only from the fixed templates", () => {
  assert.equal(phraseFor("start", "Ramy"), "Let's go, Ramy!");
  for (const template of Object.keys(NAME_TEMPLATES)) assert.match(phraseFor(template, "Mo"), /Mo/);
  assert.equal(nameClipKey("last", "Salah"), "NAMECLIP#last#Salah");
  assert.equal(quotaKey(new Date("2026-10-01T23:00:00Z")), "QUOTA#polly#2026-10-01");
});

test("parses a name clip path, decoding the name", () => {
  assert.deepEqual(parseNameClipPath("/audio/name/start/Ramy.mp3"), { template: "start", name: "Ramy" });
  assert.deepEqual(parseNameClipPath("/audio/name/last/Mary-Jo.mp3"), { template: "last", name: "Mary-Jo" });
  assert.equal(parseNameClipPath("/audio/name/last/Mo%20Salah.mp3"), null); // no spaces in a name
  assert.deepEqual(parseNameClipPath("/audio/name/finish/O'Neil.mp3"), { template: "finish", name: "O'Neil" });
});

test("rejects unknown templates, bad names and broken encoding", () => {
  assert.equal(parseNameClipPath("/audio/name/hello/Ramy.mp3"), null);
  assert.equal(parseNameClipPath("/audio/name/constructor/Ramy.mp3"), null);
  assert.equal(parseNameClipPath("/audio/name/start/Player%202.mp3"), null);
  assert.equal(parseNameClipPath("/audio/name/start/%E0%A4%A.mp3"), null);
  assert.equal(parseNameClipPath("/audio/name/start/..%2Fx.mp3"), null);
  assert.equal(parseNameClipPath("/audio/start-1.mp3"), null);
});
