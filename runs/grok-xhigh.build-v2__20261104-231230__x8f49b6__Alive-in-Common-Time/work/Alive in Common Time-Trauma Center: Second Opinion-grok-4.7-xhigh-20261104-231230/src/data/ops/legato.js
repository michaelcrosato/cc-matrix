import { gel, gelDress, gates, line } from './shape.js';

export default {
  id: 'legato',
  chapter: 3,
  title: 'Legato',
  doctor: 'ines',
  brain: true,
  consult: true,
  scene: { before: 'S9', after: 'S10' },
  patient: {
    name: 'Nadia Bloom', age: 29, job: 'Music teacher',
    note: "Her class has sent a card signed 'Please do not miss.'",
    followUp: 'Back with Class 4. They have sent a second card.',
  },
  timer: 360,
  bpm: 70,
  parScore: 27411,
  music: 'strain-legato',
  teaches: ['legato', 'sforzando', 'scalpel', 'forceps', 'suture', 'gel'],
  sites: [{ id: 'brain', organ: 'brain' }],
  phases: [
    {
      id: 'membrane',
      objective: 'Open the membrane',
      tools: ['scalpel', 'gel'],
      spawn: [
        { kind: 'incision', site: 'brain', at: [-0.35, 0.18], points: line(-0.5, 0.22, 0.15, 0.28, 14) },
        { kind: 'incision', site: 'brain', at: [-0.3, -0.12], points: line(-0.45, -0.08, 0.2, -0.2, 14) },
        { kind: 'gelZone', site: 'brain', rect: gel(-0.7, -0.28, 0.4, 0.32), parTime: 10 },
      ],
      on: gelDress('brain', 7),
      done: { cleared: ['incision', 'gelZone'] },
      say: [
        { at: 0, who: 'ines', mood: 'cool', text: 'Your hands are already in. Do not waste the membrane on a flourish.' },
        { at: 2, who: 'bea', mood: 'stern', text: 'Smaller than you think. This is a person who teaches children their scales.' },
      ],
    },
    {
      id: 'chain',
      objective: 'Sever the chain from the tail',
      tools: ['scalpel', 'forceps', 'clamp'],
      spawn: [{ kind: 'legato', site: 'brain', at: [0.72, 0.02], links: 12 }],
      done: { strainDead: 'legato' },
      say: [{ at: 0, who: 'ines', mood: 'focus', text: 'Tail first. A wrong bead and it ties itself back together, out of spite.' }],
    },
    {
      id: 'thrash',
      objective: 'Break its tempo',
      tools: ['scalpel', 'forceps'],
      begin: [{ composure: 100 }],
      spawn: [{ kind: 'legato', site: 'brain', at: [0.7, -0.02], links: 8 }],
      done: { strainDead: 'legato', poolsClear: true },
      say: [{ at: 0, who: 'ines', mood: 'sharp', text: 'Now you will see how I work. Spend the bar. I do not save it.' }],
    },
    {
      id: 'repair',
      objective: 'Close the vessel',
      tools: ['suture', 'gel', 'forceps'],
      spawn: [
        { kind: 'wound', site: 'brain', at: [-0.3, 0.05], gates: gates(-0.4, 0.1, 0.35, -0.02, 8) },
        { kind: 'gelZone', site: 'brain', rect: gel(-0.65, -0.26, 0.4, 0.28), parTime: 10 },
      ],
      done: { cleared: ['wound', 'gelZone'], allClampsOff: true },
      say: [{ at: 0, who: 'bea', mood: 'quiet', text: 'Tight stitches. Then tell me she still knows the word for Tuesday.' }],
    },
  ],
};
