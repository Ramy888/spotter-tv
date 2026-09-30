import React, {useEffect, useRef, useState} from 'react';
import {Dimensions, StyleSheet, Text, View} from 'react-native';
import {PHONE_URL, RELAY_URL} from './config';
import {QrCode} from './QrCode';
import {Point, RepCounter, RepUpdate} from './repCounter';

type Phase = 'connecting' | 'waiting' | 'active';

const RECONNECT_MS = 2000;
const PHONE_SILENT_MS = 3000; // no frames for this long: treat the phone as gone
// API Gateway closes WebSocket connections after 10 idle minutes, which would replace the
// pairing code while someone is fetching their phone. A ping every 5 minutes keeps it open.
const KEEPALIVE_MS = 5 * 60 * 1000;
const UI_INTERVAL_MS = 100;

// A TV screen doesn't resize, so read it once instead of subscribing to changes.
const screenSize = Dimensions.get('window');
const QR_SIZE = Math.round(Math.min(screenSize.height * 0.55, screenSize.width * 0.3));

export const App = () => {
  const [phase, setPhase] = useState<Phase>('connecting');
  const [code, setCode] = useState<string | null>(null);
  const [reps, setReps] = useState(0);
  const [knee, setKnee] = useState<number | null>(null);
  const [fps, setFps] = useState(0);
  const counter = useRef(new RepCounter());
  const stats = useRef({frames: 0, since: Date.now(), lastFrameAt: 0, lastCapturedAt: -Infinity});
  const latest = useRef<RepUpdate>({reps: 0, knee: null});

  useEffect(() => {
    let ws: WebSocket;
    let reconnect: ReturnType<typeof setTimeout> | undefined;
    let closed = false;

    // Counting runs on every frame; the screen redraws at most every UI_INTERVAL_MS, so a slow
    // render can't back up the message queue.
    let uiTimer: ReturnType<typeof setTimeout> | undefined;
    const flushUi = () => {
      uiTimer = undefined;
      setReps(latest.current.reps);
      setKnee(latest.current.knee);
      setPhase('active');
    };

    const onFrame = (kp: Point[], capturedAt: number | undefined) => {
      const now = Date.now();
      const s = stats.current;
      s.lastFrameAt = now;
      s.frames++;
      if (now - s.since >= 1000) {
        setFps(Math.round((s.frames * 1000) / (now - s.since)));
        s.frames = 0;
        s.since = now;
      }
      // Time reps by when the phone captured the frame, not when it arrived: frames delayed and
      // then delivered in a burst would otherwise look like squats faster than MIN_REP_MS.
      const t = capturedAt ?? now;
      if (t < s.lastCapturedAt) {
        return; // out-of-order frame from the relay; it's already history
      }
      s.lastCapturedAt = t;
      const before = latest.current.reps;
      latest.current = counter.current.update(kp, t);
      if (latest.current.reps !== before) {
        console.log(`[spotter] rep ${latest.current.reps}`);
      }
      if (!uiTimer) {
        uiTimer = setTimeout(flushUi, UI_INTERVAL_MS);
      }
    };

    const connect = () => {
      setPhase('connecting');
      ws = new WebSocket(`${RELAY_URL}?role=tv`);
      ws.onopen = () => ws.send(JSON.stringify({action: 'host'}));
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data as string);
        if (msg.type === 'session') {
          console.log(`[spotter] session ${msg.code}`);
          setCode(msg.code);
          setPhase('waiting');
        } else if (msg.type === 'phone-left') {
          if (uiTimer) {
            clearTimeout(uiTimer); // a queued redraw would switch back to the workout screen
            uiTimer = undefined;
          }
          setPhase('waiting');
        } else if (Array.isArray(msg.kp)) {
          onFrame(msg.kp as Point[], Number.isFinite(msg.t) ? msg.t : undefined);
        }
      };
      ws.onclose = () => {
        // A new connection gets a new session and code; the old code is gone with the old socket.
        if (!closed) {
          reconnect = setTimeout(connect, RECONNECT_MS);
        }
      };
    };

    // The relay reports a phone that disconnects, but a phone that just stops sending
    // (camera paused, browser in the background) keeps its connection open.
    const watchdog = setInterval(() => {
      if (stats.current.lastFrameAt && Date.now() - stats.current.lastFrameAt > PHONE_SILENT_MS) {
        stats.current.lastFrameAt = 0;
        setFps(0);
        setPhase((p) => (p === 'active' ? 'waiting' : p));
      }
    }, 1000);

    const keepalive = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({action: 'ping'}));
      }
    }, KEEPALIVE_MS);

    connect();
    return () => {
      closed = true;
      clearInterval(keepalive);
      if (uiTimer) {
        clearTimeout(uiTimer);
      }
      if (reconnect) {
        clearTimeout(reconnect);
      }
      clearInterval(watchdog);
      ws.close();
    };
  }, []);

  if (phase === 'active') {
    return (
      <View style={styles.screen}>
        <Text style={styles.brand}>Spotter</Text>
        <Text style={styles.reps}>{reps}</Text>
        <Text style={styles.label}>squats</Text>
        <Text style={styles.hint}>
          {knee == null ? 'Step back: full body in frame' : `knee ${knee}°`}
        </Text>
        <Text style={styles.meta}>phone connected · {fps} frames/s</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.brand}>Spotter</Text>
      {phase === 'waiting' && code ? (
        <View style={styles.pairing}>
          <QrCode value={`${PHONE_URL}?code=${code}`} size={QR_SIZE} />
          <View style={styles.pairingText}>
            <Text style={styles.step}>Scan with your phone's camera</Text>
            <Text style={styles.or}>or open the Spotter page and enter</Text>
            <Text style={styles.code} testID="pairing-code">
              {code}
            </Text>
            <Text style={styles.hintSmall}>
              Then lean your phone upright about 2.5–3 m away so your whole body is in view.
            </Text>
            {reps > 0 && <Text style={styles.meta}>{reps} squats so far</Text>}
          </View>
        </View>
      ) : (
        <Text style={styles.hint}>Connecting…</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#0b0b0f', alignItems: 'center', justifyContent: 'center', padding: 48},
  brand: {color: '#44ccff', fontSize: 40, fontWeight: '700', marginBottom: 24},
  reps: {color: '#fff', fontSize: 220, fontWeight: '800'},
  label: {color: '#aaa', fontSize: 40},
  hint: {color: '#ffcc66', fontSize: 36, marginTop: 24},
  hintSmall: {color: '#aaa', fontSize: 22, marginTop: 24},
  meta: {color: '#666', fontSize: 24, marginTop: 32},
  pairing: {flexDirection: 'row', alignItems: 'center', maxWidth: '100%'},
  pairingText: {marginLeft: 48, flexShrink: 1},
  step: {color: '#fff', fontSize: 32, fontWeight: '700'},
  or: {color: '#aaa', fontSize: 24, marginTop: 16},
  code: {color: '#fff', fontSize: 72, fontWeight: '800', letterSpacing: 10, marginTop: 8},
});
