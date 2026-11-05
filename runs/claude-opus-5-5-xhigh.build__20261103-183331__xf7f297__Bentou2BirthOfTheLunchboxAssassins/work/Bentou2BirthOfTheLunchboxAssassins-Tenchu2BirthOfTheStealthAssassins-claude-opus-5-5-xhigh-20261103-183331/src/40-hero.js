/* ---- THE HERO: an E.Mover driven only by an intent (the player's, the autopilot's or a test's). Traversal is the
 * Mover's parkour (ledges up to 30, vaults, gap leaps, hop-downs; roofs need the grapple), plus swimming and diving,
 * the wall hug and peek, dragging bodies, the dodge roll, eating, the whistle and the noise every step makes ---- */
const CHARS = {
  sojiro: { name: 'Sojiro', hp: 100, dmg: 1.2, atk: 1, block: .85, cut: .9, pull: 1, noise: 1, runAdd: 0, combo: ['slash', 'backslash', 'overhead'], comboDmg: [14, 14, 24], voice: 'sojiro', weapon: 'Katana',
    bars: [.85, .6, .65], blurb: 'Steady and strong. His katana hits hard and his guard holds.' },
  kaede: { name: 'Kaede', hp: 80, dmg: .85, atk: 1.25, block: .7, cut: .7, pull: 1.15, noise: .8, runAdd: 7, combo: ['thrust', 'backslash', 'spin'], comboDmg: [9, 9, 18], voice: 'kaede', weapon: 'Twin kodachi',
    bars: [.55, .9, .9], blurb: 'Quick and quiet. Two short blades, light feet, a sharp tongue.' }
};
B.CHARS = CHARS;
const Hero = {};
Hero.make = (charId, at, M) => {
  const C = CHARS[charId] || CHARS.sojiro, trial = M.mode === 'trial' || M.mode === 'hub', stats = trial ? CHARS.sojiro : C;
  const h = Actor.make({ kind: 'hero', id: 'hero', x: at.x, y: at.y, z: at.z || 0, facing: at.facing || 0, team: 'hero', hp: Math.round(stats.hp * T('heroHpMul')),
    rig: Rigs.make(charId === 'kaede' ? 'kaede' : 'sojiro'),
    body: { climbAny: false, climbMax: 30, vault: 14, hopMax: 48, staminaMax: 100, jumpSpeed: 220, walk: 50 } });
  Object.assign(h, { char: charId, C: stats, look: C, crouchHeld: false, swim: false, dive: false, breath: T('breath'), hug: null, hugT: 0, peek: null, drag: null, eatT: 0,
    combo: new E.Combo(stats.combo.map(n => new E.Attack(n, { wind: E.MOVES[n].wind / stats.atk, recover: E.MOVES[n].recover / stats.atk })), { window: .3 }),
    jumpAtk: null, blocking: false, parryT: 9, softT: 0, cloakT: 0, sel: 0, bento: [], noiseT: 0, stepD: 0, dead: false, deadT: 0, aim: null, drawZ: undefined, cutsAt: 0, lastLand: 0 });
  h.tire = Object.assign({}, h.tire, { sprint: 20 });
  h.rig.update(0, h.rigState());
  return h;
};
/** apply the live tuning to the hero's speeds (the sliders take effect on the next step) */
Hero.tune = h => { const add = h.C.runAdd || 0; h.run = T('heroRun') + add; h.sneak = T('heroSneak'); h.sprintSpeed = T('heroSprint') + add; };
/** the selected bento compartment (skipping empty ones) */
Hero.slot = h => h.bento[h.sel] && h.bento[h.sel].n > 0 ? h.bento[h.sel] : null;
Hero.cycle = (h, d) => { const n = h.bento.length; if (!n) return; for (let k = 1; k <= n; k++) { const i = ((h.sel + d * k) % n + n) % n; if (h.bento[i] && h.bento[i].n > 0) { if (i !== h.sel) { h.sel = i; Au.sfx('uiMove', { vol: .5 }); h.selT = game.real; } return; } } };
Hero.count = (h, tool) => h.bento.reduce((s, c) => s + (c && c.tool === tool ? c.n : 0), 0);
Hero.take = (h, tool) => { if (B.M && B.M.cheats.infinite) return true; for (const c of h.bento) if (c && c.tool === tool && c.n > 0) { c.n--; return true; } return false; };
Hero.give = (h, tool, n) => {
  const spec = B.get('tool', tool); if (!spec) return 0; let left = n;
  for (const c of h.bento) if (c && c.tool === tool && c.n < spec.stack) { const k = Math.min(left, spec.stack - c.n); c.n += k; left -= k; if (!left) break; }
  for (let i = 0; i < h.bento.length && left > 0; i++) if (!h.bento[i] || h.bento[i].n <= 0) { const k = Math.min(left, spec.stack); h.bento[i] = { tool, n: k }; left -= k; }
  return n - left;
};

