// The ten operations and the Consult ops, as data. Add one: docs/AUTHORING.md.
import { registerOp } from '../../sim/op.js';
import { PARS } from './pars.js';

const hook = (id, x, z, dx, dz, arc = 0.4, extra = {}) => ({ k: 'hook', id, at: [x, z], dir: [dx, dz], pull: 1.2, arc, ...extra });
const pool = (id, x, z, r, extra = {}) => ({ k: 'pool', id, at: [x, z], r, ...extra });
const lac = (id, a, b, extra = {}) => ({ k: 'laceration', id, a, b, ...extra });
const gel = (id, x, z, w, h, extra = {}) => ({ k: 'mask', id, rect: [x, z, w, h], ...extra });
const dressing = (a, b, extra = {}) => ({ k: 'dressing', id: 'dress', line: [a, b], ...extra });

export const OPS = {};
function op(def) { def.par = PARS[def.id] ?? 3000; OPS[def.id] = def; registerOp(def); return def; }

op({
  id: 'op1', n: 1, title: 'ELEVEN HOOKS', arena: 'forearm', surgeon: 'ilya', gifts: [],
  tools: ['drain', 'forceps', 'suture', 'gel', 'syringe'], startTool: 'drain',
  patient: { name: 'TOMASZ DOLAN', age: 52, job: 'TRAWLER DECKHAND', hook: "HIS DAUGHTER'S WEDDING IS SATURDAY.",
    objective: 'GET THE HOOKS OUT. KEEP THE ARM.',
    followUp: { S: 'He walked her down the aisle. Dry eyes. Hers, not his.', A: 'He made the wedding. He gave a speech. It was long.', B: 'He made the wedding. Left hand only for the toast.', C: 'He made his daughter\'s wedding. He danced badly. She cried anyway.' } },
  time: 240, vitals: { start: 85, drain: 0.1 }, doses: 3, music: 'or-calm',
  stages: [
    { id: 'marker', say: ['reyes', 'Scalpel is off the table, Doctor. For now. Move your tool onto the marker. *There.*'],
      spawn: [{ k: 'marker', id: 'm1', at: [-2.4, 0.2] }], until: { clear: ['marker'] } },
    { id: 'pools', say: ['reyes', 'Blood. That is the red part. {use} with the *drain*. Hooks are under there.'], hint: 'drain',
      begin: [{ prompt: 'DRAIN: {tool:4} THEN HOLD {use}' }],
      spawn: [pool('p1', -3, 0.5, 1.5), pool('p2', 2.8, -1.1, 1.3), hook('h1', -3.2, 0.7, 0.5, -1, 0.4, { hiddenBy: 'p1' }), hook('h2', 2.9, -1.2, -0.4, -1, -0.4, { hiddenBy: 'p2' })],
      until: { clear: ['pool'] }, on: { vitalsBelow: { 50: { say: ['reyes', 'Falling. *Syringe!* {quick}, draw, release in the ring.'], unlock: 'syringe' } } } },
    { id: 'hooks', say: ['reyes', 'Forceps, {tool:2}. Grab, follow the *curve*, let go over the dish. Barbs tear if you rush.'], hint: 'forceps',
      begin: [{ prompt: 'FORCEPS: GRAB, FOLLOW THE ARROW, RELEASE' }],
      spawn: [hook('h3', -4.6, -1.5, 0.5, -1, 0.4), hook('h4', -2.2, -2, -0.6, -1, -0.4), hook('h5', -0.8, -0.2, 0.5, -1, 0.5), hook('h6', 0.8, 1.2, 0.4, -1, -0.4), hook('h7', 1.2, -2.2, 0.8, -1, 0.3),
        hook('h8', 3.6, 1.1, -0.5, -1, 0.5), hook('h9', 4.6, -2, -0.5, -1, -0.4), hook('h10', -1.3, 1.8, 0.2, -1, 0.5), hook('h11', -4.8, 1.5, 0.6, -1, 0.3)],
      timed: [{ when: { clear: ['hook'] }, say: ['reyes', 'Eleven. Hm.'] }], until: { clear: ['hook'] } },
    { id: 'suture', say: ['reyes', 'Those holes will not close themselves. {tool:3}. *Zigzag* across the wound.'], hint: 'suture',
      begin: [{ prompt: 'SUTURE: HOLD {use}, ZIGZAG ACROSS THE LINE' }],
      spawn: [lac('l1', [-3.8, -0.8], [-1, -0.2]), lac('l2', [1, -0.6], [3.6, 0.4])], until: { clear: ['laceration'] } },
    { id: 'gel', say: ['reyes', 'Rust. Lovely. {tool:6}, paint the whole stain. *All of it.*'], hint: 'gel',
      begin: [{ prompt: 'GEL: HOLD {use} AND SWEEP THE PATCH' }],
      spawn: [gel('g1', 0, -2.2, 3.6, 1.4)], until: { clear: ['mask', 'nick'] },
      then: { say: ['reyes', 'Not bad, for a first time. Syringe teaches itself later. Stay awake.'], unlock: 'syringe' } },
    { id: 'dressing', say: ['reyes', 'Now the dressing. Press {use} at the end of the strip and drag.'], begin: [{ prompt: 'DRESSING: HOLD {use} AND DRAG ALONG THE STRIP' }],
      spawn: [dressing([-5, 1.6], [5, 1.6])], until: { clear: ['dressing'] } },
    { id: 'twelve', say: ['ilya', 'Twelve. Nurse Reyes? I counted *twelve.*'],
      spawn: [hook('h12', 0.4, -0.8, -0.6, -1, 0.5)], timed: [{ t: 2.2, say: ['reyes', 'It was a long net.'] }], until: { clear: ['hook'] } },
  ],
});

