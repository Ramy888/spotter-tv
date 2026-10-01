// Plays coach voice clips: on the TV through Vega's media player, or on the paired phone via the relay.
// If TV playback fails, it switches to the phone for the rest of the app session.
import {AudioPlayer} from '@amazon-devices/react-native-w3cmedia';
import {PHONE_URL} from './config';

export type VoiceMode = 'tv' | 'phone' | 'off';

const MAX_QUEUE = 3; // never fall behind the workout: keep only the newest clips
const clipUrl = (id: string) => `${PHONE_URL}audio/${id}.mp3`;

type Player = Pick<AudioPlayer, 'initialize' | 'play' | 'addEventListener'> & {src: string};

export class VoicePlayer {
  private queue: string[] = [];
  private playing = false;
  private player: Player | null = null;
  private ready: Promise<Player> | null = null;

  constructor(
    public mode: VoiceMode,
    private readonly sendToPhone: (clips: string[]) => void,
    private readonly onFallback: () => void = () => {},
    private readonly createPlayer: () => Player = () => new AudioPlayer() as unknown as Player,
  ) {}

  say(clips: string[]): void {
    if (clips.length === 0 || this.mode === 'off') {
      return;
    }
    if (this.mode === 'phone') {
      this.sendToPhone(clips);
      return;
    }
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
      return;
    }
    this.playing = true;
    try {
      const player = await this.getPlayer();
      player.src = clipUrl(id);
      await player.play();
    } catch {
      this.fallBackToPhone([id, ...this.queue]);
    }
  }

  private getPlayer(): Promise<Player> {
    this.ready ??= (async () => {
      const player = this.createPlayer();
      await player.initialize();
      player.addEventListener('ended', () => this.playNext());
      player.addEventListener('error', () => this.fallBackToPhone(this.queue));
      this.player = player;
      return player;
    })();
    return this.ready;
  }

  private fallBackToPhone(pending: string[]): void {
    if (this.mode !== 'tv') {
      return;
    }
    this.mode = 'phone';
    this.queue = [];
    this.playing = false;
    this.onFallback();
    if (pending.length) {
      this.sendToPhone(pending.slice(-MAX_QUEUE));
    }
  }
}
