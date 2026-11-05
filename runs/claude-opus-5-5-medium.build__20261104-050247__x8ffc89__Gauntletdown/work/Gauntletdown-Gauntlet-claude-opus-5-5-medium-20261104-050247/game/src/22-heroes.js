/* 22-heroes: a hero's step from its intent { mx, my, aim, fire, magic, plant, rise }: movement, the drain, throws,
 * smart melee, magic, pickups, doors and stairs. Local input, the network and the bot all produce intents. */

const SHOT_RANGE = 220;
function heroSpeed(h) { return h.D.speed * TUNE.heroSpeed * (h.specials.featherfoot ? 1.12 : 1) * (h.queasy > 0 ? .6 : 1) * (h.hp < 200 ? .92 : 1); }
function shotCool(h) { return h.D.shot.cool * (h.specials.quickshot ? .75 : 1) / TUNE.shotRate; }

function stepHero(h, dt) {
  const it = h.intent || { mx: 0, my: 0, aim: null, fire: false, magic: false, plant: false };
  h.inv = Math.max(0, h.inv - dt); h.hurtT = Math.max(0, h.hurtT - dt); h.queasy = Math.max(0, h.queasy - dt); h.runeImm = Math.max(0, h.runeImm - dt); h.cool -= dt;
  if (h.amulet) { h.amuletT -= dt; if (h.amuletT <= 0) { h.amulet = null; happen('amuletEnd', { pi: h.pi }); } }
  if (h.menu > 0) { h.menu -= dt; if (h.menu <= 0 && W.bell && W.bell.pi === h.pi) W.bell = null; }
  if (W.net === 'client' && !h.local) return;
  if (!h.alive) {
    h.deadT += dt; h.vx = h.vy = 0;
    if (W.net !== 'client' && it.rise && h.deadT > 1 && living().length && !SESSION) riseHero(h);
    if (SESSION && W.net === 'host' && h.deadT > 5 && living().length) { h.score = Math.max(0, h.score - 250); riseHero(h, { hp: 350, free: true }); }
    return;
  }
  // the drain: life force falls every second, on every floor
  if (W.net !== 'client' && !CHEAT.god && !W.attract && !(W.boss && W.boss.intro)) {
    const fog = W.boss && W.boss.fogAt && W.boss.inFog(h) ? 3 : 1;
    h.hb = (h.hb || 0) + dt * TUNE.drain * DIFF().drain * (RUN.loop > 1 ? 1.5 : 1) * fog;
    if (h.hb >= 1) { const n = Math.floor(h.hb); h.hb -= n; h.hp -= n; if (h.hp <= 0) { heroFalls(h); return; } }
    healthLines(h);
  }
  if (CHEAT.infinite) { h.keys = Math.max(h.keys, 9); h.flasks = Math.max(h.flasks, 9); }
  // aim: the intent's, else the way the hero faces
  if (it.aim !== null && it.aim !== undefined && isFinite(it.aim)) h.aim = it.aim;
  const ml = Math.hypot(it.mx, it.my), stunned = h.stun > 0;
  h.stun = Math.max(0, h.stun - dt);
  if (ml > .15 && !stunned) { h.face = Math.atan2(it.my, it.mx); if (it.aim === null || it.aim === undefined) h.aim = h.face; }
  // movement: planted heroes stand still and turn (the arcade's stand and shoot)
  const planted = it.plant || (it.fire && it.kbFire);
  h.plant = planted;
  const sp = heroSpeed(h), go = stunned || planted || (h.swing && W.t - h.swing.t0 < .18) ? 0 : 1;
  h.vx = it.mx * sp * go; h.vy = it.my * sp * go;
  if (W.net === 'client' && !h.local) return;
  if (!h.remote) moveHero(h, dt);
  // fire: smart melee within reach, else a throw
  h.firing = !!it.fire && !stunned;
  if (h.firing && h.cool <= 0 && !(h.swing && W.t - h.swing.t0 < h.swing.dur)) {
    const foe = meleeTarget(h);
    if (foe) startSwing(h, foe); else if (W.net !== 'client') throwShot(h);
    else { h.cool = shotCool(h); h.throwT = W.t; }
  }
  if (h.swing && !h.swing.hit && W.t - h.swing.t0 >= h.swing.at) meleeHits(h);
  if (it.magic && !stunned && W.net !== 'client') useMagic(h);
  if (W.net === 'client') return;
  heroFeatures(h, dt);
  heroPickups(h);
  heroDoors(h);
  heroStairs(h, dt);
}

