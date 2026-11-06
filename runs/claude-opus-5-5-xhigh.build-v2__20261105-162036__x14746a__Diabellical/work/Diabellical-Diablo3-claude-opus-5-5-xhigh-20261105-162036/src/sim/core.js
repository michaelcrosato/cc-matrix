// Shared low-level helpers for the sim: events, ids, geometry, queries. No THREE, no DOM.
export const DT = 1 / 60;

export const ev = (w, e) => { w.events.push(e); return e; };
export const nextId = (w) => w.nextId++;
export const dist2 = (ax, az, bx, bz) => (ax - bx) ** 2 + (az - bz) ** 2;
export const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const round1 = (v) => Math.round(v * 10) / 10;

export const walkable = (w, x, z) => w.zone.nav.walkable(x, z);

/** A square body test against the grid. */
export function blocked(w, x, z, r) {
  const n = w.zone.nav;
  return !(n.walkable(x - r, z - r) && n.walkable(x + r, z - r) && n.walkable(x - r, z + r) && n.walkable(x + r, z + r));
}

/** Move an entity with axis-separated sliding. */
export function slide(w, e, dx, dz, radius = null) {
  const r = (radius ?? e.r) * 0.8;
  // Already overlapping a wall (a blink, a shove): walk out by the centre, or stay put.
  if (blocked(w, e.x, e.z, r)) {
    if (w.zone.nav.walkable(e.x + dx, e.z + dz)) { e.x += dx; e.z += dz; return true; }
    return false;
  }
  let moved = false;
  if (dx && !blocked(w, e.x + dx, e.z, r)) { e.x += dx; moved = true; }
  if (dz && !blocked(w, e.x, e.z + dz, r)) { e.z += dz; moved = true; }
  return moved;
}

/** The last resort: a body whose centre is inside something solid steps to the nearest open floor. */
export function unstick(w, e) {
  if (w.zone.nav.walkable(e.x, e.z)) return false;
  for (let r = 0.5; r < 14; r += 0.5) {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const x = e.x + Math.cos(a) * r, z = e.z + Math.sin(a) * r;
      if (w.zone.nav.walkable(x, z)) { e.x = x; e.z = z; return true; }
    }
  }
  return false;
}

export const aliveHeroes = (w) => w.heroes.filter((h) => !h.dead && !h.gone);
export const inFacingCone = (fx, fz, dx, dz, cosHalf) => {
  const l = Math.hypot(dx, dz) || 1;
  return (fx * dx + fz * dz) / l >= cosHalf;
};

/** All live enemies whose body touches a circle. Allocates a list; hits are few per second. */
export function enemiesIn(w, x, z, r) {
  const out = [];
  for (const m of w.monsters) {
    if (m.dead || m.hidden) continue;
    const rr = r + m.r;
    if (dist2(m.x, m.z, x, z) <= rr * rr) out.push(m);
  }
  return out;
}

export function nearestEnemy(w, x, z, r, filter = null) {
  let best = null, bd = r * r;
  for (const m of w.monsters) {
    if (m.dead || m.hidden || (filter && !filter(m))) continue;
    const d = dist2(m.x, m.z, x, z);
    if (d < bd) { bd = d; best = m; }
  }
  return best;
}

export const heroById = (w, id) => w.heroes.find((h) => h.id === id) ?? null;
export const monsterById = (w, id) => w.monsters.find((m) => m.id === id) ?? null;

export function setCellOpen(w, col, row, open) {
  for (const n of w.zone.navs) n.setOpen(col, row, open);
}

export function say(w, who, text) { ev(w, { t: 'sub', who, text }); }
export function toast(w, text, color = 'white', o = {}) { ev(w, { t: 'toast', text, color, ...o }); }
