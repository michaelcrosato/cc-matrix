// The Medley: three events in fixed windows, 55 s each, 10 s between. Picks come from a seeded stream.
export const MEDLEY = {
  eventSeconds: 55,
  breakSeconds: 10,
  introSeconds: 6,
  events: [
    { kind: 'pose', label: 'Stillness', options: ['tree', 'heron', 'warrior', 'chair'] },
    { kind: 'beat', label: 'Beat', options: ['squats', 'lunges', 'hoop', 'step'] },
    { kind: 'header', label: 'Balance', options: ['header'] },
  ],
  poseHold: 49,
  repsCount: 14,
  awards: {
    stillest: { title: 'Stillest', detail: 'Moved the least. Ounce is suspicious.' },
    beat: { title: 'Most On Time', detail: 'Arrived when asked to. Rare.' },
    headed: { title: 'Thickest Skull', detail: 'A compliment, medically.' },
    apologetic: { title: 'Most Apologetic', detail: 'Took the taking part very seriously.' },
    podium: { title: 'Best In Class', detail: 'Ounce will tell no one. Ounce tells everyone.' },
  },
  remarks: {
    first: ['Excellent! ...Compared to the others.', 'First. I shall note it, in pencil.', 'Well done. I have told Kevin. He flew away.'],
    middle: ['A respectable position. Somewhere.', 'You were present. That is on your record now.', 'Second is the first of the rest.'],
    last: ['Someone had to. Thank you.', 'You stood there and took part. Sort of.', 'No change since yesterday. Which is, in a way, consistent.'],
  },
};
