/* 40-hero: the ninja, driven by an intent (from the player's input, the autopilot or a test). Traversal (run, walk,
 * crouch-sneak, sprint, parkour, swim, dive, wall hug and peek, body dragging), exposure (light, cover, motion), noise
 * (by surface), and the hooks into Silent Cuts, combat, the grapple and the tools. */
def('character', 'sojiro', { name: 'Sojiro', weapon: 'Katana', hp: 100, dmg: 1.2, atkSpeed: 1, block: .85, cutSpeed: 1, pull: 1, noise: 1, run: 0, combo: ['slash', 'backslash', 'overhead'], comboDmg: [14, 14, 24],
  bars: [4, 2, 3], line: 'Steady and dutiful. A long blade and a longer patience.', greet: 'We are ready, Master.', voice: 'sojiro', crest: '#b0302a' });
def('character', 'kaede', { name: 'Kaede', weapon: 'Twin kodachi', hp: 80, dmg: .85, atkSpeed: 1.25, block: .7, cutSpeed: 1.25, pull: 1.15, noise: .8, run: 7, combo: ['thrust', 'backslash', 'spin'], comboDmg: [9, 9, 18],
  bars: [2, 4, 4], line: 'Quick and sharp-tongued. Two short blades, no patience at all.', greet: 'Finally. Six years of folding boxes.', voice: 'kaede', crest: '#2a8a8a' });
def('character', 'trial', { name: 'Shadow', weapon: 'Katana', hp: 100, dmg: 1.2, atkSpeed: 1, block: .85, cutSpeed: 1, pull: 1, noise: 1, run: 0, combo: ['slash', 'backslash', 'overhead'], comboDmg: [14, 14, 24], voice: 'sojiro' });
const SURF_NOISE = { gravel: 1.6, boards: 1.2, door: 1.2, tatami: .6, shallow: 1.4 };
const STEP_SFX = { gravel: 'stepGravel', boards: 'stepWood', door: 'stepWood', tatami: 'stepTatami', shallow: 'splash', deep: 'splash' };

B.makeHero = (W, charId, at, o = {}) => {
  const C = get('character', o.stats || charId) || get('character', 'sojiro');
  const h = new E.Mover({ x: at.x, y: at.y, z: at.z || 0, r: 5, climbAny: false, climbMax: 30, vault: 14, hopMax: 48, staminaMax: 100, jumpSpeed: 220 });
  Object.assign(h, { isHero: true, char: charId, C, hpMax: Math.round(C.hp * B.T('heroHpMul')), facing: at.facing || 0, rig: o.rig || (B.RIGS[charId] || B.RIGS.sojiro)(),
    swim: false, dive: false, breath: B.T('breath'), hug: null, hugT: 0, peek: null, drag: null, focus: false, eatT: 0, eatTool: null, cloakT: 0, softT: 0, iframes: 0, hurtT: 0, stepT: 0,
    exposure: 1, noiseT: 0, blockT: -9, parryT: -9, grappleHold: -1, aimAnchor: null, anchor: null, holdT: 0, holdTarget: null, dead: false, combo: null, comboT: 0, comboHit: new Set(), damaged: false });
  h.hp = h.hpMax;
  h.combo = new E.Combo(C.combo.map(m => new E.Attack(m, { reach: 9 })), { window: .3 });
  h.rig.solvePose = (base => function () { base.call(this); B.postPose(this); })(h.rig.solvePose);
  return h;
};
/* joint post-processing for the new poses: the ninja run (arms swept back), the wall hug, swimming strokes, eating */
B.postPose = rig => {
  const J = rig.J, p = rig._bentou; if (!J || !p) return;
  if (p.ninjaRun > .01 && J.handL && J.handR) { const k = p.ninjaRun; for (const [hd, el] of [['handL', 'elbowL'], ['handR', 'elbowR']]) { if (rig._atkW > .1 && hd === 'handR') continue; J[hd] = [lerp(J[hd][0], -5, k), J[hd][1], lerp(J[hd][2], J[hd][2] + 2, k)]; if (J[el]) J[el] = [lerp(J[el][0], -3, k), J[el][1], J[el][2]]; } }
  if (p.hug > .01 && J.handL) { const k = p.hug; for (const hd of ['handL', 'handR']) J[hd] = [lerp(J[hd][0], -2.5, k), J[hd][1] * 1.2, J[hd][2]]; }
  if (p.swim > .01 && J.handL) { const ph = p.phase || 0, k = p.swim; J.handL = [lerp(J.handL[0], 6 * Math.sin(ph), k), J.handL[1], lerp(J.handL[2], 14 + 4 * Math.cos(ph), k)]; J.handR = [lerp(J.handR[0], -6 * Math.sin(ph), k), J.handR[1], lerp(J.handR[2], 14 - 4 * Math.cos(ph), k)]; }
  if (p.eat > .01 && J.handR && J.head) { const k = p.eat; J.handR = [lerp(J.handR[0], J.head[0] + 2, k), lerp(J.handR[1], J.head[1], k), lerp(J.handR[2], J.head[2] - 2 + Math.sin(rig.t * 14), k)]; }
  if (p.handsUp > .01 && J.handL) { const k = p.handsUp; for (const hd of ['handL', 'handR']) J[hd] = [lerp(J[hd][0], 1, k), J[hd][1] * .6, lerp(J[hd][2], J.head ? J.head[2] + 6 : 30, k)]; }
};

