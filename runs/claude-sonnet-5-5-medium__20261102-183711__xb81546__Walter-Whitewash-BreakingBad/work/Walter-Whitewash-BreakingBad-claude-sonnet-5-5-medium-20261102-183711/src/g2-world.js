// ===== part 2: worlds, stations, dialogue, and everyone who walks around ======================================
const talk = new E.Dialog(game, { speed: 42, lines: 3, bg: '#101c16', border: '#6fd36a', nameColor: '#ffd86a' });
talk.voice = null;
let talkWho = null, babbleAt = -1;
const cell = (cx, cy) => ({ x: cx * 16 + 8, y: cy * 16 + 8 });
const portraitKind = who => who === 'customer' ? 'jimmy' : who;

// the line-by-line conversation: runs of one speaker share a box, the next speaker opens the next
function converse(lines, done) {
  const groups = [];
  for (const [who, text] of lines) { const g = groups[groups.length - 1]; if (g && g.who === who) g.texts.push(text); else groups.push({ who, texts: [text] }); }
  let i = 0; mode = 'talk';
  const next = () => {
    if (i >= groups.length) { talkWho = null; mode = 'walk'; game.input.consumeAll(); if (done) done(); return; }
    const g = groups[i++]; talkWho = g.who; babbleAt = -1;
    talk.say(g.texts, { name: W.names[g.who] || '', portrait: g.who === 'narrator' || !W.looks[portraitKind(g.who)] ? null : rigFor(portraitKind(g.who)), onDone: next, auto: auto ? 1.6 : undefined });
  };
  next();
}
function ask(text, who, choices, onChoice) {
  if (auto) return onChoice(choices.length - 1);   // the demo never sleeps on its own
  mode = 'talk'; talkWho = who; babbleAt = -1;
  talk.say([text], { name: W.names[who] || '', portrait: who === 'narrator' || !W.looks[portraitKind(who)] ? null : rigFor(portraitKind(who)), choices, onChoice(i) { mode = 'walk'; talkWho = null; game.input.consumeAll(); onChoice(i); } });
}
// animalese: one babble per letter as it types
function babbleStep() {
  if (!talk.open || !talkWho) { babbleAt = -1; return; }
  const k = Math.floor(talk.shown);
  if (k === babbleAt) return;
  const pg = talk.pages && talk.pages[talk.i], txt = Array.isArray(pg) ? pg.join(' ') : String((pg && pg.text) || pg || '');
  if (k > babbleAt && babbleAt >= 0 && k - babbleAt < 4 && talk.typing) AU.babble(game, talkWho, txt.charAt(k - 1), W.pitch[talkWho]);
  babbleAt = k;
}

// ---- building a world -------------------------------------------------------------------------------------------------------
function loadWorld(name) {
  mapName = name; mode = 'walk';
  lists.customers.length = lists.cops.length = lists.thugs.length = lists.npcs.length = lists.drops.length = 0; boss = null; shots.clear();
  if (name === 'town') {
    map = new E.TileMap({ rows: W.townRows(), legend: W.townLegend, types: W.townTypes, floorTex: (x, y, tag) => W.townFloor(x, y, tag), outside: '#b8864e', ao: 4 });
    dress = W.townDress();
    for (const [id, x, y, o] of dress) if (o.solid) {
      map.solid(id, x, y, 0, o);
      const c = map.toCell(x, y); map.block(c.cx !== undefined ? c.cx : c[0], c.cy !== undefined ? c.cy : c[1], true);   // the paths know about it too
    }
  } else {
    map = new E.TileMap({ rows: W.labRows(), legend: W.labLegend, types: W.labTypes, floorTex: (x, y, tag) => W.townFloor(x, y, tag), outside: '#10161a', ao: 4 });
    dress = [];
  }
  flow = new E.FlowField(map);
  game.cam.bounds = v => map.bounds(v);
  buildStations();
}
function placeHero(tag) {
  const s = map.find(tag || 'hero') || { x: 100, y: 100 };
  Object.assign(hero, { x: s.x, y: s.y, vx: 0, vy: 0, z: 0 });
  fx.iFrames = 1;
}

