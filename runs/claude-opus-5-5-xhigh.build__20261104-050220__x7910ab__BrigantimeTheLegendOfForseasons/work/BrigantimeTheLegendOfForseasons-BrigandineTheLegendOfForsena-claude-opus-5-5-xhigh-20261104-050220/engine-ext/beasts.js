/*!
my-3D2dge extension BEASTS v1.0 (written for Brigantime): four-legged, winged, bird and serpent rigs, and wings for Humanoids
Loads after: the full engine. Needs: no module.

Characters that are not people: wolves and lions, horses, boars, lizards, griffins, wyverns and dragons, firebirds and
serpents, drawn from a 3D skeleton as shaded pixel art in every view, with the Humanoid's interface:
- new E.Beast({ kind: 'quad' | 'drake' | 'avian' | 'serpent', preset, size: 1, colors: { body, belly, dark, accent, eye,
  horn, wing, flame }, parts: { horn, mane: true | 'flame', tusks, crest, fins, gears, legs4, wings: 'feather' | 'bat' |
  'none', tail: 'long' | 'short' | 'snake' | 'flame' | 'pendulum' } }). Presets: hound wolf horse cat boar lizard griffin
  drake2 (a wyvern: two legs and wing-arms) drake4 (a dragon: four legs and wings) avian serpent. The preset picks the kind.
- beast.update(dt, { x, y, z, vx, vy, facing, attack: { kind, u: 0..1 }, hurt: 0..1, pose: 'sleep' | 'die' | 'roar',
  down: 0..1, flying }) each step; beast.draw(g, ox, oy, view) inside r.actor; beast.drawPortrait(g, x, y, size, o);
  beast.mouth() and beast.tip(): world offsets from the feet of the mouth (breath) and the head.
- Actions (attack.kind): bite claw gore breath tailsweep roar pounce dive coil stomp. u runs 0..1: a wind-up to .35, the
  strike to .55, then the recovery.
- new E.Wings({ kind: 'insect' | 'feather' | 'bat', span, colors: { a, b } }): wings for a Humanoid (a pixie, a harpy):
  wings.update(dt, { moving }) and wings.draw(g, ox, oy, view, rig, front) twice per frame (front false before the rig,
  true after), so they sit behind or before it by its facing.
Motion: the gait comes from speed (quads trot on diagonal pairs), planted feet bend at the knee by a two-bone solve, the
body bobs and the head counter-bobs, a spring-damper chain sways the tail, fliers hover and flap faster when moving, and
idle beasts breathe and flick their tails. Drawing projects every joint through the view, sorts the parts by depth (far
limbs and wing first), and shades each part with E.tones (shadow side, lit edge, a highlight); r.actor adds the outline.
*/
(function (E) {
'use strict';
if (!E) throw new Error('BEASTS: load the engine first');
const { px, tones, clamp, lerp } = E, TAU = Math.PI * 2;
const sz = (s, a) => (Array.isArray(a) ? a.map(v => v * s) : a * s);

// presets in world units at size 1: body length, shoulder height, leg length, neck, head size, tail, girth
const PRESETS = {
  hound: { kind: 'quad', len: 15, h: 10, leg: 9, neck: 5, head: 4.6, snout: 3.4, tail: 9, girth: 4.2, ears: 'point', gait: 1 },
  wolf: { kind: 'quad', len: 16, h: 11, leg: 10, neck: 5.5, head: 4.8, snout: 4, tail: 10, girth: 4.4, ears: 'point', gait: 1, bushy: true },
  horse: { kind: 'quad', len: 19, h: 14, leg: 13, neck: 9, head: 5.2, snout: 5, tail: 9, girth: 5, ears: 'point', gait: .9, long: true },
  cat: { kind: 'quad', len: 17, h: 11, leg: 9.5, neck: 5, head: 5.4, snout: 2.6, tail: 12, girth: 5, ears: 'round', gait: 1, tuft: true },
  boar: { kind: 'quad', len: 15, h: 9, leg: 6, neck: 3, head: 5.6, snout: 4.4, tail: 4, girth: 5.6, ears: 'point', gait: 1.3 },
  lizard: { kind: 'quad', len: 13, h: 5, leg: 4.5, neck: 3, head: 4, snout: 3.4, tail: 14, girth: 3.6, ears: null, gait: 1.5, sprawl: true },
  griffin: { kind: 'quad', len: 18, h: 13, leg: 11, neck: 6, head: 5, snout: 3, tail: 11, girth: 5.2, ears: 'tuft', gait: .9, beak: true, wings: 'feather' },
  drake2: { kind: 'drake', len: 20, h: 13, leg: 10, neck: 9, head: 5.6, snout: 4.6, tail: 18, girth: 6, ears: null, gait: .8, wings: 'bat', legs: 2 },
  drake4: { kind: 'drake', len: 24, h: 14, leg: 11, neck: 11, head: 6.4, snout: 5.4, tail: 22, girth: 7, ears: null, gait: .75, wings: 'bat', legs: 4 },
  avian: { kind: 'avian', len: 9, h: 9, leg: 6, neck: 4, head: 3.8, snout: 2.4, tail: 9, girth: 4.4, ears: null, gait: 1.4, beak: true, wings: 'feather' },
  serpent: { kind: 'serpent', len: 30, h: 12, leg: 0, neck: 0, head: 5.4, snout: 4.4, tail: 0, girth: 4, ears: null, gait: 1, segs: 16 }
};
const DEF_COLORS = { body: '#8a7a6a', belly: '#c8b8a0', dark: '#3a2e26', accent: '#c84a2a', eye: '#ffe040', horn: '#f0e8d0', wing: '#7a6a5a', flame: '#ffb020' };

class Beast {
  constructor(o = {}) {
    const P = PRESETS[o.preset] || PRESETS.hound;
    this.o = Object.assign({}, P, o, { parts: Object.assign({ wings: P.wings || 'none', tail: 'long' }, o.parts || {}) });
    if (this.o.parts.wings === true) this.o.parts.wings = P.wings || 'feather';
    this.kind = o.kind || P.kind; this.size = o.size || 1;
    this.C = Object.assign({}, DEF_COLORS, o.colors || {});
    this.T = {}; for (const k of Object.keys(this.C)) this.T[k] = tones(this.C[k]);
    this.t = Math.random() * 10; this.phase = 0; this.speed = 0; this.facing = 0; this.x = 0; this.y = 0; this.z = 0;
    this.tailV = [0, 0]; this.tailA = [0, 0]; this.hurtT = 0; this.flapP = 0; this.down = 0; this.lie = 0; this.roll = 0;
    this.attack = null; this.pose = null; this.flying = !!(this.o.parts.wings !== 'none' && this.o.fly !== false && (this.kind === 'avian' || this.kind === 'drake' || o.flier));
    this.kickV = 0; this.kickS = 0;
  }
  get flier() { return this.flying; }
  update(dt, s = {}) {
    this.t += dt;
    const sp = Math.hypot(s.vx || 0, s.vy || 0);
    this.speed = lerp(this.speed, sp, Math.min(1, dt * 8));
    this.x = s.x || 0; this.y = s.y || 0; this.z = s.z || 0;
    if (s.facing !== undefined) this.facing = s.facing;
    const stride = (this.o.len * .9 + 6) * this.size / (this.o.gait || 1);
    this.phase += this.speed * dt / stride * TAU * .5;
    if (this.speed < 2) this.phase = lerp(this.phase, Math.round(this.phase / Math.PI) * Math.PI, Math.min(1, dt * 4));
    this.attack = s.attack || null; this.pose = s.pose || null; this.flyingNow = s.flying !== undefined ? s.flying : this.flying;
    this.hurtT = Math.max(0, (s.hurt || 0));
    // tail spring: turning and accelerating swing it
    const tgt = [-Math.sin(this.t * 1.7) * .25 - (s.turn || 0) * .6, Math.sin(this.t * 1.1) * .15 + (this.speed > 4 ? -.2 : 0)];
    for (let i = 0; i < 2; i++) { this.tailV[i] += ((tgt[i] - this.tailA[i]) * 40 - this.tailV[i] * 7) * dt; this.tailA[i] += this.tailV[i] * dt; }
    this.flapP += dt * (this.flyingNow ? (this.speed > 4 ? 16 : 9) : 0);
    const lieGoal = this.pose === 'sleep' ? 1 : 0; this.lie = lerp(this.lie, lieGoal, Math.min(1, dt * 4));
    const downGoal = this.pose === 'die' ? 1 : s.down || 0; this.down = Math.min(1, this.down + (downGoal > this.down ? dt / .6 : -dt * 3)); if (downGoal < this.down && downGoal === 0) this.down = Math.max(0, this.down);
    this.kickV += (-this.kickS * 300 - this.kickV * 12) * dt; this.kickS += this.kickV * dt;
  }
  kick(v) { this.kickV += v * 8; }
  /** the attack's motion: { lean (forward), rear (lift of the chest), jaw (0..1), reach, spin, hop, swipe } */
  _act() {
    const a = this.attack; if (!a) return { lean: 0, rear: 0, jaw: 0, hop: 0, spin: 0, swipe: 0, coil: 0, dive: 0 };
    const u = clamp(a.u || 0, 0, 1), wind = u < .35 ? u / .35 : 1, strike = u < .35 ? 0 : u < .55 ? (u - .35) / .2 : 1, rec = u < .55 ? 0 : (u - .55) / .45;
    const pull = wind * (1 - strike), hit = strike * (1 - rec), out = { lean: 0, rear: 0, jaw: 0, hop: 0, spin: 0, swipe: 0, coil: 0, dive: 0 };
    switch (a.kind) {
      case 'bite': out.lean = -pull * .4 + hit * 1; out.jaw = pull * .8 + hit * .3; break;
      case 'claw': out.rear = pull * .6 + hit * .3; out.swipe = hit; out.lean = hit * .5; break;
      case 'gore': out.lean = -pull * .3 + hit * 1.2; out.rear = -pull * .5; out.jaw = 0; break;
      case 'breath': out.rear = pull * .9 - hit * .2; out.lean = -pull * .3 + hit * .6; out.jaw = Math.max(pull * .4, hit); break;
      case 'tailsweep': out.spin = Math.sin(Math.min(1, u / .7) * Math.PI) * (u < .35 ? -.4 : 1.4); break;
      case 'roar': out.rear = (pull + hit) * .7; out.jaw = pull * .5 + hit; break;
      case 'pounce': out.hop = Math.sin(clamp((u - .2) / .5, 0, 1) * Math.PI) * 1; out.lean = -pull * .4 + hit * .8; out.jaw = hit; break;
      case 'dive': out.dive = Math.sin(clamp(u / .6, 0, 1) * Math.PI); out.lean = hit; out.jaw = hit; break;
      case 'coil': out.coil = Math.sin(clamp(u, 0, 1) * Math.PI); out.jaw = hit; out.lean = hit * .6; break;
      case 'stomp': out.rear = pull * 1.2 - hit * .2; out.lean = hit * .2; out.hop = -hit * .2; break;
    }
    return out;
  }
  /** the skeleton this frame in the beast's own frame: points [forward, right, up] */
  _pose() {
    const o = this.o, S = this.size, t = this.t, act = this._act(), ph = this.phase, moving = this.speed > 2;
    const run = Math.min(1, this.speed / 30), fly = this.flyingNow ? 1 : 0, lie = this.lie, die = this.down;
    const bob = moving ? Math.abs(Math.sin(ph * 2)) * 1.2 * run : Math.sin(t * 2) * .25;
    const hover = fly * (8 + Math.sin(t * 3) * 1.2 - act.dive * 6) * (1 - lie);
    const L = o.len * S, Hh = o.h * S * (1 - lie * .6), lean = act.lean * 2.5 * S, rear = act.rear;
    const chestZ = Hh + bob * S + hover + rear * 4 * S + act.hop * 6 * S, hipZ = Hh * (o.kind === 'drake' ? .95 : 1) + bob * .6 * S + hover - rear * 1.2 * S + act.hop * 5 * S;
    const J = { chest: [L * .32 + lean, 0, chestZ], hip: [-L * .32 + lean * .5, 0, hipZ], spin: act.spin, fly, die, lie, act };
    // neck and head
    const nk = o.neck * S, hs = o.head * S, nodding = moving ? Math.sin(ph * 2 + 1) * .6 : Math.sin(t * 1.3) * .3;
    const neckUp = (o.kind === 'serpent' ? 0 : o.kind === 'avian' ? 1 : .75) + rear * .3 - lie * .6 - act.lean * .25;
    J.neckBase = [J.chest[0] + L * .06, 0, J.chest[2] + o.girth * S * .3];
    J.head = [J.neckBase[0] + nk * Math.cos(neckUp) + act.lean * 3 * S, 0, J.neckBase[2] + nk * Math.sin(neckUp) - nodding * S * .5 - lie * 2 * S];
    J.snout = [J.head[0] + o.snout * S * (1 + act.lean * .2), 0, J.head[2] - hs * .25 - lie * S];
    J.jaw = act.jaw;
    // tail: a chain from the hip, swayed by the spring
    J.tail = [];
    const tl = (o.tail || 0) * S, tn = o.kind === 'drake' ? 6 : 4;
    let p = J.hip.slice(), a = Math.PI + this.tailA[0] * .3, el = o.kind === 'lizard' || o.kind === 'drake' ? -.15 : .35 + this.tailA[1];
    if (o.parts.tail === 'short') el = .8;
    for (let i = 0; i < tn; i++) {
      const seg = tl / tn, sway = this.tailA[0] * (i + 1) * .25 + act.spin * (i + 1) * .3;
      p = [p[0] + Math.cos(a) * seg, p[1] + Math.sin(sway) * seg, Math.max(lie ? .5 : 1, p[2] + Math.sin(el) * seg * (o.kind === 'lizard' ? .2 : 1))];
      el -= o.kind === 'lizard' || o.kind === 'drake' ? .12 : .25; J.tail.push(p);
    }
    // legs: hip / shoulder anchors, feet planted by the gait (diagonal pairs)
    J.legs = [];
    if (o.kind !== 'serpent') {
      const nlegs = o.kind === 'avian' ? 2 : o.kind === 'drake' ? (o.parts.legs4 || o.legs === 4 ? 4 : 2) : 4;
      const spread = (o.sprawl ? o.girth * 1.2 : o.girth * .6) * S, legL = o.leg * S;
      const anchors = nlegs === 2 ? [[J.hip, -1, 0], [J.hip, 1, Math.PI]] : [[J.chest, -1, 0], [J.chest, 1, Math.PI], [J.hip, -1, Math.PI], [J.hip, 1, 0]];
      for (const [base, side, off] of anchors) {
        const hip = [base[0], side * spread * .7, base[2] - o.girth * S * .35];
        const swing = moving ? Math.sin(ph * 2 + off) : 0, lift = moving ? Math.max(0, Math.cos(ph * 2 + off)) * 2.2 * S * run + .3 : 0;
        let foot = [hip[0] + swing * L * .22 * (.5 + run * .6), side * spread * (o.sprawl ? 1.4 : .8), lift];
        if (fly) foot = [hip[0] - legL * .35, side * spread * .6, hip[2] - legL * .7];
        if (lie) foot = [hip[0] + legL * .5 * lie, side * spread * 1.1, 0];
        if (act.swipe && base === J.chest && side === 1) foot = [hip[0] + legL * .9, side * spread * .7, hip[2] - legL * .1];
        if (act.rear > .4 && base === J.chest && nlegs === 4) foot = [hip[0] + legL * .4, side * spread * .7, Math.max(0, hip[2] - legL * .8)];
        // two-bone solve: the knee bends forward on front legs and backward (a hock) on hind legs
        const d = Math.hypot(foot[0] - hip[0], foot[2] - hip[2]) || .01, half = legL / 2, bend = Math.sqrt(Math.max(0, half * half - (d / 2) ** 2));
        const mx = (hip[0] + foot[0]) / 2, mz = (hip[2] + foot[2]) / 2, nx = -(foot[2] - hip[2]) / d, nz = (foot[0] - hip[0]) / d, dir = base === J.chest && nlegs === 4 ? -1 : 1;
        const knee = [mx + nx * bend * dir, (hip[1] + foot[1]) / 2, mz + nz * bend * dir];
        J.legs.push({ hip, knee, foot, side, front: base === J.chest && nlegs === 4 });
      }
    }
    // serpent body: segments in an S that slithers with speed, the head raised
    if (o.kind === 'serpent') {
      const n = o.segs, segL = L / n, out = [];
      const wav = this.t * (moving ? 6 : 1.5) + this.phase * 2;
      for (let i = 0; i < n; i++) {
        const k = i / (n - 1), raise = Math.max(0, 1 - k * 3.2) * (o.h * S + hover) * (1 - lie * .7);
        const coil = act.coil * Math.sin(k * TAU) * 6 * S;
        out.push([L * .25 - i * segL * .92 + act.lean * 4 * S * (1 - k), Math.sin(wav - k * 6) * 4.5 * S * Math.min(1, k * 2.5) + coil, raise + 2 * S * (1 - k * .5) + hover * k]);
      }
      J.segs = out; J.head = [out[0][0] + segL * .5, out[0][1], out[0][2] + 2 * S]; J.snout = [J.head[0] + o.snout * S, J.head[1], J.head[2] - S];
      J.neckBase = out[1]; J.chest = out[2]; J.hip = out[Math.floor(n / 2)];
      J.tail = out.slice(n - 3);
    }
    // wings: shoulder, elbow, wrist, finger tips, flapping
    if (o.parts.wings && o.parts.wings !== 'none') {
      const span = (o.kind === 'avian' ? 12 : o.kind === 'drake' ? 16 : 12) * S, f = Math.sin(this.flapP) * fly + (1 - fly) * -.6;
      const fold = fly ? 1 : .35 + act.rear * .4;
      J.wings = [-1, 1].map(side => {
        const sh = [J.chest[0] - L * .05, side * o.girth * S * .5, J.chest[2] + o.girth * S * .4];
        const up = f * .9, out = fold;
        const elbow = [sh[0] - span * .15, sh[1] + side * span * .45 * out, sh[2] + span * .35 * (up + .4)];
        const wrist = [sh[0] - span * .1, sh[1] + side * span * .9 * out, sh[2] + span * .55 * (up + .2) + (1 - out) * span * .3];
        const tips = [0, 1, 2, 3].map(i => [wrist[0] - span * (.25 + i * .22) * (1 - out * .2), wrist[1] + side * span * (.25 - i * .05) * out, wrist[2] - span * (.05 + i * .18) * (out + .2)]);
        return { sh, elbow, wrist, tips, side };
      });
    }
    return J;
  }
  /** world offset (from the feet) of a point in the beast's own frame */
  _w(p) {
    const f = this.facing, c = Math.cos(f), s = Math.sin(f), J = this._lastJ;
    let x = p[0], y = p[1], z = p[2];
    if (J && J.die) { const r = J.die * Math.PI / 2 * .95, cr = Math.cos(r), sr = Math.sin(r); const ny = y * cr - z * sr, nz = y * sr + z * cr; y = ny; z = Math.max(0, nz + this.o.girth * this.size * .4 * J.die); }
    return [x * c - y * s, x * s + y * c, z];
  }
  /** where the mouth is, in world units from the feet (breath, projectiles) */
  mouth() { const J = this._lastJ || this._pose(); return this._w(J.snout); }
  /** where the head is */
  tip() { const J = this._lastJ || this._pose(); return this._w(J.head); }
  draw(g, ox, oy, view) {
    if (E.charView && this.o.charView !== false) view = E.charView(view);
    const J = this._lastJ = this._pose(), o = this.o, S = this.size, T = this.T, C = this.C;
    const P = p => { const w = this._w(p), q = view.p(w[0], w[1], w[2]); return [ox + q[0], oy + q[1], view.depth(w[0], w[1], w[2])]; };
    const sc = view.scale, parts = [];
    const add = (d, fn) => parts.push([d, fn]);
    const limb = (a, b, w0, w1, tn) => { const A = P(a), B = P(b); add((A[2] + B[2]) / 2, () => { const w = Math.max(1, (w0 + w1) / 2 * sc); px.line(g, A[0], A[1], B[0], B[1], tn.sh, w + 1); px.line(g, A[0], A[1] - .5, B[0], B[1] - .5, tn.base, Math.max(1, w - .5)); }); };
    const blob = (p, rx, rz, tn, d0 = 0, hl = true) => { const A = P(p); add(A[2] + d0, () => { const r1 = Math.max(1, rx * sc), r2 = Math.max(1, rz * sc); px.ell(g, A[0], A[1], r1, r2, tn.sh); px.ell(g, A[0] - r1 * .12, A[1] - r2 * .18, r1 * .86, r2 * .74, tn.base); if (hl && r1 > 2) px.ell(g, A[0] - r1 * .35, A[1] - r2 * .4, Math.max(1, r1 * .35), Math.max(1, r2 * .22), tn.lt); }); };
    // legs (far first by depth)
    for (const L of J.legs) {
      const tn = L.side < 0 ? T.dark : T.body, w = (o.kind === 'avian' ? .9 : o.girth * .42) * S;
      limb(L.hip, L.knee, w * 1.3, w, tn); limb(L.knee, L.foot, w, w * .7, tn);
      const F = P(L.foot); add(F[2] + .01, () => { if (o.kind === 'avian' || o.beak && L.front) { px.line(g, F[0] - 1, F[1], F[0] + 2, F[1], C.horn, 1); } else px.ell(g, F[0], F[1], Math.max(1, w * sc * .7), Math.max(1, w * sc * .35), T.dark.deep); });
    }
    // tail
    if (o.kind !== 'serpent' && J.tail.length) {
      let prev = J.hip; const tw = o.girth * .55 * S;
      J.tail.forEach((p, i) => { const k = 1 - i / J.tail.length; limb(prev, p, tw * (k + .2), tw * (k * .8 + .1), T.body); prev = p; });
      const end = J.tail[J.tail.length - 1], E2 = P(end);
      if (o.parts.tail === 'flame') add(E2[2] + .02, () => this._flame(g, E2[0], E2[1], 3 * S * sc));
      if (o.bushy) blob(end, 1.6 * S, 1.3 * S, T.belly, .02, false);
      if (o.parts.tail === 'snake') { const H2 = P(end); add(H2[2] + .02, () => { px.disc(g, H2[0], H2[1] - 1, Math.max(1, 1.5 * S * sc), C.accent); px.dot(g, H2[0] + 1, H2[1] - 2, C.eye); }); }
      if (o.parts.tail === 'pendulum') { const H2 = P(end); add(H2[2] + .02, () => { const r = Math.max(2, 2.4 * S * sc); px.disc(g, H2[0], H2[1] + r, r, T.accent.sh); px.disc(g, H2[0] - .5, H2[1] + r - .5, r * .7, '#d8c070'); px.dot(g, H2[0], H2[1] + r - 1, '#fff'); }); }
      if (o.tuft) blob(end, 1.2 * S, 1 * S, T.dark, .02, false);
    }
    // body
    if (o.kind === 'serpent') {
      J.segs.forEach((p, i) => { const k = 1 - i / J.segs.length, r = o.girth * S * (.55 + k * .5); blob(p, r, r * .85, i % 2 ? T.body : T.dark, 0, true); if (o.parts.fins && i % 3 === 1) { const A = P(p); add(A[2] + .01, () => px.poly(g, [[A[0] - 2, A[1] - r * sc * .7], [A[0] + 1, A[1] - r * sc * 1.6], [A[0] + 3, A[1] - r * sc * .6]], C.accent)); } if (o.parts.gears && i % 4 === 2) { const A = P(p); add(A[2] + .01, () => { px.disc(g, A[0], A[1], Math.max(1, r * sc * .45), '#d8c070'); px.dot(g, A[0], A[1], '#3a3020'); }); } });
    } else {
      const g0 = o.girth * S, mid = [(J.chest[0] + J.hip[0]) / 2, 0, (J.chest[2] + J.hip[2]) / 2 + .3 * S];
      blob(J.hip, g0 * .95, g0 * .9, T.body);
      blob(mid, g0 * 1.05, g0 * .85, T.body, .01);
      blob(J.chest, g0 * 1.05, g0, o.kind === 'griffin' || o.kind === 'avian' ? T.belly : T.body, .02);
      const belly = P([mid[0], 0, mid[2] - g0 * .55]); add(belly[2] + .03, () => px.ell(g, belly[0], belly[1], Math.max(1, g0 * .8 * sc), Math.max(1, g0 * .3 * sc), T.belly.base));
      if (o.parts.mane) { const M2 = P([J.chest[0] + g0 * .3, 0, J.chest[2] + g0 * .5]); const flame = o.parts.mane === 'flame'; add(M2[2] + .04, () => { if (flame) this._flame(g, M2[0], M2[1], g0 * 1.2 * sc); else { const tn = o.preset === 'horse' || o.preset === 'unicorn' ? T.accent : T.dark; px.ell(g, M2[0], M2[1], Math.max(2, g0 * 1.1 * sc), Math.max(2, g0 * .9 * sc), tn.sh); px.ell(g, M2[0] - 1, M2[1] - 1, Math.max(1, g0 * .8 * sc), Math.max(1, g0 * .6 * sc), tn.base); } }); }
      if (o.parts.gears) { const G2 = P(mid); add(G2[2] + .05, () => { const r = Math.max(2, g0 * .45 * sc); px.disc(g, G2[0], G2[1], r, '#d8c070'); px.disc(g, G2[0], G2[1], Math.max(1, r * .45), '#6a5a30'); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + this.t * 2; px.dot(g, G2[0] + Math.cos(a) * (r + 1), G2[1] + Math.sin(a) * (r + 1), '#f0e8d0'); } }); }
      if (o.parts.crest) { const A = P([J.chest[0], 0, J.chest[2] + g0]), B = P([J.hip[0], 0, J.hip[2] + g0 * .9]); add((A[2] + B[2]) / 2 + .06, () => { for (let i = 0; i <= 4; i++) { const k = i / 4, x = lerp(A[0], B[0], k), y = lerp(A[1], B[1], k); px.poly(g, [[x - 1.5, y], [x, y - 3 * S * sc / 1.5], [x + 1.5, y]], C.accent); } }); }
    }
    // wings
    if (J.wings) for (const W of J.wings) {
      const sh = P(W.sh), el = P(W.elbow), wr = P(W.wrist), tips = W.tips.map(P), d = (sh[2] + wr[2]) / 2 - (W.side > 0 ? 0 : .2);
      const bat = o.parts.wings === 'bat', tn = T.wing;
      add(d, () => {
        if (bat) {
          const pts = [[sh[0], sh[1]], [el[0], el[1]], [wr[0], wr[1]], ...tips.map(t => [t[0], t[1]]), [sh[0] - 2, sh[1] + 3]];
          px.poly(g, pts, tn.sh); px.poly(g, [[sh[0], sh[1]], [el[0], el[1]], [wr[0], wr[1]], [tips[0][0], tips[0][1]], [tips[1][0], tips[1][1]]], tn.base);
          px.line(g, sh[0], sh[1], el[0], el[1], tn.deep, 2); px.line(g, el[0], el[1], wr[0], wr[1], tn.deep, 1); for (const t of tips) px.line(g, wr[0], wr[1], t[0], t[1], tn.deep, 1);
        } else {
          px.poly(g, [[sh[0], sh[1]], [el[0], el[1]], [wr[0], wr[1]], [tips[3][0], tips[3][1]], [sh[0] - 3, sh[1] + 2]], tn.sh);
          for (let i = 0; i < 4; i++) { const t = tips[i]; px.line(g, lerp(el[0], wr[0], i / 3), lerp(el[1], wr[1], i / 3), t[0], t[1], i % 2 ? tn.base : tn.lt, Math.max(2, 2.2 * S * sc)); }
          px.line(g, sh[0], sh[1], el[0], el[1], tn.base, Math.max(2, 2.6 * S * sc)); px.line(g, el[0], el[1], wr[0], wr[1], tn.lt, Math.max(1, 2 * S * sc));
        }
      });
    }
    // neck and head
    if (o.kind !== 'serpent') limb(J.neckBase, J.head, o.girth * .8 * S, o.head * .55 * S, o.kind === 'griffin' ? T.belly : T.body);
    const hs = o.head * S, Hd = P(J.head), Sn = P(J.snout);
    add(Hd[2] + .1, () => {
      const r1 = Math.max(2, hs * .62 * sc), r2 = Math.max(2, hs * .55 * sc), tn = o.kind === 'griffin' || o.preset === 'avian' ? T.belly : T.body;
      // snout or beak
      const jaw = J.jaw || 0;
      if (o.beak) { px.poly(g, [[Hd[0], Hd[1] - r2 * .4], [Sn[0], Sn[1]], [Hd[0], Hd[1] + r2 * .3]], C.horn); if (jaw > .2) px.poly(g, [[Hd[0], Hd[1] + r2 * .2], [lerp(Hd[0], Sn[0], .8), Sn[1] + jaw * 3], [Hd[0], Hd[1] + r2 * .5]], T.horn.sh); }
      else { px.line(g, Hd[0], Hd[1], Sn[0], Sn[1], tn.sh, Math.max(2, hs * .55 * sc)); px.line(g, Hd[0], Hd[1] - 1, Sn[0], Sn[1] - 1, tn.base, Math.max(1, hs * .4 * sc)); if (jaw > .15) { px.line(g, Hd[0], Hd[1] + 1, Sn[0], Sn[1] + jaw * 4 * S, T.dark.base, Math.max(1, hs * .25 * sc)); px.line(g, lerp(Hd[0], Sn[0], .5), Sn[1] + 1, Sn[0], Sn[1] + 1 + jaw * 2, '#3a0a10', 1); } px.dot(g, Sn[0], Sn[1] - 1, T.dark.deep); }
      px.ell(g, Hd[0], Hd[1], r1, r2, tn.sh); px.ell(g, Hd[0] - r1 * .15, Hd[1] - r2 * .2, r1 * .82, r2 * .72, tn.base); px.dot(g, Hd[0] - r1 * .4, Hd[1] - r2 * .5, tn.hi);
      // ears, horns, tusks, crest
      const back = Hd[0] + (Hd[0] - Sn[0]) * .25, top = Hd[1] - r2;
      if (o.ears === 'point') { px.poly(g, [[back - 2, top + 2], [back - 1, top - 3 * S * sc * .6], [back + 1.5, top + 1]], tn.sh); }
      if (o.ears === 'round') px.disc(g, back, top + 1, Math.max(1, 1.4 * S * sc * .7), tn.sh);
      if (o.ears === 'tuft') px.poly(g, [[back - 2, top + 1], [back + 1, top - 3], [back + 1, top + 2]], T.dark.base);
      if (o.parts.horn) { const hx = lerp(Hd[0], Sn[0], .2), hy = top + 1; px.line(g, hx, hy, hx + (Sn[0] - Hd[0]) * .35, hy - 6 * S * sc * .6, C.horn, Math.max(1, S * sc * .9)); px.dot(g, hx + (Sn[0] - Hd[0]) * .35, hy - 6 * S * sc * .6, '#ffffff'); }
      if (o.parts.tusks) { px.line(g, Sn[0] - 1, Sn[1] + 1, Sn[0] + Math.sign(Sn[0] - Hd[0] || 1) * 1, Sn[1] - 3, C.horn, 1); }
      if (o.parts.crest && o.kind === 'serpent') px.poly(g, [[back - 2, top + 2], [back + 2, top - 4 * S], [back + 3, top + 2]], C.accent);
      // the eye, with a catch-light
      const ex = lerp(Hd[0], Sn[0], .3), ey = Hd[1] - r2 * .25;
      px.dot(g, ex, ey, this.lie > .6 ? T.dark.deep : C.eye); if (this.lie < .6 && r1 > 3) px.dot(g, ex, ey - 1, '#ffffff');
    });
    parts.sort((a, b) => a[0] - b[0]);
    for (const [, fn] of parts) fn();
  }
  _flame(g, x, y, s) {
    const t = this.t, f = this.C.flame || '#ffb020', tn = tones(f);
    for (let i = 0; i < 3; i++) { const h = s * (1.2 - i * .3) * (1 + Math.sin(t * 13 + i * 2) * .15), w = s * (.7 - i * .18); px.poly(g, [[x - w, y], [x + Math.sin(t * 9 + i) * w * .4, y - h], [x + w, y]], [tn.sh, tn.base, tn.hi][i]); }
  }
  /** a head-and-shoulders close-up for dialog boxes and cards, rendered once per look into a cached canvas */
  drawPortrait(g, x, y, size = 40, o = {}) {
    if (!g || !E.mkCanvas) return;
    const key = size + ':' + (o.bg || '') + ':' + (o.frame === false ? 0 : 1);
    this._ports = this._ports || {};
    let cv = this._ports[key];
    if (!cv) {
      cv = E.mkCanvas(size, size); const cg = cv.getContext && cv.getContext('2d'); if (!cg) return;
      if (o.bg !== null) px.rect(cg, 0, 0, size, size, o.bg || '#1a2050');
      const keep = { facing: this.facing, attack: this.attack, lie: this.lie, down: this.down, speed: this.speed, t: this.t };
      this.facing = Math.PI * .85; this.attack = null; this.lie = 0; this.down = 0; this.speed = 0;
      const J = this._pose(), scale = size / Math.max(4, this.o.head * this.size * 2.4);
      const view = new E.View('portrait', 'Portrait', 0, 18, scale, 1);
      const hw = this._w(J.head), q = view.p(hw[0], hw[1], hw[2]);
      this.draw(cg, size * .55 - q[0], size * .5 - q[1], view);
      Object.assign(this, keep);
      if (o.frame !== false) { px.rect(cg, 0, 0, size, 1, '#e8e4ff'); px.rect(cg, 0, size - 1, size, 1, '#e8e4ff'); px.rect(cg, 0, 0, 1, size, '#e8e4ff'); px.rect(cg, size - 1, 0, 1, size, '#e8e4ff'); }
      this._ports[key] = cv;
    }
    g.drawImage(cv, Math.round(x), Math.round(y));
  }
}
E.Beast = Beast;
E.Beast.PRESETS = PRESETS;

/** wings for a Humanoid: insect (pixie), feather (harpy) or bat */
class Wings {
  constructor(o = {}) { this.kind = o.kind || 'insect'; this.span = o.span || 10; this.C = Object.assign({ a: '#e8f8ff', b: '#a8d8f0' }, o.colors || {}); this.T = tones(this.C.b); this.t = Math.random() * 5; this.flap = 0; }
  update(dt, s = {}) { this.t += dt; this.flap += dt * (this.kind === 'insect' ? 30 : s.moving ? 14 : 6); }
  /** draw both wings, behind the rig (front: false, before rig.draw) or before it (front: true, after) */
  draw(g, ox, oy, view, rig, front) {
    if (E.charView) view = E.charView(view);
    const f = rig && rig.facing !== undefined ? rig.facing : 0, sz = (rig && rig.o && rig.o.size) || 1, sp = this.span * sz;
    const back = [-Math.cos(f), -Math.sin(f)], side = [-Math.sin(f), Math.cos(f)];
    const base = [back[0] * 2 * sz, back[1] * 2 * sz, 17 * sz];
    for (const sd of [-1, 1]) {
      const flap = Math.sin(this.flap) * .6;
      const tip = [base[0] + back[0] * sp * .4 + side[0] * sd * sp * (.8 + flap * .3), base[1] + back[1] * sp * .4 + side[1] * sd * sp * (.8 + flap * .3), base[2] + sp * (.45 + flap * .5)];
      const low = [base[0] + back[0] * sp * .5 + side[0] * sd * sp * .6, base[1] + back[1] * sp * .5 + side[1] * sd * sp * .6, base[2] - sp * .35];
      const dTip = view.depth(tip[0], tip[1], tip[2]), dBase = view.depth(base[0], base[1], base[2]);
      if ((dTip > dBase) !== !!front) continue;
      const P = p => { const q = view.p(p[0], p[1], p[2]); return [ox + q[0], oy + q[1]]; };
      const B = P(base), Ti = P(tip), Lo = P(low);
      if (this.kind === 'insect') {
        px.blend(g, .6, 'normal', () => { px.ell(g, (B[0] + Ti[0]) / 2, (B[1] + Ti[1]) / 2, Math.max(2, Math.hypot(Ti[0] - B[0], Ti[1] - B[1]) / 2), Math.max(1, 2 * sz * view.scale), this.C.a); px.ell(g, (B[0] + Lo[0]) / 2, (B[1] + Lo[1]) / 2, Math.max(2, Math.hypot(Lo[0] - B[0], Lo[1] - B[1]) / 2), Math.max(1, 1.5 * sz * view.scale), this.C.b); });
        px.dot(g, Ti[0], Ti[1], '#ffffff');
      } else {
        px.poly(g, [B, Ti, Lo], this.T.sh);
        for (let i = 0; i < 4; i++) { const k = i / 3; px.line(g, B[0], B[1], lerp(Ti[0], Lo[0], k), lerp(Ti[1], Lo[1], k), i % 2 ? this.T.base : this.T.lt, 2); }
      }
    }
  }
}
E.Wings = Wings;
})(typeof My3D2dge !== 'undefined' ? My3D2dge : null);
