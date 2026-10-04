// A workout is sets of reps with rest in between, the way a coach prescribes it ("3 sets of 12").
// Pure logic: the plan for an exercise, and how it grows from one workout to the next.
import {ExerciseId} from './exercises';
import {ExerciseProgress} from './profiles';

export type Plan = {sets: number; reps: number; restSec: number};

export const DEFAULT_PLANS: Record<ExerciseId, Plan> = {
  squat: {sets: 3, reps: 12, restSec: 60},
  lunge: {sets: 3, reps: 10, restSec: 60},
  'jumping-jack': {sets: 3, reps: 20, restSec: 45}, // quick reps, shorter rest
};

export const MAX_REPS_PER_SET = 30;
const STEP = 2;

// The saved reps per set, if any. The older `target` was a total for one long set, so it's ignored.
export function planFor(exercise: ExerciseId, progress?: ExerciseProgress): Plan {
  const plan = DEFAULT_PLANS[exercise];
  return {...plan, reps: progress?.repsPerSet ?? plan.reps};
}

// Every set done in full, with clean form: 2 more reps per set next time. Otherwise the same again.
export function nextRepsPerSet(plan: Plan, setsDone: number[], clean: boolean): number {
  const complete = setsDone.length >= plan.sets && setsDone.every((reps) => reps >= plan.reps);
  return complete && clean ? Math.min(plan.reps + STEP, MAX_REPS_PER_SET) : plan.reps;
}
