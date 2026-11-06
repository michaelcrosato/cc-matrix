// Newly written tunes as data, arranged by code: easygoing, a little jazzy, walking bass, swing (3 steps a beat).
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const toMidi = (n) => { const m = /^([A-G][#b]?)(\d)$/.exec(n); return (Number(m[2]) + 1) * 12 + NOTE[m[1]]; };
const fromMidi = (m) => NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
export const transpose = (n, s) => fromMidi(toMidi(n) + s);
const CH = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], dim: [0, 3, 6], 6: [0, 4, 7, 9] };
const chordOf = (s) => { const m = /^([A-G][#b]?)(.*)$/.exec(s); return { root: NOTE[m[1]], tones: CH[m[2]] ?? CH[''] }; };
/** "C5:3 E5:2 G5:1 .:3" → step tokens. Length defaults to 3 (a beat). */
function expand(str, tr = 0) { const out = []; for (const t of str.trim().split(/\s+/)) { const [n, l] = t.split(':'); const len = Number(l ?? 3); if (n === '.') { for (let i = 0; i < len; i++) out.push('.'); } else { out.push(tr ? transpose(n, tr) : n); for (let i = 1; i < len; i++) out.push('-'); } } return out; }
const pad = (a, n) => { while (a.length < n) a.push('.'); return a.slice(0, n); };
function bass(chords, tr, oct = 2, style = 'walk') { const out = []; chords.forEach((c, i) => { const { root, tones } = chordOf(c); const base = (oct + 1) * 12 + root + tr; const next = chordOf(chords[(i + 1) % chords.length]); const appr = (oct + 1) * 12 + next.root + tr + (root > next.root ? 1 : -1); const pat = style === 'walk' ? [base, base + tones[1], base + tones[2], appr] : style === 'two' ? [base, null, base + tones[2], null] : [base, null, null, null]; for (const p of pat) { out.push(p === null ? '.' : fromMidi(p)); out.push(style === 'walk' ? '.' : '-'); out.push('.'); } }); return out; }
function stabs(chords, tr, oct = 4, idx = 1) { const out = []; chords.forEach((c) => { const { root, tones } = chordOf(c); const base = (oct + 1) * 12 + root + tr; const n = fromMidi(base + tones[idx % tones.length]); for (let b = 0; b < 4; b++) { out.push('.', '.', b % 2 ? n : '.'); } }); return out; }
function arps(chords, tr, oct = 5) { const out = []; chords.forEach((c) => { const { root, tones } = chordOf(c); const base = (oct + 1) * 12 + root + tr; for (let b = 0; b < 12; b++) out.push(b % 3 === 0 ? fromMidi(base + tones[(b / 3) % tones.length] + (b >= 6 ? 12 : 0)) : '.'); }); return out; }
function hats(bars, dens = 1) { const out = []; for (let i = 0; i < bars * 12; i++) out.push(dens && i % 3 === 2 ? 'C8' : dens > 1 && i % 3 === 0 ? 'C8' : '.'); return out; }
export const LEADS = {
  soft: { wave: 'triangle', attack: 0.01, decay: 0.32, volume: 0.42 }, bright: { wave: 'square', duty: 0.25, attack: 0.005, decay: 0.2, volume: 0.24 }, mellow: { wave: 'sine', attack: 0.02, decay: 0.4, volume: 0.5, vibrato: { depth: 0.15, rate: 5 } }, reed: { wave: 'square', duty: 0.125, attack: 0.02, decay: 0.28, volume: 0.24, vibrato: { depth: 0.2, rate: 5.5 } }, bell: { wave: 'triangle', attack: 0.002, decay: 0.55, volume: 0.42 }, saw: { wave: 'square', duty: 0.125, attack: 0.01, decay: 0.22, volume: 0.2 },
};
/** Build a Song. o: { bpm, chords (a bar each), mel (string), mel2, lead, tr, bassStyle, hat, stab, arp, loop } */
export function song(o) {
  const tr = o.tr ?? 0, bars = o.chords.length, steps = bars * 12;
  const lead = LEADS[o.lead ?? 'soft'];
  const tracks = { lead, bass: { wave: 'triangle', attack: 0.005, decay: 0.26, volume: 0.32 } };
  const A = { lead: pad(expand(o.mel, tr), steps).join(' '), bass: pad(bass(o.chords, tr, o.bassOct ?? 2, o.bassStyle ?? 'walk'), steps).join(' ') };
  if (o.stab !== 0) { tracks.stab = { wave: 'square', duty: 0.25, attack: 0.003, decay: 0.09, volume: (o.stab ?? 0.12) }; A.stab = pad(stabs(o.chords, tr), steps).join(' '); }
  if (o.arp) { tracks.arp = { wave: 'triangle', attack: 0.002, decay: 0.18, volume: o.arp }; A.arp = pad(arps(o.chords, tr), steps).join(' '); }
  if (o.hat !== 0) { tracks.hat = { wave: 'noise', freq: 9000, attack: 0.001, decay: 0.03, volume: o.hat ?? 0.08 }; A.hat = pad(hats(bars, o.hatDens ?? 1), steps).join(' '); }
  if (o.rain) { tracks.rain = { wave: 'noise', freq: 5000, attack: 0.05, decay: 0.2, volume: 0.05 }; A.rain = Array.from({ length: steps }, (_, i) => (i % 2 ? 'C7' : '.')).join(' '); }
  const patterns = { A }; const order = ['A'];
  if (o.mel2) { const c2 = o.chords2 ?? o.chords; const b2 = { lead: pad(expand(o.mel2, tr), c2.length * 12).join(' '), bass: pad(bass(c2, tr, o.bassOct ?? 2, o.bassStyle ?? 'walk'), c2.length * 12).join(' ') }; if (A.stab) b2.stab = pad(stabs(c2, tr), c2.length * 12).join(' '); if (A.arp) b2.arp = pad(arps(c2, tr), c2.length * 12).join(' '); if (A.hat) b2.hat = pad(hats(c2.length, o.hatDens ?? 1), c2.length * 12).join(' '); if (A.rain) b2.rain = A.rain.split(' ').slice(0, 12).join(' ').repeat(1) + ' ' + Array(c2.length * 12 - 12).fill('.').join(' '); patterns.B = b2; order.push('B'); }
  return { bpm: o.bpm, stepsPerBeat: 3, tracks, patterns, order, loop: o.loop !== false };
}
// ---- Hand-written motifs. Four bars each: chords, melody; second strain where it wants one.
export const MOTIFS = [
  { c: ['C', 'Am', 'F', 'G7'], m: 'E5 G5:2 A5:1 G5 E5 C5 D5:2 E5:1 C5 A4 F4:2 A4:1 C5 F5 E5:2 D5:1 B4 G4 D5', m2: 'C5:2 D5:1 E5 G5:6 A5:2 G5:1 E5 D5 C5 B4:6 .:3' },
  { c: ['F', 'Dm7', 'Bb', 'C7'], m: 'A4:2 C5:1 F5:3 E5:2 D5:1 C5:3 D5 F5 A5:6 G5:2 F5:1 D5 C5 Bb4 G4:2 A4:1 Bb4 E5', m2: 'F5:9 E5:2 D5:1 C5:6 A4:6 Bb4 D5 F5:6 E5 C5:6 .:3' },
  { c: ['G', 'Em', 'C', 'D7'], m: 'D5 B4:2 D5:1 G5:6 E5 B4:2 E5:1 G5:6 C5:2 E5:1 G5:2 E5:1 C5:6 D5 F#5 A5:3 F#5:3', m2: 'B5:6 A5:2 G5:1 E5 G5:9 C6:2 B5:1 A5:6 G5 A5 F#5 D5' },
  { c: ['Am', 'Dm', 'G7', 'Cmaj7'], m: 'A4 C5:2 E5:1 A5:6 F5:2 E5:1 D5 F5:6 G5:2 F5:1 D5 B4 G4:6 E5:9 .:3', m2: 'C5:2 B4:1 A4:6 .:3 D5:2 C5:1 B4:6 .:3 D5 F5 B5:3 A5 G5 E5 C5:6' },
  { c: ['D', 'Bm7', 'G', 'A7'], m: 'F#5:2 E5:1 D5 A4:6 B4:2 D5:1 F#5:3 A5:3 F#5 G5:2 F#5:1 E5 D5 B4:6 C#5 E5 A5 G5', m2: 'A5:6 F#5:6 B5:6 A5:2 F#5:1 D5 G5:6 E5:6 C#5 E5 A4:6' },
  { c: ['Bb', 'Gm7', 'Eb', 'F7'], m: 'D5:3 F5:2 G5:1 F5:3 Bb4:3 D5 G5:3 Bb5:3 G5:3 Eb5:2 F5:1 G5:3 Bb5:6 A5:2 G5:1 F5 Eb5 C5', m2: 'F5:9 D5:3 G5:9 Bb4:3 Eb5:2 D5:1 C5:3 Eb5:6 F5:6 .:6' },
  { c: ['C', 'E7', 'Am', 'F'], m: 'G5:2 E5:1 C5:3 G4:6 G#4:2 B4:1 E5:3 B4:6 A4:2 C5:1 E5:3 A5:6 F5:2 E5:1 D5:3 C5:6', m2: 'C6:6 B5:2 A5:1 G5:3 G#5:6 E5:6 A5:3 G5:3 E5:6 F5:2 G5:1 A5:3 F5:6' },
  { c: ['Eb', 'Cm7', 'Ab', 'Bb7'], m: 'G5 Bb5:2 G5:1 Eb5:6 C5:2 Eb5:1 G5:3 F5:6 Ab5:2 G5:1 F5 Eb5 C5:3 D5:2 F5:1 Bb5 Ab5 D5', m2: 'Eb5:9 F5:3 G5:9 Ab5:3 C6:6 Ab5:6 Bb5:3 G5:3 F5:6' },
  { c: ['A', 'F#m', 'D', 'E7'], m: 'E5:2 C#5:1 A4:3 C#5 E5 F#5:2 A5:1 F#5:3 C#5:6 D5 F#5 A5:2 F#5:1 D5:3 B4 E5:2 G#5:1 B5:3 G#5:3', m2: 'A5:3 B5:2 C#6:1 A5:6 F#5:9 E5:3 F#5:3 D5:9 E5:9 .:3' },
  { c: ['Dm7', 'G7', 'Cmaj7', 'A7'], m: 'F5 D5:2 A4:1 C5:3 F5:3 B4:2 D5:1 F5:3 G5:3 E5:2 C5:1 G4:3 B4:2 C5:1 E5:3 C#5:2 E5:1 G5:3 A5:3 G5', m2: 'A5:6 F5:6 B5:6 G5:6 E5:9 G5:3 A5:3 C#5:3 E5:6' },
  { c: ['F', 'C', 'Dm', 'Bb'], m: 'C5:2 D5:1 F5:3 A5:3 F5:3 G5:2 E5:1 C5:6 .:3 A4:2 C5:1 D5:3 F5:3 D5:3 Bb4:2 D5:1 F5:3 G5:3 F5', m2: 'A5:6 C6:6 G5:6 E5:6 F5:6 A5:6 Bb5:9 .:3' },
  { c: ['G', 'C', 'Am7', 'D7'], m: 'B4 D5 G5:2 F#5:1 E5:3 G5 E5:2 C5:1 G4:6 A4:2 C5:1 E5:3 G5:3 E5:3 F#5:2 E5:1 D5:3 A4:3 C5', m2: 'D6:6 B5:6 C6:6 G5:6 A5:6 E5:6 F#5:3 A5:3 D5:6' },
];
const PERIOD = (h) => (h < 5 ? 'night' : h < 9 ? 'dawn' : h < 12 ? 'morning' : h < 17 ? 'day' : h < 20 ? 'dusk' : 'eve');
const VOICE = { night: { lead: 'mellow', bpm: 58, hat: 0, stab: 0, bassStyle: 'two' }, dawn: { lead: 'bell', bpm: 72, hat: 0.05, stab: 0.06, bassStyle: 'two' }, morning: { lead: 'soft', bpm: 92, hat: 0.08, stab: 0.12 }, day: { lead: 'bright', bpm: 104, hat: 0.1, stab: 0.13 }, dusk: { lead: 'reed', bpm: 84, hat: 0.07, stab: 0.1 }, eve: { lead: 'mellow', bpm: 70, hat: 0.05, stab: 0.08, bassStyle: 'two' } };
export const TRANSPOSE24 = [0, -2, 1, -1, 2, 0, 3, -3, 1, 2, -2, 0, -1, 3, -2, 2, 0, 1, -3, 2, -1, 1, -2, 0];
/** Every hour of the day has its own arrangement, with rain and snow variants. */
export function hourlySong(hour, wx = 'clear') {
  const m = MOTIFS[hour % MOTIFS.length], v = VOICE[PERIOD(hour)], tr = TRANSPOSE24[hour];
  const o = { bpm: v.bpm + ((hour * 7) % 9) - 4, chords: m.c, mel: m.m, mel2: m.m2, tr, lead: v.lead, hat: v.hat, stab: v.stab, bassStyle: v.bassStyle };
  if (wx === 'rain') { o.lead = 'mellow'; o.stab = 0; o.bpm -= 12; o.rain = true; o.bassStyle = 'two'; }
  if (wx === 'snow') { o.lead = 'bell'; o.hat = 0; o.stab = 0; o.bpm -= 16; o.arp = 0.12; o.bassStyle = 'hold'; }
  return song(o);
}
const S = (o) => song({ ...o });
export const SONGS = {
  title: S({ bpm: 96, chords: ['C', 'Am7', 'Dm7', 'G7', 'C', 'E7', 'F', 'G7'], mel: 'G5 E5:2 G5:1 C6:6 A5 G5:2 E5:1 C5:6 F5:2 E5:1 D5:3 A5:6 G5 F5 D5 B4 G5 E5:2 G5:1 C6:6 G#5 E5 B4 D5 A5:2 G5:1 F5:3 C5:6 D5 F5 B5 G5', lead: 'soft', arp: 0.08 }),
  credits: S({ bpm: 76, chords: ['F', 'C', 'Dm7', 'Bb', 'F', 'Am7', 'Bb', 'C7'], mel: 'A5:6 C6:6 G5:6 E5:6 F5:6 A5:3 D5:3 Bb4:9 .:3 C5:3 F5:3 A5:6 E5:3 G5:3 C6:6 D5:3 F5:3 Bb5:6 G5:6 A5:6', lead: 'mellow', hat: 0.04, stab: 0.08 }),
  bus: S({ bpm: 116, chords: ['G', 'G', 'C', 'G', 'D7', 'C', 'G', 'D7'], mel: 'D5:2 D5:1 B4:3 D5:2 G5:1 B5:3 A5:2 G5:1 E5:3 D5:6 C5:2 E5:1 G5:3 E5:3 C5:3 D5:2 B4:1 G4:3 B4:6 A4:2 C5:1 F#5:3 A5:3 F#5:3 E5:2 G5:1 C6:3 B5:3 G5:3 D5:2 B4:1 G4:6 .:3 A4:3 C5:3 D5:3 F#5:3', lead: 'reed', bassStyle: 'two', hat: 0.1 }),
  lullaby: S({ bpm: 54, chords: ['C', 'F', 'C', 'G7'], mel: 'E5:6 G5:6 A5:6 F5:6 E5:3 D5:3 C5:6 D5:6 B4:6', lead: 'bell', stab: 0, hat: 0, bassStyle: 'hold' }),
  store: S({ bpm: 112, chords: ['F', 'Dm7', 'Gm7', 'C7'], mel: 'C5:2 A4:1 C5:2 F5:1 A5:3 F5:3 D5:2 F5:1 A5:3 D6:3 A5:3 Bb5:2 G5:1 D5:3 Bb4:3 D5:3 E5:2 G5:1 C6:3 Bb5:3 G5:3', mel2: 'A5:3 G5:3 F5:6 F5:3 E5:3 D5:6 D5:3 C5:3 Bb4:6 C5:3 E5:3 G5:6', lead: 'bright' }),
  museum: S({ bpm: 66, chords: ['Am', 'E7', 'Am', 'Dm', 'F', 'C', 'E7', 'Am'], mel: 'A4:6 C5:3 E5:3 G#5:6 B5:3 G#5:3 A5:6 E5:6 F5:3 A5:3 D6:6 C6:3 A5:3 F5:6 G5:3 E5:3 C5:6 B4:3 D5:3 G#5:6 A5:12', lead: 'mellow', hat: 0, stab: 0.06, bassStyle: 'two' }),
  mothwick: S({ bpm: 88, chords: ['Dm', 'A7', 'Dm', 'Gm', 'Bb', 'A7'], mel: 'A5:3 F5:2 A5:1 D6:6 C#6:3 A5:2 E5:1 G5:6 F5:3 D5:2 F5:1 A5:6 G5:3 Bb5:2 D6:1 Bb5:6 F5:3 D5:2 Bb4:1 F5:6 E5:3 G5:3 A5:6', lead: 'reed', hat: 0.05 }),
  hall: S({ bpm: 78, chords: ['C', 'G', 'Am', 'F'], mel: 'C5:9 E5:3 D5:9 G4:3 A4:6 C5:6 F5:9 .:3', lead: 'soft', hat: 0.04, stab: 0.06, bassStyle: 'two' }),
  cityDay: S({ bpm: 126, chords: ['Bb', 'G7', 'Cm7', 'F7'], mel: 'D5:2 F5:1 Bb5:3 A5:2 F5:1 D5:3 B4:2 D5:1 G5:3 F5:2 D5:1 B4:3 C5:2 Eb5:1 G5:3 Bb5:2 G5:1 Eb5:3 A4:2 C5:1 F5:3 Eb5:2 C5:1 A4:3', mel2: 'F5:6 Bb5:6 G5:6 D5:6 Eb5:6 G5:6 F5:6 .:6', lead: 'saw', hatDens: 2 }),
  cityNight: S({ bpm: 88, chords: ['Cm7', 'Fm7', 'Bb7', 'Ebmaj7', 'Abmaj7', 'Dm7', 'G7', 'Cm7'].map((c) => c), mel: 'G5:6 Eb5:3 C5:3 Ab5:6 F5:3 C5:3 Bb5:3 Ab5:3 F5:3 D5:3 G5:9 .:3 C6:6 Ab5:3 Eb5:3 F5:3 D5:3 A4:6 G5:3 F5:3 B4:3 D5:3 C5:9 .:3', lead: 'reed', hat: 0.1, hatDens: 2, stab: 0.14 }),
  salon: S({ bpm: 108, chords: ['G', 'Bm7', 'C', 'D7'], mel: 'B5:2 G5:1 D5:3 G5:3 B5:3 D6:2 B5:1 F#5:3 D5:6 E5:2 G5:1 C6:3 E6:3 C6:3 A5:3 F#5:2 A5:1 D6:6', lead: 'bright', arp: 0.08 }),
  couture: S({ bpm: 72, chords: ['Ebmaj7', 'Cm7', 'Fm7', 'Bb7'], mel: 'Bb5:9 G5:3 C6:9 G5:3 Ab5:6 F5:6 D5:3 F5:3 Bb5:6', lead: 'mellow', stab: 0.1, hat: 0.05, bassStyle: 'two' }),
  magda: S({ bpm: 64, chords: ['Em', 'B7', 'Em', 'C7'], mel: 'E5:3 G5:2 E5:1 B4:6 D#5:3 F#5:2 D#5:1 B4:6 E5:3 G5:2 B5:1 E6:6 C6:3 Bb5:2 G5:1 E5:6', lead: 'reed', hat: 0.06, bassStyle: 'two', stab: 0.08 }),
  theatre: S({ bpm: 100, chords: ['F', 'C7', 'F', 'Bb', 'F', 'D7', 'G7', 'C7'], mel: 'C5:3 F5:3 A5:3 C6:3 Bb5:2 G5:1 E5:3 C5:6 C5:3 F5:3 A5:3 F5:3 D6:6 Bb5:6 A5:2 F5:1 C5:3 F5:6 F#5:3 A5:3 D6:6 B5:3 G5:3 D5:6 C5:3 E5:3 G5:6', lead: 'bright', stab: 0.14 }),
  auction: S({ bpm: 148, chords: ['A', 'D', 'E7', 'A'], mel: 'E5:1 E5:1 E5:1 C#5:3 E5:3 A5:3 F#5:1 F#5:1 F#5:1 D5:3 F#5:3 A5:3 G#5:1 G#5:1 G#5:1 E5:3 B5:3 G#5:3 A5:9 .:3', lead: 'bright', hatDens: 2 }),
  bureau: S({ bpm: 80, chords: ['Dm', 'Dm', 'Gm', 'A7'], mel: 'D5:3 D5:3 F5:3 A5:3 D5:3 D5:3 G5:3 F5:3 Bb4:3 Bb4:3 D5:3 G5:3 A4:3 C#5:3 E5:3 G5:3', lead: 'soft', hat: 0.08, stab: 0.06, bassStyle: 'two' }),
  cafe: S({ bpm: 60, chords: ['Fmaj7', 'Em', 'Dm7', 'C6'].map((c) => c.replace('C6', 'C6')), mel: 'A5:6 F5:6 G5:6 E5:6 F5:6 C5:6 E5:12', lead: 'mellow', hat: 0.05, stab: 0.07, bassStyle: 'two' }),
  seedToss: S({ bpm: 132, chords: ['C', 'F', 'G7', 'C'], mel: 'E5:1 G5:1 C6:1 G5:3 E5:3 C5:3 F5:1 A5:1 C6:1 A5:3 F5:3 C5:3 G5:1 B5:1 D6:1 B5:3 G5:3 D5:3 C6:3 G5:3 C5:6', lead: 'bright', hatDens: 2 }),
  lantern: S({ bpm: 62, chords: ['G', 'Em', 'C', 'D', 'G', 'Bm7', 'C', 'D7'], mel: 'D5:6 B4:6 E5:6 G5:6 C6:9 B5:3 A5:12 B5:6 D6:6 F#5:9 A5:3 G5:6 E5:6 D5:12', lead: 'bell', hat: 0, stab: 0.05, bassStyle: 'two', arp: 0.06 }),
  soup: S({ bpm: 104, chords: ['Am', 'G', 'F', 'E7'], mel: 'A5:2 A5:1 E5:3 A5:2 B5:1 C6:3 G5:2 G5:1 D5:3 G5:2 A5:1 B5:3 F5:2 F5:1 C5:3 F5:2 G5:1 A5:3 E5:2 G#5:1 B5:3 E6:6', lead: 'reed', stab: 0.14 }),
  longNight: S({ bpm: 58, chords: ['C', 'Am', 'F', 'G', 'C', 'Em', 'F', 'C'], mel: 'G5:12 E5:12 A5:9 C6:3 B5:12 G5:6 C6:6 B5:12 A5:6 F5:6 E5:12', lead: 'bell', hat: 0, stab: 0, arp: 0.1, bassStyle: 'hold' }),
  contest: S({ bpm: 138, chords: ['D', 'G', 'A7', 'D'], mel: 'A4:1 D5:1 F#5:1 A5:3 F#5:3 D5:3 B4:1 D5:1 G5:1 B5:3 G5:3 D5:3 C#5:1 E5:1 A5:1 C#6:3 A5:3 E5:3 D6:6 A5:3 F#5:3', lead: 'saw', hatDens: 2 }),
  sting0: S({ bpm: 120, chords: ['C'], mel: 'C5:1 E5:1 G5:1 C6:9', lead: 'bell', stab: 0, hat: 0, bassStyle: 'hold', loop: false }),
  sting1: S({ bpm: 120, chords: ['D'], mel: 'D5:1 F#5:1 A5:1 D6:9', lead: 'bright', stab: 0, hat: 0, bassStyle: 'hold', loop: false }),
  sting2: S({ bpm: 120, chords: ['Am'], mel: 'A4:1 C5:1 E5:1 A5:9', lead: 'reed', stab: 0, hat: 0, bassStyle: 'hold', loop: false }),
  sting3: S({ bpm: 120, chords: ['Em'], mel: 'E5:1 G5:1 B5:1 E6:9', lead: 'mellow', stab: 0, hat: 0, bassStyle: 'hold', loop: false }),
  rain: S({ bpm: 66, chords: ['Am7', 'Dm7', 'G7', 'Cmaj7'], mel: 'E5:6 C5:3 A4:3 F5:6 D5:3 A4:3 G5:3 F5:3 D5:3 B4:3 E5:12', lead: 'reed', hat: 0.04, stab: 0.05, bassStyle: 'two', rain: true }),
  small: S({ bpm: 90, chords: ['F', 'C7', 'C7', 'F'], mel: 'A5:3 C5:3 C5:3 G5:3 C5:3 C5:3 Bb5:3 C5:3 C5:3 A5:9 .:3', lead: 'reed', hat: 0, stab: 0.05, bassStyle: 'two' }),
  debt: S({ bpm: 72, chords: ['G7', 'C7', 'G7', 'D7'], mel: 'D5:2 F5:1 G5:3 Bb5:2 G5:1 F5:3 E5:2 G5:1 Bb5:3 C6:2 Bb5:1 G5:3 D5:2 F5:1 G5:3 Bb5:2 G5:1 F5:3 F#5:2 A5:1 C6:3 D6:6', lead: 'reed', hat: 0.06, stab: 0.08 }),
  sea: S({ bpm: 76, chords: ['D', 'A', 'Bm7', 'G'], mel: 'F#5:9 A5:3 E5:9 C#5:3 D5:6 F#5:6 B4:9 .:3', lead: 'reed', hat: 0, stab: 0.06, arp: 0.06, bassStyle: 'two' }),
  goose: S({ bpm: 112, chords: ['C', 'C', 'F', 'G7'], mel: 'C6:1 .:2 C6:1 .:2 G5:3 E5:3 C6:1 .:2 C6:1 .:2 G5:3 E5:3 A5:2 C6:1 F6:3 C6:3 A5:3 G5:3 B5:3 D6:3 G6:3', lead: 'reed', hat: 0.08, stab: 0.1 }),
  bye: S({ bpm: 68, chords: ['Eb', 'Bb', 'Cm7', 'Ab', 'Eb', 'Bb7', 'Ab', 'Eb'], mel: 'G5:6 Eb5:6 F5:6 D5:6 G5:3 Bb5:3 C6:6 Ab5:9 .:3 G5:6 Eb5:6 D5:3 F5:3 Bb5:6 C6:6 Ab5:6 G5:12', lead: 'reed', hat: 0.04, stab: 0.06, bassStyle: 'two' }),
  round: S({ bpm: 128, chords: ['G', 'E7', 'Am7', 'D7'], mel: 'D5:2 G5:1 B5:3 D6:2 B5:1 G5:3 E5:2 G#5:1 B5:3 E6:2 B5:1 G#5:3 C5:2 E5:1 A5:3 C6:2 A5:1 E5:3 D5:2 F#5:1 A5:3 C6:2 A5:1 F#5:3', lead: 'bright', hatDens: 2 }),
  card: S({ bpm: 92, chords: ['G', 'C', 'Am7', 'D7'], mel: 'B5:6 G5:6 C6:6 E5:6 A5:6 C5:6 D5:3 F#5:3 A5:6', lead: 'soft', hat: 0.05, stab: 0.08 }),
};
export const allSongs = () => { const out = { ...SONGS }; for (let h = 0; h < 24; h++) for (const w of ['clear', 'rain', 'snow']) out[`h${h}-${w}`] = hourlySong(h, w); return out; };
