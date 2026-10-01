// Rep detector for exercises that bend to a target angle and straighten again (squats, lunges).
import {LEGS, Point, visible} from './pose';
import {Cue, Exercise, ExerciseUpdate} from './types';

export type AngleRepConfig = {
  // Angle to track for this frame; legs are already known to be visible.
  measure: (kp: Point[]) => number;
  downAngle: number; // must go below this for the rep to count
  upAngle: number; // must come back above this to finish the rep
  dipAngle: number; // going below this but not below downAngle is a half rep: cue "deeper"
  minRepMs: number; // faster than this isn't a real rep (jitter, bounce)
  slowRepMs: number; // faster than this counts, but cues "slower"
};

const SMOOTHING = 0.35; // EMA factor for the tracked angle

type Phase = 'up' | 'dipping' | 'down';

export class AngleRepDetector implements Exercise {
  private reps = 0;
  private phase: Phase = 'up';
  private smooth: number | null = null;
  private lastRepAt = -Infinity;
  private dipStartedAt = 0;
  private hidden = false;

  constructor(private readonly config: AngleRepConfig) {}

  update(kp: Point[], t: number): ExerciseUpdate {
    if (!visible(kp, LEGS)) {
      this.smooth = null;
      this.phase = 'up';
      const cue: Cue | null = this.hidden ? null : 'step-back';
      this.hidden = true;
      return {reps: this.reps, cue, metric: null};
    }
    this.hidden = false;

    const c = this.config;
    const raw = c.measure(kp);
    this.smooth = this.smooth == null ? raw : this.smooth + SMOOTHING * (raw - this.smooth);
    const a = this.smooth;
    let cue: Cue | null = null;

    if (this.phase === 'up' && a < c.dipAngle) {
      this.phase = 'dipping';
      this.dipStartedAt = t;
    }
    if (this.phase === 'dipping' && a < c.downAngle) {
      this.phase = 'down';
    }
    if (a > c.upAngle) {
      if (this.phase === 'dipping') {
        cue = 'deeper';
      } else if (this.phase === 'down' && t - this.lastRepAt > c.minRepMs) {
        this.reps++;
        this.lastRepAt = t;
        if (t - this.dipStartedAt < c.slowRepMs) {
          cue = 'slower';
        }
      }
      this.phase = 'up';
    }
    return {reps: this.reps, cue, metric: Math.round(a)};
  }
}
