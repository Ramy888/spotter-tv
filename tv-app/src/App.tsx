import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {useEffect, useRef, useState} from 'react';
import {CoachSummary, coach} from './coach';
import {PHONE_URL, RELAY_URL} from './config';
import {ExerciseDef, ExerciseId} from './exercises';
import {Point} from './exercises/pose';
import {Cue, Exercise} from './exercises/types';
import {Profile, ProfileStore, Progress, isRealName} from './profiles';
import {RelayMessageReader} from './relayMessages';
import {Reward, RewardTracker} from './rewards';
import {PairScreen} from './screens/PairScreen';
import {History, PickScreen} from './screens/PickScreen';
import {SummaryScreen, SummaryStats} from './screens/SummaryScreen';
import {NameScreen} from './screens/NameScreen';
import {WhoScreen} from './screens/WhoScreen';
import {WorkoutScreen} from './screens/WorkoutScreen';
import {Session, recordUpdate, startSession} from './session';
import {VoiceCoach} from './voice';
import {VoiceMode, VoicePlayer} from './voicePlayer';
import {Stage} from './Stage';

// connecting -> waiting (pairing code shown) -> picking (phone connected) -> active (workout) -> summary
type Phase = 'connecting' | 'waiting' | 'picking' | 'who' | 'name' | 'active' | 'summary';
// What the user chose to look at, once a phone is connected; frames arriving must not override it.
type Screen = 'pick' | 'who' | 'name' | 'workout' | 'summary';

const RECONNECT_MS = 2000;
const PHONE_SILENT_MS = 3000; // no frames for this long: treat the phone as gone
// API Gateway closes WebSocket connections after 10 idle minutes, which would replace the
// pairing code while someone is fetching their phone. A ping every 5 minutes keeps it open.
const KEEPALIVE_MS = 5 * 60 * 1000;
const UI_INTERVAL_MS = 100;
const CUE_SHOW_MS = 2500;

const VOICE_LABEL: Record<VoiceMode, string> = {tv: 'TV', phone: 'Phone', off: 'Off'};
const NEXT_VOICE: Record<VoiceMode, VoiceMode> = {tv: 'phone', phone: 'off', off: 'tv'};

// `celebration.id` changes for each new reward, which remounts the animation.
type Workout = {
  reps: number;
  metric: number | null;
  cue: Cue | null;
  cueAt: number;
  celebration: {reward: Reward; id: number} | null;
  target: number | null;
  set: number;
  paceMs: number | null;
  streak: number;
  bestDepth: number | null;
};
const EMPTY_WORKOUT: Workout = {
  reps: 0,
  metric: null,
  cue: null,
  cueAt: 0,
  celebration: null,
  target: null,
  set: 1,
  paceMs: null,
  streak: 0,
  bestDepth: null,
};

const average = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

function sessionStats(s: Session): Pick<Workout, 'paceMs' | 'bestDepth'> {
  const depths = s.reps.map((r) => r.depth).filter((d): d is number => d != null);
  return {
    paceMs: average(s.reps.map((r) => r.durationMs)),
    bestDepth: depths.length ? Math.min(...depths) : null,
  };
}

