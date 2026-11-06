(() => {
const G = (window.GAME ||= {});
G.GAME_TITLE = 'Sutures & Sorrows';
G.VERSION = '1.0.0';
G.FILE_STEM = 'SuturesAndSorrows-TraumaCenterSecondOpinion-claude-sonnet-5-5-medium-20261105-062952';
// Every balance number lives here, read live (dev mode sliders write to G.TUNING).
G.DEFAULTS = {
  drain: 1, slip: 1, heal: 1, syringe: 18, clock: 1,
  cursorSpeed: 330, fine: .35, curve: 1.7, assist: .6, magnet: 22, tol: 1,
  strainSpeed: 1, strainHealth: 1, spawn: 1, strainDmg: 1, staccatoBeat: .5,
  steadyGain: 1, lbDrain: 16, lbFactor: .25, slSeconds: 6,
  bleed: 1, suction: 60, heat: .5,
};
G.TUNING = { ...G.DEFAULTS };
G.TUNING_INFO = [ // [key, label, min, max, step, page]
  ['drain', 'Drain x', .2, 3, .05, 'Patient'], ['slip', 'Slip damage x', 0, 3, .05, 'Patient'], ['heal', 'Healing x', .2, 3, .05, 'Patient'], ['syringe', 'Syringe dose', 4, 40, 1, 'Patient'], ['clock', 'Clock x', .3, 3, .05, 'Patient'],
  ['cursorSpeed', 'Cursor speed', 120, 600, 10, 'Hands'], ['fine', 'Fine factor', .1, 1, .05, 'Hands'], ['curve', 'Stick curve', 1, 3, .1, 'Hands'], ['assist', 'Assist', 0, 1, .05, 'Hands'], ['magnet', 'Magnet radius', 0, 50, 1, 'Hands'], ['tol', 'Grade tolerance x', .5, 2.5, .05, 'Hands'],
  ['strainSpeed', 'Strain speed x', .3, 3, .05, 'Strains'], ['strainHealth', 'Strain health x', .3, 3, .05, 'Strains'], ['spawn', 'Spawn rate x', .3, 3, .05, 'Strains'], ['strainDmg', 'Strain damage x', 0, 3, .05, 'Strains'], ['staccatoBeat', 'Staccato beat s', .2, 1.2, .02, 'Strains'],
  ['steadyGain', 'Charge x', 0, 4, .1, 'Gift'], ['lbDrain', 'Long Breath drain', 2, 40, 1, 'Gift'], ['lbFactor', 'Long Breath speed', .05, .8, .01, 'Gift'], ['slSeconds', 'Second Look sec', 1, 6, .5, 'Gift'],
  ['bleed', 'Bleed x', 0, 3, .05, 'Fluids'], ['suction', 'Suction rate', 15, 200, 5, 'Fluids'], ['heat', 'Cautery heat', .1, 2, .05, 'Fluids'],
];
G.T = k => G.TUNING[k];
G.HUB_TAGS = { goal: 'Save the patient together; best hands top the board', howto: 'Aim: right stick or mouse. Use tool: R2 or click. Tools: left stick or 1-8' };
})();