function moveHero(h, dt) {
  const b = h.body;
  b.x = h.x; b.y = h.y; b.vx = h.vx + (h.kx || 0); b.vy = h.vy + (h.ky || 0);
  h.kx = (h.kx || 0) * Math.max(0, 1 - dt * 10); h.ky = (h.ky || 0) * Math.max(0, 1 - dt * 10);
  if (CHEAT.noclip && !W.attract) { b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= .8; b.vy *= .8; b.hitWall = false; }
  else b.update(dt, W.map);
  // knockback decays (body pushes add to vx/vy; we set them each step, so fold the push in here)
  // the shared screen: a hero can't stretch the party past what the camera shows
  // (it cancels only the part of a step that stretches the party further: a transporter may part them, then they regroup)
  if (W.leash && !SESSION) {
    const others = W.heroes.filter(o => o !== h && o.alive && !o.remote && !o.joinPick);
    if (others.length) {
      const [hw, hh] = W.leash, span = (v, k) => { const vs = others.map(o => o[k]).concat(v); return Math.max(...vs) - Math.min(...vs); };
      if (span(b.x, 'x') > hw * 2 && span(b.x, 'x') > span(h.x, 'x')) b.x = h.x;
      if (span(b.y, 'y') > hh * 2 && span(b.y, 'y') > span(h.y, 'y')) b.y = h.y;
    }
  }
  // fake walls give way when pushed into; every wall is a stair once the Gaunt has lost patience
  if (b.hitWall) {
    const ax = h.x + Math.cos(h.face) * 9, ay = h.y + Math.sin(h.face) * 9, cx = Math.floor(ax / T), cy = Math.floor(ay / T);
    const fk = W.fakes.find(f => f.cx === cx && f.cy === cy && !f.open);
    if (fk && Math.hypot(h.vx, h.vy) > 5) { fk.open = true; W.map.set(cx, cy, 0); happen('secret', { cx, cy, x: fk.x, y: fk.y }); if (!W.foundSecret) { W.foundSecret = true; say('tip_secret', h, 2); } }
    if (W.stage >= 3 && Math.hypot(h.vx, h.vy) > 5) { h.wallT += dt; if (h.wallT >= 1) { descend(h, null); return; } } else h.wallT = 0;
  } else h.wallT = 0;
  h.x = b.x; h.y = b.y;
}

/* ---- the throw ---- */
function throwShot(h) {
  const S = h.D.shot, a = h.aim, sp = S.speed * (h.specials.quickshot ? 1.2 : 1);
  h.cool = shotCool(h); h.throwT = W.t;
  const dmg = (S.dmg + (h.specials.hardshot ? 1 : 0) + (h.amulet === 'rending' ? 1 : 0)) * TUNE.shotDamage;
  W.shots.push({ id: nid(), team: 'hero', owner: h, kind: S.kind, x: h.x + Math.cos(a) * 7, y: h.y + Math.sin(a) * 7, z: 12, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 0, r: 3,
    dmg, life: SHOT_RANGE / sp, pierce: h.amulet === 'rending' ? 99 : S.pierce, bounce: h.amulet === 'ricochet' ? 3 : 0, splash: S.splash, hits: new Set(), rot: 0 });
  happen('throw', { pi: h.pi, kind: S.kind, x: h.x, y: h.y });
}

/* ---- smart melee: up close, fire strikes instead of throwing (never at ghosts) ---- */
function meleeTarget(h) {
  let best = null, bd = 1e9;
  for (const m of W.mons) {
    if (m.dead || m.D.noMelee || m.emerge > 0 || (m.type === 'fryar' && m.vis < .5)) continue;
    const d = Math.hypot(m.x - h.x, m.y - h.y), reach = h.r + m.r + 8;
    if (d > reach || d > bd) continue;
    if (Math.abs(E.angDiff(h.aim, Math.atan2(m.y - h.y, m.x - h.x))) > .87) continue;
    best = m; bd = d;
  }
  if (!best) for (const g of W.gens) { if (g.dead) continue; const d = Math.hypot(g.x - h.x, g.y - h.y); if (d < h.r + g.r + 6 && Math.abs(E.angDiff(h.aim, Math.atan2(g.y - h.y, g.x - h.x))) < .87) { best = g; break; } }
  return best;
}
function startSwing(h, foe) {
  const moves = h.D.moves, n = h.swing && W.t - h.swing.t0 < .7 ? (h.swing.n + 1) % moves.length : 0, mv = E.MOVES[moves[n]];
  const dur = (mv.wind + mv.active + mv.recover) * .9;
  h.swing = { move: moves[n], n, t0: W.t, dur, at: (mv.wind + mv.active * .5) * .9, hit: false };
  h.cool = Math.max(.28, dur * .8);
  if (foe) h.aim = Math.atan2(foe.y - h.y, foe.x - h.x);
  happen('swing', { pi: h.pi, move: moves[n] });
}
function meleeHits(h) {
  h.swing.hit = true;
  if (W.net === 'client') return;
  const dmg = h.D.melee * (h.specials.ogreale ? 1.5 : 1) * TUNE.shotDamage;
  let hit = 0;
  for (const m of W.mons) if (!m.dead && !m.D.noMelee && E.inArc(h, h.aim, m, 22 + m.r, 1.2)) { if (hurtMon(m, dmg, { by: h, kind: 'melee' })) { hit++; happen('melee', { x: m.x, y: m.y, a: h.aim, pi: h.pi }); } }
  for (const g of W.gens) if (!g.dead && E.inArc(h, h.aim, g, 22 + g.r, 1.2)) { hurtGen(g, dmg, h, 'melee'); hit++; }
  for (const c of W.cracked) if (!c.open && E.inArc(h, h.aim, c, 26, 1.0)) crackWall(c, 1);
  if (W.boss && W.boss.alive && E.inArc(h, h.aim, W.boss, 26 + W.boss.r, 1.2)) { bossHurt(dmg, h, 'melee', h.aim); hit++; }
  if (hit && !W.attract) game.freeze(.04);
  if (hit) say('tip_melee', h, 1);
}