export const App = () => {
  const [phase, setPhase] = useState<Phase>('connecting');
  const [code, setCode] = useState<string | null>(null);
  const [exercise, setExercise] = useState<ExerciseDef | null>(null);
  const [workout, setWorkout] = useState<Workout>(EMPTY_WORKOUT);
  const [fps, setFps] = useState(0);
  const [summary, setSummary] = useState<CoachSummary | null>(null);
  const [aiCoached, setAiCoached] = useState(false);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('tv');
  const [history, setHistory] = useState<History>({});
  const [player, setPlayer] = useState<Profile>({id: 'p1', name: 'Player 1'});
  const [players, setPlayers] = useState<Profile[]>([]);
  const [playersProgress, setPlayersProgress] = useState<Record<string, Progress>>({});
  // Whose name is being typed, and where to go afterwards: back to "Who's training?" after an
  // edit, or on to the picker for a player who was just added.
  const [naming, setNaming] = useState<{id: string; isNew: boolean} | null>(null);
  // Anonymous players and their progress, saved on the TV (no account).
  const profiles = useRef(new ProfileStore(AsyncStorage));
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);

  // The socket handlers live in one long-lived effect, so they read current state through refs.
  const detector = useRef<Exercise | null>(null);
  const session = useRef<Session | null>(null);
  const rewards = useRef<RewardTracker | null>(null);
  const sets = useRef<Partial<Record<ExerciseId, number>>>({});
  const screen = useRef<Screen>('pick');
  const socket = useRef<WebSocket | null>(null);
  // True while a coach request for the summary on screen is outstanding.
  const awaitingCoach = useRef(false);
  const voiceCoach = useRef<VoiceCoach | null>(null);
  // Speaks on the TV; if TV audio fails it switches itself to the phone (and the setting follows).
  const voice = useRef(
    new VoicePlayer(
      'tv',
      (clips) => {
        if (socket.current?.readyState === WebSocket.OPEN) {
          socket.current.send(JSON.stringify({action: 'say', clips}));
        }
      },
      () => setVoiceMode('phone'),
    ),
  );
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
    awaitingCoach.current = false;
    const target = profiles.current.activeProgress[def.id]?.target ?? null;
    voiceCoach.current = new VoiceCoach(target);
    voice.current.say(voiceCoach.current.start());
    session.current = startSession(def.id, Date.now());
    rewards.current = new RewardTracker(target);
    screen.current = 'workout';
    sets.current[def.id] = (sets.current[def.id] ?? 0) + 1;
    latest.current = {...EMPTY_WORKOUT, target, set: sets.current[def.id]!};
    setWorkout(latest.current);
    setExercise(def);
    setPhase('active');
  };

  const cycleVoice = () => {
    const next = NEXT_VOICE[voice.current.mode];
    voice.current.mode = next;
    setVoiceMode(next);
  };

  const finish = () => {
    cancelUiUpdate();
    if (voiceCoach.current) {
      voice.current.say(voiceCoach.current.finish());
      voiceCoach.current = null;
    }
    detector.current = null;
    screen.current = 'summary';
    if (session.current) {
      const result = coach(session.current);
      const done = session.current;
      const doneStats = sessionStats(done);
      profiles.current
        .recordSession(done.exercise, done.reps.length, result.target, doneStats.bestDepth)
        .then(() => setHistory(profiles.current.activeProgress))
        .catch(() => {}); // saving is best effort; the workout itself already happened
      setSummaryStats({...doneStats, reps: done.reps.length, clean: done.reps.length - done.cues.slower});
      setSummary(result);
      setAiCoached(false);
      // Show the rule-based summary now; the relay may send back an AI rewrite of it.
      if (socket.current?.readyState === WebSocket.OPEN) {
        awaitingCoach.current = true;
        socket.current.send(
          JSON.stringify({
            action: 'coach',
            exercise: session.current.exercise,
            reps: session.current.reps.length,
            summary: result,
          }),
        );
      }
    }
    setPhase('summary');
  };

  const syncProfiles = () => {
    setPlayer(profiles.current.active);
    setPlayers(profiles.current.profiles);
    setHistory(profiles.current.activeProgress);
  };

  const openWho = async () => {
    setPlayersProgress(await profiles.current.allProgress());
    syncProfiles();
    screen.current = 'who';
    setPhase('who');
  };

  const pickPlayer = async (id: string) => {
    await profiles.current.switchTo(id);
    syncProfiles();
    newWorkout();
  };

  const addPlayer = async () => {
    const added = await profiles.current.add();
    syncProfiles();
    if (added) {
      openName(added.id, true);
    }
  };

  const openName = (id: string, isNew: boolean) => {
    setNaming({id, isNew});
    screen.current = 'name';
    setPhase('name');
  };

  const closeName = async (name: string | null) => {
    if (naming && name) {
      await profiles.current.rename(naming.id, name);
      syncProfiles();
    }
    setNaming(null);
    if (naming?.isNew) {
      newWorkout();
    } else {
      await openWho();
    }
  };

  const newWorkout = () => {
    awaitingCoach.current = false;
    screen.current = 'pick';
    setPhase('picking');
  };

  useEffect(() => {
    profiles.current.load().then(syncProfiles).catch(() => {}); // no saved data: start as Player 1
  }, []);

  useEffect(() => {
    let ws: WebSocket;
    let reconnect: ReturnType<typeof setTimeout> | undefined;
    let closed = false;

    // Counting runs on every frame; the screen redraws at most every UI_INTERVAL_MS, so a slow
    // render can't back up the message queue.
    const flushUi = () => {
      uiTimer.current = undefined;
      if (screen.current === 'workout') {
        setWorkout(latest.current);
        setPhase('active');
      } else if (screen.current === 'pick') {
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
      // Keep a summary on screen if the user is reading it; otherwise go back to pairing.
      if (screen.current === 'summary') {
        return;
      }
      screen.current = 'pick';
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
        if (session.current) {
          recordUpdate(session.current, u, now);
        }
        const prev = latest.current;
        const reward = rewards.current?.update(u) ?? null;
        if (voiceCoach.current) {
          voice.current.say(voiceCoach.current.update(u, reward, t));
        }
        latest.current = {
          ...prev,
          ...(u.rep && session.current ? sessionStats(session.current) : {}),
          reps: u.reps,
          metric: u.metric,
          cue: u.cue ?? (now - prev.cueAt < CUE_SHOW_MS ? prev.cue : null),
          cueAt: u.cue ? now : prev.cueAt,
          celebration: reward ? {reward, id: (prev.celebration?.id ?? 0) + 1} : prev.celebration,
          streak: rewards.current?.cleanStreak ?? 0,
        };
        // Lets the phone show the live count too.
        if (u.rep && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({action: 'status', reps: u.reps, exercise: session.current?.exercise}));
        }
      }
      if (!uiTimer.current) {
        uiTimer.current = setTimeout(flushUi, UI_INTERVAL_MS);
      }
    };

    const connect = () => {
      setPhase('connecting');
      ws = new WebSocket(`${RELAY_URL}?role=tv`);
      socket.current = ws;
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
        } else if (msg.type === 'coach') {
          const ai = msg.summary as CoachSummary | null;
          const valid =
            ai != null &&
            typeof ai.headline === 'string' &&
            typeof ai.next === 'string' &&
            Array.isArray(ai.insights) &&
            ai.insights.every((i) => typeof i === 'string');
          if (valid && awaitingCoach.current && screen.current === 'summary') {
            setSummary(ai);
            setAiCoached(true);
          }
          awaitingCoach.current = false;
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

  const shownName = isRealName(player.name) ? player.name : null;
  let content: React.ReactNode;
  if (phase === 'active' && exercise) {
    content = <WorkoutScreen exercise={exercise} w={workout} fps={fps} onFinish={finish} playerName={shownName} />;
  } else if (phase === 'summary' && exercise && summary && summaryStats) {
    content = (
      <SummaryScreen
        exercise={exercise}
        stats={summaryStats}
        summary={summary}
        aiCoached={aiCoached}
        onAgain={() => choose(exercise)}
        onNew={newWorkout}
        playerName={shownName}
      />
    );
  } else if (phase === 'picking') {
    content = (
      <PickScreen
        fps={fps}
        history={history}
        voiceLabel={VOICE_LABEL[voiceMode]}
        playerName={player.name}
        onPick={choose}
        onCycleVoice={cycleVoice}
        onSwitchPlayer={openWho}
      />
    );
  } else if (phase === 'who') {
    content = (
      <WhoScreen
        profiles={players}
        activeId={player.id}
        progressOf={(id) => playersProgress[id]}
        canAdd={profiles.current.canAdd()}
        onPick={pickPlayer}
        onAdd={addPlayer}
        onRename={(id) => openName(id, false)}
      />
    );
  } else if (phase === 'name' && naming) {
    content = (
      <NameScreen
        current={players.find((p) => p.id === naming.id)?.name ?? ''}
        cancelLabel={naming.isNew ? 'Skip' : 'Cancel'}
        onSave={closeName}
        onCancel={() => closeName(null)}
      />
    );
  } else {
    content = <PairScreen code={phase === 'waiting' ? code : null} phoneUrl={PHONE_URL} />;
  }
  return <Stage>{content}</Stage>;
};
