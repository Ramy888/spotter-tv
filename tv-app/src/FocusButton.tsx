import React, {useState} from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';

// A D-pad-friendly button: the focused one is clearly highlighted, since a TV has no pointer.
export const FocusButton = ({
  label,
  detail,
  onPress,
  preferred = false,
  testID,
}: {
  label: string;
  detail?: string;
  onPress: () => void;
  preferred?: boolean;
  testID?: string;
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={detail ? `${label}. ${detail}` : label}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      hasTVPreferredFocus={preferred}
      style={[styles.button, focused && styles.focused]}>
      <Text style={[styles.label, focused && styles.labelFocused]}>{label}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 28,
    paddingHorizontal: 36,
    marginHorizontal: 12,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: '#24242d',
    backgroundColor: '#15151c',
    minWidth: 240,
    alignItems: 'center',
  },
  focused: {borderColor: '#44ccff', backgroundColor: '#1d2a33', transform: [{scale: 1.04}]},
  label: {color: '#ccc', fontSize: 34, fontWeight: '700'},
  labelFocused: {color: '#fff'},
  detail: {color: '#888', fontSize: 22, marginTop: 8},
});