/* ---- magic: a Blast Flask strikes everything on screen ---- */
function useMagic(h) {
  if (h.flasks <= 0) return;
  h.flasks--;
  const [hw, hh] = h.view || W.viewHalf, cx = h.view ? h.x : W.cam.x, cy = h.view ? h.y : W.cam.y;
  blast(h, cx, cy, hw, hh, 1);
}
function blast(h, cx, cy, hw, hh, power, radius) {
  const mp = h.D.magic[0] * (h.specials.witchwater ? 1.5 : 1) * TUNE.magicPower * power, gp = h.D.magic[1] * (h.specials.witchwater ? 1.5 : 1) * TUNE.magicPower * power;
  const inside = e => radius ? Math.hypot(e.x - cx, e.y - cy) < radius : Math.abs(e.x - cx) < hw && Math.abs(e.y - cy) < hh;
  for (const m of W.mons) if (!m.dead && inside(m)) hurtMon(m, m.type === 'tithe' ? 99 : Math.ceil(4 * mp), { by: h, kind: radius ? 'blast' : 'magic' });
  for (const g of W.gens) if (!g.dead && inside(g)) hurtGen(g, Math.ceil(2 * gp), h, 'magic');
  if (W.boss && W.boss.alive && inside(W.boss)) bossHurt(W.boss.maxHp * .06 * power, h, 'magic');
  happen('magic', { pi: h.pi, x: cx, y: cy, hw: radius || hw, hh: radius || hh, ring: !!radius, power });
  say('tip_magic', h, 1);
}

/* ---- pickups ---- */
function heroPickups(h) {
  for (const it of W.items) {
    if (it.gone || it.onTable && !nearTable(h, it)) continue;
    const reach = it.onTable ? 18 : h.r + 6;
    if (Math.abs(it.x - h.x) > reach || Math.abs(it.y - h.y) > reach || Math.hypot(it.x - h.x, it.y - h.y) > reach) continue;
    takeItem(h, it);
  }
}
const nearTable = (h, it) => Math.hypot(it.x - h.x, it.y - h.y) < 18;
function takeItem(h, it) {
  const D = get('items', it.kind), lim = limitOf(h);
  switch (it.kind) {
    case 'key': if (h.keys >= lim) return; h.keys++; say('key_first', h, 1); say('tip_door', h, 1); break;
    case 'flask': if (h.flasks >= lim) return; h.flasks++; say('tip_magic', h, 1); break;
    case 'roast': case 'loaf': case 'cider': case 'platter': h.hp += Math.round(D.heal * TUNE.foodHeal); h.stats.food++; if (h.stats.food === 6) say('glutton', h, 1); if (it.kind === 'cider') say('tip_dontshoot', h, 1); break;
    case 'stew': h.hp = Math.max(1, h.hp - 50); h.queasy = 4; say('ate_stew', h, 2); break;
    case 'special': if (h.specials[it.sub]) return; h.specials[it.sub] = true; say('special_' + it.sub, h, 2); break;
    case 'amulet': h.amulet = it.sub; h.amuletT = AMULET_TIME; say('amulet_' + it.sub, h, 2); break;
    case 'chest': break;
    case 'lchest': if (h.keys <= 0 && !CHEAT.infinite) return; h.keys--; { const loot = it.sub || Rpick(['flask', 'roast', 'key']); dropItem(SPECIALS[loot] ? 'special' : loot, it.x + 10, it.y + 6, SPECIALS[loot] ? loot : undefined); } break;
    case 'bell': if (W.bellRung) return; W.bellRung = true; W.bell = { pi: h.pi }; h.menu = 12; say('bell', h, 3); happen('bell', { pi: h.pi, x: it.x, y: it.y }); return;
    case 'gauntlet': W.gauntletBy = h.pi; say('gauntlet_taken', h, 3); break;
  }
  if (D.treasure) { h.stats.treasure++; say('treasure_first', h, 1); }
  it.gone = true;
  addScore(h, D.pts, it);
  happen('gone', { id: it.id, by: h.pi, kind: it.kind, sub: it.sub, x: it.x, y: it.y });
  if (W.hoard && D.treasure) { W.hoard.taken++; if (W.hoard.taken >= W.hoard.total) { addScore(h, 2000, h); say('hoard_clear', h, 3); } }
  if (it.kind === 'gauntlet') bossGauntletTaken(h);
}

