// Every song is data, original, and written loud for a 10% music bus.
const pluck = { wave: 'triangle', decay: 0.28, volume: 0.62 };
const softBass = { wave: 'triangle', decay: 0.3, volume: 0.7 };
const lead = { wave: 'square', duty: 0.25, decay: 0.18, volume: 0.42 };
const box = { wave: 'triangle', decay: 0.55, volume: 0.72, vibrato: { depth: 0.08, rate: 5 } };
const hat = { wave: 'noise', decay: 0.03, volume: 0.28 };
const snare = { wave: 'noise', decay: 0.09, volume: 0.36 };
const kick = { wave: 'triangle', decay: 0.12, volume: 0.8 };

export const SONGS = {
  plaza: { bpm: 92, tracks: { pluck, bass: softBass, shaker: { ...hat, volume: 0.2 } }, patterns: {
    a: { pluck: '. . F4 . A4 . . C5 . . A4 . F4 . . . . . E4 . G4 . . B4 . . G4 . E4 . . .', bass: 'D3 . . . . . A2 . D3 . . . . . A2 . G2 . . . . . D3 . G2 . . . . . D3 .', shaker: 'C8 . C8 C8 C8 . C8 C8 C8 . C8 C8 C8 . C8 C8 C8 . C8 C8 C8 . C8 C8 C8 . C8 C8 C8 . C8 C8' },
    b: { pluck: '. . E4 . G4 . . C5 . . G4 . E4 . . . . . C#4 . E4 . . A4 . . G4 . E4 . . .', bass: 'C3 . . . . . G2 . C3 . . . . . G2 . A2 . . . . . E3 . A2 . . . . . E3 .', shaker: 'C8 . C8 C8 C8 . C8 C8 C8 . C8 C8 C8 . C8 C8 C8 . C8 C8 C8 . C8 C8 C8 . C8 C8 C8 . C8 C8' },
    c: { pluck: 'D5 . . C5 . . A4 . . . F4 . . A4 . . G4 . . F4 . . E4 . . . D4 . . E4 . .', bass: 'F2 . . . . . C3 . F2 . . . . . C3 . E2 . . . . . B2 . A2 . . . . . E3 .', shaker: 'C8 . C8 C8 C8 . C8 C8 C8 . C8 C8 C8 . C8 C8 C8 . C8 C8 C8 . C8 C8 C8 . C8 C8 C8 . C8 C8' },
  }, order: ['a', 'b', 'a', 'c'] },
  still: { bpm: 60, stepsPerBeat: 2, tracks: { pad: { wave: 'triangle', attack: 0.5, decay: 1.4, volume: 0.6 }, bell: { ...box, decay: 1.2, volume: 0.5 } }, patterns: {
    a: { pad: 'D3 - - - - - - - A2 - - - - - - -', bell: '. . A4 . . . . . . E5 . . . . . .' },
    b: { pad: 'G2 - - - - - - - D3 - - - - - - -', bell: '. . . . D5 . . . . . A4 . . . . .' },
  }, order: ['a', 'b'] },
  shed: { bpm: 110, tracks: { bass: { wave: 'square', duty: 0.25, decay: 0.14, volume: 0.6 }, stab: { wave: 'triangle', decay: 0.1, volume: 0.5 }, hat, kick, snare }, patterns: {
    a: { bass: 'E2 . . E2 . G2 . A2 . . E2 . D2 . E2 .', stab: '. . B3 . . . . . . . D4 . . . . .', hat: 'C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 .', kick: 'C2 . . . . . . C2 . . C2 . . . . .', snare: '. . . . C6 . . . . . . . C6 . . .' },
    b: { bass: 'A2 . . A2 . C3 . D3 . . A2 . G2 . E2 .', stab: '. . E4 . . . . . . . G4 . . . . .', hat: 'C8 . C8 . C8 . C8 . C8 . C8 . C8 C8 C8 .', kick: 'C2 . . . . . . C2 . . C2 . . . . .', snare: '. . . . C6 . . . . . . . C6 . C6 .' },
  }, order: ['a', 'a', 'b', 'a'] },
  hoop: { bpm: 124, tracks: { lead, bass: { wave: 'triangle', decay: 0.14, volume: 0.7 }, kick, hat }, patterns: {
    a: { lead: 'C5 . E5 . G5 . E5 . A5 . G5 . E5 . C5 .', bass: 'C3 . C3 . C3 . C3 . A2 . A2 . A2 . A2 .', kick: 'C2 . . . C2 . . . C2 . . . C2 . . .', hat: '. . C8 . . . C8 . . . C8 . . . C8 .' },
    b: { lead: 'F5 . A5 . G5 . E5 . D5 . E5 . G5 . . .', bass: 'F2 . F2 . F2 . F2 . G2 . G2 . G2 . G2 .', kick: 'C2 . . . C2 . . . C2 . . . C2 . . .', hat: '. . C8 . . . C8 . . . C8 . C8 C8 C8 .' },
  }, order: ['a', 'a', 'b', 'a', 'a', 'b'] },
  step: (() => { const kk = 'C2 . . . C2 . . . C2 . . . C2 . . .', hh = '. . C8 . . . C8 . . . C8 . . . C8 .';
    const P = {
      i: { lead: '. . . . . . . . . . . . . . . .', bass: 'G2 . . . G2 . . . G2 . . . G2 . . .', kick: kk, hat: hh },
      v1: { lead: 'B4 . . D5 . . G5 . . F#5 . D5 . . B4 .', bass: 'G2 . G2 . G2 . G2 . G2 . G2 . G2 . G2 .', kick: kk, hat: hh },
      v2: { lead: 'C5 . . E5 . . A5 . . G5 . E5 . . C5 .', bass: 'A2 . A2 . A2 . A2 . D3 . D3 . D3 . D3 .', kick: kk, hat: hh },
      c1: { lead: 'G5 . G5 . A5 . G5 . E5 . D5 . E5 . G5 .', bass: 'C3 . C3 . C3 . C3 . D3 . D3 . D3 . D3 .', kick: kk, hat: 'C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 .' },
      c2: { lead: 'B5 . A5 . G5 . E5 . D5 . E5 . G5 . . .', bass: 'E3 . E3 . E3 . E3 . G2 . G2 . G2 . G2 .', kick: kk, hat: 'C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 .' },
      br: { lead: 'D5 . . . . . . . A4 . . . . . . .', bass: 'D3 . . . . . . . D3 . . . . . . .', kick: 'C2 . . . . . . . C2 . . . . . . .', hat: '. . . . . . . . . . . . C8 . C8 .' },
    };
    return { bpm: 104, tracks: { lead, bass: { wave: 'triangle', decay: 0.13, volume: 0.7 }, kick, hat }, patterns: P,
      order: ['i', 'i', 'i', 'i', 'v1', 'v2', 'v1', 'v2', 'v1', 'v2', 'v1', 'v2', 'c1', 'c2', 'c1', 'c2', 'c1', 'c2', 'c1', 'c2', 'br', 'br', 'br', 'br', 'c1', 'c2', 'c1', 'c2', 'c1', 'c2', 'c1', 'c2'] }; })(),
  lagoon: { bpm: 120, tracks: { uke: { wave: 'triangle', decay: 0.09, volume: 0.66 }, bass: { wave: 'triangle', decay: 0.16, volume: 0.56 }, tick: { ...hat, volume: 0.2 } }, patterns: {
    a: { uke: 'C5 . E5 G5 . E5 C5 . F5 . A5 C6 . A5 F5 .', bass: 'C3 . . . G2 . . . F2 . . . C3 . . .', tick: 'C8 . . C8 . . C8 . C8 . . C8 . . C8 .' },
    b: { uke: 'G4 . B4 D5 . B4 G4 . C5 . E5 G5 . E5 C5 .', bass: 'G2 . . . D3 . . . C3 . . . G2 . . .', tick: 'C8 . . C8 . . C8 . C8 . . C8 . . C8 .' },
  }, order: ['a', 'a', 'b', 'a'] },
  jog: { bpm: 112, tracks: { lead: { ...lead, volume: 0.36 }, pluck: { ...pluck, volume: 0.42, decay: 0.12 }, bass: { wave: 'triangle', decay: 0.12, volume: 0.6 }, hat }, patterns: {
    a: { lead: 'E5 . . . G5 . . . A5 . G5 . E5 . . .', pluck: 'C4 . E4 . G4 . E4 . C4 . E4 . G4 . E4 .', bass: 'C3 . . . C3 . . . G2 . . . G2 . . .', hat: 'C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 .' },
    b: { lead: 'F5 . . . A5 . . . G5 . E5 . D5 . . .', pluck: 'F3 . A3 . C4 . A3 . G3 . B3 . D4 . B3 .', bass: 'F2 . . . F2 . . . G2 . . . G2 . . .', hat: 'C8 . C8 . C8 . C8 . C8 . C8 . C8 C8 C8 .' },
  }, order: ['a', 'a', 'b', 'a'] },
  evening: { bpm: 70, tracks: { box, low: { wave: 'triangle', decay: 0.9, volume: 0.5 } }, patterns: {
    a: { box: 'E5 . G5 . B5 . . . A5 . F5 . D5 . . .', low: 'C3 . . . . . . . F2 . . . . . . .' },
    b: { box: 'D5 . F5 . A5 . . . G5 . E5 . C5 . . .', low: 'G2 . . . . . . . C3 . . . . . . .' },
  }, order: ['a', 'b'] },
  stand: { bpm: 40, stepsPerBeat: 1, tracks: { air: { wave: 'triangle', attack: 1.2, decay: 2.4, volume: 0.42 } }, patterns: { a: { air: 'D2 . . . . . . .' }, b: { air: 'A1 . . . . . . .' } }, order: ['a', 'b'] },
  swell: { bpm: 44, stepsPerBeat: 1, tracks: { a: { wave: 'triangle', attack: 1.8, decay: 3.2, volume: 0.62 }, b: { wave: 'triangle', attack: 2.4, decay: 3.2, volume: 0.5 }, c: { wave: 'triangle', attack: 3, decay: 3.2, volume: 0.44 } }, patterns: { a: { a: 'D3 - - - G3 - - -', b: 'F#4 - - - B4 - - -', c: 'A4 - - - D5 - - -' } }, order: ['a'] },
};
export const songLevel = (s) => Object.values(s.tracks).reduce((a, t) => a + (t.volume ?? 0.5), 0) * 0.1 * 0.8;
