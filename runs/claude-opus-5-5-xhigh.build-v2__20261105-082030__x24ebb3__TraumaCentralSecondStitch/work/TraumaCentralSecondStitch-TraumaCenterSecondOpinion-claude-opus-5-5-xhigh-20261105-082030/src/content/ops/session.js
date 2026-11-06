// Trimmed boss fights for AI Hub rounds and Consult: all tools, hints and lines on, at most four minutes.
const ALL = ['scalpel', 'forceps', 'suture', 'drain', 'syringe', 'gel', 'laser', 'scanner'];
const hook = { hook: 'THE HUB DEALT YOU THIS ONE.', followUp: { S: 'Textbook.', A: 'Very good.', B: 'They lived.', C: 'They lived. Barely.' } };

export const sessionIntroit = {
  id: 'session-introit', num: 0, title: 'INTROIT (CONSULT)', arena: 'liver', surgeon: 'ilya', gifts: ['quiet', 'look'], tools: ALL, music: 'boss-introit', session: true, consult: true,
  patient: { name: 'A HARBOUR PILOT', age: 44, job: 'SMILING', objective: 'WHEN IT KNOCKS: LANCE, GRAB, PULL. THREE TIMES.', ...hook },
  time: 225, vitals: { start: 90, drain: 0.25 }, doses: 5,
  stages: [
    { id: 'fight', objective: 'WHEN IT KNOCKS: LANCE THE PORE. FORCEPS THE CORE. PULL.', say: ['sabine|Do not answer it until you are ready.', 'reyes|Show it none, Doctors.'], spawn: [{ k: 'strain:introit', id: 'introit', hp: 3, deadFlag: 'dead' }, { k: 'pool', at: [-2.2, 0.2], r: 1, task: false }], until: { all: [{ flag: 'dead' }, { clear: ['laceration'] }] } },
    { id: 'close', objective: 'LASER THE EGGS', spawn: [[-3, -1], [0, 1.2], [3, -1]].map((at) => ({ k: 'egg', at, r: 0.38 })), until: { clear: ['egg'] } },
  ],
};
export const sessionLacrimosa = {
  id: 'session-lacrimosa', num: 0, title: 'LACRIMOSA (CONSULT)', arena: 'lung', surgeon: 'ilya', gifts: ['quiet', 'look'], tools: ALL, music: 'boss-lacrimosa', session: true, consult: true,
  patient: { name: 'A HOSPICE NURSE', age: 39, job: 'SMILING', objective: 'LASER THE EYES. DRAIN THE TEARS. HOLD THE LINE WHEN IT SOBS.', ...hook },
  time: 230, vitals: { start: 90, drain: 0.25 }, doses: 5,
  stages: [
    { id: 'fight', objective: 'LASER THE OPEN EYES. DRAIN OR GEL THE TEARS.', say: ['reyes|Eyes. Laser them when they open, Doctors!', 'sabine|Do not look at them longer than you have to.'], spawn: [{ k: 'strain:lacrimosa', id: 'lacrimosa', count: 4, eyeHp: 2, sobs: 2, deadFlag: 'dead', sobLine: 'reyes|It is going to *sob*. Gel that line!' }], until: { flag: 'dead' } },
  ],
};
export const sessionDiesIrae = {
  id: 'session-diesirae', num: 0, title: 'DIES IRAE (CONSULT)', arena: 'heart', surgeon: 'ilya', gifts: ['quiet', 'look'], tools: ALL, music: 'boss-diesirae', session: true, consult: true,
  patient: { name: 'A CHIEF OF SOMETHING', age: 70, job: 'SHOUTING', objective: 'ONLY BETWEEN THE BEATS: CUT, LIFT, BURN.', ...hook },
  time: 230, vitals: { start: 85, drain: 0.3 }, doses: 6,
  stages: [
    { id: 'fight', objective: 'ONLY BETWEEN THE BEATS: CUT, LIFT, BURN. SYRINGE SLOWS IT.', say: ['reyes|Everything on the beat. Red, you wait.', 'pem|A dose slows him, Doctors.'], spawn: [{ k: 'strain:diesirae', id: 'diesirae', cz: -0.3, rounds: [2, 2], deadFlag: 'dead', arrestLine: 'reyes|*Massage!* Left, right, on the beat!', finalLine: 'reyes|Final cut! Now!' }], until: { flag: 'dead' } },
  ],
};
