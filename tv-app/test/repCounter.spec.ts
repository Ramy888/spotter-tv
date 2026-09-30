import {Point, RepCounter} from '../src/repCounter';

// Legs fully visible; kneeOffset pushes both knees forward to bend them.
function pose(kneeOffset: number, visibility = 1): Point[] {
  const kp: Point[] = Array.from({length: 33}, () => [0.5, 0.5, 1] as Point);
  for (const [s, dx] of [[0, -0.05], [1, 0.05]]) {
    kp[23 + s] = [0.5 + dx, 0.45, visibility];
    kp[25 + s] = [0.5 + dx + kneeOffset, 0.65, visibility];
    kp[27 + s] = [0.5 + dx, 0.85, visibility];
  }
  return kp;
}

function run(counter: RepCounter, frames: Point[][], startMs = 0, stepMs = 33) {
  let result = {reps: 0, knee: null as number | null};
  frames.forEach((kp, i) => (result = counter.update(kp, startMs + i * stepMs)));
  return result;
}

const repeat = (kp: Point[], n: number) => Array.from({length: n}, () => kp);
const squat = [...repeat(pose(0), 15), ...repeat(pose(0.2), 15), ...repeat(pose(0), 15)];

describe('RepCounter', () => {
  it('counts each full squat once', () => {
    const counter = new RepCounter();
    expect(run(counter, [...squat, ...squat, ...squat]).reps).toBe(3);
  });

  it('ignores half squats that never reach the bottom threshold', () => {
    const counter = new RepCounter();
    const half = [...repeat(pose(0), 15), ...repeat(pose(0.05), 15), ...repeat(pose(0), 15)];
    expect(run(counter, [...half, ...half]).reps).toBe(0);
  });

  it('reports no knee angle and counts nothing when legs are not visible', () => {
    const counter = new RepCounter();
    const hidden = squat.map((kp) => kp.map(([x, y]) => [x, y, 0.2] as Point));
    const result = run(counter, hidden);
    expect(result).toEqual({reps: 0, knee: null});
  });

  it('does not count a bounce faster than a real squat', () => {
    const counter = new RepCounter();
    // Down and up within ~250 ms: below the minimum rep duration after the first rep.
    const bounce = [...repeat(pose(0.2), 4), ...repeat(pose(0), 4)];
    const first = run(counter, squat, 0);
    const after = run(counter, bounce, first.reps ? squat.length * 33 : 0, 33);
    expect(after.reps).toBe(1);
  });
});
