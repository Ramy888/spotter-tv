import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {QrCode} from '../QrCode';
import {TickRing} from '../TickRing';
import {color, font} from '../theme';
import {StatusPill, Wordmark, screen} from './shared';

const STEPS = ['Scan the code', 'Lean your phone 3 m away', 'Move'];
const RING = 420; // on the 1280×720 design canvas (see Stage.tsx)

export const PairScreen = ({code, phoneUrl}: {code: string | null; phoneUrl: string}) => (
  <View style={screen.root}>
    <View style={screen.header}>
      <Wordmark />
      <Text style={styles.small}>No account. Nothing to install on your phone.</Text>
    </View>
    <View style={styles.body}>
      <View style={styles.copy}>
        <Text style={styles.headline}>YOUR PHONE{'\n'}IS THE CAMERA.</Text>
        <Text style={[styles.headline, styles.accent]}>YOUR TV IS{'\n'}THE COACH.</Text>
        <View style={styles.steps}>
          {STEPS.map((label, i) => (
            <View key={label} style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
      <TickRing size={RING} lit={14} tick={6}>
        <View style={styles.qrCard}>
          {code ? <QrCode value={`${phoneUrl}?code=${code}`} size={Math.round(RING * 0.56)} /> : null}
        </View>
      </TickRing>
    </View>
    <View style={styles.footer}>
      <View style={styles.codeRow}>
        <Text style={styles.small}>No QR scanner? Open the Spotter page and enter </Text>
        <Text style={styles.code} testID="pairing-code">
          {code ?? '······'}
        </Text>
      </View>
      <StatusPill label={code ? 'Waiting for your phone' : 'Connecting…'} tone="waiting" />
    </View>
  </View>
);

const styles = StyleSheet.create({
  body: {flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  copy: {flexShrink: 1, marginRight: 48},
  headline: {color: color.text, fontFamily: font.display, fontSize: 84, lineHeight: 80},
  accent: {color: color.accent, marginTop: 8},
  steps: {flexDirection: 'row', marginTop: 32},
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 14,
    borderRadius: 14,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: color.raised,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  stepNumberText: {color: color.accent, fontFamily: font.display, fontSize: 20},
  stepText: {color: color.text, fontFamily: font.bodyMedium, fontSize: 19},
  qrCard: {backgroundColor: color.qrLight, borderRadius: 24, padding: 12},
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 22,
    borderTopWidth: 1,
    borderTopColor: color.raised,
  },
  codeRow: {flexDirection: 'row', alignItems: 'center'},
  small: {color: color.textSecondary, fontFamily: font.body, fontSize: 19},
  code: {color: color.text, fontFamily: font.display, fontSize: 44, letterSpacing: 10, marginLeft: 12},
});
