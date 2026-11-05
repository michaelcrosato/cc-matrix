/* ---- RIGS (sections 8 and 9): the engine's Humanoid dressed for hockey. Gear (sticks, skates, helmets, masks, pads,
 * blocker and catcher, numbers, letters, stripes, beards, socks) is drawn through the rig's gear hook into its own
 * depth-sorted ops (ENGINE-CHANGES.md 3). Motion: each rig's solvePose is wrapped; after the engine's pose it re-solves
 * the legs (skating strides, glides, crossovers, hockey stops, backward C-cuts, goalie stances), the hands (stick-handling,
 * passes, wrist shots, slapshot wind-ups, checks, pokes, dekes, faceoffs) and the stick, from rig.hk, a small state the
 * Skater / Goalie code writes each step ---- */
const Rigs = (() => {
  const { V3, ik3 } = E, add = V3.add, lrp = V3.lerp;
  /** a team's kit: home teams wear their dark jersey, the visitors white with their color as trim */
  function kit(team, home) {
    const t = TEAMS[team];
    return home ? { cloth: t.dark, trim: t.trim, stripe: t.light, pants: t.pants, socks: t.dark, helmet: t.dark, glove: E.shade(t.dark, -.15) }
      : { cloth: t.light, trim: t.dark, stripe: t.trim, pants: t.pants, socks: t.light, helmet: t.light === '#f4ece0' ? '#e8e0d0' : t.light, glove: E.shade(t.dark, -.1) };
  }
  /* ---- the gear hook: K = { g, ops, S, Sp, Q, J, u, cap, limb, lq, dC, facingCam, rig, hd } ---- */
  function gear(K) {
    const { g, ops, Sp, Q, J, u, rig } = K, o = rig.o, C = rig.C, H = rig.hkGear || {}, tn = E.tones;
    const facingCam = K.facingCam !== undefined ? K.facingCam : true;
    // skates: a black boot and a steel blade under each foot
    if (H.skates) for (const s of [-1, 1]) {
      const ft = s > 0 ? J.footR : J.footL; if (!ft) continue;
      const a = Sp(ft, -2.2, 0, -.5), b = Sp(ft, 3, 0, -.5), far = (s > 0 ? Q.kneeR : Q.kneeL)[2] < K.dC;
      ops.push({ d: (a[2] + b[2]) / 2 + .004, f: () => { px.line(g, a[0], a[1], b[0], b[1], far ? '#7a828c' : '#dfe6ee', 1); px.dot(g, b[0], b[1] - 1, far ? '#9aa2ac' : '#ffffff'); } });
    }
    // socks over the shins in the team color, goalie pads instead for goalies
    if (K.hd) for (const s of [-1, 1]) {
      const knee = s > 0 ? Q.kneeR : Q.kneeL, foot = s > 0 ? Q.footR : Q.footL, far = knee[2] < K.dC; if (!knee || !foot) continue;
      const ank = K.lq(knee, foot, .7);
      if (H.pads) {
        const pt = tn(H.padColor || '#f4f4f0'), top = K.lq(knee, ank, -.25);
        ops.push({ d: (knee[2] + ank[2]) / 2 + .02, f: () => {
          K.cap(top, ank, 2.6 * u, 2.4 * u, far ? pt.sh : pt.deep); K.cap(top, ank, Math.max(.6, 2.6 * u - 1), Math.max(.6, 2.4 * u - 1), far ? pt.sh : pt.base, -.5, -.5);
          for (let k = 1; k < 4; k++) { const q = K.lq(top, ank, k / 4); px.line(g, q[0] - 2.2 * u, q[1], q[0] + 2.2 * u, q[1], pt.sh); }
          const st = tn(H.padTrim || '#c82a2a'); px.line(g, top[0], top[1], ank[0], ank[1], st.base);
        } });
      } else if (H.socks) { const sc = tn(H.socks); ops.push({ d: (knee[2] + ank[2]) / 2 + .0015, f: () => { K.cap(knee, ank, 1.15 * u, 1.05 * u, far ? sc.deep : sc.sh); K.cap(knee, ank, Math.max(.5, 1.15 * u - .8), Math.max(.5, 1.05 * u - .8), far ? sc.sh : sc.base, -.5, -.5); const st = K.lq(knee, ank, .35); px.line(g, st[0] - u, st[1], st[0] + u, st[1], tn(H.sockStripe || C.trim).base); } }); }
    }
    // the stick: a shaft from the top hand's end through to the heel, the blade along bladeDir2, tape on knob and blade
    if (H.stick && J.stickTop && J.blade) {
      const T0 = Sp(J.stickTop), B0 = Sp(J.blade), bd = J.bladeDir2 || [0, 1, 0], wide = H.stick === 'goalie';
      const tip = Sp(add(J.blade, V3.mul(bd, wide ? 5 : 5.5))), knob = Sp(lrp(J.stickTop, J.blade, -.04)), tape = Sp(lrp(J.stickTop, J.blade, .1));
      const paddle = wide ? Sp(lrp(J.stickTop, J.blade, .62)) : null;
      const sc = tn(H.stickColor || '#c8a070');
      ops.push({ d: (T0[2] + B0[2]) / 2 + (H.stickFront ? .3 : 0), f: () => {
        px.line(g, T0[0], T0[1], B0[0], B0[1], sc.sh, Math.max(1, Math.round(u * .8)));
        px.line(g, T0[0] - .4, T0[1] - .4, B0[0] - .4, B0[1] - .4, sc.base, 1);
        if (wide && paddle) px.line(g, paddle[0], paddle[1], B0[0], B0[1], sc.deep, Math.max(2, Math.round(u * 1.4)));
        px.line(g, knob[0], knob[1], tape[0], tape[1], '#f4f4f0', Math.max(1, Math.round(u * .8)));
        px.line(g, B0[0], B0[1], tip[0], tip[1], '#1a1a1e', Math.max(2, Math.round(u * (wide ? 1.6 : 1.2))));
        px.line(g, K.lq(B0, tip, .3)[0], K.lq(B0, tip, .3)[1], tip[0], tip[1], H.bladeTape || '#f4f4f0', 1);
      } });
    }
    // goalie blocker and catcher
    if (H.blocker && Q.handR) { const hd = Q.handR, bt = tn(H.padColor || '#f4f4f0'); ops.push({ d: hd[2] + .06, f: () => { px.rect(g, hd[0] - 2.2 * u, hd[1] - 3 * u, 4.4 * u, 5.6 * u, bt.sh); px.rect(g, hd[0] - 2.2 * u + 1, hd[1] - 3 * u + 1, 4.4 * u - 2, 5.6 * u - 2, bt.base); px.line(g, hd[0] - 1.6 * u, hd[1] - 2.4 * u, hd[0] + 1.6 * u, hd[1] - 2.4 * u, tn(H.padTrim || '#c82a2a').base); } }); }
    if (H.catcher && Q.handL) { const hd = Q.handL, ct = tn(H.padColor || '#f4f4f0'); ops.push({ d: hd[2] + .06, f: () => { px.disc(g, hd[0], hd[1], 3.2 * u, ct.sh); px.disc(g, hd[0] - .5, hd[1] - .5, 3.2 * u - 1, ct.base); px.line(g, hd[0] - 1.6 * u, hd[1] + .4 * u, hd[0] + 1.6 * u, hd[1] - .8 * u, tn(H.padTrim || '#c82a2a').base); px.dot(g, hd[0], hd[1], ct.deep); } }); }
    // bigger hockey gloves
    if (H.gloves && K.hd) for (const s of [-1, 1]) { const hd = s > 0 ? Q.handR : Q.handL; if (!hd || (s > 0 && H.blocker) || (s < 0 && H.catcher)) continue; const gt = tn(C.glove || '#333'); ops.push({ d: hd[2] + .03, f: () => { px.disc(g, hd[0], hd[1], Math.max(1, 1.25 * u), gt.sh); px.dot(g, hd[0] - 1, hd[1] - 1, gt.lt); } }); }
    // jersey number (on the back, or the chest when it faces the camera), the captain's letter, the referee's stripes
    if (K.hd && (H.number !== undefined || H.stripes)) {
      const mid = Sp(lrp(J.shC, J.hipC, .38), facingCam ? 1.2 : -1.2, 0, 0), up = Sp(lrp(J.shC, J.hipC, .2), 1.3, -1.3, 0);
      ops.push({ d: K.dC + .2, f: () => {
        if (H.stripes) for (let k = -2; k <= 2; k++) { const a = Sp(J.shC, facingCam ? 1 : -1, k * .9, -.8), b = Sp(J.hipC, facingCam ? 1 : -1, k * .9, 1.6); px.line(g, a[0], a[1], b[0], b[1], H.stripes); }
        if (H.number !== undefined && u >= 1) E.font.text(g, String(H.number), Math.round(mid[0]), Math.round(mid[1]) - 2, H.numColor || C.trim, { font: 'tiny', align: 'center', outline: false });
        if (H.letter && facingCam && u >= 1.1) E.font.text(g, H.letter, Math.round(up[0]), Math.round(up[1]) - 2, H.numColor || C.trim, { font: 'tiny', align: 'center', outline: false });
      } });
    }
    // head gear: a helmet dome (with a visor) or a goalie mask with its cage; a beard; Polar Pete's big bear head
    const Hh = Q.head; if (!Hh) return;
    const R = o.headR, r = R * u * .93;
    if (H.beard && facingCam && K.hd) { const jaw = Sp(J.head, R * .55, 0, -R * .55), bt = tn(H.beard); ops.push({ d: Hh[2] + .004, f: () => { px.disc(g, jaw[0], jaw[1], Math.max(1, r * .55), bt.sh); px.disc(g, jaw[0], jaw[1] + 1, Math.max(1, r * .45), bt.base); } }); }
    if (H.helmet) {
      const ht = tn(H.helmet), c0 = Sp(J.head, -R * .12, 0, R * .3);
      ops.push({ d: Hh[2] + .01, f: () => {
        const rr = r * 1.08, low = facingCam ? -.12 : .55, pts = [];
        for (let k = 0; k <= 12; k++) { const a = PI + .25 - k / 12 * (PI + .5); pts.push([c0[0] + Math.cos(a) * rr, c0[1] + Math.sin(a) * rr * .95]); }
        pts.push([c0[0] + rr, c0[1] + rr * low], [c0[0] - rr, c0[1] + rr * low]);
        px.poly(g, pts, ht.sh); px.poly(g, pts.map(p => [p[0] - .4, p[1] - .6]).slice(0, 12).concat([[c0[0], c0[1] + rr * low - 1]]), ht.base);
        px.line(g, c0[0] - rr * .5, c0[1] - rr * .82, c0[0] + rr * .1, c0[1] - rr * .95, ht.hi);
        if (H.helmetStripe) px.line(g, c0[0] - rr * .1, c0[1] - rr * .98, c0[0] - rr * .1, c0[1] + rr * low * .4, H.helmetStripe);
        if (facingCam) { const v0 = Sp(J.head, R * 1.02, -R * .5, R * .48), v1 = Sp(J.head, R * 1.02, R * .5, R * .48); px.line(g, v0[0], v0[1], v1[0], v1[1], ht.sh); px.blend(g, .5, 'screen', () => px.dot(g, (v0[0] + v1[0]) / 2, (v0[1] + v1[1]) / 2 + 1, '#bfe8ff')); }
      } });
    }
    if (H.mask) {
      const mt = tn(H.mask), tt = tn(H.maskTrim || '#ffffff'), c0 = Sp(J.head, 0, 0, R * .05);
      ops.push({ d: Hh[2] + .01, f: () => {
        const rr = r * 1.1; px.disc(g, c0[0], c0[1], rr, mt.sh); px.disc(g, c0[0] - .5, c0[1] - .6, rr - 1, mt.base);
        px.line(g, c0[0] - rr * .7, c0[1] - rr * .5, c0[0] + rr * .7, c0[1] - rr * .5, tt.base, Math.max(1, Math.round(u * .7)));
        px.dot(g, c0[0] - rr * .4, c0[1] - rr * .7, mt.hi);
        if (facingCam) { const f0 = Sp(J.head, R * .9, 0, -R * .1); px.rect(g, f0[0] - rr * .55, f0[1] - rr * .25, rr * 1.1, rr * .85, '#2a2a30'); for (let k = -1; k <= 1; k++) px.line(g, f0[0] + k * rr * .3, f0[1] - rr * .25, f0[0] + k * rr * .3, f0[1] + rr * .6, '#c8ccd4'); px.line(g, f0[0] - rr * .55, f0[1] + rr * .15, f0[0] + rr * .55, f0[1] + rr * .15, '#c8ccd4'); }
      } });
    }
    if (H.bear) {
      const c0 = Sp(J.head, R * .1, 0, R * .55);
      ops.push({ d: Hh[2] + .02, f: () => {
        const rr = r * 1.7; for (const s of [-1, 1]) { const e = Sp(J.head, 0, s * R * 1.25, R * 1.6); px.disc(g, e[0], e[1], rr * .38, '#d8e0ec'); px.disc(g, e[0], e[1], rr * .2, '#ffc8d8'); }
        px.disc(g, c0[0], c0[1], rr, '#c8d4e4'); px.disc(g, c0[0] - .6, c0[1] - .8, rr - 1.2, '#f4f8ff');
        if (facingCam) { const sn = Sp(J.head, R * 1.3, 0, R * .1); px.ell(g, sn[0], sn[1], rr * .45, rr * .3, '#e8eef8'); px.disc(g, sn[0], sn[1] - rr * .12, Math.max(1, rr * .14), '#141418');
          for (const s of [-1, 1]) { const e = Sp(J.head, R * 1.15, s * R * .55, R * .7); px.disc(g, e[0], e[1], Math.max(1, rr * .12), '#141418'); px.dot(g, e[0] - .5, e[1] - .5, '#ffffff'); } }
        if (H.scarf) { const nk = Sp(J.shC, .3, 0, .4); px.line(g, nk[0] - rr * .7, nk[1], nk[0] + rr * .7, nk[1], H.scarf, Math.max(2, Math.round(u * 1.2))); }
      } });
    }
  }

  /* ---- the wrapped solvePose: legs, hands and stick from rig.hk ----
   * hk: { mode: 'skate' | 'goalie' | 'fight' | 'sit' | 'stand' | 'drive', ph (stride phase), push (0..1 stride strength),
   *       stop (0..1), cross (-1..1 crossover side), back (0..1 skating backward), hand (+1 right shot, -1 left),
   *       stick: { act, u, aim } (act: 'carry' | 'idle' | 'pass' | 'wrist' | 'wind' | 'slap' | 'follow' | 'check' | 'poke'
   *       | 'deke' | 'drag' | 'faceoff' | 'raise' | 'guitar' | 'sniper' | 'none'), weave, crouch, celebrate, grip }
   */
  function wrap(rig) {
    const base = rig.solvePose, up = rig.update;
    rig.update = function (dt, st) { this._lastArgs = st; return up.call(this, dt, st); };   // (the replay keeps what posed it)
    rig.solvePose = function () {
      const hk = this.hk;
      if (hk && hk.mode === 'skate') { this.o.lean = hk.lean || .3; this._crouchA = hk.crouch === undefined ? .45 : hk.crouch; }
      else if (hk && hk.mode === 'goalie') { this.o.lean = hk.lean === undefined ? .25 : hk.lean; this._crouchA = hk.crouch === undefined ? .6 : hk.crouch; }
      base.call(this);
      if (!hk || (this.downW || 0) > .05) { if (hk && hk.stickDrop) dropStick(this); return; }
      if (hk.mode === 'skate') skateLegs(this, hk);
      else if (hk.mode === 'goalie') goalieLegs(this, hk);
      else if (hk.mode === 'sit') sitLegs(this);
      if (hk.mode === 'skate' || hk.mode === 'goalie' || hk.mode === 'sit' || hk.mode === 'drive') stickHands(this, hk);
      if (hk.mode === 'fight' && hk.grip) { const J = this.J, o = this.o; const hand = add(J.shC, [6.2, -1.2, .6]); const [el, h2] = ik3(J.shL, hand, o.armUpper, o.armLower, [-1, -.7, -.2]); J.elbowL = el; J.handL = h2; }
    };
    return rig;
  }
  const legIK = (rig, s, foot, hint) => { const J = rig.J, o = rig.o, hip = s > 0 ? J.hipR : J.hipL, [knee, f2] = ik3(hip, foot, o.legUpper, o.legLower, hint || [1, s * .25, .1]); J[s > 0 ? 'kneeR' : 'kneeL'] = knee; J[s > 0 ? 'footR' : 'footL'] = f2; };
  function skateLegs(rig, hk) {
    const ph = hk.ph || 0, push = clamp(hk.push || 0, 0, 1), stop = hk.stop || 0, back = hk.back || 0, cross = hk.cross || 0, fo = hk.faceoff ? .6 : 0;
    for (const s of [-1, 1]) {
      const u = ((ph + (s > 0 ? PI : 0)) % TAU + TAU) % TAU;
      let foot;
      if (u < PI) { const k = u / PI; foot = [lerp(1.6, -4.2, k), s * lerp(1.9, 4.9, k), 0]; }
      else { const k = (u - PI) / PI; foot = [lerp(-4.2, 1.6, k), s * lerp(4.9, 1.9, k), Math.sin(k * PI) * 1.8]; }
      // a glide (no push): feet parallel, under the hips; crossover: the outside foot crosses in front
      const glide = [s > 0 ? .9 : -.5, s * 2.1, 0];
      foot = lrp(glide, foot, push);
      if (cross && push > .3) { const outside = Math.sign(cross) === s; if (outside && u > PI) { const k = (u - PI) / PI; foot[1] = lerp(foot[1], -s * 1.2, Math.sin(k * PI) * Math.abs(cross)); foot[0] += 1.4 * Math.abs(cross); } }
      // backward C-cuts: the feet trace C's out to the side and back in
      if (back > 0) { const k = Math.sin(u); foot = lrp(foot, [.6 + Math.cos(u) * 1.2, s * (2.2 + Math.max(0, k) * 2.6), 0], back); }
      // the hockey stop: both blades skid sideways, wide, knees deep
      if (stop > 0) foot = lrp(foot, [s > 0 ? 1.8 : -1.6, s * 3.6, 0], stop);
      if (fo) foot = lrp(foot, [s > 0 ? .4 : -.4, s * 3.8, 0], fo);
      legIK(rig, s, foot, [1, s * .35, .15]);
    }
  }
  function goalieLegs(rig, hk) {
    const st = hk.gst || 'ready', w = hk.gw === undefined ? 1 : hk.gw, side = hk.side || 1, J = rig.J;
    for (const s of [-1, 1]) {
      let foot = [.6, s * 3.6, 0];
      if (st === 'butterfly' || st === 'cover') foot = [-3.4, s * 7.2, .4];
      else if (st === 'stack') foot = [-.5, side * (s > 0 ? 9 : 7.5), s > 0 ? 3.5 : 1];
      else if (st === 'shuffle') foot = [.6, s * (3.6 + Math.sin((hk.ph || 0) + (s > 0 ? 0 : PI)) * .8), 0];
      else if (st === 'blasted') foot = [3 + s, s * 3, 4 + s * 2];
      foot = lrp([.6, s * 3.6, 0], foot, w);
      if (st === 'butterfly' || st === 'cover') { const hip = s > 0 ? J.hipR : J.hipL, knee = add(hip, [2.6, s * 1.2, -hip[2] + 1.2]); J[s > 0 ? 'kneeR' : 'kneeL'] = lrp(J[s > 0 ? 'kneeR' : 'kneeL'], knee, w); J[s > 0 ? 'footR' : 'footL'] = lrp(J[s > 0 ? 'footR' : 'footL'], foot, w); }
      else legIK(rig, s, foot, [1, s * .6, .1]);
    }
  }
  function sitLegs(rig) { for (const s of [-1, 1]) legIK(rig, s, [5.2, s * 2, 0], [1, 0, 1]); }
  function dropStick(rig) { const J = rig.J; J.stickTop = add(J.hipC, [6, 6, -J.hipC[2] + .8]); J.blade = add(J.hipC, [-8, 4, -J.hipC[2] + .6]); J.bladeDir2 = [0, 1, 0]; }
  /** the hands and the stick: the top hand at the shaft's end, the bottom hand 40% down it, elbows by IK */
  function stickHands(rig, hk) {
    const J = rig.J, o = rig.o, hs = hk.hand || 1, st = hk.stick || { act: 'carry' }, u = clamp(st.u || 0, 0, 1), sz = o.hipZ;
    const shZ = J.shC[2], E1 = E.ease;
    let top = [1.4, -hs * 1.6, sz + 1.2], blade = [9.5, hs * 3, .6], bdir = [0, hs, 0];
    const weave = hk.weave || 0;
    const act = st.act;
    if (act === 'carry' || act === 'idle') { blade = [9.5 + Math.cos(weave * 1.3) * 1, hs * 3 + Math.sin(weave) * 2.6, .6]; bdir = V3.norm([.25, hs, 0]); }
    else if (act === 'faceoff') { top = [3.2, -hs * 1, sz - .5]; blade = [10.5, hs * .8, .6]; bdir = [0, hs, 0]; }
    else if (act === 'pass') { const k = E1.outCubic(u); blade = lrp([2, hs * 6.5, .6], [11, hs * .6, .6 + (st.saucer ? 2.5 * k : 0)], k); top = lrp([0, -hs * .8, sz + 1], [3, -hs * 2.4, sz + 2.2], k); bdir = V3.norm([.4, hs, st.saucer ? .4 * k : 0]); }
    else if (act === 'wrist') { const k = E1.outCubic(u); blade = lrp([0, hs * 6.5, .6], [11, -hs * .4, 3.2], k); top = lrp([-.5, -hs * .4, sz + .6], [2.6, -hs * 2.8, sz + 3], k); bdir = V3.norm([.5, hs, .3 * k]); }
    else if (act === 'follow') { const k = E1.outQuad(u); blade = lrp([11, -hs * .4, 3.2], [12.5, -hs * 2, 11 + (st.big ? 4 : 0)], k); top = lrp([2.6, -hs * 2.8, sz + 3], [1, -hs * 3.4, shZ + .6], k); bdir = V3.norm([.6, hs, .6]); }
    else if (act === 'wind') { const k = E1.outCubic(u); blade = lrp([9, hs * 3, .6], [-5.5, hs * 6.5, shZ + 6], k); top = lrp([1.4, -hs * 1.6, sz + 1.2], [3.2, -hs * .2, sz + 2.8], k); bdir = V3.norm([-.6, .4 * hs, .8]); }
    else if (act === 'slap') { const k = E1.inQuad(u); blade = lrp([-5.5, hs * 6.5, shZ + 6], [9.5, hs * 1.6, .6], k); top = lrp([3.2, -hs * .2, sz + 2.8], [3.6, -hs * 1.8, sz], k); bdir = V3.norm([.4, hs, 0]); }
    else if (act === 'check') { top = [3.4, -hs * 3.4, shZ - 1.6]; blade = [4.6, hs * 7.5, shZ - 3]; bdir = V3.norm([0, -hs, 1]); }
    else if (act === 'poke') { const k = Math.sin(u * PI); top = lrp([1.4, -hs * 1.6, sz + 1.2], [6, -hs * .8, sz + .4], k); blade = lrp([9.5, hs * 3, .6], [19, hs * .6, .6], k); bdir = [0, hs, 0]; }
    else if (act === 'drag') { const k = Math.sin(u * PI); blade = [9.5, lerp(hs * 5, -hs * 3.5, k), .6]; bdir = [.2, hs, 0]; }
    else if (act === 'deke') { blade = [10, hs * 3 * Math.cos(u * PI * 2), .6]; }
    else if (act === 'raise') { top = [1, -hs * 1.2, shZ + 2]; blade = [3, hs * 2.6, shZ + 14]; bdir = V3.norm([.2, .2, 1]); }
    else if (act === 'guitar') { top = [3, -hs * 3, sz + 1]; blade = [3, hs * 7, sz + 6 + Math.sin(rig.t * 14) * 1]; bdir = V3.norm([0, hs, .5]); }
    else if (act === 'sniper') { top = [1, hs * .4, shZ + 1.2]; blade = [13, hs * .2, shZ + 2.4]; bdir = [0, 0, -1]; }
    else if (act === 'gready') { top = [3, 2.6, sz + 3.6]; blade = [9.5, 1.2, .6]; bdir = V3.norm([.1, 1, 0]); }
    else if (act === 'gpoke') { const k = Math.sin(u * PI); top = lrp([3, 2.6, sz + 3.6], [7, 1.6, sz + 1], k); blade = lrp([9.5, 1.2, .6], [19, 1, .6], k); bdir = [0, 1, 0]; }
    else if (act === 'drive') { top = [6, 2, sz + 4]; blade = [6, -2, sz + 4]; }
    if (st.aim) { const a = st.aim; const rot = p => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a), p[2]]; blade = rot(blade); top = rot(top); bdir = rot(bdir); }
    J.stickTop = top; J.blade = blade; J.bladeDir2 = V3.norm(bdir);
    if (act === 'none') return;
    // the hands: the top hand on the knob end, the bottom hand down the shaft; goalies hold it in the blocker (right)
    const goalie = hk.mode === 'goalie';
    let topH = lrp(top, blade, .03), botH = lrp(top, blade, .42);
    let rh = hs > 0 ? botH : topH, lh = hs > 0 ? topH : botH;
    if (goalie) { rh = lrp(top, blade, .15); lh = add(J.shC, hk.glove || [4.4, -4.6, -1]); }
    if (act === 'drive') { rh = add(J.shC, [6, 2.4, -4]); lh = add(J.shC, [6, -2.4, -4]); }
    if (hk.oneHand) lh = add(J.shL, [-1, -2, -5]);
    for (const s of [-1, 1]) { const sh = s > 0 ? J.shR : J.shL, hand = s > 0 ? rh : lh, [el, h2] = ik3(sh, hand, o.armUpper, o.armLower, [-1, s * .8, -.3]); J[s > 0 ? 'elbowR' : 'elbowL'] = el; J[s > 0 ? 'handR' : 'handL'] = h2; }
  }

  /* ---- factories ---- */
  function skater(def, home, opts = {}) {
    const k = kit(def.team, home), t = TEAMS[def.team];
    const rig = new E.Humanoid({ size: opts.size || (def.build === 'bulky' ? 1.3 : 1.2), build: def.build === 'bulky' ? 'bulky' : 'heroic', weapon: null, outfit: 'shirt', sleeves: 'long', armor: true,
      hair: def.hair && def.hair.style === 'long' ? 'long' : def.hair && def.hair.style === 'ponytail' ? 'ponytail' : def.hair ? def.hair.style : 'short', style: opts.classic ? 'classic' : 'hd', speedRef: 400,
      colors: { cloth: k.cloth, trim: k.trim, pants: k.pants, boot: '#1a1a1e', belt: k.pants, glove: k.glove, skin: def.skin || '#f0c8a0', hair: (def.hair && def.hair.color) || '#3a2a1a', plate: k.cloth, metal: k.cloth }, gear });
    if (opts.bigHead) rig.o.headR *= 1.8;
    rig.hkGear = { skates: true, socks: home ? t.dark : t.light, sockStripe: home ? t.trim : t.dark, stick: true, stickColor: opts.stickColor || ['#c8a070', '#3a3a44', '#e8e4d8', '#b8503a'][(def.num || 0) % 4], helmet: k.helmet, helmetStripe: k.trim, gloves: true, number: def.num, letter: def.letter, numColor: k.trim, beard: def.beard };
    if (t.plaid && home) rig.hkGear.stripes = '#5a1012';
    rig.hk = { mode: 'skate', ph: 0, push: 0, hand: def.hand === 'L' ? -1 : 1, stick: { act: 'carry' }, lean: .3 };
    return wrap(rig);
  }
  function goalie(def, home, opts = {}) {
    const k = kit(def.team, home), t = TEAMS[def.team], m = def.mask || [t.dark, t.trim];
    const rig = new E.Humanoid({ size: opts.size || def.size || 1.3, build: 'bulky', weapon: null, outfit: 'shirt', sleeves: 'long', armor: true, hair: (def.hair && def.hair.style) || 'short', style: opts.classic ? 'classic' : 'hd', speedRef: 400,
      colors: { cloth: k.cloth, trim: k.trim, pants: k.pants, boot: '#1a1a1e', belt: k.pants, glove: '#f4f4f0', skin: def.skin || '#f0c8a0', hair: (def.hair && def.hair.color) || '#3a2a1a', plate: k.cloth, metal: k.cloth }, gear });
    if (opts.bigHead) rig.o.headR *= 1.8;
    rig.hkGear = { skates: true, pads: true, padColor: home ? '#f4f4f0' : '#f4f4f0', padTrim: t.dark, stick: 'goalie', stickColor: '#e8e0c8', blocker: true, catcher: true, mask: m[0], maskTrim: m[1], number: def.num, numColor: k.trim };
    rig.hk = { mode: 'goalie', gst: 'ready', gw: 1, hand: 1, stick: { act: 'gready' }, crouch: .6 };
    return wrap(rig);
  }
  function referee(opts = {}) {
    const rig = new E.Humanoid({ size: 1.15, build: 'heroic', weapon: null, outfit: 'shirt', sleeves: 'long', hair: 'short', style: opts.classic ? 'classic' : 'hd', speedRef: 400,
      colors: { cloth: '#f4f4f0', trim: '#ff7a1a', pants: '#141418', boot: '#141418', glove: '#141418', skin: opts.skin || '#e8c0a0', hair: '#5a4030' }, gear });
    rig.hkGear = { skates: true, stripes: '#141418', helmet: '#141418', gloves: false, socks: '#141418' };
    rig.hk = { mode: 'skate', ph: 0, push: 0, hand: 1, stick: { act: 'none' }, lean: .15, crouch: .2 };
    return wrap(rig);
  }
  function cast(id, opts = {}) {
    const c = CAST[id]; if (!c) return null;
    if (c.def) { const d = c.def; return d.pos === 'G' ? goalie(d, true, opts) : skater(d, true, opts); }
    if (id === 'ref') return referee(opts);
    const rig = new E.Humanoid(Object.assign({ weapon: null, speedRef: 400 }, c.look, { gear }));
    rig.hkGear = {};
    if (id === 'pete') { rig.hkGear = { bear: true, skates: true, scarf: '#e0389a' }; rig.hk = { mode: 'skate', ph: 0, push: 0, hand: 1, stick: { act: 'none' }, lean: .1, crouch: .1 }; return wrap(rig); }
    if (id === 'moose') rig.hkGear.beard = null;
    return rig;
  }
  /** a bench spare in a team's kit, sitting */
  function spare(team, home, i) {
    const def = { team, num: [17, 22, 4, 13][i % 4], build: 'heroic', hair: { style: ['short', 'spiky', 'long'][i % 3], color: ['#3a2a1a', '#c87a3a', '#1a1010'][i % 3] }, skin: ['#f0c8a0', '#a87050', '#e0b090'][i % 3], hand: i % 2 ? 'L' : 'R' };
    const rig = skater(def, home); rig.hk.mode = 'sit'; rig.hk.stick = { act: 'idle' }; return rig;
  }
  /** a glass pounder (classic style, cheaper) in a fan's colors */
  function fan(color, skin) {
    return new E.Humanoid({ size: .95, build: 'chibi', style: 'classic', weapon: null, sleeves: 'long', hair: 'short', colors: { cloth: color, skin, hair: '#3a2a1a', pants: '#2a2a3a' } });
  }
  return { kit, gear, wrap, skater, goalie, referee, cast, spare, fan };
})();
