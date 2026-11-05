/* ---- THE STEP (plan §4.3): one 1/120 s step of a match. 1 commands (each slot's source writes its command: a human's
 * device, a CPU brain, the network or a script), 2 players (state, movement, the shot's gather and jump, the rig), 3 the
 * ball (attached to its owner, or flying), 4 the match (clocks, phases, inbounds), 5 the events (delivered at once by emit),
 * 6 the camera. Commands are the only way a player is driven: humans, brains, the net and tests all go through them. ---- */
const HIP = 20, GATHER_T = .08, SHOT_RELEASE_LATE = .25;

/** a human's command from its input: the stick on the ground (the screen's direction turned by the view), the buttons */
const humanCmd = p => {
  const I = p.input, c = emptyCmd(), mv = I.move();
  const g = game.view.screenDirToGround(mv[0], mv[1]) || [mv[0], mv[1]];
  c.move = [g[0], g[1]];
  c.shoot = { down: I.down('shoot'), pressed: I.pressed('shoot'), released: I.released('shoot') };
  c.pass = { pressed: I.pressed('pass') };
  c.turbo = { down: I.down('turbo') };
  c.shove = { pressed: I.pressed('shove') };
  c.oop = { pressed: I.pressed('oop') };
  c.taunt = { pressed: I.pressed('taunt') };
  if (c.pass.pressed) I.consume('pass');
  if (c.shove.pressed) I.consume('shove');
  if (c.oop.pressed) I.consume('oop');
  if (c.shoot.pressed) I.consume('shoot');
  return c;
};

/** the shot machine: gather, then the jump; the release is the shooter's (the button, or the brain's timed one), and a
 * jump that is not released is released .25 s after its top */
const startShot = p => { p.state = 'gather'; p.stateT = 0; p.shot = { phase: 'gather', jt: 0, apexT: 0, plan: p.nextShotPlan || 0, kind: 'jump' }; p.nextShotPlan = 0; };
const shotStep = (p, dt) => {
  const sh = p.shot; sh.t = (sh.t || 0) + dt;
  if (sh.phase === 'gather') {
    if (sh.t >= GATHER_T) {
      const v = tune('jumpShotVz') + 10 * rate(p, 'swat');
      p.body.jump(v); p.air = true; p.jumping = true;
      sh.phase = 'jump'; sh.jt = 0; sh.apexT = v / tune('playerGravity');
      p.state = 'jump';
    }
    return;
  }
  if (sh.phase === 'jump') {
    sh.jt += dt;
    const released = p.human ? p.cmd.shoot.released : sh.jt >= sh.apexT + sh.plan;
    if (released || sh.jt >= sh.apexT + SHOT_RELEASE_LATE) {
      if (p.hasBall) releaseShot(p, sh.jt - sh.apexT, sh.kind);
      sh.phase = 'done'; p.shot = null;
    }
  }
};

/** a player's state step: knocked (down for a time), a shot in its gather or jump, or running (the stick, the ball's
 * handling, the pass). The motion is the body's; the rig is posed from the state. */
