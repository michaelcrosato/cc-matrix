/* Songs (§10.1), "alpine noir": the engine's step notation (a token a step: a note, '-' holds, '.' rests, '|' a bar
 * line for the eye). Each play song has an explore layer and a 'danger' layer that starts silent (audio.layer brings it
 * in while Whiteouts are near). The band's four tracks are its musicians: a note sounding is a warm spot showing. */
const rep = (s, n) => Array(n).fill(s).join(' | ');
S7.song('title', { bpm: 84, steps: 2, tracks: [
  { name: 'lead', wave: 'pulse', vol: .13, notes: 'A4 - - C5 - E5 | F5 - - E5 - - | D5 - - C5 - B4 | C5 - - - - - | A4 - - C5 - E5 | F5 - - A5 - - | G#5 - - - - - | A5 - - - . . | E5 - - D5 - C5 | B4 - - C5 - D5 | C5 - - B4 - A4 | G#4 - - - - - | F4 - - A4 - C5 | E5 - - D5 - C5 | B4 - - G#4 - B4 | A4 - - - - .' },
  { name: 'bass', wave: 'triangle', vol: .2, notes: 'A2 . . E3 . . | F2 . . C3 . . | D2 . . A2 . . | E2 . . B2 . . | A2 . . E3 . . | F2 . . C3 . . | E2 . . B2 . . | A2 . . E3 . . | C3 . . G3 . . | G2 . . D3 . . | A2 . . E3 . . | E2 . . B2 . . | F2 . . C3 . . | C3 . . G3 . . | E2 . . B2 . . | A2 . . E3 . .' },
  { name: 'pad', wave: 'sine', vol: .07, notes: 'A3 - - - - - | A3 - - - - - | F3 - - - - - | E3 - - - - - | A3 - - - - - | C4 - - - - - | B3 - - - - - | A3 - - - - - | G3 - - - - - | D3 - - - - - | E3 - - - - - | E3 - - - - - | F3 - - - - - | G3 - - - - - | G#3 - - - - - | A3 - - - - -' },
  { name: 'tick', wave: 'drums', vol: .08, notes: 'h . . . h . | h . . . h . | h . . . h . | h . . . h .' }
] });
S7.song('room7', { bpm: 112, steps: 2, tracks: [
  { name: 'box', wave: 'triangle', vol: .12, notes: 'E6 . B5 . G5 . | A5 . E6 . C6 . | B5 . G5 . E5 . | F#5 . A5 . B5 . | E6 . B5 . G5 . | A5 . C6 . E6 . | D6 . B5 . G5 . | E5 - - - . .' },
  { name: 'low', wave: 'triangle', vol: .08, notes: 'E4 . . . B4 . | A3 . . . E4 . | G3 . . . D4 . | B3 . . . F#4 . | E4 . . . B4 . | A3 . . . E4 . | G3 . . . B3 . | E3 . . . . .' },
  { name: 'clock', wave: 'drums', vol: .05, notes: 'h . h . h . | h . h . h .' }
] });
S7.song('hotel', { bpm: 96, steps: 2, tracks: [
  { name: 'bass', wave: 'triangle', vol: .22, notes: 'D3 . F3 . A3 . C4 . | B2 . D3 . F3 . G#3 . | G2 . Bb2 . D3 . F3 . | A2 . C#3 . E3 . G3 . | D3 . F3 . A3 . C4 . | Bb2 . D3 . F3 . A3 . | E3 . G3 . Bb3 . D4 . | A2 . G2 . F2 . E2 .' },
  { name: 'trumpet', wave: 'square', vol: .07, notes: '. . A4 - - F4 E4 - | D4 - - - . . . . | . . G4 - Bb4 - A4 - | E4 - - - . . C#5 - | D5 - - C5 A4 - - - | . . F4 - G4 A4 - - | G4 - - F4 E4 - D4 - | C#4 - - - - - . .' },
  { name: 'brush', wave: 'drums', vol: .06, notes: 'h . h h h . h h | h . h h h . h h' },
  { name: 'danger', wave: 'saw', vol: .09, on: false, notes: 'D3 G#3 . . D3 G#3 . . | . . . . D#4 - . . | D3 G#3 . . D3 G#3 . . | . . A3 D#4 . . . .' },
  { name: 'dangerkick', wave: 'drums', vol: .14, on: false, notes: 'k . . k . . k . | k . . k . k . .' }
] });
S7.song('shaft', { bpm: 132, steps: 2, tracks: [
  { name: 'bell', wave: 'sine', vol: .14, notes: 'C6 . . . G5 . . . | C6 . . . . . G5 . | C6 . . . G5 . . . | E6 . D6 . C6 . . .' },
  { name: 'bass', wave: 'square', vol: .1, notes: 'C3 C3 . C3 Eb3 . C3 . | Ab2 Ab2 . Ab2 G2 . G2 . | C3 C3 . C3 Eb3 . F3 . | G2 . G2 . B2 . D3 .' },
  { name: 'pulse', wave: 'pulse12', vol: .06, notes: 'C5 Eb5 G5 Eb5 C5 Eb5 G5 Eb5 | Ab4 C5 Eb5 C5 G4 B4 D5 B4' },
  { name: 'drum', wave: 'drums', vol: .16, notes: 'k . h . s . h . | k . h k s . h h' },
  { name: 'danger', wave: 'saw', vol: .07, on: false, notes: 'C4 - - - F#4 - - - | C4 - - - G4 - - -' }
] });
S7.song('village', { bpm: 118, steps: 2, tracks: [
  { name: 'oom', wave: 'triangle', vol: .22, notes: 'D2 . A2 . D2 . A2 . | G2 . D3 . G2 . D3 . | A2 . E3 . A2 . E3 . | D2 . A2 . A1 . C#2 .' },
  { name: 'pah', wave: 'pulse', vol: .06, notes: '. F4 . F4 . F4 . F4 | . Bb4 . Bb4 . Bb4 . Bb4 | . C#5 . C#5 . E4 . E4 | . F4 . A4 . E4 . G4' },
  { name: 'accordion', wave: 'pulse12', vol: .08, notes: 'A4 - D5 - F5 - E5 D5 | D5 - - Bb4 - - G4 - | E4 - A4 - C#5 - E5 - | F5 - E5 - D5 - - - | A4 - D5 - F5 - A5 G5 | G5 - - F5 - - E5 - | E5 - D5 - C#5 - Bb4 - | A4 - - - D5 - - .' },
  { name: 'danger', wave: 'drums', vol: .16, on: false, notes: 's s s s s . s . | s s s s s s k .' },
  { name: 'danger2', wave: 'saw', vol: .06, on: false, notes: 'D3 . D#3 . D3 . D#3 . | D3 . G#3 . D3 . G#3 .' }
] });
S7.song('palais', { bpm: 100, steps: 4, tracks: [
  { name: 'arp', wave: 'sine', vol: .1, notes: 'E4 G4 B4 E5 B4 G4 E4 G4 | C4 E4 G4 C5 G4 E4 C4 E4 | A3 C4 E4 A4 E4 C4 A3 C4 | B3 D#4 F#4 B4 F#4 D#4 B3 D#4' },
  { name: 'type', wave: 'drums', vol: .05, notes: 'h . h h . h . h | . h h . h . h h' },
  { name: 'pad', wave: 'triangle', vol: .07, notes: 'E3 - - - - - - - | C3 - - - - - - - | A2 - - - - - - - | B2 - - - - - - -' },
  { name: 'danger', wave: 'square', vol: .06, on: false, notes: 'E5 . . E5 . . F5 . | . . E5 . . . . . | E5 . . E5 . . A#5 . | . . . . B5 . . .' }
] });
// the band: four musicians, four tracks; a note sounding is a warm spot showing (the boss reads these strings)
S7.song('band', { bpm: 112, steps: 2, tracks: [
  { name: 'tuba', wave: 'triangle', vol: .24, notes: 'G2 . . . D2 . . . | G2 . . . D2 . . . | C2 . . . G2 . . . | D2 . . . D2 . A2 .' },
  { name: 'accordion', wave: 'pulse12', vol: .08, notes: '. . B4 D5 . . B4 D5 | . . B4 D5 . . G4 B4 | . . C5 E5 . . C5 E5 | . . A4 C5 . . F#4 A4' },
  { name: 'trumpet', wave: 'square', vol: .07, notes: 'D5 - - - . . . . | . . . . G5 - E5 - | . . . . . . . . | F#5 - - - A5 - . .' },
  { name: 'snare', wave: 'drums', vol: .16, notes: 'k . s . k . s s | k . s . k s s s' }
] });
S7.song('blackrun', { bpm: 138, steps: 2, tracks: [
  { name: 'bass', wave: 'saw', vol: .1, notes: 'E2 E2 E3 E2 G2 G2 G3 G2 | A2 A2 A3 A2 B2 B2 B3 D3 | C3 C3 C4 C3 G2 G2 G3 G2 | A2 A2 A3 A2 B2 B2 D#3 F#3' },
  { name: 'yodel', wave: 'pulse', vol: .09, notes: 'E5 - E6 - B5 - G5 - | A5 - A6 - E6 - . . | G5 - G6 - D6 - B5 - | B5 - F#5 - B4 - . . | E5 - E6 - B5 - G5 - | A5 - C6 - E6 - D6 - | C6 - B5 - A5 - G5 - | F#5 - - - B5 - . .' },
  { name: 'drum', wave: 'drums', vol: .16, notes: 'k . h . s . h k | k . h k s . h h' },
  { name: 'danger', wave: 'sine', vol: .1, on: false, notes: 'E4 - - - - - - - | C4 - - - - - - - | A3 - - - - - - - | B3 - - - - - - -' },
  { name: 'choir', wave: 'triangle', vol: .1, on: false, notes: 'B4 - - - - - - - | G4 - - - - - - - | E4 - - - - - - - | F#4 - - - - - - -' }
] });
S7.song('gondola', { bpm: 72, steps: 2, tracks: [
  { name: 'pad', wave: 'sine', vol: .12, notes: 'D3 - - - - - - - | F3 - - - - - - - | C3 - - - - - - - | Bb2 - - - A2 - - -' },
  { name: 'pad2', wave: 'triangle', vol: .06, notes: 'A4 - - - G4 - - - | A4 - - - C5 - - - | G4 - - - E4 - - - | F4 - - - E4 - - -' },
  { name: 'heart', wave: 'drums', vol: .14, notes: 'k . k . . . . . | k . k . . . . .' },
  { name: 'creak', wave: 'drums', vol: .04, notes: '. . . . . . t . | . . . . . t . .' },
  { name: 'danger', wave: 'saw', vol: .06, on: false, notes: 'D4 . . D4 . . Eb4 . | D4 . . D4 . . A3 .' }
] });
S7.song('archive', { bpm: 66, steps: 4, tracks: [
  { name: 'drone', wave: 'triangle', vol: .12, notes: 'D2 - - - - - - - - - - - - - - - | Eb2 - - - - - - - - - - - - - - -' },
  { name: 'bells', wave: 'sine', vol: .07, notes: 'A5 . . . D6 . . . . . F6 . . . . . | E6 . . . . . A5 . Bb5 . . . . . . .' },
  { name: 'heart', wave: 'drums', vol: .12, notes: 'k . . k . . . . . . . . . . . . | k . . k . . . . . . . . . . . .' },
  { name: 'danger', wave: 'square', vol: .05, on: false, notes: 'D5 Eb5 D5 Eb5 . . . . D5 Eb5 D5 Eb5 . . . .' }
] });
S7.song('powderking', { bpm: 128, steps: 2, tracks: [
  { name: 'oom', wave: 'triangle', vol: .2, notes: 'C3 . G2 . C3 . G2 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . D3 . | C3 . G2 . C3 . E3 .' },
  { name: 'schlager', wave: 'square', vol: .08, notes: 'E5 - G5 - C6 - G5 - | A5 - - F5 A5 - C6 - | B5 - G5 - D5 - G5 - | C6 - - - . . E5 F5 | E5 - G5 - C6 - E6 - | D6 - C6 - A5 - F5 - | G5 - B5 - D6 - B5 - | C6 - - - . . . .' },
  { name: 'chords', wave: 'pulse12', vol: .05, notes: '. E4 . E4 . E4 . E4 | . A4 . A4 . A4 . A4 | . B4 . B4 . B4 . B4 | . E4 . G4 . E4 . G4' },
  { name: 'drum', wave: 'drums', vol: .16, notes: 'k . s . k . s . | k . s . k k s s' },
  { name: 'danger', wave: 'saw', vol: .07, on: false, notes: 'C3 C#3 C3 C#3 C3 C#3 C3 C#3 | F2 F#2 F2 F#2 G2 G#2 G2 G#2' }
] });
S7.song('slalom', { bpm: 150, steps: 2, tracks: [
  { name: 'gallop', wave: 'triangle', vol: .2, notes: 'C3 . C3 C3 G2 . G2 G2 | F2 . F2 F2 G2 . G2 G2' },
  { name: 'lead', wave: 'square', vol: .07, notes: 'C6 - B5 - G5 - E5 - | F5 - A5 - G5 - - - | C6 - D6 - E6 - C6 - | B5 - G5 - D6 - - -' },
  { name: 'drum', wave: 'drums', vol: .16, notes: 'k h s h k h s s | k h s h k k s h' }
] });
S7.song('interview', { bpm: 60, steps: 2, tracks: [
  { name: 'pad', wave: 'sine', vol: .13, notes: 'C4 - - - - - - - | Ab3 - - - - - - - | F3 - - - - - - - | G3 - - - - - - -' },
  { name: 'high', wave: 'triangle', vol: .04, notes: '. . . . G5 - - - | . . . . Eb5 - - - | . . . . C5 - - - | . . . . D5 - B4 -' }
] });
S7.song('echorun', { bpm: 160, steps: 2, tracks: [
  { name: 'bass', wave: 'saw', vol: .09, notes: 'A2 A2 A3 A2 C3 C3 C4 C3 | D3 D3 D4 D3 E3 E3 E4 E3' },
  { name: 'lead', wave: 'pulse', vol: .08, notes: 'A5 - C6 - E6 - C6 - | D6 - F6 - E6 - B5 - | A5 - E6 - A6 - E6 - | G#6 - E6 - B5 - E6 -' },
  { name: 'drum', wave: 'drums', vol: .18, notes: 'k h s h k k s h' }
] });
S7.song('epilogue', { bpm: 70, steps: 2, tracks: [
  { name: 'box', wave: 'triangle', vol: .1, notes: 'E6 . B5 . G5 . | A5 . E6 . C6 . | B5 . G5 . E5 . | F#5 . A5 . B5 . | E6 . B5 . G5 . | A5 . C6 . E6 . | D6 . B5 . G5 . | E5 - - - . .' },
  { name: 'pad', wave: 'sine', vol: .08, notes: 'E3 - - - - - | A2 - - - - - | G2 - - - - - | B2 - - - - -' }
] });
S7.song('stage', { bpm: 120, steps: 4, tracks: [
  { name: 'a', wave: 'square', vol: .12, notes: 'A4 . C5 . E5 . A5 - - - - - - - . . | G#5 - - - E5 - - - A5 - - - - - - -' },
  { name: 'b', wave: 'triangle', vol: .2, notes: 'A2 - - - - - - - - - - - - - - - | E2 - - - - - - - A2 - - - - - - -' }
] });
S7.song('gameover', { bpm: 80, steps: 2, tracks: [
  { name: 'a', wave: 'square', vol: .1, notes: 'E5 - D5 - C5 - B4 - | A4 - - - G#4 - - - | A4 - - - - - - - | . . . . . . . .' },
  { name: 'b', wave: 'triangle', vol: .18, notes: 'A2 - - - - - - - | E2 - - - - - - - | A1 - - - - - - - | . . . . . . . .' }
] });
S7.song('rank', { bpm: 140, steps: 2, tracks: [
  { name: 'a', wave: 'pulse', vol: .12, notes: 'C5 E5 G5 C6 - - E6 - | D6 - C6 - - - . .' },
  { name: 'b', wave: 'triangle', vol: .18, notes: 'C3 - - - G2 - - - | C3 - - - . . . .' }
] });
void rep;
