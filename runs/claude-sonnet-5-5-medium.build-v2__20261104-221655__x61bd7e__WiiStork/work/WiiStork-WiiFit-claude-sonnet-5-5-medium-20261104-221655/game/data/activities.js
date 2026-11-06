// Lean sets (section 3 table). A designer adds a row here and points an activity tier at it.
window.G.SETS = {
  body:    { k: 14, c: 7,   s: 4,  A: 3,   nf: 1.1, R: .20, push: null },
  flow:    { k: 12, c: 6,   s: 6,  A: 3.2, nf: 1.3, R: .28, push: [.5, 9] },
  stork1:  { k: 12, c: 5,   s: 13, A: 3,   nf: 1.5, R: .24, push: [.6, 7] },
  stork2:  { k: 11, c: 4.5, s: 15, A: 3.6, nf: 1.7, R: .22, push: [.7, 6] },
  candle:  { k: 10, c: 5,   s: 11, A: 1.4, nf: .8,  R: .20, push: [.55, 5] },
  rope:    { k: 10, c: 3.5, s: 16, A: 3.5, nf: 1.2, R: .40, push: [.9, 5] },
  rail:    { k: 16, c: 8,   s: 0,  A: 1.2, nf: 1.1, R: .30, push: null },
  railY:   { k: 16, c: 8,   s: 0,  sx: 8, sy: 0, A: .8, nf: 1.1, R: .30, push: null },
  railX:   { k: 16, c: 8,   s: 0,  sx: 0, sy: 8, A: .8, nf: 1.1, R: .30, push: null },
  tray:    { k: 14, c: 7,   s: 0,  A: .5,  nf: 1.0, R: .30, push: null },
  free:    { k: 14, c: 7,   s: 3,  A: 1.5, nf: 1.0, R: .30, push: null }
};
// The Rail: three rows, one code path. clip/t0/t1: scrub window (top to bottom); tempo: [down, hold, up, rest] seconds
window.G.REPROWS = [
  { id: 'squat', name: 'Squat Rail', clip: '22_14', t0: 1.1, t1: 1.72, tgt: 1.2, axis: 'y', set: 'railY', reps: [8, 12], tempo: [[2, 0, 2, 1], [3, 1, 1, 1]], card: 'Your lean is the squat. Stick back, body down. Follow the bead on the rail, down and up.' },
  { id: 'pushup', name: 'Push-Up', clip: 'Pushup', t0: 0, t1: -1, tgt: .1, axis: 'y', set: 'railY', reps: [6, 10], tempo: [[2, 0, 2, 1], [3, 1, 1, 1]], card: 'Your lean is the push-up. Down is low. Follow the bead. Keep your form on the other axis.' },
  { id: 'lunge', name: 'Side Lunge', body: 'sideLunge', tgt: 1.5707, axis: 'x', set: 'railX', reps: [8, 12], tempo: [[2, 0, 2, 1], [3, 1, 1, 1]], card: 'Your lean is the lunge. Left, then right. The bead swings; so do you. Keep your form.' }
];
