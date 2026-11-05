/* ---- HEROES: intent -> movement, aim, fire (throw or smart melee), plant, magic; the drain; falling and rising ---- */
const AIM_ASSIST = { off: 0, low: 8 * Math.PI / 180, high: 16 * Math.PI / 180 };

function stepHero(h, dt) {
  h.isHero = true;
  const I = h.intent, own = W.auth || !h.remote;   // a client simulates only its own hero
  h.hurtT = Math.max(0, h.hurtT - dt); h.eatT = Math.max(0, h.eatT - dt); h.castT = Math.max(0, h.castT - dt); h.throwT = Math.max(0, h.throwT - dt); h.riseT = Math.max(0, h.riseT - dt);
  h.joinT = Math.max(0, h.joinT - dt);
  if (!h.alive) { h.deadT += dt; h.vx = h.vy = 0; return; }
  if (h.sinkT) return;   // going down the stairs
  if (!own) return;
  // the drain: every second on a floor, every living hero (triple inside the King's famine fog)
  if (W.auth && !CHEATS.god && !(W.role === 'attract')) {
    const fog = W.boss && W.boss.fog && inFog(h) ? 3 : 1;
    h.hp -= TUNE.drain * diff().drain * (W.descent > 1 ? 1.5 : 1) * fog * dt;
    if (h.hp <= 0) { fall(h); return; }
  }
  for (const k of ['stun', 'runeImmune', 'queasy', 'inv', 'cool', 'onMenu']) h[k] = Math.max(0, h[k] - dt);
  for (const k in h.grace) if ((h.grace[k] -= dt) <= 0) delete h.grace[k];
  if (h.amulet && (h.amulet.t -= dt) <= 0) { h.amulet = null; emit('amuletEnd', { h }); }
  const stunned = h.stun > 0, D = h.D;
  // movement
  let [mx, my] = I.move; const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
  const starving = h.hp < 200 ? .92 : 1;
  const speed = D.speed * TUNE.heroSpeed * (h.specials.featherfoot ? 1.12 : 1) * (h.queasy > 0 ? .6 : 1) * starving;
  const planted = !!I.plant || stunned;
  if (ml > .1) h.facing = Math.atan2(my, mx);
  if (planted) { h.vx = h.vy = 0; } else { h.vx = mx * speed; h.vy = my * speed; }
  if (h.combo.busy && !planted) { h.vx *= .45; h.vy *= .45; }
  const ox = h.x, oy = h.y;
  if (CHEATS.noclip) { h.x += h.vx * dt; h.y += h.vy * dt; } else h.update(dt, W.map);
  h.x = clamp(h.x, T, (W.p.w - 1) * T); h.y = clamp(h.y, T, (W.p.h - 1) * T);
  leash(h, ox, oy);
  pushWalls(h, mx, my, dt);
  // aim: the intent's angle (right stick, mouse), else the way the hero faces; aim assist bends it to a target
  let aim = I.aim !== null && I.aim !== undefined ? I.aim : h.facing;
  const cone = AIM_ASSIST[game.settings.aimAssist] || 0;
  if (cone && W.auth) { const t = assistTarget(h, aim, cone); if (t) aim = Math.atan2(t.y - h.y, t.x - h.x); }
  h.aim = aim;
  // melee timing (the combo runs its phases; hits land in its active phase)
  const ph = h.combo.update(dt);
  if (ph === 'active') emit('swing', { h });
  if (h.combo.active && W.auth) meleeHits(h);
  if (stunned) return;
  // fire: held for auto-fire at the class's rate; at arm's length the hero strikes instead of throwing
  if (I.fire && h.cool <= 0) {
    const foe = meleeTarget(h, aim);
    if (foe) { h.combo.press(); h.cool = .42 / TUNE.shotRate; h.facing = aim; emit('melee', { h }); }
    else throwShot(h, aim);
  }
  if (I.magic) { I.magic = false; useMagic(h, I.view); }
}

