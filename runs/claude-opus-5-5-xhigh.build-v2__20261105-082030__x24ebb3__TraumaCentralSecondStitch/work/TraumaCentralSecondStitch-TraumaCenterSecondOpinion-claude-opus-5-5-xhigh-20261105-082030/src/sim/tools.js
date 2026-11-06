// The eight instruments plus the contextual dressing, each a physical verb on sim state. Pure.
import { clamp, dist, pathAt, projectPath } from '../core/geom.js';
import { CARRY_KINDS, GEL_COLS, GEL_ROWS, gelCell, LASER_KINDS, POOL_KINDS, PULL_KINDS, stitchPoint, taskOf } from './entities.js';

const entById = (sim, id) => sim.ents.find((e) => e.id === id && !e.dead);

/** The tool a seat is really using: a stage can force a contextual one. */
export function effectiveTool(sim, seat) {
  return sim.context && sim.ents.some((e) => e.k === sim.context && e.table === seat.table && !e.dead && !e.hidden) ? sim.context : seat.tool;
}

export function useTools(sim, api, seat, inp, dt) {
  const tool = effectiveTool(sim, seat);
  const pressed = inp.use && !seat.useWas;
  seat.act = inp.use ? tool : null;
  seat.onTarget = false;
  if (inp.use !== seat.useWas || seat.toolWas !== tool) seat.onceRelease = false;
  // A heart in systole punishes fine work (Dies Irae).
  const heart = sim.heart;
  const fine = tool === 'scalpel' || tool === 'forceps' || tool === 'laser';
  const inSystole = heart && heart.systole && fine;
  switch (tool) {
    case 'drain': drain(sim, api, seat, inp, dt, pressed); break;
    case 'forceps': forceps(sim, api, seat, inp, dt, pressed, inSystole); break;
    case 'scalpel': cut(sim, api, seat, inp, dt, pressed, 'incision', inSystole); break;
    case 'dressing': cut(sim, api, seat, inp, dt, pressed, 'dressing', false); break;
    case 'suture': suture(sim, api, seat, inp, dt, pressed); break;
    case 'laser': laser(sim, api, seat, inp, dt, pressed, inSystole); break;
    case 'gel': gel(sim, api, seat, inp, dt, pressed); break;
    case 'scanner': scanner(sim, api, seat, inp, dt); break;
    case 'syringe': syringe(sim, api, seat, inp, dt); break;
    default: break;
  }
  if (tool !== 'forceps' && seat.grab) releaseGrab(sim, api, seat);
  if (tool !== 'scalpel' && tool !== 'dressing') seat.cutting = null;
  if (tool !== 'syringe') { seat.draw = 0; seat.drawn = false; }
  if (tool !== 'suture') seat.sutSide = 0;
  if (tool !== 'drain') seat.dry = 0;
  seat.useWas = inp.use;
  seat.toolWas = tool;
}

function systoleSlip(sim, api, seat) {
  const h = sim.heart;
  if (h.slipBeat === h.beat) return false;
  h.slipBeat = h.beat;
  api.rate(seat, 'sloppy', seat.x, seat.z, 0.5);
  api.spawn({ k: 'nick', at: [seat.x, seat.z], table: seat.table });
  api.emit('systole', { x: seat.x, z: seat.z });
  return true;
}

