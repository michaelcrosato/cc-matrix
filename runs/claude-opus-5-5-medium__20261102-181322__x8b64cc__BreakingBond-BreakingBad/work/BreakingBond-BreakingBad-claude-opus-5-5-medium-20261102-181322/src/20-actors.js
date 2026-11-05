/* =====================================================================================
 * 20 ACTORS — the cast, the player characters (a hero and a partner a second player can take over), enemies that
 * telegraph, guards with eyes and suspicion, thrown chemistry, gas clouds, pickups. Everything is an E.Body with the
 * fields its role needs; every character is an E.Humanoid posed from its motion each step.
 * ===================================================================================== */
const CAST = {
  GRAY: { name: 'MR. GRAY', rig: { size: 1.25, build: 'heroic', weapon: null, outfit: 'shirt', hair: 'bald', sleeves: 'short', colors: { skin: '#e2b896', cloth: '#cfc6a0', pants: '#6a5c48', boot: '#3a2c22', belt: '#2a2018', hair: '#6a5a4a' } } },
  DANNY: { name: 'DANNY', rig: { size: 1.18, weapon: null, outfit: 'coat', sleeves: 'long', hair: 'short', hat: { style: 'cap', color: '#26262a' }, colors: { skin: '#e8c4a4', cloth: '#d8a828', coat: '#d8a828', pants: '#3a4a6a', boot: '#e8e8e8', hair: '#3a2a20' } } },
  MARTY: { name: 'MARTY', rig: { size: 1.3, build: 'bulky', weapon: null, outfit: 'shirt', hair: 'short', sleeves: 'short', colors: { skin: '#e0b494', cloth: '#5a7a9a', pants: '#4a4440', hair: '#4a3a2a' } } },
  TITO: { name: 'TWO-TONE TITO', rig: { size: 1.3, build: 'bulky', weapon: null, outfit: 'shirt', hair: 'short', sleeves: 'none', colors: { skin: '#c8946a', cloth: '#f2f2f2', pants: '#2a2a3a', hair: '#1a1a1a', trim: '#e8c040' } } },
  BARRY: { name: 'BARRY FLEISCHMAN', rig: { size: 1.2, outfit: 'coat', weapon: null, hair: 'short', sleeves: 'long', colors: { skin: '#e8c0a0', cloth: '#e8e0a0', coat: '#b8862a', pants: '#8a6a2a', hair: '#7a5a3a' } } },
  CAROL: { name: 'CAROL', rig: { size: 1.18, outfit: 'robe', weapon: null, hair: 'long', colors: { skin: '#ecc8aa', cloth: '#5a7ab0', hair: '#a8683a' } } },
  DOCTOR: { name: 'DR. OKAFOR', rig: { size: 1.2, outfit: 'coat', weapon: null, hair: 'short', sleeves: 'long', colors: { skin: '#7a4a32', cloth: '#d8e0e8', coat: '#f0f0f0', pants: '#3a3a4a', hair: '#1a1a1a' } } },
  KYLE: { name: 'KYLE', rig: { size: 1.12, weapon: null, outfit: 'shirt', hair: 'spiky', colors: { cloth: '#c83a3a', pants: '#3a3a5a', hair: '#e0b050' } } },
  BRIANNA: { name: 'BRIANNA', rig: { size: 1.12, weapon: null, outfit: 'shirt', hair: 'ponytail', colors: { skin: '#8a5a3a', cloth: '#7a3ab0', pants: '#2a2a3a', hair: '#1a1210' } } },
  MARCUS: { name: 'MARCUS', rig: { size: 1.14, weapon: null, outfit: 'coat', hair: 'short', colors: { skin: '#b07a52', cloth: '#3a8a5a', coat: '#3a8a5a', pants: '#2a2a2a', hair: '#1a1a1a' } } },
  HUGO: { name: 'HUGO', rig: { size: 1.22, build: 'bulky', weapon: null, outfit: 'coat', hat: { style: 'cap', color: '#3a4a5a' }, colors: { skin: '#b4805a', cloth: '#4a5a6a', coat: '#4a5a6a', pants: '#3a4a5a', hair: '#2a2a2a' } } },
  GUARD: { name: 'SECURITY', rig: { size: 1.22, build: 'heroic', weapon: null, outfit: 'shirt', hat: { style: 'cap', color: '#1a2a4a' }, colors: { cloth: '#3a4a7a', pants: '#1a1a2a' } } },
  AGENT: { name: 'AGENT', rig: { size: 1.22, build: 'heroic', weapon: 'gun', outfit: 'coat', hair: 'short', colors: { cloth: '#e8e8e8', coat: '#1e2430', pants: '#1a1a1e', metal: '#3a3a3a', hair: '#3a2a20' } } },
  THUG: { name: 'THUG', rig: { size: 1.22, build: 'bulky', weapon: 'staff', outfit: 'shirt', sleeves: 'none', hair: 'short', colors: { cloth: '#d8d8d8', pants: '#2a3a5a', metal: '#8a6a4a', hair: '#1a1a1a' } } },
  GUNMAN: { name: 'GUNMAN', rig: { size: 1.2, build: 'heroic', weapon: 'gun', outfit: 'shirt', sleeves: 'short', hat: { style: 'band', color: '#c83a3a' }, colors: { cloth: '#2a2a2a', pants: '#3a3020', metal: '#2a2a2a' } } },
  AURELIO: { name: 'DON AURELIO', rig: { size: 1.22, outfit: 'shirt', weapon: null, hair: 'short', sleeves: 'long', colors: { skin: '#a8805a', cloth: '#e8dcb8', pants: '#2a2a30', hair: '#3a3a3a' } } },
  BUYER: { name: 'CUSTOMER', rig: { size: 1.15, weapon: null, outfit: 'coat', hood: true, colors: { cloth: '#6a5a4a', coat: '#4a4a3a', pants: '#2a2a2a', hair: '#3a3a3a' } } }
};
const rigCache = {};
function makeRig(who, extra) {
  const c = CAST[who] || CAST.THUG;
  const o = JSON.parse(JSON.stringify(c.rig));
  if (extra) { Object.assign(o, extra); if (extra.colors) o.colors = Object.assign({}, c.rig.colors, extra.colors); }
  return new E.Humanoid(o);
}
// a portrait rig per speaker for the dialog box (a live close-up)
function portraitOf(who) { if (!CAST[who]) return null; return rigCache[who] || (rigCache[who] = makeRig(who)); }

