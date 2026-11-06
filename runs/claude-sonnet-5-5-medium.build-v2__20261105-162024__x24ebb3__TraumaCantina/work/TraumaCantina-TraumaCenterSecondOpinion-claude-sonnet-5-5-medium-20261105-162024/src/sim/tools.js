// Tool rules. Each tool acts on plain-data entities. `dt` is real time (the player's hands are never slowed).
import { cfg } from '../core/config.js';
import { dist, clamp, pointAt, nearestS, pathLen } from './geom.js';
import { ev, active, rate, spawn, remove, nick, pool, addVitals, rnd, rr, done, byId } from './core.js';
import { STRAINS } from './strains.js';

export const TOOL_OF = { pool: 'drain', drop: 'drain', hook: 'forceps', drag: 'forceps', cut: 'scalpel', lac: 'suture', nick: 'gel', mask: 'gel', polyp: 'laser', cyst: 'laser', egg: 'laser', eyeT: 'laser', plate: 'forceps' };
export const TOOLS = ['scalpel', 'forceps', 'suture', 'drain', 'syringe', 'gel', 'laser', 'scanner'];
const fx = (sim, name, seat, o = {}) => ev(sim, 'fx', { n: name, seat: seat.id, tb: seat.tb, ...o });

export function hookPos(e, p) {
  const c = Math.cos(e.a), s = Math.sin(e.a), off = (e.arc || 0) * Math.sin(Math.PI * p / e.pull);
  return [e.ox + c * p - s * off, e.oz + s * p + c * off];
}
export const toolTargets = (sim, seat) => sim.ents.filter((e) => e.tb === seat.tb && active(sim, e) && TOOL_OF[e.k] === seat.tool);

export function stepTool(sim, seat, dt) {
  const tool = seat.tool, use = seat.use, edge = use && !seat.pUse, tb = seat.tb;
  seat.pUse = use;
  const sdl = seat.dryT ?? 0;
  if (!use) {
    if (seat.grab) release(sim, seat);
    seat.cut = null; seat.lacId = null; seat.sut = null; seat.burnT = 0; seat.dryT = 0; seat.scan = false; seat.gelHold = false;
    if (seat.syr !== undefined && seat.syr !== null) syringeRelease(sim, seat);
    return;
  }
  if (sim.awaitDress) { /* dressing is contextual */ }
  const near = (e, r) => dist(seat.x, seat.z, e.x, e.z) <= r;
  if (edge) { // wrong tool feedback
    let w = null;
    for (const e of sim.ents) if (e.tb === tb && active(sim, e) && TOOL_OF[e.k] && TOOL_OF[e.k] !== tool && near(e, 0.7)) { w = e; break; }
    if (w && tool !== 'scanner' && tool !== 'dress' && sim.t - (sim.lastWrong ?? -9) > 2) { sim.lastWrong = sim.t; ev(sim, 'wrong', { tool: TOOL_OF[w.k], seat: seat.id }); }
  }
  // marker dwell (any tool)
  for (const e of sim.ents) if (e.k === 'marker' && e.tb === tb && active(sim, e) && near(e, e.r)) { e.dw = (e.dw || 0) + dt; if (e.dw > 0.35) { rate(sim, seat, 'clean', e.x, e.z); remove(sim, e.id); } }
  switch (tool) {
    case 'drain': return drain(sim, seat, dt);
    case 'forceps': return forceps(sim, seat, dt, edge);
    case 'scalpel': return scalpel(sim, seat, dt, edge);
    case 'suture': return suture(sim, seat, dt, edge);
    case 'laser': return laser(sim, seat, dt);
    case 'scanner': return scanner(sim, seat, dt);
    case 'gel': return gel(sim, seat, dt);
    case 'syringe': return syringe(sim, seat, dt, edge);
    case 'dress': return dress(sim, seat, dt, edge);
  }
}

function sysSloppy(sim, seat, grade) { // Dies Irae: tools used in systole are sloppy and nick the tissue
  return sim.heart && sim.heart.sys;
}
function systoleHit(sim, seat) {
  if (!sim.heart || !sim.heart.sys) return false;
  if (sim.t - (seat.sysT ?? -9) > 0.8) { seat.sysT = sim.t; rate(sim, seat, 'sloppy', seat.x, seat.z, { why: 'sys' }); nick(sim, seat.x, seat.z, seat.tb); fx(sim, 'sysnick', seat); }
  return true;
}

