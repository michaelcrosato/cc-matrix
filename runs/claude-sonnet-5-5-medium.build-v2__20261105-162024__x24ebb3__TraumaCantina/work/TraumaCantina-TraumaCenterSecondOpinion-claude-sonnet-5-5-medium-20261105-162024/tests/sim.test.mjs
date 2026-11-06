import { runBot } from './harness.mjs';
import { createOp, step, drainEvents, result, hash, rankOf } from '../src/sim/op.js';
import { newBot, botInput } from '../src/sim/bot.js';
import { BY_ID, OPS } from '../src/content/ops/index.js';
import { cfg, resetConfig, DEFAULTS, SLIDERS } from '../src/core/config.js';
import { spawn } from '../src/sim/core.js';
const IDLE = {};
const mk = (id = 'op2', o = {}) => { resetConfig(); const def = BY_ID[id]; const sim = createOp(def, { seed: 3, seats: [{ id: 0, doctor: def.surgeon }], quietOn: true, ...o }); sim.unlocked = ['scalpel', 'forceps', 'suture', 'drain', 'syringe', 'gel', 'laser', 'scanner']; return sim; };
const st = (sim, n, inp) => { for (let i = 0; i < n; i++) step(sim, { 0: typeof inp === 'function' ? inp(i, sim) : inp }); };
const clearEnts = (sim) => { sim.ents.length = 0; };
export async function run(T) {
  // ---- tools ----
  { const s = mk('op1'); clearEnts(s); spawn(s, { k: 'pool', id: 'p', at: [0, 0], r: 1.2 }); spawn(s, { k: 'hook', id: 'h', at: [0, 0.2], a: 0, hiddenBy: 'p', pull: 1.2, arc: 0 });
    T.ok(s.ents.find((e) => e.id === 'h').hid === 'p:p', 'hook hidden under pool');
    st(s, 240, { px: 0, pz: 0, tool: 'drain', use: true }); T.ok(!s.ents.find((e) => e.id === 'p'), 'drain removes pool'); T.ok(s.ents.find((e) => e.id === 'h').hid === null, 'drain reveals the hook');
    st(s, 2, { px: 0, pz: 0.2, tool: 'forceps', use: false }); st(s, 5, { px: 0, pz: 0.2, tool: 'forceps', use: true }); T.ok(s.seats[0].grab === 'h', 'forceps grab a hook'); let x = 0; st(s, 120, () => ({ px: (x += 0.015), pz: 0.2, tool: 'forceps', use: true })); T.ok(!s.ents.find((e) => e.id === 'h'), 'forceps pull the hook along its path'); T.ok(s.score.clean + s.score.good >= 1, 'hook rated'); }
  { const s = mk('op2'); clearEnts(s); spawn(s, { k: 'hook', id: 'h', at: [0, 0], a: 0, pull: 1.2, arc: 0 }); st(s, 5, { px: 0, pz: 0, tool: 'forceps', use: true }); st(s, 30, { px: 0.3, pz: 2.5, tool: 'forceps', use: true }); T.ok(s.score.mistakes === 1 && s.ents.some((e) => e.k === 'nick'), 'forceps off path tear tissue: mistake + nick'); }
  { const s = mk('op2'); clearEnts(s); spawn(s, { k: 'cut', id: 'c', path: [[-1, 0], [1, 0]] }); st(s, 3, { px: -1, pz: 0, tool: 'scalpel', use: true }); T.ok(s.seats[0].cut === 'c', 'scalpel starts at the guide start'); let x = -1; st(s, 150, () => ({ px: (x += 0.02), pz: 0, tool: 'scalpel', use: true })); T.ok(!s.ents.find((e) => e.id === 'c') && s.score.clean >= 1, 'scalpel clean cut completes');
    const s2 = mk('op2'); clearEnts(s2); spawn(s2, { k: 'cut', id: 'c', path: [[-1, 0], [1, 0]] }); st(s2, 3, { px: -1, pz: 0, tool: 'scalpel', use: true }); st(s2, 10, { px: -0.5, pz: 1.4, tool: 'scalpel', use: true }); T.ok(s2.score.mistakes === 1 && s2.ents.some((e) => e.k === 'pool'), 'scalpel > 0.8 off cuts healthy tissue: pool + mistake'); }
  { const s = mk('op1'); clearEnts(s); spawn(s, { k: 'lac', id: 'l', at: [-1, 0], a: 0, len: 1.35 }); const n = s.ents[0].n; let t = 0; st(s, 600, (i, sm) => { const l = sm.ents[0]; if (!l) return { px: 0, pz: 0, tool: 'suture', use: true }; const side = Math.floor(i / 22) % 2 ? 1 : -1; const u = -1 + l.tied * 0.45 + 0.1 + ((i % 22) / 22) * 0.2; return { px: u, pz: side * 0.46, tool: 'suture', use: true }; }); T.ok(!s.ents.find((e) => e.id === 'l') || s.ents.find((e) => e.id === 'l').tied > 0, 'suture ties stitches when zigzagging'); }
  { const s = mk('op2'); clearEnts(s); spawn(s, { k: 'polyp', id: 'p', at: [1, 1] }); st(s, 60, { px: 1, pz: 1, tool: 'laser', use: true }); T.ok(!s.ents.find((e) => e.id === 'p'), 'laser burns a polyp in 0.7 s'); st(s, 70, { px: -3, pz: -2, tool: 'laser', use: true }); T.ok(s.score.mistakes >= 1, 'laser on healthy tissue > 0.5 s burns it: mistake'); }
  { const s = mk('op2'); clearEnts(s); spawn(s, { k: 'cyst', id: 'c', at: [1, 1], real: false }); st(s, 60, { px: 1, pz: 1, tool: 'laser', use: true }); T.ok(s.score.mistakes === 1, 'a false cyst is a mistake'); }
  { const s = mk('op2'); clearEnts(s); spawn(s, { k: 'prop', id: 'x' }); spawn(s, { k: 'hook', id: 'h', at: [1, 1], a: 0, hid: 'scan' }); st(s, 3, { px: 0, pz: 0.5, tool: 'scanner', use: true }); T.ok(s.ents.find((e) => e.id === 'h').hid === null, 'scanner reveals hidden things within 2.2'); }
  { const s = mk('op1'); clearEnts(s); spawn(s, { k: 'mask', id: 'm', shape: { cx: 0, cz: 0, rx: 1, rz: 1 } }); let a = 0; st(s, 400, (i) => ({ px: Math.cos((a += 0.05)) * 0.8 * (1 - (i % 120) / 200), pz: Math.sin(a) * 0.8 * (1 - (i % 120) / 200), tool: 'gel', use: true })); T.ok(s.ents.find((e) => e.id === 'm') === undefined || s.ents[0].cov > 0.5, 'gel paints a mask'); }
  { const s = mk('op1'); s.tables[0].vitals = 30; st(s, 30, { px: 0, pz: 0, tool: 'syringe', use: true }); const ring = s.rings[0]; T.ok(!!ring, 'syringe draws a ring in 0.45 s'); st(s, 3, { px: ring.x, pz: ring.z, tool: 'syringe', use: true }); st(s, 3, { px: ring.x, pz: ring.z, tool: 'syringe', use: false }); T.ok(s.tables[0].vitals > 45 && s.doses === BY_ID.op1.doses - 1, 'syringe inside the ring: +18 vitals, -1 dose'); }
  { const s = mk('op1'); s.tables[0].vitals = 30; st(s, 30, { px: 0, pz: 0, tool: 'syringe', use: true }); const ring = s.rings[0]; st(s, 2, { px: ring.x + 3, pz: ring.z, tool: 'syringe', use: false }); T.ok(s.score.sloppy >= 1 && s.doses === BY_ID.op1.doses - 1, 'syringe outside the ring is wasted + SLOPPY'); }
  // ---- Code Blue ----
  { const s = mk('op1', { cheat: {} }); s.tables[0].vitals = 0.001; clearEnts(s); st(s, 5, {}); T.ok(!!s.cb && s.unscriptedCB, 'vitals 0 starts an unscripted Code Blue (caps rank at A)');
    const shock = (good) => { st(s, 2, { use: true, use2: true }); const g0 = s.cb.goods; for (let i = 0; i < 400 && s.cb && s.cb.goods === g0; i++) { const sm = s; const ok = good ? Math.abs(sm.cb.pos - 0.7) < 0.03 : sm.cb.pos < 0.2; const rel = ok && sm.cb.charge > 0.3; step(s, { 0: { use: !rel, use2: !rel } }); } };
    shock(true); T.ok(s.cb && s.cb.goods === 1, 'a good shock counts'); shock(true); T.ok(!s.cb && s.tables[0].vitals === 25, 'two good shocks return vitals to 25'); const r = result(s); T.ok('SABC'.indexOf(r.rank) >= 1, 'an unscripted Code Blue caps the rank at A'); }
  { const s = mk('op1'); s.tables[0].vitals = 0.001; s.savesLeft = 0; st(s, 5, {}); T.ok(s.over === 'fail', 'no saves left: the patient is lost'); }
  // ---- The Quiet and The Second Look ----
  { const s = mk('op1', { quietOn: true }); s.giftsOn.quiet = true; const a = s.tables[0].vitals; st(s, 60, { gift: true }); T.ok(s.quiet && s.tables[0].vitals === a, 'The Quiet stops vitals falling'); T.ok(s.composure < 40, 'The Quiet drains composure'); const t0 = s.t; st(s, 60, { gift: true }); T.ok(Math.abs((s.t - t0) - 0.25) < 0.01, 'The Quiet slows the sim to x0.25'); st(s, 1, {}); }
  { const def = BY_ID.op6; resetConfig(); const s = createOp(def, { seed: 1, seats: [{ id: 0, doctor: 'sabine' }] }); s.composure = 100; const bot = newBot(1); bot.x = s.seats[0].x; bot.z = s.seats[0].z; for (let i = 0; i < 240; i++) step(s, { 0: botInput(s, s.seats[0], bot) }); const before = JSON.stringify([s.ents.map((e) => [e.id, e.x, e.z]), s.tables[0].vitals.toFixed(2)]); const t4 = s.t; for (let i = 0; i < 300; i++) step(s, { 0: botInput(s, s.seats[0], bot) }); const tNow = s.t; step(s, { 0: { gift: true } }); T.ok(s.lookUsed === 1 && s.t < tNow - 3 && s.t > tNow - 5, 'The Second Look rewinds 4 s of sim time'); T.ok(s.composure === 100 - cfg.lookCost, 'The Second Look costs composure'); }
  // ---- scoring ----
  T.eq([rankOf(0.9), rankOf(0.75), rankOf(0.55), rankOf(0.2), rankOf(0.85), rankOf(0.7), rankOf(0.5)], ['S', 'A', 'B', 'C', 'S', 'A', 'B'], 'rank bounds');
  { const r = runBot('op1', { skill: 1 }); T.ok(r.res && r.res.rank === 'S' || r.res.rank === 'A', 'op1 bot rank'); T.ok(r.res.pristine === (r.res.rank === 'S' && r.sim.score.mistakes === 0), 'pristine = S + zero mistakes'); const rr = r; rr.sim.retried = true; T.ok('SABC'.indexOf(result(rr.sim).rank) >= 2, 'a retried stage caps rank at B'); }
  // ---- sliders ----
  { resetConfig(); for (const [k, , lo, hi] of SLIDERS) { cfg[k] = hi; } T.ok(SLIDERS.every(([k, , , hi]) => cfg[k] === hi), 'sliders set live config'); resetConfig(); T.ok(SLIDERS.every(([k]) => cfg[k] === DEFAULTS[k]), 'reset restores defaults');
    const ra = mk('op1'); cfg.drainMul = 3; st(ra, 600, {}); const vA = ra.tables[0].vitals; const rb = mk('op1'); cfg.drainMul = 1; st(rb, 600, {}); T.ok(vA < rb.tables[0].vitals, 'vitals drain slider changes the sim'); resetConfig(); }
  // ---- every op: idle fails; bot clears; determinism; retry ----
  const ids = [...OPS.map((o) => o.id), 'pileup', 's-introit', 's-lacrimosa', 's-wrath'];
  for (const id of ids) {
    const idle = runBot(id, { skill: 0, maxSec: 600 }); T.ok(idle.sim.over === 'fail', `${id}: idle fails (${idle.sim.over})`);
    const a = runBot(id, { skill: 0.7 }); T.ok(a.sim.over === 'win', `${id}: bot 0.7 clears (${a.sim.over} ${a.sim.why || ''} t=${a.sim.t.toFixed(0)} st=${a.sim.stage})`);
    if (a.sim.over === 'win') { const b = runBot(id, { skill: 0.7 }); T.ok(hash(a.sim) === hash(b.sim), `${id}: determinism hash stable`); }
    const def = BY_ID[id]; if (def.stages.length > 2 && !def.tables) { const st = Math.min(2, def.stages.length - 1); const r = runBot(id, { skill: 0.7, startStage: st }); T.ok(r.sim.over === 'win', `${id}: retry from stage ${st} works (${r.sim.over} ${r.sim.why || ''})`); }
  }
  // diffs
  { const a = runBot('op5', { skill: 0.7, difficulty: 'intern' }), c = runBot('op5', { skill: 0.7, difficulty: 'attending' }); T.ok(a.sim.over === 'win' && c.sim.over === 'win', 'intern and attending both playable'); T.ok(a.sim.clockMax > c.sim.clockMax, 'intern has more time than attending'); T.ok(!c.sim.hintOn && a.sim.hintOn, 'attending has no hint marker'); }
}
