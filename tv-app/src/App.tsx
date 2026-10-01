import React, {useEffect, useRef, useState} from 'react';
import {Dimensions, StyleSheet, Text, View} from 'react-native';
import {PHONE_URL, RELAY_URL} from './config';
import {EXERCISES, ExerciseDef} from './exercises';
import {Point} from './exercises/pose';
import {CUE_TEXT, Cue, Exercise} from './exercises/types';
import {FocusButton} from './FocusButton';
import {QrCode} from './QrCode';
import {RelayMessageReader} from './relayMessages';

// connecting -> waiting (pairing code shown) -> picking (phone connected) -> active (workout)
type Phase = 'connecting' | 'waiting' | 'picking' | 'active';

const RECONNECT_MS = 2000;
const PHONE_SILENT_MS = 3000; // no frames for this long: treat the phone as gone
// API Gateway closes WebSocket connections after 10 idle minutes, which would replace the
// pairing code while someone is fetching their phone. A ping every 5 minutes keeps it open.
const KEEPALIVE_MS = 5 * 60 * 1000;
const UI_INTERVAL_MS = 100;
const CUE_SHOW_MS = 2500;

// A TV screen doesn't resize, so read it once instead of subscribing to changes.
const screenSize = Dimensions.get('window');
const QR_SIZE = Math.round(Math.min(screenSize.height * 0.55, screenSize.width * 0.3));

type Workout = {reps: number; metric: number | null; cue: Cue | null; cueAt: number};
const EMPTY_WORKOUT: Workout = {reps: 0, metric: null, cue: null, cueAt: 0};

