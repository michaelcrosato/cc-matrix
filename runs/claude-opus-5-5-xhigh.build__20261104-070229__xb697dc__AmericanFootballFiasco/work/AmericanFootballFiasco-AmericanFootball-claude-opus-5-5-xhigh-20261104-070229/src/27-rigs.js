// Rigs: athletes and the cast as HD Humanoids in football gear (the gear hook, E3), driven from the sim's pose codes
// through the engine's procedural rig, E.MOVES, motion-capture clips (the FIASCO set) and PoseFX (joint post-processing).
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, { px } = E;
const TAU = Math.PI * 2;
let LIB = null;
const lib = () => { if (!LIB && window.Mocap && window.MOCAP && window.MOCAP.FIASCO) LIB = window.Mocap.load(window.MOCAP.FIASCO); return LIB; };
FF.anim = lib;
const clipCache = {};
/** a move from E.MOVES at overall progress p (0..1) through its wind, strike and recovery */
const mv = (name, p) => { const sp = E.move(name).spec, w = sp.wind || .06, a = sp.active || .1, r = sp.recover || .18, T = w + a + r, t = Math.max(0, Math.min(1, p)) * T;
  return t < w ? { spec: sp, phase: 'wind', u: t / w } : t < w + a ? { spec: sp, phase: 'active', u: (t - w) / a } : { spec: sp, phase: 'recover', u: Math.min(1, (t - w - a) / r) }; };
FF.mv = mv;
const clip = name => { const L = lib(); if (!L) return null; return clipCache[name] || (clipCache[name] = L.clip(name)); };
// pose names <-> codes (Appendix C), for replays and the network
const POSES = ['idle', 'run', 'stance3', 'stance2', 'qbUC', 'qbSG', 'snap', 'dropback', 'throw', 'handoffGive', 'handoffTake', 'carry', 'catchReady', 'catch', 'jump', 'dive', 'tackleDive', 'spin',
  'stiffArm', 'hurdle', 'block', 'shed', 'bigHit', 'tackled', 'fly', 'down', 'getUp', 'pile', 'kick', 'hold', 'celebrate', 'cheer', 'dejected', 'refTD', 'refFD', 'refInc', 'refShrug',
  'cheerleader', 'coachYell', 'kneel', 'strip', 'lateral', 'diveCatch', 'seismic', 'mudslide'];
const POSE_CODE = Object.fromEntries(POSES.map((p, i) => [p, i]));
FF.POSES = POSES; FF.POSE_CODE = POSE_CODE;