/* ---- doors: a key opens the whole run ---- */
function heroDoors(h) {
  if (h.keys <= 0 && !CHEAT.infinite) return;
  for (const g of W.doorGroups) {
    if (g.open) continue;
    if (g.cells.some(c => Math.abs(c.x - h.x) < T / 2 + h.r + 3 && Math.abs(c.y - h.y) < T / 2 + h.r + 3)) { if (!CHEAT.infinite) h.keys--; openDoors(g, h); return; }
  }
}
function openDoors(g, h) {
  g.open = true;
  for (const c of g.cells) W.map.set(c.cx, c.cy, 0);
  happen('door', { g: g.id, pi: h ? h.pi : -1, x: g.cells[0].x, y: g.cells[0].y });
}
function crackWall(c, n) {
  if (c.open || W.net === 'client') return;
  c.hp -= n; happen('crack', { x: c.x, y: c.y });
  if (c.hp <= 0) { c.open = true; W.map.set(c.cx, c.cy, 0); happen('wall', { cx: c.cx, cy: c.cy, x: c.x, y: c.y }); }
}

/* ---- stairs: hold still on them and everyone goes down ---- */
function heroStairs(h, dt) {
  const [cx, cy] = cellOf(h), ex = W.exits.find(e => e.cx === cx && e.cy === cy);
  if (!ex || W.done) { h.stairT = 0; return; }
  if (!W.stairsSeen) { W.stairsSeen = true; say('stairs', h, 2); }
  h.stairT += dt;
  if (h.stairT >= TUNE.stairHold) descend(h, ex);
}
function descend(h, ex) {
  if (W.done) return;
  const bonus = 500 + 5 * Math.max(0, Math.round((W.fd.par || 150) - W.t));
  if (!W.hoard) { addScore(h, bonus, h); h.stats.stairs++; }
  W.done = { by: h.pi, to: ex && ex.to ? ex.to : null, at: { x: h.x, y: h.y } };
  if (ex && ex.to) say('skip', h, 3);
  happen('stairs', { pi: h.pi, to: W.done.to, x: h.x, y: h.y });
}

/* ---- health callouts ---- */
function healthLines(h) {
  const b = h.hp < 100 ? 3 : h.hp < 200 ? 2 : h.hp < 400 ? 1 : 0;
  if (b > (h.hpBand || 0)) say(['', 'fading', 'starving', 'dying'][b], h, 3);
  if (h.hpBand !== b) h.hpBand = b;
  if (h.hp < 300) say('tip_food', h, 1);
}

/* ---- features under a hero: runes, pads, plates ---- */
function heroFeatures(h, dt) {
  const [cx, cy] = cellOf(h);
  if (h.runeImm <= 0 && h.stun <= 0 && W.runes.some(r => r.cx === cx && r.cy === cy)) { h.stun = .8; h.runeImm = 2.3; say('tip_stun', h, 1); happen('stun', { pi: h.pi, x: h.x, y: h.y }); }
  const pi = W.pads.findIndex(p => p.cx === cx && p.cy === cy);
  if (pi < 0) h.padLock = -1;
  else if (pi !== h.padLock && W.pads[pi].pair !== undefined) {
    const to = W.pads[W.pads[pi].pair];
    happen('tele', { pi: h.pi, x: h.x, y: h.y, tx: to.x, ty: to.y });
    h.x = to.x; h.y = to.y; h.body.x = to.x; h.body.y = to.y; h.padLock = W.pads[pi].pair; h.inv = Math.max(h.inv, .5);
    say('tip_tele', h, 1);
  }
  for (const p of W.plates) if (!p.used && p.cx === cx && p.cy === cy) {
    p.used = true;
    const list = p.kind === 'T' ? W.p.trapT : W.p.trapY;
    for (const c of list) W.map.set(c.cx, c.cy, 0);
    for (const q of W.plates) if (q.kind === p.kind) q.used = true;
    for (const m of W.mons) m.wake = true;
    happen('trap', { kind: p.kind, x: p.x, y: p.y });
    say('tip_trap', h, 2);
  }
}
