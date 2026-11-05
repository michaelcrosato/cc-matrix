/* ============================================================================
 * SOPRANOS SUNDAYS  (src/c-play.js)  one step of play, the crew's minds, the fights,
 * the attract-mode bot, and the drawing of the town.
 * ========================================================================== */

// the crew's pickups from the map: cash, ammo, meatballs (each taken once, kept in the story's vars)
function ssInitPickups() {
  G.pickups = [];
  const kinds = { '$': 'cash', a: 'ammo', o: 'meatball' };
  for (const ch of Object.keys(kinds)) {
    const tag = { '$': 'cash', a: 'ammo', o: 'meatball' }[ch];
    for (const s of MAP.findAll(tag)) {
      const id = 'pick:' + s.x + ',' + s.y;
      if (G.V.dead.includes(id)) continue;
      G.pickups.push({ id, kind: kinds[ch], x: s.x, y: s.y, z: 0, amount: ch === '$' ? 80 : 0 });
    }
  }
}

function ssLiveFoes() { return G.foes.filter(f => !f.dead); }

// a foe is hit: knocked back, flashed, maybe dead
function ssHitFoe(f, dmg, sound) {
  if (f.dead) return;
  f.hp -= dmg; f.hit = .14;
  if (f.susp.state === 'calm') f.susp.state = 'alert';
  E.knockback(G.hero, f, 150, 40);
  G.game.hitFx(f.x, f.y, 8, { damage: dmg, angle: G.hero.facing });
  G.game.audio.sfx(sound || 'whack');
  if (f.hp <= 0) ssKill(f);
}

function ssKill(f) {
  const V = G.V, game = G.game;
  f.dead = true; f.dyingT = .9; V.kills += 1; V.dead.push(f.id);
  game.particles.sparks(f.x, f.y, 10, 8, f.facing);
  game.audio.sfx('hit');
  if (Math.random() < .4) G.pickups.push({ id: 'drop:' + f.id, kind: 'cash', x: f.x, y: f.y, z: 0, amount: E.randInt(15, 60) });
  if (f.kind === 'crew' && V.chapter === 2) {
    V.garageKills += 1;
    if (V.garageKills >= 4) {
      V.chapter = 3; G.story.done('garage');
      G.story.quest('doc', SS_QUESTS[2].title, SS_QUESTS[2].text);
      ssToast('The garage is quiet. Go see the doctor.', 4);
    }
  }
  if (f.kind === 'boss') {
    V.bossDead = true; V.respect += 5; G.won = true; G.story.done('pool');
    game.shake(8); game.freeze(.12);
    ssToast('Frankie is in the pool. Sunday is over.', 6);
    G.after = 4;   // the end screen, a few seconds on
  }
}

// the hero takes a hit (blocked halves it; a dodge or the invulnerability after one is none)
function ssHurtHero(dmg, from) {
  if (G.bot || G.invul > 0 || G.dodgeT > 0 || G.ended) return;
  const d = G.blocking ? dmg * .5 : dmg;
  G.hp -= d; G.invul = .9; G.hero.hurt = .9;
  E.knockback(from, G.hero, 170, 60);
  G.game.shake(4); G.game.audio.sfx('hurt');
  if (G.hp <= 0) ssDie();
}
function ssDie() {
  const V = G.V;
  G.hp = SS.maxHp; G.hero.x = G.spawn.x; G.hero.y = G.spawn.y; G.hero.vx = G.hero.vy = 0;
  V.cash = Math.floor(V.cash * .9);
  G.invul = 1.5;
  G.game.audio.sfx('die');
  ssToast('You came to at the doctor\'s. Ten percent of the envelope is gone.', 4);
}

