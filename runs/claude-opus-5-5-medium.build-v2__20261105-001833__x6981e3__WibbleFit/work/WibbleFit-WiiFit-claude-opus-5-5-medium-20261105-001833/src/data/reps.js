// The Rep Shed. axis: which way the stick goes; sides: alternating targets.
export const REPS = {
  squats: { clip: 'SquatRep', axis: 'down', reps: 10, tempo: 3.2 },
  lunges: { clip: 'LungeRepR', clipL: 'LungeRepL', axis: 'side', reps: 10, tempo: 3.2 },
  press: { clip: 'Press', axis: 'up', reps: 8, tempo: 3.6, lagScale: 1.5 },
};
export const REP_CURVE = { up: 0.4, hold: 0.15, down: 0.35, rest: 0.1 };
export const repTarget = (u) => {
  const { up, hold, down } = REP_CURVE;
  if (u < up) return u / up;
  if (u < up + hold) return 1;
  if (u < up + hold + down) return 1 - (u - up - hold) / down;
  return 0;
};
export const REP_GRADES = [[0.85, 'Perfect'], [0.65, 'Good'], [-9, 'Wobbly']];
