import { gel, gelDress, gates, line } from './shape.js';

const path = [[-0.6, 0.1], [0.1, 0.22], [0.55, -0.05], [0.1, -0.25], [-0.45, -0.12]];

export default {
  id: 'adagio',
  chapter: 2,
  title: 'Adagio',
  doctor: 'ren',
  scene: { before: 'S5', after: 'S6' },
  patient: {
    name: 'Theodora Lund', age: 61, job: 'Cellist',
    note: 'Refuses anesthesia until she has finished a sentence about Brahms.',
    followUp: "Performed in April. Dedicated the slow movement to 'the nervous one.'",
  },
  timer: 330,
  bpm: 80,
  parScore: 11365,
  music: 'strain-adagio',
  teaches: ['adagio', 'gel', 'scalpel', 'laser', 'forceps', 'scanner', 'clamp', 'suture'],
  sites: [{ id: 'liver', organ: 'liver' }],
  phases: [
    {
      id: 'open',
      objective: 'Open over the liver',
      tools: ['gel', 'scalpel'],
      spawn: [
        { kind: 'gelZone', site: 'liver', rect: gel(-0.85, -0.3, 0.55, 0.3), parTime: 10 },
        { kind: 'incision', site: 'liver', at: [-0.4, 0.05], points: line(-0.45, 0.08, 0.4, -0.02, 12) },
      ],
      on: gelDress('liver', 4),
      done: { cleared: ['gelZone', 'incision'] },
      say: [{ at: 0, who: 'bea', mood: 'stern', text: 'Short door. She asked us to hurry the talking, not the cutting.' }],
    },
    {
      id: 'look',
      objective: 'Read the stave',
      tools: ['scanner', 'gel'],
      spawn: [
        { kind: 'hole', site: 'liver', at: [0.15, 0.2], hidden: true, quota: 1, strain: 'staccato' },
        { kind: 'hole', site: 'liver', at: [-0.2, -0.15], hidden: true, quota: 1, strain: 'staccato' },
        { kind: 'hole', site: 'liver', at: [0.4, -0.2], hidden: true, quota: 1, strain: 'staccato' },
      ],
      done: { cleared: ['hole', 'note', 'spore'] },
      say: [{ at: 0, who: 'bea', mood: 'wonder', text: 'There are lines in the tissue. Name them, then shut the little mouths.' }],
    },
    {
      id: 'creature',
      objective: 'Stop the slow one',
      tools: ['laser', 'forceps', 'gel'],
      spawn: [{ kind: 'adagio', site: 'liver', at: [-0.55, 0.05], hp: 100, path }],
      done: { cleared: ['adagio', 'scratch', 'spore'] },
      say: [{ at: 0, who: 'bea', mood: 'focus', text: 'It only opens on the third and fourth. Wait. Then take the body to the tray.' }],
    },
    {
      id: 'eggs',
      objective: 'Clear the eggs',
      tools: ['scanner', 'laser', 'forceps'],
      spawn: [
        { kind: 'egg', site: 'liver', at: [-0.6, 0.25], hp: 20, hidden: true },
        { kind: 'egg', site: 'liver', at: [-0.15, 0.28], hp: 20, hidden: true },
        { kind: 'egg', site: 'liver', at: [0.25, -0.22], hp: 20, hidden: true },
        { kind: 'egg', site: 'liver', at: [0.5, 0.12], hp: 20, hidden: true },
      ],
      done: { cleared: ['egg'] },
      say: [{ at: 0, who: 'bea', mood: 'stern', text: 'Four eggs, all hiding. If one hatches we will be here until the encore.' }],
    },
    {
      id: 'grande',
      objective: 'Stop the large one',
      tools: ['laser', 'clamp', 'forceps', 'suction'],
      spawn: [{ kind: 'adagio', site: 'liver', at: [-0.15, 0.02], hp: 100, grande: true, path: [[-0.15, 0.02], [0.2, 0.08], [0.05, -0.08]] }],
      done: { cleared: ['adagio', 'scratch'], clamped: true, poolsClear: true },
      say: [{ at: 0, who: 'bea', mood: 'shout', text: 'Two tails, and it is opening vessels for fun. Clamp what it spends.' }],
    },
    {
      id: 'close',
      objective: 'Close the liver',
      tools: ['suture', 'gel', 'forceps'],
      spawn: [
        { kind: 'wound', site: 'liver', at: [-0.4, 0.12], gates: gates(-0.5, 0.16, 0.45, 0.08, 8) },
        { kind: 'wound', site: 'liver', at: [-0.35, -0.16], gates: gates(-0.45, -0.18, 0.4, -0.1, 8) },
        { kind: 'gelZone', site: 'liver', rect: gel(-0.9, -0.34, 0.6, 0.34), parTime: 12 },
      ],
      done: { cleared: ['wound', 'gelZone'], allClampsOff: true },
      say: [{ at: 0, who: 'bea', mood: 'calm', text: 'Sew the two lesions. She will pretend this was a rest.' }],
    },
  ],
};