// one foe's mind and body for a step: sees, decides, walks, swings, shoots
function ssStepFoe(f, dt) {
  const h = G.hero, game = G.game;
  if (f.dead) { f.dyingT -= dt; f.rig.update(dt, { x: f.x, y: f.y, z: f.z, pose: 'die' }); return; }
  f.hit -= dt; f.cool -= dt; f.shotCool -= dt;
  const sight = E.sees(f, h, { map: MAP, range: f.kind === 'boss' ? 190 : 150, fov: 1.9 });
  f.susp.update(dt, sight, h);
  const st = f.susp.state, d = E.dist(f, h);
  let mx = 0, my = 0, speed = 0;
  if (st === 'alert') {
    const dir = G.flow.dir(f.x, f.y, h.x, h.y);
    if (d > (f.kind === 'boss' ? 20 : 15)) { mx = dir[0]; my = dir[1]; speed = f.speed; }
    else f.facing = Math.atan2(h.y - f.y, h.x - f.x);
  } else if (st === 'search' && f.susp.last) {
    const a = E.angleTo(f, f.susp.last); mx = Math.cos(a); my = Math.sin(a); speed = f.speed * .7;
  } else if (st === 'notice') {
    f.facing = Math.atan2(h.y - f.y, h.x - f.x);
  } else {                                              // calm: a slow walk round the home
    f.goalT = (f.goalT || 0) - dt;
    if (!f.goal || f.goalT <= 0 || E.dist(f, f.goal) < 4) { f.goal = { x: f.home.x + E.rand(-22, 22), y: f.home.y + E.rand(-14, 14) }; f.goalT = E.rand(2, 4); }
    const a = E.angleTo(f, f.goal); mx = Math.cos(a); my = Math.sin(a); speed = 16;
  }
  f.vx = E.approach(f.vx, mx * speed, 260 * dt); f.vy = E.approach(f.vy, my * speed, 260 * dt);
  f.update(dt, MAP);
  if (Math.hypot(f.vx, f.vy) > 4) f.facing = Math.atan2(f.vy, f.vx);
  if (st === 'alert' && d < (f.kind === 'boss' ? 24 : 19) && f.cool <= 0 && !f.atk.busy) { f.atk.start(); f.cool = f.kind === 'boss' ? 1.7 : 1.3; }
  const ph = f.atk.update(dt);
  if (ph === 'active') game.audio.sfx('swing');
  if (f.atk.active) f.atk.hits([h], t => E.inArc(f, f.facing, t, f.kind === 'boss' ? 30 : 24, 1.3), t => ssHurtHero(f.kind === 'boss' ? 2 : 1, f));
  if (f.kind === 'boss' && st === 'alert' && f.shotCool <= 0 && sight.seen && d < 200) {
    f.shotCool = 2.2;
    const a = E.angleTo(f, h);
    G.shots.burst({ x: f.x, y: f.y, z: 16, team: 'foe', dmg: 1, life: 2.2, r: 2.5, color: '#ff8a6a' }, E.pattern.spread(a, 3, .5, 140).map(v => [v[0], v[1]]));
  }
  f.rig.update(dt, { x: f.x, y: f.y, z: f.z, vx: f.vx, vy: f.vy, facing: f.facing, attack: f.atk.state, hurt: f.hit > 0, run: Math.min(1, Math.hypot(f.vx, f.vy) / 50) });
}

// the crew's dead are gone once their dying is over
function ssPruneFoes() { E.prune(G.foes, f => f.dead && f.dyingT <= 0); }

