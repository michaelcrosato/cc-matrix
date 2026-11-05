/* ANIMATION: each step a player's state becomes the engine rig's own inputs (run, air, down, flip, spin, pose, expr) plus
 * hand targets for the pose layer; the ball rides the hands. The dribble is procedural and synced to the ball: a phase
 * that falls to the floor and back, crossing over when the handler turns hard or a defender reaches the dribble side. */
const keyLerp = (keys, u) => {   // eased interpolation between [u, {R, L, B}] keys
  let a = keys[0], c = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) if (u >= keys[i][0] && u <= keys[i + 1][0]) { a = keys[i]; c = keys[i + 1]; break; }
  const span = c[0] - a[0] || 1, t = E.ease.inOutSine(clamp((u - a[0]) / span, 0, 1)), out = {};
  for (const k of ['R', 'L', 'B']) { const A0 = a[1][k], C0 = c[1][k]; if (A0 && C0) out[k] = [lerp(A0[0], C0[0], t), lerp(A0[1], C0[1], t), lerp(A0[2], C0[2], t)]; else if (A0 || C0) out[k] = (A0 || C0).slice(); }
  return out;
};
const both = (B, w = 1.6) => ({ R: [B[0], B[1] + w, B[2]], L: [B[0], B[1] - w, B[2]] });
/** the celebrations and taunts: hand targets over time */
const MOVES = {
  raiseRoof: t => { const k = Math.sin(t * 19) > 0 ? 42 : 34; return { R: [2, 5, k], L: [2, -5, k] }; },
  chestPound: t => Math.floor(t * 6) % 2 ? { R: [4, -1, 25], L: [3, -4, 18] } : { R: [3, 4, 18], L: [4, 1, 25] },
  flex: () => ({ R: [1, 7, 30], L: [1, -7, 30] }),
  pointSky: () => ({ R: [2, 3, 46], L: [3, -4, 18] }),
  fingerGuns: t => ({ R: [10, 2, 26 + (Math.floor(t * 4) % 2) * 3], L: [10, -2, 26] }),
  surf: t => ({ R: [0, 11, 24 + Math.sin(t * 6) * 3], L: [0, -11, 24 - Math.sin(t * 6) * 3] }),
  goggles: () => ({ R: [6, 1.5, 29], L: [6, -1.5, 29] }),
  fingerWag: t => ({ R: [7, 2 + Math.sin(t * 16) * 2, 34], L: [3, -4, 16] }),
  shimmy: t => ({ R: [4, 5 + Math.sin(t * 20) * 2, 20], L: [4, -5 + Math.sin(t * 20) * 2, 20] }),
  watch: () => ({ R: [6, -1, 22], L: [6, 1, 21] }),
  stoneFace: () => ({ R: [3, -3, 20], L: [3, 3, 20] }),
  blowFingers: () => ({ R: [7, 1, 28], L: [3, -4, 16] }),
  pogo: () => ({ R: [2, 4, 34], L: [2, -4, 34] }),
  robot: t => Math.floor(t * 4) % 2 ? { R: [6, 4, 24], L: [0, -6, 14] } : { R: [0, 6, 14], L: [6, -4, 24] },
  tilt: () => ({ R: [3, 3, 18], L: [3, -3, 18] }),
  glitchWave: t => ({ R: [2, 7, 34 + (Math.floor(t * 12) % 3) * 3], L: [3, -4, 16] }),
  micDrop: t => t < .5 ? { R: [5, 4, 30], L: [3, -4, 18] } : { R: [5, 6, 14], L: [3, -4, 18] },
  pointCam: () => ({ R: [12, 4, 26], L: [3, -4, 18] }),
  gorilla: t => Math.floor(t * 8) % 2 ? { R: [4, -2, 26], L: [3, -5, 22] } : { R: [3, 5, 22], L: [4, 2, 26] }
};
const POSE_HOP = { pogo: t => Math.abs(Math.sin(t * 10)) * 6, gorilla: () => 0, raiseRoof: t => Math.abs(Math.sin(t * 9.5)) * 1.5 };

