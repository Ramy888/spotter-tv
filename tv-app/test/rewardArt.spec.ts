import {EXERCISES} from '../src/exercises';
import {isBigReward, pickRewardArt, REWARD_ART} from '../src/rewardArt';

describe('reward art', () => {
  it('has 4 images for every exercise', () => {
    for (const e of EXERCISES) {
      expect(REWARD_ART[e.id]).toHaveLength(4);
    }
  });

  it('picks an image for the exercise, never the same one twice in a row', () => {
    const always0 = () => 0;
    const first = pickRewardArt('squat', always0, null);
    expect(REWARD_ART.squat).toContain(first);
    const second = pickRewardArt('squat', always0, first);
    expect(REWARD_ART.squat).toContain(second);
    expect(second).not.toBe(first);
  });

  it('shows art only for the big moments', () => {
    expect(isBigReward('target')).toBe(true);
    expect(isBigReward('streak')).toBe(true);
    expect(isBigReward('deepest')).toBe(true);
    expect(isBigReward('first')).toBe(false);
    expect(isBigReward('milestone')).toBe(false);
  });
});
