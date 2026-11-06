import { closeUp } from './_kit.js';

export default {
  id: 'op2', num: 2, title: 'THE VANISHING ACT', arena: 'stomach', surgeon: 'ilya', gifts: [], tools: ['drain', 'forceps', 'suture', 'gel', 'syringe', 'scalpel', 'scanner', 'laser'], music: 'or-calm',
  scene: 'ep2',
  patient: {
    name: 'THE GREAT ZAMBONI', age: 61, job: 'STAGE MAGICIAN', hook: "HE SWALLOWED SOMETHING DURING HIS ACT. HE WON'T SAY WHAT.",
    objective: 'FIND WHAT HE SWALLOWED. TAKE IT OUT. ALL OF IT.',
    followUp: { S: 'They got it early. He does the coin trick on the ward now. Badly, on purpose.', A: 'Clean margins. He sent the staff a deck of cards, all sevens.', B: 'He starts chemo Monday. He has already made the IV pole disappear.', C: 'He has a year, maybe. He says he has done more with less.' },
  },
  time: 300, vitals: { start: 80, drain: 0.15 }, doses: 3, ring: [-5.1, 2.1],
  onRewind: null,
  stages: [
    { id: 'open', objective: 'SCALPEL: FOLLOW THE DOTTED LINE', hint: 'scalpel', say: ['reyes|*Scalpel.* The sharp end goes toward the patient, Doctor. We have discussed this.', 'reyes|Start at the top of the line. Hold {use}. Trace it. Do not improvise.'],
      spawn: [{ k: 'incision', id: 'midline', at: [-2.8, -0.2], ang: 0, len: 5.6 }], until: { clear: ['incision'] } },
    { id: 'bleeders', objective: 'DRAIN THE BLEEDERS ALONG THE CUT', hint: 'drain', say: 'reyes|Bleeders. They refill while you admire them. Drain, Doctor.',
      spawn: [{ k: 'bleeder', id: 'b1', at: [-1.8, 0.9], r: 0.8 }, { k: 'bleeder', id: 'b2', at: [1.2, -1.2], r: 0.8 }, { k: 'bleeder', id: 'b3', at: [2.8, 0.8], r: 0.7 }], until: { clear: ['bleeder'] } },
    { id: 'scan', objective: 'SCANNER: FIND WHAT HE SWALLOWED', hint: 'scanner', say: ['pem|He told me he swallowed nothing. Then he sneezed and a dove came out.', 'reyes|*Scanner.* Hold {use} and sweep. Four things in there. Find them.'],
      spawn: [
        { k: 'prop', id: 'key', prop: 'key', at: [-3.6, -1.2], hidden: true, lance: true, dir: -80, pull: 1.3, lanceAng: 20, onReveal: [{ say: 'ilya|A key. There is a key in his stomach.' }] },
        { k: 'prop', id: 'coin', prop: 'coin', at: [-1.0, 1.2], hidden: true, lance: true, dir: -100, pull: 1.3, lanceAng: -15, onReveal: [{ say: 'reyes|A coin. The gentleman is at least consistent.' }] },
        { k: 'prop', id: 'card', prop: 'card', at: [2.0, -1.4], hidden: true, lance: true, dir: -70, pull: 1.3, lanceAng: 10, onReveal: [{ say: 'ilya|...Seven of clubs. Is that your card, Nurse Reyes?' }] },
        { k: 'magnet', id: 'mag', prop: 'magnet', at: [3.6, 0.8], hidden: true, lance: true, dir: -90, pull: 1.6, speedLimit: 2.4, lanceAng: 0, onReveal: [{ say: 'reyes|Magnets. Pull *slowly* or they snap back. Hold {steady}.' }] },
      ],
      until: { clear: ['prop', 'magnet', 'incision'] } },
    { id: 'turn', objective: 'SCAN AGAIN', hint: 'scanner', music: 'or-tense', say: ['ilya|That is everything. Coin, key, card, magnets. Ta-da.', 'reyes|Scan it again, Doctor.'],
      spawn: [{ k: 'tumor', id: 'tum', at: [-0.4, -0.4], r: 1.15, hidden: true, dir: -90, pull: 1.7, onReveal: [{ flag: 'tumorFound' }, { say: ['ilya|...Is that a prop?', "reyes|...That one isn't a prop.", 'pem|Sleep well, maestro.'] }] }],
      until: { clear: ['marker'], flag: 'tumorFound' } },
    { id: 'tumor', objective: 'CUT AROUND THE TUMOUR. LIFT IT OUT.', hint: 'scalpel', say: 'reyes|All the way round. Then forceps. No more jokes in this room.', until: { clear: ['incision', 'tumor'] } },
    { id: 'polyps', objective: 'LASER: BURN THE FIVE POLYPS', hint: 'laser', say: ['reyes|Satellites. *Laser.* Hold {use} on each until it goes.', 'reyes|Stay on target. Healthy tissue has done nothing to you.'],
      spawn: [{ k: 'polyp', at: [-3.4, 0.6] }, { k: 'polyp', at: [-1.6, -1.8] }, { k: 'polyp', at: [0.8, 1.5] }, { k: 'polyp', at: [2.6, -0.6] }, { k: 'polyp', at: [4, 1.4] }], until: { clear: ['polyp'] } },
    { id: 'drain2', objective: 'DRAIN THE FIELD', hint: 'drain', spawn: [{ k: 'pool', at: [-0.4, -0.2], r: 1.2 }], until: { clear: ['pool'] } },
    ...closeUp({ sutures: [{ at: [-2.6, 0.1], ang: 2, len: 5.2 }], sutureSay: 'reyes|Close him. He has a Saturday show he is not going to make.', gel: { at: [0, 0], rx: 2.1, rz: 1 }, gelSay: 'reyes|Gel. Then we find his family, Doctor. You will do the talking.', dressing: { at: [-3, 1.1], ang: 0, len: 6 }, dressSay: 'reyes|Dress it. Hold {use}. He deserves one straight line today.' }),
  ],
};