op({
  id: 'op2', n: 2, title: 'THE VANISHING ACT', arena: 'stomach', surgeon: 'ilya', gifts: [],
  tools: ['scalpel', 'drain', 'scanner', 'forceps', 'laser', 'suture', 'gel', 'syringe'], startTool: 'scalpel',
  patient: { name: 'THE GREAT ZAMBONI', age: 61, job: 'STAGE MAGICIAN', hook: 'HE WILL NOT SAY WHAT HE SWALLOWED. PROFESSIONAL SECRET.',
    objective: 'FIND WHAT VANISHED. MAKE IT REAPPEAR.',
    followUp: { S: 'Stage one. He pulled the biopsy result from behind your ear.', A: 'They caught it early. He has new material about it.', B: 'He starts chemo Monday. He has already vanished two nurses\' pens.', C: 'It was late. He performs for the ward now. Nobody leaves.' } },
  time: 300, vitals: { start: 80, drain: 0.15 }, doses: 3, music: 'or-calm',
  stages: [
    { id: 'open', say: ['reyes', "Scalpel. {tool:1}. The sharp end goes toward the patient, Doctor. We've discussed this."], hint: 'scalpel',
      begin: [{ prompt: 'SCALPEL: HOLD {use} AND TRACE THE DOTS' }],
      spawn: [{ k: 'incision', id: 'mid', look: 'guide', line: [[-4.2, 0], [4.2, 0]] }], until: { clear: ['incision'] } },
    { id: 'spots', say: ['pem', 'Spot bleeders. He bleeds like his act: dramatic, and for too long.'], hint: 'drain',
      spawn: [{ k: 'bleeder', id: 'b1', at: [-3, 0.1], r: 0.6 }, { k: 'bleeder', id: 'b2', at: [-0.4, -0.1], r: 0.7 }, { k: 'bleeder', id: 'b3', at: [2.8, 0.1], r: 0.6 }], until: { clear: ['bleeder'] } },
    { id: 'scan', say: ['reyes', 'Scanner, {tool:8}. Hold it low. Find me *whatever* he swallowed.'], hint: 'scanner',
      begin: [{ prompt: 'SCANNER: HOLD {use}, SWEEP THE FIELD' }],
      spawn: [
        { k: 'incision', id: 'lk', look: 'lance', scan: true, at: [-3.6, -2], line: [[-4, -2.1], [-3.2, -1.9]] },
        { k: 'prop', id: 'key', look: 'key', hiddenBy: 'lk', at: [-3.6, -2], dir: [0.6, 1], pull: 1 },
        { k: 'incision', id: 'lc', look: 'lance', scan: true, at: [-1.2, 1.7], line: [[-1.6, 1.8], [-0.8, 1.6]] },
        { k: 'prop', id: 'coin', look: 'coin', hiddenBy: 'lc', at: [-1.2, 1.7], dir: [-0.5, -1], pull: 1 },
        { k: 'incision', id: 'la', look: 'lance', scan: true, at: [1.8, -2.4], line: [[1.4, -2.5], [2.2, -2.3]] },
        { k: 'prop', id: 'card', look: 'card', hiddenBy: 'la', at: [1.8, -2.4], dir: [0.3, 1], pull: 1 },
        { k: 'incision', id: 'lm', look: 'lance', scan: true, at: [4, 1.5], line: [[3.6, 1.6], [4.4, 1.4]] },
        { k: 'magnet', id: 'mag', look: 'magnet', hiddenBy: 'lm', at: [4, 1.5], dir: [-1, -0.8], pull: 1.6, maxSpeed: 2.2 },
      ],
      timed: [{ when: { sids: ['coin'] }, say: ['pem', 'A coin. Of course. Check behind his ear, too.'] }, { when: { sids: ['mag'] }, say: ['reyes', 'Magnets. He swallowed *magnets*, Doctor. Slowly, next time.'] }],
      until: { clear: ['incision', 'prop', 'magnet'] } },
    { id: 'turn', music: 'or-tense', say: ['ilya', 'Is that all of it? Scanner shows... Nurse Reyes?'], hint: 'scanner',
      spawn: [{ k: 'incision', id: 'tcut', look: 'tumorGuide', scan: true, at: [0.4, -1.4], closed: true, circle: [0.4, -1.4, 1.1, 0.9] }, { k: 'tumor', id: 'tum', look: 'tumor', hiddenBy: 'tcut', at: [0.4, -1.4], dir: [0, 1], pull: 1.6, big: 0.3 }],
      timed: [{ t: 3, say: ['reyes', '...That one isn\'t a prop.'] }],
      until: { clear: ['incision', 'tumor'] }, then: { say: ['pem', 'No joke for that one.'] } },
    { id: 'polyps', say: ['reyes', 'Satellites. Laser, {tool:7}. Hold on target. Nothing else, Doctor.'], hint: 'laser',
      begin: [{ prompt: 'LASER: HOLD {use} ON EACH POLYP' }],
      spawn: [{ k: 'polyp', at: [-2, -1.8] }, { k: 'polyp', at: [-0.9, -2.8] }, { k: 'polyp', at: [1.8, -2.6] }, { k: 'polyp', at: [2.6, -0.8] }, { k: 'polyp', at: [-1.6, -0.4] }],
      until: { clear: ['polyp'] } },
    { id: 'close', say: ['reyes', 'Close him. Then we tell him. *You* tell him.'], music: 'or-calm',
      spawn: [pool('cp', 0.8, -1.2, 0.9), lac('cl', [-3.6, 0], [3.6, 0]), gel('cg', 0, 1.6, 3, 1.1)], until: { clear: ['pool', 'laceration', 'mask'] } },
    { id: 'dressing', spawn: [dressing([-4.6, 0.4], [4.6, 0.4])], until: { clear: ['dressing'] } },
  ],
});

