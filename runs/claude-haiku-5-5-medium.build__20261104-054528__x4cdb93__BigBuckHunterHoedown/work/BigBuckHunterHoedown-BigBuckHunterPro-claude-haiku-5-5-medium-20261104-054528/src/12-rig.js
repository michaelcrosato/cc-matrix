// ---- the four-legged rig: one rig, many animals -------------------------------------------------------------------------
// The engine ships a Humanoid and a Blob, and no four-legged rig. This one follows the engine's rig convention: update(dt,
// state) poses it from continuous values (speed, state, the head tween), and draw(...) only paints the pose. Its presets
// are data: a deer, an elk, a moose, a cow, a raccoon and a skunk are the same rig with different proportions and marks.
// Gait is a diagonal walk: the legs swing in opposite pairs, and the swing eases in and out with the motion.
const RIG_PRESET = {
  deer:   { legTop: .46, legX: [.26, .14], stride: .09, bodyY: .56, bodyRx: .37, bodyRy: .19, headX: .46, headUp: .8, headDown: .36, headR: .13, headRy: .09, neckFrom: .28, neckW: .12, rump: true, antlers: true, tail: .34 },
  elk:    { legTop: .5, legX: [.3, .16], stride: .08, bodyY: .6, bodyRx: .4, bodyRy: .21, headX: .5, headUp: .92, headDown: .4, headR: .14, headRy: .1, neckFrom: .3, neckW: .13, rump: true, rumpX: -.3, antlers: true },
  moose:  { legTop: .56, legX: [.22, .1], stride: .1, bodyY: .7, bodyRx: .36, bodyRy: .23, headX: .56, headUp: .98, headDown: .5, headR: .15, headRy: .1, neckFrom: .3, neckW: .12, muzzle: true, palm: true, legW: 2 },
  bessie: { legTop: .3, legX: [.3, .14], stride: .07, bodyY: .48, bodyRx: .42, bodyRy: .24, headX: .5, headUp: .7, headDown: .3, headR: .13, headRy: .11, neckFrom: .3, neckW: .1, spots: true, udder: true, legColor: '#2a2a2a' },
  coon:   { legTop: .14, legX: [.2, .2], stride: .06, bodyY: .3, bodyRx: .4, bodyRy: .2, headX: .45, headUp: .36, headDown: .36, headR: .12, headRy: .12, neckFrom: .5, neckW: .14, mask: true, ringTail: true, legColor: '#3a3a3a' },
  skunk:  { legTop: .22, legX: [.24, .14], stride: .06, bodyY: .36, bodyRx: .4, bodyRy: .22, headX: .46, headUp: .3, headDown: .3, headR: .16, headRy: .14, neckFrom: .3, neckW: .1, stripe: true, legColor: '#0e0c0c' },
};
const QUAD_KINDS = Object.keys(RIG_PRESET);

class QuadRig {
  constructor(preset) { this.p = preset; this.phase = 0; this.swing = 0; this.head = 0; }
  // the step: gait phase from speed, the swing eases toward the walk, the head from its tween
  update(dt, st) {
    const moving = st.state === 'walk' || st.state === 'bolt' ? 1 : 0;
    this.phase += dt * (st.speed || 0) * 22;
    this.swing += (moving * Math.sin(this.phase) - this.swing) * Math.min(1, dt * 12);
    this.head = st.head || 0;
  }
  // paint the pose at a foot point (cx, fy), height h, facing f (+1 = nose to the right)
  draw(g, cx, fy, h, f, a, sp, t) {
    const p = this.p, X = u => cx + f * u * h, Y = v => fy - v * h;
    const coat = sp.coat, belly = sp.belly, dark = E.mix(coat, '#000000', .35);
    const lw = Math.max(1, Math.round(h * (p.legW || .05)));
    const legColor = p.legColor || dark;
    // four legs in diagonal pairs: front-left with back-right, front-right with back-left
    const pairs = [[-p.legX[0], 1], [-p.legX[1], -1], [p.legX[1], -1], [p.legX[0], 1]];
    for (const [ox, s] of pairs) ln(g, X(ox), Y(p.legTop), X(ox) + this.swing * s * p.stride * h, fy, legColor, lw);
    E.px.ell(g, X(0), Y(p.bodyY), h * p.bodyRx, h * p.bodyRy, coat);
    E.px.ell(g, X(0), Y(p.bodyY - p.bodyRy * .8), h * p.bodyRx * .8, h * p.bodyRy * .4, belly);
    if (p.rump) E.px.ell(g, X(p.rumpX == null ? -.32 : p.rumpX), Y(p.bodyY + .04), h * .16, h * .14, belly);
    if (p.stripe) ln(g, X(-.4), Y(p.bodyY + .2), X(.3), Y(p.bodyY + .14), belly, Math.max(1, h * .08));
    if (p.mask) ln(g, X(.36), Y(.44), X(.5), Y(.4), '#262626', 1);
    if (p.spots) for (const [u, v, r] of [[-.2, .58, .12], [.12, .4, .1], [.3, .62, .08], [-.05, .3, .09]]) E.px.disc(g, X(u), Y(v), h * r, belly);
    if (p.ringTail) { ln(g, X(-.5), Y(.3), X(-.85), Y(.55), coat, Math.max(2, h * .14)); ln(g, X(-.6), Y(.42), X(-.65), Y(.5), '#262626', 1); }
    else if (p.tail) E.px.disc(g, X(-.34), Y(p.bodyY + .04), h * .06, belly);
    // neck and head: the head tween takes it from up to down (grazing)
    const hy = Y(p.headUp + (p.headDown - p.headUp) * this.head), hx = X(p.headX);
    ln(g, X(p.neckFrom), Y(p.bodyY + .06), hx, hy, coat, Math.max(2, h * p.neckW));
    E.px.ell(g, hx, hy, h * p.headR, h * p.headRy, coat);
    if (p.muzzle) E.px.ell(g, hx + f * h * .13, hy + h * .06, h * .1, h * .08, dark);
    else E.px.ell(g, hx + f * h * .07, hy + h * .03, h * .05, h * .04, belly);
    if (p.mask) E.px.ell(g, hx + f * h * .04, hy, h * .08, h * .05, '#1a1a1a');
    E.px.dot(g, hx + f * h * .07, hy + h * .01, '#1a100a');
    if (p.antlers && sp.antlerPts !== undefined && a.antlers) {
      if (p.palm) for (const s of [-1, 1]) E.px.ell(g, hx - f * h * .04, hy - h * .12 - s * h * .02, h * .26, h * .07, '#c8b28a');
      else antlers(g, hx, hy - h * .06, h, f, a.antlers, sp.kind === 'elk' ? '#d9c9a0' : '#e4d8bc', t);
    }
  }
}

// the painter the animal kinds share: the rig, made on first use (a lab's preview has no runtime rig yet)
function drawQuad(g, cx, fy, h, f, a, sp, t) {
  const rig = a.rig || (a.rig = new QuadRig(RIG_PRESET[sp.kind]));
  rig.draw(g, cx, fy, h, f, a, sp, t);
}
