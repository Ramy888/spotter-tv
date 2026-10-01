// Plays coach voice clips: on the TV through Vega's media player, or on the paired phone via the relay.
// If TV playback fails, it switches to the phone for the rest of the app session.
import {AudioPlayer} from '@amazon-devices/react-native-w3cmedia';
import {PHONE_URL} from './config';

export type VoiceMode = 'tv' | 'phone' | 'off';

const MAX_QUEUE = 3; // never fall behind the workout: keep only the newest clips

// Name clips ("name-start" = "Let's go, Ramy!") are made per player on the server
// (infra/lambda/voiceNames.mjs). Each has a plain clip to use when it can't be played.
const NAME_CLIP_FALLBACK: Record<string, string> = {
  'name-start': 'start-1',
  'name-praise': 'praise-1',
  'name-deeper': 'cue-deeper-1',
  'name-last': 'near-target-1-1',
  'name-finish': 'finish-1',
};
const isNameClip = (id: string) => id in NAME_CLIP_FALLBACK;

type Player = Pick<AudioPlayer, 'initialize' | 'play' | 'addEventListener'> & {src: string};

export class VoicePlayer {
  private queue: string[] = [];
  private playing = false;
  private player: Player | null = null;
  private ready: Promise<Player> | null = null;
  private current: string | null = null;
  // The player's name once its clips exist on the server; null means plain clips only.
  voiceName: string | null = null;

  constructor(
    public mode: VoiceMode,
    private readonly sendToPhone: (clips: string[]) => void,
    private readonly onFallback: () => void = () => {},
    private readonly createPlayer: () => Player = () => new AudioPlayer() as unknown as Player,
  ) {}

  say(requested: string[]): void {
    if (requested.length === 0 || this.mode === 'off') {
      return;
    }
    if (this.mode === 'phone') {
      this.sendToPhone(requested.map(plainClip)); // the phone page only has the plain clips
      return;
    }
    const clips = this.voiceName ? requested : requested.map(plainClip);
    this.queue.push(...clips);
    this.queue.splice(0, Math.max(0, this.queue.length - MAX_QUEUE));
    if (!this.playing) {
      this.playNext();
    }
  }

  private async playNext(): Promise<void> {
    const id = this.queue.shift();
    if (!id) {
      this.playing = false;
      this.current = null;
      return;
    }
    this.playing = true;
    this.current = id;
    try {
      const player = await this.getPlayer();
      player.src = this.clipUrl(id);
      await player.play();
    } catch {
      this.failed([id, ...this.queue]);
    }
  }

  private clipUrl(id: string): string {
    return isNameClip(id) && this.voiceName
      ? `${PHONE_URL}audio/name/${id.slice('name-'.length)}/${encodeURIComponent(this.voiceName)}.mp3`
      : `${PHONE_URL}audio/${id}.mp3`;
  }

  // A name clip that won't play (not made yet, daily limit) is replaced by its plain clip;
  // that says nothing about the TV's audio, so it must not switch the voice to the phone.
  private failed(pending: string[]): void {
    const [id, ...rest] = pending;
    if (id && isNameClip(id)) {
      this.queue = [plainClip(id), ...rest];
      this.playNext();
    } else {
      this.fallBackToPhone(pending);
    }
  }

  private getPlayer(): Promise<Player> {
    this.ready ??= (async () => {
      const player = this.createPlayer();
      await player.initialize();
      player.addEventListener('ended', () => this.playNext());
      player.addEventListener('error', () => this.failed(this.current ? [this.current, ...this.queue] : this.queue));
      this.player = player;
      return player;
    })();
    return this.ready;
  }

  private fallBackToPhone(pending: string[]): void {
    this.current = null;
    if (this.mode !== 'tv') {
      return;
    }
    this.mode = 'phone';
    this.queue = [];
    this.playing = false;
    this.onFallback();
    if (pending.length) {
      this.sendToPhone(pending.slice(-MAX_QUEUE).map(plainClip));
    }
  }
}

const plainClip = (id: string) => NAME_CLIP_FALLBACK[id] ?? id;