/* ---- the gear hook: football gear drawn inside the rig, depth sorted with its parts ---- */
function gear(a) {
  const { g, Sp, Q, J, u, push, rig } = a, ff = rig.ff || {}, o = rig.o, C = rig.C, T = E.tones;
  const lights = FF.lightsOut && ff.glowTrim;
  if (ff.kind === 'player') {
    // shoulder pads: a wide disc over each shoulder, the jersey's color with a darker rim
    for (const s of [-1, 1]) {
      const sh = s > 0 ? Q.shR : Q.shL, pad = Sp(s > 0 ? J.shR : J.shL, -.2, s * .35, .7), t = T(C.cloth), far = sh[2] < a.dC;
      push(sh[2] + .04, () => { px.disc(g, pad[0], pad[1], 1.75 * u, far ? t.deep : t.sh); px.disc(g, pad[0] - .6, pad[1] - .6, Math.max(.6, 1.75 * u - 1), far ? t.sh : t.base); if (!far) px.dot(g, pad[0] - u, pad[1] - u, t.lt); });
    }
    // the jersey number: on the chest when it faces the camera, the back when it faces away, hidden edge-on
    const td = o.torsoW * .62, fr = Sp(J.shC, td, 0, -3.2), bk = Sp(J.shC, -td, 0, -3.2), d = fr[2] - bk[2];
    if (Math.abs(d) > .8 && ff.num !== undefined && u > .9) {
      const p = d > 0 ? fr : bk, s = String(ff.num), sc = u > 2.2 ? 2 : 1;
      push(Math.max(fr[2], bk[2]) + .02, () => E.font.text(g, s, Math.round(p[0]), Math.round(p[1]) - 2 * sc, lights ? ff.glow : ff.numColor, { font: 'tiny', align: 'center', outline: false, scale: sc }));
    }
    // sleeve trim bands
    for (const s of [-1, 1]) { const sh = s > 0 ? J.shR : J.shL, el = s > 0 ? J.elbowR : J.elbowL, m = [sh[0] + (el[0] - sh[0]) * .7, sh[1] + (el[1] - sh[1]) * .7, sh[2] + (el[2] - sh[2]) * .7], p = Sp(m); push(p[2] + .015, () => px.disc(g, p[0], p[1], Math.max(.6, .9 * u), lights ? ff.glow : C.trim)); }
    if (lights) { const h = Sp(J.head, 0, 0, o.headR * 1.1); push(Q.head[2] + .1, () => { px.glow(g, 1); px.dot(g, h[0], h[1], ff.glow); }); }
  }
  // a beard or a mustache
  if (ff.beard) { const b = Sp(J.head, o.headR * .78, 0, -o.headR * .55), t = T(ff.beard); push(Q.head[2] + .02, () => { if (b[2] > Q.head[2] - .4) { px.disc(g, b[0], b[1], o.headR * u * .5, t.sh); px.disc(g, b[0] - .4, b[1] - .4, Math.max(.5, o.headR * u * .5 - .8), t.base); } }); }
  if (ff.stache) { const m = Sp(J.head, o.headR * .98, 0, -o.headR * .32); push(Q.head[2] + .03, () => { if (m[2] > Q.head[2]) px.rect(g, m[0] - u, m[1], Math.max(2, Math.round(u * 2)), 1, ff.stache); }); }
  // the carried ball, at the carrying hand
  if (ff.carry) {
    const h = ff.carry === 'L' ? Q.handL : Q.handR;
    push(h[2] + .05, () => FF.drawBall(g, h[0], h[1] - 1, u, ff.ballAngle || 0, ff.hot));
  }
  // a referee's stripes
  if (ff.stripes) {
    const td = o.torsoW * .7, fr = Sp(J.shC, td, 0, 0)[2] > Sp(J.shC, -td, 0, 0)[2] ? td : -td;
    push(a.dC + .03, () => { for (const k of [-2.1, -.7, .7, 2.1]) { const p0 = Sp(J.shC, fr, k, -.4), p1 = Sp(J.hipC, fr, k, .9); px.line(g, p0[0], p0[1], p1[0], p1[1], '#18161e', Math.max(1, Math.round(u * .5))); } });
  }
  // a broadcast headset
  if (ff.headset) { const R = o.headR, e = Sp(J.head, 0, R * 1.0, 0), e2 = Sp(J.head, 0, -R * 1.0, 0), top = Sp(J.head, 0, 0, R * 1.05), mic = Sp(J.head, R * .9, R * .6, -R * .5);
    push(Q.head[2] + .06, () => { px.line(g, e[0], e[1], top[0], top[1], '#2a2a30'); px.line(g, e2[0], e2[1], top[0], top[1], '#2a2a30'); px.disc(g, e[0], e[1], Math.max(1, u * .8), '#2a2a30'); px.line(g, e[0], e[1], mic[0], mic[1], '#2a2a30'); px.dot(g, mic[0], mic[1], '#e83a2a'); }); }
  // pom-poms in the hands
  if (ff.pompoms) for (const s of [-1, 1]) { const h = s > 0 ? Q.handR : Q.handL, c = s > 0 ? ff.pompoms[0] : ff.pompoms[1]; push(h[2] + .05, () => { const t = T(c); px.disc(g, h[0], h[1], 2.2 * u, t.sh); px.disc(g, h[0] - .5, h[1] - .5, 1.6 * u, t.base); px.dot(g, h[0] - u, h[1] - u, t.hi); }); }
  // a bass drum or a horn (the band)
  if (ff.instrument === 'drum') { const p = Sp(J.hipC, 2.8, 0, 1.5); push(p[2] + .1, () => { const t = T(ff.drumColor || '#f0c040'); px.disc(g, p[0], p[1], 3.4 * u, t.sh); px.disc(g, p[0] - .5, p[1] - .5, 2.6 * u, '#f4f0e6'); px.line(g, p[0] - 3 * u, p[1], p[0] + 3 * u, p[1], t.base); }); }
  if (ff.instrument === 'horn') { const h = Q.handR, b = Sp(J.head, o.headR * 2.4, .5, -.3); push(h[2] + .06, () => { px.line(g, h[0], h[1], b[0], b[1], '#e8c040', Math.max(1, Math.round(u * .8))); px.disc(g, b[0], b[1], 1.3 * u, '#f0d060'); }); }
  // a mascot's costume head: a big disc over the real one with its features
  if (ff.mascot) {
    const H = Sp(J.head, 0, 0, o.headR * .3), r = o.headR * u * 2.1, f = Sp(J.head, o.headR * 1.6, 0, o.headR * .2), front = f[2] > H[2] - .5, m = ff.mascot, t0 = rig.t;
    push(Q.head[2] + .2, () => {
      if (m === 'tumbleweed') { const t = T('#a87a4a'); px.disc(g, H[0], H[1], r, t.sh); px.disc(g, H[0] - .6, H[1] - .6, r - 1, t.base); for (let k = 0; k < 9; k++) { const a1 = k * 2.3 + t0 * .4, a2 = a1 + 2; px.line(g, H[0] + Math.cos(a1) * r * .8, H[1] + Math.sin(a1) * r * .8, H[0] + Math.cos(a2) * r * .7, H[1] + Math.sin(a2) * r * .7, t.deep); }
        if (front) { for (const s of [-1, 1]) { px.disc(g, f[0] + s * r * .32, f[1] - r * .1, r * .26, '#ffffff'); px.dot(g, f[0] + s * r * .32 + Math.round(Math.sin(t0 * 3) * r * .1), f[1] - r * .08, '#14100c'); } }
        if (ff.onFire) { px.glow(g, 1); for (let k = 0; k < 4; k++) px.disc(g, H[0] + Math.sin(t0 * 9 + k * 2) * r * .5, H[1] - r * .9 - k * 2, Math.max(1, r * .3 - k), k % 2 ? '#ffd84a' : '#ff7a2a'); } }
      else if (m === 'hog') { const t = T('#e8a0a0'); for (const s of [-1, 1]) { const e = Sp(J.head, -o.headR * .2, s * o.headR * 1.6, o.headR * 1.5); px.poly(g, [[e[0] - r * .3, e[1] + r * .3], [e[0], e[1] - r * .4], [e[0] + r * .3, e[1] + r * .3]], t.sh); }
        px.disc(g, H[0], H[1], r, t.sh); px.disc(g, H[0] - .6, H[1] - .6, r - 1, t.base);
        if (front) { px.disc(g, f[0], f[1] + r * .25, r * .42, t.lt); px.dot(g, f[0] - r * .14, f[1] + r * .25, t.deep); px.dot(g, f[0] + r * .14, f[1] + r * .25, t.deep); for (const s of [-1, 1]) px.dot(g, f[0] + s * r * .4, f[1] - r * .25, '#14100c'); } }
      else if (m === 'owl') { const t = T('#2a2a3a'); px.disc(g, H[0], H[1], r, t.sh); px.disc(g, H[0] - .6, H[1] - .6, r - 1, t.base); for (const s of [-1, 1]) { const e = Sp(J.head, 0, s * o.headR * 1.3, o.headR * 2.2); px.line(g, e[0], e[1], H[0] + s * r * .4, H[1] - r * .6, t.deep, 2); }
        if (front) { px.glow(g, 1); for (const s of [-1, 1]) { px.disc(g, f[0] + s * r * .38, f[1] - r * .1, r * .32, '#3af0f0'); px.disc(g, f[0] + s * r * .38, f[1] - r * .1, r * .14, '#0a0a14'); } px.poly(g, [[f[0] - r * .12, f[1] + r * .2], [f[0] + r * .12, f[1] + r * .2], [f[0], f[1] + r * .45]], '#ffd84a'); } }
      else if (m === 'yeti') { const t = T('#eef2f8'); for (const s of [-1, 1]) { const e = Sp(J.head, 0, s * o.headR * 1.4, o.headR * 1.9); px.poly(g, [[e[0] - 2, e[1] + 3], [e[0] + s * 3, e[1] - 4], [e[0] + 2, e[1] + 3]], '#c8b8a0'); }
        px.disc(g, H[0], H[1], r, t.sh); px.disc(g, H[0] - .6, H[1] - .6, r - 1, t.base); for (let k = 0; k < 6; k++) px.dot(g, H[0] + Math.cos(k) * r * .8, H[1] + Math.sin(k * 1.7) * r * .8, t.lt);
        if (front) { px.disc(g, f[0], f[1], r * .5, '#8ab0d0'); for (const s of [-1, 1]) px.dot(g, f[0] + s * r * .22, f[1] - r * .1, '#14100c'); px.rect(g, f[0] - r * .2, f[1] + r * .2, Math.max(2, r * .4), 1, '#14100c'); } }
      else if (m === 'lion') { const t = T('#f0c040'), mn = T('#c8782a'); px.disc(g, H[0], H[1], r * 1.15, mn.sh); for (let k = 0; k < 10; k++) { const aa = k / 10 * TAU; px.disc(g, H[0] + Math.cos(aa) * r, H[1] + Math.sin(aa) * r, r * .28, mn.base); }
        px.disc(g, H[0], H[1], r * .8, t.base); if (front) { for (const s of [-1, 1]) px.dot(g, f[0] + s * r * .25, f[1] - r * .15, '#14100c'); px.disc(g, f[0], f[1] + r * .2, r * .2, '#8a4a2a'); } }
      else { const t = T('#c83a3a'); px.disc(g, H[0], H[1], r, t.sh); px.disc(g, H[0] - .6, H[1] - .6, r - 1, t.base); if (front) for (const s of [-1, 1]) px.dot(g, f[0] + s * r * .3, f[1], '#ffffff'); }
    });
  }
  // cartoon stars orbiting a Dinged helmet
  if (ff.dinged) { const R = o.headR * 1.8; push(Q.head[2] + .3, () => { px.glow(g, 1); for (let k = 0; k < 3; k++) { const aa = rig.t * 5 + k * TAU / 3, p = Sp(J.head, Math.cos(aa) * R, Math.sin(aa) * R, o.headR * 1.4); px.dot(g, p[0], p[1], '#fff8a0'); px.dot(g, p[0] + 1, p[1], '#ffd84a'); } }); }
}

