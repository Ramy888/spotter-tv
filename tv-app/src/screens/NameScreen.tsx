import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, TextInput, View} from 'react-native';
import {FocusButton} from '../FocusButton';
import {MAX_NAME_LENGTH, cleanName, isRealName, withoutSpaces} from '../profiles';
import {color, font} from '../theme';
import {Wordmark, screen} from './shared';

const ERROR_SHOW_MS = 2500;

// Typing a player's name with the TV's on-screen keyboard (OK on the field opens it).
export const NameScreen = ({
  current,
  cancelLabel,
  onSave,
  onCancel,
}: {
  current: string;
  cancelLabel: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}) => {
  const [text, setText] = useState(isRealName(current) ? current : '');
  const [focused, setFocused] = useState(false);
  const [spaceTyped, setSpaceTyped] = useState(0); // when a space was last typed; 0 = not showing
  // A name is one word: a typed space is dropped and the field says why, for long enough to read.
  const type = (raw: string) => {
    const {text: typed, hadSpace} = withoutSpaces(raw);
    setText(typed);
    if (hadSpace) {
      setSpaceTyped(Date.now());
    }
  };
  useEffect(() => {
    if (!spaceTyped) {
      return;
    }
    const timer = setTimeout(() => setSpaceTyped(0), ERROR_SHOW_MS);
    return () => clearTimeout(timer);
  }, [spaceTyped]);
  const name = cleanName(text);
  const save = () => (name ? onSave(name) : undefined);
  return (
    <View style={screen.root}>
      <View style={screen.header}>
        <Wordmark />
        <Text style={styles.small}>Saved on this TV · no account</Text>
      </View>
      <Text style={styles.headline}>WHAT'S YOUR NAME?</Text>
      <Text style={styles.lead}>Your coach will cheer you on by name.</Text>
      <TextInput
        testID="name-input"
        value={text}
        onChangeText={type}
        onSubmitEditing={save}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        hasTVPreferredFocus
        maxLength={MAX_NAME_LENGTH}
        placeholder="Type your name"
        placeholderTextColor={color.textSecondary}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
        style={[styles.input, focused && styles.inputFocused, spaceTyped > 0 && styles.inputError]}
      />
      {spaceTyped > 0 ? (
        <Text style={styles.error} testID="name-error" accessibilityLiveRegion="polite">
          No spaces allowed
        </Text>
      ) : null}
      <View style={styles.buttons}>
        <FocusButton label="Save" onPress={save} testID="name-save" style={styles.save} />
        <View style={styles.gap} />
        <FocusButton label={cancelLabel} onPress={onCancel} testID="name-cancel" />
      </View>
      <View style={styles.phoneHint}>
        <View style={styles.phoneDot} />
        <Text style={styles.phoneHintText}>Easier on your phone: it's asking for your name too.</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  small: {color: color.textSecondary, fontFamily: font.body, fontSize: 19},
  headline: {
    color: color.text,
    fontFamily: font.display,
    fontSize: 72,
    marginTop: 28,
  },
  lead: {
    color: color.textSecondary,
    fontFamily: font.body,
    fontSize: 24,
    marginTop: 8,
  },
  // An explicit height and line height: with padding alone, Vega clips the bottom of the text
  // (the tail of a "y").
  input: {
    width: 640,
    height: 96,
    marginTop: 36,
    paddingVertical: 0,
    paddingHorizontal: 28,
    borderRadius: 18,
    borderWidth: 4,
    borderColor: color.raised,
    backgroundColor: color.surface,
    color: color.text,
    fontFamily: font.displayBold,
    fontSize: 44,
    lineHeight: 60,
    textAlignVertical: 'center',
  },
  inputFocused: {
    borderColor: color.accent,
    backgroundColor: color.accentSurface,
  },
  inputError: {borderColor: color.cue},
  error: {color: color.cue, fontFamily: font.bodyBold, fontSize: 22, marginTop: 12},
  // Save fills the space under the field so Down from the field lands on it, not on Cancel.
  buttons: {flexDirection: 'row', width: 640, marginTop: 32},
  save: {flex: 1},
  gap: {width: 18},
  phoneHint: {flexDirection: 'row', alignItems: 'center', marginTop: 40},
  phoneDot: {width: 10, height: 10, borderRadius: 5, backgroundColor: color.accent, marginRight: 12},
  phoneHintText: {color: color.textSecondary, fontFamily: font.body, fontSize: 22},
});
