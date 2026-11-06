import { closeUp } from './_kit.js';

// Do No Harm. Generous clock, soft music, no attacks. After all that action the slowness is the point.
const strand = (n, at, line) => ([
  { k: 'incision', id: `s${n}cut`, at: [at[0] - 0.6, at[1]], ang: 0, len: 1.2, short: true, unlocks: `s${n}` },
  { k: 'prop', id: `s${n}`, prop: 'strand', at, dir: at[1] > 0 ? 80 : -80, pull: 1.3, speedLimit: 2.6, locked: true, onDone: [{ vitals: 6 }, { painUp: 1 }, { say: line }] },
]);

export default {
  id: 'op10', num: 10, title: 'DO NO HARM', arena: 'spine', surgeon: 'ilya', gifts: ['quiet'], tools: ['drain', 'forceps', 'suture', 'gel', 'syringe', 'scalpel', 'laser', 'scanner'], music: 'op10',
  scene: 'ep10',
  patient: {
    name: 'DR. HESPER LINDQVIST', age: 66, job: 'FOUNDER, THE MERCY FOUNDATION', hook: 'SHE TOOK IT FIRST, ELEVEN YEARS AGO. SHE HAS NOT FELT ANYTHING SINCE.',
    objective: 'NO ONE IS GOING TO ATTACK YOU. TAKE YOUR TIME.',
    followUp: { S: 'She pleaded guilty to everything, in pain, and refused anything for it.', A: 'She testified from a wheelchair. She wept when the sun was warm.', B: 'She lives. The Foundation does not. She writes to you. You have not replied.', C: 'She lives. She has asked what it was for. You are still working on that.' },
  },
  time: 240, vitals: { start: 60, drain: 0.05 }, doses: 2,
  stages: [
    { id: 'open', objective: 'SLOWLY. ALONG THE SPINE.', hint: 'scalpel', say: ['reyes|You do not have to do this, Doctor. I will say so once. It is on the chart.', 'ilya|It is my shift.'],
      do: [{ pain: 0 }], spawn: [{ k: 'strain:pale', id: 'pale', at: [0, 0.2], task: false }, { k: 'incision', at: [-4.4, -2.5], ang: 0, len: 8.8 }], until: { clear: ['incision'] } },
    { id: 'strands', objective: 'A SHORT CUT. THEN GENTLY, GENTLY LIFT EACH STRAND.', hint: 'scalpel', say: ['reyes|Slow strokes. Slow forceps. It will not fight you. That is what is wrong with it.', 'hesper|I can hear you. I can hear everything. Isn\'t it strange. Nothing else.'],
      spawn: [...strand(1, [-3.6, 0.7], 'hesper|...Something. I felt something. A cold.'), ...strand(2, [-1.4, -0.8], 'hesper|That is my back. I had forgotten I had a back.'), ...strand(3, [1.3, 0.8], 'hesper|Oh. Oh, that is... Is it always like this?'), ...strand(4, [3.5, -0.7], 'hesper|It hurts. Doctor. Doctor, it *hurts*.')],
      until: { clear: ['incision', 'prop'] } },
    { id: 'core', objective: 'THE LAST OF IT. THE GENTLEST HANDS YOU HAVE.', hint: 'forceps', say: ['hesper|Why? You could have let me go. Why are you doing this?', 'ilya|Because it\'s my shift.'],
      spawn: [{ k: 'core', id: 'palecore', at: [0, 0.2], dir: -90, pull: 2.4, speedLimit: 1.8, grabR: 0.3, tearMul: 1.5, onDone: [{ vitals: 15 }, { painUp: 2 }, { remove: ['pale'] }, { say: ['hesper|...Ah. *Ah.* There you are. Eleven years.', 'reyes|Close her, Doctor. Gently. She can feel it now.'] }] }], until: { clear: ['core'] } },
    ...closeUp({ sutures: [{ at: [-4.4, -2.5], ang: 0, len: 8.8 }], gel: { at: [0, 0.2], rx: 3, rz: 1 }, dressing: { at: [-3, 2.2], ang: 0, len: 6 }, dressSay: 'reyes|Dress it. Straight. ...That will do, Doctor.' }),
  ],
};
