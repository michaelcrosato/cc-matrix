# AOA engine patch 5: the Humanoid's athletic build, swimsuits and patterned shirts, new hair and hats, the extras hook,
# bare feet and sandals, new held poses and a timed arm overlay. Run once on engine/my-3d2dge.js.
import sys
p = sys.argv[1]; s = open(p).read()
def rep(old, new, cnt=1):
    global s
    n = s.count(old)
    assert n == cnt, (n, old[:100])
    s = s.replace(old, new)

# (a) the athletic build
rep("  chibi: {},\n",
    "  chibi: {},\n  // AOA: lean and long-legged, for the volleyball cast\n  athletic: { legUpper: 7.1, legLower: 7.2, hipZ: 13.9, torso: 8.9, shoulderHalf: 2.95, headR: 3.0, neck: 1.4, armUpper: 5.1, armLower: 4.9, hipHalf: 2.05, limbW: 1.75, torsoW: 2.7, stride: 7.4, speedRef: 80 },\n")

# held poses: new keys, and explicit weights (s.poseW) for timed moves
rep("    const pk = this.poseW || (this.poseW = { cheer: 0, cast: 0, guard: 0, kneel: 0, crouch: 0, wave: 0, hips: 0, block: 0 });\n    for (const k in pk) pk[k] = approach(pk[k], s.pose === k ? 1 : 0, dt * 9);",
    "    const pk = this.poseW || (this.poseW = { cheer: 0, cast: 0, guard: 0, kneel: 0, crouch: 0, wave: 0, hips: 0, block: 0 });\n    for (const k of AOA_POSES) if (pk[k] === undefined) pk[k] = 0;   // AOA: the new held poses\n    for (const k in pk) pk[k] = s.poseW && s.poseW[k] !== undefined ? clamp(s.poseW[k], 0, 1) : approach(pk[k], s.pose === k ? 1 : 0, dt * 9);")
rep("    if (o.hair.style === 'long' || o.hair.style === 'ponytail') this._hair(dt);",
    "    if (o.hair.style === 'long' || o.hair.style === 'ponytail' || o.hair.style === 'braid') this._hair(dt);   // AOA: braid")
rep("    const o = this.o, long = o.hair.style === 'long', N = o.hair.len || (long ? 6 : 4), seg = (long ? 1.9 : 1.6) * o.size;",
    "    const o = this.o, long = o.hair.style === 'long' || o.hair.style === 'braid', N = o.hair.len || (o.hair.style === 'braid' ? 5 : long ? 6 : 4), seg = (long ? 1.9 : 1.6) * o.size;")

# solvePose: crouch, sit, lean and the arm targets of the new poses, then the timed arm overlay (rig.arms)
rep("    const cr = Math.max(PW.crouch || 0, this._crouchA || 0, Math.sin(clamp(this.downW || 0, 0, 1) * Math.PI) * .85);",
    "    const AR = this.arms && this.arms.w > 0 ? this.arms : null, sit = PW.sit || 0;   // AOA: a timed move's overlay; sitting\n    const cr = Math.max(PW.crouch || 0, this._crouchA || 0, Math.sin(clamp(this.downW || 0, 0, 1) * Math.PI) * .85, (PW.vready || 0) * .35, (PW.bump || 0) * .55, (PW.set || 0) * .2, AR && AR.crouch ? AR.crouch * AR.w : 0);")
rep("    const hipC = [mf * .4 * sp - .4 * hurt + lg * .55, mr * .3 * sp + sway, o.hipZ + bob + breathe * .3 - dash * 2.2 - hurt * .6 - kn * o.hipZ * .42 - PW.guard * .9 - cr * o.hipZ * .32 - snk * o.hipZ * .3 - ld * o.hipZ * .42 + (this.hop || 0)];",
    "    const hipC = [mf * .4 * sp - .4 * hurt + lg * .55 - sit * 1.6, mr * .3 * sp + sway, o.hipZ + bob + breathe * .3 - dash * 2.2 - hurt * .6 - kn * o.hipZ * .42 - PW.guard * .9 - cr * o.hipZ * .32 - snk * o.hipZ * .3 - ld * o.hipZ * .42 - sit * o.hipZ * .44 + (this.hop || 0)];")
rep("      if (hw > 0) foot = V3.lerp(foot, [1.3, s * 1.3, o.hipZ * .08 + (s > 0 ? .8 : 0)], hw);                   // dangling against the wall",
    "      if (hw > 0) foot = V3.lerp(foot, [1.3, s * 1.3, o.hipZ * .08 + (s > 0 ? .8 : 0)], hw);                   // dangling against the wall\n      if (sit > 0) foot = V3.lerp(foot, [o.legUpper * .78, s * 1.9, 0], sit);   // AOA: sitting, knees forward")
