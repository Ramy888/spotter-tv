import 'react-native';
import {act, render} from '@testing-library/react-native';
import * as React from 'react';
import {TickRing} from '../src/TickRing';

const litTicks = (screen: ReturnType<typeof render>) => screen.queryAllByTestId('tick-on').length;

describe('TickRing', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('lights new ticks one by one, not all at once', () => {
    const screen = render(<TickRing size={400} lit={0} count={40} />);
    screen.rerender(<TickRing size={400} lit={8} count={40} />);
    const seen = [litTicks(screen)];
    for (let i = 0; i < 20; i++) {
      act(() => jest.advanceTimersByTime(30));
      seen.push(litTicks(screen));
    }
    expect(seen[0]).toBeLessThan(8);
    expect(seen[seen.length - 1]).toBe(8);
    // Never jumps by more than one tick per step.
    expect(seen.every((n, i) => i === 0 || n - seen[i - 1] <= 1)).toBe(true);
  });

  it('finishes each rep quickly, even when it lights many ticks', () => {
    const screen = render(<TickRing size={400} lit={0} count={40} />);
    screen.rerender(<TickRing size={400} lit={40} count={40} />);
    for (let t = 0; t < 600; t += 10) {
      act(() => jest.advanceTimersByTime(10)); // each step schedules the next, so advance in steps
    }
    expect(litTicks(screen)).toBe(40);
  });

  it('starts lit on first show and clears at once for a new set', () => {
    const screen = render(<TickRing size={400} lit={5} count={40} />);
    expect(litTicks(screen)).toBe(5);
    screen.rerender(<TickRing size={400} lit={0} count={40} />);
    expect(litTicks(screen)).toBe(0);
  });
});
