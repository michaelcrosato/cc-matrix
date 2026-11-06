// What crosses the wire. Flat integer arrays, positions times ten.
export const POS = 10;
const MAX_S = 1100;
export function encodeSnapshot(w, cursor = 0) {
  const flags = (h) => (h.dead ? 1 : 0) | (h.moving ? 2 : 0) | (h.state === 'dodge' ? 4 : 0) | (h.left ? 8 : 0);
  const heroes = w.heroes.map((h) => [h.id, Math.round(h.x * POS), Math.round(h.z * POS), Math.round(h.facing * 10), h.castSeq, Math.round(h.hp), Math.round(h.res), flags(h)]);
  const live = w.heroes.filter((h) => !h.left);
  const score = (m) => { let d = 1e9; for (const h of live) d = Math.min(d, (m.x - h.x) ** 2 + (m.z - h.z) ** 2); return d; };
  const awake = w.active.filter((m) => !m.dead);
  const sorted = awake.map((m) => [score(m), m]).sort((a, b) => a[0] - b[0]);
  const enc = (m) => [m.id, Math.round(m.x * POS), Math.round(m.z * POS), Math.round(m.facing * 10), Math.round(m.hp)];
  const monsters = []; const seen = new Set();
  for (const [, m] of sorted.slice(0, 24)) { monsters.push(enc(m)); seen.add(m.id); }
  const allies = w.allies.filter((a) => !a.dead).slice(0, 8).map((a) => [a.id, Math.round(a.x * POS), Math.round(a.z * POS), Math.round((a.facing ?? 0) * 10)]);
  const out = { k: 's', t: w.tick, h: heroes, m: monsters, a: allies };
  let size = JSON.stringify(out).length;
  // A rotating slice of the rest, while it fits.
  const rest = sorted.slice(24).filter(([d]) => d < 40 * 40).map(([, m]) => m);
  let cur = cursor; let n = 0;
  while (n < rest.length) {
    const m = rest[cur % rest.length]; cur++; n++;
    const e = enc(m); const add = JSON.stringify(e).length + 1;
    if (size + add > MAX_S) break;
    monsters.push(e); size += add;
  }
  return { msg: out, cursor: cur };
}
export const HERO_FLAGS = { dead: 1, moving: 2, dodge: 4, left: 8 };
// Host-only bookkeeping events never leave the host.
export const LOCAL_EVENTS = new Set(['sheet', 'save', 'music', 'tutorial']);
// Every copy forwards what it has; what doesn't fit waits for the next batch.
export function batchEvents(queue, maxBytes = 12000) {
  const out = []; let size = 20;
  while (queue.length) { const s = JSON.stringify(queue[0]).length + 1; if (size + s > maxBytes) break; out.push(queue.shift()); size += s; }
  return out;
}
export function heroSheet(h) { return { id: h.id, level: h.level, xp: Math.round(h.xp), gold: h.gold, gear: h.gear, inv: h.inv, mats: h.mats, gems: h.gems, slots: h.slots, vows: h.vows, reliquary: h.reliquary, levelPicks: h.levelPicks.map((p) => ({ opts: p.opts, t: p.t })), cls: h.cls, newest: h.newest, name: h.name }; }
export const compactIntent = (it) => ({ k: 'i', x: Math.round(it.moveX * 100), z: Math.round(it.moveZ * 100), ax: Math.round((it.aimX ?? 0) * 100), az: Math.round((it.aimZ ?? 0) * 100), tx: it.tx !== undefined ? Math.round(it.tx * POS) : undefined, tz: it.tz !== undefined ? Math.round(it.tz * POS) : undefined, hd: it.hardAim ? 1 : 0, b: Object.keys(it.held ?? {}).join(',') });
export const expandIntent = (m) => ({ moveX: m.x / 100, moveZ: m.z / 100, aimX: m.ax / 100, aimZ: m.az / 100, tx: m.tx !== undefined ? m.tx / POS : undefined, tz: m.tz !== undefined ? m.tz / POS : undefined, hardAim: !!m.hd, held: Object.fromEntries((m.b ? m.b.split(',') : []).map((k) => [k, true])), pressed: {} });
