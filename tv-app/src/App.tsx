import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {useEffect, useRef, useState} from 'react';
import {ImageSourcePropType} from 'react-native';
import {CoachSummary, coach} from './coach';
import {PHONE_URL, RELAY_URL} from './config';
import {ExerciseDef, ExerciseId} from './exercises';
import {Point} from './exercises/pose';
import {Cue, Exercise} from './exercises/types';
import {Profile, ProfileStore, Progress, isRealName, spokenName} from './profiles';
import {RelayMessageReader} from './relayMessages';
import {Reward, RewardTracker} from './rewards';
import {isBigReward, pickRewardArt} from './rewardArt';
import {PairScreen} from './screens/PairScreen';
import {History, PickScreen} from './screens/PickScreen';
import {SummaryScreen, SummaryStats} from './screens/SummaryScreen';
import {NameScreen} from './screens/NameScreen';
import {WhoScreen} from './screens/WhoScreen';
import {WorkoutScreen} from './screens/WorkoutScreen';
import {Plan, REST_CHOICES, planFor} from './plan';
import {Session, currentSetReps, endSet, recordUpdate, startSession} from './session';
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
// While no phone is connected, swap the pairing code for a fresh one this often. A code left on
// screen for hours (or across the Mac sleeping) may belong to an expired session or a dead socket.
const PAIRING_REFRESH_MS = 10 * 60 * 1000;
const PAIRING_CHECK_MS = 30 * 1000;
// Ask again for a name's clips only after this long (the relay also rate-limits per TV).
const VOICE_NAME_RETRY_MS = 15 * 1000;
const UI_INTERVAL_MS = 100;
const REST_TICK_MS = 250;
const CUE_SHOW_MS = 2500;

const VOICE_LABEL: Record<VoiceMode, string> = {tv: 'TV', phone: 'Phone', off: 'Off'};
const NEXT_VOICE: Record<VoiceMode, VoiceMode> = {tv: 'phone', phone: 'off', off: 'tv'};

