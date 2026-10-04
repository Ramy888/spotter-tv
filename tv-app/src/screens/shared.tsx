import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {color, font} from '../theme';

// The Spotter mark (brand/logo-mark-transparent.svg): a squat inside the tick ring.
export const LOGO_MARK = require('../../assets/brand/logo-mark.png');

export const Wordmark = () => (
  <View style={styles.wordmark}>
    <Image source={LOGO_MARK} style={styles.mark} accessibilityIgnoresInvertColors />
    <Text style={styles.wordmarkText}>SPOTTER</Text>
  </View>
);

export const StatusPill = ({label, tone}: {label: string; tone: 'ok' | 'waiting'}) => (
  <View style={styles.pill}>
    <View style={[styles.dot, {backgroundColor: tone === 'ok' ? color.accent : color.cue}]} />
    <Text style={styles.pillText}>{label}</Text>
  </View>
);

// `grow`: share a row's width with sibling tiles. Stacked vertically, tiles keep their own height.
export const StatTile = ({label, value, grow = false}: {label: string; value: string; grow?: boolean}) => (
  <View style={[styles.tile, grow && styles.grow]}>
    <Text style={styles.tileLabel}>{label}</Text>
    <Text style={styles.tileValue}>{value}</Text>
  </View>
);

export const screen = StyleSheet.create({
  root: {flex: 1, backgroundColor: color.ground, paddingHorizontal: 72, paddingVertical: 52},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
});

const styles = StyleSheet.create({
  wordmark: {flexDirection: 'row', alignItems: 'center'},
  mark: {width: 34, height: 34, marginRight: 10},
  wordmarkText: {color: color.text, fontFamily: font.display, fontSize: 30, letterSpacing: 1},
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
  },
  dot: {width: 10, height: 10, borderRadius: 5, marginRight: 10},
  pillText: {color: color.text, fontFamily: font.body, fontSize: 18},
  tile: {padding: 18, borderRadius: 16, backgroundColor: color.surface},
  grow: {flex: 1},
  tileLabel: {color: color.textSecondary, fontFamily: font.bodyMedium, fontSize: 15, letterSpacing: 2},
  tileValue: {color: color.text, fontFamily: font.displayBold, fontSize: 36, marginTop: 4},
});