const tableTask = (t) => (o) => ({ ...o, table: t });
const A = tableTask(0), B = tableTask(1), C = tableTask(2);
op({
  id: 'op3', n: 3, title: 'NIGHT FERRY', arena: 'tables', surgeon: 'ilya', gifts: [],
  tools: ['scalpel', 'forceps', 'suture', 'drain', 'gel', 'laser', 'syringe'], startTool: 'drain',
  tables: [{ vitals: 70, name: 'TABLE A: LEG' }, { vitals: 60, name: 'TABLE B: BURNS' }, { vitals: 55, name: 'TABLE C: CHEST' }],
  patient: { name: 'THREE PASSENGERS', age: 0, job: 'NIGHT FERRY, HARBOUR LINE 4', hook: 'THREE TABLES. ONE DOCTOR. THE CHIEF\'S HANDS ARE SHAKING.',
    objective: 'SWITCH TABLES. LOSE NOBODY.',
    followUp: { S: 'All three walked out. One of them sent fruit.', A: 'All three lived. The harbour authority called it a miracle. Reyes did not.', B: 'All three lived. One will need the cane for good.', C: 'All three lived. Nobody slept. Nobody ever does.' } },
  time: 360, vitals: { start: 70, drain: 0.25 }, doses: 5, music: 'or-tense', port: [-5.2, 2.2],
  stages: [
    { id: 'triage', say: ['reyes', 'Three tables! {table} to switch. Watch all three numbers, Doctor!'],
      begin: [{ prompt: 'SWITCH TABLES: {table}' }],
      spawn: [A(pool('a1', -2, 0, 1.2)), A(lac('a2', [-3.5, 1.4], [-0.5, 1.2])), B({ k: 'prop', id: 'b1', look: 'debris', at: [1, -1], dir: [0.4, -1], pull: 1.2 }), B({ k: 'prop', id: 'b2', look: 'debris', at: [-2.4, 0.4], dir: [-0.5, -1], pull: 1.2 }), C(pool('c1', 0, -0.6, 1.2)), C({ k: 'incision', id: 'c2', look: 'guide', line: [[-2.6, 1.2], [2.6, 1.2]] })],
      timed: [{ t: 22, spawn: [B(gel('b3', 2, 1, 2.6, 1.3)), A({ k: 'bleeder', id: 'a3', at: [3, -1.6], r: 0.6 })] }, { t: 40, spawn: [C({ k: 'polyp', at: [-2, -1.6], look: 'shard' }), C({ k: 'polyp', at: [2, -2], look: 'shard' }), C(lac('c3', [-1.4, 0.4], [1.8, 0.2]))], say: ['pem', 'Table C is trying to leave us. Rude.'] }, { t: 58, spawn: [A(gel('a4', -1, -2.3, 3, 1.1)), B({ k: 'prop', id: 'b4', look: 'debris', at: [3.6, -2], dir: [-0.5, 1], pull: 1.2 })] }],
      until: { all: [{ time: 58.5 }, { clear: ['pool', 'bleeder', 'laceration', 'incision', 'prop', 'polyp', 'mask'] }] } },
    { id: 'crash', music: 'or-critical',
      begin: [{ setVitals: 22, table: 2 }, { composure: 100 }, { unlock: 'gift' }, { fx: 'awaken' }, { say: ['reyes', 'Table C is crashing! Doctor? *Doctor!*'] }],
      spawn: [C(pool('x1', -2.4, -1.4, 1.1)), C(pool('x2', 2.4, -1.2, 1.1)), C(lac('x3', [-2.2, 0.8], [2.2, 0.8])), C({ k: 'polyp', at: [0, -2.4], look: 'shard' })],
      timed: [{ t: 1.2, say: ['ilya', 'Everything went... quiet.'], prompt: 'THE QUIET: HOLD {gift}' }, { when: { flag: 'usedQuiet' }, say: ['reyes', 'What was that? How did you...? *Keep cutting!*'] }],
      until: { clear: ['pool', 'laceration', 'polyp'], table: 2 } },
    { id: 'finish', music: 'or-tense', say: ['reyes', 'Dressings. All three. Then you can tell me what your hands just did.'],
      spawn: [A(dressing([-3, 2], [3, 2], { id: 'da' })), B(dressing([-3, 1.8], [3, 1.8], { id: 'db' })), C(dressing([-3, 2], [3, 2], { id: 'dc' }))], until: { clear: ['dressing'] } },
  ],
});