rep("    const leanF = (o.lean + .16 * sp * mf + .45 * dash + this._atkLean - .35 * hurt + cr * .22 + snk * .34 + spr * .3 + ld * .42) * (1 - hw) + hw * .06, leanR = .1 * sp * mr;",
    "    const leanF = (o.lean + .16 * sp * mf + .45 * dash + this._atkLean - .35 * hurt + cr * .22 + snk * .34 + spr * .3 + ld * .42 - (PW.stretch || 0) * .18 - (PW.set || 0) * .1 - sit * .08 + (AR && AR.lean ? AR.lean * AR.w : 0)) * (1 - hw) + hw * .06, leanR = .1 * sp * mr;")
rep("    J.shL = add(shC, rz([0, -o.shoulderHalf, 0], this._twist)); J.shR = add(shC, rz([0, o.shoulderHalf, 0], this._twist));",
    "    const tw = this._twist + (PW.lookback || 0) * .75 + (AR && AR.twist ? AR.twist * AR.w : 0);   // AOA: look back over the shoulder\n    J.shL = add(shC, rz([0, -o.shoulderHalf, 0], tw)); J.shR = add(shC, rz([0, o.shoulderHalf, 0], tw));")
rep("      if (hw > 0) hand = V3.lerp(hand, add(sh, [2.4, s * .4, clamp((this._hangZ === undefined ? sh[2] + armLen : this._hangZ) - sh[2], 1, armLen * .96)]), hw);   // gripping the edge above",
    "      if (hw > 0) hand = V3.lerp(hand, add(sh, [2.4, s * .4, clamp((this._hangZ === undefined ? sh[2] + armLen : this._hangZ) - sh[2], 1, armLen * .96)]), hw);   // gripping the edge above\n      hand = aoaHands(this, PW, s, sh, shC, J, armLen, hand);   // AOA: the new held poses")
rep("      if (this._kicking && aw > 0) hand = V3.lerp(hand, add(shC, [1.8, s * 2.2, .6 - (s > 0 ? 1.5 : 0)]), aw * .85);   // arms up for balance during a kick",
    "      if (this._kicking && aw > 0) hand = V3.lerp(hand, add(shC, [1.8, s * 2.2, .6 - (s > 0 ? 1.5 : 0)]), aw * .85);   // arms up for balance during a kick\n      if (AR) { const tg = s > 0 ? AR.R : AR.L; if (tg) hand = V3.lerp(hand, AR.rel ? add(sh, tg) : tg, AR.w * (AR[s > 0 ? 'wR' : 'wL'] === undefined ? 1 : AR[s > 0 ? 'wR' : 'wL'])); }   // AOA: a timed move's hand targets (rig frame, from the feet; rel: from the shoulder)")