/* ---- The world state of the mission being played (W). Missions and scenes fill it ---- */
let W = null;
function newWorld(locId, o = {}) {
  const loc = buildLocation(locId);
  W = { loc, map: loc.map, locId, night: !!o.night, hero: null, partner: null, npcs: [], enemies: [], guards: [], flasks: [], clouds: [], pickups: [], acts: [],
    shots: new E.Bullets(game, { plane: 'ground', sparks: true }), flow: new E.FlowField(loc.map), focus: null, objective: null, marker: null,
    heat: 0, heatOn: !!o.heat, caught: false, combat: !!o.combat, stealth: !!o.stealth, flaskKinds: o.flasks || [], flaskSel: 0, time: 0, kills: 0, noise: [],
    attract: !!o.attract, ghosts: {}, toasts: [], banner: null, bannerT: 0, fail: null, slow: 0 };
  return W;
}

/* ---- Player characters ---- */
function makePlayer(who, x, y, o = {}) {
  const b = new E.Body({ x, y, r: 5 });
  return Object.assign(b, { who, rig: makeRig(who), hp: o.hp || 6, maxHp: o.hp || 6, facing: o.facing === undefined ? Math.PI / 2 : o.facing, moveFacing: Math.PI / 2, team: 'player',
    cool: 0, rollT: 0, rollDir: 0, hurtT: 0, inv: 0, dead: false, downT: 0, sneak: false, sprint: false, crouch: false, catalyst: 0, meter: 0, hidden: null, aimAt: null,
    melee: new E.Attack(who === 'DANNY' ? 'haymaker' : 'jab', { reach: 10 }), autoWalk: null, player: o.player || null, ai: !!o.ai, ammo: o.ammo || { fulminate: 6, phosphine: 4, chalk: 99 } });
}
const players = () => [W.hero, W.partner].filter(a => a && !a.dead);
const inputOf = a => a === W.hero ? game.input : (a.player || null);

function aimFor(a, I) {
  if (I === game.input && I.aimSource === 'mouse') { const g = game.mouseGround(); if (g) return { x: g[0] !== undefined ? g[0] : g.x, y: g[1] !== undefined ? g[1] : g.y, manual: true }; }
  if (I.aimWorld) return { x: I.aimWorld.x, y: I.aimWorld.y, manual: true };
  if (I.padAim) { const d = game.view.screenDirToGround(I.padAim[0], I.padAim[1]); return { x: a.x + d[0] * 90, y: a.y + d[1] * 90, manual: true }; }
  if (game.settings.assist && W.enemies.length) {
    const t = E.targets(a, W.enemies.filter(e => !e.dead), { range: 140, arc: 1.2, facing: a.facing });
    if (t.length) return { x: t[0].target.x, y: t[0].target.y, manual: false, lock: t[0].target };
  }
  return { x: a.x + Math.cos(a.facing) * 70, y: a.y + Math.sin(a.facing) * 70, manual: false };
}

