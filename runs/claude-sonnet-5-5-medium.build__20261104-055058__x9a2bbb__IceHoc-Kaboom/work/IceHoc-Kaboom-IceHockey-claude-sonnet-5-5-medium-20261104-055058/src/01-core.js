/* ---- util, RNG streams, event bus, tuning ---- */
const U = (() => {
  const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; };
  const segDist = (px_, py, ax, ay, bx, by) => { const vx = bx - ax, vy = by - ay, l = vx * vx + vy * vy || 1, u = clamp(((px_ - ax) * vx + (py - ay) * vy) / l, 0, 1); return Math.hypot(ax + vx * u - px_, ay + vy * u - py); };
  const sanitize = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, '?').slice(0, 14);
  const mmss = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const hash = (a, b) => E.hash2(a | 0, b | 0);
  return { angDiff, segDist, sanitize, mmss, hash, dist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y) };
})();
const RNG = { sim: E.rng(1), fx: E.rng(7), seed: 1,
  setSeed(n) { this.seed = n >>> 0; this.sim = E.rng(this.seed); } };
const Bus = (() => {
  const L = {}; let log = [];
  return { on(t, f) { (L[t] = L[t] || []).push(f); return () => { L[t] = L[t].filter(x => x !== f); }; },
    emit(type, d = {}) { d.type = type; log.push(d); if (log.length > 400) log.shift(); for (const f of (L[type] || [])) f(d); for (const f of (L['*'] || [])) f(d); },
    clear() { for (const k in L) delete L[k]; }, log: () => log, reset() { log = []; } };
})();
// every tunable number: [key, default, min, max, step, group, label]
const TUNE = [
  ['skateMax', 132, 80, 200, 2, 'Skating', 'Top speed'], ['skateAccel', 300, 120, 600, 10, 'Skating', 'Acceleration'], ['iceGlide', 28, 0, 120, 2, 'Skating', 'Glide drag'],
  ['turnSlow', 5, 1, 10, .2, 'Skating', 'Turn rate slow'], ['turnFast', 2.6, 1, 10, .2, 'Skating', 'Turn rate fast'], ['stopDecel', 700, 300, 1400, 20, 'Skating', 'Hockey stop'],
  ['turboMul', 1.45, 1, 2, .05, 'Skating', 'Turbo factor'], ['turboDrain', .45, 0, 2, .05, 'Skating', 'Turbo drain'], ['turboRegen', .18, 0, 2, .02, 'Skating', 'Turbo regen'],
  ['puckFriction', 26, 0, 80, 1, 'Puck & Passing', 'Puck friction'], ['puckDrag', .12, 0, .5, .01, 'Puck & Passing', 'Puck drag'], ['boardBounce', .62, .2, 1, .02, 'Puck & Passing', 'Boards bounce'],
  ['pickupRadius', 8, 4, 16, .5, 'Puck & Passing', 'Pickup radius'], ['passMin', 240, 150, 600, 10, 'Puck & Passing', 'Pass speed min'], ['passMax', 420, 150, 600, 10, 'Puck & Passing', 'Pass speed max'],
  ['saucerApex', 10, 4, 24, 1, 'Puck & Passing', 'Saucer height'],
  ['wristSpeed', 350, 200, 500, 10, 'Shooting', 'Wrist shot'], ['slapBase', 380, 250, 560, 10, 'Shooting', 'Slapshot base'], ['slapGain', 160, 0, 300, 10, 'Shooting', 'Slapshot gain'],
  ['slapCharge', .9, .3, 2, .05, 'Shooting', 'Slap charge time'], ['oneTimerBonus', 1.15, 1, 1.5, .05, 'Shooting', 'One-timer bonus'],
  ['goalieLateral', 140, 80, 300, 5, 'Goalies', 'Goalie lateral speed'], ['goalieReact', .25, .02, .4, .01, 'Goalies', 'Goalie reaction'], ['gloveCatch', .55, 0, 1, .05, 'Goalies', 'Glove catch'], ['kaboomBlast', .6, 0, 1, .05, 'Goalies', 'Kaboom blast carry'],
  ['checkPower', 1, .3, 2.5, .05, 'Hitting', 'Check power'], ['knockdown', 210, 80, 300, 5, 'Hitting', 'Big-hit threshold'], ['glassCrack', 170, 80, 300, 5, 'Hitting', 'Glass crack speed'], ['glassShatter', 240, 120, 400, 5, 'Hitting', 'Glass shatter speed'], ['accidentalHit', 180, 100, 300, 5, 'Hitting', 'Accidental hit speed'],
  ['aiSkillMul', 1, .3, 1.4, .05, 'AI', 'CPU skill ×'], ['aiItemGreed', 120, 0, 240, 10, 'AI', 'Item greed range'], ['aiAggro', .5, 0, 1, .05, 'AI', 'Aggression'],
  ['boomGain', 1, .2, 3, .1, 'BOOM & Items', 'BOOM gain'], ['kaboomTime', 15, 5, 40, 1, 'BOOM & Items', 'KABOOM seconds'], ['itemEvery', 35, 8, 90, 1, 'BOOM & Items', 'Fan throw every (s)'],
  ['fightBalance', 100, 40, 200, 5, 'Fights', 'Fight balance'], ['sinBin', 20, 5, 60, 1, 'Fights', 'Sin bin seconds'], ['fightMax', 3, 0, 8, 1, 'Fights', 'Fights per game'],
  ['periodLen', 90, 20, 300, 5, 'Match', 'Period seconds (dev)'], ['gameSpeed', 1, .25, 1.5, .05, 'Match', 'Game speed']
];
const T = (() => {
  const T = {}, defs = {}, store = E.store;
  for (const [k, d, mn, mx, st, g, l] of TUNE) { T[k] = d; defs[k] = { k, d, min: mn, max: mx, step: st, group: g, label: l }; }
  let saved = {}; try { saved = HUB ? {} : (store.get('ihk:tuning', {}) || {}); } catch (e) { saved = {}; }
  for (const k in saved) if (defs[k] && k !== 'periodLen') T[k] = saved[k];
  Object.defineProperty(T, '_defs', { value: defs, enumerable: false });
  Object.defineProperty(T, 'save', { enumerable: false, value() { const o = {}; for (const k in defs) if (T[k] !== defs[k].d) o[k] = T[k]; if (!HUB) try { store.set('ihk:tuning', o); } catch (e) {} } });
  Object.defineProperty(T, 'reset', { enumerable: false, value(k) { T[k] = defs[k].d; T.save(); } });
  Object.defineProperty(T, 'resetAll', { enumerable: false, value() { for (const k in defs) T[k] = defs[k].d; T.save(); } });
  Object.defineProperty(T, 'nonDefault', { enumerable: false, value() { const o = {}; for (const k in defs) if (T[k] !== defs[k].d) o[k] = T[k]; return o; } });
  return T;
})();
