// Vega's media player is native code; tests get a silent stand-in that records what it was asked to play.
export class AudioPlayer {
  static played: string[] = [];
  src = '';
  async initialize() {}
  async play() {
    AudioPlayer.played.push(this.src);
  }
  addEventListener() {}
}
