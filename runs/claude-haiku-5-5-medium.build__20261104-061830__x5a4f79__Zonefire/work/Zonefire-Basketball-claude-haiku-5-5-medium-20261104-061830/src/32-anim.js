/* ---- THE POSE LAYER (plan §7.1): the engine's own rig, posed by math each step; on top of it the right hand goes where the
 * ball is: held at the chest, low for the dribble, overhead for the shot and the dunk, both hands up for the rebound. The
 * target is in the rig's own frame at size 1 (forward, right, up), and the arm is solved by E.ik3. The ball then rides the
 * real hand (rig.hand), so a ball can't float away from the player who holds it. ---- */
const POSE_TARGET = {
  hold: [5, 2, 15], dribble: [4, 3, 8], shoot: [3, 1, 34], dunk: [6, 0, 40], rebound: [3, 2, 40], guard: [4, 4, 16], low: [2, 4, 4]
};
/** the layer: wraps the rig's solvePose once; the target (set by rigState) is read at each pose */
const poseLayer = rig => {
  if (rig.bbPoseWrapped) return rig;
  rig.bbPoseWrapped = true;
  const base = rig.solvePose;
  rig.solvePose = function () {
    base.call(this);
    const T = this.bbPose; if (!T || !this.J || !this.J.shR) return;
    const sz = this.o.size || 1, sh = this.J.shR, L1 = (this.o.armUpper || 9) * sz, L2 = (this.o.armLower || 8) * sz;
    const target = [T[0] * sz, -T[1] * sz, T[2] * sz];
    const [elbow, hand] = E.ik3(sh, target, L1, L2, [-1, .7, -.2]);
    this.J.elbowR = elbow; this.J.handR = hand;
    if (this.bbPoseL && this.J.shL) {   // the clip's left hand (§7.3)
      const tl = [this.bbPoseL[0] * sz, -this.bbPoseL[1] * sz, this.bbPoseL[2] * sz];
      const [el2, h2] = E.ik3(this.J.shL, tl, L1, L2, [-1, -.7, -.2]);
      this.J.elbowL = el2; this.J.handL = h2;
    }
  };
  return rig;
};
/* the dunks' hand keys (§7.3, §10.3): [progress u, target] pairs, interpolated; the hand's path is the dunk's own */
const DUNK_KEYS = {
  hammer: [[0, [4, 3, 16]], [.5, [5, 1, 34]], [.9, [8, 0, 26]]],
  tomahawk: [[0, [4, 3, 16]], [.3, [-2, 3, 42]], [.7, [-2, 2, 44]], [.88, [8, 0, 30]]],
  doublepump: [[0, [4, 3, 16]], [.3, [3, 2, 12]], [.45, [4, 2, 34]], [.6, [3, 2, 12]], [.75, [4, 2, 34]], [.9, [8, 0, 28]]],
  reverse: [[0, [4, 3, 16]], [.4, [-5, 1, 40]], [.7, [-3, 0, 42]], [.9, [6, 0, 30]]],
  windmill: [[0, [4, 3, 16]], [.3, [0, 6, 14]], [.55, [-4, 5, 36]], [.8, [3, 2, 46]], [.9, [8, 1, 30]]],
  threesixty: [[0, [4, 3, 16]], [.3, [3, 4, 30]], [.6, [0, 2, 40]], [.9, [8, 0, 30]]],
  ftflyer: [[0, [4, 3, 16]], [.5, [4, 2, 42]], [.9, [9, 0, 32]]],
  flip: [[0, [4, 3, 16]], [.4, [2, 2, 44]], [.9, [8, 0, 30]]],
  rattler: [[0, [4, 3, 16]], [.6, [5, 1, 38]], [.9, [8, 0, 28]]],
  nova720: [[0, [4, 3, 16]], [.4, [-2, 4, 40]], [.9, [8, 0, 30]]],
  volcano: [[0, [4, 3, 16]], [.5, [-3, 2, 44]], [.9, [9, 0, 30]]],
  quake: [[0, [4, 3, 16]], [.6, [2, 2, 46]], [.9, [9, 0, 26]]]
};
const dunkPoseAt = (kind, u) => {
  const keys = DUNK_KEYS[kind] || [[0, POSE_TARGET.dunk]];
  for (let i = 1; i < keys.length; i++) {
    if (u <= keys[i][0]) { const [u0, a] = keys[i - 1], [u1, b] = keys[i], f = (u - u0) / Math.max(1e-6, u1 - u0); return a.map((v, j) => lerp(v, b[j], f)); }
  }
  return keys[keys.length - 1][1];
};
/** the clip playing for a player now: its dunk, its celebration, or its taunt (time into it) */
const clipOfPlayer = p => {
  if (p.dunk) return { c: dunkBodyClip(p.dunk.kind.id), t: (p.dunk.u || 0) * 1 };
  if (p.celebrate && p.celebrate.t < 1.4) { const c = CLIP_CELEBRATE[p.celebrate.name]; return c ? { c, t: p.celebrate.t } : null; }
  if (p.tauntT > 0 && p.def.taunt && CLIP_TAUNT[p.def.taunt]) return { c: CLIP_TAUNT[p.def.taunt], t: .8 - p.tauntT };
  if (p.passT !== undefined && p.hasBall && CLIP_ACTION.pass) return { c: CLIP_ACTION.pass, t: p.passT };
  if (p.state === 'steal' && CLIP_ACTION.steal) return { c: CLIP_ACTION.steal, t: p.stateT || 0 };
  if (p.state === 'shove' && CLIP_ACTION.shove) return { c: CLIP_ACTION.shove, t: p.stateT || 0 };
  return null;
};
/** the target for a player's state: where the right hand should be this step */
/** a named celebration or taunt (§7.3): the hand's target for its time t (seconds into the move) */
const MOVE_TARGET = (name, t) => {
  switch (name) {
    case 'raiseRoof': return Math.sin(t * 19) > 0 ? [2, 5, 42] : [2, 5, 34];          // palms pump at 3 Hz
    case 'flex': return [1, 6, 30];
    case 'pointSky': return [2, 3, 46];
    case 'airplane': return [0, 12, 24];
    case 'chestPound': return Math.sin(t * 14) > 0 ? [3, 1, 25] : [3, -1, 25];        // fists alternate
    case 'fingerGuns': return [4, 3, 22];
    case 'surfBalance': return [2, 6, 30];
    case 'goggles': return [3, 0, 36];
    case 'fingerWag': return [5, 2, 26];
    case 'shimmy': return [3, 4, 20];
    case 'watchTap': return [4, 2, 22];
    case 'crossArms': return [4, 0, 22];
    case 'blowFingers': return [5, 1, 24];
    case 'pogo': return [2, 2, 32];
    case 'robotDance': return [3, Math.sin(t * 9) * 5, 26];
    case 'robotPop': return [5, 2, 30];
    case 'processing': return [4, 0, 24];
    case 'glitchWave': return [4, Math.sin(t * 30) * 6, 22];
    case 'pointCam': return [6, 0, 24];
    case 'micDrop': return [5, 2, 16];
    case 'chestDrum': return [3, 0, 22];
    default: return null;
  }
};
const poseTargetOf = p => {
  if (p.dunk) return dunkPoseAt(p.dunk.kind.id, p.dunk.u || 0);
  if (p.celebrate && p.celebrate.t < 1.2) { const m = MOVE_TARGET(p.celebrate.name, p.celebrate.t); if (m) return m; }
  if (p.tauntT > 0 && p.def.taunt) { const m = MOVE_TARGET(p.def.taunt, .8 - p.tauntT); if (m) return m; }
  // the wind-ups and strikes (§7.3): a pass pulls the ball back and throws, a steal reaches low, a shove pulls back and pushes
  const T = p.stateT || 0;
  if (p.state === 'steal') return T < .2 ? [2, 3, 10] : [6, 1, 14];
  if (p.state === 'shove') return T < .06 ? [1, 3, 22] : [12, 3, 21];
  if (p.passT !== undefined && T < .2 && p.hasBall) return T < .08 ? [4, 2, 18] : [11, 1, 20];
  if (p.state === 'gather' || p.state === 'jump') return p.hasBall ? POSE_TARGET.shoot : POSE_TARGET.rebound;
  if (p.hasBall && p.state !== 'inbound') return p.dribbleSpeed > 40 || p.turboOn ? POSE_TARGET.dribble : POSE_TARGET.hold;
  if (p.state === 'inbound' || p.hasBall) return POSE_TARGET.hold;
  return POSE_TARGET.guard;
};
/** the ball rides the right hand while it is held or dribbled: x, y from the hand, z from the hand or the dribble's curve */
const ballAtHand = (b, p) => {
  const hp = p.rig.hand('R');
  return hp;
};
