/* Heroes: intents (pad, keys, mouse, bot, net), movement, firing, melee, the per-step sim, floor flow. */
function readIntent(h) {
  const I = h.input, it = h.int; if (!I) return;
  const m = I.move(), v = game.view.screenDirToGround(m[0], m[1]);
  it.mx = v[0]; it.my = v[1];
  // aim: right stick, then the mouse (player 1), else the way the hero faces
  let ax = 0, ay = 0, aimed = false;
  const pa = I.padAim;
  if (pa && Math.hypot(pa[0], pa[1]) > .3) { const g = game.view.screenDirToGround(pa[0], pa[1]); ax = g[0]; ay = g[1]; aimed = true; it.stickFire = OPT.stickFires && Math.hypot(pa[0], pa[1]) > .6; }
  else it.stickFire = false;
  if (!aimed && I.player === 1 && I.aimSource === 'mouse' && I.mouse && (I.clock - I.mouse.t < 3 || I.down('Mouse0'))) {
    const g = game.mouseGround && game.mouseGround();
    if (g) { const gx = g.x !== undefined ? g.x : g[0], gy = g.y !== undefined ? g.y : g[1]; if (gx !== undefined) { const d = Math.hypot(gx - h.x, gy - h.y); if (d > 3) { ax = (gx - h.x) / d; ay = (gy - h.y) / d; aimed = true; h.reticle = { x: gx, y: gy }; } } }
  } else h.reticle = null;
  if (!aimed) { const l = Math.hypot(it.mx, it.my); if (l > .2) { ax = it.mx / l; ay = it.my / l; } else { ax = Math.cos(h.facing); ay = Math.sin(h.facing); } }
  // aim assist
  const cone = OPT.aimAssist === 'High' ? .28 : OPT.aimAssist === 'Low' ? .14 : 0;
  if (cone && aimed !== 'none') {
    const a0 = Math.atan2(ay, ax); let best = null, bd = 200;
    for (const t of [...W.mons, ...W.gens]) { if (t.dead || (t.ch === 'y' && t.vis <= 0) || (t.T && t.T.immune)) continue; const d = Math.hypot(t.x - h.x, t.y - h.y); if (d > bd) continue; if (Math.abs(angDiff(Math.atan2(t.y - h.y, t.x - h.x), a0)) < cone) { best = t; bd = d; } }
    if (best) { const aa = Math.atan2(best.y - h.y, best.x - h.x); ax = Math.cos(aa); ay = Math.sin(aa); }
  }
  it.ax = ax; it.ay = ay;
  it.fire = I.down('fire') || it.stickFire;
  it.magic = I.pressed('magic'); it.plant = I.down('plant');
  it.rise = I.pressed('fire');
  it.aimed = aimed;
}
function intentFor(h) {
  if (W.net && !h.local) return;               // a remote hero's intent comes from the network
  if (h.bot) return botIntent(h);
  if (h.input) readIntent(h);
}

