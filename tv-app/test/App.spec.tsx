/* eslint-env es2020 */
import 'react-native';
import {act, fireEvent, render} from '@testing-library/react-native';
import * as React from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import {AudioPlayer} from './mocks/w3cmedia'; // what jest.config maps the Vega media player to
import {App} from '../src/App';

class FakeSocket {
  static OPEN = 1;
  static last: FakeSocket;
  readyState = 1;
  sent: string[] = [];
  onopen?: () => void;
  onmessage?: (e: {data: string}) => void;
  onclose?: () => void;
  constructor(public url: string) {
    FakeSocket.last = this;
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {}
}

const deliver = (msg: object) => act(() => FakeSocket.last.onmessage?.({data: JSON.stringify(msg)}));

function frame(kneeOffset: number) {
  const kp = Array.from({length: 33}, () => [0.5, 0.5, 1]);
  for (const [s, dx] of [[0, -0.05], [1, 0.05]]) {
    kp[23 + s] = [0.5 + dx, 0.45, 1];
    kp[25 + s] = [0.5 + dx + kneeOffset, 0.65, 1];
    kp[27 + s] = [0.5 + dx, 0.85, 1];
  }
  return {kp};
}

// Phone connects (first frame arrives), then the user picks Squats with the remote.
function startSquats(screen: ReturnType<typeof render>) {
  deliver({type: 'session', code: 'KH7VET'});
  deliver({...frame(0), t: 0});
  act(() => jest.advanceTimersByTime(200));
  fireEvent.press(screen.getByTestId('pick-squat'));
}

describe('App', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    (globalThis as any).WebSocket = FakeSocket;
  });

  it('connects as the TV and asks the relay to host a session', () => {
    render(<App />);
    expect(FakeSocket.last.url).toMatch(/\?role=tv$/);
    act(() => FakeSocket.last.onopen?.());
    expect(FakeSocket.last.sent).toEqual([JSON.stringify({action: 'host'})]);
  });

  it('shows the pairing code and a QR code once the session exists', () => {
    const screen = render(<App />);
    deliver({type: 'session', code: 'KH7VET'});
    expect(screen.getByTestId('pairing-code')).toHaveTextContent('KH7VET');
    expect(screen.getByTestId('qr-code')).toBeTruthy();
  });

  it('shows the workout picker once the phone connects, and counts squats after picking', () => {
    jest.useFakeTimers();
    const screen = render(<App />);
    deliver({type: 'session', code: 'KH7VET'});
    deliver({...frame(0), t: 0});
    act(() => jest.advanceTimersByTime(200));
    expect(screen.getByTestId('pick-squat')).toBeTruthy();
    expect(screen.getByTestId('pick-lunge')).toBeTruthy();
    expect(screen.getByTestId('pick-jumping-jack')).toBeTruthy();

    fireEvent.press(screen.getByTestId('pick-squat'));
    let t = 0;
    for (const [offset, n] of [[0, 40], [0.2, 40], [0, 40]] as const) {
      for (let i = 0; i < n; i++) {
        t += 33;
        deliver({...frame(offset), t});
      }
    }
    act(() => jest.advanceTimersByTime(200));
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('squats')).toBeTruthy();
    jest.useRealTimers();
  });

  it('shows a "Go deeper" cue for a half squat', () => {
    jest.useFakeTimers();
    const screen = render(<App />);
    startSquats(screen);
    let t = 0;
    for (const [offset, n] of [[0, 40], [0.08, 40], [0, 40]] as const) {
      for (let i = 0; i < n; i++) {
        t += 33;
        deliver({...frame(offset), t});
      }
    }
    act(() => jest.advanceTimersByTime(200));
    expect(screen.getByTestId('cue')).toHaveTextContent(/go deeper/i);
    expect(screen.getByText('0')).toBeTruthy();
    jest.useRealTimers();
  });

  it('goes back to the picker from the summary', () => {
    jest.useFakeTimers();
    const screen = render(<App />);
    startSquats(screen);
    fireEvent.press(screen.getByTestId('finish'));
    fireEvent.press(screen.getByTestId('new-workout'));
    deliver(frame(0));
    act(() => jest.advanceTimersByTime(200));
    expect(screen.getByTestId('pick-lunge')).toBeTruthy();
    jest.useRealTimers();
  });

  it('returns to the pairing screen when the phone leaves, even right after a frame', () => {
    jest.useFakeTimers();
    const screen = render(<App />);
    deliver({type: 'session', code: 'KH7VET'});
    deliver(frame(0));
    deliver({type: 'phone-left'});
    act(() => jest.advanceTimersByTime(200)); // a pending screen update must not undo this
    expect(screen.getByTestId('pairing-code')).toHaveTextContent('KH7VET');
    jest.useRealTimers();
  });

  it('pings every 5 minutes so API Gateway does not close the idle connection', () => {
    jest.useFakeTimers();
    render(<App />);
    act(() => FakeSocket.last.onopen?.());
    act(() => jest.advanceTimersByTime(5 * 60 * 1000));
    expect(FakeSocket.last.sent).toContain(JSON.stringify({action: 'ping'}));
    jest.useRealTimers();
  });

  it('times reps by capture time, so a burst of delayed frames still counts every squat', () => {
    jest.useFakeTimers();
    const screen = render(<App />);
    startSquats(screen);
    // Two squats captured seconds apart, but delivered all at once (same arrival time).
    let t = 0;
    for (let rep = 0; rep < 2; rep++) {
      for (const [offset, n] of [[0, 40], [0.2, 40], [0, 40]] as const) {
        for (let i = 0; i < n; i++) {
          t += 33;
          deliver({...frame(offset), t});
        }
      }
    }
    act(() => jest.advanceTimersByTime(200)); // let the throttled screen update run
    expect(screen.getByText('2')).toBeTruthy();
    jest.useRealTimers();
  });

  it('keeps counting after the phone reloads the page and its clock restarts', () => {
    jest.useFakeTimers();
    const screen = render(<App />);
    const squat = (start: number) => {
      let t = start;
      for (const [offset, n] of [[0, 40], [0.2, 40], [0, 40]] as const) {
        for (let i = 0; i < n; i++) {
          t += 33;
          deliver({...frame(offset), t});
        }
      }
    };
    startSquats(screen);
    squat(100_000); // the phone's clock has been running for a while
    deliver({type: 'phone-left'}); // page reload: the phone disconnects...
    deliver({...frame(0), t: 0}); // ...and reconnects with its clock back at zero
    act(() => jest.advanceTimersByTime(200));
    fireEvent.press(screen.getByTestId('pick-squat'));
    squat(0);
    act(() => jest.advanceTimersByTime(200));
    expect(screen.getByText('1')).toBeTruthy();
    jest.useRealTimers();
  });

  it('survives a frame message that arrives split in two pieces (seen on Vega)', () => {
    jest.useFakeTimers();
    const screen = render(<App />);
    deliver({type: 'session', code: 'KH7VET'});
    const whole = JSON.stringify({...frame(0), t: 0});
    const cut = whole.indexOf('],[') + 1;
    act(() => FakeSocket.last.onmessage?.({data: whole.slice(0, cut)}));
    act(() => FakeSocket.last.onmessage?.({data: whole.slice(cut)}));
    act(() => jest.advanceTimersByTime(200));
    expect(screen.getByTestId('pick-squat')).toBeTruthy(); // the joined frame got through
    jest.useRealTimers();
  });

  it('shows a coach summary after Finish, built from the reps just done', () => {
    jest.useFakeTimers();
    const screen = render(<App />);
    startSquats(screen);
    let t = 0;
    for (let rep = 0; rep < 5; rep++) {
      for (const [offset, n] of [[0, 30], [0.2, 40], [0, 30]] as const) {
        for (let i = 0; i < n; i++) {
          t += 33;
          deliver({...frame(offset), t});
        }
      }
    }
    act(() => jest.advanceTimersByTime(200));
    fireEvent.press(screen.getByTestId('finish'));
    expect(screen.getByTestId('summary-headline')).toHaveTextContent('5 squats done');
    expect(screen.getByText(/Steady pace/)).toBeTruthy();
    expect(screen.getByText('7 squats with the same form.')).toBeTruthy(); // shown under the NEXT TIME label
    jest.useRealTimers();
  });

  it('starts the same workout again from the summary', () => {
    jest.useFakeTimers();
    const screen = render(<App />);
    startSquats(screen);
    fireEvent.press(screen.getByTestId('finish'));
    fireEvent.press(screen.getByTestId('again'));
    expect(screen.getByText(/Set\s*2/)).toBeTruthy(); // the second set of the same exercise
    expect(screen.getByLabelText('0 squats')).toBeTruthy();
    jest.useRealTimers();
  });

  it('celebrates the first rep on the workout screen', () => {
    jest.useFakeTimers();
    const screen = render(<App />);
    startSquats(screen);
    let t = 0;
    for (const [offset, n] of [[0, 30], [0.2, 40], [0, 30]] as const) {
      for (let i = 0; i < n; i++) {
        t += 33;
        deliver({...frame(offset), t});
      }
    }
    act(() => jest.advanceTimersByTime(200));
    expect(screen.getByTestId('celebration')).toBeTruthy();
    expect(screen.getByTestId('celebration-badge')).toHaveTextContent(/Let's go/);
    jest.useRealTimers();
  });

  const aiSummary = {
    headline: 'Five strong squats!',
    insights: ['You held a steady 2.0 s per rep.'],
    next: 'Next time, go for 7 squats with the same form.',
    target: 7,
  };

  it('asks the relay for AI coaching on Finish, then shows the AI version with a label', () => {
    jest.useFakeTimers();
    const screen = render(<App />);
    startSquats(screen);
    fireEvent.press(screen.getByTestId('finish'));
    const request = JSON.parse(FakeSocket.last.sent.find((m) => m.includes('"coach"'))!);
    expect(request).toMatchObject({action: 'coach', exercise: 'squat', reps: 0});
    expect(request.summary.headline).toBe('No full squats counted yet');

    deliver({type: 'coach', summary: aiSummary, provider: 'workers-ai'});
    expect(screen.getByTestId('summary-headline')).toHaveTextContent('Five strong squats!');
    expect(screen.getByTestId('ai-label')).toBeTruthy();
    jest.useRealTimers();
  });

  it('keeps the rule-based summary when the AI reply was rejected (summary: null)', () => {
    jest.useFakeTimers();
    const screen = render(<App />);
    startSquats(screen);
    fireEvent.press(screen.getByTestId('finish'));
    deliver({type: 'coach', summary: null, provider: 'workers-ai'});
    expect(screen.getByTestId('summary-headline')).toHaveTextContent('No full squats counted yet');
    expect(screen.queryByTestId('ai-label')).toBeNull();
    jest.useRealTimers();
  });

  it('ignores an AI reply that arrives after the user left the summary', () => {
    jest.useFakeTimers();
    const screen = render(<App />);
    startSquats(screen);
    fireEvent.press(screen.getByTestId('finish'));
    fireEvent.press(screen.getByTestId('again'));
    deliver({type: 'coach', summary: aiSummary, provider: 'workers-ai'});
    fireEvent.press(screen.getByTestId('finish'));
    expect(screen.getByTestId('summary-headline')).toHaveTextContent('No full squats counted yet');
    jest.useRealTimers();
  });

  const saidClips = () =>
    FakeSocket.last.sent
      .map((m) => JSON.parse(m))
      .filter((m) => m.action === 'say')
      .flatMap((m) => m.clips as string[]);

  it('cycles the voice setting TV -> Phone -> Off from the picker', () => {
    jest.useFakeTimers();
    const screen = render(<App />);
    deliver({type: 'session', code: 'KH7VET'});
    deliver({...frame(0), t: 0});
    act(() => jest.advanceTimersByTime(200));
    expect(screen.getByTestId('voice-mode')).toHaveTextContent(/voice: TV/i);
    fireEvent.press(screen.getByTestId('voice-mode'));
    expect(screen.getByTestId('voice-mode')).toHaveTextContent(/voice: Phone/i);
    fireEvent.press(screen.getByTestId('voice-mode'));
    expect(screen.getByTestId('voice-mode')).toHaveTextContent(/voice: Off/i);
    jest.useRealTimers();
  });

  it('in Phone mode, sends the start line and each rep count to the phone', () => {
    jest.useFakeTimers();
    const screen = render(<App />);
    deliver({type: 'session', code: 'KH7VET'});
    deliver({...frame(0), t: 0});
    act(() => jest.advanceTimersByTime(200));
    fireEvent.press(screen.getByTestId('voice-mode')); // Phone
    fireEvent.press(screen.getByTestId('pick-squat'));
    let t = 0;
    for (const [offset, n] of [[0, 30], [0.2, 40], [0, 30]] as const) {
      for (let i = 0; i < n; i++) {
        t += 33;
        deliver({...frame(offset), t});
      }
    }
    fireEvent.press(screen.getByTestId('finish'));
    const said = saidClips();
    expect(said[0]).toMatch(/^start-\d+$/);
    expect(said).toContain('count-1');
    expect(said[said.length - 1]).toMatch(/^finish-\d+$/);
    jest.useRealTimers();
  });

  it('in TV mode, plays on the TV and sends nothing to the phone', () => {
    jest.useFakeTimers();
    const screen = render(<App />);
    startSquats(screen);
    fireEvent.press(screen.getByTestId('finish'));
    expect(saidClips()).toEqual([]);
    jest.useRealTimers();
  });

  const flushAsync = () => act(async () => {});

  it('adds a player from the picker and switches to them', async () => {
    jest.useFakeTimers();
    const screen = render(<App />);
    await flushAsync();
    deliver({type: 'session', code: 'KH7VET'});
    deliver({...frame(0), t: 0});
    act(() => jest.advanceTimersByTime(200));
    expect(screen.getByTestId('player')).toHaveTextContent(/Player 1/);
    fireEvent.press(screen.getByTestId('player'));
    await flushAsync();
    expect(screen.getByTestId('who-p1')).toBeTruthy();
    fireEvent.press(screen.getByTestId('who-add'));
    await flushAsync();
    fireEvent.press(screen.getByTestId('name-cancel')); // "Skip"
    await flushAsync();
    expect(screen.getByTestId('player')).toHaveTextContent(/Player 2/);
    jest.useRealTimers();
  });

  const toPicker = () => {
    deliver({type: 'session', code: 'KH7VET'});
    deliver({...frame(0), t: 0});
    act(() => jest.advanceTimersByTime(200));
  };

  it('asks a new player for their name, then uses it on the picker and the workout', async () => {
    jest.useFakeTimers();
    const screen = render(<App />);
    await flushAsync();
    toPicker();
    fireEvent.press(screen.getByTestId('player'));
    await flushAsync();
    fireEvent.press(screen.getByTestId('who-add'));
    await flushAsync();
    fireEvent.changeText(screen.getByTestId('name-input'), '  Ramy ');
    fireEvent.press(screen.getByTestId('name-save'));
    await flushAsync();
    expect(screen.getByTestId('player')).toHaveTextContent(/Ramy · switch/);
    fireEvent.press(screen.getByTestId('pick-squat'));
    expect(screen.getByTestId('set-label')).toHaveTextContent('Ramy · Set 1');
    fireEvent.press(screen.getByTestId('finish'));
    await flushAsync();
    expect(screen.getByTestId('complete-label')).toHaveTextContent('NICE WORK, RAMY');
    jest.useRealTimers();
  });

  it('skipping the name keeps "Player N" and no name is shown', async () => {
    jest.useFakeTimers();
    const screen = render(<App />);
    await flushAsync();
    toPicker();
    fireEvent.press(screen.getByTestId('player'));
    await flushAsync();
    fireEvent.press(screen.getByTestId('who-add'));
    await flushAsync();
    fireEvent.press(screen.getByTestId('name-cancel'));
    await flushAsync();
    expect(screen.getByTestId('player')).toHaveTextContent(/Player 2 · switch/);
    fireEvent.press(screen.getByTestId('pick-squat'));
    expect(screen.getByTestId('set-label')).toHaveTextContent(/^Set 1$/);
    jest.useRealTimers();
  });

  it('renames a player from "Who\'s training?" and keeps the name after a restart', async () => {
    jest.useFakeTimers();
    const first = render(<App />);
    await flushAsync();
    toPicker();
    fireEvent.press(first.getByTestId('player'));
    await flushAsync();
    fireEvent.press(first.getByTestId('rename-p1'));
    fireEvent.changeText(first.getByTestId('name-input'), 'Mo');
    fireEvent(first.getByTestId('name-input'), 'submitEditing');
    await flushAsync();
    expect(first.getByTestId('who-p1')).toHaveTextContent(/MO/);
    first.unmount();

    const second = render(<App />);
    await flushAsync();
    toPicker();
    expect(second.getByTestId('player')).toHaveTextContent(/Mo · switch/);
    jest.useRealTimers();
  });

  const renameTo = async (screen: ReturnType<typeof render>, name: string) => {
    fireEvent.press(screen.getByTestId('player'));
    await flushAsync();
    fireEvent.press(screen.getByTestId('rename-p1'));
    fireEvent.changeText(screen.getByTestId('name-input'), name);
    fireEvent.press(screen.getByTestId('name-save'));
    await flushAsync();
    fireEvent.press(screen.getByTestId('who-p1'));
    await flushAsync();
  };
  const voiceNameRequests = () =>
    FakeSocket.last.sent.filter((m) => m.includes('"voice-name"')).map((m) => JSON.parse(m).name);
  const playedOnTv = () => AudioPlayer.played.map((src) => src.split('/audio/').pop());

  it('asks the relay for name clips and greets the player by name once they are ready', async () => {
    jest.useFakeTimers();
    AudioPlayer.played = [];
    const screen = render(<App />);
    await flushAsync();
    toPicker();
    await renameTo(screen, 'Ramy');
    expect(voiceNameRequests()).toEqual(['Ramy']);
    deliver({type: 'voice-name', name: 'Ramy', ready: true});
    fireEvent.press(screen.getByTestId('pick-squat'));
    await flushAsync();
    expect(playedOnTv()).toEqual(['name/start/Ramy.mp3']);
    jest.useRealTimers();
  });

  it('uses plain clips until the name clips are ready, and never for a placeholder name', async () => {
    jest.useFakeTimers();
    AudioPlayer.played = [];
    const screen = render(<App />);
    await flushAsync();
    toPicker();
    expect(voiceNameRequests()).toEqual([]); // "Player 1" is not spoken
    await renameTo(screen, 'Ramy');
    fireEvent.press(screen.getByTestId('pick-squat')); // no "ready" from the relay yet
    await flushAsync();
    expect(playedOnTv()[0]).toMatch(/^start-\d+\.mp3$/);
    jest.useRealTimers();
  });

  it('keeps the name out of the AI coach request', async () => {
    jest.useFakeTimers();
    const screen = render(<App />);
    await flushAsync();
    toPicker();
    await renameTo(screen, 'Ramy');
    fireEvent.press(screen.getByTestId('pick-squat'));
    fireEvent.press(screen.getByTestId('finish'));
    await flushAsync();
    const request = FakeSocket.last.sent.find((m) => m.includes('"coach"'))!;
    expect(request).not.toMatch(/Ramy/);
    jest.useRealTimers();
  });

  const namePrompts = () =>
    FakeSocket.last.sent.filter((m) => m.includes('"name-prompt"')).map((m) => JSON.parse(m).open);

  it('asks the phone for the name too, and saves a name typed there', async () => {
    jest.useFakeTimers();
    const screen = render(<App />);
    await flushAsync();
    toPicker();
    fireEvent.press(screen.getByTestId('player'));
    await flushAsync();
    fireEvent.press(screen.getByTestId('who-add'));
    await flushAsync();
    expect(namePrompts()).toEqual([true]);
    deliver({type: 'name', name: 'salah'});
    await flushAsync();
    expect(namePrompts()).toEqual([true, false]);
    expect(screen.getByTestId('player')).toHaveTextContent(/Salah · switch/);
    jest.useRealTimers();
  });

  it('ignores a name from the phone when the TV is not asking for one', async () => {
    jest.useFakeTimers();
    const screen = render(<App />);
    await flushAsync();
    toPicker();
    deliver({type: 'name', name: 'Intruder'});
    await flushAsync();
    expect(screen.getByTestId('player')).toHaveTextContent(/Player 1 · switch/);
    jest.useRealTimers();
  });

  it('closes the phone prompt when the name is typed on the TV or skipped', async () => {
    jest.useFakeTimers();
    const screen = render(<App />);
    await flushAsync();
    toPicker();
    fireEvent.press(screen.getByTestId('player'));
    await flushAsync();
    fireEvent.press(screen.getByTestId('who-add'));
    await flushAsync();
    fireEvent.press(screen.getByTestId('name-cancel'));
    await flushAsync();
    expect(namePrompts()).toEqual([true, false]);
    jest.useRealTimers();
  });

  it('drops a typed space and says no spaces are allowed', async () => {
    jest.useFakeTimers();
    const screen = render(<App />);
    await flushAsync();
    toPicker();
    fireEvent.press(screen.getByTestId('player'));
    await flushAsync();
    fireEvent.press(screen.getByTestId('rename-p1'));
    expect(screen.queryByTestId('name-error')).toBeNull();
    fireEvent.changeText(screen.getByTestId('name-input'), 'ra my');
    expect(screen.getByTestId('name-input').props.value).toBe('ramy');
    expect(screen.getByTestId('name-error')).toHaveTextContent('No spaces allowed');
    fireEvent.changeText(screen.getByTestId('name-input'), 'ramyy');
    expect(screen.getByTestId('name-error')).toBeTruthy(); // stays long enough to be read
    act(() => jest.advanceTimersByTime(2600));
    expect(screen.queryByTestId('name-error')).toBeNull();
    jest.useRealTimers();
  });

  it('saves a finished session and shows it on the picker, also after a restart', async () => {
    jest.useFakeTimers();
    const first = render(<App />);
    await flushAsync();
    startSquats(first);
    let t = 0;
    for (const [offset, n] of [[0, 30], [0.2, 40], [0, 30]] as const) {
      for (let i = 0; i < n; i++) {
        t += 33;
        deliver({...frame(offset), t});
      }
    }
    fireEvent.press(first.getByTestId('finish'));
    await flushAsync();
    fireEvent.press(first.getByTestId('new-workout'));
    expect(first.getByTestId('pick-squat')).toHaveTextContent(/Last time 1/);
    first.unmount();

    const second = render(<App />); // the app restarts; storage keeps the progress
    await flushAsync();
    deliver({type: 'session', code: 'ABC234'});
    deliver({...frame(0), t: 0});
    act(() => jest.advanceTimersByTime(200));
    expect(second.getByTestId('pick-squat')).toHaveTextContent(/Last time 1/);
    jest.useRealTimers();
  });
});
