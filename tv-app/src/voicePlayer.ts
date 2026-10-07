// Plays coach voice clips: on the TV through Vega's media player, or on the paired phone via the relay.
// If TV playback fails, it switches to the phone for the rest of the app session.
import {AudioPlayer} from '@amazon-devices/react-native-w3cmedia';
import {PHONE_URL} from './config';

export type VoiceMode = 'tv' | 'phone' | 'off';

const MAX_QUEUE = 3; // never fall behind the workout: keep only the newest clips

// Counting is the coach's main job; phrases ("Looking strong.") are extras. A new count makes any
// phrase still waiting stale, and when the queue is full a phrase goes before a count does.
const isCount = (id: string) => /^count-\d+$/.test(id);
export function enqueue(queue: string[], clips: string[]): string[] {
  const next = [...(clips.some(isCount) ? queue.filter(isCount) : queue), ...clips];
  while (next.length > MAX_QUEUE) {
    const phrase = next.findIndex((id) => !isCount(id));
    next.splice(phrase >= 0 ? phrase : 0, 1);
  }
  return next;
}

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
// Between-set coach lines ("line-<16 hex>") are made by the relay during a rest
// (docs/set-coach.md). The focus was already spoken with a fixed clip, so one that won't play is skipped.
export const isLineClip = (id: string) => /^line-[0-9a-f]{16}$/.test(id);
// The between-set coach's fixed clips are newer than the first store release: a server without
// them must not cost the TV its voice, so one that won't play is skipped too.
const isFocusClip = (id: string) => id.startsWith('focus-');
const skipOnFailure = (id: string) => isLineClip(id) || isFocusClip(id);

type Player = Pick<AudioPlayer, 'initialize' | 'play' | 'addEventListener'> & {src: string};

export class VoicePlayer {
  private queue: string[] = [];
  private playing = false;
  private player: Player | null = null;
  private ready: Promise<Player> | null = null;
  private current: string | null = null;
  // Each clip played is one attempt. Vega can report one failed clip twice (play() rejects and an
  // 'error' event follows); only the first report counts, or the second would land on a later clip
  // (or none) and switch the voice to the phone.
  private attempt = 0;
  private settled = 0;
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
    this.queue = enqueue(this.queue, clips);
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
    const attempt = ++this.attempt;
    try {
      const player = await this.getPlayer();
      player.src = this.clipUrl(id);
      await player.play();
    } catch {
      this.onFailure(attempt);
    }
  }

  private onFailure(attempt: number): void {
    if (attempt !== this.attempt || this.settled === attempt || !this.current) {
      return; // already handled, or about a clip that is no longer playing
    }
    this.settled = attempt;
    this.failed([this.current, ...this.queue]);
  }

  private clipUrl(id: string): string {
    return isNameClip(id) && this.voiceName
      ? `${PHONE_URL}audio/name/${id.slice('name-'.length)}/${encodeURIComponent(this.voiceName)}.mp3`
      : `${PHONE_URL}audio/${id}.mp3`;
  }

  // A name clip that won't play (not made yet, daily limit) is replaced by its plain clip, and a
  // coach line or focus clip that won't play (expired, not on the server yet) is skipped; none of
  // that says anything about the TV's audio, so it must not switch the voice to the phone.
  private failed(pending: string[]): void {
    const [id, ...rest] = pending;
    if (id && (isNameClip(id) || skipOnFailure(id))) {
      this.queue = isNameClip(id) ? [plainClip(id), ...rest] : rest;
      this.playNext();
    } else {
      this.fallBackToPhone(pending);
    }
  }

  private getPlayer(): Promise<Player> {
    this.ready ??= (async () => {
      const player = this.createPlayer();
      await player.initialize();
      player.addEventListener('ended', () => {
        if (this.settled !== this.attempt) {
          this.playNext();
        }
      });
      player.addEventListener('error', () => this.onFailure(this.attempt));
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
