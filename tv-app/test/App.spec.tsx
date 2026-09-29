/* eslint-env es2020 */
import 'react-native';
import {act, render} from '@testing-library/react-native';
import * as React from 'react';

import {App} from '../src/App';

class FakeSocket {
  static last: FakeSocket;
  onopen?: () => void;
  onmessage?: (e: {data: string}) => void;
  onerror?: () => void;
  onclose?: () => void;
  constructor() {
    FakeSocket.last = this;
  }
  close() {}
}

// Legs fully visible; only hip (23/24), knee (25/26) and ankle (27/28) positions matter.
function frame(kneeOffset: number) {
  const kp = Array.from({length: 33}, () => [0.5, 0.5, 1]);
  for (const [s, dx] of [[0, -0.05], [1, 0.05]]) {
    kp[23 + s] = [0.5 + dx, 0.45, 1];
    kp[25 + s] = [0.5 + dx + kneeOffset, 0.65, 1];
    kp[27 + s] = [0.5 + dx, 0.85, 1];
  }
  return {data: JSON.stringify({kp})};
}

describe('App', () => {
  beforeEach(() => {
    (globalThis as any).WebSocket = FakeSocket;
  });

  it('shows the relay status once connected', () => {
    const screen = render(<App />);
    act(() => FakeSocket.last.onopen?.());
    expect(screen.getByText(/relay connected/)).toBeTruthy();
  });

  it('counts a full squat as one rep', () => {
    const screen = render(<App />);
    const nowSpy = jest.spyOn(Date, 'now');
    let t = 1_000;
    const send = (offset: number, times: number) => {
      for (let i = 0; i < times; i++) {
        t += 33;
        nowSpy.mockReturnValue(t);
        act(() => FakeSocket.last.onmessage?.(frame(offset)));
      }
    };
    send(0, 10); // standing
    send(0.2, 20); // deep squat
    send(0, 20); // standing again
    expect(screen.getByText('1')).toBeTruthy();
    nowSpy.mockRestore();
  });

  it('asks the user to step back when legs are not visible', () => {
    const screen = render(<App />);
    const hidden = JSON.parse(frame(0).data);
    hidden.kp[25][2] = 0.2;
    act(() => FakeSocket.last.onmessage?.({data: JSON.stringify(hidden)}));
    expect(screen.getByText(/Step back/)).toBeTruthy();
  });
});
