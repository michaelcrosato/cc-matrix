/* Music, all original and all in code (PLAN §8.10): the 7 radio songs, the title, menu, results and credits themes,
 * and the jingles. Songs are engine song objects ({ bpm, steps, tracks }) played by the extended chip synth (E6:
 * chords, accents, plucks, detune, lowpass, Latin percussion). A small composer turns scale degrees, chord names and
 * bass patterns into the engine's step tokens, so every melody stays on its key's scale. */
(() => {
'use strict';
const OB = window.OB;
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const PC = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const nm = m => NAMES[m % 12] + (Math.floor(m / 12) - 1);
const midi = (name, oct) => 12 * (oct + 1) + PC[name];
const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], harm: [0, 2, 3, 5, 7, 8, 11], dorian: [0, 2, 3, 5, 7, 9, 10], mixo: [0, 2, 4, 5, 7, 9, 10] };
const CH = { maj: [0, 4, 7], m: [0, 3, 7], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], '7': [0, 4, 7, 10], '9': [0, 4, 10, 14], m9: [0, 3, 10, 14], '6': [0, 4, 7, 9], sus4: [0, 5, 7], '7sus4': [0, 5, 7, 10], dim: [0, 3, 6], add9: [0, 4, 7, 14] };

const M = OB.Music = {
  /** a melody from scale degrees: "1:2 3:2 5:4 .:2 6' 5,:3 b3" (degree, ' up an octave, , down one, b/# alter, :steps) */
  deg(str, key, oct, scale = 'major') {
    const root = midi(key, oct), sc = SCALES[scale], out = [];
    for (const tok of str.trim().split(/\s+/)) {
      if (tok === '|') continue;
      const [d, len] = tok.split(':'), n = +(len || 1);
      if (d === '.') { for (let i = 0; i < n; i++) out.push('.'); continue; }
      let s = d, alt = 0, o = 0;
      while (s[0] === 'b' || s[0] === '#') { alt += s[0] === 'b' ? -1 : 1; s = s.slice(1); }
      while (s.endsWith("'")) { o++; s = s.slice(0, -1); }
      while (s.endsWith(',')) { o--; s = s.slice(0, -1); }
      const acc = s.endsWith('!'); if (acc) s = s.slice(0, -1);
      const k = +s - 1, m = root + sc[((k % 7) + 7) % 7] + 12 * (Math.floor(k / 7) + o) + alt;
      out.push(nm(m) + (acc ? '!' : '')); for (let i = 1; i < n; i++) out.push('-');
    }
    return out.join(' ');
  },
  /** a chord's notes as one token: chord('D', 'maj7', 4) -> 'D4+F#4+A4+C#5' */
  chord(root, type, oct = 4) { const r = midi(root, oct); return CH[type].map(i => nm(r + i)).join('+'); },
  /** comping: prog [['D', 'maj7', bars], ...], rhythm a bar of 16 ('x' hit, '-' hold, '.' rest) or one per chord */
  comp(prog, rhythm, oct = 4) {
    const out = [];
    for (const [root, type, bars] of prog) for (let b = 0; b < (bars || 1); b++) for (const c of (Array.isArray(rhythm) ? rhythm[b % rhythm.length] : rhythm)) out.push(c === 'x' ? M.chord(root, type, oct) : c === '!' ? M.chord(root, type, oct) + '!' : c === '-' ? '-' : '.');
    return out.join(' ');
  },
  /** a bass line: pattern of 16 per bar: R root, 5 fifth, 8 octave, 3 third, 7 seventh (of the chord), - hold, . rest */
  bass(prog, pattern, oct = 2) {
    const out = [];
    for (const [root, type, bars] of prog) {
      const r = midi(root, oct), iv = CH[type], third = iv[1], sev = iv[3] !== undefined ? iv[3] : 10;
      for (let b = 0; b < (bars || 1); b++) for (const c of (Array.isArray(pattern) ? pattern[b % pattern.length] : pattern)) out.push(c === 'R' ? nm(r) : c === '5' ? nm(r + 7) : c === '8' ? nm(r + 12) : c === '3' ? nm(r + third) : c === '7' ? nm(r + sev) : c === '-' ? '-' : '.');
    }
    return out.join(' ');
  },
  /** an arpeggio over the progression: pattern of chord-tone indexes per step ('0' root, '1', '2', '3', '.' rest) */
  arp(prog, pattern, oct = 5) {
    const out = [];
    for (const [root, type, bars] of prog) { const r = midi(root, oct), iv = CH[type]; for (let b = 0; b < (bars || 1); b++) for (const c of pattern) out.push(c === '.' ? '.' : c === '-' ? '-' : nm(r + iv[+c % iv.length] + (+c >= iv.length ? 12 : 0))); }
    return out.join(' ');
  },
  rep: (s, n) => Array(n).fill(s).join(' | ')
};

