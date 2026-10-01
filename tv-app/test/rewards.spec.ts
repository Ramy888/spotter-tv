import {Cue, ExerciseUpdate} from '../src/exercises/types';
import {RewardTracker} from '../src/rewards';

// A counted rep: n is the new total, depth in degrees (lower is deeper).
const rep = (n: number, depth: number | null = 90, cue: Cue | null = null): ExerciseUpdate => ({
  reps: n,
  rep: {durationMs: 2000, depth},
  cue,
  metric: depth,
});
const halfRep = (n: number): ExerciseUpdate => ({reps: n, rep: null, cue: 'deeper', metric: 130});
const frame = (n: number): ExerciseUpdate => ({reps: n, rep: null, cue: null, metric: 150});

const kinds = (tracker: RewardTracker, updates: ExerciseUpdate[]) =>
  updates.map((u) => tracker.update(u)?.kind ?? null);

describe('RewardTracker', () => {
  it('celebrates the first rep and nothing on plain frames', () => {
    const t = new RewardTracker();
    expect(kinds(t, [frame(0), rep(1), frame(1), rep(2)])).toEqual([null, 'first', null, null]);
  });

  it('celebrates every 5 reps, and a clean streak of 5 outranks the milestone', () => {
    const t = new RewardTracker();
    const out = kinds(t, [1, 2, 3, 4, 5].map((n) => rep(n)));
    expect(out[4]).toBe('streak');
    const more = kinds(t, [rep(6), rep(7), halfRep(7), rep(8), rep(9), rep(10)]);
    expect(more[5]).toBe('milestone'); // 10 reps, but the half rep reset the streak to 3
  });

  it('a rushed rep ("slower") breaks the streak', () => {
    const t = new RewardTracker();
    kinds(t, [rep(1), rep(2), rep(3, 90, 'slower'), rep(4)]);
    expect(kinds(t, [rep(5)])).toEqual(['milestone']);
  });

  it('celebrates a new deepest rep only after a baseline and a real improvement', () => {
    const t = new RewardTracker();
    // Reps 1-3 set the baseline (90); rep 4 at 89 is noise; rep 6 at 84 is a real improvement.
    // Rep 3 is rushed so no clean streak competes with the deepest-rep reward.
    const out = kinds(t, [rep(1, 92), rep(2, 90), rep(3, 91, 'slower'), rep(4, 89), rep(6, 84)]);
    expect(out).toEqual(['first', null, null, null, 'deepest']);
  });

  it('never celebrates depth for exercises without one (jumping jacks)', () => {
    const t = new RewardTracker();
    expect(kinds(t, [1, 2, 3, 4].map((n) => rep(n, null)))).toEqual(['first', null, null, null]);
  });

  it('celebrates hitting the target from last session, above everything else', () => {
    const t = new RewardTracker(5);
    const out = kinds(t, [1, 2, 3, 4, 5].map((n) => rep(n)));
    expect(out[4]).toBe('target');
    expect(t.update(rep(6))).toBeNull(); // only once
  });
});
