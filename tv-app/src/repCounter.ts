// Squat rep counting from MediaPipe pose keypoints ([x, y, visibility] per joint).

export type Point = [number, number, number];

const LEFT_LEG = [23, 25, 27]; // hip, knee, ankle
const RIGHT_LEG = [24, 26, 28];
const LEG_VISIBILITY = 0.6; // below this, MediaPipe is guessing where the joint is
const SMOOTHING = 0.35; // EMA factor for the knee angle
const DOWN_ANGLE = 110; // hysteresis band: jitter near one threshold can't double count
const UP_ANGLE = 155;
const MIN_REP_MS = 800; // faster than any real squat

export type RepUpdate = {reps: number; knee: number | null};

function angle(a: Point, b: Point, c: Point): number {
  const ab = [a[0] - b[0], a[1] - b[1]];
  const cb = [c[0] - b[0], c[1] - b[1]];
  const cos =
    (ab[0] * cb[0] + ab[1] * cb[1]) /
    (Math.hypot(ab[0], ab[1]) * Math.hypot(cb[0], cb[1]));
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}

export class RepCounter {
  private reps = 0;
  private down = false;
  private smooth: number | null = null;
  private lastRepAt = -Infinity;

  // Returns the rep total and the smoothed knee angle, or knee: null when the legs aren't visible.
  update(kp: Point[], nowMs: number): RepUpdate {
    const legsVisible = [...LEFT_LEG, ...RIGHT_LEG].every((i) => kp[i]?.[2] >= LEG_VISIBILITY);
    if (!legsVisible) {
      this.smooth = null;
      return {reps: this.reps, knee: null};
    }
    // Use the straighter knee so one bent leg (a lunge, a shift of weight) doesn't count as a squat.
    const raw = Math.max(
      angle(kp[LEFT_LEG[0]], kp[LEFT_LEG[1]], kp[LEFT_LEG[2]]),
      angle(kp[RIGHT_LEG[0]], kp[RIGHT_LEG[1]], kp[RIGHT_LEG[2]]),
    );
    this.smooth = this.smooth == null ? raw : this.smooth + SMOOTHING * (raw - this.smooth);
    if (this.smooth < DOWN_ANGLE) {
      this.down = true;
    }
    if (this.down && this.smooth > UP_ANGLE && nowMs - this.lastRepAt > MIN_REP_MS) {
      this.down = false;
      this.lastRepAt = nowMs;
      this.reps++;
    }
    return {reps: this.reps, knee: Math.round(this.smooth)};
  }
}
