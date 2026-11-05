/* ---- THE WORLD: one place at a time; its people, its cars, its trouble ---- */
const W = { place: null, map: null, def: null, heroes: [], npcs: [], foes: [], items: [], cars: [], parked: [], ducks: [], peds: [], traffic: [],
  marks: [], ghosts: new Map(), shots: null, night: false, mode: 'story', demo: false, cold: 100, banner: null, hover: null, objective: null };
const shots = new E.Bullets(game, { plane: 'ground' });
W.shots = shots;

// the story's numbers (saved): money, the crew's respect, the family's patience, and Sal's nerves
const S = { ch: 0, step: 0, cash: 0, respect: 50, family: 50, stress: 20, ammo: 0, hp: 100, flags: {}, choices: [], seen: {} };
const resetStory = () => Object.assign(S, { ch: 0, step: 0, cash: 0, respect: 50, family: 50, stress: 20, ammo: 0, hp: 100, flags: {}, choices: [], seen: {} });
const adj = (k, v) => { S[k] = clamp(S[k] + v, 0, k === 'cash' ? 1e9 : 100); if (k === 'respect' || k === 'family') hudNote(k, v); };
let hudNote = () => {};

/* ---- the heroes: Sal (player 1) and Nicky (player 2 drops in; an ally in the woods) ---- */
function makeHero(who, x, y, input, o = {}) {
  const h = new E.Body({ x, y, r: 5 });
  Object.assign(h, { who, input, hp: 100, max: 100, facing: Math.PI / 2, roll: 0, rollDir: 0, inv: 0, hurt: 0, stun: 0, gunT: 0, showGun: 0, aim: Math.PI / 2,
    combo: new E.Combo([new E.Attack('jab', { hold: .05 }), new E.Attack('cross', { hold: .05 }), new E.Attack('hook', { hold: .1 })], { window: .35 }),
    kickA: new E.Attack('roundhouse', { hold: .1 }), car: null, cash: 0, dead: 0, ai: o.ai || null, god: !!o.god, robe: !!o.robe, color: o.color || '#4a8aff', flash: 0, hits: 0, auto: null });
  rebuildRigs(h);
  return h;
}
function rebuildRigs(h) { h.rigs = { fists: rigOf(h.who, h.robe), gun: rigOf(h.who, h.robe, { weapon: 'gun' }) }; }
const hero = () => W.heroes[0];

function heroIntent(h) {
  const p = h.input;
  if (h.auto) return h.auto(h);
  if (!p) return h.ai ? h.ai(h) : {};
  const m = p.move();
  if (h.goTo) {
    if (Math.hypot(m[0], m[1]) > .2 || h.car) h.goTo = null;
    else { const g = h.goTo, dd = Math.hypot(g.x - h.x, g.y - h.y); if (dd < (g.use ? g.use.r * .8 : 8)) { h.goTo = null; if (g.use) g.use.act(h); return {}; } const a = Math.atan2(g.y - h.y, g.x - h.x); return { gx: Math.cos(a), gy: Math.sin(a) }; }
  }
  let aim = null;
  if (p.lastDevice === 'mouse' || (p.lastDevice === 'keyboard' && p === I && p.mouse && p.mouse.active)) {
    const g = game.mouseGround(); if (g) aim = Math.atan2(g[1] - h.y, g[0] - h.x);
  } else if (p.padAim) { const d = game.view.screenDirToGround(p.padAim[0], p.padAim[1]); aim = Math.atan2(d[1], d[0]); }
  return { mx: m[0], my: m[1], attack: p.buffered('attack', .2), kick: p.pressed('kick'), interact: p.pressed('interact'), dodge: p.pressed('dodge'),
    block: p.down('block'), fire: p.down('fire'), sprint: p.down('sprint'), aim, gas: p.down('fire') || p.down('up'), brake: p.down('block') || p.down('down'), hand: p.down('dodge'), consume: () => p.consume('attack') };
}

