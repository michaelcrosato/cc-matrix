/* ---- KING FAMISH: the banquet's three phases. 1 "Dinner is served": plates and the stomp; tureens breed ghosts.
   2 "Second helpings": he eats the platters (heals) unless you shoot or eat them first; gnasher waves. 3 "The Gaunt
   hungers": his ribcage opens (shots from the front deal double), he charges, breathes famine fog, the Tithe comes ---- */
function startBoss(x, y) {
  const n = Math.max(1, PARTY.length), hp = Math.round(400 * (1 + .5 * (n - 1)) * (W.descent > 1 ? 1.3 : 1));
  W.boss = Object.assign(new E.Body({ x, y: y + 24, r: 12, friction: 0 }), { isBoss: true, hp, max: hp, phase: 0, state: 'throne', stateT: 0, cd: 2, waveT: 6, facing: Math.PI / 2, open: false,
    fog: null, charge: null, eatT: 0, eating: null, rage: false, home: { x, y: y + 24 }, dead: false, deadT: 0, titheCalled: false, hitT: 0, stomp: 0, throwT: 0, chew: 0, grace: {}, denied: 0, dropped: false });
}
const BOSS_LINES = { 1: 'king_intro', 2: 'king_p2', 3: 'king_p3' };
function bossSay(storyKey, prio = 3) { bus.emit('kingSays', { text: STORY[storyKey] }); if (W.role === 'host') W.events.push(['king', storyKey]); }
function stepBoss(dt) {
  const K = W.boss; K.hitT = Math.max(0, K.hitT - dt); K.stomp = Math.max(0, K.stomp - dt); K.throwT = Math.max(0, K.throwT - dt); K.chew = Math.max(0, K.chew - dt);
  for (const k in K.grace) if ((K.grace[k] -= dt) <= 0) delete K.grace[k];
  if (K.dead) {
    K.deadT += dt; K.vx = K.vy = 0;
    if (K.deadT > 2.4 && !K.dropped) { K.dropped = true; addItem('gauntlet', K.x, K.y + 6); emit('gauntletDrop', { K }); }
    return;
  }
  const live = liveHeroes(); if (!live.length) { K.vx = K.vy = 0; return; }
  let tg = live[0], td = 1e9; for (const h of live) { const d = Math.hypot(h.x - K.x, h.y - K.y); if (d < td) { td = d; tg = h; } }
  if (K.phase === 0) { K.vx = K.vy = 0; if (td < 10 * T) { K.phase = 1; say('king_intro', null, 3); bossSay('king_intro'); emit('boss', { phase: 1 }, ['boss', 1]); } return; }
  const frac = K.hp / K.max, want = frac > .7 ? 1 : frac > .35 ? 2 : 3;
  if (want > K.phase) {
    K.phase = want; K.state = 'move'; K.stateT = 0; K.charge = null; K.eating = null;
    bossSay(want === 2 ? 'king_p2' : 'king_p3'); emit('boss', { phase: want }, ['boss', want]);
    if (want === 2) say('king_eating', null, 2);
    if (want === 3) { K.open = true; if (!K.titheCalled) { K.titheCalled = true; summonTithe(); } }
  }
  K.cd -= dt; K.stateT += dt;
  // contact: brushing against the King hurts
  for (const h of live) if (near(h, K, h.r + K.r + 1) && !K.grace[h.id]) { K.grace[h.id] = .6; damage(h, 10, { kind: 'contact', from: K }); }
  // gnasher waves through the doorways (phase 2 on)
  if (K.phase >= 2 && (K.waveT -= dt) <= 0) { K.waveT = 12; wave(); }
  if (K.phase === 3 && K.state !== 'charge' && K.state !== 'aim' && (K.fogT = (K.fogT || 4) - dt) <= 0) { K.fogT = 8; K.fog = { x: K.x, y: K.y, a: angTo(K, tg), t: 4 }; emit('fog', { K }); }
  if (K.fog && (K.fog.t -= dt) <= 0) K.fog = null;
  switch (K.state) {
    case 'stomp':   // a stomp: 0.6 s wind-up, then a ring that hurts within 46
      K.vx = K.vy = 0;
      if (K.stateT >= .6) { K.state = 'move'; K.cd = 1.4; K.stomp = .5; W.quake = .4; for (const h of live) if (near(h, K, 46 + h.r)) damage(h, 15, { kind: 'contact', from: K }); emit('stomp', { K }); }
      return;
    case 'eat':
      K.vx = K.vy = 0; K.chew = .2;
      if (!K.eating || K.eating.gone) { K.state = 'move'; K.eating = null; say('king_eating', null, 1); return; }
      K.hp = Math.min(K.max, K.hp + K.max * .05 * dt);
      if (K.stateT >= 2.5) { K.eating.gone = true; emit('kingAte', { it: K.eating }, ['gone', K.eating.id, -4]); K.eating = null; K.state = 'move'; K.cd = .8; }
      return;
    case 'aim':   // a charge: a 0.6 s line on the floor, then a dash
      K.vx = K.vy = 0;
      if (K.stateT >= .6) { K.state = 'charge'; K.stateT = 0; emit('charge', { K }); }
      return;
    case 'charge': {
      const a = K.charge.a, s = 170; K.vx = Math.cos(a) * s; K.vy = Math.sin(a) * s; K.facing = a;
      const ox = K.x, oy = K.y; K.update(dt, W.map);
      for (const h of live) if (near(h, K, h.r + K.r + 3) && !K.grace['c' + h.id]) { K.grace['c' + h.id] = 1; damage(h, 15, { kind: 'contact', from: K }); }
      if (K.stateT > 1.1 || Math.hypot(K.x - ox, K.y - oy) < s * dt * .3) { K.state = 'move'; K.cd = 1.6; K.charge = null; W.quake = .25; emit('stomp', { K }); }
      return;
    }
  }
  // moving: phase 1 stays by the throne; phase 2 goes for the platters; phase 3 hunts
  const platters = W.items.filter(i => !i.gone && i.type === 'platter');
  let goal = K.home, speed = 30;
  if (K.phase === 2 && platters.length) { const p = platters.reduce((a, b) => Math.hypot(a.x - K.x, a.y - K.y) < Math.hypot(b.x - K.x, b.y - K.y) ? a : b); goal = { x: p.x + (K.x < p.x ? -18 : 18), y: p.y }; if (Math.hypot(goal.x - K.x, goal.y - K.y) < 6) { K.state = 'eat'; K.stateT = 0; K.eating = p; emit('kingEats', { it: p }); return; } }
  else if (K.phase === 2 && !K.rage) { K.rage = true; emit('roar', { K }); }
  else if (K.phase === 3) { goal = tg; speed = 36; }
  if (K.rage) speed = 40;
  const gd = Math.hypot(goal.x - K.x, goal.y - K.y);
  if (gd > 8) { const d = W.bellFlow.dir ? (() => { W.bellFlow.update(goal.x, goal.y); return W.bellFlow.dir(K.x, K.y, goal.x, goal.y); })() : [(goal.x - K.x) / gd, (goal.y - K.y) / gd]; K.vx = d[0] * speed; K.vy = d[1] * speed; K.facing = Math.atan2(d[1], d[0]); }
  else { K.vx = K.vy = 0; K.facing = angTo(K, tg); }
  K.update(dt, W.map);
  if (K.cd > 0) return;
  if (td < 44 && K.phase < 3) { K.state = 'stomp'; K.stateT = 0; emit('windup', { m: K }); return; }
  if (K.phase === 3 && rng.r() < .5 && td < 180) { K.state = 'aim'; K.stateT = 0; K.charge = { a: angTo(K, tg), x: K.x, y: K.y }; emit('windup', { m: K }); return; }
  // three plates in a fan, lobbed at the target (shadows mark where they land)
  K.cd = K.rage ? 1.6 : K.phase === 3 ? 2 : 2.5; K.throwT = .4; K.facing = angTo(K, tg);
  for (const s of [-1, 0, 1]) {
    const a = angTo(K, tg) + s * .3, d = Math.min(150, td), tx = K.x + Math.cos(a) * d, ty = K.y + Math.sin(a) * d, arc = E.arc({ x: K.x, y: K.y, z: 30 }, { x: tx, y: ty, z: 0 }, 260, { apex: 50 });
    W.eshots.fire({ x: K.x, y: K.y, z: 30, vx: arc.vx, vy: arc.vy, vz: arc.vz, grav: 260, r: 3, dmg: 10, life: arc.t + .02, team: 'lob', kind: 'plate', lx: tx, ly: ty, color: '#e8e8f0', id: W.nextId++, splash: 12 });
  }
  emit('plates', { K });
}
function wave() {
  const pts = (W.F.points && W.F.points.wave) || [];
  if (W.monsters.filter(m => !m.dead).length + pts.length * 2 > Math.min(40, monsterCap())) return;
  for (const [cx, cy] of pts) for (let i = 0; i < 2; i++) spawnMonster('gnasher', mid(cx) + (i - .5) * 8, mid(cy), 2, { rise: .3 });
  if (pts.length) emit('wave', {});
}
function inFog(h) { const f = W.boss && W.boss.fog; if (!f) return false; const d = Math.hypot(h.x - f.x, h.y - f.y); return d < 130 && Math.abs(E.angDiff(Math.atan2(h.y - f.y, h.x - f.x), f.a)) < .55; }
function hurtBoss(K, amount, by, o) {
  if (K.dead) return 0;
  if (K.phase === 0) { K.phase = 1; emit('boss', { phase: 1 }, ['boss', 1]); }
  if (CHEATS.onehit && by) amount = K.hp;
  K.hp -= amount; K.hitT = .1;
  emit('bossHit', { K, amount, by }, null);
  if (K.hp <= 0) {
    K.hp = 0; K.dead = true; K.deadT = 0; K.state = 'dead'; W.cheer = true;
    if (by && by.isHero) award(by, 10000, K, 'king');
    for (const m of W.monsters) if (!m.dead) killMonster(m, null, 'magic');
    for (const g of W.gens) if (!g.dead) { g.dead = true; emit('genDead', { g }, ['gen', g.id]); }
    say('king_dead', by, 3); bossSay('king_defeat');
    emit('bossDead', { K, by }, ['boss', 4]);
  }
  return amount;
}
