import { closeUp } from './_kit.js';

// Cold Hands. Sabine at the table. The first unclamp bursts regardless, and that teaches The Second Look.
export default {
  id: 'op6', num: 6, title: 'COLD HANDS', arena: 'kidneybed', surgeon: 'sabine', gifts: ['look'], tools: ['drain', 'forceps', 'suture', 'gel', 'syringe', 'scalpel', 'laser', 'scanner'], music: 'or-calm',
  scene: 'ep6',
  patient: {
    name: 'ADA OKOYE', age: 47, job: "PEM'S SISTER. SCHOOL BUS DRIVER.", hook: 'A DONOR KIDNEY FROM THE MERCY FOUNDATION BANK. PEM IS PASSING GAS FOR HIS OWN SISTER.',
    objective: 'TRANSPLANT. THE ICE ONLY BUYS YOU TWO MINUTES.',
    followUp: { S: 'She is back on the route. The children say she drives faster now.', A: 'The kidney took. Pem has stopped making puns for almost a week.', B: 'The kidney took. She will be on pills a long time, and she drives anyway.', C: 'She lives. Pem sits with her in the mornings and says nothing at all.' },
  },
  time: 360, vitals: { start: 80, drain: 0.2 }, doses: 3,
  // The first Second Look after the burst shows the clot that was there all along.
  onRewind: [{ ifPersist: 'burstSeen', then: [{ ifPersist: 'clotShown', then: [], else: [{ persist: 'clotShown' }, { spawn: [{ k: 'clot', id: 'clot', at: [-1.4, -0.9], r: 0.5, unlocks: 'uc1' }] }, { lock: 'uc1' }, { say: 'sabine|There. See it now? *Laser* the clot. Then again.' }] }], else: [] }],
  stages: [
    { id: 'open', objective: 'OPEN', hint: 'scalpel', say: ['sabine|Reyes. I will take this one. Stand where I can hear you disapprove.', 'reyes|Yes, Doctor. She said it like she meant it.'], spawn: [{ k: 'organ', id: 'oldkidney', at: [0, 0.7], dir: -90, pull: 2.8, grabR: 0.8, tearMul: 1.8, organ: 'old', locked: true, task: false, onDone: [{ flag: 'oldOut' }] }, { k: 'incision', at: [-3, -2.6], ang: 2, len: 6 }], until: { clear: ['incision'] } },
    { id: 'clamps', objective: 'FORCEPS: CLAMP BOTH VESSELS', hint: 'forceps', say: 'sabine|Clamp the artery, clamp the vein. Carry each clamp to its mark.',
      spawn: [{ k: 'clamp', id: 'c1', at: [-5.2, 1.6], to: [-1.4, -0.9], tol: 0.6 }, { k: 'clamp', id: 'c2', at: [-4.4, 1.9], to: [1.4, -0.9], tol: 0.6 }], until: { clear: ['clamp'] } },
    { id: 'cut', objective: 'SCALPEL: CUT BOTH VESSELS', hint: 'scalpel', say: 'sabine|Short strokes. It is a kidney. It is not your enemy yet.',
      spawn: [{ k: 'incision', at: [-1.9, -0.25], ang: 0, len: 1, short: true }, { k: 'incision', at: [0.9, -0.25], ang: 0, len: 1, short: true }], until: { clear: ['incision'] } },
    { id: 'lift', objective: 'FORCEPS: LIFT OUT THE FAILING KIDNEY', hint: 'forceps', say: 'reyes|Out it comes. Mind the ureter. She needs that.', do: [{ unlockEnt: 'oldkidney' }], until: { flag: 'oldOut' } },
    { id: 'donor', objective: 'FETCH THE DONOR KIDNEY FROM THE ICE TRAY', hint: 'forceps', music: 'or-tense',
      do: [{ cold: 120 }], say: ['reyes|Donor kidney on ice. *Two minutes*, Doctor. The clock on the tray is the one that matters.', 'pem|From the Mercy Foundation bank. Very generous. Very clean paperwork.'],
      spawn: [{ k: 'donor', id: 'newkidney', at: [4.6, -2.6], to: [0, 0.7], tol: 0.8, grabR: 0.6, keep: true, perfuse: 0 }], until: { clear: ['donor'] } },
    { id: 'anast', objective: 'SUTURE THE ARTERY, THE VEIN, THE URETER', hint: 'suture', say: 'sabine|Three anastomoses. Short. Precise. Your hands are colder than the ice. Use that.',
      spawn: [{ k: 'laceration', at: [-1.4, -0.5], ang: 0, len: 1.4, bleed: false }, { k: 'laceration', at: [0.6, -0.6], ang: 0, len: 1.4, bleed: false }, { k: 'laceration', at: [-0.7, 2], ang: 0, len: 1.4, bleed: false }], until: { clear: ['laceration'] } },
    { id: 'unclamp', objective: 'FORCEPS: PULL THE ARTERY CLAMP', hint: 'forceps', do: [{ cold: null }, { remove: ['c1', 'c2'] }], say: 'sabine|Unclamp. Artery first. Slowly.',
      spawn: [{ k: 'unclamp', id: 'uc1', at: [-1.4, -0.9], dir: -90, pull: 1.1, onDone: [{ ifPersist: 'burstSeen', then: [{ flag: 'cleanOpen' }], else: [{ persist: 'burstSeen' }, { flag: 'clotBurst' }, { fx: 'shake' }, { vitals: -10 }, { composure: 100 }, { spawn: [{ k: 'bleeder', id: 'burst1', at: [-1.2, 0], r: 1.4, grow: 0.4, max: 2, task: true }, { k: 'bleeder', id: 'burst2', at: [1.1, 0.4], r: 1, grow: 0.3, max: 1.8, task: true }] }, { say: ['ilya|Clot! There was a clot! Nobody could have seen...', 'sabine|Again.'] }, { prompt: 'PRESS {gift}: THE SECOND LOOK. SEE IT BEFORE IT HAPPENS.', promptT: 12 }] }] }],
      until: { any: [{ flag: 'clotBurst' }, { flag: 'cleanOpen' }] } },
    { id: 'again', objective: 'PRESS {gift}. OR DO IT THE SLOW WAY.',
      timed: [{ at: 8, say: 'sabine|The slow way, then. Drain it. Burn the clot. Do not make this a habit.', spawn: [{ k: 'clot', id: 'clot', at: [-1.4, -0.9], r: 0.5 }] }],
      until: { any: [{ flag: 'cleanOpen' }, { clear: ['bleeder', 'clot'], time: 0.1 }] } },
    { id: 'unclamp2', objective: 'PULL THE VEIN CLAMP', hint: 'forceps', say: 'sabine|Now the vein. Watch the colour. This is the part you get to keep.',
      spawn: [{ k: 'unclamp', id: 'uc2', at: [1.4, -0.9], dir: -90, pull: 1.1, onDone: [{ perfuse: 'newkidney' }, { flag: 'pink' }, { music: 'or-calm' }, { say: ['pem|There she goes. Pinking up. ...That is my sister, you know.', 'sabine|I know.'] }] }], until: { clear: ['unclamp'] } },
    { id: 'pinks', objective: 'WATCH IT', until: { time: 3.2 } },
    { id: 'sample', objective: 'SCANNER: CHECK THE DONOR TISSUE SAMPLE', hint: 'scanner', say: 'sabine|One more thing. Scan the sample from the donor kidney. Humour me.',
      spawn: [{ k: 'polyp', id: 'sample', at: [3.8, 1.7], r: 0.5, hidden: true, task: true, inertUntil: true, onReveal: [{ flag: 'sampleSeen' }, { say: ['ilya|That is... it is asleep. It is the same thing. In the *donor*.', 'sabine|Mercy. Dormant. In the Foundation\'s own bank.', 'reyes|Show it none, Doctor.'] }, { remove: ['sample'] }] }], until: { flag: 'sampleSeen' } },
    ...closeUp({ sutures: [{ at: [-3, -2.6], ang: 2, len: 6 }], gel: { at: [0, 1], rx: 2, rz: 0.9 }, dressing: { at: [-2.8, 2.3], ang: 0, len: 5.6 }, dressSay: 'reyes|Dress it. The kidney is the only honest thing that came from that bank.' }),
  ],
};