function heroStep(h, dt) {
  const it = h.int, C = h.C;
  h.flash = Math.max(0, h.flash - dt); h.grace = Math.max(0, h.grace - dt); h.cd = Math.max(0, h.cd - dt); h.stun = Math.max(0, h.stun - dt); h.queasy = Math.max(0, h.queasy - dt);
  h.runeImmune = Math.max(0, h.runeImmune - dt); h.tele = Math.max(0, h.tele - dt); h.invuln = Math.max(0, h.invuln - dt); h.hurtT = Math.max(0, h.hurtT - dt); h.kick = Math.max(0, h.kick - dt); h.castT = Math.max(0, (h.castT || 0) - dt);
  if (h.amuletT > 0) { h.amuletT -= dt; if (h.amuletT <= 0) h.amulet = null; }
  h.lastX = h.x; h.lastY = h.y;
  if (h.down) {
    h.downT += dt; h.vx = h.vy = 0;
    h.rig.update(dt, { x: h.x, y: h.y, z: 0, vx: 0, vy: 0, facing: h.facing, pose: 'die' });
    if (!W.net && it.rise && h.downT > .6 && !W.attract) { const ally = W.heroes.find(o => !o.down && !o.gone); if (ally) heroRise(h, ally); }
    if (W.net && W.net.host && h.riseIn !== undefined) { h.riseIn -= dt; if (h.riseIn <= 0) { const ally = W.heroes.find(o => !o.down && !o.gone); if (ally) { heroRise(h, ally); h.riseIn = undefined; } } }
    return;
  }
  // life force
  if (!DEV.god && W.kind !== 'bossdone') {
    const dr = TUNE.drain * DIFF[OPT.difficulty].drain * (RUN.descent2 ? 1.5 : 1) * (W.fog > 0 ? 1 + 2 * W.fog : 1) * (W.attract ? 0 : 1);
    h.hp -= dr * dt; h.hunger = h.hp < 200 ? 1 - Math.max(0, h.hp) / 200 : 0;
    if (h.hp <= 0) { heroFall(h); return; }
    if (h.hp < 100 && h.lowSaid < 3) { h.lowSaid = 3; say('low100', { hero: h, force: true, cd: 20 }); } else if (h.hp < 200 && h.lowSaid < 2) { h.lowSaid = 2; say('low200', { hero: h, force: true, cd: 20 }); } else if (h.hp < 400 && h.lowSaid < 1) { h.lowSaid = 1; say('low400', { hero: h, cd: 20 }); }
    if (h.hp > 450) h.lowSaid = 0;
  }
  if (W.attract || h.bot) { if (h.hp < 300) h.hp = 300; }
  // movement
  const mag = Math.min(1, Math.hypot(it.mx, it.my)), planted = it.plant || (h.input && h.input.player === 1 && h.input.lastDevice === 'keyboard' && it.fire && !(h.input.aimSource === 'mouse') && false);
  const canMove = h.stun <= 0 && !(h.castT > 0 && h.castT > .3);
  const sp = heroSpeed(h);
  if (h.remote) { const tp = h.netp; if (tp) { const dx = tp.x - h.x, dy = tp.y - h.y, d = Math.hypot(dx, dy), max = sp * 2.5 * dt + 2; if (d > .01) { const k = Math.min(1, max / d); h.vx = dx * k / dt; h.vy = dy * k / dt; h.x += dx * k; h.y += dy * k; } else h.vx = h.vy = 0; } }
  else if (planted || !canMove) { h.vx *= .5; h.vy *= .5; if (planted && mag > .2) h.facing = Math.atan2(it.my, it.mx); }
  else { h.vx = it.mx * sp; h.vy = it.my * sp; if (mag > .2 && !(it.fire && it.aimed)) h.facing = Math.atan2(it.my, it.mx); }
  // melee / fire
  const aim = [it.ax, it.ay]; h.aim = aim;
  if (it.fire && h.stun <= 0 && (it.aimed || mag < .2 || true)) h.facing = Math.atan2(aim[1], aim[0]);
  let swinging = h.combo.busy;
  if (it.fire && h.stun <= 0 && !h.down) {
    const reach = h.r + 8 + 7; let near = null, nd = 1e9;
    for (const m of W.mons) { if (m.dead || m.ch === 'g' || m.T.immune || m.emerge > 0 || (m.ch === 'y' && m.vis <= 0)) continue; const d = Math.hypot(m.x - h.x, m.y - h.y) - m.r; if (d < reach && d < nd && Math.abs(angDiff(Math.atan2(m.y - h.y, m.x - h.x), h.facing)) < .87) { near = m; nd = d; } }
    let crack = null; if (!near) { const cx = Math.floor((h.x + Math.cos(h.facing) * 12) / TS), cy = Math.floor((h.y + Math.sin(h.facing) * 12) / TS); if (W.map.cell(cx, cy) === 3) crack = W.cracked.find(c => c.x === cx && c.y === cy); }
    if (near || crack) { if (!h.combo.busy && h.combo.press()) { h.swingHit = new Set(); sfx('swing'); } }
    else if (h.cd <= 0 && !swinging) fireShot(h);
    h.firing = !near;
    if (crack && h.combo.active && !h.crackHit) { h.crackHit = 1; crack.hp -= C.melee; game.particles.dust((crack.x + .5) * TS, (crack.y + .5) * TS, 10, 3, { color: '#998' }); sfx('clunk'); if (crack.hp <= 0) breakCrack(crack); }
    if (!h.combo.active) h.crackHit = 0;
  } else h.firing = false;
  h.combo.update(dt);
  if (h.combo.active) {
    const dm = C.melee * TUNE.shotDamage * (h.specials.ogreale ? 1.5 : 1) * (h.amulet === 'rending' && h.amuletT > 0 ? 1.3 : 1);
    h.combo.hits(W.mons, m => !m.dead && m.ch !== 'g' && m.emerge <= 0 && E.inArc(h, h.facing, m, 24 + m.r, 1.2), m => { if (m.T.immune) { sfx('clink'); return; } damageMon(m, dm, h, { knock: h, kb: 70 }); game.hitFx(m.x, m.y, 12, { power: .6, angle: h.facing, sound: false, rumble: false }); game.freeze(.04); sfx('hit', { vol: .6 }); });
    for (const g of W.gens) if (!g.dead && !h.swingHitG) { if (Math.hypot(g.x - h.x, g.y - h.y) < 24 + g.r && Math.abs(angDiff(Math.atan2(g.y - h.y, g.x - h.x), h.facing)) < 1.2) { h.swingHitG = 1; damageGen(g, dm, h); } }
  } else h.swingHitG = 0;
  // magic
  if (it.magic && !(h.pickT > 0)) useFlask(h);
  // move
  if (!h.remote && DEV.noclip) { h.x += h.vx * dt; h.y += h.vy * dt; } else if (!h.remote) {
    h.update(dt, W.map);
    if (W.map.blocked && W.map.floorAt) { const fl = W.map.floorAt(h.x, h.y); if (fl === 'lava') { h.x = h.lastX; h.y = h.lastY; } }
  }
  // rig
  const spd = Math.hypot(h.vx, h.vy), pose = h.castT > 0 ? 'cast' : (C.id === 'hexer' && h.firing && it.fire) ? 'cast' : null;
  h.rig.update(dt, { x: h.x, y: h.y, z: h.z, vx: h.vx, vy: h.vy, facing: h.facing, attack: h.combo.state, hurt: h.hurtT > 0, point: h.firing && C.id !== 'hexer' && h.kick > 0 || (h.firing && it.fire && C.id === 'ranger'), pose, hunch: h.hunger * .5 + (C.id === 'hexer' ? .3 : 0) });
  void spd;
  itemsStep(h);
  // stairs
  stairCheck(h, dt);
  // the Bell timer is on the hero
  if (h.bell > 0 && !W.menuHero) h.bell = 0;
}