# helpers before the class: the pose list, the hands of each pose, the patterns
rep("class Humanoid {\n  /** new E.Humanoid({ size: 1.3,",
r"""/* AOA: held poses for a beach volleyball cast (pose: 'bump', or poseW: { bump: .7 } to drive one by hand) */
const AOA_POSES = ['vready', 'bump', 'set', 'toss', 'highfive', 'clap', 'facepalm', 'peace', 'lookback', 'stretch', 'sit', 'sunbathe', 'spikearm', 'blockup'];
function aoaHands(rig, PW, s, sh, shC, J, armLen, hand) {
  const add = V3.add, L = V3.lerp, t = rig.t;
  if (PW.vready > 0) hand = L(hand, add(shC, [3, s * 1.5, -armLen * .66]), PW.vready);
  if (PW.bump > 0) hand = L(hand, add(shC, [armLen * .66, s * .3, -armLen * .58]), PW.bump);
  if (PW.set > 0) hand = L(hand, add(shC, [2.1, s * 1.25, armLen * .78]), PW.set);
  if (PW.blockup > 0) hand = L(hand, add(sh, [1.1, s * -.25, armLen * .96]), PW.blockup);
  if (PW.toss > 0) hand = L(hand, s < 0 ? add(sh, [1.4, .4, armLen * .94]) : add(sh, [-1.6, s * 1.1, armLen * .35]), PW.toss);
  if (PW.spikearm > 0) hand = L(hand, s > 0 ? add(sh, [-.6, s * .9, armLen * .9]) : add(sh, [armLen * .5, s * .6, armLen * .62]), PW.spikearm);
  if (PW.highfive > 0) hand = L(hand, s > 0 ? add(sh, [armLen * .55, -.6, armLen * .55]) : add(sh, [.4, s * 1.2, -armLen * .8]), PW.highfive);
  if (PW.clap > 0) hand = L(hand, add(shC, [armLen * .58, s * (.25 + .9 * Math.max(0, Math.sin(t * 13))), -1.2]), PW.clap);
  if (PW.facepalm > 0) hand = L(hand, s > 0 ? add(J.head, [1.6, .2, -.2]) : add(J.hipL, [-.2, -1.5, 1.5]), PW.facepalm);
  if (PW.peace > 0) hand = L(hand, s > 0 ? add(J.head, [1.2, 2.2, 1.2]) : add(J.hipL, [-.2, -1.5, 1.5]), PW.peace);
  if (PW.lookback > 0) hand = L(hand, add(s > 0 ? J.hipR : J.hipL, [-.4, s * 1.5, 1.4]), PW.lookback);
  if (PW.stretch > 0) hand = L(hand, add(shC, [.2 + Math.sin(t * 1.6) * .6, s * .55, armLen * 1.02]), PW.stretch);
  if (PW.sit > 0) hand = L(hand, add(shC, [3.6, s * 2.1, -armLen * .66]), PW.sit);
  if (PW.sunbathe > 0) hand = L(hand, add(J.head, [-1.6, s * 2.3, .6]), PW.sunbathe);
  return hand;
}
/* AOA: swimsuit and shirt patterns, per pixel (lx, ly: pixels from the hips; u: 0 at the shoulders, 1 at the hips; t: seconds).
 * Returns 0 main, 1 accent, 2 trim, 3 main and accent mixed, 4 a white glint */
const SWIM_PATTERNS = {
  solid: () => 0,
  stripes: (x, y) => ((y % 3) + 3) % 3 === 0 ? 1 : 0,
  pin: x => ((x % 3) + 3) % 3 === 0 ? 1 : 0,
  dots: (x, y) => { const r = ((y % 6) + 6) % 6 < 3 ? 0 : 2; return ((x + r) % 4 + 4) % 4 === 1 && ((y % 3) + 3) % 3 === 1 ? 1 : 0; },
  waves: (x, y) => (((y + [0, 1, 1, 0][((x % 4) + 4) % 4]) % 4) + 4) % 4 === 0 ? 1 : (((y + 2 + [0, 1, 1, 0][((x % 4) + 4) % 4]) % 8) + 8) % 8 === 0 ? 2 : 0,
  stars: (x, y) => { const o = ((Math.floor(y / 5) % 2) + 2) % 2 * 2, a = (((x + o) % 5) + 5) % 5, b = ((y % 5) + 5) % 5; return (a === 2 && b >= 1 && b <= 3) || (b === 2 && a >= 1 && a <= 3) ? 1 : 0; },
  floral: (x, y) => { const o = ((Math.floor(y / 5) % 2) + 2) % 2 * 3, a = (((x + o) % 6) + 6) % 6, b = ((y % 5) + 5) % 5; return a === 3 && b === 2 ? 2 : (Math.abs(a - 3) + Math.abs(b - 2) === 1) ? 1 : 0; },
  palms: (x, y) => { const b = ((y % 6) + 6) % 6; return b < 3 ? ((((x - y) % 5) + 5) % 5 === 0 ? 1 : 0) : ((((x + y) % 5) + 5) % 5 === 0 ? 1 : (((x + y) % 5) + 5) % 5 === 1 && b === 4 ? 2 : 0); },
  check: (x, y) => { const a = Math.floor(x / 2) & 1, b = Math.floor(y / 2) & 1; return a && b ? 1 : a || b ? 3 : 0; },
  gradient: (x, y, u) => u < .42 ? 0 : u < .68 ? 3 : 1,
  geo: (x, y) => { const z = Math.abs((((x % 4) + 4) % 4) - 2); return (((y + z) % 4) + 4) % 4 === 0 ? 1 : (((y + z) % 8) + 8) % 8 === 2 ? 2 : 0; },
  scales: (x, y) => { const o = ((Math.floor(y / 3) % 2) + 2) % 2 * 2, a = (((x + o) % 4) + 4) % 4, b = ((y % 3) + 3) % 3; return (b === 0 && (a === 1 || a === 2)) || (b === 1 && (a === 0 || a === 3)) ? 1 : 0; },
  sevens: (x, y) => { const o = ((Math.floor(y / 5) % 2) + 2) % 2 * 2, a = (((x + o) % 5) + 5) % 5, b = ((y % 5) + 5) % 5; return (b === 0 && a <= 2) || (a === 2 && b === 1) || (a === 1 && (b === 2 || b === 3)) ? 1 : 0; },
  lame: (x, y, u, t) => (((x + y - Math.floor(t * 18)) % 19) + 19) % 19 === 0 ? 4 : ((x + y) & 1) ? 3 : 0
};
class Humanoid {
  /** new E.Humanoid({ size: 1.3,""")
open(p, 'w').write(s)
