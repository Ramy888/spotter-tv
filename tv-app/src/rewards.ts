// Decides when to celebrate during a workout. Pure logic, fed with every exercise update.
import {ExerciseUpdate} from './exercises/types';

export type RewardKind = 'target' | 'streak' | 'milestone' | 'deepest' | 'first';

export type Reward = {
  kind: RewardKind;
  emoji: string;
  text: string;
};

// When several fire on the same rep, the most meaningful one wins.
const PRIORITY: RewardKind[] = ['target', 'streak', 'milestone', 'deepest', 'first'];

const MILESTONE_EVERY = 5;
const STREAK_EVERY = 5; // clean reps in a row
const DEEPEST_AFTER_REPS = 3; // the first few reps always set a "record"; wait for a baseline
const DEEPEST_MIN_GAIN_DEG = 3; // ignore measurement noise

export class RewardTracker {
  private streak = 0;
  private deepest = Infinity;

  // target: the rep count the coach suggested last time for this exercise, if any.
  constructor(private readonly target: number | null = null) {}

  update(u: ExerciseUpdate): Reward | null {
    // A half rep breaks the streak even though nothing was counted.
    if (u.cue === 'deeper') {
      this.streak = 0;
    }
    if (!u.rep) {
      return null;
    }

    const clean = u.cue !== 'slower';
    this.streak = clean ? this.streak + 1 : 0;

    const found: Reward[] = [];
    if (this.target != null && u.reps === this.target) {
      found.push({kind: 'target', emoji: '🎉', text: `Target hit: ${u.reps}`});
    }
    if (clean && this.streak > 0 && this.streak % STREAK_EVERY === 0) {
      found.push({kind: 'streak', emoji: '🔥', text: `Clean streak ×${this.streak}`});
    }
    if (u.reps % MILESTONE_EVERY === 0) {
      found.push({kind: 'milestone', emoji: '⭐', text: `${u.reps}!`});
    }
    if (u.rep.depth != null) {
      if (u.reps > DEEPEST_AFTER_REPS && u.rep.depth <= this.deepest - DEEPEST_MIN_GAIN_DEG) {
        found.push({kind: 'deepest', emoji: '🏆', text: 'Deepest rep yet'});
      }
      this.deepest = Math.min(this.deepest, u.rep.depth);
    }
    if (u.reps === 1) {
      found.push({kind: 'first', emoji: '💪', text: "Let's go"});
    }

    found.sort((a, b) => PRIORITY.indexOf(a.kind) - PRIORITY.indexOf(b.kind));
    return found[0] ?? null;
  }
}