export const App = () => {
  const [phase, setPhase] = useState<Phase>('connecting');
  const [code, setCode] = useState<string | null>(null);
  const [exercise, setExercise] = useState<ExerciseDef | null>(null);
  const [workout, setWorkout] = useState<Workout>(EMPTY_WORKOUT);
  const [fps, setFps] = useState(0);

  // The socket handlers live in one long-lived effect, so they read current state through refs.
  const detector = useRef<Exercise | null>(null);
  const latest = useRef<Workout>(EMPTY_WORKOUT);
  const stats = useRef({frames: 0, since: Date.now(), lastFrameAt: 0, lastCapturedAt: -Infinity});
  const uiTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const cancelUiUpdate = () => {
    if (uiTimer.current) {
      clearTimeout(uiTimer.current);
      uiTimer.current = undefined;
    }
  };

  const choose = (def: ExerciseDef) => {
    detector.current = def.create();
    latest.current = EMPTY_WORKOUT;
    setWorkout(EMPTY_WORKOUT);
    setExercise(def);
    setPhase('active');
  };

  const backToPicker = () => {
    cancelUiUpdate();
    detector.current = null;
    setPhase('picking');
  };

  useEffect(() => {
    let ws: WebSocket;
    let reconnect: ReturnType<typeof setTimeout> | undefined;
    let closed = false;

    // Counting runs on every frame; the screen redraws at most every UI_INTERVAL_MS, so a slow
    // render can't back up the message queue.
    const flushUi = () => {
      uiTimer.current = undefined;
      if (detector.current) {
        setWorkout(latest.current);
        setPhase('active');
      } else {
        setPhase('picking');
      }
    };

    const phoneGone = () => {
      cancelUiUpdate();
      detector.current = null;
      stats.current.lastFrameAt = 0;
      // A phone that comes back (page reload, new phone) starts a new clock.
      stats.current.lastCapturedAt = -Infinity;
      setFps(0);
      setPhase((p) => (p === 'connecting' ? p : 'waiting'));
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
      // then delivered in a burst would otherwise look like reps faster than the minimum.
      const t = capturedAt ?? now;
      if (t < s.lastCapturedAt) {
        return; // out-of-order frame from the relay; it's already history
      }
      s.lastCapturedAt = t;
      if (detector.current) {
        const u = detector.current.update(kp, t);
        const prev = latest.current;
        latest.current = {
          reps: u.reps,
          metric: u.metric,
          cue: u.cue ?? (now - prev.cueAt < CUE_SHOW_MS ? prev.cue : null),
          cueAt: u.cue ? now : prev.cueAt,
        };
      }
      if (!uiTimer.current) {
        uiTimer.current = setTimeout(flushUi, UI_INTERVAL_MS);
      }
    };

    const connect = () => {
      setPhase('connecting');
      ws = new WebSocket(`${RELAY_URL}?role=tv`);
      const reader = new RelayMessageReader();
      ws.onopen = () => ws.send(JSON.stringify({action: 'host'}));
      ws.onmessage = (e) => {
        const msg = reader.read(String(e.data));
        if (!msg) {
          return;
        }
        if (msg.type === 'session' && typeof msg.code === 'string') {
          console.log(`[spotter] session ${msg.code}`);
          setCode(msg.code);
          setPhase('waiting');
        } else if (msg.type === 'phone-left') {
          phoneGone();
        } else if (Array.isArray(msg.kp)) {
          onFrame(msg.kp as Point[], typeof msg.t === 'number' && Number.isFinite(msg.t) ? msg.t : undefined);
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
        phoneGone();
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
      clearInterval(watchdog);
      cancelUiUpdate();
      if (reconnect) {
        clearTimeout(reconnect);
      }
      ws.close();
    };
  }, []);

  if (phase === 'active' && exercise) {
    return (
      <View style={styles.screen}>
        <Text style={styles.brand}>{exercise.name}</Text>
        <Text style={styles.reps}>{workout.reps}</Text>
        <Text style={styles.label}>{exercise.unit}</Text>
        <Text style={styles.cue} testID="cue">
          {workout.cue ? CUE_TEXT[workout.cue] : ' '}
        </Text>
        <Text style={styles.meta}>
          {workout.metric == null ? '' : `${exercise.metricLabel} ${workout.metric}${exercise.id === 'jumping-jack' ? '×' : '°'} · `}
          {fps} frames/s
        </Text>
        <View style={styles.actions}>
          <FocusButton label="Change workout" onPress={backToPicker} preferred testID="back" />
        </View>
      </View>
    );
  }

  if (phase === 'picking') {
    return (
      <View style={styles.screen}>
        <Text style={styles.brand}>Spotter</Text>
        <Text style={styles.step}>Phone connected. Choose a workout</Text>
        <View style={styles.picker}>
          {EXERCISES.map((def, i) => (
            <FocusButton
              key={def.id}
              label={def.name}
              onPress={() => choose(def)}
              preferred={i === 0}
              testID={`pick-${def.id}`}
            />
          ))}
        </View>
        <Text style={styles.meta}>{fps} frames/s from your phone</Text>
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
  reps: {color: '#fff', fontSize: 150, fontWeight: '800', lineHeight: 170},
  label: {color: '#aaa', fontSize: 36},
  cue: {color: '#ffcc66', fontSize: 44, fontWeight: '700', marginTop: 12, minHeight: 56},
  hint: {color: '#ffcc66', fontSize: 36, marginTop: 24},
  hintSmall: {color: '#aaa', fontSize: 22, marginTop: 24},
  meta: {color: '#666', fontSize: 24, marginTop: 16},
  actions: {marginTop: 20},
  picker: {flexDirection: 'row', marginTop: 40},
  pairing: {flexDirection: 'row', alignItems: 'center', maxWidth: '100%'},
  pairingText: {marginLeft: 48, flexShrink: 1},
  step: {color: '#fff', fontSize: 32, fontWeight: '700'},
  or: {color: '#aaa', fontSize: 24, marginTop: 16},
  code: {color: '#fff', fontSize: 72, fontWeight: '800', letterSpacing: 10, marginTop: 8},
});
