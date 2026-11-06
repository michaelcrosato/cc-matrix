// Holding Still. A new pose needs a row here and nothing else.
export const POSES = {
  tree: { clip: 'Tree', ring: 0.40, hold: 25, breath: 0, twist: {} },
  heron: { clip: 'Heron', ring: 0.36, hold: 25, breath: 0, twist: { wanderX: 0.12, wanderSpeed: 0.28 } },
  warrior: { clip: 'Warrior', ring: 0.32, hold: 30, breath: 8, twist: { noiseY: 1.3 } },
  chair: { clip: 'Chair', ring: 0.30, hold: 30, breath: 8, twist: { noiseRamp: [1, 1.5] } },
  fold: { clip: 'Fold', ring: 0.28, hold: 30, breath: 6, twist: { wanderX: 0.18, wanderSpeed: 0.33 } },
  plank: { clip: 'Plank', ring: 0.24, hold: 35, breath: 6, twist: { inst: 1.2, tremorAfter: 20 } },
};
export const SETTLE = 4;
export const RELEASE = 2;
export const HOLD_LINES = ['Hold. You may blink on Thursday.', 'Stillness is a muscle. So is regret. We train both here.', 'Do not look at me. I am not doing anything.'];