/** the football: a brown prolate ellipse with white laces, its long axis at angle a (screen radians) */
FF.drawBall = (g, x, y, u, a = 0, hot = false, spin = 0) => {
  const L = Math.max(2.4, 3.6 * u * .9), W = Math.max(1.4, 2.1 * u * .9), ca = Math.cos(a), sa = Math.sin(a), pts = [];
  for (let k = 0; k < 10; k++) { const t = k / 10 * TAU, ex = Math.cos(t) * L, ey = Math.sin(t) * W; pts.push([x + ex * ca - ey * sa, y + ex * sa + ey * ca]); }
  if (hot) { px.glow(g, 1); px.disc(g, x, y, L + 1.5, '#ff7a2a'); }
  px.poly(g, pts, '#5a2a12');
  const inner = pts.map(([px0, py0]) => [x + (px0 - x) * .78 - .4, y + (py0 - y) * .7 - .4]); px.poly(g, inner, '#8a4a22');
  px.dot(g, x - ca * L * .3 - .8, y - sa * L * .3 - .8, '#c07a44');
  const lx = spin ? (spin > 0 ? .5 : -.5) : 0;
  px.line(g, x - ca * L * .35 - sa * lx, y - sa * L * .35 + ca * lx - 1, x + ca * L * .35 - sa * lx, y + sa * L * .35 + ca * lx - 1, '#f4f0e6');
  for (const s of [-.9, .9]) px.dot(g, x + ca * L * s * .95, y + sa * L * s * .95, '#e8e0d0');
};