// `celebration.id` changes for each new reward, which remounts the animation.
type Workout = {
  reps: number;
  metric: number | null;
  cue: Cue | null;
  cueAt: number;
  celebration: {reward: Reward; id: number; art: ImageSourcePropType | null} | null;
  target: number | null; // reps in this set
  set: number; // the set in progress, from 1
  sets: number; // sets in the plan
  stage: 'set' | 'rest';
  restLeft: number; // seconds, while resting
  restSec: number;
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
  sets: 1,
  stage: 'set',
  restLeft: 0,
  restSec: 0,
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
  const [summaryArt, setSummaryArt] = useState<ImageSourcePropType | null>(null);
  // The last reward art shown, so the next one is different.
  const lastArt = useRef<ImageSourcePropType | null>(null);

  // The socket handlers live in one long-lived effect, so they read current state through refs.
  const detector = useRef<Exercise | null>(null);
  const session = useRef<Session | null>(null);
  const rewards = useRef<RewardTracker | null>(null);
  // The workout plan (sets × reps, rest) and where we are in it.
  const plan = useRef<Plan>(planFor('squat'));
  const exerciseDef = useRef<ExerciseDef | null>(null);
  const restTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const restEndsAt = useRef(0);
  const restSaid = useRef(new Set<string>()); // rest lines already spoken this rest
  const screen = useRef<Screen>('pick');
  const socket = useRef<WebSocket | null>(null);
  // True while a coach request for the summary on screen is outstanding.
  const awaitingCoach = useRef(false);
  const voiceCoach = useRef<VoiceCoach | null>(null);
  // The last name whose clips the relay confirmed exist ("Let's go, Ramy!").
  const voiceNameReady = useRef<string | null>(null);
  const voiceNameAsked = useRef({name: '', at: 0});
  const nameFromPhone = useRef<(name: string) => void>(() => {});
  const setDone = useRef<() => void>(() => {});
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
    stopRest();
    exerciseDef.current = def;
    detector.current = def.create();
    awaitingCoach.current = false;
    const restChoice = profiles.current.profiles.length ? profiles.current.active.restSec : undefined; // undefined until loaded
    plan.current = planFor(def.id, profiles.current.activeProgress[def.id], restChoice);
    const {sets, reps: target, restSec} = plan.current;
    requestVoiceName(); // normally already ready; if not, it will be for the next workout
    voiceCoach.current = new VoiceCoach(target, Math.random, voice.current.voiceName != null);
    voice.current.say(voiceCoach.current.start());
    session.current = startSession(def.id, Date.now());
    rewards.current = new RewardTracker(target);
    screen.current = 'workout';
    latest.current = {...EMPTY_WORKOUT, target, set: 1, sets, restSec};
    setWorkout(latest.current);
    setExercise(def);
    setPhase('active');
  };

  // A set reached its rep count: rest before the next one, or end the workout after the last.
  // Called from the socket effect through a ref, so it always sees this render's functions.
  const completeSet = () => {
    if (!session.current || screen.current !== 'workout') {
      return;
    }
    endSet(session.current);
    if (session.current.sets.length >= plan.current.sets) {
      finish();
      return;
    }
    detector.current = null; // frames keep coming during the rest; they don't count
    restEndsAt.current = Date.now() + plan.current.restSec * 1000;
    restSaid.current = new Set();
    if (voiceCoach.current) {
      voice.current.say(voiceCoach.current.restStart());
    }
    latest.current = {...latest.current, stage: 'rest', restLeft: plan.current.restSec, cue: null};
    setWorkout(latest.current);
    sendStatus();
    restTimer.current = setInterval(tickRest, REST_TICK_MS);
  };

  const tickRest = () => {
    const left = Math.ceil((restEndsAt.current - Date.now()) / 1000);
    if (left <= 0) {
      startNextSet();
      return;
    }
    const say = (key: string, clips: () => string[]) => {
      if (!restSaid.current.has(key) && voiceCoach.current) {
        restSaid.current.add(key);
        voice.current.say(clips());
      }
    };
    if (left <= Math.floor(plan.current.restSec / 2)) {
      say('mid', () => voiceCoach.current!.restMid());
    }
    if (left <= 3) {
      say(`count-${left}`, () => [`count-${left}`]);
    }
    if (left !== latest.current.restLeft) {
      latest.current = {...latest.current, restLeft: left};
      setWorkout(latest.current);
      sendStatus();
    }
  };

  const startNextSet = () => {
    stopRest();
    if (screen.current !== 'workout' || !exerciseDef.current) {
      return;
    }
    detector.current = exerciseDef.current.create(); // fresh: no half movement carries over
    if (stats.current.lastFrameAt) {
      stats.current.lastFrameAt = Date.now(); // the silence check starts over with the new set
    }
    if (voiceCoach.current) {
      voice.current.say(voiceCoach.current.nextSet(latest.current.set + 1, latest.current.sets));
    }
    latest.current = {
      ...latest.current,
      stage: 'set',
      set: latest.current.set + 1,
      reps: 0,
      metric: null,
      cue: null,
      restLeft: 0,
    };
    setWorkout(latest.current);
    sendStatus();
  };

  // Lets the phone show the live count, the set, and the rest countdown. Reads refs only.
  const sendStatus = () => {
    const w = latest.current;
    if (session.current && socket.current?.readyState === WebSocket.OPEN) {
      socket.current.send(
        JSON.stringify({
          action: 'status',
          reps: w.reps,
          exercise: session.current.exercise,
          set: w.set,
          sets: w.sets,
          stage: w.stage,
          ...(w.stage === 'rest' && {restLeft: w.restLeft}),
        }),
      );
    }
  };

  const stopRest = () => {
    if (restTimer.current) {
      clearInterval(restTimer.current);
      restTimer.current = undefined;
    }
  };

  setDone.current = completeSet;

  // Reward art for an exercise, avoiding the last one shown.
  const nextArt = (id: ExerciseId) => {
    lastArt.current = pickRewardArt(id, Math.random, lastArt.current);
    return lastArt.current;
  };

  // Only the big moments get a picture. Reads refs only, so the socket effect can call it.
  const bigRewardArt = (reward: Reward) => {
    if (!session.current || !isBigReward(reward.kind)) {
      return null;
    }
    lastArt.current = pickRewardArt(session.current.exercise, Math.random, lastArt.current);
    return lastArt.current;
  };

  // Auto → 30 s → 45 s → 60 s → 90 s → Auto, saved for this player.
  const cycleRest = async () => {
    const current = REST_CHOICES.indexOf(player.restSec ?? null);
    await profiles.current.setRest(player.id, REST_CHOICES[(current + 1) % REST_CHOICES.length]);
    syncProfiles();
  };

  const cycleVoice = () => {
    const next = NEXT_VOICE[voice.current.mode];
    voice.current.mode = next;
    setVoiceMode(next);
  };

  const finish = () => {
    cancelUiUpdate();
    stopRest();
    if (screen.current !== 'workout') {
      return; // already finished (the last set ends the workout by itself)
    }
    if (voiceCoach.current) {
      voice.current.say(voiceCoach.current.finish());
      voiceCoach.current = null;
    }
    detector.current = null;
    screen.current = 'summary';
    if (session.current) {
      endSet(session.current); // a set cut short still counts
      const result = coach(session.current, plan.current);
      const done = session.current;
      const doneStats = sessionStats(done);
      profiles.current
        .recordSession(done.exercise, done.reps.length, result.target ?? plan.current.reps, doneStats.bestDepth)
        .then(() => setHistory(profiles.current.activeProgress))
        .catch(() => {}); // saving is best effort; the workout itself already happened
      setSummaryStats({
        ...doneStats,
        reps: done.reps.length,
        clean: done.reps.length - done.cues.slower,
        sets: done.sets,
      });
      setSummaryArt(done.reps.length > 0 ? nextArt(done.exercise) : null); // a reward for finishing the set
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
    requestVoiceName();
  };

  // The coach uses the active player's name once the relay has made its clips. Asked for as soon
  // as the player is known, so the clips are ready by the time a workout starts.
  const requestVoiceName = () => {
    const active = profiles.current.profiles.length ? profiles.current.active : null; // null until loaded
    const name = active ? spokenName(active.name) : null;
    voice.current.voiceName = name != null && name === voiceNameReady.current ? name : null;
    const asked = voiceNameAsked.current;
    const waiting = asked.name === name && Date.now() - asked.at < VOICE_NAME_RETRY_MS;
    if (name && name !== voiceNameReady.current && !waiting && socket.current?.readyState === WebSocket.OPEN) {
      voiceNameAsked.current = {name, at: Date.now()};
      socket.current.send(JSON.stringify({action: 'voice-name', name}));
    }
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
    sendNamePrompt(true);
  };

  // Typing on a TV remote is slow, so the paired phone shows a name field too.
  const sendNamePrompt = (open: boolean) => {
    if (socket.current?.readyState === WebSocket.OPEN) {
      socket.current.send(JSON.stringify({action: 'name-prompt', open}));
    }
  };

  const closeName = async (name: string | null) => {
    sendNamePrompt(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once; syncProfiles only reads refs
  }, []);

  useEffect(() => {
    let ws: WebSocket;
    let reconnect: ReturnType<typeof setTimeout> | undefined;
    let closed = false;
    let waitingSince = 0; // when the current code went up with no phone connected; 0 = not waiting

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

    const clearRestTimer = () => {
      if (restTimer.current) {
        clearInterval(restTimer.current);
        restTimer.current = undefined;
      }
    };

    const phoneGone = () => {
      cancelUiUpdate();
      clearRestTimer(); // a rest doesn't run on behind the pairing screen
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
      waitingSince = Date.now();
    };

    const onFrame = (kp: Point[], capturedAt: number | undefined) => {
      const now = Date.now();
      const s = stats.current;
      if (!s.lastFrameAt && screen.current === 'name') {
        sendNamePrompt(true); // a phone that (re)joins while the TV is asking for a name
      }
      s.lastFrameAt = now;
      waitingSince = 0; // a phone is here
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
          celebration: reward
            ? {reward, id: (prev.celebration?.id ?? 0) + 1, art: bigRewardArt(reward)}
            : prev.celebration,
          streak: rewards.current?.cleanStreak ?? 0,
        };
        if (u.rep) {
          sendStatus();
        }
        if (u.rep && session.current && currentSetReps(session.current) >= plan.current.reps) {
          setDone.current();
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
          waitingSince = Date.now();
          requestVoiceName();
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
        } else if (msg.type === 'name') {
          if (typeof msg.name === 'string') {
            nameFromPhone.current(msg.name);
          }
        } else if (msg.type === 'voice-name') {
          if (msg.ready === true && typeof msg.name === 'string') {
            voiceNameReady.current = msg.name;
            requestVoiceName(); // uses it only if it's still the active player's name
          }
        } else if (msg.type === 'phone-left') {
          phoneGone();
        } else if (Array.isArray(msg.kp)) {
          onFrame(msg.kp as Point[], typeof msg.t === 'number' && Number.isFinite(msg.t) ? msg.t : undefined);
        }
      };
      ws.onclose = () => {
        // A new connection gets a new session and code; the old code is gone with the old socket,
        // so stop showing it right away.
        waitingSince = 0;
        setPhase((p) => (p === 'waiting' ? 'connecting' : p));
        if (!closed) {
          reconnect = setTimeout(connect, RECONNECT_MS);
        }
      };
    };

    // The relay reports a phone that disconnects, but a phone that just stops sending
    // (camera paused, browser in the background) keeps its connection open.
    const watchdog = setInterval(() => {
      // The phone only sends while it sees a body, so a rest (stepping away for water) is silent
      // on purpose. A real disconnect still arrives as "phone-left" from the relay.
      const resting = latest.current.stage === 'rest' && screen.current === 'workout';
      if (!resting && stats.current.lastFrameAt && Date.now() - stats.current.lastFrameAt > PHONE_SILENT_MS) {
        phoneGone();
      }
    }, 1000);

    const pairingRefresh = setInterval(() => {
      if (waitingSince && Date.now() - waitingSince >= PAIRING_REFRESH_MS) {
        ws.close(); // onclose reconnects, and the relay hands out a new code
      }
    }, PAIRING_CHECK_MS);

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
      clearInterval(pairingRefresh);
      clearRestTimer();
      cancelUiUpdate();
      if (reconnect) {
        clearTimeout(reconnect);
      }
      ws.close();
    };
  }, []);

  // The socket effect is long-lived; this ref always points at the current render's closeName.
  nameFromPhone.current = (name: string) => {
    if (screen.current === 'name' && naming) {
      closeName(name);
    }
  };

  const shownName = isRealName(player.name) ? player.name : null;
  let content: React.ReactNode;
  if (phase === 'active' && exercise) {
    content = <WorkoutScreen
        exercise={exercise}
        w={workout}
        fps={fps}
        onFinish={finish}
        onSkipRest={startNextSet}
        playerName={shownName}
      />;
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
        art={summaryArt}
      />
    );
  } else if (phase === 'picking') {
    content = (
      <PickScreen
        fps={fps}
        history={history}
        voiceLabel={VOICE_LABEL[voiceMode]}
        restLabel={player.restSec ? `${player.restSec} s` : 'Auto'}
        restSec={player.restSec ?? null}
        onCycleRest={cycleRest}
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
