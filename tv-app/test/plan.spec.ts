import {DEFAULT_PLANS, MAX_REPS_PER_SET, nextRepsPerSet, planFor} from '../src/plan';

describe('workout plan', () => {
  it('starts every exercise with sets, reps and rest a coach would give', () => {
    expect(planFor('squat')).toEqual({sets: 3, reps: 12, restSec: 60});
    expect(planFor('lunge')).toEqual({sets: 3, reps: 10, restSec: 60});
    expect(planFor('jumping-jack')).toEqual({sets: 3, reps: 20, restSec: 45});
  });

  it("uses the player's saved reps per set, and ignores the old total target", () => {
    expect(planFor('squat', {last: 30, target: 19, bestDepth: 80, sessions: 2, repsPerSet: 14}).reps).toBe(14);
    expect(planFor('squat', {last: 17, target: 19, bestDepth: 80, sessions: 5}).reps).toBe(DEFAULT_PLANS.squat.reps);
  });

  it('adds 2 reps per set after a complete, clean workout', () => {
    expect(nextRepsPerSet(planFor('squat'), [12, 12, 12], true)).toBe(14);
  });

  it('keeps the same reps when a set fell short or form slipped', () => {
    expect(nextRepsPerSet(planFor('squat'), [12, 12, 9], true)).toBe(12);
    expect(nextRepsPerSet(planFor('squat'), [12, 12], true)).toBe(12); // finished early
    expect(nextRepsPerSet(planFor('squat'), [12, 12, 12], false)).toBe(12);
  });

  it(`never asks for more than ${MAX_REPS_PER_SET} per set`, () => {
    const plan = {...planFor('jumping-jack'), reps: MAX_REPS_PER_SET};
    expect(nextRepsPerSet(plan, [30, 30, 30], true)).toBe(MAX_REPS_PER_SET);
  });
});
