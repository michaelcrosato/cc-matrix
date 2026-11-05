/* Vehicles and request objects (PLAN §9.3, §7.13). Cars are built from boxes in car space (x right, y up, z forward),
 * turned by their yaw and drawn far faces first, shaded with E.tones: any yaw from a gentle steer to a full spin shows
 * the right faces. Occupants ride in the cockpit (heads, hair streaming with speed, arms for their poses). Traffic uses
 * the same boxes; request objects (balloons, gnomes, bees, cones, arches, bouquets, ribbons, the photo box) animate. */
(() => {
'use strict';
const OB = window.OB, E = OB.E, { px } = E;
const LIFT = .32;   // how much "forward" rises on screen (the camera looks down a little)

/** draw a list of boxes [{ x0, x1, y0, y1, z0, z1, top, side, rear, front, sideL, sideR }] turned by yaw a */
function boxes(g, X, Y, k, a, list) {
  const c = Math.cos(a), s = Math.sin(a);
  const P = (x, y, z) => { const xr = x * c + z * s, zr = -x * s + z * c; return [X + xr * k, Y - (y + zr * LIFT) * k]; };
  const items = list.map(b => ({ b, d: -((b.x0 + b.x1) / 2) * s + ((b.z0 + b.z1) / 2) * c + (b.bias || 0) }));
  items.sort((p, q) => q.d - p.d);
  for (const { b } of items) {
    const { x0, x1, y0, y1, z0, z1 } = b;
    const quad = (pts, col) => { if (col) px.poly(g, pts.map(p => P(...p)), col); };
    if (c > 0) quad([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], b.rear);
    if (c < 0) quad([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], b.front || b.rear);
    if (s > 0) quad([[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], b.sideR || b.side);
    if (s < 0) quad([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], b.sideL || b.side);
    quad([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], b.top);
    if (b.after) b.after(P, c, s);
  }
  return P;
}
OB.boxes = boxes;

/* ---- the Fioretti cars ---- */
const LOOK = {
  classic: { W: 470, L: 1000, H: 230, deck: .62, nose: .45, lamps: 'round' },
  modern: { W: 520, L: 1080, H: 240, deck: .55, nose: .5, lamps: 'twin' },
  wedge: { W: 540, L: 1060, H: 205, deck: .5, nose: .55, lamps: 'strip' },
  barchetta: { W: 520, L: 1160, H: 235, deck: .6, nose: .58, lamps: 'twin' },
  hyper: { W: 560, L: 1100, H: 190, deck: .5, nose: .6, lamps: 'led' }
};
OB.CAR_W = 520;
/** o: { model, paint, yaw, steer, brake, night, speed, t, occupants: { driver, passenger, pose, scarf }, ghost, tag, shadow } */
OB.drawCar = function (g, X, Y, k, o) {
  const car = OB.CARS[o.model] || OB.CARS.orchidea, L = LOOK[car.look], W = L.W, H = L.H, Lz = L.L, a = o.yaw || 0;
  const paint = o.paint || car.paint, t = E.tones(paint), tr = E.tones(car.trim || '#c8c8d0');
  if (W * k < 3) { px.rect(g, X - W * k / 2, Y - H * k * .7, Math.max(1, W * k), Math.max(1, H * k * .7), t.base); return; }
  if (o.shadow !== false) px.blend(g, .4, 'multiply', () => px.ell(g, X, Y - 4 * k, W * k * .62, Math.max(1, 70 * k), '#20202a'));
  const tyre = '#1a1a20', rim = '#c8c8d0', hw = W / 2, deckZ = Lz * L.deck, cock0 = Lz * .28, cock1 = Lz * .62;
  const wheel = (x, z) => ({ x0: x - 60, x1: x + 60, y0: 0, y1: 190, z0: z - 110, z1: z + 110, rear: tyre, side: (Math.floor((o.t || 0) * (o.speed || 0) * .05) % 2) ? '#2a2a30' : tyre, top: '#2a2a30', after: (P, c, s) => { const p = P(x + (s > 0 ? 60 : -60), 95, z); if (Math.abs(s) > .2 && k * 60 > 2) px.disc(g, p[0], p[1], 45 * k, rim); } });
  const list = [
    wheel(-hw + 70, 220), wheel(hw - 70, 220), wheel(-hw + 70, Lz - 220), wheel(hw - 70, Lz - 220),
    { x0: -hw, x1: hw, y0: 70, y1: H * .62, z0: 0, z1: Lz, rear: t.base, side: t.sh, top: t.lt, front: t.base },
    { x0: -hw + 20, x1: hw - 20, y0: H * .62, y1: H, z0: 0, z1: cock0, rear: t.lt, side: t.base, top: t.lt },
    { x0: -hw + 20, x1: hw - 20, y0: H * .62, y1: H * .92, z0: cock1, z1: Lz - 40, rear: t.base, side: t.base, top: t.lt, front: t.base },
    { x0: -hw + 10, x1: hw - 10, y0: 40, y1: 100, z0: -30, z1: 0, rear: car.look === 'classic' ? '#e8e8f0' : t.deep, side: t.deep, top: car.look === 'classic' ? '#ffffff' : t.sh, bias: -5 }
  ];
  if (car.hoops) for (const x of [-hw * .45, hw * .45]) list.push({ x0: x - 70, x1: x + 70, y0: H, y1: H + 150, z0: cock0 - 40, z1: cock0, rear: tr.base, side: tr.sh, top: tr.lt });
  if (car.targa) list.push({ x0: -hw + 30, x1: hw - 30, y0: H, y1: H + 170, z0: cock0 + 60, z1: cock0 + 110, rear: '#2a2a30', side: '#1a1a20', top: '#3a3a40' });
  if (car.humps) for (const x of [-hw * .45, hw * .45]) list.push({ x0: x - 90, x1: x + 90, y0: H, y1: H + 90, z0: cock0 - 160, z1: cock0, rear: t.base, side: t.sh, top: t.lt });
  if (car.fins) for (const x of [-hw + 30, hw - 30]) list.push({ x0: x - 20, x1: x + 20, y0: H, y1: H + 60, z0: 0, z1: 200, rear: t.lt, side: t.base, top: t.hi });
  if (car.look === 'hyper') list.push({ x0: -hw + 30, x1: hw - 30, y0: H, y1: H + 40, z0: 10, z1: 90, rear: '#2a2a30', side: '#2a2a30', top: '#3a3a40' });
  const P = boxes(g, X, Y, k, a, list);
  const c = Math.cos(a), big = W * k > 26;
  // the cockpit, the windscreen and who sits in it
  const cp = [[-hw + 50, H, cock0], [hw - 50, H, cock0], [hw - 60, H * .92, cock1], [-hw + 60, H * .92, cock1]].map(p => P(...p));
  px.poly(g, cp, '#2a1a1a');
  if (big) { const seat = '#6a3a2a'; for (const x of [-hw * .42, hw * .42]) px.poly(g, [P(x - 80, H, cock0 + 30), P(x + 80, H, cock0 + 30), P(x + 80, H + 120, cock0 + 40), P(x - 80, H + 120, cock0 + 40)], seat); }
  const ws = [[-hw + 60, H * .92, cock1], [hw - 60, H * .92, cock1], [hw - 90, H + 170, cock1 + 70], [-hw + 90, H + 170, cock1 + 70]].map(p => P(...p));
  px.blend(g, .45, 'normal', () => px.poly(g, ws, '#a8d8f0')); px.line(g, ws[3][0], ws[3][1], ws[2][0], ws[2][1], tr.base);
  if (o.occupants && big && c > -.3) drawOccupants(g, P, k, W, H, cock0, o);
  // lights on the rear (or the front, mid-spin)
  if (big) {
    const lampOn = o.brake || o.night, lc = o.brake ? '#ff3020' : o.night ? '#e02818' : '#a01818', ly = H * .45;
    if (c > .2) {
      const lamp = (x, w) => { const q = [P(x - w, ly - 25, -1), P(x + w, ly - 25, -1), P(x + w, ly + 25, -1), P(x - w, ly + 25, -1)]; px.poly(g, q, lc); if (lampOn && o.glow) o.glow((q[0][0] + q[1][0]) / 2, (q[0][1] + q[2][1]) / 2, (o.brake ? 70 : 50) * k, '#ff3020', o.brake ? .8 : .5); };
      if (L.lamps === 'round') { for (const x of [-hw + 70, hw - 70]) { const p = P(x, ly, -1); px.disc(g, p[0], p[1], 32 * k, lc); if (lampOn && o.glow) o.glow(p[0], p[1], 60 * k, '#ff3020', .7); } }
      else if (L.lamps === 'twin') for (const x of [-hw + 60, -hw + 140, hw - 140, hw - 60]) { const p = P(x, ly, -1); px.disc(g, p[0], p[1], 30 * k, lc); if (lampOn && o.glow) o.glow(p[0], p[1], 50 * k, '#ff3020', .6); }
      else if (L.lamps === 'strip') { lamp(-hw + 110, 90); lamp(hw - 110, 90); }
      else { lamp(0, hw - 40); }
      const plate = [P(-90, 90, -2), P(90, 90, -2), P(90, 150, -2), P(-90, 150, -2)]; px.poly(g, plate, '#f4f0e0');
      if (W * k > 70) E.font.text(g, 'FIORI', Math.round((plate[0][0] + plate[1][0]) / 2), Math.round(plate[0][1] - 6), '#2a2a6a', { align: 'center', font: 'tiny', outline: false });
      for (const x of [-hw * .5, hw * .5]) { const p = P(x, 70, -5); px.rect(g, p[0] - 12 * k, p[1] - 10 * k, 24 * k, 20 * k, '#4a4a50'); }
    } else if (c < -.2) for (const x of [-hw + 80, hw - 80]) { const p = P(x, H * .5, Lz + 1); px.disc(g, p[0], p[1], 34 * k, '#fff8d0'); if (o.night && o.glow) o.glow(p[0], p[1], 200 * k, '#fff8d0', .8); }
    if (car.bloom && c > 0) for (let i = 0; i < 3; i++) { const p = P(-hw * .6 + i * hw * .6, H * .62 - 30, -1); px.disc(g, p[0], p[1], 22 * k, '#ffd040'); }
  }
  if (o.tag && big) E.font.text(g, o.tag, Math.round(X), Math.round(Y - (H + 420) * k), o.tagColor || '#ffffff', { align: 'center', shadow: '#000', outline: false });
  return P;
};

/** the driver and passenger: heads, shoulders and arms seen from behind; hair and scarves stream with speed */
function drawOccupants(g, P, k, W, H, z, o) {
  const occ = o.occupants, v = Math.min(1, (o.speed || 0) / 260), t = o.t || 0, hw = W / 2;
  const seat = [{ who: occ.driver, x: -hw * .42 }, { who: occ.passenger, x: hw * .42 }];
  seat.forEach((s, i) => {
    const cast = OB.CAST[s.who]; if (!cast || !cast.head) return;
    const hd = cast.head, lean = i === 0 ? (o.steer || 0) * 40 : -(o.steer || 0) * 25, pose = i === 1 ? occ.pose : occ.drPose;
    const base = P(s.x + lean, H + 20, z + 60), sh = P(s.x + lean, H + 105, z + 60), head = P(s.x + lean * 1.3, H + 185, z + 60), r = 44 * k;
    const outfit = (cast.outfits && cast.outfits[occ['outfit' + i] || 0]) || null, cloth = outfit ? outfit.cloth : (cast.rig.colors.cloth || '#ffffff');
    px.poly(g, [[base[0] - 70 * k, base[1]], [base[0] + 70 * k, base[1]], [sh[0] + 58 * k, sh[1]], [sh[0] - 58 * k, sh[1]]], cloth);
    // arms by pose: cheer (both up), point (one out), cover (hands to face), cross (folded), wave, steer (on the wheel)
    const arm = (side, ex, ey) => { ex *= .75; ey *= .75; const s0 = [sh[0] + side * 55 * k, sh[1] + 8 * k], e = [s0[0] + ex * k, s0[1] - ey * k]; px.line(g, s0[0], s0[1], e[0], e[1], hd.skin, Math.max(1, 30 * k)); px.disc(g, e[0], e[1], 18 * k, hd.skin); };
    if (pose === 'cheer') { arm(-1, -60, 260 + Math.sin(t * 12) * 30); arm(1, 60, 260 + Math.cos(t * 12) * 30); }
    else if (pose === 'point') { const d = occ.pointDir || 1; arm(d, d * 260, 120); }
    else if (pose === 'cover') { arm(-1, 40, 150); arm(1, -40, 150); }
    else if (pose === 'cross') { px.rect(g, sh[0] - 70 * k, sh[1] + 20 * k, 140 * k, 30 * k, hd.skin); }
    else if (pose === 'wave') arm(1, 80, 240 + Math.sin(t * 10) * 50);
    else if (pose === 'camera') { arm(-1, 30, 160); arm(1, -30, 160); px.rect(g, head[0] - 40 * k, head[1] - 20 * k, 80 * k, 50 * k, '#2a2a30'); }
    else if (i === 0) { arm(-1, 10, 60); arm(1, -10, 60); }
    // hair streams back (up the screen) with speed
    px.disc(g, head[0], head[1], r, hd.skin);
    const hc = hd.color, stream = 30 + v * 120;
    if (hd.hair === 'long') { px.poly(g, [[head[0] - r, head[1]], [head[0] + r, head[1]], [head[0] + r * .8 + Math.sin(t * 9) * 8 * k, head[1] + r * 1.6 - stream * k * .3], [head[0] - r * .8, head[1] + r * 1.7 - stream * k * .3]], hc); px.disc(g, head[0], head[1] - r * .2, r * 1.02, hc); }
    else if (hd.hair === 'ponytail') { px.disc(g, head[0], head[1] - r * .1, r * 1.02, hc); const tail = [head[0] + Math.sin(t * 8) * 10 * k, head[1] - r * .6 - stream * k * .4]; px.line(g, head[0], head[1] - r * .5, tail[0], tail[1], hc, Math.max(1, 26 * k)); }
    else if (hd.hair === 'bob') { px.disc(g, head[0], head[1], r * 1.08, hc); px.rect(g, head[0] - r * 1.08, head[1], r * 2.16, r * .7, hc); }
    else if (hd.hair === 'spiky') { px.disc(g, head[0], head[1] - r * .1, r, hc); for (let j = -2; j <= 2; j++) px.poly(g, [[head[0] + j * r * .4 - r * .2, head[1] - r * .6], [head[0] + j * r * .45, head[1] - r * 1.5 - v * r * .5], [head[0] + j * r * .4 + r * .2, head[1] - r * .6]], hc); }
    else { px.disc(g, head[0], head[1] - r * .15, r, hc); px.poly(g, [[head[0] - r * .7, head[1] - r * .6], [head[0] + r * .2, head[1] - r * 1.35 - v * r * .3], [head[0] + r * .8, head[1] - r * .5]], hc); }
    if (hd.cap) px.poly(g, [[head[0] - r, head[1] - r * .3], [head[0] + r, head[1] - r * .3], [head[0] + r * .7, head[1] - r * 1.1], [head[0] - r * .7, head[1] - r * 1.1]], hd.cap);
    if (hd.clip) px.disc(g, head[0] + r * .6, head[1] - r * .5, r * .3, hd.clip);
    if (hd.scarf) { const sx = head[0] + r * .3, sy = head[1] + r * .9, f = Math.sin(t * 11) * 14 * k; px.poly(g, [[sx, sy], [sx + 30 * k, sy], [sx + (120 + v * 220) * k, sy - (60 + v * 90) * k + f], [sx + (90 + v * 220) * k, sy - (90 + v * 90) * k + f]], hd.scarf); }
  });
}
OB.drawOccupants = drawOccupants;

/* ---- traffic, rear views from the same boxes ---- */
OB.drawTraffic = function (g, X, Y, k, o) {
  const T = OB.TRAFFIC[o.type], hw = T.hw * OB.ROADW, L = T.len, H = T.h, col = o.color || T.colors[0], t = E.tones(col), a = o.yaw || 0;
  if (hw * 2 * k < 2) { px.rect(g, X - hw * k, Y - H * k, Math.max(1, hw * 2 * k), Math.max(1, H * k), t.base); return; }
  px.blend(g, .35, 'multiply', () => px.ell(g, X, Y - 2 * k, hw * k * 1.15, Math.max(1, 50 * k), '#20202a'));
  const glass = '#5a7a9a', tyre = '#1a1a20', list = [];
  const wheelsAt = (zs, r = 90) => { for (const z of zs) for (const x of [-hw + 40, hw - 40]) list.push({ x0: x - 40, x1: x + 40, y0: 0, y1: r * 2, z0: z - r, z1: z + r, rear: tyre, side: tyre, top: '#2a2a30' }); };
  const body = (y0, y1, z0, z1, x0 = -hw, x1 = hw, c = t) => list.push({ x0, x1, y0, y1, z0, z1, rear: c.base, side: c.sh, top: c.lt, front: c.base });
  const ty = o.type;
  if (ty === 'scooter') { list.push({ x0: -30, x1: 30, y0: 0, y1: 120, z0: 0, z1: 200, rear: tyre, side: tyre, top: t.base }); body(80, 220, 30, 180, -60, 60); }
  else if (ty === 'tractor') { wheelsAt([90], 150); list.push({ x0: -hw + 50, x1: hw - 50, y0: 60, y1: 170, z0: 160, z1: 420, rear: t.base, side: t.sh, top: t.lt }); body(140, 260, 0, 160, -hw * .6, hw * .6, E.tones('#e8e0c8')); }
  else {
    wheelsAt([L * .2, L * .8], ty === 'bus' || ty === 'truck' ? 100 : 80);
    if (ty === 'hatch' || ty === 'sedan' || ty === 'taxi') { body(50, H * .6, 0, L); list.push({ x0: -hw + 30, x1: hw - 30, y0: H * .6, y1: H, z0: L * .18, z1: L * .7, rear: glass, side: glass, top: t.lt, front: glass }); if (ty === 'taxi') list.push({ x0: -50, x1: 50, y0: H, y1: H + 40, z0: L * .4, z1: L * .5, rear: '#2a2a2a', side: '#2a2a2a', top: '#f8f8f8' }); }
    else if (ty === 'pickup') { body(50, H * .55, 0, L); list.push({ x0: -hw + 20, x1: hw - 20, y0: H * .55, y1: H, z0: L * .55, z1: L * .85, rear: glass, side: t.base, top: t.lt }); list.push({ x0: -hw * .5, x1: hw * .2, y0: H * .55, y1: H * .8, z0: L * .1, z1: L * .35, rear: '#a07a4a', side: '#8a6a3a', top: '#c8a070' }); }
    else if (ty === 'truck') { body(60, H, 0, L * .75, -hw, hw, E.tones('#f4f0e8')); body(60, H * .75, L * .78, L); for (let i = 0; i < 4; i++) list.push({ x0: -hw + 30 + i * hw * .45, x1: -hw + 90 + i * hw * .45, y0: H, y1: H + 70, z0: L * .1, z1: L * .2, rear: '#3a8a3a', side: '#3a8a3a', top: '#ff6aa0' }); }
    else { body(50, H, 0, L); if (ty === 'bus') list.push({ x0: -hw + 10, x1: hw - 10, y0: H * .55, y1: H * .85, z0: -1, z1: L * .02, rear: glass, side: glass, top: glass }); if (ty === 'camper') list.push({ x0: -hw * .3, x1: hw * .3, y0: H, y1: H + 30, z0: L * .05, z1: L * 1.05, rear: '#3ac0e0', side: '#2aa0c0', top: '#5ad8f0' }); if (ty === 'icecream') { list.push({ x0: -60, x1: 60, y0: H, y1: H + 120, z0: L * .4, z1: L * .5, rear: '#e8c080', side: '#d8b070', top: '#ffb0d0' }); } }
  }
  const P = boxes(g, X, Y, k, a, list), c = Math.cos(a);
  if (hw * 2 * k > 14 && c > .2) {
    const br = o.brake, lc = br ? '#ff3020' : '#a81818';
    for (const x of [-hw + 40, hw - 40]) { const p = P(x, H * .4, -1); px.rect(g, p[0] - 22 * k, p[1] - 14 * k, 44 * k, 28 * k, lc); if ((br || o.night) && o.glow) o.glow(p[0], p[1], 90 * k, '#ff3020', br ? .8 : .5); }
    if (o.blink && Math.floor(o.t * 3) % 2) { const p = P(o.blink * (hw - 20), H * .55, -1); px.rect(g, p[0] - 16 * k, p[1] - 10 * k, 32 * k, 20 * k, '#ffb020'); if (o.glow) o.glow(p[0], p[1], 80 * k, '#ffb020', .8); }
    if (ty === 'tractor' && Math.floor(o.t * 2) % 2) { const p = P(0, 280, 80); px.disc(g, p[0], p[1], 20 * k, '#ff9a20'); if (o.glow) o.glow(p[0], p[1], 120 * k, '#ff9a20', .9); }
    if (ty === 'van' || ty === 'truck') { const p = P(0, H * .65, -1); px.disc(g, p[0], p[1], 50 * k, '#ff6aa0'); px.disc(g, p[0], p[1], 20 * k, '#ffe040'); }
    if (ty === 'scooter') { const hd = P(0, 330, 100); px.rect(g, hd[0] - 40 * k, hd[1], 80 * k, 120 * k, o.rider || '#3a5a9a'); px.disc(g, hd[0], hd[1] - 10 * k, 45 * k, '#f0f0f0'); }
  }
  if (o.honk) E.font.text(g, '♪', Math.round(X + hw * k), Math.round(Y - (H + 200) * k), '#ffffff', { shadow: '#000', outline: false });
};

/* ---- request objects ---- */
const H_ = OB.artHelpers, R = H_.R, D = H_.D, PL = H_.PL;
OB.OBJ_ART = {
  balloon(g, X, Y, k, o) { const c = ['#ff4a7a', '#ffd040', '#4ab0ff'][o.v % 3], b = Math.sin(o.t * 3 + o.v) * 40, y = 700 + b; px.line(g, X, Y - (y - 160) * k, X + Math.sin(o.t * 2) * 20 * k, Y - 200 * k, '#ffffff'); D(g, X, Y, k, -70, y + 40, 105, c); D(g, X, Y, k, 70, y + 40, 105, c); PL(g, X, Y, k, [[-170, y + 20], [170, y + 20], [0, y - 170]], c); D(g, X, Y, k, -80, y + 80, 35, '#ffffff'); },
  gnome(g, X, Y, k, o) { const w = Math.sin(o.t * 6 + o.v) * 30; R(g, X, Y, k, -110, 0, 220, 260, '#3a6ad0'); D(g, X, Y, k, 0, 330, 95, '#f0c8a0'); PL(g, X, Y, k, [[-120 + w * .2, 260], [0, 280], [-40, 200]], '#ffffff'); PL(g, X, Y, k, [[-110, 380], [110, 380], [w, 640]], '#e83a3a'); D(g, X, Y, k, -35, 350, 26, '#ffffff'); D(g, X, Y, k, 35, 350, 26, '#ffffff'); D(g, X, Y, k, -35, 350, 12, '#1a1a1a'); D(g, X, Y, k, 35, 350, 12, '#1a1a1a'); },
  bee(g, X, Y, k, o) { for (let i = 0; i < 7; i++) { const a = o.t * 9 + i * 2.4, x = Math.cos(a) * 180 + Math.sin(a * 1.7) * 60, y = 600 + Math.sin(a * 1.3) * 160; D(g, X, Y, k, x, y, 45, '#ffd020'); R(g, X, Y, k, x - 10, y - 45, 20, 90, '#1a1a1a'); D(g, X, Y, k, x, y + 50, 30, '#e8f4ff'); } },
  cone(g, X, Y, k, o) { R(g, X, Y, k, -160, 0, 320, 50, '#e85a1a'); PL(g, X, Y, k, [[-120, 50], [120, 50], [20, 560], [-20, 560]], '#ff7a2a'); R(g, X, Y, k, -80, 240, 160, 70, '#ffffff'); if (o.side && k * 300 > 6) E.font.text(g, o.side < 0 ? '←' : '→', Math.round(X), Math.round(Y - 900 * k), '#ffe040', { align: 'center', shadow: '#000', outline: false, scale: k > .08 ? 2 : 1 }); },
  arch(g, X, Y, k, o) { const W = OB.ROADW * .32; for (const s of [-1, 1]) R(g, X, Y, k, s * W - 50, 0, 100, 1700, '#5a9a4a'); for (let i = 0; i < 11; i++) { const an = Math.PI * i / 10, x = -Math.cos(an) * W, y = 1600 + Math.sin(an) * 500; D(g, X, Y, k, x, y, 120, ['#ff6aa0', '#ffd040', '#ffffff', '#c080ff'][i % 4]); } },
  bouquet(g, X, Y, k, o) { const r = o.t * 3 + o.v, y = 500 + Math.sin(r) * 60; PL(g, X, Y, k, [[-90, y - 300], [90, y - 300], [20, y], [-20, y]], '#3a9a4a'); for (let i = 0; i < 5; i++) D(g, X, Y, k, Math.cos(r + i * 1.25) * 110, y + 80 + Math.sin(i) * 40, 80, ['#ff4a7a', '#ffd040', '#ffffff', '#ff8ac0', '#c060ff'][i]); if (Math.floor(o.t * 6 + o.v) % 3 === 0) D(g, X, Y, k, 150, y + 260, 30, '#ffffff'); },
  ribbon(g, X, Y, k, o) { const W = OB.ROADW * (o.gap || .5), wav = Math.sin(o.t * 8) * 40; for (let i = 0; i < 10; i++) R(g, X, Y, k, -W + i * W / 5, 250 + (i % 2 ? wav : -wav), W / 5 + 4, 70, i % 2 ? '#ff6aa0' : '#ff9ac8'); D(g, X, Y, k, 0, 280, 90, '#ff3a8a'); },
  photo(g, X, Y, k, o) {
    const W = OB.ROADW * .55, L = 2 * OB.SEG, t = E.tones('#ffd040');
    // the box: painted on the asphalt between this point and two segments on (its far edge drawn by the second marker)
    R(g, X, Y, k, -W, 0, W * 2, 30, t.base); for (const s of [-1, 1]) R(g, X, Y, k, s * W - 15, 0, 30, 120, t.base);
    E.font.text(g, 'PHOTO', Math.round(X), Math.round(Y - 140 * k - 8), '#ffe040', { align: 'center', shadow: '#000', outline: false });
    const sx = X + (W + 600) * k; R(g, sx, Y, k, -40, 0, 80, 900, '#2a2a30'); R(g, sx, Y, k, -150, 900, 300, 200, '#3a3a40'); D(g, sx, Y, k, -100, 1000, 70, '#a8d8f0');
    if (o.flash) o.glow(sx - 100 * k, Y - 1000 * k, 900 * k, '#ffffff', 1);
  },
  photoEnd(g, X, Y, k) { const W = OB.ROADW * .55; R(g, X, Y, k, -W, 0, W * 2, 30, '#ffd040'); },
  gate(g, X, Y, k, o) { R(g, X, Y, k, -300, 0, 600, 60, o.color || '#ff6aa0'); for (const s of [-1, 1]) R(g, X, Y, k, s * 300 - 30, 0, 60, 900, o.color || '#ff6aa0'); },
  sting(g, X, Y, k, o) { OB.OBJ_ART.bee(g, X, Y, k, o); }
};
})();
