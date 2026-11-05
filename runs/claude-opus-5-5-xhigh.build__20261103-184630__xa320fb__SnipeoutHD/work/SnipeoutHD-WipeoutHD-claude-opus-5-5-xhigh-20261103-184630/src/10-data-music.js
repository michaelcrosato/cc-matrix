// SNIPEOUT HD: the soundtrack, composed in code. Six original songs by fictional artists for the engine's tracker (with
// the synth extensions: filter envelopes, unison, pan, accents, claps, sub booms, sidechain), each with A and B sections
// and a breakdown, in named layers the music director brings in and out; and the stings. A small composer turns
// chord progressions and patterns into the tracker's tokens.
(() => {
const SN = globalThis.SN;
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const nm = n => { const m = /^([A-G])(#|b)?(-?\d)$/.exec(n); return NAMES.indexOf(m[1]) + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12; };
const tok = midi => NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
/** chords: 'Am' 'F' 'C' 'G' 'Em' 'Bb' ... -> [root midi (octave 2), third, fifth, seventh] */
const CH = c => { const m = /^([A-G][#b]?)(m?)(7?)$/.exec(c), r = nm(m[1] + '2'); return [r, r + (m[2] ? 3 : 4), r + 7, r + (m[2] ? 10 : 11)]; };
/** one bar of 16 steps from a pattern: digits pick a chord tone (0 root, 1 third, 2 fifth, 3 seventh, + an octave per
 *  ', ' a letter in A-D the same an octave up), '-' holds, '.' rests; a '!' after a digit accents it */
function bar(pattern, chord, oct = 0) {
  const ct = CH(chord), out = [];
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '!') { out[out.length - 1] += '!'; continue; }
    if (c === '-' || c === '.') { out.push(c); continue; }
    const up = c >= 'A' && c <= 'D', k = up ? c.charCodeAt(0) - 65 : +c;
    out.push(tok(ct[k] + 12 * oct + (up ? 12 : 0)));
  }
  return out.join(' ');
}
const prog = (pattern, chords, oct) => chords.map(c => bar(pattern, c, oct)).join(' | ');
const rep = (s, n) => Array(n).fill(s).join(' | ');
const drums = (bars) => bars.join(' | ');
/** a melody line: [[note, steps], ...] -> tokens */
const mel = list => list.map(([n, d]) => [n === '.' ? '.' : n].concat(Array(d - 1).fill(n === '.' ? '.' : '-'))).flat().join(' ');

const S = SN.SONGS = {};
// ---- ZERO CROSSING by HALCYON DRIFT: the menus. 112 bpm, D minor: airy pads, a soft arpeggio, a broken beat ----
{ const A = ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A'], B = ['Gm', 'Dm', 'Bb', 'F', 'Gm', 'Dm', 'Bb', 'C'];
  S.zero = { title: 'ZERO CROSSING', artist: 'HALCYON DRIFT', bpm: 112, steps: 4, tracks: [
    { name: 'kick', wave: 'drums', vol: .14, notes: drums([...Array(8).fill('k . . . . . . . . . k . . . . .'), ...Array(8).fill('k . . . . . k . . . . . . . . .')]) },
    { name: 'hats', wave: 'drums', vol: .06, notes: rep('. . h . . . h . . . h . . h h .', 16) },
    { name: 'snare', wave: 'drums', vol: .1, notes: rep('. . . . s . . . . . . . s . . .', 16) },
    { name: 'pad', wave: 'saw', vol: .045, uni: 3, det: 12, lp: { f: 900, q: 1 }, pan: -.3, notes: prog('1---------------', [...A, ...B], 2) },
    { name: 'pad2', wave: 'saw', vol: .04, uni: 3, det: 10, lp: { f: 900, q: 1 }, pan: .3, notes: prog('2---------------', [...A, ...B], 2) },
    { name: 'bass', wave: 'triangle', vol: .2, notes: prog('0-----.0--------', [...A, ...B], 0) },
    { name: 'arp', wave: 'pulse', vol: .05, lp: { f: 2200, q: 2, env: 1200, dec: .1 }, pan: .2, notes: prog('0.1.2.B.2.1.0.1.', [...A, ...B], 2) },
    { name: 'lead', wave: 'triangle', vol: .08, on: true, notes: mel([['A4', 6], ['F4', 2], ['G4', 4], ['A4', 4], ['D5', 8], ['C5', 8], ['A4', 6], ['G4', 2], ['F4', 4], ['E4', 4], ['D4', 16],
      ['.', 16], ['.', 16], ['.', 16], ['.', 16], ['Bb4', 6], ['A4', 2], ['G4', 8], ['F4', 8], ['A4', 8], ['D5', 6], ['C5', 2], ['Bb4', 8], ['A4', 16], ['.', 16], ['.', 16], ['.', 16], ['.', 16], ['.', 16], ['.', 16], ['.', 16]]) }
  ] }; }
// ---- RIVIERA BURN by SOLSTICE 9: Port Solenne. 128 bpm, A minor: sunny electro-house, four on the floor ----
{ const A = ['Am', 'F', 'C', 'G'], B = ['F', 'G', 'Em', 'Am'], D = ['F', 'F', 'G', 'G'];
  const ch = [...A, ...A, ...B, ...B, ...D, ...A, ...A, ...B];
  S.solenne = { title: 'RIVIERA BURN', artist: 'SOLSTICE 9', bpm: 128, steps: 4, tracks: [
    { name: 'kick', wave: 'drums', vol: .22, duck: .35, notes: drums([...Array(16).fill('k . . . k . . . k . . . k . . .'), ...Array(4).fill('. . . . . . . . . . . . . . . .'), ...Array(12).fill('k . . . k . . . k . . . k . k .')]) },
    { name: 'hats', wave: 'drums', vol: .1, notes: drums([...Array(16).fill('. . o . . . o . . . o . . . o h'), ...Array(4).fill('h . h . h . h . h h h h h h h h'), ...Array(12).fill('. . o . . . o . . . o . . h o h')]) },
    { name: 'clap', wave: 'drums', vol: .14, notes: drums([...Array(16).fill('. . . . p . . . . . . . p . . .'), ...Array(3).fill('. . . . . . . . . . . . . . . .'), 'p . p . p . p . p p p p p p p p', ...Array(12).fill('. . . . p . . . . . . . p . p .')]) },
    { name: 'bass', wave: 'saw', vol: .15, lp: { f: 300, q: 9, env: 1800, dec: .12 }, notes: prog('0.A.0A.0.A.03.A!.', ch, 0).replace(/\s+/g, ' ') },
    { name: 'pad', wave: 'saw', vol: .045, uni: 3, det: 14, lp: { f: 1400, q: 1 }, pan: -.25, notes: prog('1---------------', ch, 2) },
    { name: 'pad2', wave: 'saw', vol: .04, uni: 3, det: 14, lp: { f: 1400, q: 1 }, pan: .25, notes: prog('2---------------', ch, 2) },
    { name: 'arp', wave: 'pulse', vol: .05, lp: { f: 1800, q: 4, env: 2400, dec: .08 }, pan: .3, notes: prog('B.2.1.B.2.1.B.2.', ch, 2) },
    { name: 'lead', wave: 'pulse', vol: .07, on: false, lp: { f: 3000, q: 2, env: 2000, dec: .15 }, notes: [
      mel([['E5', 2], ['.', 2], ['C5', 2], ['.', 2], ['A4', 2], ['.', 2], ['C5', 2], ['E5', 2]]), mel([['.', 2], ['G5', 2], ['.', 2], ['E5', 2], ['.', 2], ['C5', 4], ['.', 2]]),
      mel([['F5', 2], ['.', 2], ['C5', 2], ['.', 2], ['A4', 2], ['.', 2], ['C5', 2], ['F5', 2]]), mel([['.', 2], ['A5', 2], ['.', 2], ['F5', 2], ['.', 2], ['E5', 4], ['.', 2]])].join(' | ').repeat(1) + ' | ' +
      Array(28).fill('.').map((_, k) => mel(k % 4 === 0 ? [['A5', 4], ['G5', 4], ['E5', 4], ['C5', 4]] : k % 4 === 1 ? [['D5', 6], ['E5', 2], ['G5', 8]] : k % 4 === 2 ? [['E5', 4], ['D5', 4], ['C5', 4], ['B4', 4]] : [['A4', 12], ['.', 4]])).join(' | ') }
  ] }; }
// ---- SANDGLASS by DUNE//CODE: Karakum Spire. 140 bpm, E Phrygian: big beat, breakbeat drums, an acid bass ----
{ const A = ['Em', 'F', 'Em', 'D'], B = ['C', 'D', 'Em', 'Em'], ch = [...A, ...A, ...B, ...A, ...A, ...B, ...A, ...B];
  S.karakum = { title: 'SANDGLASS', artist: 'DUNE//CODE', bpm: 140, steps: 4, tracks: [
    { name: 'kick', wave: 'drums', vol: .2, notes: rep('k . . . . . k . . . k . . . . .', 16) + ' | ' + rep('k . . k . . k . . . k . . k . .', 16) },
    { name: 'snare', wave: 'drums', vol: .15, notes: rep('. . . . s . . . . . . . s . . s', 16) + ' | ' + rep('. . . . s . . s . s . . s . . .', 16) },
    { name: 'hats', wave: 'drums', vol: .08, notes: rep('h h o h h h o h h h o h h h o h', 32) },
    { name: 'bass', wave: 'saw', vol: .14, lp: { f: 220, q: 14, env: 2600, dec: .1 }, notes: prog('00A.00!A.00A.0A!.0', ch, 0).split(' ').slice(0).join(' ').replace(/(\S+ ){16}/g, m => m) },
    { name: 'pad', wave: 'square', vol: .03, uni: 2, det: 8, lp: { f: 1000, q: 1 }, pan: -.2, notes: prog('0-------2-------', ch, 2) },
    { name: 'stab', wave: 'saw', vol: .05, lp: { f: 2400, q: 3, env: 1600, dec: .06 }, pan: .25, notes: prog('....1!...........', ch, 2).replace(/(\S+ ?){17}/g, m => m) },
    { name: 'lead', wave: 'pulse', vol: .07, on: false, notes: Array(32).fill(0).map((_, k) => k % 2 === 0 ? mel([['E5', 3], ['F5', 1], ['E5', 2], ['D5', 2], ['E5', 4], ['.', 4]]) : mel([['.', 8], ['B4', 2], ['C5', 2], ['B4', 2], ['G4', 2]])).join(' | ') }
  ] };
  // keep each bar at 16 steps (the composer's patterns above have 17 characters for the accent marks)
  for (const t of S.karakum.tracks) t.notes = t.notes.split(/\s*\|\s*/).map(b => { const k = b.trim().split(/\s+/); return k.slice(0, 16).concat(Array(Math.max(0, 16 - k.length)).fill('.')).join(' '); }).join(' | ');
}
// ---- STACKLINE by NULLPOINT: Meridian Stack. 172 bpm (half-time feel), F minor: drum'n'bass, a reese bass, stabs ----
{ const ch = ['Fm', 'Db', 'Ab', 'Eb', 'Fm', 'Db', 'Bbm', 'C', 'Fm', 'Db', 'Ab', 'Eb', 'Fm', 'Db', 'Bbm', 'C'];
  S.meridian = { title: 'STACKLINE', artist: 'NULLPOINT', bpm: 172, steps: 4, tracks: [
    { name: 'kick', wave: 'drums', vol: .2, notes: rep('k . . . . . . . . . k . . . . .', 16) + ' | ' + rep('k . . . . . . . . k k . . . . .', 16) },
    { name: 'snare', wave: 'drums', vol: .16, notes: rep('. . . . s . . . . . . . s . . .', 16) + ' | ' + rep('. . . . s . . s . . . . s . . .', 16) },
    { name: 'hats', wave: 'drums', vol: .07, notes: rep('h . h h h . h . h . h h h . h h', 32) },
    { name: 'bass', wave: 'saw', vol: .1, uni: 3, det: 18, lp: { f: 420, q: 3 }, notes: prog('0-------0---0.0-', [...ch, ...ch], 0) },
    { name: 'sub', wave: 'sine', vol: .18, notes: prog('0-------0---0.0-', [...ch, ...ch], -1) },
    { name: 'pad', wave: 'saw', vol: .035, uni: 3, det: 12, lp: { f: 1100, q: 1 }, pan: -.3, notes: prog('1---------------', [...ch, ...ch], 2) },
    { name: 'stab', wave: 'square', vol: .04, lp: { f: 2600, q: 2, env: 1800, dec: .05 }, pan: .3, notes: prog('..2!.....2!..1.....', [...ch, ...ch], 2) },
    { name: 'lead', wave: 'saw', vol: .05, on: false, lp: { f: 2800, q: 2 }, notes: Array(32).fill(0).map((_, k) => mel(k % 4 === 0 ? [['C5', 6], ['Ab4', 2], ['F4', 8]] : k % 4 === 1 ? [['Db5', 6], ['C5', 2], ['Ab4', 8]] : k % 4 === 2 ? [['Eb5', 4], ['Db5', 4], ['C5', 4], ['Bb4', 4]] : [['C5', 12], ['.', 4]])).join(' | ') }
  ] };
  for (const t of S.meridian.tracks) t.notes = t.notes.split(/\s*\|\s*/).map(b => { const k = b.trim().split(/\s+/); return k.slice(0, 16).concat(Array(Math.max(0, 16 - k.length)).fill('.')).join(' '); }).join(' | ');
}
// ---- POLAR VECTOR by AURORA SYSTEMS: Borealis Vault. 136 bpm, B minor: trance, a rolling bass, a supersaw lead ----
{ const A = ['Bm', 'G', 'D', 'A'], B = ['Em', 'G', 'D', 'F#'], ch = [...A, ...A, ...B, ...A, ...A, ...A, ...B, ...B];
  S.borealis = { title: 'POLAR VECTOR', artist: 'AURORA SYSTEMS', bpm: 136, steps: 4, tracks: [
    { name: 'kick', wave: 'drums', vol: .22, duck: .3, notes: drums([...Array(12).fill('k . . . k . . . k . . . k . . .'), ...Array(4).fill('. . . . . . . . . . . . . . . .'), ...Array(16).fill('k . . . k . . . k . . . k . . .')]) },
    { name: 'hats', wave: 'drums', vol: .09, notes: rep('. . o . . . o . . . o . . . o .', 32) },
    { name: 'clap', wave: 'drums', vol: .12, notes: drums([...Array(12).fill('. . . . p . . . . . . . p . . .'), '. . . . . . . . . . . . . . . .', '. . . . . . . . . . . . . . . .', '. . . . . . . . . . . . . . . .', 'c . . . . . . . s . s . s s s s', ...Array(16).fill('. . . . p . . . . . . . p . . .')]) },
    { name: 'bass', wave: 'saw', vol: .12, lp: { f: 500, q: 4, env: 900, dec: .08 }, notes: prog('.000.000.000.000', ch, 0) },
    { name: 'pad', wave: 'saw', vol: .04, uni: 4, det: 16, lp: { f: 1600, q: 1 }, pan: -.3, notes: prog('0---------------', ch, 2) },
    { name: 'pad2', wave: 'saw', vol: .04, uni: 4, det: 16, lp: { f: 1600, q: 1 }, pan: .3, notes: prog('1---------------', ch, 2) },
    { name: 'arp', wave: 'pulse', vol: .045, lp: { f: 2000, q: 3, env: 1600, dec: .07 }, notes: prog('0B210B210B210B21', ch, 2) },
    { name: 'riser', wave: 'saw', vol: .03, notes: Array(4).fill(0).map(() => [rep('. . . . . . . . . . . . . . . .', 7), mel([['B3', 2], ['D4', 2], ['F#4', 2], ['B4', 2], ['D5', 2], ['F#5', 2], ['B5', 4]])].join(' | ')).join(' | ') },
    { name: 'lead', wave: 'saw', vol: .055, on: false, uni: 5, det: 20, lp: { f: 3200, q: 1 }, notes: Array(32).fill(0).map((_, k) => mel(k % 4 === 0 ? [['F#5', 4], ['D5', 4], ['B4', 4], ['D5', 4]] : k % 4 === 1 ? [['E5', 4], ['D5', 4], ['C#5', 8]] : k % 4 === 2 ? [['D5', 4], ['B4', 4], ['A4', 4], ['B4', 4]] : [['F#5', 12], ['E5', 4]])).join(' | ') }
  ] }; }
// ---- CLOCK SKEW by THE AUTHORITY: Overclock. 120 bpm rising to 176: minimal techno, a layer per two zones ----
{ const ch = ['Cm', 'Cm', 'Cm', 'Cm', 'Ab', 'Ab', 'Bb', 'Bb', 'Cm', 'Cm', 'Cm', 'Cm', 'Ab', 'Ab', 'G', 'G'];
  S.overclock = { title: 'CLOCK SKEW', artist: 'THE AUTHORITY', bpm: 120, steps: 4, tracks: [
    { name: 'kick', wave: 'drums', vol: .22, notes: rep('k . . . k . . . k . . . k . . .', 16) },
    { name: 'hats', wave: 'drums', vol: .08, on: false, notes: rep('. . h . . . h . . . h . . . h h', 16) },
    { name: 'clap', wave: 'drums', vol: .12, on: false, notes: rep('. . . . p . . . . . . . p . . .', 16) },
    { name: 'bass', wave: 'square', vol: .1, lp: { f: 260, q: 10, env: 1400, dec: .09 }, notes: prog('0.0.0.0A0.0.0.0A', ch, 0) },
    { name: 'perc', wave: 'drums', vol: .08, on: false, notes: rep('. t . . . . t . . t . . . . . t', 16) },
    { name: 'stab', wave: 'saw', vol: .04, on: false, lp: { f: 1800, q: 6, env: 2400, dec: .05 }, notes: prog('...2!...2!...2!.1.', ch, 2) },
    { name: 'boom', wave: 'drums', vol: .12, on: false, notes: rep('b . . . . . . . . . . . . . . .', 16) },
    { name: 'lead', wave: 'pulse', vol: .05, on: false, notes: Array(16).fill(0).map((_, k) => mel(k % 2 ? [['G5', 2], ['.', 2], ['Eb5', 2], ['.', 2], ['C5', 4], ['.', 4]] : [['C5', 2], ['.', 2], ['C5', 2], ['Eb5', 2], ['G5', 4], ['Bb5', 4]])).join(' | ') }
  ] };
  for (const t of S.overclock.tracks) t.notes = t.notes.split(/\s*\|\s*/).map(b => { const k = b.trim().split(/\s+/); return k.slice(0, 16).concat(Array(Math.max(0, 16 - k.length)).fill('.')).join(' '); }).join(' | ');
}
// normalise every song's bars to 16 steps (accent marks and patterns of odd length)
for (const id in S) for (const t of S[id].tracks) t.notes = t.notes.split(/\s*\|\s*/).map(b => { const k = b.trim().split(/\s+/).filter(Boolean); return k.slice(0, 16).concat(Array(Math.max(0, 16 - k.length)).fill('.')).join(' '); }).join(' | ');
SN.SONG_LAYERS = { intro: ['pad', 'pad2', 'bass', 'sub'], race: null };

// ---- stings (1-3 s motifs) ----
SN.STINGS = {
  lap: { bpm: 160, steps: 4, loop: false, tracks: [{ wave: 'triangle', vol: .2, notes: 'E6 - G6 - C7 - - -' }, { wave: 'sine', vol: .12, notes: 'C5 - - - - - - -' }] },
  finallap: { bpm: 150, steps: 4, loop: false, tracks: [{ wave: 'saw', vol: .1, lp: { f: 2000, q: 2 }, notes: 'A4 B4 C5 D5 E5 - A5 - - - - -' }, { wave: 'drums', vol: .14, notes: 'k . s . k . s . c . . .' }] },
  win: { bpm: 140, steps: 4, loop: false, tracks: [{ wave: 'saw', vol: .09, uni: 3, det: 12, notes: 'C5 - E5 - G5 - C6 - - - G5 - C6 - - - - - - -' }, { wave: 'square', vol: .06, notes: 'E4 - G4 - C5 - E5 - - - D5 - E5 - - - - - - -' }, { wave: 'drums', vol: .16, notes: 'k . . . k . . . c . . . k . k . c . . . . . . .' }] },
  podium: { bpm: 140, steps: 4, loop: false, tracks: [{ wave: 'pulse', vol: .09, notes: 'G4 - C5 - E5 - - - D5 - E5 - - - - -' }, { wave: 'drums', vol: .12, notes: 'k . . . s . . . c . . . . . . .' }] },
  elim: { bpm: 120, steps: 4, loop: false, tracks: [{ wave: 'saw', vol: .09, lp: { f: 900, q: 4 }, notes: 'E3 - - D3 - - C3 - - - B2 - - - - -' }, { wave: 'drums', vol: .2, notes: 'b . . . . . . . . . . . . . . .' }] },
  unlock: { bpm: 150, steps: 4, loop: false, tracks: [{ wave: 'pulse', vol: .09, notes: 'C5 E5 G5 C6 E6 G6 C7 - - - - -' }, { wave: 'triangle', vol: .15, notes: 'C4 - - - G4 - - - C5 - - -' }] },
  medal: { bpm: 150, steps: 4, loop: false, tracks: [{ wave: 'triangle', vol: .2, notes: 'G5 - B5 - D6 - G6 - - - - -' }, { wave: 'square', vol: .05, notes: 'G4 - - - D5 - - - G5 - - -' }] },
  zone: { bpm: 160, steps: 4, loop: false, tracks: [{ wave: 'square', vol: .07, lp: { f: 2600, q: 3 }, notes: 'C6 G5 C6 G6' }] }
};
})();