function wrongToolCheck(sim, api, seat, tool) {
  for (const e of sim.ents) {
    if (e.table !== seat.table || e.dead) continue;
    const t = taskOf(sim, e);
    if (!t || t.tool === tool) continue;
    if (dist(t.x, t.z, seat.x, seat.z) < Math.max(0.6, e.r ?? 0.6)) {
      api.emit('wrongTool', { want: t.tool, have: tool, seat: seat.id, x: seat.x, z: seat.z });
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------- Drain
function drain(sim, api, seat, inp, dt, pressed) {
  if (!inp.use) { seat.dry = 0; return; }
  let hit = false;
  const tol = sim.cfg.toleranceMul;
  for (const e of sim.ents) {
    if (e.table !== seat.table || e.dead || e.hidden || !POOL_KINDS.has(e.k)) continue;
    if (dist(e.x, e.z, seat.x, seat.z) <= e.r + 0.4 * tol) {
      hit = true;
      e.r -= (sim.cfg.drainRate * (inp.force ?? 1) + (e.grow || 0)) * dt;
      if (e.r < 0.2) {
        const q = e.wasted < 0.35 ? 'clean' : e.wasted < 1.2 ? 'good' : 'sloppy';
        api.finish(e, seat, q);
      }
    }
  }
  // Droplets.
  for (const d of sim.drops) {
    if (d.table === seat.table && !d.dead && dist(d.x, d.z, seat.x, seat.z) <= 0.7 * tol) {
      d.dead = true;
      hit = true;
      seat.stats.drops = (seat.stats.drops || 0) + 1;
      api.emit('dropSucked', { x: d.x, z: d.z });
    }
  }
  seat.onTarget = hit;
  if (hit) { seat.dry = 0; return; }
  for (const e of sim.ents) if (POOL_KINDS.has(e.k) && e.table === seat.table && !e.dead && !e.hidden) e.wasted += dt;
  seat.dry = (seat.dry || 0) + dt;
  if (pressed) wrongToolCheck(sim, api, seat, 'drain');
  if (seat.dry >= 0.6) {
    seat.dry = -0.6; // a beat's grace before the next bruise
    api.addMark(seat.table, { t: 'bruise', x: seat.x, z: seat.z });
    api.rate(seat, 'sloppy', seat.x, seat.z, 0.5);
    api.emit('bruise', { x: seat.x, z: seat.z });
  }
}

// ---------------------------------------------------------------- Forceps
function grabbable(e) {
  return !e.dead && !e.hidden && !e.locked && !e.inert && (PULL_KINDS.has(e.k) || (CARRY_KINDS.has(e.k) && !e.placed));
}
function releaseGrab(sim, api, seat, fromTear = false) {
  const e = seat.grab ? entById(sim, seat.grab) : null;
  seat.grab = null;
  if (!e) return;
  e.holders = (e.holders || 1) - 1;
  if (e.holders > 0) return;
  e.holders = 0;
  if (PULL_KINDS.has(e.k)) {
    if (e.free) {
      const mean = e.devT > 0 ? e.devSum / e.devT : 0;
      const tol = sim.cfg.toleranceMul;
      const q = mean <= 0.25 * tol ? 'clean' : mean <= 0.55 * tol ? 'good' : 'sloppy';
      api.emit('dish', { x: seat.x, z: seat.z, k: e.k });
      api.finish(e, seat, q);
    } else if (e.tether) {
      api.snapBack(e, seat);
    } else if (!fromTear) {
      api.emit('release', { x: seat.x, z: seat.z });
    }
  } else if (CARRY_KINDS.has(e.k)) {
    const d = dist(e.x, e.z, e.to[0], e.to[1]);
    const rotOk = e.rotTo == null ? 0 : angleDelta(e.rot, e.rotTo);
    const tol = sim.cfg.toleranceMul;
    if (d <= e.tol * tol && rotOk <= 15 * tol) {
      e.x = e.to[0];
      e.z = e.to[1];
      if (e.rotTo != null) e.rot = e.rotTo;
      e.placed = true;
      e.task = false;
      const q = e.rotTo != null ? (rotOk <= 5 * tol ? 'clean' : 'good') : d <= 0.3 * tol ? 'clean' : 'good';
      api.placed(e, seat, q);
    } else {
      api.emit('drop', { x: e.x, z: e.z });
    }
  }
}
export const angleDelta = (a, b) => {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
};

function forceps(sim, api, seat, inp, dt, pressed, inSystole) {
  let held = seat.grab ? entById(sim, seat.grab) : null;
  if (seat.grab && !held) seat.grab = null;
  if (!inp.use) {
    if (held) releaseGrab(sim, api, seat);
    seat.noGrab = false;
    return;
  }
  if (!held && seat.noGrab) return;
  const tol = sim.cfg.toleranceMul;
  if (!held) {
    let best = null, bd = 0.45 * tol;
    for (const e of sim.ents) {
      if (e.table !== seat.table || !grabbable(e)) continue;
      if (e.holders && !e.twoHanded) continue;
      const d = dist(e.x, e.z, seat.x, seat.z);
      if (d <= bd + (e.grabR ?? 0)) { best = e; bd = d; }
    }
    if (best) {
      if (inSystole) { seat.noGrab = true; systoleSlip(sim, api, seat); return; }
      seat.grab = best.id;
      best.holders = (best.holders || 0) + 1;
      api.emit('grab', { x: seat.x, z: seat.z, k: best.k, id: best.id });
      held = best;
    } else if (pressed) {
      wrongToolCheck(sim, api, seat, 'forceps');
      return;
    } else return;
  }
  seat.onTarget = true;
  if (inSystole && !held.free) { releaseGrab(sim, api, seat); seat.noGrab = true; systoleSlip(sim, api, seat); return; }
  if (CARRY_KINDS.has(held.k)) {
    held.x = seat.x;
    held.z = seat.z;
    if (inp.rot) held.rot = ((held.rot + inp.rot) % 360 + 360) % 360;
    return;
  }
  if (held.free) { held.x = seat.x; held.z = seat.z; return; }
  const p = projectPath(held.path, seat.x, seat.z, Math.max(0, held.s - 0.8), held.s + 1.1);
  held.devSum += p.d * dt;
  held.devT += dt;
  if (p.d > 1 * tol * (held.tearMul ?? 1)) {
    // Tore tissue.
    const at = [held.x, held.z];
    api.mistake(seat, at[0], at[1], 'tear');
    api.spawn({ k: 'nick', at, table: seat.table });
    seat.noGrab = true;
    if (held.tether) { releaseGrab(sim, api, seat); return; }
    releaseGrab(sim, api, seat, true);
    return;
  }
  let s = p.s;
  if (held.twoHanded) {
    // Both hands must pull: progress is what the slower hand has reached.
    const other = sim.seats.find((o) => o !== seat && o.grab === held.id);
    if (!other) s = Math.min(s, held.s);
    else {
      const q = projectPath(held.path, other.x, other.z, Math.max(0, held.s - 1), held.s + 1.5);
      s = Math.min(s, q.s);
    }
  }
  if (held.tether) {
    // The core fights: it only gives ground while being pulled, and it pulls back.
    const fight = (held.fight ?? 0.5) * sim.cfg.strainSpeedMul;
    s = Math.min(s, held.s + 2.6 * dt);
    if (s <= held.s + 0.001) s = Math.max(0, held.s - fight * dt);
  }
  const ds = s - held.s;
  held.speed += (Math.abs(ds) / Math.max(dt, 1e-4) - held.speed) * 0.2;
  if (held.speedLimit && held.speed > held.speedLimit) {
    // Too fast: the magnets clack back together.
    held.s = 0;
    held.speed = 0;
    const p0 = pathAt(held.path, 0);
    held.x = p0[0];
    held.z = p0[1];
    api.emit('magnetSnap', { x: held.x, z: held.z });
    api.rate(seat, 'sloppy', seat.x, seat.z, 0.3);
    releaseGrab(sim, api, seat, true);
    seat.noGrab = true;
    return;
  }
  held.s = clamp(s, 0, held.len);
  const pt = pathAt(held.path, held.s);
  held.x = pt[0];
  held.z = pt[1];
  if (held.s >= held.len - 0.06) {
    held.free = true;
    api.emit('pop', { x: held.x, z: held.z, k: held.k });
    if (held.autoDone) {
      seat.noGrab = true;
      for (const o of sim.seats) if (o.grab === held.id) o.grab = null;
      const mean = held.devT > 0 ? held.devSum / held.devT : 0;
      api.finish(held, seat, mean <= 0.3 * tol ? 'clean' : mean <= 0.6 * tol ? 'good' : 'sloppy');
    }
  }
}

// ---------------------------------------------------------------- Scalpel and dressing
function cut(sim, api, seat, inp, dt, pressed, kind, inSystole) {
  if (!inp.use) { seat.cutting = null; seat.noCut = false; return; }
  if (seat.noCut) return;
  const tol = sim.cfg.toleranceMul * (kind === 'dressing' ? 2 : 1);
  let e = seat.cutting ? entById(sim, seat.cutting) : null;
  if (!e) {
    seat.cutting = null;
    let bd = 0.5 * tol;
    for (const c of sim.ents) {
      if (c.k !== kind || c.table !== seat.table || c.dead || c.hidden || c.locked) continue;
      const pt = pathAt(c.path, c.s);
      const d = dist(pt[0], pt[1], seat.x, seat.z);
      if (d <= bd) { e = c; bd = d; }
    }
    if (!e) {
      if (pressed) wrongToolCheck(sim, api, seat, kind === 'dressing' ? 'dressing' : 'scalpel');
      return;
    }
    if (inSystole) { seat.noCut = true; systoleSlip(sim, api, seat); return; }
    seat.cutting = e.id;
    api.emit(kind === 'dressing' ? 'dressStart' : 'cutStart', { x: seat.x, z: seat.z });
  }
  if (inSystole && e.s < e.len) { seat.cutting = null; seat.noCut = true; systoleSlip(sim, api, seat); return; }
  seat.onTarget = true;
  const p = projectPath(e.path, seat.x, seat.z, Math.max(0, e.s - 0.3), e.s + 0.9);
  if (p.d > 0.8 * tol) {
    seat.cutting = null;
    seat.noCut = true;
    if (kind === 'incision') {
      api.mistake(seat, seat.x, seat.z, 'miscut');
      api.spawn({ k: 'pool', at: [seat.x, seat.z], r: 0.6, table: seat.table, task: false });
    }
    return;
  }
  if (p.s > e.s) {
    const ds = p.s - e.s;
    e.devSum += p.d * ds;
    e.devLen += ds;
    e.s = p.s;
    api.addCutProgress(e, seat);
    const pt = pathAt(e.path, e.s);
    e.x = pt[0];
    e.z = pt[1];
  }
  if (e.s >= e.len - 0.08) {
    const mean = e.devLen > 0 ? e.devSum / e.devLen : 0;
    const qt = sim.cfg.toleranceMul * (kind === 'dressing' ? 2.5 : 1);
    const q = mean <= 0.12 * qt ? 'clean' : mean <= 0.3 * qt ? 'good' : 'sloppy';
    seat.cutting = null;
    seat.noCut = true;
    seat.stats.cutDev = (seat.stats.cutDev || 0) + mean;
    seat.stats.cuts = (seat.stats.cuts || 0) + 1;
    api.finish(e, seat, q);
  }
}

// ---------------------------------------------------------------- Suture
function suture(sim, api, seat, inp, dt, pressed) {
  if (!inp.use) { seat.sutSide = 0; seat.sutId = null; return; }
  const tol = sim.cfg.toleranceMul;
  let l = seat.sutId ? entById(sim, seat.sutId) : null;
  if (!l) {
    let bd = 1.3 * tol;
    for (const e of sim.ents) {
      if (e.k !== 'laceration' || e.table !== seat.table || e.dead || e.hidden || e.locked) continue;
      // Either end to start from; after that, the next slot.
      const pts = e.next === 0 ? [stitchPoint({ ...e, flip: 1 }, 0), stitchPoint({ ...e, flip: -1 }, 0)] : [stitchPoint(e, e.next)];
      for (const p of pts) {
        const d = dist(p[0], p[1], seat.x, seat.z);
        if (d < bd) { bd = d; l = e; }
      }
    }
    if (!l) {
      if (pressed) wrongToolCheck(sim, api, seat, 'suture');
      return;
    }
    seat.sutId = l.id;
    seat.sutSide = 0;
  }
  const dx = seat.x - l.x, dz = seat.z - l.z;
  const u = dx * Math.cos(l.a) + dz * Math.sin(l.a);
  const v = -dx * Math.sin(l.a) + dz * Math.cos(l.a);
  seat.onTarget = true;
  if (Math.abs(v) < 0.25) return;
  const side = v > 0 ? 1 : -1;
  if (seat.sutSide && side !== seat.sutSide) {
    if (l.next === 0 && !l.flip) l.flip = u > l.len / 2 ? -1 : 1;
    const n = l.slots - 1;
    const slotU = ((l.flip < 0 ? n - l.next : l.next) / n) * l.len;
    const off = Math.abs(u - slotU);
    if (off <= 0.4 * tol) {
      const gap = l.lastTie < 0 ? 0.4 : sim.tick / 60 - l.lastTie;
      const q = gap >= 0.2 && gap <= 0.7 ? 'clean' : gap <= 1.2 ? 'good' : 'sloppy';
      l.lastTie = sim.tick / 60;
      const sp = stitchPoint(l, l.next);
      l.next++;
      seat.stats.stitches = (seat.stats.stitches || 0) + 1;
      api.addMark(seat.table, { t: 'stitch', x: sp[0], z: sp[1], a: l.a });
      api.emit('stitch', { n: l.next, of: l.slots, x: sp[0], z: sp[1], q });
      api.rate(seat, q, sp[0], sp[1], 0.4, true);
      l.q += q === 'clean' ? 0 : q === 'good' ? 0.5 : 1;
      if (l.next >= l.slots) {
        const worst = (l.q + l.misses) / l.slots;
        api.emit('knot', { x: sp[0], z: sp[1] });
        seat.sutId = null;
        api.finish(l, seat, worst < 0.2 ? 'clean' : worst < 0.5 ? 'good' : 'sloppy', 0.6);
        return;
      }
    } else if (off < 1.6) {
      l.misses++;
      api.emit('stitchMiss', { x: seat.x, z: seat.z });
      api.rate(seat, 'sloppy', seat.x, seat.z, 0.3);
    }
  }
  seat.sutSide = side;
}

// ---------------------------------------------------------------- Laser
function laser(sim, api, seat, inp, dt, pressed, inSystole) {
  if (!inp.use) return;
  const tol = sim.cfg.toleranceMul;
  let target = null, bd = Infinity;
  for (const e of sim.ents) {
    if (e.table !== seat.table || e.dead || e.hidden || e.locked || !LASER_KINDS.has(e.k)) continue;
    const d = dist(e.x, e.z, seat.x, seat.z);
    if (d <= e.r + 0.25 * tol && d < bd) { bd = d; target = e; }
  }
  if (!target) {
    seat.stray = (seat.stray || 0) + dt;
    if (pressed) wrongToolCheck(sim, api, seat, 'laser');
    if (seat.stray > 0.5 * tol) {
      seat.stray = -0.3;
      api.addMark(seat.table, { t: 'burn', x: seat.x, z: seat.z });
      api.mistake(seat, seat.x, seat.z, 'burn');
    }
    return;
  }
  seat.onTarget = true;
  if (inSystole) { systoleSlip(sim, api, seat); return; }
  const stray = Math.max(0, seat.stray || 0);
  target.stray += stray;
  seat.stray = 0;
  target.heat += dt / (sim.cfg.laserTime * (target.burn ?? 1));
  if (target.heat >= 1) {
    api.emit('sizzle', { x: target.x, z: target.z, k: target.k });
    if (target.k === 'cyst' && !target.real) {
      api.mistake(seat, target.x, target.z, 'falsecyst');
      target.task = false;
      api.remove(target);
      return;
    }
    const q = target.stray < 0.12 ? 'clean' : target.stray < 0.35 ? 'good' : 'sloppy';
    if (target.hp != null) {
      // Eyes survive a burn; their owner decides.
      api.rate(seat, q, target.x, target.z);
      target.heat = 0;
      target.stray = 0;
      api.notify(target, 'burned', seat);
      return;
    }
    api.addMark(seat.table, { t: 'burnt', x: target.x, z: target.z });
    api.finish(target, seat, q);
  }
}

// ---------------------------------------------------------------- Gel
function gel(sim, api, seat, inp, dt, pressed) {
  if (!inp.use) return;
  const R = 0.8;
  const table = sim.tables[seat.table];
  let hit = false;
  const c = gelCell(seat.x, seat.z);
  if (c >= 0) {
    const col = c % GEL_COLS, row = Math.floor(c / GEL_COLS);
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const rr = row + dr, cc = col + dc;
        if (rr < 0 || cc < 0 || rr >= GEL_ROWS || cc >= GEL_COLS) continue;
        if (dr * dr + dc * dc > 2.6 * 2.6) continue;
        table.gel[rr * GEL_COLS + cc] = 10;
      }
    }
  }
  for (const e of sim.ents) {
    if (e.table !== seat.table || e.dead || e.hidden) continue;
    if (e.k === 'mask' && !e.locked) {
      let n = 0;
      for (const m of e.cells) {
        if (!m[2] && dist(m[0], m[1], seat.x, seat.z) <= R) { m[2] = 1; hit = true; }
        if (m[2]) n++;
      }
      e.painted = n / e.cells.length;
      if (e.painted >= e.need) {
        const rate = e.t0 == null ? 0 : sim.tick / 60 - e.t0;
        const q = rate < e.cells.length * 0.07 ? 'clean' : rate < e.cells.length * 0.18 ? 'good' : 'sloppy';
        api.finish(e, seat, q, e.sob ? 0.6 : 1);
      } else if (e.t0 == null && hit) e.t0 = sim.tick / 60;
    } else if (e.k === 'nick' && dist(e.x, e.z, seat.x, seat.z) <= R) {
      e.gelT += dt;
      hit = true;
      if (e.gelT >= 1) {
        api.emit('heal', { x: e.x, z: e.z });
        seat.stats.heals = (seat.stats.heals || 0) + 1;
        api.remove(e);
      }
    }
  }
  seat.onTarget = hit;
}

// ---------------------------------------------------------------- Scanner
function scanner(sim, api, seat, inp, dt) {
  if (!inp.use) return;
  const R = 2.2;
  for (const e of sim.ents) {
    if (e.table !== seat.table || e.dead) continue;
    const d = dist(e.x, e.z, seat.x, seat.z);
    if (d > R) continue;
    if (e.hidden && !e.hiddenBy) {
      api.reveal(e);
      api.emit('ping', { x: e.x, z: e.z });
      seat.onTarget = true;
    } else if (e.k === 'cyst' && !e.scanned) {
      e.scanned = true;
      api.emit('ping', { x: e.x, z: e.z, cyst: e.real ? 'real' : 'false' });
      seat.onTarget = true;
    } else if (e.k?.startsWith('strain:')) {
      e.scanT = 2;
      seat.onTarget = true;
    }
  }
}

// ---------------------------------------------------------------- Syringe
function syringe(sim, api, seat, inp, dt) {
  const table = sim.tables[seat.table];
  if (inp.use) {
    if (sim.doses <= 0) {
      if (!seat.useWas) api.emit('noDose', { x: seat.x, z: seat.z });
      return;
    }
    if (seat.draw === 0 || seat.draw == null) api.emit('syringeDraw', { seat: seat.id });
    seat.draw = (seat.draw || 0) + dt;
    if (seat.draw >= 0.45 && !seat.drawn) {
      seat.drawn = true;
      api.emit('syringeReady', { seat: seat.id });
    }
    return;
  }
  if (seat.useWas && seat.drawn) {
    sim.doses--;
    const inRing = dist(seat.x, seat.z, table.ring[0], table.ring[1]) <= 0.8 * sim.cfg.toleranceMul;
    if (inRing) {
      table.vitals = Math.min(99, table.vitals + sim.cfg.syringeDose);
      if (table.fake != null) table.fake = table.vitals;
      api.emit('inject', { x: seat.x, z: seat.z, seat: seat.id });
      api.rate(seat, 'clean', seat.x, seat.z, 0.3);
      seat.stats.doses = (seat.stats.doses || 0) + 1;
      if (sim.heart) { sim.heart.bpm = Math.max(sim.cfg.diesIraeBpm - 12, sim.heart.bpm - 12); api.emit('bpm', { bpm: sim.heart.bpm }); }
    } else {
      api.emit('doseWasted', { x: seat.x, z: seat.z, seat: seat.id });
      api.rate(seat, 'sloppy', seat.x, seat.z, 0.6);
    }
  }
  seat.draw = 0;
  seat.drawn = false;
}
