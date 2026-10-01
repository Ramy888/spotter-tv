import React, {useEffect, useMemo, useRef} from 'react';
import {Animated, Easing, StyleSheet, Text} from 'react-native';
import {Reward} from './rewards';
import {color, font} from './theme';

const DURATION_MS = 1500;
const PARTICLES = 6; // half on each side of the rep count
const COUNT_CLEARANCE = 130; // keep the middle clear so the count stays readable

// Fades in, holds, fades out over DURATION_MS. Remount (new `key`) to play again.
function usePlayOnce() {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: DURATION_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [progress]);
  return progress;
}

// Emoji rising from the rep count. Only opacity and position animate, on the native driver.
export const CelebrationBurst = ({reward}: {reward: Reward}) => {
  const progress = usePlayOnce();
  const particles = useMemo(
    () =>
      Array.from({length: PARTICLES}, (_, i) => ({
        x: (i % 2 ? 1 : -1) * (COUNT_CLEARANCE + Math.floor(i / 2) * 70 + Math.random() * 20), // stays inside the ring
        rise: 140 + Math.random() * 120, // stops short of the title
        start: Math.random() * 0.2, // staggered launch, as a fraction of the duration
      })),
    [],
  );

  return (
    <Animated.View style={styles.layer} pointerEvents="none" testID="celebration">
      {particles.map((p, i) => (
        <Animated.Text
          key={i}
          style={[
            styles.particle,
            {
              opacity: progress.interpolate({
                inputRange: [0, p.start, p.start + 0.1, 0.75, 1],
                outputRange: [0, 0, 1, 1, 0],
              }),
              transform: [
                {translateX: p.x},
                {
                  translateY: progress.interpolate({
                    inputRange: [0, p.start, 1],
                    outputRange: [40, 40, 40 - p.rise],
                  }),
                },
              ],
            },
          ]}>
          {reward.emoji}
        </Animated.Text>
      ))}
    </Animated.View>
  );
};

// Names the achievement. Lives in the cue line's slot, so it never overlaps other text.
export const CelebrationBadge = ({reward}: {reward: Reward}) => {
  const progress = usePlayOnce();
  const opacity = progress.interpolate({inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 1, 0]});
  return (
    <Animated.View style={[styles.badge, {opacity}]} testID="celebration-badge">
      <Text style={styles.badgeText}>
        {reward.emoji} {reward.text}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  layer: {...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center'},
  particle: {position: 'absolute', fontSize: 64},
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: color.accentSurface,
    borderWidth: 3,
    borderColor: color.accent,
  },
  badgeText: {color: color.text, fontSize: 30, fontFamily: font.display},
});
