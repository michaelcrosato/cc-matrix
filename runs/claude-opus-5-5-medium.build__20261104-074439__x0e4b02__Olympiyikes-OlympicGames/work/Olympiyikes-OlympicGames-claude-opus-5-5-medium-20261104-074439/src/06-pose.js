/* OLYMPIYIKES! — the pose layer (§8.2): athletic poses on top of the engine's Humanoid through its pose hook (rig.post)
 * and whole-body rotation (rig.bodyPitch / bodyRoll). Joints are in the rig's frame [forward, right, up]. */
(() => {
'use strict';
const E = My3D2dge, O = OLY, V3 = E.V3, clamp = E.clamp;
const UPPER = ['shC', 'shL', 'shR', 'elbowL', 'elbowR', 'handL', 'handR', 'head'];

const rotFU = (p, c, a) => { const f = p[0] - c[0], z = p[2] - c[2], ca = Math.cos(a), sa = Math.sin(a); return [c[0] + f * ca + z * sa, p[1], c[2] - f * sa + z * ca]; };
const H = {
  /** lean the upper body forward (+) about the hips */
  lean(J, a) { const c = J.hipC; for (const k of UPPER) if (J[k]) J[k] = rotFU(J[k], c, a); },
  armTo(rig, J, side, target, hint) { const s = side === 'L' ? -1 : 1, sh = J['sh' + side]; const [el, h] = E.ik3(sh, target, rig.o.armUpper, rig.o.armLower, hint || [-1, s * .7, -.2]); J['elbow' + side] = el; J['hand' + side] = h; },
  legTo(rig, J, side, target, hint) { const hip = J['hip' + side]; const [kn, f] = E.ik3(hip, target, rig.o.legUpper, rig.o.legLower, hint || [1, 0, .1]); J['knee' + side] = kn; J['foot' + side] = f; },
  /** move the whole body down (crouch) keeping feet: shifts hips and upper body */
  drop(J, dz, keys) { for (const k of keys || ['hipC', 'hipL', 'hipR', ...UPPER]) if (J[k]) J[k] = [J[k][0], J[k][1], J[k][2] - dz]; },
  shift(J, d, keys) { for (const k of keys || Object.keys(J)) if (J[k] && k !== 'bladeDir') J[k] = V3.add(J[k], d); },
  rel(J, k, d) { return V3.add(J[k], d); }
};

const P = {};
const def = (name, fn) => { P[name] = fn; };
/* track */
def('blocks', (r, J) => { const o = r.o; H.drop(J, o.hipZ * .45); H.lean(J, 1.15); H.legTo(r, J, 'L', [3, -o.hipHalf, 0], [1, 0, .4]); H.legTo(r, J, 'R', [-5, o.hipHalf, 0], [1, 0, .2]); H.armTo(r, J, 'L', [J.shL[0] + 1, J.shL[1], .3], [-1, -1, 0]); H.armTo(r, J, 'R', [J.shR[0] + 1, J.shR[1], .3], [-1, 1, 0]); });
def('set', (r, J) => { const o = r.o; H.drop(J, o.hipZ * .2); H.lean(J, 1.25); H.legTo(r, J, 'L', [3, -o.hipHalf, 0], [1, 0, .3]); H.legTo(r, J, 'R', [-6, o.hipHalf, 0], [1, 0, .1]); H.armTo(r, J, 'L', [J.shL[0] + 1, J.shL[1], .3]); H.armTo(r, J, 'R', [J.shR[0] + 1, J.shR[1], .3]); });
def('dip', (r, J) => { H.lean(J, .75); H.armTo(r, J, 'L', H.rel(J, 'shL', [-4, -1, -5])); H.armTo(r, J, 'R', H.rel(J, 'shR', [-4, 1, -5])); });
def('armsUp', (r, J) => { H.armTo(r, J, 'L', H.rel(J, 'shL', [.5, -1, 9])); H.armTo(r, J, 'R', H.rel(J, 'shR', [.5, 1, 9])); });
def('torchRaise', (r, J) => { H.armTo(r, J, 'R', H.rel(J, 'shR', [1.5, .5, 9.5])); });
def('flagCarry', (r, J) => { H.armTo(r, J, 'R', H.rel(J, 'shR', [3, 0, 3])); H.armTo(r, J, 'L', H.rel(J, 'shL', [3, 2, 1])); });
def('podiumWave', (r, J, p) => { const w = Math.sin((p.t || 0) * 8) * 2; H.armTo(r, J, 'R', H.rel(J, 'shR', [1, 2 + w, 8.5])); });
def('bowHead', (r, J) => { H.lean(J, .5); });
/* javelin */
def('javCarry', (r, J) => { H.armTo(r, J, 'R', H.rel(J, 'shR', [-1, .5, 3.5]), [-1, 1, -.5]); });
def('javWithdraw', (r, J) => { H.lean(J, -.25); H.armTo(r, J, 'R', H.rel(J, 'shR', [-8, 1, 1]), [0, 1, -1]); H.armTo(r, J, 'L', H.rel(J, 'shL', [7, -1, 2])); });
def('javThrow', (r, J) => { H.lean(J, .35); H.armTo(r, J, 'R', H.rel(J, 'shR', [7, 0, 4])); H.armTo(r, J, 'L', H.rel(J, 'shL', [-3, -3, -2])); });
/* swimming: prone via bodyPitch, arms circling the shoulders */
def('swimCrawl', (r, J, p) => {
  const ph = p.phase || 0, L = r.o.armUpper + r.o.armLower - .3;
  for (const [side, off] of [['L', 0], ['R', Math.PI]]) { const a = ph + off, s = side === 'L' ? -1 : 1; H.armTo(r, J, side, H.rel(J, 'sh' + side, [Math.sin(a) * L * .1, s * 1, Math.cos(a) * L]), [0, s, 0]); }
  for (const side of ['L', 'R']) { const s = side === 'L' ? -1 : 1, k = Math.sin(ph * 3 + (s > 0 ? Math.PI : 0)) * 1.5; H.legTo(r, J, side, [k, s * r.o.hipHalf, -r.o.legUpper - r.o.legLower + .5], [1, 0, 0]); }
  r.bodyPitch = -Math.PI / 2 * .98; r.pivot = [0, 0, r.o.hipZ];
});
def('diveStart', (r, J, p) => { const u = p.u || 0; H.lean(J, 1.3 * u); H.drop(J, r.o.hipZ * .3 * (1 - u)); H.armTo(r, J, 'L', H.rel(J, 'shL', [-3 + 9 * u, -1, -4 + 6 * u])); H.armTo(r, J, 'R', H.rel(J, 'shR', [-3 + 9 * u, 1, -4 + 6 * u])); });
def('streamline', (r, J) => { H.armTo(r, J, 'L', H.rel(J, 'shL', [0, .8, 9.5])); H.armTo(r, J, 'R', H.rel(J, 'shR', [0, -.8, 9.5])); });
/* diving */
def('tuck', (r, J) => { const o = r.o; H.lean(J, .9); H.legTo(r, J, 'L', [5, -o.hipHalf, o.hipZ - 3], [1, 0, 1]); H.legTo(r, J, 'R', [5, o.hipHalf, o.hipZ - 3], [1, 0, 1]); H.armTo(r, J, 'L', [J.kneeL[0] + 1, -1, J.kneeL[2] - 2]); H.armTo(r, J, 'R', [J.kneeR[0] + 1, 1, J.kneeR[2] - 2]); });
def('pike', (r, J) => { const o = r.o; H.lean(J, 1.9); H.armTo(r, J, 'L', [6, -1, o.hipZ - 9]); H.armTo(r, J, 'R', [6, 1, o.hipZ - 9]); });
def('entry', (r, J) => { H.armTo(r, J, 'L', H.rel(J, 'shL', [0, .9, 9.6])); H.armTo(r, J, 'R', H.rel(J, 'shR', [0, -.9, 9.6])); });
def('bellyFlop', (r, J) => { H.armTo(r, J, 'L', H.rel(J, 'shL', [0, -6, 2])); H.armTo(r, J, 'R', H.rel(J, 'shR', [0, 6, 2])); H.legTo(r, J, 'L', [-1, -4, 1]); H.legTo(r, J, 'R', [-1, 4, 1]); });
/* archery */
def('archerDraw', (r, J, p) => { const u = p.u === undefined ? 1 : p.u; H.armTo(r, J, 'L', H.rel(J, 'shL', [9.4, 1.2, .4])); H.armTo(r, J, 'R', H.rel(J, 'shR', [5 - 6 * u, -1.6, .8]), [0, 1, 0]); });
/* weightlifting */
def('liftClean', (r, J, p) => { const o = r.o, h = p.h || 0, sq = (1 - h) * .5 + (h > .85 ? .25 * (1 - (h - .85) / .15) : 0); H.drop(J, o.hipZ * sq * .8); H.lean(J, (1 - h) * .7); const bz = 3 + h * (o.hipZ + o.torso - 4); H.armTo(r, J, 'L', [2, -2.5, bz]); H.armTo(r, J, 'R', [2, 2.5, bz]); H.legTo(r, J, 'L', [1, -2.3, 0], [1, -.4, .3]); H.legTo(r, J, 'R', [1, 2.3, 0], [1, .4, .3]); });
def('liftRack', (r, J) => { const o = r.o, z = o.hipZ + o.torso - 1; H.armTo(r, J, 'L', [2.5, -2.6, z], [-.2, -1, -1]); H.armTo(r, J, 'R', [2.5, 2.6, z], [-.2, 1, -1]); });
def('liftJerk', (r, J, p) => { const o = r.o, u = p.u === undefined ? 1 : p.u; H.drop(J, o.hipZ * .18 * u); H.legTo(r, J, 'L', [5 * u, -2, 0], [1, 0, .2]); H.legTo(r, J, 'R', [-5 * u, 2, 0], [1, 0, .2]); const z = J.shC[2] + 9; H.armTo(r, J, 'L', [.5, -3, z]); H.armTo(r, J, 'R', [.5, 3, z]); });
def('liftDrop', (r, J) => { const o = r.o; H.drop(J, o.hipZ * .6); H.armTo(r, J, 'L', H.rel(J, 'shL', [-2, -3, -3])); H.armTo(r, J, 'R', H.rel(J, 'shR', [-2, 3, -3])); });
/* skiing */
def('skiTuck', (r, J) => { const o = r.o; H.drop(J, o.hipZ * .42); H.lean(J, 1.05); H.legTo(r, J, 'L', [1, -1.8, 0], [1, 0, .2]); H.legTo(r, J, 'R', [1, 1.8, 0], [1, 0, .2]); H.armTo(r, J, 'L', H.rel(J, 'shL', [4, .5, -2])); H.armTo(r, J, 'R', H.rel(J, 'shR', [4, -.5, -2])); });
def('skiFlight', (r, J) => { H.lean(J, .25); H.armTo(r, J, 'L', H.rel(J, 'shL', [-5, -2.5, -6])); H.armTo(r, J, 'R', H.rel(J, 'shR', [-5, 2.5, -6])); });
def('telemark', (r, J) => { const o = r.o; H.drop(J, o.hipZ * .25); H.legTo(r, J, 'L', [5, -1.8, 0], [1, 0, .3]); H.legTo(r, J, 'R', [-5, 1.8, 0], [1, 0, .1]); H.armTo(r, J, 'L', H.rel(J, 'shL', [1, -6, 1])); H.armTo(r, J, 'R', H.rel(J, 'shR', [1, 6, 1])); });
def('skiStand', (r, J) => { const o = r.o; H.drop(J, o.hipZ * .15); H.lean(J, .3); H.armTo(r, J, 'L', H.rel(J, 'shL', [3, -2, -6])); H.armTo(r, J, 'R', H.rel(J, 'shR', [3, 2, -6])); });
/* bobsled */
def('bobPush', (r, J) => { H.lean(J, 1.0); H.armTo(r, J, 'L', H.rel(J, 'shL', [6, 1, -4])); H.armTo(r, J, 'R', H.rel(J, 'shR', [6, -1, -4])); });
def('seated', (r, J) => { const o = r.o; H.drop(J, o.hipZ * .85); H.legTo(r, J, 'L', [7, -1.8, o.hipZ * .15], [0, 0, 1]); H.legTo(r, J, 'R', [7, 1.8, o.hipZ * .15], [0, 0, 1]); H.lean(J, .45); H.armTo(r, J, 'L', H.rel(J, 'shL', [5, 0, -4])); H.armTo(r, J, 'R', H.rel(J, 'shR', [5, 0, -4])); });
/* skating */
def('skateGlide', (r, J, p) => { const s = Math.sin((p.t || 0) * 3); H.armTo(r, J, 'L', H.rel(J, 'shL', [1, -7, 1 + s])); H.armTo(r, J, 'R', H.rel(J, 'shR', [1, 7, 1 - s])); });
def('skateSpiral', (r, J) => { const o = r.o; H.lean(J, 1.1); H.legTo(r, J, 'R', [-o.legUpper - o.legLower + 1, 1.8, o.hipZ + 2], [0, 0, -1]); H.armTo(r, J, 'L', H.rel(J, 'shL', [3, -7, 2])); H.armTo(r, J, 'R', H.rel(J, 'shR', [3, 7, 2])); });
def('sitSpin', (r, J) => { const o = r.o; H.drop(J, o.hipZ * .55); H.legTo(r, J, 'R', [o.legUpper + o.legLower - 2, 1.8, o.hipZ * .45], [0, 0, 1]); H.lean(J, .5); H.armTo(r, J, 'L', H.rel(J, 'shL', [6, 0, -1])); H.armTo(r, J, 'R', H.rel(J, 'shR', [6, 0, -1])); });
def('skateJump', (r, J) => { H.armTo(r, J, 'L', H.rel(J, 'shL', [2, 4, -2])); H.armTo(r, J, 'R', H.rel(J, 'shR', [2, -4, -2])); H.legTo(r, J, 'L', [0, -.6, J.hipL[2] - r.o.legUpper - r.o.legLower + .3]); H.legTo(r, J, 'R', [.5, .6, J.hipR[2] - r.o.legUpper - r.o.legLower + 1]); });
def('skateLand', (r, J) => { const o = r.o; H.drop(J, o.hipZ * .15); H.legTo(r, J, 'R', [-8, 2, 3], [0, 0, -1]); H.armTo(r, J, 'L', H.rel(J, 'shL', [2, -8, 2])); H.armTo(r, J, 'R', H.rel(J, 'shR', [2, 8, 2])); });
def('finalPose', (r, J) => { H.armTo(r, J, 'L', H.rel(J, 'shL', [1, -4, 8])); H.armTo(r, J, 'R', H.rel(J, 'shR', [3, 6, 4])); });
/* curling */
def('curlSlide', (r, J) => { const o = r.o; H.drop(J, o.hipZ * .55); H.legTo(r, J, 'L', [5, -1.8, 0], [1, 0, .5]); H.legTo(r, J, 'R', [-9, 2, 0.5], [0, 0, -1]); H.lean(J, .6); H.armTo(r, J, 'R', H.rel(J, 'shR', [7, 1, -4])); H.armTo(r, J, 'L', H.rel(J, 'shL', [2, -5, -3])); });
def('sweep', (r, J, p) => { const s = Math.sin((p.t || 0) * 16) * 2.5; H.lean(J, .7); H.armTo(r, J, 'L', H.rel(J, 'shL', [5 + s, 1.5, -4])); H.armTo(r, J, 'R', H.rel(J, 'shR', [3 + s, -1.5, -6])); });
/* hockey */
def('stick', (r, J) => { H.lean(J, .45); H.drop(J, r.o.hipZ * .12); H.armTo(r, J, 'L', H.rel(J, 'shL', [4, 2.5, -4])); H.armTo(r, J, 'R', H.rel(J, 'shR', [3, -.5, -7])); });
def('goalie', (r, J) => { const o = r.o; H.drop(J, o.hipZ * .3); H.lean(J, .4); H.legTo(r, J, 'L', [1, -4, 0]); H.legTo(r, J, 'R', [1, 4, 0]); H.armTo(r, J, 'L', H.rel(J, 'shL', [4, -4, -1])); H.armTo(r, J, 'R', H.rel(J, 'shR', [4, 3, -5])); });
def('kneeSlide', (r, J) => { const o = r.o; H.drop(J, o.hipZ * .6); H.armTo(r, J, 'L', H.rel(J, 'shL', [1, -3, 8])); H.armTo(r, J, 'R', H.rel(J, 'shR', [1, 3, 8])); });
/* falls */
def('sitDown', (r, J) => { const o = r.o; H.drop(J, o.hipZ * .9); H.legTo(r, J, 'L', [8, -2, o.hipZ * .1], [0, 0, 1]); H.legTo(r, J, 'R', [8, 2, o.hipZ * .1], [0, 0, 1]); H.lean(J, -.35); H.armTo(r, J, 'L', H.rel(J, 'shL', [-3, -3, -8])); H.armTo(r, J, 'R', H.rel(J, 'shR', [-3, 3, -8])); });

O.Pose = {
  P, H, names: Object.keys(P),
  /** install (or blend to) a pose: params may change every step (phase, u, h...) */
  set(rig, name, params) {
    if (!rig._pose) { rig._pose = { name: null, p: {}, w: 0, want: 0 }; rig.post = O.Pose.hook; }
    const ps = rig._pose;
    if (name && P[name]) { if (ps.name !== name) { ps.prev = ps.name; ps.name = name; ps.w = ps.w > 0 && ps.prev ? .35 : ps.w; } ps.want = 1; ps.p = params || {}; }
    else ps.want = 0;
  },
  clear(rig) { if (rig._pose) rig._pose.want = 0; rig.bodyPitch = 0; rig.bodyRoll = 0; rig.pivot = null; },
  snap(rig) { if (rig._pose) rig._pose.w = rig._pose.want; },
  hook(rig, J, dt) {
    const ps = rig._pose; if (!ps) return;
    ps.w = E.approach(ps.w, ps.want, (dt || 1 / 120) / .15);
    if (ps.w <= 0 || !ps.name) return;
    const keep = {}; for (const k in J) if (J[k] && k !== 'bladeDir') keep[k] = J[k].slice();
    const pitch0 = rig.bodyPitch;
    try { P[ps.name](rig, J, ps.p); } catch (e) { O.game.fail('pose ' + ps.name, e); }
    if (ps.w < 1) { for (const k in keep) J[k] = V3.lerp(keep[k], J[k], ps.w); if (rig.bodyPitch !== pitch0) rig.bodyPitch = (pitch0 || 0) + (rig.bodyPitch - (pitch0 || 0)) * ps.w; }
  }
};
})();
