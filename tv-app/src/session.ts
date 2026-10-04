// What happened during one workout: every counted rep and every cue, for the summary and the coach.
import {ExerciseId} from './exercises';
import {Cue, ExerciseUpdate, RepRecord} from './exercises/types';

export type Session = {
  exercise: ExerciseId;
  startedAt: number;
  endedAt: number;
  reps: RepRecord[]; // every counted rep, across all sets
  sets: number[]; // reps in each finished set
  cues: Record<Cue, number>;
};

export function startSession(exercise: ExerciseId, now: number): Session {
  return {exercise, startedAt: now, endedAt: now, reps: [], sets: [], cues: {deeper: 0, slower: 0, 'step-back': 0}};
}

// Reps counted since the last finished set.
export const currentSetReps = (session: Session) => session.reps.length - session.sets.reduce((a, b) => a + b, 0);

// Closes the current set (a set with no reps isn't recorded).
export function endSet(session: Session): void {
  const reps = currentSetReps(session);
  if (reps > 0) {
    session.sets.push(reps);
  }
}

export function recordUpdate(session: Session, update: ExerciseUpdate, now: number): void {
  session.endedAt = now;
  if (update.rep) {
    session.reps.push(update.rep);
  }
  if (update.cue) {
    session.cues[update.cue]++;
  }
}