/* exposure for E.sees: light, cover, motion, crouch (the engine's built-in .6 for crouching becomes the slider's value) */
B.exposureOf = (h, W) => {
  if (h.dive) return 0;
  const L = W.lightAt(h.x, h.y), lightF = lerp(1 - B.T('darkness'), 1, L);
  let cover = 1; if (h.z < 2 && W.isHide(h.x, h.y)) cover = h.crouch ? .15 : .6; if (h.hug) cover = Math.min(cover, .6); if (h.cloakT > 0) cover = Math.min(cover, .15); if (h.swim) cover = 1;
  const sp = Math.hypot(h.vx, h.vy), motion = sp < 5 ? .75 : h.sprinting ? 1.3 : sp > 70 ? 1.15 : 1;
  return clamp(lightF * cover * motion * (h.crouch ? B.T('crouchVis') / .6 : 1), 0, 1.5);
};
B.noise = (x, y, z, loud, kind = 'noise', src = null) => {
  const M = B.mission; if (!M || loud <= 0) return;
  M.noises.push({ x, y, z, loud, kind, t: 0 });
  for (const g of M.guards) if (g.alive && g !== src) g.hearNoise({ x, y, z: z || 0, loud }, kind);
  B.emit('noise', { x, y, z, loud, kind });
};

