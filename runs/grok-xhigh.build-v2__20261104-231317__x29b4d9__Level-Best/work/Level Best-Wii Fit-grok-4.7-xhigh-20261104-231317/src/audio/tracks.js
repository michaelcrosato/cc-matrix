/** Original city-pop and bossa. The title motif is used as written. */

export const TITLE_MOTIF = [
  [[0, 77, 3], [3, 75, 1], [4, 73, 2], [6, 68, 4], [12, 70, 2], [14, 72, 2]],
  [[0, 73, 3], [3, 72, 1], [4, 70, 2], [6, 65, 6], [14, 68, 2]],
  [[0, 70, 3], [3, 68, 1], [4, 66, 2], [6, 63, 4], [12, 65, 2], [14, 66, 2]],
  [[0, 68, 3], [3, 70, 1], [4, 72, 2], [6, 75, 6]],
];

export const TRACKS = {
  title: { bpm: 92, swing: 0.08, lead: 'vibes', bed: 'epiano', bass: [61, 58, 63, 56], motif: true },
  island: { bpm: 84, swing: 0.04, lead: 'marimba', bed: 'pad', bass: [53, 57, 58, 60], motif: false },
  stillness: { bpm: 60, swing: 0, lead: 'flute', bed: 'pad', bass: [62, 64], motif: false },
  strength: { bpm: 100, swing: 0.1, lead: 'brass', bed: 'epiano', bass: [52, 57], motif: false },
  cardio: { bpm: 116, swing: 0, lead: 'brass', bed: 'epiano', bass: [61, 60, 58, 63], motif: false },
  balance: { bpm: 118, swing: 0, lead: 'marimba', bed: 'woodblock', bass: [60, 57, 62, 67], motif: false },
  level: { bpm: 80, swing: 0.06, lead: 'epiano', bed: 'vibes', bass: [61, 58, 63, 56], motif: true },
};

export const STINGS = {
  attended: [60, 64],
  adequate: [64, 67, 71],
  pleasant: [67, 71, 74],
  exemplary: [69, 72, 76, 81],
  suspicious: [72, 76, 79, 84],
  reveal: [55, 60, 64, 72],
  unlock: [76, 79, 84],
};

export const EVENT_TRACK = {
  poses: 'stillness', cairn: 'stillness', stillWater: 'stillness',
  logReps: 'strength', plank: 'strength', tug: 'strength',
  stepClass: 'cardio', plates: 'cardio', islandLoop: 'cardio',
  fruitHat: 'balance', roomService: 'balance', springboard: 'balance', raft: 'balance',
  grandHold: 'level',
};
