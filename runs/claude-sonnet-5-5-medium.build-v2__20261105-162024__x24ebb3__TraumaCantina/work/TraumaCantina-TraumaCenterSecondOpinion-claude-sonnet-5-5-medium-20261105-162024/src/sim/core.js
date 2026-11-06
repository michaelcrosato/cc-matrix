// Shared sim helpers. Sim state is plain data (structuredClone-safe).
import { cfg } from '../core/config.js';
import { rnd, rr } from '../core/rng.js';
export { rnd, rr };
export const ev = (sim, e, o = {}) => { sim.events.push({ e, t: sim.t, ...o }); };
export const byId = (sim, id) => sim.ents.find((x) => x.id === id);
export const ofKind = (sim, k, tb) => sim.ents.filter((x) => x.k === k && (tb === undefined || x.tb === tb));
export const nextId = (sim, p = 'e') => `${p}${++sim.nid}`;
export const hooks = { init: null };
import { pathLen } from './geom.js';
export function normalizeEnt(o, tb = 0) {
  const e = { ...o }; if (e.at) { [e.x, e.z] = e.at; delete e.at; }
  e.tb ??= tb;
  switch (e.k) {
    case 'hook': if (e.ox === undefined) { e.a ??= 0; e.pull ??= 1.2; e.ox = e.x; e.oz = e.z; e.p = 0; } break;
    case 'cut': e.s ??= 0; e.L ??= pathLen(e.path); e.x ??= e.path[0][0]; e.z ??= e.path[0][1]; break;
    case 'dress': e.s = 0; e.L = pathLen(e.path); e.x = e.path[0][0]; e.z = e.path[0][1]; break;
    case 'lac': e.tied ??= 0; e.a ??= 0; e.len ??= 1.2; e.n ??= Math.max(1, Math.round(e.len / 0.45) + 1); break;
    case 'drag': e.x0 = e.x; e.z0 = e.z; e.rot ??= 0; break;
    case 'pool': e.r ??= 1; break;
    case 'polyp': case 'egg': case 'cyst': case 'eyeT': e.r ??= 0.4; e.heat ??= 0; break;
    case 'marker': e.r ??= 0.5; break;
    case 'nick': e.t ??= 0; break;
  }
  return e;
}
export function spawn(sim, o, tb = 0) {
  const e = normalizeEnt({ id: o.id ?? nextId(sim), hid: null, ...o }, o.tb ?? tb);
  if (e.hiddenBy) { e.hid = 'p:' + e.hiddenBy; delete e.hiddenBy; }
  sim.ents.push(e);
  ev(sim, 'spawn', { id: e.id, k: e.k });
  if (e.k === 'strain') hooks.init?.(sim, e);
  if (e.k === 'mask') e.t0 = sim.t;
  return e;
}
export function remove(sim, id) {
  const i = sim.ents.findIndex((x) => x.id === id);
  if (i >= 0) { const e = sim.ents[i]; sim.ents.splice(i, 1); sim.flags['done:' + id] = true; for (const s of sim.seats) { if (s.grab === id) s.grab = null; if (s.cut === id) s.cut = null; if (s.lacId === id) s.lacId = null; } if (e.then) runCmds(sim, e.then, e); }
}
export const active = (sim, e) => !e.hid && (!e.needs || sim.flags['done:' + e.needs] || sim.flags[e.needs]) && !e.dead;
export const bleeders = (sim, tb) => sim.ents.reduce((n, e) => n + (e.tb === tb && (e.k === 'pool' || e.k === 'nick' || (e.k === 'lac' && e.urgent && e.tied < e.n)) ? 1 : 0), 0);
export function done(sim, e, grade) { sim.flags['done:' + e.id] = true; if (e.then) runCmds(sim, e.then, e); }

