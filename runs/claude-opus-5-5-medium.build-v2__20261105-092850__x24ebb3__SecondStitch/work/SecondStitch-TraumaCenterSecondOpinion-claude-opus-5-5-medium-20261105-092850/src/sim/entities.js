// Entity kinds: which tool acts on each, how much each bleeds, and how a stage's spawn data becomes state.
import { circle, curve, dist, polyLength, smoothPath } from './geom.js';

/** k -> the tool that works it, and its class of handling. */
export const KINDS = {
  marker: { tool: null, cls: 'marker' },
  pool: { tool: 'drain', cls: 'pool', bleed: 1 },
  bleeder: { tool: 'drain', cls: 'pool', bleed: 1 },
  nick: { tool: 'gel', cls: 'nick', bleed: 0.25 },
  laceration: { tool: 'suture', cls: 'lac', bleed: 0.5 },
  incision: { tool: 'scalpel', cls: 'cut' },
  dressing: { tool: null, cls: 'dressing' },
  hook: { tool: 'forceps', cls: 'pull' },
  prop: { tool: 'forceps', cls: 'pull' },
  magnet: { tool: 'forceps', cls: 'pull' },
  tumor: { tool: 'forceps', cls: 'pull' },
  core: { tool: 'forceps', cls: 'pull' },
  stalk: { tool: 'forceps', cls: 'pull' },
  plate: { tool: 'forceps', cls: 'pull' },
  organ: { tool: 'forceps', cls: 'pull' },
  fragment: { tool: 'forceps', cls: 'place' },
  clamp: { tool: 'forceps', cls: 'place' },
  graft: { tool: 'forceps', cls: 'place' },
  polyp: { tool: 'laser', cls: 'burn' },
  egg: { tool: 'laser', cls: 'burn' },
  eye: { tool: 'laser', cls: 'burn' },
  cyst: { tool: 'laser', cls: 'burn' },
  clot: { tool: 'laser', cls: 'burn' },
  mask: { tool: 'gel', cls: 'mask' },
  strain: { tool: null, cls: 'strain' },
};

export const visible = (e) => !e.hiddenBy && (!e.scan || e.seen);

/** What a stage's `spawn` entry becomes. Everything stays plain data. */
export function makeEntity(sim, d) {
  const at = d.at ?? [0, 0];
  const e = { ...d, id: sim.nextId++, sid: d.id ?? null, x: at[0], z: at[1], table: d.table ?? 0 };
  delete e.at;
  const kind = KINDS[d.k];
  if (!kind) throw new Error(`unknown entity kind ${d.k}`);
  switch (kind.cls) {
    case 'pool': e.r = d.r ?? 1; e.r0 = e.r; e.waste = 0; break;
    case 'lac': {
      const a = d.a ?? [e.x - 1, e.z], b = d.b ?? [e.x + 1, e.z];
      e.a = a; e.b = b; e.x = (a[0] + b[0]) / 2; e.z = (a[1] + b[1]) / 2;
      e.slots = Math.max(1, Math.round(dist(a[0], a[1], b[0], b[1]) / 0.45));
      e.tied = 0; e.lastTie = -1;
      break;
    }
    case 'cut': case 'dressing': {
      let pts = d.pts;
      if (d.circle) pts = circle(d.circle[0], d.circle[1], d.circle[2], d.circle[3] ?? d.circle[2]);
      else if (d.line) pts = [d.line[0], d.line[1]];
      else if (d.smooth) pts = smoothPath(d.smooth);
      e.pts = pts; e.len = polyLength(pts); e.s = 0; e.devSum = 0; e.devT = 0;
      e.x = pts[0][0]; e.z = pts[0][1];
      delete e.circle; delete e.line; delete e.smooth;
      break;
    }
    case 'pull': {
      let pts = d.pts;
      if (!pts) pts = curve(at, d.dir ?? [0, 1], d.pull ?? 1.2, d.arc ?? 0);
      e.pts = pts; e.len = polyLength(pts); e.s = 0; e.devSum = 0; e.devT = 0; e.free = false; e.x0 = e.x; e.z0 = e.z; e.rushT = 0;
      delete e.dir; delete e.arc; delete e.pull;
      break;
    }
    case 'place': e.rot = d.rot ?? 0; e.placed = false; e.x0 = e.x; e.z0 = e.z; break;
    case 'burn': e.heat = 0; break;
    case 'mask': {
      const dots = [];
      if (d.rect) {
        const [cx, cz, w, h] = d.rect, step = 0.3;
        for (let z = cz - h / 2 + step / 2; z < cz + h / 2; z += step) for (let x = cx - w / 2 + step / 2; x < cx + w / 2; x += step) dots.push(+x.toFixed(2), +z.toFixed(2), 0);
        e.x = cx; e.z = cz;
      } else if (d.path) {
        const pts = d.path;
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i], l = dist(a[0], a[1], b[0], b[1]), n = Math.max(1, Math.round(l / 0.3));
          for (let k = 0; k <= n; k++) { const t = k / n; dots.push(+(a[0] + (b[0] - a[0]) * t).toFixed(2), +(a[1] + (b[1] - a[1]) * t).toFixed(2), 0); }
        }
        e.x = pts[0][0]; e.z = pts[0][1];
      }
      e.dots = dots; e.total = dots.length / 3; e.painted = 0; e.need = d.need ?? 0.92; e.first = -1;
      delete e.rect; delete e.path;
      break;
    }
    default: break;
  }
  return e;
}

