import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {EXERCISES} from '../exercises';
import {FocusButton} from '../FocusButton';
import {Profile, Progress} from '../profiles';
import {color, font} from '../theme';
import {Wordmark, screen} from './shared';

// One line about a player's training so far, e.g. "Squats 9 · Lunges 6", or "New player".
function summaryLine(progress: Progress | undefined): string {
  const done = EXERCISES.filter((e) => progress?.[e.id]).map((e) => `${e.name} ${progress![e.id]!.last}`);
  return done.length ? done.join(' · ') : 'New player';
}

export const WhoScreen = ({
  profiles,
  activeId,
  progressOf,
  canAdd,
  onPick,
  onAdd,
}: {
  profiles: Profile[];
  activeId: string;
  progressOf: (id: string) => Progress | undefined;
  canAdd: boolean;
  onPick: (id: string) => void;
  onAdd: () => void;
}) => (
  <View style={screen.root}>
    <View style={screen.header}>
      <Wordmark />
      <Text style={styles.small}>Saved on this TV · no account</Text>
    </View>
    <Text style={styles.headline}>WHO'S TRAINING?</Text>
    <View style={styles.cards}>
      {profiles.map((p) => (
        <FocusButton
          key={p.id}
          label={p.name}
          detail={summaryLine(progressOf(p.id))}
          onPress={() => onPick(p.id)}
          preferred={p.id === activeId}
          testID={`who-${p.id}`}
          style={styles.card}>
          {(focused) => (
            <View style={styles.cardInner}>
              <View style={[styles.avatar, focused && styles.avatarFocused]}>
                <Text style={[styles.avatarText, focused && styles.avatarTextFocused]}>{p.name.replace(/\D/g, '')}</Text>
              </View>
              <View>
                <Text style={styles.name}>{p.name.toUpperCase()}</Text>
                <Text style={styles.line}>{summaryLine(progressOf(p.id))}</Text>
              </View>
            </View>
          )}
        </FocusButton>
      ))}
      {canAdd ? (
        <FocusButton label="New player" onPress={onAdd} testID="who-add" style={styles.card}>
          {(focused) => (
            <View style={styles.cardInner}>
              <View style={[styles.avatar, styles.addAvatar, focused && styles.avatarFocused]}>
                <Text style={[styles.avatarText, focused && styles.avatarTextFocused]}>+</Text>
              </View>
              <View>
                <Text style={styles.name}>NEW PLAYER</Text>
                <Text style={styles.line}>Starts fresh</Text>
              </View>
            </View>
          )}
        </FocusButton>
      ) : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  small: {color: color.textSecondary, fontFamily: font.body, fontSize: 19},
  headline: {color: color.text, fontFamily: font.display, fontSize: 72, marginTop: 28},
  cards: {flexDirection: 'row', marginTop: 40},
  card: {width: 260, height: 300, marginRight: 24, borderRadius: 24, padding: 28},
  cardInner: {flex: 1, justifyContent: 'space-between'},
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: color.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAvatar: {backgroundColor: color.surface, borderWidth: 2, borderColor: color.line},
  avatarFocused: {backgroundColor: color.accent},
  avatarText: {color: color.text, fontFamily: font.display, fontSize: 36},
  avatarTextFocused: {color: color.ground},
  name: {color: color.text, fontFamily: font.display, fontSize: 38},
  line: {color: color.textSecondary, fontFamily: font.body, fontSize: 17, marginTop: 6},
});
