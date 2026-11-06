// The score, in the engine's song notation. The whole score shares one four-note motif: E - G - B - A ("don't let it go quiet").
// Default slider is 10%, so it stays simple, melodic and bass-forward, and never carries information.
(() => {
const G = (window.GAME ||= {});
const bar = (s, n = 1) => Array(n).fill(s).join(' | ');
G.SONGS = {
  title: { bpm: 66, steps: 4, tracks: [
    { name: 'pad', wave: 'triangle', vol: .12, notes: bar('E3 - - - - - - - - - - - - - - - | C3 - - - - - - - - - - - - - - - | A2 - - - - - - - - - - - - - - - | B2 - - - - - - - - - - - - - - -') },
    { name: 'lead', wave: 'sine', vol: .22, notes: bar('E5 - - - G5 - - - B5 - - - - - - - | A5 - - - - - - - . . . . . . . . | E5 - - - G5 - - - B5 - - - - - - - | D6 - - - C6 - - - A5 - - - - - - -') },
    { name: 'bass', wave: 'triangle', vol: .2, notes: bar('E2 - - - . . . . E2 - - - . . . . | C2 - - - . . . . C2 - - - . . . . | A1 - - - . . . . A1 - - - . . . . | B1 - - - . . . . B1 - - - . . . .') },
  ] },
  ward: { bpm: 84, steps: 3, tracks: [
    { name: 'bass', wave: 'triangle', vol: .24, notes: bar('C3 - - G2 - - A2 - - E2 - - | F2 - - C3 - - G2 - - D3 - - | C3 - - G2 - - A2 - - E2 - - | F2 - - G2 - - C3 - - . . .') },
    { name: 'keys', wave: 'pluck', vol: .2, notes: bar('E4 . G4 B4 . . A4 . . . . . | C5 . A4 F4 . . B4 . G4 . . . | E4 . G4 B4 . . A4 . C5 . . . | D5 . B4 G4 . F4 E4 . . . . .') },
    { name: 'tick', wave: 'drums', vol: .08, notes: bar('h . . h . h h . . h . h', 4) },
  ] },
  tension: { bpm: 72, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .26, notes: bar('E2 . . . . . . . E2 . E2 . . . . . | E2 . . . . . . . E2 . F2 . . . . .') },
    { name: 'high', wave: 'sine', vol: .14, notes: bar('. . . . . . . . E5 - - - G5 - - - | . . . . . . . . B4 - - - Bb4 - - -') },
  ] },
  op: { bpm: 128, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .3, notes: bar('E2 . E3 . E2 . E3 . E2 . E3 . G2 . A2 . | C2 . C3 . C2 . C3 . D2 . D3 . B1 . B2 .') },
    { name: 'pulse', wave: 'pulse', vol: .09, notes: bar('E4 . . E4 . . G4 . . . B4 . A4 . . . | E4 . . E4 . . C4 . . . D4 . B3 . . .') },
    { name: 'drive', wave: 'drums', vol: .16, on: false, notes: bar('k . h . s . h . k k h . s . h h', 2) },
    { name: 'lead', wave: 'square', vol: .07, on: false, notes: bar('E5 - G5 - B5 - - - A5 - - - . . . . | C5 - E5 - G5 - - - F#5 - - - . . . .') },
  ] },
  emergency: { bpm: 156, steps: 4, tracks: [
    { name: 'bass', wave: 'saw', vol: .16, notes: bar('E2 E2 E3 E2 E2 E2 E3 E2 G2 G2 G3 G2 A2 A2 A3 A2 | C2 C2 C3 C2 C2 C2 C3 C2 D2 D2 D3 D2 B1 B1 B2 B1') },
    { name: 'drums', wave: 'drums', vol: .2, notes: bar('k h s h k k s h k h s h k k s s', 2) },
    { name: 'alarm', wave: 'pulse', vol: .08, notes: bar('E5 . . . E5 . . . G5 . . . B5 . A5 . | E5 . . . E5 . . . C5 . . . D5 . B4 .') },
  ] },
  boss: { bpm: 112, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .3, notes: bar('E2 . . E2 . . E2 . F2 . . F2 . . E2 . | D2 . . D2 . . D2 . C2 . . C2 . . B1 .') },
    { name: 'motif', wave: 'square', vol: .07, notes: bar('E5 - - - C5 - - - A4 - - - B4 - - - | E5 - - - C5 - - - A4 - - - G#4 - - -') },
    { name: 'choir', wave: 'triangle', vol: .12, notes: bar('E4 - - - - - - - F4 - - - - - - - | D4 - - - - - - - E4 - - - - - - -') },
    { name: 'drums', wave: 'drums', vol: .14, on: false, notes: bar('k . . k s . . . k . k . s . h h', 2) },
  ] },
  final: { bpm: 120, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .3, notes: bar('E2 . E3 . E2 . E3 . C2 . C3 . D2 . D3 . | A1 . A2 . A1 . A2 . B1 . B2 . B1 . B2 .') },
    { name: 'motif', wave: 'pulse', vol: .09, notes: bar('E5 - G5 - B5 - - - A5 - - - . . . . | E5 - C5 - A4 - - - B4 - - - . . . .') },
    { name: 'choir', wave: 'triangle', vol: .12, notes: bar('E4 - - - - - - - G4 - - - - - - - | A4 - - - - - - - B4 - - - - - - -') },
    { name: 'drums', wave: 'drums', vol: .15, notes: bar('k . h . s . h . k k h . s . h h', 2) },
  ] },
  closed: { bpm: 96, steps: 4, tracks: [ { wave: 'triangle', vol: .3, notes: 'E4 . G4 . B4 . A4 - - - E5 - - - - - - - - - - -' }, { wave: 'sine', vol: .18, notes: 'E3 - - - - - - - C3 - - - G3 - - - - - - - - - - -' } ] },
  lost: { bpm: 60, steps: 4, tracks: [ { wave: 'triangle', vol: .28, notes: 'A4 - - - G4 - - - E4 - - - - - - - - - - -' }, { wave: 'sine', vol: .2, notes: 'E2 - - - - - - - - - - - - - - - - - - -' } ] },
  ending: { bpm: 76, steps: 3, tracks: [
    { name: 'bass', wave: 'triangle', vol: .24, notes: bar('C3 - - G2 - - A2 - - E2 - - | F2 - - C3 - - G2 - - - - -') },
    { name: 'keys', wave: 'pluck', vol: .22, notes: bar('E4 . G4 B4 . . A4 . . . . . | C5 . E5 G5 . . F#5 . . . . .') },
  ] },
  piano: { bpm: 60, steps: 4, tracks: [ { name: 'keys', wave: 'pluck', vol: .24, notes: bar('E4 . . . G4 . . . B4 . . . A4 . . . | . . . . . . . . E4 . . . . . . .') } ] },
};
})();
