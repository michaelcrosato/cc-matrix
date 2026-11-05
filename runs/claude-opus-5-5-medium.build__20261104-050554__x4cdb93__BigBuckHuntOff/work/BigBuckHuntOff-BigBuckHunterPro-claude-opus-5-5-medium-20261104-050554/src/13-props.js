// Props (trees, rocks, logs, fences, the barn...) and small rigs (critters, birds, in-world folk, the scarecrow, snowmen,
// clays, paper targets), all drawn as pixel volumes through the Vista raster. Props register shot occluders: trunks,
// rocks, logs, posts and boxes block a round; foliage, bushes and grass only hide.
(() => {
const B = BB, E = B.E, V = B.v3;
const T = h => B.tones(h);
const PROPS = B.PROPS = {};
const prop = (id, spec) => { PROPS[id] = spec; };
const crownColor = (p, list) => list[Math.floor(B.hash2(p.seed, 1, 9) * list.length)];
B.crownList = ['#c86a2a'];

// ---- trees ----
function hardwood(ras, p, o, kind) {
  const s = p.size, x = p.x, y = p.y, z = p.z, h = 11 * s, seed = p.seed;
  const bark = kind === 'birch' || kind === 'aspen' ? '#e8e4d8' : '#4a3a2c';
  ras.capsule(x, y, z - .3, x, y, z + h * .62, .26 * s, .16 * s, T(bark), { id: o.id });
  if (kind === 'birch' || kind === 'aspen') for (let k = 0; k < 4; k++) { const zz = z + 1 + k * h * .14; ras.capsule(x, y, zz, x, y, zz + .25, .27 * s, .27 * s, T('#2a2420'), { flat: true }); }
  // two branches
  for (const sd of [1, -1]) { const a = p.facing + sd * 1.2; ras.capsule(x, y, z + h * .45, x + Math.cos(a) * 1.8 * s, y + Math.sin(a) * 1.8 * s, z + h * .66, .1 * s, .05 * s, T(bark), {}); }
  const cols = p.cols || B.crownList, n = 6;
  for (let k = 0; k < n; k++) {
    const a = p.facing + k * 2.4, rr = (k === 0 ? 0 : 1.9) * s, zz = z + h * (k === 0 ? .86 : .62 + B.hash2(seed, k, 2) * .22);
    const c = cols[Math.floor(B.hash2(seed, k, 5) * cols.length)];
    ras.sphere(x + Math.cos(a) * rr, y + Math.sin(a) * rr, zz, (k === 0 ? 3 : 2.4) * s, T(c), { rough: true, seed: seed + k, id: o.id });
  }
}
function conifer(ras, p, o, kind) {
  const s = p.size, x = p.x, y = p.y, z = p.z, seed = p.seed;
  const h = (kind === 'blackspruce' ? 9 : 14) * s, w = (kind === 'blackspruce' ? .55 : 1) * s;
  const dark = kind === 'snag' ? '#2a2420' : kind === 'tamarack' ? '#c88a30' : '#2a4a32';
  ras.capsule(x, y, z - .3, x, y, z + h * .3, .22 * s, .18 * s, T('#3a2c22'), { id: o.id });
  if (kind === 'snag') { ras.capsule(x, y, z, x, y, z + h * .8, .2 * s, .07 * s, T('#24201c'), { id: o.id }); for (let k = 0; k < 3; k++) { const a = p.facing + k * 2.1, zz = z + h * (.35 + k * .15); ras.capsule(x, y, zz, x + Math.cos(a) * 1.3 * s, y + Math.sin(a) * 1.3 * s, zz + .6, .06 * s, .03 * s, T('#24201c'), {}); } return; }
  const tiers = 4;
  for (let k = 0; k < tiers; k++) {
    const z0 = z + h * (.18 + k * .19), r = 2.4 * w * (1 - k * .2);
    ras.capsule(x, y, z0, x, y, z0 + h * .34, r, 0, T(dark), { rough: true, seed: seed + k, id: o.id });
    if (p.snow) ras.capsule(x, y, z0 + h * .05, x, y, z0 + h * .3, r * .55, 0, T('#e8eef6'), { rough: true, seed: seed + k + 7 });
  }
}
const treeOcc = p => [{ type: 'cyl', x: p.x, y: p.y, r: .24 * p.size, z0: p.z - .5, z1: p.z + 7 * p.size }];
for (const k of ['oak', 'maple', 'birch', 'aspen']) prop(k, { tree: true, radius: 3, height: 12, draw: (r, p, o) => hardwood(r, p, o, k), occluders: treeOcc });
for (const k of ['pine', 'spruce', 'blackspruce', 'tamarack', 'snag']) prop(k, { tree: true, radius: 2.5, height: 14, draw: (r, p, o) => conifer(r, p, o, k), occluders: treeOcc });

// ---- ground props ----
prop('bush', { radius: 1.5, height: 1.6, draw(ras, p, o) { const s = p.size, c = p.cols ? p.cols[0] : '#4a6a30'; for (let k = 0; k < 3; k++) { const a = p.facing + k * 2.1; ras.sphere(p.x + Math.cos(a) * .6 * s, p.y + Math.sin(a) * .6 * s, p.z + .55 * s, .8 * s, T(c), { rough: true, seed: p.seed + k, id: o.id }); } } });
prop('rock', { radius: 1.5, height: 1.4, draw(ras, p, o) { const s = p.size, c = p.color || '#7a7670'; ras.sphere(p.x, p.y, p.z + .2 * s, 1.0 * s, T(c), { id: o.id, rough: true, seed: p.seed }); ras.sphere(p.x + Math.cos(p.facing) * .8 * s, p.y + Math.sin(p.facing) * .8 * s, p.z + .1 * s, .65 * s, T(c), { id: o.id, rough: true, seed: p.seed + 1 }); if (p.snow) ras.sphere(p.x, p.y, p.z + .75 * s, .55 * s, T('#e8eef6'), {}); },
  occluders: p => [{ type: 'sph', c: [p.x, p.y, p.z + .2 * p.size], r: .95 * p.size }, { type: 'sph', c: [p.x + Math.cos(p.facing) * .8 * p.size, p.y + Math.sin(p.facing) * .8 * p.size, p.z + .1 * p.size], r: .6 * p.size }] });
prop('boulder', { radius: 3, height: 3, draw(ras, p, o) { const s = p.size, c = T(p.color || '#86827a'); ras.sphere(p.x, p.y, p.z + .5 * s, 1.6 * s, c, { id: o.id, rough: true, seed: p.seed }); ras.sphere(p.x + Math.cos(p.facing) * 1.2 * s, p.y + Math.sin(p.facing) * 1.2 * s, p.z + .2 * s, 1.1 * s, c, { id: o.id, rough: true, seed: p.seed + 3 }); if (p.snow) ras.sphere(p.x, p.y, p.z + 2 * s, 1.3 * s, T('#e8eef6'), {}); }, occluders: p => [{ type: 'sph', c: [p.x, p.y, p.z + .5 * p.size], r: 1.5 * p.size }, { type: 'sph', c: [p.x + Math.cos(p.facing) * 1.2 * p.size, p.y + Math.sin(p.facing) * 1.2 * p.size, p.z + .2 * p.size], r: 1 * p.size }] });
const logEnds = p => { const c = Math.cos(p.facing), s = Math.sin(p.facing), L = 3 * p.size; return [[p.x - c * L, p.y - s * L, p.z + .3 * p.size], [p.x + c * L, p.y + s * L, p.z + .3 * p.size]]; };
prop('log', { radius: 3.5, height: .8, draw(ras, p, o) { const [a, b] = logEnds(p); ras.capsule(a[0], a[1], a[2], b[0], b[1], b[2], .32 * p.size, .3 * p.size, T('#5a4632'), { id: o.id }); ras.sphere(b[0], b[1], b[2], .2 * p.size, T('#c8a878'), { flat: true }); if (p.snow) ras.capsule(a[0], a[1], a[2] + .25, b[0], b[1], b[2] + .25, .2, .2, T('#e8eef6'), {}); }, occluders: p => { const [a, b] = logEnds(p); return [{ type: 'cap', a, b, r: .32 * p.size }]; } });
prop('stump', { radius: .6, height: .7, draw(ras, p, o) { ras.capsule(p.x, p.y, p.z - .2, p.x, p.y, p.z + .5 * p.size, .4 * p.size, .36 * p.size, T('#5a4632'), { id: o.id }); }, occluders: p => [{ type: 'cyl', x: p.x, y: p.y, r: .4 * p.size, z0: p.z - .3, z1: p.z + .5 * p.size }] });
prop('haybale', { radius: 1.2, height: 1.2, draw(ras, p, o) { const c = Math.cos(p.facing) * .7, s = Math.sin(p.facing) * .7; ras.capsule(p.x - c, p.y - s, p.z + .6, p.x + c, p.y + s, p.z + .6, .62, .62, T('#d8b860'), { id: o.id }); }, occluders: p => [{ type: 'sph', c: [p.x, p.y, p.z + .6], r: .9 }] });
prop('fence', { radius: 6, height: 1.3, draw(ras, p, o) {
  const c = Math.cos(p.facing), s = Math.sin(p.facing), L = 5 * p.size, wood = T('#7a6248');
  for (let k = -1; k <= 1; k++) { const x = p.x + c * L * k * .5, y = p.y + s * L * k * .5, z = B.world ? B.world.groundAt(x, y) : p.z; ras.capsule(x, y, z - .2, x, y, z + 1.25, .08, .07, wood, { id: o.id }); }
  for (const hh of [.55, 1.05]) ras.capsule(p.x - c * L / 2, p.y - s * L / 2, p.z + hh, p.x + c * L / 2, p.y + s * L / 2, p.z + hh, .05, .05, wood, { id: o.id });
}, occluders: p => { const c = Math.cos(p.facing), s = Math.sin(p.facing), L = 5 * p.size; return [-1, 0, 1].map(k => ({ type: 'cyl', x: p.x + c * L * k * .5, y: p.y + s * L * k * .5, r: .09, z0: p.z - .3, z1: p.z + 1.3 })); } });
prop('barn', { radius: 9, height: 9, draw(ras, p, o) {
  const f = p.facing, c = Math.cos(f), s = Math.sin(f);
  ras.box(p.x, p.y, p.z + 2.6, 6, 4.5, 2.8, f, '#a8382c', { id: o.id });
  // the roof: two slopes
  const P = (a, b, h) => [p.x + c * a - s * b, p.y + s * a + c * b, p.z + h];
  const rf = B.tones('#4a4a52');
  ras.quad(P(-6.3, -4.9, 5.3), P(6.3, -4.9, 5.3), P(6.3, 0, 8.4), P(-6.3, 0, 8.4), rf[1], {});
  ras.quad(P(-6.3, 4.9, 5.3), P(6.3, 4.9, 5.3), P(6.3, 0, 8.4), P(-6.3, 0, 8.4), rf[3], {});
  ras.tri(P(-6.02, -4.5, 5.4), P(-6.02, 4.5, 5.4), P(-6.02, 0, 8.3), B.tones('#a8382c')[1], {});
  ras.tri(P(6.02, -4.5, 5.4), P(6.02, 4.5, 5.4), P(6.02, 0, 8.3), B.tones('#a8382c')[2], {});
  // white trim and a big door
  ras.quad(P(6.05, -1.6, 0), P(6.05, 1.6, 0), P(6.05, 1.6, 3.6), P(6.05, -1.6, 3.6), B.tones('#f0e8dc')[2], { alt: B.tones('#a8382c')[1] });
}, occluders: p => [{ type: 'box', c: [p.x, p.y, p.z + 3.5], h: [6.2, 4.7, 4.2], f: p.facing }] });
prop('house', { radius: 7, height: 7, draw(ras, p, o) {
  const f = p.facing, c = Math.cos(f), s = Math.sin(f), P = (a, b, h) => [p.x + c * a - s * b, p.y + s * a + c * b, p.z + h];
  ras.box(p.x, p.y, p.z + 2, 4.5, 3.5, 2.1, f, '#e8dcc0', { id: o.id });
  const rf = B.tones('#6a3a2a');
  ras.quad(P(-4.8, -3.8, 4), P(4.8, -3.8, 4), P(4.8, 0, 6.2), P(-4.8, 0, 6.2), rf[1], {});
  ras.quad(P(-4.8, 3.8, 4), P(4.8, 3.8, 4), P(4.8, 0, 6.2), P(-4.8, 0, 6.2), rf[3], {});
  // porch roof and posts on the facing side
  ras.quad(P(4.5, -3.5, 2.9), P(6.6, -3.5, 2.6), P(6.6, 3.5, 2.6), P(4.5, 3.5, 2.9), rf[2], {});
  for (const b of [-3.3, 0, 3.3]) { const q = P(6.4, b, 0); ras.capsule(q[0], q[1], q[2], q[0], q[1], q[2] + 2.6, .08, .08, T('#f0ece0'), {}); }
  for (const b of [-2, 2]) { const q = P(4.53, b, 1.6); ras.box(q[0], q[1], q[2], .05, .5, .5, f, '#f8e090', {}); }
}, occluders: p => [{ type: 'box', c: [p.x, p.y, p.z + 3], h: [4.7, 3.7, 3.2], f: p.facing }] });
prop('traphouse', { radius: 3, height: 2, draw(ras, p, o) { ras.box(p.x, p.y, p.z + .8, 1.6, 1.6, .9, p.facing, '#8a8a7a', { id: o.id }); ras.box(p.x, p.y, p.z + 1.75, 1.8, 1.8, .08, p.facing, '#3a5a3a', {}); }, occluders: p => [{ type: 'box', c: [p.x, p.y, p.z + .9], h: [1.6, 1.6, 1], f: p.facing }] });
prop('campfire', { radius: 1, height: 1, draw(ras, p, o) {
  for (let k = 0; k < 6; k++) { const a = k * 1.05; ras.sphere(p.x + Math.cos(a) * .55, p.y + Math.sin(a) * .55, p.z + .1, .16, T('#6a6660'), {}); }
  const t = ras.time; for (let k = 0; k < 4; k++) { const a = k * 1.6 + t * 3; ras.capsule(p.x + Math.cos(a) * .15, p.y + Math.sin(a) * .15, p.z + .1, p.x, p.y, p.z + .5 + Math.sin(t * 11 + k) * .15, .14, 0, T(k % 2 ? '#f8a030' : '#f8d040'), { flat: true }); }
} });
prop('lodge', { radius: 3, height: 2, draw(ras, p, o) { for (let k = 0; k < 9; k++) { const a = k * .7, r = 1.4 - k * .1; ras.capsule(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, p.z + .1 + k * .12, p.x - Math.cos(a) * r * .3, p.y - Math.sin(a) * r * .3, p.z + .6 + k * .1, .12, .1, T(k % 2 ? '#5a4632' : '#6a5440'), { id: o.id }); } } });
prop('snowdrift', { radius: 2, height: 1, draw(ras, p, o) { ras.capsule(p.x - Math.cos(p.facing) * 1.4 * p.size, p.y - Math.sin(p.facing) * 1.4 * p.size, p.z, p.x + Math.cos(p.facing) * 1.4 * p.size, p.y + Math.sin(p.facing) * 1.4 * p.size, p.z, .9 * p.size, .7 * p.size, T('#eef2fa'), { id: o.id }); } });
prop('cattail', { radius: .5, height: 1.8, draw(ras, p, o) { for (let k = 0; k < 4; k++) { const a = p.facing + k * 1.6, x = p.x + Math.cos(a) * .3, y = p.y + Math.sin(a) * .3, h = 1.4 + B.hash2(p.seed, k, 1) * .5, sw = Math.sin(ras.time * 1.3 + k) * .05; ras.capsule(x, y, p.z, x + sw, y, p.z + h, .025, .015, T('#8a8a40'), {}); ras.capsule(x + sw, y, p.z + h - .25, x + sw, y, p.z + h - .05, .05, .05, T('#5a3a22'), {}); } } });
prop('sign', { radius: 1, height: 2, draw(ras, p, o) { ras.capsule(p.x, p.y, p.z, p.x, p.y, p.z + 1.6, .06, .06, T('#6a5440'), {}); ras.box(p.x, p.y, p.z + 1.6, .05, .7, .35, p.facing, p.color || '#c89a50', { id: o.id }); } });
prop('berm', { radius: 6, height: 2, draw(ras, p, o) { const c = Math.cos(p.facing), s = Math.sin(p.facing); ras.capsule(p.x - c * 5, p.y - s * 5, p.z, p.x + c * 5, p.y + s * 5, p.z, 1.6, 1.6, T('#7a6248'), { id: o.id }); }, occluders: p => { const c = Math.cos(p.facing), s = Math.sin(p.facing); return [{ type: 'cap', a: [p.x - c * 5, p.y - s * 5, p.z], b: [p.x + c * 5, p.y + s * 5, p.z], r: 1.6 }]; } });

// ---- small rigs: critters, birds, folk, specials. Each is a function of state returning parts { a, b, ra, rb, tone } ----
const CR = B.CRITTER_LOOKS = {
  squirrel: { body: '#8a5a3a', belly: '#d8c0a0', size: .22, ears: 'small', tail: 'bushy' },
  rabbit: { body: '#9a8068', belly: '#e8dcc8', size: .25, ears: 'long', tail: 'puff' },
  hare: { body: '#f2f4f8', belly: '#ffffff', size: .3, ears: 'long', tail: 'puff' },
  raccoon: { body: '#7a7670', belly: '#a8a49c', size: .32, ears: 'small', tail: 'ringed', mask: true },
  skunk: { body: '#1a1a1e', belly: '#1a1a1e', size: .3, ears: 'small', tail: 'skunk', stripe: true },
  marmot: { body: '#8a6a40', belly: '#c8a878', size: .32, ears: 'small', tail: 'short' },
  beaver: { body: '#5a3a22', belly: '#6a4a30', size: .4, ears: 'small', tail: 'flat' },
  turkey: { bird: true, body: '#3a2e26', head: '#c84a3a', size: .5, fan: true, ground: true },
  crow: { bird: true, body: '#1a1a22', head: '#1a1a22', beak: '#2a2a2a', size: .25 },
  raven: { bird: true, body: '#121218', head: '#121218', beak: '#2a2a2a', size: .32 },
  goldcrow: { bird: true, body: '#e8b820', head: '#f8d848', beak: '#a87810', size: .27 },
  grouse: { bird: true, body: '#7a6248', head: '#6a5238', beak: '#3a3020', size: .3 },
  duck: { bird: true, body: '#8a7a68', head: '#2a6a3a', beak: '#e8c040', size: .3, swims: true },
  loon: { bird: true, body: '#1a1a1e', head: '#101418', beak: '#202020', size: .4, swims: true, loon: true },
  eagle: { bird: true, body: '#3a2a1e', head: '#f4f4f0', beak: '#f0c030', size: .75 }
};
// st: { x, y, z, heading, t, speed, hop, flap (0..1, 0 folded), dead, climb (0..1: on a trunk), swim, peek }
B.critterParts = (kind, st) => {
  const L = CR[kind], s = L.size, out = [];
  const h = st.heading, c = Math.cos(h), sn = Math.sin(h), x = st.x, y = st.y;
  const dead = st.dead || 0, roll = dead * 1.4;
  const z0 = st.z + (st.hop || 0) - dead * s * .2;
  const W = (f, l, u) => { const l2 = l * Math.cos(roll) - u * Math.sin(roll), u2 = l * Math.sin(roll) + u * Math.cos(roll); return [x + f * c - l2 * sn, y + f * sn + l2 * c, z0 + u2]; };
  const cap = (a, b, ra, rb, hex, zone = 'body') => out.push({ a, b, ra, rb, tone: T(hex), zone });
  if (L.bird) {
    const flap = st.flap || 0, fl = Math.sin((st.t || 0) * 18) * flap;
    const sw = L.swims && st.swim ? -s * .25 : 0;
    const bz = (L.ground && !flap ? s * 1.1 : s * .3) + sw;
    cap(W(s * .6, 0, bz + s * .08), W(-s * .7, 0, bz), s * .38, s * .3, L.body);
    if (L.loon) { cap(W(s * .1, 0, bz + s * .2), W(-s * .4, 0, bz + s * .18), s * .2, s * .2, '#e8e8e8'); }
    const hd = W(s * .95, 0, bz + s * (L.ground ? .55 : .3));
    cap(W(s * .6, 0, bz + s * .1), hd, s * .18, s * .16, L.ground ? '#5a4a3a' : L.body);
    cap(hd, hd, s * .2, s * .2, L.head);
    cap(hd, W(s * 1.3, 0, bz + s * (L.ground ? .5 : .25)), s * .08, s * .02, L.beak || '#c8a040');
    if (L.ground) { for (const sd of [1, -1]) cap(W(0, sd * s * .15, bz - s * .2), W(0, sd * s * .15, 0), s * .05, s * .04, '#a87850'); }
    if (L.fan) { for (let k = -3; k <= 3; k++) { const a = k * .28; cap(W(-s * .6, 0, bz + s * .2), W(-s * .9, Math.sin(a) * s * 1.1, bz + s * .3 + Math.cos(a) * s * 1.1 * (st.strut ? 1 : .35)), s * .1, s * .14, k % 2 ? '#5a4232' : '#3a2e26'); } }
    // wings (triangles, flapping)
    const wl = s * (L.ground ? 1.1 : 1.8);
    out.wings = [1, -1].map(sd => ({ a: W(s * .3, sd * s * .1, bz + s * .1), b: W(-s * .4, sd * s * .1, bz + s * .1), tip: W(-s * .1, sd * wl * Math.cos(fl * 1.1 + (flap ? .2 : 1.35)), bz + s * .1 + wl * Math.sin(fl * 1.1 + (flap ? .2 : 1.35)) * (flap ? 1 : .2)), tone: T(L.body) }));
    cap(W(-s * .6, 0, bz), W(-s * 1.15, 0, bz + s * .05), s * .14, s * .2, L.body);
    return out;
  }
  // small four-legged critters
  const climb = st.climb || 0, bodyUp = climb * 1.3;
  const pz = (f, u) => [f * Math.cos(bodyUp) - u * Math.sin(bodyUp), f * Math.sin(bodyUp) + u * Math.cos(bodyUp)];
  const P = (f, l, u) => { const [ff, uu] = pz(f, u); return W(ff, l, uu); };
  const sw = st.swim ? -s * .55 : 0;
  const bz = s * .6 + sw, walk = Math.sin((st.t || 0) * 14) * Math.min(1, (st.speed || 0) / .5);
  cap(P(s * .45, 0, bz + s * .05), P(-s * .5, 0, bz), s * .38, s * .42, L.body);
  cap(P(s * .3, 0, bz - s * .15), P(-s * .35, 0, bz - s * .15), s * .22, s * .25, L.belly);
  if (L.stripe) cap(P(s * .6, 0, bz + s * .35), P(-s * .6, 0, bz + s * .38), s * .1, s * .14, '#f4f4f4');
  const hd = P(s * .85, 0, bz + s * .35 + (st.peek || 0));
  cap(hd, hd, s * .3, s * .3, L.body);
  cap(hd, P(s * 1.12, 0, bz + s * .28), s * .16, s * .08, L.mask ? '#e8e8e0' : L.belly);
  if (L.mask) { cap(P(s * .95, s * .14, bz + s * .42), P(s * .95, -s * .14, bz + s * .42), s * .09, s * .09, '#1a1a1a'); }
  if (L.stripe) cap(P(s * .9, 0, bz + s * .55), P(s * 1.1, 0, bz + s * .4), s * .05, s * .05, '#f4f4f4');
  for (const sd of [1, -1]) {
    const eb = P(s * .8, sd * s * .15, bz + s * .55);
    if (L.ears === 'long') cap(eb, P(s * .55, sd * s * .22, bz + s * 1.35), s * .08, s * .05, L.body);
    else cap(eb, P(s * .78, sd * s * .2, bz + s * .72), s * .07, s * .04, L.body);
    cap(P(s * 1.02, sd * s * .14, bz + s * .45), P(s * 1.02, sd * s * .14, bz + s * .45), s * .05, s * .05, '#100808');
  }
  // legs
  if (!st.swim) for (const [f, sd, ph] of [[s * .35, 1, 0], [s * .35, -1, Math.PI], [-s * .35, 1, Math.PI], [-s * .35, -1, 0]]) { const sw2 = walk * s * .18 * Math.sin(ph + 1); cap(P(f, sd * s * .18, bz - s * .2), P(f + sw2, sd * s * .18, 0), s * .07, s * .06, L.body); }
  // tail
  const tb = P(-s * .85, 0, bz + s * .1);
  if (L.tail === 'bushy') cap(tb, P(-s * 1.05, 0, bz + s * 1.0 + Math.sin((st.t || 0) * 5) * s * .1), s * .2, s * .3, L.body);
  else if (L.tail === 'ringed') { for (let k = 0; k < 4; k++) cap(P(-s * (.85 + k * .17), 0, bz + s * .1 - k * s * .03), P(-s * (1.0 + k * .17), 0, bz + s * .07 - k * s * .03), s * .11, s * .11, k % 2 ? '#2a2a2a' : '#9a968e'); }
  else if (L.tail === 'skunk') { cap(tb, P(-s * 1.0, 0, bz + s * 1.0), s * .2, s * .32, '#1a1a1e'); cap(P(-s * .95, 0, bz + s * .5), P(-s * 1.0, 0, bz + s * 1.1), s * .08, s * .12, '#f4f4f4'); }
  else if (L.tail === 'flat') { cap(tb, P(-s * 1.45, 0, bz - s * .1 + (st.slap || 0) * s * .5), s * .22, s * .18, '#2a2420'); }
  else if (L.tail === 'puff') cap(tb, tb, s * .14, s * .14, '#ffffff');
  else cap(tb, P(-s * 1.0, 0, bz), s * .1, s * .06, L.body);
  return out;
};
B.drawParts = (ras, parts, o = {}) => {
  for (const p of parts) ras.capsule(p.a[0], p.a[1], p.a[2], p.b[0], p.b[1], p.b[2], p.ra, p.rb, p.tone, { id: o.id, outline: o.outline !== false, flat: p.flat });
  if (parts.wings) for (const w of parts.wings) ras.tri(w.a, w.b, w.tip, w.tone[1], { id: o.id, outline: o.outline !== false });
};

// ---- in-world folk (bonus hosts, the range master): simple capsule people ----
const FOLK = B.FOLK = {
  dub: { coat: '#7a6a48', pants: '#4a4232', hat: '#f07020', skin: '#e0a880', beard: '#c8c8c0', bulk: 1.15 },
  granny: { coat: '#a85a7a', pants: '#6a4a5a', hat: null, hair: '#d8d8d8', skin: '#f0c0a0', bulk: .95, short: .9 },
  dwayne: { coat: '#5a6a3a', pants: '#3a4228', hat: '#3a4228', skin: '#e0b090', bulk: 1 },
  loretta: { coat: '#c83a32', pants: '#3a4a6a', hat: null, hair: '#6a3a1a', skin: '#e8b898', bulk: .95 },
  earl: { coat: '#3a5a8a', pants: '#3a5a8a', hat: '#8a2a2a', skin: '#e0a880', bulk: 1.3 },
  emcee: { coat: '#2a2a3a', pants: '#2a2a3a', hat: '#c8a040', skin: '#e8b898', bulk: 1 }
};
// st: { x, y, z, heading, t, pose: 'idle' | 'wave' | 'throw' | 'cheer' | 'sit' }
B.folkParts = (who, st) => {
  const F = FOLK[who], out = [], h = st.heading, c = Math.cos(h), s = Math.sin(h), k = F.short || 1, b = F.bulk;
  const W = (f, l, u) => [st.x + f * c - l * s, st.y + f * s + l * c, st.z + u * k];
  const cap = (a, bb, ra, rb, hex) => out.push({ a, b: bb, ra, rb, tone: T(hex), zone: 'body' });
  const t = st.t || 0, pose = st.pose || 'idle', sit = pose === 'sit' ? 1 : 0;
  const hip = .95 - sit * .45;
  for (const sd of [1, -1]) { cap(W(0, sd * .11, hip), W(sit * .4, sd * .12, .48 - sit * .02), .09 * b, .08, F.pants); cap(W(sit * .4, sd * .12, .48 - sit * .02), W(sit * .45, sd * .12, .05), .08, .07, F.pants); cap(W(sit * .45 + .05, sd * .12, .05), W(sit * .45 + .15, sd * .12, .04), .06, .06, '#3a2a20'); }
  cap(W(0, 0, hip), W(0, 0, hip + .55), .18 * b, .2 * b, F.coat);
  const head = W(0, 0, hip + .78);
  cap(head, head, .13, .13, F.skin);
  if (F.beard) cap(W(.08, 0, hip + .7), W(.1, 0, hip + .62), .1, .07, F.beard);
  if (F.hair) cap(W(-.05, 0, hip + .85), W(-.1, 0, hip + .8), .12, .1, F.hair);
  if (F.hat) { cap(W(0, 0, hip + .86), W(0, 0, hip + .93), .14, .13, F.hat); cap(W(.1, 0, hip + .86), W(.2, 0, hip + .86), .05, .03, F.hat); }
  const arm = (sd, up, fwd) => { const sh = W(0, sd * .24 * b, hip + .5), el = W(fwd * .15, sd * .3 * b, hip + .5 - .25 + up * .4), hand = W(fwd * .3, sd * .3 * b, hip + .5 - .45 + up * .85); cap(sh, el, .07 * b, .06, F.coat); cap(el, hand, .06, .05, F.coat); cap(hand, hand, .05, .05, F.skin); };
  if (pose === 'wave') { arm(1, 1 + Math.sin(t * 8) * .15, .2); arm(-1, 0, 0); }
  else if (pose === 'throw') { const u = (t * 1.5) % 1; arm(1, u < .5 ? 1.1 : .2, u < .5 ? -.4 : .9); arm(-1, .1, .2); }
  else if (pose === 'cheer') { arm(1, 1.2, .1); arm(-1, 1.2, .1); }
  else { arm(1, .05 + Math.sin(t * 1.2) * .02, .05); arm(-1, .05, .05); }
  return out;
};

// ---- specials ----
B.scarecrowParts = (st) => {   // Hank
  const out = [], x = st.x, y = st.y, z = st.z, h = st.heading, c = Math.cos(h), s = Math.sin(h), wob = Math.sin((st.t || 0) * 2) * .05 + (st.bonk || 0) * .25;
  const W = (f, l, u) => [x + f * c - l * s + wob * u * .1, y + f * s + l * c, z + u];
  const cap = (a, b, ra, rb, hex, zone = 'body') => out.push({ a, b, ra, rb, tone: T(hex), zone });
  cap(W(0, 0, 0), W(0, 0, 2.2), .06, .06, '#6a5440');
  cap(W(0, -.9, 1.6), W(0, .9, 1.6), .05, .05, '#6a5440');
  cap(W(0, 0, 1.0), W(0, 0, 1.75), .26, .3, '#3a6aa8');   // the shirt
  cap(W(0, -.75, 1.6), W(0, .75, 1.6), .1, .1, '#3a6aa8');
  cap(W(0, 0, 2.0), W(0, 0, 2.0), .22, .22, '#d8b860');   // a burlap head
  cap(W(0, 0, 2.22), W(0, 0, 2.3), .3, .26, '#5a4632'); cap(W(0, 0, 2.3), W(0, 0, 2.48), .17, .15, '#5a4632');
  for (const sd of [1, -1]) cap(W(.18, sd * .07, 2.05), W(.18, sd * .07, 2.05), .03, .03, '#1a1a1a');
  for (const sd of [1, -1]) cap(W(0, sd * .9, 1.6), W(0, sd * 1.0, 1.45), .05, .02, '#e8d080');
  return out;
};
B.snowmanParts = (st) => {
  const out = [], x = st.x, y = st.y, z = st.z - (st.sink || 0), h = st.heading, c = Math.cos(h), s = Math.sin(h), big = st.big || 1, top = st.topple || 0;
  const W = (f, l, u) => { const f2 = f + u * top * .8, u2 = u * (1 - top * .5); return [x + f2 * c - l * s, y + f2 * s + l * c, z + u2]; };
  const cap = (a, b, ra, rb, hex, zone = 'body') => out.push({ a, b, ra, rb, tone: T(hex), zone });
  cap(W(0, 0, .45 * big), W(0, 0, .5 * big), .5 * big, .5 * big, '#f2f6fc');
  cap(W(0, 0, 1.1 * big), W(0, 0, 1.12 * big), .36 * big, .36 * big, '#eef2fa');
  cap(W(0, 0, 1.6 * big), W(0, 0, 1.6 * big), .26 * big, .26 * big, '#f4f8ff');
  cap(W(.24 * big, 0, 1.58 * big), W(.45 * big, 0, 1.56 * big), .045 * big, .01, '#f08020');
  for (const sd of [1, -1]) cap(W(.22 * big, sd * .09 * big, 1.68 * big), W(.22 * big, sd * .09 * big, 1.68 * big), .035 * big, .035 * big, '#1a1a1a');
  const arm = st.throwing ? Math.sin((st.t || 0) * 10) * .6 : 0;
  for (const sd of [1, -1]) cap(W(0, sd * .3 * big, 1.15 * big), W(.1, sd * .75 * big, 1.35 * big + (sd > 0 ? arm : 0) * big), .03 * big, .02 * big, '#5a4030');
  if (st.antlers) for (const sd of [1, -1]) { cap(W(0, sd * .12 * big, 1.8 * big), W(-.1 * big, sd * .5 * big, 2.2 * big), .05 * big, .04 * big, '#6a5038'); cap(W(-.05 * big, sd * .3 * big, 2.0 * big), W(.15 * big, sd * .4 * big, 2.25 * big), .04 * big, .03 * big, '#6a5038'); }
  if (!st.hatOff) { out.push({ a: W(0, 0, 1.82 * big), b: W(0, 0, 1.86 * big), ra: .3 * big, rb: .3 * big, tone: T('#1a1a22'), zone: 'hat' }); out.push({ a: W(0, 0, 1.86 * big), b: W(0, 0, 2.2 * big), ra: .19 * big, rb: .18 * big, tone: T(st.goldHat ? '#e8b820' : '#1a1a22'), zone: 'hat' }); }
  return out;
};
B.saucerParts = (st) => { const r = .055, out = [{ a: [st.x, st.y, st.z], b: [st.x, st.y, st.z + .025], ra: r * 1.6, rb: r * 1.4, tone: T(st.gold ? '#f0c020' : '#e8682a'), zone: 'body' }]; return out; };
B.snowballParts = (st) => [{ a: [st.x, st.y, st.z], b: [st.x, st.y, st.z], ra: .16, rb: .16, tone: T('#f4f8ff'), zone: 'body' }];
})();
