// Funny cartoon reward art, one set per exercise. Made ahead of time with Workers AI
// (reward-art/), reviewed by hand and bundled, so nothing generated reaches a player unchecked.
import {ImageSourcePropType} from 'react-native';
import {ExerciseId} from './exercises';
import {RewardKind} from './rewards';

export const REWARD_ART: Record<ExerciseId, ImageSourcePropType[]> = {
  squat: [
    require('../assets/rewards/squat-1.jpg'),
    require('../assets/rewards/squat-2.jpg'),
    require('../assets/rewards/squat-3.jpg'),
    require('../assets/rewards/squat-4.jpg'),
  ],
  lunge: [
    require('../assets/rewards/lunge-1.jpg'),
    require('../assets/rewards/lunge-2.jpg'),
    require('../assets/rewards/lunge-3.jpg'),
    require('../assets/rewards/lunge-4.jpg'),
  ],
  'jumping-jack': [
    require('../assets/rewards/jumping-jack-1.jpg'),
    require('../assets/rewards/jumping-jack-2.jpg'),
    require('../assets/rewards/jumping-jack-3.jpg'),
    require('../assets/rewards/jumping-jack-4.jpg'),
  ],
};

// The moments worth a picture; small ones (first rep, round numbers) keep the emoji only.
const BIG: ReadonlySet<RewardKind> = new Set<RewardKind>(['target', 'streak', 'deepest']);
export const isBigReward = (kind: RewardKind) => BIG.has(kind);

// A random image for the exercise, never `previous` again.
export function pickRewardArt(
  exercise: ExerciseId,
  random: () => number,
  previous: ImageSourcePropType | null,
): ImageSourcePropType {
  const set = REWARD_ART[exercise];
  let i = Math.floor(random() * set.length);
  if (set[i] === previous) {
    i = (i + 1) % set.length;
  }
  return set[i];
}