const frag = (i, x, z, gx, gz, rot, goalRot, extra = {}) => ({ k: 'fragment', id: `f${i}`, look: `frag${i % 3}`, at: [x, z], rot, goal: [gx, gz, goalRot], ...extra });
op({
  id: 'op4', n: 4, title: 'STICKS AND STONES', arena: 'bone', surgeon: 'ilya', gifts: ['quiet'], commsAlt: 'sabine',
  tools: ['scalpel', 'drain', 'forceps', 'gel', 'suture', 'syringe', 'laser', 'scanner'], startTool: 'scalpel', composure: 50,
  patient: { name: 'OLLIE BRANDT', age: 16, job: 'FERRY SURVIVOR', hook: 'HE WAS ON THE FERRY. HE WANTS TO KEEP PLAYING CELLO.',
    objective: 'REBUILD THE BONE. SHE IS WATCHING.',
    followUp: { S: 'Grade eight cello, spring recital. He sent a recording. It was terrible and he was proud.', A: 'He has full grip. He practises at unreasonable hours.', B: 'He has most of his grip. He switched to viola and calls it a promotion.', C: 'He kept the arm. The cello is a slow road. He is on it.' } },
  time: 330, vitals: { start: 75, drain: 0.2 }, doses: 3, music: 'or-calm',
  stages: [
    { id: 'open', say: ['sabine', 'Open along the guide. I will be watching from up here. Do not wave.'], spawn: [{ k: 'incision', id: 'o', look: 'guide', smooth: [[-4.6, 1.8], [-1, 2.1], [2, 1.9], [4.4, 2]] }], until: { clear: ['incision'] } },
    { id: 'drain', say: ['reyes', 'Drain it. Two of his pieces are under there somewhere.'], spawn: [pool('p1', -2.8, -1.8, 1.1), pool('p2', 3, -1.8, 1.1), frag(2, -2.8, -1.8, -2.2, -0.2, 300, 20, { hiddenBy: 'p1' }), frag(4, 3, -1.8, 0.8, -0.3, 90, 10, { hiddenBy: 'p2' })], until: { clear: ['pool'] } },
    { id: 'mend', say: ['sabine', 'Bone Mend. Grab, turn, set it down on the silhouette. The fit is the point.'],
      begin: [{ prompt: 'GRAB WITH {use}, TURN WITH {rotate}, RELEASE ON THE OUTLINE' }],
      spawn: [frag(1, -4.6, 0.8, -3.6, -0.4, 40, 0), frag(3, -0.6, 1.2, -0.8, -0.4, 210, 340), frag(5, 2.4, 1.2, 2.2, -0.2, 150, 350), frag(6, 4.6, 0.8, 3.6, -0.4, 300, 15)],
      until: { clear: ['fragment'] } },
    { id: 'cement', say: ['reyes', 'Cement. {tool:6}. Along the seam.'], spawn: [gel('c1', 0, -0.3, 8.4, 0.9)], until: { clear: ['mask'] } },
    { id: 'artery', music: 'or-critical', begin: [{ hurt: 6 }, { sfx: 'alarm' }], say: ['reyes', 'Artery! *Suture, now, now, now!*'],
      spawn: [lac('art', [-1.8, -2.4], [1.4, -2])], until: { clear: ['laceration'] } },
    { id: 'blue', begin: [{ codeBlue: true }], say: ['reyes', "He's flat! *Paddles!* Hold {paddles}, release in the green!"], until: { flag: 'scriptedBlueDone' }, then: { say: ['ilya', "He's back. He's back. I'm going to be sick."] } },
    { id: 'close', music: 'or-calm', say: ['reyes', 'Be sick later. Close.'], spawn: [lac('l', [-4, 1.9], [4, 2]), gel('g', 0, -2.2, 3.2, 1.1)], until: { clear: ['laceration', 'mask'] } },
    { id: 'dressing', spawn: [dressing([-4.6, 1], [4.6, 1])], until: { clear: ['dressing'] }, then: { say: ['sabine', 'Adequate.'] } },
  ],
});

op({
  id: 'op5', n: 5, title: 'INTROIT', arena: 'liver', surgeon: 'ilya', gifts: ['quiet'],
  tools: ['scalpel', 'forceps', 'drain', 'suture', 'scanner', 'laser', 'gel', 'syringe'], startTool: 'scanner', composure: 60,
  patient: { name: 'MR. ANSELM', age: 58, job: 'HARBOUR PILOT', hook: 'HIS ABDOMEN IS A BAG OF KNIVES. HE FEELS WONDERFUL.',
    objective: 'THERE IS SOMETHING IN THE LIVER. REMOVE IT.',
    followUp: { S: 'He woke up in agony and asked for his wife by name. Everyone cried, including him.', A: 'He hurts. He complains. Reyes calls it the best sound in the building.', B: 'He is back on the water, slower, swearing at the tide.', C: 'He lived. He still asks why it had to stop feeling so good.' } },
  time: 360, vitals: { start: 80, drain: 0.3 }, doses: 4, music: 'or-tense',
  stages: [
    { id: 'look', say: ['reyes', 'Scan the lobes, Doctor. He says nothing hurts. Nobody with this liver says that.'], hint: 'scanner',
      spawn: [{ k: 'polyp', look: 'nodule', scan: true, at: [-3, -1.2] }, { k: 'polyp', look: 'nodule', scan: true, at: [3, -0.6] }],
      until: { clear: ['polyp'] } },
    { id: 'fight', music: 'boss-introit', say: ['ilya', 'It moved. Nurse Reyes, the liver moved.'],
      begin: [{ say: ['reyes', 'Livers do not move, Doctor.'] }],
      spawn: [{ k: 'strain', type: 'introit', at: [0, 0], id: 'knock' }],
      timed: [{ t: 3.5, say: ['sabine', "Don't answer it until you're ready. Then cut the pore. Then grab what's behind it."], prompt: 'LANCE THE PORE. THEN PULL THE CORE. DO NOT LET GO.' }],
      until: { flag: 'strainDead' }, then: { say: ['sabine', '...Get it out. All of it. Now.'] } },
    { id: 'eggs', music: 'or-tense', say: ['reyes', 'It laid *eggs*. In the man. Laser, every one.'],
      spawn: [[-4, -2], [-2, 0.8], [0, -2.6], [1.8, 0.6], [3.8, -1.8], [4.2, 1]].map(([x, z]) => ({ k: 'egg', at: [x, z] })), until: { clear: ['egg'] } },
    { id: 'close', music: 'or-calm', say: ['reyes', 'Close what it tore. Then somebody explain this to me.'],
      spawn: [gel('g', 0, -0.4, 3, 1.3)], until: { clear: ['laceration', 'mask', 'pool', 'nick'] } },
    { id: 'dressing', spawn: [dressing([-4.6, 1.8], [4.6, 1.8])], until: { clear: ['dressing'] } },
  ],
});

