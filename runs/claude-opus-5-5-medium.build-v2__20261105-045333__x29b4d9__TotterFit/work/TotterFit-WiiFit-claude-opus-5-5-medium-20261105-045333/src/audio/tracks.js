// Tracks are data: bpm, swing, chords per bar, parts. 16 steps to a bar.
const N = { Dbmaj9: [49, 65, 68, 72, 75], Bbm9: [46, 61, 65, 68, 72], Ebm9: [51, 61, 66, 70, 77], Ab13: [44, 66, 72, 77, 82], Gbmaj9: [42, 65, 68, 70, 73], Fm7: [41, 63, 68, 72, 75], Ab13sus: [44, 66, 73, 77, 82],
  Fmaj7: [41, 64, 67, 69, 72], Am7: [45, 64, 67, 69, 72], Bbmaj7: [46, 62, 65, 69, 70], C9: [48, 64, 67, 70, 74], Dm9: [50, 65, 69, 72, 76], Gm9: [43, 65, 69, 70, 74], C13: [48, 64, 70, 74, 81],
  Dmaj9: [38, 66, 69, 73, 76], Emaj9D: [38, 68, 71, 75, 78], Em9: [40, 62, 66, 67, 71], A13: [45, 61, 66, 67, 71], Dbmaj7: [49, 65, 68, 72, 77], Cm7: [48, 63, 67, 70, 75], Bbm7: [46, 61, 65, 68, 73], Ebsus: [51, 61, 65, 68, 70], C6: [48, 64, 67, 69, 72], Dm7: [50, 65, 69, 72, 77], G7: [43, 65, 67, 71, 74], Am7b: [45, 64, 67, 72, 76] };