const ROLL_T = .32;
function updateHero(h, dt) {
  if (h.dead) { h.dead += dt; h.rigs.fists.update(dt, { x: h.x, y: h.y, z: h.z, vx: 0, vy: 0, facing: h.facing, pose: 'die' }); return; }
  const it = heroIntent(h) || {};
  if (h.car) return driveCar(h, it, dt);
  h.inv = Math.max(0, h.inv - dt); h.hurt = Math.max(0, h.hurt - dt); h.gunT = Math.max(0, h.gunT - dt); h.showGun = Math.max(0, h.showGun - dt); h.flash = Math.max(0, h.flash - dt);
  h.stun = Math.max(0, h.stun - dt);
  const d = it.gx != null ? [it.gx, it.gy] : game.view.screenDirToGround(it.mx || 0, it.my || 0), mag = Math.hypot(d[0], d[1]);
  const atk = h.combo.state || h.kickA.state;
  h.combo.update(dt); h.kickA.update(dt);
  if (h.roll > 0) {
    h.roll -= dt; h.vx = Math.cos(h.rollDir) * 215; h.vy = Math.sin(h.rollDir) * 215;
  } else if (h.stun > 0) { h.vx *= .85; h.vy *= .85; }
  else {
    const slow = it.block ? .35 : atk ? .25 : h.showGun > 0 ? .8 : 1, sp = (it.sprint ? 122 : 78) * slow;
    h.vx = d[0] * sp; h.vy = d[1] * sp;
    if (mag > .1 && !atk) h.facing = Math.atan2(d[1], d[0]);
    if (it.aim != null && (it.fire || h.showGun > 0)) h.facing = it.aim;
    // fists and feet: a soft lock turns a swing toward the nearest Falsetti
    if (it.attack && !h.kickA.busy && h.combo.press()) { it.consume && it.consume(); faceNearest(h, 34); A.sfx('swing', { vol: .5 }); }
    if (it.kick && !h.combo.busy && h.kickA.start()) { faceNearest(h, 36); A.sfx('whoosh', { vol: .5 }); }
    if (it.dodge) { h.roll = ROLL_T; h.inv = ROLL_T + .05; h.rollDir = mag > .1 ? Math.atan2(d[1], d[0]) : h.facing; h.combo.cancel && h.combo.cancel(); A.sfx('dash', { vol: .4 }); P.dust(h.x, h.y, 0, 6); }
    if (it.fire && h.gunT <= 0 && !atk) fireGun(h, it.aim);
  }
  if (it.interact && h.roll <= 0) interact(h);   // talking and using never wait for a stagger to end
  h.blocking = !!it.block && h.roll <= 0 && !atk && h.stun <= 0;
  // the hits land during the strike; the third punch and the kick send them flying
  const hitList = W.foes.filter(f => !f.dead);
  h.combo.hits(hitList, e => E.inArc(h, h.facing, e, 25, 1.1), e => hitFoe(e, h.combo.step === 2 ? 20 : 12, h.facing, h.combo.step === 2 ? 170 : 70, h));
  h.kickA.hits(hitList, e => E.inArc(h, h.facing, e, 28, 1.2), e => hitFoe(e, 22, h.facing, 220, h));
  for (const d of W.ducks) if (h.combo.active || h.kickA.active) { if (Math.hypot(d.x - h.x, d.y - h.y) < 24 && !d.fly) { d.fly = 1; A.sfx('quack'); } }
  h.update(dt, W.map);
  pushOutProps(h);
  const rig = h.showGun > 0 ? h.rigs.gun : h.rigs.fists;
  const st = { x: h.x, y: h.y, z: h.z, vx: h.vx, vy: h.vy, facing: h.facing, attack: h.combo.state || h.kickA.state, hurt: h.hurt > .1, flip: h.roll > 0 ? 1 - h.roll / ROLL_T : 0,
    stance: h.blocking ? 'guard' : null, pose: h.blocking ? 'block' : h.pose || null, point: h.showGun > 0, sprint: it.sprint && mag > .5 };
  h.rigs.fists.update(dt, st); h.rigs.gun.update(dt, st);
}
function faceNearest(h, range) {
  let best = null, bd = range;
  for (const f of W.foes) if (!f.dead) { const dd = dist(h, f); if (dd < bd) { bd = dd; best = f; } }
  if (best) h.facing = angTo(h, best);
}
function fireGun(h, aim) {
  const ammo = h === hero() ? S.ammo : (h.ammo || 0);
  if (W.mode === 'story' && !S.flags.gun && h === hero() && !W.demo) { if (!W.noGunNote) { toast('No piece', 'Sal left the pistol at home. Frankie keeps it at the club.'); W.noGunNote = 1; } return; }
  h.gunT = .3; h.showGun = 1.6;
  if (ammo <= 0 && !h.god) { A.sfx('click'); h.gunT = .4; if (!W.ammoNote) { toast('Out of ammo', 'Beat it out of them: the Falsettis drop rounds.'); W.ammoNote = 1; } return; }
  let a = aim != null ? aim : h.facing;
  if (game.settings.autoaim) { let best = null, bd = .35; for (const f of W.foes) if (!f.dead && dist(h, f) < 200) { const da = Math.abs(E.angDiff(a, angTo(h, f))); if (da < bd) { bd = da; best = f; } } if (best) a = angTo(h, best); }
  h.facing = a;
  if (h === hero()) { if (!h.god) S.ammo--; adj('stress', .6); } else if (!h.god) h.ammo--;
  const mx = h.x + Math.cos(a) * 12, my = h.y + Math.sin(a) * 12;
  shots.fire({ x: mx, y: my, z: 20, vx: Math.cos(a) * 330, vy: Math.sin(a) * 330, r: 2, team: 'player', color: '#fff4a0', life: .9, dmg: 34, owner: h });
  A.sfx('gun'); game.shake(2); P.sparks(mx, my, 20, 4, a); h.input && h.input.rumble && h.input.rumble(.4, .08);
  W.noise = 2;
}
function hitFoe(f, dmg, ang, push, by) {
  if (f.dead || f.inv > 0 || f.surrender || f.flee) return;
  if (f.blocking && Math.abs(E.angDiff(f.facing, ang + Math.PI)) < 1.2 && dmg < 30) { P.sparks(f.x, f.y, 18, 6, ang + Math.PI); A.sfx('bump'); f.blocking = 0; f.stun = .2; return; }
  const k = by && by.focus > 0 ? 1.3 : 1;
  dmg = Math.round(dmg * k * (by && by.god ? 3 : 1));
  f.hp -= dmg; f.stun = Math.max(f.stun, f.kind === 'boss' ? .12 : .38); f.flash = .12; f.atk && f.atk.cancel && f.kind !== 'boss' && f.atk.cancel();
  f.push(Math.cos(ang) * push * (f.kind === 'boss' ? .3 : 1), Math.sin(ang) * push * (f.kind === 'boss' ? .3 : 1), push > 150 ? 80 : 0);
  game.hitFx(f.x, f.y, 20, { power: push > 150 ? 1.3 : .8, angle: ang, damage: dmg, sound: push > 150 ? 'kick' : 'punch' });
  if (by && by.input && by.input.rumble) by.input.rumble(.5, .1);
  if (by === hero() && W.mode === 'story') adj('stress', -.4);
  if (f.noDie && f.hp <= f.max * (f.kind === 'boss' ? .08 : .3)) { f.hp = Math.max(1, f.hp); f.surrender = 1; f.atk && f.atk.cancel && f.atk.cancel(); W.lobs = []; return; }
  if (f.hp <= 0) killFoe(f, by);
}
function killFoe(f, by) {
  f.dead = 1; f.hp = 0; P.dust(f.x, f.y, 0, 10); A.sfx('stomp');
  const K = FOE_KINDS[f.kind];
  if (K.cash[1] > 0 && f.loot !== false) dropItem('cash', f.x, f.y, Math.round(rnd(K.cash[0], K.cash[1]) / 5) * 5);
  if (f.loot !== false && Math.random() < (K.ranged ? .9 : .35)) dropItem('ammo', f.x + rnd(-8, 8), f.y + rnd(-8, 8), K.ranged ? 6 : 3);
  if (f.loot !== false && Math.random() < .2) dropItem('gabagool', f.x + rnd(-8, 8), f.y + rnd(-8, 8));
  if (by && by.isP) by.kills = (by.kills || 0) + 1;
  if (W.onKill) W.onKill(f);
}
function hurtHero(h, dmg, ang, from) {
  if (h.dead || h.inv > 0 || h.roll > 0 || h.car) return;
  if (h.god) { h.flash = .1; return; }
  dmg *= settingsDiff();
  if (h.blocking && Math.abs(E.angDiff(h.facing, ang + Math.PI)) < 1.5) {
    dmg *= .15; P.sparks(h.x, h.y, 20, 8, ang + Math.PI); A.sfx('bump'); h.push(Math.cos(ang) * 60, Math.sin(ang) * 60, 0);
    if (h === hero() && W.mode === 'story') adj('stress', 1);
  } else {
    h.hurt = .35; h.inv = .55; h.stun = .25; h.push(Math.cos(ang) * 130, Math.sin(ang) * 130, 40);
    game.hitFx(h.x, h.y, 20, { power: .9, angle: ang, damage: Math.round(dmg), color: '#ff6060', sound: 'hurt' });
    if (h === hero() && W.mode === 'story') adj('stress', dmg * .3);
  }
  h.hp -= dmg;
  if (h.input && h.input.rumble) h.input.rumble(.7, .2);
  if (h.hp <= 0) { h.hp = 0; h.dead = .001; A.sfx('die'); game.flash('#600000', .3); if (W.onHeroDown) W.onHeroDown(h); }
}

