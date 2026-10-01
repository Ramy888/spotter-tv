import {AngleRepDetector} from './angleRep';
import {JumpingJackDetector} from './jumpingJack';
import {kneeAngles} from './pose';
import {Exercise} from './types';

export type ExerciseId = 'squat' | 'lunge' | 'jumping-jack';

export type ExerciseDef = {
  id: ExerciseId;
  name: string;
  unit: string; // plural noun under the rep count
  metricLabel: string;
  create: () => Exercise;
};

export const EXERCISES: ExerciseDef[] = [
  {
    id: 'squat',
    name: 'Squats',
    unit: 'squats',
    metricLabel: 'knee',
    // Both knees bend in a squat: track the straighter one so a shift of weight doesn't count.
    create: () =>
      new AngleRepDetector({
        measure: (kp) => Math.max(...kneeAngles(kp)),
        downAngle: 110,
        upAngle: 155,
        dipAngle: 145,
        minRepMs: 800,
        slowRepMs: 1000,
      }),
  },
  {
    id: 'lunge',
    name: 'Lunges',
    unit: 'lunges',
    metricLabel: 'front knee',
    // One knee bends in a lunge: track the more bent one.
    create: () =>
      new AngleRepDetector({
        measure: (kp) => Math.min(...kneeAngles(kp)),
        downAngle: 105,
        upAngle: 155,
        dipAngle: 140,
        minRepMs: 800,
        slowRepMs: 1000,
      }),
  },
  {
    id: 'jumping-jack',
    name: 'Jumping jacks',
    unit: 'jumping jacks',
    metricLabel: 'feet apart',
    create: () => new JumpingJackDetector(),
  },
];
