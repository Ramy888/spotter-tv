import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {EXERCISES, ExerciseDef, ExerciseId} from '../exercises';
import {FocusButton} from '../FocusButton';
import {planFor} from '../plan';
import {Progress} from '../profiles';
import {color, font} from '../theme';
import {StatusPill, Wordmark, screen} from './shared';

const MUSCLES: Record<ExerciseId, string> = {
  squat: 'Legs · glutes',
  lunge: 'Legs · balance',
  'jumping-jack': 'Full body · cardio',
};

export type History = Progress;

// The workout this card starts ("3 × 12 · 60 s rest"), plus last time's total once there is one.
function historyLine(def: ExerciseDef, h: History[ExerciseId]): string {
  const plan = planFor(def.id, h);
  const sets = `${plan.sets} × ${plan.reps}`;
  return h ? `${sets} · last time ${h.last}` : `${sets} · ${plan.restSec} s rest`;
}

export const PickScreen = ({
  fps,
  history,
  voiceLabel,
  playerName,
  onPick,
  onCycleVoice,
  onSwitchPlayer,
}: {
  fps: number;
  history: History;
  voiceLabel: string;
  playerName: string;
  onPick: (def: ExerciseDef) => void;
  onCycleVoice: () => void;
  onSwitchPlayer: () => void;
}) => (
  <View style={screen.root}>
    <View style={screen.header}>
      <Wordmark />
      <StatusPill label={`Phone connected · ${fps} frames/s`} tone="ok" />
    </View>
    <Text style={styles.headline}>WHAT ARE WE{'\n'}TRAINING TODAY?</Text>
    <View style={styles.cards}>
      {EXERCISES.map((def, i) => (
        <FocusButton
          key={def.id}
          label={def.name}
          detail={historyLine(def, history[def.id])}
          onPress={() => onPick(def)}
          preferred={i === 0}
          testID={`pick-${def.id}`}
          style={[styles.card, i === EXERCISES.length - 1 && styles.lastCard]}>
          {(focused) => (
            <View style={styles.cardInner}>
              <Text style={[styles.muscles, focused && styles.musclesFocused]}>{MUSCLES[def.id]}</Text>
              <View>
                <Text style={styles.cardName}>{def.name.toUpperCase()}</Text>
                <Text style={styles.cardHistory}>{historyLine(def, history[def.id])}</Text>
              </View>
            </View>
          )}
        </FocusButton>
      ))}
    </View>
    <View style={styles.footer}>
      <View style={styles.pills}>
        <FocusButton label={`${playerName} · switch`} onPress={onSwitchPlayer} pill testID="player" />
        <View style={styles.pillGap} />
        <FocusButton label={`Coach voice: ${voiceLabel}`} onPress={onCycleVoice} pill testID="voice-mode" />
      </View>
      <Text style={styles.hint}>Left / right to choose · OK to start</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  headline: {color: color.text, fontFamily: font.display, fontSize: 72, lineHeight: 70, marginTop: 28},
  cards: {flex: 1, flexDirection: 'row', marginTop: 32, marginBottom: 28},
  card: {flex: 1, marginRight: 24, borderRadius: 24, padding: 30},
  lastCard: {marginRight: 0}, // the row ends flush with the header above it
  cardInner: {flex: 1, justifyContent: 'space-between'},
  muscles: {color: color.textSecondary, fontFamily: font.bodyMedium, fontSize: 17, textAlign: 'right'},
  musclesFocused: {color: color.accent},
  cardName: {color: color.text, fontFamily: font.display, fontSize: 46},
  cardHistory: {color: color.textSecondary, fontFamily: font.body, fontSize: 18, marginTop: 8},
  footer: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  pills: {flexDirection: 'row'},
  pillGap: {width: 14},
  hint: {color: color.textSecondary, fontFamily: font.body, fontSize: 18},
});