const stat = (id, tag, label, show, act, o = {}) => { const s = map.find(tag); if (s) stations.push(Object.assign({ id, x: s.x + (o.dx || 0), y: s.y + (o.dy || 0), r: 20, label, show: show || (() => true), act }, o)); };
function buildStations() {
  stations = [];
  if (mapName === 'town') {
    const hs = map.find('hero');
    stations.push({ id: 'home', x: hs.x, y: hs.y - 22, r: 22, label: () => 'Sleep and save', show: () => true, act: askSleep, color: '#ffd86a' });
    stat('school', 'teacher', () => 'Talk to Ms. Chalkwell', null, () => converse(W.script.teacher), { color: '#ffffff' });
    stat('gus', 'gus', () => 'Talk to Gus', null, gusTalk, { color: '#ff7a5a' });
    stat('shop', 'shop', () => 'Supply store', null, openShop, { color: '#6fd36a' });
    stat('cook', 'cook', () => S.ingredients > 0 ? 'Cook a batch' : 'Cook (need ingredients)', null, startCookStation, { color: '#6ad8ff' });
    stat('jimmy', 'jimmy', () => 'Talk to Jimmy', null, jimmyTalk, { color: '#a89aff' });
    stat('counter', 'counter', () => 'Launder at the car wash', null, openLaunder, { color: '#ffd86a' });
    stat('sol', 'sol', () => 'Talk to Sol', null, solTalk, { color: '#ff9ac8' });
    stat('hatch', 'hatch', () => R.superlabOpen(S) ? 'Enter the Superlab' : 'Welded hatch', null, hatchAct, { color: R.superlabOpen(S) ? '#ff5a4a' : '#8a8a8a' });
    for (const k of ['north', 'east', 'south']) stat('drop-' + k, 'drop-' + k, () => 'Deliver to Gus\'s man', () => !!S.contract && S.contract.at === k, deliverContract, { color: '#ff7a5a', r: 24 });
  } else {
    stations.push({ id: 'ladder', x: hero.x, y: hero.y + 10, r: 16, label: () => 'No way back', show: () => false, act: () => {} });
  }
}

// ---- stations: the one nearest the hero, or the one under the mouse ----------------------------------------------------
function updateStations() {
  focusSt = null; let best = 1e9;
  for (const s of stations) {
    if (s.show && !s.show()) continue;
    const d = Math.hypot(s.x - hero.x, s.y - hero.y);
    if (d < s.r && d < best) { best = d; focusSt = s; }
  }
  for (const c of lists.customers) { if (c.state !== 'wait') continue; const d = dist(c, hero); if (d < 22 && d < best) { best = d; focusSt = { id: 'customer', x: c.x, y: c.y, r: 22, c, label: () => S.bricks.length ? 'Sell a brick for ' + money(R.price(Math.min(...S.bricks))) : 'Customer wants product', act: () => sellTo(c), color: '#6fd36a' }; } }
  hoverSt = null;
  const I = game.input;
  if (!auto && I.lastDevice !== 'gamepad' && fx.mouseActive > 0) {
    const g = game.mouseGround();
    if (g) {
      let bd = 22;
      for (const s of stations) if ((!s.show || s.show()) && Math.hypot(s.x - g[0], s.y - g[1]) < bd) { bd = Math.hypot(s.x - g[0], s.y - g[1]); hoverSt = s; }
      for (const c of lists.customers) if (c.state === 'wait' && Math.hypot(c.x - g[0], c.y - g[1]) < bd) { bd = Math.hypot(c.x - g[0], c.y - g[1]); hoverSt = { id: 'customer', x: c.x, y: c.y, r: 22, c, label: () => '', act: () => sellTo(c) }; }
    }
  }
}
// pressing interact uses the focused station; clicking a hovered one in reach uses it (and does not swing)
function tryInteract(ctrl) {
  let st = null, byClick = false;
  if (ctrl.interact) st = focusSt;
  else if (ctrl.attack && !auto && hoverSt && game.input.lastDevice !== 'gamepad' && Math.hypot(hoverSt.x - hero.x, hoverSt.y - hero.y) < (hoverSt.r || 20) + 16) { st = hoverSt.id === 'customer' ? focusSt && focusSt.id === 'customer' && focusSt.c === hoverSt.c ? focusSt : hoverSt : stations.find(s => s.id === hoverSt.id); byClick = true; }
  if (!st) return false;
  if (byClick && st.id === 'customer' && Math.hypot(st.x - hero.x, st.y - hero.y) > 40) return false;
  st.act(); return true;
}

