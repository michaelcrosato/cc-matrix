// All original chiptune compositions, as engine Song data.
const lead = (v = 0.11) => ({ wave: 'triangle', decay: 0.42, volume: v, vibrato: { depth: 0.08, rate: 5 } });
const pad = (v = 0.04) => ({ wave: 'square', duty: 0.25, attack: 0.03, decay: 0.5, volume: v });
const bass = (v = 0.1) => ({ wave: 'triangle', decay: 0.22, volume: v });
const choir = (v = 0.05) => ({ wave: 'saw', attack: 0.1, decay: 0.9, volume: v, vibrato: { depth: 0.1, rate: 4.5 } });
const hat = (v = 0.03) => ({ wave: 'noise', decay: 0.02, volume: v });
const kick = (v = 0.14) => ({ wave: 'sine', decay: 0.09, volume: v });

export const SONGS = {
  title: { bpm: 58, tracks: { lead: lead(0.12), soft: pad(0.03), bass: bass(0.08) }, order: ['a', 'b', 'a', 'c'], patterns: {
    a: { lead: 'E4 - - - . . G4 - F4 - - - E4 - D4 -', soft: 'A3 . E4 . A3 . E4 . F3 . C4 . F3 . C4 .', bass: 'A2 - - - - - - - F2 - - - - - - -' },
    b: { lead: 'C5 - - - B4 - A4 - G4 - - - . . E4 -', soft: 'C4 . G4 . C4 . G4 . E3 . B3 . E3 . B3 .', bass: 'C3 - - - - - - - E2 - - - - - - -' },
    c: { lead: 'D4 - F4 - A4 - - G4 E4 - - - - - . .', soft: 'D4 . A4 . D4 . A4 . E3 . G#3 . B3 . E4 .', bass: 'D3 - - - - - - - E2 - - - - - - -' } } },
  ward: { bpm: 84, stepsPerBeat: 3, tracks: { lead: { wave: 'triangle', decay: 0.28, volume: 0.09 }, comp: pad(0.03), bass: bass(0.09), hat: hat(0.018) }, order: ['a', 'b'], patterns: {
    a: { lead: 'A4 . C5 E5 . D5 C5 . A4 . . . G4 . B4 D5 . C5 B4 . G4 . . .', comp: '. . D4 . . . . . F4 . . . . . B3 . . . . . E4 . . .', bass: 'D3 . . . . A2 . . . D3 . . G2 . . . . D3 . . G2 . . .', hat: 'C8 . C8 C8 . C8 C8 . C8 C8 . C8 C8 . C8 C8 . C8 C8 . C8 C8 . C8' },
    b: { lead: 'E5 . D5 C5 . A4 G4 . E4 . . . F4 . A4 C5 . B4 A4 . . . . .', comp: '. . C4 . . . . . E4 . . . . . A3 . . . . . C4 . . .', bass: 'C3 . . . . G2 . . . C3 . . F2 . . . . C3 . . F2 . . .', hat: 'C8 . C8 C8 . C8 C8 . C8 C8 . C8 C8 . C8 C8 . C8 C8 . C8 C8 . C8' } } },
  'or-calm': { bpm: 96, tracks: { arp: { wave: 'square', duty: 0.125, decay: 0.12, volume: 0.04 }, lead: lead(0.075), bass: bass(0.09), hat: hat(0.018) }, order: ['a', 'a', 'b', 'c'], patterns: {
    a: { arp: 'A3 C4 E4 A4 E4 C4 A3 C4 F3 A3 C4 F4 C4 A3 F3 A3', lead: 'E5 - - - . . . . C5 - - - . . . .', bass: 'A2 . . . A2 . . . F2 . . . F2 . . .', hat: 'C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 .' },
    b: { arp: 'C4 E4 G4 C5 G4 E4 C4 E4 G3 B3 D4 G4 D4 B3 G3 B3', lead: 'G5 - E5 - C5 - . . D5 - B4 - G4 - . .', bass: 'C3 . . . C3 . . . G2 . . . G2 . . .', hat: 'C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 .' },
    c: { arp: 'D4 F4 A4 D5 A4 F4 D4 F4 E4 G#4 B4 E5 B4 G#4 E4 B3', lead: 'A4 - - F5 - - D5 - E5 - - - - - . .', bass: 'D3 . . . D3 . . . E3 . . . E2 . . .', hat: 'C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 .' } } },
  'or-tense': { bpm: 112, tracks: { arp: { wave: 'square', duty: 0.25, decay: 0.09, volume: 0.05 }, lead: { wave: 'square', duty: 0.25, decay: 0.2, volume: 0.05 }, bass: { wave: 'square', duty: 0.5, decay: 0.12, volume: 0.06 }, kick: kick(0.12), hat: hat(0.022) }, order: ['a', 'b'], patterns: {
    a: { arp: 'A3 E4 A4 E4 A3 E4 C5 E4 A3 F4 A4 F4 A3 F4 C5 F4', lead: 'A4 - - - C5 - - B4 - - A4 - - G#4 - -', bass: 'A2 . A2 A2 . A2 . A2 F2 . F2 F2 . F2 . F2', kick: 'C3 . . . C3 . . . C3 . . . C3 . . .', hat: 'C8 C8 . C8 C8 C8 . C8 C8 C8 . C8 C8 C8 . C8' },
    b: { arp: 'D4 A4 D5 A4 D4 A4 F5 A4 E4 B4 E5 B4 E4 G#4 B4 E5', lead: 'D5 - - - F5 - - E5 - - D5 - E5 - - -', bass: 'D3 . D3 D3 . D3 . D3 E3 . E3 E3 . E3 . E2', kick: 'C3 . . . C3 . . . C3 . . . C3 . C3 .', hat: 'C8 C8 . C8 C8 C8 . C8 C8 C8 . C8 C8 C8 . C8' } } },
  'or-critical': { bpm: 132, tracks: { arp: { wave: 'square', duty: 0.25, decay: 0.07, volume: 0.05 }, alarm: { wave: 'square', duty: 0.125, decay: 0.12, volume: 0.04 }, bass: { wave: 'saw', decay: 0.1, volume: 0.05 }, kick: kick(0.14), hat: hat(0.03) }, order: ['a', 'b'], patterns: {
    a: { arp: 'A3 C4 E4 A4 A3 C4 E4 A4 A3 C4 F4 A4 A3 C4 F4 A4', alarm: 'A5 . . . . . . . E5 . . . . . . .', bass: 'A2 A2 . A2 A2 . A2 A2 F2 F2 . F2 F2 . F2 F2', kick: 'C3 . C3 . C3 . C3 . C3 . C3 . C3 . C3 .', hat: 'C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8' },
    b: { arp: 'B3 D4 F4 B4 B3 D4 F4 B4 E4 G#4 B4 E5 E4 G#4 B4 E5', alarm: 'B5 . . . . . . . G#5 . . . . . . .', bass: 'B2 B2 . B2 B2 . B2 B2 E2 E2 . E2 E2 . E2 E2', kick: 'C3 . C3 . C3 . C3 . C3 . C3 . C3 . C3 .', hat: 'C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8' } } },
  'boss-introit': { bpm: 100, tracks: { choir: choir(0.05), choir2: choir(0.035), bass: { wave: 'square', duty: 0.5, decay: 0.15, volume: 0.06 }, knock: kick(0.16), arp: { wave: 'square', duty: 0.125, decay: 0.08, volume: 0.035 } }, order: ['a', 'b'], patterns: {
    a: { choir: 'D4 - - - - - - - F4 - - - - - - -', choir2: 'A4 - - - - - - - C5 - - - - - - -', bass: 'D2 . . D2 . . D2 . Bb1 . . Bb1 . . Bb1 .', knock: 'C3 . . C3 . . C3 . . . . . . . . .', arp: 'D4 F4 A4 D5 . . . . F4 A4 C5 F5 . . . .' },
    b: { choir: 'G4 - - - - - - - E4 - - - A4 - - -', choir2: 'Bb4 - - - - - - - G4 - - - C#5 - - -', bass: 'G2 . . G2 . . G2 . A2 . . A2 . . A2 .', knock: 'C3 . . C3 . . C3 . . . . . C3 . C3 .', arp: 'G4 Bb4 D5 G5 . . . . A4 C#5 E5 A5 . . . .' } } },
  'boss-lacrimosa': { bpm: 76, stepsPerBeat: 3, tracks: { choir: choir(0.06), tear: { wave: 'triangle', decay: 0.3, volume: 0.09 }, bass: bass(0.1), hat: hat(0.015) }, order: ['a', 'b'], patterns: {
    a: { choir: 'A4 - - - - - F4 - - - - - E4 - - - - - E4 - - - - -', tear: 'E5 . C5 . A4 . F5 . C5 . A4 . E5 . B4 . G#4 . B4 . E5 . . .', bass: 'A2 . . E3 . . F2 . . C3 . . E2 . . B2 . . E2 . . E3 . .', hat: 'C8 . . C8 . . C8 . . C8 . . C8 . . C8 . . C8 . . C8 . .' },
    b: { choir: 'D4 - - - - - A4 - - - - - B4 - - - - - E4 - - - - -', tear: 'D5 . F5 . A5 . E5 . C5 . A4 . F5 . D5 . B4 . G#4 . E4 . . .', bass: 'D3 . . A3 . . A2 . . E3 . . B2 . . F3 . . E2 . . B2 . .', hat: 'C8 . . C8 . . C8 . . C8 . . C8 . . C8 . . C8 . . C8 . .' } } },
  'boss-irae': { bpm: 72, stepsPerBeat: 4, tracks: { choir: choir(0.07), brass: { wave: 'saw', decay: 0.2, volume: 0.05 }, thump: kick(0.2), bass: { wave: 'square', duty: 0.5, decay: 0.14, volume: 0.06 } }, order: ['a', 'b'], patterns: {
    a: { choir: 'C4 - - - - - - - Ab3 - - - - - - -', brass: 'C5 . . C5 Eb5 . . . Ab4 . . Ab4 C5 . . .', thump: 'C3 . C3 . . . . . C3 . C3 . . . . .', bass: 'C2 . . . C2 . . . Ab1 . . . Ab1 . . .' },
    b: { choir: 'F3 - - - - - - - G3 - - - B3 - - -', brass: 'F4 . . F4 Ab4 . . . G4 . . B4 D5 . . .', thump: 'C3 . C3 . . . . . C3 . C3 . . . . .', bass: 'F1 . . . F2 . . . G1 . . . G2 . . .' } } },
  'boss-libera': { bpm: 88, tracks: { choir: choir(0.06), choir2: choir(0.04), bass: { wave: 'saw', decay: 0.2, volume: 0.05 }, kick: kick(0.14) }, order: ['a', 'b'], patterns: {
    a: { choir: 'E4 - - - - - - - D4 - - - - - - -', choir2: 'B4 - - - - - - - A4 - - - - - - -', bass: 'E2 . . E2 . . E2 . D2 . . D2 . . D2 .', kick: 'C3 . . . . . C3 . C3 . . . . . C3 .' },
    b: { choir: 'C4 - - - - - - - B3 - - - D#4 - - -', choir2: 'G4 - - - - - - - F#4 - - - B4 - - -', bass: 'C2 . . C2 . . C2 . B1 . . B1 . . B1 .', kick: 'C3 . . . . . C3 . C3 . . C3 . . C3 .' } } },
  'boss-miserere': { bpm: 60, tracks: { choir: choir(0.07), choir2: choir(0.05), high: { wave: 'sine', decay: 0.8, volume: 0.05 } }, order: ['a', 'b'], patterns: {
    a: { choir: 'C4 - - - - - - - G4 - - - - - - -', choir2: 'E4 - - - - - - - B4 - - - - - - -', high: 'G5 . . . E5 . . . D5 . . . B4 . . .' },
    b: { choir: 'A3 - - - - - - - F4 - - - E4 - - -', choir2: 'C4 - - - - - - - A4 - - - G4 - - -', high: 'A5 . . . E5 . . . C5 . . . E5 . . .' } } },
  op10: { bpm: 52, tracks: { lead: lead(0.08), soft: pad(0.02) }, order: ['a', 'b'], patterns: {
    a: { lead: 'A4 - - - . . . . C5 - - - . . . .', soft: 'A3 . . . E4 . . . F3 . . . C4 . . .' },
    b: { lead: 'B4 - - - G4 - - - A4 - - - - - - -', soft: 'G3 . . . D4 . . . A3 . . . E4 . . .' } } },
  results: { bpm: 120, loop: false, tracks: { lead: { wave: 'square', duty: 0.25, decay: 0.2, volume: 0.09 }, bass: bass(0.09) }, order: ['a'], patterns: { a: { lead: 'C5 . E5 . G5 . C6 - - - G5 . C6 - - -', bass: 'C3 . . . G2 . . . F2 . . . C3 - - -' } } },
  sad: { bpm: 60, loop: false, tracks: { lead: lead(0.1), bass: bass(0.08) }, order: ['a'], patterns: { a: { lead: 'E5 - - D5 C5 - - B4 A4 - - - - - - -', bass: 'A2 - - - F2 - - - E2 - - - A2 - - -' } } },
  credits: { bpm: 72, tracks: { lead: lead(0.1), soft: pad(0.03), bass: bass(0.08) }, order: ['a', 'b'], patterns: {
    a: { lead: 'C5 - D5 - E5 - G5 - E5 - - - D5 - C5 -', soft: 'C4 E4 G4 E4 C4 E4 G4 E4 A3 C4 E4 C4 A3 C4 E4 C4', bass: 'C3 - - - - - - - A2 - - - - - - -' },
    b: { lead: 'F5 - E5 - D5 - C5 - D5 - - - G4 - - -', soft: 'F3 A3 C4 A3 F3 A3 C4 A3 G3 B3 D4 B3 G3 B3 D4 B3', bass: 'F2 - - - - - - - G2 - - - - - - -' } } },
};
