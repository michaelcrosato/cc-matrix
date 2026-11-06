/* rigs.js: the bodies. makeRig layers a hand-posed body and the wobble over motion capture; the Poser holds yoga poses and
 * plays clips; Tare and Gerald are drawn by hand; the cast's costumes live here. */
(() => {
'use strict';
const E = My3D2dge, G = window.G, { px, V3 } = E, game = G.game;
const lib = G.lib = Mocap.load(window.MOCAP.FITCLIPS);

/* ---- a rig: mocap first, then our layer: a hand-posed body, then the wobble ---- */
function setBody(rig, b) {
  const o = rig.o, J = rig.J, hipC = b.hip;
  J.hipC = hipC; J.hipL = V3.add(hipC, [0, -o.hipHalf, 0]); J.hipR = V3.add(hipC, [0, o.hipHalf, 0]);
  for (const s of [-1, 1]) { const hip = s > 0 ? J.hipR : J.hipL, foot = s > 0 ? b.footR : b.footL,
      [kn, f2] = E.ik3(hip, foot, o.legUpper, o.legLower, b.knee ? b.knee(s) : [1, s * .3, .1]);
    J[s > 0 ? 'kneeR' : 'kneeL'] = kn; J[s > 0 ? 'footR' : 'footL'] = f2; }
  const dir = V3.norm(b.chest || [0, 0, 1]), shC = V3.add(hipC, V3.mul(dir, o.torso)); J.shC = shC;
  J.shL = V3.add(shC, [0, -o.shoulderHalf, 0]); J.shR = V3.add(shC, [0, o.shoulderHalf, 0]);
  J.head = V3.add(shC, V3.mul(V3.norm([dir[0], dir[1], dir[2] + .4]), o.neck + o.headR));
  for (const s of [-1, 1]) { const sh = s > 0 ? J.shR : J.shL, hand = s > 0 ? b.handR(shC, sh) : b.handL(shC, sh),
      [el, h2] = E.ik3(sh, hand, o.armUpper, o.armLower, [-1, s * .7, -.2]);
    J[s > 0 ? 'elbowR' : 'elbowL'] = el; J[s > 0 ? 'handR' : 'handL'] = h2; }
}
const add = V3.add;
G.moves = {
  sideLunge: u => rig => { const o = rig.o, a = Math.abs(u), w = o.footSpread + 5.4;
    return { hip: [0, u * 3.8, o.hipZ - a * o.hipZ * .4], footL: [.5, -w, 0], footR: [.5, w, 0], knee: s => [1, s * .7, .1],
      chest: [.28 * a, -u * .1, 1], handL: c => add(c, [4, -.6, -2.6]), handR: c => add(c, [4, .6, -2.6]) }; },
  hula: ph => rig => { const o = rig.o, hx = Math.cos(ph) * 2.1, hy = Math.sin(ph) * 2.1;
    return { hip: [hx, hy, o.hipZ - .5], footL: [.3, -o.footSpread - 1, 0], footR: [.3, o.footSpread + 1, 0], chest: [-hx * .22, -hy * .22, 1],
      handL: (c, sh) => add(sh, [.4, -6, 1.6 + Math.sin(ph) * .6]), handR: (c, sh) => add(sh, [.4, 6, 1.6 - Math.sin(ph) * .6]) }; },
  stepUp: (k, zb = 5) => rig => { const o = rig.o;
    return { hip: [.2 + k * 1.2, k * 1.6, o.hipZ + k * zb * .7], footL: [k > .5 ? 3 : -1, -o.footSpread, k > .85 ? zb : 0], footR: [3, o.footSpread, zb * Math.min(1, k * 2)],
      chest: [.1, 0, 1], handL: (c, sh) => add(sh, [1 + k * 3, -1.2, -3 + k * 2]), handR: (c, sh) => add(sh, [3 - k * 3, 1.2, -1 - k * 2]) }; },
  rope: (ph, arms) => rig => { const o = rig.o, s = Math.sin(ph), z = Math.abs(Math.cos(ph));
    return { hip: [0, s * .4, o.hipZ - .2 + z * .3], footL: [s * 2.4, -.9, Math.max(0, -Math.cos(ph)) * 1.2], footR: [-s * 2.4, .9, Math.max(0, Math.cos(ph)) * 1.2], chest: [0, 0, 1],
      handL: (c, sh) => add(sh, [.3, -6.6, 1 + arms]), handR: (c, sh) => add(sh, [.3, 6.6, 1 - arms]) }; },
  sitLegs: () => rig => { const o = rig.o; return { hip: [0, 0, 1.6], footL: [3.4, .6, .4], footR: [3.4, -.6, .4], knee: s => [.6, s * 1, .5], chest: [0, 0, 1], handL: (c, sh) => add(sh, [3, -.6, -5]), handR: (c, sh) => add(sh, [3, .6, -5]) }; },
  tuck: () => rig => { const o = rig.o; return { hip: [-1.4, 0, o.hipZ - 3], footL: [.6, -o.footSpread, 0], footR: [.6, o.footSpread, 0], chest: [.65, 0, 1], handL: (c, sh) => add(sh, [3.6, -1, -2]), handR: (c, sh) => add(sh, [3.6, 1, -2]) }; }
};
G.makeRig = opts => {
  const rig = new E.Humanoid(Object.assign({ weapon: null }, opts));
  Mocap.drive(rig, lib);
  const base = rig.solvePose;
  rig.wob = [0, 0]; rig.body = null;
  rig.solvePose = function () {
    base.call(this);
    if (this.body) setBody(this, this.body(this));
    const [ax, ay] = this.wob; if (!ax && !ay) return;
    const J = this.J, a = ax * .45, b = ay * .3, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
    for (const k in J) { if (k === 'bladeDir' || !J[k]) continue; const p = J[k];
      const r2 = p[1] * ca + p[2] * sa, z2 = -p[1] * sa + p[2] * ca, f2 = p[0] * cb + z2 * sb, z3 = -p[0] * sb + z2 * cb;
      p[0] = f2; p[1] = r2; p[2] = Math.max(z3, 0); }
  };
  return rig;
};
G.setBody = setBody;

/* ---- the Poser: hold a named pose, play a clip, crossfade between them ---- */
const headBuf = new Float32Array(lib.P * 3);
const heading = (c, t) => { lib.sample(c, t, headBuf); const L = lib.pt(headBuf, 'hipL'), R = lib.pt(headBuf, 'hipR'); return Math.atan2(-(R[0] - L[0]), R[1] - L[1]); };
class Poser {
  constructor(rig) { this.rig = rig; this.cur = null; this.prev = null; this.mix = 1; this.t = 0; this.fade = .6; this.tgt = 1.57; this.a = new Float32Array(lib.P * 3); this.b = new Float32Array(lib.P * 3); this.out = new Float32Array(lib.P * 3); this.face = 1.57; }
  _src(s, into) { return lib.sample(s.c, s.t, into); }
  /** a held pose from G.DATA.poses (it drifts slowly inside its window, so it stays alive) */
  pose(name, fade = .6) { const P = G.DATA.poses[name], c = lib.clip(P.clip); if (this.cur && this.cur.key === name) return this; this._next({ key: name, c, a: P.a, b: P.b, hold: true, tgt: P.tgt, t: P.a, head: heading(c, (P.a + P.b) / 2) }, fade); return this; }
  /** a clip: o.loop, o.speed, o.tgt, o.at: start time */
  clip(name, o = {}) { const c = lib.clip(name); const key = 'clip:' + name + (o.key || ''); if (this.cur && this.cur.key === key) return this; this._next({ key, c, loop: o.loop === undefined ? c.loop : o.loop, speed: o.speed || 1, tgt: o.tgt === undefined ? this.face : o.tgt, t: o.at || 0, head: heading(c, c.dur * .25) }, o.fade === undefined ? .25 : o.fade); return this; }
  /** scrub a clip to a time: the player's thumb is the body */
  scrub(name, t, tgt) { const c = lib.clip(name), key = 'scrub:' + name; if (!this.cur || this.cur.key !== key) this._next({ key, c, scrub: true, tgt: tgt === undefined ? this.face : tgt, t, head: heading(c, t) }, .2); this.cur.t = t; return this; }
  off() { this.cur = null; this.prev = null; this.rig.mocap = null; return this; }
  _next(s, fade) { this.prev = this.cur; this.cur = s; this.mix = this.prev && fade > 0 ? 0 : 1; this.fade = fade || .001; }
  update(dt) {
    const c = this.cur, rig = this.rig; if (!c) return;
    this.t += dt; this.mix = Math.min(1, this.mix + dt / this.fade);
    const adv = s => { if (s.hold) s.t = s.a + (s.b - s.a) * .3 * (.5 + .5 * Math.sin(this.t * .7)); else if (!s.scrub) { s.t += dt * (s.speed || 1); if (s.loop) s.t = s.t % s.c.dur; else if (s.t > s.c.dur) { s.t = s.c.dur; s.done = true; } } };
    adv(c); if (this.prev) adv(this.prev);
    if (this.prev && this.mix < 1) { lib.sample(this.prev.c, this.prev.t, this.a); lib.sample(c.c, c.t, this.b); lib.blend(this.a, this.b, E.ease.inOutSine ? E.ease.inOutSine(this.mix) : this.mix, this.out); rig.mocap = this.out; }
    else { lib.sample(c.c, c.t, this.out); rig.mocap = this.out; this.prev = null; }
    this.face = this.prev ? this.prev.tgt + E.angDiff(this.prev.tgt, c.tgt) * this.mix : c.tgt;
  }
  /** a held pose has one heading, read once from the hips: a bent body's chest has none to trust */
  get facing() { const sp = this.rig.spin || 0, c = this.cur, h1 = c && c.head !== undefined ? c.head : sp, p = this.prev; if (p && this.mix < 1) { const h0 = p.head !== undefined ? p.head : sp; return this.face - (h0 + E.angDiff(h0, h1) * this.mix); } return this.face - h1; }
  get done() { return !!(this.cur && this.cur.done); }
}
G.Poser = Poser;

/* ---- hats of our own ---- */
const brimHat = (crownH, brim) => h => {
  const { g, Sp, J, r, R, c, dk } = h, n = 14, pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * 6.283, p = Sp(J.head, Math.cos(a) * R * brim, Math.sin(a) * R * brim, R * .42); pts.push([p[0], p[1]]); }
  px.poly(g, pts, dk);
  const pts2 = pts.map((p, i) => { const q = pts[i]; return [q[0], q[1] - 1]; }); px.poly(g, pts2, c);
  const t = Sp(J.head, 0, 0, R * (.6 + crownH * .4)); px.disc(g, t[0], t[1], r * .78, E.shade(c, .08));
  const b = Sp(J.head, 0, 0, R * .55); px.line(g, b[0] - r * .78, b[1], b[0] + r * .78, b[1], h.rig.o.hatBand || dk, 2);
};
E.Humanoid.hat('sunhat', brimHat(1, 1.75));
E.Humanoid.hat('sparehat', brimHat(1.2, 1.45));
E.Humanoid.hat('wtband', h => { const { g, Sp, J, R, c } = h; let last = null; for (let i = -6; i <= 6; i++) { const a = i / 6 * 1.9, p = Sp(J.head, Math.cos(a) * R * .98, Math.sin(a) * R * .98, R * .42); if (last) px.line(g, last[0], last[1], p[0], p[1], c, 2); last = p; } });

/* ---- the looks ---- */
G.LOOK = {
  hair: ['short', 'spiky', 'long', 'ponytail', 'bald'],
  skins: ['#f7e0cf', '#f2d3b8', '#e8bd96', '#c99468', '#9c6b44', '#6e4a30'],
  hairCols: ['#c0a060', '#5a3a24', '#2a2030', '#a0482c', '#20181c', '#3a2a2a'],
  tops: ['#ff7a59', '#2cc6e6', '#6fcf8e', '#f5c84b', '#b08be0', '#f08fb0', '#fbfdfd', '#4a6a8a'],
  bottoms: ['#3b5568', '#7a8a94', '#e8e0d0', '#b05a4a']
};
/** a member's rig. o: { size, wear (else the member's), look } */
G.memberRig = (look, wear, o = {}) => {
  const L = G.LOOK, sk = L.skins[look.skin] || L.skins[0], top = L.tops[look.top] || L.tops[0], bot = L.bottoms[look.bottom] || L.bottoms[0];
  const w = wear || {}, hat = w.hat ? { style: 'sparehat', color: '#c9b8e8' } : w.sunhat ? { style: 'sunhat', color: '#f6e7b8' } : w.headband ? { style: 'wtband', color: '#2cc6e6' } : null;
  const opts = { size: o.size || 2.1, hair: look.hair || 'short', outfit: 'shirt', sleeves: 'short', hat,
    colors: { skin: sk, hair: L.hairCols[look.skin] || L.hairCols[0], cloth: o.color || top, pants: bot, boot: '#fbfdfd', trim: '#20404c', belt: E.shade(bot, -.2), glove: sk } };
  if (w.towel) opts.draw = { over: (g, Q, rig) => { const a = Q.shL, b = Q.shR; if (!a || !b) return; const k = rig.o.size || 1, mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = (b[0] - a[0]) * .42, dy = (b[1] - a[1]) * .42; px.line(g, mx - dx, my - dy, mx, my + 2 * k, '#fbfdfd', Math.max(2, 2 * k)); px.line(g, mx + dx, my + dy, mx, my + 2 * k, '#fbfdfd', Math.max(2, 2 * k)); px.rect(g, mx - 2 * k, my + k, 1.6 * k, 5 * k, '#e2eef0'); px.rect(g, mx + .6 * k, my + k, 1.6 * k, 4 * k, '#fbfdfd'); } };
  return G.makeRig(opts);
};
G.playerRig = (o = {}) => G.memberRig(G.S.look, G.S.wear, o);

/* ---- the instructors: wooden artists' mannequins ---- */
const WOOD = {
  birch: { a: '#d9b68a', b: '#c49c6c', c: '#a57f54', eye: '#b8935f', hair: 'bald', j1: '#7c5c3a', j2: '#e8cda6' },
  alder: { a: '#ecd3ac', b: '#ddbf92', c: '#c2a175', eye: '#d0b184', hair: 'ponytail', j1: '#a07f58', j2: '#f6e6c8' }
};
G.WOOD = WOOD;
G.instructorRig = (id, size) => {
  const W = WOOD[id] || WOOD.birch;
  const rig = G.makeRig({ size: size || 2.1, build: 'heroic', limbW: 1.5, torsoW: 2.5, hair: W.hair, sleeves: 'none', outfit: 'shirt',
    colors: { skin: W.a, hair: W.b, cloth: W.a, coat: W.a, pants: W.b, boot: W.b, belt: W.c, trim: W.c, glove: W.a, eye: W.eye, iris: W.eye, brow: W.a, mouth: W.a, lip: W.a } });
  rig.isWood = id;
  rig.o.cheat = .3;
  return rig;
};
/** ball joints: after rig.draw, in the same r.actor */
G.drawJoints = (rig, g, ox, oy, r) => {
  const W = WOOD[rig.isWood]; if (!W) return;
  for (const k of ['kneeL', 'kneeR', 'elbowL', 'elbowR', 'shL', 'shR']) {
    const j = rig.J && rig.J[k]; if (!j) continue;
    const w = rig.worldOffset(j), p = (rig.lastView || r.view).p(w[0], w[1], w[2]), R = Math.max(2, Math.round((rig.o.size || 1) * 1.4));
    px.disc(g, ox + p[0], oy + p[1], R, W.j1); px.disc(g, ox + p[0], oy + p[1], R - 1, W.j2);
  }
};
/** queue a rig in the world, with a contact shadow and its joints */
G.drawRig = (r, rig, x, y, z = 0, o = {}) => {
  if (!o.noShadow) r.shadow(x, y, 5.2 * (rig.o.size || 1), .24, '#20404c', z);
  const opts = { alpha: o.alpha, outline: o.outline, pick: o.pick }; for (const k in opts) if (opts[k] === undefined) delete opts[k];
  r.actor(x, y, z, (g, ox, oy) => { rig.draw(g, ox, oy, r.view); if (rig.isWood) G.drawJoints(rig, g, ox, oy, r); }, opts);
};

/* ---- the Regulars: chibi rigs with their own palette and voice ---- */
const REG = {
  gertrude: { hair: 'short', hat: { style: 'sunhat', color: '#d7c7ee' }, colors: { skin: '#f2d9c6', hair: '#e8e8ee', cloth: '#b79be0', pants: '#a58bd0', boot: '#fbfdfd', trim: '#8a6fc0', glove: '#f2d9c6' } },
  dennis: { hair: 'short', outfit: 'tunic', colors: { skin: '#e8bd96', hair: '#4a3a2a', cloth: '#f7f3e6', pants: '#7a8a94', boot: '#5a5046', trim: '#6fcf8e', glove: '#e8bd96' } },
  marisol: { hair: 'ponytail', hat: { style: 'band', color: '#ff7a59' }, colors: { skin: '#c99468', hair: '#2a2030', cloth: '#ffd166', pants: '#2cc6e6', boot: '#fbfdfd', trim: '#ff7a59', glove: '#c99468' } },
  kevin: { hair: 'spiky', colors: { skin: '#f2d3b8', hair: '#8a8a8a', cloth: '#7fd8ea', pants: '#e8e0d0', boot: '#fbfdfd', trim: '#2cc6e6', glove: '#f2d3b8' } },
  okafor: { hair: 'short', build: 'bulky', colors: { skin: '#6e4a30', hair: '#20181c', cloth: '#ff5fa2', pants: '#fbfdfd', boot: '#20404c', trim: '#ffd166', glove: '#6e4a30' } },
  lou: { hair: 'bald', colors: { skin: '#e8bd96', hair: '#a0a0a0', cloth: '#9aa8b0', pants: '#6a7a84', boot: '#4a4a4a', trim: '#7a8a94', glove: '#e8bd96' } },
  twin1: { hair: 'long', colors: { skin: '#f2d3b8', hair: '#a0482c', cloth: '#6fcf8e', pants: '#3b5568', boot: '#fbfdfd', trim: '#2c8a5a', glove: '#f2d3b8' } },
  twin2: { hair: 'spiky', colors: { skin: '#9c6b44', hair: '#20181c', cloth: '#6fcf8e', pants: '#3b5568', boot: '#fbfdfd', trim: '#2c8a5a', glove: '#9c6b44' } }
};
G.regularRig = (id, size) => G.makeRig(Object.assign({ size: size || 1.5 }, REG[id]));
G.REGULAR_IDS = Object.keys(REG);

/* ---- TARE: a white slab, two soft footprints, a dial, short legs, cyan LED eyes on the front edge ---- */
const CY = '#44e4ff', CYD = '#1a7f94', STRIP = '#20404c';
const FACES = {
  neutral: (g, x, y, u) => { px.rect(g, x - 5 * u, y - u, 2 * u, 2 * u, CY); px.rect(g, x + 3 * u, y - u, 2 * u, 2 * u, CY); },
  happy: (g, x, y, u) => { for (const s of [-1, 1]) { px.rect(g, x + s * 4 * u - u, y - u, 2 * u, u, CY); px.rect(g, x + s * 4 * u - 2 * u, y, u, u, CY); px.rect(g, x + s * 4 * u + u, y, u, u, CY); } px.rect(g, x - u, y + u, 2 * u, u, CYD); },
  worried: (g, x, y, u) => { px.rect(g, x - 5 * u, y - u, 2 * u, 2 * u, CY); px.rect(g, x + 3 * u, y - u, 2 * u, 2 * u, CY); px.rect(g, x - 5 * u, y - 2 * u, u, u, CYD); px.rect(g, x + 4 * u, y - 2 * u, u, u, CYD); px.rect(g, x - 2 * u, y + u, u, u, CYD); px.rect(g, x, y + u, u, u, CYD); },
  smug: (g, x, y, u) => { px.rect(g, x - 5 * u, y, 2 * u, u, CY); px.rect(g, x + 3 * u, y, 2 * u, u, CY); px.rect(g, x - u, y + u, 3 * u, u, CYD); },
  shocked: (g, x, y, u) => { px.rect(g, x - 6 * u, y - 2 * u, 3 * u, 3 * u, CY); px.rect(g, x + 3 * u, y - 2 * u, 3 * u, 3 * u, CY); px.rect(g, x - u, y, 2 * u, 2 * u, CYD); },
  sad: (g, x, y, u) => { px.rect(g, x - 5 * u, y, 2 * u, u, CY); px.rect(g, x + 3 * u, y, 2 * u, u, CY); px.rect(g, x - 4 * u, y - u, u, u, CYD); px.rect(g, x + 3 * u, y - u, u, u, CYD); px.rect(g, x + 4 * u, y + u, u, u, CY); },
  asleep: (g, x, y, u) => { px.rect(g, x - 5 * u, y, 3 * u, u, CYD); px.rect(g, x + 2 * u, y, 3 * u, u, CYD); },
  judging: (g, x, y, u) => { px.rect(g, x - 5 * u, y, 2 * u, u, CY); px.rect(g, x + 3 * u, y - u, 2 * u, 2 * u, CY); px.rect(g, x - 5 * u, y - u, 2 * u, u, CYD); }
};
G.TARE_FACES = Object.keys(FACES);
/** Tare at a foot point. s: pixels per unit (1: 30 wide). o: { face, squash, bow, shake, blink } */
G.drawTare = (g, cx, by, s = 1, o = {}) => {
  const sq = o.squash || 0, sx = 1 + sq * .5, sy = 1 - sq, hw = 15 * s * sx, thick = 6 * s * sy, top = 7 * s * sy, leg = 2.2 * s;
  const x = Math.round(cx + (o.shake ? Math.sin(game.real * 40) * o.shake : 0)), y = Math.round(by);
  const front = y - leg, faceTop = front - thick, back = faceTop - top;
  // legs
  for (const k of [-.7, .7]) { px.rect(g, x + k * hw - s, front - s, 2.4 * s, leg + s, '#9fb5bc'); }
  // the front edge, then the top
  const skew = 3 * s * sx;
  px.poly(g, [[x - hw, faceTop], [x + hw, faceTop], [x + hw - s, front], [x - hw + s, front]], '#d4e2e6');
  px.poly(g, [[x - hw, faceTop], [x + hw, faceTop], [x + hw - skew, back], [x - hw + skew, back]], '#fbfdfd');
  px.rect(g, x - hw + s, faceTop - Math.max(1, s * .5), 2 * hw - 2 * s, Math.max(1, s * .5), '#eef5f6');
  px.line(g, x - hw, faceTop, x + hw, faceTop, '#e3edef');
  // two soft footprints
  for (const k of [-1, 1]) { const fx = x + k * 5 * s * sx, fy = faceTop - top * .5; px.ell(g, fx, fy, 2.6 * s, Math.max(1, top * .34), '#dfe9ea'); px.ell(g, fx, fy - top * .24, 2.1 * s, Math.max(1, top * .16), '#eaf1f2'); }
  // a small dial
  const dx = x, dy = back + top * .24; px.ell(g, dx, dy, 2.4 * s, Math.max(1, top * .16) + .5, '#2cc6e6'); px.ell(g, dx, dy, 1.6 * s, Math.max(1, top * .1), '#eaf9fc');
  // the LED strip and the face
  const u = Math.max(1, Math.round(s * .85)), sh = Math.max(4, Math.round(thick * .82));
  px.rect(g, x - hw * .62, faceTop + 1, hw * 1.24, sh, STRIP);
  const f = FACES[o.face || 'neutral'] || FACES.neutral; f(g, x, faceTop + 1 + sh / 2, u);
  if (o.blink) { px.rect(g, x - hw * .6, faceTop + 1 + sh / 2 - 1, hw * 1.2, 2 * u, STRIP); }
  if (o.bow) { const by2 = front + 1, c = '#e0553a'; px.poly(g, [[x, by2], [x - 4 * s, by2 - 2 * s], [x - 4 * s, by2 + 2 * s]], c); px.poly(g, [[x, by2], [x + 4 * s, by2 - 2 * s], [x + 4 * s, by2 + 2 * s]], c); px.disc(g, x, by2, Math.max(1, s), '#ff8a6a'); }
};
/** Tare's portrait for E.Dialog */
G.tarePortrait = (face) => (g, x, y, size) => { const f = typeof face === 'function' ? face() : face; px.rect(g, x, y, size, size, '#eaf6f8'); G.drawTare(g, x + size / 2, y + size - 6, size / 34, { face: f || G.tareFace || 'neutral', bow: G.S && G.S.minutes >= 20 }); };

/** Tare in the world: hops with squash and stretch, follows at a polite distance */
class TareBody {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; this.z = 0; this.vz = 0; this.sq = 0; this.vsq = 0; this.face = 'neutral'; this.faceT = 0; this.tx = x; this.ty = y; this.hopT = 0; this.blink = 2; this.scale = 1.2; this.fx = 0; }
  say(face, t = 3) { this.face = face; this.faceT = t; G.tareFace = face; }
  hop(v = 34) { if (this.z <= 0) { this.vz = v; this.vsq = -3; G.A.sfx('tareHop', { vol: .35 }); } }
  boop() { this.vsq = 6; G.A.sfx('tareBoop'); }
  update(dt, follow) {
    if (this.faceT > 0) { this.faceT -= dt; if (this.faceT <= 0) { this.face = 'neutral'; G.tareFace = 'neutral'; } }
    this.blink -= dt; if (this.blink < -.12) this.blink = 1.5 + 2.5 * G.cosmetic();
    this.vz -= 160 * dt; this.z += this.vz * dt; if (this.z <= 0) { if (this.vz < -6) this.vsq = 4; this.z = 0; this.vz = 0; }
    this.vsq += (-this.sq * 90 - this.vsq * 10) * dt; this.sq = E.clamp(this.sq + this.vsq * dt, -.3, .35);
    if (follow) {
      const dx = follow[0] - this.x, dy = follow[1] - this.y, d = Math.hypot(dx, dy), stay = follow[2] === undefined ? 26 : follow[2];
      if (d > stay) { this.hopT -= dt; if (this.hopT <= 0 && this.z <= 0) { this.hop(); this.hopT = .55; } if (this.z > 0) { const v = Math.min(90, (d - stay) * 1.8 + 24); this.x += dx / d * v * dt; this.y += dy / d * v * dt; } }
    }
  }
  draw(r, o = {}) {
    const s = o.scale || this.scale, f = this.face, sq = this.sq;
    r.shadow(this.x, this.y + 1, 8.5 * s, .16, '#20404c');
    r.queue(this.x, this.y, this.z, g => { const p = r.w(this.x, this.y, this.z); G.drawTare(g, p[0], p[1], s, { face: f, squash: sq, bow: G.S && G.S.minutes >= 20, blink: this.blink < 0, shake: o.shake }); }, { pick: o.pick });
  }
}
G.TareBody = TareBody;