/* ---- the things in the world you can use: people, doors, the car, the ducks ---- */
function interactables() {
  const list = [];
  for (const n of W.npcs) if (n.act && (!n.show || n.show())) list.push({ x: n.x, y: n.y, label: typeof n.label === 'function' ? n.label() : n.label || 'Talk', act: n.act, who: n, r: 30 });
  for (const s of W.marks) if (s.act && (!s.show || s.show())) list.push({ x: s.x, y: s.y, label: s.label, act: s.act, r: s.r || 26, mark: s });
  for (const c of W.cars) if (c.drivable && !c.driver) list.push({ x: c.x, y: c.y, label: 'Get in', act: h => enterCar(h, c), r: 30, car: c });
  return list;
}
function nearestUse(h) {
  let best = null, bd = 1e9;
  for (const u of interactables()) { const d = Math.hypot(u.x - h.x, u.y - h.y); if (d < u.r && d < bd) { bd = d; best = u; } }
  return best;
}
function interact(h) {
  const u = nearestUse(h);
  if (u) { if (u.who) { u.who.facing = angTo(u.who, h); h.facing = angTo(h, u.who); } u.act(h); }
}
function enterCar(h, c) {
  if (h !== hero() && W.mode !== 'collect') return;
  h.car = c; c.driver = h; A.sfx('door'); hint('car', 'Driving', `${label('fire')} or ${label('up')}: gas · ${label('block')}: brake · ${label('dodge')}: handbrake · ${label('interact')}: get out`);
}
function exitCar(h) {
  const c = h.car; if (!c) return;
  const a = c.angle + Math.PI / 2;
  for (const s of [1, -1, 2, -2]) { const x = c.x + Math.cos(a) * 18 * s, y = c.y + Math.sin(a) * 18 * s; if (W.map.standable(x, y, 0, 5)) { h.x = x; h.y = y; break; } }
  h.vx = h.vy = 0; h.car = null; c.driver = null; A.sfx('door');
}
function driveCar(h, it, dt) {
  const c = h.car;
  const steer = it.steer != null ? it.steer : clamp(it.mx || 0, -1, 1);
  c.update(dt, W.map, { steer, gas: it.gas ? 1 : 0, brake: it.brake ? 1 : 0, drift: !!it.hand });
  for (const p of W.parked) bumpStatic(c, p);
  if (c.bumped && Math.abs(c.speed) > 60) { A.sfx('crash', { vol: .6 }); game.shake(3); P.sparks(c.x + Math.cos(c.angle) * 14, c.y + Math.sin(c.angle) * 14, 6, 6, c.angle + Math.PI); }
  if (Math.abs(c.speed) > 20 && Math.floor(game.time * 12) !== Math.floor((game.time - dt) * 12)) A.sfx('engine', { pitch: .8 + Math.abs(c.speed) / 160 });
  // the car is a weapon: a Falsetti in the road goes down
  for (const f of W.foes) if (!f.dead && Math.hypot(f.x - c.x, f.y - c.y) < 16 && Math.abs(c.speed) > 55) { hitFoe(f, 70, c.angle, 260, h); c.speed *= .6; }
  for (const p of W.peds) if (Math.hypot(p.x - c.x, p.y - c.y) < 18 && Math.abs(c.speed) > 30 && !p.jump) { p.jump = .5; p.push(Math.cos(c.angle + 1.4) * 140, Math.sin(c.angle + 1.4) * 140, 120); A.sfx('hurt', { pitch: 1.4 }); adj('respect', -1); }
  h.x = c.x; h.y = c.y; h.facing = c.angle;
  if (it.interact) exitCar(h);
  h.rigs.fists.update(dt, { x: h.x, y: h.y, z: 0, vx: 0, vy: 0, facing: h.facing });
}
function bumpStatic(c, p) {
  const K = CAR_PAL[p.kind] || CAR_PAL.sedan, ca = Math.cos(p.angle), sa = Math.sin(p.angle);
  for (let f = -K.len * .7; f <= K.len * .71; f += K.len * .7) {
    const px_ = p.x + ca * f, py_ = p.y + sa * f, dx = c.x - px_, dy = c.y - py_, d = Math.hypot(dx, dy), m = K.wid + c.r + 1;
    if (d < m && d > .01) { c.x += dx / d * (m - d); c.y += dy / d * (m - d); c.bumped = true; c.speed *= -.25; }
  }
}
function pushOutProps(b) {
  for (const p of W.def.props) if (p.r && !p.tree) { const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy), m = p.r + b.r; if (d < m && d > .01) { b.x += dx / d * (m - d); b.y += dy / d * (m - d); } }
  for (const p of W.parked) { const K = CAR_PAL[p.kind] || CAR_PAL.sedan, ca = Math.cos(p.angle), sa = Math.sin(p.angle);
    const lx = (b.x - p.x) * ca + (b.y - p.y) * sa, ly = -(b.x - p.x) * sa + (b.y - p.y) * ca;
    if (Math.abs(lx) < K.len + b.r && Math.abs(ly) < K.wid + b.r) { const ox = K.len + b.r - Math.abs(lx), oy = K.wid + b.r - Math.abs(ly);
      if (ox < oy) { const s = Math.sign(lx) || 1; b.x += ca * ox * s; b.y += sa * ox * s; } else { const s = Math.sign(ly) || 1; b.x += -sa * oy * s; b.y += ca * oy * s; } } }
}