// one step of play: the hero, the fights, the pickups, the talk. Returns nothing.
function ssPlayStep(dt, inp) {
  const g = G, h = g.hero, V = g.V, game = g.game, story = g.story;
  g.roundT += dt;
  if (g.invul > 0) g.invul -= dt;
  if (g.toastT > 0) g.toastT -= dt;
  g.cooldown -= dt; g.gunT -= dt; g.dodgeT -= dt;
  g.flow.update(h.x, h.y);
  // where the player wants to go, on the ground
  let mx = 0, my = 0;
  if (g.bot) {
    const obj = ssObjective(), p = ssObjectivePos(obj);
    const foe = ssLiveFoes().filter(f => E.dist(f, h) < 120).sort((a, b) => E.dist(a, h) - E.dist(b, h))[0];
    const goal = foe || p;
    // a bot that stops making progress (a wall in the way) walks a random way for a moment
    g.botLast = g.botLast || { x: h.x, y: h.y, t: 0 };
    if (E.dist(g.botLast, h) > 3) { g.botLast = { x: h.x, y: h.y, t: 0 }; } else g.botLast.t += dt;
    if (g.botLast.t > 1.2) { g.botWander = { a: E.rand(0, Math.PI * 2), t: .9 }; g.botLast.t = 0; }
    if (g.botWander && g.botWander.t > 0) { g.botWander.t -= dt; mx = Math.cos(g.botWander.a); my = Math.sin(g.botWander.a); }
    else if (goal) { const a = E.angleTo(h, goal); mx = Math.cos(a); my = Math.sin(a); }
    g.botTarget = goal;
  } else {
    const m = inp.move();
    let sx = m[0], sy = m[1];
    if (inp.lastDevice === 'gamepad') { if (game.settings.stickInvertX) sx = -sx; if (game.settings.stickInvertY) sy = -sy; }
    const d = game.view.screenDirToGround(sx, sy);
    mx = d[0]; my = d[1];
  }
  if (!g.bot) {
    if (inp.pressed('crouch')) h.sneak = !h.sneak;
    h.crouch = h.sneak;
    if (inp.pressed('camera')) { game.nextView(); ssToast('Camera: ' + (game.view.label || game.view.id), 2); }
    g.blocking = inp.down('block') && g.dodgeT <= 0;
    if (inp.pressed('dodge') && g.dodgeT <= -0.45 && g.cooldown <= 0) {
      g.dodgeT = .35; g.cooldown = .9;
      const m2 = Math.hypot(mx, my) > .1 ? [mx, my] : [Math.cos(h.facing), Math.sin(h.facing)];
      g.dodgeDir = m2; game.audio.sfx('whoosh');
    }
    if (inp.pressed('jump') && h.onGround) { h.jump(190); game.audio.sfx('jump'); }
    if (inp.pressed('use') && V.meatballs > 0 && g.hp < SS.maxHp) {
      V.meatballs -= 1; g.hp = Math.min(SS.maxHp, g.hp + 2); game.audio.sfx('heal'); ssToast('Meatball. Two hearts.', 2);
    }
    if (inp.pressed('interact')) {
      const who = ssNearestNpc(h.x, h.y, 34) || (g.boss && !g.boss.dead && ssTalkNode('frankie') && E.dist(h, g.boss) < 34 ? 'frankie' : null);
      if (who) story.run(ssTalkNode(who)); else ssToast('Nothing here but the sidewalk.', 1.6);
    }
  } else {
    h.sneak = false; h.crouch = false;
    g.blocking = false;
  }
  // moving: a dodge rolls, a block walks slow, the crouch walks slower
  const sprint = !g.bot && inp.down('sprint');
  let speed = sprint ? SS.sprintSpeed : SS.heroSpeed;
  if (g.blocking) speed *= .5;
  if (h.sneak) speed *= .6;
  if (g.dodgeT > 0) { h.vx = g.dodgeDir[0] * 170; h.vy = g.dodgeDir[1] * 170; }
  else { h.vx = E.approach(h.vx, mx * speed, 900 * dt); h.vy = E.approach(h.vy, my * speed, 900 * dt); }
  // facing: the way it walks; with the mouse in use and standing still, the way the pointer is on the ground
  const mg = !g.bot && inp.lastDevice === 'mouse' ? game.mouseGround() : null;
  if (Math.hypot(mx, my) > .1 && g.dodgeT <= 0) h.facing = Math.atan2(my, mx);
  else if (mg && g.dodgeT <= 0) h.facing = E.angleTo(h, { x: mg[0], y: mg[1] });
  h.update(dt, MAP);
  h.hurt = Math.max(0, h.hurt - dt);
  // melee: a three-hit combo, each swing hits once
  if (!g.bot && inp.buffered('attack') && g.combo.press()) inp.consume('attack');
  const cp = g.combo.update(dt);
  if (cp === 'active') game.audio.sfx('swing');
  const live = ssLiveFoes();
  g.combo.hits(live, f => E.inArc(h, h.facing, f, 26, 1.4), f => ssHitFoe(f, 1, 'whack'));
  // the pistol: aim assist turns to the nearest foe in front
  if (!g.bot && inp.pressed('gun') && g.gunT <= 0 && V.ammo > 0) {
    let a = h.facing; const t = live.filter(f => E.dist(f, h) < 140).sort((p, q) => E.dist(p, h) - E.dist(q, h))[0];
    if (t && Math.abs(E.angDiff(a, E.angleTo(h, t))) < 1.1) a = E.angleTo(h, t);
    V.ammo -= 1; g.gunT = .32; h.facing = a;
    g.shots.fire({ x: h.x + Math.cos(a) * 7, y: h.y + Math.sin(a) * 7, z: 14, vx: Math.cos(a) * 280, vy: Math.sin(a) * 280, team: 'player', dmg: 1, life: 1.1, r: 2, color: '#ffe38a' });
    game.audio.sfx('gunshot'); game.shake(1);
  }
  if (g.bot && live.length && E.dist(live[0], h) > 60 && g.gunT <= 0 && V.ammo > 0) { g.gunT = .5; V.ammo -= 1; const a = E.angleTo(h, live[0]); g.shots.fire({ x: h.x, y: h.y, z: 14, vx: Math.cos(a) * 280, vy: Math.sin(a) * 280, team: 'player', dmg: 1, life: 1.1, r: 2, color: '#ffe38a' }); }
  if (g.bot && !g.combo.busy && live.length && E.dist(live[0], h) < 22) g.combo.press();
    g.shots.update(dt, MAP);
  g.shots.hit(live, (b, f) => ssHitFoe(f, b.dmg, 'gunshot'), 'player');
  g.shots.hit([h], (b) => ssHurtHero(1, { x: b.x, y: b.y }), 'foe');
  // the crew
  for (const f of g.foes) ssStepFoe(f, dt);
  ssPruneFoes();
  // pickups: taken when the hero is near
  for (const p of g.pickups) {
    if (E.dist(p, h) > 12) continue;
    p.taken = true; V.dead.push(p.id);
    if (p.kind === 'cash') { V.cash += p.amount; game.audio.sfx('cashin'); ssToast('+$' + p.amount, 1.6); }
    if (p.kind === 'ammo') { V.ammo += 12; game.audio.sfx('pickup'); ssToast('Twelve rounds', 1.6); }
    if (p.kind === 'meatball') { V.meatballs += 1; game.audio.sfx('pickup'); ssToast('A meatball, for later', 1.6); }
  }
  E.prune(g.pickups, p => p.taken);
  // the story's clock: the talk gets its blips, one a letter, each at its own pitch
  const t = story.talk;
  if (t.open) {
    if (t.shown < g.lastShown) g.lastShown = 0;
    const n = Math.min(2, t.shown - g.lastShown);
    for (let i = 0; i < n; i++) if (Math.random() < .8) game.audio.sfx('gibber', { pitch: E.rand(.7, 1.6), vol: .9 });
    g.lastShown = t.shown;
  } else g.lastShown = 0;
  // the Sunday round, reported to AI Hub once a second
  if (g.session && window.AIHub) {
    g.scoreT -= dt;
    if (g.scoreT <= 0) { g.scoreT = 1; AIHub.progress({ score: SS.score(V), label: '$' + V.cash + ' · respect ' + V.respect }); }
  }
  ssPruneFoes();
}

