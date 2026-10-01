import React from 'react';
import {StyleSheet, View} from 'react-native';
import {color} from './theme';

// The signature ring of ticks: `lit` of `count` ticks glow from 12 o'clock clockwise.
// Built from rotated Views (no SVG on Vega). Children sit centered inside the ring.
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
  return (
    <View style={[styles.ring, {width: size, height: size}]} testID="tick-ring">
      {Array.from({length: count}, (_, i) => {
        const on = i < lit;
        const h = on ? tick * 4 : tick * 2.6;
        return (
          <View
            key={i}
            style={[
              styles.tick,
              {
                width: tick,
                height: h,
                marginLeft: -tick / 2,
                marginTop: -h / 2,
                borderRadius: tick / 2,
                backgroundColor: on ? color.accent : color.raised,
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
