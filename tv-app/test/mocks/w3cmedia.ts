// Vega's media player is native code; tests get a silent stand-in that plays nothing.
export class AudioPlayer {
  src = '';
  async initialize() {}
  async play() {}
  addEventListener() {}
}