/* ---- finding the way: straight at a target in sight, else along a flow field round the buildings ---- */
function navAngle(from, to) {
  if (W.map.los(from.x, from.y, to.x, to.y)) return Math.atan2(to.y - from.y, to.x - from.x);
  W.flows = W.flows || new Map();
  let fl = W.flows.get(to); if (!fl || fl.map !== W.map) { fl = new E.FlowField(W.map); W.flows.set(to, fl); }
  fl.update(to.x, to.y); const d = fl.dir(from.x, from.y, to.x, to.y);
  return Math.atan2(d[1], d[0]);
}

/* ---- the Falsettis ---- */
function spawnFoe(kind, x, y, o = {}) {
  const K = FOE_KINDS[kind], f = new E.Body({ x, y, r: kind === 'boss' ? 7 : 5.5, friction: 7 });
  Object.assign(f, { kind, hp: Math.round(K.hp * (o.hpK || 1)), max: Math.round(K.hp * (o.hpK || 1)), rig: o.rig || K.look(), facing: Math.PI / 2, stun: 0, flash: 0, inv: 0, cd: rnd(.6, 1.6), aimT: 0, strafe: Math.random() < .5 ? 1 : -1,
    atks: K.moves.map(m => new E.Attack(m, { wind: kind === 'boss' ? .28 : .42, recover: .45, hold: .2 })), atk: null, name: o.name || null, wake: o.wake || 0, loot: o.loot, phase: 1, dead: 0, ammo: 0, noDie: kind === 'boss' || kind === 'bagman' });
  f.atk = f.atks[0] || null;
  W.foes.push(f); P.dust(x, y, 0, 6);
  return f;
}
let attackers = 0;
function updateFoes(dt) {
  attackers = W.foes.filter(f => !f.dead && f.atk && f.atk.busy).length;
  for (const f of W.foes) {
    if (f.dead) { f.dead += dt; f.rig.update(dt, { x: f.x, y: f.y, z: f.z, vx: 0, vy: 0, facing: f.facing, pose: 'die' }); f.update(dt, W.map); continue; }
    f.flash = Math.max(0, f.flash - dt); f.stun = Math.max(0, f.stun - dt); f.inv = Math.max(0, f.inv - dt); f.cd -= dt; f.aimT = Math.max(0, f.aimT - dt);
    if (f.wake > 0) { f.wake -= dt; f.rig.update(dt, { x: f.x, y: f.y, z: f.z, vx: 0, vy: 0, facing: f.facing, pose: 'hips' }); f.update(dt, W.map); continue; }
    const targets = W.heroes.filter(h => !h.dead);
    let t = null, td = 1e9; for (const h of targets) { const d = dist(f, h); if (d < td) { td = d; t = h; } }
    const K = FOE_KINDS[f.kind], sp = K.speed * (f.kind === 'boss' && f.phase === 3 ? 1.5 : 1);
    if (f.atk) f.atk.update(dt);
    if (!t) { f.vx *= .9; f.vy *= .9; }
    else if (f.stun > 0) { /* reeling */ }
    else if (f.flee) { /* the story moves him */ }
    else if (f.surrender) { f.vx = f.vy = 0; f.facing = angTo(f, t); }
    else if (f.kind === 'boss') bossBrain(f, t, td, dt);
    else if (K.ranged) {
      const a = angTo(f, t); f.facing = a;
      if (f.aimT > 0) { f.vx = f.vy = 0; if (f.aimT <= dt) enemyShot(f, a); }
      else {
        const seen = W.map.los(f.x, f.y, t.x, t.y), na = seen ? a : navAngle(f, t);
        const want = !seen ? 1 : td < 70 ? -1 : td > 115 ? 1 : 0, side = a + Math.PI / 2 * f.strafe;
        const k = seen ? .55 : 0; f.vx = Math.cos(na) * sp * want + Math.cos(side) * sp * k; f.vy = Math.sin(na) * sp * want + Math.sin(side) * sp * k;
        if (f.hitWall) f.strafe *= -1;
        if (f.cd <= 0 && td < 190 && W.map.los(f.x, f.y, t.x, t.y)) { f.aimT = .55; f.cd = rnd(1.6, 2.6) / Math.sqrt(settingsDiff()); A.sfx('click', { pitch: .6 }); }
      }
    } else {
      const a = td > 30 ? navAngle(f, t) : angTo(f, t);
      if (!f.atk || !f.atk.busy) f.facing = angTo(f, t);
      const reach = f.kind === 'bruiser' ? 26 : 21;
      if (f.atk && f.atk.busy) { f.vx *= .8; f.vy *= .8; }
      else if (td > reach) {
        const side = a + Math.PI / 2 * f.strafe, wait = attackers >= 2 && td < 50 ? .2 : 1;
        f.vx = (Math.cos(a) * wait + Math.cos(side) * (1 - wait) * .8) * sp; f.vy = (Math.sin(a) * wait + Math.sin(side) * (1 - wait) * .8) * sp;
        if (f.hitWall) f.strafe *= -1;
      } else if (f.cd <= 0 && attackers < 2 + (settingsDiff() > 1.2 ? 1 : 0)) {
        f.atk = E.pick(f.atks); f.atk.start(); f.cd = rnd(.9, 1.7) / settingsDiff(); attackers++; f.vx = f.vy = 0;
      } else { f.vx = Math.cos(a + Math.PI / 2 * f.strafe) * sp * .5; f.vy = Math.sin(a + Math.PI / 2 * f.strafe) * sp * .5; if (Math.random() < .004) f.blocking = 1; }
      if (f.atk) f.atk.hits(targets, h => E.inArc(f, f.facing, h, reach + 3, 1.2), h => hurtHero(h, K.dmg, f.facing, f));
    }
    f.update(dt, W.map); pushOutProps(f);
    for (const g of W.foes) if (g !== f && !g.dead) { const dx = f.x - g.x, dy = f.y - g.y, d = Math.hypot(dx, dy); if (d < 11 && d > .01) { f.x += dx / d * (11 - d) * .5; f.y += dy / d * (11 - d) * .5; } }
    f.rig.update(dt, { x: f.x, y: f.y, z: f.z, vx: f.vx, vy: f.vy, facing: f.facing, attack: f.atk && f.atk.state, hurt: f.stun > 0, point: K.ranged ? f.aimT > 0 || f.cd < .4 : f.kind === 'boss' && f.aimT > 0,
      stance: K.ranged ? null : 'guard', pose: f.surrender ? 'kneel' : f.blocking ? 'block' : null, expr: f.stun > 0 ? 'wince' : f.atk && f.atk.busy ? 'shout' : 'angry' });
    if (f.blocking && Math.random() < .02) f.blocking = 0;
  }
  // the dead fade after a while
  for (let i = W.foes.length - 1; i >= 0; i--) if (W.foes[i].dead > 3.5) W.foes.splice(i, 1);
}
function enemyShot(f, a) {
  const sp = 150 + 30 * settingsDiff();
  shots.fire({ x: f.x + Math.cos(a) * 10, y: f.y + Math.sin(a) * 10, z: 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 2.2, team: 'enemy', color: '#ff7a50', life: 1.6, dmg: FOE_KINDS[f.kind].dmg });
  A.sfx('gun', { pitch: 1.2, vol: .7 }); P.sparks(f.x + Math.cos(a) * 10, f.y + Math.sin(a) * 10, 20, 3, a);
}
// Carmine "The Tenor": three movements. He sings while he fights (the voice is the tell)
function bossBrain(f, t, td, dt) {
  const a = angTo(f, t), K = FOE_KINDS.boss, ph = f.hp > f.max * .62 ? 1 : f.hp > f.max * .3 ? 2 : 3;
  if (ph !== f.phase) { f.phase = ph; f.inv = 1; f.cd = 1.2; if (W.onBossPhase) W.onBossPhase(f, ph); }
  if (!f.atk || !f.atk.busy) f.facing = a;
  f.lob = (f.lob || 0) - dt;
  if (f.atk && f.atk.busy) { f.vx *= .85; f.vy *= .85; }
  else if (ph >= 2 && f.lob <= 0 && td > 50) {
    // a garbage bag, lobbed where Sal stands
    f.lob = ph === 3 ? 1.6 : 2.4; const arc = E.arc({ x: f.x, y: f.y, z: 26 }, { x: t.x + t.vx * .4, y: t.y + t.vy * .4, z: 0 }, 500, { apex: 50 });
    W.lobs.push({ x: f.x, y: f.y, z: 26, vx: arc.vx, vy: arc.vy, vz: arc.vz, t: 0 }); A.sfx('throw'); f.aimT = .3;
  } else if (ph >= 2 && f.cd <= 0 && td > 70) {
    for (let k = -1; k <= 1; k++) enemyShot(f, a + k * .22); f.cd = ph === 3 ? 1.4 : 2.2; f.aimT = .4;
  } else if (td > 24) { const sp = K.speed * (ph === 3 ? 1.45 : 1); f.vx = Math.cos(a) * sp; f.vy = Math.sin(a) * sp; }
  else if (f.cd <= 0) { f.atk = E.pick(f.atks); f.atk.start(); f.cd = ph === 3 ? .55 : .9; babble('a', 'carmine'); }
  if (f.atk) f.atk.hits(W.heroes.filter(h => !h.dead), h => E.inArc(f, f.facing, h, 30, 1.3), h => hurtHero(h, K.dmg, f.facing, f));
}
W.lobs = [];
function updateLobs(dt) {
  for (const b of W.lobs) {
    b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.vz -= 500 * dt;
    if (b.z <= 0) { b.dead = 1; P.explosion(b.x, b.y, 2, .6, { freeze: false, shake: 2 }); P.bits(b.x, b.y, 4, 10, ['#3a5a3a', '#5a5a3a', '#e8e0c0']); for (const h of W.heroes) if (Math.hypot(h.x - b.x, h.y - b.y) < 20) hurtHero(h, 14, Math.atan2(h.y - b.y, h.x - b.x)); }
  }
  W.lobs = W.lobs.filter(b => !b.dead);
}

