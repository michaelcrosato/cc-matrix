// The Medley: three events in fixed windows. Picks come from a seeded stream.
export const MEDLEY = {
  eventSeconds: 55, gapSeconds: 10,
  events: [
    { name: 'Stillness', award: 'Stillest', picks: ['tree', 'heron', 'warrior', 'chair', 'fold'], norm: 100 },
    { name: 'Beat', award: 'Most Apologetic', picks: ['squats', 'lunges', 'hoop', 'step'], norm: { squats: 100, lunges: 100, press: 100, hoop: 130, step: 100 } },
    { name: 'Lean', award: 'Hardest Head', picks: ['header'], norm: 900 },
  ],
};
export const medleyWindow = (i) => { const s = i * (MEDLEY.eventSeconds + MEDLEY.gapSeconds); return { start: s, end: s + MEDLEY.eventSeconds }; };
export const MEDLEY_TOTAL = MEDLEY.events.length * MEDLEY.eventSeconds + (MEDLEY.events.length - 1) * MEDLEY.gapSeconds;
