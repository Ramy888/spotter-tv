import React from 'react';
import {ImageSourcePropType, StyleSheet, Text, View} from 'react-native';
import {CelebrationBadge, CelebrationBurst, RewardSticker} from '../Celebration';
import {ExerciseDef} from '../exercises';
import {CUE_TEXT, Cue} from '../exercises/types';
import {FocusButton} from '../FocusButton';
import {Reward} from '../rewards';
import {TickRing} from '../TickRing';
import {color, font} from '../theme';
import {StatTile} from './shared';

const RING = 560; // on the 1280×720 design canvas (see Stage.tsx)
const TICKS = 40;

export type WorkoutView = {
  reps: number;
  metric: number | null;
  cue: Cue | null;
  celebration: {reward: Reward; id: number; art: ImageSourcePropType | null} | null;
  target: number | null; // reps in this set
  set: number;
  sets: number;
  stage: 'set' | 'rest';
  restLeft: number;
  restSec: number;
  paceMs: number | null;
  streak: number;
  bestDepth: number | null;
};

// Knee gauge: 180° (standing) is empty, 60° is full; the marker is the depth that counts.
const gaugeFill = (deg: number) => Math.min(1, Math.max(0, (180 - deg) / 120));

export const WorkoutScreen = ({
  exercise,
  w,
  fps,
  onFinish,
  onSkipRest,
  playerName,
}: {
  exercise: ExerciseDef;
  w: WorkoutView;
  fps: number;
  onFinish: () => void;
  onSkipRest: () => void;
  playerName: string | null; // shown when the player has a real name
}) => {
  const resting = w.stage === 'rest';
  const goal = w.target ?? Math.max(5, w.reps);
  // Working: the ring fills with reps. Resting: it empties as the countdown runs.
  const lit = resting
    ? Math.round((w.restLeft / Math.max(1, w.restSec)) * TICKS)
    : Math.round((Math.min(w.reps, goal) / goal) * TICKS);
  const angleBased = exercise.id !== 'jumping-jack';
  return (
    <View style={styles.root}>
      <View style={styles.left}>
        <View>
          <Text style={styles.small} testID="set-label">
            {playerName ? `${playerName} · ` : ''}Set {w.set} of {w.sets}
          </Text>
          <Text style={styles.name}>{exercise.name.toUpperCase()}</Text>
        </View>
        {angleBased ? (
          <View>
            <Text style={styles.label}>{exercise.metricLabel.toUpperCase()}</Text>
            <View style={styles.gauge}>
              <View style={[styles.gaugeFill, {height: `${gaugeFill(w.metric ?? 180) * 100}%`}]} />
              <View style={[styles.gaugeMark, {bottom: `${gaugeFill(exercise.depthTarget) * 100}%`}]} />
            </View>
            <Text style={styles.gaugeValue}>{w.metric == null ? '—' : `${w.metric}°`}</Text>
          </View>
        ) : (
          <View />
        )}
      </View>

      <View style={styles.center}>
        <TickRing size={RING} lit={lit} count={TICKS} tick={8}>
          {resting ? (
            <View style={styles.rest} testID="rest">
              <Text style={styles.restLabel}>REST</Text>
              <Text style={styles.count} testID="rest-left" accessibilityLabel={`${w.restLeft} seconds of rest`}>
                {w.restLeft}
              </Text>
              <Text style={styles.ofTarget}>
                Next: set <Text style={styles.ofTargetNumber}>{w.set + 1}</Text> of {w.sets} · {w.target} {exercise.unit}
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.count} accessibilityLabel={`${w.reps} ${exercise.unit}`}>
                {w.reps}
              </Text>
              <Text style={styles.ofTarget}>
                {w.target != null ? (
                  <>
                    of <Text style={styles.ofTargetNumber}>{w.target}</Text> {exercise.unit}
                  </>
                ) : (
                  exercise.unit
                )}
              </Text>
            </>
          )}
        </TickRing>
        {w.cue && !resting ? (
          <View style={styles.cue}>
            <Text style={styles.cueText} testID="cue">
              {CUE_TEXT[w.cue].toUpperCase()}
            </Text>
          </View>
        ) : null}
        <View style={styles.badgeSlot}>
          {w.celebration ? <CelebrationBadge key={w.celebration.id} reward={w.celebration.reward} /> : null}
        </View>
        {w.celebration ? <CelebrationBurst key={`b${w.celebration.id}`} reward={w.celebration.reward} /> : null}
        {w.celebration?.art ? (
          <View style={styles.stickerSlot} pointerEvents="none">
            <RewardSticker key={`s${w.celebration.id}`} source={w.celebration.art} />
          </View>
        ) : null}
      </View>

      <View style={styles.right}>
        <View>
          <StatTile label="PACE" value={w.paceMs == null ? '—' : `${(w.paceMs / 1000).toFixed(1)} s`} />
          <View style={styles.gap} />
          <StatTile label="STREAK" value={`${w.streak} clean`} />
          <View style={styles.gap} />
          <StatTile label="BEST DEPTH" value={w.bestDepth == null ? '—' : `${w.bestDepth}°`} />
        </View>
        <View>
          <Text style={styles.fps}>{fps} frames/s</Text>
          {resting ? (
            <>
              <FocusButton label="Skip rest" onPress={onSkipRest} preferred testID="skip-rest" />
              <View style={styles.gap} />
            </>
          ) : null}
          <FocusButton label="Finish" onPress={onFinish} preferred={!resting} testID="finish" />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: color.ground,
    paddingHorizontal: 64,
    paddingVertical: 44,
  },
  left: {width: 250, justifyContent: 'space-between'},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  rest: {alignItems: 'center'},
  restLabel: {color: color.accent, fontFamily: font.bodyBold, fontSize: 22, letterSpacing: 4},
  // Top-right of the ring, outside the count (see design-system.md §6).
  stickerSlot: {position: 'absolute', top: 0, right: 16},
  right: {width: 250, justifyContent: 'space-between'},
  small: {color: color.textSecondary, fontFamily: font.body, fontSize: 18},
  name: {color: color.text, fontFamily: font.display, fontSize: 50},
  label: {color: color.textSecondary, fontFamily: font.bodyMedium, fontSize: 15, letterSpacing: 2, marginBottom: 12},
  gauge: {width: 64, height: 220, borderRadius: 16, backgroundColor: color.surface, overflow: 'hidden'},
  gaugeFill: {position: 'absolute', left: 0, right: 0, bottom: 0, borderRadius: 16, backgroundColor: color.accent},
  gaugeMark: {position: 'absolute', left: 0, right: 0, height: 3, backgroundColor: color.text},
  gaugeValue: {color: color.text, fontFamily: font.displayBold, fontSize: 34, marginTop: 10},
  count: {color: color.text, fontFamily: font.display, fontSize: 200, lineHeight: 190},
  ofTarget: {color: color.textSecondary, fontFamily: font.body, fontSize: 24},
  ofTargetNumber: {color: color.text, fontFamily: font.bodyBold},
  cue: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 999,
    backgroundColor: color.cue,
  },
  cueText: {color: color.onCue, fontFamily: font.display, fontSize: 30, letterSpacing: 1},
  badgeSlot: {position: 'absolute', bottom: 0, alignSelf: 'center', minHeight: 56, justifyContent: 'center'},
  gap: {height: 16},
  fps: {color: color.textSecondary, fontFamily: font.body, fontSize: 16, marginBottom: 14, textAlign: 'right'},
});
