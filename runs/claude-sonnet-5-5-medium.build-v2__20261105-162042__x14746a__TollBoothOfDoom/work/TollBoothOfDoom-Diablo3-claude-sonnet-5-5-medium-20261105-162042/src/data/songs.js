// Songs as data. Every piece states or bends the Clemency motif (D minor): D4 A4 F4 E4 | D4 C4 D4 A3.
// Malison's version is the same notes one semitone off, because the bell is cracked.
const N = (s) => s.trim().split(/\s+/);
const shift = (line, semis) => {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return line.trim().split(/\s+/).map((t) => {
    const m = /^([A-G]#?)(\d)$/.exec(t); if (!m) return t;
    const i = names.indexOf(m[1]) + 12 * +m[2] + semis; return names[((i % 12) + 12) % 12] + Math.floor(i / 12);
  }).join(' ');
};
const MOTIF = 'D4 . A4 . F4 . E4 . D4 . C4 . D4 . A3 .';
const MOTIF_B = 'D4 . . A4 . . F4 . E4 . . D4 . C4 D4 .';
const BASS_A = 'D2 . . . . . . . A1 . . . . . . .';
const BASS_B = 'D2 . D2 . F2 . F2 . A1 . A1 . C2 . C2 .';
const BASS_L = 'D2 . . . . . . . . . . . . . . .';
const ARP_D = 'D3 F3 A3 D4 A3 F3 D3 F3 C3 E3 G3 C4 G3 E3 C3 E3';
const ARP_S = 'D4 A3 F3 A3 D4 A3 F3 A3 C4 G3 E3 G3 C4 G3 E3 G3';
const REST16 = '. . . . . . . . . . . . . . . .';
const DR_SLOW = 'C5 . . . . . . . C5 . . . . . . .';
const DR_MARCH = 'C5 . C7 . C6 . C7 . C5 . C7 . C6 . C7 .';
const DR_DRIVE = 'C5 . C7 C7 C6 . C7 . C5 C5 C7 . C6 . C7 C7';
const WIND = 'C4 . . . . . . . . . . . . . . .';
const mk = (bpm, tracks, patterns, order) => ({ bpm, stepsPerBeat: 4, tracks, patterns, order, loop: true });
const T = {
  organ: { wave: 'square', duty: 0.25, decay: 0.5, volume: 0.1 }, lead: { wave: 'triangle', decay: 0.6, volume: 0.14 }, bass: { wave: 'triangle', decay: 0.3, volume: 0.16 },
  arp: { wave: 'square', duty: 0.125, decay: 0.2, volume: 0.05 }, drums: { wave: 'noise', decay: 0.07, volume: 0.07 }, bell: { wave: 'sine', decay: 1.6, volume: 0.15 }, wind: { wave: 'noise', decay: 0.9, volume: 0.03 },
};
const P = (o) => o;

export const SONGS = {
  vespers: mk(60, { bell: T.bell, organ: T.organ, bass: T.bass },
    { a: P({ bell: MOTIF, organ: REST16, bass: REST16 }), b: P({ bell: MOTIF, organ: shift(MOTIF, -12), bass: BASS_A }), c: P({ bell: MOTIF_B, organ: 'D3 . . . F3 . . . A3 . . . D3 . . .', bass: BASS_L }), d: P({ bell: shift(MOTIF, 5), organ: 'G3 . . . A3 . . . F3 . . . D3 . . .', bass: BASS_A }) },
    ['a', 'b', 'c', 'b', 'd', 'c']),
  last_lamps: mk(72, { lead: T.lead, arp: T.arp, bass: T.bass },
    { a: P({ lead: MOTIF, arp: ARP_D, bass: BASS_A }), b: P({ lead: shift(MOTIF, 5), arp: ARP_S, bass: BASS_B }), c: P({ lead: MOTIF_B, arp: ARP_D, bass: BASS_B }), d: P({ lead: shift(MOTIF_B, 7), arp: ARP_S, bass: BASS_A }) },
    ['a', 'b', 'c', 'd']),
  weeping_road: mk(66, { lead: T.lead, bass: T.bass, wind: T.wind, drums: T.drums },
    { a: P({ lead: REST16, bass: BASS_L, wind: WIND, drums: DR_SLOW }), b: P({ lead: MOTIF, bass: BASS_A, wind: WIND, drums: REST16 }), c: P({ lead: shift(MOTIF_B, -12), bass: BASS_L, wind: WIND, drums: DR_SLOW }), d: P({ lead: REST16, bass: BASS_B, wind: WIND, drums: DR_SLOW }) },
    ['a', 'b', 'c', 'd']),
  under_gloam: mk(58, { bell: T.bell, organ: T.organ, bass: T.bass },
    { a: P({ bell: REST16, organ: 'D3 . . . . . . . . . . . . . . .', bass: BASS_L }), b: P({ bell: 'A5 . . . . . . . . . . . . . . .', organ: 'F3 . . . . . . . E3 . . . . . . .', bass: BASS_L }), c: P({ bell: shift(MOTIF_B, 12), organ: 'D3 . . . . . . . C3 . . . . . . .', bass: BASS_A }) },
    ['a', 'b', 'a', 'c']),
  cinders: mk(96, { lead: T.lead, arp: T.arp, bass: T.bass, drums: T.drums },
    { a: P({ lead: REST16, arp: ARP_D, bass: BASS_B, drums: DR_MARCH }), b: P({ lead: MOTIF, arp: ARP_D, bass: BASS_B, drums: DR_MARCH }), c: P({ lead: shift(MOTIF, 3), arp: ARP_S, bass: BASS_B, drums: DR_DRIVE }) },
    ['a', 'b', 'a', 'c']),
  the_ledger: mk(126, { lead: T.organ, bass: T.bass, drums: T.drums },
    { a: P({ lead: 'D4 . D4 . F4 . A4 . G4 . F4 . E4 . . .', bass: 'D2 . A2 . D2 . A2 . G1 . D2 . A1 . E2 .', drums: DR_MARCH }), b: P({ lead: shift(MOTIF, 0), bass: 'D2 . A2 . D2 . A2 . C2 . G2 . C2 . G2 .', drums: DR_MARCH }), c: P({ lead: 'A4 . A4 . F4 . D4 . E4 . F4 . E4 . . .', bass: 'D2 . A2 . D2 . A2 . A1 . E2 . A1 . E2 .', drums: DR_DRIVE }) },
    ['a', 'b', 'a', 'c']),
  the_climb: mk(104, { lead: T.lead, arp: T.arp, bass: T.bass, drums: T.drums },
    { a: P({ lead: MOTIF, arp: ARP_D, bass: BASS_B, drums: DR_DRIVE }), b: P({ lead: shift(MOTIF, 2), arp: shift(ARP_D, 2), bass: shift(BASS_B, 2), drums: DR_DRIVE }), c: P({ lead: shift(MOTIF, 5), arp: shift(ARP_D, 5), bass: shift(BASS_B, 5), drums: DR_DRIVE }) },
    ['a', 'b', 'c', 'b']),
  eventide: mk(138, { lead: T.organ, arp: T.arp, bass: T.bass, drums: T.drums },
    { a: P({ lead: shift(MOTIF, 1), arp: shift(ARP_D, 1), bass: shift(BASS_B, 1), drums: DR_DRIVE }), b: P({ lead: 'D#4 . . D#5 . . A#4 . . F#4 . . . . . .', arp: shift(ARP_S, 1), bass: shift(BASS_B, 1), drums: DR_DRIVE }), c: P({ lead: shift(MOTIF_B, 1), arp: shift(ARP_D, 1), bass: shift(BASS_A, 1), drums: REST16 }) },
    ['a', 'b', 'a', 'c']),
  the_knell: mk(118, { lead: T.lead, arp: T.arp, bass: T.bass, drums: T.drums },
    { a: P({ lead: MOTIF, arp: ARP_S, bass: BASS_B, drums: DR_DRIVE }), b: P({ lead: shift(MOTIF_B, 3), arp: ARP_D, bass: BASS_B, drums: DR_DRIVE }), c: P({ lead: shift(MOTIF, -5), arp: shift(ARP_S, -5), bass: shift(BASS_B, -5), drums: DR_MARCH }) },
    ['a', 'b', 'c', 'b']),
  clemency: mk(66, { bell: T.bell, lead: T.lead, bass: T.bass },
    { a: P({ bell: shift(MOTIF, 0).replace(/F4/, 'F#4'), lead: REST16, bass: 'D2 . . . . . . . A1 . . . . . . .' }), b: P({ bell: 'D4 . A4 . F#4 . E4 . D4 . C#4 . D4 . A3 .', lead: 'F#3 . . . A3 . . . D4 . . . F#4 . . .', bass: BASS_A }), c: P({ bell: 'D5 . . . A4 . . . F#4 . . . D4 . . .', lead: 'D4 . F#4 . A4 . D5 . A4 . F#4 . D4 . . .', bass: 'D2 . . . A2 . . . D3 . . . . . . .' }) },
    ['a', 'b', 'c', 'b']),
};
export const ZONE_SONGS = { yard: 'weeping_road', town: 'last_lamps', causeway: 'weeping_road', ossuary: 'under_gloam', counting: 'the_ledger', cloister: 'cinders', chapter: 'the_ledger', belfry: 'the_climb', summit: 'eventide', knell: 'the_knell', title: 'vespers', ending: 'clemency' };
