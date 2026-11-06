// The score, as data. Every piece states or bends the Clemency motif (D minor):
//   D4 A4 F4 E4 | D4 C4 D4 A3
// Malison's version is the same notes, one semitone off, because the bell is cracked.

/** 'D4:4 r:4 A4:2' expands to steps: a note, its holds, rests. */
const S = (spec) => spec.trim().split(/\s+/).flatMap((tok) => {
  const [n, l = '1'] = tok.split(':');
  const len = Number(l);
  if (n === 'r') return Array(len).fill('.');
  return [n, ...Array(len - 1).fill('-')];
}).join(' ');
const rep = (spec, n) => Array(n).fill(spec).join(' ');

const inst = {
  bell: { wave: 'sine', attack: 0.002, decay: 2, volume: 0.22, layers: [{ wave: 'sine', freq: 0, decay: 1, volume: 0 }] },
  organ: { wave: 'square', duty: 0.25, attack: 0.03, decay: 0.2, volume: 0.09 },
  organ2: { wave: 'square', duty: 0.5, attack: 0.03, decay: 0.2, volume: 0.06 },
  lead: { wave: 'square', duty: 0.25, attack: 0.005, decay: 0.2, volume: 0.1 },
  lute: { wave: 'triangle', decay: 0.4, volume: 0.17 },
  bass: { wave: 'triangle', decay: 0.25, volume: 0.22 },
  deep: { wave: 'sine', decay: 0.7, volume: 0.28 },
  stab: { wave: 'saw', decay: 0.14, volume: 0.1 },
  wind: { wave: 'noise', attack: 0.3, decay: 0.8, volume: 0.03 },
  snare: { wave: 'noise', decay: 0.09, volume: 0.1 },
  hat: { wave: 'noise', decay: 0.03, volume: 0.05 },
  kick: { wave: 'sine', decay: 0.1, volume: 0.3, freqEnd: 40 },
};
for (const k of Object.keys(inst)) { if (inst[k].layers) delete inst[k].layers; if (inst[k].freqEnd) delete inst[k].freqEnd; }
const pick = (...ids) => Object.fromEntries(ids.map((i) => [i, inst[i]]));

