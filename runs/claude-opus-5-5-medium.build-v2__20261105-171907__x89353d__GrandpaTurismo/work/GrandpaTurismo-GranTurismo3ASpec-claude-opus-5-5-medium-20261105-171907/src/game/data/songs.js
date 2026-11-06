// Eight original pieces as Song data: square, triangle, saw, sine, noise only.
const seq = (rhythm, notes) => { let k = 0; return [...rhythm.replace(/ /g, '')].map((c) => (c === 'x' ? notes[k++ % notes.length] : c === '-' ? '-' : '.')).join(' '); };
const bars = (rhythm, list) => list.map((n) => seq(rhythm, n)).join(' ');
const rest = (steps) => Array(steps).fill('.').join(' ');
const wall = (s) => s.trim().split(/\s+/).join(' ');
export const SONGS = {
  lounge: { bpm: 92, tracks: { lead: { wave: 'sine', attack: 0.01, decay: 0.45, volume: 0.3, vibrato: { depth: 0.12, rate: 5 } }, comp: { wave: 'triangle', decay: 0.2, volume: 0.13 }, bass: { wave: 'triangle', decay: 0.32, volume: 0.32 }, hat: { wave: 'noise', decay: 0.03, volume: 0.05 } },
    patterns: {
      a: { lead: wall('F5 - - Db5 Eb5 - Ab4 - . . Gb5 - F5 - Eb5 - | Db5 - - - Ab4 - Bb4 - C5 - Db5 - . . . . | F5 - - Gb5 Ab5 - F5 - Eb5 - Db5 - C5 - Bb4 - | Ab4 - - - . . Db5 - Bb4 - - - . . . .'.replaceAll('|', '')),
        comp: bars('x..x..x. .x..x...', [['Gb4', 'Bb4', 'Db5', 'Eb4'], ['Gb4', 'C5', 'Eb5', 'Ab4'], ['F4', 'Ab4', 'C5', 'Eb5'], ['Db4', 'F4', 'Ab4', 'Bb4']]),
        bass: bars('x.....x.x.......', [['Eb3', 'Bb2', 'Eb3'], ['Ab2', 'Eb3', 'Ab2'], ['Db3', 'Ab2', 'Db3'], ['Bb2', 'F3', 'Bb2']]),
        hat: bars('x.xxx.xxx.xxx.xx', [['C8'], ['C8'], ['C8'], ['C8']]) },
      b: { lead: wall('Ab5 - F5 - Db5 - - - C5 - Eb5 - Gb5 - F5 - Eb5 - - - Bb4 - C5 - Db5 - - - . . . . F5 - Eb5 - Db5 - Bb4 - Ab4 - Bb4 - Db5 - Eb5 - C5 - Bb4 - Ab4 - Gb4 - F4 - - - . . . .'),
        comp: bars('x..x..x. .x..x...', [['Db4', 'F4', 'Ab4', 'C5'], ['Bb3', 'Db4', 'F4', 'Ab4'], ['Gb4', 'Bb4', 'Db5', 'Eb4'], ['F4', 'A4', 'C5', 'Eb5']]),
        bass: bars('x.....x.x.......', [['Db3', 'Ab2', 'Db3'], ['Bb2', 'F3', 'Bb2'], ['Eb3', 'Bb2', 'Eb3'], ['Ab2', 'C3', 'Eb3']]),
        hat: bars('x.xxx.xxx.xxx.xx', [['C8'], ['C8'], ['C8'], ['C8']]) },
    }, order: ['a', 'a', 'b', 'a'] },
  catalogue: { bpm: 76, tracks: { vib: { wave: 'sine', decay: 0.8, volume: 0.3, vibrato: { depth: 0.25, rate: 6 } }, pad: { wave: 'triangle', decay: 0.9, volume: 0.1 }, bass: { wave: 'sine', decay: 0.7, volume: 0.32 } },
    patterns: { a: {
      vib: wall('E5 - - - A5 - - - G5 - E5 - C5 - - - D5 - - - G5 - - - F5 - D5 - B4 - - - C5 - - - F5 - A5 - G5 - - - E5 - - - B4 - D5 - F5 - - - E5 - D5 - C5 - - - . . . .'),
      pad: bars('x.......x.......', [['F4', 'C5'], ['E4', 'B4'], ['D4', 'A4'], ['G4', 'B4']]),
      bass: bars('x.......x...x...', [['F2', 'C3', 'A2'], ['E2', 'B2', 'G2'], ['D2', 'A2', 'F2'], ['G2', 'D3', 'B2']]) } }, order: ['a'] },
  socket: { bpm: 108, tracks: { lead: { wave: 'square', duty: 0.25, decay: 0.09, volume: 0.15 }, comp: { wave: 'square', duty: 0.125, decay: 0.05, volume: 0.1 }, bass: { wave: 'triangle', decay: 0.15, volume: 0.38 }, snare: { wave: 'noise', decay: 0.07, volume: 0.1 }, hat: { wave: 'noise', decay: 0.02, volume: 0.05 } },
    patterns: { a: {
      lead: wall('A4 . C5 . . D5 . E5 . . G5 . E5 . D5 . C5 . A4 . . . G4 A4 . . . . . . . . A4 . C5 . . D5 . E5 . . G5 A5 . G5 E5 . D5 . E5 . D5 C5 . A4 . . . . . . . . .'),
      comp: bars('..x...x...x..x..', [['G4', 'C5'], ['F#4', 'C5', 'E5'], ['G4', 'E5'], ['F#4', 'C5', 'E5']]),
      bass: bars('x..x..x...x.x..x', [['A2', 'A2', 'C3', 'A2', 'E3', 'G2'], ['D3', 'D3', 'F#3', 'D3', 'A2', 'C3'], ['A2', 'A2', 'C3', 'A2', 'E3', 'G2'], ['D3', 'D3', 'F#3', 'A3', 'G3', 'E3']]),
      snare: bars('....x.......x...', [['C6'], ['C6'], ['C6'], ['C6']]), hat: bars('x.x.x.x.x.x.x.xx', [['C8'], ['C8'], ['C8'], ['C8']]) } }, order: ['a'] },
  exam: { bpm: 120, tracks: { motif: { wave: 'triangle', decay: 0.2, volume: 0.26 }, pulse: { wave: 'sine', decay: 0.12, volume: 0.3 }, tick: { wave: 'noise', decay: 0.015, volume: 0.04 } },
    patterns: {
      a: { motif: wall(`${rest(16)} E5 . . . G5 . . . C5 . . . . . . . ${rest(16)} D5 . . . F5 . . . B4 . . . . . . .`), pulse: bars('x...x...x...x...', [['C3'], ['C3'], ['G2'], ['G2']]), tick: bars('x...x...x...x...', [['C8'], ['C8'], ['C8'], ['C8']]) },
      b: { motif: wall(`${rest(16)} E5 . . . A5 . . . G5 . . . . . . . ${rest(16)} F5 . . . D5 . . . C5 . . . . . . .`), pulse: bars('x...x...x...x...', [['A2'], ['F2'], ['G2'], ['C3']]), tick: bars('x...x...x...x...', [['C8'], ['C8'], ['C8'], ['C8']]) },
    }, order: ['a', 'b'] },
  apex: { bpm: 156, tracks: { lead: { wave: 'square', duty: 0.5, decay: 0.16, volume: 0.18 }, gtr: { wave: 'saw', decay: 0.09, volume: 0.1 }, bass: { wave: 'triangle', decay: 0.1, volume: 0.42 }, kick: { wave: 'sine', decay: 0.08, volume: 0.3 }, snare: { wave: 'noise', decay: 0.08, volume: 0.12 }, hat: { wave: 'noise', decay: 0.02, volume: 0.05 } },
    patterns: {
      a: { lead: wall('E5 - - - B4 - E5 - G5 - - - F#5 - E5 - C5 - - - E5 - G5 - A5 - - - G5 - E5 - G5 - - - D5 - G5 - B5 - - - A5 - G5 - D5 - - - F#5 - A5 - B5 - - - - - - -'),
        gtr: bars('x.x.x.x.x.x.x.x.', [['E3', 'B3', 'E4', 'B3'], ['C3', 'G3', 'C4', 'G3'], ['G3', 'D4', 'G4', 'D4'], ['D3', 'A3', 'D4', 'A3']]), bass: bars('x.x.x.x.x.xxx.x.', [['E2'], ['C2'], ['G2'], ['D2']]), kick: bars('x.......x.x.....', [['C3'], ['C3'], ['C3'], ['C3']]), snare: bars('....x.......x...', [['C6'], ['C6'], ['C6'], ['C6']]), hat: bars('x.x.x.x.x.x.x.x.', [['C8'], ['C8'], ['C8'], ['C8']]) },
      b: { lead: wall('B5 - G5 - E5 - G5 - B5 - - - A5 - G5 - E5 - C5 - E5 - G5 - C6 - - - B5 - A5 - G5 - D5 - G5 - B5 - D6 - - - B5 - A5 - F#5 - - - A5 - - - F#5 - - - D5 - - -'),
        gtr: bars('x.x.x.x.x.x.x.x.', [['E3', 'B3', 'E4', 'B3'], ['C3', 'G3', 'C4', 'G3'], ['G3', 'D4', 'G4', 'D4'], ['D3', 'A3', 'D4', 'A3']]), bass: bars('x.xxx.x.x.xxx.x.', [['E2'], ['C2'], ['G2'], ['D2']]), kick: bars('x...x...x...x...', [['C3'], ['C3'], ['C3'], ['C3']]), snare: bars('....x.......x..x', [['C6'], ['C6'], ['C6'], ['C6']]), hat: bars('xxxxxxxxxxxxxxxx', [['C8'], ['C8'], ['C8'], ['C8']]) },
    }, order: ['a', 'a', 'b', 'a'] },
  city: { bpm: 118, tracks: { lead: { wave: 'sine', decay: 0.3, volume: 0.28, vibrato: { depth: 0.1, rate: 6 } }, keys: { wave: 'triangle', decay: 0.14, volume: 0.13 }, bass: { wave: 'square', duty: 0.25, decay: 0.12, volume: 0.2 }, snare: { wave: 'noise', decay: 0.09, volume: 0.1 }, hat: { wave: 'noise', decay: 0.025, volume: 0.05 } },
    patterns: { a: {
      lead: wall('D5 - - F5 - - A5 - G5 - F5 - D5 - C5 - D5 - - - . . F5 G5 - A5 - - . . . . C6 - - A5 - - G5 - F5 - G5 - A5 - - - Bb5 - A5 - G5 - F5 - - - D5 - Eb5 - F5 - . .'),
      keys: bars('..x..x..x..x....', [['Bb3', 'D4', 'F4', 'A4'], ['D4', 'F4', 'A4', 'C5'], ['G3', 'Bb3', 'D4', 'F4'], ['Eb4', 'G4', 'Bb4', 'D5']]),
      bass: bars('x..x..x.x..x..x.', [['Bb2', 'Bb2', 'F3', 'Bb2', 'D3', 'F3'], ['D3', 'D3', 'A3', 'D3', 'F3', 'A3'], ['G2', 'G2', 'D3', 'G2', 'Bb2', 'D3'], ['Eb3', 'Eb3', 'Bb3', 'Eb3', 'F3', 'A2']]),
      snare: bars('....x.......x...', [['C6'], ['C6'], ['C6'], ['C6']]), hat: bars('x.xxx.xxx.xxx.xx', [['C8'], ['C8'], ['C8'], ['C8']]) } }, order: ['a'] },
  clay: { bpm: 132, tracks: { twang: { wave: 'saw', decay: 0.13, volume: 0.13 }, strum: { wave: 'square', duty: 0.125, decay: 0.05, volume: 0.09 }, bass: { wave: 'triangle', decay: 0.1, volume: 0.42 }, hat: { wave: 'noise', decay: 0.03, volume: 0.08 } },
    patterns: { a: {
      twang: wall('G4 . B4 D5 . E5 . D5 . B4 . G4 . A4 . . F5 . D5 C5 . A4 . F4 . G4 . A4 . . . . G4 . B4 D5 . E5 . G5 . F5 . D5 . C5 . . A4 . C5 D5 . F5 . E5 . D5 . B4 . G4 . .'),
      strum: bars('..x...x...x...x.', [['B3', 'D4'], ['C4', 'F4'], ['B3', 'E4'], ['A3', 'D4']]),
      bass: bars('x...x.x.x...x.x.', [['G2', 'D3', 'D3', 'G2', 'D3', 'D3'], ['F2', 'C3', 'C3', 'F2', 'C3', 'C3'], ['G2', 'D3', 'D3', 'E3', 'D3', 'B2'], ['F2', 'C3', 'C3', 'D3', 'A2', 'D3']]),
      hat: bars('x.xx.xx.xx.xx.xx', [['C7'], ['C7'], ['C7'], ['C7']]) } }, order: ['a'] },
  longdrive: { bpm: 84, tracks: { arp: { wave: 'triangle', decay: 0.4, volume: 0.17 }, lead: { wave: 'sine', decay: 0.8, volume: 0.25, vibrato: { depth: 0.15, rate: 4.5 } }, bass: { wave: 'sine', decay: 0.8, volume: 0.32 } },
    patterns: {
      a: { arp: bars('x.x.x.x.x.x.x.x.', [['D4', 'F#4', 'A4', 'C#5', 'E5', 'C#5', 'A4', 'F#4'], ['F#4', 'A#4', 'C#5', 'E5', 'F#5', 'E5', 'C#5', 'A#4'], ['B3', 'D4', 'F#4', 'A4', 'C#5', 'A4', 'F#4', 'D4'], ['G3', 'B3', 'D4', 'F#4', 'A4', 'F#4', 'D4', 'B3']]), lead: wall(`${rest(32)} F#5 - - - - - E5 - D5 - - - C#5 - - - B4 - - - - - D5 - G5 - - - F#5 - - -`), bass: bars('x.......x.......', [['D2', 'A2'], ['F#2', 'C#3'], ['B2', 'F#2'], ['G2', 'D3']]) },
      b: { arp: bars('xxx.xxx.xxx.xxx.', [['D4', 'F#4', 'A4', 'D5', 'A4', 'F#4'], ['C#4', 'F#4', 'A#4', 'C#5', 'A#4', 'F#4'], ['B3', 'D4', 'F#4', 'B4', 'F#4', 'D4'], ['G3', 'B3', 'D4', 'G4', 'D4', 'B3']]), lead: wall('A5 - - - F#5 - - - D5 - E5 - F#5 - - - C#6 - - - A#5 - F#5 - E5 - - - C#5 - - - B5 - - - F#5 - D5 - C#5 - D5 - F#5 - - - G5 - F#5 - E5 - D5 - B4 - - - - - - -'), bass: bars('x...x...x...x...', [['D2', 'D3'], ['F#2', 'F#3'], ['B2', 'B1'], ['G2', 'G1']]) },
    }, order: ['a', 'b'] },
};
export const SONG_FOR = { title: 'lounge', map: 'lounge', dealer: 'catalogue', museum: 'catalogue', tuning: 'socket', service: 'socket', licence: 'exam', race: 'apex', night: 'city', rally: 'clay', replay: 'longdrive', credits: 'longdrive' };
// Every track of a pattern runs the same number of steps: four bars of sixteen.
for (const s of Object.values(SONGS)) for (const pat of Object.values(s.patterns)) { const steps = 64; for (const k of Object.keys(pat)) { const a = pat[k].split(/\s+/).filter(Boolean); pat[k] = a.length >= steps ? a.slice(0, steps).join(' ') : [...a, ...Array(steps - a.length).fill('.')].join(' '); } }
