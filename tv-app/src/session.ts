// What happened during one workout: every counted rep and every cue, for the summary and the coach.
import {ExerciseId} from './exercises';
import {Cue, ExerciseUpdate, RepRecord} from './exercises/types';

export type Session = {
  exercise: ExerciseId;
  startedAt: number;
  endedAt: number;
  reps: RepRecord[];
  cues: Record<Cue, number>;
};

export function startSession(exercise: ExerciseId, now: number): Session {
  return {exercise, startedAt: now, endedAt: now, reps: [], cues: {deeper: 0, slower: 0, 'step-back': 0}};
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
