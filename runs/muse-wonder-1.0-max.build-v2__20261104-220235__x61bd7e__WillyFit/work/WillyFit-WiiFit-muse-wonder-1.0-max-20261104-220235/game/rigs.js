// Willy Fit — rigs: mocap-driven Humanoids with a wobble layer, hand poses, Tare & Gerald.
window.G = window.G || {};
(function () {
  'use strict';
  const E = window.My3D2dge;
  let lib = null;
  G.getLib = function () {
    if (lib) return lib;
    try {
      if (window.Mocap && window.MOCAP && window.MOCAP.FITCLIPS) lib = window.Mocap.load(window.MOCAP.FITCLIPS);
    } catch (e) { lib = null; }
    return lib;
  };
  G.clip = function (name) { const l = G.getLib(); return l ? l.clip(name) : null; };
  function setBody(rig, b) {
    const { V3 } = E; if (!V3) return;
    const o = rig.o, J = rig.J, hipC = b.hip; if (!hipC || !J) return;
    J.hipC = hipC; J.hipL = V3.add(hipC, [0, -o.hipHalf, 0]); J.hipR = V3.add(hipC, [0, o.hipHalf, 0]);
    for (const s of [-1, 1]) {
      const hip = s > 0 ? J.hipR : J.hipL, foot = s > 0 ? b.footR : b.footL;
      const r = E.ik3(hip, foot, o.legUpper, o.legLower, b.knee ? b.knee(s) : [1, s * 0.3, 0.1]);
      J[s > 0 ? 'kneeR' : 'kneeL'] = r[0]; J[s > 0 ? 'footR' : 'footL'] = r[1];
    }
    const dir = V3.norm(b.chest || [0, 0, 1]), shC = V3.add(hipC, V3.mul(dir, o.torso)); J.shC = shC;
    J.shL = V3.add(shC, [0, -o.shoulderHalf, 0]); J.shR = V3.add(shC, [0, o.shoulderHalf, 0]);
    J.head = V3.add(shC, V3.mul(V3.norm([dir[0], dir[1], dir[2] + 0.4]), o.neck + o.headR));
    for (const s of [-1, 1]) {
      const sh = s > 0 ? J.shR : J.shL, hand = s > 0 ? b.handR(shC, sh) : b.handL(shC, sh);
      const r = E.ik3(sh, hand, o.armUpper, o.armLower, [-1, s * 0.7, -0.2]);
      J[s > 0 ? 'elbowR' : 'elbowL'] = r[0]; J[s > 0 ? 'handR' : 'handL'] = r[1];
    }
  }
  G.setBody = setBody;
  G.makeRig = function (opts) {
    const rig = new E.Humanoid(Object.assign({ weapon: null }, opts || {}));
    const L = G.getLib();
    try { if (L && window.Mocap) window.Mocap.drive(rig, L); } catch (e) {}
    const base = rig.solvePose;
    rig.wob = [0, 0]; rig.body = null;
    rig.solvePose = function () {
      base.call(this);
      if (this.body) { try { setBody(this, this.body(this)); } catch (e) {} }
      const ax = this.wob[0], ay = this.wob[1]; if (!ax && !ay) return;
      const J = this.J; if (!J) return;
      const a = ax * 0.45, b = ay * 0.3, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
      for (const k in J) {
        if (k === 'bladeDir' || !J[k] || !Array.isArray(J[k])) continue; const p = J[k];
        const r2 = p[1] * ca + p[2] * sa, z2 = -p[1] * sa + p[2] * ca, f2 = p[0] * cb + z2 * sb, z3 = -p[0] * sb + z2 * cb;
        p[0] = f2; p[1] = r2; p[2] = Math.max(z3, 0);
      }
    };
    return rig;
  };
  G.setClipPose = function (rig, clipName, t, tgt) {
    const L = G.getLib(), c = L && L.clip(clipName);
    if (c) { try { rig.mocap = L.sample(c, t); } catch (e) { rig.mocap = null; } rig.spin = 0; return true; }
    rig.mocap = null; return false;
  };
  G.holdPose = function (rig, pose, time) {
    const L = G.getLib(), c = L && L.clip(pose.clip);
    if (!c) { rig.mocap = null; return pose.tgt; }
    const t = pose.a + (pose.b - pose.a) * 0.3 * (0.5 + 0.5 * Math.sin(time * 0.7));
    try { rig.mocap = L.sample(c, t); } catch (e) { rig.mocap = null; }
    return pose.tgt;
  };
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  G.sideLungeBody = u => rig => {
    const o = rig.o, a = Math.abs(u), w = o.footSpread + 5.4;
    return { hip: [0, u * 3.8, o.hipZ - a * o.hipZ * 0.4], footL: [0.5, -w, 0], footR: [0.5, w, 0], knee: s => [1, s * 0.7, 0.1], chest: [0.28 * a, -u * 0.1, 1], handL: c => add(c, [4, -0.6, -2.6]), handR: c => add(c, [4, 0.6, -2.6]) };
  };
  G.hulaBody = ph => rig => {
    const o = rig.o, hx = Math.cos(ph) * 2.1, hy = Math.sin(ph) * 2.1;
    return { hip: [hx, hy, o.hipZ - 0.5], footL: [0.3, -o.footSpread - 1, 0], footR: [0.3, o.footSpread + 1, 0], chest: [-hx * 0.22, -hy * 0.22, 1], handL: (c, sh) => add(sh, [0.4, -6, 1.6 + Math.sin(ph) * 0.6]), handR: (c, sh) => add(sh, [0.4, 6, 1.6 - Math.sin(ph) * 0.6]) };
  };
  G.stepUpBody = (k, zb) => rig => {
    zb = zb == null ? 5 : zb; const o = rig.o;
    return { hip: [0.2 + k * 1.2, k * 1.6, o.hipZ + k * zb * 0.7], footL: [k > 0.5 ? 3 : -1, -o.footSpread, k > 0.85 ? zb : 0], footR: [3, o.footSpread, zb * Math.min(1, k * 2)], chest: [0.1, 0, 1], handL: (c, sh) => add(sh, [1 + k * 3, -1.2, -3 + k * 2]), handR: (c, sh) => add(sh, [3 - k * 3, 1.2, -1 - k * 2]) };
  };
  G.drawJoints = function (r, rig, ox, oy) {
    const px = E.px, view = rig.lastView || r.view; if (!view || !rig.J) return;
    for (const k of ['kneeL', 'kneeR', 'elbowL', 'elbowR', 'shL', 'shR']) {
      if (!rig.J[k]) continue;
      try { const w = rig.worldOffset(rig.J[k]), p = view.p(w[0], w[1], w[2]); px.disc(r.ctx || r.g, 0, 0, 0, '#000'); } catch (e) {}
    }
    // drawn in actor space: use overlay-free direct px on r's g via queue fn coordinates
  };
  // Tare & Gerald drawn with px inside an r.actor/r.queue callback (g, ox, oy).
  G.drawTare = function (g, ox, oy, t, face, scale) {
    const px = E.px, s = scale || 1;
    const hop = Math.abs(Math.sin(t * 3)) * 2 * s, sq = 1 - Math.abs(Math.sin(t * 3)) * 0.08;
    const w = 22 * s * (2 - sq) / 1, h = 8 * s * sq;
    px.rect(g, ox - w / 2, oy - h - hop, w, h, '#ffffff'); px.rect(g, ox - w / 2, oy - 2 - hop, w, 2, '#dfe9ea');
    px.rect(g, ox - w / 2 + 2, oy - h - hop, w - 4, 2, '#eaf6f8');
    // footprints
    px.ell(g, ox - 5 * s, oy - h - hop + 3, 3 * s, 1.5 * s, '#cfe3e6'); px.ell(g, ox + 5 * s, oy - h - hop + 3, 3 * s, 1.5 * s, '#cfe3e6');
    // dial
    px.disc(g, ox, oy - h - hop - 2, 3 * s, '#2cc6e6'); px.dot(g, ox, oy - h - hop - 2, '#ffffff');
    // LED eyes by face
    const ey = oy - h - hop + 5, ex = 6 * s;
    const eyes = { neutral: [1, 1], happy: [2, 2], worried: [1, 1], smug: [1, 1], shocked: [2, 2], sad: [1, 1], asleep: [0, 0], judging: [1, 1] }[face || 'neutral'] || [1, 1];
    if (eyes[0]) { px.rect(g, ox - ex - 1, ey, 2, 2, '#19d3f0'); px.rect(g, ox + ex - 1, ey, 2, 2, '#19d3f0'); }
    else { px.rect(g, ox - ex - 1, ey + 1, 2, 1, '#19d3f0'); px.rect(g, ox + ex - 1, ey + 1, 2, 1, '#19d3f0'); }
    if (face === 'happy') px.rect(g, ox - 2, ey + 3, 4, 1, '#19d3f0');
    if (face === 'sad') px.rect(g, ox - 2, ey + 4, 4, 1, '#19d3f0');
    if (G.member && G.member.minutes >= 20) { px.rect(g, ox - 1, oy - h - hop - 5, 2, 2, '#e0553a'); px.rect(g, ox - 4, oy - h - hop - 5, 3, 1, '#e0553a'); px.rect(g, ox + 1, oy - h - hop - 5, 3, 1, '#e0553a'); }
    // legs
    px.rect(g, ox - 7 * s, oy - 1, 3, 2, '#b9cdd1'); px.rect(g, ox + 4 * s, oy - 1, 3, 2, '#b9cdd1');
  };
  G.drawGerald = function (g, ox, oy, t, scale) {
    const px = E.px, s = scale || 1;
    px.ell(g, ox, oy - 8 * s, 12 * s, 8 * s, '#7fb3c8'); px.ell(g, ox, oy - 10 * s, 9 * s, 5 * s, '#9cc6d8');
    px.disc(g, ox - 4 * s, oy - 13 * s, 2 * s, '#20404c'); px.disc(g, ox + 4 * s, oy - 13 * s, 2 * s, '#20404c');
    px.rect(g, ox - 3 * s, oy - 10 * s, 6 * s, 1, '#20404c');
    px.rect(g, ox - 2, oy - 18 * s, 4, 2, '#ffd76a'); // coin slot
    px.rect(g, ox - 8 * s, oy - 2, 4 * s, 2, '#5f93a8'); px.rect(g, ox + 4 * s, oy - 2, 4 * s, 2, '#5f93a8');
    if (G.member && G.member.minutes >= 30) { px.ell(g, ox + 14 * s, oy - 5 * s, 6 * s, 4 * s, '#a8c8b8'); px.disc(g, ox + 12 * s, oy - 7 * s, 1, '#20404c'); px.disc(g, ox + 16 * s, oy - 7 * s, 1, '#20404c'); }
  };
  G.SKINS = ['#f2c9a4', '#e8b48a', '#c98d64', '#a06a42', '#7a4a2e', '#5a3420'];
  G.TOPS = ['#ff7a59', '#2cc6e6', '#7bc47f', '#f2c94c', '#b388e8', '#f08bb0', '#5f8dd3', '#e07a3a'];
  G.playerRigOpts = function (m) {
    m = m || G.member;
    const hats = { towel: null, headband: { style: 'band', color: '#2cc6e6' }, sunhat: { style: 'cap', color: '#f2e3a1' } };
    let hat = null;
    if (m.minutes >= 25) hat = { style: 'cap', color: '#c9a8e8' }; else if (m.minutes >= 15) hat = hats.sunhat; else if (m.minutes >= 10) hat = hats.headband;
    return { size: 1.35, build: 'chibi', hair: m.hair === 'bald' ? 'bald' : m.hair, hat: hat, outfit: 'shirt', sleeves: 'short',
      colors: { skin: G.SKINS[m.skin % G.SKINS.length], hair: '#4a3423', cloth: G.TOPS[m.top % G.TOPS.length], pants: ['#3a4a6a', '#6a4a3a', '#3a6a4a', '#555555'][m.bottom % 4], boot: '#3a2e2a', trim: '#ffffff' } };
  };
  G.instructorOpts = function (who) {
    if (who === 'alder') return { size: 1.9, build: 'heroic', limbW: 1.5, torsoW: 2.5, hair: 'ponytail', outfit: 'shirt', sleeves: 'long', colors: { skin: '#ecd3ac', hair: '#d9b68a', cloth: '#ecd3ac', coat: '#e2c69a', pants: '#d9b68a', boot: '#b9986a', trim: '#ffffff' } };
    return { size: 1.95, build: 'heroic', limbW: 1.5, torsoW: 2.5, hair: 'bald', outfit: 'shirt', sleeves: 'long', colors: { skin: '#d9b68a', hair: '#c9a878', cloth: '#d9b68a', coat: '#cbaa7c', pants: '#c9a878', boot: '#a8885c', trim: '#ffffff' } };
  };
})();
