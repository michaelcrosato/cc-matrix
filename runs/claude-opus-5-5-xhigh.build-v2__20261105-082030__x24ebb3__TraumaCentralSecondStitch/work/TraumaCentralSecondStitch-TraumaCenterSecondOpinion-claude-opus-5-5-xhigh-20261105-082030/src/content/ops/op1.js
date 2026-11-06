import { closeUp } from './_kit.js';

const COUNT = ['reyes|One.', 'reyes|Two.', 'reyes|Three. Keep breathing, Doctor.', 'reyes|Four.', 'reyes|Five. He stopped screaming at three.', 'reyes|Six.', 'reyes|Seven.', 'reyes|Eight. Slower.', 'reyes|Nine.', 'reyes|Ten.', 'reyes|Eleven. That is the count on the chart.'];
const hook = (id, at, dir, arc, extra = {}) => ({ k: 'hook', id, at, dir, arc, pull: 1.25, onDone: [{ count: 'hooks', lines: COUNT }], ...extra });

export default {
  id: 'op1', num: 1, title: 'ELEVEN HOOKS', arena: 'forearm', surgeon: 'ilya', gifts: [], tools: ['drain', 'forceps', 'suture', 'gel'], music: 'or-calm',
  scene: 'ep1',
  patient: {
    name: 'TOMASZ DOLAN', age: 52, job: 'TRAWLER DECKHAND', hook: "HIS DAUGHTER'S WEDDING IS SATURDAY.",
    objective: 'BACK ELEVEN FISHHOOKS OUT OF ONE ARM. THEN THE TWELFTH.',
    followUp: { S: 'He walked her down the aisle. Dry eyes. Hers, not his.', A: 'He made the wedding. He shows the scar to everyone.', B: 'He made the wedding. He dropped the cake with the bad hand.', C: 'He danced badly. She cried anyway.' },
  },
  time: 240, vitals: { start: 85, drain: 0.1 }, doses: 3, ring: [-5.1, 2.1],
  anyStage: { vitalsBelow: { 50: { say: 'reyes|He is fading. *Syringe.* Draw with {use}, let go in the ring.', unlock: 'syringe' } } },
  stages: [
    { id: 'marker', objective: 'MOVE YOUR INSTRUMENT ONTO THE MARKER', say: ['reyes|This is your hand. That is the patient. Do not confuse them.', 'reyes|Move your instrument onto the marker, Doctor.'], spawn: [{ k: 'marker', at: [0, 0.2] }], until: { clear: ['marker'] } },
    { id: 'pools', objective: 'DRAIN THE BLOOD: HOLD {use} ON A POOL', hint: 'drain', say: ['ilya|I can do this. I can do this. Nurse Reyes, can I do this?', 'reyes|Drain first. You cannot fix what you cannot see. Hold {use}.'],
      spawn: [{ k: 'pool', id: 'p1', at: [-3, 0.5], r: 1.5 }, { k: 'pool', id: 'p2', at: [2.6, -0.4], r: 1.3 }, hook('h1', [-3.4, 0.7], -70, 0.8, { hiddenBy: 'p1' }), hook('h2', [-2.3, 0.1], -100, -0.8, { hiddenBy: 'p1' }), hook('h3', [2.6, -0.1], -80, 0.8, { hiddenBy: 'p2' })],
      until: { clear: ['pool'] } },
    { id: 'hooks', objective: 'FORCEPS: BACK EACH HOOK OUT ALONG ITS ARROW', hint: 'forceps', say: ['reyes|Barbs. Back them out along the *curve*, or they take him with them.', 'reyes|Forceps. Hold {use} on the hook, follow the arrow, then let go.', 'ilya|Who does this to an arm?', 'pem|The sea, Doctor. Mostly the sea.'],
      spawn: [hook('h4', [-4.9, -0.5], -60, 0.8), hook('h5', [-4.4, 1.5], -80, -0.8), hook('h6', [-0.9, -0.9], -110, 0.8), hook('h7', [-0.2, 1.3], -70, 0.8), hook('h8', [1.2, 0.5], -90, -0.8), hook('h9', [3.9, 1.4], -100, 0.8), hook('h10', [4.6, -0.7], -60, -0.8), hook('h11', [5.3, 1.1], -120, 0.8)],
      until: { clear: ['hook'] } },
    ...closeUp({ sutures: [{ id: 'l1', at: [-4.2, 0.2], ang: 8, len: 2.6 }, { id: 'l2', at: [1.4, 0.3], ang: -10, len: 2.6 }], sutureSay: ['reyes|Two lacerations. *Suture.* Zigzag across the wound, slot by slot.', 'reyes|Hold {use} and cross the line. In rhythm. It is not a race. Yet.'], gel: { id: 'rust', at: [0, -0.2], rx: 1.8, rz: 1.1 }, gelSay: ['reyes|Rust. That hook was older than you. *Gel* it. Sweep with {use}.', 'reyes|And that is the *syringe*, {syringe}. Draw with {use}, let go in the ring.'], dressing: null }).map((st) => (st.id === 'close-gel' ? { ...st, do: [{ unlock: 'syringe' }] } : st)),
    { id: 'dress1', objective: 'DRESS IT: DRAG THE STRIP ALONG THE LINE', context: 'dressing', say: "reyes|Dress it. Hold {use}. Straight line, Doctor. You've seen a line.", spawn: [{ k: 'dressing', id: 'dress', at: [-3.2, 1.0], ang: 0, len: 2.6 }], until: { clear: ['dressing'] } },
    { id: 'twelve', objective: 'ONE MORE HOOK', hint: 'forceps', say: ['ilya|...That is eleven, right?', 'reyes|Twelve. I counted twelve.', 'pem|It was a very long net.'], do: [{ fx: 'shake' }], spawn: [{ k: 'hook', id: 'h12', at: [0.8, -1.4], dir: -100, arc: 0.9, pull: 1.4 }], until: { clear: ['hook'] } },
    { id: 'dress2', objective: 'FINISH THE DRESSING', context: 'dressing', spawn: [{ k: 'dressing', id: 'dress2', at: [-0.4, 1.0], ang: 0, len: 3.6 }], until: { clear: ['dressing'] } },
  ],
};
