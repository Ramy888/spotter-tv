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
  setCues: Array<Record<Cue, number>>; // cues in each finished set (lines up with `sets`)
};

const noCues = (): Record<Cue, number> => ({deeper: 0, slower: 0, 'step-back': 0});

export function startSession(exercise: ExerciseId, now: number): Session {
  return {exercise, startedAt: now, endedAt: now, reps: [], sets: [], cues: noCues(), setCues: []};
}

// Reps counted since the last finished set.
export const currentSetReps = (session: Session) => session.reps.length - session.sets.reduce((a, b) => a + b, 0);

// Cues since the last finished set.
function currentSetCues(session: Session): Record<Cue, number> {
  const cues = noCues();
  for (const key of Object.keys(cues) as Cue[]) {
    cues[key] = session.cues[key] - session.setCues.reduce((sum, c) => sum + c[key], 0);
  }
  return cues;
}

// Closes the current set (a set with no reps isn't recorded).
export function endSet(session: Session): void {
  const reps = currentSetReps(session);
  if (reps > 0) {
    session.setCues.push(currentSetCues(session));
    session.sets.push(reps);
  }
}

// The reps of one finished set (0-based).
export function setReps(session: Session, index: number) {
  const start = session.sets.slice(0, index).reduce((a, b) => a + b, 0);
  return session.reps.slice(start, start + (session.sets[index] ?? 0));
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
