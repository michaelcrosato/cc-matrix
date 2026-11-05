/* 06-data-music: nine original songs and the jingles, in the engine's step notation, built from chord plans with a few
 * helpers (bass, arpeggio and comping lines from the chords; melodies written out). Instruments are named periodic waves
 * (engine patch 4): steel, marimba, pluck, bell, organ, pad. */
G.INSTRUMENTS = {
  steel: { real: [0, 0, 0, 0, 0, 0], imag: [0, 1, .5, .35, .2, .05] },
  marimba: { real: [0, 0, 0, 0, 0], imag: [0, 1, 0, 0, .3, 0] },
  pluck: { real: [0, 0, 0, 0, 0, 0, 0, 0], imag: [0, 1, .5, .33, .25, .2, .16, .12] },
  bell: { real: [0, 0, 0, 0, 0, 0, 0, 0, 0], imag: [0, 1, .3, .5, 0, .25, 0, 0, .15] },
  organ: { real: [0, 0, 0, 0, 0], imag: [0, 1, .7, .5, .35] },
  pad: { real: [0, 0, 0, 0, 0, 0], imag: [0, 1, .45, .25, .12, .06] }
};
const NOTE_I = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const NOTE_N = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
const nn = (i) => NOTE_N[((i % 12) + 12) % 12] + Math.floor(i / 12);
/** a chord's tones as note names from a root octave: 'Am' -> ['A3', 'C4', 'E4'] */
G.chordTones = (name, oct = 3) => {
  const m = /^([A-G][b#]?)(m7|maj7|m|7|sus4)?$/.exec(name), root = NOTE_I[m[1]] + 12 * oct, q = m[2] || '';
  const iv = q === 'm' ? [0, 3, 7] : q === '7' ? [0, 4, 7, 10] : q === 'm7' ? [0, 3, 7, 10] : q === 'maj7' ? [0, 4, 7, 11] : q === 'sus4' ? [0, 5, 7] : [0, 4, 7];
  return iv.map(i => nn(root + i));
};
const SEQ = {
  /** bass: per chord, a pattern of r (root), f (fifth), o (octave), . rest, - hold */
  bass(chords, per, pat, oct = 2) { let s = ''; for (const c of chords) { const t = G.chordTones(c, oct), r = t[0], f = t[2], o = nn(NOTE_I[r.replace(/\d/, '')] + 12 * (oct + 1)); for (let k = 0; k < per; k++) { const p = pat[k % pat.length]; s += (p === 'r' ? r : p === 'f' ? f : p === 'o' ? o : p) + ' '; } s += '| '; } return s; },
  /** an arpeggio through the chord tones in the order given (indices; . rests) */
  arp(chords, per, order, oct = 4) { let s = ''; for (const c of chords) { const t = G.chordTones(c, oct); for (let k = 0; k < per; k++) { const o = order[k % order.length]; s += (o === '.' ? '.' : o === '-' ? '-' : t[o % t.length]) + ' '; } s += '| '; } return s; },
  /** comping: one chord tone (i) on the given steps */
  comp(chords, per, steps, i, oct = 4) { let s = ''; for (const c of chords) { const t = G.chordTones(c, oct); for (let k = 0; k < per; k++) s += (steps.includes(k) ? t[i % t.length] : '.') + ' '; s += '| '; } return s; },
  rep: (s, n) => Array(n).fill(s).join(' | ')
};
G.SEQ = SEQ;
const prog = (...c) => c;
G.SONGS = {};
(() => {
  // SUNRISE (title, menu): bright tropical pop, 116, C. C G Am F, bridge Dm G
  const ch = prog('C', 'G', 'Am', 'F', 'C', 'G', 'Am', 'F', 'Dm', 'G', 'Em', 'Am', 'Dm', 'F', 'G', 'G');
  G.SONGS.sunrise = { bpm: 116, steps: 4, tracks: [
    { name: 'lead', wave: 'steel', vol: .12, decay: .5, notes:
      'E5 . G5 . A5 - G5 . | D5 . G5 . B5 - A5 G5 | C6 . B5 . A5 . E5 . | F5 - E5 . D5 . C5 . | E5 . G5 . A5 - G5 . | D5 . G5 . B5 . D6 . | C6 - B5 A5 B5 . C6 . | A5 - - - . . G5 . | ' +
      'F5 . A5 . D6 . C6 . | B5 . A5 . G5 . D5 . | E5 . G5 . B5 . A5 G5 | A5 - - - E5 . . . | F5 . A5 . C6 . A5 . | C6 . D6 . C6 . A5 . | G5 - - - A5 . B5 . | D6 - - - . . . . ' },
    { name: 'marimba', wave: 'marimba', vol: .1, decay: .35, notes: SEQ.arp(ch, 8, [0, 2, 1, 2, 0, 2, 1, 2], 4) },
    { name: 'pluck', wave: 'pluck', vol: .07, decay: .25, cutoff: 1800, notes: SEQ.comp(ch, 8, [2, 6], 1, 4) },
    { name: 'bass', wave: 'triangle', vol: .3, notes: SEQ.bass(ch, 8, ['r', '.', '.', 'r', '.', 'f', 'o', '.'], 2) },
    { name: 'drums', wave: 'drums', vol: .09, notes: 'k . h . s . h k | . k h . s . h h | k . h . s . h k | . k h . s h s s' }] };
  // ISLAND (map, Promenade): breezy ukulele, 100, F
  const ci = prog('F', 'Bb', 'C', 'F', 'Dm', 'Gm', 'C', 'C');
  G.SONGS.island = { bpm: 100, steps: 4, tracks: [
    { name: 'lead', wave: 'marimba', vol: .13, decay: .4, notes: 'A5 . C6 . A5 . F5 . | D6 . C6 . Bb5 . A5 . | G5 . A5 . Bb5 . G5 . | A5 - - - . . C5 . | D5 . F5 . A5 . D6 . | Bb5 . A5 . G5 . F5 . | E5 . G5 . C6 . Bb5 . | A5 . G5 . E5 . . . ' },
    { name: 'uke', wave: 'pluck', vol: .08, decay: .3, cutoff: 2200, notes: SEQ.arp(ci, 8, [0, 1, 2, 1, 2, 0, 1, 2], 4) },
    { name: 'bass', wave: 'triangle', vol: .28, notes: SEQ.bass(ci, 8, ['r', '.', '.', 'f', 'r', '.', 'o', '.'], 2) },
    { name: 'shaker', wave: 'drums', vol: .06, notes: 'k . h h . h h . | . . h h k h h . ' }] };
  // SPIKE (matches): driving synth-pop, 138, Am; drum layer 'rally' comes in on long rallies
  const cs = prog('Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G');
  G.SONGS.spike = { bpm: 138, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .06, notes: 'A4 . C5 . E5 . A5 . | G5 - F5 . E5 . C5 . | E5 . G5 . C6 . B5 . | G5 - - - D5 . E5 . | A5 . G5 . E5 . C5 . | F5 . E5 . C5 . A4 . | C5 . E5 . G5 . E5 . | D5 - - - B4 . D5 . ' },
    { name: 'arp', wave: 'pulse', vol: .05, notes: SEQ.arp(cs, 8, [0, 1, 2, 1, 0, 1, 2, 1], 4) },
    { name: 'bass', wave: 'saw', vol: .1, cutoff: 900, notes: SEQ.bass(cs, 8, ['r', 'r', 'o', 'r', 'r', 'r', 'o', 'f'], 2) },
    { name: 'beat', wave: 'drums', vol: .1, notes: 'k . h . s . h . | k . h k s . h . ' },
    { name: 'rally', wave: 'drums', vol: .1, on: false, notes: 'k h k h s h k h | k h k k s h s s ' }] };
  // HOUSE (the final): campy-dramatic, 150, Dm, key change up a step in the last 8 bars
  const ch1 = prog('Dm', 'Bb', 'C', 'A', 'Dm', 'Bb', 'C', 'A'), ch2 = prog('Em', 'C', 'D', 'B', 'Em', 'C', 'D', 'B');
  G.SONGS.house = { bpm: 150, steps: 4, tracks: [
    { name: 'lead', wave: 'pulse', vol: .07, notes:
      'D5 - - . F5 . A5 . | Bb5 - A5 . G5 . F5 . | E5 - G5 . C6 . Bb5 . | A5 - - - C#5 . E5 . | D5 . F5 . A5 . D6 . | D6 . C6 . Bb5 . G5 . | C6 . Bb5 . A5 . G5 . | A5 - - - - - . . | ' +
      'E5 - - . G5 . B5 . | C6 - B5 . A5 . G5 . | F#5 - A5 . D6 . C6 . | B5 - - - D#5 . F#5 . | E5 . G5 . B5 . E6 . | E6 . D6 . C6 . A5 . | D6 . C6 . B5 . A5 . | B5 - - - - - . . ' },
    { name: 'organ', wave: 'organ', vol: .05, notes: SEQ.comp(ch1, 8, [0, 3, 6], 0, 4) + SEQ.comp(ch2, 8, [0, 3, 6], 0, 4) },
    { name: 'bass', wave: 'saw', vol: .1, cutoff: 800, notes: SEQ.bass(ch1, 8, ['r', '.', 'r', 'o', 'r', '.', 'f', 'o'], 2) + SEQ.bass(ch2, 8, ['r', '.', 'r', 'o', 'r', '.', 'f', 'o'], 2) },
    { name: 'drums', wave: 'drums', vol: .11, notes: 'k . h k s . h . | k k h . s . t t ' }] };
  // LAGOON (pool, Pool Hop): bossa-nova, 112, G; rim clicks on the quarter notes (the hop beat)
  const cl = prog('G', 'Em', 'Am', 'D', 'G', 'Em', 'Am', 'D');
  G.SONGS.lagoon = { bpm: 112, steps: 4, tracks: [
    { name: 'lead', wave: 'steel', vol: .1, decay: .45, notes: 'B5 . . D6 . . B5 . | G5 . . B5 . . A5 . | C6 . . A5 . . E5 . | F#5 - - - . . A5 . | B5 . D6 . G6 . D6 . | B5 . G5 . E5 . G5 . | A5 . C6 . E6 . C6 . | D6 - - - . . . . ' },
    { name: 'comp', wave: 'pluck', vol: .07, decay: .22, cutoff: 1600, notes: SEQ.comp(cl, 8, [0, 3, 5], 1, 4) },
    { name: 'bass', wave: 'triangle', vol: .3, notes: SEQ.bass(cl, 8, ['r', '.', '.', 'f', 'o', '.', '.', 'f'], 2) },
    { name: 'rim', wave: 'drums', vol: .07, notes: 'c . h . c . h . | c . h . c . h c ' }] };
  // BOUTIQUE (shops, wardrobe): cute shopping funk, 108, Bb
  const cb = prog('Bb', 'Gm', 'Eb', 'F', 'Bb', 'Gm', 'Eb', 'F');
  G.SONGS.boutique = { bpm: 108, steps: 4, tracks: [
    { name: 'bells', wave: 'bell', vol: .08, decay: .6, notes: SEQ.arp(cb, 8, [0, 1, 2, 0, '.', 2, 1, '.'], 5) },
    { name: 'lead', wave: 'square', vol: .045, notes: 'D5 . F5 . . F5 G5 . | Bb5 . G5 . F5 . D5 . | Eb5 . G5 . Bb5 . G5 . | A5 - - . F5 . . . | D5 . F5 . Bb5 . D6 . | C6 . Bb5 . G5 . F5 . | G5 . F5 . Eb5 . C5 . | C5 - - - . . . . ' },
    { name: 'bass', wave: 'square', vol: .1, cutoff: 700, notes: SEQ.bass(cb, 8, ['r', '.', 'o', 'r', '.', 'r', 'o', '.'], 2) },
    { name: 'drums', wave: 'drums', vol: .08, notes: 'k . h k s . h . | k h . k s . h h ' }] };
  // NEON (casino): lounge funk, 96, Em vamp with a C B7 turnaround
  const cn = prog('Em7', 'A', 'Em7', 'A', 'Em7', 'A', 'C', 'B7');
  G.SONGS.neon = { bpm: 96, steps: 4, tracks: [
    { name: 'organ', wave: 'organ', vol: .05, notes: SEQ.comp(cn, 8, [2, 5], 1, 4) },
    { name: 'lead', wave: 'pulse', vol: .05, notes: 'B4 . D5 . E5 . . G5 | F#5 . E5 . C#5 . . . | B4 . D5 . E5 . G5 . | A5 - - - . . . . | B5 . A5 . G5 . E5 . | C#5 . E5 . A5 . . . | G5 . E5 . C5 . E5 . | D#5 - - - F#5 . . . ' },
    { name: 'bass', wave: 'triangle', vol: .3, notes: SEQ.bass(cn, 8, ['r', '.', '.', 'r', 'o', '.', 'f', '.'], 2) },
    { name: 'drums', wave: 'drums', vol: .08, notes: 'k . h . s . h h | k . h k s . h . ' },
    { name: 'sparkle', wave: 'bell', vol: .05, decay: .8, on: false, notes: 'E6 . B5 . G6 . E6 . | ' }] };
  // SIESTA (villa, night map): a gentle lullaby, 80, D
  const cd = prog('D', 'Bm', 'G', 'A', 'D', 'Bm', 'G', 'A');
  G.SONGS.siesta = { bpm: 80, steps: 4, tracks: [
    { name: 'pad', wave: 'pad', vol: .05, detune: 8, cutoff: 1200, notes: SEQ.comp(cd, 8, [0], 1, 4).replace(/ \. \. \. \. \. \. \. /g, ' - - - - - - - ') },
    { name: 'marimba', wave: 'marimba', vol: .11, decay: .5, notes: 'F#5 . A5 . D6 . A5 . | F#5 . D5 . B4 . D5 . | G5 . B5 . D6 . B5 . | A5 - - - E5 . . . | F#5 . A5 . D6 . F#6 . | D6 . B5 . F#5 . D5 . | B5 . G5 . D5 . G5 . | A5 - - - - - . . ' },
    { name: 'bass', wave: 'triangle', vol: .24, notes: SEQ.bass(cd, 8, ['r', '.', '.', '.', 'f', '.', '.', '.'], 2) }] };
  // FAREWELL (party, endings, credits): anthemic, 124, C then up to D
  const fa = prog('C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G'), fb = prog('D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A');
  G.SONGS.farewell = { bpm: 124, steps: 4, tracks: [
    { name: 'lead', wave: 'steel', vol: .11, decay: .55, notes:
      'G5 . E5 . G5 . C6 . | B5 - A5 . G5 . D5 . | E5 . A5 . C6 . B5 . | A5 - - - F5 . A5 . | G5 . C6 . E6 . D6 . | D6 . B5 . G5 . B5 . | C6 . A5 . F5 . A5 . | G5 - - - . . . . | ' +
      'A5 . F#5 . A5 . D6 . | C#6 - B5 . A5 . E5 . | F#5 . B5 . D6 . C#6 . | B5 - - - G5 . B5 . | A5 . D6 . F#6 . E6 . | E6 . C#6 . A5 . C#6 . | D6 . B5 . G5 . B5 . | A5 - - - - - . . ' },
    { name: 'harm', wave: 'square', vol: .04, notes: SEQ.arp(fa, 8, [2, '-', 1, '-', 2, '-', 1, '-'], 4) + SEQ.arp(fb, 8, [2, '-', 1, '-', 2, '-', 1, '-'], 4) },
    { name: 'bass', wave: 'triangle', vol: .3, notes: SEQ.bass(fa, 8, ['r', '.', 'r', '.', 'o', '.', 'f', '.'], 2) + SEQ.bass(fb, 8, ['r', '.', 'r', '.', 'o', '.', 'f', '.'], 2) },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . h . s . h k | k . h . s h s . ' }] };
  // jingles (stings)
  const J = (bpm, tracks) => ({ bpm, steps: 4, tracks });
  G.JINGLES = {
    win: J(140, [{ wave: 'steel', vol: .14, decay: .6, notes: 'C5 E5 G5 C6 - - E6 - G6 - - - - - - - ' }, { wave: 'triangle', vol: .3, notes: 'C3 . . . G3 . . . C4 - - - - - - - ' }, { wave: 'drums', vol: .1, notes: 'k . s . k . s s k . . . . . . . ' }]),
    lose: J(100, [{ wave: 'pulse', vol: .07, notes: 'G4 - F#4 - F4 - E4 - - - - - ' }, { wave: 'triangle', vol: .25, notes: 'C3 - - - B2 - - - Bb2 - - - ' }]),
    ace: J(160, [{ wave: 'bell', vol: .1, decay: .5, notes: 'G5 C6 E6 G6 - - ' }]),
    matchpoint: J(150, [{ wave: 'square', vol: .06, notes: 'A5 . A5 . E6 - - - ' }, { wave: 'drums', vol: .1, notes: 't t t t s . . . ' }]),
    gift_love: J(150, [{ wave: 'bell', vol: .1, decay: .5, notes: 'C6 E6 G6 C7 - - - - ' }]),
    gift_refuse: J(110, [{ wave: 'square', vol: .05, notes: 'E4 - Eb4 - D4 - - - ' }]),
    jackpot: J(170, [{ wave: 'steel', vol: .13, decay: .4, notes: 'C6 G5 C6 E6 G6 E6 G6 C7 - - - - C7 - - - ' }, { wave: 'drums', vol: .1, notes: 'k s k s k s k s k . k . k . . . ' }]),
    daystart: J(130, [{ wave: 'bell', vol: .1, decay: .7, notes: 'C6 G5 E6 - C7 - - - ' }]),
    levelup: J(150, [{ wave: 'marimba', vol: .12, decay: .3, notes: 'C5 E5 G5 C6 E6 G6 - - ' }]),
    photo: J(150, [{ wave: 'bell', vol: .08, decay: .4, notes: 'E6 C6 - - ' }])
  };
})();
