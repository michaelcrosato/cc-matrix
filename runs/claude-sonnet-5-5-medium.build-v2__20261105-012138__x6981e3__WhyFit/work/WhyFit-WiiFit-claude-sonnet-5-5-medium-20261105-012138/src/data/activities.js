// Every activity as data: id, name, station, scene kind, camera, song, thresholds, unlock day, hard overrides.
export const ACTIVITIES = {
  tree: { id: 'tree', name: 'Apologetic Tree', station: 'pavilion', kind: 'still', unlock: 1, song: 'still', stars: [45, 70, 90], unit: '%', hard: { ringMul: 0.8 } },
  heron: { id: 'heron', name: 'Startled Heron', station: 'pavilion', kind: 'still', unlock: 1, song: 'still', stars: [45, 70, 90], unit: '%', hard: { ringMul: 0.8 } },
  warrior: { id: 'warrior', name: 'Reluctant Warrior', station: 'pavilion', kind: 'still', unlock: 2, song: 'still', stars: [45, 70, 90], unit: '%', hard: { ringMul: 0.8 } },
  chair: { id: 'chair', name: 'The Chair Nobody Asked For', station: 'pavilion', kind: 'still', unlock: 3, song: 'still', stars: [45, 70, 90], unit: '%', hard: { ringMul: 0.8 } },
  fold: { id: 'fold', name: 'Tax Season', station: 'pavilion', kind: 'still', unlock: 4, song: 'still', stars: [45, 70, 90], unit: '%', hard: { ringMul: 0.8 } },
  plank: { id: 'plank', name: 'Plank Negotiation', station: 'pavilion', kind: 'still', unlock: 5, song: 'still', stars: [45, 70, 90], unit: '%', hard: { ringMul: 0.8 } },
  squat: { id: 'squat', name: 'Squats of Regret', station: 'shed', kind: 'reps', unlock: 1, song: 'reps', stars: [55, 75, 90], unit: '%', hard: { tempoMul: 0.8 } },
  lunge: { id: 'lunge', name: 'Apology Lunges', station: 'shed', kind: 'reps', unlock: 2, song: 'reps', stars: [55, 75, 90], unit: '%', hard: { tempoMul: 0.8 } },
  press: { id: 'press', name: 'Overhead Mortgage', station: 'shed', kind: 'reps', unlock: 4, song: 'reps', stars: [55, 75, 90], unit: '%', hard: { tempoMul: 0.8 } },
  hoop: { id: 'hoop', name: 'Hoop Economics', station: 'beach', kind: 'hoop', unlock: 1, song: 'hoop', stars: [35, 70, 110], unit: ' rot', hard: { bandMul: 0.85, duration: 60 } },
  step: { id: 'step', name: 'Step Class', station: 'beach', kind: 'step', unlock: 3, song: 'step', stars: [55, 75, 90], unit: '%', hard: { windowMul: 0.75 } },
  header: { id: 'header', name: 'Coconut Header', station: 'lagoon', kind: 'header', unlock: 2, song: 'lagoon', stars: [150, 400, 800], unit: '', hard: { intervalMul: 0.8 } },
  slack: { id: 'slack', name: 'Slackline', station: 'lagoon', kind: 'slack', unlock: 3, song: 'lagoon', stars: [1, 2, 3], unit: '', special: true, hard: { instMul: 1.15 } },
  tray: { id: 'tray', name: 'Vitamin Tray', station: 'lagoon', kind: 'tray', unlock: 4, song: 'lagoon', stars: [40, 60, 80], unit: '%', hard: { boardOffset: 1 } },
  pier: { id: 'pier', name: 'Pier Jump', station: 'lagoon', kind: 'pier', unlock: 5, song: 'lagoon', stars: [18, 28, 38], unit: ' m', hard: { speedMul: 0.9 } },
  jog: { id: 'jog', name: 'Island Jog', station: 'jog', kind: 'jog', unlock: 5, song: 'jog', stars: [55, 75, 90], unit: '%', hard: { bandMul: 0.85 } },
  longstand: { id: 'longstand', name: 'The Long Stand', station: 'weigh', kind: 'longstand', unlock: 7, song: 'longstand', stars: [45, 70, 90], unit: '%', hidden: true, hard: {} },
};
export const ACT_ORDER = ['tree', 'heron', 'warrior', 'chair', 'fold', 'plank', 'squat', 'lunge', 'press', 'hoop', 'step', 'header', 'slack', 'tray', 'pier', 'jog'];
export const actName = (id) => ACTIVITIES[id]?.name ?? id;
export const HARD_DAY = 6;
export const lockedUntil = (id) => ACTIVITIES[id].unlock;
export const isOpen = (id, day, dropIn = false) => dropIn || day >= ACTIVITIES[id].unlock;
/** Stars from a score and a thresholds array [1,2,3], scaled by the live star-threshold slider. */
export function starsFor(id, score, scale = 1) {
  const a = ACTIVITIES[id]; if (!a || a.special) return 0;
  return a.stars.filter((t) => score >= t * scale).length;
}