/* ---- progressions ---- */
const P = {
  sunburst: [['D', 'maj7', 2], ['B', 'm7', 2], ['E', 'm7', 2], ['A', '7sus4', 1], ['A', '7', 1]],
  coastline: [['F', 'maj7', 2], ['E', 'm7', 2], ['D', 'm7', 2], ['G', 'm7', 1], ['C', '9', 1]],
  shuffle: [['Bb', '6', 2], ['G', '7', 2], ['C', 'm7', 2], ['F', '7', 2]],
  vespa: [['A', 'm', 2], ['F', 'maj', 2], ['G', 'maj', 2], ['E', '7', 2]],
  pastel: [['Ab', 'maj7', 2], ['G', 'm7', 2], ['F', 'm7', 2], ['Bb', '7sus4', 2]],
  lemon: [['G', '7', 2], ['C', '7', 2], ['G', '7', 2], ['D', '7', 1], ['C', '7', 1]],
  moon: [['C#', 'm9', 2], ['A', 'maj7', 2], ['E', 'maj', 2], ['B', 'maj', 2]],
  title: [['C', 'maj7', 2], ['A', 'm7', 2], ['F', 'maj7', 2], ['G', '7sus4', 1], ['G', '7', 1]],
  garden: [['F', 'maj7', 2], ['Bb', '9', 2], ['A', 'm7', 2], ['D', '7', 1], ['G', '9', 1]],
  results: [['E', 'm7', 2], ['A', '7', 2], ['D', 'maj7', 2], ['B', '7', 2]],
  lullaby: [['C', 'maj7', 2], ['E', 'm7', 2], ['F', 'maj7', 2], ['G', 'sus4', 1], ['G', 'maj', 1]]
};
const ANT = 'x..x..x...x..x..', SKANK = '..x...x...x...x.', STAB = 'x.....x...x.....', PAD = 'x---------------', TWO = 'x-------x-------';

