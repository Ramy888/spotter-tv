import React, {useState} from 'react';
import {StyleSheet, Text, TextInput, View} from 'react-native';
import {FocusButton} from '../FocusButton';
import {MAX_NAME_LENGTH, cleanName, isRealName} from '../profiles';
import {color, font} from '../theme';
import {Wordmark, screen} from './shared';

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
        onChangeText={setText}
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
        style={[styles.input, focused && styles.inputFocused]}
      />
      <View style={styles.buttons}>
        <FocusButton label="Save" onPress={save} testID="name-save" style={styles.save} />
        <View style={styles.gap} />
        <FocusButton label={cancelLabel} onPress={onCancel} testID="name-cancel" />
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
  // Save fills the space under the field so Down from the field lands on it, not on Cancel.
  buttons: {flexDirection: 'row', width: 640, marginTop: 32},
  save: {flex: 1},
  gap: {width: 18},
});
