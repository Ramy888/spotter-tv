import {VoicePlayer} from '../src/voicePlayer';

class FakePlayer {
  src = '';
  played: string[] = [];
  private listeners: Record<string, () => void> = {};
  // `failSrc`: only clips whose URL matches fail (like a name clip that was never made).
  constructor(
    private readonly failOn: 'initialize' | 'play' | null = null,
    private readonly failSrc: RegExp | null = null,
  ) {}
  async initialize() {
    if (this.failOn === 'initialize') {
      throw new Error('audio service unavailable');
    }
  }
  async play() {
    if (this.failOn === 'play' || this.failSrc?.test(this.src)) {
      throw new Error('playback failed');
    }
    this.played.push(this.src.split('/audio/').pop()!);
  }
  addEventListener(name: string, fn: () => void) {
    this.listeners[name] = fn;
  }
  end() {
    this.listeners.ended?.();
  }
  error() {
    this.listeners.error?.();
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

  describe('with a player name', () => {
    it('plays the name clip from the server, encoding the name', async () => {
      const fake = new FakePlayer();
      const v = new VoicePlayer('tv', () => {}, undefined, () => fake as never);
      v.voiceName = "O'Neil";
      v.say(['name-start']);
      await flush();
      expect(fake.played).toEqual(["name/start/O'Neil.mp3"]);
    });

    it('plays the plain clip instead when the name clip fails, and stays on the TV', async () => {
      const fake = new FakePlayer(null, /\/name\//);
      let fellBack = false;
      const v = new VoicePlayer('tv', () => {}, () => (fellBack = true), () => fake as never);
      v.voiceName = 'Ramy';
      v.say(['name-last', 'count-9']);
      await flush();
      expect(fake.played).toEqual(['near-target-1-1.mp3']);
      fake.end();
      await flush();
      expect(fake.played).toEqual(['near-target-1-1.mp3', 'count-9.mp3']);
      expect(v.mode).toBe('tv');
      expect(fellBack).toBe(false);
    });

    it('treats a media error on a name clip the same way', async () => {
      const fake = new FakePlayer();
      const v = new VoicePlayer('tv', () => {}, undefined, () => fake as never);
      v.voiceName = 'Ramy';
      v.say(['name-finish']);
      await flush();
      fake.error(); // e.g. the URL answered 404
      await flush();
      expect(fake.played).toEqual(['name/finish/Ramy.mp3', 'finish-1.mp3']);
      expect(v.mode).toBe('tv');
    });

    it('sends the phone plain clips (the phone page only knows those)', () => {
      const sent: string[][] = [];
      const v = new VoicePlayer('phone', (c) => sent.push(c));
      v.voiceName = 'Ramy';
      v.say(['name-start', 'count-1']);
      expect(sent).toEqual([['start-1', 'count-1']]);
    });

    it('uses plain clips when no name is ready', async () => {
      const fake = new FakePlayer();
      const v = new VoicePlayer('tv', () => {}, undefined, () => fake as never);
      v.say(['name-praise']);
      await flush();
      expect(fake.played).toEqual(['praise-1.mp3']);
    });
  });
});
