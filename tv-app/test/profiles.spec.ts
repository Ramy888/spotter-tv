import {KeyValueStore, MAX_PROFILES, ProfileStore} from '../src/profiles';

class MemoryStore implements KeyValueStore {
  data = new Map<string, string>();
  async getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  async setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

const loaded = async (mem = new MemoryStore()) => {
  const store = new ProfileStore(mem);
  await store.load();
  return store;
};

describe('ProfileStore', () => {
  it('creates Player 1 on first run, with no progress', async () => {
    const store = await loaded();
    expect(store.profiles).toEqual([{id: 'p1', name: 'Player 1'}]);
    expect(store.active.name).toBe('Player 1');
    expect(store.activeProgress).toEqual({});
  });

  it('keeps progress across app restarts', async () => {
    const mem = new MemoryStore();
    const first = await loaded(mem);
    await first.recordSession('squat', 7, 9, 84);
    const second = await loaded(mem); // a new app launch reading the same storage
    expect(second.activeProgress.squat).toEqual({last: 7, target: 9, bestDepth: 84, sessions: 1});
  });

  it('accumulates sessions and keeps the deepest depth ever', async () => {
    const store = await loaded();
    await store.recordSession('squat', 7, 9, 84);
    await store.recordSession('squat', 9, 11, 90);
    expect(store.activeProgress.squat).toEqual({last: 9, target: 11, bestDepth: 84, sessions: 2});
  });

  it('keeps each player\'s progress separate and remembers who trained last', async () => {
    const mem = new MemoryStore();
    const store = await loaded(mem);
    await store.recordSession('squat', 7, 9, 84);
    const p2 = await store.add();
    expect(p2).toEqual({id: 'p2', name: 'Player 2'});
    expect(store.activeProgress).toEqual({});
    await store.recordSession('lunge', 6, 8, 95);
    await store.switchTo('p1');
    expect(store.activeProgress.squat?.last).toBe(7);
    expect(store.activeProgress.lunge).toBeUndefined();
    const relaunched = await loaded(mem);
    expect(relaunched.active.id).toBe('p1');
  });

  it(`allows at most ${MAX_PROFILES} players`, async () => {
    const store = await loaded();
    for (let i = 1; i < MAX_PROFILES; i++) {
      await store.add();
    }
    expect(store.canAdd()).toBe(false);
    expect(await store.add()).toBeNull();
    expect(store.profiles).toHaveLength(MAX_PROFILES);
  });

  it('starts fresh instead of crashing when saved data is unreadable', async () => {
    const mem = new MemoryStore();
    mem.data.set('spotter:v1:profiles', '{not json');
    mem.data.set('spotter:v1:progress:p1', '"a string"');
    const store = await loaded(mem);
    expect(store.active.name).toBe('Player 1');
    expect(store.activeProgress).toEqual({});
  });

  it('ignores a switch to a player that does not exist', async () => {
    const store = await loaded();
    await store.switchTo('p9');
    expect(store.active.id).toBe('p1');
  });
});
