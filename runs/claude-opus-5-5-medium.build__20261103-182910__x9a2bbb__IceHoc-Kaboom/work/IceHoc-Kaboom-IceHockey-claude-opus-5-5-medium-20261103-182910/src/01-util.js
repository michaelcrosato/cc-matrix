/* ---- U: math helpers, the random streams, the name sanitizer ---- */
const U = (() => {
  const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; };
  const approachAng = (a, b, step) => { const d = angDiff(b, a); return Math.abs(d) <= step ? b : a + Math.sign(d) * step; };
  const segDist = (px0, py0, ax, ay, bx, by) => { const vx = bx - ax, vy = by - ay, l = vx * vx + vy * vy || 1, u = clamp(((px0 - ax) * vx + (py0 - ay) * vy) / l, 0, 1); return Math.hypot(ax + vx * u - px0, ay + vy * u - py0); };
  const gauss = rnd => { let u = 0, v = 0; while (u === 0) u = rnd(); v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };
  const sanitize = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, '?').slice(0, 16);
  const mmss = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const pick = (rnd, list) => list[Math.floor(rnd() * list.length) % list.length];
  const fill = (str, vars) => String(str).replace(/\{(\w+)\}/g, (m, k) => vars && vars[k] !== undefined ? vars[k] : m);
  const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  return { angDiff, approachAng, segDist, gauss, sanitize, mmss, pick, fill, hashStr };
})();
/* RNG: the simulation draws only from RNG.sim (seeded per match); effects, crowd and commentary from RNG.fx */
const RNG = { sim: E.rng(1), fx: E.rng(99), seed: 1, reseed(n) { this.seed = n >>> 0; this.sim = E.rng(this.seed || 1); } };

/* ---- Bus: simulation events, heard by stats, objectives, Talk, Fx, Crowd, Net and Replay ---- */
const Bus = (() => {
  const subs = {}, log = [];
  let id = 0;
  return {
    log,
    on(type, fn) { (subs[type] || (subs[type] = [])).push(fn); },
    emit(type, data = {}) {
      const ev = Object.assign({ type, id: ++id, t: game.time }, data);
      log.push(ev); if (log.length > 400) log.shift();
      for (const fn of (subs[type] || [])) { try { fn(ev); } catch (e) { game.fail('event ' + type, e); } }
      for (const fn of (subs['*'] || [])) { try { fn(ev); } catch (e) { game.fail('event *', e); } }
      return ev;
    },
    seen(type) { return log.some(e => e.type === type); },
    clear() { log.length = 0; }
  };
})();

