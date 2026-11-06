// Consult's own op: a wave-based chest wound. Survive the clock, clear what you can, save the patient.
const SPECS = {
  hook: { k: 'hook', pull: 1.2, dir: [-120, -60], arc: 0.8, task: true },
  pool: { k: 'pool', r: [0.8, 1.3], task: true },
  bleeder: { k: 'bleeder', r: [0.6, 0.9], task: true },
  lac: { k: 'laceration', len: 2.2, ang: [-25, 25], task: true },
  polyp: { k: 'polyp', r: 0.38, task: true },
};
export default {
  id: 'pileup', num: 0, title: 'PILE-UP', arena: 'chest', surgeon: 'ilya', gifts: ['quiet', 'look'], tools: ['scalpel', 'forceps', 'suture', 'drain', 'syringe', 'gel', 'laser', 'scanner'], music: 'or-tense', session: true, consult: true, surviveClock: true,
  patient: {
    name: 'NOAH VIK', age: 34, job: 'BUS DRIVER, HARBOUR ROAD', hook: 'THE WHOLE ROAD CAME IN WITH HIM. HE IS THE ONE THEY GAVE YOU.',
    objective: 'KEEP THE PATIENT ALIVE UNTIL THE CLOCK RUNS OUT. TOP THE TEAM SCORE.',
    followUp: { S: 'He drove the bus to his own discharge.', A: 'He is sore, loud and alive.', B: 'He lives. He has opinions about the ambulance.', C: 'He lives. Somehow. Nobody will say how.' },
  },
  time: 225, vitals: { start: 90, drain: 0.16 }, doses: 6,
  stages: [
    { id: 'waves', objective: 'KEEP THE PATIENT ALIVE. EVERYTHING IS YOURS.', say: ['reyes|Harbour Road. Hooks, glass, the lot. Scrub in, all of you.', 'pem|Plenty of patient to go around.'],
      spawn: [{ k: 'pool', at: [-2.4, 0.4], r: 1.2, task: true }, { k: 'hook', at: [2, 0.6], dir: -90, arc: 0.8, pull: 1.2, task: true }],
      timed: [
        { at: 5, every: 18, scaled: true, times: 12, rand: { spec: SPECS.pool, n: 1 } },
        { at: 12, every: 16, scaled: true, times: 12, rand: { spec: SPECS.hook, n: 2 } },
        { at: 20, every: 26, scaled: true, times: 8, rand: { spec: SPECS.lac, n: 1 } },
        { at: 30, every: 20, scaled: true, times: 10, rand: { spec: SPECS.polyp, n: 2 } },
        { at: 45, every: 30, scaled: true, times: 6, rand: { spec: SPECS.bleeder, n: 2 }, say: 'reyes|Surge! Bleeders! Move, Doctors!' },
        { at: 185, spawn: [{ k: 'strain:introit', id: 'introit', hp: 1, deadFlag: 'pileIntroit' }], say: ['ilya|It... knocked. Nurse Reyes, this one *knocked*.', 'reyes|Forty seconds, Doctors. Show it none.'], music: 'boss-introit' },
      ],
      until: { flag: 'neverEnds' } },
  ],
};
