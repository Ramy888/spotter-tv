import {coach} from '../src/coach';
import {Plan} from '../src/plan';
import {Session, startSession} from '../src/session';

function session(
  reps: Array<[number, number | null]>,
  cues: Partial<Session['cues']> = {},
  exercise: Session['exercise'] = 'squat',
  sets: number[] = [reps.length],
): Session {
  const s = startSession(exercise, 0);
  s.reps = reps.map(([durationMs, depth]) => ({durationMs, depth}));
  s.sets = sets;
  s.cues = {...s.cues, ...cues};
  return s;
}

const plan = (reps: number, sets = 1): Plan => ({sets, reps, restSec: 60});
const steady = (n: number, depth = 90): Array<[number, number]> => Array.from({length: n}, () => [2400, depth]);

describe('coach', () => {
  it('says plainly when nothing was counted, and why', () => {
    const summary = coach(session([], {'step-back': 3}, 'squat', []), plan(12, 3));
    expect(summary.headline).toBe('No full squats counted yet');
    expect(summary.insights[0]).toMatch(/leaving the frame/);
    expect(summary.target).toBe(12);
  });

  it('spots depth fading in the second half, and points to the rest between sets', () => {
    const summary = coach(session([[2000, 85], [2000, 88], [2000, 86], [2000, 100], [2000, 104], [2000, 102]]), plan(6));
    expect(summary.headline).toBe('6 squats done');
    expect(summary.insights).toContainEqual(expect.stringMatching(/depth faded in the second half \(86° → 102°.*full rest between sets/));
  });

  it('after every set done cleanly, asks for 2 more reps per set', () => {
    const summary = coach(session(steady(36), {}, 'squat', [12, 12, 12]), plan(12, 3));
    expect(summary.headline).toBe('36 squats done');
    expect(summary.insights).toEqual(['Depth stayed consistent: about 90° at the bottom.', 'Steady pace: 2.4 s per rep.']);
    expect(summary.next).toBe('Next time: 14 squats per set with the same form.');
    expect(summary.target).toBe(14);
  });

  it('says how many sets were finished when the workout ended early, and keeps the reps', () => {
    const summary = coach(session(steady(20), {}, 'squat', [12, 8]), plan(12, 3));
    expect(summary.insights).toContainEqual('You finished 1 of 3 sets.');
    expect(summary.next).toBe('Next time: 12 squats per set, every rep to full depth.');
    expect(summary.target).toBe(12);
  });

  it('flags a fast pace and half reps, and asks for full depth instead of more reps', () => {
    const summary = coach(session([[900, 95], [800, 96], [900, 94], [850, 95]], {deeper: 2, slower: 4}), plan(4));
    expect(summary.insights).toContainEqual('Fast pace: 0.9 s per rep. Slowing down builds more strength.');
    expect(summary.insights).toContainEqual("2 reps didn't count because they were too shallow.");
    expect(summary.next).toBe('Next time: 4 squats per set, every rep to full depth.');
  });

  it('handles exercises without depth (jumping jacks) and singular counts', () => {
    const summary = coach(session([[700, null]], {}, 'jumping-jack'), plan(20, 3));
    expect(summary.headline).toBe('1 jumping jack done');
    expect(summary.insights).toContainEqual('Fast pace: 0.7 s per rep. Slowing down builds more strength.');
  });
});