function stairCheck(h, dt) {
  let on = null;
  if (!W.done || W.kind !== 'boss') {
    for (const s of W.stairs) if (Math.hypot(s.x - h.x, s.y - h.y) < 11) on = { to: W.step + 1 };
    for (const s of W.skips) if (Math.hypot(s.x - h.x, s.y - h.y) < 11) { const to = PLAN.findIndex(p => p.no === s.to); if (to > W.step) on = { to, skip: true }; }
    if (W.wallStairs && !on && (h.hitWall || W.map.solidAt(h.x + Math.cos(h.facing) * 7, h.y + Math.sin(h.facing) * 7)) && Math.hypot(h.int.mx, h.int.my) > .3) on = { to: W.step + 1 };
  }
  if (on && !W.descend) { h.stairT += dt; h.stairTo = on; if (h.stairT >= TUNE.stairHold) { startDescend(h, on); } } else h.stairT = Math.max(0, h.stairT - dt * 3);
}
function startDescend(h, on) {
  if (W.descend || (W.net && !W.net.host)) return;
  const bonus = 500 + Math.max(0, Math.round(5 * (W.meta.par - W.time)));
  if (W.kind === 'floor' || W.kind === 'treasure' || true) { h.score += W.kind === 'treasure' ? 0 : bonus; }
  W.descend = { by: h, to: on.to, skip: !!on.skip, t: 0 };
  sfx('descend'); say(on.skip ? 'short' : 'stairs', { hero: h, force: true, cd: 0 });
  W.net && W.net.event && W.net.event(['stairs', h.slot, on.to]);
}

