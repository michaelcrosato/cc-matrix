// CRACKMANIA scenery (PLAN §6.6, §7.4): seeded by the track's id. Static props are merged into one mesh (the mesh kit);
// moving ones (windmills, pumpjacks, cows, tumbleweeds, flags, ski lifts) are drawn with the pen each frame; solid
// ones get colliders. Trackside dressing: chevron signs before tight turns, tyre stacks / hay bales / snowbanks
// outside turns, grandstands with a crowd at the start and the finish, Monsieur Drapeau beside the start gate
import { TYPES, CELL, GRID, GX, GY, LEVEL, frameAt, cellWorld, HEAD } from './blocks.js';
import { SECTION, LIFT } from './geometry.js';
import { MeshKit } from './meshkit.js';
import { add, mul } from '../lib/v3.js';
const E = globalThis.My3D2dge, U = 16;

const MIX = {
  dustbowl: { rate: .35, list: [['cactus', 40], ['barrel', 20], ['rocks', 20], ['tumble', 5], ['pump', 5], ['board', 10]] },
  hedgerow: { rate: .5, list: [['tree', 35], ['bush', 20], ['hay', 15], ['fence', 10], ['cow', 5], ['barn', 5], ['windmill', 2]] },
  frostpeak: { rate: .45, list: [['pine', 55], ['rocks', 15], ['chalet', 8], ['snowman', 5], ['ice', 5], ['lamp', 12]] }
};
const pick = (list, r) => { const tot = list.reduce((a, b) => a + b[1], 0); let x = r * tot; for (const [k, w] of list) { if ((x -= w) < 0) return k; } return list[0][0]; };
const BOARDS = ['COPPER COLA', 'LOOP INSURANCE', 'COCO BUILDS TRACKS', 'GRAVEL GRAVY', 'NITRO NOODLES', 'YETI WAX'];

