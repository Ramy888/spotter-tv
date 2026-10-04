// Rule-based coach: turns a finished session into a short, specific summary.
// Kept behind this one function so an LLM coach (Bedrock) can replace it without touching the UI.
import {EXERCISES} from './exercises';
import {Plan, nextRepsPerSet} from './plan';
import {Session} from './session';

export type CoachSummary = {
  headline: string;
  insights: string[]; // 0-4 short, specific observations
  next: string; // one concrete suggestion for the next session
  target: number | null; // reps per set for the next workout
};

const DEPTH_FADE_DEG = 8; // second half this much shallower (on average) counts as fading
const FAST_REP_MS = 1200;

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// Numbers stay few on purpose: an AI rewrite must repeat every one of them (infra/lambda/coach.mjs).
export function coach(session: Session, plan: Plan): CoachSummary {
  const def = EXERCISES.find((e) => e.id === session.exercise)!;
  const unit = def.unit; // e.g. "squats"
  const count = session.reps.length;
  const insights: string[] = [];

  if (count === 0) {
    return {
      headline: `No full ${unit} counted yet`,
      insights:
        session.cues['step-back'] > 0
          ? ['Your body kept leaving the frame. Move the phone back so you are visible from head to feet.']
          : session.cues.deeper > 0
          ? [`${plural(session.cues.deeper, 'rep')} didn't reach full depth.`]
          : [],
      next: `Next time: ${plan.reps} ${unit} per set at a slow, controlled pace.`,
      target: plan.reps,
    };
  }

  // Depth: compare the first and second half of the set (angle-based exercises only).
  const depths = session.reps.map((r) => r.depth).filter((d): d is number => d != null);
  if (depths.length >= 4) {
    const half = Math.floor(depths.length / 2);
    const first = avg(depths.slice(0, half));
    const second = avg(depths.slice(half));
    if (second - first >= DEPTH_FADE_DEG) {
      insights.push(
        `Your depth faded in the second half (${Math.round(first)}° → ${Math.round(second)}° at the bottom). That's fatigue: take your full rest between sets.`,
      );
    } else {
      insights.push(`Depth stayed consistent: about ${Math.round(avg(depths))}° at the bottom.`);
    }
  }

  // Sets: only worth saying when the workout ended early, after at least one full set.
  const fullSets = session.sets.filter((reps) => reps >= plan.reps).length;
  if (fullSets > 0 && fullSets < plan.sets) {
    insights.push(`You finished ${fullSets} of ${plural(plan.sets, 'set')}.`);
  }

  // Tempo.
  const tempo = avg(session.reps.map((r) => r.durationMs));
  if (tempo < FAST_REP_MS) {
    insights.push(`Fast pace: ${seconds(tempo)} per rep. Slowing down builds more strength.`);
  } else {
    insights.push(`Steady pace: ${seconds(tempo)} per rep.`);
  }

  if (session.cues.deeper > 0) {
    insights.push(`${plural(session.cues.deeper, 'rep')} didn't count because ${session.cues.deeper === 1 ? 'it was' : 'they were'} too shallow.`);
  }
  if (session.cues['step-back'] >= 2) {
    insights.push(`You left the frame ${session.cues['step-back']} times. Move the phone back a little.`);
  }

  const clean = session.cues.deeper === 0 && session.cues.slower === 0;
  const target = nextRepsPerSet(plan, session.sets, clean);
  const next =
    target > plan.reps
      ? `Next time: ${target} ${unit} per set with the same form.`
      : `Next time: ${target} ${unit} per set, every rep to full depth.`;

  return {
    headline: `${plural(count, def.unit.replace(/s$/, ''), unit)} done`,
    insights: insights.slice(0, 4),
    next,
    target,
  };
}
