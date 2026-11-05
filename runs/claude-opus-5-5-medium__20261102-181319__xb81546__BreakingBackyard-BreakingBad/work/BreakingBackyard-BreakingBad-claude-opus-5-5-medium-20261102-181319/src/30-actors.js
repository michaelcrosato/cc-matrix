/* ---------------- the run's state (what a save holds) ---------------- */
const NEW_STATE = () => ({ ep: 1, step: 0, day: 1, clock: 9, hp: 100, dirty: 0, clean: 0, product: 0, purity: 0, heat: 0,
  flasks: { fulm: 2, smoke: 0 }, sel: 'fulm', up: {}, alias: false, cooks: 0, best: 0, deals: 0, epDeals: 0, earned: 0, kos: 0, busts: 0, time: 0, flags: {} });
let S = NEW_STATE();
const FLASK_MAX = { fulm: 3, smoke: 3 };
const UPGRADES = [
  { id: 'glass', name: 'Lab-grade glassware', cost: 1500, text: 'Wider timing windows in the cook. +3% purity.' },
  { id: 'pistol', name: 'A pistol. No questions.', cost: 2000, text: 'Your attack shoots instead of punching.' },
  { id: 'vest', name: 'Kevlar vest', cost: 1800, text: 'Take a third less damage.' },
  { id: 'reactor', name: 'Bigger reaction vessel', cost: 2500, text: 'Each cook yields 4 more pounds.' },
  { id: 'phone', name: 'Burner phone network', cost: 1200, text: 'DEA agents show on your radar. Buyers pay 10% more.' },
  { id: 'salon', name: 'A nail salon front', cost: 3000, text: 'Launder at 95 cents on the dollar instead of 80.' },
  { id: 'cover', name: 'A cover story', cost: 1000, text: 'Heat drops by half. Can be bought again.', repeat: true }
];
const purityColor = p => p >= 96 ? '#7ae0ff' : p >= 90 ? '#58b8f0' : p >= 80 ? '#9ac0d0' : '#c8c0a8';
const launderRate = () => S.up.salon ? .95 : .8;

/* ---------------- the level in play: one of these per scene (the town, the superlab, the hub's town) ---------------- */
let W = null;
function newLevel(kind, map) {
  W = { kind, map, enemies: [], agents: [], buyers: [], npcs: [], flasks: [], clouds: [], heroes: [], hero: null, partner: null,
    shots: new E.Bullets(game, { plane: 'ground' }), combat: false, lock: null, t: 0, demo: false, onClear: null, dead: false, ghosts: new Map() };
  return W;
}