/* ---- T: every tunable number (PLAN Appendix A): defaults, live values, slider metadata; persisted for designers ---- */
const T = (() => {
  const ROWS = [
    ['Skating', 'skateMax', 132, 80, 200, 1, 'Top speed'], ['Skating', 'skateAccel', 300, 120, 600, 10, 'Acceleration'], ['Skating', 'iceGlide', 28, 0, 120, 1, 'Coasting drag'],
    ['Skating', 'turnSlow', 5, 1, 10, .1, 'Turn rate (slow)'], ['Skating', 'turnFast', 2.6, 1, 10, .1, 'Turn rate (fast)'], ['Skating', 'edgeGrip', 6, 1, 20, .5, 'Edge grip'],
    ['Skating', 'stopDecel', 700, 300, 1400, 10, 'Hockey-stop braking'], ['Skating', 'turboMul', 1.45, 1, 2, .05, 'Turbo speed'],
    ['Skating', 'turboDrain', .45, 0, 2, .05, 'Turbo drain /s'], ['Skating', 'turboRegen', .18, 0, 2, .02, 'Turbo regen /s'],
    ['Puck & Passing', 'puckFriction', 26, 0, 80, 1, 'Puck friction'], ['Puck & Passing', 'puckDrag', .12, 0, .5, .01, 'Puck drag'],
    ['Puck & Passing', 'boardBounce', .62, .2, 1, .02, 'Boards bounce'], ['Puck & Passing', 'pickupRadius', 8, 4, 16, .5, 'Pickup radius'],
    ['Puck & Passing', 'passMin', 240, 150, 600, 10, 'Pass speed min'], ['Puck & Passing', 'passMax', 420, 150, 600, 10, 'Pass speed max'], ['Puck & Passing', 'saucerApex', 10, 4, 24, 1, 'Saucer height'],
    ['Shooting', 'wristSpeed', 330, 200, 500, 5, 'Wrist shot speed'], ['Shooting', 'slapBase', 380, 200, 600, 5, 'Slapshot base'], ['Shooting', 'slapGain', 160, 0, 400, 5, 'Slapshot charge gain'],
    ['Shooting', 'slapCharge', .9, .3, 2, .05, 'Slapshot charge time'], ['Shooting', 'oneTimerBonus', 1.15, 1, 1.6, .05, 'One-timer bonus'], ['Shooting', 'shotError', 1, 0, 3, .05, 'Shot error scale'],
    ['Goalies', 'goalieReact', .18, .05, .4, .01, 'Reaction time'], ['Goalies', 'goalieLateral', 150, 60, 300, 5, 'Lateral speed'], ['Goalies', 'goalieReach', 1, .6, 1.6, .02, 'Save reach'],
    ['Goalies', 'goalieRead', 1, 0, 4, .05, 'Read error scale'], ['Goalies', 'gloveCatch', .55, 0, 1, .05, 'Glove freeze chance'], ['Goalies', 'reboundSpeed', .35, 0, .8, .02, 'Rebound factor'], ['Goalies', 'kaboomBlast', .6, 0, 1, .05, 'KABOOM blast-through'],
    ['Hitting', 'checkPower', 1, .3, 3, .05, 'Check power'], ['Hitting', 'knockdown', 150, 60, 300, 5, 'Big-hit threshold'], ['Hitting', 'glassCrack', 170, 80, 400, 5, 'Glass crack speed'],
    ['Hitting', 'glassShatter', 240, 80, 400, 5, 'Glass shatter speed'], ['Hitting', 'accidentalHit', 180, 80, 400, 5, 'Knockdown without a check'],
    ['AI', 'aiSkillHome', -1, -1, 1, .05, 'AI skill home (-1 = by difficulty)'], ['AI', 'aiSkillAway', -1, -1, 1, .05, 'AI skill away (-1 = by difficulty)'],
    ['AI', 'aiAggression', .5, 0, 1, .05, 'AI aggression'], ['AI', 'aiItemGreed', 120, 0, 300, 5, 'AI item detour range'], ['AI', 'aiShootRange', 200, 80, 400, 5, 'AI shooting range'],
    ['BOOM & Items', 'boomGain', .4, 0, 4, .05, 'BOOM gain'], ['BOOM & Items', 'kaboomTime', 15, 5, 40, 1, 'KABOOM seconds'], ['BOOM & Items', 'itemEvery', 35, 8, 120, 1, 'Seconds between fan throws'],
    ['Fights', 'fightBalance', 100, 40, 200, 5, 'Fighter balance'], ['Fights', 'fightGrudge', 40, 0, 100, 1, 'Grudge to drop gloves'], ['Fights', 'fightMax', 3, 0, 10, 1, 'Fights per game'], ['Fights', 'sinBin', 20, 5, 60, 1, 'Sin bin seconds'],
    ['Match', 'periodLen', 120, 30, 300, 5, 'Exhibition period (s)'], ['Match', 'gameSpeed', 1, .25, 2, .05, 'Game speed'], ['Match', 'crowdHype', 1, 0, 2, .05, 'Crowd reaction']
  ];
  const T = {}, META = {}, DEF = {};
  for (const [group, key, def, min, max, step, label] of ROWS) { T[key] = def; DEF[key] = def; META[key] = { group, key, def, min, max, step, label }; }
  const saved = !HUB && E.store.get('dev:tuning', null);
  if (saved) for (const k in saved) if (k in DEF && typeof saved[k] === 'number') T[k] = clamp(saved[k], META[k].min, META[k].max);
  const persist = () => { if (HUB) return; const o = {}; for (const k in DEF) if (T[k] !== DEF[k]) o[k] = T[k]; E.store.set('dev:tuning', o); };
  Object.defineProperties(T, {
    META: { value: META }, DEF: { value: DEF }, ROWS: { value: ROWS },
    set: { value(k, v) { const m = META[k]; if (!m) return; T[k] = clamp(Math.round(v / m.step) * m.step, m.min, m.max); T[k] = +T[k].toFixed(4); persist(); } },
    reset: { value(k) { T[k] = DEF[k]; persist(); } },
    resetAll: { value() { for (const k in DEF) T[k] = DEF[k]; persist(); } },
    changed: { value() { const o = {}; for (const k in DEF) if (T[k] !== DEF[k]) o[k] = T[k]; return o; } }
  });
  return T;
})();