// ---- customers ----------------------------------------------------------------------------------------------------------------
function spawnCustomer(spot) {
  const b = new E.Body({ x: spot.x, y: spot.y, r: 4 }), i = Math.floor(Math.random() * 100);
  Object.assign(b, { kind: 'customer', rig: new E.Humanoid(W.customerLook(i)), state: 'wait', facing: rnd(0, 6.28), t: rnd(0, 3), home: { x: spot.x, y: spot.y }, leave: null, patience: 80 + rnd(0, 60) });
  lists.customers.push(b); return b;
}
function fillCustomers(n = 6) {
  const spots = map.findAll('customer').sort(() => Math.random() - .5);
  for (const s of spots) { if (lists.customers.filter(c => c.state === 'wait').length >= n) break; if (!lists.customers.some(c => dist(c, s) < 8)) spawnCustomer(s); }
}
function sellTo(c) {
  if (c.state !== 'wait') return;
  if (!S.bricks.length) { converse(W.script.customerNo); return; }
  const idx = S.bricks.indexOf(Math.min(...S.bricks)), purity = S.bricks[idx], pay = R.sellOne(S, idx);
  c.state = 'happy'; c.t = 0; game.audio.sfx('cash'); game.particles.text(c.x, c.y, 24, '+' + money(pay), '#6fd36a', { scale: 2, bounce: true });
  game.particles.glints(c.x, c.y, 16, 8, '#8affa0');
  if (copSees(hero, 120)) { heat(16); loud(2); toast('SPOTTED', 'A cop saw the deal.', 2.5); } else heat(3);
  S.sold = (S.sold || 0) + 1;
  c.say = purity >= 99 ? 'BLUE!' : purity >= 90 ? 'wow' : '...';
  c.leave = pick(map.findAll('customer'));
}
function updateCustomers(dt) {
  for (const c of lists.customers) {
    c.t += dt; const mv = { x: 0, y: 0 };
    if (c.state === 'wait') { c.facing += Math.sin(c.t * .7) * dt * .5; c.patience -= dt; if (c.patience <= 0) { c.state = 'leave'; c.leave = pick(map.findAll('customer')); } }
    else if (c.state === 'happy' && c.t > 1.2) c.state = 'leave';
    if (c.state === 'leave') {
      const dx = (c.leave ? c.leave.x : c.x) - c.x, dy = (c.leave ? c.leave.y : c.y) - c.y, d = Math.hypot(dx, dy) || 1;
      mv.x = dx / d * 30; mv.y = dy / d * 30; c.facing = Math.atan2(dy, dx);
      if (c.t > 14 || d < 6) c.dead = true;
    }
    c.vx = mv.x; c.vy = mv.y; c.update(dt, map);
    c.rig.update(dt, { x: c.x, y: c.y, z: c.z, vx: c.vx, vy: c.vy, facing: c.facing, expr: c.state === 'happy' ? 'smile' : undefined, pose: c.state === 'happy' ? 'cheer' : undefined });
  }
  lists.customers = lists.customers.filter(c => !c.dead);
  respawnT.customers -= dt;
  if (respawnT.customers <= 0) { respawnT.customers = 20; if (lists.customers.filter(c => c.state === 'wait').length < 6) fillCustomers(6); }
}