/* ---------------- heroes: Hollis (player 1) and Dusty (player 2, or the AI partner) ---------------- */
function makeHero(who, x, y, input) {
  const b = new E.Body({ x, y, r: 5 });
  Object.assign(b, { kind: 'hero', who, input, facing: Math.PI / 2, hp: who === 'hollis' ? S.hp : 100, maxHp: 100, iT: 0, hurtT: 0, dodgeT: 0, dodgeCd: 0, dodgeDir: 0,
    cool: 0, throwCd: 0, ammo: 8, reload: 0, down: false, downT: 0, ai: !input, team: 'player', aim: Math.PI / 2, aiming: 0, combo: new E.Combo(['jab', 'cross', 'hook'], { window: .35 }),
    ctl: blankCtl() });
  b.rig = who === 'hollis' ? RIGS.hollis(S.alias, !!S.up.pistol) : RIGS.dusty();
  b.gun = who === 'hollis' ? !!S.up.pistol : true;
  return b;
}
const refreshHeroRig = h => { if (h && h.who === 'hollis') { h.rig = RIGS.hollis(S.alias, !!S.up.pistol); h.gun = !!S.up.pistol; } };
function blankCtl() { return { mx: 0, my: 0, aim: null, aimPt: null, attack: false, attackHeld: false, throw: false, cycle: false, dodge: false, sprint: false, interact: false }; }
function readCtl(inp, h) {
  const c = h.ctl, m = inp.move(), d = game.view.screenDirToGround(m[0], m[1]);
  c.mx = d[0]; c.my = d[1]; c.aim = null; c.aimPt = null;
  if (inp === I && I.aimSource === 'mouse') { const g = game.mouseGround(); if (g) { c.aimPt = { x: g[0] !== undefined ? g[0] : g.x, y: g[1] !== undefined ? g[1] : g.y }; c.aim = Math.atan2(c.aimPt.y - h.y, c.aimPt.x - h.x); } }
  else if (inp.padAim) { const a = game.view.screenDirToGround(inp.padAim[0], inp.padAim[1]); if (Math.hypot(a[0], a[1]) > .2) c.aim = Math.atan2(a[1], a[0]); }
  c.attack = inp.pressed('attack'); c.attackHeld = inp.down('attack'); c.throw = inp.pressed('throw'); c.cycle = inp.pressed('cycle');
  c.dodge = inp.pressed('dodge'); c.sprint = inp.down('sprint'); c.interact = inp.pressed('interact');
  return c;
}
const nearestEnemy = (from, range = 9999) => { let best = null, bd = range; for (const e of W.enemies) { if (e.dead) continue; const d = dist(from, e); if (d < bd) { bd = d; best = e; } } return best; };
const autoAim = (h, a) => {   // a pad's aim snaps toward the nearest foe within a narrow cone (aim assist)
  if (I.aimSource === 'mouse' && h === W.hero) return a;
  let best = a, bd = .5;
  for (const e of W.enemies) { if (e.dead || dist(h, e) > 170) continue; const da = Math.abs(E.angDiff(a, angTo(h, e))); if (da < bd) { bd = da; best = angTo(h, e); } }
  return best;
};
function heroUpdate(h, dt) {
  const c = h.ctl;
  h.iT = Math.max(0, h.iT - dt); h.hurtT = Math.max(0, h.hurtT - dt); h.dodgeCd = Math.max(0, h.dodgeCd - dt); h.cool = Math.max(0, h.cool - dt); h.throwCd = Math.max(0, h.throwCd - dt);
  if (h.reload > 0) { h.reload -= dt; if (h.reload <= 0) { h.ammo = 8; A.sfx('tick', { pitch: .7 }); } }
  if (h.down) {
    h.vx = h.vy = 0; h.update(dt, W.map); h.downT -= dt;
    if (h.downT <= 0) { h.down = false; h.hp = h.maxHp * .5; h.iT = 1.5; P.glints(h.x, h.y, 20, 8, '#ffffff'); }
    h.rig.update(dt, { x: h.x, y: h.y, z: h.z, vx: 0, vy: 0, facing: h.facing, down: 1 });
    return;
  }
  const mv = Math.hypot(c.mx, c.my);
  if (c.dodge && h.dodgeCd <= 0) { h.dodgeT = .32; h.dodgeCd = .55; h.iT = Math.max(h.iT, .36); h.dodgeDir = mv > .2 ? Math.atan2(c.my, c.mx) : h.facing; A.sfx('whoosh'); P.dust(h.x, h.y, 0, 5); }
  let sp = c.sprint ? 128 : 82;
  if (h.combo.busy) sp *= .35;
  if (h.dodgeT > 0) { h.dodgeT -= dt; h.vx = Math.cos(h.dodgeDir) * 235; h.vy = Math.sin(h.dodgeDir) * 235; }
  else { h.vx = c.mx * sp; h.vy = c.my * sp; }
  if (h.noclip) { h.x += h.vx * dt; h.y += h.vy * dt; } else h.update(dt, W.map);
  if (c.aim !== null) h.aim = c.aim; else if (mv > .2) h.aim = Math.atan2(c.my, c.mx);
  h.aiming = Math.max(0, h.aiming - dt);
  if (h.aiming > 0 || c.aim !== null && (c.attackHeld || I.aimSource === 'mouse' && W.combat)) h.facing = h.aim;
  else if (mv > .2 && h.dodgeT <= 0) h.facing = Math.atan2(c.my, c.mx);
  // attack: shoot (with a gun) or a three-hit punch chain
  if (c.attack && h.dodgeT <= 0) {
    if (h.gun) {
      if (h.cool <= 0 && h.reload <= 0) {
        const a = autoAim(h, h.aim); h.facing = a; h.aiming = .6;
        const hx = h.x + Math.cos(a) * 10, hy = h.y + Math.sin(a) * 10;
        W.shots.fire({ x: hx, y: hy, z: 18, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, r: 2, team: 'player', dmg: h.who === 'hollis' ? 20 : 14, color: '#ffe080', life: .9 });
        A.sfx('gun'); P.sparks(hx, hy, 18, 3, a); h.cool = .26; h.ammo--; if (h.ammo <= 0) h.reload = 1.1;
        if (W.kind === 'town') heatAdd(.6);
      }
    } else if (h.combo.press()) { const a = autoAim(h, h.aim); h.facing = a; A.sfx('swing'); }
  }
  h.combo.update(dt);
  h.combo.hits(W.enemies.filter(e => !e.dead), e => E.inArc(h, h.facing, e, 24, 1.1), e => {
    hurtEnemy(e, h.combo.step === 2 ? 18 : 11, h.facing, h.combo.step === 2 ? 200 : 110);
  });
  // throw the selected flask in an arc to the aim point (the mouse), or ahead along the aim
  if (c.cycle) { if (S.flags.smoke) { S.sel = S.sel === 'fulm' ? 'smoke' : 'fulm'; A.sfx('select'); } else A.sfx('bump'); }
  if (c.throw && h.throwCd <= 0) {
    const k = S.sel;
    if (S.flasks[k] > 0 || W.demo) {
      let to = c.aimPt;
      const a = autoAim(h, h.aim);
      if (!to || dist(h, to) > 140) { const dd = to ? Math.min(140, dist(h, to)) : 80; const aa = to ? Math.atan2(to.y - h.y, to.x - h.x) : a; to = { x: h.x + Math.cos(aa) * dd, y: h.y + Math.sin(aa) * dd }; }
      throwFlask(h, to, k); h.throwCd = .5; h.facing = Math.atan2(to.y - h.y, to.x - h.x);
      if (!W.demo) S.flasks[k]--;
    } else { A.sfx('bump'); toast(k === 'fulm' ? 'Out of fulminate. Refill at the RV.' : 'Out of smoke flasks. Refill at the RV.'); }
  }
  h.rig.update(dt, { x: h.x, y: h.y, z: h.z, vx: h.vx, vy: h.vy, facing: h.facing, hurt: h.hurtT > 0, point: h.gun && h.aiming > 0, attack: h.combo.state,
    flip: h.dodgeT > 0 ? 1 - h.dodgeT / .32 : 0, sprint: c.sprint && mv > .2 });
}
function hurtHero(h, dmg, ang, push = 120) {
  if (!h || h.down || h.iT > 0) return false;
  if (W.demo && h === W.hero) dmg = 0;
  if (h.ai) return false;                                   // the AI partner shrugs it off (it can't be revived by a person)
  const k = DIFF().dmg * (h.who === 'hollis' && S.up.vest ? .66 : 1);
  h.hp -= dmg * k; h.iT = .45; h.hurtT = .25;
  E.knockback({ x: h.x - Math.cos(ang), y: h.y - Math.sin(ang) }, h, push);
  game.hitFx(h.x, h.y, 16, { power: .5, angle: ang, damage: Math.round(dmg * k), color: '#ff6a5a', sound: 'hurt' });
  if (h === W.hero) { game.flash('#ff3020', .06, .35); I.rumble(.5, .15); }
  if (h.hp <= 0) {
    h.hp = 0; h.down = true; h.downT = 8;
    if (h === W.hero) { log('dead', W.kind); W.dead = true; game.after(1.2, () => game.go('dead', { from: W.kind })); }
  }
  return true;
}

