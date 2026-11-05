/* =============================================================================
 * MODULE beasts  (engine-ext, written for Brigantime; loads after my-3d2dge.js)
 * E.Beast: procedural creature rigs drawn as shaded pixel art in every view, with the Humanoid's interface.
 *   const b = new E.Beast({ body: 'quad' | 'drake' | 'avian' | 'serpent', preset, legs2, scale, colors: { body, belly,
 *     dark, accent, eye, horn, wing, flame }, parts: { horn, mane, tusks, crest, fins, beak, gears, pendulum,
 *     wings: 'feather' | 'bat' | 'none', tail: 'long' | 'short' | 'flame' } })
 *   b.update(dt, { x, y, z, vx, vy, facing, attack: { kind, u } | null, hurt, sleep, down (0..1), fly })
 *     attack kinds: bite claw gore breath tailsweep roar pounce dive coil stomp (u: 0..1 through the action)
 *   b.draw(g, ox, oy, view) inside r.actor; b.drawPortrait(g, x, y, size) (head and shoulders, framed);
 *   b.mouth() and b.tip() give world points (breath, projectiles); b.height (units) for pennants and bars.
 * Presets (quad): hound wolf horse cat boar lizard griffin. Drake: 4 legs (legs2: a wyvern's 2) and bat wings.
 * Avian: 2 legs, feathered wings, a tail fan; it hovers. Serpent: segments following its own path history.
 * The skeleton is 3D (forward, side, up from the feet); parts are projected through the view (E.charView in steep
 * views), sorted by camera depth, outlined in one pass and filled in a second, shaded with E.tones.
 * E.Wings(rig, { kind: 'insect' | 'feather', color }) draws a pair of wings behind or before a Humanoid.
 * ============================================================================= */
