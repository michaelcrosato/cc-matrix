// The bot: reads sim state, produces seat input. One piece of code for attract mode, the playthrough test,
// the balance report and the Op 9 partner. skill 0 = idle; 1 = flawless.
import { dist, pointAt, nearestS, clamp } from './geom.js';
import { TOOL_OF } from './tools.js';
import { active, byId } from './core.js';
import { hookPos } from './tools.js';
import { cfg } from '../core/config.js';

export const newBot = (skill = 1, o = {}) => ({ skill, x: 0, z: 2, cur: null, ph: 0, side: 1, s: 0, wait: 0, rel: 0, t: 0, region: o.region || null, cheats: !!o.cheats, n: 0, scanI: 0, hold: 0 });
const PRIO = { drop: 0, pool: 1, nick: 6, lac: 3, plate: 3, hook2: 2, hook: 4, cut: 4, drag: 4, mask: 5, polyp: 4, egg: 4, cyst: 4, eyeT: 3, marker: 2, dress: 7 };
function mv(b, gx, gz, sp, dt) { const d = dist(b.x, b.z, gx, gz); if (d < 1e-6) return 0; const st = Math.min(d, sp * dt); b.x += (gx - b.x) / d * st; b.z += (gz - b.z) / d * st; return d - st; }

const KSPD = (skill) => 0.4 + 0.4 * skill; // human-ish pace: slower hands at lower skill
let _K = 1;
const mvK = (b, x, z, sp, dt) => mv(b, x, z, sp * _K, dt);
export function botInput(sim, seat, b, dt = 1 / 60) {
  const skill = b.skill; const inp = { px: b.x, pz: b.z, use: false, use2: false, tool: undefined, steady: false, gift: false, rot: 0, force: 1 };
  if (skill <= 0) return inp;
  _K = KSPD(skill); b.t += dt; const spd = 3.5 + 7 * skill; const tb = seat.tb;
  const nz = (1 - skill) * 0.9;
  const jit = () => (Math.sin(b.t * 7.3 + seat.id) * nz * 0.5) + (Math.sin(b.t * 3.1) * nz * 0.3);
  const done = () => { b.cur = null; b.ph = 0; b.hold = 0; };
  // ---- code blue / massage ----
  if (sim.cb) {
    const cb = sim.cb;
    if (seat.id !== (sim.seats.find((s) => s.bot === seat.bot)?.id)) { /* other seats idle during cb */ }
    if (!cb.charging || Math.abs(cb.pos - 0.7) > cfg.codeBlueZone * 0.3 * (0.6 + 0.4 * skill)) { inp.use = inp.use2 = true; if (cb.charging && cb.charge > 0.2) { inp.use = inp.use2 = true; } }
    if (cb.charging && Math.abs(cb.pos - 0.7) <= cfg.codeBlueZone * 0.3 * (0.6 + 0.4 * skill) && cb.charge > 0.25) { inp.use = inp.use2 = false; }
    if (!cb.charging) { b.cbT = (b.cbT || 0) + dt; if (b.cbT < 0.15) inp.use = inp.use2 = false; else inp.use = inp.use2 = true; } else b.cbT = 0;
    return inp;
  }
  if (sim.mass) {
    const ph = sim.heart?.phase ?? 0;
    b.mp = b.mp || { side: 'L', done: false };
    if ((ph > 0.9 || ph < 0.02) && !b.mp.fired) { b.mp.fired = 6; b.mp.side = b.mp.side === 'L' ? 'R' : 'L'; }
    if (ph > 0.1 && ph < 0.5) b.mp.fired = 0;
    if (b.mp.fired > 0) { b.mp.fired--; if (b.mp.side === 'L') inp.use = true; else inp.use2 = true; }
    return inp;
  }
  // ---- table switching (Op 3) ----
  if (sim.tables.length > 1) {
    const n = sim.tables.length, has = (t) => sim.ents.some((e) => e.tb === t && PRIO[e.k] !== undefined && (active(sim, e) || e.hid === 'scan'));
    b.tbw = (b.tbw || 0) - dt;
    if (b.tbw <= 0 && !seat.syr && !seat.grab && !seat.cut && !seat.lacId) {
      let best = tb, bv = 1e9;
      for (let t = 0; t < n; t++) { if (!has(t) && sim.tables[t].vitals > 25) continue; const v = sim.tables[t].vitals + (t === tb ? 6 : 0) + (has(t) ? 0 : 40); if (v < bv) { bv = v; best = t; } }
      if (best !== tb) { inp.tbd = ((best - tb + n) % n) === 1 ? 1 : -1; b.tbw = 0.5; b.cur = null; b.ph = 0; }
      else b.tbw = 0.25;
    }
  }
  // ---- gifts ----
  if (seat.doctor === 'ilya' && sim.giftsOn.quiet) {
    const exposed = sim.ents.some((e) => e.k === 'hook' && e.tether && e.tb === tb);
    const eyeOpen = sim.ents.some((e) => e.k === 'eyeT' && e.sk === 'lacrimosa' && !e.hid);
    inp.gift = (sim.composure >= (sim.quiet ? 1 : 25) || sim.cheat.composure) && (sim.tables[tb].vitals < 40 || exposed || (eyeOpen && skill > 0.8) || sim.ents.some((e) => e.k === 'cut' && e.tag === 'pore'));
    if (sim.quiet) inp.steady = false;
  }
  if (seat.doctor === 'sabine' && sim.giftsOn.look) {
    inp.gift = (sim.tables[tb].vitals < 22 || (sim.cheat.god && sim.lookUsed === 0 && sim.ents.some((e) => e.k === 'lac' && e.urgent && e.tb === tb))) && (sim.composure >= cfg.lookCost || sim.cheat.composure) && !seat.pGiftB;
    seat.pGiftB = inp.gift;
  }
  // ---- syringe ----
  const vit = sim.tables[tb].vitals;
  const wantDose = (vit < 38 || (sim.heart && sim.heart.bpm > 100 && sim.heart.bpm < 119 && skill > 0.5)) && sim.doses > 0 && sim.unlocked.includes('syringe');
  if (wantDose || b.cur === 'syr') {
    if (b.cur !== 'syr') { b.cur = 'syr'; b.ph = 0; b.hold = 0; }
    inp.tool = 'syringe'; const ring = sim.rings[tb];
    if (seat.tool !== 'syringe') return (mvK(b, b.x, b.z, 0, dt), inp);
    if (!ring) { inp.use = true; b.hold += dt; if (b.hold > 3) done(); }
    else { const d = mvK(b, ring.x, ring.z, spd, dt); inp.px = b.x; inp.pz = b.z; if (d < 0.1) { b.rel = (b.rel || 0) + dt; if (b.rel > 0.12) { inp.use = false; b.rel = 0; done(); } else inp.use = true; } else inp.use = true; }
    if (vit > 60 && !ring && b.cur === 'syr' && b.hold < 0.05) done();
    inp.px = b.x; inp.pz = b.z; return inp;
  }
  // ---- choose a task ----
  let tgt = b.cur && b.cur !== 'syr' ? byId(sim, b.cur) : null;
  const ok = (e) => e && PRIO[e.k] !== undefined && e.tb === tb && (active(sim, e) || (e.hid === 'scan' && false)) && (!b.region || (b.region === 'left' ? e.x < 0.6 : e.x > -0.6) || e.k === 'hook2');
  if (tgt && !ok(tgt)) { tgt = null; done(); }
  if (!tgt) {
    // hidden-by-scan things first
    const hidden = sim.ents.filter((e) => e.tb === tb && e.hid === 'scan' && (!b.region || true));
    const scanTargets = sim.ents.filter((e) => e.tb === tb && (e.hid === 'scan' || (e.scanOnly && !e.shown)));
    if (scanTargets.length && sim.unlocked.includes('scanner')) { return scanTask(sim, seat, b, scanTargets, inp, spd, dt); }
    const strainScan = !sim.flags.scanned && sim.ents.find((e) => e.k === 'strain' && e.sk === 'introit' && e.tb === tb && sim.stage === 0);
    if (strainScan) { inp.tool = 'scanner'; if (seat.tool === 'scanner') { mvK(b, strainScan.x, strainScan.z, spd, dt); inp.use = dist(b.x, b.z, strainScan.x, strainScan.z) < 1.6; } inp.px = b.x; inp.pz = b.z; return inp; }
    const cand = sim.ents.filter((e) => ok(e) && PRIO[e.k] !== undefined && !(e.k === 'cyst' && e.scanOnly && !e.real && e.shown) && !(e.k === 'cyst' && !e.real && e.shown) && !(e.k === 'eyeT' && e.sk === 'wrath' && false) && !(e.k === 'hook2' && false)).map((e) => ({ e, sc: (PRIO[e.k] + (e.k === 'lac' && e.urgent ? -3 : 0)) * 3 + dist(b.x, b.z, e.x, e.z) * 0.35 }));
    // plates only when diastole is young; skip held stuff by others
    cand.sort((p, q) => p.sc - q.sc);
    const pick = cand.find((c) => !(c.e.held !== undefined && c.e.held !== null && c.e.held !== seat.id && c.e.k !== 'hook2'));
    if (!pick) { // idle: drift to centre; if a scanner stage with no hidden, wait
      mvK(b, 0, 0.5, spd, dt); inp.px = b.x; inp.pz = b.z; inp.tool = undefined; return inp;
    }
    tgt = pick.e; b.cur = tgt.id; b.ph = 0; b.hold = 0; b.s = 0; b.side = 1; b.rel = 0; b.wait = (1 - skill) * 0.4;
  }
  if (b.wait > 0) { b.wait -= dt; inp.px = b.x; inp.pz = b.z; return inp; }
  const k = tgt.k;
  inp.tool = ({ pool: 'drain', drop: 'drain', hook: 'forceps', hook2: 'forceps', drag: 'forceps', plate: 'forceps', cut: 'scalpel', lac: 'suture', nick: 'gel', mask: 'gel', polyp: 'laser', egg: 'laser', cyst: 'laser', eyeT: 'laser', marker: seat.sel, dress: 'drain' })[k];
  if (seat.tool !== inp.tool && k !== 'marker' && k !== 'dress') { inp.px = b.x; inp.pz = b.z; return inp; }
  const J = jit();
  const out = (gx, gz, use, sp = spd) => { mvK(b, gx + J, gz + J * 0.6, sp, dt); inp.px = b.x; inp.pz = b.z; inp.use = use; };
  switch (k) {
    case 'marker': out(tgt.x, tgt.z, dist(b.x, b.z, tgt.x, tgt.z) < tgt.r * 0.8); break;
    case 'pool': case 'drop': out(tgt.x, tgt.z, dist(b.x, b.z, tgt.x, tgt.z) < (tgt.r || 0.4) + 0.3); break;
    case 'nick': out(tgt.x, tgt.z, dist(b.x, b.z, tgt.x, tgt.z) < 0.5); break;
    case 'polyp': case 'egg': case 'cyst': { out(tgt.x, tgt.z, dist(b.x, b.z, tgt.x, tgt.z) < 0.25); break; }
    case 'eyeT': { const sysNow = sim.heart?.sys; out(tgt.x, tgt.z, dist(b.x, b.z, tgt.x, tgt.z) < 0.3 && !(tgt.sk === 'wrath' && sysNow)); break; }
    case 'hook': {
      if (tgt.tether) {
        const ang = Math.atan2(-tgt.oz + 0.2, 1 - tgt.ox) + (b.n % 2 ? 0.4 : -0.4);
        const gx = tgt.ox + Math.cos(ang) * 3.2, gz = tgt.oz + Math.sin(ang) * 3.2;
        if (b.ph === 0) { const d = mvK(b, tgt.x + J * 0.3, tgt.z, spd, dt); inp.px = b.x; inp.pz = b.z; if (d < 0.1) b.ph = 1; }
        else { inp.use = true; mvK(b, gx, clamp(gz, -3.4, 2.8), skill * 5, dt); inp.px = b.x; inp.pz = b.z; if (!seat.grab) { b.rel++; if (b.rel > 8) { b.ph = 0; b.rel = 0; } } }
      } else {
        if (b.ph === 0) { const d = mvK(b, tgt.x, tgt.z, spd, dt); inp.px = b.x; inp.pz = b.z; if (d < 0.08) b.ph = 1; }
        else { inp.use = true; const sp = (tgt.vmax ? 1.0 : 1.7 + skill) ; b.s = Math.min(tgt.pull, Math.max(b.s, tgt.p) + sp * dt); const [hx, hz] = hookPos(tgt, b.s); mvK(b, hx, hz, tgt.vmax ? 3 : 12, dt); const jj = tgt.vmax ? 0 : J * 0.15; inp.px = b.x + jj; inp.pz = b.z + jj; if (!seat.grab && b.rel++ > 10) { b.ph = 0; b.rel = 0; b.s = 0; } }
      }
      break;
    }
    case 'hook2': {
      const gx = tgt.ox + 3.0, gz = tgt.oz;
      if (b.ph === 0) { const off = seat.id % 2 ? 0.5 : -0.5; const d = mvK(b, tgt.ox + off * 0.8, tgt.oz + off, spd, dt); inp.px = b.x; inp.pz = b.z; if (d < 0.1) b.ph = 1; }
      else { inp.use = true; mvK(b, gx, gz + (seat.id % 2 ? 0.5 : -0.5), 3 + skill, dt); inp.px = b.x; inp.pz = b.z; }
      break;
    }
    case 'plate': {
      const sys = sim.heart?.sys; const ang = tgt.an; const gx = tgt.x0 + Math.cos(ang) * 1.3, gz = tgt.z0 + Math.sin(ang) * 1.3;
      if (b.ph === 0) { const d = mvK(b, tgt.x0, tgt.z0, spd, dt); inp.px = b.x; inp.pz = b.z; const ph = sim.heart.phase; if (d < 0.08 && !sys && ph > 0.37 && ph < 0.5) b.ph = 1; }
      else { inp.use = !sys; mvK(b, gx, gz, sys ? 0 : 6, dt); inp.px = b.x; inp.pz = b.z; if (sys) { b.ph = 0; mvK(b, tgt.x0, tgt.z0, 20, dt); } }
      break;
    }
    case 'drag': {
      if (b.ph === 0) { const d = mvK(b, tgt.x, tgt.z, spd, dt); inp.px = b.x; inp.pz = b.z; if (d < 0.1) b.ph = 1; }
      else if (b.ph === 1) {
        inp.use = true;
        if (tgt.dish) { mvK(b, tgt.x0 + 3.0, clamp(tgt.z0 + 1.0, -3, 2.6), spd, dt); if (dist(b.x, b.z, tgt.x0, tgt.z0) > 2.4) { b.ph = 2; b.rel = 0; } }
        else {
          if (tgt.rotT !== undefined) { const dd = (((tgt.rotT - tgt.rot + Math.PI * 3) % (Math.PI * 2)) - Math.PI); inp.rot = clamp(dd * 3, -1, 1); }
          const goal = tgt.to; const d = mvK(b, goal[0] - (tgt.x - b.x), goal[1] - (tgt.z - b.z), spd * 0.9, dt);
          const angOk = tgt.rotT === undefined || Math.abs((((tgt.rotT - tgt.rot + Math.PI * 3) % (Math.PI * 2)) - Math.PI)) < 0.05;
          if (dist(tgt.x, tgt.z, goal[0], goal[1]) < 0.12 && angOk) b.ph = 2;
        }
        inp.px = b.x; inp.pz = b.z;
      } else { inp.use = false; inp.px = b.x; inp.pz = b.z; b.rel++; if (b.rel > 4 && tgt.k === 'drag') { b.ph = 0; b.rel = 0; if (tgt.dish) { tgt.x = tgt.x0; } } }
      break;
    }
    case 'cut': {
      const startPt = pointAt(tgt.path, tgt.s);
      if (b.ph === 0) { const d = mvK(b, startPt[0], startPt[1], spd, dt); inp.px = b.x; inp.pz = b.z; const h = sim.heart; const wr = tgt.sk === 'wrath' && h; if (d < 0.1 && (!wr || (!h.arrest && !h.sys && h.phase > 0.36 && h.phase < 0.52) || h.arrest)) { b.ph = 1; b.s = tgt.s; } }
      else { inp.use = true; const sp = tgt.sk === 'wrath' ? 4.2 : (1.6 + 1.8 * skill) * (sim.quiet ? 1 : 1); b.s = Math.min(tgt.L, b.s + sp * dt); const [cx, cz] = pointAt(tgt.path, b.s); b.x = cx; b.z = cz; inp.px = cx + J * 0.2; inp.pz = cz + J * 0.2; if (!seat.cut) { b.rel++; if (b.rel > 6) { b.ph = 0; b.rel = 0; } } else b.rel = 0; }
      break;
    }
    case 'dress': {
      inp.tool = undefined;
      const startPt = pointAt(tgt.path, tgt.s);
      if (b.ph === 0) { const d = mvK(b, startPt[0], startPt[1], spd, dt); inp.px = b.x; inp.pz = b.z; if (d < 0.2) b.ph = 1; b.s = tgt.s; }
      else { inp.use = true; b.s = Math.min(tgt.L, b.s + 3 * dt); const [cx, cz] = pointAt(tgt.path, b.s); b.x = cx; b.z = cz; inp.px = cx; inp.pz = cz; }
      break;
    }
    case 'lac': {
      const c = Math.cos(tgt.a), s = Math.sin(tgt.a), slot = tgt.tied * 0.45 + (tgt.n === 1 ? tgt.len / 2 : 0);
      const P = (u, q) => [tgt.x + c * u - s * q, tgt.z + s * u + c * q];
      if (b.ph === 0) { const [gx, gz] = P(-0.15, 0.45); const d = mvK(b, gx, gz, spd, dt); inp.px = b.x; inp.pz = b.z; if (d < 0.08) { b.ph = 1; b.side = -1; b.lt = tgt.tied; } }
      else {
        inp.use = true; const u = tgt.tied * 0.45 + 0.12, [gx, gz] = P(u, b.side * 0.46);
        const d = mvK(b, gx, gz, 1.55 + skill * 0.9, dt); inp.px = b.x; inp.pz = b.z; if (d < 0.05) b.side = -b.side;
        if (!seat.lacId && b.ph === 1 && ++b.rel > 20) { b.ph = 0; b.rel = 0; }
      }
      break;
    }
    case 'mask': {
      if (!tgt.pts) { const { maskPts } = null || {}; }
      const pts = tgt.pts; const sob = tgt.limit;
      if (!pts) { out(tgt.shape.cx ?? tgt.shape.line[0][0], tgt.shape.cz ?? tgt.shape.line[0][1], true); break; }
      let best = null, bd = 1e9; for (let i = 0; i < pts.length; i++) if (!tgt.got[i]) { const d = dist(b.x, b.z, pts[i][0], pts[i][1]) - 0.0; if (d < bd) { bd = d; best = pts[i]; } }
      if (best) out(best[0], best[1], true, sob ? 9 : spd * 0.8); else out(b.x, b.z, true);
      break;
    }
  }
  return inp;
}

function scanTask(sim, seat, b, targets, inp, spd, dt) {
  inp.tool = 'scanner';
  const t = targets.sort((p, q) => dist(b.x, b.z, p.x, p.z) - dist(b.x, b.z, q.x, q.z))[0];
  if (seat.tool === 'scanner') { const d = mvK(b, t.x, t.z, spd, dt); inp.use = d < 1.4; }
  inp.px = b.x; inp.pz = b.z; return inp;
}