function drain(sim, seat, dt) {
  const f = seat.force ?? 1; let hit = false;
  for (const e of sim.ents) {
    if (e.tb !== seat.tb || (e.k !== 'pool' && e.k !== 'drop') || e.hid) continue;
    const r = e.k === 'pool' ? e.r : 0.5;
    if (dist(seat.x, seat.z, e.x, e.z) <= r + 0.4 + (e.k === 'drop' ? 0.3 : 0)) {
      hit = true;
      if (e.k === 'drop') { e.dead = true; } else e.r -= cfg.drainRate * f * dt;
      if (e.k === 'drop' || e.r < 0.2) {
        const off = seat.offT || 0; seat.offT = 0;
        if (e.k === 'pool') rate(sim, seat, off < 0.3 ? 'clean' : off < 1 ? 'good' : 'sloppy', e.x, e.z);
        fx(sim, 'slurp', seat, { x: e.x, z: e.z });
        remove(sim, e.id);
      }
    }
  }
  // flares / bleeders near hidden-by pools handled by remove()
  if (hit) { seat.dryT = 0; } else {
    seat.offT = (seat.offT || 0) + dt; seat.dryT = (seat.dryT || 0) + dt;
    if (seat.dryT > 0.6) { seat.dryT = 0; rate(sim, seat, 'sloppy', seat.x, seat.z, { why: 'dry' }); nick(sim, seat.x, seat.z, seat.tb); }
  }
  if (hit) systoleHit(sim, seat);
  seat.dwell = hit;
}

