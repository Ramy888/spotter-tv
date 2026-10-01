import {coach} from '../src/coach';
import {Session, startSession} from '../src/session';

function session(reps: Array<[number, number | null]>, cues: Partial<Session['cues']> = {}, exercise: Session['exercise'] = 'squat'): Session {
  const s = startSession(exercise, 0);
  s.reps = reps.map(([durationMs, depth]) => ({durationMs, depth}));
  s.cues = {...s.cues, ...cues};
  return s;
}

describe('coach', () => {
  it('says plainly when nothing was counted, and why', () => {
    const summary = coach(session([], {'step-back': 3}));
    expect(summary.headline).toBe('No full squats counted yet');
    expect(summary.insights[0]).toMatch(/leaving the frame/);
  });

  it('spots depth fading in the second half of the set', () => {
    const summary = coach(session([[2000, 85], [2000, 88], [2000, 86], [2000, 100], [2000, 104], [2000, 102]]));
    expect(summary.headline).toBe('6 squats done');
    expect(summary.insights).toContainEqual(expect.stringMatching(/depth faded in the second half \(86° → 102°/));
  });

  it('reports consistent depth and a steady pace for a clean set, and suggests 2 more reps', () => {
    const summary = coach(session([[2400, 90], [2500, 92], [2300, 91], [2600, 89], [2400, 90]]));
    expect(summary.insights).toEqual(['Depth stayed consistent: about 90° at the bottom.', 'Steady pace: 2.4 s per rep.']);
    expect(summary.next).toBe('Next time: 7 squats with the same form.');
  });

  it('flags a fast pace and half reps, and asks for full depth instead of more reps', () => {
    const summary = coach(session([[900, 95], [800, 96], [900, 94], [850, 95]], {deeper: 2, slower: 4}));
    expect(summary.insights).toContainEqual('Fast pace: 0.9 s per rep. Slowing down builds more strength.');
    expect(summary.insights).toContainEqual("2 reps didn't count because they were too shallow.");
    expect(summary.next).toBe('Next time: 4 squats, every rep to full depth.');
  });

  it('handles exercises without depth (jumping jacks) and singular counts', () => {
    const summary = coach(session([[700, null]], {}, 'jumping-jack'));
    expect(summary.headline).toBe('1 jumping jack done');
    expect(summary.insights).toEqual(['Fast pace: 0.7 s per rep. Slowing down builds more strength.']);
  });
});