(() => {
'use strict';
const E = My3D2dge, { px } = E;
const PRE = {   // bodyLen, bodyR, legH, neckLen, neckUp, headR, snout, tailLen, stride
  hound: [13, 4.2, 7, 4, .6, 3.6, 3.2, 8, 7], wolf: [14, 4.4, 8, 4.5, .55, 3.8, 3.6, 9, 8], horse: [17, 5.5, 12, 8, 1.1, 3.6, 4.6, 8, 9],
  cat: [14, 4.6, 7, 3.5, .5, 4.2, 2.2, 10, 7], boar: [15, 6, 5.5, 2, .2, 4.8, 3.6, 3, 5], lizard: [14, 3.2, 3, 3, .25, 3, 3.2, 12, 5],
  griffin: [16, 5.4, 9, 5, .9, 4, 2.6, 10, 8], drake: [20, 6.5, 9, 10, 1, 4.6, 4.4, 18, 8], avian: [9, 4.4, 5, 3, 1, 3.4, 2.4, 7, 4], serpent: [0, 4.2, 0, 0, 0, 4.4, 3.8, 0, 0]
};
const SIZE_K = { S: .75, M: 1, L: 1.55 };
const lerp = (a, b, t) => a + (b - a) * t;
class Beast {
  constructor(o = {}) {
    this.o = Object.assign({ body: 'quad', preset: 'hound', scale: 1, parts: {} }, o);
    this.P = PRE[this.o.body === 'quad' ? this.o.preset : this.o.body] || PRE.hound;
    const c = Object.assign({ body: '#8a7a6a', belly: '#c8b8a0', dark: '#3a2a20', accent: '#e0c060', eye: '#ffe040', horn: '#f0e8d0', wing: null, flame: '#ff9020' }, o.colors || {});
    c.wing = c.wing || c.dark; this.C = c;
    this.T = { body: E.tones(c.body), belly: E.tones(c.belly), dark: E.tones(c.dark), wing: E.tones(c.wing), accent: E.tones(c.accent), horn: E.tones(c.horn) };
    this.t = 0; this.phase = 0; this.x = 0; this.y = 0; this.z = 0; this.facing = 0; this.speed = 0; this.att = null; this.hurt = 0; this.sleep = false; this.down = 0; this.tailV = 0; this.tailA = 0;
    this.trail = []; this.fly = this.o.body === 'avian' || (this.o.parts.wings && this.o.parts.wings !== 'none' && this.o.fly !== false);
    this.height = (this.o.body === 'serpent' ? 14 : this.P[2] + this.P[1] * 2 + (this.P[3] * this.P[4]) * .8) * this.o.scale;
  }
  update(dt, s = {}) {
    this.t += dt;
    const vx = s.vx || 0, vy = s.vy || 0, sp = Math.hypot(vx, vy);
    this.speed = lerp(this.speed, sp, Math.min(1, dt * 10));
    this.phase += dt * (this.speed / Math.max(4, this.P[8] * this.o.scale) * Math.PI + (this.speed < 2 ? 0 : 0));
    this.x = s.x || 0; this.y = s.y || 0; this.z = s.z || 0; if (s.facing !== undefined) this.facing = s.facing;
    this.att = s.attack || null; this.hurt = s.hurt || 0; this.sleep = !!s.sleep; this.down = s.down || 0;
    if (s.fly !== undefined) this.fly = s.fly;
    // the tail: a spring that lags the turn
    const tgt = -E.angDiff(this._lastF === undefined ? this.facing : this._lastF, this.facing) * 8; this._lastF = this.facing;
    this.tailV += (tgt - this.tailA) * dt * 30 - this.tailV * dt * 6; this.tailA += this.tailV * dt;
    if (this.o.body === 'serpent') {   // the body follows its own path history
      const head = [this.x, this.y]; const last = this.trail[0];
      if (!last || Math.hypot(head[0] - last[0], head[1] - last[1]) > 1) this.trail.unshift(head);
      if (this.trail.length > 80) this.trail.length = 80;
    }
  }
  // the local frame: forward f, side s (right), up
  _frame(view) { const f = [Math.cos(this.facing), Math.sin(this.facing)], s = [-f[1], f[0]]; return { f, s }; }
  _pt(F, fw, sd, up) { return [F.f[0] * fw + F.s[0] * sd, F.f[1] * fw + F.s[1] * sd, up]; }
  // the skeleton in local world offsets (from the feet), as named points
  _pose() {
    const o = this.o, P = this.P, k = o.scale, F = this._frame(), pt = (a, b, c) => this._pt(F, a * k, b * k, c * k), t = this.t;
    const A = this.att, au = A ? A.u : 0, ak = A ? A.kind : null, wind = A ? Math.sin(Math.min(1, au / .35) * Math.PI / 2) * (au < .35 ? 1 : 0) : 0, strike = A ? (au >= .35 ? Math.sin((au - .35) / .65 * Math.PI) : 0) : 0;
    const breath = Math.sin(t * 2.4) * .3, run = Math.min(1, this.speed / 30), down = this.down;
    let hover = this.fly && o.body !== 'quad' ? 7 + Math.sin(t * 4) * 1.2 : (this.fly && this.o.parts.wings && this.o.parts.wings !== 'none' && this.speed > 4 ? 6 : 0);
    if (o.body === 'quad' && this.o.parts.wings && this.o.parts.wings !== 'none') hover = this.speed > 4 ? 5 : 0;
    if (this.sleep || down > 0) hover = 0;
    const lunge = (ak === 'bite' || ak === 'gore' || ak === 'pounce' || ak === 'coil' || ak === 'claw' ? strike * 4 - wind * 2 : 0) + (ak === 'dive' ? strike * 5 : 0);
    const rear = ak === 'breath' || ak === 'roar' || ak === 'stomp' ? wind * 4 - strike * (ak === 'stomp' ? 3 : 1) : 0;
    const hop = ak === 'pounce' ? Math.sin(Math.min(1, au) * Math.PI) * 6 : ak === 'dive' ? (au < .35 ? wind * 8 : (1 - strike) * 4) : 0;
    const legH = P[2], bodyR = P[1], bl = P[0];
    const sag = (this.sleep ? legH * .8 : 0) + down * legH;
    const bob = Math.abs(Math.sin(this.phase * 2)) * run * 1.2;
    const z0 = legH + bodyR * .6 + hover + hop + bob - sag + breath * .2;
    const J = { z0 };
    if (o.body === 'serpent') {
      const n = 16, segs = [], hist = this.trail;
      for (let i = 0; i < n; i++) {
        const d = i * 2.6 * k; let px0, py0;
        if (hist.length > 1 && this.speed > 1) { const h = hist[Math.min(hist.length - 1, Math.round(d / 1))] || hist[hist.length - 1]; px0 = h[0] - this.x; py0 = h[1] - this.y; }
        else { const w = Math.sin(t * 2 - i * .55) * 3 * k * (i / n); const p = this._pt(F, -d * .8, w + Math.sin(i * .9) * 2 * k, 0); px0 = p[0]; py0 = p[1]; }
        const zz = i < 4 ? (4 - i) * 2.4 * k + 2 + rear * k * (4 - i) / 4 - down * 6 : 2.2 * k + Math.max(0, Math.sin(t * 3 - i * .7)) * .8;
        segs.push([px0, py0, Math.max(1, zz - sag * .2 + (ak === 'coil' ? Math.sin(i * .8 + au * 6) * 2 * strike : 0)), bodyR * k * (i < 2 ? 1 : 1 - (i - 2) / (n + 2))]);
      }
      const hd = this._pt(F, 3 * k + lunge * k, 0, 0); J.segs = segs; J.head = [hd[0], hd[1], segs[0][2] + 3 * k];
      J.snout = this._pt(F, (3 + P[6]) * k + lunge * k, 0, 0); J.snout[2] = J.head[2] - 1;
      return J;
    }
    // spine: hip, mid, shoulder
    const pitchUp = rear * .12;
    J.hip = pt(-bl / 2, 0, z0 - rear * .3); J.mid = pt(0 + lunge * .5, 0, z0 + breath * .3); J.sh = pt(bl / 2 + lunge, 0, z0 + rear + pitchUp * bl);
    if (o.body === 'avian') { J.hip = pt(-bl * .4, 0, z0); J.sh = pt(bl * .4 + lunge, 0, z0 + 1); }
    // neck and head
    const nk = P[3], nu = P[4], headDrop = ak === 'roar' ? -wind * 2 + strike * 3 : ak === 'gore' ? -wind * 3 : 0;
    const nb = [J.sh[0], J.sh[1], J.sh[2]];
    const hfw = bl / 2 + lunge + nk * (1 - nu * .55) + (ak === 'bite' ? strike * 2 : 0);
    J.head = pt(hfw, 0, z0 + rear + nk * nu + bodyR * .4 + headDrop - (this.sleep ? 2 : 0));
    J.neck = [lerp(nb[0], J.head[0], .5), lerp(nb[1], J.head[1], .5), lerp(nb[2], J.head[2], .55)];
    J.snout = pt(hfw + P[6] * .9 + (ak === 'breath' ? strike * 1.5 : 0), 0, J.head[2] / k - .8 - (ak === 'gore' ? wind : 0));
    // legs: [hipPoint, footPoint, side, front]
    const legs = [], stride = P[8] * run, lift = 2.5 * run;
    const pairs = o.body === 'avian' || (o.body === 'drake' && o.legs2) ? [[-bl * .1, false]] : [[-bl / 2 + 1, false], [bl / 2 - 1, true]];
    for (const [fw, front] of pairs) for (const side of [-1, 1]) {
      const ph = this.phase + (side < 0 ? 0 : Math.PI) + (front ? Math.PI : 0) * (o.body === 'quad' ? 1 : 0);
      let footF = fw + Math.sin(ph) * stride * .5, footZ = Math.max(0, Math.cos(ph)) * lift;
      if (front && ak === 'claw') { footF += strike * 5; footZ += wind * 5 + strike * 3; }
      if (front && ak === 'stomp') footZ += wind * 6;
      if (hover > 3) { footF = fw - 1; footZ = hover - legH * .35; }
      if (this.sleep || down > .5) { footF = fw + (front ? 3 : -3); footZ = 0; }
      const hipP = pt(fw + (front ? lunge : 0), side * bodyR * .55, z0 - bodyR * .4 + (front ? rear : 0));
      const foot = pt(footF + (front ? lunge * .6 : 0), side * bodyR * .6, footZ + (hop > 0 ? hop * .7 : 0));
      legs.push({ hip: hipP, foot, side, front });
    }
    J.legs = legs;
    // tail chain
    const tl = P[7], tsw = this.tailA + Math.sin(t * 2.2) * .25 + (ak === 'tailsweep' ? Math.sin(au * Math.PI * 2) * 2.2 * (au > .2 ? 1 : 0) : 0);
    J.tail = [];
    for (let i = 1; i <= 4; i++) { const u = i / 4, a = tsw * u; J.tail.push(pt(-bl / 2 - Math.cos(a) * tl * u, Math.sin(a) * tl * u, z0 + (o.parts.tail === 'short' ? 1 : -1) * u * (o.body === 'lizard' || o.preset === 'lizard' ? 3 : 1.5) + (this.o.parts.pendulum ? -u * 4 : 0))); }
    // wings
    const wk = this.o.parts.wings;
    if (wk && wk !== 'none' && (!this.o.parts.wingsFrom || (this.o.tier || 1) >= this.o.parts.wingsFrom)) {
      const flapping = hover > 3 || ak === 'dive' || this.fly && o.body !== 'quad';
      const fa = flapping ? Math.sin(t * (this.speed > 4 ? 14 : 9)) : (this.sleep ? -.6 : -.2 + Math.sin(t * 1.5) * .08);
      const span = (o.body === 'drake' ? 16 : o.body === 'avian' ? 12 : 11);
      J.wings = [-1, 1].map(side => { const root = pt(bl * .15, side * bodyR * .5, z0 + bodyR * .7), mid = pt(bl * .05, side * (span * .55), z0 + bodyR + 5 + fa * 5), tip = pt(-bl * .2, side * span, z0 + bodyR + 3 + fa * 9), back = pt(-bl * .35, side * span * .45, z0 + bodyR * .5 + fa * 2); return { side, root, mid, tip, back }; });
    }
    return J;
  }
  mouth() { const J = this._pose(); const p = J.snout; return [this.x + p[0], this.y + p[1], this.z + p[2]]; }
  tip() { return this.mouth(); }
  draw(g, ox, oy, view) {
    if (this.o.charView !== false && E.charView) view = E.charView(view);
    const J = this._pose(), T = this.T, C = this.C, k = this.o.scale, items = [], P = this.P;
    const S = p => { const q = view.p(p[0], p[1], p[2]); return [ox + q[0], oy + q[1]]; }, D = p => view.depth(p[0], p[1], p[2]), sc = view.scale;
    const disc = (p, r, tone, o = {}) => items.push({ d: D(p) + (o.bias || 0), k: 'disc', p: S(p), r: Math.max(1, r * sc), tone, o });
    const limb = (a, b, w, tone, o = {}) => items.push({ d: (D(a) + D(b)) / 2 + (o.bias || 0), k: 'limb', a: S(a), b: S(b), w: Math.max(1, w * sc), tone, o });
    const poly = (pts, tone, o = {}) => items.push({ d: pts.reduce((s, p) => s + D(p), 0) / pts.length + (o.bias || 0), k: 'poly', pts: pts.map(S), tone, o });
    const mid = (a, b, u = .5) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
    const far = s => s * Math.sin(this.facing - (view.yaw || 0)) > 0;
    if (this.o.body === 'serpent') {
      J.segs.forEach((s, i) => disc(s, s[3], i % 2 ? T.body : T.dark === T.body ? T.body : T.body, { shade: true }));
      J.segs.forEach((s, i) => { if (this.o.parts.fins && i % 3 === 1) poly([[s[0], s[1], s[2] + s[3] * k], [s[0] - 1.5, s[1], s[2] + s[3] * k + 3 * k], [s[0] - 3, s[1], s[2] + s[3] * k]], T.accent, { bias: .1 }); });
      if (this.o.parts.pendulum) { const tl = J.segs[J.segs.length - 1], sw = Math.sin(this.t * 2.5) * 4; const dsk = [tl[0], tl[1] + sw * .3, tl[2] + 1]; limb(tl, dsk, .6, T.accent); disc(dsk, 3.2 * k, T.accent, { shine: true }); }
      this._head(J, disc, limb, poly, mid);
    } else {
      // legs
      for (const L of J.legs) { const knee = mid(L.hip, L.foot, .5); knee[2] += 1.2 * k; knee[0] += (L.front ? -1 : 1) * Math.cos(this.facing) * 1.2 * k; knee[1] += (L.front ? -1 : 1) * Math.sin(this.facing) * 1.2 * k; const tone = far(L.side) ? T.dark : T.body;
        limb(L.hip, knee, (this.o.body === 'avian' ? .9 : P[1] * .38) * k, tone); limb(knee, L.foot, (this.o.body === 'avian' ? .7 : P[1] * .28) * k, tone); disc(L.foot, (this.o.body === 'avian' ? 1 : P[1] * .24) * k, T.dark, { bias: .01 }); }
      // tail
      let prev = J.hip;
      J.tail.forEach((p, i) => { const w = (this.o.parts.tail === 'short' ? 1.4 : P[1] * .32 * (1 - i / 5)) * k; limb(prev, p, Math.max(.6, w), this.o.preset === 'lizard' || this.o.body === 'drake' ? T.body : T.dark); prev = p; });
      const tt = J.tail[J.tail.length - 1];
      if (this.o.parts.tail === 'flame') disc(tt, 2.2 * k, E.tones(C.flame), { glow: true, flicker: true });
      if (this.o.body === 'avian') { const fan = J.tail[1]; poly([J.hip, [fan[0] + 2, fan[1] + 3, fan[2] - 1], [fan[0] - 2, fan[1], fan[2] + 1], [fan[0] + 2, fan[1] - 3, fan[2] - 1]], T.wing); }
      // body: discs along the spine
      const br = P[1] * k;
      disc(J.hip, br * .92, T.body, { shade: true }); disc(J.mid, br, T.body, { shade: true, belly: true }); disc(J.sh, br * .95, T.body, { shade: true });
      if (this.o.parts.mane) { const mc = this.o.parts.mane === 'flame' ? E.tones(C.flame) : E.tones(this.o.parts.mane); disc([J.sh[0], J.sh[1], J.sh[2] + br * .5], br * .75, mc, { glow: this.o.parts.mane === 'flame', flicker: this.o.parts.mane === 'flame', bias: .2 }); }
      if (this.o.parts.gears) disc([J.mid[0], J.mid[1], J.mid[2] + br * .8], br * .4, T.accent, { gear: true, bias: .3 });
      // neck and head
      limb(J.sh, J.neck, br * .7, T.body); limb(J.neck, J.head, br * .55, T.body);
      if (this.o.preset === 'horse' && this.o.parts.mane) limb([J.sh[0], J.sh[1], J.sh[2] + br * .6], [J.head[0], J.head[1], J.head[2] + 1.5 * k], 1.4 * k, E.tones(this.o.parts.mane), { bias: .25 });
      this._head(J, disc, limb, poly, mid);
      // wings (membranes or feathers)
      if (J.wings) for (const w of J.wings) {
        const tone = T.wing, fb = far(w.side) ? -2 : 2;
        if (this.o.parts.wings === 'bat') { poly([w.root, w.mid, w.tip, mid(w.tip, w.back, .5), w.back], tone, { bias: fb, membrane: true }); limb(w.root, w.mid, .7 * k, T.dark, { bias: fb + .01 }); limb(w.mid, w.tip, .5 * k, T.dark, { bias: fb + .01 }); }
        else { for (let i = 0; i < 4; i++) { const u = i / 3; const a = mid(w.root, w.mid, u), b = mid(w.mid, w.tip, u); poly([a, b, mid(w.back, w.tip, u * .8), mid(w.root, w.back, u)], i % 2 ? tone : E.tones(E.mix(C.wing, '#ffffff', .2)), { bias: fb + i * .001 }); } }
      }
    }
    items.sort((a, b) => a.d - b.d);
    const hurt = this.hurt > 0 && Math.floor(this.t * 30) % 2 === 0;
    // outline pass
    for (const it of items) { const c = '#140c14'; if (it.k === 'disc') px.disc(g, it.p[0], it.p[1], it.r + 1, c); else if (it.k === 'limb') px.line(g, it.a[0], it.a[1], it.b[0], it.b[1], c, it.w + 2); else if (!it.o.noOutline) for (let i = 0; i < it.pts.length; i++) { const a = it.pts[i], b = it.pts[(i + 1) % it.pts.length]; px.line(g, a[0], a[1], b[0], b[1], c, 2); } }
    // fill pass
    for (const it of items) {
      const tn = hurt ? E.tones('#ffffff') : it.tone, base = it.o.flicker ? (Math.floor(this.t * 12) % 2 ? tn.lt : tn.base) : tn.base;
      if (it.k === 'disc') {
        px.disc(g, it.p[0], it.p[1], it.r, it.o.shade ? tn.sh : base);
        if (it.o.shade) { px.disc(g, it.p[0] - it.r * .15, it.p[1] - it.r * .2, it.r * .78, base); px.disc(g, it.p[0] - it.r * .35, it.p[1] - it.r * .45, Math.max(1, it.r * .3), tn.lt); }
        if (it.o.belly) px.ell(g, it.p[0], it.p[1] + it.r * .45, it.r * .6, it.r * .3, this.T.belly.base);
        if (it.o.shine) px.dot(g, it.p[0] - 1, it.p[1] - 1, tn.hi);
        if (it.o.gear) for (let i = 0; i < 6; i++) { const a = this.t * 2 + i * Math.PI / 3; px.dot(g, it.p[0] + Math.cos(a) * it.r, it.p[1] + Math.sin(a) * it.r, tn.hi); }
        if (it.o.eye) { px.disc(g, it.p[0], it.p[1], Math.max(1, it.r), this.sleep ? this.T.body.sh : it.o.eye); if (!this.sleep && it.r >= 1) px.dot(g, it.p[0], it.p[1] - 1, '#ffffff'); if (this.sleep) px.line(g, it.p[0] - 1, it.p[1], it.p[0] + 1, it.p[1], '#140c14'); }
      } else if (it.k === 'limb') { px.line(g, it.a[0], it.a[1], it.b[0], it.b[1], base, it.w); if (it.w > 2) px.line(g, it.a[0], it.a[1] - 1, it.b[0], it.b[1] - 1, tn.lt, Math.max(1, it.w * .35)); }
      else { px.poly(g, it.pts, it.o.membrane ? tn.sh : base); if (it.o.membrane) px.polyDither(g, it.pts, tn.lt, .25, 0, 0); }
    }
  }
  _head(J, disc, limb, poly, mid) {
    const k = this.o.scale, T = this.T, C = this.C, P = this.P, h = J.head, s = J.snout, o = this.o.parts;
    disc(h, P[5] * k, T.body, { shade: true, bias: .5 });
    limb(h, s, P[5] * k * (this.o.preset === 'horse' ? .9 : .75), T.body, { bias: .51 });
    disc(s, P[5] * k * .45, o.beak ? T.horn : T.belly, { bias: .52 });
    const F = this._frame(), up = [0, 0, 1];
    const eyeP = side => [h[0] + F.f[0] * P[5] * .3 * k + F.s[0] * side * P[5] * .5 * k, h[1] + F.f[1] * P[5] * .3 * k + F.s[1] * side * P[5] * .5 * k, h[2] + P[5] * .35 * k];
    for (const side of [-1, 1]) disc(eyeP(side), .9 * k, T.body, { eye: C.eye, bias: .6 });
    if (o.horn) { const base = [h[0] + F.f[0] * 1.5, h[1] + F.f[1] * 1.5, h[2] + P[5] * k * .8]; limb(base, [base[0] + F.f[0] * 4 * k, base[1] + F.f[1] * 4 * k, base[2] + 4 * k], 1.1 * k, T.horn, { bias: .7 }); }
    if (o.crest) for (const side of [-1, 1]) limb([h[0], h[1], h[2] + P[5] * .6 * k], [h[0] - F.f[0] * 4 * k + F.s[0] * side * 1.5, h[1] - F.f[1] * 4 * k + F.s[1] * side * 1.5, h[2] + P[5] * k + 2 * k], .9 * k, T.horn, { bias: .7 });
    if (o.tusks) for (const side of [-1, 1]) limb([s[0] + F.s[0] * side * 1.5, s[1] + F.s[1] * side * 1.5, s[2]], [s[0] + F.f[0] * 2 * k + F.s[0] * side * 2, s[1] + F.f[1] * 2 * k + F.s[1] * side * 2, s[2] + 2.5 * k], .9 * k, T.horn, { bias: .7 });
    if (this.o.preset === 'wolf' || this.o.preset === 'hound' || this.o.preset === 'cat' || this.o.preset === 'griffin') for (const side of [-1, 1]) limb([h[0] + F.s[0] * side * 1.6, h[1] + F.s[1] * side * 1.6, h[2] + P[5] * .6 * k], [h[0] - F.f[0] * 1 + F.s[0] * side * 2, h[1] - F.f[1] * 1 + F.s[1] * side * 2, h[2] + P[5] * k + 2.2 * k], 1.2 * k, T.dark, { bias: .45 });
    if (this.att && this.att.kind === 'breath' && this.att.u > .35 || (this.att && (this.att.kind === 'bite' || this.att.kind === 'roar') && this.att.u > .3)) disc([s[0], s[1], s[2] - 1], 1.2 * k, E.tones('#3a0a10'), { bias: .55 });
  }
  drawPortrait(g, x, y, size, o = {}) {
    const key = size + ':' + (o.bg || ''), cv = this._pc || (this._pc = {});
    if (!cv[key]) {
      const c = typeof document !== 'undefined' ? document.createElement('canvas') : null; if (!c) return;
      c.width = c.height = size; const gg = c.getContext('2d'); gg.imageSmoothingEnabled = false;
      px.rect(gg, 0, 0, size, size, o.bg || '#1a1624');
      const v = new E.View('pv', 'pv', 0, 20, Math.max(1, size / (this.o.body === 'serpent' ? 18 : (this.P[1] * 2 + this.P[5] * 2 + 6))) / Math.max(.6, this.o.scale), 1);
      const sv = { facing: this.facing, t: this.t, att: this.att, speed: this.speed, sleep: this.sleep, down: this.down, hurt: this.hurt, trail: this.trail };
      this.facing = Math.PI * .85; this.att = null; this.speed = 0; this.sleep = false; this.down = 0; this.hurt = 0; this.trail = [];
      try { const J = this._pose(), q = v.p(J.head[0], J.head[1], J.head[2]); this.draw(gg, size / 2 - q[0] + size * .1, size * .55 - q[1], Object.assign(Object.create(Object.getPrototypeOf(v)), v)); }
      finally { Object.assign(this, sv); this.att = sv.att; }
      cv[key] = c;
    }
    g.drawImage(cv[key], Math.round(x), Math.round(y));
  }
}
E.Beast = Beast;

/* E.Wings: a pair of wings for a Humanoid (a pixie's insect wings, a harpy's feathers), drawn from its back */
class Wings {
  constructor(rig, o = {}) { this.rig = rig; this.o = Object.assign({ kind: 'insect', color: '#f0e0ff' }, o); this.t = 0; this.T = E.tones(this.o.color); }
  update(dt) { this.t += dt; }
  // call before (behind) or after (in front of) rig.draw, by facing against the view
  draw(g, ox, oy, view, front) {
    const r = this.rig, f = r.facing === undefined ? (r.state && r.state.facing) || 0 : r.facing, yaw = view.yaw || 0;
    const behind = Math.cos(f - yaw - Math.PI / 2) > 0; if (!!front === behind) return;
    const sz = (r.o && r.o.size) || 1, sc = view.scale, flap = Math.sin(this.t * (this.o.kind === 'insect' ? 26 : 10)), T = this.T;
    const [bx, by] = view.p(0, 0, 18 * sz); const cx = ox + bx, cy = oy + by;
    for (const side of [-1, 1]) {
      const sp = (this.o.kind === 'insect' ? 9 : 13) * sz * sc, up = (this.o.kind === 'insect' ? 7 : 6) * sz * sc * (.6 + flap * .4);
      const pts = this.o.kind === 'insect' ? [[cx, cy], [cx + side * sp, cy - up], [cx + side * sp * .9, cy + up * .2], [cx + side * sp * .3, cy + up * .5]] : [[cx, cy], [cx + side * sp * .6, cy - up * 1.2], [cx + side * sp, cy - up * .4], [cx + side * sp * .8, cy + up * .3], [cx + side * sp * .3, cy + up * .6]];
      for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; px.line(g, a[0], a[1], b[0], b[1], '#140c14', 2); }
      if (this.o.kind === 'insect') px.blend(g, .7, 'normal', () => px.poly(g, pts, T.lt)); else px.poly(g, pts, T.base);
      px.line(g, cx, cy, pts[1][0], pts[1][1], this.o.kind === 'insect' ? T.hi : T.sh, 1);
    }
  }
}
E.Wings = Wings;
E.BEAST_PRESETS = PRE; E.BEAST_SIZE = SIZE_K;
})();