/* ---- PoseFX: rotate, lift and place joints after the rig solves its pose (Emberdeep's dodge-roll trick) ---- */
function wrapFX(rig) {
  const solve = rig.solvePose.bind(rig);
  rig.fx = { tilt: 0, roll: 0, lift: 0, tuck: 0, tuckSide: 'R', hoh: 0, armsFwd: 0 };
  rig.solvePose = () => {
    solve();
    const f = rig.fx, J = rig.J, o = rig.o; if (!J.hipC) return;
    if (f.tuck > .01) {
      const s = f.tuckSide === 'L' ? -1 : 1, hk = s > 0 ? 'handR' : 'handL', ek = s > 0 ? 'elbowR' : 'elbowL', sh = s > 0 ? J.shR : J.shL;
      const hand = [J.shC[0] + o.torsoW * .9, s * 1.2, J.shC[2] - 3.4], elbow = [sh[0] - .6, sh[1] + s * .8, sh[2] - 3.6];
      J[hk] = E.V3.lerp(J[hk], hand, f.tuck); J[ek] = E.V3.lerp(J[ek], elbow, f.tuck);
    }
    if (f.hoh > .01) for (const s of [-1, 1]) { const hk = s > 0 ? 'handR' : 'handL', ek = s > 0 ? 'elbowR' : 'elbowL'; J[hk] = E.V3.lerp(J[hk], [J.head[0] + .6, s * o.headR * 1.05, J.head[2] + o.headR * .5], f.hoh); J[ek] = E.V3.lerp(J[ek], [J.head[0] - .5, s * (o.shoulderHalf + 2.2), J.head[2] - 1.5], f.hoh); }
    if (f.armsFwd > .01) for (const s of [-1, 1]) { const hk = s > 0 ? 'handR' : 'handL', ek = s > 0 ? 'elbowR' : 'elbowL', sh = s > 0 ? J.shR : J.shL; J[hk] = E.V3.lerp(J[hk], [sh[0] + o.armUpper + o.armLower - .5, sh[1] * .7, sh[2] + .5], f.armsFwd); J[ek] = E.V3.lerp(J[ek], [sh[0] + o.armUpper, sh[1] * .85, sh[2] + .3], f.armsFwd); }
    const tilt = f.tilt, roll = f.roll;
    if (Math.abs(tilt) > .005 || Math.abs(roll) > .005 || f.lift) {
      const pv = J.hipC.slice(), ct = Math.cos(tilt), st = Math.sin(tilt), cr = Math.cos(roll), sr = Math.sin(roll);
      let minZ = 1e9;
      for (const k in J) {
        const p = J[k]; if (!Array.isArray(p) || p.length !== 3 || k === 'bladeDir') continue;
        let x = p[0] - pv[0], y = p[1] - pv[1], z = p[2] - pv[2];
        const y1 = y * cr - z * sr, z1 = y * sr + z * cr; y = y1; z = z1;   // roll about the forward axis
        const x2 = x * ct + z * st, z2 = -x * st + z * ct; x = x2; z = z2;  // tilt about the right axis (+ pitches the head forward)
        p[0] = x + pv[0]; p[1] = y + pv[1]; p[2] = z + pv[2]; if (p[2] < minZ) minZ = p[2];
      }
      const up = Math.max(0, 1.2 - minZ) * Math.min(1, Math.abs(tilt) + Math.abs(roll)) + (f.lift || 0);
      if (up) for (const k in J) { const p = J[k]; if (Array.isArray(p) && p.length === 3 && k !== 'bladeDir') p[2] += up; }
    }
  };
}

