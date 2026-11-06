// The eight instruments and the contextual dressing. Each is a verb on sim state. No engine, no DOM.
import { clamp, dist, pointAt, project } from './geom.js';
import { entById, KINDS, removeEnt, spawn, toolFor, visible } from './entities.js';
import { rate } from './scoring.js';
import { mistake, sayKey, signal, runCmds, addScar, inSystole, addVitals } from './op.js';
import { nextRandom } from '../core/rng.js';

export const TOOLS = ['scalpel', 'forceps', 'suture', 'drain', 'syringe', 'gel', 'laser', 'scanner'];
const DT = 1 / 60;

const rateBy = (v, clean, good) => (v <= clean ? 'CLEAN' : v <= good ? 'GOOD' : 'SLOPPY');

function complete(sim, seat, e) {
  sim.counters[e.k] = (sim.counters[e.k] ?? 0) + 1;
  sim.events.push({ t: 'done', k: e.k, x: e.x, z: e.z, table: e.table, look: e.look ?? null, id: e.id, seat: seat?.i ?? 0 });
  const then = e.then, sig = e.sig, owner = e.owner;
  removeEnt(sim, e);
  if (then) runCmds(sim, then);
  if (sig) signal(sim, owner, sig, e, seat);
}

/** Dies Irae: tools used in systole are SLOPPY and nick tissue. Returns true when the beat blocks the action. */
function beatBlocked(sim, seat, e) {
  if (!e.onBeat || !inSystole(sim)) return false;
  if (seat.beatHit !== sim.heart.beats) {
    seat.beatHit = sim.heart.beats;
    rate(sim, seat, 'SLOPPY', seat.x, seat.z);
    spawn(sim, { k: 'nick', at: [seat.x, seat.z], table: seat.table });
    sim.events.push({ t: 'sfx', id: 'beatMiss', x: seat.x, z: seat.z });
  }
  return true;
}

function drainTool(sim, seat, use, dt) {
  const table = seat.table;
  let touching = false;
  const reach = 0.4 * sim.cfg.toolTolerance;
  for (const e of sim.ents) {
    if (KINDS[e.k].cls !== 'pool' || e.table !== table) continue;
    if (dist(seat.x, seat.z, e.x, e.z) <= e.r + reach) {
      touching = true;
      e.r -= sim.cfg.drainRate * Math.max(0.5, use) * dt;
      seat.drained += sim.cfg.drainRate * dt;
      if (e.r < 0.2) {
        const r = rateBy(e.waste, 0.5, 1.5);
        rate(sim, seat, r, e.x, e.z);
        complete(sim, seat, e);
      }
      break;
    }
  }
  // Weeping droplets go up the wand too.
  if (sim.drops.length) {
    for (let i = sim.drops.length - 1; i >= 0; i--) {
      const d = sim.drops[i];
      if (d.table === table && dist(seat.x, seat.z, d.x, d.z) <= 0.7) {
        sim.drops.splice(i, 1);
        touching = true;
        sim.counters.drops = (sim.counters.drops ?? 0) + 1;
        sim.events.push({ t: 'sfx', id: 'dropSuck', x: d.x, z: d.z });
      }
    }
  }
  if (touching) seat.dryT = 0;
  else {
    seat.dryT += dt;
    for (const e of sim.ents) if (KINDS[e.k].cls === 'pool' && e.table === table) e.waste += dt / Math.max(1, sim.ents.length);
    if (seat.dryT >= 0.6) {
      seat.dryT = 0;
      addScar(sim, { k: 'bruise', x: seat.x, z: seat.z, table });
      rate(sim, seat, 'SLOPPY', seat.x, seat.z);
      sim.events.push({ t: 'sfx', id: 'bruise', x: seat.x, z: seat.z });
    }
  }
  sim.events.push({ t: 'loop', id: 'drain', seat: seat.i, on: touching });
}