/** scenery for a track: { kit (static MeshKit), anim: [{ kind, x, y, z, yaw, s }], solids: [[x, y, r, h] | box], stands, drapeau } */
export function scenery(track, env, o = {}) {
  const seed = [...String(track.id + track.name)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7), R = E.rng(seed);
  const K = new MeshKit(), anim = [], solids = [], stands = [], S = SECTION[env];
  const used = new Set(); for (const b of track.blocks) for (const [x, y, l] of track.cellsOf(b)) used.add(x + ',' + y);
  // cells beside the road (the dressing) and the open ones (the scatter)
  const nearRoad = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (used.has((x + dx) + ',' + (y + dy))) return true; return false; };
  const M = MIX[env];
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    const k = x + ',' + y; if (used.has(k) || track.chasms.has(k)) continue;
    if (track.nobuild.has(k)) { nobuild(K, solids, anim, env, x, y, track.nobuild.get(k), R); continue; }
    const rate = nearRoad(x, y) ? M.rate * .8 : M.rate * (o.sparse ? .4 : 1);
    if (R() > rate) continue;
    const kind = pick(M.list, R()), cx = GX + (x + .2 + R() * .6) * CELL, cy = GY + (y + .2 + R() * .6) * CELL, yaw = R() * Math.PI * 2;
    if (kind === 'board' && !nearRoad(x, y)) continue;
    prop(K, solids, anim, env, kind, cx, cy, yaw, R, nearRoad(x, y));
    // a second, smaller one sometimes (clumps)
    if (R() < .45 && ['cactus', 'tree', 'pine', 'bush', 'rocks'].includes(kind)) prop(K, solids, anim, env, kind, cx + (R() - .5) * 14, cy + (R() - .5) * 14, R() * 6, R, false, .7);
  }
  // the editor's scenery blocks: each a prop at its cell's centre
  const DK = { XCACT: 'cactus', XROCK: 'rocks', XTREE: 'tree', XHAY: 'hay', XPINE: 'pine', XCHALET: 'chalet', XBOARD: 'board', XSNOWMAN: 'snowman', XCOW: 'cow', XWIND: 'windmill' };
  for (const b of track.blocks) { const T = TYPES[b.type]; if (!T.deco) continue; const x = GX + (b.cx + .5) * CELL, y = GY + (b.cy + .5) * CELL, yaw = b.rot * Math.PI / 2;
    if (T.deco === 'XSTAND') { grandstand(K, x, y, yaw, env); solids.push({ box: [x, y, 0, 9, 4, 3.5, yaw] }); stands.push({ x, y, z: 0, yaw, n: 9 }); }
    else if (T.deco === 'XTYRE') { tyres(K, x, y, 0); tyres(K, x + 1.3, y, 0); solids.push([x, y, 1.6, 1.2]); }
    else prop(K, solids, anim, env, DK[T.deco], x, y, yaw, R, true, 1); }
  // trackside: chevrons outside tight turns, stacks outside every turn, the stands and the flag man
  for (const b of track.blocks) {
    const T = TYPES[b.type];
    if (T.turn) {
      const outer = -T.turn, mid = frameAt(b, T.len / 2), p = add(add(mid.p, mid.r, outer * (S.hw + S.curb + 2.5)), [0, 0, LIFT]);
      if (b.L === 0) {
        if (env === 'dustbowl') for (let i = -1; i <= 1; i++) { const f = frameAt(b, T.len * (.5 + i * .22)), q = add(f.p, f.r, outer * (S.hw + S.curb + 2)); tyres(K, q[0], q[1], 0); solids.push([q[0], q[1], .9, 1.2]); }
        else if (env === 'hedgerow') { const f = frameAt(b, T.len * .5), q = add(f.p, f.r, outer * (S.hw + S.curb + 2.4)); hay(K, q[0], q[1], Math.atan2(f.t[1], f.t[0])); solids.push([q[0], q[1], 1.2, 1.4]); }
        else for (let i = -1; i <= 1; i++) { const f = frameAt(b, T.len * (.5 + i * .25)), q = add(f.p, f.r, outer * (S.hw + S.curb + 2.2)); K.ball(q[0], q[1], .2, 1.8, 1.8, 1, '#f4f8ff'); }
      }
      if (T.size === 1 || T.bank) {   // a chevron board where the bend starts
        const f = frameAt(b, 2), q = add(add(f.p, f.r, outer * (S.hw + S.curb + 3)), [0, 0, 0]);
        anim.push({ kind: 'chevron', x: q[0], y: q[1], z: q[2], f: f.t, r: f.r, side: T.turn });
      }
    }
    if (env === 'frostpeak' && !T.turn && !T.loop && !T.kicker && !T.landing && T.path && !T.deco && !T.gap && b.L === 0 && b.id % 3 === 0) {   // street lamps along the mountain road
      const f = frameAt(b, 16), sd = b.id % 2 ? 1 : -1, q = add(f.p, f.r, sd * (S.hw + S.curb + 2.2)), yaw = Math.atan2(-sd * f.r[1], -sd * f.r[0]);
      K.cyl(q[0], q[1], 0, .15, .12, 6, '#3a3a44', 6); K.box(q[0] + Math.cos(yaw) * .7, q[1] + Math.sin(yaw) * .7, 6, 1.6, .2, .2, '#3a3a44', yaw);
      anim.push({ kind: 'lamp', x: q[0] + Math.cos(yaw) * 1.3, y: q[1] + Math.sin(yaw) * 1.3, z: 5.8, s: 1 }); solids.push([q[0], q[1], .3, 6]);
    }
    if (T.start || T.finish) {
      const f = frameAt(b, 16), side = (b.id % 2 ? 1 : -1);
      for (const sd of [side, -side]) {
        const q = add(f.p, f.r, sd * (S.hw + S.curb + 9));
        const cx = Math.floor((q[0] - GX) / CELL), cy = Math.floor((q[1] - GY) / CELL);
        if (used.has(cx + ',' + cy) && b.L === 0 && !(cx === b.cx && cy === b.cy)) continue;
        stands.push({ x: q[0], y: q[1], z: b.L > 0 ? 0 : 0, yaw: Math.atan2(-sd * f.r[1], -sd * f.r[0]), f: f.t, n: 12 });
        grandstand(K, q[0], q[1], Math.atan2(-sd * f.r[1], -sd * f.r[0]), env); solids.push({ box: [q[0], q[1], 0, 9, 4, 3.5, Math.atan2(-sd * f.r[1], -sd * f.r[0])] });
        break;
      }
    }
  }
  const st = track.start; let drapeau = null;
  if (st) { const T = TYPES[st.type], f = frameAt(st, T.archS - 1.5), q = add(f.p, f.r, S.hw + S.curb + 2); drapeau = { x: q[0], y: q[1], z: q[2] + LIFT, f: f.t, r: f.r }; }
  return { kit: K, anim, solids, stands, drapeau };
}
/* ---- the props ---- */
function prop(K, solids, anim, env, kind, x, y, yaw, R, near, sc = 1) {
  const s = (.8 + R() * .5) * sc;
  switch (kind) {
    case 'cactus': { const h = 5 * s; K.cyl(x, y, 0, .45 * s, .38 * s, h, '#3a8a3a', 7); K.ball(x, y, h, .38 * s, .38 * s, .3 * s, '#4aa04a', 7);
      for (const [a, z] of [[R() * 6, h * .4], [R() * 6 + 3, h * .55]]) { const ax = x + Math.cos(a) * .9 * s, ay = y + Math.sin(a) * .9 * s; K.box((x + ax) / 2, (y + ay) / 2, z, Math.hypot(ax - x, ay - y) + .3, .5 * s, .5 * s, '#3a8a3a', a); K.cyl(ax, ay, z, .28 * s, .26 * s, 1.6 * s, '#3a8a3a', 6); K.ball(ax, ay, z + 1.6 * s, .26 * s, .26 * s, .22 * s, '#5ab05a', 6); }
      solids.push([x, y, .5 * s, h]); break; }
    case 'barrel': for (let i = 0; i < 4; i++) { const a = i * 1.7 + yaw, q = i ? 1.1 * s : 0; K.ball(x + Math.cos(a) * q, y + Math.sin(a) * q, .55 * s, .6 * s, .6 * s, .6 * s, '#4a9a3a', 8); K.ball(x + Math.cos(a) * q, y + Math.sin(a) * q, 1.15 * s, .2, .2, .2, '#ff6aa0', 5); } solids.push([x, y, 1.4 * s, 1.2]); break;
    case 'rocks': { const c = env === 'frostpeak' ? ['#8a92a0', '#a8b0bc'] : env === 'hedgerow' ? ['#8a8478', '#a09888'] : ['#c06a3a', '#d8905a'];
      for (let i = 0; i < 3; i++) { const a = yaw + i * 2.1, q = i ? 1.6 * s : 0, r = (1.6 - i * .4) * s; K.ball(x + Math.cos(a) * q, y + Math.sin(a) * q, r * .5, r, r * .9, r * .75, c[i % 2], 6); if (env === 'frostpeak' && !i) K.ball(x, y, r * 1.05, r * .8, r * .7, r * .3, '#f4f8ff', 6); }
      solids.push([x, y, 1.6 * s, 2]); break; }
    case 'tumble': anim.push({ kind: 'tumble', x, y, z: 0, yaw, s, ph: R() * 10 }); break;
    case 'pump': anim.push({ kind: 'pump', x, y, z: 0, yaw, s: 1, ph: R() * 6 }); K.box(x, y, .3, 7, 2.4, .6, '#6a6a72', yaw); solids.push({ box: [x, y, 0, 3.5, 1.2, 4, yaw] }); break;
    case 'board': { const c = Math.cos(yaw), sn = Math.sin(yaw); for (const sd of [-1, 1]) K.box(x + c * sd * 3.5, y + sn * sd * 3.5, 2.5, .4, .4, 5, '#5a5a62'); anim.push({ kind: 'board', x, y, z: 0, yaw, text: BOARDS[Math.floor(R() * BOARDS.length)], s: 1 }); solids.push({ box: [x, y, 0, 4.5, .5, 8, yaw] }); break; }
    case 'tree': { const h = 4.5 * s; K.cyl(x, y, 0, .4 * s, .3 * s, h, '#6a4a2a', 6); K.ball(x, y, h + 1.2 * s, 2.6 * s, 2.6 * s, 2.2 * s, '#3a8a2a', 8); K.ball(x + .9 * s, y + .6 * s, h + .4 * s, 1.8 * s, 1.8 * s, 1.5 * s, '#4a9a32', 7); solids.push([x, y, .45 * s, h]); break; }
    case 'bush': K.ball(x, y, .8 * s, 1.6 * s, 1.5 * s, 1.1 * s, '#3a7a2a', 7); K.ball(x + .8 * s, y, .6 * s, 1.1 * s, 1.1 * s, .8 * s, '#4a8a32', 6); break;
    case 'hay': hay(K, x, y, yaw); solids.push([x, y, 1.2, 1.4]); break;
    case 'fence': { const c = Math.cos(yaw), sn = Math.sin(yaw); for (let i = -3; i <= 3; i++) K.box(x + c * i * 2.5, y + sn * i * 2.5, .6, .18, .18, 1.2, '#8a6a42'); K.box(x, y, .95, 15.4, .12, .16, '#9a7a4a', yaw); K.box(x, y, .5, 15.4, .12, .16, '#9a7a4a', yaw); break; }
    case 'cow': anim.push({ kind: 'cow', x, y, z: 0, yaw, s: 1, ph: R() * 10, spots: R() < .5 }); solids.push([x, y, 1.1, 1.6]); break;
    case 'barn': barn(K, x, y, yaw); solids.push({ box: [x, y, 0, 6, 5, 7, yaw] }); break;
    case 'windmill': K.cyl(x, y, 0, 2.2, 1.4, 11, '#e8e0d0', 8, '#8a3a2a'); K.cyl(x, y, 11, 1.6, 0, 2.2, '#8a3a2a', 8); anim.push({ kind: 'windmill', x, y, z: 10, yaw, s: 1, ph: R() * 6 }); solids.push([x, y, 2.2, 12]); break;
    case 'pine': { const h = 7 * s; K.cyl(x, y, 0, .35 * s, .3 * s, 1.6 * s, '#5a3a22', 6); for (let i = 0; i < 4; i++) { const z = 1.2 * s + i * 1.45 * s, r = (2.6 - i * .55) * s; K.cyl(x, y, z, r, .1, 2.2 * s, i % 2 ? '#1e5a3a' : '#24683f', 8); K.cyl(x, y, z + .9 * s, r * .55, .05, 1.1 * s, '#f0f6ff', 8, false); } solids.push([x, y, .4 * s, h]); break; }
    case 'chalet': chalet(K, x, y, yaw); solids.push({ box: [x, y, 0, 5, 4, 6, yaw] }); anim.push({ kind: 'window', x, y, z: 0, yaw, s: 1 }); break;
    case 'snowman': K.ball(x, y, 1, 1.1, 1.1, 1, '#f4f8ff', 8); K.ball(x, y, 2.4, .8, .8, .75, '#f4f8ff', 8); K.ball(x, y, 3.4, .55, .55, .5, '#f4f8ff', 8); K.box(x + Math.cos(yaw) * .55, y + Math.sin(yaw) * .55, 3.4, .5, .12, .12, '#ff8a1a', yaw); K.cyl(x, y, 3.8, .45, .45, .5, '#1a1a22', 8); solids.push([x, y, 1.1, 3]); break;
    case 'ice': K.box(x, y, 1, 2, 2, 2, '#a8e0ff', yaw, '#d8f4ff'); K.box(x + 1.6, y + .4, .6, 1.2, 1.2, 1.2, '#98d4f8', yaw + .4, '#c8ecff'); solids.push([x, y, 1.4, 2]); break;
    case 'lamp': K.cyl(x, y, 0, .15, .12, 6, '#3a3a44', 6); K.box(x + Math.cos(yaw) * .7, y + Math.sin(yaw) * .7, 6, 1.6, .2, .2, '#3a3a44', yaw); anim.push({ kind: 'lamp', x: x + Math.cos(yaw) * 1.3, y: y + Math.sin(yaw) * 1.3, z: 5.8, s: 1 }); break;
  }
}
function nobuild(K, solids, anim, env, cx, cy, kind, R) {
  const x0 = GX + cx * CELL, y0 = GY + cy * CELL, mx = x0 + CELL / 2, my = y0 + CELL / 2;
  if (kind === 'hedge') { K.box(mx, my, 1.6, CELL - 1, CELL - 1, 3.2, '#2a6a22', 0, '#3a7a2a'); for (let i = 0; i < 6; i++) K.ball(x0 + 3 + R() * (CELL - 6), y0 + 3 + R() * (CELL - 6), 3.2, 2, 2, 1, '#3a8a2a', 6); solids.push({ box: [mx, my, 0, CELL / 2 - .5, CELL / 2 - .5, 3.2, 0] }); }
  else if (kind === 'pond') { K.box(mx, my, .02, CELL - 2, CELL - 2, .04, '#2a6ab8'); for (let i = 0; i < 8; i++) K.ball(x0 + 2 + R() * (CELL - 4), y0 + 2 + R() * (CELL - 4), .15, 1, 1, .15, '#3a8a3a', 6); }
  else if (kind === 'pine') for (let i = 0; i < 4; i++) prop(K, solids, anim, env, 'pine', x0 + 6 + R() * (CELL - 12), y0 + 6 + R() * (CELL - 12), 0, R, false, 1.2);
  else for (let i = 0; i < 3; i++) prop(K, solids, anim, env, 'rocks', x0 + 8 + R() * (CELL - 16), y0 + 8 + R() * (CELL - 16), R() * 6, R, false, 1.6);
}
function tyres(K, x, y, z) { for (let i = 0; i < 3; i++) { K.cyl(x, y, z + i * .38, .62, .62, .36, i % 2 ? '#f4f4f4' : '#1c1c22', 10, '#2a2a30'); } }
function hay(K, x, y, yaw) { const c = Math.cos(yaw), s = Math.sin(yaw); for (const d of [-1.2, 1.2]) K.box(x + c * d, y + s * d, .7, 2.2, 1.4, 1.4, '#e8c860', yaw, '#f0d878'); K.box(x, y, 1.9, 2.2, 1.4, 1.0, '#e0c058', yaw, '#f0d878'); }
function barn(K, x, y, yaw) { K.box(x, y, 3, 12, 9, 6, '#b8302a', yaw); const c = Math.cos(yaw), s = Math.sin(yaw); K.box(x, y, 6.6, 12.4, 6.6, 1.4, '#4a3a32', yaw); K.box(x, y, 7.6, 12.4, 3.4, 1, '#4a3a32', yaw); K.box(x + c * 6.05, y + s * 6.05, 2, .1, 3.4, 4, '#f4f0e8', yaw); }
function chalet(K, x, y, yaw) { K.box(x, y, 2, 9, 7, 4, '#8a5a32', yaw); K.box(x, y, 4.6, 10.4, 5.2, 1.4, '#f4f8ff', yaw); K.box(x, y, 5.5, 10.4, 2.6, .8, '#f4f8ff', yaw); K.box(x, y, .2, 9.2, 7.2, .4, '#6a6a72', yaw); }
function grandstand(K, x, y, yaw, env) {
  const c = Math.cos(yaw), s = Math.sin(yaw), P = (a, b) => [x + c * a - s * b, y + s * a + c * b];
  for (let i = 0; i < 4; i++) { const [px, py] = P(-1.5 - i * 1.2, 0); K.box(px, py, .4 + i * .8, 1.3, 18, .8 + i * 1.6 * 0, env === 'frostpeak' ? '#8a92a0' : '#c8c8d0', yaw); const [qx, qy] = P(-1.5 - i * 1.2, 0); K.box(qx, qy, .8 + i * .8 + .05, 1.25, 18, .1, i % 2 ? '#e8402a' : '#2a6ae8', yaw); }
  const [rx, ry] = P(-4, 0); K.box(rx, ry, 5.6, 6, 19, .3, '#f4f4f4', yaw); for (const b of [-9, 9]) for (const a of [-1, -7]) { const [px, py] = P(a, b); K.cyl(px, py, 0, .15, .15, 5.6, '#5a5a62', 6); }
}
export { BOARDS };