/* ---------------- flasks: fulminated mercury (a blast) and a purple smoke (a blind) ---------------- */
function throwFlask(h, to, kind) {
  const from = { x: h.x, y: h.y, z: 22 };
  const v = E.arc(from, { x: to.x, y: to.y, z: 0 }, 520, { apex: 22 });
  W.flasks.push({ x: from.x, y: from.y, z: from.z, vx: v.vx, vy: v.vy, vz: v.vz, kind, spin: 0, owner: h });
  A.sfx('whoosh', { pitch: 1.3 });
}
function flasksUpdate(dt) {
  for (const f of W.flasks) {
    f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt; f.vz -= 520 * dt; f.spin += dt * 14;
    const hitWall = W.map.heightAt(f.x, f.y) > f.z;
    if (f.z <= 0 || hitWall) { f.done = true; burst(f.x, f.y, f.kind); }
  }
  E.prune(W.flasks, f => f.done);
  for (const c of W.clouds) { c.t -= dt; if (game.time % .08 < dt) P.smoke(c.x + E.rand(-c.r, c.r) * .7, c.y + E.rand(-c.r, c.r) * .7, 4, 2, { size: 2.2, color: '#9a78c0' }); }
  E.prune(W.clouds, c => c.t <= 0);
}
function burst(x, y, kind) {
  A.sfx('glass');
  if (kind === 'fulm') {
    P.explosion(x, y, 2, 1.25); game.shake(4); A.sfx('boom'); I.rumble(.7, .25);
    for (const e of W.enemies) { if (e.dead) continue; const d = Math.hypot(e.x - x, e.y - y); if (d < 42) hurtEnemy(e, 60 * (1 - d / 70), Math.atan2(e.y - y, e.x - x), 260); }
    for (const a of W.agents) { const d = Math.hypot(a.x - x, a.y - y); if (d < 52) { a.stun = 3.5; a.sus.reset(); heatAdd(14); } }
    if (W.kind === 'town') heatAdd(5);
    log('blast', [Math.round(x), Math.round(y)]);
  } else {
    W.clouds.push({ x, y, r: 46, t: 6.5 }); A.sfx('hiss');
    P.smoke(x, y, 6, 16, { size: 3, color: '#a080d0' });
    log('smoke', [Math.round(x), Math.round(y)]);
  }
}
const inSmoke = o => W.clouds.some(c => Math.hypot(o.x - c.x, o.y - c.y) < c.r);

