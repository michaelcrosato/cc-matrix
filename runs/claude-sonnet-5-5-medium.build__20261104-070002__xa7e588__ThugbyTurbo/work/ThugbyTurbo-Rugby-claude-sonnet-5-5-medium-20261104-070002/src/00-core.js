/* THUGBY TURBO — core.
 * THE LOOP: run at their line, pass it backwards, smash through or step round them, ground it over the line and kick
 * the conversion, while seven lunatics in the other colours try to flatten you, and the referee looks the other way. */
const TT = { cfg: { present: true }, version: '1.0.0', S: null };
window.__thugby = { TT };
const { clamp, lerp } = E;
const TAU = Math.PI * 2;
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

// ---- pitch geometry (world units; 16 = one tile; "metres" = units / 10.24)
const G = { X0: 160, X1: 1184, CX: 672, Y0: 96, Y1: 672, CY: 384, ING: 96, POST: 29, CROSS: 34, UPR: 120, MAPW: 90, MAPH: 50 };

// ---- TUNE: the balance registry. Simulation code reads TUNE.v.<key>. Dev mode edits them live.
const TUNE = {
  defs: [], v: {}, base: {}, layers: {},
  add(key, label, group, value, min, max, step, unit = '') { this.defs.push({ key, label, group, value, min, max, step, unit }); this.v[key] = value; this.base[key] = value; },
  set(key, val) { const d = this.defs.find(x => x.key === key); if (!d) return; this.base[key] = this.v[key] = clamp(val, d.min, d.max); this.applyLayers(); },
  reset(key) { if (key) { const d = this.defs.find(x => x.key === key); if (d) this.base[key] = this.v[key] = d.value; } else for (const d of this.defs) this.base[key = d.key] = this.v[d.key] = d.value; this.applyLayers(); },
  layer(name, o) { this.layers[name] = o; this.applyLayers(); },
  applyLayers() { for (const k in this.base) this.v[k] = this.base[k]; for (const n in this.layers) { const o = this.layers[n]; for (const k in o) if (k in this.v) this.v[k] = o[k](this.base[k]); } }
};
[
  ['gameSpeed', 'Game speed', 'Match', 1, .4, 1.6, .05, 'x'], ['halfLength', 'Half length', 'Match', 120, 30, 300, 10, 's'],
  ['runSpeed', 'Run speed', 'Running', 92, 60, 140, 1, 'u/s'], ['accel', 'Acceleration', 'Running', 620, 200, 1400, 10, ''], ['turboMult', 'Turbo boost', 'Running', 1.45, 1.1, 2, .01, 'x'],
  ['turboTank', 'Turbo tank', 'Running', 3, 1, 8, .1, 's'], ['sidestepPower', 'Sidestep power', 'Running', 140, 60, 260, 5, 'u/s'], ['sidestepEvade', 'Sidestep evade', 'Running', .25, .1, .6, .01, 's'],
  ['fendBeat', 'Fend strength', 'Contact', .7, .1, 1, .01, ''], ['tackleBase', 'Tackle chance', 'Contact', .78, .3, 1, .01, ''], ['tackleRange', 'Tackle reach', 'Contact', 14, 8, 30, 1, 'u'],
  ['bigHitCharge', 'Big hit charge', 'Contact', .7, .3, 1.5, .05, 's'], ['bigHitLaunch', 'Big hit launch', 'Contact', 45, 15, 120, 1, 'u'], ['spillChance', 'Ball spill', 'Contact', .5, 0, 1, .05, ''],
  ['passSpeed', 'Pass speed', 'Ball', 230, 140, 400, 5, 'u/s'], ['catchBase', 'Catch chance', 'Ball', .93, .5, 1, .01, ''], ['kickMax', 'Kick distance', 'Ball', 520, 250, 900, 10, 'u'],
  ['bounceChaos', 'Oval bounce chaos', 'Ball', 1, 0, 2, .05, 'x'], ['windMult', 'Wind effect', 'Ball', 1, 0, 3, .1, 'x'],
  ['hypeMult', 'Hype gain', 'Arcade', 1, 0, 3, .1, 'x'], ['superTime', 'Super length', 'Arcade', 4, 1, 10, .5, 's'], ['powerupEvery', 'Power-up every', 'Arcade', 30, 8, 90, 2, 's'], ['hazardEvery', 'Hazard rate', 'Arcade', 1, 0, 3, .1, 'x'],
  ['refRange', 'Referee eyesight', 'Laws', 260, 60, 600, 10, 'u'], ['refFov', 'Referee field of view', 'Laws', 1.4, .4, 3, .05, 'rad'], ['sinBin', 'Sin bin time', 'Laws', 30, 5, 60, 1, 's'],
  ['aiReaction', 'CPU reaction', 'CPU', .25, .05, .8, .01, 's'], ['cpuMash', 'CPU ruck mash', 'CPU', 9, 2, 20, .5, '/s'], ['aiAggression', 'CPU aggression', 'CPU', 1, .3, 2, .05, 'x']
].forEach(a => TUNE.add(...a));
TT.TUNE = TUNE; TT.G = G;

// ---- events
const bus = { fns: {}, on(n, f) { (this.fns[n] = this.fns[n] || []).push(f); }, emit(n, d) { if (TT.S) { const ev = TT.S.events; ev.push({ n, t: +TT.S.t.toFixed(2), d }); if (ev.length > 80) ev.shift(); TT.S.counts[n] = (TT.S.counts[n] || 0) + 1; } for (const f of this.fns[n] || []) try { f(d, n); } catch (e) { TT.game && TT.game.fail('event ' + n, e); } for (const f of this.fns['*'] || []) try { f(d, n); } catch (e) { /* ignore */ } } };
TT.bus = bus;

// ---- helpers
const pick = (rng, list) => list[Math.floor(rng() * list.length) % list.length];
const U = (rng, a, b) => a + (b - a) * rng();
TT.settings = { glyphs: 'playstation', difficulty: 'Pro', autoSwitch: 'Assisted', passAssist: true, refView: true, replays: 'Big moments', suddenDeath: true, holdTurbo: true };