function forcepsTool(sim, seat, use, dt) {
  const tol = sim.cfg.toolTolerance;
  if (seat.grab) return;
  if (!use) return;
  let best = null, bd = 1e9;
  for (const e of sim.ents) {
    if (e.table !== seat.table || toolFor(e) !== 'forceps' || !visible(e) || e.placed) continue;
    if (sim.seats.some((s) => s.grab === e.id) && !e.shared) continue;
    const d = dist(seat.x, seat.z, e.x, e.z);
    if (d <= 0.45 * tol + (e.big ?? 0) && d < bd) { best = e; bd = d; }
  }
  if (!best) return;
  if (seat.cool > 0) return;
  if (best.order != null && sim.ents.some((o) => o.order != null && o.order < best.order && o.k === best.k)) {
    mistake(sim, seat, 'order', best.x, best.z);
    sayKey(sim, 'reyes.wrongOrder');
    seat.cool = 0.6;
    return;
  }
  if (beatBlocked(sim, seat, best)) return;
  seat.grab = best.id;
  seat.grabT = 0;
  sim.events.push({ t: 'sfx', id: 'forceps', x: best.x, z: best.z, seat: seat.i });
  sim.events.push({ t: 'grab', id: best.id, seat: seat.i });
}

/** Hold logic for whatever a seat has hold of; called every step for every seat. */
function heldStep(sim, seat, use, drop, rot, dt) {
  const e = entById(sim, seat.grab);
  if (!e) { seat.grab = null; return; }
  seat.grabT += dt;
  const cls = KINDS[e.k].cls, tol = sim.cfg.toolTolerance;
  if (cls === 'place') {
    e.x = seat.x; e.z = seat.z;
    if (rot) e.rot += rot * 110 * dt;
    if (!use || drop) placeRelease(sim, seat, e);
    return;
  }
  // pull class
  if (e.free) {
    e.x = seat.x; e.z = seat.z;
    if (!use || drop) { // flick into the steel dish
      const r = rateBy((e.devSum / Math.max(0.01, e.devT)) / tol, 0.2, 0.45);
      rate(sim, seat, r, e.x, e.z);
      sim.events.push({ t: 'dish', x: e.x, z: e.z, look: e.look ?? e.k, seat: seat.i });
      complete(sim, seat, e);
    }
    return;
  }
  if (!use || drop) { releasePull(sim, seat, e); return; }
  if (beatBlocked(sim, seat, e)) { releasePull(sim, seat, e, true); return; }
  const others = e.shared ? sim.seats.filter((s) => s.grab === e.id).length : 1;
  if (e.shared && e.need2 && others < 2) { // a two-handed pull: needs both on the tether
    return;
  }
  const p = project(e.pts, seat.x, seat.z, Math.max(0, e.s - 0.2), 1.4);
  e.devSum += p.d * dt; e.devT += dt;
  if (p.d > 1 * tol) { // tore it
    mistake(sim, seat, 'tear', seat.x, seat.z);
    spawn(sim, { k: 'nick', at: [seat.x, seat.z], table: e.table });
    releasePull(sim, seat, e, true);
    seat.cool = 0.5;
    return;
  }
  if (p.s > e.s) {
    const v = (p.s - e.s) / dt;
    e.rush = (e.rush ?? 0) * 0.85 + v * 0.15;
    if (e.maxSpeed && e.rush > e.maxSpeed) { // magnets: too fast and it leaps back
      e.s = 0; e.rush = 0;
      rate(sim, seat, 'SLOPPY', seat.x, seat.z);
      sim.events.push({ t: 'sfx', id: 'magnetSnap', x: e.x0, z: e.z0 });
      sayKey(sim, 'reyes.magnet');
      seat.grab = null; seat.cool = 0.35;
      const b = pointAt(e.pts, 0); e.x = b[0]; e.z = b[1];
      return;
    }
    e.s = e.tether ? Math.min(p.s, e.s + 3.6 * dt) : p.s;
    sim.events.push({ t: 'pull', id: e.id, k: e.k, f: e.s / e.len, seat: seat.i });
  }
  const q = pointAt(e.pts, e.s);
  e.x = q[0]; e.z = q[1];
  if (e.s >= e.len - 0.05) {
    if (e.autoFree) { // a tether pops the moment it's fully out
      const r = rateBy((e.devSum / Math.max(0.01, e.devT)) / tol, 0.25, 0.55);
      rate(sim, seat, r, e.x, e.z);
      sim.events.push({ t: 'sfx', id: 'pop', x: e.x, z: e.z, seat: seat.i });
      complete(sim, seat, e);
      return;
    }
    e.free = true;
    sim.events.push({ t: 'sfx', id: 'hookPop', x: e.x, z: e.z, seat: seat.i });
  }
}

