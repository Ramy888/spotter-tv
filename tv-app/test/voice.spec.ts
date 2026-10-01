import {Cue, ExerciseUpdate} from '../src/exercises/types';
import {Reward} from '../src/rewards';
import {VoiceCoach} from '../src/voice';
import manifest from '../src/voiceClips.json';

const rep = (n: number, cue: Cue | null = null): ExerciseUpdate => ({reps: n, rep: {durationMs: 2000, depth: 90}, cue, metric: 90});
const halfRep = (n: number): ExerciseUpdate => ({reps: n, rep: null, cue: 'deeper', metric: 130});
const frame = (n: number): ExerciseUpdate => ({reps: n, rep: null, cue: null, metric: 160});
const reward = (kind: Reward['kind']): Reward => ({kind, emoji: '', text: ''});
const groupOf = (clip: string) => clip.replace(/-\d+$/, '');

describe('VoiceCoach', () => {
  it('says nothing on plain frames and counts each rep', () => {
    const v = new VoiceCoach();
    expect(v.update(frame(0), null, 0)).toEqual([]);
    expect(v.update(rep(1), null, 1000)).toEqual(['count-1']);
    expect(v.update(rep(2), null, 4000)).toEqual(['count-2']);
  });

  it('praises after every 4 clean reps', () => {
    const v = new VoiceCoach();
    const said = [1, 2, 3, 4].map((n) => v.update(rep(n), null, n * 3000));
    expect(said[3][0]).toBe('count-4');
    expect(groupOf(said[3][1])).toBe('praise');
  });

  it('cues a half rep, but not the same cue again within 5 s', () => {
    const v = new VoiceCoach();
    expect(v.update(halfRep(0), null, 1000).map(groupOf)).toEqual(['cue-deeper']);
    expect(v.update(halfRep(0), null, 4000)).toEqual([]);
    expect(v.update(halfRep(0), null, 7000).map(groupOf)).toEqual(['cue-deeper']);
  });

  it('counts a rushed rep and then says to slow down', () => {
    const v = new VoiceCoach();
    expect(v.update(rep(1, 'slower'), null, 1000).map(groupOf)).toEqual(['count', 'cue-slower']);
  });

  it('a cue resets the praise counter', () => {
    const v = new VoiceCoach();
    [1, 2, 3].forEach((n) => v.update(rep(n), null, n * 3000));
    v.update(halfRep(3), null, 10000);
    expect(v.update(rep(4), null, 13000)).toEqual(['count-4']);
  });

  it('announces streak, deepest and target rewards after the count', () => {
    const v = new VoiceCoach();
    expect(v.update(rep(5), reward('streak'), 0).map(groupOf)).toEqual(['count', 'streak']);
    expect(v.update(rep(6), reward('deepest'), 3000).map(groupOf)).toEqual(['count', 'deepest']);
    expect(v.update(rep(7), reward('target'), 6000).map(groupOf)).toEqual(['count', 'target']);
  });

  it('counts down to the target with "two more" and "almost there"', () => {
    const v = new VoiceCoach(8);
    expect(v.update(rep(6), null, 0).map(groupOf)).toEqual(['count', 'near-target-2']);
    expect(v.update(rep(7), null, 3000).map(groupOf)).toEqual(['count', 'near-target-1']);
  });

  it('never says more than 2 clips at once', () => {
    const v = new VoiceCoach(7);
    expect(v.update(rep(5, 'slower'), reward('streak'), 0).length).toBeLessThanOrEqual(2);
  });

  it('stops counting out loud past the last count clip', () => {
    const v = new VoiceCoach();
    expect(v.update(rep(manifest.counts + 1), null, 0)).not.toContain(`count-${manifest.counts + 1}`);
  });

  it('never repeats the same variant twice in a row', () => {
    const v = new VoiceCoach(null, () => 0); // always "picks" the first variant
    const first = v.start()[0];
    const second = v.start()[0];
    expect(first).not.toBe(second);
  });

  it('only produces clip ids that exist in the manifest', () => {
    const v = new VoiceCoach(10);
    const exists = (id: string) => {
      const m = id.match(/^(.*)-(\d+)$/)!;
      const n = Number(m[2]);
      return m[1] === 'count' ? n <= manifest.counts : n <= (manifest.groups as Record<string, number>)[m[1]];
    };
    const all = [
      ...v.start(),
      ...v.finish(),
      ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].flatMap((n) => v.update(rep(n), n === 5 ? reward('streak') : null, n * 3000)),
      ...v.update(halfRep(10), null, 60000),
    ];
    expect(all.every(exists)).toBe(true);
  });

  describe('with a named player', () => {
    const named = (target: number | null = null) => new VoiceCoach(target, Math.random, true);

    it('greets and signs off by name', () => {
      const v = named();
      expect(v.start()).toEqual(['name-start']);
      expect(v.finish()).toEqual(['name-finish']);
    });

    it('says "last one" by name', () => {
      const v = named(8);
      expect(v.update(rep(7), null, 0)).toEqual(['count-7', 'name-last']);
    });

    it('uses the name on the first "go deeper" only', () => {
      const v = named();
      expect(v.update(halfRep(0), null, 0)).toEqual(['name-deeper']);
      expect(v.update(halfRep(0), null, 6000).map(groupOf)).toEqual(['cue-deeper']);
    });

    it('uses the name on every other praise, so it never gets old', () => {
      const v = named();
      const praise = [];
      for (let n = 1; n <= 12; n++) {
        const said = v.update(rep(n), null, n * 3000);
        if (said.length > 1) {
          praise.push(said[1]);
        }
      }
      expect(praise.map(groupOf)).toEqual(['name-praise', 'praise', 'name-praise']);
    });

    it('an unnamed player never gets name clips', () => {
      const v = new VoiceCoach(8);
      const all = [...v.start(), ...v.update(halfRep(0), null, 0), ...v.update(rep(7), null, 9000), ...v.finish()];
      expect(all.filter((c) => c.startsWith('name-'))).toEqual([]);
    });
  });
});