export const SONGS = {
  vespers: { bpm: 60, stepsPerBeat: 2, tracks: pick('bell', 'organ', 'organ2', 'deep'), order: ['a', 'b', 'a', 'c'], patterns: {
    a: { bell: S('D4:4 A4:4 F4:4 E4:4 D4:4 C4:4 D4:4 A3:4 r:32'), organ: S('r:32 D3:16 C3:8 A2:8'), organ2: S('r:32 A3:16 G3:8 E3:8'), deep: S('D2:16 r:16 D2:16 A1:16') },
    b: { bell: S('r:16 D5:4 r:12 D4:4 A4:4 F4:4 E4:4 D4:8 r:8'), organ: S('D3:16 F3:16 G3:16 A3:16'), organ2: S('A3:16 C4:16 D4:16 E4:16'), deep: S('D2:16 F2:16 G2:16 A2:16') },
    c: { bell: S('D5:4 A5:4 F5:4 E5:4 D5:4 C5:4 D5:4 A4:4 D4:16 r:16'), organ: S('D3:8 A3:8 F3:8 E3:8 D3:16 D3:16'), organ2: S('F3:8 C4:8 A3:8 G3:8 F3:16 A3:16'), deep: S('D2:32 D2:16 D2:16') },
  } },
  last_lamps: { bpm: 72, tracks: pick('lute', 'lead', 'bass', 'hat'), stepsPerBeat: 2, order: ['a', 'b', 'a', 'c'], patterns: {
    a: { lute: rep(S('D4 A4 F4 A4 D4 A4 F4 A4'), 2) + ' ' + rep(S('C4 G4 E4 G4 C4 G4 E4 G4'), 1) + ' ' + rep(S('A3 E4 C4 E4 A3 E4 C#4 E4'), 1) + ' ' + rep(S('D4 A4 F4 A4 Bb3 F4 D4 F4'), 2) + ' ' + rep(S('C4 G4 E4 G4 A3 E4 C#4 E4'), 2), lead: S('r:16 D5:4 A4:4 F4:4 E4:4 D4:8 C4:4 D4:4 A3:8 r:8'), bass: S('D3:8 D3:8 C3:8 A2:8 D3:8 Bb2:8 C3:8 A2:8'), hat: rep(S('r:3 C8'), 16) },
    b: { lute: rep(S('Bb3 F4 D4 F4 Bb3 F4 D4 F4'), 2) + ' ' + rep(S('F3 C4 A3 C4 F3 C4 A3 C4'), 2) + ' ' + rep(S('G3 D4 Bb3 D4 G3 D4 Bb3 D4'), 2) + ' ' + rep(S('A3 E4 C#4 E4 A3 E4 C#4 E4'), 2), lead: S('F5:6 E5:2 D5:8 C5:6 A4:2 F4:8 G4:6 A4:2 Bb4:8 A4:12 r:4'), bass: S('Bb2:16 F2:16 G2:16 A2:16'), hat: rep(S('r:3 C8'), 16) },
    c: { lute: rep(S('D4 F4 A4 D5 A4 F4 D4 F4'), 4) + ' ' + rep(S('A3 C#4 E4 A4 E4 C#4 A3 C#4'), 2) + ' ' + rep(S('D4 F4 A4 D5 A4 F4 D4 F4'), 2), lead: S('D5:8 A5:8 F5:8 E5:8 D5:8 C5:8 D5:16'), bass: S('D3:16 F3:16 A2:16 D3:16'), hat: rep(S('r:7 C8'), 8) },
  } },
  weeping_road: { bpm: 66, stepsPerBeat: 2, tracks: pick('deep', 'organ', 'lead', 'wind'), order: ['a', 'b', 'a', 'c'], patterns: {
    a: { deep: rep(S('D2:2 r:6'), 8), organ: S('r:32 A3:16 F3:16'), lead: S('r:16 D4:4 r:4 A4:4 r:4 F4:4 r:4 E4:4 r:4 r:16'), wind: S('C4:32 r:8 D4:24') },
    b: { deep: rep(S('A1:2 r:6'), 4) + ' ' + rep(S('D2:2 r:6'), 4), organ: S('C4:16 A3:16 Bb3:16 A3:16'), lead: S('D4:4 r:4 C4:4 r:4 D4:4 r:4 A3:12 r:28'), wind: S('r:16 E4:32 r:16') },
    c: { deep: rep(S('D2:1 r:1 D2:1 r:5'), 8), organ: S('D3:32 C3:16 A2:16'), lead: S('r:32 F4:4 E4:4 D4:4 C4:4 D4:16'), wind: S('D4:64') },
  } },
  under_gloam: { bpm: 58, stepsPerBeat: 2, tracks: pick('organ', 'organ2', 'bell', 'wind'), order: ['a', 'b', 'c', 'b'], patterns: {
    a: { organ: S('D3:32 C3:32'), organ2: S('A3:32 G3:32'), bell: S('r:24 A5:8 r:24 D6:8'), wind: S('C3:64') },
    b: { organ: S('Bb2:32 A2:32'), organ2: S('F3:32 E3:32'), bell: S('r:8 D5:8 r:8 A5:8 r:8 F5:8 r:8 E5:8'), wind: S('r:32 D3:32') },
    c: { organ: S('D3:16 F3:16 E3:16 A2:16'), organ2: S('A3:16 C4:16 B3:16 E3:16'), bell: S('D6:16 r:16 C6:16 A5:16'), wind: S('C3:32 r:32') },
  } },
  cinders: { bpm: 96, tracks: pick('lead', 'bass', 'kick', 'snare', 'stab'), order: ['a', 'a', 'b', 'c'], patterns: {
    a: { lead: rep(S('D4 r D4 F4 r D4 E4 r'), 8), bass: rep(S('D2 r D2 r D2 r D2 D2'), 6) + ' ' + rep(S('C2 r C2 r C2 r A1 A1'), 2), kick: rep(S('C4 r:3 r:2 C4 r'), 8), snare: rep(S('r:4 C6 r:3'), 8), stab: S('r:32 D4:2 r:6 D4:2 r:6 F4:2 r:6 E4:2 r:6') },
    b: { lead: S('D5:4 A5:4 F5:4 E5:4 D5:4 C5:4 D5:4 A4:4 D5:2 D5:2 F5:4 E5:4 C5:4 D5:16'), bass: rep(S('Bb1 r Bb1 r F2 r F2 r'), 2) + ' ' + rep(S('G1 r G1 r D2 r D2 r'), 2) + ' ' + rep(S('A1 r A1 r E2 r E2 r'), 4), kick: rep(S('C4 r:3 C4 r:3'), 8), snare: rep(S('r:2 C6 r:3 C6 r'), 8), stab: rep(S('r:7 A3'), 8) },
    c: { lead: rep(S('A4 r A4 C5 r A4 Bb4 r'), 4) + ' ' + rep(S('D5 r D5 F5 r D5 E5 r'), 4), bass: rep(S('A1 r A1 r A1 r A1 G1'), 4) + ' ' + rep(S('D2 r D2 r D2 r D2 C2'), 4), kick: rep(S('C4 r C4 r:5'), 8), snare: rep(S('r:4 C6 r:2 C6'), 8), stab: S('D4:1 r:15 D4:1 r:15 D4:1 r:15 A3:1 r:15') },
  } },
  ledger: { bpm: 126, tracks: pick('lead', 'bass', 'snare', 'stab', 'kick'), order: ['a', 'b', 'a', 'c'], patterns: {
    // Mock-pompous: a little march, grandly announced, slightly off the point.
    a: { lead: S('D5:3 D5:1 D5:2 A4:2 F5:3 E5:1 D5:4 C5:3 D5:1 E5:2 C5:2 A4:8 D5:3 D5:1 D5:2 A4:2 F5:3 E5:1 D5:4 C5:2 C5:2 E5:2 C5:2 D5:8'), bass: rep(S('D3:2 A2:2'), 8) + ' ' + rep(S('D3:2 A2:2'), 8), snare: rep(S('C7 r C7 C7 C7 r C7 r'), 8), stab: rep(S('r:2 F4:1 r:1 r:2 F4:1 r:1'), 8), kick: rep(S('C4 r:7'), 8) },
    b: { lead: S('Bb4:4 D5:4 F5:4 D5:4 C5:4 E5:4 G5:4 E5:4 D5:4 F5:4 A5:4 F5:4 E5:4 C#5:4 A4:8'), bass: S('Bb2:4 F2:4 Bb2:4 F2:4 C3:4 G2:4 C3:4 G2:4 D3:4 A2:4 D3:4 A2:4 A2:4 E2:4 A2:8'), snare: rep(S('C7 r C7 C7 C7 r C7 r'), 8), stab: rep(S('r:7 D4'), 8), kick: rep(S('C4 r:3 C4 r:3'), 8) },
    c: { lead: S('D5:2 D5:2 C5:2 C5:2 Bb4:2 Bb4:2 A4:4 G4:2 A4:2 Bb4:2 C5:2 D5:8 D5:2 D5:2 C5:2 C5:2 Bb4:2 Bb4:2 A4:4 G4:2 F4:2 E4:2 C#4:2 D4:8'), bass: rep(S('D3:2 A2:2'), 16), snare: rep(S('C7 C7 C7 r C7 r C7 r'), 8), stab: S('D4:2 r:30 D4:2 r:30'), kick: rep(S('C4 r:7'), 8) },
  } },
  the_climb: { bpm: 104, tracks: pick('lead', 'bass', 'kick', 'hat', 'organ'), order: ['a', 'b', 'c', 'b'], patterns: {
    a: { lead: rep(S('D4 F4 A4 D5'), 4) + ' ' + rep(S('E4 G4 Bb4 E5'), 4) + ' ' + rep(S('F4 A4 C5 F5'), 4) + ' ' + rep(S('G4 Bb4 D5 G5'), 4), bass: rep(S('D2 r D2 D2'), 4) + ' ' + rep(S('E2 r E2 E2'), 4) + ' ' + rep(S('F2 r F2 F2'), 4) + ' ' + rep(S('G2 r G2 G2'), 4), kick: rep(S('C4 r:3'), 16), hat: rep(S('r C8'), 32), organ: S('D3:16 E3:16 F3:16 G3:16') },
    b: { lead: S('A4:2 D5:2 A5:4 F5:2 E5:2 D5:4 C5:2 D5:2 A4:4 D5:2 F5:2 A5:4 Bb5:4 A5:4 G5:4 F5:4 E5:4 D5:4 C#5:4 A4:4'), bass: rep(S('D2 D3'), 8) + ' ' + rep(S('Bb1 Bb2'), 8) + ' ' + rep(S('G1 G2'), 8) + ' ' + rep(S('A1 A2'), 8), kick: rep(S('C4 r:3 C4 r C4 r'), 8), hat: rep(S('r C8'), 32), organ: S('D4:16 Bb3:16 G3:16 A3:16') },
    c: { lead: rep(S('A4 C5 E5 A5'), 4) + ' ' + rep(S('Bb4 D5 F5 Bb5'), 4) + ' ' + rep(S('C5 E5 G5 C6'), 4) + ' ' + rep(S('D5 F5 A5 D6'), 4), bass: rep(S('A1 r A1 A1'), 4) + ' ' + rep(S('Bb1 r Bb1 Bb1'), 4) + ' ' + rep(S('C2 r C2 C2'), 4) + ' ' + rep(S('D2 r D2 D2'), 4), kick: rep(S('C4 r:3'), 16), hat: rep(S('C8 C8'), 32), organ: S('A3:16 Bb3:16 C4:16 D4:16') },
  } },
  // The motif, a semitone off: D#4 A#4 F#4 F4 | D#4 C#4 D#4 A#3.
  eventide: { bpm: 138, tracks: pick('lead', 'bass', 'kick', 'snare', 'stab', 'organ'), order: ['a', 'b', 'a', 'c'], patterns: {
    a: { lead: S('D#4:4 A#4:4 F#4:4 F4:4 D#4:4 C#4:4 D#4:4 A#3:4 D#5:4 A#5:4 F#5:4 F5:4 D#5:4 C#5:4 D#5:8'), bass: rep(S('D#2 D#2 r D#2'), 8) + ' ' + rep(S('C#2 C#2 r C#2'), 4) + ' ' + rep(S('A#1 A#1 r A#1'), 4), kick: rep(S('C4 r C4 r'), 16), snare: rep(S('r:4 C6 r:3'), 8), stab: rep(S('D#4 r:3 r:2 D#4 r'), 8), organ: S('D#3:32 C#3:16 A#2:16') },
    b: { lead: rep(S('F#5:2 F5:2 D#5:2 C#5:2'), 4) + ' ' + rep(S('A#4:2 B4:2 C#5:2 D#5:2'), 4), bass: rep(S('B1 B1 r B1'), 8) + ' ' + rep(S('A#1 A#1 r A#1'), 8), kick: rep(S('C4 r C4 C4'), 16), snare: rep(S('r:2 C6 r:3 C6 r'), 8), stab: S('B3:2 r:14 B3:2 r:14 A#3:2 r:14 A#3:2 r:14'), organ: S('B2:32 A#2:32') },
    c: { lead: S('D#5:8 F#5:8 A#5:8 C#6:8 A#5:4 F#5:4 D#5:4 C#5:4 D#5:16'), bass: rep(S('D#2 r D#3 r'), 16), kick: rep(S('C4 C4 r C4'), 16), snare: rep(S('r:4 C6 r C6 r'), 8), stab: rep(S('D#4 r D#4 r:5'), 8), organ: S('D#3:64') },
  } },
  the_knell: { bpm: 118, tracks: pick('lead', 'bass', 'kick', 'hat', 'snare'), order: ['a', 'b', 'c', 'b'], patterns: {
    a: { lead: S('D4:2 r:2 A4:2 r:2 F4:2 r:2 E4:2 r:2 D4:2 r:2 C4:2 r:2 D4:2 r:2 A3:2 r:2 r:32'), bass: rep(S('D2 r D2 r D2 D2 r D2'), 8), kick: rep(S('C4 r:3 C4 r:3'), 8), hat: rep(S('r C8'), 32), snare: rep(S('r:4 C6 r:3'), 8) },
    b: { lead: rep(S('D5 r A4 r F5 r E5 r'), 4) + ' ' + rep(S('C5 r G4 r E5 r D5 r'), 2) + ' ' + rep(S('A4 r E4 r C#5 r A4 r'), 2), bass: rep(S('D2 r D2 r D2 D2 r D2'), 4) + ' ' + rep(S('C2 r C2 r C2 C2 r C2'), 2) + ' ' + rep(S('A1 r A1 r A1 A1 r A1'), 2), kick: rep(S('C4 r C4 r C4 r:3'), 8), hat: rep(S('C8 C8'), 32), snare: rep(S('r:4 C6 r C6 r'), 8) },
    c: { lead: S('F5:4 E5:4 D5:4 C5:4 Bb4:4 C5:4 D5:8 G5:4 F5:4 E5:4 D5:4 C#5:4 D5:4 E5:8'), bass: rep(S('Bb1 r Bb1 r Bb1 Bb1 r Bb1'), 4) + ' ' + rep(S('G1 r G1 r A1 A1 r A1'), 4), kick: rep(S('C4 r:3 C4 r:3'), 8), hat: rep(S('r C8'), 32), snare: rep(S('r:4 C6 r:3'), 8) },
  } },
  // Resolved to major at last.
  clemency: { bpm: 66, stepsPerBeat: 2, tracks: pick('bell', 'organ', 'organ2', 'lute', 'deep'), order: ['a', 'b', 'c'], patterns: {
    a: { bell: S('D4:4 A4:4 F#4:4 E4:4 D4:4 C#4:4 D4:4 A3:4 r:32'), organ: S('D3:16 A3:16 D3:16 G3:16'), organ2: S('F#3:16 C#4:16 A3:16 B3:16'), lute: rep(S('D4 F#4 A4 F#4'), 16), deep: S('D2:32 G2:16 A2:16') },
    b: { bell: S('D5:4 A5:4 F#5:4 E5:4 D5:4 C#5:4 D5:8 r:32'), organ: S('G3:16 D3:16 A3:16 D3:16'), organ2: S('B3:16 F#3:16 C#4:16 F#3:16'), lute: rep(S('G4 B4 D5 B4'), 8) + ' ' + rep(S('A4 C#5 E5 C#5'), 4) + ' ' + rep(S('D4 F#4 A4 F#4'), 4), deep: S('G2:16 D2:16 A2:16 D2:16') },
    c: { bell: S('D5:8 D6:8 A5:8 F#5:8 E5:8 C#5:8 D5:16'), organ: S('D3:32 A2:16 D3:16'), organ2: S('A3:32 E3:16 F#3:16'), lute: rep(S('D4 A4 F#5 A4'), 16), deep: S('D2:64') },
  } },
};

// Variants the game swaps to: Eventide with no drums for the last phase, the Knell with a rising layer.
const stripDrums = (s) => ({ ...s, tracks: Object.fromEntries(Object.entries(s.tracks).filter(([k]) => k !== 'kick' && k !== 'snare')), patterns: Object.fromEntries(Object.entries(s.patterns).map(([p, tr]) => [p, Object.fromEntries(Object.entries(tr).filter(([k]) => k !== 'kick' && k !== 'snare'))])) });
SONGS.eventide_bare = stripDrums(SONGS.eventide);
SONGS.the_knell_high = {
  ...SONGS.the_knell,
  tracks: { ...SONGS.the_knell.tracks, organ: inst.organ },
  patterns: Object.fromEntries(Object.entries(SONGS.the_knell.patterns).map(([p, tr]) => [p, { ...tr, organ: S('D5:16 C5:16 Bb4:16 A4:16') }])),
};

export const ZONE_SONGS = { yard: 'weeping_road', town: 'last_lamps', causeway: 'weeping_road', ossuary: 'under_gloam', cloister: 'cinders', belfry: 'the_climb', pantry: 'under_gloam', knell: 'the_knell', session: 'the_knell' };
export const SONG_IDS = Object.keys(SONGS);
