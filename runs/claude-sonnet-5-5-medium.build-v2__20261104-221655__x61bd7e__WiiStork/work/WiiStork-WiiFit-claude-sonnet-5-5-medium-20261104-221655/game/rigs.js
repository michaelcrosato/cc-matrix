// rigs: makeRig, hand-posed bodies, Figure (clip player), Tare, Gerald, cast
(() => {
const E = My3D2dge, G = window.G, { px, V3 } = E;
let lib = null;
G.lib = () => lib || (lib = (window.Mocap && window.MOCAP && window.MOCAP.FITCLIPS) ? Mocap.load(window.MOCAP.FITCLIPS) : null);

G.makeRig = opts => {
  const rig = new E.Humanoid(Object.assign({ weapon: null }, opts));
  if (G.lib()) Mocap.drive(rig, G.lib());
  const base = rig.solvePose; rig.wob = [0, 0]; rig.body = null;
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
  // walking the rope: arms out, a lean to each side
  rope: (lean) => rig => { const o = rig.o;
    return { hip: [0, lean * 1.2, o.hipZ], footL: [.4, -o.footSpread * .4, 0], footR: [-.4, o.footSpread * .4, 0], chest: [lean * .1, 0, 1],
      handL: (c, sh) => add(sh, [0, -7.5, 1.2 - lean * 2]), handR: (c, sh) => add(sh, [0, 7.5, 1.2 + lean * 2]) }; }
};

// ---- Figure: a rig plus a clip player ------------------------------------------------------------------
class Figure {
  constructor(rigOpts, o) {
    this.rig = G.makeRig(rigOpts); this.x = 0; this.y = 0; this.z = 0; this.tgt = 1.57; this.size = 1; this.name = 'x'; this.expr = null;
    this.clip = null; this.t = 0; this.speed = 1; this.pose = null; this.last = null; this.fade = 1; this.time = Math.random() * 10; this.vx = 0; this.vy = 0; this.alpha = 1; this.once = false; this.ended = false;
    Object.assign(this, o || {});
  }
  set(name, o) {   // a clip by name or a pose row name ('stork' ...)
    o = o || {}; const key = name + (o.k || ''); if (this.key === key && !o.restart) return this; this.key = key;
    if (this.cur) this.last = this.cur; this.fade = this.last ? 0 : 1;
    this.pose = G.POSES && G.POSES[name] || null; this.clip = this.pose ? this.pose.clip : name; this.t = o.t || 0; this.speed = o.speed || 1; this.once = !!o.once; this.ended = false; return this;
  }
  scrub(name, t) { this.key = 'scrub:' + name; this.clip = name; this.pose = null; this.t = t; this.scrubbed = true; return this; }
  update(dt) {
    const L = G.lib(); this.time += dt; const rig = this.rig;
    if (L && this.clip) {
      const c = L.clip(this.clip);
      if (c) {
        let t;
        if (this.pose) { const [a, b] = [this.pose.a, this.pose.b]; t = a + (b - a) * .3 * (.5 + .5 * Math.sin(this.time * .7)); }
        else if (this.scrubbed) { t = G.clamp(this.t, 0, c.dur); this.scrubbed = false; }
        else { this.t += dt * this.speed; if (c.loop && !this.once) t = this.t % c.dur; else { t = Math.min(this.t, c.dur); if (this.t >= c.dur) this.ended = true; } }
        let p = L.sample(c, t);
        if (this.fade < 1 && this.last) { this.fade = Math.min(1, this.fade + dt / .6); p = L.blend(this.last, p, this.fade); }
        this.cur = p; rig.mocap = p;
      }
    } else rig.mocap = null;
    rig.update(dt, { x: this.x, y: this.y, z: this.z, vx: this.vx, vy: this.vy, facing: this.tgt - (rig.spin || 0), expr: this.expr, pose: this.stance });
  }
  draw(r, o) {
    o = o || {}; const rig = this.rig, self = this;
    r.actor(this.x, this.y, this.z, (g, ox, oy) => { rig.draw(g, ox, oy, r.view); if (self.joints) G.drawJoints(g, rig, ox, oy, r, self.joints); }, Object.assign({ alpha: this.alpha < 1 ? this.alpha : undefined }, o));
  }
}
G.Figure = Figure;
G.drawJoints = (g, rig, ox, oy, r, cols) => {
  for (const k of ['kneeL', 'kneeR', 'elbowL', 'elbowR', 'shL', 'shR']) {
    if (!rig.J[k]) continue; const w = rig.worldOffset(rig.J[k]), p = (rig.lastView || r.view).p(w[0], w[1], w[2]);
    px.disc(g, ox + p[0], oy + p[1], 3, cols[0]); px.disc(g, ox + p[0], oy + p[1], 2, cols[1]);
  }
};

// ---- cast ---------------------------------------------------------------------------------------------
const wood = (a, b) => ({ skin: a, hair: b, cloth: a, coat: a, pants: b, boot: b, belt: b, trim: a, glove: a });
G.CAST = {
  birch: { name: 'Birch', opts: { build: 'heroic', limbW: 1.5, torsoW: 2.5, hair: 'bald', colors: wood('#d9b68a', '#b08a5c'), size: 1 }, pitch: 95, speed: .8, wave: 'triangle', joints: ['#c49a6a', '#a07848'] },
  alder: { name: 'Alder', opts: { build: 'heroic', limbW: 1.5, torsoW: 2.5, hair: 'ponytail', colors: wood('#ecd3ac', '#d2b182'), size: 1 }, pitch: 210, speed: 1.1, wave: 'sine', joints: ['#e0c090', '#bf9a66'] },
  gertrude: { name: 'Gertrude', opts: { build: 'chibi', hair: 'long', hat: { style: 'cap', color: '#f0e0b0' }, colors: { skin: '#eac8a8', hair: '#e8e8ee', cloth: '#b9a0e0', pants: '#a58cd0', boot: '#f6fafa' } }, pitch: 300, speed: .9, wave: 'sine', vib: 7 },
  dennis: { name: 'Dennis', opts: { build: 'chibi', hair: 'short', colors: { skin: '#e8b890', hair: '#6a4a2c', cloth: '#8fd36a', pants: '#4a6ea8', boot: '#f6fafa' } }, pitch: 150, speed: 1, wave: 'triangle' },
  marisol: { name: 'Marisol', opts: { build: 'chibi', hair: 'ponytail', hat: { style: 'band', color: '#f58cb4' }, colors: { skin: '#a06a44', hair: '#2a1a14', cloth: '#f58cb4', pants: '#20404c', boot: '#ffffff' } }, pitch: 240, speed: 1.4, wave: 'triangle' },
  kevin: { name: 'Young Kevin', opts: { build: 'chibi', hair: 'bald', colors: { skin: '#f6d2b0', hair: '#aaa', cloth: '#2cc6e6', pants: '#8a8f98', boot: '#ffffff' } }, pitch: 120, speed: 1, wave: 'triangle' },
  okafor: { name: 'Mr. Okafor', opts: { build: 'chibi', hair: 'short', colors: { skin: '#7a4a2c', hair: '#222', cloth: '#f5b700', pants: '#c0392b', boot: '#ffffff' } }, pitch: 105, speed: 1.1, wave: 'sine' },
  lou: { name: 'Lou', opts: { build: 'chibi', hair: 'short', colors: { skin: '#c98f64', hair: '#555', cloth: '#6a8f9a', pants: '#4a5560', boot: '#333' } }, pitch: 130, speed: .6, wave: 'triangle' },
  twinA: { name: 'The Twins', opts: { build: 'chibi', hair: 'spiky', colors: { skin: '#f6d2b0', hair: '#c68c3a', cloth: '#ff7a59', pants: '#20404c', boot: '#fff' } }, pitch: 260, speed: 1.2, wave: 'sine' },
  twinB: { name: 'The Twins', opts: { build: 'chibi', hair: 'spiky', colors: { skin: '#f6d2b0', hair: '#c68c3a', cloth: '#ff7a59', pants: '#20404c', boot: '#fff' } }, pitch: 265, speed: 1.2, wave: 'sine' },
  tare: { name: 'Tare', pitch: 420, speed: 1.6, wave: 'sine' },
  gerald: { name: 'Gerald', pitch: 110, speed: .7, wave: 'triangle' }
};
G.castFigure = (id, o) => { const c = G.CAST[id]; const f = new Figure(Object.assign({ size: 1.5 }, c.opts), Object.assign({ name: c.name, joints: c.joints }, o || {})); f.id = id; return f; };
G.playerFigure = (o) => {
  const L = G.S.look, k = G.LOOKS, W = G.S.wear;
  const f = new Figure({ build: 'chibi', hair: k.hair[L.hair], hat: W.spare ? { style: 'cap', color: '#b9a0e0' } : W.sunhat ? { style: 'cap', color: '#f5e6a0' } : W.headband ? { style: 'band', color: '#2cc6e6' } : W.towel ? { style: 'band', color: '#ffffff' } : undefined, colors: { skin: k.skin[L.skin], hair: ['#3a2a1c', '#c68c3a', '#222', '#8a3a2a'][L.skin % 4], cloth: k.top[L.top], pants: k.bottom[L.bottom], boot: '#f6fafa' } }, Object.assign({ name: G.S.name || 'You' }, o || {}));
  f.id = 'player'; return f;
};
// a plain seat-coloured contestant (Class, ghosts)
G.colorFigure = (color, o) => new Figure({ build: 'chibi', hair: 'short', colors: { skin: '#f6d2b0', hair: '#444', cloth: color, pants: '#20404c', boot: '#fff' } }, o);

// ---- Tare (hand drawn) -----------------------------------------------------------------------------------
G.FACES = ['neutral', 'happy', 'worried', 'smug', 'shocked', 'sad', 'asleep', 'judging'];
class Tare {
  constructor() { this.x = 0; this.y = 0; this.face = 'neutral'; this.squash = 0; this.vsq = 0; this.hop = 0; this.vh = 0; this.t = 0; this.look = 0; this.talk = 0; }
  get bow() { return !!(G.hasUnlock && G.hasUnlock('bowtie')); }
  jump(v) { if (this.hop <= 0.01) this.vh = v || 90; this.vsq = -3; }
  update(dt) {
    this.t += dt; this.vsq += (-this.squash * 90 - this.vsq * 9) * dt; this.squash += this.vsq * dt;
    if (this.hop > 0 || this.vh > 0) { this.vh -= 360 * dt; this.hop += this.vh * dt; if (this.hop <= 0) { this.hop = 0; if (this.vh < -20) this.vsq = 3; this.vh = 0; this.landed = true; } }
    this.talk = Math.max(0, this.talk - dt);
  }
  // draws with the feet at (ox, oy); sc is pixel scale
  draw(g, ox, oy, sc, face) {
    sc = sc || 1; face = face || this.face; const sq = G.clamp(this.squash, -.3, .3), w = 34 * sc * (1 + sq), h = 15 * sc * (1 - sq), by = oy - this.hop * sc * .5;
    px.ell(g, ox, oy, w * .6, 3 * sc, 'rgba(32,64,76,.25)');
    const top = by - h - 5 * sc, x0 = ox - w / 2;
    px.rect(g, x0 + 3 * sc, by - 5 * sc, 5 * sc, 5 * sc, '#c8dde2'); px.rect(g, x0 + w - 8 * sc, by - 5 * sc, 5 * sc, 5 * sc, '#c8dde2');   // legs
    px.rect(g, x0, top + 2 * sc, w, h, '#dfe9ea'); px.rect(g, x0, top, w, 4 * sc, '#ffffff'); px.rect(g, x0, top + h - 1 * sc, w, 3 * sc, '#b9ccd2');   // slab, top face, shade
    px.rect(g, x0 - 1, top + 2 * sc, 1, h, '#b9ccd2'); px.rect(g, x0 + w, top + 2 * sc, 1, h, '#b9ccd2');
    px.ell(g, ox - 7 * sc, top + 2 * sc, 4 * sc, 1.6 * sc, '#c8dde2'); px.ell(g, ox + 7 * sc, top + 2 * sc, 4 * sc, 1.6 * sc, '#c8dde2');   // footprints
    px.disc(g, ox, top + 1 * sc, 3 * sc, '#2cc6e6'); px.disc(g, ox, top + 1 * sc, 2 * sc, '#f6fafa'); px.line(g, ox, top + 1 * sc, ox + Math.cos(this.t * .5) * 1.6 * sc, top + 1 * sc - Math.abs(Math.sin(this.t * .5)) * 1.6 * sc, '#e0553a', 1);   // dial
    if (this.bow) { px.poly(g, [[ox - 5 * sc, top + 7 * sc], [ox, top + 9 * sc], [ox - 5 * sc, top + 12 * sc]], '#e0553a'); px.poly(g, [[ox + 5 * sc, top + 7 * sc], [ox, top + 9 * sc], [ox + 5 * sc, top + 12 * sc]], '#e0553a'); px.rect(g, ox - 1, top + 8 * sc, 2 * sc, 2 * sc, '#a03020'); }
    this.eyes(g, ox, top + h * .55 + 2 * sc, sc, face);
  }
  eyes(g, ox, ey, sc, face) {
    const C = '#2cf0ff', ex = 5 * sc, blink = (Math.sin(this.t * 1.3) > .985) ? 1 : 0, L = ox + this.look * 2 - ex, Rr = ox + this.look * 2 + ex, mo = this.talk > 0 ? Math.abs(Math.sin(this.t * 18)) : 0;
    const eye = (x, wd, ht, y) => { px.rect(g, x - wd / 2, y, wd, ht, C); px.rect(g, x - wd / 2, y, wd, 1, '#b8fbff'); };
    if (blink || face === 'asleep') { px.rect(g, L - 2 * sc, ey + 2 * sc, 4 * sc, 1, C); px.rect(g, Rr - 2 * sc, ey + 2 * sc, 4 * sc, 1, C); }
    else if (face === 'happy') { for (const x of [L, Rr]) { px.line(g, x - 2 * sc, ey + 3 * sc, x, ey + 1 * sc, C, 1); px.line(g, x, ey + 1 * sc, x + 2 * sc, ey + 3 * sc, C, 1); } }
    else if (face === 'worried') { eye(L, 3 * sc, 4 * sc, ey); eye(Rr, 3 * sc, 4 * sc, ey); px.line(g, L - 2 * sc, ey - 2 * sc, L + 2 * sc, ey - 3.5 * sc, C, 1); px.line(g, Rr + 2 * sc, ey - 2 * sc, Rr - 2 * sc, ey - 3.5 * sc, C, 1); }
    else if (face === 'smug') { eye(L, 4 * sc, 2 * sc, ey + 2 * sc); eye(Rr, 4 * sc, 2 * sc, ey + 2 * sc); px.line(g, L - 2 * sc, ey + 1 * sc, L + 2 * sc, ey + 1 * sc, '#dfe9ea', 2); px.line(g, Rr - 2 * sc, ey + 1 * sc, Rr + 2 * sc, ey + 1 * sc, '#dfe9ea', 2); }
    else if (face === 'shocked') { eye(L, 4 * sc, 6 * sc, ey - 1 * sc); eye(Rr, 4 * sc, 6 * sc, ey - 1 * sc); }
    else if (face === 'sad') { eye(L, 3 * sc, 4 * sc, ey + 1 * sc); eye(Rr, 3 * sc, 4 * sc, ey + 1 * sc); px.line(g, L - 2 * sc, ey - 1 * sc, L + 2 * sc, ey - 2.5 * sc, C, 1); px.line(g, Rr + 2 * sc, ey - 1 * sc, Rr - 2 * sc, ey - 2.5 * sc, C, 1); }
    else if (face === 'judging') { eye(L, 4 * sc, 2 * sc, ey + 1 * sc); eye(Rr, 4 * sc, 4 * sc, ey); px.rect(g, L - 2 * sc, ey - 1 * sc, 4 * sc, 1, '#dfe9ea'); }
    else { eye(L, 3 * sc, 4 * sc, ey); eye(Rr, 3 * sc, 4 * sc, ey); }
    if (mo > .3 && face !== 'asleep') px.rect(g, ox - 2 * sc, ey + 5.5 * sc, 4 * sc, 1 + mo * 1.5 * sc, C);
  }
}
G.Tare = Tare;
G.tareFace = (g, x, y, size) => { const t = G.tare || (G.tare = new Tare()); const sc = size / 38; t.draw(g, x + size / 2, y + size - 3, sc, t.face); };

// ---- Gerald the hippo -----------------------------------------------------------------------------------------
class Gerald {
  constructor() { this.t = 0; this.sq = 0; this.v = 0; this.coins = []; }
  clink() { this.v = -4; this.sq = -.1; }
  update(dt) { this.t += dt; this.v += (-this.sq * 120 - this.v * 10) * dt; this.sq += this.v * dt; for (const c of this.coins) { c.t += dt; } this.coins = this.coins.filter(c => c.t < 1); }
  drop() { this.coins.push({ t: 0, x: (Math.random() - .5) * 16 }); }
  draw(g, ox, oy, sc, small) {
    sc = (sc || 1) * (small ? .6 : 1); const sq = G.clamp(this.sq, -.2, .2), w = 36 * sc * (1 - sq * .5), h = 20 * sc * (1 + sq), top = oy - h;
    const W = '#f4fbfb', B = '#bfe3ea', S = '#8dc1cc';
    px.ell(g, ox, oy, w * .62, 3 * sc, 'rgba(32,64,76,.25)');
    for (const dx of [-12, -5, 5, 12]) px.rect(g, ox + dx * sc - 2 * sc, oy - 5 * sc, 4 * sc, 5 * sc, B);
    px.ell(g, ox, top + h * .55, w / 2, h / 2, W); px.ell(g, ox, top + h * .7, w / 2 - 1, h / 2 - 3 * sc, B);
    px.ell(g, ox + 14 * sc, top + h * .45, 10 * sc, 8 * sc, W); px.ell(g, ox + 20 * sc, top + h * .6, 7 * sc, 5 * sc, '#f8d6d0'); px.dot(g, ox + 18 * sc, top + h * .55, '#a08088'); px.dot(g, ox + 22 * sc, top + h * .55, '#a08088');
    px.disc(g, ox + 13 * sc, top + h * .25, 2 * sc, W); px.disc(g, ox + 8 * sc, top + h * .25, 2 * sc, W);
    px.rect(g, ox + 11 * sc, top + h * .3, 2 * sc, 2 * sc, '#20404c');
    px.rect(g, ox - 8 * sc, top + 1 * sc, 12 * sc, 2 * sc, '#20404c');   // coin slot
    px.line(g, ox + 15 * sc, top + h * .72, ox + 21 * sc, top + h * .72, '#a08088', 1);
    if (!small && G.hasUnlock && G.hasUnlock('friend') && !this._f) { this._f = 1; this.draw(g, ox - 34 * sc, oy, sc * .55, true); this._f = 0; }
    for (const c of this.coins) { const k = c.t; px.disc(g, ox - 2 * sc + c.x * sc * .3, top - 16 * sc * (1 - k) * (k < .6 ? 1 : 0.2) - 2 * sc + (k > .6 ? (k - .6) * 20 : 0), 2.2 * sc, '#f5b700'); }
  }
}
G.Gerald = Gerald;
})();
