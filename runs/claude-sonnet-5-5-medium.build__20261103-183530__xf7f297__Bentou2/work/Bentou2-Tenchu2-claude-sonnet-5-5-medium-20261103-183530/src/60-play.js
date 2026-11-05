/* ---- THE PLAY SCENE: update, autopilot, scoring ---- */
function rankOf() {
  const f = { unseen: S.detected === 0, clean: S.civHarm === 0, swift: S.t <= S.m.par, quiet: S.bells === 0, unhurt: S.damageTaken < S.hpMax * .5, deft: S.cuts >= 2 || S.m.n === 3 };
  const n = Object.values(f).filter(Boolean).length;
  const idx = n >= 6 ? 0 : n === 5 ? 1 : n === 4 ? 2 : n === 3 ? 3 : 4;
  return { idx, flags: f, n };
}
const FLAG_TEXT = { unseen: 'Never spotted', clean: 'No innocent harmed', swift: 'Within par time', quiet: 'No alarm bell', unhurt: 'Barely scratched', deft: 'Silent cuts used' };
function finishMission(ok) {
  if (S.done) return; S.done = true;
  const rk = rankOf(), m = S.m;
  S.result = { id: m.id, name: m.name, rank: rk.idx, flags: rk.flags, time: S.t, cuts: S.cuts, kills: S.kills, detected: S.detected, bells: S.bells, civHarm: S.civHarm, tools: S.toolsUsed, score: Math.max(0, Math.round(3000 + S.cuts * 150 + S.score - S.detected * 250 - S.bells * 300 - S.civHarm * 600 + Math.max(0, m.par - S.t) * 4)), chara: B.save.chara, ledger: !!(S.ledger && S.ledger.got) };
  if (S.m.trial) { S.result.done = true; if (B.onTrialDone) B.onTrialDone(S.result); return; }
  if (S.auto) { game.after(.5, () => B.attractNext && B.attractNext()); return; }
  A.music('victory'); A.sfx('stamp');
  game.after(1.4, () => game.go('results', { result: S.result }));
}
B.missionFail = () => {
  if (!S) return; const m = S.m;
  if (S.auto) { B.attractNext && B.attractNext(); return; }
  if (m.trial) { S.result = { id: m.id, name: m.name, dead: true, cuts: S.cuts, detected: S.detected, time: S.t, score: Math.max(0, Math.round(S.score + S.cuts * 150 - S.detected * 150 - S.civHarm * 500)), kills: S.kills, civHarm: S.civHarm, bells: S.bells }; if (B.onTrialDone) B.onTrialDone(S.result); return; }
  game.go('over', { mission: m.id });
};

/* ---- autopilot (attract mode): cheats freely, never dies, is never seen. Its only job is to show the game. ---- */
function autoGoal() {
  const hero = S.hero, m = S.m;
  if (S.boss && S.boss.active && !S.boss.dead) return { x: S.boss.x, y: S.boss.y, fight: true };
  const live = S.guards.filter(g => !g.dead && !g.civ && !g.spirit && !g.def.ranged).sort((a, b) => dist2(a, hero) - dist2(b, hero));
  if (S.cuts < 2 && live.length) return { x: live[0].x, y: live[0].y, guard: live[0] };
  if (S.bossDef && !S.bossDone) return { x: cc(S.bossCfg.trigger[0]), y: cc(S.bossCfg.trigger[1]) };
  return { x: S.exitPt.x, y: S.exitPt.y };
}
function autopilot(dt) {
  const hero = S.hero; S.hp = S.hpMax; S.autoT = (S.autoT || 0) + dt;
  const goal = autoGoal(); S.autoFlow = S.autoFlow || new E.FlowField(S.map, { climb: 32, drop: 56 });
  const key = Math.floor(goal.x / T) + ',' + Math.floor(goal.y / T);
  if (key !== S.autoKey) { S.autoKey = key; S.autoFlow.update(goal.x, goal.y); }
  const nx = S.autoFlow.next(hero.x, hero.y), tx = nx ? nx.x : goal.x, ty = nx ? nx.y : goal.y, l = Math.hypot(tx - hero.x, ty - hero.y) || 1, d = Math.hypot(goal.x - hero.x, goal.y - hero.y);
  let move = [(tx - hero.x) / l, (ty - hero.y) / l];
  if (goal.guard && d < 17 && !hero.action) { const g = goal.guard; hero.facing = Math.atan2(g.y - hero.y, g.x - hero.x); doCut({ g, kind: 'back' }); return { move: [0, 0] }; }
  if (goal.fight) {
    hero.facing = Math.atan2(goal.y - hero.y, goal.x - hero.x);
    if (d < 26) { move = [0, 0]; if (S.autoT % .5 < dt) heroAttack(); }
  } else if (d < 6) move = [0, 0];
  if (nx && hero.onGround && (nx.kind === 'climb') && nx.edge < hero.r + 4) return { move, jumpPressed: true };
  return { move, sprint: false, crouch: false };
}