// the attract mode: the same rules, the player is a bot with no health to lose
function ssBotStep(dt) {
  const g = G, story = g.story;
  g.botT = (g.botT || 0) - dt;
  if (story.running) {
    if (g.botT <= 0) { g.botT = .85; g.botTapAt = g.game.time; g.game.input.tap('confirm'); }
    return;
  }
  const obj = ssObjective();
  const p = ssObjectivePos(obj);
  if (p && E.dist(g.hero, p) < 24 && obj && obj.who && !(G.foes.some(f => !f.dead && E.dist(f, g.hero) < 30))) {
    const node = ssTalkNode(obj.who);
    if (node && g.botT <= 0) { story.run(node); g.botT = .85; }
  }
}

// ---- drawing: the town, its people, the crew, the pickups, the HUD
function ssDraw(r) {
  const g = G, h = g.hero, V = g.V, game = g.game;
  MAP.drawFloor(r); MAP.queueWalls(r);
  for (const who in g.npcs) {
    const n = g.npcs[who];
    r.shadow(n.body.x, n.body.y, 6);
    r.actor(n.body.x, n.body.y, n.body.z || 0, (gg, ox, oy) => n.rig.draw(gg, ox, oy, r.view), { outline: true });
  }
  for (const p of g.pickups) {
    r.shadow(p.x, p.y, 4, .4);
    r.sprite(p.x, p.y, 0, SPR[p.kind === 'cash' ? 'cash' : p.kind === 'ammo' ? 'ammo' : 'meatball'], { anchor: 'bottom' });
  }
  for (const f of g.foes) {
    if (f.dead && f.dyingT <= 0) continue;
    r.shadow(f.x, f.y, f.kind === 'boss' ? 9 : 6);
    r.actor(f.x, f.y, f.z || 0, (gg, ox, oy) => f.rig.draw(gg, ox, oy, r.view), { outline: true, flash: f.hit > 0 ? '#ffffff' : undefined, alpha: f.dead ? Math.max(0, f.dyingT / .9) : 1 });
  }
  const blink = g.invul > 0 && Math.floor(game.time * 14) % 2 === 0;
  r.shadow(h.x, h.y, 6);
  r.actor(h.x, h.y, h.z || 0, (gg, ox, oy) => g.rig.draw(gg, ox, oy, r.view), { outline: true, alpha: blink ? .35 : 1 });
  g.shots.draw(r);
  const obj = ssObjective(), op = ssObjectivePos(obj);
  if (op) r.marker(op.x, op.y, op.z || 0, { label: '', color: '#ffd36a' });
  g.story.draw(r);
  // the HUD, in screen pixels
  r.overlay(gg => E.ui.hearts(gg, 6, 6, g.hp, SS.maxHp));
  r.text('$' + V.cash, 6, 20, '#ffe08a', { shadow: '#000', outline: false });
  r.text('RESPECT ' + V.respect, 6, 28, '#e8e4ff', { shadow: '#000', outline: false });
  r.text('PISTOL ' + V.ammo + '   MEATBALLS ' + V.meatballs, r.W - 6, r.H - 12, '#ffffff', { align: 'right', shadow: '#000', outline: false });
  if (obj) r.text(obj.text, r.W / 2, 6, '#ffe9b0', { align: 'center', shadow: '#000', outline: false });
  if (!g.bot && !g.story.running) {
    const who = ssNearestNpc(h.x, h.y, 34);
    if (who) r.text(game.input.label('interact') + '  TALK TO ' + SS_PEOPLE[who].name, r.W / 2, r.H - 26, '#ffffff', { align: 'center', shadow: '#000', outline: false });
  }
  if (g.toastT > 0) r.text(g.toast, r.W / 2, r.H * .62, '#ffffff', { align: 'center', shadow: '#000', outline: false });
  if (g.bot) r.text('ATTRACT · PRESS ANY BUTTON TO PLAY', r.W / 2, r.H - 10, '#c8b8ff', { align: 'center', shadow: '#000', outline: false });
  if (g.session && window.AIHub) {
    const left = Math.max(0, SS.roundMinutes * 60 - Math.max(0, AIHub.time()) / 1000);
    r.text('ROUND ' + Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0') + '   SCORE ' + SS.score(V), r.W - 6, 6, '#ffe08a', { align: 'right', shadow: '#000', outline: false });
  }
}
