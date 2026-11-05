// B.Quadruped: a four-legged rig in the spirit of the engine's Humanoid. A skeleton posed by math every step from
// continuous inputs (speed picks the gait: walk, trot, gallop, bound; graze, alert, look, call, hurt, limp, jump, death),
// drawn as shaded capsules (pixel volumes) through the Vista raster. The same capsules are its hit zones, so a shot hits
// what is drawn. Antlers are generated from a seed (typical whitetail, elk, palmate moose). Also: an x-ray side view for
// the Shot Chart and a head-and-antlers mount for the Lodge.
(() => {
const B = BB, E = B.E;

// species presets (metres; whitetail at size 1)
const PRESETS = {
  deer: { len: 1, legs: 1, neck: 1, head: 1, girth: 1, colors: { coat: '#8a6440', belly: '#e8dcc8', dark: '#4a3424', hoof: '#2a2018', muzzle: '#3a2a20', tail: '#f4f0e8', rump: '#e8dcc8', antler: '#e8d8b0', eye: '#100808' }, tail: .14, ear: .13, earW: .045 },
  elk: { len: 1.05, legs: 1.05, neck: 1.15, head: 1.05, girth: 1.08, colors: { coat: '#b08a5a', belly: '#6a4a30', dark: '#4a3020', hoof: '#2a2018', muzzle: '#3a2a20', tail: '#e8d8b8', rump: '#e8d4a8', mane: '#5a3a22', antler: '#d8c8a0', eye: '#100808' }, tail: .08, ear: .12, earW: .04, mane: true },
  moose: { len: 1.0, legs: 1.2, neck: .8, head: 1.35, girth: 1.12, colors: { coat: '#5e4432', belly: '#4a3626', dark: '#8a7a6a', hoof: '#2a2018', muzzle: '#4a3a2c', tail: '#4a3626', rump: '#5e4432', antler: '#c8b890', eye: '#100808' }, tail: .06, ear: .14, earW: .05, hump: .12, bell: true, droop: true },
  canid: { len: .62, legs: .62, neck: .55, head: .62, girth: .55, colors: { coat: '#a0a0a8', belly: '#e0e0e0', dark: '#505058', hoof: '#303030', muzzle: '#303030', tail: '#808088', rump: '#a0a0a8', eye: '#ffd040' }, tail: .32, ear: .1, earW: .04, canid: true, bushy: true },
  cow: { len: 1.15, legs: .9, neck: .7, head: 1.0, girth: 1.4, colors: { coat: '#f0f0ec', belly: '#f0f0ec', dark: '#1a1a1a', hoof: '#2a2a2a', muzzle: '#e8a8a0', tail: '#1a1a1a', rump: '#f0f0ec', eye: '#100808' }, tail: .3, ear: .1, earW: .06, patches: true, bell: true }
};
B.QPRESETS = PRESETS;

// gaits: [LF, RF, LH, RH] phase offsets, stance share, stride (m at size 1), body bob
const GAITS = {
  walk: { off: [.25, .75, 0, .5], st: .65, stride: .9, bob: .015, lift: .1 },
  trot: { off: [0, .5, .5, 0], st: .45, stride: 1.4, bob: .03, lift: .16 },
  gallop: { off: [.5, .6, 0, .1], st: .3, stride: 2.6, bob: .06, lift: .22 },
  bound: { off: [.45, .5, 0, .05], st: .25, stride: 3.2, bob: .1, lift: .28 }
};
B.GAITS = GAITS;

// ---- antlers: polylines in the head frame (x forward, y left, z up), metres at size 1 ----
function antlers(kind, points, seed, spread) {
  const R = B.mkRng(seed * 13 + 7), out = { beams: [], palms: [] };
  for (const side of [1, -1]) {
    if (kind === 'whitetail') {
      const n = Math.max(2, Math.round(points / 2)), s = 1 + R.range(-.08, .1);
      const beam = [[0, .045 * side, .05], [-.07, .15 * side, .16 * s], [-.02, .25 * side, .25 * s], [.1, .24 * side, .3 * s], [.21, .15 * side, .31 * s], [.28, .07 * side, .28 * s]];
      out.beams.push({ pts: beam, r: .018 });
      out.beams.push({ pts: [[-.01, .07 * side, .1], [.07, .08 * side, .17]], r: .012 });   // brow tine
      for (let k = 1; k < n - 1; k++) {
        const u = .3 + .55 * k / Math.max(1, n - 2), p = along(beam, u), len = (.13 + R.range(0, .07)) * s;
        out.beams.push({ pts: [p, [p[0] + .02, p[1] - .015 * side, p[2] + len]], r: .012 });
      }
      if (points >= 14) { const p = along(beam, .55); out.beams.push({ pts: [p, [p[0] - .02, p[1] + .04 * side, p[2] - .12]], r: .013 }); out.beams.push({ pts: [along(beam, .25), [-.04, .27 * side, .3]], r: .01 }); }
    } else if (kind === 'elk') {
      const n = Math.max(4, Math.round(points / 2)), s = 1 + R.range(-.06, .08);
      const beam = [[0, .05 * side, .05], [-.15, .16 * side, .3 * s], [-.3, .28 * side, .62 * s], [-.42, .3 * side, .92 * s], [-.4, .24 * side, 1.15 * s]];
      out.beams.push({ pts: beam, r: .03 });
      for (let k = 0; k < n - 1; k++) {
        const u = .08 + .82 * k / (n - 1), p = along(beam, u), len = (k === 3 ? .42 : .28 + R.range(0, .1)) * s;
        out.beams.push({ pts: [p, [p[0] + len * .85, p[1] + .02 * side, p[2] + len * .45]], r: .018 });
      }
    } else if (kind === 'moose') {
      const sp = (spread || 50) * .0254 / 2, s = sp / .63;
      const base = [0, .06 * side, .03], mid = [-.05, .22 * side * s, .08];
      out.beams.push({ pts: [base, mid], r: .045 });
      // the palm: a fan of triangles, points along its rim
      const rim = [];
      for (let k = 0; k <= 6; k++) { const a = k / 6; rim.push([-.18 + a * .38, (.25 + .4 * Math.sin(a * Math.PI * .9)) * side * s, .1 + .3 * Math.sin(a * Math.PI) + a * .05]); }
      out.palms.push({ c: mid, rim });
      const np = Math.max(4, Math.round(points / 2));
      for (let k = 0; k < np; k++) { const p = rim[Math.min(6, Math.round(k / (np - 1) * 6))]; out.beams.push({ pts: [p, [p[0] + .02, p[1] + .08 * side, p[2] + .1]], r: .014 }); }
      out.beams.push({ pts: [mid, [.12, .2 * side * s, .1]], r: .03 });   // brow palm
    }
  }
  out.points = points; out.kind = kind;
  return out;
}
function along(pts, u) {
  let L = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]); seg.push(l); L += l; }
  let d = u * L; for (let i = 0; i < seg.length; i++) { if (d <= seg[i]) { const t = d / seg[i], a = pts[i], b = pts[i + 1]; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; } d -= seg[i]; }
  return pts[pts.length - 1].slice();
}
B.antlers = antlers;

