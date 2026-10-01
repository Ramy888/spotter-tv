import React from 'react';
import {Dimensions, StyleSheet, View} from 'react-native';
import {color} from './theme';

// Every screen is laid out on a fixed 1280×720 design canvas (the size of the mockups), then
// scaled to fit the TV. A 1080p TV gets 1.5×, a smaller virtual device scales down, and the
// layout never reflows or clips. A TV screen doesn't resize, so the scale is computed once.
export const DESIGN_WIDTH = 1280;
export const DESIGN_HEIGHT = 720;
const window = Dimensions.get('window');
const SCALE = Math.min(window.width / DESIGN_WIDTH, window.height / DESIGN_HEIGHT);

export const Stage = ({children}: {children: React.ReactNode}) => (
  <View style={styles.outer}>
    <View style={styles.canvas}>{children}</View>
  </View>
);

const styles = StyleSheet.create({
  outer: {flex: 1, backgroundColor: color.ground, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'},
  canvas: {width: DESIGN_WIDTH, height: DESIGN_HEIGHT, transform: [{scale: SCALE}]},
});