const playerStep = (p, dt) => {
  const c = p.cmd, b = p.body;
  powerTick(p, dt);
  p.stateT += dt;
  p.lastStep = S.match ? S.match.t : 0;
  if (p.knocked > 0) {
    p.knocked = Math.max(0, p.knocked - dt);
    b.vx = approach(b.vx, 0, 900 * dt); b.vy = approach(b.vy, 0, 900 * dt);
    if (p.knocked === 0) { p.state = 'run'; p.stateT = 0; }
    b.gravity = tune('playerGravity'); b.update(dt, S.map); clampToArena(p);
    p.rig.update(dt, rigState(p, { pose: 'down', down: 1 }));
    return;
  }
  if (p.dunk) { dunkStep(p, dt); clampToArena(p); p.rig.update(dt, rigState(p)); return; }
  if (p.hang > 0) { p.hang = Math.max(0, p.hang - dt); if (p.hang === 0) { p.air = false; } }
  if (p.spinT > 0) p.spinT = Math.max(0, p.spinT - dt);
  if (p.cool.steal >= 0 && p.state === 'steal' && p.stateT > .2) p.state = 'run';
  if (p.state === 'shove' && p.stateT > .14) p.state = 'run';
  actionsFromCmd(p);
  if (p.state === 'spin' && p.spinT <= 0) p.state = 'run';
  if (p.passT !== undefined) { p.passT += dt; if (p.passT > .2) p.passT = undefined; }
  if (p.celebrate) { p.celebrate.t += dt; if (p.celebrate.t >= 1.4) p.celebrate = null; }
  if (p.tauntT > 0) { p.tauntT -= dt; if (p.tauntT <= 0) { p.tauntT = 0; if (p.state === 'taunt') p.state = 'run'; } }
  // the stick's walk (no walking while a shot leaves the floor, except in the air)
  const shooting = p.state === 'gather' || p.state === 'jump';
  const sp = playerSpeed(p), mv = c.move, m = Math.hypot(mv[0], mv[1]);
  const moving = m > .15 && !shooting;
  turboStep(p, dt, moving);
  p.juice = Math.max(0, p.juice - (.004 + (p.turboOn ? .01 : 0)) * dt * tune('fatigue'));   // §6.14: juice falls on court, faster on turbo
  const onSlick = (S.twist.slicks || []).some(s => Math.hypot(b.x - s.x, b.y - s.y) < s.r);   // §10.1: a slick cuts the acceleration to .15 (the player slides)
  const accelK = onSlick ? .15 : 1;
  const want = moving ? sp * Math.min(1, m) : 0;
  const tx = moving ? mv[0] / (m || 1) * want : 0, ty = moving ? mv[1] / (m || 1) * want : 0;
  if (!shooting) {
    b.vx = approach(b.vx, tx, tune('accel') * accelK * dt); b.vy = approach(b.vy, ty, tune('accel') * accelK * dt);
  } else if (b.z > 0) { b.vx *= Math.exp(-dt * .6); b.vy *= Math.exp(-dt * .6); }
  else { b.vx = approach(b.vx, 0, 600 * dt); b.vy = approach(b.vy, 0, 600 * dt); }
  if (m > .2 && !shooting) p.face = E.approachAng(p.face, Math.atan2(mv[1], mv[0]), dt * 12);
  if (p.face === undefined) p.face = 0;
  if (p.shot && p.state === 'gather' || p.state === 'jump' && p.shot) shotStep(p, dt);
  if (p.state === 'jump' && p.shot && p.shot.phase === 'done') { p.state = 'run'; p.shot = null; p.jumping = false; }
  if (p.state === 'jump' && !p.shot) { p.reachJump = (p.reachJump || 0) - dt; if (p.reachJump <= 0 && b.z <= 1) { p.state = 'run'; p.jumping = false; } }
  if (p.state === 'gather' && !p.hasBall) { p.state = 'run'; p.shot = null; }
  if (p.hasBall && p.state === 'run') { p.dribbleSpeed = Math.hypot(b.vx, b.vy); }
  b.gravity = tune('playerGravity') * (S.cheats && S.cheats.moonGravity ? .55 : 1);   // MOON GRAVITY (the code): players and the ball fall at .55
  b.update(dt, S.map);
  clampToArena(p);
  if (b.z <= 1 && p.air && b.vz <= 0) { p.air = false; p.jumping = false; if (p.state === 'jump' && !p.shot) p.state = 'run'; emit('land', { slot: p.slot, x: b.x, y: b.y }); }
  p.z = b.z;
  p.rig.update(dt, rigState(p));
};

/** the rig's state for a player (plan §7): feet, facing, velocity; a jump tucks the legs, a knock lies it down */
const rigState = (p, extra = {}) => {
  const b = p.body;
  if (p.rig && !clipOfPlayer(p)) { p.rig.bbPose = poseTargetOf(p); p.rig.bbPoseL = null; p.rig.o.lean = 0; }
  let pose = p.state === 'gather' ? 'crouch' : null;
  let hop = 0;
  const clip = clipOfPlayer(p);   // the body clip of a celebration, a taunt or a dunk (§7.3)
  if (clip) { const k = sampleClip(clip.c, clip.t); pose = k.pose; hop = k.z; if (p.rig) { p.rig.bbPose = k.R; p.rig.bbPoseL = k.L; p.rig.o.lean = k.lean; } if (k.kick && p.rig) p.rig.kick(k.kick * .2); }
  if (p.dunk) { const u = p.dunk.u || 0; pose = u < .12 ? 'crouch' : u > .9 ? 'cheer' : null; }   // the body of a dunk: crouch to leave, cheer after the slam
  return Object.assign({ x: b.x, y: b.y, z: b.z + hop, vx: b.vx, vy: b.vy, facing: p.face, air: p.air, pose, run: Math.min(1, Math.hypot(b.vx, b.vy) / 120), stance: p.hasBall ? null : 'guard', flip: p.dunk && p.dunk.flip ? p.dunk.flip : 0 }, extra);
};

