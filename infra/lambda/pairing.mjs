// Pure pairing and validation rules for the Spotter relay. No AWS calls here, so this is unit-testable.
import { randomInt } from "node:crypto";

// No 0/O/1/I/L: codes are read off a TV screen and typed or scanned on a phone.
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 6;
export const SESSION_TTL_SECONDS = 2 * 60 * 60;
export const POSE_KEYPOINTS = 33;
export const MAX_FRAME_BYTES = 4096;

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