// ---- cops ---------------------------------------------------------------------------------------------------------------------
const ROUTES = [[[23, 3], [23, 30]], [[3, 15], [45, 15]], [[23, 15], [44, 15], [23, 15], [23, 4], [23, 15], [3, 15]]];
function spawnCops() {
  lists.cops.length = 0;
  const n = S.day <= 1 ? 1 : S.day <= 3 ? 2 : 3, spots = map.findAll('cop');
  for (let i = 0; i < n; i++) {
    const isHank = i === 2 && S.day >= 3, s = spots[i % spots.length];
    const b = new E.Body({ x: s.x, y: s.y, r: 5 });
    Object.assign(b, { kind: isHank ? 'hank' : 'cop', rig: new E.Humanoid(W.looks[isHank ? 'hank' : 'cop']), route: ROUTES[i % ROUTES.length].map(([x, y]) => cell(x, y)), wp: 1, dir: 1, alert: 0, state: 'patrol', lost: 0, facing: 0, speed: isHank ? 58 : 50 });
    lists.cops.push(b);
  }
}
function copSees(from, range) {
  for (const c of lists.cops) if (dist(c, from) < range && map.sight(c, from) && (c.state === 'chase' || E.inArc(c, c.facing, from, range, 1.2))) return c;
  return null;
}
function updateCops(dt, ctrl) {
  const threat = S.heat >= R.SURPLUS || fx.loud > 0 || mode === 'cook' || fx.hazmat > 0;
  for (const c of lists.cops) {
    const range = c.kind === 'hank' ? 150 : 115, seesHero = dist(c, hero) < range && map.sight(c, hero) && (c.state === 'chase' || E.inArc(c, c.facing, hero, range, 1.1));
    let mv = null, sp = 0;
    if (c.state === 'patrol') {
      const t = c.route[c.wp], dx = t.x - c.x, dy = t.y - c.y, d = Math.hypot(dx, dy) || 1;
      if (d < 6) { c.wp += c.dir; if (c.wp >= c.route.length || c.wp < 0) { c.dir *= -1; c.wp += c.dir * 2; } c.wp = clamp(c.wp, 0, c.route.length - 1); }
      mv = [dx / d, dy / d]; sp = 26;
      if (seesHero && threat) { c.alert += dt / (c.kind === 'hank' ? .8 : 1.1); c.facing = ang(c, hero); sp = 0; }
      else c.alert = Math.max(0, c.alert - dt * .4);
      if (c.alert >= 1) { c.state = 'chase'; c.alert = 1; c.lost = 0; game.audio.sfx('alert'); toast('COPS!', 'They saw you. Break line of sight.', 2.5); heat(Math.max(0, 55 - S.heat)); }
    } else if (c.state === 'chase') {
      if (seesHero) c.lost = 0; else c.lost += dt;
      flow.update(hero.x, hero.y);
      const f = flow.dir(c.x, c.y, hero.x, hero.y) || [0, 0], fl = Math.hypot(f[0], f[1]) || 1;
      mv = seesHero ? [(hero.x - c.x) / (dist(c, hero) || 1), (hero.y - c.y) / (dist(c, hero) || 1)] : [f[0] / fl, f[1] / fl]; sp = c.speed + S.heat * .12;
      if (c.lost > 6) { c.state = 'patrol'; c.alert = 0; c.wp = Math.min(c.wp, c.route.length - 1); R.addHeat(S, -18); toast('LOST THEM', 'The heat is coming down.', 2.2); }
      if (dist(c, hero) < 11 && mode === 'walk' && !auto) { arrest(c); return; }
    }
    if (mv) { c.vx = mv[0] * sp; c.vy = mv[1] * sp; if (sp > 0) c.facing = Math.atan2(mv[1], mv[0]); } else { c.vx = c.vy = 0; }
    c.update(dt, map);
    c.rig.update(dt, { x: c.x, y: c.y, z: c.z, vx: c.vx, vy: c.vy, facing: c.facing, run: c.state === 'chase' ? 1 : 0, stance: c.state === 'chase' ? 'ready' : undefined });
  }
}
const anyChase = () => lists.cops.some(c => c.state === 'chase');