/** local co-op: a hero can't stretch the shared screen past its edge (the party's box must fit the visible ground) */
function leash(h, ox, oy) {
  if (W.role !== 'local' || !W.leash || CHEATS.noclip) return;
  const others = W.heroes.filter(q => q.alive && q !== h && !q.remote); if (!others.length) return;
  const L2 = W.leash, xs = others.map(q => q.x), ys = others.map(q => q.y), span = (l, v) => Math.max(...l, v) - Math.min(...l, v);
  // only a step that stretches the party past the screen is held back (a party already apart may close up freely)
  if (span(xs, h.x) > L2[0] && span(xs, h.x) > span(xs, ox)) h.x = ox;
  if (span(ys, h.y) > L2[1] && span(ys, h.y) > span(ys, oy)) h.y = oy;
}

/** pushing into a wall: a door with a key, a fake wall (it was lying), or any wall once walls are stairs */
function pushWalls(h, mx, my, dt) {
  if (Math.hypot(mx, my) < .3) { h.pushT = 0; h.wallStair = 0; return; }
  const ax = Math.abs(mx) > Math.abs(my), dx = ax ? Math.sign(mx) : 0, dy = ax ? 0 : Math.sign(my);
  const cx = cellOf(h.x + dx * (h.r + 3)), cy = cellOf(h.y + dy * (h.r + 3)), c = W.map.cell(cx, cy), k = cx + ',' + cy;
  if (!c) { h.pushT = 0; h.wallStair = 0; return; }
  if (!W.auth) return;
  if (W.fake.has(k)) { h.pushT += dt; if (h.pushT > .15) { revealFake(cx, cy, h); h.pushT = 0; } return; }
  if (W.impatience >= 3 && c !== WT.table && cx > 0 && cy > 0 && cx < W.p.w - 1 && cy < W.p.h - 1) {
    h.wallStair += dt; if (h.wallStair >= 1 && !W.done) { descend(h, null); }
  }
}
function revealFake(cx, cy, h) {
  const k = cx + ',' + cy; if (!W.fake.has(k)) return;
  W.fake.delete(k); W.map.set(cx, cy, 0);
  if (first('secret')) say('tip_secret', h, 1);
  emit('wall', { cx, cy, kind: 'fake' }, ['wall', cx, cy]);
}

/** the nearest monster or generator inside the aim cone (aim assist) */
function assistTarget(h, aim, cone) {
  let best = null, bd = 200 * 200;
  const look = q => { if (q.dead || q.hidden) return; const d = dist2(h, q); if (d > bd) return; if (Math.abs(E.angDiff(aim, Math.atan2(q.y - h.y, q.x - h.x))) > cone) return; if (!shotClear(h, q)) return; bd = d; best = q; };
  for (const m of W.monsters) if (!m.rise) look(m);
  for (const g of W.gens) look(g);
  if (W.boss && !W.boss.dead) look(W.boss);
  return best;
}
/** smart melee: a monster (not a ghost) within reach inside +-50 degrees of the aim */
function meleeTarget(h, aim) {
  let best = null;
  for (const m of W.monsters) {
    if (m.dead || m.rise || m.D.noMelee || m.hidden) continue;
    const reach = h.r + m.r + 8; if (!near(h, m, reach)) continue;
    if (Math.abs(E.angDiff(aim, angTo(h, m))) > .87) continue;
    best = m; break;
  }
  if (!best) for (const g of W.gens) if (!g.dead && near(h, g, h.r + g.r + 8) && Math.abs(E.angDiff(aim, angTo(h, g))) < .87) { best = g; break; }
  if (!best && W.boss && !W.boss.dead && near(h, W.boss, h.r + W.boss.r + 8)) best = W.boss;
  return best;
}
function meleeHits(h) {
  const dmg = h.D.melee.dmg * (h.specials.ogreale ? 1.5 : 1), list = W.monsters.filter(m => !m.dead && !m.rise && !m.D.noMelee).concat(W.gens.filter(g => !g.dead), W.boss && !W.boss.dead ? [W.boss] : []);
  h.combo.hits(list, q => E.inArc(h, h.aim, q, 22 + (q.r || 5), 1.2), q => {
    damage(q, dmg, { by: h, kind: 'melee' });
    emit('meleeHit', { h, q, dmg });
  });
  // cracked walls in front take the blow too
  const fx = cellOf(h.x + Math.cos(h.aim) * 14), fy = cellOf(h.y + Math.sin(h.aim) * 14);
  if (W.cracked.has(fx + ',' + fy) && !h._crackHit) { h._crackHit = true; hitCracked(fx, fy, dmg, h); }
  if (!h.combo.active) h._crackHit = false;
}

