/* eslint-env es2020 */
import 'react-native';
import {act, render} from '@testing-library/react-native';
import * as React from 'react';

import {App} from '../src/App';

class FakeSocket {
  static last: FakeSocket;
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

describe('App', () => {
  beforeEach(() => {
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

  it('switches to the workout screen and counts reps when frames arrive', () => {
    const screen = render(<App />);
    deliver({type: 'session', code: 'KH7VET'});
    const nowSpy = jest.spyOn(Date, 'now');
    let t = 10_000;
    const send = (offset: number, n: number) => {
      for (let i = 0; i < n; i++) {
        t += 33;
        nowSpy.mockReturnValue(t);
        deliver(frame(offset));
      }
    };
    send(0, 10);
    send(0.2, 20);
    send(0, 20);
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText(/phone connected/)).toBeTruthy();
    nowSpy.mockRestore();
  });

  it('returns to the pairing screen when the phone leaves', () => {
    const screen = render(<App />);
    deliver({type: 'session', code: 'KH7VET'});
    deliver(frame(0));
    deliver({type: 'phone-left'});
    expect(screen.getByTestId('pairing-code')).toHaveTextContent('KH7VET');
  });
});
