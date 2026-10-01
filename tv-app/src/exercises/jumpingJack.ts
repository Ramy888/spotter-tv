// Jumping jacks: a rep is "open" (hands above shoulders, feet wide) followed by "closed"
// (hands below shoulders, feet together).
import {J, Point, visible} from './pose';
import {Cue, Exercise, ExerciseUpdate} from './types';

const NEEDED = [
  J.leftShoulder, J.rightShoulder, J.leftWrist, J.rightWrist,
  J.leftHip, J.rightHip, J.leftAnkle, J.rightAnkle,
];
const OPEN_SPREAD = 1.6; // ankle distance / hip width when the feet are apart
const CLOSED_SPREAD = 1.2;
const MIN_REP_MS = 400;

export class JumpingJackDetector implements Exercise {
  private reps = 0;
  private open = false;
  private lastRepAt = -Infinity;
  private hidden = false;

  update(kp: Point[], t: number): ExerciseUpdate {
    if (!visible(kp, NEEDED)) {
      const cue: Cue | null = this.hidden ? null : 'step-back';
      this.hidden = true;
      this.open = false;
      return {reps: this.reps, cue, metric: null};
    }
    this.hidden = false;

    const hipWidth = Math.abs(kp[J.leftHip][0] - kp[J.rightHip][0]) || 1e-6;
    const spread = Math.abs(kp[J.leftAnkle][0] - kp[J.rightAnkle][0]) / hipWidth;
    const shoulderY = (kp[J.leftShoulder][1] + kp[J.rightShoulder][1]) / 2;
    const handsUp = kp[J.leftWrist][1] < shoulderY && kp[J.rightWrist][1] < shoulderY;
    const handsDown = kp[J.leftWrist][1] > shoulderY && kp[J.rightWrist][1] > shoulderY;

    if (!this.open && handsUp && spread > OPEN_SPREAD) {
      this.open = true;
    } else if (this.open && handsDown && spread < CLOSED_SPREAD) {
      this.open = false;
      if (t - this.lastRepAt > MIN_REP_MS) {
        this.reps++;
        this.lastRepAt = t;
      }
    }
    return {reps: this.reps, cue: null, metric: Math.round(spread * 10) / 10};
  }
}
