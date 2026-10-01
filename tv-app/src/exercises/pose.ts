// Shared helpers for MediaPipe pose keypoints: [x, y, visibility], x/y normalized to 0..1, y grows downward.

export type Point = [number, number, number];

export const J = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const;

export const LEGS = [J.leftHip, J.rightHip, J.leftKnee, J.rightKnee, J.leftAnkle, J.rightAnkle];

// Below this, MediaPipe is guessing where the joint is (often off-frame).
const MIN_VISIBILITY = 0.6;

export function visible(kp: Point[], joints: readonly number[]): boolean {
  return joints.every((i) => (kp[i]?.[2] ?? 0) >= MIN_VISIBILITY);
}

// Angle at b, in degrees, formed by a-b-c.
export function angle(a: Point, b: Point, c: Point): number {
  const ab = [a[0] - b[0], a[1] - b[1]];
  const cb = [c[0] - b[0], c[1] - b[1]];
  const cos =
    (ab[0] * cb[0] + ab[1] * cb[1]) / (Math.hypot(ab[0], ab[1]) * Math.hypot(cb[0], cb[1]));
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}

export function kneeAngles(kp: Point[]): [number, number] {
  return [
    angle(kp[J.leftHip], kp[J.leftKnee], kp[J.leftAnkle]),
    angle(kp[J.rightHip], kp[J.rightKnee], kp[J.rightAnkle]),
  ];
}
