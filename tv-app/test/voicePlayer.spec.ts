import {VoicePlayer} from '../src/voicePlayer';

class FakePlayer {
  src = '';
  played: string[] = [];
  private listeners: Record<string, () => void> = {};
  constructor(private readonly failOn: 'initialize' | 'play' | null = null) {}
  async initialize() {
    if (this.failOn === 'initialize') {
      throw new Error('audio service unavailable');
    }
  }
  async play() {
    if (this.failOn === 'play') {
      throw new Error('playback failed');
    }
    this.played.push(this.src.split('/').pop()!);
  }
  addEventListener(name: string, fn: () => void) {
    this.listeners[name] = fn;
  }
  end() {
    this.listeners.ended?.();
  }
}

const flush = () => new Promise<void>((r) => setTimeout(() => r(), 0));

describe('VoicePlayer', () => {
  it('plays clips on the TV one after another', async () => {
    const fake = new FakePlayer();
    const sent: string[][] = [];
    const v = new VoicePlayer('tv', (c) => sent.push(c), undefined, () => fake as never);
    v.say(['count-1', 'praise-2']);
    await flush();
    expect(fake.played).toEqual(['count-1.mp3']);
    fake.end();
    await flush();
    expect(fake.played).toEqual(['count-1.mp3', 'praise-2.mp3']);
    expect(sent).toEqual([]);
  });

  it('sends clips to the phone in phone mode, and nothing in off mode', () => {
    const sent: string[][] = [];
    const phone = new VoicePlayer('phone', (c) => sent.push(c));
    phone.say(['count-3']);
    const off = new VoicePlayer('off', (c) => sent.push(c));
    off.say(['count-4']);
    expect(sent).toEqual([['count-3']]);
  });

  it('falls back to the phone when the TV audio service is unavailable', async () => {
    const sent: string[][] = [];
    let fellBack = false;
    const v = new VoicePlayer('tv', (c) => sent.push(c), () => (fellBack = true), () => new FakePlayer('initialize') as never);
    v.say(['count-1']);
    await flush();
    expect(fellBack).toBe(true);
    expect(v.mode).toBe('phone');
    expect(sent).toEqual([['count-1']]);
    v.say(['count-2']); // stays on the phone afterwards
    expect(sent).toEqual([['count-1'], ['count-2']]);
  });

  it('falls back to the phone when playback fails', async () => {
    const sent: string[][] = [];
    const v = new VoicePlayer('tv', (c) => sent.push(c), undefined, () => new FakePlayer('play') as never);
    v.say(['count-1']);
    await flush();
    expect(sent).toEqual([['count-1']]);
  });

  it('keeps only the newest clips when it falls behind', async () => {
    const fake = new FakePlayer();
    const v = new VoicePlayer('tv', () => {}, undefined, () => fake as never);
    v.say(['count-1']);
    v.say(['count-2', 'praise-1']);
    v.say(['count-3', 'praise-2']);
    await flush();
    for (let i = 0; i < 4; i++) {
      fake.end();
      await flush();
    }
    expect(fake.played).toEqual(['count-1.mp3', 'praise-1.mp3', 'count-3.mp3', 'praise-2.mp3']);
  });
});
