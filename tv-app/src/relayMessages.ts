// Vega's WebSocket sometimes delivers one relay message as two `onmessage` events
// (seen as "Unexpected end of input" followed by "Unexpected character: ,"). This reader joins
// the pieces back together and never throws, so one bad message can't crash the app.

const MAX_BUFFER = 16 * 1024; // relay messages are ~1 KB; anything bigger is garbage

export class RelayMessageReader {
  private buffer = '';

  // Returns the parsed message once it's complete, or null while waiting for more pieces.
  read(chunk: string): Record<string, unknown> | null {
    this.buffer = this.buffer ? this.buffer + chunk : chunk;
    if (!this.buffer.startsWith('{') || this.buffer.length > MAX_BUFFER) {
      this.buffer = '';
      return null;
    }
    try {
      const msg = JSON.parse(this.buffer);
      this.buffer = '';
      return msg && typeof msg === 'object' ? msg : null;
    } catch {
      return null; // incomplete: keep it and wait for the next piece
    }
  }
}
