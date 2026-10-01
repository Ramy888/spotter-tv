// AI coach: rewrites the TV's rule-based summary in a coaching voice, and refuses anything that
// isn't backed by those facts. The rule-based summary is the source of truth; the model only phrases it.

export const COACH_TIMEOUT_MS = 8000;
export const COACH_COOLDOWN_SECONDS = 10;

const EXERCISES = new Set(["squat", "lunge", "jumping-jack"]);
const LIMITS = { headline: 60, insight: 160, next: 140, insights: 4 };
// Bodyweight training, no medical advice: the model must not wander here.
const BANNED = /\b(weights?|kg|lbs?|pounds?|dumbbells?|barbells?|kettlebells?|injur\w*|pain|doctor|physio\w*|medical)\b/i;

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
        "never add numbers, facts, equipment, weights, or medical advice; " +
        "headline: a short, encouraging line of at most 6 words that keeps the rep count; " +
        "each insight: one sentence of at most 22 words; " +
        "next: one motivating sentence that keeps the same target number; target: exactly the given target. Reply only with JSON.\n\n" +
        "Example input insight: \"Fast pace: 0.9 s per rep. Slowing down builds more strength.\"\n" +
        "Example rewritten insight: \"You flew through those at 0.9 s per rep; slow it down and every rep will build more strength.\"",
    },
    { role: "user", content: JSON.stringify(facts) },
  ];
}

const numbersIn = (text) => (text.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);

// Accepts the model's reply only if it stays within the facts. Returns the summary to show, or null.
export function validateCoachReply(reply, facts) {
  if (!reply || typeof reply !== "object") return null;
  const { headline, insights, next } = reply;
  if (!isText(headline, LIMITS.headline) || !isText(next, LIMITS.next)) return null;
  if (!Array.isArray(insights) || insights.length === 0 || insights.length > LIMITS.insights) return null;
  if (!insights.every((i) => isText(i, LIMITS.insight))) return null;

  const texts = [headline, next, ...insights];
  if (texts.some((t) => BANNED.test(t))) return null;

  const allowed = new Set([
    ...numbersIn(JSON.stringify(facts.summary)),
    facts.reps,
    ...(facts.summary.target != null ? [facts.summary.target] : []),
  ]);
  if (texts.some((t) => numbersIn(t).some((n) => !allowed.has(n)))) return null;

  // Never less informative than the rule-based summary: every number it gave must survive.
  const given = new Set(facts.summary.insights.flatMap(numbersIn));
  const kept = new Set(insights.flatMap(numbersIn));
  if ([...given].some((n) => !kept.has(n))) return null;

  const t = facts.summary.target;
  if (t != null && !numbersIn(next).includes(t)) return null; // the target must survive the rewrite

  return { headline: headline.trim(), insights: insights.map((i) => i.trim()), next: next.trim(), target: t };
}