B.heroUpdate = (h, dt, I, M) => {
  const W = M.world, G = B.game;
  h.hurtT = Math.max(0, h.hurtT - dt); h.iframes = Math.max(0, h.iframes - dt); h.cloakT = Math.max(0, h.cloakT - dt); h.softT = Math.max(0, h.softT - dt); h.comboT += dt;
  if (h.dead) { h.update(dt, W.map, { move: [0, 0] }); return; }
  const deep = h.z <= 2 && W.isDeep(h.x, h.y), act = h.action;
  // crouch: toggle (or hold, in Settings); in deep water crouch dives
  const holdMode = G.settings.crouchMode === 'hold' && !M.auto;
  if (!act) { if (holdMode) h.crouch = I.crouchDown; else if (I.crouchPressed && !h.hug) h.crouch = !h.crouch; }
  if (h.hug && I.crouchPressed) { h.hug = null; h.crouch = !holdMode; }
  h.swim = deep && !act; h.dive = h.swim && h.crouch;
  if (h.swim && !h._wasSwim) { B.sfxAt('splash', h.x, h.y); P.bits(h.x, h.y, 2, 8, ['#8ab8d8', '#4a7aa0', '#ffffff']); B.noise(h.x, h.y, 0, 30, 'splash'); if (h.drag) B.dropBody(h, M); }
  if (h.dive && !h._wasDive) B.sfxAt('dive', h.x, h.y); h._wasSwim = h.swim; h._wasDive = h.dive;
  if (h.dive) { h.breath -= dt; if (h.breath <= 0) { h.breath = 0; h._drown = (h._drown || 0) + dt; if (h._drown > .5) { h._drown = 0; B.damage(null, h, 4, { kind: 'drown', pierce: true }); } } if (crand() < dt * 3) P.add({ kind: 'glint', x: h.x + (crand() - .5) * 6, y: h.y, z: 2, vz: 20, life: .6, color: '#cfe8ff' }); }
  else h.breath = Math.min(B.T('breath'), h.breath + dt * 3);
  // movement intent, shaped by state
  let move = I.move.slice(), ml = Math.hypot(move[0], move[1]);
  h.focus = I.focusDown && !h.swim;
  const slow = h.focus || I.walk;
  if (slow && ml > .5) { move[0] *= .5 / ml; move[1] *= .5 / ml; ml = .5; }
  if (h.eatT > 0) { h.eatT -= dt; move = [0, 0]; if (h.eatT <= 0) B.finishEat(h); }
  const Cm = h.C, softMul = h.softT > 0 ? 0 : 1;
  h.run = B.T('heroRun') + Cm.run; h.sneak = B.T('heroSneak'); h.sprintSpeed = B.T('heroSprint') + Cm.run; h.walk = 50;
  if (h.swim) { h.run = h.walk = h.sneak = h.dive ? 24 : 30; h.sprintSpeed = h.run; }
  if (h.drag) { h.run = h.walk = h.sneak = h.sprintSpeed = 24; }
  if (h.cloakT > 0 && I.sprint) h.cloakT = 0;
  // wall hug: crouched and pushing into a face for .2 s; then the stick moves along it only
  if (!act && h.crouch && !h.swim && !h.drag && h.onGround) {
    if (h.hug) {
      const n = h.hug, along = [-n.ny, n.nx], dot = move[0] * n.nx + move[1] * n.ny;
      if (dot > .6) { h.hug = null; }
      else {
        const a = move[0] * along[0] + move[1] * along[1]; move = [along[0] * a * .75, along[1] * a * .75];
        const ahead = Math.abs(a) > .05 ? Math.sign(a) : (h.peek ? h.peek.dir : 0);
        const probe = ahead ? { x: h.x + along[0] * ahead * 9, y: h.y + along[1] * ahead * 9, z: h.z, r: 3 } : null;
        const wl = probe ? W.map.wall(probe, [-n.nx, -n.ny], { reach: 10 }) : true;
        if (probe && !wl) { h.peek = { dir: ahead, x: h.x + along[0] * ahead * 10, y: h.y + along[1] * ahead * 10, z: h.z }; if (Math.abs(a) > .05) move = [0, 0]; }
        else h.peek = null;
        h.facing = Math.atan2(along[1] * (ahead || 1), along[0] * (ahead || 1));
      }
    } else if (ml > .5) {
      const wl = W.map.wall(h, move, { reach: 8 });
      if (wl && wl.top > 20) { h.hugT += dt; if (h.hugT > .2) { h.hug = { nx: wl.nx, ny: wl.ny }; h.hugT = 0; B.sfx('stepTatami'); } } else h.hugT = 0;
    } else h.hugT = 0;
  } else { h.hug = null; h.peek = null; h.hugT = 0; }
  // combat and actions
  const busy = !!act || h.eatT > 0 || h.combo.busy;
  if (!act) B.heroActions(h, dt, I, M, busy);
  // grapple targeting and aiming
  B.grappleUpdate(h, dt, I, M);
  // move the body
  const atk = h.combo.busy && !h.combo.active ? .25 : h.combo.busy ? 0 : 1;
  const jump = I.jumpPressed && !h.drag && h.eatT <= 0 && !h.combo.busy && !(I.blockDown && ml > .3);
  const blockMove = I.blockDown && !h.swim ? .35 : 1;
  h.update(dt, W.map, { move: [move[0] * atk * blockMove, move[1] * atk * blockMove], sprint: I.sprint && !h.swim && !h.drag && !h.crouch && !h.focus, crouch: h.crouch, jumpPressed: jump && !h.hug });
  if (h.combo.busy && I.aimPoint) h.facing = Math.atan2(I.aimPoint.y - h.y, I.aimPoint.x - h.x);
  if (h.drag) B.dragUpdate(h, M);
  // falls, hazards, out of the map
  if (h.hurt) { B.damage(null, h, 15, { kind: 'fall', pierce: true }); }
  if (h.landed || (h.fell > 1 && h.onGround)) { const f = h.fell || 0; if (f > 6) { const rolled = h.action && h.action.name === 'roll'; B.noise(h.x, h.y, h.z, rolled ? 20 : f > 26 ? 50 : 25, 'land'); P.dust(h.x, h.y, h.z, 4); } }
  if (h.inHazard || h.x < 0 || h.y < 0 || h.x > W.w * CELL || h.y > W.h * CELL) { h.respawn(); h.inHazard = false; B.damage(null, h, 10, { kind: 'fall', pierce: true }); }
  // footsteps: noise by surface, speed and character
  const sp = Math.hypot(h.vx, h.vy);
  if (h.onGround && sp > 20 && !act) {
    h.stepT -= dt * sp / 34;
    if (h.stepT <= 0) {
      h.stepT = 1; const surf = W.floorAt(h.x, h.y), onTop = h.z > 4, mul = (onTop ? 1 : SURF_NOISE[surf] || 1) * Cm.noise;
      let loud = 0;
      if (h.swim) loud = h.dive ? 0 : 15;
      else if (h.drag) loud = 10;
      else if (h.crouch || sp < 55) loud = surf === 'gravel' && !onTop && h.crouch ? 12 : 0;
      else if (h.sprinting) loud = (h.softT > 0 ? 30 : 110) * mul;
      else loud = B.T('noiseRun') * mul * softMul;
      if (surf === 'shallow' && !onTop) loud = Math.max(loud, 40);
      if (loud > 0) B.noise(h.x, h.y, h.z, loud, 'step');
      const sfx = onTop ? (h.z > 30 ? 'stepWood' : 'stepDirt') : STEP_SFX[surf] || 'stepDirt';
      if (!h.dive && (loud > 0 || sp > 40)) B.sfx(sfx, { vol: h.crouch ? .4 : .9 });
    }
  }
  h.exposure = B.exposureOf(h, W);
  // the rig
  const R = h.rig, bp = R._bentou || (R._bentou = {}), running = sp > 70 && h.onGround && !h.crouch && !h.swim && !h.combo.busy;
  bp.ninjaRun = approach(bp.ninjaRun || 0, running ? 1 : 0, dt * 6); bp.hug = approach(bp.hug || 0, h.hug ? 1 : 0, dt * 8); bp.swim = approach(bp.swim || 0, h.swim ? 1 : 0, dt * 6); bp.phase = (bp.phase || 0) + dt * (sp > 5 ? 6 : 2);
  bp.eat = approach(bp.eat || 0, h.eatT > 0 ? 1 : 0, dt * 8); bp.handsUp = approach(bp.handsUp || 0, act && act.name === 'grapple' && act.beat === 'pull' ? 1 : 0, dt * 10);
  const st = h.rigState({ attack: h.combo.state, pose: h.dead ? 'die' : I.blockDown && !act && !h.swim ? 'block' : h.eatT > 0 ? 'crouch' : null, hurt: h.hurtT > 0, expr: h.hurtT > 0 ? 'wince' : null });
  if (h.swim) { st.down = h.dive ? .85 : .6; st.crouch = false; }
  if (h.drag) { st.crouch = true; }
  R.update(dt, st);
};
/* the hero's own presses: strike / Silent Cut / riposte, block and parry, roll, interact, tools, heal, whistle */
B.heroActions = (h, dt, I, M, busy) => {
  const G = B.game, ml = Math.hypot(I.move[0], I.move[1]);
  if (I.toolDelta) B.Bento.cycle(M, I.toolDelta);
  if (I.toolSlot) B.Bento.pick(M, I.toolSlot - 1);
  if (I.blockPressed) { h.parryT = G.time; B.tryParry(h, M); }
  if (I.blockDown && I.jumpPressed && ml > .3 && !h.swim && h.onGround && !h.drag) { if (h.dodge(Math.atan2(I.move[1], I.move[0]), 34)) { B.sfx('whoosh'); h.iframes = .45; } return; }
  h.combo.update(dt);
  if (h.combo.busy) B.heroHits(h, M);
  if (I.attackPressed && h.eatT <= 0) {
    if (h.drag) B.dropBody(h, M);
    else if (!B.tryCut(h, M) && !B.tryRiposte(h, M) && !h.swim) {
      const tgt = I.aimPoint ? null : E.targets(h, M.guards.filter(g => g.alive && !g.civilian), { range: 40, sight: M.world.map })[0];
      if (I.aimPoint) h.facing = Math.atan2(I.aimPoint.y - h.y, I.aimPoint.x - h.x); else if (tgt) h.facing = tgt.angle;
      if (h.combo.press()) { h.comboHit = new Set(); h.comboT = 0; B.sfx('whoosh', { vol: .6 }); }
    }
  }
  if (busy) return;
  if (I.interactPressed) B.interact(h, M, true);
  B.holdInteract(h, dt, I, M);
  if (I.usePressed && !h.swim) B.Bento.use(h, M, I);
  if (I.healPressed) B.Bento.eatRiceBall(h, M);
  if (I.lurePressed && !h.dive) { B.sfx('whistle'); B.noise(h.x, h.y, h.z, 70, 'whistle'); M.toast('Whistle', 'Nearby guards come to look'); }
};
/* bodies: drag one under the arms; drop it in water (it sinks) or in grass and shadow (hidden) */
B.nearBody = (h, M) => M.guards.find(g => !g.alive && !g.sunk && !g.carried && !g.boss && Math.hypot(g.x - h.x, g.y - h.y) < 16 && Math.abs(g.z - h.z) < 8) || M.guards.find(g => g.asleep && !g.boss && Math.hypot(g.x - h.x, g.y - h.y) < 16);
B.dragUpdate = (h, M) => {
  const b = h.drag; if (!b) return;
  const bx = h.x - Math.cos(h.facing) * 14, by = h.y - Math.sin(h.facing) * 14;
  b.x = approach(b.x, bx, 200 / 120); b.y = approach(b.y, by, 200 / 120); b.z = M.world.map.groundAt(b.x, b.y, 3, h.z + 2) || 0; b.facing = h.facing + Math.PI;
};
B.dropBody = (h, M) => {
  const b = h.drag; if (!b) return; h.drag = null; b.carried = false; B.sfxAt('bodyDrop', b.x, b.y);
  const W = M.world;
  if (W.isDeep(b.x, b.y)) { b.sunk = true; B.sfxAt('splash', b.x, b.y); P.bits(b.x, b.y, 2, 10, ['#8ab8d8', '#ffffff']); M.toast('The water keeps it', 'The body sinks out of sight'); }
  else if (W.isHide(b.x, b.y) || W.lightAt(b.x, b.y) < .3) M.toast('Hidden', 'No one will find it here');
};
