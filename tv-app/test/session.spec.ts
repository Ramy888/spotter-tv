import {currentSetReps, endSet, setReps, startSession} from '../src/session';

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

  it("keeps each set's cues and reps apart", () => {
    const s = startSession('squat', 0);
    s.reps.push(rep, rep);
    s.cues.deeper = 2;
    endSet(s);
    s.reps.push({durationMs: 900, depth: 100});
    s.cues.deeper = 3;
    s.cues.slower = 1;
    endSet(s);
    expect(s.setCues).toEqual([
      {deeper: 2, slower: 0, 'step-back': 0},
      {deeper: 1, slower: 1, 'step-back': 0},
    ]);
    expect(setReps(s, 1)).toEqual([{durationMs: 900, depth: 100}]);
    expect(setReps(s, 0)).toEqual([rep, rep]);
  });
});