op({
  id: 'op6', n: 6, title: 'COLD HANDS', arena: 'kidney', surgeon: 'sabine', gifts: ['look'], commsAlt: 'pem',
  tools: ['scalpel', 'forceps', 'suture', 'laser', 'drain', 'gel', 'syringe', 'scanner'], startTool: 'scalpel', composure: 70,
  patient: { name: 'ADA OKOYE', age: 47, job: "DR. OKOYE'S SISTER", hook: 'PEM HAS NOT MADE A JOKE IN TWO DAYS.',
    objective: 'SWAP THE KIDNEY. WATCH THE COLD TIME.',
    followUp: { S: 'The kidney pinked in nine seconds. Pem named his boat after her. It was already named after her.', A: 'She is home. Pem told a pun at the door. Everyone was relieved to groan.', B: 'She needs follow-up every month. Pem drives. Pem hums.', C: 'The kidney took. Slowly. Pem has started joking again, carefully.' } },
  time: 360, vitals: { start: 80, drain: 0.2 }, doses: 3, music: 'or-calm',
  stages: [
    { id: 'open', say: ['sabine', 'Second option is also wrong. So we do this one correctly. Open.'], spawn: [{ k: 'incision', id: 'o', look: 'guide', smooth: [[-3.8, -2.8], [-1, -3.1], [2, -3], [4, -2.8]] }], until: { clear: ['incision'] } },
    { id: 'clamps', say: ['pem', 'Two clamps, Doctor. Tray on your right. She is sleeping. Please do not wake my sister.'],
      spawn: [{ k: 'clamp', id: 'c1', look: 'clamp', at: [4.6, 0.8], goal: [-2.2, 1.4] }, { k: 'clamp', id: 'c2', look: 'clamp', at: [4.6, -0.6], goal: [1.8, 1.4] }], until: { clear: ['clamp'] } },
    { id: 'cut', say: ['sabine', 'Short strokes. It does not need to feel anything about it.'],
      spawn: [{ k: 'incision', look: 'lance', line: [[-2.2, 0.8], [-2.2, 0.1]] }, { k: 'incision', look: 'lance', line: [[1.8, 0.8], [1.8, 0.1]] }], until: { clear: ['incision'] } },
    { id: 'lift', say: ['sabine', 'Lift it out. Straight. Dish.'], begin: [{ fx: 'kidneyOut' }], spawn: [{ k: 'organ', id: 'old', look: 'oldKidney', at: [0, -1], dir: [1, -0.2], pull: 3, big: 0.5 }], until: { clear: ['organ'] } },
    { id: 'graft', say: ['pem', 'Donor kidney, on ice. Cold clock is running. Somebody tell it to stop.'], begin: [{ cold: 120 }, { prompt: 'COLD TIME IS RUNNING. PLACE THE KIDNEY.' }],
      spawn: [{ k: 'graft', id: 'new', look: 'newKidney', at: [4.6, -2], goal: [0, -1], big: 0.4 }], until: { clear: ['graft'] } },
    { id: 'join', say: ['sabine', 'Three anastomoses. Artery. Vein. Ureter. Quick, and *neat.*'],
      spawn: [lac('v1', [-1.6, 0.2], [-0.4, 0.4]), lac('v2', [0.4, 0.4], [1.6, 0.2]), lac('v3', [-0.6, -2.5], [0.8, -2.6])], until: { clear: ['laceration'] } },
    { id: 'unclamp', say: ['sabine', 'Clamps off. Vein first, then artery. Do it in that order.'], begin: [{ cold: 0 }],
      spawn: [{ k: 'prop', id: 'u1', look: 'clamp', order: 1, at: [1.8, 1.4], dir: [0.6, 0.4], pull: 1 }, { k: 'prop', id: 'u2', look: 'clamp', order: 2, at: [-2.2, 1.4], dir: [-0.6, 0.4], pull: 1 }],
      timed: [{ when: { meta: 'looked' }, say: ['sabine', 'There. Under the artery. A clot. *Burn it first.*'], spawn: [{ k: 'clot', look: 'clot', at: [-1.6, 0.7] }] }],
      until: { clear: ['prop', 'clot'] } },
    { id: 'burst', skipIf: 'looked', music: 'or-critical',
      begin: [{ hurt: 15 }, { composure: 100 }, { sfx: 'alarm' }, { fx: 'burst' }, { say: ['sabine', 'A clot. There was a clot. *Again.*'] }, { prompt: 'THE SECOND LOOK: PRESS {gift}' }],
      spawn: [pool('b1', -1.6, 0.6, 1.2), pool('b2', -0.4, -1.4, 1.1), pool('b3', 1.2, 0.4, 1)],
      until: { clear: ['pool'] } },
    { id: 'pink', music: 'or-calm', begin: [{ pinkUp: true }], say: ['pem', 'Look at that. Look at that colour. Ada, you beautiful, stubborn organ.'], until: { time: 3.5 } },
    { id: 'sample', say: ['sabine', 'Now scan the sample from the donor. The Foundation\'s own bank.'], hint: 'scanner',
      spawn: [{ k: 'polyp', look: 'nodule', scan: true, at: [3.8, 0.4] }], until: { clear: ['polyp'] }, then: { say: ['sabine', 'Dormant. There. Mercy, asleep, in a donor kidney. Do not tell Pem yet.'] } },
    { id: 'close', spawn: [lac('cl', [-3.6, -2.8], [3.6, -2.8]), gel('g', -3.4, 1.6, 2.2, 1)], until: { clear: ['laceration', 'mask', 'pool', 'nick'] } },
    { id: 'dressing', spawn: [dressing([-4.2, -2.4], [4.2, -2.4])], until: { clear: ['dressing'] } },
  ],
});

