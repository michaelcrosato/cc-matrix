// What can be on the field, as plain data: spawning, which tool each kind wants, and what is left to do.
import { arcPath, circlePath, pathAt, pathLength } from '../core/geom.js';

export const TOOLS = ['scalpel', 'forceps', 'suture', 'drain', 'syringe', 'gel', 'laser', 'scanner'];
export const POOL_KINDS = new Set(['pool', 'bleeder']);
export const PULL_KINDS = new Set(['hook', 'prop', 'magnet', 'tumor', 'organ', 'core', 'stalk', 'plate', 'debris', 'unclamp']);
export const CARRY_KINDS = new Set(['clamp', 'fragment', 'donor']);
export const LASER_KINDS = new Set(['polyp', 'egg', 'cyst', 'eye', 'halo', 'clot', 'burnspot']);
export const CUT_KINDS = new Set(['incision']);

export const GEL_COLS = 33, GEL_ROWS = 19;
export const gelCell = (x, z) => {
  const c = Math.round((x + 8) / 0.5), r = Math.round((z + 4.5) / 0.5);
  return c < 0 || r < 0 || c >= GEL_COLS || r >= GEL_ROWS ? -1 : r * GEL_COLS + c;
};

/** Turn a data spec from an op file into a live entity (plain data). Does not add it to the sim. */
export function makeEnt(sim, spec) {
  const at = spec.at ?? [spec.x ?? 0, spec.z ?? 0];
  const n = sim.nextId++;
  const e = { ...spec, n, id: spec.id ?? `e${n}`, k: spec.k, table: spec.table ?? 0, x: at[0], z: at[1], hidden: !!spec.hidden, locked: !!spec.locked, task: spec.task ?? true, age: 0 };
  delete e.at;
  if (e.hiddenBy) e.hidden = true;
  switch (true) {
    case POOL_KINDS.has(e.k): {
      e.r = spec.r ?? 1;
      e.r0 = e.r;
      e.grow = spec.grow ?? (e.k === 'bleeder' ? 0.22 : 0);
      e.max = spec.max ?? e.r * 1.6;
      e.wasted = 0;
      break;
    }
    case e.k === 'nick': {
      e.r = spec.r ?? 0.28;
      e.gelT = 0;
      e.task = spec.task ?? false;
      break;
    }
    case PULL_KINDS.has(e.k): {
      if (spec.path) e.path = spec.path;
      else e.path = arcPath(at, spec.dir ?? -90, spec.pull ?? 1.2, spec.arc ?? 0);
      e.len = pathLength(e.path);
      e.s = 0;
      e.free = false;
      e.devSum = 0;
      e.devT = 0;
      e.speed = 0;
      e.home = [e.x, e.z];
      e.rot = spec.rot ?? 0;
      break;
    }
    case CARRY_KINDS.has(e.k): {
      e.home = [e.x, e.z];
      e.rot = spec.rot ?? 0;
      e.rotTo = spec.rotTo ?? null;
      e.tol = spec.tol ?? 0.6;
      e.placed = false;
      break;
    }
    case e.k === 'incision' || e.k === 'dressing': {
      if (spec.ring) e.path = circlePath(at[0], at[1], spec.ring, Math.max(16, Math.round(spec.ring * 18)));
      else if (spec.path) e.path = spec.path;
      else e.path = arcPath(at, spec.ang ?? 0, spec.len ?? 2, spec.arc ?? 0);
      e.len = pathLength(e.path);
      e.s = 0;
      e.devSum = 0;
      e.devLen = 0;
      const p = pathAt(e.path, 0);
      e.x = p[0];
      e.z = p[1];
      break;
    }
    case e.k === 'laceration': {
      e.len = spec.len ?? 2;
      e.a = ((spec.ang ?? 0) * Math.PI) / 180;
      e.slots = Math.max(2, Math.floor(e.len / 0.45) + 1);
      e.next = 0;
      e.flip = 0;
      e.lastTie = -1;
      e.q = 0;
      e.misses = 0;
      e.bleed = spec.bleed ?? true;
      break;
    }
    case LASER_KINDS.has(e.k): {
      e.r = spec.r ?? 0.34;
      e.heat = 0;
      e.stray = 0;
      break;
    }
    case e.k === 'mask': {
      e.cells = [];
      if (spec.path) {
        for (let i = 0; i < spec.path.length - 1; i++) {
          const a = spec.path[i], b = spec.path[i + 1];
          const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.3));
          for (let j = 0; j <= n; j++) {
            const t = j / n;
            const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
            if (!e.cells.some((c) => Math.hypot(c[0] - x, c[1] - z) < 0.15)) e.cells.push([round2(x), round2(z), 0]);
          }
        }
      } else {
        const rx = spec.rx ?? 1.2, rz = spec.rz ?? 1;
        for (let z = -rz; z <= rz + 1e-6; z += 0.35) {
          for (let x = -rx; x <= rx + 1e-6; x += 0.35) {
            if ((x * x) / (rx * rx) + (z * z) / (rz * rz) <= 1.04) e.cells.push([round2(at[0] + x), round2(at[1] + z), 0]);
          }
        }
      }
      e.need = spec.need ?? 0.92;
      e.painted = 0;
      break;
    }
    default:
      break;
  }
  return e;
}
const round2 = (v) => Math.round(v * 100) / 100;