/* ---- the scene ---- */
function playUpdate(dt) {
  if (!S) return;
  const hero = S.hero, I = game.input, real = dt / (game.timeScale || 1);
  syncGlyphs();
  if (B.devOpen) { B.devUpdate(dt); return; }
  if (hub.ended) return;
  if (trialInput(dt)) return;
  if (S.hubWait) { const t = hubTime(); if (t !== null && t >= 0) S.hubWait = false; else { S.rig.update(dt, hero.rigState({})); return; } }
  if (S.talk.update(dt)) return;
  if (S.cutscene) return;
  S.t += real;
  // right stick turns the camera in 45 degree steps (the keyboard uses [ and ])
  try { const pad = navigator.getGamepads && navigator.getGamepads()[I.padIndex]; if (pad && pad.axes.length > 2) { const ax = pad.axes[2]; if (Math.abs(ax) > .7 && !S.rotLatch) { S.rotLatch = true; game.rotateView(ax > 0 ? 45 : -45); } else if (Math.abs(ax) < .4) S.rotLatch = false; } } catch (e) { /* no pad */ }
  for (const t of S.toasts) t.t -= real; S.toasts = S.toasts.filter(t => t.t > 0);
  game.timeScale = (S.cutFx ? B.tune.slowmo : 1) * B.tune.timeScale; tickCutFx(dt);
  if (S.over) { S.rig.update(dt, hero.rigState({ pose: 'down' })); for (const g of S.guards) rigGuard(g, dt); return; }
  if (S.done) { S.rig.update(dt, hero.rigState({ pose: 'cheer' })); for (const g of S.guards) rigGuard(g, dt); tickThings(dt); return; }
  S.events.length = 0;
  S.hpMax = B.tune.heroHp; if (S.hp > S.hpMax) S.hp = S.hpMax;
  if (S.hurtT > 0) S.hurtT -= real; if (S.eatT > 0) S.eatT -= real; if (S.stunT > 0) S.stunT -= real;
  S.swim = inWater(hero);
  const ht = B.tune.heroSpeed * (S.swim ? .55 : 1) * (S.dragging ? .6 : 1) * (hero.crouch && S.swim ? .7 : 1);
  hero.run = 85 * ht; hero.sprintSpeed = 125 * ht; hero.walk = 50 * ht; hero.sneak = 32 * ht;
  // exposure: light and shadow, grass, water, the cloak
  const lit = isLit(hero); let e = lit ? 1 : B.tune.lightShadow; if (hero.crouch) e *= .72;
  if (inGrass(hero) && hero.crouch) e = 0; if (S.swim) e = hero.crouch ? 0 : e * .6;
  if (S.cloak > 0 && !hero.sprinting && !S.combo.busy) e *= .25; if (S.m.id === 'moon' && !lit) e *= .9;
  hero.exposure = e; hero.hidden = e === 0; S.lit = lit;
  // input
  const busy = S.eatT > 0 || S.stunT > 0 || S.combo.busy;
  S.blockOK = I.down('block') && !hero.action;
  S.kiFocus = I.down('ki') && !S.auto;
  let intent = I;
  if (S.auto) intent = autopilot(dt);
  else if (busy || S.dragging && 0) intent = { move: [0, 0] };
  if (S.grap) tickGrapple(dt);
  else if (!S.auto && !hero.action && !S.over) {
    if (I.pressed('dodge') && !S.swim && hero.dodge(undefined, 34)) { A.sfx('whoosh'); noise(hero.x, hero.y, hero.z, 20); }
    else if (I.pressed('attack')) { const c = cutCandidate(); if (c) doCut(c); else if (!S.swim) heroAttack(); }
    if (I.pressed('block')) tryParry();
    if (I.pressed('use')) useTool();
    if (I.pressed('cycle')) cycleTool(1);
    if (I.pressed('interact')) { const h = nearestHotspot(); if (h) useHotspot(h); else if (!nearBody()) { const g = findGrapple(); if (g && !S.swim) startGrapple(g); else toast('Nothing to hook', 'Face a wall or roof within reach.', 1.5); } }
  }
  if (!S.grap) { if (!S.auto) dragUpdate(dt); hero.update(dt, S.map, intent); }
  if (hero.inHazard) hero.respawn();
  if (hero.hurt) { const fall = hero.fell || 0; S.hp -= 12; S.hurtT = .4; S.damageTaken += 12; game.shake(3); if (S.hp <= 0) heroDown(); }
  const nl = noiseLevel(); S.noiseLvl = nl; if (nl > 0 && !S.grap) noise(hero.x, hero.y, hero.z, nl);
  if (inWater(hero) && Math.hypot(hero.vx, hero.vy) > 10 && !hero.crouch && rnd() < dt * 6) { P.ring(hero.x, hero.y, 2, 10, '#8ab8d8', .5); }
  tickCombat(dt);
  for (const g of S.guards) updateGuard(g, dt);
  tickThings(dt); tickBell(dt);
  bossTrigger(); bossUpdate(dt); escortUpdate(dt);
  checkObjectives();
  // music layers follow the guards' hunt
  const hunted = S.guards.some(g => !g.dead && g.mind.state === 'alert' && !g.civ) || (S.boss && S.boss.active && !S.boss.dead);
  if (hunted !== !!S.hunted) { S.hunted = hunted; if (!(S.boss && S.boss.active)) A.layer('chase', hunted ? 1 : 0, hunted ? .4 : 2.5); if (!hunted) S.alertLatch = false; }
  if (S.alarm > 0) A.layer('alarm', 1, .3);
  // rigs
  S.rig.update(dt, hero.rigState({ attack: S.combo.state, pose: S.eatT > 0 ? 'kneel' : S.blockOK ? 'block' : S.stunT > 0 ? 'wince' : null, hurt: S.hurtT > 0, expr: S.hurtT > 0 ? 'wince' : undefined }));
  for (const g of S.guards) rigGuard(g, dt);
  if (S.tobei) tobeiRig(dt);
  // ki
  updateKi();
  S.prompt = computePrompt();
  if (B.onPlayStep) B.onPlayStep(dt);
}
function rigGuard(g, dt) {
  if (g.def.hound) { const sp = Math.hypot(g.vx, g.vy); g.rig.update(dt, { squash: g.dead ? -.4 : Math.sin(game.time * 12) * .08 * (sp > 5), look: [Math.cos(g.facing), Math.sin(g.facing)], walk: g.dead ? 0 : Math.min(1, sp / 60) }); return; }
  if (g.spirit) { g.rig.update(dt, { squash: Math.sin(game.time * 8) * .12, look: [Math.cos(g.facing), Math.sin(g.facing)], walk: 1 }); return; }
  if (g.dead) { g.rig.update(dt, g.action && g.action.other === g ? g.action.otherState() : { x: g.x, y: g.y, z: g.z, facing: g.facing, down: 1 }); return; }
  g.rig.update(dt, g.rigState({ attack: g.swing.state, stance: g.mind.state === 'alert' ? 'ready' : null, hurt: g.stun > 0, point: g.def.ranged && g.draw > 0, pose: g.sleep > 0 ? 'down' : g.eat && g.eat.stage === 'eat' ? 'kneel' : g.blind > 0 ? 'wince' : g.civ && g.screamed ? 'wave' : null, down: g.sleep > 0 ? 1 : undefined }));
}
function escortUpdate(dt) {
  const t = S.tobei; if (!t) return; const hero = S.hero;
  if (!t.free) { t.update(dt, S.map, { move: [0, 0] }); return; }
  if (t.dead) return;
  const d = dist2(t, hero); let move = [0, 0];
  if (d > 26) { const key = Math.floor(hero.x / T) + ',' + Math.floor(hero.y / T); if (key !== t.gk) { t.gk = key; t.flow.update(hero.x, hero.y); } const nx = t.flow.next(t.x, t.y), tx = nx ? nx.x : hero.x, ty = nx ? nx.y : hero.y, l = Math.hypot(tx - t.x, ty - t.y) || 1; move = [(tx - t.x) / l * (d > 60 ? 1 : .6), (ty - t.y) / l * (d > 60 ? 1 : .6)]; t.facing = Math.atan2(move[1], move[0]); }
  t.update(dt, S.map, { move }); t.bark -= dt;
  if (rnd() < dt * .03 && t.bark <= 0) { t.bark = 6; say('tobei', pickOf(B.STORY.tobeiBarks), 2.5); }
  // the guards see Tobei too: a hunted fool is a mission lost
  for (const g of S.guards) if (!g.dead && !g.civ && g.mind.state === 'alert' && dist2(g, t) < 18) { t.hp -= 14 * dt; }
  for (const th of S.things) if (th.type === 'arrow' && Math.hypot(th.x - t.x, th.y - t.y) < 6) { th.t = 0; t.hp -= 10; }
  if (t.hp <= 0) { t.dead = true; S.over = 'tobei'; A.music(null); A.sfx('die'); toast('Tobei has fallen', 'The mission is lost.', 3); game.after(1.6, () => B.missionFail()); }
}
function tobeiRig(dt) { const t = S.tobei; t.rig.update(dt, t.rigState({ pose: !t.free ? 'kneel' : t.dead ? 'down' : null, expr: t.free ? 'smile' : 'wince', down: t.dead ? 1 : undefined })); }
function updateKi() {
  const hero = S.hero, range = B.tune.kiRange * (S.kiFocus ? 2.2 : 1); let best = null, bd = 1e9;
  for (const g of S.guards) { if (g.dead || g.spirit && 0) continue; const d = dist2(g, hero); if (d < range && d < bd && !(g.civ && !g.revealed && !S.kiFocus)) { bd = d; best = g; } }
  if (S.boss && S.boss.active && !S.boss.dead) { const d = dist2(S.boss, hero); if (d < bd) { bd = d; best = S.boss; } }
  if (!best) { S.ki.v = lerp(S.ki.v, 0, .1); S.ki.g = null; S.ki.c = '#40d0b0'; S.ki.s = 'calm'; return; }
  const st = best.mind ? best.mind.state : 'alert', lv = best.mind ? best.mind.level : 1;
  S.ki.g = best; S.ki.s = st; S.ki.c = { calm: '#40d0b0', notice: '#ffd040', search: '#ff9a40', alert: '#ff4a3a' }[st];
  S.ki.v = lerp(S.ki.v, clamp(Math.round(99 * (1 - bd / range) * .7 + lv * 29), 0, 99), .2);
}
function computePrompt() {
  const hero = S.hero, c = cutCandidate(); S.cutC = c;
  if (c) return { act: 'attack', label: 'Silent Cut: ' + CUT_NAMES[c.kind] };
  if (S.dragging) return { act: 'interact', label: 'Dragging (hold)' };
  const h = nearestHotspot(); if (h) return { act: 'interact', label: h.label };
  const b = nearBody(); if (b) return { act: 'interact', label: 'Hold to drag the body' };
  if (!S.swim && hero.onGround && findGrapple()) return { act: 'interact', label: 'Kaginawa' };
  return null;
}