function forceps(sim, seat, dt, edge) {
  if (edge && !seat.grab) {
    let best = null, bd = 0.45;
    for (const e of sim.ents) {
      if (e.tb !== seat.tb || !active(sim, e) || (e.k !== 'hook' && e.k !== 'drag' && e.k !== 'plate')) continue;
      if (e.k === 'plate' && !(e.st === 'cut')) continue;
      if (e.k === 'hook' && e.exposeT !== undefined && e.exposeT <= 0) continue;
      const d = dist(seat.x, seat.z, e.x, e.z);
      if (d < bd) { bd = d; best = e; }
    }
    if (best) {
      if (systoleHit(sim, seat)) { /* nick but still grabs */ }
      seat.grab = best.id; seat.gdev = []; seat.gprev = null; best.held = seat.id; best.grabbed = true; seat.goff = [best.x - seat.x, best.z - seat.z];
      fx(sim, 'grab', seat, { x: best.x, z: best.z });
      if (best.k === 'drag') best.rot0 = best.rot;
    }
    return;
  }
  const e = seat.grab ? byId(sim, seat.grab) : null;
  if (!e) { seat.grab = null; return; }
  if (e.k === 'drag') {
    e.x = seat.x + seat.goff[0]; e.z = seat.z + seat.goff[1];
    if (e.rotT !== undefined) e.rot += (seat.rotIn || 0) * 2.5 * dt;
    return;
  }
  if (e.k === 'plate') { // lift: pull straight toward the centre-out direction
    const L = e.lift; const p = clamp(dist(seat.x, seat.z, e.x0, e.z0), 0, L + 1);
    e.lp = p; e.x = e.x0 + (seat.x - e.x0) * 0.5; e.z = e.z0 + (seat.z - e.z0) * 0.5;
    if (p >= L) { done(sim, e); e.st = 'lifted'; e.hid = 'lifted'; e.held = null; seat.grab = null; fx(sim, 'pluck', seat, { x: e.x0, z: e.z0 }); STRAINS.wrath.onLift(sim, e, seat); }
    return;
  }
  // hook family
  if (e.tether) {
    const p = dist(seat.x, seat.z, e.ox, e.oz); e.p = p; e.x = seat.x; e.z = seat.z;
    if (p >= e.pull) { seat.grab = null; e.held = null; STRAINS[e.sk]?.onPop?.(sim, e, seat); }
    return;
  }
  const c = Math.cos(e.a), s = Math.sin(e.a);
  const rx = seat.x - e.ox, rz = seat.z - e.oz;
  const p = clamp(rx * c + rz * s, 0, e.pull), perp = -rx * s + rz * c;
  const exp = (e.arc || 0) * Math.sin(Math.PI * p / e.pull), dev = Math.abs(perp - exp);
  seat.gdev.push(dev); if (seat.gdev.length > 600) seat.gdev.shift();
  if (e.vmax && seat.gprev !== null && (p - seat.gprev) / dt > e.vmax) { // magnets: too fast snaps back
    e.p = 0; [e.x, e.z] = [e.ox, e.oz]; seat.grab = null; e.held = null; rate(sim, seat, 'sloppy', e.x, e.z, { why: 'fast' }); fx(sim, 'snap', seat, { x: e.x, z: e.z }); return;
  }
  seat.gprev = p;
  if (dev > 1 * cfg.tolMul) { // tears tissue
    seat.grab = null; e.held = null; e.p = Math.max(0, p - 0.3); [e.x, e.z] = hookPos(e, e.p);
    rate(sim, seat, 'mistake', e.x, e.z, { why: 'tear' }); nick(sim, e.x, e.z, e.tb); fx(sim, 'tear', seat, { x: e.x, z: e.z }); return;
  }
  e.p = p; [e.x, e.z] = hookPos(e, p);
  if (p >= e.pull - 0.03) {
    const mean = seat.gdev.reduce((a, b) => a + b, 0) / seat.gdev.length;
    seat.grab = null; e.held = null;
    rate(sim, seat, mean <= 0.2 * cfg.tolMul ? 'clean' : mean <= 0.45 * cfg.tolMul ? 'good' : 'sloppy', e.x, e.z);
    fx(sim, 'dish', seat, { x: e.x, z: e.z, what: e.what });
    sim.score.hooks = (sim.score.hooks || 0) + 1;
    remove(sim, e.id);
  }
}
function release(sim, seat) {
  const e = byId(sim, seat.grab); seat.grab = null; seat.gprev = null;
  if (!e) return;
  e.held = null; e.grabbed = false;
  if (e.tether) { e.p = 0; e.x = e.ox; e.z = e.oz; STRAINS[e.sk]?.onSnap?.(sim, e, seat); fx(sim, 'snap', seat, { x: e.x, z: e.z }); return; }
  if (e.k === 'plate') { e.lp = 0; e.x = e.x0; e.z = e.z0; return; }
  if (e.k === 'drag') {
    const dz = e.to ? dist(e.x, e.z, e.to[0], e.to[1]) : 99;
    if (e.dish) { if (dist(e.x, e.z, e.x0, e.z0) > 2) { rate(sim, seat, 'clean', e.x, e.z); fx(sim, 'dish', seat, { x: e.x, z: e.z, what: e.what }); remove(sim, e.id); } else { e.x = e.x0; e.z = e.z0; } return; }
    if (e.to && dz <= (e.tol ?? 0.5)) {
      if (e.rotT !== undefined) {
        let dd = Math.abs(((e.rot - e.rotT + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * 57.2958; // degrees diff
        dd = Math.abs(dd - 0) > 180 ? 360 - dd : dd; dd = Math.abs(((e.rot - e.rotT) * 57.2958 + 540) % 360 - 180);
        if (dd > 15) { fx(sim, 'nosnap', seat, { x: e.x, z: e.z }); return; }
        rate(sim, seat, dd <= 5 ? 'clean' : 'good', e.x, e.z); e.rot = e.rotT;
      } else rate(sim, seat, 'clean', e.x, e.z);
      e.x = e.to[0]; e.z = e.to[1]; e.placed = true; e.k = 'placed'; fx(sim, 'place', seat, { x: e.x, z: e.z });
      sim.flags['done:' + e.id] = true; if (e.then) { const t = e.then; e.then = null; import_run(sim, t); }
    } else if (!e.keep) { /* stays where dropped */ }
  }
}
import { runCmds } from './core.js';
function import_run(sim, t) { runCmds(sim, t); }

function scalpel(sim, seat, dt, edge) {
  if (systoleHit(sim, seat) && sim.heart.cutReset) sim.heart.cutReset(seat);
  if (edge && !seat.cut) {
    for (const e of sim.ents) {
      if (e.k !== 'cut' || e.tb !== seat.tb || !active(sim, e)) continue;
      const [px, pz] = pointAt(e.path, e.s);
      if (dist(seat.x, seat.z, px, pz) <= 0.5) { seat.cut = e.id; seat.cdev = []; fx(sim, 'cutstart', seat, { x: px, z: pz }); break; }
    }
    return;
  }
  const e = seat.cut ? byId(sim, seat.cut) : null;
  if (!e) { seat.cut = null; return; }
  const [s, d] = nearestS(e.path, seat.x, seat.z, Math.max(0, e.s - 0.4), e.s + 1.1);
  seat.cdev.push(d);
  if (d > 0.8 * cfg.tolMul) { // cuts healthy tissue
    seat.cut = null; rate(sim, seat, 'mistake', seat.x, seat.z, { why: 'cut' }); pool(sim, seat.x, seat.z, 0.7, seat.tb); fx(sim, 'oops', seat, { x: seat.x, z: seat.z }); return;
  }
  if (s > e.s) e.s = s;
  e.cutting = true;
  if (e.s >= e.L - 0.12) {
    const m = seat.cdev.reduce((a, b) => a + b, 0) / seat.cdev.length; seat.cut = null;
    rate(sim, seat, m <= 0.12 * cfg.tolMul ? 'clean' : m <= 0.3 * cfg.tolMul ? 'good' : 'sloppy', seat.x, seat.z);
    fx(sim, 'cutdone', seat, { x: seat.x, z: seat.z });
    e.fin = true; STRAINS[e.sk]?.onCut?.(sim, e, seat);
    remove(sim, e.id);
  }
}

function suture(sim, seat, dt, edge) {
  const sut = (seat.sut ??= { side: 0, ext: 0, last: -9 });
  let e = seat.lacId ? byId(sim, seat.lacId) : null;
  if (!e) {
    let bd = 0.9;
    for (const l of sim.ents) {
      if (l.k !== 'lac' || l.tb !== seat.tb || !active(sim, l) || l.tied >= l.n) continue;
      const c = Math.cos(l.a), s = Math.sin(l.a), rx = seat.x - l.x, rz = seat.z - l.z, u = rx * c + rz * s, q = -rx * s + rz * c;
      const d = u < 0 ? Math.hypot(u, q) : u > l.len ? Math.hypot(u - l.len, q) : Math.abs(q);
      if (d < bd) { bd = d; e = l; }
    }
    if (!e) {
      // nicks can be closed with a short suture hold
      for (const n of sim.ents) if (n.k === 'nick' && n.tb === seat.tb && dist(seat.x, seat.z, n.x, n.z) < 0.8) { n.t += dt; if (n.t > 1.2) { rate(sim, seat, 'good', n.x, n.z); remove(sim, n.id); } }
      return;
    }
    seat.lacId = e.id; sut.side = 0; sut.ext = 0; sut.last = sim.t;
  }
  if (e.tied >= e.n) return;
  const c = Math.cos(e.a), s = Math.sin(e.a), rx = seat.x - e.x, rz = seat.z - e.z, u = rx * c + rz * s, q = -rx * s + rz * c;
  if (Math.abs(q) > 2 || u < -1 || u > e.len + 1) { seat.lacId = null; return; }
  const side = Math.abs(q) < 0.04 ? sut.side : Math.sign(q);
  if (sut.side === 0 && side !== 0) { sut.side = side; sut.ext = Math.abs(q); return; }
  if (side === sut.side) { sut.ext = Math.max(sut.ext, Math.abs(q)); return; }
  // crossed the wound line
  const amp = sut.ext; sut.side = side; sut.ext = Math.abs(q);
  if (amp * cfg.tolMul < 0.25 * 0.999 && amp < 0.25) return;
  const slot = e.tied * 0.45 + (e.n === 1 ? e.len / 2 : 0);
  if (Math.abs(u - slot) <= 0.4 * cfg.tolMul + 0.001) {
    const gap = sim.t - sut.last; sut.last = sim.t;
    const g = e.tied === 0 || (gap >= 0.2 && gap <= 0.7) ? 'clean' : gap <= 1.2 ? 'good' : 'sloppy';
    e[g === 'clean' ? 'cl' : g === 'good' ? 'go' : 'sl'] = (e[g === 'clean' ? 'cl' : g === 'good' ? 'go' : 'sl'] || 0) + 1;
    e.tied++; (sim.score.per[seat.id] ??= { pts: 0, clean: 0, good: 0, sloppy: 0, mistakes: 0, stitches: 0, bestStreak: 0 }).stitches++;
    ev(sim, 'stitch', { i: e.tied, n: e.n, x: e.x + c * slot - s * 0, z: e.z + s * slot, id: e.id, seat: seat.id, tb: e.tb, g });
    if (e.tied >= e.n) {
      const fg = (e.sl || 0) > (e.cl || 0) ? 'sloppy' : (e.go || 0) > (e.cl || 0) ? 'good' : 'clean';
      rate(sim, seat, fg, e.x + c * slot, e.z + s * slot); fx(sim, 'knot', seat, { x: e.x, z: e.z }); seat.lacId = null;
      remove(sim, e.id);
    }
  } else if (sim.t - (sut.warn ?? -9) > 0.5) { sut.warn = sim.t; rate(sim, seat, 'sloppy', seat.x, seat.z, { why: 'stitch' }); }
}

function laser(sim, seat, dt) {
  let hit = false;
  if (systoleHit(sim, seat)) { /* sloppy */ }
  for (const e of sim.ents) {
    if (e.tb !== seat.tb || !active(sim, e)) continue;
    const isL = e.k === 'polyp' || e.k === 'cyst' || e.k === 'egg' || e.k === 'eyeT';
    if (!isL) continue;
    if (e.sk && STRAINS[e.sk]?.laser) { if (dist(seat.x, seat.z, e.x, e.z) <= e.r + 0.25) { hit = true; STRAINS[e.sk].laser(sim, e, seat, dt); } continue; }
    if (dist(seat.x, seat.z, e.x, e.z) <= e.r + 0.25) {
      hit = true; e.heat = (e.heat || 0) + dt / cfg.laserTime; e.lz = sim.t;
      if (e.heat >= 1) {
        if (e.k === 'cyst' && !e.real) { rate(sim, seat, 'mistake', e.x, e.z, { why: 'false' }); fx(sim, 'oops', seat, { x: e.x, z: e.z }); remove(sim, e.id); sim.score.falseBurn = (sim.score.falseBurn || 0) + 1; }
        else { rate(sim, seat, (e.stray || 0) < 0.3 ? 'clean' : 'good', e.x, e.z); fx(sim, 'burn', seat, { x: e.x, z: e.z }); remove(sim, e.id); }
      }
    }
  }
  if (hit) seat.burnT = 0; else {
    seat.burnT = (seat.burnT || 0) + dt;
    if (seat.burnT > 0.5) { seat.burnT = 0; rate(sim, seat, 'mistake', seat.x, seat.z, { why: 'burn' }); nick(sim, seat.x, seat.z, seat.tb); fx(sim, 'oops', seat, { x: seat.x, z: seat.z }); }
  }
  seat.dwell = hit;
}

function scanner(sim, seat, dt) {
  seat.scan = true;
  for (const e of sim.ents) {
    if (e.tb !== seat.tb) continue;
    if (e.k === 'strain' && dist(seat.x, seat.z, e.x, e.z) <= 2.2) { e.mark = sim.t; sim.flags.scanned = true; }
    if (e.hid === 'scan' && dist(seat.x, seat.z, e.x, e.z) <= 2.2) { e.hid = null; e.mark = sim.t; fx(sim, 'ping', seat, { x: e.x, z: e.z }); }
    else if (e.scanOnly && dist(seat.x, seat.z, e.x, e.z) <= 2.2) { e.mark = sim.t; e.shown = true; }
  }
}

export function maskPts(shape) { // sample points of a gel region
  const pts = [];
  if (shape.line) { const L = pathLen(shape.line); for (let s = 0; s <= L; s += 0.3) pts.push(pointAt(shape.line, s)); return pts; }
  const { cx, cz, rx, rz } = shape;
  for (let x = cx - rx; x <= cx + rx; x += 0.45) for (let z = cz - rz; z <= cz + rz; z += 0.45) if (((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2 <= 1) pts.push([x, z]);
  return pts;
}
function gel(sim, seat, dt) {
  seat.gelHold = true; let any = false;
  for (const e of sim.ents) {
    if (e.tb !== seat.tb || !active(sim, e)) continue;
    if (e.k === 'mask') {
      if (!e.pts) { e.pts = maskPts(e.shape); e.got = new Array(e.pts.length).fill(0); }
      let n = 0;
      for (let i = 0; i < e.pts.length; i++) { if (!e.got[i] && dist(seat.x, seat.z, e.pts[i][0], e.pts[i][1]) <= 0.8) { e.got[i] = 1; any = true; } n += e.got[i]; }
      e.cov = n / e.pts.length;
      if (e.cov >= (e.need ?? 0.92)) { rate(sim, seat, (sim.t - (e.t0 ?? sim.t)) < (e.par ?? 14) ? 'clean' : 'good', seat.x, seat.z); fx(sim, 'gelok', seat, { x: seat.x, z: seat.z }); e.fin = true; STRAINS[e.sk]?.onMask?.(sim, e, seat); remove(sim, e.id); }
    } else if (e.k === 'nick' && dist(seat.x, seat.z, e.x, e.z) <= 0.8) {
      e.t += dt; if (e.t > 1) { rate(sim, seat, 'good', e.x, e.z); remove(sim, e.id); }
    }
  }
  if (sim.filmOn) {
    seat.filmT = (seat.filmT || 0) - dt;
    if (seat.filmT <= 0) { seat.filmT = 0.22; if (sim.ents.filter((x) => x.k === 'film').length < 40) spawn(sim, { k: 'film', x: seat.x, z: seat.z, tb: seat.tb, ttl: 10, r: 0.8 }); }
  }
  seat.dwell = any;
}

function syringe(sim, seat, dt, edge) {
  if (edge) { if (sim.doses > 0) seat.syr = 0; return; }
  if (seat.syr === null || seat.syr === undefined) return;
  seat.syr += dt;
  if (seat.syr >= 0.45 && !sim.rings[seat.tb]) {
    let x, z, k = 0; do { x = rr(sim, -4, 4); z = rr(sim, -2.8, 2.4); k++; } while (dist(x, z, seat.x, seat.z) < 1.6 && k < 20);
    sim.rings[seat.tb] = { x, z, r: 0.7, seat: seat.id }; fx(sim, 'syrload', seat, { x, z });
  }
}
function syringeRelease(sim, seat) {
  const had = seat.syr; seat.syr = null;
  const ring = sim.rings[seat.tb];
  if (had < 0.45 || !ring || ring.seat !== seat.id) return;
  sim.rings[seat.tb] = null; sim.doses--;
  const d = dist(seat.x, seat.z, ring.x, ring.z);
  if (d <= ring.r) { addVitals(sim, seat.tb, cfg.syringeDose); rate(sim, seat, d < 0.35 ? 'clean' : 'good', seat.x, seat.z); fx(sim, 'inject', seat, { x: seat.x, z: seat.z }); ev(sim, 'dose', { tb: seat.tb }); STRAINS.wrath?.onDose?.(sim); sim.score.doses = (sim.score.doses || 0) + 1; }
  else { rate(sim, seat, 'sloppy', seat.x, seat.z, { why: 'dose' }); fx(sim, 'oops', seat, { x: seat.x, z: seat.z }); }
}

function dress(sim, seat, dt, edge) {
  const e = sim.ents.find((x) => x.k === 'dress' && x.tb === seat.tb && active(sim, x));
  if (!e) return;
  if (edge) { const [px, pz] = pointAt(e.path, e.s); if (dist(seat.x, seat.z, px, pz) <= 0.6) { seat.cut = e.id; seat.cdev = []; } return; }
  if (seat.cut !== e.id) return;
  const [s, d] = nearestS(e.path, seat.x, seat.z, Math.max(0, e.s - 0.4), e.s + 1.3);
  if (d > 1.2) { seat.cut = null; return; }
  seat.cdev.push(d); if (s > e.s) e.s = s;
  if (e.s >= e.L - 0.12) { const m = seat.cdev.reduce((a, b) => a + b, 0) / seat.cdev.length; seat.cut = null; rate(sim, seat, m <= 0.25 ? 'clean' : m <= 0.55 ? 'good' : 'sloppy', seat.x, seat.z); fx(sim, 'dressdone', seat, { x: seat.x, z: seat.z }); remove(sim, e.id); }
}
