import { gel, gates, line } from './shape.js';

export default {
  id: 'grand-rounds',
  chapter: 0,
  title: 'Grand Rounds',
  doctor: 'ren',
  scene: null,
  patient: {
    name: 'Ngaio Reeve', age: 55, job: 'Harbor master',
    note: 'Ward Zero has only this to say: everyone scrub in.',
    followUp: 'The harbor is still there. So is she.',
  },
  timer: 300,
  bpm: 88,
  parScore: 24072,
  music: 'rounds',
  teaches: ['gel', 'scalpel', 'forceps', 'suction', 'suture', 'laser', 'scanner', 'clamp', 'syringe', 'defib', 'hush', 'sforzando', 'adagio', 'staccato', 'legato', 'crescendo', 'fermata'],
  sites: [
    { id: 'liver', organ: 'liver' },
    { id: 'bowel', organ: 'bowel' },
    { id: 'heart', organ: 'heart' },
  ],
  phases: [
    {
      id: 'rounds',
      objective: 'Finish grand rounds',
      tools: ['gel', 'scalpel', 'forceps', 'suction', 'suture', 'laser', 'scanner', 'clamp', 'syringe', 'defib'],
      spawn: [
        { kind: 'incision', site: 'liver', at: [-0.4, 0.1], points: line(-0.45, 0.12, 0.2, 0.02, 10) },
        { kind: 'incision', site: 'liver', at: [-0.3, -0.15], points: line(-0.4, -0.12, 0.25, -0.2, 10) },
        { kind: 'gelZone', site: 'liver', rect: gel(-0.7, -0.22, 0.35, 0.22), parTime: 8 },
        { kind: 'shard', site: 'bowel', count: 4, scale: true, ats: [[-0.4, 0.15], [0.1, 0.1], [-0.2, -0.15], [0.35, -0.05]], axis: 0, embed: 0.18 },
        { kind: 'bleeder', site: 'bowel', at: [-0.05, 0.02] },
        { kind: 'bleeder', site: 'heart', at: [0.1, 0] },
      ],
      on: [
        {
          when: { phaseTime: 45 },
          once: true,
          do: [
            { spawn: { kind: 'adagio', site: 'liver', at: [-0.2, 0.05], hp: 70, path: [[-0.3, 0.08], [0.25, 0.02]] } },
            { spawn: { kind: 'hole', site: 'bowel', at: [0.15, -0.08], hidden: false, quota: 4, strain: 'staccato' } },
          ],
        },
        {
          when: { phaseTime: 90 },
          once: true,
          do: [
            { spawn: { kind: 'legato', site: 'bowel', at: [0.7, 0.02], links: 6 } },
            { spawn: { kind: 'crescendo', site: 'heart', at: [0.05, 0.02], size: 0.15 } },
          ],
        },
        {
          when: { phaseTime: 130 },
          once: true,
          do: [
            { wipe: 'fermata' },
            { spawn: { kind: 'fermata', site: 'heart', at: [0, 0.04], hp: 40, needed: 1 } },
            { spawn: { kind: 'injection', site: 'liver', at: [-0.2, 0.15] } },
            { spawn: { kind: 'injection', site: 'bowel', at: [0.1, 0.12] } },
            { spawn: { kind: 'injection', site: 'heart', at: [-0.15, -0.1] } },
          ],
        },
        {
          when: { phaseTime: 165 },
          once: true,
          do: [
            { flag: 'closing' },
            { spawn: { kind: 'wound', site: 'liver', at: [-0.2, 0], gates: gates(-0.35, 0.08, 0.25, 0, 5) } },
            { spawn: { kind: 'wound', site: 'bowel', at: [0, 0], gates: gates(-0.3, -0.05, 0.3, 0.05, 5) } },
            { spawn: { kind: 'wound', site: 'heart', at: [0, 0.02], gates: gates(-0.25, 0.06, 0.3, -0.02, 5) } },
          ],
        },
      ],
      done: {
        flag: 'closing',
        cleared: ['incision', 'gelZone', 'shard', 'pool', 'adagio', 'hole', 'note', 'spore', 'scratch', 'crescendo', 'fermata', 'wound', 'injection'],
        strainDead: 'legato',
        allClampsOff: true,
        poolsClear: true,
      },
      say: [{ at: 0, who: 'bea', mood: 'brisk', text: 'Everyone who can hold a tool, hold one. The harbor can wait.' }],
    },
  ],
};
