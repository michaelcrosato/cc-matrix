/** Operation data. Add a new op by pushing another object: stages spawn entities, and the bot plays whatever toolFor understands. */

const line = (id, kind, x, z, extra = {}) => ({ id, kind, x, z, ...extra });

function hooks(n, y = -1.1) {
  const list = [];
  for (let i = 0; i < n; i++) {
    const x = -3.1 + i * 0.62;
    list.push(line(`h${i + 1}`, 'hook', x, y, { pull: 1.05, curve: 0.45 + (i % 3) * 0.15, dx: 0.1, dz: 1 }));
  }
  return list;
}

function follow(rank, text) {
  return { S: text, A: text, B: text, C: text, ...rank };
}

export const OPS = [
  {
    id: 'op1',
    n: 1,
    title: 'Eleven Hooks',
    patient: 'Tomasz Dolan',
    age: 34,
    job: 'Deckhand',
    hook: 'Eleven fishhooks. He says it was a long net.',
    objective: 'Drain, draw the hooks, close, and count again.',
    arena: 'forearm',
    time: 240,
    vitals: { start: 85, drain: 0.1 },
    doses: 3,
    tools: ['drain', 'forceps', 'suture', 'gel', 'syringe'],
    gifts: ['quiet'],
    par: 5670,
    follow: follow({}, 'The net missed the rest of him.'),
    reyes: follow({ S: 'I would let you near my own arm.', C: 'He still has an arm. Barely a compliment.' }, 'Count slower next time.'),
    stages: [
      {
        say: 'Two pools. Hooks under both.',
        spawn: [
          line('p1', 'pool', -3.1, -1.1, { r: 0.7 }),
          line('p2', 'pool', -2.48, -1.1, { r: 0.65 }),
          { ...hooks(1)[0], hidden: true, hiddenBy: 'p1' },
          { ...hooks(2)[1], hidden: true, hiddenBy: 'p2' },
          ...hooks(11).slice(2),
        ],
      },
      {
        say: 'Lacerations. Close them.',
        spawn: [
          line('w1', 'wound', -1.4, 0.8, { len: 1.2, dx: 1, dz: 0 }),
          line('w2', 'wound', 1.2, 0.7, { len: 1.1, dx: 1, dz: 0.15 }),
        ],
      },
      {
        say: 'Gel the rust. Syringe if he fades.',
        unlock: ['syringe'],
        spawn: [
          line('g1', 'gel', 0.2, -0.4, { w: 1.6, h: 1.0 }),
          line('ring', 'ring', 2.2, 1.2, { optional: true }),
        ],
      },
      {
        say: 'Twelve. I counted twelve.',
        spawn: [
          line('dress', 'dressing', -0.4, 1.4, { len: 1.5, dx: 1, dz: 0.1 }),
          line('h12', 'hook', 2.6, -0.8, { pull: 1.0, curve: 0.8, dx: -0.2, dz: 1 }),
        ],
      },
    ],
  },
  {
    id: 'op2',
    n: 2,
    title: 'The Vanishing Act',
    patient: 'The Great Zamboni',
    age: 51,
    job: 'Stage magician',
    hook: 'He swallowed the act and will not say which half.',
    objective: 'Find every prop, then the thing that is not a prop.',
    arena: 'stomach',
    time: 300,
    vitals: { start: 80, drain: 0.15 },
    doses: 3,
    tools: ['scalpel', 'drain', 'forceps', 'scanner', 'laser', 'suture', 'gel', 'syringe'],
    gifts: ['quiet'],
    par: 6290,
    follow: follow({}, 'The coin turned up in the laundry.'),
    reyes: follow({}, 'That one was not a prop.'),
    stages: [
      { say: 'Midline. Keep it straight.', spawn: [line('cut', 'incision', -0.8, 0.2, { len: 1.6, dx: 1, dz: 0 })] },
      {
        say: 'Bleeders along the cut.',
        spawn: [line('b1', 'pool', -0.4, 0.2, { r: 0.6, bleed: true }), line('b2', 'pool', 0.5, 0.25, { r: 0.55, bleed: true })],
      },
      {
        say: 'Scan, lance, then pull. Mind the magnets.',
        spawn: [
          line('lk', 'incision', -2.2, -0.8, { len: 0.45, dx: 1, dz: 0 }),
          line('lc', 'incision', -0.6, -0.9, { len: 0.45, dx: 1, dz: 0 }),
          line('lcard', 'incision', 0.8, -0.85, { len: 0.45, dx: 0.2, dz: 1 }),
          line('lm', 'incision', 2.0, -0.7, { len: 0.4, dx: 1, dz: 0.2 }),
          line('key', 'prop', -2.2, -0.8, { hidden: true, pull: 1.0, dx: 0, dz: 1 }),
          line('coin', 'prop', -0.6, -0.9, { hidden: true, pull: 1.0, dx: 0.2, dz: 1 }),
          line('card', 'prop', 0.8, -0.85, { hidden: true, pull: 0.9, dx: 0, dz: 1 }),
          line('mag', 'magnet', 2.0, -0.7, { hidden: true, pull: 1.1, dx: 0.1, dz: 1, speedLimit: 3.2 }),
        ],
      },
      {
        say: 'That one is not a prop.',
        spawn: [line('tumor', 'tumor', 0.1, 0.35, { radius: 0.62 })],
      },
      {
        say: 'Lift it. Burn the satellites.',
        spawn: [
          line('mass', 'organ', 0.1, 0.35, { pull: 1.15, dx: 0, dz: 1 }),
          line('poly1', 'polyp', -1.3, 1.1, {}),
          line('poly2', 'polyp', -0.5, 1.25, {}),
          line('poly3', 'polyp', 0.4, 1.2, {}),
          line('poly4', 'polyp', 1.2, 1.05, {}),
          line('poly5', 'polyp', 1.8, 0.5, {}),
        ],
      },
      {
        say: 'Drain, suture, gel, dress.',
        spawn: [
          line('bp', 'pool', -1.5, -0.2, { r: 0.6, bleed: true }),
          line('ws', 'wound', 1.4, -0.3, { len: 1.1, dx: 1, dz: 0 }),
          line('gs', 'gel', -0.2, -1.3, { w: 1.6, h: 0.8 }),
          line('ds', 'dressing', 0, 1.6, { len: 1.4, dx: 1, dz: 0 }),
          line('ring2', 'ring', 2.4, 1.5, { optional: true }),
        ],
      },
    ],
  },
  {
    id: 'op3',
    n: 3,
    title: 'Night Ferry',
    patient: 'Three passengers',
    age: 0,
    job: 'Ferry',
    hook: 'One doctor. Three tables. The room will go quiet.',
    objective: 'Keep every table alive.',
    arena: 'ferry',
    time: 360,
    vitals: { start: [70, 60, 55], drain: 0.22 },
    doses: 5,
    tools: ['suture', 'drain', 'forceps', 'gel', 'scalpel', 'laser', 'syringe'],
    gifts: [],
    par: 6010,
    follow: follow({}, 'All three made the morning paper. Alive.'),
    reyes: follow({}, 'You went quiet. I noticed.'),
    stages: [
      {
        say: 'Table A. Leg gash.',
        spawn: [
          line('a1', 'wound', -0.4, 0.2, { len: 1.2, dx: 1, dz: 0, table: 0 }),
          line('a2', 'pool', 1.2, -0.4, { r: 0.65, table: 0 }),
        ],
      },
      {
        say: 'Table B. Debris and burns.',
        spawn: [
          line('bdeb', 'debris', -0.6, 0.1, { pull: 1.1, dx: 0.2, dz: 1, table: 1 }),
          line('bgel', 'gel', 0.8, -0.3, { w: 1.5, h: 0.9, table: 1 }),
        ],
      },
      {
        say: 'Table C. Chest.',
        spawn: [
          line('c1', 'incision', -0.8, 0.3, { len: 1.0, dx: 1, dz: 0, table: 2 }),
          line('c2', 'pool', 0.6, 0.2, { r: 0.6, bleed: true, table: 2 }),
          line('c3', 'wound', -0.2, -0.8, { len: 1.0, dx: 1, dz: 0.1, table: 2 }),
          line('c4', 'polyp', 1.4, 0.8, { table: 2 }),
        ],
      },
      { say: 'The room goes quiet. Hold your gift.', quiet: true, flag: 'awakened', until: 'flag' },
      {
        say: 'Second wave. Do not lose one.',
        spawn: [
          line('a3', 'pool', 0, 0.8, { r: 0.55, table: 0 }),
          line('b2', 'debris', 1.1, 0.4, { pull: 0.9, dx: 0, dz: 1, table: 1 }),
          line('c5', 'wound', 0.4, -0.2, { len: 0.9, dx: 0.3, dz: 1, table: 2 }),
          line('ring3', 'ring', 2, 1.2, { optional: true, table: 0 }),
        ],
      },
    ],
  },
  {
    id: 'op4',
    n: 4,
    title: 'Sticks and Stones',
    patient: 'Ollie Brandt',
    age: 16,
    job: 'Student',
    hook: 'Ferry survivor. The bone is a puzzle.',
    objective: 'Turn each fragment true, then shock the heart.',
    arena: 'bone',
    time: 330,
    vitals: { start: 75, drain: 0.18 },
    doses: 3,
    tools: ['scalpel', 'drain', 'forceps', 'gel', 'suture', 'syringe'],
    gifts: ['quiet'],
    par: 5475,
    follow: follow({}, 'He asked if the scar could look like a lightning bolt.'),
    reyes: follow({}, 'Adequate. Sabine said it first.'),
    stages: [
      {
        say: 'Open, then drain.',
        spawn: [line('open', 'incision', -0.6, 1.1, { len: 1.2, dx: 1, dz: 0 }), line('flood', 'pool', 0.2, 0.2, { r: 0.7 })],
      },
      {
        say: 'Rotate each fragment onto the bone.',
        spawn: [
          line('fp1', 'pool', -2.2, -0.6, { r: 0.6 }),
          line('fp2', 'pool', 2.0, -0.5, { r: 0.55 }),
          line('f1', 'fragment', -2.2, -0.6, { ang: 80, targetAng: 0, hidden: true, hiddenBy: 'fp1' }),
          line('f2', 'fragment', 2.0, -0.5, { ang: -70, targetAng: 0, hidden: true, hiddenBy: 'fp2' }),
          line('f3', 'fragment', -1.0, 0.2, { ang: 55, targetAng: 0 }),
          line('f4', 'fragment', 0.1, -0.2, { ang: 40, targetAng: 10 }),
          line('f5', 'fragment', 1.0, 0.4, { ang: -35, targetAng: 0 }),
          line('f6', 'fragment', 0.2, 0.9, { ang: 25, targetAng: 0 }),
        ],
      },
      { say: 'Gel along the seams.', spawn: [line('cement', 'gel', 0, 0.1, { w: 2.2, h: 0.8 })] },
      { say: 'Artery. Suture it now.', spawn: [line('art', 'bleeder', -0.3, -1.1, { len: 1.0, dx: 1, dz: 0.1 })] },
      { say: 'Paddles. Two good shocks.', codeblue: true, until: 'flag', flag: 'blueDone' },
      {
        say: 'Close. Sabine will call it adequate.',
        spawn: [
          line('cl', 'wound', 0.4, 1.3, { len: 1.1, dx: 1, dz: 0 }),
          line('cg', 'gel', -1.4, 1.2, { w: 1.2, h: 0.7 }),
          line('cd', 'dressing', 1.2, -1.2, { len: 1.3, dx: 1, dz: 0 }),
          line('ring4', 'ring', 2.3, 1.4, { optional: true }),
        ],
      },
    ],
  },
  {
    id: 'op5',
    n: 5,
    title: 'Introit',
    patient: 'Mr. Anselm',
    age: 62,
    job: 'Harbour pilot',
    hook: 'He feels nothing. Something under the liver knocks.',
    objective: 'Answer the knock. Pull the tether. Burn the eggs.',
    arena: 'liver',
    time: 360,
    vitals: { start: 80, drain: 0.22 },
    doses: 4,
    tools: ['scanner', 'scalpel', 'forceps', 'suture', 'laser', 'drain', 'gel', 'syringe'],
    gifts: ['quiet'],
    par: 7290,
    follow: follow({}, 'He asked if it could knock on the way out.'),
    reyes: follow({}, 'Get it out.'),
    stages: [
      {
        say: 'Scanner. It is moving.',
        spawn: [line('blotch', 'cyst', 0.2, 0.2, { hidden: true, real: true })],
      },
      { say: 'It knocked.', strain: 'introit', until: 'strain' },
      { say: 'Close the tears.', until: 'kinds', kinds: ['wound', 'pool'] },
      {
        say: 'Six eggs. Burn them.',
        spawn: [
          line('e1', 'egg', -2.2, 0.6, {}),
          line('e2', 'egg', -1.2, 1.0, {}),
          line('e3', 'egg', -0.2, 0.7, {}),
          line('e4', 'egg', 0.8, 1.0, {}),
          line('e5', 'egg', 1.6, 0.5, {}),
          line('e6', 'egg', 2.3, -0.2, {}),
        ],
      },
      {
        say: 'Gel and dressing.',
        spawn: [
          line('eg', 'gel', 0, -1.1, { w: 1.8, h: 0.7 }),
          line('ed', 'dressing', -0.4, 1.5, { len: 1.4, dx: 1, dz: 0 }),
          line('ring5', 'ring', 2.2, -1.3, { optional: true }),
        ],
      },
    ],
  },
  {
    id: 'op6',
    n: 6,
    title: 'Cold Hands',
    patient: 'Ada Okoye',
    age: 29,
    job: 'Teacher',
    hook: 'Failing kidney. The donor is on ice. Sabine operates.',
    objective: 'Transplant, rewind the clot, let it pink up.',
    arena: 'kidney',
    time: 360,
    vitals: { start: 80, drain: 0.16 },
    doses: 3,
    tools: ['scalpel', 'forceps', 'suture', 'scanner', 'laser', 'drain', 'gel', 'syringe'],
    gifts: ['look'],
    surgeon: 'sabine',
    par: 5505,
    follow: follow({}, 'The new kidney took. The sample did not stay dormant.'),
    reyes: follow({}, 'Again. Then it pinks.'),
    stages: [
      { say: 'Open.', spawn: [line('kcut', 'incision', -0.5, 1.0, { len: 1.3, dx: 1, dz: 0 })] },
      {
        say: 'Clamp both vessels.',
        spawn: [line('cA', 'clamp', -1.2, 0.2, {}), line('cB', 'clamp', 0.8, 0.15, {})],
      },
      {
        say: 'Cut between the clamps.',
        spawn: [
          line('v1', 'incision', -1.2, -0.35, { len: 0.5, dx: 1, dz: 0 }),
          line('v2', 'incision', 0.8, -0.4, { len: 0.5, dx: 1, dz: 0 }),
        ],
      },
      { say: 'Lift the failing kidney.', spawn: [line('oldk', 'organ', 0, 0.1, { pull: 1.2, dx: 0.1, dz: 1 })] },
      { say: 'Donor kidney. The ice starts now.', cold: 120, spawn: [line('newk', 'organ', 2.4, -1.2, { pull: 1.3, dx: -0.4, dz: 1 })] },
      {
        say: 'Artery, vein, ureter.',
        spawn: [
          line('an1', 'wound', -1.6, 0.6, { len: 0.7, dx: 1, dz: 0 }),
          line('an2', 'wound', 0, 0.55, { len: 0.7, dx: 1, dz: 0 }),
          line('an3', 'wound', 1.5, 0.5, { len: 0.7, dx: 0.2, dz: 1 }),
        ],
      },
      {
        say: 'Unclamp in order.',
        spawn: [
          line('u0', 'unclamp', -1.3, -0.8, { order: 0, firstClot: true }),
          line('u1', 'unclamp', 0, -0.85, { order: 1 }),
          line('u2', 'unclamp', 1.3, -0.8, { order: 2 }),
        ],
      },
      {
        say: 'It pinks. Scan the sample.',
        flag: 'pink',
        spawn: [
          line('sample', 'cyst', 2.1, 1.1, { hidden: true, real: true }),
          line('kg', 'gel', -0.2, 1.3, { w: 1.4, h: 0.6 }),
          line('kd', 'dressing', 0.4, -1.4, { len: 1.2, dx: 1, dz: 0 }),
          line('ring6', 'ring', -2.4, 1.3, { optional: true }),
        ],
      },
    ],
  },
  {
    id: 'op7',
    n: 7,
    title: 'Lacrimosa',
    patient: 'Ottilie Marr',
    age: 58,
    job: 'Hospice nurse',
    hook: 'She smiles. The lung weeps.',
    objective: 'Laser the eyes, paint the sob, pull the stalk.',
    arena: 'lung',
    time: 390,
    vitals: { start: 80, drain: 0.2 },
    doses: 4,
    tools: ['laser', 'drain', 'gel', 'forceps', 'scalpel', 'syringe'],
    gifts: ['quiet'],
    par: 6010,
    follow: follow({}, 'She thanked them for the pain.'),
    reyes: follow({}, 'I will be in the hall.'),
    stages: [
      { say: 'A small cut. Then it weeps.', spawn: [line('lcut', 'incision', -0.4, 1.2, { len: 0.8, dx: 1, dz: 0 })] },
      { say: 'Eyes open in turn.', strain: 'lacrimosa', until: 'strain' },
      {
        say: 'Gel. Dressing. She can feel it.',
        spawn: [
          line('lg', 'gel', 0.2, -1.2, { w: 1.6, h: 0.7 }),
          line('ld', 'dressing', -0.2, 1.5, { len: 1.3, dx: 1, dz: 0 }),
          line('ring7', 'ring', 2.2, 1.2, { optional: true }),
        ],
      },
    ],
  },
  {
    id: 'op8',
    n: 8,
    title: 'Dies Irae',
    patient: 'Cornelius Bram',
    age: 67,
    job: 'Chief',
    hook: 'His tremor was Mercy. Do not be gentle.',
    objective: 'Cut, lift, and burn on diastole. Then shock and massage.',
    arena: 'heart',
    time: 420,
    vitals: { start: 75, drain: 0.2 },
    doses: 5,
    tools: ['scalpel', 'forceps', 'laser', 'drain', 'syringe', 'suture', 'gel'],
    gifts: ['quiet'],
    heart: true,
    par: 7680,
    follow: follow({}, 'He gave Ilya the old scalpel.'),
    reyes: follow({}, 'Do not you dare be gentle.'),
    stages: [
      { say: 'On the beat. Diastole only.', spawn: [line('hcut', 'incision', -0.3, 1.3, { len: 0.7, dx: 1, dz: 0, window: 'diastole' })] },
      { say: 'Seven plates.', strain: 'dies', until: 'strain' },
      { say: 'Fibrillation. Two shocks.', codeblue: true, until: 'flag', flag: 'blueDone' },
      { say: 'Massage. Left, then right.', massage: true, until: 'flag', flag: 'massaged' },
      {
        say: 'Close him.',
        spawn: [
          line('hw', 'wound', 0.2, 1.2, { len: 1.0, dx: 1, dz: 0 }),
          line('hg', 'gel', -0.4, -1.1, { w: 1.4, h: 0.6 }),
          line('hd', 'dressing', 1.0, -1.2, { len: 1.2, dx: 1, dz: 0 }),
          line('ring8', 'ring', 2.3, 0.4, { optional: true }),
        ],
      },
    ],
  },
  {
    id: 'op9',
    n: 9,
    title: 'Libera Me',
    patient: 'Odalys Reyes',
    age: 44,
    job: 'Nurse',
    hook: 'No signal. The monitor is lying.',
    objective: 'Tell real from false, survive the copy, pull together.',
    arena: 'chest',
    time: 540,
    vitals: { start: 70, drain: 0.18 },
    doses: 6,
    tools: ['scanner', 'laser', 'scalpel', 'forceps', 'suture', 'drain', 'gel', 'syringe'],
    gifts: ['quiet', 'look'],
    surgeon: 'both',
    partner: true,
    heart: true,
    par: 7310,
    follow: follow({}, 'Your sutures are crooked, Doctor.'),
    reyes: follow({}, 'Your sutures are crooked, Doctor.'),
    stages: [
      { say: 'NO SIGNAL', lie: true, strain: 'sanctus', until: 'strain', spawn: [line('ring9a', 'ring', 2.2, -1.2, { optional: true })] },
      { say: 'NO SIGNAL', strain: 'reprise', until: 'strain' },
      { say: 'NO SIGNAL', strain: 'miserere', until: 'strain' },
      { say: 'NO SIGNAL', codeblue: true, until: 'flag', flag: 'blueDone' },
      {
        say: 'Your sutures are crooked, Doctor.',
        spawn: [
          line('rd', 'dressing', 0, 1.2, { len: 1.4, dx: 1, dz: 0 }),
          line('ring9', 'ring', 2.2, -1.2, { optional: true }),
        ],
      },
    ],
  },
  {
    id: 'op10',
    n: 10,
    title: 'Do No Harm',
    patient: 'Hesper Lindqvist',
    age: 46,
    job: 'Director',
    hook: 'A pale strain along the spine. It does not fight.',
    objective: 'Remove it slowly. Pain means she is still here.',
    arena: 'spine',
    time: 240,
    vitals: { start: 60, drain: 0.05 },
    doses: 2,
    tools: ['scalpel', 'forceps', 'suture', 'gel', 'syringe'],
    gifts: ['quiet'],
    par: 3885,
    follow: follow({}, 'Why? Because it is my shift.'),
    reyes: follow({}, 'She felt it. That was the point.'),
    stages: [
      {
        say: 'Slow. It will not fight.',
        spawn: [
          line('s1', 'incision', -1.6, 0.2, { len: 0.7, dx: 0.15, dz: 1 }),
          line('x1', 'extraction', -1.6, -0.5, { pull: 1.15, dx: 0.1, dz: 1, vitalOnDone: 6, painOnDone: 10 }),
        ],
      },
      {
        say: 'She flinched. Good.',
        spawn: [
          line('s2', 'incision', -0.4, 0.3, { len: 0.65, dx: 0.1, dz: 1 }),
          line('x2', 'extraction', -0.4, -0.45, { pull: 1.1, dx: 0, dz: 1, vitalOnDone: 6, painOnDone: 10 }),
        ],
      },
      {
        say: 'Why does it hurt?',
        spawn: [
          line('s3', 'incision', 0.8, 0.25, { len: 0.65, dx: 0.2, dz: 1 }),
          line('x3', 'extraction', 0.8, -0.5, { pull: 1.1, dx: 0, dz: 1, vitalOnDone: 6, painOnDone: 12 }),
        ],
      },
      {
        say: 'Because it is my shift.',
        spawn: [
          line('x4', 'extraction', 1.8, 0.1, { pull: 1.3, dx: -0.1, dz: 1, vitalOnDone: 8, painOnDone: 14 }),
          line('sw', 'wound', 0, 1.2, { len: 1.2, dx: 1, dz: 0 }),
          line('sg', 'gel', 0.2, -1.3, { w: 1.8, h: 0.6 }),
          line('sd', 'dressing', -0.2, 1.6, { len: 1.5, dx: 1, dz: 0 }),
          line('ring10', 'ring', 2.4, 1.3, { optional: true }),
        ],
      },
    ],
  },
  {
    id: 'pile',
    n: 11,
    title: 'Consult Pile-Up',
    patient: 'Whoever is bleeding',
    age: 0,
    job: 'Consult',
    hook: 'A wave of a chest. Then one knock.',
    objective: 'Keep the patient alive and top the team score.',
    arena: 'chest',
    time: 180,
    vitals: { start: 78, drain: 0.16 },
    doses: 4,
    tools: ['drain', 'forceps', 'suture', 'laser', 'scalpel', 'gel', 'scanner', 'syringe'],
    gifts: ['quiet', 'look'],
    consultOp: true,
    par: 4285,
    follow: follow({}, 'Next wave will not wait.'),
    reyes: follow({}, 'Hands in. All of them.'),
    stages: [
      {
        say: 'Hooks and pools.',
        spawn: [
          ...hooks(4, -0.8),
          line('pp1', 'pool', 1.6, 0.4, { r: 0.6 }),
          line('pp2', 'pool', -1.8, 0.6, { r: 0.55, bleed: true }),
        ],
      },
      {
        say: 'Lacerations. Polyps.',
        spawn: [
          line('pw', 'wound', -0.4, 0.9, { len: 1.1, dx: 1, dz: 0 }),
          line('pw2', 'wound', 1.2, -0.9, { len: 0.9, dx: 0.2, dz: 1 }),
          line('ppy', 'polyp', -1.5, 1.2, {}),
          line('ppy2', 'polyp', 2.0, 1.0, {}),
        ],
      },
      {
        say: 'It knocked.',
        spawn: [
          line('ip', 'pore', 0.4, 0.2, { len: 0.5, dx: 1, dz: 0.1 }),
          line('ic', 'core', 0.5, -0.4, { pull: 1.6, dx: 0.2, dz: 1, tether: true }),
        ],
      },
      {
        say: 'Dress it.',
        spawn: [
          line('pg', 'gel', 0, -1.3, { w: 1.5, h: 0.6 }),
          line('pd', 'dressing', 0, 1.4, { len: 1.3, dx: 1, dz: 0 }),
          line('ringp', 'ring', 2.3, 0.2, { optional: true }),
        ],
      },
    ],
  },
];

export function sessionOp(base, mul) {
  return { ...base, id: `s${base.id}`, session: true, time: 200, strainHp: mul, par: base.par };
}

export const SESSION_OPS = [
  OPS.find((o) => o.id === 'pile'),
  sessionOp(OPS.find((o) => o.id === 'op5'), 0.34),
  sessionOp(OPS.find((o) => o.id === 'op7'), 0.4),
  sessionOp(OPS.find((o) => o.id === 'op8'), 1 / 7),
];

export const STORY_OPS = OPS.filter((o) => o.n <= 10);
export const ALL_OPS = OPS;

export function opById(id) {
  return OPS.find((o) => o.id === id) || SESSION_OPS.find((o) => o.id === id) || null;
}