/* ---- GERALD: a ceramic hippo with a coin slot ---- */
G.drawGerald = (g, x, y, s = 1, o = {}) => {
  const body = '#d8c4d0', sh = '#b9a0b4', hi = '#f4e9f0', dk = '#7c6680', sq = o.squash || 0;
  x = Math.round(x); y = Math.round(y);
  const h = (10 * s) * (1 - sq), w = 14 * s * (1 + sq * .4);
  px.ell(g, x, y + 1, w * 1.05, 2 * s, '#00000022');
  for (const k of [-.6, .55]) px.rect(g, x + k * w - 2 * s, y - 3 * s, 4 * s, 3 * s, sh);
  px.ell(g, x, y - 3 * s - h * .6, w, h, sh);
  px.ell(g, x - s, y - 3 * s - h * .72, w * .92, h * .82, body);
  // the head and snout
  const hx = x + w * .72, hy = y - 3 * s - h * .55;
  px.ell(g, hx, hy, 7.5 * s, 6 * s, body); px.ell(g, hx + 4 * s, hy + 1.6 * s, 5.6 * s, 4.2 * s, body); px.ell(g, hx + 4 * s, hy + 3 * s, 5 * s, 2.4 * s, sh);
  px.disc(g, hx + 6.6 * s, hy + .6 * s, Math.max(1, .7 * s), dk); px.disc(g, hx + 3.4 * s, hy + .6 * s, Math.max(1, .7 * s), dk);
  px.disc(g, hx - 1 * s, hy - 3 * s, Math.max(1, 1.3 * s), '#20404c'); px.dot(g, hx - 1 * s, hy - 3.6 * s, '#ffffff');
  px.disc(g, hx - 4 * s, hy - 5 * s, Math.max(1, 1.6 * s), sh); px.disc(g, hx + 1.4 * s, hy - 5.6 * s, Math.max(1, 1.5 * s), sh);
  // the glaze and the coin slot
  px.ell(g, x - w * .35, y - 3 * s - h * 1.15, w * .34, Math.max(1, h * .13), hi);
  px.rect(g, x - 3 * s, y - 3 * s - h * 1.42, 6 * s, Math.max(1, s * .9), dk);
  if (o.friend) { G.drawGerald(g, x - w - 12 * s, y, s * .55, { squash: sq }); }
};
/** where a coin should fly to on Gerald */
G.geraldSlot = (x, y, s = 1) => [x, y - 3 * s - 10 * s * 1.42];

/* ---- a small seeded stream for looks only: never for rules, never Math.random ---- */
G.cosmetic = E.rng(90210);
})();