function releasePull(sim, seat, e, silent) {
  seat.grab = null;
  if (e.tether && !e.free) { // tether snaps back and cuts
    e.s = 0;
    const b = pointAt(e.pts, 0); e.x = b[0]; e.z = b[1];
    if (!silent && e.snapCuts !== false) {
      spawn(sim, { k: 'laceration', a: [e.x - 0.7, e.z - 0.2], b: [e.x + 0.7, e.z + 0.2], table: e.table });
      mistake(sim, seat, 'snap', e.x, e.z);
      sim.events.push({ t: 'sfx', id: 'tetherSnap', x: e.x, z: e.z });
    }
  }
}

function placeRelease(sim, seat, e) {
  seat.grab = null;
  const tol = sim.cfg.toolTolerance;
  const goal = e.goal;
  if (!goal) { sim.events.push({ t: 'dish', x: e.x, z: e.z, look: e.look ?? e.k, seat: seat.i }); rate(sim, seat, 'CLEAN', e.x, e.z); complete(sim, seat, e); return; }
  const d = dist(e.x, e.z, goal[0], goal[1]);
  if (d > 0.7 * tol) { // not there: it stays where you set it
    sim.events.push({ t: 'sfx', id: 'tick', x: e.x, z: e.z, seat: seat.i });
    return;
  }
  if (goal[2] != null) {
    const off = Math.abs(((e.rot - goal[2]) % 360 + 540) % 360 - 180);
    if (off > 15 * tol) {
      sim.events.push({ t: 'sfx', id: 'tick', x: e.x, z: e.z, seat: seat.i });
      sayKey(sim, 'reyes.rotate');
      return;
    }
    rate(sim, seat, off <= 5 * tol ? 'CLEAN' : 'GOOD', goal[0], goal[1]);
    e.rot = goal[2];
  } else rate(sim, seat, d <= 0.35 * tol ? 'CLEAN' : 'GOOD', goal[0], goal[1]);
  e.x = goal[0]; e.z = goal[1];
  sim.events.push({ t: 'sfx', id: 'seat', x: e.x, z: e.z, seat: seat.i });
  sim.events.push({ t: 'placed', k: e.k, x: e.x, z: e.z, look: e.look ?? e.k, table: e.table, rot: e.rot });
  complete(sim, seat, e);
}

function scalpelTool(sim, seat, use, dt) {
  const tol = sim.cfg.toolTolerance;
  if (!use) { seat.stroke = null; return; }
  if (seat.cool > 0) return;
  let e = seat.stroke ? entById(sim, seat.stroke) : null;
  if (!e) {
    let best = null, bd = 0.5 * tol;
    for (const c of sim.ents) {
      if (KINDS[c.k].cls !== 'cut' || c.table !== seat.table || !visible(c) || c.locked) continue;
      const p = pointAt(c.pts, c.s), d = dist(seat.x, seat.z, p[0], p[1]);
      if (d <= bd) { best = c; bd = d; }
    }
    if (!best) return;
    if (beatBlocked(sim, seat, best)) return;
    seat.stroke = best.id;
    e = best;
    sim.events.push({ t: 'sfx', id: 'sliceStart', x: seat.x, z: seat.z, seat: seat.i });
  }
  if (beatBlocked(sim, seat, e)) { seat.stroke = null; return; }
  const p = project(e.pts, seat.x, seat.z, e.s, 1.2);
  e.devSum += p.d * dt; e.devT += dt;
  seat.devSum += p.d * dt; seat.devT += dt;
  if (p.d > 0.8 * tol) {
    mistake(sim, seat, 'cut', seat.x, seat.z);
    spawn(sim, { k: 'pool', at: [seat.x, seat.z], r: 0.7, table: e.table });
    seat.stroke = null; seat.cool = 0.5;
    return;
  }
  if (p.s > e.s) {
    e.s = p.s;
    sim.events.push({ t: 'cutting', x: p.x, z: p.z, seat: seat.i, table: e.table });
  }
  if (e.s >= e.len - 0.08) {
    const dev = (e.devSum / Math.max(0.01, e.devT)) / tol;
    rate(sim, seat, rateBy(dev, 0.12, 0.3), seat.x, seat.z);
    addScar(sim, { k: 'cut', pts: e.pts, table: e.table, closed: !!e.closed });
    seat.stroke = null;
    complete(sim, seat, e);
  }
}