/** Which tool this entity wants right now, and where to bring it. null: nothing to do with it (yet). */
export function taskOf(sim, e) {
  if (e.dead || e.inert) return null;
  if (e.hidden) return e.scanHidden !== false && !e.hiddenBy ? { tool: 'scanner', x: e.x, z: e.z } : null;
  if (e.locked) return null;
  if (POOL_KINDS.has(e.k)) return { tool: 'drain', x: e.x, z: e.z };
  if (e.k === 'nick') return { tool: 'gel', x: e.x, z: e.z };
  if (PULL_KINDS.has(e.k)) return { tool: 'forceps', x: e.x, z: e.z };
  if (CARRY_KINDS.has(e.k)) return e.placed ? null : { tool: 'forceps', x: e.x, z: e.z };
  if (e.k === 'incision') {
    const p = pathAt(e.path, e.s);
    return { tool: 'scalpel', x: p[0], z: p[1] };
  }
  if (e.k === 'dressing') {
    const p = pathAt(e.path, e.s);
    return { tool: 'dressing', x: p[0], z: p[1] };
  }
  if (e.k === 'laceration') {
    const sl = stitchPoint(e, e.next);
    return { tool: 'suture', x: sl[0], z: sl[1] };
  }
  if (LASER_KINDS.has(e.k)) {
    if (e.k === 'cyst' && !e.scanned) return { tool: 'scanner', x: e.x, z: e.z };
    if (e.k === 'cyst' && !e.real) return null;
    return { tool: 'laser', x: e.x, z: e.z };
  }
  if (e.k === 'mask') {
    const c = e.cells.find((m) => !m[2]);
    return c ? { tool: 'gel', x: c[0], z: c[1] } : null;
  }
  if (e.k === 'marker') return { tool: 'marker', x: e.x, z: e.z };
  return null;
}

/** Field position of stitch slot i, respecting which end the surgeon started from. */
export function stitchPoint(e, i) {
  const n = e.slots - 1;
  const u = ((e.flip < 0 ? n - i : i) / n) * e.len;
  return [e.x + Math.cos(e.a) * u, e.z + Math.sin(e.a) * u];
}

/** Is this one still in the way of a stage clearing? */
export const isOpenTask = (e) => !e.dead && e.task && !e.inert;

/** The nearest thing the seat could usefully do, for the hint diamond and the bot. */
export function nextTask(sim, seat, onlyTool = null) {
  let best = null, bestScore = Infinity;
  for (const e of sim.ents) {
    if (e.table !== seat.table) continue;
    if (!e.task && e.k !== 'nick') continue;
    const t = taskOf(sim, e);
    if (!t) continue;
    if (t.tool !== 'dressing' && t.tool !== 'marker' && !sim.tools.includes(t.tool)) continue;
    if (onlyTool && t.tool !== onlyTool) continue;
    const pri = TASK_PRIORITY[e.k] ?? 2;
    const score = pri * 20 + Math.hypot(t.x - seat.x, t.z - seat.z);
    if (score < bestScore) { bestScore = score; best = { e, ...t }; }
  }
  return best;
}
const TASK_PRIORITY = { pool: 0, bleeder: 0, core: 0, stalk: 0, eye: 1, incision: 1, nick: 4, mask: 3, laceration: 2, dressing: 5 };

/** Every entity the current tool could act on, for aim assist and the soft pulse. */
export function validTargets(sim, seat, tool) {
  const out = [];
  for (const e of sim.ents) {
    if (e.table !== seat.table) continue;
    const t = taskOf(sim, e);
    if (t && t.tool === tool) out.push(t);
  }
  return out;
}
