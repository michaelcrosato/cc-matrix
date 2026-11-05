// helpers shared by the suites: a Sim at a scene, steps with commands, aiming at world points
export function simAt(TC, stage, scene, o = {}) {
  const sim = new TC.Sim(Object.assign({ mode: 'stage', stages: [stage], stage, scene, skipCuts: true, seed: o.seed || 1, difficulty: 'normal' }, o));
  for (let k = 0; k < 120 * 20 && sim.phase === 'travel'; k++) sim.step(1 / 120, []);
  return sim;
}
export function run(sim, secs, cmd = {}) { const n = Math.round(secs * 120); for (let k = 0; k < n; k++) sim.step(1 / 120, typeof cmd === 'function' ? cmd(k) : [cmd]); }
export function aimAt(TC, sim, p, i = 0) { const cs = sim.camSetupFor(i), v = TC.projectVU(cs, p); return v ? [v[0], v[1]] : [0, 0]; }
// no enemies, and the area stays in ACTION (a wave that never comes keeps it from clearing)
export function clearEnemies(sim) { sim.enemies = []; sim.threats = []; sim.projectiles = []; sim.waves = [{ i: 0, id: 'hold', fired: false, at: 1e9, spawn: [] }]; }