function sutureTool(sim, seat, use, dt) {
  const tol = sim.cfg.toolTolerance;
  if (!use) { seat.side = 0; return; }
  let best = null, bd = 1.6;
  for (const e of sim.ents) {
    if (KINDS[e.k].cls === 'nick' && e.table === seat.table && dist(seat.x, seat.z, e.x, e.z) < 0.35) { // one stitch closes a nick
      best = e; break;
    }
    if (KINDS[e.k].cls !== 'lac' || e.table !== seat.table || !visible(e)) continue;
    const p = project([e.a, e.b], seat.x, seat.z), d = p.d;
    if (d < bd) { best = e; bd = d; }
  }
  if (!best) return;
  if (best.k === 'nick') {
    if ((seat.nickT = (seat.nickT ?? 0) + dt) > 0.25) { seat.nickT = 0; rate(sim, seat, 'GOOD', best.x, best.z); sim.events.push({ t: 'sfx', id: 'knot', x: best.x, z: best.z, seat: seat.i }); complete(sim, seat, best); }
    return;
  }
  const e = best;
  const dx = e.b[0] - e.a[0], dz = e.b[1] - e.a[1], L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L;
  const rx = seat.x - e.a[0], rz = seat.z - e.a[1], along = rx * ux + rz * uz, perp = rx * -uz + rz * ux;
  const amp = 0.25;
  if (Math.abs(perp) < amp) return;
  const side = Math.sign(perp);
  if (seat.side === 0) { seat.side = side; return; }
  if (side === seat.side) return;
  seat.side = side;
  const slotAlong = ((e.tied + 0.5) / e.slots) * L;
  if (Math.abs(along - slotAlong) <= 0.4 * tol + 0.05) {
    const gap = e.lastTie < 0 ? 0.4 : sim.t - e.lastTie;
    e.tied++;
    e.lastTie = sim.t;
    seat.stitches++;
    const q = gap >= 0.2 && gap <= 0.7 ? 'CLEAN' : gap <= 1.4 ? 'GOOD' : 'SLOPPY';
    rate(sim, seat, q, seat.x, seat.z);
    sim.events.push({ t: 'stitch', n: e.tied, of: e.slots, x: slotAlong * ux + e.a[0], z: slotAlong * uz + e.a[1], table: e.table, seat: seat.i });
    if (e.tied >= e.slots) {
      addScar(sim, { k: 'sutured', a: e.a, b: e.b, n: e.slots, table: e.table });
      sim.events.push({ t: 'sfx', id: 'knot', x: e.x, z: e.z, seat: seat.i });
      complete(sim, seat, e);
    }
  } else {
    rate(sim, seat, 'SLOPPY', seat.x, seat.z);
    sim.events.push({ t: 'sfx', id: 'tick', x: seat.x, z: seat.z, seat: seat.i });
  }
}

function laserTool(sim, seat, use, dt) {
  let onTarget = null;
  for (const e of sim.ents) {
    if (KINDS[e.k].cls !== 'burn' || e.table !== seat.table || !visible(e) || e.shut) continue;
    if (dist(seat.x, seat.z, e.x, e.z) <= (e.size ?? 0.55) * sim.cfg.toolTolerance) { onTarget = e; break; }
  }
  sim.events.push({ t: 'beam', x: seat.x, z: seat.z, seat: seat.i, on: !!onTarget, table: seat.table });
  if (onTarget) {
    if (beatBlocked(sim, seat, onTarget)) return;
    const e = onTarget;
    const need = e.burnTime ?? sim.cfg.laserTime;
    e.heat += dt / need;
    if (e.heat >= 1) {
      if (e.isFalse) {
        mistake(sim, seat, 'false', e.x, e.z);
        sayKey(sim, 'false.cyst');
        complete(sim, seat, e);
        return;
      }
      rate(sim, seat, rateBy(seat.strayT, 0.1, 0.35), e.x, e.z);
      seat.strayT = 0;
      addScar(sim, { k: 'burn', x: e.x, z: e.z, table: e.table });
      sim.events.push({ t: 'sfx', id: 'sizzle', x: e.x, z: e.z, seat: seat.i });
      if (e.keep) { e.heat = 0; signal(sim, e.owner, e.sig, e, seat); } else complete(sim, seat, e);
    }
    return;
  }
  seat.strayT += dt;
  if (seat.strayT > 0.5) {
    seat.strayT = 0;
    addScar(sim, { k: 'burn', x: seat.x, z: seat.z, table: seat.table });
    mistake(sim, seat, 'burn', seat.x, seat.z);
  }
}

