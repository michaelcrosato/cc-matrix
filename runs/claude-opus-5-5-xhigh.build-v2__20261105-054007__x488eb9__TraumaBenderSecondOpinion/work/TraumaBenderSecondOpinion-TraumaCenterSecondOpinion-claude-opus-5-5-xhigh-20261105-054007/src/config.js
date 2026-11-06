// Game-wide constants, and the TUNING table every sim number reads live (dev mode's sliders reach it).
(() => {
const G = (window.GAME ||= {});
G.GAME_TITLE = 'Trauma Bender: Second Opinion';
G.TITLE_MAIN = 'TRAUMA BENDER';
G.TITLE_SUB = 'SECOND OPINION';
G.VERSION = '1.0.0';
G.FIELD_W = 426; G.FIELD_H = 240; G.CAV = { x: 213, y: 116, rx: 171, ry: 91 };
G.SEATS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];

const D = G.TUNING_DEFAULTS = {
  // Patient
  drainX: 1, slipX: 1, healX: 1, ivDose: 18, clockX: 1,
  // Hands
  curSpeed: 330, fineK: .35, curve: 1.7, assist: .6, magnetR: 22, tolX: 1, curRamp: .06, keySpeed: 200, nudge: 40,
  // Strains
  strainSpeed: 1, strainHealth: 1, spawnRate: 1, strainDamage: 1, staccatoBeat: .75,
  // Gift
  chargeX: 1, breathDrain: 16, breathFactor: .25, lookSeconds: 6, breathCost: 35, lookCost: 45, steadyClean: 5, steadyText: 10, steadyIdle: .5,
  // Fluids
  bleedX: 1, suctionRate: 60, cauteryHeat: .5,
  // Tools: forceps
  gripR: 12, tearSpeed: 120, tearOff: 8, tearVitals: 4, tearBack: .3, dishR: 24,
  // scalpel
  cutPressR: 8, cutOff: 9, cutOffT: .12, cutSlip: 3, cutResumeR: 6, cutTb: 1.8, cutClean: 4, slashSpeed: 60, bareDrag: 6, nerveHit: 12,
  // suture
  sewPressR: 9, sewEndR: 6, sewLoose: 1, sewTb: .6, sewClean: 1.2,
  // salve
  salveBrush: 10, salveNeed: .9, salveHeal: 2,
  // syringe
  fillT: .55, doseR: 10, doseFull: .9, doseOver: .3, syrCool: .35,
  // cautery
  beam: 6, heatCool: .6, heatLock: 1.2, burnPolyp: .5, burnBleeder: .35, burnBead: .12, charT: .25, charDrain: .8, charSlip: .6,
  // suction, sonar
  suckR: 14, sonarR: 38, sonarMark: 4,
  // grading and code blue
  gradeSloppy: .4, gradeClean: 1, gradeText: 1.5, flowStep: .05, flowMax: 2, codeEvery: .9, codeOk: .14, codeGood: .06, codeRevive: 30,
};
G.TUNING = Object.assign({}, D);
G.TUNING_PAGES = [
  { name: 'Patient', rows: [['drainX', 'Drain x', 0, 3, .05], ['slipX', 'Slip damage x', 0, 3, .05], ['healX', 'Healing x', 0, 3, .05], ['ivDose', 'Syringe dose', 2, 50, 1], ['clockX', 'Clock x', .25, 3, .05]] },
  { name: 'Hands', rows: [['curSpeed', 'Cursor speed', 100, 700, 5], ['fineK', 'Fine factor', .1, 1, .01], ['curve', 'Stick curve', 1, 3, .05], ['assist', 'Assist', 0, 1, .01], ['magnetR', 'Magnet radius', 0, 60, 1], ['tolX', 'Grade tolerance x', .25, 3, .05]] },
  { name: 'Strains', rows: [['strainSpeed', 'Speed x', .25, 3, .05], ['strainHealth', 'Health x', .1, 4, .05], ['spawnRate', 'Spawn rate x', .1, 4, .05], ['strainDamage', 'Damage x', 0, 4, .05], ['staccatoBeat', 'Staccato beat', .3, 1.5, .01]] },
  { name: 'Gift', rows: [['chargeX', 'Charge x', 0, 5, .05], ['breathDrain', 'Long Breath drain', 0, 60, 1], ['breathFactor', 'Long Breath factor', .05, 1, .01], ['lookSeconds', 'Second Look seconds', 1, 6, .5]] },
  { name: 'Fluids', rows: [['bleedX', 'Bleed x', 0, 4, .05], ['suctionRate', 'Suction rate', 10, 200, 2], ['cauteryHeat', 'Cautery heat', 0, 2, .02]] },
];
G.tuningChanged = () => Object.keys(D).some(k => G.TUNING[k] !== D[k]);

// the difficulty table of section 5.10
G.DIFFS = {
  intern: { id: 'intern', label: 'Intern', drain: .7, clock: 1.3, hints: 0, assist: .2, iv: 24, code: true, star: false, line: 'Hints on, slower bleeding, more time. Nobody will know, Doctor. I will know.' },
  resident: { id: 'resident', label: 'Resident', drain: 1, clock: 1, hints: 6, assist: 0, iv: 18, code: true, star: false, line: 'As the hospital intended. Bring a spare pair of hands, if you can find one.' },
  attending: { id: 'attending', label: 'Attending', drain: 1.3, clock: .8, hints: 10, assist: 0, iv: 12, code: false, star: true, line: 'No paddles. No second chances. They do pay you more, I believe.' },
};

G.HUB_TAGS = { goal: 'Save the patient together; best hands top the board', howto: 'Aim: right stick or mouse. Use tool: R2 or click. Tools: left stick or 1-8', minutes: 5 };
})();
