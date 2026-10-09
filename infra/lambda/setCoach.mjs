// Between-set coach (docs/set-coach.md): the AI rewrites the TV's one-line focus for the next set,
// and Polly voices it. Pure rules only (shared by the relay, which makes the line, and the site,
// which serves its clip). The TV's rule-based line is the source of truth; the model only phrases it.
import { BANNED, numbersIn } from "./coach.mjs";

export const SET_COACH_COOLDOWN_SECONDS = 15; // per TV connection; a set takes longer than this
export const DAILY_LINE_LIMIT = 500; // all TVs together
export const LINE_CLIP_TTL_SECONDS = 60 * 60; // a line is only for the rest it was made in
const LIMITS = { line: 160, words: 25, rule: 160 };
// A short line needs no reasoning model: Llama answered in 1-5 s where Qwen3 took 5.5-8.6 s and
// often missed the 8 s timeout (measured 2026-10-07).
export const LINE_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const EXERCISES = new Set(["squat", "lunge", "jumping-jack"]);
const FOCUSES = new Set(["frame", "depth", "tempo", "keep"]);
const COUNT_FACTS = ["reps", "target", "shallow", "rushed", "leftFrame"];
const DEPTH_FACTS = ["depthFirst", "depthLast"];
const SPOKEN_NAME = /^[A-Za-z][A-Za-z'-]{0,15}$/; // as voiceNames.mjs
const PLACEHOLDER = /^Player \d+$/;

const isInt = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
const isText = (v, max) => typeof v === "string" && v.trim().length > 0 && v.length <= max;

// Validates the TV's request. Returns the facts, or null. The name is kept apart: it is spoken,
// never given to the model.
export function parseSetCoachRequest(msg) {
  if (!EXERCISES.has(msg?.exercise) || !FOCUSES.has(msg?.focus)) return null;
  if (!isInt(msg.set, 2, 10) || !isInt(msg.sets, 2, 10) || msg.set > msg.sets) return null;
  if (!isText(msg.line, LIMITS.rule)) return null;
  const f = msg.facts;
  if (!f || !COUNT_FACTS.every((k) => isInt(f[k], 0, 500))) return null;
  if (!DEPTH_FACTS.every((k) => f[k] === null || isInt(f[k], 0, 180))) return null;
  const name = typeof msg.name === "string" && SPOKEN_NAME.test(msg.name) && !PLACEHOLDER.test(msg.name) ? msg.name : null;
  return {
    exercise: msg.exercise,
    set: msg.set,
    sets: msg.sets,
    focus: msg.focus,
    line: msg.line,
    facts: Object.fromEntries([...COUNT_FACTS, ...DEPTH_FACTS].map((k) => [k, f[k]])),
    name,
  };
}

export function buildLineMessages(req) {
  // No set numbers: the model wove them in awkwardly ("Next set, 2, ...").
  const { exercise, focus, line, facts } = req;
  return [
    {
      role: "system",
      content:
        "You are Spotter, a warm, upbeat fitness coach on a TV screen, talking to someone (\"you\") who is resting between sets of a bodyweight workout. " +
        "Rewrite the coach's line you are given as one short spoken sentence or two, in your own encouraging voice, about the set just done and what to focus on in the next one. " +
        "Rules: keep every number in the line and its advice; never add numbers, facts, equipment, weights, names or medical advice; write every number as digits; " +
        `at most ${LIMITS.words} words. Reply only with JSON: {"line": "..."}.\n\n` +
        "Example input line: \"2 reps didn't reach full depth. Next set: every rep all the way down.\"\n" +
        "Example reply: {\"line\": \"2 reps stopped short of full depth, so next set take every single rep all the way down.\"}",
    },
    { role: "user", content: JSON.stringify({ exercise, focus, line, facts }) },
  ];
}

const words = (text) => text.trim().split(/\s+/).length;

// Why the model's line can't be used, or null if it's fine. Every reason means the TV keeps its
// rule-based line.
export function lineRejectionReason(reply, req) {
  if (!reply || typeof reply !== "object") return "not an object";
  const { line } = reply;
  if (!isText(line, LIMITS.line)) return "line missing or too long";
  if (words(line) > LIMITS.words) return "too many words";
  if (BANNED.test(line)) return `banned topic: ${line.match(BANNED)[0]}`;
  const allowed = new Set([...numbersIn(req.line), ...Object.values(req.facts).filter((v) => v != null)]);
  const invented = numbersIn(line).find((n) => !allowed.has(n));
  if (invented !== undefined) return `invented number ${invented}`;
  const kept = new Set(numbersIn(line));
  const dropped = numbersIn(req.line).find((n) => !kept.has(n));
  if (dropped !== undefined) return `dropped number ${dropped}`;
  return null;
}

// What Polly says: the model's line, with the player's name in front when there is one, and "88°"
// as "88 degrees" (a symbol Polly may skip).
export function spokenLine(line, name) {
  const text = line.trim().replace(/(\d)\s*°/g, "$1 degrees");
  if (!name) return text;
  const first = /^I\b/.test(text) ? text : text.charAt(0).toLowerCase() + text.slice(1);
  return `${name}, ${first}`;
}

export const lineClipKey = (id) => `LINE#${id}`;
export const lineQuotaKey = (date) => `QUOTA#setline#${date.toISOString().slice(0, 10)}`;

// A clip id is random (the line may hold the player's name, and the URL is public).
export const LINE_CLIP_ID = /^line-[0-9a-f]{16}$/;

// "/audio/line-0123456789abcdef.mp3" -> "line-0123456789abcdef", or null.
export function parseLineClipPath(path) {
  const m = /^\/audio\/(line-[0-9a-f]{16})\.mp3$/.exec(path ?? "");
  return m ? m[1] : null;
}
