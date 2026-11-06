// The Rep Shed exercises: plain data.
export const REPS = {
  squat: { clip: 'SquatRep', input: 'down', reps: 10, tempo: 3.2, lagMul: 1, alternate: false },
  lunge: { clip: 'LungeRep', clipL: 'LungeRepL', input: 'side', reps: 10, tempo: 3.2, lagMul: 1, alternate: true },
  press: { clip: 'PressRep', input: 'up', reps: 8, tempo: 3.6, lagMul: 1.5, alternate: false },
};
export const REP_SHAPE = { up: 0.4, hold: 0.15, down: 0.35, rest: 0.1 }; // fractions of the tempo
export function repTarget(f) {
  const { up, hold, down } = REP_SHAPE;
  if (f < up) return f / up;
  if (f < up + hold) return 1;
  if (f < up + hold + down) return 1 - (f - up - hold) / down;
  return 0;
}
export const GAG_EXTRA = 2; // every exercise runs two reps past its announced end