// ---- thugs: the rival crew and the enforcers --------------------------------------------------------------------------
const THUG = {
  dealer:   { hp: 45, speed: 50, dmg: 9, range: 16, windup: .45, recover: .7, look: 'thug', sight: 105 },
  shooter:  { hp: 32, speed: 40, dmg: 8, range: 120, windup: .5, recover: 1.3, look: 'shooter', sight: 130 },
  enforcer: { hp: 130, speed: 38, dmg: 18, range: 20, windup: .7, recover: 1, look: 'enforcer', sight: 120 }
};
function spawnThug(spot, kind) {
  const T = THUG[kind], b = new E.Body({ x: spot.x, y: spot.y, r: 5 });
  Object.assign(b, { kind, T, hp: T.hp, maxHp: T.hp, rig: new E.Humanoid(W.looks[T.look]), state: 'idle', cd: rnd(0, 1.5), t: 0, home: { x: spot.x, y: spot.y }, facing: rnd(0, 6.28), wander: rnd(0, 6.28), flash: 0, burst: 0 });
  lists.thugs.push(b); return b;
}
function fillThugs() {
  const spots = map.findAll('thug').filter(s => dist(s, hero) > 150), want = Math.min(3 + S.day, 7);
  const live = lists.thugs.filter(t => !t.dead).length;
  for (let i = live; i < want && spots.length; i++) {
    const s = spots.splice(Math.floor(Math.random() * spots.length), 1)[0], r = Math.random();
    spawnThug(s, S.day >= 4 && r < .25 ? 'enforcer' : r < .55 ? 'dealer' : 'shooter');
  }
}
function hitThug(t, dmg, kx, ky, silent) {
  if (t.dead) return;
  t.hp -= dmg; t.flash = .12; t.state = t.state === 'idle' ? 'chase' : t.state; t.aggro = true; t.stun = .25;
  t.push && t.push(kx * 70, ky * 70, 0); game.hitFx(t.x, t.y, 14, { power: dmg > 20 ? 1 : .6, damage: Math.round(dmg), textZ: 30 });
  if (t.hp <= 0) killThug(t);
}
function killThug(t) {
  t.dead = true; t.deadT = 1.4; S.stats.kills++; heat(t.kind === 'enforcer' ? 10 : 5); game.audio.sfx('boom'); game.particles.bits(t.x, t.y, 10, 8, ['#a8281c', '#d8d8d8']);
  lists.drops.push({ x: t.x, y: t.y, kind: 'cash', v: Math.round((200 + Math.random() * 300) / 10) * 10 * (t.kind === 'enforcer' ? 3 : 1), t: 0 });
  if (Math.random() < .4) lists.drops.push({ x: t.x + 6, y: t.y + 4, kind: 'ammo', v: 8, t: 0 });
  else if (Math.random() < .2) lists.drops.push({ x: t.x - 6, y: t.y + 4, kind: 'pill', v: 1, t: 0 });
}
function updateThugs(dt) {
  for (const t of lists.thugs) {
    t.flash = Math.max(0, t.flash - dt);
    if (t.dead) { t.deadT -= dt; t.vx = t.vy = 0; t.update(dt, map); t.rig.update(dt, { x: t.x, y: t.y, z: t.z, vx: 0, vy: 0, facing: t.facing, pose: 'die' }); continue; }
    const T = t.T, d = dist(t, hero), sees = d < T.sight && map.sight(t, hero);
    t.cd -= dt; t.t += dt; t.stun = Math.max(0, (t.stun || 0) - dt);
    let mv = [0, 0], sp = 0;
    if (t.stun > 0) { /* staggered */ }
    else if (t.state === 'idle') {
      t.wander += rnd(-1, 1) * dt; mv = [Math.cos(t.wander), Math.sin(t.wander)]; sp = 10;
      if (dist(t, t.home) > 50) t.wander = ang(t, t.home);
      if (sees && fx.hazmat <= 0 || t.aggro) { t.state = 'chase'; t.aggro = true; }
    } else if (t.state === 'chase') {
      t.facing = ang(t, hero);
      const keep = t.kind === 'shooter' ? 80 : 0;
      flow.update(hero.x, hero.y);
      const f = flow.dir(t.x, t.y, hero.x, hero.y) || [0, 0], fl = Math.hypot(f[0], f[1]) || 1;
      const direct = sees ? [(hero.x - t.x) / (d || 1), (hero.y - t.y) / (d || 1)] : [f[0] / fl, f[1] / fl];
      if (t.kind === 'shooter' && d < keep) { mv = [-direct[0], -direct[1]]; sp = T.speed * .8; } else if (d > T.range * (t.kind === 'shooter' ? .75 : .8)) { mv = direct; sp = T.speed; }
      if (d < T.range && t.cd <= 0 && (t.kind !== 'shooter' || sees)) { t.state = 'windup'; t.t = 0; }
      if (d > 260) { t.state = 'idle'; t.aggro = false; }
    } else if (t.state === 'windup') {
      t.facing = ang(t, hero);
      if (t.t >= T.windup) {
        if (t.kind === 'shooter') {
          shots.fire({ x: t.x, y: t.y, z: 14, vx: Math.cos(t.facing) * 135, vy: Math.sin(t.facing) * 135, r: 2, team: 'enemy', color: '#ff9a4a', life: 1.6, dmg: T.dmg });
          game.audio.sfx('shot', { vol: .5 }); loud(2);
          t.burst++; if (t.burst < 3) { t.t = T.windup - .22; } else { t.burst = 0; t.state = 'recover'; t.t = 0; }
        } else {
          t.state = 'recover'; t.t = 0; t.lunge = .16;
          if (dist(t, hero) < T.range + 8 && E.inArc(t, t.facing, hero, T.range + 8, 1.3)) hurtHero(T.dmg, t, 110);
          game.audio.sfx('punch', { vol: .6 });
        }
      }
    } else if (t.state === 'recover') { if (t.t >= T.recover) { t.state = 'chase'; t.cd = .3; } }
    const lg = t.lunge > 0 ? (t.lunge -= dt, 60) : 0;
    t.vx = mv[0] * sp + Math.cos(t.facing) * lg; t.vy = mv[1] * sp + Math.sin(t.facing) * lg;
    if (mv[0] || mv[1]) { if (t.state !== 'windup') t.facing = Math.atan2(mv[1], mv[0]); }
    t.update(dt, map);
    const atk = t.state === 'windup' && t.kind !== 'shooter' ? { spec: E.MOVES.haymaker || E.MOVES.cross, phase: 'wind', u: t.t / T.windup } : t.state === 'recover' && t.lunge > 0 ? { spec: E.MOVES.haymaker || E.MOVES.cross, phase: 'active', u: .5 } : undefined;
    t.rig.update(dt, { x: t.x, y: t.y, z: t.z, vx: t.vx, vy: t.vy, facing: t.facing, point: t.kind === 'shooter' && t.state !== 'idle', attack: atk, hurt: t.flash > 0 });
  }
  lists.thugs = lists.thugs.filter(t => !t.dead || t.deadT > 0);
  respawnT.thugs -= dt;
  if (respawnT.thugs <= 0 && mapName === 'town') { respawnT.thugs = 45; fillThugs(); }
}

