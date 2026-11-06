// Composer: builds Song data from hand-written motifs (transposition, tempo, re-voicing). Tracks sum to ~1.0 so 10% music is audible.
const NOTES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const note = (semi, oct) => { const s = ((semi % 12) + 12) % 12; const o = oct + Math.floor(semi / 12); return NOTES[s] + o; };
/** degree d (0-based, may exceed 6) of a major scale from root semitone. */
const deg = (root, d, oct) => { const o = Math.floor(d / 7); const k = ((d % 7) + 7) % 7; return note(root + MAJOR[k] + 12 * o, oct); };
// Each motif: 2 bars (24 steps, 12/bar with stepsPerBeat 3): melody as [degree|null|'-'] per step, plus chords per bar [rootDegree].
const MOTIFS = [
  { mel: '2 . . 4 . 5 | 7 . . 5 . 4 | 2 . . . . . | . . . 0 . 2', chords: [0, 5, 3, 4] },
  { mel: '4 . 2 . 0 . | 2 . 4 . 7 . | 5 . . 4 . 2 | 0 . . . . .', chords: [0, 3, 4, 0] },
  { mel: '0 . 2 . 4 . | 4 . . 5 . 4 | 2 . 0 . 2 . | 4 . . . . .', chords: [3, 4, 0, 5] },
  { mel: '7 . . 5 . 4 | 2 . . . 4 . | 5 . 4 . 2 . | 0 . . . . .', chords: [0, 5, 1, 4] },
  { mel: '2 . 4 5 . 7 | . . 9 . 7 . | 5 . 4 . 2 . | 4 . . . . .', chords: [0, 2, 3, 4] },
  { mel: '. 4 . 2 . 0 | 2 . . . 4 . | 5 . 7 . 5 . | 4 . . . 2 .', chords: [5, 3, 0, 4] },
  { mel: '0 . . 2 . 4 | 5 . . 4 . 2 | 4 . . . 2 . | 0 . . . . .', chords: [0, 0, 3, 4] },
  { mel: '4 . 4 . 5 . | 7 . . . 5 . | 4 . 2 . 0 . | 2 . . . . .', chords: [3, 0, 4, 0] },
];
const parse = (s) => s.replace(/\|/g, ' ').trim().split(/\s+/);
const WAVES = ['triangle', 'square', 'triangle', 'saw', 'square', 'triangle'];
/** o: { motif, root, bpm, lead, mood: 'day'|'rain'|'snow'|'night'|'party'|'city', vol } */
export function makeSong(o) {
  const root = o.root ?? 0, m = MOTIFS[(o.motif ?? 0) % MOTIFS.length], mel = parse(m.mel);
  const night = o.mood === 'night' || o.mood === 'city', rain = o.mood === 'rain', snow = o.mood === 'snow';
  const leadWave = rain ? 'sine' : snow ? 'triangle' : (o.lead ?? 'triangle');
  const bar = (chordRoots) => ({
    lead: mel.map((x, i) => { if (x === '.') return '.'; const d = +x + (o.up ?? 0); if (night && i % 3 === 1 && i % 2) return '.'; return deg(root, d, 4); }).join(' '),
    bass: Array.from({ length: 24 }, (_, i) => { const c = chordRoots[Math.floor(i / 6) % chordRoots.length]; const pat = [0, null, 2, null, 4, null]; const p = pat[i % 6]; return p == null ? '.' : deg(root, c + p, 2); }).join(' '),
    chord: Array.from({ length: 24 }, (_, i) => { const c = chordRoots[Math.floor(i / 6) % chordRoots.length]; return i % 6 === 3 ? deg(root, c + 2, 3) : (i % 6 === 0 ? deg(root, c + 4, 3) : '.'); }).join(' '),
    hat: Array.from({ length: 24 }, (_, i) => (i % 3 === 0 ? (rain ? 'C7' : 'C8') : '.')).join(' '),
  });
  const a = bar(m.chords.slice(0, 2)), b = bar(m.chords.slice(2));
  const v = o.vol ?? 1;
  const tracks = {
    lead: { wave: leadWave, duty: 0.25, attack: 0.01, decay: rain ? 0.5 : 0.28, volume: 0.42 * v },
    bass: { wave: 'triangle', attack: 0.005, decay: 0.2, volume: 0.36 * v },
    chord: { wave: snow ? 'sine' : 'square', duty: 0.125, attack: 0.01, decay: 0.3, volume: 0.14 * v },
    hat: { wave: 'noise', attack: 0.001, decay: 0.03, volume: 0.08 * v },
  };
  return { bpm: o.bpm ?? 96, stepsPerBeat: 3, tracks, patterns: { a, b }, order: ['a', 'b', 'a', 'b'] };
}
/** Hourly tune: 24 distinct arrangements, plus rain and snow variants. */
export function hourSong(hour, weather = 'sun') {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  const roots = [0, 2, 4, 5, 7, 9, 10, 3];
  const mood = (weather === 'rain' || weather === 'storm') ? 'rain' : weather === 'snow' ? 'snow' : (h >= 20 || h < 5) ? 'night' : 'day';
  return makeSong({ motif: h % 8, root: roots[(h * 5) % 8], bpm: 78 + ((h * 7) % 22) - (mood === 'rain' ? 10 : 0) - (mood === 'night' ? 8 : 0), lead: WAVES[h % WAVES.length], mood, up: h >= 12 && h < 17 ? 1 : 0 });
}
export const VENUE_SONGS = {
  title: { motif: 1, root: 7, bpm: 92, lead: 'triangle' }, credits: { motif: 4, root: 0, bpm: 84 }, bus: { motif: 3, root: 5, bpm: 104, lead: 'square' }, bed: { motif: 6, root: 0, bpm: 60, mood: 'night' },
  store: { motif: 5, root: 9, bpm: 112, lead: 'square' }, museum: { motif: 2, root: 2, bpm: 72 }, mothwick: { motif: 7, root: 10, bpm: 100 }, hall: { motif: 0, root: 5, bpm: 88 },
  cityDay: { motif: 4, root: 7, bpm: 120, lead: 'square', mood: 'city' }, cityNight: { motif: 3, root: 9, bpm: 110, lead: 'saw', mood: 'city' }, salon: { motif: 5, root: 4, bpm: 108 }, couture: { motif: 2, root: 10, bpm: 90 },
  magda: { motif: 1, root: 3, bpm: 80, mood: 'night' }, theatre: { motif: 7, root: 0, bpm: 76 }, auction: { motif: 4, root: 2, bpm: 138, lead: 'square' }, cafe: { motif: 6, root: 7, bpm: 70 }, bureau: { motif: 0, root: 10, bpm: 96 },
  seed: { motif: 3, root: 4, bpm: 124, lead: 'square', mood: 'party' }, lantern: { motif: 6, root: 9, bpm: 66 }, soup: { motif: 5, root: 7, bpm: 116 }, longnight: { motif: 2, root: 5, bpm: 70, mood: 'snow' },
  contest: { motif: 7, root: 2, bpm: 132, lead: 'square', mood: 'party' }, sting0: { motif: 0, root: 4, bpm: 130 }, sting1: { motif: 1, root: 9, bpm: 130 }, sting2: { motif: 2, root: 2, bpm: 110 }, sting3: { motif: 3, root: 7, bpm: 90, mood: 'snow' },
  vesper0: { motif: 1, root: 0, bpm: 84 }, vesper1: { motif: 5, root: 5, bpm: 100 }, vesper2: { motif: 6, root: 7, bpm: 70, mood: 'night' }, vesper3: { motif: 4, root: 9, bpm: 112 }, vesper4: { motif: 0, root: 2, bpm: 92 }, vesper5: { motif: 7, root: 10, bpm: 78, mood: 'rain' },
  round: { motif: 4, root: 7, bpm: 126, lead: 'square', mood: 'party' }, card: { motif: 2, root: 0, bpm: 90 }, cheese: { motif: 5, root: 3, bpm: 96, lead: 'square' }, attract: { motif: 1, root: 7, bpm: 100 },
};
export const songNamed = (n) => makeSong(VENUE_SONGS[n] ?? VENUE_SONGS.title);
/** Player-composed Chime: 16 steps of scale degrees (0..7 or -1 for rest). */
export function chimeSong(steps, bpm = 96) {
  const mel = steps.map(s => s < 0 ? '.' : deg(0, s, 5)).join(' ');
  return { bpm, stepsPerBeat: 2, tracks: { lead: { wave: 'triangle', decay: 0.8, volume: 0.7 }, bass: { wave: 'sine', decay: 0.6, volume: 0.3 } }, patterns: { a: { lead: mel, bass: steps.map((s, i) => i % 4 === 0 ? deg(0, i % 8 === 0 ? 0 : 4, 3) : '.').join(' ') } }, order: ['a'], loop: false };
}
export const CHIME_DEFAULT = [0, -1, 2, -1, 4, -1, 2, -1, 3, -1, 1, -1, 0, -1, -1, -1];
