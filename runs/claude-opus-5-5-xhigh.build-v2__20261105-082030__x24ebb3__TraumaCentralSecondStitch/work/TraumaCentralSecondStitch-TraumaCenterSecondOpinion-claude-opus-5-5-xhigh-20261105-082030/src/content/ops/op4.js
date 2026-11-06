import { closeUp } from './_kit.js';

// Bone Mend. Sabine's cold commentary replaces some of Reyes's lines.
const FRAG = (id, at, to, rot, extra = {}) => ({ k: 'fragment', id, at, to, rot, rotTo: 0, shape: id, ...extra });

export default {
  id: 'op4', num: 4, title: 'STICKS AND STONES', arena: 'bone', surgeon: 'ilya', gifts: ['quiet'], tools: ['drain', 'forceps', 'suture', 'gel', 'syringe', 'scalpel', 'laser', 'scanner'], music: 'or-calm',
  scene: 'ep4', commenter: 'sabine',
  patient: {
    name: 'OLLIE BRANDT', age: 16, job: 'FERRY SURVIVOR', hook: 'HE WANTS TO PITCH AGAIN. HE HAS NOT ASKED YOU IF HE CAN. HE ASKED THE NURSE.',
    objective: 'REBUILD A SHATTERED FOREARM. THE CONSULTANT IS WATCHING.',
    followUp: { S: 'He threw a strike in April. He has told no one where the scar came from.', A: 'He is pitching again by spring. Sidearm. It suits him.', B: 'He will throw again. Not hard. He has started keeping score instead.', C: 'He keeps the arm. He keeps the ball on the shelf, too.' },
  },
  time: 330, vitals: { start: 75, drain: 0.2 }, doses: 3,
  stages: [
    { id: 'open', objective: 'OPEN ALONG THE LINE', hint: 'scalpel', say: ['sabine|Dr. Achterberg. I will be watching from the gallery. Begin.', "sabine|You have two options. The second one is also wrong. Cut."], spawn: [{ k: 'incision', at: [-3.2, -2.1], ang: 0, len: 6.4 }], until: { clear: ['incision'] } },
    { id: 'drain', objective: 'DRAIN THE FIELD', hint: 'drain', say: 'reyes|There are bone pieces under that. Drain. Gently.',
      spawn: [{ k: 'pool', id: 'p1', at: [-2.8, 1.4], r: 1.3 }, { k: 'pool', id: 'p2', at: [2.8, 1.3], r: 1.1 }, FRAG('f1', [-3.3, 1.5], [-3.5, 0], 40, { hiddenBy: 'p1' }), FRAG('f2', [-2.1, 1.6], [-2.1, -0.05], -30, { hiddenBy: 'p1' }), FRAG('f5', [2.3, 1.5], [2.1, 0.05], 25, { hiddenBy: 'p2' })], until: { clear: ['pool'] } },
    { id: 'mend', objective: 'BONE MEND: CARRY EACH PIECE TO ITS SILHOUETTE, TURN IT, LET GO', hint: 'forceps',
      say: ['reyes|Forceps. Hold {use} to carry, {rotate} to turn. Fit it to the outline.', 'sabine|Within five degrees is correct. Within fifteen is merely legal.'],
      spawn: [
        FRAG('f3', [-0.6, -1.8], [-0.7, 0.03], 70), FRAG('f4', [0.8, -1.7], [0.7, -0.03], -60), FRAG('f6', [3.7, -1.7], [3.5, 0], -45),
      ], until: { clear: ['fragment'] } },
    { id: 'cement', objective: 'GEL CEMENT ALONG THE SEAMS', hint: 'gel', say: 'reyes|Cement. Gel it along the whole seam. He has to throw with this.', spawn: [{ k: 'mask', path: [[-4.6, 0], [4.6, 0]] }], until: { clear: ['mask'] } },
    { id: 'artery', objective: 'THE ARTERY: SUTURE IT, FAST', hint: 'suture', music: 'or-tense',
      do: [{ fx: 'shake' }], say: ['ilya|That is... that is a lot of blood. Why is that a lot of blood?', 'reyes|Radial artery. *Suture!* Now, Doctor!'],
      spawn: [{ k: 'laceration', id: 'art', at: [-1, 1.7], ang: 0, len: 2.2 }, { k: 'pool', id: 'art-p', at: [0.1, 2.0], r: 1, grow: 0.25, task: false }], until: { clear: ['laceration'] } },
    { id: 'blue', objective: 'CODE BLUE: HOLD BOTH TRIGGERS, RELEASE IN THE GREEN', say: ['pem|He has flatlined. Terribly sorry. Paddles, Doctor.', 'reyes|Hold both. Let go in the *green*. Twice. Do not touch the table.'],
      do: [{ setVitals: 8 }, { codeBlue: { then: [{ flag: 'revived' }, { say: 'sabine|Twelve seconds to spare. Do not celebrate. Close.' }] } }], until: { flag: 'revived' } },
    ...closeUp({ sutures: [{ at: [-3, -2.1], ang: 0, len: 6 }], sutureSay: 'reyes|Close the long cut. In rhythm, Doctor. The boy is sixteen.', gel: { at: [0, -0.1], rx: 2.4, rz: 0.9 }, dressing: { at: [-3, 1.4], ang: 0, len: 6 }, dressSay: 'sabine|Dress it. I will write down that you finished.' }),
  ],
  outro: 'sabine|Adequate.',
};
