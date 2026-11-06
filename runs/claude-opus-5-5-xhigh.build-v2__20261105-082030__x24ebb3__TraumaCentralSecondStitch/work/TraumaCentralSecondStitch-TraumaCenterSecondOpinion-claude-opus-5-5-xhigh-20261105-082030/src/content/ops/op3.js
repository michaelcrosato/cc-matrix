// Night Ferry: three tables, one doctor. The Quiet awakens on the crash at about 70%.
export default {
  id: 'op3', num: 3, title: 'NIGHT FERRY', arena: 'forearm', surgeon: 'ilya', gifts: [], tools: ['drain', 'forceps', 'suture', 'gel', 'syringe', 'scalpel', 'laser', 'scanner'], music: 'or-tense',
  scene: 'ep3',
  patient: {
    name: 'THREE FERRY PASSENGERS', age: '-', job: 'TABLES A, B AND C', hook: 'A TEACHER. A DECKHAND. A BOY WHO WAS ONLY GOING TO THE DENTIST.',
    objective: 'THREE TABLES. ONE DOCTOR. KEEP ALL THREE ALIVE.',
    followUp: { S: 'All three walked out. The boy still has to go to the dentist.', A: 'All three lived. The teacher sends the ward her marking to do.', B: 'All three lived. Nobody is sure how, least of all you.', C: 'Three lived. The ferry company has already sent a coupon.' },
  },
  time: 360, vitals: { start: 70, drain: 0.25 }, doses: 5,
  tables: [{ arena: 'leg', vitals: 70, drain: 0.25, name: 'A' }, { arena: 'hull', vitals: 60, drain: 0.25, name: 'B' }, { arena: 'chestwound', vitals: 55, drain: 0.25, name: 'C' }],
  stages: [
    { id: 'batch1', objective: 'THREE TABLES. {table} SWITCHES. WATCH ALL THREE MONITORS.', say: ['reyes|Three tables. One of you. God help them.', 'reyes|{table} to switch tables. Do not fall in love with any of them.'],
      spawn: [
        { k: 'pool', table: 0, at: [-1.6, 0.3], r: 1.2 }, { k: 'laceration', table: 0, at: [0.4, 0.4], ang: 6, len: 2.6 },
        { k: 'debris', table: 1, at: [-2, -0.4], dir: -80, pull: 1.3, prop: 'shard' }, { k: 'debris', table: 1, at: [2.1, 0.6], dir: -100, pull: 1.3, prop: 'bolt' },
        { k: 'pool', table: 2, at: [0.2, 0], r: 1.3 },
      ], until: { clear: true } },
    { id: 'batch2', objective: 'NEW INJURIES ON ALL THREE TABLES', say: 'reyes|Table B has burns. Table C needs opening. Table A is still leaking. Go.',
      spawn: [
        { k: 'bleeder', table: 0, at: [2.8, -0.8], r: 0.8 },
        { k: 'mask', table: 1, at: [0, 0.4], rx: 2, rz: 1.1 }, { k: 'debris', table: 1, at: [-3.6, 1.3], dir: -70, pull: 1.3, prop: 'shard' },
        { k: 'incision', table: 2, at: [-2.2, 0.4], ang: -6, len: 4.4 },
      ], until: { clear: true } },
    { id: 'batch3', objective: 'KEEP MOVING', say: 'pem|Vitals are in the basement. I would take the stairs, Doctor.',
      spawn: [
        { k: 'laceration', table: 0, at: [-3.2, -1], ang: -8, len: 2.2 },
        { k: 'debris', table: 1, at: [3.8, -1.2], dir: -120, pull: 1.3, prop: 'bolt' },
        { k: 'polyp', table: 2, at: [-1.8, -1.4], r: 0.38 }, { k: 'polyp', table: 2, at: [1.6, -1.2], r: 0.38 }, { k: 'pool', table: 2, at: [0, 1.3], r: 0.9 },
      ], until: { clear: true } },
    { id: 'crash', objective: 'TABLE C IS CRASHING. HOLD {gift}.', music: 'or-critical',
      do: [{ focus: true, table: 2, cue: 'quietAwaken' }, { setVitals: 22, table: 2 }, { unlock: 'gift' }, { composure: 100 }, { prompt: 'HOLD {gift}. THE ROOM GOES QUIET.', promptT: 8 }],
      say: ['reyes|Table C! His pressure is going! *Doctor!*', 'ilya|No. No no no. Not this one. Not...'],
      spawn: [
        { k: 'bleeder', table: 2, at: [-2.2, -0.6], r: 1.05, grow: 0.5, max: 2 }, { k: 'bleeder', table: 2, at: [2.4, -0.4], r: 1.05, grow: 0.5, max: 2 }, { k: 'laceration', table: 2, at: [-1.4, 0.6], ang: 4, len: 2.8 },
      ],
      until: { clear: true } },
    { id: 'after', objective: 'CLOSE THEM. ALL OF THEM.', music: 'or-tense', say: ['ilya|The room... It went quiet. Did the room just go quiet?', 'reyes|You are talking, Doctor. Why are you talking? Sew.'],
      spawn: [
        { k: 'pool', table: 0, at: [2, 1.1], r: 0.9 },
        { k: 'mask', table: 1, at: [-1, -1], rx: 1.6, rz: 0.9 },
        { k: 'laceration', table: 2, at: [-2.2, -1.8], ang: 2, len: 4.2 },
      ], until: { clear: true } },
    { id: 'dressC', objective: 'DRESS TABLE C', context: 'dressing', say: 'reyes|Table C. Dress him. Then go and stand somewhere nobody can see you shake.',
      do: [{ focus: true, table: 2 }],
      spawn: [{ k: 'dressing', table: 2, at: [-2.4, 1.4], ang: 0, len: 4.8 }], until: { clear: ['dressing'] } },
  ],
};
