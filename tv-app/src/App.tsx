import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';

// Spike: prove a Vega app can receive pose keypoints from the Mac relay over WebSocket.
// 192.168.100.13 is the Mac's LAN IP; it works from both the Virtual Device and a real Fire TV.
const RELAY_URL = 'ws://192.168.100.13:8080/ws?role=viewer';

const LEG_JOINTS = [23, 24, 25, 26, 27, 28];
const LEG_VISIBILITY = 0.6;
const SMOOTHING = 0.35;
const DOWN_ANGLE = 110;
const UP_ANGLE = 155;
const MIN_REP_MS = 800;

type Point = [number, number, number];

function kneeAngle(a: Point, b: Point, c: Point): number {
  const ab = [a[0] - b[0], a[1] - b[1]];
  const cb = [c[0] - b[0], c[1] - b[1]];
  const cos =
    (ab[0] * cb[0] + ab[1] * cb[1]) /
    (Math.hypot(ab[0], ab[1]) * Math.hypot(cb[0], cb[1]));
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}

export const App = () => {
  const [status, setStatus] = useState('connecting');
  const [reps, setReps] = useState(0);
  const [knee, setKnee] = useState<number | null>(null);
  const [fps, setFps] = useState(0);
  const counter = useRef({down: false, smooth: null as number | null, lastRepAt: 0, frames: 0, since: Date.now()});

  useEffect(() => {
    const ws = new WebSocket(RELAY_URL);
    ws.onopen = () => setStatus('connected');
    ws.onerror = () => setStatus('error');
    ws.onclose = () => setStatus('closed');
    ws.onmessage = (e) => {
      const {kp} = JSON.parse(e.data as string) as {kp: Point[]};
      const c = counter.current;
      const now = Date.now();

      c.frames++;
      if (now - c.since > 1000) {
        setFps(Math.round((c.frames * 1000) / (now - c.since)));
        c.frames = 0;
        c.since = now;
      }

      if (!LEG_JOINTS.every((i) => kp[i][2] >= LEG_VISIBILITY)) {
        c.smooth = null;
        setKnee(null);
        return;
      }
      const raw = Math.max(kneeAngle(kp[23], kp[25], kp[27]), kneeAngle(kp[24], kp[26], kp[28]));
      c.smooth = c.smooth == null ? raw : c.smooth + SMOOTHING * (raw - c.smooth);
      setKnee(Math.round(c.smooth));
      if (c.smooth < DOWN_ANGLE) {
        c.down = true;
      }
      if (c.down && c.smooth > UP_ANGLE && now - c.lastRepAt > MIN_REP_MS) {
        c.down = false;
        c.lastRepAt = now;
        setReps((r) => r + 1);
      }
    };
    return () => ws.close();
  }, []);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Spotter</Text>
      <Text style={styles.reps}>{reps}</Text>
      <Text style={styles.label}>squats</Text>
      <Text style={styles.hint}>
        {knee == null ? 'Step back: full body in frame' : `knee ${knee}°`}
      </Text>
      <Text style={styles.meta}>
        relay {status} · {fps} frames/s
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#0b0b0f', alignItems: 'center', justifyContent: 'center'},
  title: {color: '#4cf', fontSize: 48, fontWeight: '700'},
  reps: {color: '#fff', fontSize: 220, fontWeight: '800'},
  label: {color: '#aaa', fontSize: 40},
  hint: {color: '#fc6', fontSize: 36, marginTop: 24},
  meta: {color: '#666', fontSize: 24, marginTop: 32},
});