/** throw the class's shot from the weapon hand */
function throwShot(h, aim) {
  const D = h.D, s = D.shot, rate = TUNE.shotRate * (h.specials.quickshot ? 1 / .75 : 1);
  h.cool = s.cd / rate; h.throwT = .18; h.facing = aim;
  if (!W.auth) { clientShot(h, aim); return; }
  const speed = s.speed * (h.specials.quickshot ? 1.2 : 1), rend = h.amulet && h.amulet.type === 'rending';
  const dmg = (s.dmg + (h.specials.hardshot ? 1 : 0) + (rend ? 1 : 0)) * TUNE.shotDamage;
  const b = W.shots.fire({ x: h.x + Math.cos(aim) * 7, y: h.y + Math.sin(aim) * 7, z: 12, vx: Math.cos(aim) * speed, vy: Math.sin(aim) * speed, r: 3, dmg, life: 220 / speed, team: 'hero',
    pierce: true, left: rend ? 99 : s.pierce + 1, splash: s.splash, owner: h.id, kind: s.kind, color: h.color, bounce: h.amulet && h.amulet.type === 'ricochet' ? 3 : 0, rot: aim });
  if (b) b.onWall = (bb, cx, cy) => { if (W.cracked.has(cx + ',' + cy)) hitCracked(cx, cy, bb.dmg, h); if (bb.splash) splash(bb, h); };
  emit('throw', { h, kind: s.kind }, null);
}

/** a Blast Flask: every monster on the user's screen; generators; the Tithe dies */
function useMagic(h, view) {
  if (h.flasks <= 0 && !CHEATS.infinite && !(W.role === 'attract')) return false;
  if (!W.auth) { if (h.flasks <= 0) return false; h.castT = .5; h.wantMagic = true; emit('magicLocal', { h }); return true; }
  if (!CHEATS.infinite && W.role !== 'attract') h.flasks--;
  h.castT = .5;
  blast(h, screenRect(h, view), 1);
  if (first('magic')) say('tip_magic', h, 1);
  return true;
}
/** magic damage in a rectangle (power 1; a shot flask's is half, round it) */
function blast(h, R, power, round) {
  const mp = h.D.magic[0] * TUNE.magicPower * (h.specials.witchwater ? 1.5 : 1) * power, gp = h.D.magic[1] * TUNE.magicPower * (h.specials.witchwater ? 1.5 : 1) * power;
  const inside = q => round ? near(q, round, round.r) : inRect(q, R);
  for (const m of W.monsters) if (!m.dead && inside(m)) damage(m, m.D.immune ? 999 : Math.ceil(4 * mp), { by: h, kind: 'magic' });
  for (const g of W.gens) if (!g.dead && inside(g)) damage(g, Math.ceil(2 * gp), { by: h, kind: 'magic' });
  if (W.boss && !W.boss.dead && inside(W.boss)) damage(W.boss, W.boss.max * .06 * power, { by: h, kind: 'magic' });
  W.magicFlash = .35; W.quake = .3;
  emit('magic', { h, x: round ? round.x : h.x, y: round ? round.y : h.y, r: round ? round.r : null }, ['magic', h.id, Math.round(round ? round.x : h.x), Math.round(round ? round.y : h.y), round ? round.r : 0]);
}

