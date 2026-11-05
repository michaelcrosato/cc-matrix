/* =====================================================================================================================
 * POSES: karate stances, blocks, the bow, seiza, the referee's signals and the judges' flags, made on top of the engine's
 * Humanoid by wrapping rig.solvePose (the rig's own frame: [forward, right, up], size-1 units). Each rig gets rig.kc, a
 * set of weights the game sets every step from serializable state (KC.pose); they blend in and out smoothly.
 * ===================================================================================================================== */
const V3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len: a => Math.hypot(a[0], a[1], a[2]), lerp: (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
};
function ik2(a, b, L1, L2, hint) {
  let d = V3.sub(b, a), dist = V3.len(d); const max = L1 + L2 - .01;
  if (dist > max) { d = V3.mul(d, max / dist); b = V3.add(a, d); dist = max; }
  dist = Math.max(dist, .01); const n = V3.mul(d, 1 / dist);
  let h = V3.sub(hint, V3.mul(n, V3.dot(hint, n))); const hl = V3.len(h);
  h = hl < 1e-4 ? [n[1], -n[0], 0] : V3.mul(h, 1 / hl);
  const x = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist), y = Math.sqrt(Math.max(0, L1 * L1 - x * x));
  return [V3.add(V3.add(a, V3.mul(n, x)), V3.mul(h, y)), b];
}
const UPPER = ['shC', 'shL', 'shR', 'head', 'elbowL', 'elbowR', 'handL', 'handR'];
// the weights a rig blends toward (all 0..1 but side: +1 / -1 for the referee's signals, a local right or left)
const KC_POSE0 = { bow: 0, blockHi: 0, blockMid: 0, yoi: 0, seiza: 0, kamae: 0, sig: null, sigW: 0, side: 1, flag: 0, flagSide: 0, cross: 0, point: 0, nod: 0, hikite: 0 };
KC.rigPost = rig => {
  if (rig._kcWrapped) return rig;
  rig._kcWrapped = true; rig.kc = Object.assign({}, KC_POSE0); rig.kcW = Object.assign({}, KC_POSE0);
  const base = rig.solvePose;
  rig.solvePose = function () {
    base.call(this);
    const J = this.J, o = this.o, W = this.kcW; if (!J.shC) return;
    const aU = o.armUpper, aL = o.armLower, arm = (s, target, hint, w) => {   // put a hand at target (blended by w)
      if (w <= 0) return; const sh = J[s > 0 ? 'shR' : 'shL'], [el, ha] = ik2(sh, target, aU, aL, hint);
      const ek = s > 0 ? 'elbowR' : 'elbowL', hk = s > 0 ? 'handR' : 'handL';
      J[ek] = V3.lerp(J[ek], el, w); J[hk] = V3.lerp(J[hk], ha, w);
    };
    // seiza: kneel sitting on the heels (the body drops; knees forward on the floor, shins back under the hips)
    if (W.seiza > .01) {
      const k = W.seiza, hz = o.hipZ, drop = (J.hipC[2] - hz * .43) * k;
      for (const key of UPPER.concat(['hipC', 'hipL', 'hipR'])) if (J[key]) J[key] = [J[key][0], J[key][1], J[key][2] - drop];
      for (const s of [-1, 1]) {
        const hip = J[s > 0 ? 'hipR' : 'hipL'], kn = [hip[0] + o.legUpper * .92, hip[1] + s * .4, .9], ft = [hip[0] - .6, hip[1] + s * .3, .5];
        J[s > 0 ? 'kneeR' : 'kneeL'] = V3.lerp(J[s > 0 ? 'kneeR' : 'kneeL'], kn, k); J[s > 0 ? 'footR' : 'footL'] = V3.lerp(J[s > 0 ? 'footR' : 'footL'], ft, k);
      }
      for (const s of [-1, 1]) arm(s, [J.hipC[0] + o.legUpper * .7, s * 1.6, J.hipC[2] + 1.2], [0, s, -.4], k);   // hands on the thighs
    }
    // the bow (rei): the torso and head bend forward about the hips
    const bw = Math.max(W.bow * .55, W.nod * .22);
    if (bw > .01) {
      const a = bw, c = Math.cos(a), sn = Math.sin(a), h = J.hipC;
      for (const key of UPPER) { const p = J[key]; if (!p) continue; const f = p[0] - h[0], z = p[2] - h[2]; J[key] = [h[0] + f * c + z * sn, p[1], h[2] - f * sn + z * c]; }
    }
    const sh = J.shC, hd = J.head;
    // yoi: fists down in front of the belt
    if (W.yoi > .01) for (const s of [-1, 1]) arm(s, [J.hipC[0] + 3, s * 1.8, J.hipC[2] + 1.8], [.3, s, 0], W.yoi);
    // blocks: high (age-uke: the lead forearm over the brow) and middle (soto-uke: across the chest); the other fist at the hip
    if (W.blockHi > .01) { arm(-1, [hd[0] + 2.4, -.4, hd[2] + 3.4], [.4, -1, .3], W.blockHi); arm(1, [J.hipC[0] - .6, 2.1, J.hipC[2] + 2.6], [-1, .5, 0], W.blockHi); }
    if (W.blockMid > .01) { arm(-1, [sh[0] + 5.2, .4, sh[2] + .6], [.2, -1, -.6], W.blockMid); arm(1, [J.hipC[0] - .6, 2.1, J.hipC[2] + 2.6], [-1, .5, 0], W.blockMid); }
    // arms crossed (a cutscene's waiting stance), pointing (a cutscene gesture)
    if (W.cross > .01) { arm(-1, [sh[0] + 2.2, 1.6, sh[2] - 2.4], [1, -.4, 0], W.cross); arm(1, [sh[0] + 2.6, -1.6, sh[2] - 2.0], [1, .4, 0], W.cross); }
    if (W.point > .01) arm(1, [sh[0] + aU + aL - .4, 1.4, sh[2] + 1.4], [0, 1, -.3], W.point);
    // the referee's signals (he faces the camera: his right hand is on the screen's left, toward WHITE)
    if (W.sigW > .01 && this.kc.sig) {
      const w = W.sigW, s = this.kc.side, sig = this.kc.sig, L = aU + aL;
      if (sig === 'hajime') { for (const k of [-1, 1]) arm(k, [sh[0] + 4.6, k * 3.4, sh[2] - 4.6], [0, k, -.2], w); }
      else if (sig === 'yame') { arm(1, [sh[0] + 5, 1.2, sh[2] + 4.2], [0, 1, -.4], w); arm(-1, [sh[0] + 1, -2.4, sh[2] - 6], [0, -1, 0], w * .6); }
      else if (sig === 'half') { arm(s, [sh[0] + 1.6, s * (L * .72), sh[2] - L * .55], [0, s, 0], w); }
      else if (sig === 'full') { arm(s, [sh[0] + 1.2, s * (L * .62), sh[2] + L * .72], [0, s, 0], w); }
      else if (sig === 'aiuchi') { for (const k of [-1, 1]) arm(k, [sh[0] + 5.6, k * .7, sh[2] - .4], [0, k, -.5], w); }
      else if (sig === 'whistle') { arm(1, [hd[0] + 2.4, .6, hd[2] - 1.6], [0, 1, -.6], w); }
      else if (sig === 'point') { arm(s, [sh[0] + 3, s * (L * .82), sh[2] + .4], [0, s, -.3], w); }
      else if (sig === 'winner') { arm(s, [sh[0] + 1, s * (L * .45), sh[2] + L * .86], [0, s, 0], w); }
      else if (sig === 'nopoint') { for (const k of [-1, 1]) arm(k, [sh[0] + 4.2, -k * 2.6, sh[2] - 3.6], [0, k, -.3], w); }
    }
    // a corner judge's flags: flagSide +1 raises the right hand's (WHITE), -1 the left hand's (RED); both rest down
    if (W.flag > .01) for (const k of [-1, 1]) { const up = this.kc.flagSide === k ? W.flag : 0; arm(k, up ? [sh[0] + 1, k * 4.4, sh[2] + (aU + aL) * .82] : [sh[0] + 2.6, k * 3, sh[2] - 6.4], [0, k, 0], 1); }
  };
  return rig;
};
/** blend a rig's karate weights toward the targets given (call it before rig.update, every step) */
KC.poseStep = (rig, dt, want) => {
  KC.rigPost(rig);
  const K = rig.kc, W = rig.kcW;
  for (const k in KC_POSE0) if (typeof KC_POSE0[k] === 'number' && k !== 'side' && k !== 'flagSide' && k !== 'sigW') W[k] = approach(W[k], want[k] || 0, dt * (k === 'bow' ? 4 : k === 'seiza' ? 5 : 14));
  K.side = want.side || 1; K.flagSide = want.flagSide || 0; if (want.sig) K.sig = want.sig;
  W.sigW = approach(W.sigW, want.sig ? 1 : 0, dt * 9); W.sig = want.sig || null;
};
/** a Humanoid dressed for a fighter: the roster entry's rig options, the side's gi, the rank's belt */
KC.makeRig = (fid, side, rank, o = {}) => {
  const F = KC.FIGHTER[fid] || KC.FIGHTER.taro, classic = o.classic, gi = side === 'red' ? (classic ? KC.GI.classicRed : KC.GI.red) : side === 'white' ? (classic ? KC.GI.classicWhite : KC.GI.white) : null;
  const R = KC.DATA.ranks[KC.rankIndex(rank || F.rank)] || KC.DATA.ranks[0], skin = F.rig.colors.skin;
  const colors = Object.assign({}, F.rig.colors, { cloth: gi ? gi.cloth : o.cloth || '#e8dcc8', pants: gi ? gi.pants : o.pants || '#5a4a3a', trim: gi ? gi.trim : '#c8a060', belt: R.belt, boot: skin, glove: skin, eye: '#1a1320' });
  if (o.colors) Object.assign(colors, o.colors);
  const rig = new E.Humanoid(Object.assign({ weapon: null, sleeves: 'short', outfit: 'shirt', cheat: .45 }, F.rig, { colors }, o.rig || {}));
  rig.kcFighter = fid; rig.kcBeard = F.beard || null; rig.kcRank = R;
  return KC.rigPost(rig);
};
/** the referee and judges: navy blazer, grey trousers, white shirt, a red bow tie */
KC.makeOfficial = (size = 2.1, o = {}) => KC.rigPost(new E.Humanoid(Object.assign({ build: 'heroic', size, weapon: null, outfit: 'coat', sleeves: 'long', hair: 'bald', stubble: '#e8e4dc', cheat: .2 }, o,
  { colors: Object.assign({ skin: '#e8b890', hair: '#c8c4bc', cloth: '#1e2a52', coat: '#1e2a52', pants: '#6a6a72', boot: '#1a1418', belt: '#1a1418', trim: '#d8302a', glove: '#e8b890', eye: '#1a1320' }, o.colors || {}) })));
/** draw a beard over a rig's chin (the engine has stubble; hermits and masters get a white beard) */
KC.drawBeard = (g, rig, r, color, ox, oy) => {
  if (!color || !rig.J.head) return;
  const w = rig.worldOffset([rig.J.head[0] + rig.o.headR * .55, 0, rig.J.head[2] - rig.o.headR * .75]), p = r.w(rig.x + w[0], rig.y + w[1], rig.z + w[2]), o = r.w(rig.x, rig.y, rig.z), s = rig.o.size * r.view.scale;
  const x = Math.round(p[0] - o[0] + (ox || 0)), y = Math.round(p[1] - o[1] + (oy || 0)), bw = Math.max(2, Math.round(s * 1.6)), bh = Math.max(3, Math.round(s * 2.6));
  px.ell(g, x, y, bw, bh, E.shade(color, -.2)); px.ell(g, x, y - 1, bw - 1, bh - 1, color); px.dot(g, x - 1, y - bh + 1, '#ffffff');
};