function scannerTool(sim, seat) {
  sim.events.push({ t: 'scan', x: seat.x, z: seat.z, seat: seat.i, table: seat.table });
  for (const e of sim.ents) {
    if (e.scan && !e.seen && e.table === seat.table && dist(seat.x, seat.z, e.x, e.z) <= 2.2) {
      e.seen = true;
      sim.events.push({ t: 'sfx', id: 'ping', x: e.x, z: e.z, seat: seat.i });
      sim.events.push({ t: 'revealed', k: e.k, x: e.x, z: e.z, id: e.id });
    }
    if (e.k === 'cyst' && e.table === seat.table && !e.tested && dist(seat.x, seat.z, e.x, e.z) <= 2.2) e.tested = true;
  }
}

function gelTool(sim, seat, use, dt) {
  const R = 0.8;
  let painted = false;
  for (const e of [...sim.ents]) {
    const c = KINDS[e.k].cls;
    if (c === 'nick' && e.table === seat.table && dist(seat.x, seat.z, e.x, e.z) <= R) {
      e.gelT = (e.gelT ?? 0) + dt;
      if (e.gelT >= 1) { sim.events.push({ t: 'sfx', id: 'heal', x: e.x, z: e.z, seat: seat.i }); complete(sim, seat, e); }
      painted = true;
    }
    if (c !== 'mask' || e.table !== seat.table || !visible(e)) continue;
    let touched = false;
    for (let i = 0; i < e.dots.length; i += 3) {
      if (!e.dots[i + 2] && dist(seat.x, seat.z, e.dots[i], e.dots[i + 1]) <= R) { e.dots[i + 2] = 1; e.painted++; touched = true; }
    }
    if (touched) {
      painted = true;
      if (e.first < 0) e.first = sim.t;
      if (e.painted / e.total >= e.need) {
        const took = sim.t - e.first, expect = (e.total * 0.09) / 2.2;
        rate(sim, seat, rateBy(took / Math.max(0.4, expect), 1.7, 3.2), seat.x, seat.z);
        addScar(sim, { k: 'gel', dots: e.dots.filter((_, i) => i % 3 !== 2), table: e.table });
        complete(sim, seat, e);
      }
    }
  }
  if (!painted && sim.def_film) {
    const near = sim.films.find((f) => f.table === seat.table && dist(f.x, f.z, seat.x, seat.z) < 0.5);
    if (near) near.t = 10;
    else { sim.films.push({ x: seat.x, z: seat.z, t: 10, table: seat.table }); if (sim.films.length > 32) sim.films.shift(); }
  }
  sim.events.push({ t: 'loop', id: 'gel', seat: seat.i, on: painted || sim.def_film });
}

function syringeTool(sim, seat, use, wasUse, dt) {
  if (use) {
    if (sim.doses <= 0) { if (!wasUse) sayKey(sim, 'reyes.noDoses'); return; }
    if (!seat.drawing) { seat.drawing = 0; }
    const before = seat.drawing;
    seat.drawing = Math.min(1, before + dt / 0.45);
    if (before < 1 && seat.drawing >= 1) sim.events.push({ t: 'sfx', id: 'syringeDraw', seat: seat.i, x: seat.x, z: seat.z });
    return;
  }
  if (wasUse && seat.drawing >= 1) {
    const [px, pz] = sim.port;
    const table = sim.tables[seat.table];
    sim.doses--;
    if (dist(seat.x, seat.z, px, pz) <= 1.1 * sim.cfg.toolTolerance) {
      addVitals(sim, seat.table, sim.cfg.syringeDose);
      sim.counters.doses = (sim.counters.doses ?? 0) + 1;
      sim.events.push({ t: 'sfx', id: 'inject', x: px, z: pz, seat: seat.i });
      sim.events.push({ t: 'inject', x: px, z: pz, seat: seat.i, table: seat.table });
      for (const e of sim.ents) if (e.k === 'strain') signal(sim, e.id, 'dose', e, seat);
    } else {
      rate(sim, seat, 'SLOPPY', seat.x, seat.z);
      sayKey(sim, 'reyes.missedRing');
    }
    void table;
  }
  seat.drawing = 0;
}