/* ---- making rigs ---- */
const BUILD_FOR = { QB: ['heroic', 1.25], RB: ['heroic', 1.24], WR: ['heroic', 1.2], OL: ['bulky', 1.38], DE: ['bulky', 1.34], NT: ['bulky', 1.44], LB: ['bulky', 1.3], CB: ['heroic', 1.2], S: ['heroic', 1.22], K: ['heroic', 1.02] };
const Rigs = FF.Rigs = {
  /** an athlete's rig: player data p of team t; home: true wears the team color, false white with team-color trim */
  athlete(p, t, home) {
    const [build, size0] = BUILD_FOR[p.pos] || ['heroic', 1.2], size = (p.extra && p.extra.size) || size0, c = t.colors;
    const jersey = home ? c.primary : '#f0eee6', trim = home ? c.trim : c.primary, num = home ? (E.tones(c.primary).base === c.primary && luma(c.primary) > 150 ? '#18161e' : c.trim) : c.primary;
    const rig = new E.Humanoid({ build: p.extra && p.extra.boss ? 'bulky' : build, size, weapon: null, sleeves: 'short', outfit: 'shirt', hair: p.hair || 'short',
      hat: { style: 'football', color: c.helmet, stripe: c.stripe, logo: c.secondary === c.helmet ? c.trim : c.secondary, mask: p.pos === 'K' || p.pos === 'QB' ? '#d8d8e0' : '#9a9aa4' },
      colors: { skin: p.skin, hair: p.hairColor || '#2a1a10', cloth: jersey, trim, pants: c.pants, belt: E.shade(c.pants, -.3), boot: c.cleats, glove: home ? c.secondary : c.primary } });
    const o = rig.o;
    if (p.pos === 'OL' || p.pos === 'NT' || p.pos === 'DE') { o.shoulderHalf += .6; o.torsoW += .6; o.lean += .08; }
    if (p.pos === 'RB') o.limbW += .3;
    if (['WR', 'CB', 'S'].includes(p.pos)) o.limbW -= .2;
    rig.ff = { kind: 'player', num: p.num, numColor: num, glow: c.glow, glowTrim: true, beard: p.extra && p.extra.beard, stache: p.extra && p.extra.stache };
    rig.o.gear = gear; rig.hatSave = o.hat;
    Rigs.prep(rig); return rig;
  },
  /** a cast member's rig from a look ({ build, size, hat, colors, ... }) and flags (headset, stripes, beard, mascot, pompoms) */
  person(look, flags = {}) {
    const rig = new E.Humanoid(Object.assign({ weapon: null, size: 1.2, build: 'heroic' }, look));
    rig.ff = Object.assign({ kind: 'cast' }, flags); rig.o.gear = gear; Rigs.prep(rig); return rig;
  },
  mascot(t) { return Rigs.person({ build: 'bulky', size: 1.3, colors: { cloth: t.colors.primary, pants: t.colors.secondary, skin: '#e0c0a0', boot: t.colors.cleats, trim: t.colors.trim } }, { mascot: t.mascot.head }); },
  coach(t) { return Rigs.person(Object.assign({}, t.coach.look), { headset: true }); },
  cheer(t, k) { return Rigs.person({ build: 'heroic', size: 1.1, hair: 'ponytail', face: { eyes: 'big' }, colors: { cloth: k % 2 ? t.colors.primary : t.colors.trim, pants: t.colors.secondary, skin: FF.SKIN[(k * 2 + 1) % 6], hair: ['#2a1a10', '#e0c070', '#c8502a', '#1a1210'][k % 4], boot: '#f4f4f0', trim: t.colors.secondary } }, { pompoms: [t.colors.primary, t.colors.trim] }); },
  ref() { const c = FF.data.cast.ref; return Rigs.person(c.look, { stripes: true }); },
  cast(id) { const c = FF.data.cast[id]; return Rigs.person(c.look, { headset: c.headset, stache: c.stache, beard: c.beard }); },
  prep(rig) { const L = lib(); if (L && window.Mocap) window.Mocap.drive(rig, L); wrapFX(rig); rig.st = { clip: null, ct: 0, w: 0 }; return rig; },
  /** the sim's pose to the rig's inputs: a = { x, y, z, vx, vy, facing, pose, poseU, poseT, carry, turbo, hot, ... } */
  drive(rig, a, dt) {
    const pose = a.pose || 'idle', u = a.poseU || 0, f = rig.fx, st = rig.st;
    const P = { x: a.x, y: a.y, z: a.z || 0, vx: a.vx || 0, vy: a.vy || 0, facing: a.facing || 0 };
    let tilt = 0, roll = 0, lift = 0, tuck = 0, hoh = 0, armsFwd = 0, mc = null, mt = 0, mw = 0, mask = null;
    const sp = Math.hypot(P.vx, P.vy);
    switch (pose) {
      case 'run': case 'idle': if (a.turbo && sp > 60) P.sprint = true; break;
      case 'carry': tuck = 1; if (a.turbo && sp > 60) P.sprint = true; break;
      case 'stance3': mc = 'Land_Three_Point'; mt = 9; mw = 1; P.vx = P.vy = 0; break;
      case 'stance2': P.pose = 'crouch'; P.vx = P.vy = 0; break;
      case 'qbUC': P.pose = 'crouch'; P.vx = P.vy = 0; armsFwd = .6; break;
      case 'qbSG': P.stance = 'guard'; P.vx = P.vy = 0; break;
      case 'snap': P.pose = 'crouch'; P.attack = { spec: { a0: .2, a1: 3, z0: 4, z1: 2, reach: 5, hand: 'both' }, phase: u < .4 ? 'wind' : 'active', u: u < .4 ? u / .4 : (u - .4) / .6 }; break;
      case 'dropback': break;
      case 'throw': mc = 'OverhandThrow'; mt = .25 + u * .75; mw = 1; if (sp > 30) mask = 'upper'; break;
      case 'lateral': P.attack = mv('throw', Math.min(1, u * 1.2)); break;
      case 'handoffGive': armsFwd = Math.sin(u * Math.PI) * .9; break;
      case 'handoffTake': armsFwd = .5; tuck = u; break;
      case 'catchReady': case 'catch': P.attack = { spec: { a0: 0, a1: 0, z0: a.reachZ || 22, z1: a.reachZ || 22, reach: 6, hand: 'both' }, phase: 'active', u: .5 }; if (a.z > 2) P.air = true; break;
      case 'jump': P.air = true; P.attack = { spec: { a0: 0, a1: 0, z0: 34, z1: 34, reach: 4, hand: 'both' }, phase: 'active', u: .5 }; break;
      case 'dive': case 'tackleDive': case 'diveCatch': tilt = Math.min(1, u * 3) * 1.3; armsFwd = 1; P.air = u < .55; if (u > .55) { tilt = 1.45; } break;
      case 'spin': P.facing = (a.facing || 0) + TAU * E.ease.inOutQuad(Math.min(1, u)); tuck = 1; break;
      case 'stiffArm': P.attack = mv('jab', Math.min(.6, u * .9)); tuck = .7; break;
      case 'hurdle': P.air = true; tilt = .35 * Math.sin(u * Math.PI); tuck = 1; break;
      case 'block': mc = 'Push_Loop'; mt = (a.poseT || 0); mw = 1; mask = 'upper'; break;
      case 'shed': P.attack = mv('hook', u); break;
      case 'strip': P.attack = mv('hook', u); break;
      case 'bigHit': P.attack = mv('bash', Math.min(1, u)); tilt = .45 * Math.sin(Math.min(1, u) * Math.PI); break;
      case 'tackled': { const back = a.fallBack ? -1 : 1; tilt = back * 1.5 * E.ease.inQuad(Math.min(1, u)); if (u > .95) P.down = 0; break; }
      case 'fly': tilt = -1.2 - u * .4; roll = a.mega ? u * TAU * 1.5 : 0; P.air = true; P.expr = 'wince'; break;
      case 'down': tilt = (a.fallBack ? -1 : 1) * 1.5; P.expr = 'wince'; break;
      case 'getUp': tilt = (a.fallBack ? -1 : 1) * 1.5 * (1 - E.ease.outQuad(Math.min(1, u))); break;
      case 'pile': tilt = 1.45 * (a.pileK % 2 ? 1 : -1); roll = (a.pileK || 0) * .4; lift = a.pileZ || 0; break;
      case 'kick': P.attack = mv('kick', Math.min(1, u)); break;
      case 'hold': P.pose = 'kneel'; armsFwd = .5; break;
      case 'kneel': P.pose = 'kneel'; break;
      case 'celebrate': { const k = a.dance || 0, C = ['Dance Charleston', 'Dance Body Roll', 'Breakdance_Helicopter', 'Backflip', 'Victory Fist Pump', 'Dance_Loop'][k % 6]; mc = C; mt = (a.poseT || 0) * (C === 'Breakdance_Helicopter' ? 1.6 : 1); mw = 1; P.vx = P.vy = 0; P.expr = 'shout'; if (k === 6) { mc = null; P.attack = mv('throw', Math.min(1, (a.poseT || 0) * 2)); } break; }
      case 'cheer': mc = 'Cheering_Two_Hands'; mt = (a.poseT || 0) % 1.58; mw = 1; P.vx = P.vy = 0; P.expr = 'smile'; break;
      case 'dejected': if (a.dejK % 2) { P.pose = 'kneel'; } else hoh = 1; P.vx = P.vy = 0; break;
      case 'refTD': P.pose = 'cheer'; P.vx = P.vy = 0; break;
      case 'refFD': P.point = true; P.aim = .4; P.vx = P.vy = 0; break;
      case 'refInc': P.attack = { spec: { a0: -1.2, a1: 1.2, z0: 18, z1: 18, reach: 6, hand: 'both' }, phase: 'active', u: (Math.sin((a.poseT || 0) * 9) + 1) / 2 }; P.vx = P.vy = 0; break;
      case 'refShrug': P.pose = 'hips'; P.vx = P.vy = 0; break;
      case 'cheerleader': mc = Math.floor((a.poseT || 0) / 3.2) % 2 ? 'Cheering_Two_Hands' : 'Jumping Jacks'; mt = (a.poseT || 0) % (mc === 'Jumping Jacks' ? 1.25 : 1.58); mw = 1; P.vx = P.vy = 0; break;
      case 'coachYell': P.pose = 'hips'; P.expr = 'shout'; P.vx = P.vy = 0; break;
      case 'seismic': P.air = u < .6; P.attack = mv('bash', u); break;
      case 'mudslide': P.attack = mv('bash', Math.min(1, u * 1.5)); tilt = .5; break;
      case 'backflip': mc = 'Backflip'; mt = (a.poseT || 0); mw = 1; break;
    }
    if (a.expr) P.expr = a.expr; else if (a.hot && !P.expr) P.expr = 'smile';
    // blend PoseFX and the clip weight, never snapping
    const k = Math.min(1, dt * 14);
    f.tilt += (tilt - f.tilt) * (Math.abs(tilt) > Math.abs(f.tilt) ? Math.min(1, dt * 20) : k); f.roll = roll ? roll : f.roll * (1 - k); f.lift += (lift - f.lift) * k;
    f.tuck += (tuck - f.tuck) * k; f.hoh += (hoh - f.hoh) * k; f.armsFwd += (armsFwd - f.armsFwd) * k;
    f.tuckSide = a.carry === 'L' ? 'L' : 'R';
    if (mc && clip(mc)) { const c = clip(mc); st.clip = c; st.ct = c.loop ? mt % c.dur : Math.min(mt, c.dur - .001); st.w = Math.min(1, st.w + dt * 10); st.mask = mask; }
    else st.w = Math.max(0, st.w - dt * 10);
    if (st.clip && st.w > 0 && lib()) { rig.mocap = lib().sample(st.clip, st.ct, rig._mocapBuf || (rig._mocapBuf = new Float32Array(lib().P * 3))); rig.mocapW = st.w * mw || st.w; rig.mocapMask = st.mask || null; }
    else { rig.mocap = null; rig.mocapW = 0; }
    rig.ff.carry = a.carry || null; rig.ff.hot = !!a.hot; rig.ff.dinged = !!a.dinged; rig.ff.ballAngle = a.ballAngle || 0;
    if (a.helmetOff && rig.o.hat) rig.o.hat = null; else if (!a.helmetOff && rig.hatSave && !rig.o.hat) rig.o.hat = rig.hatSave;
    if (pose === 'down' || (pose === 'tackled' && u >= 1)) P.down = 0;
    rig.update(dt, P);
  },
  bigHeads(rig, on) { if (!rig.o) return; if (rig._headR === undefined) rig._headR = rig.o.headR; rig.o.headR = on ? rig._headR * 1.9 : rig._headR; }
};
function luma(h) { const v = parseInt(h.slice(1), 16); return (v >> 16 & 255) * .3 + (v >> 8 & 255) * .59 + (v & 255) * .11; }
})();
