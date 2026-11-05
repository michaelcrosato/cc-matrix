// Songs as data (9.3), every theme original, and the music director: one song per scene, the boss theme, layers by
// intensity, ducking under radio lines, stings (FURY, PACK FURY, boss defeated, tally, game over).
(() => {
const E = My3D2dge, WP = globalThis.WP;
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'], FLAT = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
const midi = n => { const m = /^([A-G][#b]?)(-?\d)$/.exec(n); if (!m) return null; const nm = FLAT[m[1]] || m[1]; return NAMES.indexOf(nm) + 12 * (+m[2] + 1); };
const name = m => NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
const up = (n, s) => name(midi(n) + s);
// chords: 'Dm2' (root D2, minor), 'F2', 'C2', 'A2m' etc.: [root, third, fifth]
const chord = c => { const m = /^([A-G][#b]?)(m?)(-?\d)(m?)$/.exec(c), r = midi(m[1] + m[3]); return [r, r + (m[2] || m[4] ? 3 : 4), r + 7]; };
/** a bass line: per chord one bar of the pattern (r root, o octave, f fifth, t third, - hold, . rest) */
const bass = (chords, pat) => chords.map(c => { const [r, t, f] = chord(c); return pat.split(' ').map(x => x === 'r' ? name(r) : x === 'o' ? name(r + 12) : x === 'f' ? name(f) : x === 't' ? name(t) : x).join(' '); }).join(' | ');
/** an arpeggio: per chord one bar, up an octave or two (pattern of indexes 0 1 2 3=octave, . rest, - hold) */
const arp = (chords, pat, oct = 2) => chords.map(c => { const n = chord(c).map(x => x + 12 * oct); n.push(n[0] + 12); return pat.split(' ').map(x => /\d/.test(x) ? name(n[+x]) : x).join(' '); }).join(' | ');
/** a pad: whole-bar chord tones held (a single voice: the third of each chord) */
const pad = (chords, which = 1, oct = 2) => chords.map(c => [name(chord(c)[which] + 12 * oct), ...Array(15).fill('-')].join(' ')).join(' | ');
const rep = (s, n) => Array(n).fill(s).join(' | ');
const drums = (bars) => bars.join(' | ');
WP.Note = { midi, name, up };
const S = WP.SONGS = {};
// ---------- the title: the Wolfpack March (the howl motif opens it) ----------
const titleCh = ['A2m', 'F2', 'D2m', 'E2', 'A2m', 'F2', 'G2', 'E2'];
S.title = { bpm: 128, steps: 4, tracks: [
  { name: 'lead', wave: 'square', vol: .12, notes: 'A4 - - - E5 - - - A5 - - - - - G5 - | F5 - E5 - D5 - E5 - - - - - . . . . | A4 - - - E5 - - - A5 - - - C6 - B5 - | A5 - - - - - - - - - - - . . . . | C6 - - - B5 - A5 - G5 - - - E5 - - - | F5 - - - E5 - D5 - E5 - - - - - . . | A5 - G5 - F5 - E5 - D5 - C5 - B4 - G#4 - | A4 - - - - - - - - - - - . . . .' },
  { name: 'bass', wave: 'triangle', vol: .2, notes: bass(titleCh, 'r . r . r . o . r . r . f . o .') },
  { name: 'pad', wave: 'saw', vol: .035, notes: pad(titleCh, 1, 2) },
  { name: 'perc', wave: 'drums', vol: .22, notes: drums(['k . h . s . h . k k h . s . h h', 'k . h . s . h . k k h . s . s s', 'k . h . s . h . k k h . s . h h', 'k . h . s . k . k . s s s s s s']) }
] };
S.briefing = { bpm: 90, steps: 4, tracks: [
  { name: 'arp', wave: 'pulse', vol: .07, notes: arp(['A2m', 'F2', 'C2', 'G2', 'A2m', 'F2', 'D2m', 'E2'], '0 1 2 1 3 2 1 2 0 1 2 1 3 2 1 2', 2) },
  { name: 'bass', wave: 'triangle', vol: .18, notes: bass(['A2m', 'F2', 'C2', 'G2', 'A2m', 'F2', 'D2m', 'E2'], 'r - - - - - - - f - - - - - - -') },
  { name: 'radio', wave: 'drums', vol: .05, notes: drums(['h . . h . . h . . h . . h . h .']) }
] };
S.map = { bpm: 112, steps: 4, tracks: [
  { name: 'horn', wave: 'square', vol: .1, notes: 'A4 - - - E5 - - - A5 - - - - - - - | . . . . . . . . . . . . . . . . | G4 - - - D5 - - - G5 - - - - - - - | . . . . . . . . E5 - D5 - E5 - - -' },
  { name: 'bass', wave: 'triangle', vol: .16, notes: bass(['A2m', 'A2m', 'G2', 'E2'], 'r . . . r . . . r . . . f . r .') },
  { name: 'snare', wave: 'drums', vol: .2, notes: drums(['s . s s s . s . s s s . s . s s', 's . s s s . s . s s s s s s s s']) }
] };
// ---------- the six operations ----------
const op1Ch = ['D2m', 'D2m', 'A#1', 'C2', 'D2m', 'F2', 'C2', 'A1m'];
S.op1 = { bpm: 140, steps: 4, tracks: [
  { name: 'lead', wave: 'square', vol: .1, notes: 'D5 - - - A4 - D5 - F5 - - - E5 - D5 - | C5 - - - A4 - - - . . . . . . . . | A#4 - - - D5 - F5 - A#5 - - - A5 - G5 - | A5 - - - - - - - G5 - F5 - E5 - C5 - | D5 - - - F5 - A5 - D6 - - - C6 - A5 - | A#5 - - - A5 - G5 - A5 - - - . . . . | G5 - F5 - E5 - G5 - - - F5 - E5 - C5 - | D5 - - - - - - - . . . . . . . .' },
  { name: 'bass', wave: 'triangle', vol: .2, notes: bass(op1Ch, 'r r . r o . r . r r . f o . r .') },
  { name: 'arp', wave: 'pulse12', vol: .05, notes: arp(op1Ch, '0 . 1 . 2 . 1 . 0 . 1 . 2 . 3 .', 2) },
  { name: 'perc', wave: 'drums', vol: .22, notes: drums(['k . h k s . h . k k h . s . h h', 'k . h k s . h . k . h k s s s s']) }
] };
const op2Ch = ['E2m', 'E2m', 'C2', 'D2', 'E2m', 'G2', 'D2', 'B1m'];
S.op2 = { bpm: 132, steps: 4, tracks: [
  { name: 'lead', wave: 'pulse', vol: .09, notes: 'E5 - - - - - G5 - B5 - - - A5 - G5 - | E5 - - - - - - - . . . . D5 - E5 - | C5 - - - E5 - G5 - C6 - - - B5 - A5 - | B5 - - - - - - - A5 - - - F#5 - - - | E5 - G5 - B5 - E6 - - - D6 - B5 - | G5 - - - - - - - A5 - B5 - G5 - - - | F#5 - - - A5 - D6 - - - C6 - A5 - - | B5 - - - - - - - . . . . . . . .' },
  { name: 'bass', wave: 'triangle', vol: .2, notes: bass(op2Ch, 'r . . r . . r . o . . r . . f .') },
  { name: 'perc', wave: 'drums', vol: .24, notes: drums(['k . t . t . k t . t k . t t . .', 'k . t . t . k t . t k . o . o o']) }
] };
const op3Ch = ['G2m', 'D#2', 'F2', 'D2', 'G2m', 'C2m', 'D2', 'D2'];
S.op3 = { bpm: 150, steps: 4, tracks: [
  { name: 'lead', wave: 'square', vol: .1, notes: '. . G5 - . A#5 - . D6 - . C6 - A#5 - . | A5 - . G5 - . F5 - G5 - - - . . . . | . . D#5 - . G5 - . A#5 - . A5 - G5 - . | F5 - . D#5 - . D5 - D5 - - - . . . . | . . G5 - . A#5 - . D6 - . F6 - D#6 - . | D6 - . C6 - . A#5 - C6 - - - . . . . | . . A5 - . A#5 - . C6 - . A#5 - A5 - . | G5 - - - - - - - F#5 - - - D5 - - -' },
  { name: 'bass', wave: 'triangle', vol: .2, notes: bass(op3Ch, 'r . r o . r . f r . r o . f . r') },
  { name: 'arp', wave: 'pulse12', vol: .05, notes: arp(op3Ch, '. 0 . 1 . 2 . 1 . 0 . 1 . 2 . 3', 2) },
  { name: 'perc', wave: 'drums', vol: .22, notes: drums(['k . h s . h k . h s h . k s h h', 'k . h s . h k k h s h . s s s s']) }
] };
const op4Ch = ['C2m', 'C2m', 'G#1', 'A#1', 'C2m', 'D#2', 'G1', 'G1'];
S.op4 = { bpm: 146, steps: 4, tracks: [
  { name: 'lead', wave: 'saw', vol: .07, notes: 'C5 - . C5 - . D#5 - . G5 - - - F5 - D#5 - | D5 - - - C5 - - - . . . . . . . . | G#4 - . G#4 - . C5 - . D#5 - - - D5 - C5 - | A#4 - - - - - - - . . . . A#4 - C5 - | C5 - . D#5 - . G5 - . C6 - - - A#5 - G#5 - | G5 - - - D#5 - - - G5 - - - . . . . | F5 - D#5 - D5 - C5 - B4 - - - D5 - - - | G4 - - - - - - - . . . . . . . .' },
  { name: 'bass', wave: 'square', vol: .1, notes: bass(op4Ch, 'r r r . r r . r r r r . o . r r') },
  { name: 'perc', wave: 'drums', vol: .24, notes: drums(['k . c . s . k c k . c . s c c .', 'k . c . s . k c k k c . s s s s']) },
  { name: 'noise', wave: 'drums', vol: .08, notes: drums(['. . . . . . . . . . . . . . o .', '. . . . . . o . . . . . . . . .']) }
] };
const op5Ch = ['F#2m', 'F#2m', 'D2', 'E2', 'F#2m', 'A2', 'E2', 'C#2m'];
S.op5 = { bpm: 120, steps: 4, tracks: [
  { name: 'lead', wave: 'pulse', vol: .07, notes: 'F#5 - - - - - - - C#5 - - - - - - - | . . . . . . . . . . . . E5 - F#5 - | D5 - - - - - - - A4 - - - - - - - | . . . . . . . . . . . . G#4 - - - | F#5 - - - A5 - - - C#6 - - - - - - - | B5 - - - A5 - - - G#5 - - - - - - - | A5 - - - G#5 - - - E5 - - - C#5 - - - | F#5 - - - - - - - - - - - . . . .' },
  { name: 'bass', wave: 'triangle', vol: .18, notes: bass(op5Ch, 'r - - - - - - - r - - - . . . .') },
  { name: 'heart', wave: 'drums', vol: .22, notes: drums(['k . . k . . . . . . . . . . . .', 'k . . k . . . . . . . . h . . .']) }
] };
const op6Ch = ['A2m', 'A2m', 'F2', 'G2', 'A2m', 'C2', 'G2', 'E2'];
S.op6 = { bpm: 156, steps: 4, tracks: [
  { name: 'lead', wave: 'square', vol: .1, notes: 'A4 - - - E5 - - - A5 - - - G5 - E5 - | A5 - - - - - - - . . . . . . . . | F5 - - - A5 - C6 - - - B5 - A5 - G5 - | G5 - - - - - - - . . . . G5 - A5 - | A5 - G5 - E5 - A5 - - - C6 - B5 - A5 - | G5 - - - E5 - - - C5 - - - . . . . | B4 - D5 - G5 - B5 - - - A5 - G5 - | G#5 - - - - - - - E5 - - - . . . .' },
  { name: 'bass', wave: 'triangle', vol: .2, notes: bass(op6Ch, 'r . r r o . r . r . r r o . f .') },
  { name: 'arp', wave: 'pulse12', vol: .05, notes: arp(op6Ch, '0 1 2 3 2 1 0 1 2 3 2 1 0 1 2 1', 2) },
  { name: 'perc', wave: 'drums', vol: .23, notes: drums(['k . h k s . h k k . h k s . h h', 'k . h k s . h k k k s . s s s s']) }
] };
const op6bCh = ['C2', 'G2', 'A2m', 'F2', 'C2', 'G2', 'F2', 'G2'];
S.op6b = { bpm: 156, steps: 4, tracks: [
  { name: 'lead', wave: 'square', vol: .1, notes: 'C5 - - - G5 - - - C6 - - - B5 - G5 - | D6 - - - - - - - B5 - - - G5 - - - | A5 - - - C6 - E6 - - - D6 - C6 - B5 - | A5 - - - - - - - F5 - G5 - A5 - - - | C6 - - - B5 - G5 - E5 - - - G5 - C6 - | B5 - - - D6 - - - G5 - - - . . . . | A5 - G5 - F5 - A5 - C6 - - - D6 - E6 - | D6 - - - - - - - . . . . . . . .' },
  { name: 'bass', wave: 'triangle', vol: .2, notes: bass(op6bCh, 'r . r o r . f . r . r o r . f .') },
  { name: 'arp', wave: 'pulse12', vol: .05, notes: arp(op6bCh, '0 1 2 3 2 1 0 1 2 3 2 1 3 2 1 0', 2) },
  { name: 'perc', wave: 'drums', vol: .23, notes: drums(['k . h k s . h k k . h k s . h h', 'k . h k s . h k k k s . s s s s']) }
] };
S.boss = { bpm: 160, steps: 4, tracks: [
  { name: 'lead', wave: 'saw', vol: .07, notes: 'E5 - F5 - E5 - D#5 - E5 - - - . . . . | G5 - F#5 - F5 - E5 - D#5 - - - . . . . | E5 - F5 - E5 - D#5 - E5 - - - B5 - A#5 - | A5 - G#5 - G5 - F#5 - F5 - E5 - D#5 - D5 -' },
  { name: 'bass', wave: 'square', vol: .1, notes: rep('E2 E2 E3 E2 F2 E2 E3 E2 E2 E2 E3 E2 A#1 B1 E2 E2', 4) },
  { name: 'perc', wave: 'drums', vol: .25, notes: drums(['k k s k k k s k k k s k k s s s']) }
] };
S.ending = { bpm: 84, steps: 4, tracks: [
  { name: 'lead', wave: 'pulse', vol: .1, notes: 'A4 - - - - - - - E5 - - - - - - - | A5 - - - - - - - - - - - G#5 - - - | F#5 - - - E5 - - - C#5 - - - E5 - - - | A5 - - - - - - - - - - - - - - - | C#6 - - - B5 - - - A5 - - - E5 - - - | F#5 - - - - - - - E5 - - - - - - - | D5 - - - C#5 - - - B4 - - - E5 - - - | A4 - - - - - - - - - - - - - - -' },
  { name: 'bass', wave: 'triangle', vol: .18, notes: bass(['A2', 'A2', 'D2', 'A2', 'A2', 'D2', 'B1m', 'E2'], 'r - - - - - - - f - - - - - - -') },
  { name: 'pad', wave: 'saw', vol: .035, notes: pad(['A2', 'A2', 'D2', 'A2', 'A2', 'D2', 'B1m', 'E2'], 1, 2) }
] };
// jingles
S.tally = { bpm: 150, steps: 4, len: 32, tracks: [{ wave: 'square', vol: .12, notes: 'A4 - C5 - E5 - A5 - - - G5 - A5 - - - - - - - - - - - . . . . . . . .' }, { wave: 'triangle', vol: .18, notes: 'A2 - - - - - - - F2 - - - E2 - - - A2 - - - - - - - . . . . . . . .' }] };
S.gameover = { bpm: 90, steps: 4, len: 32, tracks: [{ wave: 'square', vol: .12, notes: 'E5 - - - D5 - - - C5 - - - B4 - - - A4 - - - - - - - - - - - . . . .' }, { wave: 'triangle', vol: .18, notes: 'A2 - - - - - - - E2 - - - - - - - A1 - - - - - - - - - - - . . . .' }] };
S.continue = { bpm: 120, steps: 4, tracks: [{ wave: 'pulse', vol: .08, notes: 'A4 . A4 . C5 . A4 . E5 . D5 . C5 . B4 .' }, { wave: 'triangle', vol: .16, notes: 'A2 . . . A2 . . . E2 . . . E2 . . .' }] };
S.stingFury = { bpm: 180, steps: 4, len: 16, tracks: [{ wave: 'square', vol: .12, notes: 'A5 C6 E6 A6 - - - - . . . . . . . .' }] };
S.stingBoss = { bpm: 140, steps: 4, len: 32, tracks: [{ wave: 'square', vol: .13, notes: 'C5 - E5 - G5 - C6 - - - G5 - C6 - - - - - - - - - - - . . . . . . . .' }, { wave: 'triangle', vol: .2, notes: 'C3 - - - G2 - - - C3 - - - - - - - - - - - - - - - . . . . . . . .' }] };
// ---------- the director ----------
const M = WP.Music = { cur: null, ducked: false };
M.play = (game, id, o = {}) => {
  if (!game || !game.audio || WP.headless) { M.cur = id; return; }
  if (M.cur === id && !o.restart) return;
  M.cur = id; const s = S[id]; if (!s) { game.audio.music(null); return; }
  game.audio.music(s, { fade: o.fade === undefined ? .6 : o.fade, loop: o.loop !== false });
};
M.stop = game => { M.cur = null; if (game && game.audio && !WP.headless) game.audio.music(null); };
M.sting = (game, id) => { if (game && game.audio && !WP.headless && S[id]) game.audio.sting(S[id], { at: 'now', duck: .35 }); };
M.duck = (game, on) => { if (M.ducked === on) return; M.ducked = on; if (game && game.audio && !WP.headless) game.audio.duck(on); };
})();
