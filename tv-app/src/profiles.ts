// Anonymous player profiles and their progress, saved on the TV. No account and nothing personal:
// just "Player N" and per-exercise numbers. Storage is passed in so this is testable.
import {ExerciseId} from './exercises';

export type KeyValueStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

export type ExerciseProgress = {
  last: number; // reps in the most recent session
  target: number | null; // older saves: a total for one long set (no longer used for the plan)
  repsPerSet?: number; // the next workout's reps per set (see plan.ts)
  bestDepth: number | null; // deepest bottom angle ever (lower is deeper)
  sessions: number;
};
export type Progress = Partial<Record<ExerciseId, ExerciseProgress>>;
export type Profile = {id: string; name: string};

export const MAX_PROFILES = 4;
export const MAX_NAME_LENGTH = 16;

// A name is one word: spaces are never allowed. Returns the text without them, and whether
// there were any, so the field can say "No spaces allowed".
export function withoutSpaces(raw: string): {text: string; hadSpace: boolean} {
  const text = raw.replace(/\s/g, '');
  return {text, hadSpace: text !== raw};
}

// What's left of a typed name after tidying: no spaces, no control characters, at most
// MAX_NAME_LENGTH characters, and "ramy" becomes "Ramy" (a remote keyboard often has no shift;
// a name typed with capitals is kept as typed). Null if nothing usable is left.
export function cleanName(raw: string): string | null {
  const name = withoutSpaces(raw)
    // eslint-disable-next-line no-control-regex -- stripping control characters is the point
    .text.replace(/[\u0000-\u001f\u007f]/g, '')
    .slice(0, MAX_NAME_LENGTH);
  if (!name) {
    return null;
  }
  return name === name.toLowerCase() ? name.replace(/(^|['-])(\S)/g, (_, sep, c) => sep + c.toUpperCase()) : name;
}

const DEFAULT_NAME = /^Player \d+$/;
// Latin letters only: the coach voice is English and the clips are made per name on the server,
// which accepts exactly this shape (infra/site/handler.mjs).
const SPOKEN_NAME = /^[A-Za-z][A-Za-z'-]{0,15}$/;

// False for the "Player N" placeholder a new player starts with.
export const isRealName = (name: string) => !DEFAULT_NAME.test(name);

// The name the coach says out loud, or null when it should not use one
// ("Player 2" is a placeholder, not a name; other scripts are shown but not spoken).
export function spokenName(name: string): string | null {
  return isRealName(name) && SPOKEN_NAME.test(name) ? name : null;
}
const KEY_PROFILES = 'spotter:v1:profiles';
const keyProgress = (id: string) => `spotter:v1:progress:${id}`;

type ProfilesDoc = {profiles: Profile[]; activeId: string};

// Saved data that can't be read (an older format, a partial write) means a fresh start, not a crash.
function parse<T>(raw: string | null, valid: (v: unknown) => v is T): T | null {
  if (!raw) {
    return null;
  }
  try {
    const value = JSON.parse(raw);
    return valid(value) ? value : null;
  } catch {
    return null;
  }
}

const isProfilesDoc = (v: unknown): v is ProfilesDoc =>
  typeof v === 'object' &&
  v !== null &&
  Array.isArray((v as ProfilesDoc).profiles) &&
  (v as ProfilesDoc).profiles.length > 0 &&
  (v as ProfilesDoc).profiles.every((p) => typeof p?.id === 'string' && typeof p?.name === 'string') &&
  typeof (v as ProfilesDoc).activeId === 'string';

const isProgress = (v: unknown): v is Progress => typeof v === 'object' && v !== null && !Array.isArray(v);

export class ProfileStore {
  private doc: ProfilesDoc = {profiles: [], activeId: ''};
  private progress: Progress = {};

  constructor(private readonly store: KeyValueStore) {}

  // Loads saved profiles, creating "Player 1" on first run.
  async load(): Promise<void> {
    const saved = parse(await this.store.getItem(KEY_PROFILES), isProfilesDoc);
    if (saved && saved.profiles.some((p) => p.id === saved.activeId)) {
      this.doc = saved;
    } else {
      this.doc = {profiles: [{id: 'p1', name: 'Player 1'}], activeId: 'p1'};
      await this.saveProfiles();
    }
    await this.loadProgress();
  }

  get profiles(): Profile[] {
    return this.doc.profiles;
  }

  get active(): Profile {
    return this.doc.profiles.find((p) => p.id === this.doc.activeId) ?? this.doc.profiles[0];
  }

  get activeProgress(): Progress {
    return this.progress;
  }

  // Every player's progress, for the "Who's training?" screen.
  async allProgress(): Promise<Record<string, Progress>> {
    const entries = await Promise.all(
      this.doc.profiles.map(async (p) => [p.id, parse(await this.store.getItem(keyProgress(p.id)), isProgress) ?? {}] as const),
    );
    return Object.fromEntries(entries);
  }

  canAdd(): boolean {
    return this.doc.profiles.length < MAX_PROFILES;
  }

  // Adds "Player N" (the lowest free number) and makes it active.
  async add(): Promise<Profile | null> {
    if (!this.canAdd()) {
      return null;
    }
    let n = 1;
    while (this.doc.profiles.some((p) => p.id === `p${n}`)) {
      n++;
    }
    const profile = {id: `p${n}`, name: `Player ${n}`};
    this.doc = {profiles: [...this.doc.profiles, profile], activeId: profile.id};
    await this.saveProfiles();
    await this.loadProgress();
    return profile;
  }

  // Renames a player. Returns false (and changes nothing) if the name is empty after tidying.
  async rename(id: string, raw: string): Promise<boolean> {
    const name = cleanName(raw);
    if (!name || !this.doc.profiles.some((p) => p.id === id)) {
      return false;
    }
    this.doc = {...this.doc, profiles: this.doc.profiles.map((p) => (p.id === id ? {...p, name} : p))};
    await this.saveProfiles();
    return true;
  }

  async switchTo(id: string): Promise<void> {
    if (!this.doc.profiles.some((p) => p.id === id)) {
      return;
    }
    this.doc = {...this.doc, activeId: id};
    await this.saveProfiles();
    await this.loadProgress();
  }

  // Records a finished workout for the active player: total reps, and reps per set for next time.
  async recordSession(exercise: ExerciseId, reps: number, repsPerSet: number, bestDepth: number | null) {
    const prev = this.progress[exercise];
    const best = [prev?.bestDepth, bestDepth].filter((d): d is number => d != null);
    this.progress = {
      ...this.progress,
      [exercise]: {
        last: reps,
        target: null,
        repsPerSet,
        bestDepth: best.length ? Math.min(...best) : null,
        sessions: (prev?.sessions ?? 0) + 1,
      },
    };
    await this.store.setItem(keyProgress(this.doc.activeId), JSON.stringify(this.progress));
  }

  private async loadProgress() {
    this.progress = parse(await this.store.getItem(keyProgress(this.doc.activeId)), isProgress) ?? {};
  }

  private async saveProfiles() {
    await this.store.setItem(KEY_PROFILES, JSON.stringify(this.doc));
  }
}
