/* Astro Battle Jam — authored data. No runtime dependencies beyond the native engine. */
(function (root) {
  'use strict';
  const A = root.ABJ = root.ABJ || {};
  A.TITLE = 'Astro Battle Jam';
  A.STEP = 1 / 120;
  A.FIELD = Object.freeze({ w: 480, h: 270, left: 22, right: 458, breach: 218, shipY: 246, bunkerY: 200, cell: 3, cols: 16, rows: 8 });
  A.LOCATIONS = [
    { name: 'JADE COAST', alert: 'THE SKY HAS TERRIBLE MANNERS.', sky: ['#090f29', '#17334a', '#28555e'], rock: '#244151', trim: '#56dec0', brick: '#63baad', planet: '#4f90a6' },
    { name: 'AMBER RELAY', alert: 'KEEP THE SIGNAL. KEEP THE PLANET.', sky: ['#1b1234', '#51304d', '#ad6255'], rock: '#56374d', trim: '#ffc573', brick: '#d5a36c', planet: '#c47c9a' },
    { name: 'VIOLET CROWN', alert: 'LAST LINE. LOUD RESPONSE.', sky: ['#110c31', '#302760', '#675383'], rock: '#383052', trim: '#c9a5ff', brick: '#a48ed4', planet: '#b194dc' }
  ];
  A.TUNING = {
    playerSpeed: { label: 'Cannon speed', min: 60, max: 220, step: 5, value: 132, help: 'Horizontal units per second; live.' },
    recovery: { label: 'Shot recovery', min: .15, max: .8, step: .05, value: .38, help: 'Seconds between launches; two missiles max.' },
    march: { label: 'March interval', min: .18, max: 1.3, step: .02, value: .67, help: 'Base seconds per formation step; live.' },
    descent: { label: 'Edge descent', min: 1, max: 9, step: .5, value: 4, help: 'Units descended at the next reversal.' },
    fireInterval: { label: 'Enemy fire interval', min: .5, max: 4, step: .1, value: 1.7, help: 'Seconds between bounded attack orders.' },
    shotSpeed: { label: 'Missile speed', min: 120, max: 420, step: 10, value: 230, help: 'Upward speed; applies to new missiles.' },
    bombSpeed: { label: 'Bomb speed', min: 25, max: 130, step: 5, value: 52, help: 'Falling speed; applies to new bombs.' },
    salvageEvery: { label: 'Salvage cadence', min: 2, max: 8, step: 1, value: 4, help: 'One guaranteed pickup per this many kills.' },
    repairYield: { label: 'Repair yield', min: 8, max: 80, step: 4, value: 40, help: 'Maximum missing bunker cells per charge.' },
    bossHealth: { label: 'Flagship core', min: 8, max: 60, step: 2, value: 26, help: 'Core hit points; next flagship spawn.' }
  };
  A.DIFFICULTIES = [
    { name: 'NOVICE', text: 'A patient sky. Every enemy and both flagship phases.', overrides: { march: .85, descent: 3, fireInterval: 2.3, bombSpeed: 42, bossHealth: 22 } },
    { name: 'STANDARD', text: 'The full defense. A good place to make a stand.', overrides: {} },
    { name: 'VETERAN', text: 'Faster feet. Less time to choose your next lane.', overrides: { march: .56, descent: 4.5, fireInterval: 1.35, bombSpeed: 64, bossHealth: 30 } },
    { name: 'COSMIC', text: 'The invaders took this personally.', overrides: { march: .46, descent: 5, fireInterval: 1.1, bombSpeed: 74, bossHealth: 34 } }
  ];
  A.defaults = difficulty => Object.fromEntries(Object.entries(A.TUNING).map(([k, v]) => [k, A.DIFFICULTIES[difficulty || 0].overrides[k] ?? v.value]));
  A.WAVES = [
    { name: 'UNINVITED GUESTS', rows: ['oooooooo', 'oooooooo', 'oooooooo', 'oooooooo'], y: 58, pace: 1, fire: 1.35, volley: 1, saucer: 19, intro: 'HOLD FIRE TO CUT A LANE. CATCH GOLD SALVAGE.' },
    { name: 'COVER CHARGE', rows: ['oooooooo', 'oo.oo.oo', 'oooooooo', 'oooooooo'], y: 62, pace: .94, fire: 1.1, volley: 1, saucer: 7, intro: 'SAUCER INBOUND. A RISK WORTH TAKING?' },
    { name: 'SHELL SHOCK', rows: ['oAoAAoAo', 'oooooooo', '.oooooo.', 'oooAAooo'], y: 64, pace: .92, fire: 1.05, volley: 1, saucer: 14, intro: 'BLUE SHELLS TAKE TWO HITS. KEEP FIRING.' },
    { name: 'HEAVY WEATHER', rows: ['oAoAAoAo', '.B.oo.B.', 'ooBooBoo', 'oooooooo'], y: 66, pace: .87, fire: .95, volley: 2, saucer: 11, intro: 'ORANGE BELLIES WIND UP. REPAIR BEFORE IMPACT.' },
    { name: 'RUDE AWAKENING', rows: ['AAo..oAA', 'oBooooBo', 'A.oAAo.A', '.Bo..oB.'], y: 70, pace: .82, fire: .86, volley: 2, saucer: 9, intro: 'BARRAGE. BREATH. REBUILD. REPEAT.' },
    { name: 'THE LAST LAUGH', rows: ['AABooBAA', 'oAoBBoAo', 'BoA..AoB', '.ooAAoo.'], y: 72, pace: .77, fire: .8, volley: 2, saucer: 8, intro: 'SIXTH FORMATION. MAKE EVERY BRICK COUNT.' }
  ];
  A.validateContent = () => {
    const bad = [];
    A.WAVES.forEach((w, i) => {
      if (w.rows.length !== 4 || w.rows.some(r => r.length !== 8 || /[^oAB.]/.test(r))) bad.push('Formation ' + (i + 1) + ' needs four eight-column rows of o/A/B/.');
      if (!(w.y > 40 && w.y + 66 < A.FIELD.breach && w.fire > 0 && w.pace > 0)) bad.push('Formation ' + (i + 1) + ' has unsafe bounds or cadence.');
    });
    for (const [k, d] of Object.entries(A.TUNING)) if (!(d.min <= d.value && d.value <= d.max && d.step > 0)) bad.push('Invalid tuning bounds: ' + k);
    if (bad.length) throw new Error(bad.join('\n'));
    return true;
  };
  A.validateContent();
})(typeof globalThis !== 'undefined' ? globalThis : window);