function controlPlayer(a, I, dt) {
  if (a.dead) return;
  a.cool -= dt; a.rollT -= dt; a.hurtT -= dt; a.inv -= dt;
  if (a.catalyst > 0) { a.catalyst -= dt; if (a.catalyst <= 0) { game.note('CATALYST SPENT'); } }
  if (a.hidden) { a.vx = a.vy = 0; if (I.pressed('interact') || I.pressed('dodge')) unhide(a); a.update(dt, W.map); return; }
  let m = I.move(), d = game.view.screenDirToGround(m[0], m[1]);
  if (a.autoWalk) {   // a click on something in the world walks there, then uses it
    const t = a.autoWalk, dx = t.x - a.x, dy = t.y - a.y, l = Math.hypot(dx, dy);
    if (Math.hypot(m[0], m[1]) > .2 || !t.active) a.autoWalk = null;
    else if (l < (t.r || 18)) { a.autoWalk = null; useAct(t, a); }
    else { const f = W.flow; f.update(t.x, t.y); const dir = f.dir(a.x, a.y, t.x, t.y); d = dir; }
  }
  const len = Math.hypot(d[0], d[1]);
  a.sneak = I.down('sneak'); a.crouch = a.sneak; a.sprint = I.down('sprint') && !a.sneak && len > .2;
  if (a.rollT > 0) { a.vx = Math.cos(a.rollDir) * 210; a.vy = Math.sin(a.rollDir) * 210; }
  else {
    const sp = (a.sneak ? 38 : a.sprint ? 122 : 78) * (a.catalyst > 0 ? 1.15 : 1) * (a.melee.busy ? .35 : 1);
    a.vx = d[0] * sp; a.vy = d[1] * sp;
    if (len > .1) a.moveFacing = Math.atan2(d[1], d[0]);
    if (I.pressed('dodge') && a.cool <= 0) { a.rollT = .3; a.inv = .32; a.cool = .55; a.rollDir = len > .1 ? a.moveFacing : a.facing; A.sfx('whoosh'); P.dust(a.x, a.y, 0, 6); }
  }
  const aim = aimFor(a, I); a.aimAt = aim;
  a.facing = aim.manual ? Math.atan2(aim.y - a.y, aim.x - a.x) : (len > .1 ? a.moveFacing : a.facing);
  // noise: sprinting is loud, walking soft, sneaking silent
  if (a.sprint && len > .3 && Math.floor(W.time * 4) !== Math.floor((W.time - dt) * 4)) makeNoise(a.x, a.y, 70);
  // focus and interaction: the nearest thing to use, or the one under the mouse
  if (a === W.hero) {
    const f = W.focus;
    const mouseClick = I.lastDevice === 'mouse' && f && f.hovered && I.pressed('throw');
    if (f && (I.pressed('interact') || mouseClick)) {
      if (dist2(a, f) <= (f.r || 18) + 6) useAct(f, a); else a.autoWalk = f;
      I.consume('throw'); return finishMove(a, dt);
    }
    if (mouseClick) return finishMove(a, dt);
  }
  if (I.pressed('swap') && W.flaskKinds.length > 1) { W.flaskSel = (W.flaskSel + 1) % W.flaskKinds.length; A.sfx('select'); game.note(FLASKS[W.flaskKinds[W.flaskSel]].name.toUpperCase()); }
  if (I.pressed('throw') && W.flaskKinds.length && a.cool <= 0 && a.rollT <= 0) {
    const kind = W.flaskKinds[W.flaskSel];
    if (a.ammo[kind] > 0 || a.catalyst > 0 || W.attract) { if (!(a.catalyst > 0 || W.attract) && kind !== 'chalk') a.ammo[kind]--; throwFlask(a, kind, aim.x, aim.y); a.cool = .42; }
    else { A.sfx('cancel'); game.note('OUT OF ' + FLASKS[kind].name.toUpperCase()); }
  }
  if (I.pressed('melee') && W.combat && !a.melee.busy && a.rollT <= 0) { if (a.melee.start()) A.sfx('swing'); }
  if (I.pressed('catalyst') && W.combat && a === W.hero && a.meter >= 1 && a.catalyst <= 0) catalystOn(a);
  finishMove(a, dt);
}
function finishMove(a, dt) {
  a.melee.update(dt);
  if (a.melee.busy) a.melee.hits(W.enemies.filter(e => !e.dead), e => E.inArc(a, a.facing, e, 22, 1.3, 12), e => {
    const dmg = (a.who === 'DANNY' ? (a.player ? 2 : 1) : 1) * (a.catalyst > 0 ? 2 : 1);
    hurtEnemy(e, dmg, a.facing, a); E.knockback(a, e, a.who === 'DANNY' ? 190 : 140); e.stun = Math.max(e.stun, a.player || a === W.hero ? .45 : .2);
  });
  a.update(dt, W.map);
}
function catalystOn(a) {
  a.catalyst = 9; a.meter = 0; W.slow = 1.2; game.flash('#59c8f0', .25, .6); game.shake(4); A.sfx('powerup'); A.sfx('charge');
  for (const e of W.enemies) if (!e.dead && dist2(e, a) < 130 && e.kind !== 'boss') { e.fear = 3.5; e.stun = .6; }
  W.banner = { text: E.pick(['RESPECT THE CHEMISTRY.', 'I AM THE CATALYST.', 'CHEMISTRY. IS. CHANGE.']), sub: 'The hat goes on.' }; W.bannerT = 2.2;
  bark('GRAY', E.pick(['Step back.', 'You know who I am now.', 'Class is in session.']));
}
function hurtPlayer(a, dmg, angle, src) {
  if (a.dead || a.inv > 0 || W.attract) return;
  dmg *= DIFF().dmg; a.hp -= dmg; a.hurtT = .35; a.inv = .7;
  game.hitFx(a.x, a.y, a.z + 18, { power: 1, angle: angle || 0, damage: Math.ceil(dmg), sound: 'hurt' }); game.input.rumble(.6, .2);
  if (a.hp <= 0) { a.hp = 0; a.dead = true; a.downT = 0; A.sfx('die'); if (a === W.hero || (!W.hero || W.hero.dead)) failMission(a === W.hero ? 'down' : 'down'); }
}
function hide(a, spot) { a.hidden = spot; a.x = spot.x; a.y = spot.y + 2; A.sfx('door'); W.toasts.push(['Hidden', 'Nobody can see you in here. ' + label('interact') + ' to climb out.']); }
function unhide(a) { const s = a.hidden; a.hidden = null; a.y = s.y + 16; A.sfx('door'); }

