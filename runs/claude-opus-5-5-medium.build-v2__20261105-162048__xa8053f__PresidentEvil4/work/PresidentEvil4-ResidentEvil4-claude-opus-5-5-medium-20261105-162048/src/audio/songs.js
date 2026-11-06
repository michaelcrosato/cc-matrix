// Original compositions, Song data. Authored loud (0.5-0.8) so they carry at the default 10 percent music volume.
const r = (s, n) => Array(n).fill(s).join(' ');
const drone = { wave: 'saw', attack: 0.3, decay: 1.2, volume: 0.42 }, bell = { wave: 'triangle', decay: 1.5, volume: 0.66 }, pluck = { wave: 'triangle', decay: 0.36, volume: 0.75 };
const sq = { wave: 'square', duty: 0.25, decay: 0.16, volume: 0.42 }, bass = { wave: 'square', duty: 0.5, decay: 0.2, volume: 0.6 }, hat = { wave: 'noise', decay: 0.04, volume: 0.28 }, kick = { wave: 'triangle', decay: 0.14, volume: 0.9 }, snare = { wave: 'noise', decay: 0.12, volume: 0.42 };
export const SONGS = {
  title: { bpm: 66, stepsPerBeat: 2, tracks: { drone, bell, lead: { wave: 'triangle', decay: 0.9, volume: 0.52 } }, patterns: {
    a: { drone: 'D2 - - - - - - - A1 - - - - - - -', bell: 'D3 . . . . . . . . . . . A2 . . .', lead: '. . . . F4 . E4 . . . D4 . . . . .' },
    b: { drone: 'Bb1 - - - - - - - A1 - - - - - - -', bell: 'D3 . . . . . . . Bb2 . . . A2 . . .', lead: '. . A4 . G4 . F4 . . . E4 . . . C#4 .' } }, order: ['a', 'a', 'b', 'a'] },
  explore: { bpm: 72, tracks: { bass: pluck, lead: { wave: 'triangle', decay: 0.7, volume: 0.42 }, air: { wave: 'noise', decay: 0.5, attack: 0.1, volume: 0.05 } }, patterns: {
    a: { bass: 'A1 . . . . . . . . . . . E2 . . . A1 . . . . . . . . . . . . . . .', lead: r('.', 32), air: 'C7 ' + r('.', 31) },
    b: { bass: 'A1 . . . . . . . . . . . E2 . . . F1 . . . . . . . E1 . . . . . . .', lead: '. . . . C4 . . . B3 . . . . . . . . . . . E4 . . . D#4 . . . . . . .', air: 'C7 ' + r('.', 31) } }, order: ['a', 'b', 'a', 'a', 'b'] },
  combat: { bpm: 132, tracks: { o: sq, bass, hat, kick, sn: snare }, patterns: {
    a: { o: 'E3 E3 G3 E3 B3 E3 G3 E3 E3 E3 G3 E3 C4 B3 G3 E3', bass: 'E2 . . E2 . . E2 . E2 . . E2 . . G2 .', hat: 'C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 C8', kick: 'C2 . . . . . C2 . C2 . . . . . C2 .', sn: '. . . . C6 . . . . . . . C6 . . .' },
    b: { o: 'C3 C3 E3 C3 G3 C3 E3 C3 B2 B2 D#3 B2 F#3 B2 D#3 F#3', bass: 'C2 . . C2 . . C2 . B1 . . B1 . . B1 .', hat: 'C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 C8', kick: 'C2 . . . . . C2 . C2 . . . . . C2 .', sn: '. . . . C6 . . . . . . . C6 . C6 .' } }, order: ['a', 'a', 'b', 'a'] },
  siege: { bpm: 120, tracks: { bass, kick, sn: snare, chant: { wave: 'saw', attack: 0.04, decay: 0.3, volume: 0.42, vibrato: { depth: 0.4, rate: 5 } }, chant2: { wave: 'square', duty: 0.25, attack: 0.04, decay: 0.3, volume: 0.26 } }, patterns: {
    a: { bass: 'D2 . . . D2 . . . F2 . . . E2 . . .', kick: 'C2 . . C2 . . C2 . C2 . . C2 . . C2 .', sn: '. . . . C6 . . . . . . . C6 . . .', chant: 'D3 . D3 . F3 . D3 . . . E3 . D3 . . .', chant2: 'A2 . A2 . C3 . A2 . . . B2 . A2 . . .' },
    b: { bass: 'Bb1 . . . Bb1 . . . A1 . . . A1 . . .', kick: 'C2 . . C2 . . C2 . C2 . C2 C2 . . C2 .', sn: '. . . . C6 . . . . . . . C6 . C6 .', chant: 'F3 . F3 . G3 . F3 . E3 . E3 . C#3 . . .', chant2: 'D3 . D3 . D3 . D3 . C#3 . C#3 . A2 . . .' } }, order: ['a', 'a', 'b', 'a'] },
  shop: { bpm: 104, tracks: { acc: { wave: 'square', duty: 0.25, decay: 0.2, volume: 0.42, vibrato: { depth: 0.18, rate: 9 } }, acc2: { wave: 'square', duty: 0.5, decay: 0.2, volume: 0.22, vibrato: { depth: 0.3, rate: 7 } }, oom: { wave: 'triangle', decay: 0.18, volume: 0.7 }, pah: { wave: 'square', duty: 0.25, decay: 0.08, volume: 0.22 } }, patterns: {
    a: { acc: 'G4 . B4 . D5 . B4 . A4 . C5 . E5 . C5 .', acc2: 'D4 . G4 . B4 . G4 . F#4 . A4 . C5 . A4 .', oom: 'G2 . . . D2 . . . D2 . . . A2 . . .', pah: '. . G3 . . . B3 . . . F#3 . . . C4 .' },
    b: { acc: 'B4 . D5 . G5 . D5 . E5 D5 C5 . A4 . F#4 .', acc2: 'G4 . B4 . D5 . B4 . C5 B4 A4 . F#4 . D4 .', oom: 'G2 . . . B2 . . . C3 . . . D3 . . .', pah: '. . D4 . . . D4 . . . E4 . . . F#4 .' } }, order: ['a', 'b', 'a', 'b'] },
  safe: { bpm: 60, stepsPerBeat: 2, tracks: { ch: { wave: 'triangle', attack: 0.1, decay: 1.4, volume: 0.48 }, ch2: { wave: 'triangle', attack: 0.1, decay: 1.4, volume: 0.36 }, tick: { wave: 'square', duty: 0.125, decay: 0.03, volume: 0.06 } }, patterns: {
    a: { ch: 'E4 . . . D4 . . . C4 . . . D4 . . .', ch2: 'C3 . . . G2 . . . A2 . . . G2 . . .', tick: 'C6 . C6 C6 . . C6 . C6 . . C6 C6 . . .' } }, order: ['a'] },
  boss: { bpm: 150, tracks: { brass: { wave: 'saw', attack: 0.01, decay: 0.2, volume: 0.42 }, bass, toll: { wave: 'triangle', decay: 1, volume: 0.62 }, hat, kick, sn: snare }, patterns: {
    a: { brass: 'C4 . C4 Eb4 . C4 G4 . F4 . Eb4 . D4 . B3 .', bass: 'C2 C2 . C2 C2 . C2 . Ab1 Ab1 . Ab1 G1 . G1 .', toll: 'C3 . . . . . . . . . . . . . . .', hat: 'C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8', kick: 'C2 . . C2 . . C2 . C2 . . C2 . . C2 .', sn: '. . . . C6 . . . . . . . C6 . . .' },
    b: { brass: 'Ab4 . G4 F4 . Eb4 F4 . G4 . C5 . B4 . G4 .', bass: 'F1 F1 . F1 F1 . F1 . G1 G1 . G1 G1 . B1 .', toll: 'C3 . . . . . . . . . . . . . . .', hat: 'C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8', kick: 'C2 . . C2 . . C2 . C2 . . C2 . C2 C2 .', sn: '. . . . C6 . . . . . . . C6 . C6 C6' } }, order: ['a', 'a', 'b', 'a'] },
  onhold: { bpm: 96, tracks: { vib: { wave: 'sine', decay: 0.5, volume: 0.75, vibrato: { depth: 0.2, rate: 6 } }, pad: { wave: 'triangle', attack: 0.05, decay: 0.6, volume: 0.42 }, bass: { wave: 'triangle', decay: 0.26, volume: 0.62 }, tick: { wave: 'noise', decay: 0.02, volume: 0.1 } }, patterns: {
    a: { vib: 'E5 . G5 . A5 . G5 E5 . . D5 . E5 . C5 .', pad: 'C4 . . . E4 . . . F4 . . . G4 . . .', bass: 'C3 . . . G2 . . . F2 . . . G2 . . .', tick: 'C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 .' },
    b: { vib: 'A5 . C6 . A5 G5 E5 . D5 E5 F5 . E5 . D5 .', pad: 'A3 . . . C4 . . . D4 . . . G3 . . .', bass: 'A2 . . . E2 . . . D2 . . . G2 . . .', tick: 'C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 .' } }, order: ['a', 'b'] },
  tide: { bpm: 112, tracks: { b: bass, o: { wave: 'square', duty: 0.125, decay: 0.14, volume: 0.32 }, hat, kick }, patterns: {
    a: { b: 'A1 . A1 . A1 . A1 . A1 . A1 . A1 . A1 .', o: 'E4 . . E4 F4 . . . E4 . . E4 F4 . G4 .', hat: 'C8 . . . C8 . . . C8 . . . C8 . C8 .', kick: 'C2 . . . . . . . C2 . . . . . . .' },
    b: { b: 'Bb1 . Bb1 . Bb1 . Bb1 . Bb1 . Bb1 . Bb1 . Bb1 .', o: 'F4 . . F4 Gb4 . . . F4 . . F4 Gb4 . Ab4 .', hat: 'C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 .', kick: 'C2 . . . C2 . . . C2 . . . C2 . . .' },
    c: { b: 'B1 . B1 . B1 . B1 . B1 . B1 . B1 . B1 .', o: 'F#4 . . F#4 G4 . . . F#4 . . F#4 G4 . A4 .', hat: 'C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8', kick: 'C2 . C2 . C2 . C2 . C2 . C2 . C2 . C2 .' } }, order: ['a', 'a', 'b', 'b', 'c', 'c'] },
  dawn: { bpm: 80, stepsPerBeat: 2, loop: false, tracks: { h: { wave: 'triangle', attack: 0.1, decay: 1.8, volume: 0.6 }, b: { wave: 'triangle', attack: 0.1, decay: 2, volume: 0.48 } }, patterns: {
    a: { h: 'A4 . . . C#5 . . . E5 . . . . . . .', b: 'A2 . . . E3 . . . A3 . . . . . . .' }, b: { h: 'F#5 . . . E5 . . . E5 - - - - - - -', b: 'D3 . . . E3 . . . A2 - - - - - - -' } }, order: ['a', 'b'] },
};
