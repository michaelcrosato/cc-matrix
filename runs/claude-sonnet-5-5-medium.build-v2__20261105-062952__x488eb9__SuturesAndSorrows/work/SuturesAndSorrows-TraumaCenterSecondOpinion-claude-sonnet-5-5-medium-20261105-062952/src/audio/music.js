// Songs in the engine's notation. One motif (E G A D) runs through the whole score; music never carries gameplay information.
(() => {
const G = (window.GAME ||= {});
const S = G.SONGS = {
  title: { bpm: 68, steps: 4, tracks: [
    { name: 'pad', wave: 'triangle', vol: .13, notes: 'A2 - - - - - - - | A2 - - - - - - - | F2 - - - - - - - | G2 - - - - - - -' },
    { name: 'lead', wave: 'sine', vol: .17, notes: 'E4 - . G4 - . A4 - . D4 - - - . . . . | E4 - . G4 - . A4 - . C5 - - - . . . . | C4 - . E4 - . F4 - . A3 - - - . . . . | D4 - . G4 - . B4 - . G4 - - - . . . .' },
    { name: 'rain', wave: 'noise', vol: .02, notes: 'h . . . h . . . h . . . h . . . | h . . . h . . . h . . . h . . .' }] },
  ward: { bpm: 92, steps: 4, tracks: [
    { name: 'keys', wave: 'pluck', vol: .2, notes: 'E4 . G4 . A4 . D4 . | C4 . E4 . G4 . E4 . | A3 . C4 . F4 . E4 . | D4 . F4 . A4 . G4 .' },
    { name: 'bass', wave: 'triangle', vol: .17, notes: 'A2 - . A2 - . E2 . | C3 - . C3 - . G2 . | F2 - . F2 - . C3 . | D3 - . D3 - . G2 .' }] },
  tension: { bpm: 84, steps: 4, tracks: [
    { name: 'pulse', wave: 'sine', vol: .2, notes: 'A1 . . . A1 . . . | A1 . . . A1 . . . | F1 . . . F1 . . . | E1 . . . E1 . . .' },
    { name: 'drone', wave: 'triangle', vol: .1, notes: 'A2 - - - - - - - | C3 - - - - - - - | F2 - - - - - - - | E2 - - - - - - -' }] },
  op: { bpm: 128, steps: 4, tracks: [
    { name: 'bass', wave: 'saw', vol: .1, notes: 'A1 . A1 . A1 . A2 . | A1 . A1 . C2 . A1 . | F1 . F1 . F1 . F2 . | G1 . G1 . G1 . D2 .' },
    { name: 'drums', wave: 'drums', vol: .18, on: false, notes: 'k . h . s . h . | k . h . s . h h' },
    { name: 'lead', wave: 'triangle', vol: .14, on: false, notes: 'E4 . . G4 . . A4 . | D4 . . . . . . . | E4 . . G4 . . C5 . | B4 . . . . . . .' },
    { name: 'arp', wave: 'square', vol: .06, on: false, notes: 'A3 C4 E4 A4 E4 C4 A3 C4 | A3 C4 E4 A4 E4 C4 A3 C4 | F3 A3 C4 F4 C4 A3 F3 A3 | G3 B3 D4 G4 D4 B3 G3 B3' }] },
  emergency: { bpm: 156, steps: 4, tracks: [
    { name: 'bass', wave: 'saw', vol: .11, notes: 'E1 E1 . E1 E1 . E2 . | E1 E1 . E1 G1 . E1 . | C1 C1 . C1 C1 . C2 . | D1 D1 . D1 D1 . A1 .' },
    { name: 'drums', wave: 'drums', vol: .2, notes: 'k h s h k k s h | k h s h k s s s' },
    { name: 'lead', wave: 'square', vol: .08, notes: 'E5 . G5 . A5 . D5 . | E5 . G5 . B5 . A5 . | C5 . E5 . G5 . E5 . | D5 . F5 . A5 . G5 .' }] },
  boss: { bpm: 112, steps: 4, tracks: [
    { name: 'bass', wave: 'saw', vol: .1, notes: 'A1 . . A1 . . A1 . | Bb1 . . Bb1 . . Bb1 . | F1 . . F1 . . F1 . | E1 . . E1 . . E1 .' },
    { name: 'choir', wave: 'sine', vol: .14, notes: 'A3 - - - - - - - | Bb3 - - - - - - - | C4 - - - - - - - | B3 - - - - - - -' },
    { name: 'motif', wave: 'triangle', vol: .13, notes: 'A4 . G4 . E4 . . . | A4 . Bb4 . G4 . . . | C5 . A4 . F4 . . . | B4 . G4 . E4 . . .' },
    { name: 'drums', wave: 'drums', vol: .16, notes: 'k . . h k . s . | k . h . k . s s' }] },
  final: { bpm: 120, steps: 4, tracks: [
    { name: 'bass', wave: 'saw', vol: .1, notes: 'A1 . A1 . A2 . A1 . | F1 . F1 . F2 . F1 . | C2 . C2 . C3 . C2 . | G1 . G1 . G2 . G1 .' },
    { name: 'choir', wave: 'sine', vol: .13, notes: 'A3 - - - - - - - | F3 - - - - - - - | E3 - - - - - - - | D3 - - - - - - -' },
    { name: 'lead', wave: 'triangle', vol: .15, notes: 'E4 G4 A4 D5 . . E5 . | C5 . A4 F4 . . . . | E4 G4 A4 D5 . . G5 . | E5 . D5 . . . . .' },
    { name: 'drums', wave: 'drums', vol: .18, notes: 'k . h h s . h . | k h h . s h k s' }] },
  piano: { bpm: 60, steps: 4, tracks: [{ name: 'p', wave: 'pluck', vol: .22, notes: 'E4 . . . G4 . . . | A4 . . . D4 . . . | C4 . . . E4 . . . | D4 - - - - - - -' }] },
};
G.STINGS = {
  closed: { bpm: 100, steps: 4, loop: false, tracks: [{ wave: 'triangle', vol: .25, notes: 'E4 G4 A4 D5 - - - - | - - - - . . . .' }, { wave: 'sine', vol: .15, notes: 'A2 - - - - - - - | - - - - . . . .' }] },
  lost: { bpm: 70, steps: 4, loop: false, tracks: [{ wave: 'sine', vol: .25, notes: 'A3 - - - F3 - - - | E3 - - - - - - - | - - - - . . . .' }] },
};
G.SONG_FOR = { title: 'title', menu: 'title', ward: 'ward', story: 'tension', chart: 'tension', op: 'op', lost: null, results: 'ward', credits: 'piano' };
})();