/* ---- Partner AI: follows, fights, keeps out of trouble. A second player takes it over ---- */
function controlPartner(a, dt) {
  if (a.dead) return;
  const I = a.player;
  if (I) return controlPlayer(a, I, dt);
  a.cool -= dt; a.hurtT -= dt; a.inv -= dt;
  const h = W.hero; let tx = h.x - Math.cos(h.facing) * 22, ty = h.y - Math.sin(h.facing) * 22, speed = 82;
  const foes = W.enemies.filter(e => !e.dead && dist2(e, a) < 120);
  if (W.combat && foes.length) {
    foes.sort((p, q) => dist2(p, a) - dist2(q, a)); const e = foes[0];
    if (a.hp > 1.5) { tx = e.x; ty = e.y; speed = 92; if (dist2(e, a) < 20) { a.facing = Math.atan2(e.y - a.y, e.x - a.x); if (!a.melee.busy && a.cool <= 0) { a.melee.start(); a.cool = 1.6; A.sfx('swing', { vol: .6 }); } } }
    else { tx = a.x - (e.x - a.x); ty = a.y - (e.y - a.y); }
  }
  const dx = tx - a.x, dy = ty - a.y, l = Math.hypot(dx, dy);
  if (l > 10) { W.flow.update(tx, ty); const d = W.flow.dir(a.x, a.y, tx, ty); const k = Math.min(1, l / 30); a.vx = d[0] * speed * k; a.vy = d[1] * speed * k; if (!a.melee.busy) a.facing = Math.atan2(a.vy, a.vx); }
  else { a.vx = a.vy = 0; }
  if (dist2(a, h) > 220) { a.x = h.x - 10; a.y = h.y + 6; }   // never lost
  finishMove(a, dt);
}

