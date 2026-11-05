/* 06-data-music: the score. Nine original songs and the jingles, written as data for a small song builder: a chord per
 * bar, a lead melody (hand-written hooks, or grown from a rhythm motif over the chords: chord tones on the strong beats,
 * steps between, phrases that end home), arpeggios, chord stabs, a bass line and drum parts in named layers, so drums can
 * come and go (the match song's 'rally' layer). Instruments (engine patch 4): steel, marimba, pluck, bell, organ, pad. */
G.INSTRUMENTS = {
  steel: { partials: [[1, 1], [2, .5], [3, .35], [4, .2]] },
  marimba: { partials: [[1, 1], [4, .3], [10, .05]] },
  bell: { partials: [[1, 1], [3, .45], [5, .25], [9, .12]] },
  organ: { partials: [[1, 1], [2, .55], [3, .4], [4, .3]] }
};
const NOTE_N = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const ROOTS = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const nn = m => NOTE_N[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
const chordOf = sym => {
  const m = /^([A-G][#b]?)(m(?!aj))?(maj7|7|sus4|dim|6)?$/.exec(sym); if (!m) return { root: 0, tones: [0, 4, 7] };
  const root = ROOTS[m[1]], minor = !!m[2], ext = m[3];
  const tones = ext === 'sus4' ? [0, 5, 7] : ext === 'dim' ? [0, 3, 6] : [0, minor ? 3 : 4, 7];
  if (ext === '7') tones.push(10); if (ext === 'maj7') tones.push(11); if (ext === '6') tones.push(9);
  return { root, tones };
};
const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10];
const BASS = { pop: [0, null, 0, 7, 0, null, 7, null], bossa: [0, null, null, 7, null, 0, 7, null], walk: [0, null, 4, null, 7, null, 9, null], drive: [0, 0, 12, 0, 0, 12, 0, 7], slow: [0, null, null, null, 7, null, null, null], pump: [0, null, 12, null, 0, null, 12, null] };
const DRUMS = {
  pop: ['k . s . k k s .', 'h h h h h h h o'], bossa: ['k . . k k . . k', 'h . h h . h h .'], drive: ['k . s k k . s .', 'h h h h h h h h'],
  lounge: ['k . . . s . . k', 'h . h h h . h h'], lullaby: ['. . . . . . . .', 'h . . . h . . .'], march: ['k . s . k s s s', 'h h h h h h h h'], anthem: ['k . s . k k s k', 'h h o h h h o h']
};
const parse = s => s.trim().split(/\s+/).filter(t => t !== '|');
/** grow a melody over the chords: rhythm motifs 'x' (a note), '-' (held), '.' (rest), 8 steps a bar */
function growMelody(chords, o) {
  const r = E.rng(G.hashStr(o.seed || 'm')), scale = (o.minor ? MINOR : MAJOR).map(d => d + o.key), lo = o.lo || 72, hi = o.hi || 88;
  const pool = []; for (let m = lo; m <= hi; m++) if (scale.some(d => ((m - d) % 12 + 12) % 12 === 0)) pool.push(m);
  let cur = Math.floor(pool.length / 2), out = [], motifIv = null;
  chords.forEach((sym, b) => {
    const ch = chordOf(sym), ct = pool.map((m, i) => ch.tones.some(t => ((m - ch.root - t) % 12 + 12) % 12 === 0) ? i : -1).filter(i => i >= 0);
    const phrasePos = b % 4, rhythm = o.rhythm[(phrasePos === 3 ? 2 : phrasePos === 2 ? 1 : 0) % o.rhythm.length] || o.rhythm[0];
    const toks = [], idxs = []; let onset = 0;
    for (let s = 0; s < 8; s++) {
      const c = rhythm[s];
      if (c === '-') { toks.push('-'); continue; } if (c !== 'x') { toks.push('.'); continue; }
      const strong = s === 0 || s === 4, lastOn = phrasePos === 3 && rhythm.slice(s + 1).indexOf('x') < 0;
      if (lastOn) { const home = ct.filter(i => ((pool[i] - ch.root) % 12 + 12) % 12 === 0); cur = home.sort((a, c2) => Math.abs(a - cur) - Math.abs(c2 - cur))[0] ?? cur; }
      else if (phrasePos === 2 && motifIv && motifIv[onset] !== undefined) cur = clamp(cur + motifIv[onset], 0, pool.length - 1);
      else if (strong) { const near = ct.slice().sort((a, c2) => Math.abs(a - cur) - Math.abs(c2 - cur)); cur = near[r() < .7 ? 0 : Math.min(1, near.length - 1)] ?? cur; }
      else { const dir = phrasePos < 2 ? (r() < .65 ? 1 : -1) : (r() < .65 ? -1 : 1); cur = clamp(cur + dir * (r() < .8 ? 1 : 2), 0, pool.length - 1); }
      toks.push(nn(pool[cur])); idxs.push(cur); onset++;
    }
    if (phrasePos === 0) { motifIv = [undefined]; for (let k = 1; k < idxs.length; k++) motifIv[k] = idxs[k] - idxs[k - 1]; }   // bar 3 of a phrase echoes bar 1's shape
    out.push(toks.join(' '));
  });
  return out.join(' | ');
}
/** a song: { bpm, key, minor, chords: 'C G Am F | ...', lead, leadWave, rhythm, bass, drums, arp, stabs, pad, layers, up } */
function song(o) {
  const chords = parse(o.chords), up = o.up || 0, upFrom = o.upFrom === undefined ? chords.length : o.upFrom;
  const tr = (b, m) => m + (b >= upFrom ? up : 0);
  const tracks = [];
  const lead = o.lead ? o.lead : growMelody(chords.map((c, b) => b >= upFrom && up ? transposeSym(c, up) : c), { key: o.key, minor: o.minor, rhythm: o.rhythm, seed: o.id, lo: o.lo, hi: o.hi });
  tracks.push(Object.assign({ name: 'lead', wave: o.leadWave || 'steel', vol: o.leadVol || .13, notes: lead }, o.leadOpts || { decay: .5 }));
  if (o.harmony) tracks.push({ name: 'harmony', wave: 'square', vol: .045, notes: lead, octave: -1, gate: .7 });
  if (o.arp !== false) {
    const pat = o.arpPat || [0, 1, 2, 3, 2, 1, 0, 1];
    tracks.push({ name: 'arp', wave: o.arpWave || 'marimba', vol: o.arpVol || .09, decay: .35, notes: chords.map((c, b) => { const ch = chordOf(c), base = 60 + ch.root; return pat.map(k => k === null ? '.' : nn(tr(b, base + ((ch.tones.concat(ch.tones.map(t => t + 12)))[k] || 0)))).join(' '); }).join(' | ') });
  }
  if (o.stabs !== false) for (let v = 0; v < 3; v++) tracks.push({ name: 'stab' + v, wave: 'saw', filter: 'lowpass', cutoff: 1800, decay: .22, vol: .035, notes: chords.map((c, b) => { const ch = chordOf(c), n = nn(tr(b, 60 + ch.root + ch.tones[v % ch.tones.length])); return (o.stabPat || '. x . x . x . x').split(' ').map(t => t === 'x' ? n : '.').join(' '); }).join(' | ') });
  if (o.pad) for (let v = 0; v < 3; v++) tracks.push({ name: 'pad' + v, wave: 'saw', filter: 'lowpass', cutoff: 1100, detune: 8, vol: .03, notes: chords.map((c, b) => { const ch = chordOf(c); return nn(tr(b, 55 + ch.root + ch.tones[v % ch.tones.length])) + ' - - - - - - -'; }).join(' | ') });
  if (o.organ) tracks.push({ name: 'organ', wave: 'organ', vol: .07, gate: .5, notes: chords.map((c, b) => { const ch = chordOf(c), n = nn(tr(b, 60 + ch.root + ch.tones[1])); return (o.organPat || 'x . . x . . x .').split(' ').map(t => t === 'x' ? n : '.').join(' '); }).join(' | ') });
  const bp = BASS[o.bass || 'pop'];
  tracks.push({ name: 'bass', wave: o.bassWave || 'triangle', vol: o.bassVol || .3, notes: chords.map((c, b) => { const ch = chordOf(c), base = 36 + ch.root; return bp.map(k => k === null ? '.' : nn(tr(b, base + k))).join(' '); }).join(' | ') });
  const dr = DRUMS[o.drums || 'pop'];
  tracks.push({ name: 'drums', wave: 'drums', vol: o.drumVol || .12, notes: dr[0] });
  tracks.push({ name: 'hats', wave: 'drums', vol: (o.drumVol || .12) * .55, notes: dr[1] });
  for (const L of o.layers || []) tracks.push(Object.assign({ wave: 'drums', vol: .12, on: false }, L));
  return { bpm: o.bpm, steps: 2, tracks };
}
const transposeSym = (sym, n) => { const m = /^([A-G][#b]?)(.*)$/.exec(sym); return m ? NOTE_N[(ROOTS[m[1]] + n + 12) % 12] + m[2] : sym; };
const R = (motif, n = 3) => Array.from({ length: n }, (_, i) => motif[i % motif.length]);
// the title's hook, by hand: a bright tropical-pop line over C G Am F
const SUNRISE_LEAD = [
  'E5 - G5 - C6 - B5 A5', 'G5 - - - D5 - G5 -', 'A5 - G5 E5 C5 - E5 -', 'F5 - E5 D5 C5 - - -',
  'E5 - G5 - C6 - D6 C6', 'B5 - G5 - D5 - G5 -', 'A5 - C6 - E6 - D6 C6', 'C6 - - - . . G5 -',
  'F5 - A5 - D6 - C6 A5', 'G5 - - - B5 - D6 -', 'E6 - D6 C6 B5 - A5 -', 'G5 - - - - - G5 A5',
  'F5 - E5 - D5 - C5 D5', 'E5 - G5 - B5 - D6 -', 'C6 - B5 A5 G5 - E5 -', 'C5 - - - . . . .'].join(' | ');
const SPIKE_LEAD = [
  'A5 . A5 C6 . A5 G5 .', 'E5 - - . E5 F5 G5 .', 'C6 . C6 B5 . G5 E5 .', 'G5 - - . G5 A5 B5 .',
  'A5 . A5 C6 . E6 D6 .', 'C6 - A5 . A5 G5 F5 .', 'E5 . G5 . C6 . B5 .', 'A5 - - - . . E5 G5'].join(' | ');
G.SONGS = {
  sunrise: song({ id: 'sunrise', bpm: 116, key: 0, chords: 'C G Am F | C G Am F | C G Am F | C G Am F | Dm G C Am | Dm G C C', lead: SUNRISE_LEAD, leadWave: 'steel', drums: 'pop', bass: 'pop' }),
  island: song({ id: 'island', bpm: 100, key: 5, chords: 'F Bb C F | F Bb C F | Dm Gm C F | Dm Gm C C', rhythm: R(['x - x . x x - .', 'x . x x - . x .', 'x - - . x - - .']), leadWave: 'marimba', leadOpts: { decay: .35 }, arpWave: 'saw', arpVol: .03, drums: 'bossa', bass: 'bossa', lo: 65, hi: 81 }),
  spike: song({ id: 'spike', bpm: 138, key: 9, minor: true, chords: 'Am F C G | Am F C G', lead: SPIKE_LEAD, leadWave: 'square', leadVol: .07, leadOpts: { gate: .8 }, arpWave: 'pulse', arpVol: .04, stabs: false, bass: 'drive', bassWave: 'saw', bassVol: .1, drums: 'drive',
    layers: [{ name: 'rally', notes: 't . t t . t t .', vol: .1 }, { name: 'rally2', notes: 'h h h h h h h h', vol: .06 }] }),
  house: song({ id: 'house', bpm: 150, key: 2, minor: true, chords: 'Dm Bb C A | Dm Bb C A | Dm Bb C A | Dm Bb C A', up: 2, upFrom: 8, rhythm: R(['x . x x . x - .', 'x - - x . x x .', 'x . . x x . x -']), leadWave: 'pulse', leadVol: .08, leadOpts: { gate: .85 }, organ: true, stabs: false, arpVol: .05, bass: 'pump', bassWave: 'saw', bassVol: .1, drums: 'march', lo: 69, hi: 86 }),
  lagoon: song({ id: 'lagoon', bpm: 112, key: 7, chords: 'G Em Am D | G Em Am D | Cmaj7 Bm Am D | G Em Am D', rhythm: R(['x - . x - . x .', '. x - x . x - .', 'x - - - x . x .']), leadWave: 'steel', leadVol: .1, stabPat: 'x . . x . . x .', arp: false, bass: 'bossa', drums: 'bossa', lo: 67, hi: 83,
    layers: [{ name: 'rim', notes: 'h . h . h . h .', vol: .1, on: true }] }),
  boutique: song({ id: 'boutique', bpm: 108, key: 10, chords: 'Bb Gm Eb F | Bb Gm Eb F | Cm F Bb Gm | Eb F Bb Bb', rhythm: R(['x . x . x x - .', '. x . x x - . x', 'x - x . x . . .']), leadWave: 'bell', leadVol: .09, leadOpts: { decay: 1.2 }, arpWave: 'bell', arpVol: .04, bass: 'walk', bassWave: 'saw', bassVol: .1, drums: 'pop', lo: 70, hi: 86 }),
  neon: song({ id: 'neon', bpm: 96, key: 4, minor: true, chords: 'Em A Em A | Em A Em A | C B7 Em Em | C B7 Em A', rhythm: R(['x - . x . x - .', 'x . x - - . x .', '. x - x - . x .']), leadWave: 'organ', leadVol: .07, leadOpts: { gate: .7 }, organ: true, organPat: '. x . . . x . .', stabs: false, arpWave: 'bell', arpVol: .03, bass: 'walk', bassVol: .26, drums: 'lounge', lo: 64, hi: 79 }),
  siesta: song({ id: 'siesta', bpm: 80, key: 2, chords: 'D Bm G A | D Bm G A | G A D Bm | G A D D', rhythm: R(['x - - - x - x -', 'x - x - x - - -', 'x - - - - - . .']), leadWave: 'marimba', leadVol: .1, leadOpts: { decay: .6 }, pad: true, stabs: false, arpWave: 'marimba', arpVol: .05, arpPat: [0, null, 1, null, 2, null, 1, null], bass: 'slow', drums: 'lullaby', lo: 62, hi: 78 }),
  farewell: song({ id: 'farewell', bpm: 124, key: 0, chords: 'C G Am F | C G Am F | Dm G C Am | F G C C | C G Am F | C G Am F | Dm G C Am | F G C C', up: 2, upFrom: 16, rhythm: R(['x - x - x x - .', 'x - - x - x x -', 'x - x x - - x .']), leadWave: 'steel', harmony: true, drums: 'anthem', bass: 'pop', lo: 72, hi: 88,
    layers: [{ name: 'fire', notes: 'c . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . .', vol: .1, on: true }] })
};
const jingle = (bpm, lead, bass, o = {}) => ({ bpm, steps: 2, loop: false, tracks: [{ wave: o.wave || 'square', vol: o.vol || .11, notes: lead, gate: .9 }, { wave: 'triangle', vol: .26, notes: bass }].concat(o.drums ? [{ wave: 'drums', vol: .1, notes: o.drums }] : []) });
G.JINGLES = {
  win: jingle(150, 'C5 E5 G5 C6 - G5 C6 - | E6 - D6 - E6 - - - | . . . .', 'C3 . C3 . C3 - G2 - | C3 - G2 - C3 - - - | . . . .', { drums: 'k . s . k . s . | k k s . k . . .' }),
  lose: jingle(100, 'G4 - F4 - E4 - Eb4 - | D4 - - - - - . .', 'C3 - B2 - Bb2 - A2 - | Ab2 - - - - - . .', { wave: 'triangle' }),
  ace: jingle(160, 'G5 C6 E6 G6 - - . .', 'C3 . G3 . C4 - . .'),
  matchpoint: jingle(140, 'A5 . A5 . C6 . E6 - | - - . . . . . .', 'A2 . A2 . A2 . A2 - | - - . . . . . .', { drums: 'k k k k s s s s | c . . . . . . .' }),
  gift_love: jingle(160, 'E6 G6 C7 - - . . .', 'C4 E4 G4 - - . . .', { wave: 'triangle', vol: .12 }),
  gift_refuse: jingle(120, 'E5 - Eb5 - D5 - - .', 'C3 - B2 - Bb2 - - .', { wave: 'triangle' }),
  jackpot: jingle(180, 'C6 E6 G6 C7 G6 C7 E7 - | C7 - - - . . . .', 'C3 C3 G3 C4 G3 C4 C4 - | C3 - - - . . . .', { drums: 'k s k s k s k s | c . . . . . . .' }),
  daystart: jingle(130, 'G5 C6 E6 - - . . .', 'C3 - - - - . . .', { wave: 'triangle', vol: .13 }),
  levelup: jingle(170, 'C6 D6 E6 G6 C7 - . .', 'C3 . E3 . G3 - . .'),
  photo: jingle(170, 'E6 C6 G6 - . . . .', 'C4 . . . . . . .', { wave: 'triangle', vol: .12 })
};
