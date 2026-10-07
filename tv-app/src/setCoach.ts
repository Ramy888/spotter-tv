// Between-set coach: one focus for the next set, from the set just done, and whether the next set
// kept it. Pure logic (docs/set-coach.md). The AI may rewrite the line, never the focus or a number.
import {DEPTH_FADE_DEG} from './coach';
import {EXERCISES, ExerciseId} from './exercises';
import {Plan} from './plan';
import {Session, setReps} from './session';

export type Focus = 'frame' | 'depth' | 'tempo' | 'keep';

// What one set did, in numbers. Also what the relay's AI rewrite may quote.
export type SetFacts = {
  exercise: ExerciseId;
  reps: number;
  target: number; // reps the set asked for
  shallow: number; // too-shallow reps (not counted)
  rushed: number; // reps flagged "slow down"
  leftFrame: number;
  depthFirst: number | null; // average bottom angle, first and second half of the set
  depthLast: number | null;
};

export const FOCUS_TITLE: Record<Focus, string> = {
  frame: 'Stay in frame',
  depth: 'Full depth',
  tempo: 'Slow it down',
  keep: 'Same again',
};

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// Facts for one finished set (0-based), or null if there is no such set.
export function setFacts(session: Session, plan: Plan, index: number): SetFacts | null {
  const cues = session.setCues[index];
  if (!cues) {
    return null;
  }
  const depths = setReps(session, index)
    .map((r) => r.depth)
    .filter((d): d is number => d != null);
  const half = Math.floor(depths.length / 2);
  const halves = depths.length >= 4;
  return {
    exercise: session.exercise,
    reps: session.sets[index],
    target: plan.reps,
    shallow: cues.deeper,
    rushed: cues.slower,
    leftFrame: cues['step-back'],
    depthFirst: halves ? Math.round(avg(depths.slice(0, half))) : null,
    depthLast: halves ? Math.round(avg(depths.slice(half))) : null,
  };
}

const faded = (f: SetFacts) => f.depthFirst != null && f.depthLast != null && f.depthLast - f.depthFirst >= DEPTH_FADE_DEG;

export function pickFocus(f: SetFacts): Focus {
  if (f.leftFrame > 0) {
    return 'frame';
  }
  if (f.shallow > 0 || faded(f)) {
    return 'depth';
  }
  return f.rushed > 0 ? 'tempo' : 'keep';
}

// Did this set keep the focus set before it? Null when the set can't be judged (cut short).
export function focusKept(focus: Focus, f: SetFacts): boolean | null {
  if (f.reps < f.target) {
    return null;
  }
  switch (focus) {
    case 'frame':
      return f.leftFrame === 0;
    case 'depth':
      return f.shallow === 0 && !faded(f);
    case 'tempo':
      return f.rushed === 0;
    case 'keep':
      return f.leftFrame === 0 && f.shallow === 0 && f.rushed === 0;
  }
}

// The rule-based line on the Coach card. Few numbers on purpose: the AI rewrite must keep them all.
export function focusLine(focus: Focus, f: SetFacts): string {
  const unit = EXERCISES.find((e) => e.id === f.exercise)!.unit;
  switch (focus) {
    case 'frame':
      return `You left the frame ${plural(f.leftFrame, 'time')}. Next set: step back and stay in view.`;
    case 'depth':
      return f.shallow > 0
        ? `${plural(f.shallow, 'rep')} didn't reach full depth. Next set: every rep all the way down.`
        : `Your depth faded from ${f.depthFirst}° to ${f.depthLast}°. Next set: hold your depth to the last rep.`;
    case 'tempo':
      return `${plural(f.rushed, 'rep')} came too fast. Next set: slow and controlled.`;
    case 'keep':
      return `${f.reps} clean ${unit}. Next set: the same clean form again.`;
  }
}