/* ---- Enemies: thugs (bats, telegraphed overheads), gunmen (aim, then fire), the boss ---- */
function makeEnemy(kind, x, y, o = {}) {
  const b = new E.Body({ x, y, r: kind === 'boss' ? 8 : 5 });
  const hp = Math.round(({ thug: 4, gunman: 3, boss: 34 })[kind] * DIFF().hp);
  return Object.assign(b, { kind, who: kind === 'boss' ? 'TITO' : kind === 'gunman' ? 'GUNMAN' : 'THUG', rig: kind === 'boss' ? makeRig('TITO', { size: 1.7, weapon: 'staff', colors: { metal: '#9a9aa8' } }) : makeRig(kind === 'gunman' ? 'GUNMAN' : 'THUG', { colors: o.colors || { cloth: E.pick(['#d8d8d8', '#2a5a8a', '#8a2a2a', '#3a3a3a']) } }),
    hp, maxHp: hp, facing: Math.PI / 2, team: 'enemy', stun: 0, fear: 0, gas: 0, hurtT: 0, dead: false, downT: 0, aimT: 0, cool: 1 + Math.random(), strafe: Math.random() < .5 ? 1 : -1,
    atk: new E.Attack(kind === 'boss' ? 'overhead' : 'overhead', kind === 'boss' ? { wind: .7, recover: .5, reach: 18 } : { wind: .5, recover: .35, reach: 11 }), phase: 1, slam: 0, name: o.name || null });
}
function hurtEnemy(e, dmg, angle, by) {
  if (e.dead) return;
  e.hp -= dmg; e.hurtT = .25;
  game.hitFx(e.x, e.y, e.z + 18, { power: dmg > 2 ? 1.6 : 1, angle: angle || 0, damage: Math.round(dmg * 10) / 10 });
  if (W.hero) W.hero.meter = Math.min(1, W.hero.meter + .07 * dmg);
  if (e.hp <= 0) { e.dead = true; e.downT = 0; W.kills++; A.sfx('die', { vol: .5 }); if (Math.random() < .5) dropPickup(e.x, e.y); if (e.kind === 'boss') bossDown(e); }
  else if (e.kind !== 'boss') e.atk.cancel();
}
function nearestPlayer(e) { let best = null, bd = 1e9; for (const p of players()) { if (p.hidden) continue; const d = dist2(p, e); if (d < bd) { bd = d; best = p; } } return best; }
function updateEnemy(e, dt) {
  if (e.dead) { e.downT += dt; return; }
  e.hurtT -= dt; e.cool -= dt;
  if (e.gas > 0) { e.gas -= dt; if (Math.floor(e.gas * 2) !== Math.floor((e.gas + dt) * 2)) { hurtEnemy(e, .5, 0); A.sfx('cough', { vol: .4 }); e.stun = Math.max(e.stun, .3); } }
  if (e.stun > 0) { e.stun -= dt; e.vx *= .9; e.vy *= .9; e.update(dt, W.map); return; }
  const t = nearestPlayer(e);
  if (!t) { e.vx = e.vy = 0; e.update(dt, W.map); return; }
  const dx = t.x - e.x, dy = t.y - e.y, d = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
  if (e.fear > 0) { e.fear -= dt; e.vx = -dx / d * 70; e.vy = -dy / d * 70; e.facing = ang; e.update(dt, W.map); return; }
  const go = (spd, tx = t.x, ty = t.y) => { W.flow.update(t.x, t.y); const dir = (tx === t.x && ty === t.y) ? W.flow.dir(e.x, e.y, tx, ty) : [(tx - e.x) / (Math.hypot(tx - e.x, ty - e.y) || 1), (ty - e.y) / (Math.hypot(tx - e.x, ty - e.y) || 1)]; e.vx = dir[0] * spd; e.vy = dir[1] * spd; };
  const began = e.atk.update(dt);
  if (e.kind === 'thug' || e.kind === 'boss') {
    if (e.atk.busy) { e.vx *= .8; e.vy *= .8; if (began === 'active') strike(e, t); }
    else if (e.kind === 'boss' && bossThink(e, t, d, dt)) { /* the boss's own patterns */ }
    else if (d > (e.kind === 'boss' ? 26 : 17)) { go(e.kind === 'boss' ? 46 : 54); e.facing = Math.atan2(e.vy, e.vx); }
    else { e.vx = e.vy = 0; e.facing = ang; if (e.cool <= 0) { e.atk.start(); e.cool = e.kind === 'boss' ? 1.1 : 1.3; A.sfx('swing', { vol: .5, pitch: .8 }); } }
  } else if (e.kind === 'gunman') {
    const sight = W.map.sight ? W.map.sight(e, t) : true;
    e.facing = ang;
    if (d < 60) go(48, e.x - dx, e.y - dy);
    else if (d > 120 || !sight) go(50);
    else { const sx = -dy / d, sy = dx / d; e.vx = sx * 30 * e.strafe; e.vy = sy * 30 * e.strafe; if (Math.random() < dt * .4) e.strafe *= -1; }
    if (sight && d < 150) { e.aimT += dt; if (e.aimT > .95) { e.aimT = 0; e.cool = 1.4; fireAt(e, t); } } else e.aimT = Math.max(0, e.aimT - dt);
  }
  e.update(dt, W.map);
}
function strike(e, t) {
  const reach = e.kind === 'boss' ? 30 : 22;
  for (const p of players()) if (E.inArc(e, e.facing, p, reach, 1.2, 14)) { hurtPlayer(p, e.kind === 'boss' ? 2 : 1, e.facing, e); E.knockback(e, p, e.kind === 'boss' ? 220 : 150); }
  if (e.kind === 'boss') { game.shake(5); P.dust(e.x + Math.cos(e.facing) * 20, e.y + Math.sin(e.facing) * 20, 0, 10); A.sfx('boom', { vol: .5 }); }
}
function fireAt(e, t) {
  const h = e.rig.hand ? e.rig.hand() : { x: e.x, y: e.y, z: 18 }, a = Math.atan2(t.y - e.y, t.x - e.x) + (Math.random() - .5) * .12, sp = 150;
  W.shots.fire({ x: h.x, y: h.y, z: 18, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 0, r: 2, team: 'enemy', color: '#ffd060', life: 1.8, dmg: 1 });
  A.sfx('gunshot'); P.sparks(h.x, h.y, 18, 4, a);
}
// the boss: Two-Tone Tito with a sledgehammer. Phase 1 swings and charges; phase 2 (half health) slams shockwaves and
// calls cousins in. Every attack winds up visibly
function bossThink(e, t, d, dt) {
  if (e.charge > 0) { e.charge -= dt; e.vx = Math.cos(e.facing) * 170; e.vy = Math.sin(e.facing) * 170; for (const p of players()) if (dist2(p, e) < 18) { hurtPlayer(p, 2, e.facing, e); E.knockback(e, p, 260); } if (e.hitWall) { e.charge = 0; e.stun = 1.4; game.shake(6); A.sfx('bump'); P.dust(e.x, e.y, 0, 12); W.banner = { text: 'HE HIT THE WALL', sub: 'Now. Throw everything.' }; W.bannerT = 1.4; } return true; }
  if (e.chargeWind > 0) { e.chargeWind -= dt; e.vx = e.vy = 0; if (e.chargeWind <= 0) { e.charge = .9; A.sfx('whoosh'); } return true; }
  if (e.slamWind > 0) { e.slamWind -= dt; e.vx = e.vy = 0; if (e.slamWind <= 0) { W.clouds.push({ x: e.x, y: e.y, r: 4, grow: 140, t: .7, kind: 'shock' }); game.shake(7); A.sfx('explode', { vol: .6 }); P.dust(e.x, e.y, 0, 20); } return true; }
  e.think = (e.think || 2) - dt;
  if (e.think <= 0) {
    e.think = e.phase === 2 ? 2.4 : 3.2;
    if (d > 50 && Math.random() < .6) { e.chargeWind = .75; e.facing = Math.atan2(t.y - e.y, t.x - e.x); bark('TITO', E.pick(['TIGHT! TIGHT! TIGHT!', 'Come here, teacher!', 'I\'m gonna crush you!'])); return true; }
    if (e.phase === 2) { e.slamWind = .8; bark('TITO', E.pick(['GROUND POUND, ese!', 'Feel that?'])); return true; }
  }
  return false;
}

