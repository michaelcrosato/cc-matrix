import { closeUp } from './_kit.js';

export default {
  id: 'op5', num: 5, title: 'INTROIT', arena: 'liver', surgeon: 'ilya', gifts: ['quiet'], tools: ['drain', 'forceps', 'suture', 'gel', 'syringe', 'scalpel', 'laser', 'scanner'], music: 'or-tense',
  scene: 'ep5', boss: 'introit',
  patient: {
    name: 'MR. ANSELM', age: 58, job: 'HARBOUR PILOT', hook: 'HIS ABDOMEN IS LIKE A BAG OF KNIVES. HE FEELS NOTHING. "ISN\'T IT WONDERFUL?"',
    objective: 'FIND WHAT IS MOVING IN HIS LIVER. TAKE IT OUT.',
    followUp: { S: 'He woke up in agony and cried with relief. He is back on the harbour.', A: 'He hurts. He complains constantly. Reyes smiles every time.', B: 'He will not pilot again. He has taken up shouting at the ferries from the shore.', C: 'He lives. He asks, some nights, whether it could be put back.' },
  },
  time: 360, vitals: { start: 80, drain: 0.3 }, doses: 4,
  stages: [
    { id: 'open', objective: 'OPEN', hint: 'scalpel', say: ['reyes|He is smiling, Doctor. His liver looks like a shipwreck, and he is smiling.', 'pem|He told me a joke on the way under. It was quite good.'], spawn: [{ k: 'incision', at: [-3, -2.8], ang: 3, len: 6 }], until: { clear: ['incision'] } },
    { id: 'drain', objective: 'DRAIN', hint: 'drain', spawn: [{ k: 'pool', at: [-2.4, -0.6], r: 1.2 }, { k: 'pool', at: [2.2, 0.4], r: 1.2 }], until: { clear: ['pool'] } },
    { id: 'scan', objective: 'SCANNER: SOMETHING MOVED', hint: 'scanner', say: ['ilya|It moved. Nurse Reyes, the liver moved.', 'reyes|Livers do not move, Doctor.', 'ilya|This one *knocked*.'],
      spawn: [{ k: 'strain:introit', id: 'introit', hidden: true, hp: 3, deadFlag: 'introitDead', onReveal: [{ flag: 'found' }, { say: ['reyes|What is that. What *is* that.', 'sabine|...', 'sabine|Get it out.'] }, { music: 'boss-introit' }] }],
      until: { flag: 'found' } },
    { id: 'fight', objective: 'WHEN IT KNOCKS: LANCE THE PORE. FORCEPS THE CORE. PULL.', hint: 'scalpel',
      say: ['sabine|When it surfaces, lance the pore. Short stroke. Do not answer it until you are ready.', 'sabine|Then forceps. Pull against the tether. Do not let go.'],
      until: { all: [{ flag: 'introitDead' }, { clear: ['laceration'] }] } },
    { id: 'eggs', objective: 'LASER THE EGGS', hint: 'laser', music: 'or-tense', say: ['reyes|It left something behind. Six. *Laser.* All of them, Doctor.', 'ilya|Eggs. Those are eggs. Why are there eggs?'],
      spawn: [[-4, -1.6], [-1.8, 1.2], [-0.4, -2], [1.4, 1.4], [3, -1.6], [4.2, 0.6]].map((at) => ({ k: 'egg', at, r: 0.36 })), until: { clear: ['egg'] } },
    ...closeUp({ sutures: [{ at: [-3, -2.8], ang: 3, len: 6 }], sutureSay: 'reyes|Close him. We are all going to pretend we are calm until he is in recovery.', gel: { at: [0, 0], rx: 2.6, rz: 1.1 }, dressing: { at: [-2.8, 1.8], ang: -2, len: 5.6 } }),
  ],
};