/* ---- pickups ---- */
function dropItem(kind, x, y, amount = 0) { W.items.push({ kind, x, y, amount, t: 0, z: 10, vz: 60 }); }
function updateItems(dt) {
  for (const it of W.items) {
    it.t += dt; if (it.z > 0 || it.vz > 0) { it.z += it.vz * dt; it.vz -= 300 * dt; if (it.z < 0) { it.z = 0; it.vz = it.vz < -40 ? -it.vz * .35 : 0; } }
    if (it.t < .35 || it.got) continue;
    for (const h of W.heroes) {
      if (h.dead || h.car) continue;
      const d = Math.hypot(h.x - it.x, h.y - it.y);
      if (d < 26 && it.kind !== 'paper' && it.kind !== 'shoe' && it.kind !== 'bag') { it.x += (h.x - it.x) * dt * 6; it.y += (h.y - it.y) * dt * 6; }
      if (d < 9) { it.got = true; collect(h, it); break; }
    }
  }
  W.items = W.items.filter(i => !i.got && i.t < (i.kind === 'cash' || i.kind === 'ammo' || i.kind === 'gabagool' ? 30 : 1e9));
}
function collect(h, it) {
  switch (it.kind) {
    case 'cash': if (W.mode === 'story' && h === hero()) adj('cash', it.amount); h.cash += it.amount; A.sfx('cash'); P.text(it.x, it.y, 20, '+' + money(it.amount), '#8af07a', { scale: 1 }); break;
    case 'ammo': if (h === hero()) S.ammo = Math.min(48, S.ammo + it.amount); else h.ammo = (h.ammo || 0) + it.amount; A.sfx('pickup'); P.text(it.x, it.y, 20, '+' + it.amount + ' ROUNDS', '#f0d060', { scale: 1 }); break;
    case 'gabagool': h.hp = Math.min(h.max, h.hp + 30); if (h === hero() && W.mode === 'story') adj('stress', -6); A.sfx('heal'); P.text(it.x, it.y, 20, 'GABAGOOL', '#ff9a9a', { scale: 1 }); break;
    case 'cannoli': h.hp = Math.min(h.max, h.hp + 15); if (h === hero()) adj('stress', -12); A.sfx('heal'); P.text(it.x, it.y, 20, 'CANNOLI', '#fff0c0', { scale: 1 }); break;
    default: if (W.onPickup) W.onPickup(h, it); A.sfx('pickup');
  }
  if (W.onCollect) W.onCollect(h, it);
}

