import {SetFacts, focusKept, focusLine, pickFocus, setFacts} from '../src/setCoach';
import {endSet, startSession} from '../src/session';

const facts = (over: Partial<SetFacts> = {}): SetFacts => ({
  exercise: 'squat',
  reps: 12,
  target: 12,
  shallow: 0,
  rushed: 0,
  leftFrame: 0,
  depthFirst: 90,
  depthLast: 92,
  ...over,
});

describe('setFacts', () => {
  it('describes one set: its reps, its cues, and depth by half', () => {
    const s = startSession('squat', 0);
    s.reps.push(...[85, 87, 86, 88].map((depth) => ({durationMs: 2000, depth})));
    endSet(s);
    s.reps.push(...[86, 88, 98, 102].map((depth) => ({durationMs: 2000, depth})));
    s.cues.deeper = 1;
    endSet(s);
    expect(setFacts(s, {sets: 3, reps: 4, restSec: 30}, 1)).toEqual({
      exercise: 'squat',
      reps: 4,
      target: 4,
      shallow: 1,
      rushed: 0,
      leftFrame: 0,
      depthFirst: 87,
      depthLast: 100,
    });
  });

  it('has no depth halves for too few reps or no angle', () => {
    const s = startSession('jumping-jack', 0);
    s.reps.push(...Array.from({length: 6}, () => ({durationMs: 700, depth: null})));
    endSet(s);
    expect(setFacts(s, {sets: 3, reps: 6, restSec: 30}, 0)).toMatchObject({depthFirst: null, depthLast: null});
    expect(setFacts(s, {sets: 3, reps: 6, restSec: 30}, 1)).toBeNull();
  });
});

describe('pickFocus', () => {
  it('picks frame, then depth, then tempo, then keep', () => {
    expect(pickFocus(facts({leftFrame: 1, shallow: 2, rushed: 1}))).toBe('frame');
    expect(pickFocus(facts({shallow: 2, rushed: 1}))).toBe('depth');
    expect(pickFocus(facts({depthFirst: 88, depthLast: 99, rushed: 1}))).toBe('depth');
    expect(pickFocus(facts({rushed: 1}))).toBe('tempo');
    expect(pickFocus(facts())).toBe('keep');
  });
});

describe('focusKept', () => {
  it('checks only what the focus asked for', () => {
    expect(focusKept('frame', facts({rushed: 2}))).toBe(true);
    expect(focusKept('frame', facts({leftFrame: 1}))).toBe(false);
    expect(focusKept('depth', facts({rushed: 2}))).toBe(true);
    expect(focusKept('depth', facts({shallow: 1}))).toBe(false);
    expect(focusKept('depth', facts({depthFirst: 88, depthLast: 99}))).toBe(false);
    expect(focusKept('tempo', facts({shallow: 1}))).toBe(true);
    expect(focusKept('tempo', facts({rushed: 1}))).toBe(false);
    expect(focusKept('keep', facts())).toBe(true);
    expect(focusKept('keep', facts({rushed: 1}))).toBe(false);
  });

  it("doesn't judge a set cut short", () => {
    expect(focusKept('depth', facts({reps: 7}))).toBeNull();
  });
});

describe('focusLine', () => {
  it('names the problem with its number, then the focus', () => {
    expect(focusLine('frame', facts({leftFrame: 2}))).toBe('You left the frame 2 times. Next set: step back and stay in view.');
    expect(focusLine('depth', facts({shallow: 1}))).toBe("1 rep didn't reach full depth. Next set: every rep all the way down.");
    expect(focusLine('depth', facts({depthFirst: 88, depthLast: 99}))).toBe(
      'Your depth faded from 88° to 99°. Next set: hold your depth to the last rep.',
    );
    expect(focusLine('tempo', facts({rushed: 3}))).toBe('3 reps came too fast. Next set: slow and controlled.');
    expect(focusLine('keep', facts({exercise: 'jumping-jack', reps: 20}))).toBe(
      '20 clean jumping jacks. Next set: the same clean form again.',
    );
  });
});
