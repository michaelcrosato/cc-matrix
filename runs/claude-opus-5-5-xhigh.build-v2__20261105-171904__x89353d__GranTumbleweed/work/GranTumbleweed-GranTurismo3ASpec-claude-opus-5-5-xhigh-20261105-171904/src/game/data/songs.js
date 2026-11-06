// Eight original pieces as Song data. Square, triangle, saw, sine and noise only. Harmony written out as note steps.
const row = (s) => s.trim().split(/\s+/).join(' ');
const rep = (s, n) => Array(n).fill(row(s)).join(' ');
const R = (n = 16) => Array(n).fill('.').join(' ');
// Comping: a chord as four notes, arpeggiated in a pattern over one bar of 16 steps.
const arp = (a, b, c, d, pat = 'a . b . c . d . c . b . a . b .') => pat.replace(/\b[abcd]\b/g, (m) => ({ a, b, c, d }[m]));
const BRUSH = { wave: 'noise', decay: 0.06, volume: 0.05 }, KICK = { wave: 'sine', freqEnd: 40, sweepTime: 0.08, decay: 0.12, volume: 0.22 };
export const SONGS = {
  lounge: { // Db: ii7, V7, Imaj7, vi7 with a turnaround. A bossa lounge with a soft sine lead.
    bpm: 92,
    tracks: { lead: { wave: 'sine', attack: 0.01, decay: 0.42, volume: 0.28, vibrato: { depth: 0.12, rate: 5 } }, comp: { wave: 'triangle', decay: 0.2, volume: 0.1 }, bass: { wave: 'triangle', decay: 0.28, volume: 0.24 }, brush: BRUSH },
    patterns: {
      a: { lead: row('. . F5 . Ab5 . . Gb5 . . Eb5 . . . Db5 .  C5 . . Eb5 . . Ab5 . Gb5 . . F5 . . Eb5 .  F5 . . . Ab5 . C6 . . Bb5 . Ab5 . . F5 .  Db5 . . F5 . . Ab5 . . . F5 . Db5 . . .'),
        comp: `${arp('Eb4', 'Gb4', 'Bb4', 'Db5', '. . a . b . . c . d . . c . . b')} ${arp('Ab3', 'C4', 'Eb4', 'Gb4', '. . a . b . . c . d . . c . . b')} ${arp('Db4', 'F4', 'Ab4', 'C5', '. . a . b . . c . d . . c . . b')} ${arp('Bb3', 'Db4', 'F4', 'Ab4', '. . a . b . . c . d . . c . . b')}`,
        bass: row('Eb2 . . Eb2 . . Bb2 . . . Eb2 . . Bb1 . .  Ab2 . . Ab2 . . Eb2 . . . Ab2 . . Gb2 . .  Db2 . . Db2 . . Ab2 . . . Db2 . . F2 . .  Bb1 . . Bb1 . . F2 . . . Bb1 . . Ab2 . .'),
        brush: rep('C8 . . C8 . . C8 . C8 . . C8 . . C8 .', 4) },
      b: { lead: row('Bb5 . . . Ab5 . F5 . . Eb5 . . Db5 . . .  Eb5 . Gb5 . Bb5 . . Ab5 . . Gb5 . Eb5 . . .  Db5 . F5 . Ab5 . . C6 . . Ab5 . F5 . . Eb5  Db5 . . . . . . . . . . . . . . .'),
        comp: `${arp('Gb3', 'Bb3', 'Db4', 'F4', '. . a . b . . c . d . . c . . b')} ${arp('F3', 'A3', 'C4', 'Eb4', '. . a . b . . c . d . . c . . b')} ${arp('Bb3', 'Db4', 'F4', 'Ab4', '. . a . b . . c . d . . c . . b')} ${arp('Eb3', 'Gb3', 'Bb3', 'Db4', 'a . b . c . d . c . b . a . . .')}`,
        bass: row('Gb2 . . Gb2 . . Db2 . . . Gb2 . . Db2 . .  F2 . . F2 . . C2 . . . F2 . . C2 . .  Bb1 . . Bb1 . . F2 . . . Bb1 . . F2 . .  Eb2 . . Eb2 . . Bb1 . Ab1 . . Ab1 . Ab2 . .'),
        brush: rep('C8 . . C8 . . C8 . C8 . . C8 . . C8 .', 4) },
    }, order: ['a', 'a', 'b', 'a'],
  },
  catalogue: { // Fmaj7, Em7, Dm7, G7, very slow, vibraphone-like.
    bpm: 76,
    tracks: { vibe: { wave: 'sine', decay: 0.9, volume: 0.22, vibrato: { depth: 0.18, rate: 4.2 } }, vibe2: { wave: 'sine', decay: 0.7, volume: 0.12, vibrato: { depth: 0.18, rate: 4.2 } }, bass: { wave: 'triangle', decay: 0.5, volume: 0.2 } },
    patterns: { a: {
      vibe: row('A5 . . . C6 . . . E6 . . . . . . .  G5 . . . B5 . . . D6 . . . . . . .  F5 . . . A5 . . . C6 . . . . . . .  D6 . . . B5 . . . G5 . . . F5 . . .'),
      vibe2: row('F4 . . . . . A4 . . . C5 . . . . .  E4 . . . . . G4 . . . B4 . . . . .  D4 . . . . . F4 . . . A4 . . . . .  G4 . . . . . B4 . . . D5 . . . . .'),
      bass: row('F2 . . . . . . . C3 . . . . . . .  E2 . . . . . . . B2 . . . . . . .  D2 . . . . . . . A2 . . . . . . .  G2 . . . . . . . D3 . . . . . . .') },
      b: { vibe: row('C6 . . . A5 . . . F5 . . . E5 . . .  D6 . . . B5 . . . G5 . . . E5 . . .  A5 . . . F5 . . . D5 . . . F5 . . .  G5 . . . F5 . D5 . B4 . . . . . . .'),
        vibe2: row('F4 . . . . . . . C5 . . . . . . .  E4 . . . . . . . B4 . . . . . . .  D4 . . . . . . . A4 . . . . . . .  G4 . . . . . . . . . . . . . . .'),
        bass: row('F2 . . . . . . . A2 . . . . . . .  E2 . . . . . . . G2 . . . . . . .  D2 . . . . . . . F2 . . . . . . .  G2 . . . . . . . G2 . . . . . . .') } }, order: ['a', 'a', 'b', 'a'],
  },
  socket: { // Light funk, muted square. A minor pentatonic over Am7, D9.
    bpm: 108,
    tracks: { lead: { wave: 'square', duty: 0.25, decay: 0.09, volume: 0.12 }, clav: { wave: 'square', duty: 0.125, decay: 0.05, volume: 0.09 }, bass: { wave: 'triangle', decay: 0.14, volume: 0.26 }, hat: { wave: 'noise', decay: 0.03, volume: 0.05 }, snare: { wave: 'noise', decay: 0.1, volume: 0.1 } },
    patterns: { a: {
      lead: row('A4 . C5 . . D5 . . E5 . . G5 . . E5 .  D5 . . C5 . . A4 . . . C5 . D5 . . .  A4 . C5 . . D5 . . E5 . G5 . A5 . G5 .  E5 . D5 . C5 . . . A4 . . . . . . .'),
      clav: row('. . A3 C4 . . A3 . . G3 . . C4 . . .  . . D4 F#4 . . D4 . . C4 . . E4 . . .  . . A3 C4 . . A3 . . G3 . . C4 . . .  . . D4 F#4 . . D4 . . C4 . . E4 . . .'),
      bass: row('A2 . . A2 . . G2 . . E2 . . G2 . A2 .  D2 . . D2 . . F#2 . . A2 . . C3 . D3 .  A2 . . A2 . . G2 . . E2 . . G2 . A2 .  D2 . . D2 . . F#2 . . A2 . . G2 . E2 .'),
      hat: rep('C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 C8', 4), snare: rep('. . . . C6 . . . . . . . C6 . . .', 4) } }, order: ['a'],
  },
  exam: { // Sparse, metronomic, polite. C: a bass pulse and a three-note motif.
    bpm: 120,
    tracks: { tick: { wave: 'noise', decay: 0.02, volume: 0.05 }, bass: { wave: 'triangle', decay: 0.2, volume: 0.2 }, motif: { wave: 'sine', decay: 0.3, volume: 0.2 }, pad: { wave: 'triangle', attack: 0.04, decay: 0.8, volume: 0.05 } },
    patterns: { a: { tick: rep('C8 . . . C8 . . . C8 . . . C8 . . .', 4), bass: rep('C2 . . . . . . . C2 . . . . . . .', 2) + ' ' + rep('G1 . . . . . . . G1 . . . . . . .', 2),
      motif: row('. . . . . . . . E5 . G5 . C5 . . .  . . . . . . . . . . . . . . . .  . . . . . . . . D5 . G5 . B4 . . .  . . . . . . . . . . . . . . . .'),
      pad: row('C4 . . . . . . . . . . . . . . .  E4 . . . . . . . . . . . . . . .  D4 . . . . . . . . . . . . . . .  F4 . . . . . . . . . . . . . . .') } }, order: ['a'],
  },
  apex: { // Driving chiptune rock. E minor: i, VI, III, VII with a lead hook.
    bpm: 156,
    tracks: { lead: { wave: 'square', duty: 0.5, decay: 0.16, volume: 0.13 }, gtr: { wave: 'saw', decay: 0.1, volume: 0.09 }, bass: { wave: 'triangle', decay: 0.12, volume: 0.28 }, kick: KICK, snare: { wave: 'noise', decay: 0.12, volume: 0.12 }, hat: { wave: 'noise', decay: 0.025, volume: 0.05 } },
    patterns: { a: {
      lead: row('E5 . . G5 . . B5 . A5 . G5 . E5 . . .  C5 . . E5 . . G5 . F#5 . E5 . C5 . . .  G5 . . B5 . . D6 . C6 . B5 . G5 . . .  D5 . . F#5 . . A5 . B5 . A5 . F#5 . D5 .'),
      gtr: `${rep('E3 E3 . E3 B3 . E3 .', 2)} ${rep('C3 C3 . C3 G3 . C3 .', 2)} ${rep('G3 G3 . G3 D4 . G3 .', 2)} ${rep('D3 D3 . D3 A3 . D3 .', 2)}`,
      bass: `${rep('E2 . E2 . E2 . E2 E2', 2)} ${rep('C2 . C2 . C2 . C2 C2', 2)} ${rep('G2 . G2 . G2 . G2 G2', 2)} ${rep('D2 . D2 . D2 . D2 D2', 2)}`,
      kick: rep('C2 . . . . . . . C2 . C2 . . . . .', 4), snare: rep('. . . . C6 . . . . . . . C6 . . .', 4), hat: rep('C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 .', 4) },
      b: { lead: row('B5 . . . A5 . B5 . G5 . . . E5 . G5 .  A5 . . . G5 . A5 . F#5 . . . D5 . E5 .  B5 . . . A5 . B5 . D6 . . . B5 . G5 .  A5 . G5 . F#5 . E5 . F#5 . . . . . . .'),
        gtr: `${rep('E3 . E3 . G3 . E3 .', 2)} ${rep('D3 . D3 . F#3 . D3 .', 2)} ${rep('C3 . C3 . E3 . C3 .', 2)} ${rep('B2 . B2 . D#3 . B2 .', 2)}`,
        bass: `${rep('E2 E2 . E2 . E2 . E2', 2)} ${rep('D2 D2 . D2 . D2 . D2', 2)} ${rep('C2 C2 . C2 . C2 . C2', 2)} ${rep('B1 B1 . B1 . B1 . B1', 2)}`,
        kick: rep('C2 . . . . . . . C2 . C2 . . . . .', 4), snare: rep('. . . . C6 . . . . . . . C6 . . .', 4), hat: rep('C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 .', 4) } }, order: ['a', 'a', 'b', 'a'],
  },
  city: { // City-pop groove. Bb: Imaj7, iii7, vi7, IV.
    bpm: 118,
    tracks: { lead: { wave: 'square', duty: 0.25, attack: 0.005, decay: 0.2, volume: 0.1, vibrato: { depth: 0.1, rate: 6 } }, keys: { wave: 'triangle', decay: 0.18, volume: 0.1 }, bass: { wave: 'square', duty: 0.5, decay: 0.12, volume: 0.13 }, kick: KICK, snare: { wave: 'noise', decay: 0.1, volume: 0.09 }, hat: { wave: 'noise', decay: 0.03, volume: 0.05 } },
    patterns: { a: {
      lead: row('D5 . F5 . A5 . . G5 . . F5 . D5 . . .  D5 . F5 . A5 . . C6 . . A5 . F5 . . .  C5 . Eb5 . G5 . . F5 . . Eb5 . C5 . . .  Eb5 . G5 . Bb5 . . A5 . . G5 . F5 . . .'),
      keys: `${arp('Bb3', 'D4', 'F4', 'A4', '. . a b . . c . . d . . c . . .')} ${arp('D4', 'F4', 'A4', 'C5', '. . a b . . c . . d . . c . . .')} ${arp('G3', 'Bb3', 'D4', 'F4', '. . a b . . c . . d . . c . . .')} ${arp('Eb4', 'G4', 'Bb4', 'D5', '. . a b . . c . . d . . c . . .')}`,
      bass: row('Bb1 . . Bb1 . . Bb2 . . F2 . . Bb1 . . .  D2 . . D2 . . D3 . . A2 . . D2 . . .  G1 . . G1 . . G2 . . D2 . . G1 . . .  Eb2 . . Eb2 . . Eb3 . . Bb2 . F2 . G2 . .'),
      kick: rep('C2 . . . . . C2 . . . C2 . . . . .', 4), snare: rep('. . . . C6 . . . . . . . C6 . . .', 4), hat: rep('C8 . C8 C8 . C8 C8 . C8 . C8 C8 . C8 C8 .', 4) } }, order: ['a'],
  },
  clay: { // Twangy, galloping. G mixolydian.
    bpm: 132,
    tracks: { twang: { wave: 'saw', decay: 0.14, volume: 0.1, vibrato: { depth: 0.25, rate: 7 } }, gallop: { wave: 'square', duty: 0.25, decay: 0.05, volume: 0.08 }, bass: { wave: 'triangle', decay: 0.14, volume: 0.27 }, hat: { wave: 'noise', decay: 0.03, volume: 0.06 }, snare: { wave: 'noise', decay: 0.1, volume: 0.1 } },
    patterns: { a: {
      twang: row('G4 . B4 . D5 . . E5 . F5 . E5 D5 . B4 .  G4 . B4 . D5 . . E5 . F5 . G5 F5 . D5 .  F4 . A4 . C5 . . D5 . E5 . D5 C5 . A4 .  G4 . B4 . D5 . F5 . E5 . D5 . B4 . G4 .'),
      gallop: rep('G3 . G3 G3 D3 . D3 D3 G3 . G3 G3 F3 . F3 F3', 2) + ' ' + rep('F3 . F3 F3 C3 . C3 C3 G3 . G3 G3 D3 . D3 D3', 2),
      bass: rep('G2 . . . D2 . . . G2 . . . F2 . . .', 2) + ' ' + rep('F2 . . . C2 . . . G2 . . . D2 . . .', 2),
      hat: rep('C8 . C8 C8 C8 . C8 C8 C8 . C8 C8 C8 . C8 C8', 4), snare: rep('. . . . C6 . . . . . . . C6 . . .', 4) } }, order: ['a'],
  },
  longDrive: { // Calm arpeggios that open out. D: Imaj7, V/vi, vi7, IVmaj7.
    bpm: 84,
    tracks: { arp: { wave: 'triangle', decay: 0.42, volume: 0.15 }, lead: { wave: 'sine', attack: 0.02, decay: 0.7, volume: 0.2, vibrato: { depth: 0.12, rate: 4.5 } }, bass: { wave: 'sine', decay: 0.7, volume: 0.24 } },
    patterns: { a: {
      arp: `${arp('D4', 'F#4', 'A4', 'C#5', 'a b c d c b a b a b c d c b a b')} ${arp('F#3', 'A#3', 'C#4', 'E4', 'a b c d c b a b a b c d c b a b')} ${arp('B3', 'D4', 'F#4', 'A4', 'a b c d c b a b a b c d c b a b')} ${arp('G3', 'B3', 'D4', 'F#4', 'a b c d c b a b a b c d c b a b')}`,
      lead: row('F#5 . . . . . A5 . . . . . . . . .  E5 . . . . . C#5 . . . . . . . . .  D5 . . . . . F#5 . . . . . A5 . . .  B5 . . . A5 . F#5 . D5 . . . . . . .'),
      bass: row('D2 . . . . . . . . . . . . . . .  F#2 . . . . . . . . . . . . . . .  B1 . . . . . . . . . . . . . . .  G2 . . . . . . . . . . . . . . .') } }, order: ['a'],
  },
  fanfare: { bpm: 180, loop: false, tracks: { a: { wave: 'square', duty: 0.25, decay: 0.3, volume: 0.2 }, b: { wave: 'triangle', decay: 0.3, volume: 0.2 } }, patterns: { a: { a: row('G5 . G5 . C6 . . . E6 . . . G6 . . . . . . .'), b: row('E4 . E4 . G4 . . . C5 . . . E5 . . . . . . .') } }, order: ['a'] },
};
void R;