/* ---- the life of the street: ducks, people walking, traffic ---- */
function makeDucks() {
  const c = W.def.at.ducks; if (!c) return;
  W.ducks = [0, 1, 2].map(i => ({ x: c.x + (i - 1) * 14, y: c.y + (i % 2) * 8, a: rnd(0, TAU), t: rnd(0, 3), fly: 0, z: 0, fed: 0 }));
}
function updateDucks(dt) {
  const c = W.def.at.ducks;
  for (const d of W.ducks) {
    if (d.fly) { d.fly += dt; d.z += 40 * dt; d.x += 50 * dt; d.y -= 30 * dt; continue; }
    d.t -= dt; if (d.t <= 0) { d.t = rnd(1.5, 4); d.a = d.fed > 0 ? Math.atan2(hero().y - d.y, hero().x - d.x) : rnd(0, TAU); }
    d.fed = Math.max(0, d.fed - dt);
    d.x += Math.cos(d.a) * 8 * dt; d.y += Math.sin(d.a) * 8 * dt;
    d.x = clamp(d.x, 14.3 * T, 18.7 * T); d.y = clamp(d.y, 3.3 * T, 6.7 * T);
  }
  W.ducks = W.ducks.filter(d => d.fly < 6);
}
const PED_COLORS = ['#c84a4a', '#4a8ac8', '#e8c040', '#5aa85a', '#a85ac8', '#e88a3a'];
function makePeds(n) {
  W.peds = [];
  for (let i = 0; i < n; i++) {
    const spot = randomWalk(), p = new E.Body({ x: spot.x, y: spot.y, r: 4.5 });
    p.rig = H({ size: 1.2, hair: E.pick(['short', 'long', 'ponytail', 'bald', 'spiky']), sleeves: E.pick(['short', 'long']), colors: { skin: E.pick(['#f0c8a8', '#d8a080', '#a87050', '#f4d8c0']), hair: E.pick(['#2a1a10', '#8a5a2a', '#e8c070', '#c8c8c8']), cloth: E.pick(PED_COLORS), pants: E.pick(['#3a3a4a', '#4a5a8a', '#6a5a4a']), boot: '#2a2a2a' } });
    p.goal = randomWalk(); p.facing = 0; p.jump = 0; W.peds.push(p);
  }
}
function randomWalk() {
  for (let k = 0; k < 40; k++) { const cx = E.randInt(1, W.map.w - 2), cy = E.randInt(1, W.map.h - 2); const tag = W.map.floorAt((cx + .5) * T, (cy + .5) * T); if ((tag === 'walk' || tag === 'path') && W.map.walkable(cx, cy)) return { x: (cx + .5) * T, y: (cy + .5) * T }; }
  return { x: W.def.at.hero.x, y: W.def.at.hero.y };
}
function updatePeds(dt) {
  const fight = W.foes.some(f => !f.dead) || W.noise > 0;
  for (const p of W.peds) {
    p.jump = Math.max(0, p.jump - dt);
    const g = p.goal, d = Math.hypot(g.x - p.x, g.y - p.y);
    if (d < 8 || p.hitWall && Math.random() < .05) p.goal = randomWalk();
    let a = Math.atan2(g.y - p.y, g.x - p.x), sp = 26;
    if (fight) { const h = hero(); if (h && Math.hypot(h.x - p.x, h.y - p.y) < 130) { a = Math.atan2(p.y - h.y, p.x - h.x); sp = 70; } }
    if (p.jump <= 0) { p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.facing = a; }
    p.update(dt, W.map); pushOutProps(p);
    p.rig.update(dt, { x: p.x, y: p.y, z: p.z, vx: p.vx, vy: p.vy, facing: p.facing, hurt: p.jump > 0, expr: fight ? 'wince' : null });
  }
}
// traffic: cars on a loop round the blocks, stopping for whoever stands in the road
function makeTraffic(n) {
  W.traffic = [];
  const R = TOWN.roads, y1 = (R.HR[0][0] + 2.1) * T, y2 = (R.HR[1][0] + .9) * T, x1 = (R.VR[0][0] + .9) * T, x2 = (R.VR[1][0] + 2.1) * T;
  const loops = [new E.Path([[3 * T, y1], [57 * T, y1], [57 * T, (R.HR[0][0] + .9) * T], [3 * T, (R.HR[0][0] + .9) * T]], { closed: true }),
    new E.Path([[x2, 3 * T], [x2, 42 * T], [(R.VR[1][0] + .9) * T, 42 * T], [(R.VR[1][0] + .9) * T, 3 * T]], { closed: true }),
    new E.Path([[3 * T, y2], [57 * T, y2], [57 * T, (R.HR[1][0] + 2.1) * T], [3 * T, (R.HR[1][0] + 2.1) * T]], { closed: true })];
  for (let i = 0; i < n; i++) { const path = loops[i % loops.length]; W.traffic.push({ path, d: (i * 377) % path.length, sp: 0, kind: E.pick(['sedan', 'cab', 'sedan', 'van']), color: E.pick(['#8a1a1a', '#3a5a9a', '#e8e8e8', '#2a6a4a', '#6a4a8a']), x: 0, y: 0, angle: 0, z: 0 }); }
}
function updateTraffic(dt) {
  for (const c of W.traffic) {
    const ahead = c.path.at(c.d + 30), block = [...W.heroes, ...W.foes.filter(f => !f.dead), ...W.peds].some(b => !b.car && Math.hypot(b.x - ahead.x, b.y - ahead.y) < 18)
      || W.cars.some(o => o.driver && Math.hypot(o.x - ahead.x, o.y - ahead.y) < 22) || W.traffic.some(o => o !== c && Math.hypot(o.x - ahead.x, o.y - ahead.y) < 16);
    c.sp = E.approach(c.sp, block ? 0 : 70, (block ? 260 : 60) * dt);
    if (block && c.sp < 5 && Math.random() < .004) A.sfx('horn', { vol: .4 });
    c.d += c.sp * dt; const p = c.path.at(c.d); c.x = p.x; c.y = p.y; c.angle = E.approachAng ? E.approachAng(c.angle, p.angle, 6 * dt) : p.angle; c.braking = block;
    for (const h of W.heroes) if (!h.car && !h.dead && Math.hypot(h.x - c.x, h.y - c.y) < 14 && c.sp > 30) hurtHero(h, 8, c.angle + Math.PI / 2);
    for (const car of W.cars) if (car.driver && Math.hypot(car.x - c.x, car.y - c.y) < 18) { const a = Math.atan2(car.y - c.y, car.x - c.x); car.x += Math.cos(a) * 3; car.y += Math.sin(a) * 3; car.speed *= .5; c.sp = 0; if (Math.abs(car.speed) > 30) { A.sfx('crash', { vol: .5 }); game.shake(2); } }
  }
}

