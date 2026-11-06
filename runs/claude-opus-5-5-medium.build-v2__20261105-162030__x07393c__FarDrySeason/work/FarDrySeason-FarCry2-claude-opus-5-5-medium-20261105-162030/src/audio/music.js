// Music, written for this game. Plucked pentatonic lines, thumb-piano timbres, hand drums, low drones.
const thumb = { wave: 'triangle', decay: 0.28, volume: 0.2 };
const pluck = { wave: 'sine', decay: 0.42, volume: 0.22, layers: [{ wave: 'triangle', freq: 0, decay: 0.05, volume: 0 }] };
const drone = { wave: 'saw', attack: 0.3, decay: 1.2, volume: 0.05 };
const hand = { wave: 'noise', decay: 0.07, volume: 0.1 };
const lowSaw = { wave: 'saw', decay: 0.14, volume: 0.09 };
const P = (a) => a.join(' ');
const simple = { wave: 'sine', decay: 0.42, volume: 0.22 }; void pluck;
export const SONGS = {
  title: { bpm: 66, tracks: { lead: thumb, low: drone, tick: hand }, patterns: {
    a: { lead: 'E4 . . G4 A4 . . . C5 . A4 . G4 . . . E4 . . . D4 . E4 . . . . . . . . .', low: 'A2 - - - - - - - - - - - - - - - E2 - - - - - - - - - - - - - - -', tick: '. . . . C7 . . . . . . . C7 . . . . . . . C7 . . . . . . . C7 . . .' },
    b: { lead: 'A4 . C5 . D5 . . . E5 . D5 . C5 . A4 . G4 . . . E4 . . . G4 . A4 . . . . .', low: 'D3 - - - - - - - - - - - - - - - A2 - - - - - - - - - - - - - - -', tick: '. . . . C7 . . . . . . . C7 . . . . . . . C7 . C7 . . . . . C7 . . .' },
  }, order: ['a', 'a', 'b', 'a'] },
  day: { bpm: 72, tracks: { lead: simple, low: drone }, patterns: {
    a: { lead: 'A4 . . . C5 . . . . . . . . . . . E5 . D5 . . . . . . . . . . . . .', low: 'A2 - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -' },
    b: { lead: '. . . . G4 . A4 . . . . . . . . . C5 . . . A4 . . . . . . . E4 . . .', low: 'E2 - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -' },
  }, order: ['a', 'b'] },
  night: { bpm: 48, tracks: { lead: { wave: 'sine', decay: 0.9, volume: 0.1 }, low: { wave: 'sine', attack: 0.6, decay: 1.6, volume: 0.05 } }, patterns: {
    a: { lead: 'E4 . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .', low: 'A1 - - - - - - - - - - - - - - - . . . . . . . . . . . . . . . .' },
    b: { lead: '. . . . . . . . G4 . . . . . . . . . . . . . . . D4 . . . . . . .', low: '. . . . . . . . . . . . . . . . E2 - - - - - - - - - - - - - - -' },
  }, order: ['a', 'b'] },
  stalk: { bpm: 96, tracks: { pulse: { wave: 'sine', decay: 0.16, volume: 0.16 }, tick: { wave: 'noise', decay: 0.02, volume: 0.05 }, lead: { wave: 'triangle', decay: 0.2, volume: 0.1 } }, patterns: {
    a: { pulse: P(Array(16).fill(0).map((_, i) => (i % 4 === 0 ? 'A1' : i === 6 ? 'A1' : '.'))), tick: P(Array(16).fill(0).map((_, i) => (i % 2 ? 'C8' : '.'))), lead: '. . . . . . . . . . . . E4 . . .' },
    b: { pulse: P(Array(16).fill(0).map((_, i) => (i % 4 === 0 ? 'G1' : i === 6 ? 'G1' : '.'))), tick: P(Array(16).fill(0).map((_, i) => (i % 2 ? 'C8' : '.'))), lead: '. . . . C4 . . . . . D4 . . . . .' },
  }, order: ['a', 'a', 'b', 'a'] },
  fight: { bpm: 138, tracks: { drum: { wave: 'noise', decay: 0.09, volume: 0.14 }, bass: lowSaw, lead: { wave: 'triangle', decay: 0.14, volume: 0.12 } }, patterns: {
    a: { drum: 'C4 . C6 C6 . C6 C4 . C6 . C4 C6 . C6 C6 C6', bass: 'A1 . A1 . . A1 . C2 . A1 . . G1 . A1 .', lead: 'A4 . . C5 . . A4 . E5 . . D5 . C5 . .' },
    b: { drum: 'C4 . C6 C6 . C6 C4 . C6 . C4 C6 C4 C6 C6 C6', bass: 'D2 . D2 . . D2 . F2 . D2 . . C2 . D2 .', lead: 'D5 . . E5 . . D5 . A4 . . C5 . A4 . G4' },
  }, order: ['a', 'a', 'b', 'a'] },
  fever: { bpm: 56, tracks: { lead: { wave: 'sine', decay: 0.5, volume: 0.16, vibrato: { depth: 0.7, rate: 3 } }, low: { wave: 'saw', attack: 0.4, decay: 1.2, volume: 0.05, vibrato: { depth: 0.4, rate: 2 } } }, patterns: {
    a: { lead: 'A4 . . . C5 . . . . . . . . . . . Eb5 . D5 . . . . . . . . . . . . .', low: 'A2 - - - - - - - - - - - - - - - Bb2 - - - - - - - - - - - - - - -' },
  }, order: ['a'] },
  end: { bpm: 54, loop: false, tracks: { lead: { wave: 'triangle', decay: 0.8, volume: 0.2 } }, patterns: {
    a: { lead: 'E4 . . . G4 . A4 . . . . . C5 . A4 . G4 . . . . . . . E4 . . . . . . .' },
    b: { lead: 'D4 . . . E4 . G4 . . . . . E4 . . . A3 . . . . . . . . . . . . . . .' },
  }, order: ['a', 'b', 'a', 'b'] },
};
