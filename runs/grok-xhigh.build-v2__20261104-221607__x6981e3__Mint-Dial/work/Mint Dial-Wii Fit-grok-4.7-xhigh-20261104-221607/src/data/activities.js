/** Designer data. A new pose or board is a row here, not a new system. */

export const POSES = [
  { id: 'tree', name: 'Apologetic Tree', station: 'pavilion', kind: 'still', clip: 'Tree', ring: 0.4, hold: 25, breath: 0, twist: 'none', unlock: 1, easy: true, song: 'still', thresholds: [45, 70, 90] },
  { id: 'heron', name: 'Startled Heron', station: 'pavilion', kind: 'still', clip: 'Heron', ring: 0.36, hold: 25, breath: 0, twist: 'bias', bias: 0.12, unlock: 1, easy: true, song: 'still', thresholds: [45, 70, 90] },
  { id: 'warrior', name: 'Reluctant Warrior', station: 'pavilion', kind: 'still', clip: 'Warrior', ring: 0.32, hold: 30, breath: 8, twist: 'ynoise', noise: 1.3, unlock: 2, easy: true, song: 'still', thresholds: [45, 70, 90] },
  { id: 'chair', name: 'The Chair Nobody Asked For', station: 'pavilion', kind: 'still', clip: 'Chair', ring: 0.3, hold: 30, breath: 8, twist: 'ramp', unlock: 3, easy: false, song: 'still', thresholds: [45, 70, 90] },
  { id: 'fold', name: 'Tax Season', station: 'pavilion', kind: 'still', clip: 'Fold', ring: 0.28, hold: 30, breath: 6, twist: 'bias', bias: 0.18, unlock: 4, easy: false, song: 'still', thresholds: [45, 70, 90] },
  { id: 'plank', name: 'Plank Negotiation', station: 'pavilion', kind: 'still', clip: 'Plank', ring: 0.24, hold: 35, breath: 6, twist: 'plank', unlock: 5, easy: false, song: 'still', thresholds: [45, 70, 90] },
];

export const REPS = [
  { id: 'squat', name: 'Squats of Regret', station: 'shed', kind: 'reps', clip: 'SquatRep', reps: 10, tempo: 3.2, axis: 'down', unlock: 1, easy: true, song: 'reps', thresholds: [55, 75, 90] },
  { id: 'lunge', name: 'Apology Lunges', station: 'shed', kind: 'reps', clip: 'LungeRep', reps: 10, tempo: 3.2, axis: 'side', unlock: 2, easy: true, song: 'reps', thresholds: [55, 75, 90] },
  { id: 'press', name: 'Overhead Mortgage', station: 'shed', kind: 'reps', clip: 'Press', reps: 8, tempo: 3.6, axis: 'up', lag: 1.5, unlock: 4, easy: false, song: 'reps', thresholds: [55, 75, 90] },
];

export const GAMES = [
  { id: 'hoop', name: 'Hoop Economics', station: 'beach', kind: 'hoop', unlock: 1, easy: true, song: 'hoop', thresholds: [35, 70, 110], play: 60 },
  { id: 'step', name: 'Step Class', station: 'beach', kind: 'step', unlock: 3, easy: true, song: 'step', thresholds: [55, 75, 90], play: 74 },
  { id: 'header', name: 'Coconut Header', station: 'lagoon', kind: 'header', unlock: 2, easy: true, song: 'lagoon', thresholds: [150, 400, 800], play: 60 },
  { id: 'slack', name: 'Slackline', station: 'lagoon', kind: 'slack', unlock: 3, easy: true, song: 'lagoon', thresholds: [1, 2, 3], play: 75 },
  { id: 'tray', name: 'Vitamin Tray', station: 'lagoon', kind: 'tray', unlock: 4, easy: true, song: 'lagoon', thresholds: [40, 60, 80], play: 60 },
  { id: 'jog', name: 'Island Jog', station: 'jog', kind: 'jog', unlock: 5, easy: true, song: 'jog', thresholds: [55, 75, 90], play: 75 },
  { id: 'pier', name: 'Pier Jump', station: 'lagoon', kind: 'pier', unlock: 5, easy: true, song: 'lagoon', thresholds: [18, 28, 38], play: 32 },
  { id: 'longstand', name: 'The Long Stand', station: 'plaza', kind: 'long', unlock: 7, easy: false, song: 'long', thresholds: [45, 70, 90], play: 90 },
];

export const ACTIVITIES = [...POSES, ...REPS, ...GAMES];

export const ACTIVITY_BY_ID = Object.fromEntries(ACTIVITIES.map((a) => [a.id, a]));

export const STATIONS = [
  { id: 'pavilion', name: 'Pavilion of Holding Still', place: [-11, 3] },
  { id: 'shed', name: 'The Rep Shed', place: [11, 3] },
  { id: 'beach', name: 'Beat Beach', place: [12, -10] },
  { id: 'lagoon', name: 'Lagoon Games', place: [-12, -10] },
  { id: 'jog', name: 'Jogging Path', place: [0, 11] },
  { id: 'plaza', name: 'The Plaza', place: [0, 3] },
];

export function activitiesAt(station) {
  return ACTIVITIES.filter((a) => a.station === station);
}

/** Low, mid, high. Expert beats Dennis. Marguerite stays ahead of a sloppy day. */
export const RIVALS = {
  dennis: 0.42,
  june: 0.78,
  marguerite: 0.97,
};

export function rivalScore(def, who) {
  const t = def.thresholds;
  const f = RIVALS[who] ?? 0.5;
  if (def.kind === 'slack') return who === 'dennis' ? 0 : who === 'june' ? 2 : 3;
  return Math.round(t[0] + (t[2] - t[0]) * f);
}