// ---- 3D helpers ----
const v3 = (x, y, z) => [x, y, z];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const len = a => Math.hypot(a[0], a[1], a[2]);
const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
B.v3 = { add, sub, mul, len, norm, cross };
// two-bone IK in a plane given a bend hint direction
function ik2(a, c, l1, l2, hint) {
  const d = sub(c, a), dl = Math.min(len(d), l1 + l2 - 1e-4), dn = norm(d);
  const x = (l1 * l1 - l2 * l2 + dl * dl) / (2 * dl), y = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  let h = sub(hint, mul(dn, hint[0] * dn[0] + hint[1] * dn[1] + hint[2] * dn[2])); h = norm(h);
  return add(add(a, mul(dn, x)), mul(h, y));
}

class Quadruped {
  constructor(o = {}) {
    this.species = o.species || 'deer'; const P = this.P = PRESETS[this.species];
    this.sex = o.sex || 'buck'; this.size = o.size || 1;
    this.colors = Object.assign({}, P.colors, o.colors || {});
    this.antler = o.antlers ? antlers(o.antlers.kind, o.antlers.points, o.antlers.seed, o.antlers.spread) : null;
    this.young = !!o.young;
    this.phase = 0; this.gaitW = { walk: 1, trot: 0, gallop: 0, bound: 0 };
    this.st = { x: 0, y: 0, z: 0, heading: 0, speed: 0, graze: 0, alert: 0, look: 0, lookUp: 0, hurt: 0, dead: 0, jump: 0, call: 0, limp: -1, deadSide: 1, flag: 0, breathe: 0, earT: 0, chew: 0, pitch: 0, roll: 0, stomp: 0, wade: 0 };
    this.t = 0; this.parts = []; this.zones = []; this.J = {};
    this.tones = {}; for (const k in this.colors) this.tones[k] = B.tones(this.colors[k]);
    this.seed = o.seed || 1;
  }
  // in: { x, y, z (ground), heading, speed (m/s), gait (optional), graze, alert, look (radians, + left), call, hurt, dead, jump (0..1 arc), limp, wade, ground(x, y) }
  update(dt, s) {
    const S = this.st; this.t += dt;
    for (const k of ['x', 'y', 'z', 'heading', 'speed', 'limp', 'deadSide', 'wade']) if (s[k] !== undefined) S[k] = s[k];
    this.ground = s.ground || (() => S.z);
    const ease = (k, v, r) => { S[k] = B.approach(S[k], v === undefined ? 0 : v, r * dt); };
    ease('graze', s.graze, 2.2); ease('alert', s.alert, 4); ease('call', s.call, 3); ease('hurt', s.hurt, 8);
    S.look = B.approach(S.look, s.look || 0, 3 * dt); S.lookUp = B.approach(S.lookUp, s.lookUp || 0, 3 * dt);
    S.dead = s.dead !== undefined ? B.approach(S.dead, s.dead, dt / 1.0) : S.dead;
    S.jump = s.jump || 0;
    // the gait from speed (blended)
    const sp = S.speed / (this.size * (this.P.legs || 1)), want = s.gait || (sp < 2.2 ? 'walk' : sp < 4.8 ? 'trot' : this.species === 'deer' && sp > 7 ? 'bound' : 'gallop');
    for (const g in this.gaitW) this.gaitW[g] = B.approach(this.gaitW[g], g === want ? 1 : 0, dt * 3);
    let stride = 0; for (const g in this.gaitW) stride += GAITS[g].stride * this.gaitW[g];
    stride *= this.size * (this.P.legs || 1);
    if (S.speed > .05) this.phase = (this.phase + dt * S.speed / stride) % 1;
    S.flag = B.approach(S.flag, sp > 5 && this.species === 'deer' ? 1 : S.alert > .7 ? .6 : 0, dt * 4);
    S.breathe += dt; S.earT += dt; S.chew += dt * (S.graze > .5 ? 1 : 0);
    this.solve();
  }
  solve() {
    const S = this.st, P = this.P, sz = this.size, L = P.len * sz, G = P.legs * sz, gr = P.girth * sz, dead = S.dead;
    const moving = Math.min(1, S.speed / .3);
    // gait numbers
    let off = [0, 0, 0, 0], st = 0, bob = 0, lift = 0; const gw = this.gaitW;
    for (const g in gw) { const w = gw[g]; if (!w) continue; const q = GAITS[g]; for (let k = 0; k < 4; k++) off[k] += q.off[k] * w; st += q.st * w; bob += q.bob * w; lift += q.lift * w; }
    let stride = 0; for (const g in gw) stride += GAITS[g].stride * gw[g]; stride *= sz * P.legs;
    const ph = this.phase, sp = S.speed;
    // body
    const bobz = Math.sin(ph * Math.PI * 4) * bob * moving * sz;
    const breathe = Math.sin(S.breathe * 2.2) * .006 * sz;
    const jumpZ = S.jump > 0 ? Math.sin(S.jump * Math.PI) * .9 * sz : 0;
    const hipH = .78 * G, shH = .74 * G;
    // world frame: heading h, with body pitch from ground under fore and hind
    const h = S.heading, ch = Math.cos(h), sh = Math.sin(h), gnd = this.ground;
    const fz = gnd(S.x + ch * .5 * L, S.y + sh * .5 * L), bz = gnd(S.x - ch * .55 * L, S.y - sh * .55 * L);
    let pitch = Math.atan2(fz - bz, 1.05 * L);
    const lowDie = dead > 0 ? B.smooth(Math.min(1, dead * 1.3)) : 0;
    const roll = dead > 0 ? S.deadSide * 1.25 * B.smooth(B.clamp((dead - .25) / .75, 0, 1)) : 0;
    const baseZ = (S.z + (fz + bz) / 2) / 2 + bobz + breathe + jumpZ - lowDie * (hipH * .62) - S.wade * 0;
    this.origin = [S.x, S.y, baseZ];
    const cp = Math.cos(pitch), spn = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
    // local -> world (local x forward, y left, z up), with roll about x then pitch about y then heading
    const W = (lx, ly, lz) => { let y1 = ly * cr - lz * sr, z1 = ly * sr + lz * cr; let x2 = lx * cp - z1 * spn, z2 = lx * spn + z1 * cp; return [S.x + x2 * ch - y1 * sh, S.y + x2 * sh + y1 * ch, baseZ + z2]; };
    this.W = W;
    const J = this.J;
    J.pelvis = W(-.55 * L, 0, hipH + .06 * gr);
    J.withers = W(.48 * L, 0, shH + .16 * gr + (P.hump || 0) * sz);
    J.chestF = W(.52 * L, 0, shH - .02 * gr);
    J.chestB = W(.08 * L, 0, shH + .0 * gr);
    J.belly = W(-.1 * L, 0, hipH - .01 * gr);
    J.rump = W(-.55 * L, 0, hipH + .03 * gr);
    // neck and head: graze lowers, alert raises, look turns, call stretches
    const gz = S.graze, al = S.alert, ca = S.call;
    const nl = .42 * P.neck * sz, hl = .27 * P.head * sz;
    let nAng = (50 - gz * 95 + al * 18 - ca * 25 + (P.droop ? -12 : 0)) * B.DEG;   // up from forward
    if (dead > 0) nAng = B.lerp(nAng, -10 * B.DEG, lowDie);
    const look = S.look * (1 - gz) * (1 - lowDie);
    const neckBase = [.58 * L, 0, shH + .08 * gr];
    const nd = [Math.cos(nAng) * Math.cos(look), Math.cos(nAng) * Math.sin(look), Math.sin(nAng)];
    const headBaseL = [neckBase[0] + nd[0] * nl, neckBase[1] + nd[1] * nl, neckBase[2] + nd[2] * nl];
    let hAng = (-35 - gz * 40 + al * 10 + ca * 45 + S.lookUp * 30 - (P.droop ? 20 : 0)) * B.DEG + Math.sin(S.chew * 9) * .05 * gz;
    if (S.hurt > 0) hAng += S.hurt * .5;
    const hd = [Math.cos(hAng) * Math.cos(look * 1.4), Math.cos(hAng) * Math.sin(look * 1.4), Math.sin(hAng)];
    const muzzleL = [headBaseL[0] + hd[0] * hl, headBaseL[1] + hd[1] * hl, headBaseL[2] + hd[2] * hl];
    J.neckBase = W(...neckBase); J.headBase = W(...headBaseL); J.muzzle = W(...muzzleL);
    // head frame (world): forward, left, up
    const fwd = norm(sub(J.muzzle, J.headBase));
    const leftL = [-Math.sin(look * 1.4), Math.cos(look * 1.4), 0];
    const lw = sub(W(leftL[0], leftL[1], leftL[2]), W(0, 0, 0));
    const up = norm(cross(fwd, norm(lw))), left = norm(cross(up, fwd));
    this.headF = { o: J.headBase, f: fwd, l: left, u: up };
    // legs
    const legTop = [[.45 * L, .12 * gr, shH - .02], [.45 * L, -.12 * gr, shH - .02], [-.5 * L, .13 * gr, hipH], [-.5 * L, -.13 * gr, hipH]];
    this.legs = [];
    for (let k = 0; k < 4; k++) {
      const fore = k < 2, top = W(...legTop[k]);
      let u = (ph + off[k]) % 1; const stance = u < st;
      let fx, fz2 = 0;
      const strideK = stride * (S.limp === k ? .4 : 1);
      if (sp < .05) { fx = 0; }
      else if (stance) { fx = (.5 - u / st) * strideK * .5; }
      else { const v = (u - st) / (1 - st); fx = (-.5 + v) * strideK * .5; fz2 = Math.sin(v * Math.PI) * lift * G; }
      fx *= moving;
      let hoofL = [legTop[k][0] + fx + (fore ? .02 : -.02) * L, legTop[k][1] * .9, 0];
      // poses: tuck for jumps and death, a stomp when alert
      if (S.jump > 0) { const tk = Math.sin(S.jump * Math.PI); hoofL = [legTop[k][0] + (fore ? .25 : -.3) * tk * L, hoofL[1], .35 * G * tk]; }
      let hw = W(hoofL[0], hoofL[1], 0);
      const gzH = gnd(hw[0], hw[1]);
      if (dead > 0) { hw = W(hoofL[0] + (fore ? .25 : -.2) * lowDie * L, hoofL[1] + legTop[k][1] * 2.5 * lowDie, hipH * .35 * lowDie); }
      else hw = [hw[0], hw[1], (S.jump > 0 ? hw[2] : gzH) + fz2 + (S.wade > 0 ? 0 : 0)];
      if (S.alert > .8 && k === 0 && sp < .1 && Math.sin(S.earT * 1.3) > .97) hw[2] += .12 * G;
      const fet = [hw[0], hw[1], hw[2] + .09 * G];
      const l1 = (fore ? .33 : .37) * G, l2 = (fore ? .38 : .45) * G;
      const hint = fore ? sub(W(1, 0, -.2), W(0, 0, 0)) : sub(W(-1, 0, -.2), W(0, 0, 0));
      const mid = ik2(top, fet, l1, l2, hint);
      this.legs.push({ top, mid, fet, hoof: hw, fore });
    }
    // tail
    const tl = P.tail * sz, flag = S.flag;
    J.tailBase = W(-.62 * L, 0, hipH + .1 * gr);
    J.tailTip = W(-.62 * L - tl * (.3 + flag * .5), 0, hipH + .1 * gr + tl * (-.9 + flag * 1.6) + Math.sin(this.t * 3) * .01);
    this.build();
  }
  // the capsules: drawn and hit (zones)
  build() {
    const J = this.J, P = this.P, sz = this.size, gr = P.girth * sz, T = this.tones, parts = this.parts; parts.length = 0;
    const cap = (zone, a, b, ra, rb, tone, extra) => parts.push(Object.assign({ zone, a, b, ra, rb, tone }, extra || {}));
    // body: chest, barrel, rump
    cap('chest', J.chestF, J.chestB, .2 * gr, .22 * gr, T.coat);
    cap('gut', J.chestB, J.belly, .22 * gr, .215 * gr, T.coat);
    cap('ham', J.belly, J.rump, .2 * gr, .18 * gr, P.patches ? T.dark : T.coat);
    if (P.hump) cap('chest', J.chestF, J.withers, .17 * gr, .1 * gr, T.coat);
    // a pale belly line and rump patch
    cap('gut', add(J.chestB, [0, 0, -.1 * gr]), add(J.belly, [0, 0, -.1 * gr]), .13 * gr, .12 * gr, T.belly);
    cap('ham', add(J.rump, [0, 0, .0]), J.tailBase, .12 * gr, .08 * gr, T.rump);
    // neck and head
    const nr = .1 * sz * (P.mane ? 1.25 : 1) * (this.sex === 'buck' && this.species === 'deer' ? 1.15 : 1);
    cap('neck', J.neckBase, J.headBase, nr * 1.2, nr * .8, P.mane ? T.mane : T.coat);
    const hb = J.headBase, mz = J.muzzle, hr = .075 * sz * P.head;
    cap('head', hb, mz, hr, hr * .62, T.coat);
    cap('head', add(mz, mul(this.headF.u, -.01 * sz)), add(mz, mul(this.headF.f, .02 * sz)), hr * .55, hr * .45, T.muzzle);
    if (P.bell) cap('neck', add(hb, mul(this.headF.u, -hr * .8)), add(hb, add(mul(this.headF.u, -hr * 2.6), mul(this.headF.f, .05))), .03 * sz, .045 * sz, P.patches ? T.hoof : T.dark);
    // ears
    const H = this.headF, eL = P.ear * sz * (this.young ? 1.3 : 1);
    for (const side of [1, -1]) {
      const base = add(hb, add(mul(H.l, side * hr * .7), mul(H.u, hr * .6)));
      const flick = Math.sin(this.st.earT * 1.7 + side) > .96 ? .3 : 0;
      const dir = norm(add(add(mul(H.l, side * (P.canid ? .4 : .9)), mul(H.u, (P.canid ? 1 : .5) + this.st.alert * .4)), mul(H.f, -.3 + flick)));
      cap('head', base, add(base, mul(dir, eL)), P.earW * sz, P.earW * sz * .45, T.coat, { ear: true });
    }
    // eyes: tiny dark spheres
    for (const side of [1, -1]) { const e = add(hb, add(add(mul(H.l, side * hr * .8), mul(H.u, hr * .25)), mul(H.f, hr * .9))); parts.push({ zone: 'head', a: e, b: e, ra: .018 * sz, rb: .018 * sz, tone: T.eye, flat: true, deco: true }); }
    // legs: upper, lower, cannon to the hoof
    for (const g of this.legs) {
      const rTop = (g.fore ? .1 : .14) * gr;
      cap('leg', g.top, g.mid, rTop, .05 * sz * P.legs, T.coat);
      cap('leg', g.mid, g.fet, .04 * sz * P.legs, .03 * sz * P.legs, P.patches ? T.coat : T.dark);
      cap('leg', g.fet, g.hoof, .03 * sz * P.legs, .028 * sz * P.legs, T.hoof);
    }
    // tail
    cap('ham', J.tailBase, J.tailTip, (P.bushy ? .07 : .045) * sz, (P.bushy ? .05 : .03) * sz, this.st.flag > .4 ? T.tail : T.coat);
    if (P.patches) { const s = this.seed; for (let k = 0; k < 3; k++) { const u = B.hash2(s, k, 3), a = B.lerp(J.chestF[0], J.rump[0], u), b = B.lerp(J.chestF[1], J.rump[1], u), c = B.lerp(J.chestF[2], J.rump[2], u); parts.push({ zone: 'gut', a: [a, b, c + .1], b: [a, b, c + .1], ra: .16 * gr, rb: .16 * gr, tone: T.dark, deco: true }); } }
    // antlers
    this.antlerParts = [];
    if (this.antler) {
      const boost = B.TUNING.antlerBoost, s = sz * boost, A = this.antler;
      const top = add(hb, mul(H.u, hr * .7));
      const toW = p => add(top, add(add(mul(H.f, p[0] * s), mul(H.l, p[1] * s)), mul(H.u, p[2] * s)));
      for (const bm of A.beams) for (let i = 0; i < bm.pts.length - 1; i++) { const pp = { zone: 'antler', a: toW(bm.pts[i]), b: toW(bm.pts[i + 1]), ra: bm.r * s, rb: bm.r * s * .8, tone: T.antler, antler: true }; parts.push(pp); this.antlerParts.push(pp); }
      this.palms = A.palms.map(pm => ({ c: toW(pm.c), rim: pm.rim.map(toW) }));
    } else this.palms = [];
    // interior zones (not drawn): heart, lungs, shoulders
    const W = this.W, L = P.len * sz, Gl = P.legs * sz;
    this.inner = [
      { zone: 'heart', a: W(.38 * L, 0, .58 * Gl), b: W(.38 * L, 0, .58 * Gl), ra: .085 * gr, rb: .085 * gr },
      { zone: 'lung', a: W(.42 * L, 0, .72 * Gl), b: W(.1 * L, 0, .74 * Gl), ra: .14 * gr, rb: .13 * gr },
      { zone: 'shoulder', a: this.legs[0].top, b: this.legs[1].top, ra: .11 * gr, rb: .11 * gr }
    ];
  }
  // world-space bound
  bound() { const o = this.origin; return { x: o[0], y: o[1], z: o[2], r: 1.4 * this.size * Math.max(1, this.P.len) + (this.antler ? .5 * this.size : 0) }; }
  draw(ras, o = {}) {
    const id = o.id || 0, seen = o.lod;
    for (const p of this.parts) {
      if (p.deco && seen === 'far') continue;
      ras.capsule(p.a[0], p.a[1], p.a[2], p.b[0], p.b[1], p.b[2], p.ra, p.rb, p.tone, { id, outline: true, flat: p.flat });
    }
    for (const pm of this.palms) for (let i = 0; i < pm.rim.length - 1; i++) ras.tri(pm.c, pm.rim[i], pm.rim[i + 1], this.tones.antler[i % 2 ? 2 : 3], { id, outline: true });
    if (o.glint && this.antlerParts.length) { for (const p of this.antlerParts) ras.dot(p.b[0], p.b[1], p.b[2] + .02, .01, 0xffffffff); }
  }
}
B.Quadruped = Quadruped;
B.ik2 = ik2;
})();