/** a hero takes damage: armor, difficulty, Iron Brew; Ironskin, God mode and the arrival grace stop it */
function hurtHero(h, amount, o) {
  if (!h.alive || CHEATS.god || W.role === 'attract' || (h.amulet && h.amulet.type === 'ironskin') || (h.inv > 0 && o.kind !== 'drain')) return 0;
  const k = o.kind === 'drain' ? 1 : h.D.armor * diff().dmg * TUNE.monsterDamage * (h.specials.ironbrew ? .8 : 1);
  const a = amount * k; if (a <= 0) return 0;
  h.hp -= a;
  if (o.kind !== 'drain') { h.hurtT = .25; if (o.from) { const an = angTo(o.from, h); h.push(Math.cos(an) * 60, Math.sin(an) * 60); } }
  emit('hurt', { h, amount: a, kind: o.kind }, ['hurt', h.id, Math.round(a)]);
  if (h.hp <= 0) fall(h);
  return a;
}
function fall(h) {
  if (!h.alive) return;
  h.alive = false; h.hp = 0; h.deadT = 0; h.vx = h.vy = 0; h.amulet = null; h.onMenu = 0;
  if (W.bell && W.bell.target === h) W.bell.target = null;
  say('eaten', h, 3);
  emit('fall', { h }, ['fall', h.id]);
  if (!W.heroes.some(q => q.alive)) emit('allDown', {});
}
/** rise again beside a living ally (or on the floor's starts) with the starting health */
function rise(h, hp, cost) {
  if (h.alive || !W) return false;
  const ally = W.heroes.find(q => q.alive && q !== h), s = W.p.starts[0];
  let x = ally ? ally.x : mid(s.cx), y = ally ? ally.y : mid(s.cy);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0]]) { const nx = x + dx * 14, ny = y + dy * 14; if (W.map.walkable(cellOf(nx), cellOf(ny)) && !W.map.cell(cellOf(nx), cellOf(ny))) { x = nx; y = ny; break; } }
  Object.assign(h, { alive: true, hp: hp || startHealth(), x, y, vx: 0, vy: 0, inv: 1.5, riseT: 1, stun: 0 });
  if (cost) h.score = Math.max(0, h.score - cost); else h.continues++;
  say('rise', h, 2);
  emit('rise', { h }, ['rise', h.id]);
  return true;
}

/* ---- pickups: on touch ---- */
function pickups(h) {
  for (const it of W.items) {
    if (it.gone) continue;
    const reach = it.D.onTable ? h.r + 12 : h.r + 5;
    if (!near(h, it, reach)) continue;
    take(h, it);
  }
  if (W.bell && !W.bell.rung && near(h, W.bell, h.r + 9)) ringBell(h);
}
/** a hero takes an item (host and local decide; clients ask by touching) */
function take(h, it) {
  const D = it.D, lim = heroLimit(h);
  switch (D.kind) {
    case 'key': if (h.keys >= lim) return; h.keys++; if (first('key')) say('key_first', h, 1); break;
    case 'flask': if (h.flasks >= lim) return; h.flasks++; if (first('flask')) say('tip_magic', h, 1); break;
    case 'food': { const heal = TUNE.foodHeal * D.heal; h.hp += heal; h.eatT = .4; h.stats.food++; if (first('food')) say('tip_food', h, 1); if (h.stats.food === 8) say('glutton', h, 1); emit('eat', { h, it, heal }); break; }
    case 'stew': h.hp = Math.max(1, h.hp - 50); h.queasy = 4; say('ate_stew', h, 2); emit('stew', { h, it }); break;
    case 'special': if (h.specials[it.sub]) return; h.specials[it.sub] = true; say('special_' + it.sub, h, 2); break;
    case 'amulet': h.amulet = { type: it.sub, t: AMULET_TIME }; say('amulet_' + it.sub, h, 2); break;
    case 'treasure': h.stats.treasure++; if (first('treasure')) say('treasure_first', h, 1); break;
    case 'chest':
      if (D.locked) { if (h.keys <= 0 && !CHEATS.infinite) { if (!h.warned.chest) { h.warned.chest = true; say('tip_chest', h, 1); } return; } if (!CHEATS.infinite) h.keys--; }
      h.stats.treasure++; it.open = true; chestDrop(h, it); break;
    case 'gauntlet': h.stats.treasure++; say('gauntlet', h, 3); W.done = { to: 'ending', by: h, why: 'gauntlet' }; break;
  }
  it.gone = true;
  award(h, D.points, it, D.kind);
  emit('take', { h, it }, ['gone', it.id, h.id]);
  if (W.treasure && ['treasure', 'chest'].includes(D.kind) && !W.items.some(i => !i.gone && ['treasure', 'chest'].includes(i.D.kind))) { award(h, 2000, h, 'hoard'); say('hoard_clear', h, 2); }
}
/** a chest's prize: a locked one drops a flask, a roast or a key (or the floor's set prize) */
function chestDrop(h, it) {
  const set = W.F.chest && W.F.chest[it.cx + ',' + it.cy];
  if (set) { if (set.startsWith('special:')) { const sp = set.slice(8); if (!h.specials[sp]) { h.specials[sp] = true; award(h, 250, it, 'special'); say('special_' + sp, h, 2); } } return; }
  if (!it.D.locked) return;
  const pick = ['flask', 'roast', 'key'][rng.int(0, 2)];
  addItem(pick, it.x + 10, it.y + 4);
}
function addItem(type, x, y, sub) {
  const D = get('items', type), it = { id: W.nextId++, type, D, x, y, z: 0, cx: cellOf(x), cy: cellOf(y), sub, gone: false, t: 0, dropped: true };
  W.items.push(it); emit('drop', { it }, ['drop', it.id, type, Math.round(x), Math.round(y), sub || 0]);
  return it;
}

