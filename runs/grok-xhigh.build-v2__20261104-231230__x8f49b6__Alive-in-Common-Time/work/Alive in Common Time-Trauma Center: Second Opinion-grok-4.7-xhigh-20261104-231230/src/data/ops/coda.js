import { gel, gelDress, gates, line } from './shape.js';

const crawl = [[-0.45, 0.08], [0.2, 0.16], [0.35, -0.1]];

export default {
  id: 'coda',
  chapter: 4,
  title: 'Coda',
  doctor: 'both',
  swap: true,
  consult: true,
  voice: 'pip',
  scene: { before: 'S13', after: 'S14' },
  patient: {
    name: 'Beatrice Okonkwo', age: 58, job: 'Head nurse',
    note: 'Do not be dramatic about this.',
    followUp: 'Discharged herself. Is back in OR 3. Has opinions.',
  },
  timer: 570,
  bpm: 92,
  parScore: 34249,
  music: 'coda',
  teaches: ['coda', 'adagio', 'staccato', 'tremolo', 'legato', 'crescendo', 'fermata', 'defib', 'hush', 'sforzando'],
  sites: [
    { id: 'heart', organ: 'heart' },
    { id: 'lung', organ: 'lung' },
    { id: 'aorta', organ: 'aorta' },
  ],
  phases: [
    {
      id: 'exposition',
      objective: 'Clear the heart',
      tools: ['laser', 'forceps', 'gel', 'scalpel'],
      spawn: [
        { kind: 'adagio', site: 'heart', at: [-0.4, 0.05], hp: 80, path: crawl },
        { kind: 'hole', site: 'heart', at: [0.25, -0.12], hidden: false, quota: 6, strain: 'staccato' },
      ],
      done: { cleared: ['adagio', 'hole', 'note', 'spore', 'scratch'] },
      say: [{ at: 0, who: 'pip', mood: 'shaky', text: "'Suction before you can't see.' She underlined that twice." }],
    },
    {
      id: 'development',
      objective: 'Clear the lung',
      tools: ['scanner', 'laser', 'scalpel', 'forceps', 'clamp'],
      spawn: [
        { kind: 'tremolo', site: 'lung', at: [-0.2, 0.12], hp: 40 },
        { kind: 'tremolo', site: 'lung', at: [0.3, -0.1], hp: 40 },
        { kind: 'legato', site: 'lung', at: [0.7, 0.02], links: 8 },
        { kind: 'bleeder', site: 'heart', at: [-0.1, 0.05] },
      ],
      done: { cleared: ['tremolo', 'scratch'], strainDead: 'legato', clamped: true, poolsClear: true },
      say: [{ at: 0, who: 'pip', mood: 'reading', text: "'The other site is also your patient.' There is a little arrow." }],
    },
    {
      id: 'recap',
      objective: 'Clear the aorta',
      tools: ['laser', 'scalpel', 'forceps', 'defib'],
      begin: [{ wipe: 'fermata' }],
      spawn: [
        { kind: 'crescendo', site: 'aorta', at: [0, 0.02], size: 0.15 },
      ],
      on: [
        {
          when: { removed: 'crescendo' },
          once: true,
          do: [{ spawn: { kind: 'fermata', site: 'aorta', at: [0.05, 0.05], hp: 60, needed: 9 } }],
        },
      ],
      done: { strainDead: 'crescendo', arrests: 1, poolsClear: true },
      say: [{ at: 0, who: 'pip', mood: 'small', text: "'If the room starts keeping her time, you are late.'" }],
    },
    {
      id: 'conductor',
      objective: 'End the conductor',
      tools: ['laser', 'forceps', 'gel', 'clamp'],
      begin: [{ composure: 100 }],
      spawn: [{ kind: 'coda', site: 'heart', at: [0, 0.02], hp: 300 }],
      done: { strainDead: 'coda', cleared: ['note', 'spore', 'scratch', 'baton'], poolsClear: true },
      say: [{ at: 0, who: 'pip', mood: 'steady', text: "'Beat one is a lie unless you cut the stick. Then take the center when it bows.'" }],
    },
    {
      id: 'closing',
      objective: 'Close every site',
      tools: ['suture', 'gel', 'forceps'],
      spawn: [
        { kind: 'wound', site: 'heart', at: [-0.2, 0.05], gates: gates(-0.4, 0.1, 0.35, 0.02, 6) },
        { kind: 'wound', site: 'lung', at: [-0.15, 0], gates: gates(-0.35, 0.05, 0.4, -0.05, 6) },
        { kind: 'wound', site: 'aorta', at: [0, 0], gates: gates(-0.3, 0.08, 0.4, -0.06, 6) },
        { kind: 'gelZone', site: 'heart', rect: gel(-0.7, -0.24, 0.45, 0.24), parTime: 10 },
      ],
      on: gelDress('heart', 12),
      done: { cleared: ['wound', 'gelZone'], allClampsOff: true },
      say: [{ at: 0, who: 'pip', mood: 'hope', text: "'Leave the room the way you found her. Stubborn.'" }],
    },
    {
      id: 'last-stop',
      objective: 'Bring her back',
      tools: ['defib'],
      begin: [{ event: 'arrest', clock: 8 }, { forceGift: 'hush' }, { composure: 100 }],
      done: { arrests: 2 },
      say: [{ at: 0, who: 'ren', mood: 'quiet', text: 'No hint. Just the paddles. Stay with her.' }],
    },
  ],
};
