// Holding Still poses: plain data. A new pose needs no code (its clip lives in src/art/clips.js).
export const POSES = {
  tree: { clip: 'Tree', ring: 0.4, twist: 'none', hold: 25, breath: 0 },
  heron: { clip: 'Heron', ring: 0.36, twist: 'bias', biasAmp: 0.12, biasAxis: 'x', hold: 25, breath: 0 },
  warrior: { clip: 'Warrior', ring: 0.32, twist: 'noiseY', noiseY: 1.3, hold: 30, breath: 8 },
  chair: { clip: 'Chair', ring: 0.3, twist: 'ramp', ramp: [1, 1.5], hold: 30, breath: 8 },
  fold: { clip: 'Fold', ring: 0.28, twist: 'bias', biasAmp: 0.18, biasAxis: 'both', hold: 30, breath: 6 },
  plank: { clip: 'Plank', ring: 0.24, twist: 'inst', inst: 1.2, tremorAfter: 20, hold: 35, breath: 6 },
};
