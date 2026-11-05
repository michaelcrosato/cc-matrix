// The type registry (WP.TYPES: the bestiary, vehicles, friendlies, props, pickups, projectiles) and the hit shapes
// every hittable thing produces in screen space each step (WP.Hit).
(() => {
const E = My3D2dge, WP = globalThis.WP, { clamp } = WP;

// calibrated drawn heights (px at rig view scale 1, standing), measured from the engine's own drawing (dev/spike.html)
WP.RIG_H = { chibi: 38 / 1.3, bulky: 47 / 1.55, coat: 39 / 1.35 };
WP.KNEEL = 31 / 38; WP.CROUCH = 32 / 38;

const T = WP.TYPES = {};
const inf = (id, o) => { T[id] = Object.assign({ id, kind: 'infantry', quota: 'soldier', hp: 1, score: 100, size: 1.3, build: 'chibi', headMul: 2 }, o); };
// ---------- the Hyena Legion (8.4, VETERAN values) ----------
inf('rifleman', { name: 'RIFLEMAN', fire: { tele: 1.3, bullets: [1, 2], acc: .45, dmg: 3.5 } });
inf('grenadier', { name: 'GRENADIER', hp: 2, score: 150, throws: { proj: 'grenade', tele: .6 } });
inf('knife', { name: 'KNIFE', size: 1.25, score: 200, throws: { proj: 'knife', tele: .6 } });
inf('brute', { name: 'BRUTE', hp: 8, size: 1.55, build: 'bulky', score: 500, headMul: 4, fire: { tele: 1.6, bullets: [5, 5], acc: .30, dmg: 4 } });
inf('rpg', { name: 'RPG', hp: 2, score: 300, fire: { tele: 1.5, proj: 'rocket' } });
inf('sniper', { name: 'SNIPER', score: 400, fire: { tele: 2.4, bullets: [1, 1], acc: .85, dmg: 10, glint: true } });
inf('mortar', { name: 'MORTAR', size: 1.2, score: 200, fire: { tele: 6, proj: 'mortar', noRing: true } });
inf('officer', { name: 'OFFICER', hp: 2, size: 1.35, build: 'coat', score: 600, whistle: 2 });
inf('para', { name: 'PARATROOPER', score: 150, fire: { tele: 1.3, bullets: [1, 2], acc: .45, dmg: 3.5 } });
// ---------- vehicles, boats, aircraft (8.5) ----------
const veh = (id, o) => { T[id] = Object.assign({ id, kind: 'vehicle', quota: 'vehicle' }, o); };
veh('jeep', { name: 'SCAVENGER', hp: 14, score: 1000, shape: 'jeep', sc: 1.8, box: [21, 34, 15], speed: 80, gunners: [[0, -4, 13]], gfire: { tele: 1.2, bullets: [3, 3], acc: .45, dmg: 4 } });
veh('truck', { name: 'HAULER', hp: 20, score: 1200, shape: 'truck', sc: 1.8, box: [21, 56, 26], speed: 60, unload: 4 });
veh('apc', { name: 'BADGER', hp: 32, score: 2000, shape: 'apc', sc: 1.8, box: [25, 52, 20], speed: 40, unload: 3, tfire: { tele: 1.8, proj: 'rocket', every: 5 } });
veh('tank', { name: 'MAULER', hp: 48, score: 3000, shape: 'tank', sc: 1.8, box: [30, 50, 18], speed: 30, tfire: { tele: 2.0, proj: 'shell', every: 5.5 } });
veh('skiff', { name: 'SKIFF', kind: 'boat', quota: 'boat', hp: 10, score: 800, shape: 'skiff', sc: 1.8, box: [16, 40, 6], speed: 70, gunners: [[0, 6, 6], [0, -10, 6]], gfire: { tele: 1.3, bullets: [1, 2], acc: .45, dmg: 4 } });
veh('gunboat', { name: 'PATROL BOAT', kind: 'boat', quota: 'boat', hp: 26, score: 1500, shape: 'gunboat', sc: 1.8, box: [24, 64, 20], speed: 50, tfire: { tele: 1.4, bullets: [4, 4], acc: .45, dmg: 4, every: 3.5 } });
veh('heli', { name: 'VULTURE', kind: 'air', quota: 'air', hp: 34, score: 3000, shape: 'heli', sc: 2, box: [18, 50, 16], bz: -3, speed: 90, tfire: { tele: 1.6, bullets: [6, 6], acc: .35, dmg: 3, every: 4 }, missiles: 7 });
veh('samtruck', { name: 'SAM TRUCK', hp: 16, score: 2000, shape: 'truck', sc: 1.8, box: [21, 56, 26], speed: 0, quota: null });
veh('forklift', { name: 'FORKLIFT', hp: 6, score: 300, shape: 'forklift', sc: 1.6, box: [12, 26, 20], speed: 45, quota: null, carry: 'gbox' });
veh('cargoPlane', { name: 'CARGO PLANE', kind: 'air', quota: null, hp: 9999, score: 0, shape: 'cargoPlane', sc: 2, box: [0, 0, 0], speed: 120, scenery: true });
veh('friendTruck', { name: 'FRIENDLY TRUCK', quota: null, hp: 9999, score: 0, shape: 'truckFriendly', sc: 1.8, box: [21, 56, 26], speed: 60, friendly: true });
// ---------- bosses (8.7): parts per phase in 25-bosses.js ----------
const boss = (id, o) => { T[id] = Object.assign({ id, kind: 'boss', quota: null, hp: 1 }, o); };
boss('bigEar', { name: "SIGNAL TRUCK 'BIG EAR'", score: 10000, shape: 'bigEar', sc: 1.8, box: [24, 80, 30] });
boss('crocodile', { name: "GUNBOAT 'CROCODILE'", score: 14000, shape: 'crocodile', sc: 2, box: [32, 88, 26] });
boss('warthog', { name: "HALF-TRACK 'WARTHOG'", score: 18000, shape: 'halftrack', sc: 1.8, box: [22, 64, 22] });
boss('ironHog', { name: "ARMORED TRAIN 'IRON HOG'", score: 22000, shape: 'locomotive', sc: 1.8, box: [20, 64, 30] });
boss('tusk', { name: 'THE WARDEN, MAJOR TUSK', score: 26000, shape: 'bossTower', sc: 1.6, box: [36, 30, 86] });
boss('hyenaOne', { name: "GUNSHIP 'HYENA ONE'", score: 30000, shape: 'hyenaOne', sc: 2.2, box: [24, 76, 22], bz: -4 });
// ---------- friendlies ----------
T.villager = { id: 'villager', kind: 'civ', size: 1.25, build: 'chibi', hp: 1 };
T.medic = { id: 'medic', kind: 'civ', size: 1.25, build: 'chibi', hp: 1 };
T.reporter = { id: 'reporter', kind: 'civ', size: 1.25, build: 'chibi', hp: 1, reporter: true };
T.hostage = { id: 'hostage', kind: 'hostage', size: 1.25, build: 'chibi', hp: 3 };
for (const a of ['goat', 'chicken', 'pig', 'parrot', 'monkey', 'seagull']) T[a] = { id: a, kind: 'animal', hp: 1, R: { goat: 7, chicken: 4, pig: 7, parrot: 4, monkey: 5, seagull: 4 }[a], fly: a === 'parrot' || a === 'seagull' };
T.dummy = { id: 'dummy', kind: 'infantry', quota: null, hp: 3, score: 50, size: 1.3, build: 'chibi', headMul: 2, name: 'DUMMY' };
// ---------- props (7.12) ----------
const prop = (id, o) => { T[id] = Object.assign({ id, kind: 'prop' }, o); };
prop('crate', { hp: 3, shape: 'woodCrate', sc: .95, box: [13, 13, 12], drop: .6, mat: 'wood' });
prop('ammoCrate', { hp: 3, shape: 'ammoCrate', sc: 1, box: [17, 11, 10], drop: 1, ammo: true, mat: 'wood' });
prop('barrel', { hp: 4, shape: 'redBarrel', sc: 1.1, box: [10, 10, 14], blast: { r: 48, dmg: 10 }, mat: 'metal' });
prop('sandbags', { hp: 40, shape: 'sandbags', sc: 1.5, box: [34, 10, 10], cover: true, mat: 'dirt', grenadeDmg: 15 });
prop('mast', { hp: 25, shape: 'radioMast', sc: 1.5, box: [8, 6, 8], mat: 'metal', objective: 'masts' });
prop('fuelTank', { hp: 12, shape: 'fuelTank', sc: 1.5, box: [32, 16, 17], cover: true, blast: { r: 90, dmg: 20 }, mat: 'metal' });
prop('searchlight', { hp: 2, shape: 'searchlight', sc: 1.4, box: [8, 8, 8], mat: 'glass' });
prop('rope', { hp: 6, shape: null, box: [4, 4, 10], mat: 'wood' });
prop('ammoWagon', { hp: 4, shape: 'ammoWagon', sc: 1.8, box: [20, 50, 22], blast: { r: 70, dmg: 30 }, mat: 'wood' });
prop('fuelTruck', { hp: 10, shape: 'fuelTruck', sc: 1.8, box: [21, 56, 26], blast: { r: 70, dmg: 18 }, cover: true, mat: 'metal' });
prop('shutter', { hp: 1, shape: null, box: [10, 2, 12], mat: 'wood' });
prop('wreck', { hp: 9999, shape: null, sc: 1.8, box: [20, 34, 10], cover: true, mat: 'metal' });
prop('target', { hp: 9999, shape: 'rangeTarget', sc: 1.5, box: [10, 3, 26], mat: 'wood' });
// ---------- pickups (7.13) ----------
WP.PICKUPS = {
  mag: { name: 'MAG' }, crate: { name: 'AMMO CRATE' }, gren: { name: 'GRENADE' }, gbox: { name: 'GRENADE BOX' },
  ration: { name: 'RATION' }, medkit: { name: 'MEDKIT' }, fury: { name: 'FURY' }, dynamite: { name: 'DYNAMITE' },
  flare: { name: 'FLARE' }, intel: { name: 'INTEL' }, fang: { name: 'WOLF FANG' }
};
// ---------- projectiles (7.7) ----------
WP.PROJ = {
  grenade: { T: 1.3, hits: 1, r: 4, dmg: 12, score: 50, apex: 25 },
  knife: { T: .85, hits: 1, r: 4.5, dmg: 6, score: 100, apex: 6 },
  rocket: { T: 1.6, hits: 1, r: 4, dmg: 13, score: 150, apex: 0, wobble: 2 },
  missile: { T: 1.8, hits: 1, r: 4, dmg: 15, score: 200, apex: 10, home: true },
  mortar: { T: 3, hits: 1, r: 4, dmg: 10, score: 100, apex: 0, marker: true, drop: .55 },
  shell: { T: .8, hits: 2, r: 6, dmg: 18, score: 250, apex: 0 },
  flame: { T: 1.2, hits: 0, r: 10, dmg: 12, score: 0, apex: 0, ground: true },
  steam: { T: .01, hits: 0, r: 1, dmg: 10, score: 0, apex: 0 }
};

// ---------- hit shapes (7.2) ----------
// a shape: { e (entity), part, D (depth), kind: 'c' | 'r' | 'p', cx, cy, r | x0, y0, x1, y1 | pts, cover }
const Hit = WP.Hit = {};
Hit.rigH = (tp, e) => {
  const base = tp.build === 'bulky' ? WP.RIG_H.bulky : tp.build === 'coat' ? WP.RIG_H.coat : WP.RIG_H.chibi;
  let h = base * (e.size || tp.size || 1.3);
  if (e.pose === 'kneel') h *= WP.KNEEL; else if (e.pose === 'crouch') h *= WP.CROUCH;
  return h;
};
// the world height of a humanoid (units, standing), for explosions and anchors
Hit.worldH = tp => (tp.build === 'bulky' ? WP.RIG_H.bulky : tp.build === 'coat' ? WP.RIG_H.coat : WP.RIG_H.chibi) * (tp.size || 1.3);
const inPoly = (pts, x, y) => {
  let ins = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi + 1e-9) + xi) ins = !ins;
  }
  return ins;
};
Hit.contains = (s, x, y, grow = 0) => {
  if (s.kind === 'c') return (x - s.cx) ** 2 + (y - s.cy) ** 2 <= (s.r + grow) ** 2;
  if (s.kind === 'r') return x >= s.x0 - grow && x <= s.x1 + grow && y >= s.y0 - grow && y <= s.y1 + grow;
  if (grow) { const b = s.bb; if (x < b[0] - grow || x > b[2] + grow || y < b[1] - grow || y > b[3] + grow) return false; if (inPoly(s.pts, x, y)) return true; return x >= b[0] - grow && x <= b[2] + grow && y >= b[1] - grow && y <= b[3] + grow && Math.min(Math.abs(x - b[0]), Math.abs(x - b[2]), Math.abs(y - b[1]), Math.abs(y - b[3])) <= grow; }
  const b = s.bb; if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) return false;
  return inPoly(s.pts, x, y);
};
Hit.center = s => s.kind === 'c' ? [s.cx, s.cy] : s.kind === 'r' ? [(s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2] : [(s.bb[0] + s.bb[2]) / 2, (s.bb[1] + s.bb[3]) / 2];
const hull = pts => {
  pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  lo.pop(); up.pop(); return lo.concat(up);
};
Hit.hull = hull;
/** the projected hull of a box (w across, d along, h up; its front along facing) at (x, y, z) */
Hit.boxPoly = (view, x, y, z, box, facing, sc = 1) => {
  const w = box[0] * sc, d = box[1] * sc, h = box[2] * sc; c = Math.cos(facing), s = Math.sin(facing), pts = [];
  for (const a of [-1, 1]) for (const b of [-1, 1]) for (const zz of [0, h]) {
    const fx = b * d / 2, sx = a * w / 2;   // forward along facing, side across
    const wx = x + c * fx - s * sx, wy = y + s * fx + c * sx, p = view.project(wx, wy, z + zz);
    if (!p) return null; pts.push([p[0], p[1]]);
  }
  const H = hull(pts); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [px, py] of H) { x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py); }
  return { kind: 'p', pts: H, bb: [x0, y0, x1, y1] };
};
/** a local offset (ax across, ay forward, az up, in a shape's own frame) at facing -> a world point */
Hit.local = (e, off) => {
  const k = (WP.TYPES[e.type] && WP.TYPES[e.type].sc) || 1, f = e.facing, c = Math.cos(f), s = Math.sin(f), ax = off[0] * k, ay = off[1] * k, az = off[2] * k;   // (written facing south: local +y is the front, +x its right as written)
  return [e.x + ax * s + ay * c, e.y - ax * c + ay * s, (e.z || 0) + az];
};
/** the humanoid shapes for a rig standing at (sx, sy) with drawn height H px */
Hit.humanoid = (out, e, D, sx, sy, H, o = {}) => {
  const hr = Math.max(2, .11 * H), bw = Math.max(2, .17 * H), lw = Math.max(1.5, .12 * H);
  const head = { e, part: 'head', D: D - .1, kind: 'c', cx: sx, cy: sy - .87 * H, r: hr };
  let body = { e, part: 'body', D, kind: 'r', x0: sx - bw, x1: sx + bw, y0: sy - .76 * H, y1: sy - .42 * H };
  if (body.y1 - body.y0 < 8) { const m = (body.y0 + body.y1) / 2; body.y0 = m - 4; body.y1 = m + 4; }
  if (body.x1 - body.x0 < 4) { body.x0 = sx - 2; body.x1 = sx + 2; }
  const legs = { e, part: 'legs', D: D + .05, kind: 'r', x0: sx - lw, x1: sx + lw, y0: sy - .42 * H, y1: sy };
  const clip = o.clip, below = o.coverY;
  for (const s of [head, body, legs]) {
    if (clip) {   // a window or door: everything clipped to the opening
      if (s.kind === 'c') { if (s.cx < clip[0] || s.cx > clip[2] || s.cy < clip[1] || s.cy > clip[3]) continue; }
      else { s.x0 = Math.max(s.x0, clip[0]); s.x1 = Math.min(s.x1, clip[2]); s.y0 = Math.max(s.y0, clip[1]); s.y1 = Math.min(s.y1, clip[3]); if (s.x1 <= s.x0 || s.y1 <= s.y0) continue; }
    }
    if (below !== undefined) {   // behind cover: below its top is removed
      if (s.kind === 'c') { if (s.cy > below) continue; }
      else { s.y1 = Math.min(s.y1, below); if (s.y1 <= s.y0 + 1) continue; }
    }
    if (o.noLegs && s === legs) continue;
    out.push(s);
  }
};
})();
