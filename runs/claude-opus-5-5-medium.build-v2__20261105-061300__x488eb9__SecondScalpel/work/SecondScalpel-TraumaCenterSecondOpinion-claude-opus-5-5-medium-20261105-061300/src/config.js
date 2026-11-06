// Game-wide constants and the TUNING table: every balance number lives here and is read live, so dev mode's sliders reach it.
(() => {
const G = (window.GAME ||= {});
G.SCENES = G.SCENES || {};
G.GAME_TITLE = 'Second Scalpel';
G.VERSION = '1.0.0';
G.TAGLINE = "Don't let it go quiet";
G.W0 = 426; G.H0 = 240;
G.CAV = { x: 213, y: 116, rx: 171, ry: 91 };
G.TOOLS = ['forceps', 'scalpel', 'suture', 'salve', 'syringe', 'cautery', 'suction', 'sonar'];   // clockwise from north, the wheel's order
G.TOOL_NAMES = { forceps: 'Forceps', scalpel: 'Scalpel', suture: 'Suture', salve: 'Salve', syringe: 'Syringe', cautery: 'Cautery', suction: 'Suction', sonar: 'Sonar' };
G.SEATS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
G.DIFFS = {
  intern: { name: 'Intern', drain: .7, clock: 1.3, hints: 0, assist: .2, iv: 24, codeBlue: true, star: false },
  resident: { name: 'Resident', drain: 1, clock: 1, hints: 6, assist: 0, iv: 18, codeBlue: true, star: false },
  attending: { name: 'Attending', drain: 1.3, clock: .8, hints: 10, assist: 0, iv: 12, codeBlue: false, star: true },
};
G.DIFF_ORDER = ['intern', 'resident', 'attending'];
const defs = [
  ['Patient', [['drainX', 'Drain x', 1, 0, 3, .05], ['slipX', 'Slip damage x', 1, 0, 3, .05], ['healX', 'Healing x', 1, 0, 3, .05], ['syringeDose', 'Syringe dose x', 1, 0, 3, .05], ['clockX', 'Clock x', 1, .25, 3, .05]]],
  ['Hands', [['cursorSpeed', 'Cursor speed', 330, 100, 700, 10], ['fineFactor', 'Fine factor', .35, .1, 1, .01], ['stickCurve', 'Stick curve', 1.7, 1, 3, .05], ['assist', 'Assist', .6, 0, 1, .05], ['magnetR', 'Magnet radius', 22, 0, 50, 1], ['gradeTol', 'Grade tolerance x', 1, .25, 3, .05]]],
  ['Strains', [['strainSpeed', 'Speed x', 1, .25, 3, .05], ['strainHealth', 'Health x', 1, .25, 3, .05], ['spawnRate', 'Spawn rate x', 1, .25, 3, .05], ['strainDamage', 'Damage x', 1, 0, 3, .05], ['staccatoBeat', 'Staccato beat s', .8, .3, 1.5, .05]]],
  ['Gift', [['chargeX', 'Charge x', 1, 0, 5, .1], ['breathDrain', 'Long Breath drain', 16, 2, 40, 1], ['breathFactor', 'Long Breath time', .25, .05, 1, .01], ['lookSeconds', 'Second Look seconds', 6, 2, 8, .5]]],
  ['Fluids', [['bleedX', 'Bleed x', 1, 0, 3, .05], ['suctionRate', 'Suction rate', 60, 10, 200, 5], ['cauteryHeat', 'Cautery heat', .5, .1, 2, .05]]],
];
G.TUNING_PAGES = defs.map(([name, rows]) => ({ name, rows: rows.map(([key, label, v, min, max, step]) => ({ key, label, v, min, max, step })) }));
G.TUNING = {}; for (const p of G.TUNING_PAGES) for (const r of p.rows) G.TUNING[r.key] = r.v;
G.T = Object.assign({}, G.TUNING);   // the live values
G.tuningChanged = () => { for (const k in G.TUNING) if (G.T[k] !== G.TUNING[k]) return true; return false; };
// Hub tag text, baked into the page's head by tools/build.mjs (kept equal by a test)
G.HUB_GOAL = 'Save the patient together; best hands top the board';
G.HUB_HOWTO = 'Aim: right stick or mouse. Use tool: R2 or click. Tools: left stick or 1-8';
// The dev cheats, read by the sim (never in a Hub session)
G.CHEATS = { lockVitals: false, freezeClock: false, infiniteSteady: false, oneHit: false, reveal: false, radii: false, auto: false };
G.cheating = () => Object.values(G.CHEATS).some(Boolean);
})();