const seq = (...names) => names.map(n => N[n]);
const MOTIF = [
  [[0, 77, 3], [3, 75, 1], [4, 73, 2], [6, 68, 4], [12, 70, 2], [14, 72, 2]],
  [[0, 73, 3], [3, 72, 1], [4, 70, 2], [6, 65, 6], [14, 68, 2]],
  [[0, 70, 3], [3, 68, 1], [4, 66, 2], [6, 63, 4], [12, 65, 2], [14, 66, 2]],
  [[0, 68, 3], [3, 70, 1], [4, 72, 2], [6, 75, 6]],
];
const MOTIF_LOOP = [...MOTIF, ...MOTIF, [[0, 73, 4], [6, 72, 2], [8, 70, 8]], [[0, 68, 8]], [[0, 66, 4], [8, 68, 4]], [[0, 75, 8]]];
const levelBars = seq('Dbmaj9', 'Bbm9', 'Ebm9', 'Ab13', 'Dbmaj9', 'Bbm9', 'Ebm9', 'Ab13', 'Gbmaj9', 'Fm7', 'Ebm9', 'Ab13sus');
export const TRACKS = {
  levelBest: { bpm: 92, swing: .14, bars: levelBars, parts: [
    { inst: 'vibes', motif: MOTIF_LOOP, vel: .55 },
    { inst: 'epiano', chord: [[0, 3], [6, 2], [10, 3]], vel: .3 },
    { inst: 'softBass', bass: [[0, 0, 4], [6, 0, 2], [8, 7, 4], [14, 0, 2]], oct: 0, vel: .55 },
    { inst: 'brush', hits: [0, 2, 4, 6, 8, 10, 12, 14], vel: .5 }, { inst: 'rim', hits: [4, 12], vel: .25 },
  ] },
  island: { bpm: 84, swing: .06, bars: seq('Fmaj7', 'Am7', 'Bbmaj7', 'C9', 'Fmaj7', 'Dm9', 'Gm9', 'C13'), parts: [
    { inst: 'marimba', arp: [[0, 1], [3, 3], [6, 2], [8, 4], [11, 3], [14, 2]], vel: .45 },
    { inst: 'softBass', bass: [[0, 0, 3], [3, 7, 1], [8, 7, 3], [11, 0, 1]], vel: .55 },
    { inst: 'shaker', hits: [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15], vel: .6 }, { inst: 'rim', hits: [3, 6, 10, 13], vel: .25 },
  ] },
  stillness: { bpm: 60, swing: 0, bars: seq('Dmaj9', 'Dmaj9', 'Emaj9D', 'Emaj9D'), parts: [
    { inst: 'pad', chord: [[0, 16]], vel: .5 }, { inst: 'bell', motif: [[[0, 81, 8]], [[8, 85, 8]], [[0, 80, 8]], [[8, 83, 8]]], vel: .4 },
    { inst: 'flute', motif: [[], [[0, 76, 6], [8, 78, 6]], [], [[0, 80, 6], [8, 76, 8]]], vel: .5 },
  ] },
  strength: { bpm: 100, swing: .04, bars: seq('Em9', 'A13'), parts: [
    { inst: 'bass', bass: [[0, 0, 2], [3, 0, 1], [6, 12, 1], [8, 0, 1], [10, 10, 2], [14, 7, 2]], vel: .7 }, { inst: 'clav', chord: [[2, 1], [5, 1], [10, 1], [13, 1]], vel: .5 },
    { inst: 'brass', chord: [[12, 2]], every: 2, vel: .5 }, { inst: 'kick', hits: [0, 6, 8, 11], vel: .7 }, { inst: 'snare', hits: [4, 12], vel: .6 }, { inst: 'shaker', hits: [0, 2, 4, 6, 8, 10, 12, 14], vel: .5 },
  ] },
  cardio: { bpm: 112, swing: 0, bars: seq('Dbmaj7', 'Cm7', 'Bbm7', 'Ebsus'), parts: [
    { inst: 'bass', bass: [[0, 0, 1], [2, 12, 1], [4, 0, 1], [6, 12, 1], [8, 0, 1], [10, 12, 1], [12, 0, 1], [14, 12, 1]], vel: .65 }, { inst: 'epiano', chord: [[2, 1], [6, 1], [10, 1], [14, 1]], vel: .32 },
    { inst: 'brass', chord: [[0, 2], [7, 1]], every: 4, vel: .5 }, { inst: 'kick', hits: [0, 4, 8, 12], vel: .75 }, { inst: 'snare', hits: [4, 12], vel: .6 }, { inst: 'shaker', hits: [2, 6, 10, 14], vel: .7 },
  ] },
  balance: { bpm: 118, swing: .05, bars: seq('C6', 'Am7', 'Dm7', 'G7'), parts: [
    { inst: 'marimba', arp: [[0, 1], [2, 2], [4, 3], [6, 2], [8, 4], [10, 3], [12, 2], [14, 3]], vel: .42 }, { inst: 'pizz', chord: [[4, 1], [12, 1]], vel: .4 },
    { inst: 'tuba', bass: [[0, 0, 3], [8, 7, 3]], vel: .7 }, { inst: 'wood', hits: [4, 7, 12, 15], note: 84, vel: .4 }, { inst: 'shaker', hits: [2, 6, 10, 14], vel: .35 },
  ] },
  level: { bpm: 76, swing: .1, bars: levelBars, parts: [
    { inst: 'epiano', motif: MOTIF_LOOP, vel: .6 }, { inst: 'vibes', motif: MOTIF_LOOP, from: 8, vel: .35 }, { inst: 'pad', chord: [[0, 16]], from: 4, vel: .35 },
    { inst: 'softBass', bass: [[0, 0, 6], [8, 7, 6]], from: 4, vel: .5 }, { inst: 'brush', hits: [0, 4, 8, 12], from: 8, vel: .5 }, { inst: 'flute', motif: [[], [], [], [], [], [], [], [], [[0, 80, 8]], [[0, 77, 8]], [[0, 75, 8]], [[0, 80, 12]]], from: 12, vel: .5 },
  ] },
};
export const STINGS = {
  attended: [['wood', 0, 72, .2], ['wood', .18, 72, .2], ['marimba', .36, 67, .5]],
  adequate: [['marimba', 0, 72, .3], ['marimba', .14, 76, .3], ['marimba', .28, 79, .5]],
  pleasant: [['vibes', 0, 72, .4], ['vibes', .14, 76, .4], ['vibes', .28, 79, .4], ['vibes', .42, 84, .9]],
  exemplary: [['brass', 0, 72, .25], ['brass', .14, 76, .25], ['brass', .28, 79, .25], ['brass', .42, 84, .9], ['bell', .42, 96, 1]],
  suspicious: [['brass', 0, 60, .3], ['brass', .3, 66, .3], ['vibes', .6, 84, .8], ['vibes', .75, 78, .8], ['bell', 1.1, 90, 1.5]],
  reveal: [['brass', 0, 69, .2], ['brass', 0, 73, .2], ['brass', 0, 76, .2], ['kick', 0, 0, .2], ['bell', .1, 88, 1.4]],
  unlock: [['vibes', 0, 79, .2], ['vibes', .1, 83, .2], ['vibes', .2, 86, .2], ['vibes', .3, 91, .8]],
  notch: [['marimba', 0, 60, .2], ['marimba', .12, 64, .2], ['marimba', .24, 67, .4]],
  fanfare: [['brass', 0, 65, .2], ['brass', .2, 65, .1], ['brass', .32, 70, .4], ['brass', .75, 74, .9], ['snare', 0, 0, .1], ['kick', .75, 0, .1], ['bell', .75, 86, 1.2]],
};
