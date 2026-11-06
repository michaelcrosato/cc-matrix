// The score, all in the engine's song notation. One four-note motif (E G B A) runs through it. Music never carries information.
(() => {
const G = (window.GAME ||= {});
const rep = (s, n) => Array(n).fill(s).join(' | ');
G.SONGS = {
  title: { bpm: 66, steps: 2, tracks: [
    { name: 'lead', wave: 'triangle', vol: .28, notes: 'E4 - G4 - B4 - - - A4 - - - - - . . | E4 - G4 - D5 - - - C5 - - - B4 - - . | A4 - C5 - E5 - - - D5 - - - B4 - - - | G4 - A4 - B4 - - - E4 - - - - - - .' },
    { name: 'bass', wave: 'sine', vol: .36, notes: 'E2 - - - - - - - E2 - - - - - - - | C2 - - - - - - - C2 - - - - - - - | A1 - - - - - - - A1 - - - - - - - | B1 - - - - - - - B1 - - - - - - -' },
    { name: 'pad', wave: 'saw', vol: .05, notes: 'B3 - - - - - - - G3 - - - - - - - | G3 - - - - - - - E3 - - - - - - - | E3 - - - - - - - A3 - - - - - - - | F#3 - - - - - - - B3 - - - - - - -' } ] },
  ward: { bpm: 84, steps: 2, tracks: [
    { name: 'keys', wave: 'pluck', vol: .32, notes: 'E4 . G4 B4 . A4 . . D4 . F#4 A4 . G4 . . | C4 . E4 G4 . F#4 . E4 . . B3 . D4 . . . | E4 . G4 B4 . A4 . . D5 . C5 B4 . A4 . . | G4 . E4 . F#4 . D4 . E4 - - - . . . .' },
    { name: 'bass', wave: 'triangle', vol: .34, notes: 'E2 . . B2 . E2 . . D2 . . A2 . D2 . . | C2 . . G2 . C2 . . B1 . . F#2 . B1 . . | E2 . . B2 . E2 . . F2 . . C3 . F2 . . | A1 . . E2 . B1 . . E2 . . B2 E2 . . .' },
    { name: 'brush', wave: 'drums', vol: .1, notes: rep('. . h . . . h . . . h . . . h h', 4) } ] },
  tension: { bpm: 72, steps: 2, tracks: [
    { name: 'pulse', wave: 'triangle', vol: .38, notes: rep('E2 . E2 . . . E2 . E2 . . . F2 . E2 .', 2) },
    { name: 'drone', wave: 'saw', vol: .05, notes: 'B3 - - - - - - - - - - - - - - - | C4 - - - - - - - B3 - - - - - - -' },
    { name: 'lead', wave: 'sine', vol: .2, notes: '. . . . E4 - G4 - . . . . F4 - - - | . . . . E4 - B4 - A4 - - - - - - -' } ] },
  op: { bpm: 128, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .44, notes: rep('E2 . E2 E3 . E2 . E2 G2 . G2 G3 . A2 . B2', 2) + ' | ' + rep('C2 . C2 C3 . C2 . C2 D2 . D2 D3 . E2 . E2', 2) },
    { name: 'lead', wave: 'pulse', vol: .13, on: false, notes: 'E4 - G4 - B4 - - - A4 - - - G4 - E4 - | . . E5 . D5 . B4 . A4 - - - G4 - - - | C5 - E5 - G5 - - - F#5 - - - E5 - D5 - | E5 - - - B4 - - - G4 - - - . . . .' },
    { name: 'drums', wave: 'drums', vol: .24, on: false, notes: rep('k . h . s . h . k . h k s . h h', 4) } ] },
  emergency: { bpm: 152, steps: 4, tracks: [
    { name: 'bass', wave: 'pulse', vol: .2, notes: rep('E2 E2 E3 E2 G2 G2 G3 G2 A2 A2 A3 A2 B2 B3 B2 B3', 4) },
    { name: 'lead', wave: 'square', vol: .1, notes: 'E5 . B4 . E5 . B4 . G5 . E5 . F#5 . D5 . | E5 . B4 . E5 . B4 . A5 . G5 . F#5 . E5 . | C5 . G4 . C5 . G4 . E5 . C5 . D5 . B4 . | E5 - - - D5 - - - B4 - - - A4 - - -' },
    { name: 'drums', wave: 'drums', vol: .3, notes: rep('k h s h k k s h k h s h k s s s', 4) } ] },
  boss: { bpm: 108, steps: 4, tracks: [
    { name: 'bass', wave: 'saw', vol: .1, notes: rep('E2 . . E2 . . E2 . F2 . . F2 . . E2 .', 2) + ' | ' + rep('C2 . . C2 . . C2 . B1 . . B1 . . D2 .', 2) },
    { name: 'lead', wave: 'triangle', vol: .24, notes: 'A4 - - - F4 - - - D4 - - - E4 - - - | A4 - - - C5 - - - Bb4 - - - A4 - - - | E5 - - - C5 - - - A4 - - - G#4 - - - | A4 - - - - - - - . . . . . . . .' },
    { name: 'choir', wave: 'sine', vol: .14, notes: 'A3 - - - - - - - F3 - - - - - - - | D4 - - - - - - - E4 - - - - - - - | C4 - - - - - - - A3 - - - - - - - | E3 - - - - - - - E3 - - - - - - -' },
    { name: 'drums', wave: 'drums', vol: .24, notes: rep('k . . . s . . k . k . . s . h h', 4) } ] },
  final: { bpm: 116, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .42, notes: rep('E2 . E2 E3 . E2 . E2 C2 . C2 C3 . D2 . D3', 4) },
    { name: 'lead', wave: 'pulse', vol: .14, notes: 'E4 - G4 - B4 - - - A4 - - - - - - - | E5 - D5 - B4 - - - A4 - G4 - E4 - - - | C5 - E5 - G5 - - - F#5 - - - E5 - - - | B4 - - - G4 - - - E4 - - - - - - -' },
    { name: 'choir', wave: 'sine', vol: .13, notes: 'E4 - - - - - - - C4 - - - - - - - | E4 - - - - - - - D4 - - - - - - - | G4 - - - - - - - F#4 - - - - - - - | E4 - - - - - - - B3 - - - - - - -' },
    { name: 'drums', wave: 'drums', vol: .26, notes: rep('k . h . s . h k k . h . s h h h', 4) } ] },
  closed: { bpm: 96, steps: 4, tracks: [{ wave: 'triangle', vol: .3, notes: 'E4 G4 B4 E5 - - - - D5 - E5 - - - - -' }, { wave: 'sine', vol: .3, notes: 'E3 - - - - - - - B2 - E3 - - - - -' }] },
  lost: { bpm: 60, steps: 2, tracks: [{ wave: 'triangle', vol: .3, notes: 'A4 - G4 - E4 - - - D4 - - - - - - -' }, { wave: 'sine', vol: .3, notes: 'A2 - - - - - - - D2 - - - - - - -' }] },
  piano: { bpm: 60, steps: 2, tracks: [{ wave: 'pluck', vol: .36, notes: 'E4 . G4 . B4 . A4 . . . . . E4 . G4 . | D5 . C5 . B4 . . . A4 . . . . . . .' }] },
};
})();