export function addVitals(sim, tb, d) { const t = sim.tables[tb]; if (t) t.vitals = Math.max(0, Math.min(99, t.vitals + d)); }
const PTS = { clean: 100, good: 60, sloppy: 20 };
export function rate(sim, seat, grade, x, z, extra = {}) {
  const sc = sim.score, ps = (sc.per[seat.id] ??= { pts: 0, clean: 0, good: 0, sloppy: 0, mistakes: 0, stitches: 0, bestStreak: 0 });
  if (grade === 'mistake') {
    sc.pts -= 150; ps.pts -= 150; sc.mistakes++; ps.mistakes++; sc.streak = 0; addVitals(sim, seat.tb ?? 0, -cfg.mistakePenalty);
    ev(sim, 'rate', { g: 'mistake', x, z, tb: seat.tb, seat: seat.id, ...extra });
    return;
  }
  const mult = Math.min(2, 1 + 0.1 * sc.streak);
  const pts = Math.round(PTS[grade] * mult);
  sc.pts += pts; ps.pts += pts; sc[grade]++; ps[grade]++;
  if (grade === 'clean') { sc.streak++; sc.maxStreak = Math.max(sc.maxStreak, sc.streak); ps.bestStreak = Math.max(ps.bestStreak, sc.streak); sim.composure = Math.min(100, sim.composure + cfg.composureGain); } else sc.streak = 0;
  ev(sim, 'rate', { g: grade, x, z, tb: seat.tb, seat: seat.id, pts, streak: sc.streak, ...extra });
}
export function nick(sim, x, z, tb) { return spawn(sim, { k: 'nick', x, z, tb, t: 0 }); }
export function pool(sim, x, z, r, tb) { return spawn(sim, { k: 'pool', x, z, r, tb }); }

export function runCmds(sim, cmds, src) {
  for (const c of [].concat(cmds)) {
    if (c.say) ev(sim, 'say', { key: c.say, who: c.who });
    if (c.spawn) for (const o of c.spawn) spawn(sim, structuredClone(o));
    if (c.remove) for (const id of c.remove) remove(sim, id);
    if (c.unlock) { if (!sim.unlocked.includes(c.unlock)) sim.unlocked.push(c.unlock); ev(sim, 'unlock', { tool: c.unlock }); }
    if (c.setDrain !== undefined) for (const t of sim.tables) t.drain = c.setDrain;
    if (c.music) ev(sim, 'music', { id: c.music });
    if (c.camera) ev(sim, 'camera', { v: c.camera });
    if (c.flag) sim.flags[c.flag] = true;
    if (c.codeBlue) { sim.tables[c.tb ?? 0].vitals = 0; startCodeBlue(sim, true); }
    if (c.setVitals !== undefined) sim.tables[c.tb ?? 0].vitals = c.setVitals;
    if (c.composure !== undefined) sim.composure = c.composure;
    if (c.clotBurst) { if (!sim.lookUsed) { ev(sim, 'say', { key: 'sabine.again' }); ev(sim, 'prompt', { gift: true }); sim.tables[0].vitals = Math.min(sim.tables[0].vitals, 28); for (let i = 0; i < 2; i++) spawn(sim, { k: 'lac', urgent: true, x: -1.2 + i * 2.4, z: -0.4, a: 0.1, len: 0.9, n: 3, tied: 0, tb: 0 }); ev(sim, 'burst', { n: 'clot' }); } }
    if (c.tagOK) sim.flags.tagOK = true;
    if (c.vitals) addVitals(sim, c.tb ?? 0, c.vitals);
    if (c.cold) { sim.cold = c.cold; sim.coldMax = c.cold; }
    if (c.burst) ev(sim, 'burst', { ...c.burst });
    if (c.awaken) { sim.awakened = true; sim.giftsOn.quiet = true; sim.composureShown = true; ev(sim, 'awaken'); }
    if (c.cut) ev(sim, 'cutscene', { v: c.cut });
    if (c.clot) { sim.clot = true; }
  }
}
export function startCodeBlue(sim, scripted = false) {
  const cb = (sim.cb = { scripted, goods: 0, left: 12, charge: 0, charging: false, pos: 0, zone: cfg.codeBlueZone, fib: false, tb: 0, flash: 0 });
  if (!scripted) sim.unscriptedCB = true;
  ev(sim, 'codeblue', { scripted });
  return cb;
}