op({
  id: 'op7', n: 7, title: 'LACRIMOSA', arena: 'lung', surgeon: 'ilya', gifts: ['quiet'], film: true,
  tools: ['laser', 'drain', 'gel', 'forceps', 'scalpel', 'suture', 'syringe', 'scanner'], startTool: 'scanner', composure: 60,
  patient: { name: 'OTTILIE MARR', age: 49, job: 'HOSPICE NURSE', hook: "REYES'S OLDEST FRIEND. SHE IS SMILING. SHE CAN'T STOP.",
    objective: 'THE LUNG IS WEEPING. MAKE IT STOP.',
    followUp: { S: 'She woke up hurting and said thank you. She has not stopped saying it.', A: 'She breathes. It hurts. She and Reyes argue about it daily.', B: 'She is on oxygen, in the garden, furious about the roses.', C: 'She lived. She will not nurse again. She visits the ones who do.' } },
  time: 390, vitals: { start: 80, drain: 0.3 }, doses: 4, music: 'or-tense',
  stages: [
    { id: 'look', say: ['reyes', 'Her chart says comfortable. I have known her thirty years. She has never been comfortable.'], hint: 'scanner',
      spawn: [{ k: 'polyp', look: 'nodule', scan: true, at: [-2, 1.4] }], until: { clear: ['polyp'] } },
    { id: 'fight', music: 'boss-lacrimosa', say: ['ilya', 'The lung has *eyes*, Nurse Reyes. It has eyes and it is crying.'],
      begin: [{ prompt: 'LASER OPEN EYES. DRAIN OR GEL THE TEARS.' }],
      spawn: [{ k: 'strain', type: 'lacrimosa', at: [0, -0.8] }], until: { flag: 'strainDead' }, then: { say: ['reyes', 'Get it off her. Get it *off* her.'] } },
    { id: 'close', music: 'or-calm', say: ['reyes', 'Close her up. Carefully. That is my friend.'],
      spawn: [lac('l', [-3, 1.4], [3, 1.2]), gel('g', 2.6, -1.8, 2.4, 1.2)], until: { clear: ['laceration', 'mask', 'pool', 'nick'] } },
    { id: 'dressing', spawn: [dressing([-4.2, 2], [4.2, 2])], until: { clear: ['dressing'] }, then: { say: ['reyes', 'Ottilie? It is Odalys. ...She says it hurts. *She says thank you.*'] } },
  ],
});

op({
  id: 'op8', n: 8, title: 'DIES IRAE', arena: 'heart', surgeon: 'ilya', gifts: ['quiet'],
  tools: ['scalpel', 'forceps', 'laser', 'drain', 'syringe', 'suture', 'gel', 'scanner'], startTool: 'scanner', composure: 70,
  patient: { name: 'CHIEF CORNELIUS BRAM', age: 68, job: 'CHIEF OF SURGERY', hook: '"DON\'T YOU DARE BE GENTLE."',
    objective: 'CUT ON THE OFF-BEAT. SAVE THE MAN WHO TAUGHT YOU.',
    followUp: { S: 'He woke up. His hands were steady and he hated it. He kept his Quiet in a drawer.', A: 'His hands still shake. Real ones. He says this is the correct amount.', B: 'He retired. He visits. He criticises your knots.', C: 'He lives. He does not operate. He shows up anyway, tomorrow, again.' } },
  time: 420, vitals: { start: 75, drain: 0.35 }, doses: 5, music: 'or-tense',
  stages: [
    { id: 'look', say: ['reyes', 'This is the Chief. On your table. Scan him, and do not think about that.'], hint: 'scanner',
      begin: [{ heart: 72 }], spawn: [{ k: 'polyp', look: 'nodule', scan: true, at: [3.6, 1.2] }], until: { clear: ['polyp'] } },
    { id: 'fight', music: 'boss-irae', say: ['sabine', 'It keeps time with him. Cut when the muscle *rests*. Never when it squeezes.'],
      begin: [{ prompt: 'WORK ONLY IN DIASTOLE. SYRINGE SLOWS THE HEART.' }],
      spawn: [{ k: 'strain', type: 'irae', at: [0, -0.7] }], until: { flag: 'strainDead' } },
    { id: 'close', music: 'or-calm', say: ['reyes', 'Close the Chief, Doctor. And stop crying on him.'],
      spawn: [lac('l', [-2.6, 1.8], [2.8, 1.7]), gel('g', 0, -0.6, 3, 1.2)], until: { clear: ['laceration', 'mask', 'pool', 'bleeder', 'nick'] } },
    { id: 'dressing', spawn: [dressing([-4, 2.2], [4, 2.2])], until: { clear: ['dressing'] } },
  ],
});

