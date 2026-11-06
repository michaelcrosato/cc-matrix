// Everything musical is built here from short hand-written motifs: 24 hourly arrangements with
// rain and snow variants, venues, festivals, contests, records. All newly composed.
const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10], mixo: [0, 2, 4, 5, 7, 9, 10], minor: [0, 2, 3, 5, 7, 8, 10], pent: [0, 2, 4, 7, 9, 12, 14] };
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const KEYS = { C: 60, Db: 61, D: 62, Eb: 63, E: 64, F: 65, Gb: 66, G: 67, Ab: 68, A: 69, Bb: 70, B: 71 };
export const midiName = (m) => `${NOTE_NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7 };
function chordDegree(ch) { return ROMAN[ch.replace(/[^ivIV]/g, '').toUpperCase()] ?? 1; }
function degreeMidi(root, scale, deg) {
  const s = SCALES[scale];
  const d = deg - 1;
  const oct = Math.floor(d / 7);
  return root + s[((d % 7) + 7) % 7] + 12 * oct;
}
const STEPS = 12; // a bar at 3 steps a beat: swing

/** Hand-written melodies: degrees in the scale. '.' rest, '-' hold. 12 steps a bar. */
export const MOTIFS = [
  { name: 'Morning Errand', scale: 'major', chords: 'I vi ii V I IV V I', mel: ['5 . . 3 . 5 6 . 5 3 . .', '1 . 2 3 . 5 2 - . . . .', '6 . . 4 . 6 5 . 3 2 . .', '3 . 2 1 . . 2 . 3 5 . .', '5 . . 3 . 5 6 . 8 6 . 5', '4 . 5 6 . 4 3 - . . . .', '2 . 3 4 . 5 7 . 6 5 . 4', '3 . . 1 - - - . . . . .'] },
  { name: 'Beans on Toast', scale: 'mixo', chords: 'I I IV I V IV I V', mel: ['1 . 3 5 . 7 6 . 5 3 . .', '5 . 3 1 . 3 2 . 1 . . .', '4 . 6 8 . 6 5 . 4 3 . .', '3 . 5 6 . 5 3 - . . . .', '2 . 4 5 . 7 6 . 5 4 . .', '4 . 6 8 . 7 6 . 4 . . .', '3 . 5 8 . 5 6 . 5 3 . 1', '2 . . 5 . . 7 - . . . .'] },
  { name: 'Porch Steps', scale: 'major', chords: 'I iii IV I ii V I I', mel: ['3 . . . 5 . 3 . . 2 . 1', '3 . . 5 . 7 5 - . . . .', '6 . . . 8 . 6 . . 5 . 4', '5 . 3 . 1 . 3 - . . . .', '2 . . 4 . 6 5 . . 4 . 2', '7 . . 5 . 2 4 . 2 . . .', '1 . 3 5 . 8 7 . 5 3 . .', '1 - - - . . . . . . . .'] },
  { name: 'Noon Bench', scale: 'pent', chords: 'I IV I V I IV V I', mel: ['1 . 2 3 . 4 3 . 2 1 . .', '4 . 4 5 . 4 3 . 2 . . .', '3 . 4 5 . 6 5 . 4 3 . .', '5 . 4 3 . 2 2 - . . . .', '1 . 2 3 . 4 5 . 6 5 . .', '6 . 6 5 . 4 3 . 2 3 . .', '2 . 3 5 . 3 2 . 1 2 . .', '1 - . . . . . . . . . .'] },
  { name: 'Slow Afternoon', scale: 'dorian', chords: 'i IV i V i IV VII i', mel: ['1 . . 3 . 4 5 . . 7 . 5', '4 . 6 5 . 4 3 . . . . .', '3 . . 5 . 4 3 . 2 1 . .', '2 . 5 . 7 . 5 . 4 2 . .', '1 . . 3 . 5 7 . . 8 . 7', '6 . 4 5 . 6 4 - . . . .', '7 . 5 4 . 2 3 . 5 7 . .', '8 - . 5 . . 1 - . . . .'] },
  { name: 'Teatime Walk', scale: 'major', chords: 'I V vi IV I ii V I', mel: ['8 . 7 6 . 5 4 . 3 2 . .', '7 . 6 5 . 4 2 - . . . .', '3 . 4 5 . 6 8 . 6 5 . .', '6 . 5 4 . 3 4 - . . . .', '5 . . 8 . 7 6 . 5 3 . .', '4 . 6 2 . 4 6 . 5 4 . .', '5 . 7 2 . 4 7 . 5 . . .', '8 . . 5 . 3 1 - . . . .'] },
  { name: 'Lamplighter', scale: 'minor', chords: 'i VI III VII i iv V i', mel: ['5 . . 3 . 1 5 . 6 5 . .', '6 . 8 6 . 3 1 - . . . .', '5 . 3 5 . 7 8 . 7 5 . .', '7 . 5 2 . 4 5 - . . . .', '8 . . 7 . 5 3 . 5 8 . .', '4 . 6 8 . 6 4 . 3 1 . .', '2 . 4 7 . 4 5 . 2 7 . .', '1 - - . . . 5 . 3 1 . .'] },
  { name: 'Evening Laundry', scale: 'major', chords: 'IV I V vi IV I ii V', mel: ['4 . 6 8 . 6 5 . 3 . . .', '3 . 5 8 . 5 3 . 1 . . .', '2 . 5 7 . 5 4 . 2 . . .', '1 . 3 6 . 3 1 - . . . .', '6 . 4 . 6 . 8 . 6 5 . 4', '3 . 5 . 8 . 5 . 3 2 . 1', '2 . 4 . 6 . 4 . 2 . 4 .', '5 - . . 7 - . . 2 - . .'] },
  { name: 'Moth Waltz', scale: 'dorian', chords: 'i i IV IV i V i i', mel: ['1 - - 5 - - 3 - 2 1 - -', '3 - - 7 - - 5 - 4 3 - -', '4 - - 8 - - 6 - 5 4 - -', '6 - 5 4 - 3 2 - - - - -', '1 - - 5 - - 8 - 7 5 - -', '7 - - 4 - - 5 - 7 2 - -', '3 - - 1 - - 3 - 5 3 - -', '1 - - - - - . . . . . .'] },
  { name: 'Nightshift', scale: 'minor', chords: 'i iv i V VI iv V i', mel: ['1 . 3 . 5 . 8 . . 7 . 5', '4 . 6 . 8 . 6 . . 4 . 3', '3 . 5 . 7 . 5 . . 3 . 1', '7 . 2 . 5 . 2 . . 7 . .', '6 . 8 . 3 . 8 . . 6 . 5', '4 . 6 . 1 . 6 . . 4 . 2', '2 . 7 . 5 . 2 . 4 . 7 .', '8 - . . 5 - . . 1 - . .'] },
  { name: 'Three in the Morning', scale: 'pent', chords: 'I I IV IV I V I I', mel: ['. . 5 . . 3 . . 2 . . 1', '. . 3 . . 5 - - . . . .', '. . 6 . . 5 . . 4 . . 3', '. . 4 . . 2 - - . . . .', '. . 5 . . 6 . . 7 . . 6', '. . 5 . . 3 . . 2 . . .', '. . 2 . . 3 . . 2 . . 1', '1 - - - . . . . . . . .'] },
  { name: 'First Light', scale: 'major', chords: 'I IV ii V iii vi ii V', mel: ['5 . 8 . 7 . 8 . 5 . 3 .', '4 . 6 . 8 . 6 . 4 . 2 .', '2 . 4 . 6 . 5 . 4 . 2 .', '7 . 5 . 2 . 4 - - . . .', '3 . 5 . 7 . 5 . 3 . 5 .', '6 . 8 . 3 . 2 . 1 . 3 .', '4 . 2 . 6 . 4 . 2 . 4 .', '5 - - - 2 - - - 5 - - -'] },
];
/** Hour → motif, key and tempo, a different arrangement for each of the 24 hours. */
const HOUR_PLAN = [
  [9, 'F', 74], [10, 'Bb', 66], [10, 'D', 62], [10, 'G', 60], [11, 'C', 64], [11, 'F', 72],
  [0, 'C', 88], [0, 'D', 96], [1, 'F', 104], [1, 'G', 112], [2, 'Eb', 100], [2, 'C', 108],
  [3, 'G', 112], [3, 'A', 104], [4, 'D', 92], [4, 'E', 88], [5, 'F', 96], [5, 'Bb', 92],
  [7, 'Eb', 88], [7, 'C', 84], [6, 'D', 80], [6, 'F', 76], [8, 'C', 72], [8, 'G', 70],
];
const STYLE = {
  swing: { lead: { wave: 'triangle', attack: 0.005, decay: 0.32, volume: 0.42 }, leadOct: 12, bass: { wave: 'triangle', attack: 0.004, decay: 0.2, volume: 0.32 }, chord: { wave: 'square', duty: 0.25, attack: 0.002, decay: 0.09, volume: 0.13 }, tick: { wave: 'noise', decay: 0.03, volume: 0.09 }, bassMode: 'walk' },
  soft: { lead: { wave: 'sine', attack: 0.01, decay: 0.5, volume: 0.48 }, leadOct: 12, bass: { wave: 'triangle', attack: 0.01, decay: 0.3, volume: 0.32 }, chord: { wave: 'triangle', attack: 0.01, decay: 0.3, volume: 0.12 }, bassMode: 'two' },
  reed: { lead: { wave: 'square', duty: 0.25, attack: 0.008, decay: 0.26, volume: 0.28 }, leadOct: 0, bass: { wave: 'triangle', attack: 0.004, decay: 0.2, volume: 0.36 }, chord: { wave: 'triangle', attack: 0.004, decay: 0.12, volume: 0.18 }, tick: { wave: 'noise', decay: 0.02, volume: 0.08 }, bassMode: 'walk' },
  bell: { lead: { wave: 'sine', attack: 0.002, decay: 0.7, volume: 0.42, layers: [{ wave: 'sine', freq: 2, decay: 0.3, volume: 0.12 }] }, leadOct: 24, bass: { wave: 'sine', attack: 0.02, decay: 0.5, volume: 0.36 }, chord: { wave: 'triangle', attack: 0.02, decay: 0.5, volume: 0.14 }, bassMode: 'one' },
  city: { lead: { wave: 'square', duty: 0.5, attack: 0.002, decay: 0.2, volume: 0.24 }, leadOct: 12, bass: { wave: 'square', duty: 0.25, attack: 0.002, decay: 0.16, volume: 0.28 }, chord: { wave: 'square', duty: 0.125, attack: 0.002, decay: 0.08, volume: 0.14 }, tick: { wave: 'noise', decay: 0.025, volume: 0.14 }, snare: { wave: 'noise', decay: 0.08, volume: 0.16 }, bassMode: 'walk' },
  march: { lead: { wave: 'square', duty: 0.5, attack: 0.002, decay: 0.16, volume: 0.28 }, leadOct: 12, bass: { wave: 'triangle', attack: 0.002, decay: 0.12, volume: 0.32 }, chord: { wave: 'square', duty: 0.25, attack: 0.002, decay: 0.08, volume: 0.14 }, snare: { wave: 'noise', decay: 0.06, volume: 0.18 }, tick: { wave: 'noise', decay: 0.02, volume: 0.08 }, bassMode: 'oom' },
  lullaby: { lead: { wave: 'sine', attack: 0.04, decay: 0.8, volume: 0.48 }, leadOct: 12, bass: { wave: 'sine', attack: 0.04, decay: 0.8, volume: 0.36 }, chord: { wave: 'triangle', attack: 0.04, decay: 0.5, volume: 0.16 }, bassMode: 'one' },
};
function bassStep(mode, root, third, fifth, next, bar) {
  const n = midiName;
  const out = Array(STEPS).fill('.');
  if (mode === 'walk') { out[0] = n(root); out[3] = n(third); out[6] = n(fifth); out[9] = n(next - 1 + (bar % 2 === 0 ? 0 : 2)); }
  else if (mode === 'two') { out[0] = n(root); out[6] = n(fifth); }
  else if (mode === 'one') { out[0] = n(root); out[1] = '-'; out[2] = '-'; }
  else if (mode === 'oom') { out[0] = n(root); out[6] = n(fifth); out[3] = n(root + 12); out[9] = n(fifth + 12); }
  return out;
}
export function buildSong({ scale, chords, mel, key = 'C', bpm = 100, style = 'swing', variant = null, loop = true, sparse = false }) {
  const st = STYLE[style] ?? STYLE.swing;
  const root = KEYS[key] ?? 60;
  const chordList = chords.split(/\s+/);
  const tracks = { lead: { ...st.lead }, bass: { ...st.bass }, chord: { ...st.chord }, chord2: { ...st.chord, volume: (st.chord.volume ?? 0.1) * 0.8 } };
  if (st.tick) tracks.tick = st.tick;
  if (st.snare) tracks.snare = st.snare;
  const patterns = {};
  const order = [];
  mel.forEach((barText, bar) => {
    const tokens = barText.trim().split(/\s+/);
    const lead = tokens.map((t) => {
      if (t === '.' || t === '-') return t;
      return midiName(degreeMidi(root, scale, Number(t)) + st.leadOct);
    });
    const d = chordDegree(chordList[bar % chordList.length]);
    const nextD = chordDegree(chordList[(bar + 1) % chordList.length]);
    const r = degreeMidi(root - 24, scale === 'pent' ? 'major' : scale, d);
    const t3 = degreeMidi(root - 24, scale === 'pent' ? 'major' : scale, d + 2);
    const t5 = degreeMidi(root - 24, scale === 'pent' ? 'major' : scale, d + 4);
    const nr = degreeMidi(root - 24, scale === 'pent' ? 'major' : scale, nextD);
    const bassMode = variant === 'snow' ? 'one' : variant === 'rain' ? 'two' : st.bassMode;
    const bass = bassStep(bassMode, r, t3, t5, nr, bar);
    const chord = Array(STEPS).fill('.');
    const chord2 = Array(STEPS).fill('.');
    const stabs = variant === 'snow' ? [0] : style === 'march' ? [3, 9] : [2, 5, 11];
    for (const s of stabs) { chord[s] = midiName(t3 + 12); chord2[s] = midiName(t5 + 12); }
    const row = { lead: lead.join(' '), bass: bass.join(' '), chord: chord.join(' '), chord2: chord2.join(' ') };
    if (st.tick) row.tick = Array.from({ length: STEPS }, (_, i) => (variant === 'snow' ? '.' : i % 3 === 0 || (i % 3 === 2 && variant !== 'rain') ? 'C8' : '.')).join(' ');
    if (st.snare) row.snare = Array.from({ length: STEPS }, (_, i) => (variant === 'snow' ? '.' : i === 3 || i === 9 ? 'C6' : '.')).join(' ');
    patterns[`b${bar}`] = row;
    order.push(`b${bar}`);
  });
  return { bpm: variant === 'rain' ? bpm - 8 : variant === 'snow' ? bpm - 14 : bpm, stepsPerBeat: 3, tracks, patterns, order, loop };
}
const cache = new Map();
/** The tune for an hour of the day, with weather variants. */
export function hourSong(hour, variant = null) {
  const k = `h${hour}:${variant ?? ''}`;
  if (cache.has(k)) return cache.get(k);
  const [mi, key, bpm] = HOUR_PLAN[hour % 24];
  const m = MOTIFS[mi];
  const night = hour >= 21 || hour < 5;
  const style = variant === 'snow' ? 'bell' : variant === 'rain' ? 'soft' : night ? 'soft' : hour % 3 === 0 ? 'reed' : 'swing';
  const song = buildSong({ ...m, key, bpm, style, variant });
  cache.set(k, song);
  return song;
}
export const TUNES = {
  title: { scale: 'major', key: 'F', bpm: 104, style: 'swing', chords: 'I vi IV V I iii IV V', mel: ['8 . 5 6 . 5 3 . 5 8 . .', '6 . 8 5 . 3 1 - . . . .', '4 . 6 8 . 6 5 . 6 8 . 7', '5 . 2 4 . 5 7 - . . . .', '8 . 5 6 . 5 3 . 5 8 . 9', '7 . 5 3 . 5 7 - . . . .', '6 . 4 2 . 4 6 . 8 6 . 4', '5 . 7 2 . 4 5 - 7 . 8 .'] },
  credits: { scale: 'major', key: 'Bb', bpm: 84, style: 'soft', chords: 'I V vi iii IV I ii V', mel: ['3 - . 5 . 8 7 - . 5 . .', '2 - . 5 . 7 6 - . 5 . .', '1 - . 3 . 6 8 - . 6 . .', '3 - . 5 . 7 5 - . . . .', '4 - . 6 . 8 7 - . 6 . .', '3 - . 5 . 8 7 - . 5 . .', '6 - . 4 . 2 4 . 6 8 . .', '7 - - 5 - - 2 - - 4 - -'] },
  bus: { scale: 'mixo', key: 'G', bpm: 118, style: 'swing', chords: 'I IV I V I IV V I', mel: ['1 . 3 5 . 3 6 . 5 3 . .', '4 . 6 8 . 6 5 . 3 1 . .', '5 . 6 5 . 3 2 . 3 5 . .', '2 . 4 5 . 7 5 . 4 2 . .', '1 . 3 5 . 8 7 . 5 6 . .', '6 . 4 3 . 4 6 . 8 6 . .', '5 . 2 4 . 7 6 . 4 2 . .', '1 . 3 5 . 3 1 - . . . .'] },
  lullaby: { scale: 'major', key: 'Eb', bpm: 54, style: 'lullaby', chords: 'I IV I V', mel: ['3 - - 5 - - 8 - - 5 - -', '4 - - 6 - - 8 - - 6 - -', '3 - - 5 - - 8 - - 7 - -', '2 - - 4 - - 5 - - - - -'] },
  store: { scale: 'major', key: 'C', bpm: 112, style: 'reed', chords: 'I vi ii V', mel: ['5 . 3 1 . 3 5 . 8 7 . 6', '6 . 8 6 . 3 1 . 3 . . .', '2 . 4 6 . 4 2 . 7 . 6 .', '5 . 7 2 . 7 5 - . . . .'] },
  museum: { scale: 'dorian', key: 'D', bpm: 76, style: 'bell', chords: 'i IV i VII', mel: ['1 . . 5 . . 3 . . 7 . .', '4 . . 8 . . 6 . . 5 . .', '3 . . 7 . . 5 . . 1 . .', '7 . . 4 . . 2 . . 5 . .'] },
  mothwick: { scale: 'minor', key: 'A', bpm: 88, style: 'reed', chords: 'i iv V i', mel: ['1 - 3 5 - 8 7 - 5 3 - 2', '4 - 6 8 - 6 4 - 3 1 - .', '2 - 4 7 - 5 2 - 7 5 - 4', '3 - 5 1 - 3 1 - - . . .'] },
  hall: { scale: 'major', key: 'G', bpm: 92, style: 'soft', chords: 'I IV V I', mel: ['1 . . 3 . . 5 . . 3 . .', '4 . . 6 . . 8 . . 6 . .', '5 . . 7 . . 2 . . 7 . .', '1 . 3 5 . 3 1 - . . . .'] },
  cityDay: { scale: 'major', key: 'Eb', bpm: 124, style: 'city', chords: 'I vi ii V I IV ii V', mel: ['8 . 7 5 . 3 5 . 7 8 . .', '6 . 8 6 . 5 3 . . . . .', '4 . 6 8 . 9 8 . 6 4 . .', '5 . 7 2 . 5 7 - . . . .', '8 . 7 5 . 3 5 . 7 8 . 9', '6 . 4 . 6 . 8 . 6 4 . .', '4 . 6 2 . 4 6 . 8 . 6 .', '5 . 2 4 . 7 5 - . . . .'] },
  cityNight: { scale: 'minor', key: 'E', bpm: 98, style: 'city', chords: 'i VI III VII i iv V i', mel: ['1 . 3 5 . 7 8 - . 7 . 5', '3 . 5 8 . 5 3 - . . . .', '5 . 7 2 . 5 3 . 5 7 . .', '2 . 4 7 . 5 4 - . . . .', '8 . 7 5 . 7 8 . 3 . 2 .', '4 . 6 8 . 6 4 - . 3 . .', '2 . 4 7 . 4 2 . 5 . 7 .', '8 - . 5 - . 1 - . . . .'] },
  salon: { scale: 'mixo', key: 'A', bpm: 116, style: 'swing', chords: 'I IV I V', mel: ['3 5 . 3 5 . 8 . 7 5 . .', '4 6 . 4 6 . 8 . 6 4 . .', '3 5 . 8 7 . 5 . 3 1 . .', '2 4 . 7 5 . 2 - . . . .'] },
  couture: { scale: 'minor', key: 'F', bpm: 92, style: 'city', chords: 'i i VI V', mel: ['8 - . 8 . 7 5 - . . . .', '8 - . 8 . 9 7 - . . . .', '6 - . 3 . 6 8 . 6 3 . .', '5 - - 7 - - 2 - - 7 - -'] },
  magda: { scale: 'minor', key: 'C', bpm: 72, style: 'reed', chords: 'i V i iv', mel: ['1 . . 2 . 3 7 . . 5 . .', '2 . . 7 . 5 4 . 2 . . .', '3 . . 4 . 5 8 . . 7 . .', '6 . 4 3 . 1 2 - - . . .'] },
  theatre: { scale: 'major', key: 'D', bpm: 130, style: 'march', chords: 'I V I IV I V I I', mel: ['1 . 3 5 . 8 5 . 3 1 . .', '2 . 4 7 . 5 2 . . . . .', '1 . 3 5 . 8 5 . 3 1 . .', '4 . 6 8 . 6 4 . . . . .', '5 . 8 7 . 6 5 . 3 1 . .', '2 . 5 7 . 5 4 . 2 . . .', '1 . 3 5 . 8 5 . 3 2 . .', '1 . . 8 . . 1 - . . . .'] },
  auction: { scale: 'major', key: 'B', bpm: 150, style: 'city', chords: 'I V I V', mel: ['1 3 5 3 1 3 5 3 8 7 5 3', '2 4 7 4 2 4 7 4 2 7 5 4', '3 5 8 5 3 5 8 5 8 9 8 5', '2 4 7 4 5 7 2 - . . . .'] },
  cafe: { scale: 'dorian', key: 'G', bpm: 60, style: 'soft', chords: 'i IV VII IV', mel: ['1 . . . . 5 . . 3 . . .', '4 . . . . 6 . . 5 . . .', '7 . . . . 2 . . 4 . . .', '6 . . . . 5 . . 3 - - -'] },
  bureau: { scale: 'major', key: 'C', bpm: 96, style: 'reed', chords: 'I I V V', mel: ['1 . . 1 . . 1 . 3 5 . .', '1 . . 1 . . 1 . 3 2 . .', '7 . . 7 . . 7 . 2 5 . .', '2 . . 2 . . 2 . 7 1 . .'] },
  festivalSpring: { scale: 'major', key: 'G', bpm: 132, style: 'march', chords: 'I IV V I', mel: ['5 6 8 . 5 3 . 5 6 8 . .', '6 8 9 . 8 6 . 4 6 8 . .', '7 5 2 . 4 5 7 . 5 2 . .', '8 5 3 . 5 8 1 - . . . .'] },
  festivalSummer: { scale: 'pent', key: 'A', bpm: 88, style: 'bell', chords: 'I IV I V', mel: ['1 . 2 3 . 5 6 . 5 3 . .', '6 . 5 4 . 5 6 - . . . .', '5 . 3 2 . 3 5 . 3 2 . .', '2 . 3 5 . 2 1 - . . . .'] },
  festivalAutumn: { scale: 'dorian', key: 'E', bpm: 116, style: 'reed', chords: 'i VII i IV', mel: ['1 3 5 . 7 5 3 . 5 1 . .', '7 2 4 . 2 7 5 . 7 2 . .', '1 3 5 . 8 7 5 . 3 1 . .', '4 6 8 . 6 4 3 . 2 1 . .'] },
  festivalWinter: { scale: 'major', key: 'Bb', bpm: 70, style: 'bell', chords: 'I vi IV V I iii ii V', mel: ['5 - . 8 . . 7 - . 5 . .', '6 - . 8 . . 6 - . 3 . .', '4 - . 6 . . 8 - . 6 . .', '7 - . 5 . . 2 - . . . .', '5 - . 8 . . 9 - . 8 . .', '7 - . 5 . . 3 - . 5 . .', '6 - . 4 . . 2 - . 4 . .', '5 - - - - - 7 - - 2 - -'] },
  contest: { scale: 'major', key: 'D', bpm: 144, style: 'city', chords: 'I IV V I', mel: ['1 3 5 8 . 5 3 . 5 8 . .', '4 6 8 9 . 8 6 . 4 6 . .', '5 7 2 5 . 4 2 . 7 5 . .', '8 5 3 1 . 3 5 . 8 . . .'] },
  vesper0: { scale: 'minor', key: 'D', bpm: 74, style: 'reed', chords: 'i iv V i', mel: ['5 . . 3 . . 1 . . 3 . 5', '6 . . 4 . . 1 . . 4 . 6', '7 . . 5 . . 2 . . 5 . 7', '8 - - 5 - - 1 - - . . .'] },
  vesper1: { scale: 'major', key: 'G', bpm: 96, style: 'reed', chords: 'I V V I', mel: ['1 - - 3 - 5 3 - - 5 - 8', '2 - - 4 - 7 5 - - 4 - 2', '7 - - 2 - 4 2 - - 5 - 7', '1 - - 5 - 3 1 - - . . .'] },
  vesper2: { scale: 'mixo', key: 'E', bpm: 80, style: 'reed', chords: 'I I IV I V IV I V', mel: ['1 . 3 5 . 7 5 . 3 1 . .', '1 . 3 5 . 7 5 . 3 . . .', '4 . 6 8 . 7 6 . 4 . . .', '1 . 3 5 . 7 5 . 3 1 . .', '5 . 7 2 . 4 2 . 7 . . .', '4 . 6 8 . 7 6 . 4 . . .', '1 . 3 5 . 7 5 . 3 1 . .', '5 . . 7 . . 2 . . 5 . .'] },
  vesper3: { scale: 'dorian', key: 'C', bpm: 104, style: 'reed', chords: 'i IV i V', mel: ['8 . 7 5 . 3 1 . 3 5 . 7', '6 . 4 . 6 . 8 . 6 4 . .', '3 . 5 7 . 8 7 . 5 3 . .', '2 . 5 7 . 5 2 - . . . .'] },
  vesper4: { scale: 'major', key: 'F', bpm: 66, style: 'soft', chords: 'I IV I V', mel: ['3 - - - 5 - 8 - - 7 - 5', '4 - - - 6 - 8 - - 6 - 4', '3 - - - 5 - 8 - - 9 - 8', '7 - - - 5 - 2 - - - - -'] },
  vesper5: { scale: 'minor', key: 'G', bpm: 58, style: 'lullaby', chords: 'i VI iv V', mel: ['1 - - 5 - - 8 - - 7 - -', '6 - - 3 - - 6 - - 8 - -', '4 - - 6 - - 8 - - 6 - -', '5 - - 7 - - 2 - - 5 - -'] },
  round: { scale: 'major', key: 'A', bpm: 138, style: 'march', chords: 'I IV I V', mel: ['1 3 5 . 8 5 3 . 5 8 . .', '4 6 8 . 9 8 6 . 4 6 . .', '1 3 5 . 8 7 5 . 3 1 . .', '5 7 2 . 4 7 5 . 2 . . .'] },
};
export function tune(id) {
  if (cache.has(id)) return cache.get(id);
  const t = TUNES[id];
  if (!t) return null;
  const s = buildSong(t);
  cache.set(id, s);
  return s;
}
export const allSongs = () => {
  const out = {};
  for (let h = 0; h < 24; h++) { out[`hour${h}`] = hourSong(h); out[`hour${h}rain`] = hourSong(h, 'rain'); out[`hour${h}snow`] = hourSong(h, 'snow'); }
  for (const id of Object.keys(TUNES)) out[id] = tune(id);
  return out;
};
/** Melody of a tune as MIDI per step: what Hester and Vesper sing. */
export function melodyNotes(id) {
  const s = tune(id);
  const out = [];
  for (const name of s.order) for (const t of s.patterns[name].lead.split(' ')) out.push(t);
  return out;
}