/** the ball's handling: held (hands at the chest), dribbled (the ball's phase from the speed: 2.2 Hz standing, 3 running,
 * 3.8 on turbo: the ball leaves the hand to the floor and back, §7.2), or the inbound's (at the thrower's chest) */
const ballAttach = (b, dt) => {
  const p = b.owner; if (!p) return;
  const sz = p.size || 1, f = p.face, px = -Math.sin(f), py = Math.cos(f);
  if (p.dunk) { b.x = p.body.x; b.y = p.body.y; b.z = p.body.z + 46 * sz; b.state = 'held'; b.vx = b.vy = b.vz = 0; return; }   // the ball rides the hands in the dunk
  const sp = Math.hypot(p.body.vx, p.body.vy);
  if (b.state === 'inbound' || (b.state === 'held' && sp < 15)) {
    b.state = b.state === 'inbound' ? 'inbound' : 'held';
    const hp = p.rig.hand('R'); b.x = hp[0]; b.y = hp[1]; b.z = hp[2] + 2; b.vx = b.vy = b.vz = 0;
    return;
  }
  b.state = 'dribble';
  const rate2 = p.turboOn ? 3.8 : sp > 60 ? 3.0 : 2.2;
  p.dribbleT = (p.dribbleT || 0) + dt * rate2;
  const phi = p.dribbleT % 1, s = Math.sin(Math.PI * phi);
  const hand = p.dribbleHand || 1;
  const hp = p.rig.hand('R');   /* the dribble rides the hand's x and y (the pose layer put it where the ball is) */
  b.x = hp[0] + px * 0 * hand; b.y = hp[1] + py * 0 * hand;
  b.z = BALL_R + (HIP * sz - BALL_R) * (1 - s * s);
  b.vx = p.body.vx; b.vy = p.body.vy; b.vz = 0;
  if (phi < .5 && s > .0 && Math.floor(p.dribbleT) !== (p.dribbleFloor || 0)) { p.dribbleFloor = Math.floor(p.dribbleT); emit('dribble', { slot: p.slot, x: b.x, y: b.y }); }
};

/** one match step: the whole of §4.3 in order */
const matchStep = dt => {
  const m = S.match; if (!m) return;
  // 1: commands
  for (const p of S.players) {
    if (!p.onCourt) continue;
    p.cmd = p.human ? humanCmd(p) : (p.brain && !S.cheats.cpuPassive ? brainCmd(p, dt) : emptyCmd());   // (CPU PASSIVE: the dev panel)
  }
  // 2: players
  for (const p of S.players) if (p.onCourt) playerStep(p, dt);
  // 3: the ball: attached or flying; then the loose ball's pickups
  const b = S.ball;
  if (b.owner) ballAttach(b, dt);
  else ballStep(b, dt);
  if (!b.owner && b.state !== 'dead' && b.state !== 'inbound') for (const p of S.players) if (p.onCourt && reachBall(p)) break;
  if (b.state === 'shot') for (const p of S.players) if (p.onCourt && Math.hypot(b.x - p.body.x, b.y - p.body.y) < 30 && goaltendCheck(p)) break;
  // 4: the match's rules, the twists and the power-ups
  matchRules(dt);
  twistStep(dt);
  powerupStep(dt);
  // 5/6: the hoops, the camera (in fx)
  stepHoops(dt);
  novaStep(dt);
  S.lastStep = m.t;
};

/** Supernova (§6.12): ignites for a player when the team has a run of baskets; ends after the other side scores, after
 * novaMaxBaskets more baskets, or after novaTime seconds of game clock */
const igniteNova = p => {
  p.nova = true; p.novaT = 0; p.novaBaskets = 0; p.stats.novas++;
  emit('supernovaOn', { slot: p.slot, side: p.side });
};
const endNova = (p, why) => { if (!p.nova) return; p.nova = false; emit('supernovaOff', { slot: p.slot, why }); };
const novaStep = dt => {
  for (const p of S.players) {
    if (!p.nova) continue;
    p.novaT += dt;
    if (p.novaT >= tune('novaTime') || (p.novaBaskets || 0) >= tune('novaMaxBaskets')) endNova(p, 'time');
  }
};