// ---------- the world step ----------
function rebuildFlow() {
  const srcs = W.heroes.filter(h => !h.down && !h.gone).map(h => [Math.floor(h.x / TS), Math.floor(h.y / TS)]);
  W.flow.update(srcs.length ? srcs : [[0, 0]]);
}
function separate(dt) {
  const grid = W.grid; grid.build(W.mons.filter(m => !m.dead && m.emerge <= 0));
  for (const m of W.mons) {
    if (m.dead || m.emerge > 0 || m.ch === 'K') continue;
    grid.near(m.x, m.y, m.r * 2 + 2, o => { if (o === m || o.dead) return; const dx = m.x - o.x, dy = m.y - o.y, d = Math.hypot(dx, dy) || .01, min = (m.r + o.r) * .9; if (d < min && (m.ch !== 'g' || o.ch === 'g')) { const p = (min - d) * .35; m.x += dx / d * p; m.y += dy / d * p; } });
    for (const g of W.gens) if (!g.dead) { const dx = m.x - g.x, dy = m.y - g.y, d = Math.hypot(dx, dy) || .01, min = m.r + g.r; if (d < min && !m.T.ghost) { m.x = g.x + dx / d * min; m.y = g.y + dy / d * min; } }
    if (!W.map.walkable(Math.floor(m.x / TS), Math.floor(m.y / TS)) && W.map.solidAt(m.x, m.y)) W.map.collide(m);
  }
  for (const h of W.heroes) {
    if (h.down) continue;
    for (const g of W.gens) if (!g.dead) { const dx = h.x - g.x, dy = h.y - g.y, d = Math.hypot(dx, dy) || .01, min = h.r + g.r; if (d < min) { h.x = g.x + dx / d * min; h.y = g.y + dy / d * min; } }
    grid.near(h.x, h.y, 16, m => { if (m.dead || m.ch === 'g' || m.ch === 't' || m.emerge > 0 || m.ch === 'K') return; const dx = h.x - m.x, dy = h.y - m.y, d = Math.hypot(dx, dy) || .01, min = h.r + m.r - 1; if (d < min) { const p = min - d; h.x += dx / d * p * .6; h.y += dy / d * p * .6; m.x -= dx / d * p * .4; m.y -= dy / d * p * .4; } });
    if (!DEV.noclip) W.map.collide(h);
  }
  // the king is a solid
  if (W.boss && !W.boss.dead) for (const h of W.heroes) if (!h.down) { const k = W.boss, dx = h.x - k.x, dy = h.y - k.y, d = Math.hypot(dx, dy) || .01, min = h.r + k.r; if (d < min) { h.x = k.x + dx / d * min; h.y = k.y + dy / d * min; } }
}

// the leash: no hero may stretch the party past the screen
function leash() {
  const L = W.heroes.filter(h => !h.down && !h.gone && h.local !== false);
  if (L.length < 2 || !game.view || !game.view.p || !game.screen || W.net) return;
  const Wd = game.r ? game.r.W : 427, Hd = game.r ? game.r.H : 240, mg = 56, z = game.zoom || 1;
  const box = () => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const h of L) { const p = game.view.p(h.x, h.y, 0); x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); } return [(x1 - x0) * z, (y1 - y0) * z]; };
  let [bw, bh] = box();
  if (bw <= Wd - 2 * mg && bh <= Hd - 2 * mg - 40) return;
  for (const h of L) { if (h.lastX === undefined) continue; const nx = h.x, ny = h.y; h.x = h.lastX; h.y = h.lastY; const [w2, h2] = box(); if (w2 <= bw && h2 <= bh) { bw = w2; bh = h2; continue; } h.x = nx; h.y = ny; }
}

function simStep(dt) {
  if (!W) return;
  dt *= DEV.timeScale;
  W.time += dt; RUN.time += dt;
  for (const h of W.heroes) { if (!h.remote) intentFor(h); }
  for (const h of W.heroes) if (!h.gone && !(W.net && !W.net.host && !h.local)) heroStep(h, dt);
  if (W.net && !W.net.host) return;           // clients puppet the rest from snapshots
  rebuildFlowTick(dt);
  for (const m of W.mons) { m.tick = (m.tick || 0); monStep(m, dt); if (m.dead && m.dying > 1.2) m.remove = true; if (!m.dead && m.z !== undefined && m.ch !== 'g' && m.ch !== 'i' && m.ch !== 't') m.z = 0; }
  W.mons = W.mons.filter(m => !m.remove);
  separate(dt);
  gensStep(dt); shotsStep(dt); foeStep(dt); featuresStep(dt); bellStep(dt); floorRules(dt);
  for (const t of W.texts) { t.t += dt; t.z += 18 * dt; } W.texts = W.texts.filter(t => t.t < t.life);
  if (W.rings) { for (const r of W.rings) r.t += dt; W.rings = W.rings.filter(r => r.t < .8); }
  for (const b of W.bars) b.t += dt;
  narratorStep(dt);
  leash();
}
function rebuildFlowTick(dt) { W.flowTick -= dt; if (W.flowTick <= 0) { W.flowTick = .15; rebuildFlow(); } }