Hero.update = (h, dt, it, M) => {
  const W = M.world, map = W.map;
  Hero.tune(h);
  h.iframes = Math.max(0, h.iframes - dt); h.hurtT = Math.max(0, h.hurtT - dt); h.softT = Math.max(0, h.softT - dt); h.cloakT = Math.max(0, h.cloakT - dt); h.parryT += dt;
  if (h.dead) { h.deadT += dt; h.update(dt, map, { move: [0, 0] }); h.rig._post = null; h.rig.update(dt, h.rigState({ pose: 'die' })); return; }
  // ---- cheats: no-clip flies through everything (jump rises, crouch sinks) ----
  if (M.cheats.noclip && !h.action) {
    const sp = it.sprint ? 220 : 120; h.x += (it.move[0] || 0) * sp * dt; h.y += (it.move[1] || 0) * sp * dt;
    if (it.jumpPressed || (it.player && game.input.down('jump'))) h.z += 140 * dt; if (it.player && game.input.down('crouch')) h.z = Math.max(0, h.z - 140 * dt);
    h.x = clamp(h.x, 2, W.w * T16 - 2); h.y = clamp(h.y, 2, W.h * T16 - 2); h.vx = h.vy = h.vz = 0; h.onGround = true;
    if (Math.hypot(it.move[0], it.move[1]) > .1) h.facing = Math.atan2(it.move[1], it.move[0]);
    h.rig.update(dt, h.rigState({ air: true })); return;
  }
  if (it.toolDelta) Hero.cycle(h, it.toolDelta);
  if (it.toolSlot >= 0 && h.bento[it.toolSlot] && h.bento[it.toolSlot].n > 0) h.sel = it.toolSlot;
  // ---- a playing action (a Silent Cut, the grapple, a climb, a roll) moves the body itself ----
  if (h.action) {
    const a = h.action;
    h.update(dt, map, { move: [0, 0] });
    if (h.action) { h.rig._post = a.spec && a.spec.post ? a.spec.post(a) : null; h.rig.update(dt, a.rigState()); h.drawZ = a.spec && a.spec.drawZ ? a.spec.drawZ(a) : undefined; return; }
  }
  // ---- water: swim on the surface, crouch dives (unseen, breath runs down) ----
  const deep = W.isDeep(h.x, h.y, h.z) && h.onGround;
  if (deep && !h.swim) { h.swim = true; sfxAt('splash', h.x, h.y); Pt.bits(h.x, h.y, 2, 8, ['#a8d8f0', '#ffffff']); B.noise(h.x, h.y, 0, 40, 'splash'); if (h.drag) Hero.dropBody(h, M); }
  if (!deep && h.swim) { h.swim = false; h.dive = false; }
  if (h.swim) {
    if (it.crouchPressed) { h.dive = !h.dive; if (h.dive) { Au.sfx('dive'); Pt.bits(h.x, h.y, 2, 6, ['#a8d8f0']); } }
    h.crouch = false;
    if (h.dive) { h.breath -= dt; if (h.breath <= 0) { h.breath = 0; B.damage(null, h, 8 * dt, { kind: 'drown', silent: true }); } if (crand() < dt * 3) Pt.add({ kind: 'glint', x: h.x + (crand() - .5) * 6, y: h.y + (crand() - .5) * 6, z: 2, color: '#c8e8ff', life: .5, vz: 18 }); }
    else h.breath = Math.min(T('breath'), h.breath + dt * 3);
  } else h.breath = Math.min(T('breath'), h.breath + dt * 4);
  // ---- crouch: a toggle (or held, by the setting); the Mover sneaks while crouched ----
  if (!h.swim) {
    if (game.settings.crouchHold && it.player) h.crouch = !!it.crouchDown;
    else if (it.crouchPressed) { if (h.hug) Hero.unhug(h); else h.crouch = !h.crouch; }
  }
  // ---- the wall hug: crouched, pushing into a wall face for .2 s; the stick then slides along it; at an end, a peek ----
  const mv = it.move || [0, 0], ml = Math.hypot(mv[0], mv[1]);
  let move = [mv[0], mv[1]];
  if (it.focusDown || (h.drag && !M.cheats.noclip)) { const k = Math.min(ml, .5); if (ml > 0) move = [mv[0] / ml * k, mv[1] / ml * k]; }
  h.peek = null;
  if (h.hug) {
    const hw = h.hug, tx = -hw.ny, ty = hw.nx, along = move[0] * tx + move[1] * ty, away = move[0] * hw.nx + move[1] * hw.ny;
    if (away > .6 || !h.crouch || h.swim) Hero.unhug(h);
    else {
      const ahead = map.wall({ x: h.x + tx * Math.sign(along || 1) * 8, y: h.y + ty * Math.sign(along || 1) * 8, z: h.z, r: h.r }, [-hw.nx, -hw.ny], { reach: h.r + 4 });
      const atEnd = !ahead || ahead.top - h.z < 20;
      if (Math.abs(along) > .2 && atEnd) { h.peek = [tx * Math.sign(along), ty * Math.sign(along)]; move = [0, 0]; }
      else move = [tx * along * .75, ty * along * .75];
      h.facing = Math.atan2(hw.ny, hw.nx);
    }
  } else if (h.crouch && ml > .3 && h.onGround && !h.swim && !h.drag) {
    const wl = map.wall(h, [mv[0], mv[1]], { reach: h.r + 3 });
    if (wl && wl.top - h.z >= 20) { h.hugT += dt; if (h.hugT > .2) { h.hug = { nx: wl.nx, ny: wl.ny, x: wl.x, y: wl.y }; h.hugT = 0; Au.sfx('stepTatami', { vol: .6 }); } } else h.hugT = 0;
  } else h.hugT = 0;
  // ---- block, parry, dodge roll ----
  h.blocking = !!it.blockDown && !h.swim && !h.drag && !h.eatT && h.onGround;
  if (it.blockPressed) h.parryT = 0;
  if (h.blocking && it.jumpPressed && ml > .3 && !h.action) { const d = h.dodge([mv[0], mv[1]], 34); if (d) { Au.sfx('whoosh', { vol: .6 }); B.noise(h.x, h.y, h.z, 20, 'roll'); h.combo.cancel(); h.rig.update(dt, h.rigState()); return; } }
  // ---- eating (a rice ball: .6 s, vulnerable) ----
  if (h.eatT > 0) { h.eatT -= dt; if (h.eatT <= 0) { h.hp = Math.min(h.maxHp, h.hp + 40); Au.sfx('eat'); Pt.glints(h.x, h.y, h.z + 20, 6, '#a8f0a0'); } move = [0, 0]; }
  if (it.healPressed && !h.eatT && h.hp < h.maxHp) { if (Hero.take(h, 'riceball')) { h.eatT = .6; Au.sfx('crunch'); B.emit('toolUsed', { tool: 'riceball' }); } else B.Hud.toast('No rice balls', 'Pack them in the bento.'); }
  if (it.lurePressed && !h.swim) { Au.sfx('whistle'); B.noise(h.x, h.y, h.z, 70, 'whistle'); B.emit('lure', {}); }
  // ---- the mouse: a left click on something usable in reach interacts instead of striking ----
  if (it.mouseMode && it.attackPressed && !SilentCut.find(h, M) && (Mission.nearInteract(M, h) || (M.escort && !M.escort.caged && Math.hypot(M.escort.x - h.x, M.escort.y - h.y) < 22) || (!h.drag && Hero.bodyNear(h, M))) && !Combat.targets(M).some(e => e.kind !== 'civ' && e.mind && e.mind.state === 'alert' && Math.hypot(e.x - h.x, e.y - h.y) < 40)) { it.attackPressed = false; it.interactPressed = true; it.interactDown = true; it.interactHold = true; }
  // ---- interact: drag a body, or whatever the mission offers here ----
  if (it.interactPressed && !h.eatT) {
    if (h.drag) Hero.dropBody(h, M);
    else if (!(M.interact && M.interact(h, it))) { const b = Hero.bodyNear(h, M); if (b && !h.swim) Hero.grabBody(h, b); }
  }
  // ---- the grappling hook, tools, strikes ----
  B.Grapple.update(h, it, dt, M);
  if (h.action) { h.rig.update(dt, h.action.rigState()); return; }
  if (it.usePressed && !h.drag && !h.eatT) B.Tools.use(h, it, M);
  if (it.attackPressed && !h.drag && !h.eatT && !h.swim) {
    if (!B.SilentCut.tryCut(h, M) && !B.Combat.tryRiposte(h, M)) {
      if (!h.onGround && !h.jumpAtk) { h.jumpAtk = new E.Attack('plunge'); h.jumpAtk.start(); Au.sfx('slash'); }
      else if (h.onGround && h.combo.press()) { B.Combat.faceTarget(h, it, M); Au.sfx('slash', { pitch: 1 + h.combo.step * .1 }); }
    }
  }
  else if (it.attackPressed && h.swim) B.SilentCut.tryCut(h, M);
  // ---- move ----
  // special gaits set the Mover's walk speed and pass a walking-length stick (its top speed is chosen by stick length)
  const wasGround = h.onGround, shallow = W.isShallow(h.x, h.y, h.z) ? .7 : 1;
  let sp = h.drag ? 24 : h.swim ? (h.dive ? 24 : 30) : h.hug ? 24 : h.blocking ? 26 : 0;
  if (!sp && shallow < 1) sp = (h.crouch ? h.sneak : Math.hypot(move[0], move[1]) < .55 ? 50 : h.run) * shallow;
  h.walk = sp || 50;
  if (sp) { h.sneak = Math.min(h.sneak, sp); const l = Math.hypot(move[0], move[1]); if (l > .05) move = [move[0] / l * .5, move[1] / l * .5]; }
  if ((h.combo.busy || h.eatT > 0) && h.onGround) { if (Math.hypot(move[0], move[1]) > .1) h.facing = E.approachAng(h.facing, Math.atan2(move[1], move[0]), dt * 4); move = [0, 0]; }
  const sprint = !!it.sprint && !h.swim && !h.drag && !h.blocking && !it.focusDown;
  const jumpPressed = !!it.jumpPressed && !h.blocking && !h.drag && !(h.hug);
  const zb = h.z;
  h.update(dt, map, { move, sprint, crouch: h.swim ? false : h.crouch, jumpPressed });
  if (h.action) { h.combo.cancel(); }
  if (h.swim && !W.isDeep(h.x, h.y, h.z)) { /* out of the water this step */ }
  // ---- landing, falls, hazards ----
  if (h.onGround && !wasGround && zb - h.z > -1) {
    const fall = h.fell || 0;
    if (fall > 6) { B.noise(h.x, h.y, h.z, h.action && h.action.name === 'roll' ? 20 : 50 * (h.softT > 0 ? .4 : 1), 'land'); Pt.dust(h.x, h.y, h.z, 4); }
    if (h.jumpAtk) { B.Combat.landAttack(h, M); h.jumpAtk = null; }
  }
  if (h.hurt) { B.damage(null, h, 15, { kind: 'fall' }); }
  if (h.inHazard) { h.inHazard = false; h.respawn(); B.damage(null, h, 10, { kind: 'fall' }); }
  if (h.jumpAtk) { h.jumpAtk.update(dt); if (!h.jumpAtk.busy && h.onGround) h.jumpAtk = null; }
  // ---- combat swings ----
  B.Combat.heroSwing(h, dt, M);
  // ---- noise and footsteps ----
  const speed = Math.hypot(h.vx, h.vy), surf = W.surface(h.x, h.y, h.z);
  h.noiseT -= dt;
  if (speed > 5 && h.onGround) {
    h.stepD += speed * dt;
    let loud = 0;
    if (h.swim) loud = h.dive ? 0 : 15;
    else if (h.sprinting) loud = (h.softT > 0 ? 30 : 110);
    else if (h.crouch || speed < 55) loud = surf === 'gravel' ? 12 : surf === 'shallow' ? 40 : 0;
    else loud = h.softT > 0 ? 0 : T('noiseRun') * (B.SURF_NOISE[surf] || 1);
    if (surf === 'shallow') loud = Math.max(loud, 40);
    loud *= h.C.noise;
    if (h.drag) loud = Math.max(loud, 10);
    if (loud > 0 && h.noiseT <= 0) { B.noise(h.x, h.y, h.z, loud, h.swim ? 'splash' : 'step'); h.noiseT = .25; }
    const stride = h.sprinting ? 18 : h.crouch ? 26 : 16;
    if (h.stepD > stride) {
      h.stepD = 0;
      if (h.swim) { if (!h.dive) Au.sfx('swim', { vol: .5 }); else Au.sfx('bubble', { vol: .4 }); }
      else { const v = h.crouch || speed < 55 ? .25 : h.sprinting ? .9 : .55; Au.sfx(B.SURF_STEP[surf] || 'stepDirt', { vol: v * (h.softT > 0 ? .3 : 1) }); if (surf === 'boards' && !h.crouch && crand() < .3) Au.sfx('creak', { vol: .6 }); }
    }
  }
  // ---- the dragged body follows 14 behind ----
  if (h.drag) { const b = h.drag, a = h.facing + Math.PI; b.x = approach(b.x, h.x + Math.cos(a) * 14, 80 * dt); b.y = approach(b.y, h.y + Math.sin(a) * 14, 80 * dt); b.z = h.z; b.facing = h.facing; }
  // ---- the rig: the ninja run (arms back), the hug, the drag, swimming, eating, blocking ----
  const runK = h.sprinting ? 1 : speed > 70 && !h.crouch && h.onGround && !h.combo.busy ? .7 : 0;
  h.rig._post = Rigs.combine(runK ? Rigs.ninjaRun(runK) : null, h.hug ? Rigs.wallHug(1) : null, h.drag ? Rigs.drag(1) : null, h.swim ? Rigs.swim(game.time) : null, h.eatT > 0 ? Rigs.eating(game.time) : null);
  h.drawZ = h.swim ? h.z - (h.dive ? 15 : 9) : undefined;
  const atk = h.jumpAtk ? h.jumpAtk.state : h.combo.state;
  h.rig.update(dt, h.rigState({ attack: atk, pose: h.blocking ? 'block' : h.eatT > 0 ? 'crouch' : h.swim ? null : null, hurt: h.hurtT > .2, crouch: h.crouch || h.hug || h.eatT > 0 ? true : undefined, down: h.swim ? (h.dive ? .55 : .35) : undefined }));
};
Hero.unhug = h => { h.hug = null; h.peek = null; };
Hero.bodyNear = (h, M) => { let best = null, bd = 18; for (const g of M.guards.concat(M.civs)) { if (!Actor.isBody(g) || g.dragged) continue; const d = Math.hypot(g.x - h.x, g.y - h.y); if (d < bd && Math.abs(g.z - h.z) < 8) { bd = d; best = g; } } return best; };
Hero.grabBody = (h, b) => { h.drag = b; b.dragged = true; b.hidden = false; h.crouch = false; Hero.unhug(h); Au.sfx('bodyDrop', { vol: .5 }); B.emit('drag', { body: b }); };
Hero.dropBody = (h, M) => {
  const b = h.drag; if (!b) return; h.drag = null; b.dragged = false; const W = M.world;
  if (W.isDeep(b.x, b.y, 0)) { b.sunk = true; sfxAt('splash', b.x, b.y); Pt.bits(b.x, b.y, 2, 10, ['#a8d8f0', '#ffffff']); B.Hud.toast('The water keeps secrets', 'The body sinks.'); }
  else if (W.isHide(b.x, b.y, b.z) || W.lightAt(b.x, b.y, b.z) < .3) { b.hidden = true; B.Hud.toast('Hidden', 'The body lies in shadow.'); }
  else b.hidden = false;
  Au.sfx('bodyDrop', { vol: .6 }); B.emit('dropBody', { body: b });
};
B.Hero = Hero;