OB.SONGS = {
  /* 1 • 88.6 PETAL FM • Sunburst Samba: Latin fusion, D major, 128. Steel-drum hook climbs a sixth and falls by step */
  sunburst: { name: 'Sunburst Samba', bpm: 128, steps: 4, tracks: [
    { name: 'drums', wave: 'drums', vol: .16, notes: 'k . z . p . z k k . z . p . z z | k . z . p . z k k . z . p m m m' },
    { name: 'perc', wave: 'drums', vol: .12, notes: 'g . g g . g . g g . g g . b . g' },
    { name: 'bass', wave: 'saw', vol: .2, lowpass: 700, decay: .18, notes: M.bass(P.sunburst, 'R..R..5.8..R.5..', 2) },
    { name: 'keys', wave: 'triangle', vol: .09, decay: .22, notes: M.comp(P.sunburst, ANT, 4) },
    { name: 'lead', wave: 'sine', vol: .16, decay: .35, notes: M.deg("5:2 . 3':3 . 2':2 1':2 7:2 6:3 | 5:6 . 3:2 5:2 6:2 .:3 | 6:2 . 4':3 . 3':2 2':2 1':2 7:3 | 6:8 .:8 | 5:2 . 3':3 . 2':2 1':2 7:2 6:3 | 5:4 6:2 7:2 1':4 2':4 | 3':3 2':3 1':2 7:2 6:2 5:3 . | 1':8 .:8", 'D', 4) },
    { name: 'brass', wave: 'saw', vol: .06, lowpass: 2200, detune: 9, notes: M.comp(P.sunburst, ['....x.x.........', '..........x-x...'], 4) },
    { name: 'sparkle', wave: 'pulse12', vol: .05, on: false, notes: M.arp(P.sunburst, '0213021302130213', 6) }] },
  /* 2 • 91.2 SUN FM • Coastline Crush: Balearic pop-funk, F major, 116 */
  coastline: { name: 'Coastline Crush', bpm: 116, steps: 4, tracks: [
    { name: 'drums', wave: 'drums', vol: .16, notes: 'k . h . k p h . k . h . k p h o' },
    { name: 'perc', wave: 'drums', vol: .08, notes: 'z z z z z z z z z z z z z z z z' },
    { name: 'bass', wave: 'triangle', vol: .3, notes: M.bass(P.coastline, 'R-.R..5.R-.8..7.', 2) },
    { name: 'gtr', wave: 'square', vol: .045, decay: .1, detune: 12, notes: M.comp(P.coastline, SKANK, 4) },
    { name: 'lead', wave: 'pulse', vol: .1, notes: M.deg("5:1 6:1 1':1 3':10 . 2':2 | 1':4 7:2 6:6 .:4 | 5:1 6:1 1':1 4':10 . 3':2 | 2':12 .:4 | 5:1 6:1 1':1 3':10 . 5':2 | 4':4 3':2 2':6 .:4 | 1':2 2':2 3':4 2':4 7:4 | 1':12 .:4", 'F', 4) },
    { name: 'pad', wave: 'saw', vol: .035, lowpass: 1200, detune: 14, attack: .3, notes: M.comp(P.coastline, PAD, 4) },
    { name: 'sparkle', wave: 'sine', vol: .06, on: false, decay: .2, notes: M.arp(P.coastline, '0.2.1.3.0.2.1.3.', 6) }] },
  /* 3 • 94.8 SHORE FM • Shuffle on the Shore: jazz shuffle, B flat, 110 (swing in threes: steps 3) */
  shuffle: { name: 'Shuffle on the Shore', bpm: 110, steps: 3, tracks: [
    { name: 'drums', wave: 'drums', vol: .14, notes: 'k . y s . y k . y s . y' },
    { name: 'bass', wave: 'triangle', vol: .3, notes: M.bass(P.shuffle, 'R..3..5..7..', 2) },
    { name: 'organ', wave: 'square', vol: .045, lowpass: 1800, notes: M.comp(P.shuffle, '..x..-..x..-', 4) },
    { name: 'sax', wave: 'saw', vol: .085, lowpass: 1600, vib: [5, .012], notes: M.deg("5:2 6:1 1':3 .:3 6:2 5:1 | 3:6 .:6 | 4:2 5:1 6:3 .:3 1':2 7:1 | 6:6 .:6 | 5:2 6:1 1':2 2':1 3':3 2':2 1':1 | 6:6 5:3 3:3 | 2:3 4:3 6:3 5:3 | 1':9 .:3", 'Bb', 4) },
    { name: 'sparkle', wave: 'pulse12', vol: .045, on: false, notes: M.arp(P.shuffle, '0.21.30.21.3', 6) }] },
  /* 4 • 99.1 VESPA FM • Vespa Vendetta: Eurobeat, A minor, 152 */
  vespa: { name: 'Vespa Vendetta', bpm: 152, steps: 4, tracks: [
    { name: 'drums', wave: 'drums', vol: .17, notes: 'k . o . k s o . k . o . k s o h' },
    { name: 'bass', wave: 'saw', vol: .14, lowpass: 900, notes: M.bass(P.vespa, '.8.8.8.8.8.8.8.8', 1) },
    { name: 'stab', wave: 'saw', vol: .05, detune: 15, lowpass: 3000, decay: .12, notes: M.comp(P.vespa, STAB, 4) },
    { name: 'arp', wave: 'pulse12', vol: .05, notes: M.arp(P.vespa, '0120012001200120', 5) },
    { name: 'lead', wave: 'square', vol: .085, notes: M.deg("5:2 5:2 6:2 5:2 3:4 1:4 | 7,:2 1:2 2:4 5,:8 | 3:2 3:2 4:2 3:2 1':4 7:4 | #7:16 | 5:2 5:2 6:2 5:2 3':4 2':4 | 1':2 7:2 6:4 5:8 | 4:2 5:2 6:4 7:4 5:4 | #7:8 1':8", 'A', 4, 'minor') },
    { name: 'sparkle', wave: 'sine', vol: .05, on: false, notes: M.arp(P.vespa, '2.1.0.2.1.0.2.1.', 6) }] },
  /* 5 • 103.5 PASTEL FM • Pastel Highway: city pop, E flat, 104 */
  pastel: { name: 'Pastel Highway', bpm: 104, steps: 4, tracks: [
    { name: 'drums', wave: 'drums', vol: .15, notes: 'k . h . p . h k . k h . p . h .' },
    { name: 'bass', wave: 'saw', vol: .17, lowpass: 800, decay: .15, notes: M.bass(P.pastel, 'R.R8..R.5.R8.7.5', 2) },
    { name: 'keys', wave: 'triangle', vol: .09, decay: .4, notes: M.comp(P.pastel, '..x...x.....x...', 4) },
    { name: 'sax', wave: 'saw', vol: .08, lowpass: 1700, vib: [5, .01], notes: M.deg("3':3 2':1 1':4 6:4 5:4 | 4:2 5:2 6:12 | 2':3 1':1 7:4 5:4 3:4 | 4:16 | 3':3 2':1 1':4 6:4 1':4 | 2':4 3':4 5':8 | 4':3 3':1 2':4 1':4 6:4 | 5:12 .:4", 'Eb', 4) },
    { name: 'pad', wave: 'saw', vol: .03, lowpass: 1100, detune: 12, attack: .4, notes: M.comp(P.pastel, TWO, 4) },
    { name: 'sparkle', wave: 'sine', vol: .05, on: false, decay: .25, notes: M.arp(P.pastel, '3.2.1.0.3.2.1.0.', 6) }] },
  /* 6 • 106.3 ZEST FM (unlock) • Lemon Drop Rush: acid jazz into breakbeat, G, 140 */
  lemon: { name: 'Lemon Drop Rush', bpm: 140, steps: 4, tracks: [
    { name: 'drums', wave: 'drums', vol: .17, notes: 'k . h . s . h k . k h . s . h s' },
    { name: 'bass', wave: 'saw', vol: .15, lowpass: 600, decay: .14, notes: M.bass(P.lemon, 'R.R.8.R.7.R.5.3.', 2) },
    { name: 'organ', wave: 'square', vol: .05, lowpass: 2000, notes: M.comp(P.lemon, 'x.x...x.x.......', 4) },
    { name: 'lead', wave: 'pulse', vol: .09, notes: M.deg("1':2 4:2 1':2 4:2 b7:4 5:4 | 1':2 4:2 b7:2 5:6 .:4 | 4':2 b7:2 4':2 b7:2 3':4 1':4 | b7:8 .:8", 'G', 4, 'mixo') },
    { name: 'sparkle', wave: 'sine', vol: .05, on: false, notes: M.arp(P.lemon, '0123012301230123', 6) }] },
  /* 7 • 108.8 MOON FM (unlock) • Moonflower: a night synth ballad, C sharp minor, 92 */
  moonflower: { name: 'Moonflower', bpm: 92, steps: 4, tracks: [
    { name: 'drums', wave: 'drums', vol: .13, notes: 'k . . . h . . . s . . . h . . k' },
    { name: 'bass', wave: 'sine', vol: .32, notes: M.bass(P.moon, 'R-------R---5---', 2) },
    { name: 'marimba', wave: 'sine', vol: .08, decay: .18, notes: M.arp(P.moon, '0123210301232103', 5) },
    { name: 'lead', wave: 'triangle', vol: .14, vib: [5, .015], notes: M.deg("5:8 4:4 3:4 | 1:12 .:4 | 3:8 4:4 5:4 | 6:12 .:4 | 5:8 7:4 1':4 | 3':8 2':8 | 1':4 7:4 6:4 5:4 | 5:16", 'C#', 4, 'minor') },
    { name: 'pad', wave: 'saw', vol: .035, lowpass: 900, detune: 14, attack: .6, notes: M.comp(P.moon, PAD, 4) },
    { name: 'sparkle', wave: 'pulse12', vol: .04, on: false, notes: M.arp(P.moon, '3.2.1.0.3.2.1.0.', 6) }] },
  /* title • OutBloom! a brass fanfare into a samba groove, C, 120 */
  title: { name: 'OutBloom!', bpm: 120, steps: 4, tracks: [
    { name: 'drums', wave: 'drums', vol: .15, notes: 'k . z . p . z k k . z . p . z z | k . z . p . z k k . z . p m m m' },
    { name: 'perc', wave: 'drums', vol: .1, notes: 'g . g . . g . g g . g . . b . .' },
    { name: 'bass', wave: 'saw', vol: .18, lowpass: 700, decay: .2, notes: M.bass(P.title, 'R..R..5.8..R.5..', 2) },
    { name: 'keys', wave: 'triangle', vol: .09, decay: .25, notes: M.comp(P.title, ANT, 4) },
    { name: 'brass', wave: 'saw', vol: .07, lowpass: 2600, detune: 10, notes: M.deg("5:2 . 5:1 1':4 7:2 6:2 5:4 | 3':6 2':2 1':8 | 4:2 . 4:1 6:4 5:2 4:2 3:4 | 2:6 5:2 5:8 | 5:2 . 5:1 1':4 7:2 6:2 5:4 | 3':4 4':4 5':8 | 4':2 3':2 2':2 1':2 7:4 2':4 | 1':12 .:4", 'C', 4) },
    { name: 'sparkle', wave: 'pulse12', vol: .04, on: false, notes: M.arp(P.title, '0213021302130213', 6) }] },
  /* menus, the Tour, the garden • Garden Party: bossa nova, F, 100 */
  garden: { name: 'Garden Party', bpm: 100, steps: 4, tracks: [
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . r . . r k . k . r . . r . .' },
    { name: 'perc', wave: 'drums', vol: .06, notes: 'z . z z z . z z z . z z z . z z' },
    { name: 'bass', wave: 'triangle', vol: .28, notes: M.bass(P.garden, 'R..5R..5R..5R..5', 2) },
    { name: 'gtr', wave: 'triangle', vol: .08, decay: .2, notes: M.comp(P.garden, 'x..x..x...x..x..', 4) },
    { name: 'lead', wave: 'sine', vol: .12, decay: .5, notes: M.deg("3:4 2:2 3:2 5:8 | 4:4 3:2 4:2 6:8 | 5:4 4:2 3:2 2:4 1:4 | 2:16 | 3:4 2:2 3:2 5:6 6:2 | 1':8 7:8 | 6:2 5:2 4:2 3:2 2:4 5,:4 | 1:16", 'F', 5) },
    { name: 'sparkle', wave: 'pulse12', vol: .04, on: false, notes: M.arp(P.garden, '0.2.1.3.', 6) }] },
  /* results • Petal Count: a light funk loop, D, 112 */
  results: { name: 'Petal Count', bpm: 112, steps: 4, tracks: [
    { name: 'drums', wave: 'drums', vol: .15, notes: 'k . h k p . h . k k h . p . h h' },
    { name: 'bass', wave: 'saw', vol: .16, lowpass: 700, decay: .14, notes: M.bass(P.results, 'R.8.R..R5.8.R.7.', 2) },
    { name: 'gtr', wave: 'square', vol: .04, decay: .08, notes: M.comp(P.results, '.x.x.x.x.x.x.x.x', 4) },
    { name: 'lead', wave: 'pulse', vol: .08, notes: M.deg("5:2 6:2 1':4 6:2 5:6 | 3:2 5:2 6:12 | 5:2 6:2 1':4 3':4 2':4 | 1':16", 'D', 4) },
    { name: 'sparkle', wave: 'sine', vol: .05, on: false, notes: M.arp(P.results, '0123', 6) }] },
  /* credits and Bloom endings • Last Light Lullaby, C, 84 */
  lullaby: { name: 'Last Light Lullaby', bpm: 84, steps: 4, tracks: [
    { name: 'bass', wave: 'sine', vol: .3, notes: M.bass(P.lullaby, 'R-------5-------', 2) },
    { name: 'keys', wave: 'triangle', vol: .08, decay: .6, notes: M.arp(P.lullaby, '0.1.2.3.2.1.0.1.', 4) },
    { name: 'lead', wave: 'sine', vol: .14, vib: [5, .012], notes: M.deg("3:8 5:4 6:4 | 5:12 .:4 | 4:8 6:4 1':4 | 7:12 .:4 | 3:8 5:4 6:4 | 1':8 2':8 | 1':4 7:4 6:4 5:4 | 1:16", 'C', 5) },
    { name: 'pad', wave: 'saw', vol: .03, lowpass: 900, detune: 12, attack: .8, notes: M.comp(P.lullaby, PAD, 4) },
    { name: 'drums', wave: 'drums', vol: .08, notes: 'k . . . . . . . y . . . . . . .' }] }
};
// jingles (played with audio.sting over the music)
OB.JINGLES = {
  start: { bpm: 140, steps: 4, tracks: [{ wave: 'saw', vol: .08, detune: 10, lowpass: 2600, notes: M.deg("1:2 3:2 5:2 1':6 5:2 1':4 .:14", 'C', 5) }, { wave: 'drums', vol: .14, notes: 'k . . . k . . . c . . . . . . .' }] },
  checkpoint: { bpm: 150, steps: 4, tracks: [{ wave: 'square', vol: .08, notes: M.deg("5:2 7:2 2':2 1':10", 'C', 5) }, { wave: 'triangle', vol: .2, notes: 'G3 - - - C3 - - - - - - - - - - -' }] },
  reqStart: { bpm: 160, steps: 3, tracks: [{ wave: 'pulse', vol: .08, notes: M.deg("1:1 3:1 5:1 1':3", 'D', 5) }] },
  reqWin: { bpm: 170, steps: 4, tracks: [{ wave: 'sine', vol: .14, notes: M.deg("1:1 3:1 5:1 1':1 3':1 5':3", 'C', 5) }, { wave: 'triangle', vol: .08, notes: M.deg("1:1 3:1 5:1 1':1 3':1 5':3", 'C', 4) }] },
  reqFail: { bpm: 90, steps: 4, tracks: [{ wave: 'saw', vol: .08, lowpass: 900, vib: [6, .03], notes: M.deg("5:2 4:2 3:2 b3:6", 'C', 3) }] },
  fork: { bpm: 200, steps: 4, tracks: [{ wave: 'square', vol: .06, notes: 'E6 . B5 . E6 . . .' }] },
  bloom: { bpm: 180, steps: 4, tracks: [{ wave: 'sine', vol: .1, notes: M.deg("1:1 3:1 5:1 7:1 2':1 4':1 6':1 1'':4", 'C', 5) }] },
  goal: { bpm: 132, steps: 4, tracks: [{ wave: 'saw', vol: .08, detune: 10, lowpass: 2800, notes: M.deg("5:2 5:1 5:1 1':4 3':2 2':2 1':4 | 4:2 4:1 4:1 6:4 1':2 7:2 5:4 | 5:2 5:1 5:1 1':4 3':2 5':2 4':4 | 3':4 2':4 1':8", 'C', 4) },
    { wave: 'triangle', vol: .22, notes: M.bass([['C', 'maj', 1], ['F', 'maj', 1], ['C', 'maj', 1], ['G', '7', 1]], 'R...5...R...5...', 2) }, { wave: 'drums', vol: .15, notes: 'k . s . k k s . k . s . k k s c' }] },
  record: { bpm: 160, steps: 4, tracks: [{ wave: 'square', vol: .07, notes: M.deg("1:1 5:1 1':1 5:1 1':1 3':1 5':4", 'G', 4) }] },
  unlock: { bpm: 140, steps: 4, tracks: [{ wave: 'sine', vol: .12, notes: M.deg("5:1 1':1 3':1 5':1 3':1 5':1 1'':6", 'F', 4) }] },
  gameover: { name: 'Sunset Blues', bpm: 76, steps: 4, tracks: [{ wave: 'saw', vol: .07, lowpass: 1200, vib: [5, .015], notes: M.deg("5:4 b7:4 1':4 b3':2 1':2 | b7:4 5:4 b5:4 4:4 | 1:16", 'A', 4) }, { wave: 'triangle', vol: .24, notes: M.bass([['A', '7', 1], ['D', '7', 1], ['A', '7', 1]], 'R..3..5.....5..3', 2) }] }
};
})();