const cyst = (x, z, isFalse = false) => ({ k: 'cyst', at: [x, z], isFalse, look: 'cyst' });
op({
  id: 'op9', n: 9, title: 'LIBERA ME', arena: 'chest', surgeon: 'ilya', gifts: ['quiet'], partnerBot: true, noVoice: true, noHint: true, seats: 2,
  tools: ['scalpel', 'forceps', 'suture', 'drain', 'syringe', 'gel', 'laser', 'scanner'], startTool: 'scanner', composure: 80, film: true,
  patient: { name: 'NURSE ODALYS REYES', age: 47, job: 'SCRUB NURSE, OR-7', hook: 'SHE TOLD YOU TO START WITHOUT HER.',
    objective: 'NO VOICE IN YOUR EAR. DO IT ANYWAY.',
    followUp: { S: 'She read your op notes. She corrected the spelling. She kept the copy.', A: 'She is back on the ward in a chair, terrifying from a lower angle.', B: 'She says your knots are a disgrace, and that she will be needing them.', C: 'Your sutures are crooked, Doctor. She mentioned it twice.' } },
  time: 540, vitals: { start: 70, drain: 0.35 }, doses: 6, music: 'silence',
  stages: [
    { id: 'sanctus', begin: [{ fake: 99 }, { prompt: 'THE MONITOR SAYS 99. SCAN EVERYTHING.' }, { voice: false }],
      spawn: [cyst(1.2, -2.6), cyst(3, -1.2), cyst(4.6, 0.6), cyst(2.2, 1.4), cyst(-1.6, -2.6), cyst(-4, -1), cyst(-3, 1.2), cyst(0, -0.4), cyst(4.6, -2.4, true), cyst(-4.6, -2.8, true), cyst(0.8, 1.8, true), cyst(-0.8, 1.2, true)],
      until: { clear: ['cyst'] }, then: [{ fake: null }, { setVitals: 41 }, { removeKinds: ['cyst'] }, { sfx: 'flatline' }, { fx: 'truth' }, { prompt: 'THE MONITOR WAS LYING. 41.' }] },
    { id: 'reprise', music: 'boss-libera', begin: [{ heart: 72 }, { prompt: 'YOUR PARTNER TAKES THE LEFT. YOU TAKE THE RIGHT.' }],
      spawn: [{ k: 'strain', type: 'introit', hp: 1, region: [0.5, 5, -3, 1.8], at: [2, 0], talk: false, doneFlag: 'rep1', firstKnock: 4 },
        { k: 'strain', type: 'lacrimosa', spots: [[-3.8, -2], [-2, 0.8]], hpEach: 2, noSob: true, noStalk: true, at: [-3, -1], talk: false, doneFlag: 'rep2' },
        { k: 'strain', type: 'irae', rounds: [3], noArrest: true, at: [2.6, -0.6], talk: false, doneFlag: 'rep3' }],
      until: { all: [{ flag: 'rep1' }, { flag: 'rep2' }, { flag: 'rep3' }] }, then: [{ noHeart: true }, { removeKinds: ['pool', 'bleeder'] }] },
    { id: 'clean', say: null, begin: [{ prompt: 'CLOSE WHAT YOU CAN. IT IS NOT OVER.' }], until: { clear: ['laceration', 'nick'] } },
    { id: 'miserere', music: 'boss-miserere', begin: [{ tag: true }, { prompt: 'IT COPIES YOUR HANDS. KEEP MOVING. TAG WITH {tag}.' }],
      spawn: [{ k: 'strain', type: 'miserere', at: [0, -0.6] }], until: { flag: 'miserereOut' } },
    { id: 'blue', music: 'silence', begin: [{ codeBlue: true }, { sfx: 'flatline' }], until: { flag: 'scriptedBlueDone' } },
    { id: 'silence', begin: [{ mimic: false }, { fx: 'silence' }], until: { time: 4 } },
    { id: 'line', music: 'or-calm', begin: [{ voice: true }], say: ['reyes', '...Your sutures are crooked, Doctor.'], spawn: [lac('fin', [-2.6, 0.4], [2.6, 0.4])], timed: [{ t: 1, fx: 'reyesBack' }], until: { clear: ['laceration', 'nick'] } },
    { id: 'dressing', spawn: [dressing([-4, 1.6], [4, 1.6])], until: { clear: ['dressing'] } },
  ],
});