/** the rig's inputs for p this step, then the ball on its hands */
function poseAndBall(p, dt) {
  const b = S.ball, rig = p.rig, has = b && b.owner === p, st = p.state, sz = rig.o.size;
  let T = null, pose = null, expr = p.expr, air = isAir(p) && st !== 'hang', down = 0, flip = 0, hurt = false, run = 0, land = 0;
  const o = owner(), defending = o && o.team !== p.team && !has;
  // the dribble's phase
  if (has && b.state === 'dribble' && !isAir(p)) {
    const sp = Math.hypot(p.vx, p.vy), hz = sp > 140 ? 3.8 : sp > 30 ? 3 : 2.2, prev = p.dribPh;
    p.dribPh = (p.dribPh + dt * hz) % 1;
    if (prev < .5 && p.dribPh >= .5) { sfxAt('dribble_' + (S.court ? get('court', S.court).dribble : 'maple'), p.x, { vol: .55 }); }
    if (prev > p.dribPh) {   // a new bounce: cross over when turning hard or a defender reaches the dribble side
      const ang = Math.atan2(p.vy, p.vx), turned = sp > 40 && Math.abs(E.angDiff(ang, p.lastAng || ang)) > 1.75;
      const threat = foes(p).some(f => dist2(f, p) < 20 && Math.sign(E.angDiff(p.facing, Math.atan2(f.y - p.y, f.x - p.x))) === p.dribSide);
      if (turned || threat) { p.dribSide = -p.dribSide; p.cross = .25; }
      p.lastAng = ang;
    }
    p.cross = Math.max(0, p.cross - dt);
  }
  switch (st) {
    case 'knocked': down = p.knock > .25 ? Math.min(1, p.st / .15) : Math.max(0, p.knock / .25); hurt = p.st < .3; expr = 'wince'; break;
    case 'dunk': {
      const D = p.dunk, u = D.t / D.T, k = keyLerp(D.def.keys, u);
      T = k.B ? both(k.B) : { R: k.R, L: k.L }; expr = 'shout'; flip = D.def.flip ? clamp((u - .25) / .5, 0, 1) : 0; if (flip >= 1) flip = 0;
      if (D.oop && !has) T = { R: [4, 2, 44], L: [4, -2, 42] };
      break;
    }
    case 'hang': T = both([2, 0, 40], 4); expr = 'shout'; break;
    case 'jumpshot': {
      const j = p.jump, u = clamp(j.t / Math.max(.05, j.apexT), 0, 1.3);
      T = { R: [3, 1, lerp(22, 34, Math.min(1, u))], L: [2.5, -2.2, lerp(22, 31, Math.min(1, u))] }; break;
    }
    case 'layup': { const u = clamp(p.jump.t / p.jump.relT, 0, 1); T = { R: [lerp(5, 7, u), 2, lerp(18, 42, u)], L: [3, -3, 26] }; break; }
    case 'spin': T = { R: [3, 9, 20], L: [3, -9, 22] }; rig.spin = (p.st / .35) * TAU * -p.dribSide; break;
    case 'shove': { const a = p.act, u = a ? a.t : 0; T = u < .08 ? both([3, 0, 20], 3.5) : both([12, 0, 21], 3); expr = 'angry'; break; }
    case 'steal': { const a = p.act, u = a ? a.t / a.T : 0; T = { R: u < .5 ? [lerp(4, 11, u * 2), 2, lerp(18, 13, u * 2)] : [lerp(11, 4, (u - .5) * 2), 2, 14], L: [3, -5, 18] }; break; }
    case 'air': {
      const j = p.jump;
      if (j && j.kind === 'block') { T = j.swatted ? { R: [8, 1, 32], L: [1, -3, 40] } : both([1, 0, 40], 3); expr = 'shout'; }
      else if (j && (j.kind === 'rebound' || j.kind === 'tip')) T = j.kind === 'tip' ? { R: [2, 2, 44], L: [2, -4, 20] } : both([3, 0, 40], 2);
      else if (has) T = both([4, 0, 26]);
      break;
    }
    case 'inbound': T = both([5, 0, 30], 1.8); break;
  }
  // the reboot: frozen with arms out, sparking
  if (p.reboot > 0) { T = { R: [6, 6, 20], L: [6, -6, 22] }; expr = 'wince'; }
  // the ball handler's hands: the dribble, or holding it
  if (has && !T) {
    if (b.state === 'dribble' && !isAir(p)) {
      const s = p.dribSide, u = p.dribPh, f = (2 * u - 1) * (2 * u - 1), hip = rig.o.hipZ, bz = BALL_R / sz + (hip - BALL_R / sz) * f;
      const bl = [5 + (p.cross > 0 ? 0 : 0), s * (p.cross > 0 ? lerp(-6, 6, 1 - p.cross / .25) : 6), bz];
      p._ballLocal = bl;
      const handZ = Math.max(bz + BALL_R / sz + .5, hip + 1 - (1 - f) * 3);
      const handOn = [bl[0], bl[1] + s * .5, handZ], guard = [6, -s * 5, 19];
      T = s > 0 ? { R: handOn, L: guard } : { L: handOn, R: guard };
    } else T = both([5, 0, 18]);
  }
  if (!has) p._ballLocal = null;
  if (!T && defending && dist2(o, p) < 60 && !isAir(p) && st === 'run') { T = both([3, 0, 22], 8); pose = 'crouch'; }
  if (!T && p.celebrate > 0) { T = (MOVES[p.celebKind] || MOVES.pointSky)(1.1 - p.celebrate); expr = 'smile'; }
  if (!T && p.taunt > 0) { const fn = MOVES[p.def.taunt] || MOVES.flex; T = fn(.8 - p.taunt); expr = 'shout'; }
  if (!T && b && !b.owner && b.state === 'pass' && b.pass && b.pass.to === p) {   // reaching for a pass
    T = both([6, 0, clamp((b.z - p.z) / sz, 14, 40)], 2);
  }
  if (p.act && (p.act.kind === 'passChest' || p.act.kind === 'passLob')) {
    p.act.t += dt; const u = clamp(p.act.t / p.act.T, 0, 1), z0 = p.act.kind === 'passLob' ? 22 : 19, z1 = p.act.kind === 'passLob' ? 38 : 20;
    T = both([lerp(4, 11, u), 0, lerp(z0, z1, u)], 1.5); if (p.act.t >= p.act.T) p.act = null;
  }
  // dizzy stars after being posterized show as a wince
  if (p.dizzy > 0 && st !== 'knocked') expr = 'wince';
  const hop = p.taunt > 0 && POSE_HOP[p.def.taunt] ? POSE_HOP[p.def.taunt](.8 - p.taunt) : 0;
  rig.bb.targets = T;
  if (st !== 'spin' && st !== 'dunk') rig.spin = approach(rig.spin, 0, dt * 20);
  if (p.land > 0) land = 1;
  rig.update(dt, { x: p.x, y: p.y, z: p.z + hop, vx: st === 'hang' ? 0 : p.vx, vy: st === 'hang' ? 0 : p.vy, facing: p.facing, air: air && st !== 'hang', down, flip, hurt, pose, expr, land, run });
  // the ball rides the hands
  if (has) {
    if (b.state === 'dribble' && p._ballLocal && !isAir(p)) { const w = rigPoint(rig, p._ballLocal); b.x = w[0]; b.y = w[1]; b.z = Math.max(BALL_R, w[2]); }
    else {
      const R = handWorld(rig, 'R'), Lh = handWorld(rig, 'L'), oneHand = st === 'dunk' && p.dunk.def.ball === 'R' && !(p.dunk.def.keys[0][1].B);
      const at = oneHand || st === 'layup' || st === 'jumpshot' ? R : [(R[0] + Lh[0]) / 2, (R[1] + Lh[1]) / 2, (R[2] + Lh[2]) / 2];
      b.x = at[0]; b.y = at[1]; b.z = at[2] + (st === 'jumpshot' || st === 'layup' || (st === 'dunk' && oneHand) ? BALL_R : 0);
    }
    b.vx = p.vx; b.vy = p.vy; b.vz = 0;
  }
}
