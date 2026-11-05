/* ---- MUSIC: original songs in the engine's step notation ({ bpm, steps, tracks: [{ wave, vol, notes, name, on }] };
 * a note, '-' holds, '.' rests, '|' is ignored; drums k s h o c t). Each match song has named layers for dynamic
 * intensity: base, drums (in when the Hype meter passes 50) and fire (in when ON FIRE). Stings play over the music. ---- */
const SONGS = {
  // "The Kerfuffle March": a jaunty brass-band march in B flat, a cheeky chromatic run every fourth bar
  title: { bpm: 120, steps: 4, tracks: [
    { name: 'base', wave: 'square', vol: .1, notes: 'F4 . Bb4 . D5 . Bb4 . F5 - - . D5 . Bb4 . | C5 . Eb5 . G5 . Eb5 . F5 - - . . . . . | D5 . F5 . Bb5 . F5 . G5 . F5 . Eb5 . D5 . | C5 . D5 . Eb5 . E5 . F5 - - - . . . . | Bb5 . A5 . G5 . F5 . Eb5 . D5 . C5 . Bb4 . | A4 . C5 . F5 . A5 . G5 - F5 . Eb5 - D5 . | Eb5 . D5 . C5 . Bb4 . A4 . Bb4 . C5 . D5 . | Bb4 - - - F4 . Bb4 . Bb4 - - - . . . .' },
    { name: 'tuba', wave: 'triangle', vol: .32, notes: 'Bb2 . . . F2 . . . Bb2 . . . F2 . . . | Eb2 . . . Bb2 . . . F2 . . . C3 . . . | Bb2 . . . F2 . . . G2 . . . D2 . . . | F2 . . . C3 . . . F2 . . . A2 . . . | G2 . . . D3 . . . Eb2 . . . Bb2 . . . | F2 . . . C3 . . . F2 . . . A2 . . . | Eb2 . . . G2 . . . F2 . . . F2 . . . | Bb2 . . . F2 . . . Bb2 . . . . . . .' },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . h . s . h . k . h . s . s s | k . h . s . h . k . k . s . h h' }] },
  attract: { bpm: 138, steps: 4, tracks: [
    { name: 'base', wave: 'pulse', vol: .09, notes: 'F5 . D5 . Bb4 . D5 . F5 . Bb5 . A5 . G5 . | Eb5 . G5 . C5 . Eb5 . F5 - - . . . . . | D5 . F5 . Bb5 . D6 . C6 . Bb5 . A5 . G5 . | F5 . G5 . A5 . Bb5 . C6 - - - . . . .' },
    { name: 'tuba', wave: 'triangle', vol: .3, notes: 'Bb2 . F2 . Bb2 . F2 . Bb2 . F2 . Bb2 . F2 . | Eb2 . Bb2 . Eb2 . Bb2 . F2 . C3 . F2 . C3 . | Bb2 . F2 . Bb2 . F2 . G2 . D3 . G2 . D3 . | F2 . C3 . F2 . C3 . F2 . A2 . F2 . E2 .' },
    { name: 'drums', wave: 'drums', vol: .12, notes: 'k . h k s . h . k k h . s . h h' },
    { name: 'fire', wave: 'saw', vol: .035, on: false, notes: 'Bb5 D6 F6 D6 Bb5 D6 F6 Bb6 Bb5 D6 F6 D6 Bb5 D6 F6 Bb6 | Eb6 G6 Bb6 G6 Eb6 G6 Bb6 G6 F6 A6 C7 A6 F6 A6 C7 A6 | Bb5 D6 F6 D6 Bb5 D6 F6 D6 G5 Bb5 D6 Bb5 G5 Bb5 D6 Bb5 | F5 A5 C6 A5 F5 A5 C6 F6 A5 C6 F6 C6 A5 C6 F6 A6' }] },
  // the minibus travels: a bouncy 6/8
  map: { bpm: 112, steps: 3, tracks: [
    { name: 'base', wave: 'square', vol: .08, notes: 'G4 . B4 D5 . B4 | C5 . E5 G5 - . | D5 . C5 B4 . A4 | G4 - - . . . | E5 . D5 C5 . B4 | A4 . C5 E5 - . | D5 . F#5 A5 . F#5 | G5 - - . . .' },
    { name: 'tuba', wave: 'triangle', vol: .3, notes: 'G2 . . D3 . . | C3 . . G2 . . | D3 . . D2 . . | G2 . . D3 . . | C3 . . G2 . . | A2 . . E2 . . | D3 . . A2 . . | G2 . . D2 . .' },
    { name: 'drums', wave: 'drums', vol: .08, notes: 'k . h s . h | k . h s h h' }] },
  // pastoral summer afternoon, a cuckoo-like two-note motif
  green: { bpm: 96, steps: 4, tracks: [
    { name: 'base', wave: 'pulse12', vol: .07, notes: 'G5 - E5 - . . . . G5 - E5 - . . D5 . | C5 . D5 . E5 - - . G4 . A4 . C5 - - . | F5 - D5 - . . . . F5 - D5 - . . C5 . | B4 . C5 . D5 - - . G4 - - - . . . .' },
    { name: 'tuba', wave: 'triangle', vol: .26, notes: 'C3 . . . G2 . . . C3 . . . G2 . . . | A2 . . . E2 . . . F2 . . . C3 . . . | D3 . . . A2 . . . G2 . . . D3 . . . | G2 . . . D2 . . . G2 . . . B2 . . .' },
    { name: 'drums', wave: 'drums', vol: .07, on: false, notes: 'k . . . h . . . s . . . h . . . | k . . . h . h . s . . . h . h .' },
    { name: 'fire', wave: 'saw', vol: .05, on: false, notes: 'C6 . G5 . E5 . G5 . C6 . G5 . E5 . G5 . | F6 . C6 . A5 . C6 . G6 . D6 . B5 . D6 .' }] },
  // a stately minuet: a harpsichord-like square arpeggio in 3/4
  hall: { bpm: 108, steps: 2, tracks: [
    { name: 'base', wave: 'square', vol: .07, notes: 'D5 . F#5 . A5 . | G5 . B5 . D6 . | F#5 . E5 . D5 . | E5 - - - . . | B4 . D5 . G5 . | A4 . C#5 . E5 . | D5 . A4 . F#4 . | D4 - - - . .' },
    { name: 'tuba', wave: 'triangle', vol: .24, notes: 'D3 . . . A2 . | G2 . . . D3 . | A2 . . . A2 . | A2 . . . E2 . | G2 . . . D3 . | A2 . . . E2 . | D3 . . . A2 . | D2 . . . . .' },
    { name: 'drums', wave: 'drums', vol: .06, on: false, notes: 'k . h . h . | k . h . s .' },
    { name: 'fire', wave: 'pulse', vol: .05, on: false, notes: 'A5 D6 F#6 A6 F#6 D6 | B5 D6 G6 B6 G6 D6' }] },
  // surf rock: a twangy saw with vibrato and driving drums
  bay: { bpm: 150, steps: 4, tracks: [
    { name: 'base', wave: 'saw', vol: .06, notes: 'E4 . E4 G4 . E4 A4 . G4 . E4 . D4 . E4 . | E4 . E4 G4 . E4 B4 . A4 . G4 . A4 - - . | C5 . C5 B4 . A4 G4 . A4 . G4 . E4 . D4 . | E4 - - . . . . . E4 . G4 . B4 . E5 .' },
    { name: 'tuba', wave: 'triangle', vol: .3, notes: 'E2 . E2 . E2 . E2 . E2 . E2 . D2 . D2 . | E2 . E2 . E2 . E2 . A2 . A2 . G2 . G2 . | C3 . C3 . C3 . C3 . D3 . D3 . B2 . B2 . | E2 . E2 . E2 . E2 . E2 . B2 . E2 . B2 .' },
    { name: 'drums', wave: 'drums', vol: .1, on: false, notes: 'k . h . s . h k k . h . s . h h' },
    { name: 'fire', wave: 'square', vol: .05, on: false, notes: 'B5 . E6 . B5 . G5 . A5 . E6 . B5 . G5 .' }] },
  // the conjurer's mystery waltz: minor key, tremolo
  downs: { bpm: 126, steps: 2, tracks: [
    { name: 'base', wave: 'pulse', vol: .07, notes: 'A4 . C5 . E5 . | F5 - - E5 . . | D5 . F5 . A5 . | G#5 - - - . . | A5 . E5 . C5 . | D5 . B4 . G#4 . | A4 . E4 . C5 . | B4 - - - . .' },
    { name: 'tuba', wave: 'triangle', vol: .26, notes: 'A2 . . E3 . . | F2 . . C3 . . | D3 . . A2 . . | E2 . . B2 . . | A2 . . E3 . . | D3 . . E2 . . | A2 . . C3 . . | E2 . . E3 . .' },
    { name: 'drums', wave: 'drums', vol: .07, on: false, notes: 'k . h . h . | k . h . s .' },
    { name: 'fire', wave: 'saw', vol: .04, on: false, notes: 'A5 C6 E6 A6 E6 C6 | G#5 B5 E6 G#6 E6 B5' }] },
  // a stadium rock anthem with a chant-able hook (and a spooky organ layer for the ghosts)
  dome: { bpm: 128, steps: 4, tracks: [
    { name: 'base', wave: 'saw', vol: .06, notes: 'E5 . E5 . G5 . E5 . D5 - - . B4 . . . | C5 . C5 . E5 . C5 . B4 - - . . . . . | A4 . C5 . E5 . A5 . G5 . E5 . D5 . C5 . | B4 . . . E5 - - - . . . . . . . .' },
    { name: 'tuba', wave: 'square', vol: .1, notes: 'E2 E2 . E2 E2 . E2 . G2 G2 . G2 D2 . D2 . | C2 C2 . C2 C2 . C2 . B1 B1 . B1 B1 . B1 . | A1 A1 . A1 C2 . C2 . D2 D2 . D2 D2 . D2 . | E2 E2 . E2 E2 . E2 . E2 . E2 . B1 . B1 .' },
    { name: 'drums', wave: 'drums', vol: .12, on: false, notes: 'k . h . s . h . k k h . s . h . | k . h . s . h . k . h k s s s s' },
    { name: 'fire', wave: 'triangle', vol: .12, on: false, notes: 'E4 - - - G4 - - - B4 - - - D5 - - - | C4 - - - E4 - - - G4 - - - B4 - - -' }] },
  // a gentle waltz for tea intervals, story scenes and the nets (where its brushed drums and a music-box
  // countermelody are the Hype and ON FIRE layers)
  tea: { bpm: 96, steps: 2, tracks: [
    { name: 'base', wave: 'pulse12', vol: .06, notes: 'C5 - - E5 G5 . | F5 - - E5 D5 . | E5 - - G5 C6 . | B5 - - - . . | A5 - - G5 F5 . | E5 - - D5 C5 . | D5 - - E5 F5 . | E5 - - - . .' },
    { name: 'tuba', wave: 'triangle', vol: .22, notes: 'C3 . . G3 . . | D3 . . G3 . . | C3 . . G3 . . | G2 . . D3 . . | F2 . . C3 . . | C3 . . G2 . . | G2 . . D3 . . | C3 . . G2 . .' },
    { name: 'drums', wave: 'drums', vol: .06, on: false, notes: 'k . h . h . | k . h . s .' },
    { name: 'fire', wave: 'pulse', vol: .035, on: false, notes: 'C6 E6 G6 E6 C6 G5 | B5 D6 F6 D6 B5 G5 | C6 E6 G6 E6 C6 G5 | B5 D6 G6 D6 B5 G5 | A5 C6 F6 C6 A5 F5 | G5 C6 E6 C6 G5 E5 | B5 D6 F6 D6 B5 G5 | C6 E6 G6 C7 G6 E6' }] },
  // a tense countdown loop
  showdown: { bpm: 140, steps: 4, tracks: [
    { name: 'base', wave: 'square', vol: .07, notes: 'D4 . . D4 . . F4 . D4 . . D4 . . G4 . | D4 . . D4 . . F4 . E4 . . C4 . . A3 .' },
    { name: 'tuba', wave: 'triangle', vol: .3, notes: 'D2 . D2 . D2 . D2 . D2 . D2 . C2 . C2 . | Bb1 . Bb1 . Bb1 . Bb1 . A1 . A1 . A1 . A1 .' },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . . h k . s . k . . h k . s s' },
    { name: 'fire', wave: 'saw', vol: .04, on: false, notes: 'A5 . A5 . A5 . A5 . Bb5 . Bb5 . A5 . A5 .' }] }
};
const STINGS = {
  four: { bpm: 180, steps: 4, loop: false, tracks: [{ wave: 'square', vol: .1, notes: 'C5 E5 G5 C6 - - - .' }, { wave: 'drums', vol: .12, notes: 'k . s . c . . .' }] },
  six: { bpm: 170, steps: 4, loop: false, tracks: [{ wave: 'square', vol: .11, notes: 'G4 C5 E5 G5 C6 E6 G6 - - - - .' }, { wave: 'triangle', vol: .3, notes: 'C3 . . . G2 . . . C3 - - .' }, { wave: 'drums', vol: .14, notes: 'k k s s k k s s c . . .' }] },
  wicket: { bpm: 150, steps: 4, loop: false, tracks: [{ wave: 'saw', vol: .08, notes: 'E5 D5 C5 B4 A4 - - - E4 - - .' }, { wave: 'drums', vol: .14, notes: 'k . . . s . . . c . . .' }] },
  over: { bpm: 160, steps: 4, loop: false, tracks: [{ wave: 'pulse', vol: .08, notes: 'G5 . E5 . C5 - - .' }] },
  hype: { bpm: 170, steps: 4, loop: false, tracks: [{ wave: 'square', vol: .1, notes: 'C5 D5 E5 F5 G5 A5 B5 C6 - - - .' }] },
  fire: { bpm: 180, steps: 4, loop: false, tracks: [{ wave: 'saw', vol: .09, notes: 'A4 C5 E5 A5 C6 E6 A6 - - - . .' }, { wave: 'drums', vol: .12, notes: 'k s k s k s c . . . . .' }] },
  special: { bpm: 160, steps: 4, loop: false, tracks: [{ wave: 'pulse', vol: .1, notes: 'C5 G5 C6 G5 E6 - - - . . . .' }] },
  win: { bpm: 140, steps: 4, loop: false, tracks: [{ wave: 'square', vol: .1, notes: 'Bb4 . Bb4 . Bb4 . D5 - F5 - - . D5 . F5 . Bb5 - - - - - - .' }, { wave: 'triangle', vol: .3, notes: 'Bb2 . . . F2 . . . Bb2 . . . F2 . . . Bb2 - - - - - - .' }, { wave: 'drums', vol: .12, notes: 'k . s . k . s . k . s . k k s s c . . . . . . .' }] },
  lose: { bpm: 90, steps: 4, loop: false, tracks: [{ wave: 'saw', vol: .08, notes: 'G4 - - . F#4 - - . F4 - - . E4 - - - - - - - . . . .' }] },
  toss: { bpm: 200, steps: 4, loop: false, tracks: [{ wave: 'pulse12', vol: .08, notes: 'C6 E6 G6 C7 . . . .' }] },
  chapter: { bpm: 130, steps: 4, loop: false, tracks: [{ wave: 'square', vol: .09, notes: 'F4 Bb4 D5 F5 - - Eb5 D5 C5 - Bb4 - - - . .' }, { wave: 'triangle', vol: .28, notes: 'Bb2 - - - Eb2 - - - F2 - - - Bb2 - - .' }] }
};
K.SONGS = SONGS; K.STINGS = STINGS;