export function spawn(sim, d) {
  const e = makeEntity(sim, d);
  if (e.hiddenBy && !sim.ents.some((o) => o.sid === e.hiddenBy)) delete e.hiddenBy;
  sim.ents.push(e);
  sim.events.push({ t: 'spawn', k: e.k, x: e.x, z: e.z, table: e.table, id: e.id });
  return e;
}

export const entById = (sim, id) => sim.ents.find((e) => e.id === id) ?? null;
export const entBySid = (sim, sid) => sim.ents.find((e) => e.sid === sid) ?? null;

/** Remove an entity; whatever hid under it comes up. */
export function removeEnt(sim, e) {
  const i = sim.ents.indexOf(e);
  if (i >= 0) sim.ents.splice(i, 1);
  if (e.sid) for (const o of sim.ents) if (o.hiddenBy === e.sid) { delete o.hiddenBy; sim.events.push({ t: 'revealed', k: o.k, x: o.x, z: o.z }); }
  for (const s of sim.seats) if (s.grab === e.id) s.grab = null;
}

/** Tool name for an entity right now (locked things have none). */
export function toolFor(e) {
  if (e.locked) return null;
  if (e.needTool) return e.needTool;
  return KINDS[e.k].tool;
}

/** The point a tool should aim at to work this entity. */
export function aimPoint(e) {
  const c = KINDS[e.k].cls;
  if (c === 'cut' || c === 'dressing') { const p = pointAtS(e); return p; }
  if (c === 'lac') { const t = (e.tied + 0.5) / e.slots; return [e.a[0] + (e.b[0] - e.a[0]) * t, e.a[1] + (e.b[1] - e.a[1]) * t]; }
  return [e.x, e.z];
}
function pointAtS(e) {
  let left = e.s, pts = e.pts;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = dist(a[0], a[1], b[0], b[1]);
    if (left <= l) { const t = l ? left / l : 0; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
    left -= l;
  }
  const end = pts[pts.length - 1];
  return [end[0], end[1]];
}

/** Everything the given tool could work on a table, for pulses, the hint marker and aim assist. */
export function validTargets(sim, tool, table = 0) {
  const out = [];
  for (const e of sim.ents) {
    if ((e.table ?? 0) !== table || !visible(e) || e.locked) continue;
    if (KINDS[e.k].cls === 'dressing' || KINDS[e.k].cls === 'marker') { out.push(e); continue; }
    if (toolFor(e) === tool) out.push(e);
  }
  return out;
}