function dressingStep(sim, seat, use, dt) {
  const e = sim.ents.find((c) => c.k === 'dressing' && c.table === seat.table);
  if (!e) return false;
  const tip = pointAt(e.pts, e.s);
  const engaged = seat.dressing === e.id;
  if (!engaged && dist(seat.x, seat.z, tip[0], tip[1]) > 0.9) return false;
  if (!use) { seat.dressing = null; return engaged; }
  seat.dressing = e.id;
  const p = project(e.pts, seat.x, seat.z, e.s, 2);
  if (p.d < 1.4) {
    if (p.s > e.s) { e.s = p.s; e.devSum += p.d * dt; e.devT += dt; }
    if (e.s >= e.len - 0.1) {
      rate(sim, seat, rateBy((e.devSum / Math.max(0.01, e.devT)), 0.3, 0.7), seat.x, seat.z);
      sim.events.push({ t: 'sfx', id: 'bandage', x: e.x, z: e.z, seat: seat.i });
      addScar(sim, { k: 'dressing', pts: e.pts, table: e.table });
      seat.dressing = null;
      complete(sim, seat, e);
    }
  }
  return true;
}

function markerStep(sim, seat, dt) {
  for (const e of sim.ents) {
    if (e.k !== 'marker' || e.table !== seat.table) continue;
    if (dist(seat.x, seat.z, e.x, e.z) <= 0.7) {
      e.hover = (e.hover ?? 0) + dt;
      if (e.hover >= 0.25) { sim.events.push({ t: 'sfx', id: 'uiConfirm', x: e.x, z: e.z, seat: seat.i }); complete(sim, seat, e); return; }
    }
  }
}

/** Run one seat's tool for one step. `dt` is real time: The Quiet slows the world, not your hands. */
export function toolStep(sim, seat, inp) {
  const dt = DT;
  const use = inp.use ?? 0, wasUse = seat.useHeld;
  const held = use > 0.15;
  seat.cool = Math.max(0, seat.cool - dt);
  markerStep(sim, seat, dt);
  if (seat.grab) heldStep(sim, seat, held, inp.drop, inp.rot ?? 0, dt);
  else if (!dressingStep(sim, seat, held, dt)) {
    if (held || seat.tool === 'syringe') {
      switch (seat.tool) {
        case 'drain': drainTool(sim, seat, use, dt); break;
        case 'forceps': forcepsTool(sim, seat, held, dt); break;
        case 'scalpel': scalpelTool(sim, seat, held, dt); break;
        case 'suture': sutureTool(sim, seat, held, dt); break;
        case 'laser': laserTool(sim, seat, held, dt); break;
        case 'scanner': scannerTool(sim, seat); break;
        case 'gel': gelTool(sim, seat, held, dt); break;
        case 'syringe': syringeTool(sim, seat, held, wasUse, dt); break;
        default: break;
      }
    } else {
      seat.stroke = null; seat.side = 0; seat.dryT = Math.max(0, seat.dryT - dt);
      if (seat.tool === 'laser') seat.strayT = Math.max(0, seat.strayT - dt);
    }
    if (held && !wasUse) wrongToolCheck(sim, seat);
  }
  seat.useHeld = held;
}

function wrongToolCheck(sim, seat) {
  if (sim.t - sim.lastQuip < 3) return;
  for (const e of sim.ents) {
    if (e.table !== seat.table || !visible(e)) continue;
    const tool = toolFor(e);
    if (!tool || tool === seat.tool) continue;
    if (dist(seat.x, seat.z, e.x, e.z) < 0.5) {
      if (sim.ents.some((o) => toolFor(o) === seat.tool && o.table === seat.table && visible(o) && dist(seat.x, seat.z, o.x, o.z) < 0.5)) return;
      sim.lastQuip = sim.t;
      sim.events.push({ t: 'sfx', id: 'tick', x: seat.x, z: seat.z, seat: seat.i });
      sayKey(sim, 'reyes.wrongTool');
      return;
    }
  }
}
void clamp; void nextRandom;