/* ---------------- enemies: Rafa's crew, the cousins, Mack ---------------- */
let enemyN = 0;
function makeEnemy(kind, x, y, o = {}) {
  const e = new E.Body({ x, y, r: kind === 'cousin' ? 7 : 5 });
  const hp = { thug: 40, gunner: 34, cousin: 230, mack: 300 }[kind];
  Object.assign(e, { kind, hp, maxHp: hp, facing: Math.PI / 2, t: E.rand(0, 1), cd: E.rand(.8, 1.6), state: 'idle', stun: 0, hurtT: 0, dead: false, deadT: 0, boss: kind === 'cousin' || kind === 'mack',
    team: 'enemy', windT: 0, atk: null, name: o.name || '', strafe: E.chance(.5) ? 1 : -1, n: enemyN++ });
  e.rig = kind === 'cousin' ? RIGS.cousin(o.i || 0) : kind === 'mack' ? RIGS.mack() : RIGS.thug(kind === 'gunner' ? 1 + (e.n % 2) * 2 : e.n % 3 === 1 ? 2 : 0);
  if (kind === 'thug') e.atk = new E.Attack('hook');
  if (kind === 'cousin') { e.atk = new E.Attack('overhead'); e.charge = 0; e.chargeDir = 0; }
  W.enemies.push(e);
  return e;
}
function hurtEnemy(e, dmg, ang, push = 140) {
  if (e.dead) return;
  const k = e.stun > 0 && e.kind === 'cousin' ? 1.6 : 1;
  e.hp -= dmg * k; e.hurtT = .2;
  if (!e.boss || e.stun <= 0) E.knockback({ x: e.x - Math.cos(ang), y: e.y - Math.sin(ang) }, e, e.boss ? push * .3 : push);
  game.hitFx(e.x, e.y, 18, { power: Math.min(1, dmg / 30), angle: ang, damage: Math.round(dmg * k) });
  if (!e.boss && e.state !== 'wind') e.cd = Math.max(e.cd, .35);
  if (e.hp <= 0) { e.dead = true; e.deadT = 0; S.kos++; A.sfx('die'); P.bits(e.x, e.y, 14, 8, ['#a02020', '#3a2a2a']); log('ko', e.kind); }
}
const targetHero = e => { let best = null, bd = 1e9; for (const h of W.heroes) { if (!h || h.down) continue; const d = dist(e, h); if (d < bd) { bd = d; best = h; } } return best; };
function enemyUpdate(e, dt) {
  e.hurtT = Math.max(0, e.hurtT - dt);
  if (e.dead) { e.deadT += dt; e.vx *= .9; e.vy *= .9; e.update(dt, W.map); e.rig.update(dt, { x: e.x, y: e.y, z: e.z, vx: 0, vy: 0, facing: e.facing, down: Math.min(1, e.deadT * 2) }); return; }
  const tgt = targetHero(e);
  e.cd -= dt; e.t += dt;
  const smoked = inSmoke(e);
  if (smoked && !e.boss) e.stun = Math.max(e.stun, .3);
  if (e.stun > 0) {
    e.stun -= dt; e.vx *= .85; e.vy *= .85; e.update(dt, W.map); e.state = 'stun';
    e.rig.update(dt, { x: e.x, y: e.y, z: e.z, vx: 0, vy: 0, facing: e.facing + Math.sin(e.t * 9) * .4, hurt: true, pose: 'kneel' });
    if (smoked && game.time % .5 < dt) P.text(e.x, e.y, 34, '*cough*', '#d8c8f0', { scale: 1 });
    return;
  }
  if (!tgt) { e.vx = e.vy = 0; e.update(dt, W.map); e.rig.update(dt, { x: e.x, y: e.y, z: e.z, vx: 0, vy: 0, facing: e.facing, pose: 'hips' }); return; }
  const d = dist(e, tgt), a = angTo(e, tgt);
  let mvx = 0, mvy = 0, sp = 0, point = false;
  if (e.kind === 'gunner' || e.kind === 'mack') {
    // keep a range, strafe, wind up (a red line), fire
    const want = e.kind === 'mack' ? 90 : 80;
    if (e.state === 'wind') {
      e.windT -= dt; e.facing = a; point = true;
      if (e.windT <= 0) {
        e.state = 'idle'; e.cd = e.kind === 'mack' ? E.rand(1.3, 1.8) : E.rand(1.5, 2.3);
        const hx = e.x + Math.cos(e.facing) * 10, hy = e.y + Math.sin(e.facing) * 10;
        if (e.kind === 'mack') { for (let i = -2; i <= 2; i++) { const aa = e.facing + i * .13; W.shots.fire({ x: hx, y: hy, z: 18, vx: Math.cos(aa) * 150, vy: Math.sin(aa) * 150, r: 2, team: 'enemy', dmg: 7, color: '#ff9050', life: .9 }); } A.sfx('shotgun'); game.shake(2); }
        else { W.shots.fire({ x: hx, y: hy, z: 18, vx: Math.cos(e.facing) * 125, vy: Math.sin(e.facing) * 125, r: 2, team: 'enemy', dmg: 9, color: '#ff6040', life: 1.6 }); A.sfx('gun', { pitch: .8 }); }
        P.sparks(hx, hy, 18, 3, e.facing);
      }
    } else {
      sp = 44; e.facing = a;
      if (d > want + 25) { mvx = Math.cos(a); mvy = Math.sin(a); }
      else if (d < want - 30) { mvx = -Math.cos(a); mvy = -Math.sin(a); }
      else { mvx = Math.cos(a + Math.PI / 2 * e.strafe) * .7; mvy = Math.sin(a + Math.PI / 2 * e.strafe) * .7; if (e.hitWall) e.strafe *= -1; }
      if (e.cd <= 0 && d < 190 && W.map.sight(e, tgt)) { e.state = 'wind'; e.windT = e.kind === 'mack' ? .55 : .5; A.sfx('charge', { vol: .4 }); }
      if (e.kind === 'mack' && !e.called && e.hp < e.maxHp * .5) { e.called = true; spawnAdds(2); W.say && W.say('mack_adds'); }
    }
  } else if (e.kind === 'thug') {
    if (e.atk.busy) { sp = 0; }
    else if (d > 15) { sp = 58; mvx = Math.cos(a); mvy = Math.sin(a); e.facing = a; }
    else if (e.cd <= 0) { e.atk.start(); e.cd = E.rand(1, 1.6); e.facing = a; }
    e.atk.update(dt);
    e.atk.hits([tgt], h => E.inArc(e, e.facing, h, 20, 1), h => hurtHero(h, 12, e.facing, 160));
  } else if (e.kind === 'cousin') {
    // stalk, an overhead chop with a long wind-up, or a charge along a telegraphed line; a charge into a wall stuns
    if (e.state === 'charge-wind') { e.windT -= dt; e.facing = e.chargeDir; if (e.windT <= 0) { e.state = 'charge'; e.charge = .7; A.sfx('whoosh', { pitch: .6 }); } }
    else if (e.state === 'charge') {
      e.charge -= dt; sp = 0;
      e.vx = Math.cos(e.chargeDir) * 250; e.vy = Math.sin(e.chargeDir) * 250; e.update(dt, W.map);
      if (game.time % .05 < dt) P.dust(e.x, e.y, 0, 2);
      for (const h of W.heroes) if (h && !h.down && dist(e, h) < 14) hurtHero(h, 22, e.chargeDir, 260);
      if (e.hitWall) { e.state = 'idle'; e.stun = 1.8; game.shake(5); A.sfx('stomp'); P.explosion(e.x, e.y, 14, .4, { debris: true, freeze: false, shake: 0 }); toastOnce('stun', 'Stunned! Hit them now for extra damage.'); }
      else if (e.charge <= 0) { e.state = 'idle'; e.cd = 1.2; }
      e.rig.update(dt, { x: e.x, y: e.y, z: e.z, vx: e.vx, vy: e.vy, facing: e.facing, sprint: true, stance: 'ready' });
      return;
    } else if (e.atk.busy) { sp = 0; }
    else {
      sp = 40; e.facing = a; mvx = Math.cos(a); mvy = Math.sin(a);
      const turn = W.enemies.filter(o => o.kind === 'cousin' && !o.dead);
      const myTurn = turn.length < 2 || (Math.floor(W.t / 4) % 2) === turn.indexOf(e);
      if (e.cd <= 0 && myTurn) {
        if (d < 26) { e.atk.start(); e.cd = E.rand(1.4, 2); A.sfx('charge', { pitch: .5 }); }
        else if (d > 60 && d < 200) { e.state = 'charge-wind'; e.windT = .8; e.chargeDir = a; e.cd = E.rand(2.5, 3.5); A.sfx('alarm', { pitch: .5 }); }
      }
      if (!myTurn && d < 70) { mvx = -mvx * .5; mvy = -mvy * .5; }
    }
    e.atk.update(dt);
    e.atk.hits([tgt], h => E.inArc(e, e.facing, h, 30, 1.2), h => { hurtHero(h, 24, e.facing, 240); game.shake(3); });
  }
  if (sp) { e.vx = mvx * sp; e.vy = mvy * sp; } else { e.vx *= .8; e.vy *= .8; }
  // keep apart from each other
  for (const o of W.enemies) if (o !== e && !o.dead) { const dd = dist(e, o); if (dd < 14 && dd > .01) { e.vx += (e.x - o.x) / dd * 30; e.vy += (e.y - o.y) / dd * 30; } }
  e.update(dt, W.map);
  e.rig.update(dt, { x: e.x, y: e.y, z: e.z, vx: e.vx, vy: e.vy, facing: e.facing, hurt: e.hurtT > 0, point, attack: e.atk ? e.atk.state : null, stance: e.kind === 'thug' ? 'guard' : e.kind === 'cousin' ? 'ready' : undefined });
}
function spawnAdds(n) {
  const at = W.kind === 'lab' ? [[C(4), C(6)], [C(27), C(6)], [C(4), C(16)], [C(27), C(16)]] : [[W.hero.x - 120, W.hero.y - 60], [W.hero.x + 120, W.hero.y + 60]];
  for (let i = 0; i < n; i++) { const p = at[i % at.length]; makeEnemy(i % 2 ? 'gunner' : 'thug', p[0], p[1]); P.smoke(p[0], p[1], 6, 6); }
}

