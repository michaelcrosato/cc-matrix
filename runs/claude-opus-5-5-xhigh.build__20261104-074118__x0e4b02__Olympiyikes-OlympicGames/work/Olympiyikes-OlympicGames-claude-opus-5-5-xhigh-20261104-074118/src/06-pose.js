// O.Pose: the athletes' poses the Humanoid lacks (sprint blocks, javelin carry and throw, dives, tuck and pike, the
// archer's draw, the clean and jerk, ski tuck, V-style flight, telemark, bobsled seats, skating spirals and spins,
// curling slides and sweeps, hockey stances, ceremonies), built in the rig's own frame [forward, right, up] with
// two-bone IK and blended in and out through rig.post (engine change). O.Gear draws the equipment at the joints.
(() => {
'use strict';
const E = My3D2dge, O = OLY, px = E.px, { clamp, lerp, V3, ik3 } = E;
const add = V3.add, mul = V3.mul, norm = V3.norm, L3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const sm = u => u * u * (3 - 2 * u);

/** build a whole skeleton from a compact spec: { hip, lean, side, head, footL, footR, handL, handR, kneeHint, elbowHint } */
function build(rig, sp, base) {
  const o = rig.o, J = {};
  const hip = sp.hip || [0, 0, o.hipZ];
  const dir = norm([Math.sin(sp.lean || 0) * Math.cos(sp.side || 0), Math.sin(sp.side || 0), Math.cos(sp.lean || 0) * Math.cos(sp.side || 0)]);
  J.hipC = hip; J.hipL = add(hip, [0, -o.hipHalf, 0]); J.hipR = add(hip, [0, o.hipHalf, 0]);
  J.shC = add(hip, mul(dir, o.torso)); J.shL = add(J.shC, [0, -o.shoulderHalf, 0]); J.shR = add(J.shC, [0, o.shoulderHalf, 0]);
  J.head = add(J.shC, mul(sp.head ? norm(sp.head) : dir, o.neck + o.headR));
  const rel = (v, origin) => typeof v === 'function' ? v(J) : v && v.rel ? add(origin, v.rel) : v;
  for (const s of [-1, 1]) {
    const k = s < 0 ? 'L' : 'R', hp = J['hip' + k];
    let foot = rel(sp['foot' + k], hp); if (!foot) foot = base ? base['foot' + k] : [0, s * o.footSpread, 0];
    const [kn, f2] = ik3(hp, foot, o.legUpper, o.legLower, sp['kneeHint' + k] || sp.kneeHint || [1, s * .15, .1]);
    J['knee' + k] = kn; J['foot' + k] = f2;
    const sh = J['sh' + k];
    let hand = rel(sp['hand' + k], sh); if (!hand) hand = add(sh, [.4, s * .9, -(o.armUpper + o.armLower) * .9]);
    const [el, h2] = ik3(sh, hand, o.armUpper, o.armLower, sp['elbowHint' + k] || sp.elbowHint || [-1, s * .7, -.2]);
    J['elbow' + k] = el; J['hand' + k] = h2;
  }
  J.bladeDir = [1, 0, 0];
  return J;
}
const R = v => ({ rel: v });   // a point relative to its own hip or shoulder

// the library: each (rig, params, base) -> a spec (or a modifier: { mod(J) } that edits the solved joints)
const LIB = {
  blocks: (rig) => { const H = rig.o.hipZ; return { hip: [-2.5, 0, H * .42], lean: 1.22, footR: [1.8, 1.9, 0], footL: [-5.2, -1.9, 0], kneeHintL: [.2, -.1, -1], handL: [5.8, -2.2, 0], handR: [5.8, 2.2, 0] }; },
  set: (rig) => { const H = rig.o.hipZ; return { hip: [-1.2, 0, H * .66], lean: 1.42, footR: [1.6, 1.9, 0], footL: [-4.6, -1.9, 0], handL: [6.2, -2.2, 0], handR: [6.2, 2.2, 0] }; },
  crouchStart: (rig) => { const H = rig.o.hipZ; return { hip: [-1, 0, H * .7], lean: .7, footR: [2, 1.9, 0], footL: [-3, -1.9, 0], handL: R([3, -.5, -5]), handR: R([-2, .5, -5]) }; },
  armsUp: (rig) => { const A = rig.o.armUpper + rig.o.armLower; return { handL: R([.4, -.4, A * .97]), handR: R([.4, .4, A * .97]), footL: [0, -1, 0], footR: [0, 1, 0] }; },
  armsForward: (rig) => { const A = rig.o.armUpper + rig.o.armLower; return { lean: .35, handL: R([A * .95, -.3, 1]), handR: R([A * .95, .3, 1]), footL: [-.5, -1.2, 0], footR: [.5, 1.2, 0] }; },
  dive: (rig) => { const A = rig.o.armUpper + rig.o.armLower; return { lean: .0, handL: R([.3, .4, A * .98]), handR: R([.3, -.4, A * .98]), footL: [0, -.5, 0], footR: [0, .5, 0] }; },
  tuck: (rig) => { const H = rig.o.hipZ; return { hip: [0, 0, H], lean: .75, footL: [.8, -1.6, H - 3.2], footR: [.8, 1.6, H - 3.2], kneeHint: [1, 0, 1], handL: [4.5, -2.2, H + 1.2], handR: [4.5, 2.2, H + 1.2], head: [1, 0, .6] }; },
  pike: (rig) => { const H = rig.o.hipZ; return { hip: [0, 0, H], lean: Math.PI - .55, footL: [0, -.9, H - 11.6], footR: [0, .9, H - 11.6], kneeHint: [1, 0, 0], handL: [1.2, -1.6, H - 9.6], handR: [1.2, 1.6, H - 9.6] }; },
  layout: (rig) => { const A = rig.o.armUpper + rig.o.armLower; return { handL: R([0, -1.5, A * .95]), handR: R([0, 1.5, A * .95]), footL: [0, -.6, 0], footR: [0, .6, 0], kneeHint: [1, 0, 0] }; },
  open: (rig) => { const A = rig.o.armUpper + rig.o.armLower; return { handL: R([0, -A * .9, 1]), handR: R([0, A * .9, 1]), footL: [0, -.8, 0], footR: [0, .8, 0], kneeHint: [1, 0, 0] }; },
  bellyFlop: (rig) => ({ handL: R([0, -6, 5]), handR: R([0, 6, 5]), footL: [0, -4, 1], footR: [0, 4, 1] }),
  archerDraw: (rig, p) => { const o = rig.o, A = o.armUpper + o.armLower, u = clamp(p.u || 0, 0, 1); return { lean: -.05, footL: [1.5, -2.6, 0], footR: [-1.5, 2.6, 0], handL: R([A * .97, .4, .4]), handR: J => L3(add(J.shL, [A * .85, .6, .4]), add(J.head, [-.6, 1.2, -2.2]), sm(u)), elbowHintR: [-1, .9, .4] }; },
  liftSetup: (rig) => { const H = rig.o.hipZ; return { hip: [-2.5, 0, H * .55], lean: .75, footL: [.3, -2.4, 0], footR: [.3, 2.4, 0], kneeHint: [1, .4, .1], handL: [2.4, -3.4, 2.5], handR: [2.4, 3.4, 2.5] }; },
  liftClean: (rig, p) => { const o = rig.o, H = o.hipZ, h = clamp(p.h || 0, 0, 1), u = sm(h), barZ = lerp(2.5, H + o.torso - 1.2, u), deep = Math.sin(h * Math.PI) * .25;
    return { hip: [lerp(-2.5, -.6, u), 0, H * (lerp(.55, .96, u) - deep)], lean: lerp(.75, .1, u), footL: [.3, -2.4, 0], footR: [.3, 2.4, 0], kneeHint: [1, .4, .1], handL: [lerp(2.4, 2.6, u), -3.4, barZ], handR: [lerp(2.4, 2.6, u), 3.4, barZ], elbowHint: [1, 0, -1] }; },
  liftRack: (rig) => { const o = rig.o, H = o.hipZ; return { hip: [-.4, 0, H * .97], lean: .05, footL: [.3, -2.4, 0], footR: [.3, 2.4, 0], handL: [2.6, -3.4, H + o.torso - 1.2], handR: [2.6, 3.4, H + o.torso - 1.2], elbowHint: [1, 0, -1] }; },
  liftJerk: (rig, p) => { const o = rig.o, H = o.hipZ, A = o.armUpper + o.armLower, u = clamp(p.u === undefined ? 1 : p.u, 0, 1), k = sm(u);
    return { hip: [0, 0, H * lerp(.97, .78, k)], lean: 0, footL: [lerp(.3, -4, k), -2.4, 0], footR: [lerp(.3, 3.6, k), 2.4, 0], kneeHint: [1, 0, .2], handL: [lerp(2.6, .4, k), -3.6, lerp(H + o.torso - 1.2, H * lerp(.97, .78, k) + o.torso + A * .96, k)], handR: [lerp(2.6, .4, k), 3.6, lerp(H + o.torso - 1.2, H * lerp(.97, .78, k) + o.torso + A * .96, k)], elbowHint: [-.3, 0, -1] }; },
  liftHold: (rig) => LIB.liftJerk(rig, { u: 1 }),
  liftDrop: (rig) => { const H = rig.o.hipZ; return { hip: [-2, 0, 2.6], lean: -.25, footL: [6, -2.2, 0], footR: [6, 2.2, 0], kneeHint: [1, 0, 1], handL: [-1.5, -4, .3], handR: [-1.5, 4, .3] }; },
  skiTuck: (rig) => { const H = rig.o.hipZ; return { hip: [-1.6, 0, H * .52], lean: 1.15, footL: [.6, -1.8, 0], footR: [.6, 1.8, 0], kneeHint: [1, 0, .2], handL: [5.5, -1.6, 6.2], handR: [5.5, 1.6, 6.2], head: [.8, 0, .7] }; },
  skiStand: (rig) => { const H = rig.o.hipZ; return { hip: [-.8, 0, H * .82], lean: .45, footL: [.4, -2, 0], footR: [.4, 2, 0], handL: R([2, -2.6, -6]), handR: R([2, 2.6, -6]) }; },
  skiFlight: (rig) => { const o = rig.o; return { lean: 0, footL: [0, -2.4, 0], footR: [0, 2.4, 0], kneeHint: [1, 0, 0], handL: J => add(J.hipL, [-2.2, -2.6, -1]), handR: J => add(J.hipR, [-2.2, 2.6, -1]), head: [.35, 0, 1] }; },
  telemark: (rig) => { const o = rig.o, H = o.hipZ; return { hip: [0, 0, H * .72], lean: .15, footR: [4.2, 1.7, 0], footL: [-4.6, -1.7, .6], kneeHintL: [.2, 0, -1], handL: R([1.5, -6, -1.5]), handR: R([1.5, 6, -1.5]) }; },
  tumble: (rig) => ({ handL: R([1, -5, 3]), handR: R([-1, 5, 4]), footL: [2, -3, 3], footR: [-2, 3, 1] }),
  bobSeat: (rig, p) => { const H = rig.o.hipZ; return { hip: [0, 0, 3.4], lean: p.tuck ? 1.05 : .25, footL: [6, -1.6, 2.6], footR: [6, 1.6, 2.6], kneeHint: [.3, 0, 1], handL: [4.6, -2.4, p.tuck ? 6 : 7.5], handR: [4.6, 2.4, p.tuck ? 6 : 7.5] }; },
  bobPush: (rig) => ({ mod(J, rg) { const o = rg.o; lean(J, .65); for (const s of [-1, 1]) { const k = s < 0 ? 'L' : 'R'; const [el, h] = ik3(J['sh' + k], [J.hipC[0] + 7.5, s * 2.6, o.hipZ * .62], o.armUpper, o.armLower, [-1, s * .7, -.2]); J['elbow' + k] = el; J['hand' + k] = h; } } }),
  skateGlide: (rig) => { const H = rig.o.hipZ; return { hip: [0, 0, H * .9], lean: .3, footL: [0, -1.4, 0], footR: [-3.5, 1.6, 1.6], handL: R([1, -6.5, -2]), handR: R([1, 6.5, -2]) }; },
  skateSpiral: (rig) => { const H = rig.o.hipZ; return { hip: [0, 0, H * .98], lean: 1.15, footL: [.6, -.8, 0], footR: [-10.5, 1, H + 1.5], kneeHintR: [-.2, 0, 1], handL: R([2, -7, .5]), handR: R([2, 7, .5]) }; },
  sitSpin: (rig) => { const H = rig.o.hipZ; return { hip: [0, 0, H * .42], lean: .55, footL: [0, -1, 0], footR: [9.5, 1, H * .42], kneeHintR: [1, 0, 1], handL: R([7, -1.5, -2]), handR: R([7, 1.5, -2]) }; },
  skateJump: (rig) => ({ lean: 0, footL: [0, -.5, 0], footR: [0, .6, .8], kneeHint: [1, 0, 0], handL: J => add(J.shC, [1.6, 1, -1.6]), handR: J => add(J.shC, [1.4, -1, -1.2]) }),
  skateLand: (rig) => { const H = rig.o.hipZ; return { hip: [0, 0, H * .85], lean: .35, footL: [.3, -1.2, 0], footR: [-8, 1.2, 3], handL: R([1, -7, 0]), handR: R([1, 7, 0]) }; },
  skateFall: (rig) => ({ hip: [-1, 0, 2.2], lean: -.6, footL: [6, -2.5, 1], footR: [5, 2.5, 3], kneeHint: [1, 0, 1], handL: [-3, -3.5, .3], handR: [-3, 3.5, .3] }),
  finalPose: (rig) => { const A = rig.o.armUpper + rig.o.armLower; return { lean: -.25, footL: [1.5, -1.2, 0], footR: [-2, 1.6, 0], handL: R([1.5, -3, A * .9]), handR: R([1, 6, 2]) }; },
  curlSlide: (rig) => { const H = rig.o.hipZ; return { hip: [-1.5, 0, H * .38], lean: .95, footR: [3.2, 1.4, 0], footL: [-10.5, -1.3, 0], kneeHintL: [0, 0, -1], handR: [8.6, 1.2, 1.4], handL: R([0, -4.5, -5]), head: [.9, 0, .5] }; },
  sweep: (rig, p) => { const H = rig.o.hipZ, ph = Math.sin(p.ph || 0) * 1.4; return { hip: [0, 0, H * .75], lean: .75, footL: [-1.2, -2.4, 0], footR: [1.6, 2.4, 0], handL: [3 + ph * .5, -.4 + ph, 7.2], handR: [4.6 + ph, .4 + ph, 4.6] }; },
  skipPoint: (rig) => { const A = rig.o.armUpper + rig.o.armLower; return { lean: .2, footL: [-.5, -2, 0], footR: [.8, 2, 0], handR: R([A * .8, .6, 2]), handL: R([.5, -1.5, -7]) }; },
  hockey: (rig, p) => ({ mod(J, rg) { const o = rg.o; lean(J, .45); const a = p.wind ? -1 : 0; for (const s of [-1, 1]) { const k = s < 0 ? 'L' : 'R'; const t = s > 0 ? [J.hipC[0] + 3.4 + a * 3, 2.4 + a * 1.5, o.hipZ * .62 - a * 4] : [J.hipC[0] + 1.6 + a * 2, -.6 + a, o.hipZ * .95 - a * 3]; const [el, h] = ik3(J['sh' + k], t, o.armUpper, o.armLower, [-1, s * .7, -.2]); J['elbow' + k] = el; J['hand' + k] = h; } } }),
  goalie: (rig) => { const H = rig.o.hipZ; return { hip: [-.5, 0, H * .62], lean: .45, footL: [.6, -4.2, 0], footR: [.6, 4.2, 0], kneeHint: [1, .5, 0], handL: [4, -4.2, 6.5], handR: [3.6, 3.6, 4.2] }; },
  flagCarry: (rig) => ({ mod(J, rg) { const o = rg.o; const [el, h] = ik3(J.shR, add(J.shR, [2.2, .2, 3.2]), o.armUpper, o.armLower, [-1, .7, -.2]); J.elbowR = el; J.handR = h; const [e2, h2] = ik3(J.shL, add(J.shR, [2.6, -.4, -.8]), o.armUpper, o.armLower, [-1, -.7, -.2]); J.elbowL = e2; J.handL = h2; } }),
  torchRaise: (rig) => ({ mod(J, rg) { const o = rg.o, A = o.armUpper + o.armLower; const [el, h] = ik3(J.shR, add(J.shR, [.8, .3, A * .96]), o.armUpper, o.armLower, [-1, .7, -.2]); J.elbowR = el; J.handR = h; } }),
  torchCarry: (rig) => ({ mod(J, rg) { const o = rg.o; const [el, h] = ik3(J.shR, add(J.shR, [3.2, .4, 1.4]), o.armUpper, o.armLower, [-1, .7, -.6]); J.elbowR = el; J.handR = h; } }),
  bowHead: (rig) => ({ mod(J) { lean(J, .45); } }),
  medalBite: (rig) => ({ mod(J, rg) { const o = rg.o; const [el, h] = ik3(J.shR, add(J.head, [1.6, .4, -1.2]), o.armUpper, o.armLower, [-1, .9, -.4]); J.elbowR = el; J.handR = h; } }),
  javCarry: (rig) => ({ mod(J, rg) { const o = rg.o; const [el, h] = ik3(J.shR, add(J.shR, [-1.6, .5, 3.4]), o.armUpper, o.armLower, [-1, .9, -.2]); J.elbowR = el; J.handR = h; } }),
  javThrow: (rig, p) => ({ mod(J, rg) { const o = rg.o, u = clamp(p.u || 0, 0, 1), A = o.armUpper + o.armLower; lean(J, lerp(-.35, .45, sm(u))); const back = [-A * .9, .8, 1.8], fwd = [A * .7, .2, 2.6]; const [el, h] = ik3(J.shR, add(J.shR, L3(back, fwd, sm(u))), o.armUpper, o.armLower, [-1, .9, .3]); J.elbowR = el; J.handR = h; const [e2, h2] = ik3(J.shL, add(J.shL, L3([A * .8, -.5, .5], [-2, -1.5, -5], sm(u))), o.armUpper, o.armLower, [-1, -.7, -.2]); J.elbowL = e2; J.handL = h2; } }),
  dip: (rig, p) => ({ mod(J) { lean(J, .55 * clamp(p.u === undefined ? 1 : p.u, 0, 1)); } }),
  swimArms: (rig) => ({ mod() {} })
};
/** lean the upper body forward by a about the hip centre (a modifier) */
function lean(J, a) {
  const c = Math.cos(a), s = Math.sin(a), p = J.hipC;
  for (const k of ['shC', 'shL', 'shR', 'elbowL', 'elbowR', 'handL', 'handR', 'head']) { const v = J[k]; if (!v) continue; const f = v[0] - p[0], z = v[2] - p[2]; J[k] = [p[0] + f * c + z * s, v[1], p[2] - f * s + z * c]; }
}

function post(rig, J, dt) {
  const name = rig.poseName, w = rig._poseW || 0;
  const target = name ? name : rig._poseLast;
  const k = name ? 1 : 0, rate = rig.poseSnap ? 1e3 : 1 / .15;
  rig._poseW = E.approach(w, k, (dt || 1 / 120) * rate);
  if (name) rig._poseLast = name;
  if (!target || !(rig._poseW > 0)) return;
  const fn = LIB[target]; if (!fn) return;
  const sp = fn(rig, rig.poseP || {}, J);
  if (sp.mod) { if (rig._poseW >= .999) sp.mod(J, rig); else { const copy = {}; for (const kk in J) copy[kk] = J[kk] && J[kk].slice ? J[kk].slice() : J[kk]; sp.mod(copy, rig); for (const kk in J) if (kk !== 'bladeDir' && copy[kk]) J[kk] = L3(J[kk], copy[kk], rig._poseW); } return; }
  const T = build(rig, sp, J), ww = rig._poseW;
  for (const kk in T) if (kk !== 'bladeDir' && J[kk]) J[kk] = ww >= .999 ? T[kk] : L3(J[kk], T[kk], ww);
}

O.Pose = {
  LIB, build, lean,
  names: Object.keys(LIB),
  /** put a rig in a pose (blends in over .15 s; o.snap: at once): O.Pose.set(rig, 'tuck') */
  set(rig, name, params, o = {}) { if (!rig) return; rig.post = post; if (rig.poseName !== name) rig.poseSnap = !!o.snap; rig.poseName = name; rig.poseP = params || {}; },
  clear(rig, o = {}) { if (!rig) return; rig.poseName = null; rig.poseSnap = !!o.snap; },
  /** whole-body rotation: pitch (forward somersault), roll (sideways), about a pivot in the rig's frame */
  rot(rig, pitch = 0, roll = 0, pivot = null) { rig.bodyPitch = pitch; rig.bodyRoll = roll; rig.pivot = pivot; }
};

// ---------------------------------------------------------------------------------------------------------------
// O.Gear: equipment drawn at projected joints inside an r.actor callback (so it outlines and sorts with the rig)
// ---------------------------------------------------------------------------------------------------------------
const G = O.Gear = {
  /** a point in the rig's frame -> buffer pixel, given the actor's (ox, oy) and the view */
  jp(rig, v, ox, oy, p) { const w = rig.worldOffset(p); return [ox + v.ax * w[0] + v.ay * w[1], oy + v.bx * w[0] + v.by * w[1] + v.bz * w[2]]; },
  /** a world offset (from the rig's feet) -> buffer pixel */
  wp(v, ox, oy, w) { return [ox + v.ax * w[0] + v.ay * w[1], oy + v.bx * w[0] + v.by * w[1] + v.bz * w[2]]; },
  line(g, a, b, c, w = 1) { px.line(g, Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), c, w); },
  javelin(g, rig, v, ox, oy, o = {}) {
    const h = rig.J.handR, d = o.dir || [-.55, 0, .45], L = o.len || 22, a = add(h, mul(norm(d), -L * .45)), b = add(h, mul(norm(d), L * .55));
    const pa = G.jp(rig, v, ox, oy, a), pb = G.jp(rig, v, ox, oy, b); G.line(g, pa, pb, '#e8e0c8', 1); G.line(g, pa, L3(pa, pb, .12), '#3a3f5a', 1); G.line(g, L3(pa, pb, .42), L3(pa, pb, .55), o.grip || '#e23b2e', 2);
  },
  bow(g, rig, v, ox, oy, o = {}) {
    const J = rig.J, hL = J.handL, top = add(hL, [0, 0, 6.5]), bot = add(hL, [0, 0, -6.5]), mid = add(hL, [1.4, 0, 0]);
    const pt = G.jp(rig, v, ox, oy, top), pb = G.jp(rig, v, ox, oy, bot), pm = G.jp(rig, v, ox, oy, mid), ph = G.jp(rig, v, ox, oy, J.handR);
    G.line(g, pt, pm, o.color || '#6a3a1a', 2); G.line(g, pm, pb, o.color || '#6a3a1a', 2);
    const sp = o.draw ? ph : L3(pt, pb, .5); G.line(g, pt, sp, '#f4f4f4', 1); G.line(g, sp, pb, '#f4f4f4', 1);
    if (o.arrow) { const tip = G.jp(rig, v, ox, oy, add(hL, [3, 0, 0])); G.line(g, ph, tip, '#e8d8b0', 1); px.rect(g, Math.round(ph[0]) - 1, Math.round(ph[1]) - 1, 2, 2, '#e23b2e'); }
  },
  barbell(g, rig, v, ox, oy, o = {}) {
    const J = rig.J, mid = L3(J.handL, J.handR, .5), k = o.kg || 200, bend = clamp((k - 150) / 120, 0, 1.3) * (o.bend === undefined ? 1 : o.bend);
    const ends = [add(mid, [0, -13, -bend * 2.2]), add(mid, [0, 13, -bend * 2.2])], pm = G.jp(rig, v, ox, oy, mid), pl = G.jp(rig, v, ox, oy, ends[0]), pr = G.jp(rig, v, ox, oy, ends[1]);
    G.line(g, pl, pm, '#c8ccd8', 1); G.line(g, pm, pr, '#c8ccd8', 1);
    const plates = G.plates(k); let off = 0;
    for (const [w, c] of plates) { for (const [p, s] of [[pl, 1], [pr, -1]]) { const hh = Math.round(3 + w / 25 * 6), x = Math.round(p[0] + s * off); px.rect(g, x - 1, Math.round(p[1]) - hh, 3, hh * 2, '#14161e'); px.rect(g, x, Math.round(p[1]) - hh + 1, 1, hh * 2 - 2, c); } off += 2; }
  },
  plates(kg) { const per = Math.max(0, (kg - 20) / 2), out = []; let left = per; for (const [w, c] of [[25, '#e23b2e'], [20, '#2f7fe0'], [15, '#f2c21b'], [10, '#3ab04a'], [5, '#f4f4f4'], [2.5, '#2a2a2a']]) while (left >= w - .01 && out.length < 9) { out.push([w, c]); left -= w; } return out; },
  skis(g, rig, v, ox, oy, o = {}) {
    const J = rig.J, L = o.len || 22, back = o.back || .3, vs = o.v || 0, c = o.color || '#e23b2e';
    for (const s of [-1, 1]) { const f = s < 0 ? J.footL : J.footR, dir = norm([1, s * vs, o.tilt || 0]), a = add(f, mul(dir, -L * back)), b = add(f, mul(dir, L * (1 - back))); const pa = G.jp(rig, v, ox, oy, a), pb = G.jp(rig, v, ox, oy, b); G.line(g, pa, pb, c, 2); G.line(g, pb, [pb[0] + (pb[0] > pa[0] ? 1 : -1), pb[1] - 1], c, 1); }
  },
  poles(g, rig, v, ox, oy, o = {}) { const J = rig.J; for (const k of ['L', 'R']) { const h = J['hand' + k], e = add(h, o.dir || [-5, 0, -8]); G.line(g, G.jp(rig, v, ox, oy, h), G.jp(rig, v, ox, oy, e), '#c8ccd8', 1); } },
  broom(g, rig, v, ox, oy, o = {}) { const J = rig.J, a = J.handL, b = J.handR, d = norm(V3.sub ? V3.sub(b, a) : [b[0] - a[0], b[1] - a[1], b[2] - a[2]]), head = add(b, mul(d, 6)); const pa = G.jp(rig, v, ox, oy, add(a, mul(d, -2))), ph = G.jp(rig, v, ox, oy, head); G.line(g, pa, ph, '#c8a060', 1); px.rect(g, Math.round(ph[0]) - 3, Math.round(ph[1]) - 1, 7, 3, o.color || '#2a2a2a'); },
  stick(g, rig, v, ox, oy, o = {}) { const J = rig.J, a = J.handL, b = J.handR, d = norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]]); let blade = add(b, mul(d, 7)); blade[2] = Math.max(0, blade[2]); const pa = G.jp(rig, v, ox, oy, a), pb = G.jp(rig, v, ox, oy, blade), pc = G.jp(rig, v, ox, oy, add(blade, [2.5, 0, 0])); G.line(g, pa, pb, o.color || '#d8b070', 1); G.line(g, pb, pc, '#1a1a1a', 2); },
  torch(g, rig, v, ox, oy, o = {}) { const h = rig.J.handR, top = add(h, [0, 0, 4]), ph = G.jp(rig, v, ox, oy, h), pt = G.jp(rig, v, ox, oy, top); G.line(g, ph, pt, '#c8ccd8', 2); px.rect(g, Math.round(pt[0]) - 2, Math.round(pt[1]) - 1, 4, 2, '#f2b632'); if (o.lit !== false) { const f = Math.sin(O.game.real * 14) * 1.2; px.poly(g, [[pt[0] - 2, pt[1] - 1], [pt[0] + 2, pt[1] - 1], [pt[0] + f, pt[1] - 8]], '#ff7a1a'); px.poly(g, [[pt[0] - 1, pt[1] - 1], [pt[0] + 1, pt[1] - 1], [pt[0] + f * .5, pt[1] - 5]], '#ffe066'); } return pt; },
  flag(g, rig, v, ox, oy, nation, o = {}) { const h = rig.J.handR, top = add(h, [0, 0, 14]), ph = G.jp(rig, v, ox, oy, add(h, [0, 0, -4])), pt = G.jp(rig, v, ox, oy, top); G.line(g, ph, pt, '#d8dce8', 1); O.Art.flag(g, pt[0] + 1, pt[1], o.w || 14, o.h || 9, nation, 1.5); },
  goggles(g, rig, v, ox, oy, o = {}) { const hd = rig.J.head, p = G.jp(rig, v, ox, oy, add(hd, [rig.o.headR * .8, 0, .3])); px.rect(g, Math.round(p[0]) - 2, Math.round(p[1]) - 1, 4, 2, o.color || '#3ae8f0'); px.rect(g, Math.round(p[0]) - 1, Math.round(p[1]) - 1, 1, 1, '#ffffff'); },
  medal(g, rig, v, ox, oy, kind) { const p = G.jp(rig, v, ox, oy, add(rig.J.shC, [1.6, 0, -2.2])); const c = { g: '#f2c94c', s: '#d8dce8', b: '#d08a4a' }[kind] || '#f2c94c'; px.line(g, Math.round(p[0]) - 2, Math.round(p[1]) - 3, Math.round(p[0]), Math.round(p[1]), '#2f7fe0', 1); px.line(g, Math.round(p[0]) + 2, Math.round(p[1]) - 3, Math.round(p[0]), Math.round(p[1]), '#e23b2e', 1); px.disc(g, Math.round(p[0]), Math.round(p[1]) + 1, 2, c); }
};
})();
