// The Medley: three events in fixed windows, 55 s each with 10 s between (shortened in tests). Picks come from a seeded stream.
export const EVENTS = [
  { id: 'still', title: 'Stillness', pool: ['tree', 'heron', 'warrior', 'chair'] },
  { id: 'beat', title: 'Beat', pool: ['squat', 'hoop', 'step'] },
  { id: 'lean', title: 'Balance-lean', pool: ['header'] },
];
export const EVENT_SECS = 55, GAP_SECS = 10;
export const MEDLEY_TOTAL = EVENTS.length * EVENT_SECS + (EVENTS.length - 1) * GAP_SECS; // 185 s
export function picks(rand) { return EVENTS.map((e) => e.pool[Math.floor(rand() * e.pool.length) % e.pool.length]); }
export const AWARDS = [
  ['Stillest', 'Spent the longest inside the circle.'], ['Most Apologetic', 'Left the circle and said sorry anyway.'], ['Best Reps', 'Counted every rep and some others.'],
  ['Biggest Wobble', 'Moved the most, with feeling.'], ['Most Consistent', 'Did the same thing three times.'],
];
export const MEDALS = ['Gold', 'Silver', 'Bronze', 'Participation'];
