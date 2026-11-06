import { closeUp } from './_kit.js';

export default {
  id: 'op8', num: 8, title: 'DIES IRAE', arena: 'heart', surgeon: 'ilya', gifts: ['quiet'], tools: ['drain', 'forceps', 'suture', 'gel', 'syringe', 'scalpel', 'laser', 'scanner'], music: 'or-tense',
  scene: 'ep8', boss: 'diesirae',
  patient: {
    name: 'CHIEF CORNELIUS BRAM', age: 68, job: 'CHIEF OF SURGERY', hook: '"DON\'T YOU DARE BE GENTLE." HE GAVE YOU HIS OLD SCALPEL.',
    objective: 'IT LIVES ON HIS HEART. WORK BETWEEN THE BEATS.',
    followUp: { S: 'He retired on the Friday. He is in the gallery on the Monday, criticising.', A: 'His hands have stopped shaking. He is learning, at 68, what that feels like.', B: 'He will not operate again. He is the worst patient the ward has ever had.', C: 'He lives. He walks the corridors at night. Nobody tells him to go home.' },
  },
  time: 420, vitals: { start: 75, drain: 0.35 }, doses: 5,
  stages: [
    { id: 'open', objective: 'OPEN', hint: 'scalpel', say: ["reyes|That is your Chief. That is your *scalpel*. Whatever you are feeling, stop.", "ilya|It is beating very fast. Is it supposed to be that fast?"], spawn: [{ k: 'incision', at: [-3.6, -3], ang: 2, len: 7.2 }], until: { clear: ['incision'] } },
    { id: 'drain', objective: 'DRAIN', hint: 'drain', spawn: [{ k: 'pool', at: [-3, 1], r: 1 }, { k: 'pool', at: [3, 0.6], r: 1 }], until: { clear: ['pool'] } },
    { id: 'fight', objective: 'ONLY BETWEEN THE BEATS: CUT, LIFT, BURN. SYRINGE SLOWS HIM.', music: 'boss-diesirae', hint: 'scalpel',
      say: ['reyes|Everything on the beat, Doctor. Watch the ring. *Red, you wait.*', 'pem|A dose slows him. He has about five doses of patience in him.', 'sabine|Cut a plate in one beat. Lift it in the next. Then burn the eye.'],
      spawn: [{ k: 'strain:diesirae', id: 'diesirae', cz: -0.3, deadFlag: 'wrathDead', fibLine: "pem|He's back. Slower, please. I am too old for this.", arrestLine: ['pem|He has arrested. Your hands, Doctor. Both of them.', 'reyes|*Massage.* Left, right, on the beat. Eight. Count them!'], finalLine: ['bram|...Don\'t you dare...', 'reyes|Final cut! Now, Doctor! Now!'] }],
      until: { flag: 'wrathDead' } },
    { id: 'beat', objective: 'LISTEN', music: 'or-calm', say: ['pem|Sinus rhythm. Seventy-two. Steady as a very old clock.', 'reyes|...Close him up. He will want to check your work.'], until: { time: 3 } },
    ...closeUp({ sutures: [{ at: [-3.6, -3], ang: 2, len: 7.2 }], gel: { at: [0, 0], rx: 2.6, rz: 1.2 }, dressing: { at: [-3, 2.4], ang: 0, len: 6 }, dressSay: 'reyes|Dress it. That is the first straight line you have ever drawn, Doctor.' }),
  ],
};