// ---------- floor rules: impatience, the Tithe, hoard clock, death and continue ----------
function floorRules(dt) {
  const T = W.time, imp = TUNE.impatience;
  if (W.kind === 'floor') {
    if (!W.imp1 && T > imp - 30) { W.imp1 = 1; say('patience', { force: true }); }
    if (!W.doorsOpen && T > imp) { W.doorsOpen = true; say('doorsOpen', { force: true }); for (const d of W.doors) openDoorGroup(d); }
    if (!W.wallStairs && T > imp + 60) { W.wallStairs = true; say('wallsOpen', { force: true }); sfx('rumble'); }
    const hasTithe = W.mons.some(m => m.ch === 't' && !m.dead);
    if ((W.meta.no >= 5 || RUN.descent2) && !W.titheSpawned && T > TUNE.titheAt && !hasTithe) spawnTithe();
    if (W.meta.tithe && !W.titheSpawned && T > TUNE.titheAt * .6) spawnTithe();
  }
  if (W.kind === 'treasure') {
    W.hoard.t -= dt; if (!W.hoardSaid) { W.hoardSaid = 1; say('hoard', { force: true }); }
    if (W.hoard.t <= 0 && !W.descend) { say('slam', { force: true }); sfx('slam'); const h = W.heroes.find(x => !x.down) || W.heroes[0]; W.descend = { by: h, to: W.step + 1, t: 0, slam: true }; W.net && W.net.event && W.net.event(['stairs', h.slot, W.step + 1]); }
  }
  if (W.kind === 'boss' && W.victoryT > 0) { W.victoryT -= dt; if (W.victoryT <= 0 && !W.descend) { const h = W.heroes.find(x => !x.down) || W.heroes[0]; W.descend = { by: h, to: -1, t: 0, ending: true }; W.net && W.net.event && W.net.event(['stairs', h.slot, -1]); } }
  // all down
  const alive = W.heroes.filter(h => !h.down && !h.gone).length;
  if (alive === 0 && W.heroes.length && !W.descend) {
    if (W.net) { if (W.net.host) W.net.allDown && W.net.allDown(); }
    else if (W.contT < 0) { W.contT = W.attract ? -1 : 10; W.contN = 10; if (W.attract) { for (const h of W.heroes) { h.down = false; h.hp = 500; } } else say('over', { force: true, cd: 0 }); }
  } else if (alive > 0) W.contT = -1;
  if (W.contT >= 0 && !W.net) {
    W.contT -= dt; W.contN = Math.ceil(W.contT);
    if (W.heroes.some(h => h.int.rise && h.downT > .5) || (game.input.pressed('start') && false)) { continueRun(); }
    else if (W.contT <= 0) { W.overT = 0; W.contT = -1; W.gameOver = true; }
  }
}
function continueRun() {
  W.contT = -1; RUN.continues++;
  W.heroes.forEach((h, i) => { h.down = false; h.hp = Math.round(TUNE.startHealth * DIFF[OPT.difficulty].hp); h.invuln = 1.5; h.rig.dieT = 0; h.rig.downW = 0; h.contUsed = (h.contUsed || 0) + 1; h.x = W.starts[i % W.starts.length].x; h.y = W.starts[i % W.starts.length].y; });
  sfx('rise'); say('rise', { hero: W.heroes[0], force: true, cd: 0 });
}
function spawnTithe() {
  const h = W.heroes.find(x => !x.down); if (!h) return;
  W.titheSpawned = true;
  const a = rnd(TAU); let x = h.x + Math.cos(a) * 150, y = h.y + Math.sin(a) * 150;
  for (let k = 0; k < 20 && W.map.solidAt(x, y); k++) { const a2 = rnd(TAU); x = h.x + Math.cos(a2) * 110; y = h.y + Math.sin(a2) * 110; }
  if (W.map.solidAt(x, y)) { x = h.x + 60; y = h.y; }
  const m = newMonster('t', x, y, 1, { emerge: .6 }); W.mons.push(m); W.tithe = m;
  say('tithe', { force: true }); sfx('tithe');
}
