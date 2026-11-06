import { closeUp } from './_kit.js';

export default {
  id: 'op7', num: 7, title: 'LACRIMOSA', arena: 'lung', surgeon: 'ilya', gifts: ['quiet'], tools: ['drain', 'forceps', 'suture', 'gel', 'syringe', 'scalpel', 'laser', 'scanner'], music: 'or-tense',
  scene: 'ep7', boss: 'lacrimosa',
  patient: {
    name: 'OTTILIE MARR', age: 49, job: 'HOSPICE NURSE', hook: "REYES'S OLDEST FRIEND. SHE IS SMILING. SHE WORKED FOR THE FOUNDATION FOR NINE YEARS.",
    objective: 'THE LUNG IS WEEPING. MAKE IT STOP.',
    followUp: { S: 'She feels every breath now. She says thank you for each of them.', A: 'She is back on a ward. A real one. She and Reyes do not discuss it.', B: 'Her lung is half what it was. She climbs the stairs anyway, swearing.', C: 'She lives, on oxygen. Reyes visits. Reyes also, once, cried. Alone.' },
  },
  time: 390, vitals: { start: 80, drain: 0.3 }, doses: 4,
  stages: [
    { id: 'open', objective: 'OPEN', hint: 'scalpel', say: ['reyes|That is Ottilie. You will be *perfect*, Doctor, or I will know why.', 'ilya|Yes, Nurse Reyes.'], spawn: [{ k: 'incision', at: [-3, -2.9], ang: 0, len: 6 }], until: { clear: ['incision'] } },
    { id: 'drain', objective: 'DRAIN. THEN SCAN.', hint: 'drain', spawn: [{ k: 'pool', at: [-1.8, 0.4], r: 1.1 }, { k: 'pool', at: [2, -0.6], r: 1 }], until: { clear: ['pool'] } },
    { id: 'scan', objective: 'SCANNER: SOMETHING IS WATCHING', hint: 'scanner', say: 'ilya|It is breathing out of time with her. Why is it out of time with her?',
      spawn: [{ k: 'marker', id: 'watcher', at: [0, -1.2], hidden: true, onReveal: [{ flag: 'seen' }, { remove: ['watcher'] }] }], until: { flag: 'seen' } },
    { id: 'fight', objective: 'LASER THE OPEN EYES. DRAIN OR GEL THE TEARS.', music: 'boss-lacrimosa', hint: 'laser',
      say: ['reyes|Eyes. It has *eyes*. Laser them when they open!', 'sabine|Drain the tears, or lay gel down and let them die on it.', 'sabine|Do not look at them longer than you have to.'],
      spawn: [{ k: 'strain:lacrimosa', id: 'lacrimosa', deadFlag: 'lacDead', halfLine: "ilya|It's crawling. It's crawling! Why would it crawl?", sobLine: ['reyes|The last one. It is going to *sob*. Gel that line, Doctor!', 'sabine|The whole line. Before it breathes out.'] }],
      until: { flag: 'lacDead' } },
    { id: 'mop', objective: 'CLEAN UP THE NICKS', hint: 'gel', music: 'or-tense', say: ['reyes|Ottilie. Ottilie, can you hear me.', 'pem|She is awake under there. She just said *ow*.', 'reyes|...Say it again, you old fool. Say it again.'], spawn: [{ k: 'mask', at: [0, 0.3], rx: 2.2, rz: 1 }], until: { clear: ['mask'] } },
    ...closeUp({ sutures: [{ at: [-3, -2.9], ang: 0, len: 6 }], dressing: { at: [-2.8, 1.9], ang: 0, len: 5.6 }, dressSay: "reyes|Dress it. Then get out of my theatre for ten minutes. All of you." }),
  ],
};