/* ---- entering a place ---- */
function enterPlace(id, o = {}) {
  const def = PLACES[id];
  W.place = id; W.def = def; W.map = mapOf(def);
  W.npcs = []; W.foes = []; W.items = []; W.flows = new Map(); W.marks = []; W.lobs = []; W.ducks = []; W.peds = []; W.traffic = []; W.cars = []; W.parked = []; W.track = [];
  W.onKill = W.onCollect = W.onPickup = W.onHeroDown = W.onBossPhase = null; W.noise = 0; W.cold = 100; W.banner = null; W.noGunNote = 0;
  shots.clear();
  for (const p of def.parked) W.parked.push(Object.assign({}, p));
  if (def.at.suv && o.suv !== false) { const c = new E.Car({ x: def.at.suv.x, y: def.at.suv.y, angle: def.at.suv.angle, top: 190, accel: 150, turn: 2.2, grip: 8, r: 8 }); c.kind = 'suv'; c.drivable = true; W.cars.push(c); }
  if (id === 'town') { makeDucks(); if (o.peds !== false) makePeds(o.peds || 6); if (o.traffic !== false) makeTraffic(o.traffic || 4); }
  game.cam.bounds = v => W.map.bounds(v);
  game.cam.snap = true;
  W.night = !!o.night; W.snow = id === 'barrens';
  L.enabled = W.night || id !== 'town';
  L.ambient = W.night ? .42 : id === 'barrens' ? .78 : id === 'office' ? .82 : id === 'diner' ? .72 : 1;
  game.weather = W.snow ? { kind: 'snow', amount: .7, wind: .4 } : o.rain ? { kind: 'rain', amount: .8, wind: .2, lightning: .08 } : null;
}

function updateWorld(dt) {
  W.noise = Math.max(0, (W.noise || 0) - dt);
  for (const h of W.heroes) updateHero(h, dt);
  updateFoes(dt); updateLobs(dt); updateItems(dt);
  if (W.ducks.length) updateDucks(dt);
  if (W.peds.length) updatePeds(dt);
  if (W.traffic.length) updateTraffic(dt);
  for (const c of W.cars) if (!c.driver) { c.update(dt, W.map, { steer: 0, gas: 0, brake: 1 }); }
  for (const n of W.npcs) {
    if (n.walkTo) { const a = angTo(n, n.walkTo), d = dist(n, n.walkTo); if (d > 3) { n.x += Math.cos(a) * 50 * dt; n.y += Math.sin(a) * 50 * dt; n.facing = a; n.vx = Math.cos(a) * 50; n.vy = Math.sin(a) * 50; } else { n.walkTo = null; n.vx = n.vy = 0; if (n.arrive) n.arrive(); } }
    const h = hero(); if (!n.walkTo && h && dist(n, h) < 50 && !n.fixedFacing) n.facing = E.approachAng ? E.approachAng(n.facing, angTo(n, h), 4 * dt) : angTo(n, h);
    n.rig.update(dt, { x: n.x, y: n.y, z: n.z || 0, vx: n.vx || 0, vy: n.vy || 0, facing: n.facing, pose: n.pose || null, expr: n.expr || null, point: !!n.point });
  }
  shots.update(dt, W.map);
  shots.hit(W.foes.filter(f => !f.dead), (b, f) => { hitFoe(f, b.dmg, Math.atan2(b.vy, b.vx), 90, b.owner); return true; }, 'player');
  shots.hit(W.heroes.filter(h => !h.dead && !h.car), (b, h) => { hurtHero(h, b.dmg, Math.atan2(b.vy, b.vx)); return true; }, 'enemy');
  // footprints in the snow
  if (W.snow) for (const h of W.heroes) if (!h.dead && Math.hypot(h.vx, h.vy) > 20 && Math.floor(game.time * 5) !== Math.floor((game.time - dt) * 5)) { W.track.push({ x: h.x, y: h.y, a: h.facing, t: 0 }); if (W.track.length > 160) W.track.shift(); }
}

