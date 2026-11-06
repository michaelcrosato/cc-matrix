// The Rep Shed. Input: which way the stick goes to do the rep.
export const REPS = {
  squats: { clip: 'SquatRep', input: 'down', reps: 10, tempo: 3.2 },
  lunges: { clip: 'LungeRep', clipLeft: 'LungeRepL', input: 'sides', reps: 10, tempo: 3.2 },
  press: { clip: 'Press', input: 'up', reps: 8, tempo: 3.6, lagScale: 1.5 },
};
export const EXTRA_REPS = 2; // Every exercise runs 2 reps past its announced end.
/** Share of a rep's tempo: up, hold, down, rest. */
export const REP_SHAPE = { up: 0.4, hold: 0.15, down: 0.35, rest: 0.1 };