/* ---- Guards: patrols with eyes (E.sees through the map's heights), a mind (E.Suspicion), ears ---- */
function makeGuard(kind, route, o = {}) {
  const [x, y] = route[0];
  const b = new E.Body({ x: x * R16, y: y * R16, r: kind === 'cruiser' ? 9 : 5 });
  const who = kind === 'janitor' ? 'HUGO' : kind === 'agent' ? 'AGENT' : kind === 'cruiser' ? 'AGENT' : 'GUARD';
  return Object.assign(b, { kind, who, rig: kind === 'cruiser' ? null : makeRig(who), route: route.map(p => [p[0] * R16, p[1] * R16, p[2] || 0]), at: 1, wait: 0, facing: o.facing || 0,
    mind: new E.Suspicion({ rise: 1.5 * DIFF().sight, decay: .28, forget: 6 }), range: kind === 'cruiser' ? 150 : 108, fov: kind === 'cruiser' ? .9 : 1.45, speed: kind === 'cruiser' ? 46 : 30, bark: 0, look: 0 });
}
function updateGuard(g, dt) {
  const h = W.hero;
  let seen = { seen: false, exposure: 0 };
  if (h && !h.dead && !h.hidden && !W.attract && !talk.open && !M.cut && !M.cookObj) {
    seen = E.sees(g, Object.assign(h, { exposure: h.sneak ? .55 : 1 }), { map: W.map, range: g.range, fov: g.fov });
  }
  for (const n of W.noise) { const v = E.hears(g, n, W.map); if (v > .1) g.mind.hear(v, n); }
  const st = g.mind.update(dt, seen, h);
  if (g.mind.changed) { if (st === 'alert') { A.sfx('alarm'); g.bark = 1.4; bark(g.who, E.pick(g.kind === 'janitor' ? ['Hey! Who\'s there?', '¡Oye! Stop!'] : g.kind === 'agent' || g.kind === 'cruiser' ? ['DEA! Hold it right there!', 'Freeze!'] : ['Security! Don\'t move!'])); } else if (st === 'notice') { A.sfx('blip'); g.bark = 1; } }
  let goal = null, spd = g.speed;
  if (st === 'alert' && h) { goal = h; spd = g.speed * 2.3; }
  else if (st === 'search' && g.mind.last) { goal = g.mind.last; spd = g.speed * 1.4; }
  else if (st === 'notice' && g.mind.last) { g.vx = g.vy = 0; g.facing = E.approachAng(g.facing, Math.atan2(g.mind.last.y - g.y, g.mind.last.x - g.x), dt * 3); g.update(dt, W.map); return st; }
  else {
    const p = g.route[g.at];
    goal = { x: p[0], y: p[1] };
    if (Math.hypot(p[0] - g.x, p[1] - g.y) < 6) { g.at = (g.at + 1) % g.route.length; g.wait = p[2] || .9; g.look = (Math.random() - .5) * 1.6; }
  }
  if (g.wait > 0 && st === 'calm') { g.wait -= dt; g.vx = g.vy = 0; g.facing = E.approachAng(g.facing, g.facing + g.look * dt, 1); g.update(dt, W.map); return st; }
  if (goal) {
    const dx = goal.x - g.x, dy = goal.y - g.y, l = Math.hypot(dx, dy);
    if (l > 4) { W.flow.update(goal.x, goal.y); const dir = st === 'calm' ? [dx / l, dy / l] : W.flow.dir(g.x, g.y, goal.x, goal.y); g.vx = dir[0] * spd; g.vy = dir[1] * spd; g.facing = E.approachAng(g.facing, Math.atan2(dir[1], dir[0]), dt * 6); }
    else { g.vx = g.vy = 0; }
  }
  g.update(dt, W.map);
  if (st === 'alert' && h && !h.dead && !h.hidden && !talk.open && !M.cut && dist2(g, h) < (g.kind === 'cruiser' ? 20 : 14)) caughtBy(g);
  return st;
}

