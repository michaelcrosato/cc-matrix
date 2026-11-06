// Songs as data: plucked pentatonic lines, thumb-piano timbres, noise hand drums, low drones. Original melodies.
const piano = { wave: 'triangle', decay: 0.35, volume: 0.16 };
const pluck = { wave: 'triangle', decay: 0.25, volume: 0.14 };
const drone = { wave: 'sine', decay: 1.4, volume: 0.12 };
const saw = { wave: 'saw', decay: 0.22, volume: 0.07 };
const drum = { wave: 'noise', decay: 0.07, volume: 0.1 };
const bell = { wave: 'sine', decay: 0.7, volume: 0.1 };
const rep = (s, n) => Array(n).fill(s).join(' ');
export const SONGS = {
  title: { bpm: 66, tracks: { lead: piano, bass: drone, bell }, patterns: {
    a: { lead: 'A4 . C5 . E5 . . G4 . . A4 . D5 . . .', bass: 'A2 . . . . . . . . . . . . . . .', bell: '. . . . . . E5 . . . . . . . . .' },
    b: { lead: 'G4 . A4 . C5 . . E5 . . D5 . A4 . . .', bass: 'D2 . . . . . . . . . . . . . . .', bell: '. . . . . . . . A5 . . . . . . .' },
  }, order: ['a', 'b', 'a', 'b'] },
  day: { bpm: 72, tracks: { lead: pluck, bass: drone }, patterns: {
    a: { lead: 'E4 . . A4 . . C5 . . . G4 . . . . .', bass: 'A2 . . . . . . . . . . . . . . .' },
    b: { lead: 'D4 . . G4 . . A4 . . . E4 . . . . .', bass: 'G2 . . . . . . . . . . . . . . .' },
    c: { lead: '. . . . C5 . . . A4 . . . . . . .', bass: 'E2 . . . . . . . . . . . . . . .' },
  }, order: ['a', 'b', 'a', 'c'] },
  night: { bpm: 50, tracks: { lead: { wave: 'sine', decay: 0.9, volume: 0.08 }, bass: drone }, patterns: {
    a: { lead: '. . . . . . . . A4 . . . . . . . . . . . . . . . . . . . E4 . . .', bass: 'A1 . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .' },
  }, order: ['a'] },
  stalk: { bpm: 96, tracks: { lead: pluck, bass: { wave: 'square', duty: 0.125, decay: 0.15, volume: 0.07 }, drum }, patterns: {
    a: { lead: '. . . . A4 . . . . . C5 . . . . .', bass: 'A2 . . A2 . . A2 . A2 . . A2 . . . .', drum: '. . . . . . . . . . . . . . . .' },
    b: { lead: '. . G4 . . . . . D5 . . . . . E5 .', bass: 'D2 . . D2 . . D2 . D2 . . D2 . . . .', drum: '. . . . . . . . . . . . . . C8 C8' },
  }, order: ['a', 'a', 'b'] },
  fight: { bpm: 132, tracks: { lead: pluck, bass: saw, drum }, patterns: {
    a: { lead: 'A4 . C5 A4 . E5 . D5 A4 . C5 . G4 . A4 .', bass: 'A1 A1 . A1 A1 . A1 . A1 A1 . A1 A1 . A1 .', drum: 'C6 . C8 C8 C6 . C8 . C6 . C8 C8 C6 C6 C8 .' },
    b: { lead: 'G4 . A4 C5 . D5 . E5 D5 . C5 . A4 . G4 .', bass: 'D2 D2 . D2 D2 . D2 . D2 D2 . D2 D2 . D2 .', drum: 'C6 . C8 C8 C6 . C8 C6 C6 . C8 C8 C6 C6 C6 C6' },
  }, order: ['a', 'a', 'b', 'a'] },
  fever: { bpm: 62, tracks: { lead: { wave: 'triangle', decay: 0.4, volume: 0.15, vibrato: { depth: 0.8, rate: 5 } }, bass: { wave: 'sine', decay: 1.4, volume: 0.12 }, bell }, patterns: {
    a: { lead: 'E4 . . A4 . . C5 . . . G4 . . . . .', bass: 'A2 . . . . . . . . . . . . . . .', bell: '. . . . . . . . . . . . Gb5 . . .' },
  }, order: ['a'] },
  end: { bpm: 60, tracks: { lead: { wave: 'triangle', decay: 0.9, volume: 0.15 } }, patterns: { a: { lead: 'A4 . . . C5 . . . E5 . . . D5 . . . C5 . . . A4 . . . . . . . . . . .' } }, order: ['a'] },
};
export const SONG_FOR = { title: 'title', day: 'day', night: 'night', stalk: 'stalk', fight: 'fight', fever: 'fever', end: 'end' };
