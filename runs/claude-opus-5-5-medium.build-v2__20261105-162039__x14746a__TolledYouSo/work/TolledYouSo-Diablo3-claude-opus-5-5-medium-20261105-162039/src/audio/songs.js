// All music: Song data. Every piece states or bends the Clemency motif: D4 A4 F4 E4 | D4 C4 D4 A3.
const organ = { wave: 'square', duty: 0.25, decay: 0.5, volume: 0.09 };
const lowBell = { wave: 'sine', decay: 1.4, volume: 0.13 };
const bass = { wave: 'triangle', decay: 0.35, volume: 0.16 };
const wind = { wave: 'noise', decay: 0.8, volume: 0.015 };
const drum = { wave: 'noise', decay: 0.12, volume: 0.07 };
const kick = { wave: 'sine', freqEnd: 40, decay: 0.12, volume: 0.2 };
const lute = { wave: 'triangle', decay: 0.28, volume: 0.1 };
const R = (s) => s.trim().replace(/\s+/g, ' ');
const rests = (n) => Array(n).fill('.').join(' ');

export const SONGS = {
  vespers: { bpm: 60, stepsPerBeat: 2, tracks: { bell: lowBell, organ, bass },
    patterns: {
      a: { bell: 'D4 . A4 . F4 . E4 . D4 . C4 . D4 . A3 .', organ: rests(16), bass: rests(16) },
      b: { bell: 'D4 . A4 . F4 . E4 . D4 . C4 . D4 . A3 .', organ: 'D3 - - - A3 - - - F3 - - - E3 - - -', bass: 'D2 - - - . . . . D2 - - - . . . .' },
      c: { bell: 'F4 . A4 . C5 . A4 . G4 . F4 . E4 . D4 .', organ: 'F3 - - - C4 - - - G3 - - - D3 - - -', bass: 'F2 - - - . . . . G2 - - - . . . .' },
    }, order: ['a', 'a', 'b', 'c', 'b'] },
  lamps: { bpm: 72, tracks: { lute, bell: lowBell, bass },
    patterns: {
      a: { lute: 'D4 F4 A4 F4 D4 F4 A4 F4 C4 E4 G4 E4 C4 E4 G4 E4', bell: R(`D5 ${rests(7)} C5 ${rests(7)}`), bass: R(`D3 ${rests(7)} C3 ${rests(7)}`) },
      b: { lute: 'Bb3 D4 F4 D4 Bb3 D4 F4 D4 A3 C#4 E4 C#4 A3 C#4 E4 C#4', bell: R(`Bb4 ${rests(7)} A4 ${rests(7)}`), bass: R(`Bb2 ${rests(7)} A2 ${rests(7)}`) },
      c: { lute: 'D4 A4 F4 E4 D4 C4 D4 A3 D4 A4 F4 E4 D4 C4 D4 D4', bell: R(`${rests(8)} F4 ${rests(7)}`), bass: R(`D3 ${rests(7)} D3 ${rests(7)}`) },
    }, order: ['a', 'b', 'a', 'c'] },
  weeping: { bpm: 66, tracks: { pulse: { wave: 'triangle', decay: 0.8, volume: 0.15 }, wind, bell: { wave: 'sine', decay: 1.2, volume: 0.05 } },
    patterns: {
      a: { pulse: R(`D2 ${rests(7)} . . . . A1 ${rests(3)}`), wind: R(`C5 ${rests(15)}`), bell: rests(16) },
      b: { pulse: R(`D2 ${rests(7)} C2 ${rests(7)}`), wind: R(`${rests(8)} C4 ${rests(7)}`), bell: R(`${rests(8)} A4 . F4 . E4 . D4 .`) },
      c: { pulse: R(`F2 ${rests(7)} A1 ${rests(7)}`), wind: R(`C5 ${rests(15)}`), bell: R(`D4 . A4 . F4 . E4 . ${rests(8)}`) },
    }, order: ['a', 'a', 'b', 'a', 'c'] },
  under: { bpm: 58, stepsPerBeat: 2, tracks: { pad: { wave: 'triangle', decay: 1.6, volume: 0.13 }, far: { wave: 'sine', decay: 1.6, volume: 0.05 }, low: { wave: 'sine', decay: 1.5, volume: 0.15 } },
    patterns: {
      a: { pad: 'D3 - - - - - - - C3 - - - - - - -', far: R(`${rests(6)} A5 . ${rests(4)} F5 . . .`), low: 'D2 - - - - - - - D2 - - - - - - -' },
      b: { pad: 'Bb2 - - - - - - - A2 - - - - - - -', far: R(`D5 . ${rests(6)} ${rests(4)} E5 . . .`), low: 'Bb1 - - - - - - - A1 - - - - - - -' },
      c: { pad: 'D3 - - - A3 - - - F3 - - - E3 - - -', far: rests(16), low: 'D2 - - - - - - - A1 - - - - - - -' },
    }, order: ['a', 'b', 'a', 'c'] },
  cinders: { bpm: 96, tracks: { ost: { wave: 'square', duty: 0.125, decay: 0.15, volume: 0.09 }, bass, drum, kick },
    patterns: {
      a: { ost: 'D4 D4 F4 D4 A4 D4 F4 D4 D4 D4 F4 D4 E4 D4 C4 D4', bass: 'D2 . . D2 . . D2 . D2 . . D2 . . C2 .', drum: R('. . C6 . . . C6 . . . C6 . . . C6 C6'), kick: 'C2 . . . C2 . . . C2 . . . C2 . C2 .' },
      b: { ost: 'Bb3 Bb3 D4 Bb3 F4 Bb3 D4 Bb3 A3 A3 C#4 A3 E4 A3 C#4 A3', bass: 'Bb1 . . Bb1 . . Bb1 . A1 . . A1 . . A1 .', drum: R('. . C6 . . . C6 . . . C6 . C6 C6 C6 C6'), kick: 'C2 . . . C2 . . . C2 . . . C2 . C2 .' },
      c: { ost: 'D5 . A4 . F4 . E4 . D4 . C4 . D4 . A3 .', bass: 'D2 . D2 . D2 . D2 . C2 . C2 . A1 . A1 .', drum: R('C6 . C6 . C6 . C6 . C6 . C6 . C6 C6 C6 C6'), kick: 'C2 . . C2 . . C2 . . C2 . . C2 . . C2' },
    }, order: ['a', 'a', 'b', 'a', 'c'] },
  ledger: { bpm: 126, tracks: { brass: { wave: 'square', duty: 0.5, decay: 0.2, volume: 0.09 }, oom: { wave: 'triangle', decay: 0.18, volume: 0.17 }, snare: drum },
    patterns: {
      a: { brass: 'D4 . D4 F4 A4 . F4 . E4 . E4 G4 Bb4 . G4 .', oom: 'D2 . A2 . D2 . A2 . C2 . G2 . C2 . G2 .', snare: '. . C6 . . . C6 C6 . . C6 . . . C6 C6' },
      b: { brass: 'F4 . F4 A4 C5 . A4 . G4 . E4 C4 D4 . . .', oom: 'F2 . C3 . F2 . C3 . C2 . G2 . D2 . A2 .', snare: '. . C6 . . . C6 C6 . . C6 . C6 C6 C6 C6' },
      c: { brass: 'D5 . D5 C5 Bb4 . A4 . G4 . F4 E4 D4 . C#4 .', oom: 'Bb1 . F2 . Bb1 . F2 . A1 . E2 . A1 . E2 .', snare: 'C6 . C6 . C6 . C6 . C6 . C6 . C6 C6 C6 C6' },
    }, order: ['a', 'b', 'a', 'c'] },
  climb: { bpm: 104, tracks: { rise: { wave: 'square', duty: 0.25, decay: 0.14, volume: 0.09 }, bass, drum },
    patterns: {
      a: { rise: 'D4 F4 A4 D5 D4 F4 A4 D5 E4 G4 Bb4 E5 E4 G4 Bb4 E5', bass: 'D2 . D2 . D2 . D2 . E2 . E2 . E2 . E2 .', drum: 'C6 . C8 . C6 . C8 . C6 . C8 . C6 C8 C6 C8' },
      b: { rise: 'F4 A4 C5 F5 F4 A4 C5 F5 G4 Bb4 D5 G5 A4 C#5 E5 A5', bass: 'F2 . F2 . F2 . F2 . G2 . G2 . A2 . A2 .', drum: 'C6 . C8 . C6 . C8 . C6 C6 C8 . C6 C6 C6 C6' },
      c: { rise: 'D5 . A4 . F4 . E4 . D4 . C4 . D4 . A3 .', bass: 'D2 D2 D2 D2 C2 C2 C2 C2 Bb1 Bb1 Bb1 Bb1 A1 A1 A1 A1', drum: 'C6 C8 C6 C8 C6 C8 C6 C8 C6 C8 C6 C8 C6 C6 C6 C6' },
    }, order: ['a', 'b', 'a', 'b', 'c'] },
  // Malison's Eventide: the motif one semitone off, because the bell is cracked.
  eventide: { bpm: 138, tracks: { stab: { wave: 'square', duty: 0.5, decay: 0.2, volume: 0.09 }, cracked: { wave: 'saw', decay: 0.3, volume: 0.07 }, bass, drum, kick },
    patterns: {
      a: { stab: 'D4 . . D4 . . D4 . F4 . . F4 . . E4 .', cracked: 'Eb4 . Bb4 . F#4 . F4 . Eb4 . C#4 . Eb4 . Bb3 .', bass: 'D2 D2 . D2 D2 . D2 . D2 D2 . D2 C2 . C2 .', drum: '. . C6 . . . C6 . . . C6 . . C6 C6 C6', kick: 'C2 . . . C2 . . . C2 . . . C2 . . .' },
      b: { stab: 'Bb3 . . Bb3 . . Bb3 . A3 . . A3 . . A3 .', cracked: 'B4 . F#5 . C#5 . C5 . B4 . A4 . B4 . F#4 .', bass: 'Bb1 Bb1 . Bb1 Bb1 . Bb1 . A1 A1 . A1 A1 . A1 .', drum: '. . C6 . . . C6 . . . C6 . C6 C6 C6 C6', kick: 'C2 . . C2 C2 . . . C2 . . C2 C2 . . .' },
      c: { stab: 'D5 . . . C#5 . . . C5 . . . B4 . . .', cracked: 'Eb4 Bb4 F#4 F4 Eb4 C#4 Eb4 Bb3 Eb4 Bb4 F#4 F4 Eb4 C#4 Eb4 Bb3', bass: 'D2 . D2 . C#2 . C#2 . C2 . C2 . B1 . B1 .', drum: 'C6 . C6 . C6 . C6 . C6 . C6 . C6 C6 C6 C6', kick: 'C2 . C2 . C2 . C2 . C2 . C2 . C2 . C2 .' },
    }, order: ['a', 'a', 'b', 'a', 'c'] },
  eventide3: { bpm: 138, tracks: { stab: { wave: 'square', duty: 0.5, decay: 0.3, volume: 0.09 }, cracked: { wave: 'saw', decay: 0.5, volume: 0.09 }, bell: lowBell },
    patterns: {
      a: { stab: 'D4 . . . . . . . . . . . . . . .', cracked: 'Eb4 . . . Bb4 . . . F#4 . . . F4 . . .', bell: 'D3 . . . . . . . A2 . . . . . . .' },
      b: { stab: 'C4 . . . . . . . . . . . . . . .', cracked: 'Eb4 . . . C#4 . . . Eb4 . . . Bb3 . . .', bell: 'C3 . . . . . . . A2 . . . . . . .' },
      c: { stab: 'Bb3 . . . . . . . A3 . . . . . . .', cracked: 'F#4 . . . F4 . . . Eb4 . . . C#4 . . .', bell: 'Bb2 . . . . . . . A2 . . . . . . .' },
    }, order: ['a', 'b', 'c', 'b'] },
  knell: { bpm: 118, tracks: { drive: { wave: 'square', duty: 0.25, decay: 0.12, volume: 0.09 }, bass, drum, kick, bell: { wave: 'sine', decay: 0.9, volume: 0.09 } },
    patterns: {
      a: { drive: 'D4 A3 D4 F4 D4 A3 D4 E4 D4 A3 D4 F4 D4 C4 D4 A3', bass: 'D2 . D2 . D2 . D2 . D2 . D2 . C2 . A1 .', drum: '. . C6 . . . C6 . . . C6 . . . C6 .', kick: 'C2 . . . C2 . . . C2 . . . C2 . . .', bell: 'D5 . . . . . . . A4 . . . . . . .' },
      b: { drive: 'F4 C4 F4 A4 F4 C4 F4 G4 E4 C4 E4 G4 E4 C4 E4 A4', bass: 'F2 . F2 . F2 . F2 . C2 . C2 . C2 . E2 .', drum: '. . C6 . . . C6 . . . C6 . . C6 C6 .', kick: 'C2 . . . C2 . . . C2 . . . C2 . . .', bell: 'F5 . . . . . . . E5 . . . . . . .' },
      c: { drive: 'D5 A4 F4 E4 D4 C4 D4 A3 D5 A4 F4 E4 D4 C4 D4 D4', bass: 'Bb1 . Bb1 . Bb1 . Bb1 . A1 . A1 . A1 . A1 .', drum: 'C6 . C6 . C6 . C6 . C6 . C6 . C6 C6 C6 C6', kick: 'C2 . . C2 C2 . . C2 C2 . . C2 C2 . C2 .', bell: 'D5 . A4 . F4 . E4 . D4 . C4 . D4 . A3 .' },
    }, order: ['a', 'b', 'a', 'c'] },
  // Clemency, for the ending: the motif resolved to major at last.
  clemency: { bpm: 66, stepsPerBeat: 2, tracks: { bell: lowBell, organ: { wave: 'triangle', decay: 0.9, volume: 0.1 }, bass },
    patterns: {
      a: { bell: 'D4 . A4 . F#4 . E4 . D4 . C#4 . D4 . A3 .', organ: 'D3 - - - A3 - - - G3 - - - D3 - - -', bass: 'D2 - - - A1 - - - G1 - - - D2 - - -' },
      b: { bell: 'F#4 . A4 . D5 . A4 . G4 . F#4 . E4 . D4 .', organ: 'B3 - - - F#3 - - - G3 - - - A3 - - -', bass: 'B1 - - - F#2 - - - G2 - - - A2 - - -' },
      c: { bell: 'A4 . D5 . C#5 . A4 . B4 . A4 . D4 . . .', organ: 'D4 - - - A3 - - - G3 - - - D3 - - -', bass: 'D2 - - - E2 - - - A1 - - - D2 - - -' },
    }, order: ['a', 'b', 'a', 'c'] },
};
