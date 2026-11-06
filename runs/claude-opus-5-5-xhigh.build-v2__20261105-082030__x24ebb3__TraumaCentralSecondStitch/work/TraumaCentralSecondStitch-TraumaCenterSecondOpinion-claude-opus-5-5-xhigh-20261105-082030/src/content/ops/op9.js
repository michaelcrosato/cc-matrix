// Libera Me. NO SIGNAL. No hint marker, no voice. Two surgeons, one bot's hand, Reyes on the table.
const cyst = (at, real) => ({ k: 'cyst', at, real, scanned: false, r: 0.42, task: real });

export default {
  id: 'op9', num: 9, title: 'LIBERA ME', arena: 'chest', surgeon: 'both', gifts: ['quiet', 'look'], tools: ['drain', 'forceps', 'suture', 'gel', 'syringe', 'scalpel', 'laser', 'scanner'], music: null, noVoice: true, noHint: true,
  scene: 'ep9', boss: 'libera', pairOp: true,
  seatDefaults: { surgeon: 'ilya', gift: 'quiet', region: 'right' },
  partner: { surgeon: 'sabine', gift: 'look', bot: { skill: 0.72, noGift: true, noDose: true }, region: 'left' },
  patient: {
    name: 'NURSE ODALYS REYES', age: 46, job: 'SCRUB NURSE, VERITY GENERAL', hook: 'SHE TOLD YOU TO START WITHOUT HER. THERE IS NOBODY IN YOUR EAR.',
    objective: 'THE MONITOR IS LYING. EVERYTHING IS LYING. WORK.',
    followUp: { S: '...Your sutures are crooked, Doctor. She has asked to see the chart. She has corrections.', A: 'She woke up and asked who was minding the instruments.', B: 'She is alive. She has told the night staff you were adequate. You cried.', C: 'She is alive. She will be in a chair for a while. She has already run it over your foot.' },
  },
  time: 540, vitals: { start: 70, drain: 0.35 }, doses: 6,
  stages: [
    { id: 'quiet0', objective: '', do: [{ fake: 99 }, { music: 'silence' }], until: { time: 1.5 } },
    { id: 'sanctus', objective: 'THE FIELD LOOKS HEALTHY. SCAN THE CYSTS. BURN THE REAL ONES.', music: 'boss-libera',
      spawn: [cyst([-4.4, -1.8], true), cyst([-2.6, 0.8], true), cyst([-1.4, -2.3], true), cyst([-0.6, 1.5], false), cyst([-3.6, 1.9], false), cyst([1.2, -2.1], true), cyst([2.2, 0.6], true), cyst([3.4, -1.2], true), cyst([4.4, 1.4], true), cyst([0.9, 0.3], false), cyst([3.2, 1.9], false), cyst([-0.5, -0.7], true)],
      until: { clear: ['cyst'] }, after: [{ fake: null }, { fx: 'shake' }, { cue: 'trueVitals' }] },
    { id: 'reprise', objective: 'THE RIGHT HALF IS YOURS. THE LEFT IS HERS. ALL THREE OF THEM AT ONCE.', music: 'boss-libera2',
      spawn: [
        { k: 'strain:introit', id: 'introit', hp: 1, deadFlag: 'r1', way: [[-5, -1.8], [-1.5, -2.6], [-1.2, 0.4], [-4.8, 1.2]] },
        { k: 'strain:lacrimosa', id: 'lacrimosa', count: 2, eyeHp: 2, deadFlag: 'r2', noSob: true, positions: [[3.2, -2.4], [4.6, 1.2]], maxOpen: 1 },
        { k: 'strain:diesirae', id: 'diesirae', cx: 2.2, cz: 0, ringR: 1.3, rounds: [3], noArrest: true, deadFlag: 'r3', flareEvery: 12, xOff: 2 },
      ],
      until: { all: [{ flag: 'r1' }, { flag: 'r2' }, { flag: 'r3' }, { clear: ['laceration'] }] } },
    { id: 'miserere', objective: 'IT COPIES YOU. KEEP MOVING. {tag} TAGS DOCTORS.', music: 'boss-libera3',
      spawn: [{ k: 'strain:miserere', id: 'miserere', deadFlag: 'mis', cx: 0, cz: -0.6 }],
      until: { flag: 'mis' } },
    { id: 'blue', objective: 'CODE BLUE. YOU KNOW WHAT TO DO.', music: 'silence', do: [{ setVitals: 4 }, { codeBlue: { need: 2, time: 14, restore: 30, then: [{ flag: 'back' }] } }], until: { flag: 'back' } },
    { id: 'silence', objective: '', music: 'silence', until: { time: 7 }, timed: [{ at: 4.5, say: 'reyes|...Your sutures are crooked, Doctor.', cue: 'reyesBack' }] },
  ],
};