// ---- drops --------------------------------------------------------------------------------------------------------------------
function updateDrops(dt) {
  for (const d of lists.drops) {
    d.t += dt;
    if (dist(d, hero) < 11) {
      d.got = true;
      if (d.kind === 'cash') { S.dirty += d.v; S.earnedToday += d.v; game.audio.sfx('coin'); game.particles.text(d.x, d.y, 18, '+' + money(d.v), '#6fd36a', { scale: 1 }); }
      else if (d.kind === 'ammo') { S.ammo = Math.min(R.ammoMax(S), S.ammo + d.v); game.audio.sfx('pickup'); game.particles.text(d.x, d.y, 18, '+AMMO', '#ffd86a', { scale: 1 }); }
      else { S.pills = Math.min(3, S.pills + 1); game.audio.sfx('heal'); game.particles.text(d.x, d.y, 18, '+PILLS', '#8ad8ff', { scale: 1 }); }
    }
  }
  lists.drops = lists.drops.filter(d => !d.got && d.t < 60);
}

// ---- the boss: Gus Frying, in the Superlab ---------------------------------------------------------------------------------
const GAS = [];
function spawnBoss() {
  const s = map.find('boss'), b = new E.Body({ x: s.x, y: s.y, r: 7 });
  Object.assign(b, { kind: 'boss', hp: 480, maxHp: 480, rig: rigFor('gus'), state: 'intro', t: 0, cd: 2, phase: 1, facing: Math.PI / 2, flash: 0, burst: 0, summoned: false, said: 0 });
  boss = b; GAS.length = 0; return b;
}
function updateBoss(dt) {
  const b = boss; if (!b) return;
  b.flash = Math.max(0, b.flash - dt); b.t += dt; b.cd -= dt;
  const d = dist(b, hero); let mv = [0, 0], sp = 0;
  b.facing = ang(b, hero);
  const half = b.hp < b.maxHp * .5, low = b.hp < b.maxHp * .22;
  if (b.state === 'intro') { if (b.t > .4) b.state = 'walk'; }
  else if (b.state === 'walk') {
    if (d > 70) { mv = [Math.cos(b.facing), Math.sin(b.facing)]; sp = 32 + (half ? 10 : 0); } else if (d < 34) { mv = [-Math.cos(b.facing), -Math.sin(b.facing)]; sp = 28; }
    if (b.cd <= 0) {
      const r = Math.random();
      b.state = r < (low ? .35 : .5) ? 'volley' : r < .75 ? 'slam' : 'gas'; b.t = 0; b.burst = 0;
    }
  } else if (b.state === 'volley') {
    if (b.t > .45) {
      const n = half ? 5 : 3, spread = .5; b.t = 0;
      for (let i = 0; i < n; i++) { const a = b.facing + (i - (n - 1) / 2) * spread / n * 2; shots.fire({ x: b.x, y: b.y, z: 14, vx: Math.cos(a) * 125, vy: Math.sin(a) * 125, r: 2, team: 'enemy', color: '#ffd86a', life: 2, dmg: 9 }); }
      game.audio.sfx('shot', { vol: .6 }); b.burst++; if (b.burst >= 3) { b.state = 'walk'; b.cd = 2.2; }
    }
  } else if (b.state === 'slam') {
    if (b.t > .8) { b.state = 'walk'; b.cd = 2.3; game.audio.sfx('boom'); shake(5); game.particles.ring(b.x, b.y, 6, 52, '#ffd86a', .35); if (d < 52) hurtHero(22, b, 190); }
  } else if (b.state === 'gas') {
    if (b.t < .1 && !b.gassed) { b.gassed = true; for (let i = 0; i < (half ? 5 : 3); i++) GAS.push({ x: hero.x + rnd(-60, 60), y: hero.y + rnd(-45, 45), t: 0, r: 26 }); game.audio.sfx('hiss'); }
    if (b.t > .9) { b.state = 'walk'; b.cd = 2; b.gassed = false; }
  }
  if (half && !b.summoned) { b.summoned = true; converse(W.script.bossHalf); const spots = [cell(20, 5)]; for (const s of spots) { const t = spawnThug(s, 'enforcer'); t.aggro = true; t.state = 'chase'; t.hp = t.maxHp = 60; } }
  if (low && b.said < 1) { b.said = 1; converse(W.script.bossDown); }
  b.vx = mv[0] * sp; b.vy = mv[1] * sp; b.update(dt, map);
  b.rig.update(dt, { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, facing: b.facing, point: b.state === 'volley', stance: 'ready', attack: b.state === 'slam' ? { spec: E.MOVES.haymaker, phase: b.t < .6 ? 'wind' : 'active', u: Math.min(1, b.t / .8) } : undefined, hurt: b.flash > 0 });
  for (const g of GAS) { g.t += dt; if (g.t > 1.2 && g.t < 3.2 && Math.hypot(g.x - hero.x, g.y - hero.y) < g.r) hurtHero(7 * dt * 3, g, 0, true); }
  for (let i = GAS.length - 1; i >= 0; i--) if (GAS[i].t > 3.4) GAS.splice(i, 1);
  if (b.hp <= 0) bossDefeated();
}