const tendril = (id, x, z, dx, dz, say2, pain) => ({ k: 'prop', id, look: 'tendril', at: [x, z], dir: [dx, dz], pull: 1.6, arc: 0.35, then: [{ vitals: 8 }, { pain }, { say: ['hesper', say2] }] });
op({
  id: 'op10', n: 10, title: 'DO NO HARM', arena: 'spine', surgeon: 'ilya', gifts: ['quiet'], pain: 0,
  tools: ['scalpel', 'forceps', 'suture', 'gel', 'syringe', 'drain', 'laser', 'scanner'], startTool: 'scalpel', composure: 100,
  patient: { name: 'DR. HESPER LINDQVIST', age: 66, job: 'FOUNDER, THE MERCY FOUNDATION', hook: 'SHE TOOK IT FIRST. ELEVEN YEARS AGO.',
    objective: 'SLOWLY. SHE IS STILL A PATIENT.',
    followUp: { S: 'She sat in the garden in the rain and wept for her whole life, on schedule. She signed the files over.', A: 'She testified. She asked for no medication during it. The court allowed it.', B: 'She is in the ward. Every morning she asks Reyes what day it is. It hurts, and she asks.', C: 'She lived. She said: "Why?" You said: "Because it\'s my shift."' } },
  time: 240, vitals: { start: 60, drain: 0.05 }, doses: 2, music: 'op10',
  stages: [
    { id: 'open', say: ['reyes', 'Scalpel. ...Take your time, Doctor. For once.'], spawn: [{ k: 'incision', id: 'o', look: 'guide', smooth: [[0, -3.2], [0.3, -1.6], [-0.2, 0], [0.2, 1.6], [0, 2.6]] }], until: { clear: ['incision'] } },
    { id: 'tendrils', say: ['hesper', 'No one should hurt, Doctor. Not even you.'], spawn: [tendril('t1', -0.8, -2.2, -1, 0.2, "...Is that... what is that? In my back?", 1), tendril('t2', 0.9, -0.9, 1, 0.2, 'I had forgotten how heavy it is. The whole body.', 2), tendril('t3', -0.9, 0.4, -1, 0.2, 'Stop. No. *Don\'t stop.* What is that called?', 3), tendril('t4', 0.9, 1.5, 1, -0.2, 'Eleven years. It has been waiting there the whole time.', 4)],
      timed: [{ t: 4, say: ['pem', 'She is awake enough. I am keeping her there. She asked me to.'] }], until: { clear: ['prop'] } },
    { id: 'heart', music: 'op10', say: ['ilya', 'This is the last of it. Dr. Lindqvist, this is going to hurt.'],
      spawn: [{ k: 'core', look: 'pale', tether: true, autoFree: true, snapCuts: false, at: [0, -0.4], pts: [[0, -0.4], [0.6, 0.4], [0.2, 1.2], [0.8, 2.2]], big: 0.3 }], until: { clear: ['core'] },
      then: [{ pain: 5 }, { vitals: 20 }, { say: ['hesper', 'Why?'] }] },
    { id: 'answer', say: ['ilya', "Because it's my shift."], until: { time: 3 } },
    { id: 'close', say: ['reyes', 'Close her. Evenly. Everyone gets the same stitches.'], spawn: [lac('l1', [-0.1, -2.6], [0.1, -0.2]), lac('l2', [-0.1, 0.4], [0.1, 2.4]), gel('g', 3, -0.2, 2, 2.4)], until: { clear: ['laceration', 'mask', 'nick'] } },
    { id: 'dressing', spawn: [{ k: 'dressing', id: 'dr', line: [[0, -3], [0, 2.8]] }], until: { clear: ['dressing'] } },
  ],
});

/* ---------- Consult ---------- */
const ALLTOOLS = ['scalpel', 'forceps', 'suture', 'drain', 'syringe', 'gel', 'laser', 'scanner'];
op({
  id: 'pileup', n: 0, title: 'PILE-UP', arena: 'chest', surgeon: 'ilya', gifts: ['quiet', 'look'], tools: ALLTOOLS, startTool: 'drain', composure: 40, clockWins: true, film: true, session: true,
  patient: { name: 'A BUS DRIVER', age: 44, job: 'HARBOUR LINE 9', hook: 'EVERYTHING IS WRONG WITH HIM. ALL AT ONCE.', objective: 'KEEP HIM ALIVE UNTIL THE CLOCK RUNS OUT.', followUp: { S: 'He drives again. He waves at the hospital.', A: 'He drives again. He does not wave.', B: 'He has a desk job now. He misses the bus.', C: 'He lived. Somebody check on the bus.' } },
  time: 200, vitals: { start: 90, drain: 0.12 }, doses: 7, music: 'or-tense',
  stages: [{ id: 'waves', say: ['reyes', 'All hands. Whatever you see, fix it. Do not fix the same thing twice.'], spawn: [{ k: 'strain', type: 'pileup', at: [0, 0] }], until: { time: 9999 } }],
});
const fight = (id, base, type, extra = {}) => op({
  ...OPS[base], id, n: 0, title: `CONSULT: ${OPS[base].title}`, session: true, time: 220, doses: 6, gifts: ['quiet', 'look'], tools: ALLTOOLS, composure: 50, noVoice: false,
  stages: [{ id: 'fight', music: `boss-${type === 'irae' ? 'irae' : type}`, begin: type === 'irae' ? [{ heart: 72 }] : [], spawn: [{ k: 'strain', type, at: [0, type === 'irae' ? -0.7 : 0], ...extra }], until: { flag: 'strainDead' } }, { id: 'tidy', say: ['reyes', 'Close up. All of you.'], until: { clear: ['laceration', 'pool', 'bleeder'] } }],
});
fight('c-introit', 'op5', 'introit');
fight('c-lacrimosa', 'op7', 'lacrimosa', { hpEach: 2 });
fight('c-irae', 'op8', 'irae', { rounds: [2, 2] });
export const SESSION_LIST = ['pileup', 'c-introit', 'c-lacrimosa', 'c-irae'];
export const CAMPAIGN_OPS = ['op1', 'op2', 'op3', 'op4', 'op5', 'op6', 'op7', 'op8', 'op9', 'op10'];
export const CONSULT_OPS = ['pileup', 'op1', 'op2', 'op4', 'op5', 'op6', 'op7', 'op8', 'op10'];
