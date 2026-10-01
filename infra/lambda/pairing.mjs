// Pure pairing and validation rules for the Spotter relay. No AWS calls here, so this is unit-testable.
import { randomInt } from "node:crypto";
import { isSpokenName } from "./voiceNames.mjs";

// No 0/O/1/I/L: codes are read off a TV screen and typed or scanned on a phone.
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 6;
export const SESSION_TTL_SECONDS = 2 * 60 * 60;
export const POSE_KEYPOINTS = 33;
export const MAX_FRAME_BYTES = 4096;
// Voice clip ids, e.g. "count-12", "praise-3" (see voice/make-voice.mjs).
export const CLIP_ID = /^[a-z][a-z0-9-]{0,31}$/;
const STATUS_EXERCISES = new Set(["squat", "lunge", "jumping-jack"]);
export const MAX_NAME_LENGTH = 16;

// A display name typed on the phone: 1-16 characters after trimming, no control characters.
// Any script is fine for display; the TV decides separately whether the voice can say it.
function typedName(value) {
  if (typeof value !== "string") return null;
  const name = value.replace(/\s+/g, " ").trim();
  // eslint-disable-next-line no-control-regex
  return name.length >= 1 && [...name].length <= MAX_NAME_LENGTH && !/[\u0000-\u001f\u007f]/.test(name) ? name : null;
}

export function newPairingCode() {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

export function isValidCode(code) {
  return (
    typeof code === "string" &&
    code.length === CODE_LENGTH &&
    [...code].every((c) => CODE_ALPHABET.includes(c))
  );
}

// Returns { type: "host" }, { type: "frame", kp, sentTs? }, or null for anything else.
// A pose frame is exactly 33 [x, y, visibility] triples of finite numbers.
export function parseMessage(body) {
  if (typeof body !== "string" || body.length > MAX_FRAME_BYTES) return null;
  let msg;
  try {
    msg = JSON.parse(body);
  } catch {
    return null;
  }
  if (msg?.action === "host") return { type: "host" };
  if (msg?.action === "coach") return { type: "coach", msg };
  if (msg?.action === "status") {
    const ok = Number.isInteger(msg.reps) && msg.reps >= 0 && msg.reps <= 1000 && STATUS_EXERCISES.has(msg.exercise);
    return ok ? { type: "status", reps: msg.reps, exercise: msg.exercise } : null;
  }
  if (msg?.action === "name-prompt") return typeof msg.open === "boolean" ? { type: "name-prompt", open: msg.open } : null;
  if (msg?.action === "name") {
    const name = typedName(msg.name);
    return name ? { type: "name", name } : null;
  }
  if (msg?.action === "voice-name") return isSpokenName(msg.name) ? { type: "voice-name", name: msg.name } : null;
  if (msg?.action === "say") {
    const clips = msg.clips;
    const ok = Array.isArray(clips) && clips.length > 0 && clips.length <= 3 && clips.every((c) => CLIP_ID.test(c));
    return ok ? { type: "say", clips } : null;
  }
  const kp = msg?.kp;
  if (!Array.isArray(kp) || kp.length !== POSE_KEYPOINTS) return null;
  const ok = kp.every(
    (p) => Array.isArray(p) && p.length === 3 && p.every((n) => typeof n === "number" && Number.isFinite(n)),
  );
  if (!ok) return null;
  return {
    type: "frame",
    kp,
    t: Number.isFinite(msg.t) ? msg.t : undefined, // phone capture time (ms, phone clock)
    sentTs: Number.isFinite(msg.sentTs) ? msg.sentTs : undefined,
  };
}

export function expiresAt(nowSeconds) {
  return nowSeconds + SESSION_TTL_SECONDS;
}
