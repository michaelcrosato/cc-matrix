// The numbers of every activity. Family code in game/activities reads these. "tiers" are in the order they unlock.
G.SETS = {
  body: { k: 14, c: 7, s: 4, A: 3, nf: 1.1, R: .20 },
  flow: { k: 12, c: 6, s: 6, A: 3.2, nf: 1.3, R: .28, push: [.5, 9] },
  stork1: { k: 12, c: 5, s: 13, A: 3, nf: 1.5, R: .24, push: [.6, 7] },
  stork2: { k: 11, c: 4.5, s: 15, A: 3.6, nf: 1.7, R: .22, push: [.7, 6] },
  candle: { k: 10, c: 5, s: 11, A: 1.4, nf: .8, R: .20, push: [.55, 5] },
  rope: { k: 10, c: 3.5, s: 16, A: 3.5, nf: 1.2, R: .40, push: [.9, 5] },
  ropeWalk: { k: 10, c: 4.5, s: 11.5, A: 1.9, nf: 1.1, R: .40, push: [.45, 7] },
  ropeWalk2: { k: 10, c: 4.2, s: 12.5, A: 2.4, nf: 1.2, R: .36, push: [.6, 6] },
  rep: { k: 16, c: 8, s: 0, sx: 8, sy: 0, A: 1, nf: 1.1, R: .3 },
  repSide: { k: 16, c: 8, s: 0, sx: 0, sy: 8, A: 1, nf: 1.1, R: .3 },
  plain: { k: 16, c: 8, s: 1, A: .6, nf: 1, R: .4 }
};
G.ACTDATA = {
  stork: { tiers: [{ set: 'stork1', dur: 45, ringMove: 12, ringR: .22, gull: { every: 14, stay: 5, f: 2.5 } }, { set: 'stork2', dur: 45, ringMove: 12, ringR: .22, gull: { every: 11, stay: 5, f: 2.5 }, eyesClosed: true }], stars: [.35, .65, .90] },
  flow: { tiers: [{ set: 'flow', poses: ['lowLunge', 'downDog', 'triangle', 'warrior', 'stork'], breaths: 2, cycle: 8, ringMove: 0 }, { set: 'stork1', poses: ['warrior', 'triangle', 'lowLunge', 'stork', 'kneeLift'], breaths: 2, cycle: 8, ringMove: 0 }], stars: [.5, .75, .92] },
  candle: { tiers: [{ set: 'candle', dur: 60, thoughtEvery: 7.5, thoughtF: [3, 5] }, { set: 'candle', dur: 60, thoughtEvery: 5.5, thoughtF: [3.5, 5.5], extra: ['blender', 'goose'] }], stars: [.35, .65, .85] },
  squat: { clip: '22_14', t0: 1.1, t1: 1.72, tgt: 1.2, tiers: [{ reps: 8, down: 2, hold: 0, up: 2 }, { reps: 12, down: 3, hold: 1, up: 1 }], stars: [.35, .65, .90] },
  pushup: { clip: 'Pushup', t0: 0, t1Frac: .5, tgt: .1, tiers: [{ reps: 6, down: 2, hold: 0, up: 2 }, { reps: 10, down: 3, hold: 1, up: 1 }], stars: [.35, .65, .90] },
  lunge: { side: true, tgt: 1.57, tiers: [{ reps: 8, down: 2, hold: 0, up: 2 }, { reps: 12, down: 3, hold: 1, up: 1 }], stars: [.35, .65, .90] },
  step: { tiers: [{ chart: 't1', bpm: 100, secs: 60, song: 'step1' }, { chart: 't2', bpm: 120, secs: 60, song: 'step2' }], stars: [.5, .75, .92] },
  hoop: { tiers: [{ dur: 60, band: [7, 11], tossEvery: 7, perHoop: .25 }, { dur: 60, band: [8, 11], tossEvery: 5, perHoop: .3 }], stars: [.35, .65, .90] },
  jog: { tiers: [{ band: [2.6, 3.4], lapMul: 1, obstacles: 1 }, { band: [2.8, 3.3], lapMul: 1, obstacles: 1.6 }], stars: [.35, .65, .90] },
  slalom: { tiers: [{ course: 'slalom1', speed: 220 }, { course: 'slalom2', speed: 240 }], stars: [.35, .65, .90] },
  tray: { tiers: [{ dur: 60, trays: [0, 1, 2], G: 1 }, { dur: 60, trays: [1, 2, 0], G: 1.25 }], stars: [.35, .65, .90] },
  laundry: { tiers: [{ set: 'ropeWalk', spans: [240, 300, 300], speed: 19, pins: 9, gustEvery: 8, par: 60, worst: 120 }, { set: 'ropeWalk2', spans: [280, 340, 340], speed: 21, pins: 14, gustEvery: 6, par: 62, worst: 122 }], stars: [.35, .65, .90] }
};
