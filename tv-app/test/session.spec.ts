import {currentSetReps, endSet, startSession} from '../src/session';

const rep = {durationMs: 2000, depth: 90};

describe('session sets', () => {
  it('splits the reps into sets', () => {
    const s = startSession('squat', 0);
    s.reps.push(rep, rep, rep);
    expect(currentSetReps(s)).toBe(3);
    endSet(s);
    s.reps.push(rep, rep);
    expect(currentSetReps(s)).toBe(2);
    endSet(s);
    expect(s.sets).toEqual([3, 2]);
    expect(currentSetReps(s)).toBe(0);
  });

  it('does not record an empty set', () => {
    const s = startSession('squat', 0);
    endSet(s);
    expect(s.sets).toEqual([]);
  });
});
