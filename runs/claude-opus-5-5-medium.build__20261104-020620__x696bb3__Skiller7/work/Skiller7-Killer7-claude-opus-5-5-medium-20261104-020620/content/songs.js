/* SKILLER7 content — the music, written in the engine's step notation (one token a step: a note, '-' hold, '.' rest).
 * "Alpine noir": pulse accordion chords, triangle and saw oompah bass, pulse12 zither arpeggios, sine pads, brushed
 * hats. Every play song has a 'danger' layer (on: false) that comes in while Whiteouts are near. */
const rp = (s, n) => Array(n).fill(s).join(' | ');
const S_ = (id, song) => (S7.SONGS[id] = song);

S_('title', { bpm: 84, steps: 2, tracks: [
  { name: 'lead', wave: 'pulse', vol: .13, vib: [5, .015], notes: 'A4 - - - C5 - E5 - | F5 - - - E5 - D5 - | E5 - - - A4 - G#4 - | A4 - - - - - . . | A4 - - - C5 - E5 - | F5 - - - A5 - G#5 - | A5 - - - E5 - C5 - | B4 - - - - - . .' },
  { name: 'waltz', wave: 'triangle', vol: .2, notes: rp('A2 . E3 . E3 .', 2) + ' | ' + rp('D2 . F3 . F3 .', 2) + ' | ' + rp('E2 . B2 . E3 .', 2) + ' | ' + rp('A2 . E3 . A3 .', 2) },
  { name: 'pad', wave: 'sine', vol: .07, notes: 'A3 - - - - - - - - - - - | D3 - - - - - - - - - - - | E3 - - - - - - - - - - - | A3 - - - - - - - - - - -' },
  { name: 'bells', wave: 'pulse12', vol: .05, notes: rp('. . . . . . . . . . E6 .', 3) + ' | . . . . . . . . G#6 . A6 .' }
] });
S_('room7', { bpm: 96, steps: 2, tracks: [
  { name: 'box', wave: 'triangle', vol: .14, notes: 'E6 . G6 . B6 . | A6 . G6 . E6 . | D6 . F#6 . A6 . | G6 . F#6 . D6 . | C6 . E6 . G6 . | B5 . C6 . E6 . | D6 - - - B5 . | E6 - - - . .' },
  { name: 'bass', wave: 'sine', vol: .12, notes: 'E3 . . . . . | A2 . . . . . | D3 . . . . . | G2 . . . . . | C3 . . . . . | A2 . . . . . | B2 . . . . . | E2 . . . . .' },
  { name: 'tick', wave: 'drums', vol: .05, notes: rp('t . t . t .', 8) }
] });
S_('hotel', { bpm: 92, steps: 2, tracks: [
  { name: 'walk', wave: 'triangle', vol: .22, notes: 'D2 . F2 . A2 . C3 . | Bb1 . D2 . F2 . A2 . | G1 . Bb1 . D2 . F2 . | A1 . C#2 . E2 . G2 .' },
  { name: 'trumpet', wave: 'square', vol: .07, vib: [5, .015], notes: 'D4 - - - F4 - E4 D4 | . . . . . . . . | Bb3 - - - D4 - C4 Bb3 | A3 - - - . . . . | D4 - F4 - A4 - G4 F4 | E4 - - - . . . . | F4 - E4 - D4 - C#4 - | D4 - - - . . . .' },
  { name: 'brush', wave: 'drums', vol: .07, notes: rp('h . h h h . h h', 4) },
  { name: 'danger', wave: 'saw', vol: .07, on: false, notes: 'D3 . . D#3 . . D3 . | . . G#3 . . . . . | Bb2 . . B2 . . Bb2 . | . . E3 . F3 . . .' }
] });
S_('shaft', { bpm: 128, steps: 4, tracks: [
  { name: 'ding', wave: 'pulse12', vol: .08, notes: 'E6 . . . . . . . E6 . . . . . . . | E6 . . . . . . . E6 . . . B5 . . .' },
  { name: 'pulse', wave: 'saw', vol: .11, notes: rp('E2 . E2 . E3 . E2 . G2 . E2 . F2 . E2 .', 2) },
  { name: 'kick', wave: 'drums', vol: .12, notes: rp('k . . . s . . . k . k . s . . .', 2) },
  { name: 'danger', wave: 'square', vol: .06, notes: 'E4 - - - F4 - - - E4 - - - B3 - - - | E4 - - - G4 - F4 - E4 - - - - - - -' }
] });
S_('village', { bpm: 116, steps: 2, tracks: [
  { name: 'oompah', wave: 'triangle', vol: .22, notes: rp('A2 . E3 . A2 . E3 .', 2) + ' | ' + rp('D2 . A2 . D2 . A2 .', 1) + ' | ' + rp('E2 . B2 . E2 . G#2 .', 1) },
  { name: 'accordion', wave: 'pulse', vol: .08, notes: rp('. [A3] . [A3] . [A3] . [A3]', 1).replace(/\[A3\]/g, 'C4') + ' | . E4 . E4 . E4 . E4 | . F4 . F4 . F4 . F4 | . E4 . E4 . G#4 . G#4' },
  { name: 'lead', wave: 'square', vol: .06, vib: [5, .015], notes: 'E5 - C5 - A4 - C5 - | E5 - A5 - G#5 - E5 - | F5 - D5 - A4 - D5 - | E5 - - - . . . .' },
  { name: 'danger', wave: 'drums', vol: .09, on: false, notes: rp('s s s s s . s . s s s s s s s s', 1) }
] });
S_('palais', { bpm: 104, steps: 4, tracks: [
  { name: 'arp', wave: 'sine', vol: .09, notes: rp('C4 E4 G4 B4 C5 B4 G4 E4', 2) + ' | ' + rp('A3 C4 E4 G4 A4 G4 E4 C4', 2) },
  { name: 'type', wave: 'drums', vol: .05, notes: rp('t . . t . t . . t . t t . . t .', 2) },
  { name: 'pad', wave: 'triangle', vol: .08, notes: 'C3 - - - - - - - - - - - - - - - | A2 - - - - - - - - - - - - - - -' },
  { name: 'danger', wave: 'saw', vol: .05, on: false, notes: 'C3 . . C#3 . . C3 . . . . . G3 . F#3 . | A2 . . A#2 . . A2 . . . . . E3 . D#3 .' }
] });
/* the band: each musician's track is their window. Kill one and their layer goes; the tempo climbs 112 > 124 > 136 > 148 */
S_('band', { bpm: 112, steps: 4, tracks: [
  { name: 'tuba', wave: 'triangle', vol: .26, notes: 'C2 - - - . . . . G1 - - - . . . . | C2 - - - . . . . G1 - - - . . . . | F1 - - - . . . . C2 - - - . . . . | G1 - - - . . . . G1 - - - B1 - - -' },
  { name: 'accordion', wave: 'pulse', vol: .09, notes: '. . . . E4 - - - . . . . E4 - - - | . . . . E4 - - - . . . . G4 - - - | . . . . F4 - - - . . . . A4 - - - | . . . . D4 - - - . . . . D4 - F4 -' },
  { name: 'trumpet', wave: 'square', vol: .07, notes: 'G4 - E4 - G4 - C5 - . . . . . . . . | . . . . . . . . E5 - D5 - C5 - - - | A4 - C5 - F5 - A5 - . . . . . . . . | . . . . . . . . G5 - F5 - D5 - B4 -' },
  { name: 'snare', wave: 'drums', vol: .1, notes: 's s . . s s . . s s . . s s s s | . . s s . . s s . . s s s s s s | s s . . s s . . s s . . s s s s | s s s s s s s s . . . . s . s .' }
] });
S_('blackrun', { bpm: 150, steps: 4, tracks: [
  { name: 'bass', wave: 'saw', vol: .12, notes: rp('A1 . A2 . A1 . A2 . F1 . F2 . G1 . G2 .', 2) },
  { name: 'yodel', wave: 'pulse', vol: .07, vib: [5, .015], notes: 'A4 - E5 - A5 - E5 - C5 - A4 - E5 - . . | F4 - C5 - F5 - C5 - G4 - D5 - G5 - . .' },
  { name: 'drums', wave: 'drums', vol: .11, notes: rp('k . h . s . h . k k h . s . h h', 2) },
  { name: 'danger', wave: 'sine', vol: .08, on: false, notes: 'A3 - - - - - - - E4 - - - - - - - | F3 - - - - - - - G3 - - - - - - -' }
] });
S_('gondola', { bpm: 70, steps: 4, tracks: [
  { name: 'pad', wave: 'sine', vol: .1, notes: 'D3 - - - - - - - - - - - - - - - | F3 - - - - - - - - - - - - - - - | C3 - - - - - - - - - - - - - - - | A2 - - - - - - - - - - - - - - -' },
  { name: 'creak', wave: 'drums', vol: .05, notes: rp('o . . . . . c . . . o . . . . .', 2) },
  { name: 'heart', wave: 'drums', vol: .09, notes: rp('k . k . . . . . . . . . . . . .', 2) },
  { name: 'danger', wave: 'pulse12', vol: .05, on: false, notes: 'D5 . F5 . A5 . F5 . D5 . F5 . A5 . C6 . | C5 . E5 . G5 . E5 . A4 . C5 . E5 . G5 .' }
] });
S_('archive', { bpm: 66, steps: 4, tracks: [
  { name: 'drone', wave: 'triangle', vol: .12, notes: 'E2 - - - - - - - - - - - - - - - | E2 - - - - - - - - - - - - - - - | F2 - - - - - - - - - - - - - - - | E2 - - - - - - - - - - - - - - -' },
  { name: 'bells', wave: 'sine', vol: .08, notes: 'B5 . . . E6 . . . . . G6 . . . . . | . . F#6 . . . . . B5 . . . . . . . | C6 . . . F6 . . . . . A6 . . . . . | . . G6 . . . . . E6 . . . . . . .' },
  { name: 'heart', wave: 'drums', vol: .07, notes: rp('k . k . . . . . . . . . . . . .', 4) },
  { name: 'danger', wave: 'saw', vol: .05, on: false, notes: 'E3 . . F3 . . E3 . . . . . A#3 . . . | E3 . . F3 . . E3 . . . . . B3 . . .' }
] });
S_('powderking', { bpm: 132, steps: 2, tracks: [
  { name: 'schlager', wave: 'square', vol: .07, notes: 'C5 - E5 - G5 - E5 - | F5 - A5 - C6 - A5 - | G5 - - - E5 - C5 - | D5 - - - - - . . | C5 - E5 - G5 - C6 - | B5 - A5 - G5 - F5 - | E5 - G5 - D5 - F5 - | C5 - - - - - . .' },
  { name: 'oompah', wave: 'triangle', vol: .2, notes: rp('C2 . G2 . C2 . G2 .', 2) + ' | ' + rp('F1 . C2 . G1 . D2 .', 2) },
  { name: 'drums', wave: 'drums', vol: .1, notes: rp('k . s . k . s . k . s . k s s s', 2) },
  { name: 'danger', wave: 'saw', vol: .06, on: false, notes: 'C3 . . C#3 . . C3 . | F2 . . F#2 . . G2 . | C3 . . C#3 . . C3 . | G2 . . G#2 . . G2 .' }
] });
S_('interview', { bpm: 60, steps: 4, tracks: [{ name: 'pad', wave: 'sine', vol: .1, notes: 'A2 - - - - - - - - - - - - - - - | F2 - - - - - - - - - - - - - - -' }, { name: 'wind', wave: 'drums', vol: .03, notes: rp('o . . . . . . . . . . . . . . .', 2) }] });
S_('echorun', { bpm: 160, steps: 4, tracks: [
  { name: 'bass', wave: 'saw', vol: .12, notes: rp('E2 . E3 . E2 . E3 . C2 . C3 . D2 . D3 .', 2) },
  { name: 'lead', wave: 'pulse', vol: .07, notes: 'E5 . G5 . B5 . E6 . D6 . B5 . G5 . A5 . | C6 . B5 . G5 . E5 . D5 . E5 . F#5 . G5 .' },
  { name: 'drums', wave: 'drums', vol: .11, notes: rp('k . h . s . h . k . h k s . h h', 2) }
] });
S_('credits', { bpm: 88, steps: 2, tracks: [
  { name: 'lead', wave: 'triangle', vol: .14, notes: 'E5 - - - D5 - C5 - | B4 - - - A4 - - - | C5 - - - B4 - A4 - | G#4 - - - - - - - | A4 - C5 - E5 - A5 - | G#5 - - - E5 - - - | F5 - E5 - D5 - C5 - | B4 - - - E5 - - -' },
  { name: 'bass', wave: 'sine', vol: .14, notes: 'A2 - - - - - - - | E2 - - - - - - - | F2 - - - - - - - | E2 - - - - - - - | A2 - - - - - - - | E2 - - - - - - - | D2 - - - - - - - | E2 - - - - - - -' }
] });
S_('stage', { bpm: 140, steps: 2, loop: false, tracks: [{ wave: 'square', vol: .12, notes: 'A4 C5 E5 A5 - - G#5 - A5 - - - . .' }, { wave: 'triangle', vol: .2, notes: 'A2 - - - - - E2 - A2 - - - . .' }] });
S_('gameover', { bpm: 70, steps: 2, loop: false, tracks: [{ wave: 'triangle', vol: .16, notes: 'E4 - D4 - C4 - B3 - A3 - - - - - . .' }, { wave: 'sine', vol: .12, notes: 'A2 - - - - - - - E2 - - - - - . .' }] });
S_('rank', { bpm: 150, steps: 2, loop: false, tracks: [{ wave: 'pulse', vol: .1, notes: 'C5 E5 G5 C6 . C6 - - .' }] });
