import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {color} from './theme';

// The signature ring of ticks: `lit` of `count` ticks glow from 12 o'clock clockwise.
// Built from rotated Views (no SVG on Vega). Children sit centered inside the ring.
// New ticks light one by one, so each rep visibly fills its share of the ring; the tick being lit
// glows white. Fewer lit ticks (a new set) clear at once.
const FILL_MS = 450; // the most one rep's fill may take
const MIN_STEP_MS = 30; // about two frames; a bigger jump lights a few ticks per step instead
export const TickRing = ({
  size,
  lit,
  count = 40,
  tick = 8,
  children,
}: {
  size: number;
  lit: number;
  count?: number;
  tick?: number;
  children?: React.ReactNode;
}) => {
  const radius = size / 2 - tick * 2.5;
  const [shown, setShown] = useState(lit);
  // Fixed per rep from its whole jump, so the fill keeps an even pace.
  const pace = useRef({stepMs: MIN_STEP_MS, perStep: 1});
  const target = useRef(lit);
  if (lit !== target.current) {
    const jump = Math.max(1, lit - shown);
    const steps = Math.min(jump, Math.floor(FILL_MS / MIN_STEP_MS));
    pace.current = {stepMs: FILL_MS / steps, perStep: Math.ceil(jump / steps)};
    target.current = lit;
  }
  useEffect(() => {
    if (lit <= shown) {
      if (lit < shown) {
        setShown(lit);
      }
      return;
    }
    const {stepMs, perStep} = pace.current;
    const timer = setTimeout(() => setShown((n) => Math.min(lit, n + perStep)), stepMs);
    return () => clearTimeout(timer);
  }, [lit, shown]);
  return (
    <View style={[styles.ring, {width: size, height: size}]} testID="tick-ring">
      {Array.from({length: count}, (_, i) => {
        const on = i < shown;
        const head = on && i === shown - 1 && shown < lit;
        const h = on ? tick * 4 : tick * 2.6;
        return (
          <View
            key={i}
            testID={on ? 'tick-on' : 'tick-off'}
            style={[
              styles.tick,
              {
                width: tick,
                height: h,
                marginLeft: -tick / 2,
                marginTop: -h / 2,
                borderRadius: tick / 2,
                backgroundColor: head ? color.text : on ? color.accent : color.raised,
                transform: [{rotate: `${(i * 360) / count}deg`}, {translateY: -radius}],
              },
            ]}
          />
        );
      })}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  ring: {alignItems: 'center', justifyContent: 'center'},
  tick: {position: 'absolute', left: '50%', top: '50%'},
});
