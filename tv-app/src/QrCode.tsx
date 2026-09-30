import React, {useMemo} from 'react';
import {StyleSheet, View} from 'react-native';
import qrcode from 'qrcode-generator';

// Renders a QR code as a grid of Views, so it needs no SVG or image support on the device.
export const QrCode = ({value, size}: {value: string; size: number}) => {
  const rows = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    return Array.from({length: n}, (_, r) => Array.from({length: n}, (__, c) => qr.isDark(r, c)));
  }, [value]);

  const cell = Math.floor(size / (rows.length + 8)); // 4-module quiet zone on each side
  const cellSize = {width: cell, height: cell};
  return (
    <View style={[styles.quietZone, {padding: cell * 4}]} testID="qr-code">
      {rows.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((dark, c) => (
            <View key={c} style={[cellSize, dark ? styles.dark : styles.light]} />
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  quietZone: {backgroundColor: '#fff', alignSelf: 'center'},
  row: {flexDirection: 'row'},
  dark: {backgroundColor: '#000'},
  light: {backgroundColor: '#fff'},
});