/* ---- Thrown chemistry ---- */
const FLASKS = {
  fulminate: { name: 'Fulminate', color: '#ff6a3a', hi: '#ffd0a0', about: 'It looks like crystal. It is not.' },
  phosphine: { name: 'Phosphine', color: '#8ae05a', hi: '#e0ffc0', about: 'A cloud that makes grown men cough and kneel.' },
  chalk: { name: 'Chalk', color: '#f0f0f0', hi: '#ffffff', about: 'Thrown, it is a noise somewhere else.' }
};
const FLASK_SPR = {};
for (const k in FLASKS) FLASK_SPR[k] = E.sprite(['.g.', '.g.', 'ccc', 'cCc', 'ccc'], { g: '#c8e8f0', c: FLASKS[k].color, C: FLASKS[k].hi });
function throwFlask(a, kind, tx, ty) {
  const from = { x: a.x + Math.cos(a.facing) * 6, y: a.y + Math.sin(a.facing) * 6, z: a.z + 22 };
  const dx = tx - from.x, dy = ty - from.y, l = Math.hypot(dx, dy), max = 150;
  if (l > max) { tx = from.x + dx / l * max; ty = from.y + dy / l * max; }
  const v = E.arc(from, { x: tx, y: ty, z: 0 }, 520, { apex: 22 });
  W.flasks.push({ x: from.x, y: from.y, z: from.z, vx: v.vx, vy: v.vy, vz: v.vz, kind, t: 0, by: a, power: a.catalyst > 0 ? 1.6 : 1 });
  A.sfx('whoosh', { pitch: 1.3 });
}
function updateFlasks(dt) {
  for (const f of W.flasks) {
    f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt; f.vz -= 520 * dt;
    const top = W.map.heightAt ? W.map.heightAt(f.x, f.y) : 0;
    if (f.z <= top || f.t > 3) { f.done = true; burst(f.kind, f.x, f.y, Math.max(0, top), f.power); }
  }
  E.prune(W.flasks, f => f.done);
}
function burst(kind, x, y, z, power = 1) {
  A.sfx('glass');
  if (kind === 'fulminate') {
    P.explosion(x, y, z, 1.1 * power); game.shake(5 * power);
    for (const e of W.enemies) if (!e.dead && Math.hypot(e.x - x, e.y - y) < 34 * power) { hurtEnemy(e, 3 * power, Math.atan2(e.y - y, e.x - x)); E.knockback({ x, y }, e, 240); e.stun = Math.max(e.stun, .6); }
    for (const p of players()) if (Math.hypot(p.x - x, p.y - y) < 20 && p.who !== 'GRAY') hurtPlayer(p, 1, Math.atan2(p.y - y, p.x - x));
    makeNoise(x, y, 160);
  } else if (kind === 'phosphine') {
    W.clouds.push({ x, y, r: 10, grow: 38 * power, t: 6, kind: 'gas' }); A.sfx('fizz'); P.smoke(x, y, z + 4, 10, { color: '#8ae05a', size: 1.4 });
  } else {
    P.dust(x, y, z, 10); P.glints(x, y, z + 4, 6, '#ffffff'); makeNoise(x, y, 110);
    W.toasts.length < 3 && W.stealth && W.toasts.push(['Clatter', 'Anyone nearby will go and look.']);
  }
}
function updateClouds(dt) {
  for (const c of W.clouds) {
    c.t -= dt; c.r = Math.min(c.grow, c.r + dt * (c.kind === 'shock' ? 260 : 40));
    if (c.kind === 'gas') { for (const e of W.enemies) if (!e.dead && Math.hypot(e.x - c.x, e.y - c.y) < c.r) e.gas = Math.max(e.gas, 1.2); if (Math.random() < dt * 8) P.smoke(c.x + (Math.random() - .5) * c.r, c.y + (Math.random() - .5) * c.r, 4, 1, { color: '#7ad04a', size: 1.2 }); }
    if (c.kind === 'shock') { for (const p of players()) { const d = Math.hypot(p.x - c.x, p.y - c.y); if (Math.abs(d - c.r) < 8 && p.z < 4 && !c['hit' + p.who]) { c['hit' + p.who] = true; hurtPlayer(p, 1, Math.atan2(p.y - c.y, p.x - c.x)); } } }
  }
  E.prune(W.clouds, c => c.t <= 0);
}
function makeNoise(x, y, loud) { W.noise.push({ x, y, z: 0, loud, t: .2 }); }

