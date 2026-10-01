import {Point} from './pose';

// A coaching cue fires once, on the frame where the problem is detected.
export type Cue = 'deeper' | 'slower' | 'step-back';

export type ExerciseUpdate = {
  reps: number;
  cue: Cue | null;
  // Angle or measure shown on screen, or null when the body isn't fully visible.
  metric: number | null;
};

export interface Exercise {
  update(kp: Point[], capturedAtMs: number): ExerciseUpdate;
}

export const CUE_TEXT: Record<Cue, string> = {
  deeper: 'Go deeper',
  slower: 'Slow down',
  'step-back': 'Step back: full body in frame',
};
