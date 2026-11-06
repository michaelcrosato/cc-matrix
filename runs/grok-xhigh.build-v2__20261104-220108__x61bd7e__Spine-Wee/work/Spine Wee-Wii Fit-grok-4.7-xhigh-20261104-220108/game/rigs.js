/* Rigs, the wobble layer, Tare, and Gerald. Headless runs skip the puppets. */
var G = G || {};
(function () {
  'use strict';
  const E = My3D2dge;
  G.lib = function () {
    if (G._lib) return G._lib;
    try { G._lib = (typeof Mocap !== 'undefined') ? Mocap.load(window.MOCAP.FITCLIPS) : null; }
    catch (e) { G._lib = null; }
    return G._lib;
  };
  function setBody(rig, b) {
    const V3 = E.V3, o = rig.o, J = rig.J, hipC = b.hip;
    J.hipC = hipC; J.hipL = V3.add(hipC, [0, -o.hipHalf, 0]); J.hipR = V3.add(hipC, [0, o.hipHalf, 0]);
    for (const s of [-1, 1]) {
      const hip = s > 0 ? J.hipR : J.hipL, foot = s > 0 ? b.footR : b.footL;
      const ik = E.ik3(hip, foot, o.legUpper, o.legLower, b.knee ? b.knee(s) : [1, s * .3, .1]);
      J[s > 0 ? 'kneeR' : 'kneeL'] = ik[0]; J[s > 0 ? 'footR' : 'footL'] = ik[1];
    }
    const dir = V3.norm(b.chest || [0, 0, 1]), shC = V3.add(hipC, V3.mul(dir, o.torso));
    J.shC = shC; J.shL = V3.add(shC, [0, -o.shoulderHalf, 0]); J.shR = V3.add(shC, [0, o.shoulderHalf, 0]);
    J.head = V3.add(shC, V3.mul(V3.norm([dir[0], dir[1], dir[2] + .4]), o.neck + o.headR));
    for (const s of [-1, 1]) {
      const sh = s > 0 ? J.shR : J.shL, hand = s > 0 ? b.handR(shC, sh) : b.handL(shC, sh);
      const ik = E.ik3(sh, hand, o.armUpper, o.armLower, [-1, s * .7, -.2]);
      J[s > 0 ? 'elbowR' : 'elbowL'] = ik[0]; J[s > 0 ? 'handR' : 'handL'] = ik[1];
    }
  }
  G.setBody = setBody;
  G.sideLunge = function (u) {
    return function (rig) {
      const o = rig.o, a = Math.abs(u), w = o.footSpread + 5.4, add = E.V3.add;
      return { hip: [0, u * 3.8, o.hipZ - a * o.hipZ * .4], footL: [.5, -w, 0], footR: [.5, w, 0], knee: s => [1, s * .7, .1],
        chest: [.28 * a, -u * .1, 1], handL: c => add(c, [4, -.6, -2.6]), handR: c => add(c, [4, .6, -2.6]) };
    };
  };
  G.hula = function (ph) {
    return function (rig) {
      const o = rig.o, hx = Math.cos(ph) * 2.1, hy = Math.sin(ph) * 2.1, add = E.V3.add;
      return { hip: [hx, hy, o.hipZ - .5], footL: [.3, -o.footSpread - 1, 0], footR: [.3, o.footSpread + 1, 0], chest: [-hx * .22, -hy * .22, 1],
        handL: (c, sh) => add(sh, [.4, -6, 1.6 + Math.sin(ph) * .6]), handR: (c, sh) => add(sh, [.4, 6, 1.6 - Math.sin(ph) * .6]) };
    };
  };
  G.stepUp = function (k, zb) {
    zb = zb || 5;
    return function (rig) {
      const o = rig.o, add = E.V3.add;
      return { hip: [.2 + k * 1.2, k * 1.6, o.hipZ + k * zb * .7], footL: [k > .5 ? 3 : -1, -o.footSpread, k > .85 ? zb : 0], footR: [3, o.footSpread, zb * Math.min(1, k * 2)],
        chest: [.1, 0, 1], handL: (c, sh) => add(sh, [1 + k * 3, -1.2, -3 + k * 2]), handR: (c, sh) => add(sh, [3 - k * 3, 1.2, -1 - k * 2]) };
    };
  };
  G.makeRig = function (opts) {
    const lib = G.lib();
    const rig = new E.Humanoid(Object.assign({ weapon: null, seed: 1 }, opts || {}));
    if (lib) {
      try { Mocap.drive(rig, lib); } catch (e) { /* the hand pose still stands */ }
    }
    const base = rig.solvePose;
    rig.wob = [0, 0]; rig.body = null;
    if (typeof base === 'function') {
      rig.solvePose = function () {
        base.call(this);
        if (this.body) { try { setBody(this, this.body(this)); } catch (e) { /* keep the clip */ } }
        const ax = this.wob[0] || 0, ay = this.wob[1] || 0;
        if (!ax && !ay) return;
        const J = this.J, a = ax * .45, b = ay * .3, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
        for (const k in J) {
          if (k === 'bladeDir' || !J[k]) continue;
          const p = J[k];
          const r2 = p[1] * ca + p[2] * sa, z2 = -p[1] * sa + p[2] * ca, f2 = p[0] * cb + z2 * sb, z3 = -p[0] * sb + z2 * cb;
          p[0] = f2; p[1] = r2; p[2] = Math.max(z3, 0);
        }
      };
    }
    return rig;
  };
  const WOOD = { cloth: '#d9b68a', skin: '#e7d2b0', hair: '#c6a36e', pants: '#b89068', trim: '#8a6a42' };
  G.playerOpts = function (look, size) {
    look = look || { hair: 'short', skin: '#f6d3bd', top: '#ff7a59', bottom: '#355f86' };
    return { size: size || 2.1, build: 'chibi', seed: 3, hair: look.hair || 'short', colors: { cloth: look.top || '#ff7a59', pants: look.bottom || '#355f86', skin: look.skin || '#f6d3bd', hair: '#6a4030' } };
  };
  G.instructorOpts = function (who, size) {
    const alder = who === 'Alder';
    return { size: size || 2.1, build: 'heroic', limbW: 1.5, torsoW: 2.5, hair: alder ? 'ponytail' : 'bald', seed: alder ? 5 : 4,
      colors: alder ? { cloth: '#ecd3ac', skin: '#f3e2c8', hair: '#e7d3ac', pants: '#d7c09a', trim: '#b89468' } : WOOD };
  };
  G.poseRig = function (rig, name, time, wob) {
    const lib = G.lib(); const pose = G.POSES[name] || G.POSES.idle;
    if (!rig || !lib) return;
    const clip = lib.clip(pose.clip);
    if (!clip) return;
    const span = Math.max(.05, pose.b - pose.a);
    const t = pose.a + span * .3 * (.5 + .5 * Math.sin((time || 0) * .7));
    try {
      rig.mocap = lib.sample(clip, t);
      rig.wob = wob || [0, 0];
      rig.body = null;
    } catch (e) { rig.mocap = null; }
    rig._tgt = pose.tgt;
  };
  G.stepRig = function (rig, dt, x, y) {
    if (!rig) return;
    try { rig.update(dt, { x: x || 0, y: y || 0, z: 0, vx: 0, vy: 0, facing: (rig._tgt || 1.57) - (rig.spin || 0) }); }
    catch (e) { /* a still puppet is enough */ }
  };
  G.drawJoints = function (g, rig, ox, oy) {
    if (!rig || !rig.J || !rig.worldOffset) return;
    const view = rig.lastView;
    if (!view || !view.p) return;
    for (const k of ['kneeL', 'kneeR', 'elbowL', 'elbowR', 'shL', 'shR']) {
      if (!rig.J[k]) continue;
      try {
        const w = rig.worldOffset(rig.J[k]), p = view.p(w[0], w[1], w[2]);
        E.px.disc(g, ox + p[0], oy + p[1], 3, '#c6a36e');
        E.px.disc(g, ox + p[0], oy + p[1], 2, '#e7d2b0');
      } catch (e) { /* joint off the pose */ }
    }
  };
  G.drawTare = function (g, x, y, s, face, hop) {
    s = s || 1; hop = hop || 0;
    const py = y + Math.sin(hop) * 3 * s - Math.abs(Math.sin(hop)) * 2;
    const sc = s;
    E.px.disc(g, x, py + 10 * sc, 16 * sc, 'rgba(32,64,76,.12)');
    E.px.round(g, x - 18 * sc, py - 8 * sc, 36 * sc, 16 * sc, 4 * sc, '#f7fbfb');
    E.px.round(g, x - 16 * sc, py - 6 * sc, 32 * sc, 12 * sc, 3 * sc, '#e7f4f6');
    E.px.disc(g, x - 7 * sc, py - 2 * sc, 3 * sc, '#d7ecee');
    E.px.disc(g, x + 7 * sc, py - 2 * sc, 3 * sc, '#d7ecee');
    const eyes = { neutral: 0, happy: 1, worried: 2, smug: 3, shocked: 4, sad: 5, asleep: 6, judging: 7 }[face] || 0;
    const col = eyes === 5 ? '#7fbfd0' : '#14c8e0';
    E.px.disc(g, x - 6 * sc, py + 4 * sc, eyes === 4 ? 2.4 * sc : 1.6 * sc, col);
    E.px.disc(g, x + 6 * sc, py + 4 * sc, eyes === 4 ? 2.4 * sc : 1.6 * sc, col);
    if (eyes === 6) { E.px.line(g, x - 8 * sc, py + 4 * sc, x - 4 * sc, py + 4 * sc, '#7fbfd0'); E.px.line(g, x + 4 * sc, py + 4 * sc, x + 8 * sc, py + 4 * sc, '#7fbfd0'); }
    E.px.round(g, x - 4 * sc, py + 8 * sc, 8 * sc, 5 * sc, 2, '#c8dde2');
    if (G.profile && G.hasUnlock && G.hasUnlock('bowtie')) {
      E.px.disc(g, x, py + 6 * sc, 2 * sc, '#e0553a');
      E.px.poly(g, [[x - 6 * sc, py + 4 * sc], [x - 1 * sc, py + 6 * sc], [x - 6 * sc, py + 8 * sc]], '#e0553a');
      E.px.poly(g, [[x + 6 * sc, py + 4 * sc], [x + 1 * sc, py + 6 * sc], [x + 6 * sc, py + 8 * sc]], '#e0553a');
    }
  };
  G.drawGerald = function (g, x, y, s, friend) {
    s = s || 1;
    E.px.disc(g, x, y + 4 * s, 14 * s, '#e7b7c8');
    E.px.disc(g, x, y - 6 * s, 10 * s, '#f3c6d4');
    E.px.disc(g, x - 4 * s, y - 8 * s, 1.4 * s, '#20404c');
    E.px.disc(g, x + 4 * s, y - 8 * s, 1.4 * s, '#20404c');
    E.px.round(g, x - 3 * s, y - 2 * s, 6 * s, 3 * s, 1, '#c9865a');
    if (friend || (G.profile && G.hasUnlock && G.hasUnlock('friend'))) {
      E.px.disc(g, x + 16 * s, y + 6 * s, 8 * s, '#f0c2d0');
      E.px.disc(g, x + 16 * s, y, 5 * s, '#f7d5e0');
    }
  };
  G.paintRoom = function (r, kind) {
    if (!r || !r.ctx) return;
    const g = r.ctx, W = r.W, H = r.H;
    const skyTop = kind === 'dusk' ? '#f2c9a0' : '#d8f3fb';
    const skyBot = kind === 'dusk' ? '#e09070' : '#8fd3f4';
    for (let y = 0; y < H; y++) {
      const t = y / H;
      E.px.col(g, E.mix(skyTop, skyBot, Math.min(1, t * 1.2)));
      g.fillRect(0, y, W, 1);
    }
    E.px.rect(g, 0, H * .42, W, H * .58, kind === 'dusk' ? '#1f6f86' : '#49b6c9');
    E.px.rect(g, 0, H * .55, W, H * .45, kind === 'dusk' ? '#1a5c70' : '#2f97ad');
    const floor = kind === 'iron' ? '#f4f7f7' : '#ecd9bd';
    E.px.rect(g, 0, H * .62, W, H * .38, floor);
    for (let i = 0; i < 8; i++) E.px.line(g, 0, H * .66 + i * 6, W, H * .7 + i * 8, 'rgba(180,140,90,.35)');
    E.px.rect(g, W * .08, H * .18, W * .84, H * .28, 'rgba(255,255,255,.18)');
    if (kind !== 'iron') {
      E.px.round(g, 18, H * .48, 28, 10, 3, '#3f8f6a');
      E.px.round(g, W - 48, H * .5, 24, 12, 3, '#3f8f6a');
    }
  };
})();