/* ---- doors: a hero with a key who pushes into a door opens its whole run ---- */
function doors(h) {
  if (h.keys <= 0 && !CHEATS.infinite) return;
  for (const d of W.doors) {
    if (d.open) continue;
    if (!d.cells.some(([cx, cy]) => Math.abs(h.x - mid(cx)) < T / 2 + h.r + 3 && Math.abs(h.y - mid(cy)) < T / 2 + h.r + 3)) continue;
    if (!CHEATS.infinite) h.keys--;
    openDoor(d, h);
    if (first('door')) say('tip_door', h, 1);
    return;
  }
}
function openDoor(d, h) {
  if (d.open) return; d.open = true; d.openT = W.t;
  for (const [cx, cy] of d.cells) W.map.set(cx, cy, 0);
  emit('door', { d, h }, ['door', d.id]);
}

/* ---- the stairs: stand on them for a moment and everyone goes down; the taker gets the bonus ---- */
function stairs(dt) {
  if (W.done) return;
  for (const h of W.heroes) {
    if (!h.alive) continue;
    const s = W.stairs.find(s => s.cx === cellOf(h.x) && s.cy === cellOf(h.y));
    if (!s) { h.stair = 0; continue; }
    h.stair += dt;
    if (h.stair >= TUNE.stairHold) { descend(h, s.to); return; }
  }
}
function descend(h, to) {
  if (W.done) return;
  let target = W.index + 1;
  if (to) { const i = FLOOR_ORDER.findIndex(id => get('floors', id).no === to); if (i > W.index) target = i; }
  if (h && !W.treasure) { const bonus = 500 + 5 * Math.max(0, Math.round((W.F.par || 150) - W.t)); award(h, bonus, h, 'exit'); }
  if (h) say(to ? 'skip' : 'stairs', h, 2);
  for (const q of W.heroes) if (q.alive) q.stats.floors++;
  W.done = { to: target, by: h, why: to ? 'skip' : 'stairs' };
  emit('descend', { h, to: target }, ['stairs', h ? h.id : -1, target]);
}

/* ---- the Dinner Bell: whoever rings it is ON THE MENU for 12 seconds; touching an ally passes it on ---- */
function ringBell(h) {
  const b = W.bell; b.rung = true; b.target = h; b.t = 12; b.swing = 1; h.onMenu = 12;
  say('bell', h, 2); emit('bell', { h }, ['bell', h.id]);
}
function stepBell(dt) {
  const b = W.bell; if (!b) return; b.swing = Math.max(0, b.swing - dt * .5);
  if (!b.target) return;
  b.t -= dt; const h = b.target;
  if (b.t <= 0 || !h.alive) { b.target = null; h.onMenu = 0; return; }
  h.onMenu = b.t;
  for (const q of W.heroes) if (q !== h && q.alive && near(q, h, q.r + h.r + 2) && !(h._passT > 0)) { b.target = q; q.onMenu = b.t; h.onMenu = 0; q._passT = .8; say('bell_pass', q, 2); emit('bell', { h: q }, ['bell', q.id]); return; }
  for (const q of W.heroes) if (q._passT > 0) q._passT -= dt;
}
