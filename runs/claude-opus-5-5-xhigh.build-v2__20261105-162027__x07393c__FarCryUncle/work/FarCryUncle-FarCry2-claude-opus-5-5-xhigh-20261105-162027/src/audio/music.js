// Original songs as data: plucked pentatonic lines, thumb-piano timbres, noise hand drums, low drones. Defaults to 10% volume.
import { clamp } from '../core/rng.js';
const pluck = { wave: 'triangle', decay: 0.24, volume: 0.42 };
const thumb = { wave: 'sine', decay: 0.18, volume: 0.5, attack: 0.002 };
const drone = { wave: 'saw', attack: 0.3, decay: 0.8, volume: 0.09 };
const low = { wave: 'triangle', attack: 0.05, decay: 0.7, volume: 0.32 };
const drum = { wave: 'noise', decay: 0.06, volume: 0.24 };
const bass = { wave: 'saw', decay: 0.2, volume: 0.22 };
export const SONGS = {
  title: { bpm: 66, tracks: { thumb, drone, low }, patterns: {
    a: { thumb: 'A4 . . . C5 . E5 . . . D5 . C5 . . . A4 . . . G4 . . . E4 . . . . . . .', drone: 'A2 - - - - - - - - - - - - - - - E2 - - - - - - - - - - - - - - -', low: 'A2 . . . . . . . . . . . . . . . . . . . . . . . E2 . . . . . . .' },
    b: { thumb: 'E5 . . . D5 . C5 . . . A4 . . . G4 . . . A4 . . . C5 . . . A4 . . . . .', drone: 'C3 - - - - - - - - - - - - - - - A2 - - - - - - - - - - - - - - -', low: 'C3 . . . . . . . . . . . . . . . A2 . . . . . . . . . . . . . . .' } }, order: ['a', 'a', 'b', 'a'] },
  day: { bpm: 72, tracks: { pluck, drone }, patterns: {
    a: { pluck: 'D4 . . . F4 . . . A4 . . . . . . . . . . . G4 . F4 . D4 . . . . . . .', drone: 'D2 - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -' },
    b: { pluck: '. . . . A4 . C5 . . . A4 . G4 . . . F4 . . . . . D4 . . . . . . . . .', drone: 'D2 - - - - - - - - - - - - - - - G2 - - - - - - - - - - - - - - -' },
    c: { pluck: '. . . . . . . . . . . . . . . . D5 . . . C5 . A4 . . . . . . . . .', drone: 'D2 - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -' } }, order: ['a', 'c', 'b', 'c'] },
  night: { bpm: 50, tracks: { thumb: { ...thumb, volume: 0.25, decay: 0.5 }, drone: { ...drone, volume: 0.05 } }, patterns: {
    a: { thumb: 'A3 . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .', drone: 'A1 - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -' },
    b: { thumb: '. . . . . . . . E4 . . . . . . . . . . . . . . . D4 . . . . . . .', drone: 'A1 - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -' } }, order: ['a', 'b'] },
  stalk: { bpm: 96, tracks: { pulse: { wave: 'triangle', decay: 0.08, volume: 0.32 }, drone: { ...drone, volume: 0.1 }, drum: { ...drum, volume: 0.12 } }, patterns: {
    a: { pulse: 'A2 . . . A2 . . . A2 . . . A2 . . . A2 . . . A2 . . . Bb2 . . . A2 . . .', drone: 'A1 - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -', drum: '. . . . . . C7 . . . . . . . C7 . . . . . . . C7 . . . . . . . C7 .' } }, order: ['a'] },
  fight: { bpm: 132, tracks: { bass, drum, hi: { wave: 'noise', decay: 0.03, volume: 0.16 }, stab: { wave: 'triangle', decay: 0.1, volume: 0.28 } }, patterns: {
    a: { bass: 'D2 . D2 . D2 D2 . . F2 . . D2 . . C2 . D2 . D2 . D2 D2 . . A1 . . C2 . . C2 .', drum: 'C5 . . . C6 . . C5 C5 . . . C6 . C5 . C5 . . . C6 . . C5 C5 . . . C6 . C5 C6', hi: 'C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 .', stab: '. . . . . . . . A4 . . . . . . . . . . . . . . . G4 . . . . . . .' },
    b: { bass: 'A1 . A1 . A1 A1 . . C2 . . A1 . . G1 . A1 . A1 . A1 A1 . . D2 . . C2 . . A1 .', drum: 'C5 . . . C6 . . C5 C5 . . . C6 . C5 . C5 . C5 . C6 . . C5 C5 . . C5 C6 . C6 C6', hi: 'C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 .', stab: '. . . . . . . . C5 . . . . . . . . . . . D5 . . . E5 . . . . . . .' } }, order: ['a', 'a', 'b', 'a'] },
  fever: { bpm: 60, tracks: { pluck: { ...pluck, vibrato: { depth: 0.8, rate: 2.2 }, volume: 0.3, decay: 0.5 }, pluck2: { ...pluck, vibrato: { depth: 1.1, rate: 1.7 }, volume: 0.22, decay: 0.5 }, drone: { ...drone, volume: 0.12, vibrato: { depth: 0.6, rate: 0.8 } } }, patterns: {
    a: { pluck: 'D4 . . . F4 . . . A4 . . . . . . . . . . . G4 . F4 . D4 . . . . . . .', pluck2: 'Eb4 . . . F#4 . . . Bb4 . . . . . . . . . . . Ab4 . F#4 . Eb4 . . . . . . .', drone: 'D2 - - - - - - - - - - - - - - - Eb2 - - - - - - - - - - - - - - -' } }, order: ['a'] },
  end: { bpm: 54, loop: false, tracks: { line: { wave: 'triangle', decay: 0.5, volume: 0.42 } }, patterns: {
    a: { line: 'A4 . . . C5 . . . E5 . . . . . . . D5 . . . C5 . . . A4 . . . . . . .' },
    b: { line: 'G4 . . . A4 . . . C5 . . . D5 . . . E5 . . . . . . . . . . . . . . .' },
    c: { line: 'D5 . . . C5 . . . A4 . . . G4 . . . A4 . . . . . . . . . . . . . . .' } }, order: ['a', 'b', 'a', 'c'] },
};
const DWELL = 12;
export class Music {
  current = null; since = -99; mood = null; pending = null;
  constructor(game) { this.game = game; }
  /** Pick by state with a 12 s minimum dwell. */
  update(ctx, dt, realT) {
    const g = this.game;
    const want = this.mood ?? this.auto();
    if (want === this.current) return;
    if (this.current && realT - this.since < DWELL && want !== 'title' && want !== 'end') return;
    this.current = want; this.since = realT;
    ctx.audio.playMusic(SONGS[want] ?? null, want);
  }
  force(name, realT = -99) { this.current = name; this.since = realT; this.game.ctx.audio.playMusic(SONGS[name] ?? null, name); }
  setMood(m) { this.mood = m; }
  auto() {
    const g = this.game;
    if (g.mode === 'title' || g.mode === 'attract') return 'title';
    if (g.endingMusic) return 'end';
    if (g.body.feverOn) return 'fever';
    if (g.actors.inCombat || g.fireView.nearestDist < 70) return 'fight';
    if (g.actors.anyAlertNear) return 'stalk';
    return g.clock.isNight() ? 'night' : 'day';
  }
}