/** the moving props, with the pen, this frame (t seconds; near: [x, y] of the camera: only what is within 420 m) */
export function drawAnim(pen, list, t, near, env) {
  for (const a of list) {
    if (near && Math.hypot(a.x - near[0], a.y - near[1]) > 420) continue;
    switch (a.kind) {
      case 'chevron': { const f = a.f, r = a.r, up = [0, 0, 1]; pen.frame(a.x * U, a.y * U, a.z * U, mul(f, -1), mul(r, -1), up, U);
        pen.tube(0, -1.6, 0, 0, -1.6, 2.2, .08, '#3a3a44').tube(0, 1.6, 0, 0, 1.6, 2.2, .08, '#3a3a44').box(0, 0, 2.7, .12, 4.4, 1.3, '#1a1a22');
        for (let i = 0; i < 3; i++) { const y = (i - 1) * 1.2 * -a.side, on = ((t * 4 + i) % 3) < 1.6; pen.slab(-.08, y - .35 * a.side, 3.2, -.08, y + .35 * a.side, 2.7, 1, 0, 0, .04, .26, on ? '#ffd23a' : '#ff8a1a').slab(-.08, y + .35 * a.side, 2.7, -.08, y - .35 * a.side, 2.2, 1, 0, 0, .04, .26, on ? '#ffd23a' : '#ff8a1a'); }
        break; }
      case 'tumble': { const k = (t * .25 + a.ph) % 1, d = (k - .5) * 60, x = a.x + Math.cos(a.yaw) * d, y = a.y + Math.sin(a.yaw) * d, z = Math.abs(Math.sin(t * 3 + a.ph)) * 1.2 + .7;
        pen.at(x * U, y * U, z * U, t * 4 + a.ph, U, t * 3, 0); for (let i = 0; i < 5; i++) pen.ball(0, 0, 0, .7, .7 - i * .08, .7, i % 2 ? '#a8804a' : '#8a6a3a'); break; }
      case 'pump': { const nod = Math.sin(t * 1.4 + a.ph) * .35; pen.at(a.x * U, a.y * U, 0, a.yaw, U);
        pen.box(0, 0, 2, .4, .4, 4, '#4a4a52').box(-.8, 0, 2, .3, .3, 4, '#4a4a52');
        pen.at(a.x * U, a.y * U, 4 * U, a.yaw, U, nod); pen.box(0, 0, 0, 7, .5, .5, '#e8a020').box(3.6, 0, -.6, .8, .6, 1.8, '#e8a020').box(-3.2, 0, -.2, 1.2, .8, 1.2, '#3a3a42'); break; }
      case 'board': { pen.at(a.x * U, a.y * U, 0, a.yaw, U); pen.box(0, 0, 6, 8, .3, 3.4, '#f4f4f4').box(0, .2, 6, 8.2, .1, 3.6, '#2a2a30');
        const w = a.text.length * 4 * .16, y0 = -w / 2; pen.at(a.x * U, a.y * U, 0, a.yaw + Math.PI / 2, U);
        drawText(pen, a.text, -.2, 0, 6, .16, '#e8402a'); pen.at(a.x * U, a.y * U, 0, a.yaw - Math.PI / 2, U); drawText(pen, a.text, -.2, 0, 6, .16, '#2a6ae8'); break; }
      case 'cow': { const bob = Math.sin(t * 1.3 + a.ph); pen.at(a.x * U, a.y * U, 0, a.yaw, U);
        pen.box(0, 0, 1.25, 2.2, 1, 1, '#f4f4ec'); if (a.spots) pen.box(.3, .51, 1.35, .7, .02, .5, '#1a1a22').box(-.5, -.51, 1.2, .6, .02, .4, '#1a1a22');
        for (const [x, y] of [[.8, .35], [.8, -.35], [-.8, .35], [-.8, -.35]]) pen.box(x, y, .4, .22, .22, .8, '#e8e4dc');
        pen.box(1.3, 0, 1.2 + bob * .25 - .3, .7, .6, .55, '#f4f4ec').box(1.68, 0, 1.06 + bob * .25 - .3, .1, .5, .3, '#f0a0a8');
        pen.tube(-1.1, 0, 1.6, -1.25, Math.sin(t * 3 + a.ph) * .3, .9, .05, '#3a3a3a'); break; }
      case 'windmill': { pen.at(a.x * U, a.y * U, a.z * U, a.yaw, U); const sp = t * 1.2 + a.ph;
        pen.box(2.3, 0, 0, .6, .6, .6, '#5a3a2a');
        for (let i = 0; i < 4; i++) { const ang = sp + i * Math.PI / 2, c = Math.cos(ang), s = Math.sin(ang); pen.slab(2.6, c * .5, s * .5, 2.6, c * 7, s * 7, 1, 0, 0, .1, .8, i % 2 ? '#f4f0e8' : '#e8e0d0'); } break; }
      case 'window': { pen.at(a.x * U, a.y * U, 0, a.yaw, U); for (const y of [-1.6, 1.6]) pen.box(4.52, y, 2.2, .06, 1, 1, '#ffd890').glow(4.6, y, 2.2, .45, '#ffc070'); break; }
      case 'lamp': pen.at().glow(a.x * U, a.y * U, a.z * U, 5, '#ffe0a0'); break;
    }
  }
  pen.at();
}
import { DOTS } from './view.js';
function drawText(pen, text, x, y, z, s, color) {
  const str = String(text).toUpperCase(), wid = str.length * 4 - 1, y0 = y - wid * s / 2;
  for (let i = 0; i < str.length; i++) { const g = DOTS[str[i]]; if (!g) continue; for (let r = 0; r < 5; r++) for (let c2 = 0; c2 < 3; c2++) if (g[r * 3 + c2] === '1') pen.box(x, y0 + (i * 4 + c2 + .5) * s, z + (2 - r) * s, .04, s * .9, s * .9, color); }
}