/* ---------------- the DEA: agents on their beats, with sight and suspicion ---------------- */
function makeAgent(beat, start, i) {
  const p = BEATS[beat].at(start);
  const a = new E.Body({ x: p.x, y: p.y, r: 5 });
  Object.assign(a, { kind: 'agent', beat, d: start, sp: 30, facing: p.angle, sus: new E.Suspicion({ rise: 1.2, decay: .25 }), stun: 0, look: 0, state: 'calm', rig: RIGS.agent(i), i, ret: false });
  W.agents.push(a);
  return a;
}
const suspicious = () => S.product > 0 || S.heat >= 60 || W.combat;
function agentUpdate(a, dt) {
  const h = W.hero;
  if (a.stun > 0) {
    a.stun -= dt; a.vx = a.vy = 0; a.update(dt, W.map);
    a.rig.update(dt, { x: a.x, y: a.y, z: a.z, vx: 0, vy: 0, facing: a.facing + Math.sin(game.time * 8) * .5, hurt: true, pose: 'kneel' });
    return;
  }
  const night = S.clock >= 20 || S.clock < 6;
  const range = (night ? 85 : 115) * (S.heat >= 100 ? 1.3 : 1);
  let seen = false;
  if (h && !h.down && !inSmoke(h) && !inSmoke(a) && suspicious() && !W.demo) {
    const s = E.sees(a, h, { map: W.map, range, fov: 1.35 });
    if (s.seen) seen = { ...s, exposure: s.exposure * DIFF().sus * (S.heat >= 60 ? 1.4 : 1) };
  }
  const st = a.sus.update(dt, seen, h);
  if (a.sus.changed) {
    if (st === 'notice') { A.sfx('blip', { pitch: .8 }); }
    if (st === 'alert') { A.sfx('siren'); music('town'); A.layer && A.layer('tension', 1, .3); toastOnce('dea', 'DEA! Break line of sight, sprint, or blind them with smoke.'); log('alert', a.i); }
    if (st === 'calm') { a.ret = true; }
  }
  a.state = st;
  let tx = null, ty = null, sp = 30;
  if (st === 'alert' && h) { tx = h.x; ty = h.y; sp = 96; }
  else if (st === 'search' && a.sus.last) { tx = a.sus.last.x; ty = a.sus.last.y; sp = 50; }
  else if (st === 'notice' && h) { a.facing = E.approachAng ? E.approachAng(a.facing, angTo(a, h), dt * 4) : angTo(a, h); a.vx = a.vy = 0; }
  else {
    // walk the beat; at each corner, look around
    const path = BEATS[a.beat];
    if (a.ret) { const n = path.nearest(a.x, a.y); a.d = n.d !== undefined ? n.d : a.d; a.ret = false; }
    if (a.look > 0) { a.look -= dt; a.facing += Math.sin(a.look * 3) * dt * 1.6; a.vx = a.vy = 0; }
    else {
      a.d = (a.d + sp * dt) % path.length;
      const p = path.at(a.d), p2 = path.at((a.d + 6) % path.length);
      tx = p.x; ty = p.y;
      const turn = Math.abs(E.angDiff(a.facing, Math.atan2(p2.y - p.y, p2.x - p.x)));
      if (turn > 1.2 && E.chance(.5)) a.look = 1.4;
    }
  }
  if (tx !== null) {
    const dx = tx - a.x, dy = ty - a.y, dd = Math.hypot(dx, dy);
    if (dd > 2) { a.vx = dx / dd * sp; a.vy = dy / dd * sp; a.facing = Math.atan2(dy, dx); } else { a.vx = a.vy = 0; }
  }
  a.update(dt, W.map);
  if (st === 'alert' && h && dist(a, h) < 11 && !h.down) {
    log('busted', a.i);
    if (W.kind === 'hub') { S.product = 0; S.busts++; h.x = SPOT.rv.x + 20; h.y = SPOT.rv.y + 10; for (const o of W.agents) { o.sus.reset(); o.ret = true; } A.sfx('siren'); toast('BUSTED. Product seized. Back to the RV.'); }
    else { W.busted = true; game.go('busted', {}); }
  }
  a.rig.update(dt, { x: a.x, y: a.y, z: a.z, vx: a.vx, vy: a.vy, facing: a.facing, sprint: st === 'alert', point: false });
}
function syncAgents() {
  if (W.kind !== 'town' || S.ep < 2) { W.agents.length = 0; return; }
  const want = Math.min(5, 2 + (S.heat >= 40 ? 1 : 0) + (S.heat >= 75 ? 1 : 0) + (S.ep >= 4 ? 1 : 0));
  while (W.agents.length < want) { const n = W.agents.length; makeAgent(n % BEATS.length, (n * 157) % BEATS[n % BEATS.length].length, n); }
  while (W.agents.length > want) { const a = W.agents[W.agents.length - 1]; if (a.state !== 'calm') break; W.agents.pop(); }
}
function heatAdd(n) { if (W && W.demo) return; S.heat = clamp(S.heat + n, 0, 100); }

/* ---------------- drawing a body: shadow, the rig, a flash when hurt ---------------- */
function drawBody(r, b, o = {}) {
  r.shadow(b.x, b.y, o.shadow || 7, .35, undefined, b.groundZ || 0);
  r.actor(b.x, b.y, b.z, (g, ox, oy) => b.rig.draw(g, ox, oy, r.view), { flash: b.hurtT > 0 ? '#ffffff' : undefined, xray: o.xray, alpha: o.alpha, every: o.every, key: o.every ? b : undefined });
}