/* ---- drawing the world ---- */
const SIGN_CACHE = {};
function drawWorld(r) {
  const view = E.charView(r.view), def = W.def;
  if (W.place === 'barrens') r.sky(['#8a9ab8', '#c8d0e0', '#e8eef8']);
  W.map.drawFloor(r); W.map.queueWalls(r);
  for (const [id, x, y, o] of def.solids) r.shape(id, x, y, 0, o || { facing: E.hash2(x, y) * 4 > 2 ? Math.PI / 2 : 0 });
  for (const p of def.props) {
    if (p.tree && !r.visible(p.x, p.y, 0) && !r.visible(p.x, p.y, 40)) continue;
    r.prop(p.prop, p.x, p.y, p.z || 0, Object.assign({}, p, { light: (W.night || W.place !== 'town') && !!p.light }));
  }
  for (const f of def.faces) r.prop(f.prop, f.x, f.y + 1, f.z || 0, Object.assign({}, f, { light: false }));
  for (const f of def.faces) if (f.light && (W.night || W.place !== 'town')) L.add(f.x, f.y + 6, (f.z || 0) - 4, 70, .9, { color: f.light });
  for (const [s, x, y, z, c] of def.signs) r.queue(x, y + 1, z, g => { const [X, Y] = r.w(x, y + 1, z); txt(g, s, Math.round(X), Math.round(Y) - 4, c, { align: 'center', font: s.length > 14 ? 'tiny' : undefined }); }, { emissive: W.night, bias: 1 });
  if (W.night) for (const [s, x, y, z, c] of def.signs) L.add(x, y + 8, z, 46, .55, { color: c });
  for (const t of W.track) r.decal(() => { r.groundDisc ? r.groundDisc(t.x + Math.cos(t.a + 1.6) * 2, t.y + Math.sin(t.a + 1.6) * 2, 1.4, '#a8b4cc') : null; });
  // the pool's ducks
  for (const d of W.ducks) r.sprite(d.x, d.y, d.fly ? 10 + d.z : Math.sin(game.time * 3 + d.x) * .6, d.fly ? DUCK_FLY : DUCK[Math.floor(game.time * 2 + d.x) % 2], { flip: Math.cos(d.a) < 0 });
  // cars
  for (const p of W.parked) drawCar(r, p, p.kind, { color: p.color, lights: W.night && p.kind === 'cop' });
  for (const c of W.cars) drawCar(r, c, c.kind || 'suv', { lights: W.night || !!c.driver, braking: c.driver && c.driver.input && c.driver.input.down && c.driver.input.down('block') });
  for (const c of W.traffic) drawCar(r, c, c.kind, { color: c.color, lights: W.night, braking: c.braking });
  // pickups
  for (const it of W.items) { const s = SPR[it.kind] || SPR.cash, bob = it.z + 3 + Math.sin(game.time * 4 + it.x) * 1.5; r.shadow(it.x, it.y, 3, .3); r.sprite(it.x, it.y, bob, s, { glow: it.kind === 'cash' || it.kind === 'envelope' ? .4 : 0 }); }
  for (const b of W.lobs) { r.shadow(b.x, b.y, 4, .4); r.queue(b.x, b.y, b.z, g => { const [X, Y] = r.w(b.x, b.y, b.z); px.disc(g, X, Y, 4, '#2a3a2a'); px.disc(g, X - 1, Y - 1, 2, '#4a6a4a'); px.dot(g, X, Y - 4, '#e8e0c0'); }); }
  // people
  for (const n of W.npcs) { r.shadow(n.x, n.y, 7, .35); const hov = W.hover && W.hover.who === n; r.actor(n.x, n.y, n.z || 0, (g, ox, oy) => n.rig.draw(g, ox, oy, view), { pick: n, outline: hov ? '#ffe070' : undefined }); }
  for (const p of W.peds) { r.shadow(p.x, p.y, 6, .3); r.actor(p.x, p.y, p.z, (g, ox, oy) => p.rig.draw(g, ox, oy, view), { every: 2, key: p }); }
  for (const f of W.foes) {
    r.shadow(f.x, f.y, f.kind === 'boss' ? 10 : 7, .4);
    const tell = f.atk && f.atk.phase === 'wind';
    r.actor(f.x + (tell ? Math.sin(game.time * 60) * .6 : 0), f.y, f.z, (g, ox, oy) => f.rig.draw(g, ox, oy, view), { flash: f.flash > 0 ? '#ffffff' : tell ? '#ff8060' : undefined, flashMix: tell ? .25 : .75, alpha: f.dead > 2.5 ? 1 - (f.dead - 2.5) : undefined, pick: f });
    f.rig.drawSmear && f.rig.drawSmear(r);
    if (f.aimT > 0) r.decal(() => r.groundArc ? r.groundArc(f.x, f.y, 4, 120, f.facing - .03, f.facing + .03, '#ff4030', .5) : null, { emissive: 1 });
    if (!f.dead && (f.kind === 'boss' || f.kind === 'bagman' || f.name) ) { const top = 52 + (f.kind === 'boss' ? 14 : 0); r.queue(f.x, f.y, top, g => { const [X, Y] = r.w(f.x, f.y, top); if (f.kind === 'boss') return; txt(g, f.name || '', Math.round(X), Math.round(Y), '#ffb0a0', { align: 'center', font: 'tiny' }); E.ui.bar(g, Math.round(X) - 12, Math.round(Y) + 7, 24, 3, f.hp / f.max, '#e84a3a'); }, { bias: 3 }); }
    else if (!f.dead && f.hp < f.max) { const top = 46; r.queue(f.x, f.y, top, g => { const [X, Y] = r.w(f.x, f.y, top); E.ui.bar(g, Math.round(X) - 8, Math.round(Y), 16, 2, f.hp / f.max, '#e84a3a'); }, { bias: 3 }); }
  }
  for (const [id, gh] of W.ghosts) { if (gh.place !== W.place) continue; r.shadow(gh.x, gh.y, 6, .2); r.actor(gh.x, gh.y, 0, (g, ox, oy) => gh.rig.draw(g, ox, oy, view), { alpha: .5, outline: gh.color });
    r.queue(gh.x, gh.y, 50, g => { const [X, Y] = r.w(gh.x, gh.y, 50); txt(g, gh.name, Math.round(X), Math.round(Y), gh.color, { align: 'center', font: 'tiny' }); }, { bias: 3 }); }
  for (const h of W.heroes) {
    if (h.car) continue;
    r.shadow(h.x, h.y, 8, .4);
    const blink = h.inv > 0 && h.hurt <= 0 && h.roll <= 0 && Math.floor(game.real * 15) % 2;
    const rig = h.showGun > 0 ? h.rigs.gun : h.rigs.fists;
    if (!blink) r.actor(h.x, h.y, h.z, (g, ox, oy) => rig.draw(g, ox, oy, view), { xray: true, flash: h.hurt > .2 ? '#ff4040' : h.flash > 0 ? '#ffffff' : undefined, ghost: h.roll > 0 ? { color: h.color, life: .2, alpha: .4, owner: h } : undefined });
    rig.drawSmear && rig.drawSmear(r);
    if (W.heroes.length > 1) r.decal(() => r.groundRing && r.groundRing(h.x, h.y, 9, h.color), { emissive: 1 });
  }
  shots.draw(r);
  // the objective's marker and the hover focus
  if (W.objective && W.objective.at && !W.demo) r.marker(W.objective.at.x, W.objective.at.y, 40, { label: W.objective.short || '', color: '#ffd040' });
  for (const p of def.props) if (p.light && (W.night || W.place !== 'town') && r.visible(p.x, p.y, 40)) L.add(p.x, p.y, p.prop === 'streetlamp' ? 40 : 18, p.prop === 'streetlamp' ? 90 : 70, .85, { color: p.prop === 'firedrum' ? '#ff9040' : '#ffe0a0' });
}
