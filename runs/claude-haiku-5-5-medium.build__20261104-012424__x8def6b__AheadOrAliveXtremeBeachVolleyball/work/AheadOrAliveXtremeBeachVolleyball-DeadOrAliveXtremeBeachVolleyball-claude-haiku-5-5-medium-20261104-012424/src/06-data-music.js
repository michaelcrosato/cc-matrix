/* 06-data-music: the songs, written in the engine's step notation (bpm, steps, tracks of notes, drums k s h o c t).
 * Every song is an object made in code; none is a file. Each loops over its bars. */
G.SONGS = {
  sunrise: { bpm: 116, steps: 4, tracks: [
    { wave: 'triangle', vol: .16, notes: 'C5 - E5 - G5 - E5 - A5 - G5 - E5 - C5 - F5 - A5 - C6 - A5 - G5 - E5 - D5 - C5' },
    { wave: 'square', vol: .06, notes: 'C3 . . . G2 . . . A2 . . . F2 . . . ' },
    { wave: 'drums', vol: .2, notes: 'k . h . s . h . k . h . s . h .' }] },
  island: { bpm: 100, steps: 4, tracks: [
    { wave: 'triangle', vol: .14, notes: 'F5 . A5 . C6 . A5 . Bb5 . G5 . F5 . D5 .' },
    { wave: 'sine', vol: .12, notes: 'F3 - - - Bb2 - - - C3 - - - F3 - - -' },
    { wave: 'drums', vol: .14, notes: 'k . . h . . s . k . . h . s .' }] },
  spike: { bpm: 138, steps: 4, tracks: [
    { wave: 'square', vol: .1, notes: 'A4 A4 C5 A4 E5 D5 C5 A4 A4 C5 D5 E5 A5 G5 E5 D5' },
    { wave: 'saw', vol: .08, notes: 'A2 A2 A2 A2 F2 F2 F2 F2 C3 C3 C3 C3 G2 G2 G2 G2' },
    { wave: 'drums', vol: .22, notes: 'k . h h s . h h k . h h s h h h' }] },
  house: { bpm: 150, steps: 4, tracks: [
    { wave: 'square', vol: .1, notes: 'D5 . F5 . A5 . G5 . Bb5 . A5 . G5 . F5 .' },
    { wave: 'saw', vol: .07, notes: 'D3 D3 D3 D3 Bb2 Bb2 Bb2 Bb2 C3 C3 C3 C3 A2 A2 A2 A2' },
    { wave: 'drums', vol: .22, notes: 'k k s k k s s s k k s k k s s s' }] },
  lagoon: { bpm: 112, steps: 4, tracks: [
    { wave: 'triangle', vol: .13, notes: 'G4 - B4 - D5 - B4 - E5 - D5 - B4 - G4 -' },
    { wave: 'sine', vol: .1, notes: 'G3 . D3 . Em3 . B2 . A2 . E3 . A2 .' },
    { wave: 'drums', vol: .08, notes: 'c . c . c . c . c . c . c . c .' }] },
  neon: { bpm: 96, steps: 4, tracks: [
    { wave: 'square', vol: .08, notes: 'E4 - G4 B4 - E5 - D5 - B4 G4 -' },
    { wave: 'sine', vol: .1, notes: 'E3 - - - A2 - - - E3 - - - B2 - - -' },
    { wave: 'drums', vol: .14, notes: 'k . h . s . h . k . h . s . h h' }] },
  siesta: { bpm: 80, steps: 4, tracks: [
    { wave: 'sine', vol: .14, notes: 'D4 - F4 - A4 - F4 - B4 - A4 - F4 - D4 -' },
    { wave: 'triangle', vol: .08, notes: 'D3 - - - G2 - - - A2 - - - D3 - - -' }] },
  farewell: { bpm: 124, steps: 4, tracks: [
    { wave: 'square', vol: .09, notes: 'C5 E5 G5 C6 B5 G5 E5 C5 F5 A5 C6 F6 E6 C6 A5 F5' },
    { wave: 'square', vol: .05, notes: 'E4 E4 G4 G4 A4 A4 F4 F4 C4 C4 E4 E4 G4 G4 F4 F4' },
    { wave: 'drums', vol: .24, notes: 'k . h . k . h . s . h . k . s h h' }] },
  boutique: { bpm: 108, steps: 4, tracks: [
    { wave: 'sine', vol: .12, notes: 'Bb4 - D5 - F5 - D5 - C5 - Bb4 - G4 - Bb4 -' },
    { wave: 'saw', vol: .06, notes: 'Bb2 Bb2 Bb2 Bb2 Gm2 Gm2 Gm2 Gm2 Eb2 Eb2 Eb2 Eb2 F2 F2 F2 F2' },
    { wave: 'drums', vol: .12, notes: 'k . h . s . h . k . h . s . h h' }] },
  title: { bpm: 104, steps: 4, tracks: [
    { wave: 'triangle', vol: .14, notes: 'C5 - G5 - E5 - G5 - F5 - A5 - G5 - C6 -' },
    { wave: 'sine', vol: .1, notes: 'C3 - - - G2 - - - A2 - - - F2 - - -' }] }
};
/* the song for each place or mode */
G.songFor = function (key) { return G.SONGS[key] || G.SONGS.sunrise; };
