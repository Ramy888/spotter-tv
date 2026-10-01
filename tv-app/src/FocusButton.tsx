import React, {useState} from 'react';
import {Pressable, StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {color, font} from './theme';

// A D-pad-friendly button. A TV has no pointer, so the focused one must be unmistakable from 3 m:
// volt border and tinted fill. Cards (`children` replaces the label) also lift slightly; plain
// buttons don't, because a lifted button next to an unlifted one reads as misaligned.
export const FocusButton = ({
  label,
  detail,
  onPress,
  preferred = false,
  testID,
  pill = false,
  style,
  children,
}: {
  label: string;
  detail?: string;
  onPress: () => void;
  preferred?: boolean;
  testID?: string;
  pill?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: (focused: boolean) => React.ReactNode;
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
      style={[pill ? styles.pill : styles.button, focused && styles.focused, focused && children && styles.lift, style]}>
      {children ? (
        children(focused)
      ) : (
        <View style={styles.content}>
          <Text style={[pill ? styles.pillLabel : styles.label, focused && styles.labelFocused]}>{label}</Text>
          {detail ? <Text style={styles.detail}>{detail}</Text> : null}
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 18,
    borderWidth: 4,
    borderColor: color.raised,
    backgroundColor: color.surface,
  },
  pill: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: color.line,
    backgroundColor: color.surface,
  },
  focused: {borderColor: color.accent, backgroundColor: color.accentSurface},
  lift: {transform: [{translateY: -6}]},
  content: {alignItems: 'center'},
  label: {color: color.textIdle, fontSize: 26, fontFamily: font.bodyBold},
  pillLabel: {color: color.textIdle, fontSize: 20, fontFamily: font.bodyBold},
  labelFocused: {color: color.text},
  detail: {color: color.textSecondary, fontSize: 18, fontFamily: font.body, marginTop: 6},
});
