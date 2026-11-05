/* 15-anim: motion capture on the rigs. The game's clip set (vendor/mocap/aoa-clips.js) plays on every fighter through
 * Mocap.drive: a clip replaces the rig's own pose while it plays, and the rig keeps its own build. Clips are chosen by
 * what the player is doing: a point won (the fighter's own celebration), a point lost (a shrug), a dive (a roll), and
 * idles on the title and the menus. */
G.mocapLib = function () {
  if (G._mocap !== undefined) return G._mocap;
  G._mocap = null;
  try { if (typeof Mocap !== 'undefined' && typeof MOCAP !== 'undefined' && MOCAP.AOA) G._mocap = Mocap.load(MOCAP.AOA); } catch (e) { G._mocap = null; }
  return G._mocap;
};
G.CELEB_CLIP = { 'Bow': 'Bow', 'Victory Fist Pump': 'Victory Fist Pump', 'Head Nod': 'Head Nod', 'Dance Charleston': 'Dance Charleston', 'Wave_Hello': 'Wave_Hello', 'Backflip': 'Backflip', 'Cheering_Two_Hands': 'Cheering_Two_Hands', 'Salute': 'Salute' };
/* the clip a fighter plays now, or null for the rig's own pose */
G.mocapClipFor = function (p) {
  if (p.act === 'celebrate') return G.CELEB_CLIP[p.cast.celebration] || 'Victory';
  if (p.act === 'sad') return 'Shrug';
  if (p.act === 'dive' && (p.actT || 0) < .7) return 'Dive_Roll';
  if (p.act === 'block' && (p.actT || 0) < .6) return 'Jumping_Jacks_Loop';
  // the volleyball moves: hand-keyed clips for the bump, the set and the spike
  if (p.act === 'bump' && (p.actT || 0) < .62) return 'Bump';
  if (p.act === 'set' && (p.actT || 0) < .62) return 'Set';
  if (p.act === 'spike' && (p.actT || 0) < 1) return 'Spike';
  if (p.act === 'idle') return p.idleClip || null;
  return null;
};
/* attach the clip driver to a rig once */
G.mocapRig = function (rig) {
  const lib = G.mocapLib();
  if (lib && !rig._mocapOn && typeof Mocap !== 'undefined') { Mocap.drive(rig, lib); rig._mocapOn = true; }
  return rig;
};
/* set a rig's clip for the time t (seconds into the clip); a null clip gives the rig back its own pose */
G.VOLLEY = { Bump: 1, Set: 1, Spike: 1 };
G.mocapLibFor = function (clip) {
  if (!G.VOLLEY[clip]) return G.mocapLib();
  if (G._volley !== undefined) return G._volley;
  G._volley = null;
  try { if (typeof Mocap !== 'undefined' && typeof MOCAP !== 'undefined' && MOCAP.AOAV) G._volley = Mocap.load(MOCAP.AOAV); } catch (e) { G._volley = null; }
  return G._volley;
};
G.mocapSet = function (rig, clip, t) {
  const lib = G.mocapLibFor(clip);
  if (!clip || !lib) { rig.mocap = null; return; }
  const c = lib.clip(clip);
  if (!c) { rig.mocap = null; return; }
  const dur = c.dur || 1;
  rig.mocap = lib.sample(c, c.loop ? t % dur : Math.min(t, dur * .999));
  rig.mocapW = 1;
};
/* arm IK: the hands go to the ball. During a bump, a set, a spike or a serve the rig's arms are solved (two-bone IK, the
 * engine's ik3) to the ball's point in the fighter's frame. The point is worldOffset's inverse: turned back by the facing and
 * scaled back to the rig's own units. */
G.worldToLocal = function (rig, d) {
  const a = rig.facing + rig.spin + (rig._cheat || 0), c = Math.cos(a), s = Math.sin(a), sz = rig.o.size, sq = rig.sq || 0, k = (1 - sq * .4) * sz;
  return [(d[0] * c + d[1] * s) / k, (-d[0] * s + d[1] * c) / k, d[2] / ((1 + sq) * sz)];
};
G.ikRig = function (rig) {
  if (rig._ik) return rig;
  rig._ik = true;
  const base = rig.solvePose;
  rig.solvePose = function () {
    base.call(this);
    const T = this.ikHand, J = this.J;
    if (!T || !J.shR || !J.shL) return;
    const L = G.worldToLocal(this, T), o = this.o;
    for (const s of ['R', 'L']) {
      const [elbow, hand] = E.ik3(J['sh' + s], L, o.armUpper, o.armLower, [-1, s === 'R' ? .7 : -.7, -.2]);
      J['elbow' + s] = elbow; J['hand' + s] = hand;
    }
  };
  return rig;
};
/* the hand target for a player this step, as a world offset from her feet (or null) */
G.ikTargetFor = function (p, L, t) {
  if (!L || !p.rig) return null;
  if (!['bump', 'set', 'spike', 'serve', 'jumpserve'].includes(p.act) || (p.actT || 0) > .35) return null;
  const s = G.flightAt(L, t);
  return [s.x - p.x, s.y - p.y, Math.max(0, s.z) - 0];
};
