import {RelayMessageReader} from '../src/relayMessages';

const message = JSON.stringify({kp: Array.from({length: 33}, () => [0.5, 0.5, 1]), t: 1234});

describe('RelayMessageReader', () => {
  it('parses a whole message', () => {
    expect(new RelayMessageReader().read(message)).toEqual(JSON.parse(message));
  });

  it('joins a message that arrives split in two', () => {
    const reader = new RelayMessageReader();
    const cut = message.indexOf('],[') + 1; // second piece starts with "," as seen on Vega
    expect(reader.read(message.slice(0, cut))).toBeNull();
    expect(reader.read(message.slice(cut))).toEqual(JSON.parse(message));
  });

  it('recovers after a split message and parses the next one normally', () => {
    const reader = new RelayMessageReader();
    reader.read(message.slice(0, 100));
    reader.read(message.slice(100));
    expect(reader.read('{"type":"phone-left"}')).toEqual({type: 'phone-left'});
  });

  it('drops a stray fragment that does not start a message, without throwing', () => {
    const reader = new RelayMessageReader();
    expect(reader.read(',[0.5,0.5,1]]}')).toBeNull();
    expect(reader.read('{"type":"session","code":"KH7VET"}')).toEqual({type: 'session', code: 'KH7VET'});
  });

  it('gives up on a runaway buffer instead of growing forever', () => {
    const reader = new RelayMessageReader();
    reader.read('{"junk":"' + 'x'.repeat(20_000));
    expect(reader.read('{"type":"phone-left"}')).toEqual({type: 'phone-left'});
  });
});