/* ---- Pickups: flasks, first aid, cash ---- */
const PICK = {
  fulminate: { spr: FLASK_SPR.fulminate, text: '+2 Fulminate' }, phosphine: { spr: FLASK_SPR.phosphine, text: '+2 Phosphine' },
  medkit: { spr: E.sprite(['wwwww', 'wwrww', 'wrrrw', 'wwrww', 'wwwww'], { w: '#f0f0f0', r: '#d83a3a' }), text: 'First aid' },
  cash: { spr: E.sprite(['ggggg', 'gGdGg', 'ggggg'], { g: '#4a9a4a', G: '#8ae08a', d: '#2a5a2a' }), text: '+$500' }
};
function dropPickup(x, y, kind) { W.pickups.push({ x, y, z: 0, kind: kind || E.pick(['fulminate', 'phosphine', 'medkit', 'cash']), t: 0 }); }
function updatePickups(dt) {
  for (const p of W.pickups) {
    p.t += dt;
    for (const a of players()) if (Math.hypot(a.x - p.x, a.y - p.y) < 12) {
      p.done = true; A.sfx('pickup'); P.glints(p.x, p.y, 8, 6, '#ffffff'); P.text(p.x, p.y, 20, PICK[p.kind].text, '#ffffff');
      if (p.kind === 'medkit') a.hp = Math.min(a.maxHp, a.hp + 2); else if (p.kind === 'cash') STATE.cash += 500; else W.hero.ammo[p.kind] += 2;
      break;
    }
  }
  E.prune(W.pickups, p => p.done || p.t > 25);
}

/* ---- Barks: one-line radio-style chatter over play (non-modal) ---- */
let talk = null, barkTalk = null;
function bark(who, line) { if (!barkTalk) return; barkTalk.say(line, { name: (CAST[who] || {}).name || who, auto: 2.2, modal: false, place: 'bottom', alpha: .85 }); barkTalk.who = who; }

/* ---- Drawing the cast ---- */
function drawActor(r, a, o = {}) {
  if (a.hidden) return;
  const ground = W.map.groundAt ? W.map.groundAt(a.x, a.y, a.r || 5, a.z) : 0;
  r.shadow(a.x, a.y, a.kind === 'boss' ? 10 : 6, .35, undefined, ground);
  const flash = (a.hurtT > 0 && Math.floor(game.time * 20) % 2 === 0) ? '#ffffff' : (a.inv > 0 && a.team === 'player' && Math.floor(game.time * 16) % 2 === 0 ? '#ffe0e0' : null);
  r.actor(a.x, a.y, a.z, (g, ox, oy) => a.rig.draw(g, ox, oy, r.view), { flash, xray: a.team === 'player' ? { actors: true, color: a.who === 'GRAY' ? '#59c8f0' : '#e8c040' } : undefined, alpha: o.alpha, ghost: a.rollT > 0 ? { color: '#59c8f0', life: .2, alpha: .4, owner: a } : undefined });
  if (a.who === 'GRAY' && a.catalyst > 0) drawHat(r, a);
}
// the hat and the glasses: drawn over the head joint so they follow every pose, in every view
function drawHat(r, a) {
  const hd = a.rig.head ? a.rig.head() : { x: a.x, y: a.y, z: a.z + 34 };
  r.queue(hd.x, hd.y, hd.z + 6, g => {
    const p = r.w(hd.x, hd.y, hd.z + 5), k = (r.view.zoom || 1), sx = Math.round(p[0]), sy = Math.round(p[1]);
    const B = Math.round(8 * k), C = Math.round(5 * k), H = Math.max(2, Math.round(4 * k));
    px.rect(g, sx - B, sy, B * 2, Math.max(1, Math.round(2 * k)), '#101012');
    px.rect(g, sx - C, sy - H, C * 2, H, '#1a1a1e');
    px.rect(g, sx - C, sy - Math.max(1, Math.round(1.4 * k)), C * 2, Math.max(1, Math.round(k)), '#5a4630');
    px.rect(g, sx - C + 1, sy - H, Math.max(1, Math.round(2 * k)), 1, '#3a3a40');
  }, { bias: 3 });
}
function rigState(a, extra) {
  return Object.assign({ x: a.x, y: a.y, z: a.z, vx: a.vx, vy: a.vy, facing: a.facing, hurt: a.hurtT > 0, sprint: a.sprint, crouch: a.crouch, flip: a.rollT > 0 ? clamp(1 - a.rollT / .3, 0, 1) : 0,
    attack: a.melee ? a.melee.state : (a.atk ? a.atk.state : null) }, extra || {});
}
