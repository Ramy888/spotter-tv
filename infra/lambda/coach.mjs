// AI coach: rewrites the TV's rule-based summary in a coaching voice, and refuses anything that
// isn't backed by those facts. The rule-based summary is the source of truth; the model only phrases it.

export const COACH_TIMEOUT_MS = 8000;
export const COACH_COOLDOWN_SECONDS = 10;

const EXERCISES = new Set(["squat", "lunge", "jumping-jack"]);
const LIMITS = { headline: 60, insight: 160, next: 140, insights: 4 };
// Bodyweight training, no medical advice: the model must not wander here.
export const BANNED = /\b(weights?|kg|lbs?|pounds?|dumbbells?|barbells?|kettlebells?|injur\w*|pain|doctor|physio\w*|medical)\b/i;

const isText = (v, max) => typeof v === "string" && v.trim().length > 0 && v.length <= max;

// Validates the coach request coming from the TV. Returns the facts, or null.
export function parseCoachRequest(msg) {
  const s = msg?.summary;
  if (!EXERCISES.has(msg?.exercise) || !Number.isInteger(msg?.reps) || msg.reps < 0 || msg.reps > 500) return null;
  if (!s || !isText(s.headline, LIMITS.headline) || !isText(s.next, LIMITS.next)) return null;
  if (!Array.isArray(s.insights) || s.insights.length > LIMITS.insights || !s.insights.every((i) => isText(i, LIMITS.insight))) return null;
  if (!(s.target === null || (Number.isInteger(s.target) && s.target >= 0 && s.target <= 500))) return null;
  return { exercise: msg.exercise, reps: msg.reps, summary: { headline: s.headline, insights: s.insights, next: s.next, target: s.target } };
}

export function buildMessages(facts) {
  return [
    {
      role: "system",
      content:
        "You are Spotter, a warm, upbeat fitness coach on a TV screen, talking directly to someone (\"you\") who just finished a bodyweight set. " +
        "Rewrite the workout summary you are given in your own encouraging coaching voice. " +
        "Rules: each insight you are given must appear in your insights, rewritten but keeping all of its numbers and its advice; " +
        "never add numbers, facts, equipment, weights, or medical advice; write every number as digits; " +
        "headline: a short, encouraging line of at most 6 words that keeps the rep count; " +
        "each insight: one sentence of at most 22 words; " +
        "next: one motivating sentence that keeps the same target number; target: exactly the given target. Reply only with JSON.\n\n" +
        "Example input insight: \"Fast pace: 0.9 s per rep. Slowing down builds more strength.\"\n" +
        "Example rewritten insight: \"You flew through those at 0.9 s per rep; slow it down and every rep will build more strength.\"",
    },
    { role: "user", content: JSON.stringify(facts) },
  ];
}

// Numbers in a text, written as digits or as words ("one rep" is the same fact as "1 rep").
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven",
  "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
const WORD_RE = new RegExp(`\\b(${WORDS.join("|")})\\b`, "gi");
const numbersIn = (text) => [
  ...(text.match(/\d+(?:\.\d+)?/g) ?? []).map(Number),
  ...(text.match(WORD_RE) ?? []).map((w) => WORDS.indexOf(w.toLowerCase())),
];

// Why the model's reply can't be shown, or null if it's fine. Every reason means the TV keeps
// its rule-based summary.
export function rejectionReason(reply, facts) {
  if (!reply || typeof reply !== "object") return "not an object";
  const { headline, insights, next } = reply;
  if (!isText(headline, LIMITS.headline) || !isText(next, LIMITS.next)) return "headline or next missing or too long";
  if (!Array.isArray(insights) || insights.length === 0 || insights.length > LIMITS.insights) return "insight count";
  if (!insights.every((i) => isText(i, LIMITS.insight))) return "insight empty or too long";

  const texts = [headline, next, ...insights];
  const banned = texts.find((t) => BANNED.test(t));
  if (banned) return `banned topic: ${banned.match(BANNED)[0]}`;

  const allowed = new Set([
    ...numbersIn(JSON.stringify(facts.summary)),
    facts.reps,
    ...(facts.summary.target != null ? [facts.summary.target] : []),
  ]);
  const invented = texts.flatMap(numbersIn).find((n) => !allowed.has(n));
  if (invented !== undefined) return `invented number ${invented}`;

  // Never less informative than the rule-based summary: every number it gave must survive.
  const kept = new Set(insights.flatMap(numbersIn));
  const dropped = facts.summary.insights.flatMap(numbersIn).find((n) => !kept.has(n));
  if (dropped !== undefined) return `dropped number ${dropped}`;

  const t = facts.summary.target;
  if (t != null && !numbersIn(next).includes(t)) return "target missing from next"; // the target must survive the rewrite
  return null;
}

// Accepts the model's reply only if it stays within the facts. Returns the summary to show, or null.
export function validateCoachReply(reply, facts) {
  if (rejectionReason(reply, facts)) return null;
  const { headline, insights, next } = reply;
  return { headline: headline.trim(), insights: insights.map((i) => i.trim()), next: next.trim(), target: facts.summary.target };
}
