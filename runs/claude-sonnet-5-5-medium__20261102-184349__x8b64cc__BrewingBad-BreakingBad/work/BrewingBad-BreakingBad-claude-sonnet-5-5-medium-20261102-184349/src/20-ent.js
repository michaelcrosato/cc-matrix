/* ---- PEOPLE: rigs, the hero, cops with eyes, goons with guns, a boss, flasks and pickups ---- */
const rigOf = o => new E.Humanoid(Object.assign({ size: 1.22 }, o));
const SKIN = '#e2b48c', SKIN2 = '#b98660', SKIN3 = '#8a5e40';
const CAST = {
  teacher: () => rigOf({ build: 'chibi', weapon: null, outfit: 'shirt', hair: 'bald', sleeves: 'short', colors: { skin: SKIN, cloth: '#c9b48a', pants: '#6c5a44', boot: '#3a2e26', belt: '#5a4a30', trim: '#7a6a50' } }),
  alias: () => rigOf({ build: 'chibi', weapon: null, outfit: 'coat', hair: 'bald', hat: { style: 'cap', color: '#0e0e10' }, sleeves: 'long', face: { eyes: 'big', bangs: 0 }, colors: { skin: SKIN, cloth: '#1a1a1e', coat: '#17171b', pants: '#202024', boot: '#101012', trim: '#2a2a30', belt: '#101012' } }),
  clerk: () => rigOf({ weapon: null, outfit: 'shirt', hair: 'short', hat: { style: 'cap', color: '#c0502a' }, colors: { skin: SKIN2, hair: '#4a3a2a', cloth: '#3a7a4a', pants: '#4a5a7a', belt: '#e8e0c8' } }),
  pinky: () => rigOf({ weapon: null, outfit: 'shirt', hair: 'spiky', hat: { style: 'band', color: '#e8d040' }, sleeves: 'long', colors: { skin: SKIN3, hair: '#2a1a12', cloth: '#d84a3a', pants: '#3a4a8a', boot: '#e8e8e8' } }),
  marnie: () => rigOf({ weapon: null, outfit: 'shirt', hair: 'long', sleeves: 'short', colors: { skin: SKIN, hair: '#d8b060', cloth: '#d08aa0', pants: '#4a4a6a' } }),
  dealer: () => rigOf({ build: 'bulky', weapon: null, outfit: 'shirt', hair: 'short', hat: { style: 'cap', color: '#e8c040' }, colors: { skin: SKIN2, hair: '#1a1210', cloth: '#e8e0b8', pants: '#8a2a1a', belt: '#1a1210' } }),
  cop: () => rigOf({ weapon: 'gun', outfit: 'shirt', hair: 'short', hat: { style: 'cap', color: '#1c2a5a' }, sleeves: 'short', colors: { skin: SKIN, hair: '#3a2a1a', cloth: '#3a5aa0', pants: '#1c2a5a', boot: '#101018', belt: '#101018', metal: '#303038' } }),
  goon: () => rigOf({ weapon: 'gun', outfit: 'shirt', hair: 'short', hat: { style: 'band', color: '#b0202a' }, sleeves: 'none', colors: { skin: SKIN2, hair: '#101010', cloth: '#2a2a30', pants: '#5a4a3a', boot: '#2a1c14', metal: '#303038' } }),
  goon2: () => rigOf({ weapon: 'gun', build: 'bulky', outfit: 'coat', hair: 'bald', sleeves: 'long', colors: { skin: SKIN3, cloth: '#6a2a2a', coat: '#4a1c1c', pants: '#2a2a30', boot: '#101010', metal: '#303038' } }),
  boss: () => rigOf({ size: 1.7, build: 'bulky', weapon: 'gun', outfit: 'coat', hair: 'short', hat: { style: 'cap', color: '#2a1208' }, sleeves: 'long', colors: { skin: SKIN2, hair: '#101010', cloth: '#8a6a2a', coat: '#3a1a0e', pants: '#1a1210', boot: '#0e0a08', trim: '#e8c860', metal: '#d8c060' } }),
  rusk: () => rigOf({ build: 'bulky', weapon: null, outfit: 'shirt', hair: 'short', sleeves: 'short', colors: { skin: SKIN, hair: '#3a2a1a', cloth: '#e8e4d0', pants: '#3a3a4a', belt: '#202020' } })
};
const portrait = { hoyt: () => hero.rig, clerk: CAST.clerk(), pinky: CAST.pinky(), marnie: CAST.marnie(), dealer: CAST.dealer(), boss: CAST.boss(), rusk: CAST.rusk(), cop: CAST.cop() };

/* ---- the hero ---- */
const hero = { b: new E.Body({ x: AT.start.x, y: AT.start.y, r: 4.5 }), rig: CAST.teacher(), hp: 6, maxHp: 6, inv: 0, face: Math.PI / 2, swing: new E.Attack('bash'), atk: 0, thr: 0, stam: 1, hurt: 0, ghost: 0, sprint: false, hold: 0 };
hero.b.facing = Math.PI / 2;
const setPersona = n => { S.persona = n; hero.rig = n ? CAST.alias() : CAST.teacher(); };
const foes = [], shots = new E.Bullets(game, { plane: 'ground' }), flasks = [], pickups = [], floaters = [], npcs = {};
const flow = new E.FlowField(map);
const diff = () => ({ easy: .6, normal: 1, hard: 1.5 })[game.settings.difficulty] || 1;
const ang = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const heroPos = () => hero.b;
const dirOf = a => [Math.cos(a), Math.sin(a)];
let demoCheat = false;

function addNpc(id, kind, cell, face = Math.PI / 2) {
  const p = PX(cell[0], cell[1]), n = { id, x: p.x, y: p.y, z: 0, rig: CAST[kind](), face, vx: 0, vy: 0, pose: null };
  npcs[id] = n; return n;
}
function makeNpcs() {
  for (const k in npcs) delete npcs[k];
  addNpc('clerk', 'clerk', [24, 5], Math.PI / 2); addNpc('pinky', 'pinky', [44, 8], Math.PI); addNpc('dealer', 'dealer', [8, 27], Math.PI / 2);
  addNpc('marnie', 'marnie', [29, 28], Math.PI); addNpc('rusk', 'rusk', [20, 18], 0);
}

/* ---- cops: a route, eyes and a suspicion that rises; at 1 they run you down ---- */
const ROUTES = [
  [[5, 17], [30, 17], [30, 19], [5, 19]].map(c => PX(c[0], c[1])),
  [[16, 12], [16, 34], [18, 34], [18, 12]].map(c => PX(c[0], c[1])),
  [[22, 22], [34, 22], [34, 34], [22, 34]].map(c => PX(c[0], c[1]))
];
function addCop(route, i0 = 0) {
  const r = ROUTES[route], p = r[i0 % r.length], b = new E.Body({ x: p.x, y: p.y, r: 4.5 });
  foes.push({ kind: 'cop', b, rig: CAST.cop(), route: r, wp: (i0 + 1) % r.length, sus: 0, state: 'calm', face: 0, hp: 99, lost: 0, last: null, alertT: 0, look: 0, id: 'cop' + route });
}
function addGoon(cx, cy, kind = 'goon', o = {}) {
  const p = PX(cx, cy), b = new E.Body({ x: p.x, y: p.y, r: 4.5 }), hp = Math.round((kind === 'goon2' ? 4 : 3) * diff());
  foes.push(Object.assign({ kind: 'goon', b, rig: CAST[kind](), hp, max: hp, state: 'idle', face: Math.PI / 2, home: p, fireT: 1 + Math.random(), wind: 0, burst: 0, strafe: Math.random() < .5 ? 1 : -1, strafeT: 1, flash: 0, aggro: false, id: 'g' + foes.length }, o));
}
function addBoss() {
  const p = AT.boss, b = new E.Body({ x: p.x, y: p.y, r: 8 }), hp = Math.round(34 * diff());
  foes.push({ kind: 'boss', b, rig: CAST.boss(), hp, max: hp, state: 'idle', face: -Math.PI / 2, home: p, fireT: 2, wind: 0, phase: 1, charge: 0, chargeT: 0, stun: 0, flash: 0, aggro: false, summoned: false, id: 'boss' });
}
const sees = (f, range, fov) => {
  const h = hero.b, d = dist2(f.b, h);
  if (d > range) return 0;
  if (!E.inArc(f.b, f.face, h, range, fov, 40)) return 0;
  if (!map.sight({ x: f.b.x, y: f.b.y, z: f.b.z || 0 }, { x: h.x, y: h.y, z: h.z || 0 })) return 0;
  if (hidden(h.x, h.y) && !hero.sprint && d > 24) return 0;
  return 1 - d / range * .6;
};

function bust() {
  if (demoCheat) return;
  S.busts++; const fine = Math.min(S.cash, Math.round(Math.max(80, S.cash * .25)));
  S.cash -= fine; S.heat = Math.max(0, S.heat - 40);
  game.flash('#3a5aff', .4); A.sfx('hurt'); ui.toast('BUSTED', 'Fined $' + fine + '. Your lawyer has a lawyer.', 4);
  const h = hero.b, sp = S.step < 3 ? AT.start : S.step < 5 ? AT.track : AT.town;
  Object.assign(h, { x: sp.x, y: sp.y, vx: 0, vy: 0 });
  for (const f of foes) if (f.kind === 'cop') { f.sus = 0; f.state = 'calm'; f.alertT = 0; }
  hero.inv = 2;
}

function updateCop(f, dt) {
  const h = hero.b, b = f.b, D = diff();
  const see = sees(f, 96 + 14 * D, .62);
  const carry = S.bags > 0 ? 1.6 : 1;
  if (see) { f.sus = Math.min(1.1, f.sus + dt * (.5 + see * 1.5) * carry * D); f.last = { x: h.x, y: h.y }; f.lost = 0; }
  else f.sus = Math.max(0, f.sus - dt * (f.state === 'alert' ? .08 : .22));
  const old = f.state;
  f.state = f.sus >= 1 ? 'alert' : f.sus > .6 ? 'search' : f.sus > .28 ? 'notice' : 'calm';
  if (old === 'alert' && f.sus > .35) f.state = 'alert';
  if (f.state !== old) {
    if (f.state === 'notice') A.sfx('blip', { vol: .6 });
    if (f.state === 'alert') { A.sfx('hurt', { vol: .5 }); S.heat = Math.min(100, S.heat + 18); sayBubble(f, '!'); }
  }
  if (f.state === 'alert') {
    S.heat = Math.min(100, S.heat + dt * 2.2);
    if (dist2(b, h) > 190) f.lost += dt; else f.lost = 0;
    if (f.lost > 4) f.sus = .2;
    const d = flow.dir(b.x, b.y, h.x, h.y) || dirOf(ang(b, h));
    b.vx = d[0] * (58 + 10 * D); b.vy = d[1] * (58 + 10 * D);
    if (dist2(b, h) < 11 && hero.inv <= 0) bust();
  } else if (f.state === 'search' && f.last) {
    const d = dirOf(ang(b, f.last)); if (dist2(b, f.last) > 6) { b.vx = d[0] * 30; b.vy = d[1] * 30; } else { b.vx = b.vy = 0; }
  } else if (f.state === 'notice') { b.vx = b.vy = 0; f.look += dt; if (f.last) f.face = approachAng(f.face, ang(b, f.last), dt * 4); }
  else {
    const t = f.route[f.wp]; const d = dirOf(ang(b, t)); b.vx = d[0] * 26; b.vy = d[1] * 26;
    if (dist2(b, t) < 5) f.wp = (f.wp + 1) % f.route.length;
  }
  b.update(dt, map);
  if (Math.hypot(b.vx, b.vy) > 4 && f.state !== 'notice') f.face = approachAng(f.face, Math.atan2(b.vy, b.vx), dt * 7);
}
function approachAng(a, t, k) { return E.approachAng ? E.approachAng(a, t, k) : a + clamp(E.angDiff ? E.angDiff(a, t) : Math.atan2(Math.sin(t - a), Math.cos(t - a)), -k, k); }
const bubbles = [];
function sayBubble(f, txt) { bubbles.push({ x: f.b ? f.b.x : f.x, y: f.b ? f.b.y : f.y, t: 1.2, txt, f }); }

function fireAt(f, speed, spread, n, dmg = 1) {
  const a = ang(f.b, hero.b) + (Math.random() - .5) * .12;
  for (let i = 0; i < n; i++) {
    const aa = a + (n > 1 ? (i - (n - 1) / 2) * spread : 0), v = dirOf(aa);
    shots.fire({ x: f.b.x + v[0] * 7, y: f.b.y + v[1] * 7, z: 14, vx: v[0] * speed, vy: v[1] * speed, r: 2, team: 'enemy', color: f.kind === 'boss' ? '#ffb040' : '#ff6a3a', life: 2.2, dmg });
  }
  A.sfx('shoot', { vol: .5 }); f.face = a;
}
function updateGoon(f, dt) {
  const h = hero.b, b = f.b, d = dist2(b, h), D = diff();
  f.flash = Math.max(0, f.flash - dt);
  if (!f.aggro) {
    if (sees(f, 150, 1.1) || d < 38) { f.aggro = true; for (const o of foes) if (o.kind !== 'cop' && dist2(o.b, b) < 150) o.aggro = true; A.sfx('blip', { vol: .6 }); sayBubble(f, '!'); }
    b.vx = b.vy = 0; b.update(dt, map); return;
  }
  const to = ang(b, h); f.face = approachAng(f.face, to, dt * 6);
  f.strafeT -= dt; if (f.strafeT <= 0) { f.strafe = -f.strafe; f.strafeT = 1 + Math.random() * 1.5; }
  let mv = [0, 0];
  const want = 78; const dir = dirOf(to);
  if (d > want + 18) mv = [dir[0], dir[1]]; else if (d < want - 22) mv = [-dir[0], -dir[1]];
  else mv = [-dir[1] * f.strafe, dir[0] * f.strafe];
  if (d > want + 18) { const fd = flow.dir(b.x, b.y, h.x, h.y); if (fd && !map.sight(b, h)) mv = fd; }
  b.vx = mv[0] * 34; b.vy = mv[1] * 34; b.update(dt, map);
  if (f.burst > 0) { f.burstT -= dt; if (f.burstT <= 0) { fireAt(f, 105, 0, 1); f.burst--; f.burstT = .12; } }
  else if (f.wind > 0) { f.wind -= dt; if (f.wind <= 0) { f.burst = 3; f.burstT = 0; f.fireT = (1.5 + Math.random()) / D; } }
  else { f.fireT -= dt; if (f.fireT <= 0 && map.sight(b, h)) f.wind = .5; }
}
function updateBoss(f, dt) {
  const h = hero.b, b = f.b, d = dist2(b, h), D = diff();
  f.flash = Math.max(0, f.flash - dt);
  if (!f.aggro) { if (d < 120) { f.aggro = true; sayBubble(f, '!'); A.music('boss', { fade: .5 }); } b.update(dt, map); return; }
  if (f.hp < f.max * .5 && f.phase === 1) { f.phase = 2; game.flash('#ff8030', .3); game.shake(8); A.sfx('boom'); ui.toast('BRUNO VEGA', '"Enough talking. Bring the boys."', 3); if (!f.summoned) { f.summoned = true; addGoon(41, 30, 'goon2', { aggro: true }); addGoon(51, 30, 'goon2', { aggro: true }); } }
  if (f.stun > 0) { f.stun -= dt; b.vx = b.vy = 0; b.update(dt, map); return; }
  const to = ang(b, h);
  if (f.charge > 0) {
    f.charge -= dt; b.vx = Math.cos(f.chargeA) * 170; b.vy = Math.sin(f.chargeA) * 170; b.update(dt, map);
    P.dust(b.x, b.y, 0, 1);
    if (dist2(b, h) < 14 && hero.inv <= 0) { hurtHero(2, f.chargeA); f.charge = 0; }
    if (b.hitWall) { f.charge = 0; f.stun = 1.6; game.shake(6); A.sfx('bump'); P.explosion(b.x, b.y, 8, .5); }
    return;
  }
  if (f.chargeT > 0) { f.chargeT -= dt; f.face = f.chargeA; b.vx = b.vy = 0; b.update(dt, map); if (f.chargeT <= 0) { f.charge = .7; A.sfx('whoosh'); } return; }
  f.face = approachAng(f.face, to, dt * 5);
  const dir = dirOf(to); let mv = d > 70 ? [dir[0], dir[1]] : d < 44 ? [-dir[0], -dir[1]] : [-dir[1], dir[0]];
  b.vx = mv[0] * 28; b.vy = mv[1] * 28; b.update(dt, map);
  if (f.wind > 0) { f.wind -= dt; if (f.wind <= 0) { fireAt(f, 95, f.phase === 1 ? .22 : .16, f.phase === 1 ? 5 : 7); f.fireT = (f.phase === 1 ? 2.2 : 1.7) / D; } return; }
  f.fireT -= dt;
  if (f.fireT <= 0) {
    if (f.phase === 2 && Math.random() < .45) { f.chargeA = to; f.chargeT = .8; sayBubble(f, '!!'); } else f.wind = .55;
  }
}

function hurtHero(n, from) {
  if (hero.inv > 0 || demoCheat) return;
  S.hp = Math.max(0, S.hp - n); hero.inv = 1.1; hero.hurt = .3; game.hitFx(hero.b.x, hero.b.y, 12, { power: .8, damage: n, angle: from });
  game.input.rumble(.6, .2); A.sfx('hurt');
  if (from !== undefined) { hero.b.vx += Math.cos(from) * 80; hero.b.vy += Math.sin(from) * 80; }
}
function hitFoe(f, n, a, power = 1) {
  f.hp -= n; f.flash = .18; f.aggro = true;
  game.hitFx(f.b.x, f.b.y, 14, { power, angle: a, damage: n });
  f.b.vx += Math.cos(a) * 60 * power; f.b.vy += Math.sin(a) * 60 * power;
  if (f.kind === 'boss' && f.stun > 0) f.hp -= 1;
  if (f.hp <= 0) killFoe(f);
}
function killFoe(f) {
  f.dead = true; S.kills++;
  P.explosion(f.b.x, f.b.y, 10, f.kind === 'boss' ? 2 : .6, { freeze: false });
  A.sfx(f.kind === 'boss' ? 'boom' : 'die', { vol: .6 });
  const drop = f.kind === 'boss' ? 5 : 1;
  for (let i = 0; i < drop; i++) pickups.push({ kind: 'cash', x: f.b.x + (Math.random() - .5) * 18, y: f.b.y + (Math.random() - .5) * 18, v: 20 + Math.round(Math.random() * 40), t: 0 });
  if (Math.random() < .35 || f.kind === 'boss') pickups.push({ kind: Math.random() < .5 ? 'food' : 'flask', x: f.b.x, y: f.b.y, t: 0 });
}

/* ---- the hero's wrench and flask ---- */
function aimAngle() {
  const I = game.input, h = hero.b;
  let a = hero.face;
  if (demo) return a;
  if (I.aimSource === 'mouse') { const m = game.mouseGround(); if (m) a = Math.atan2(m.y - h.y, m.x - h.x); }
  else if (I.aimSource === 'pad' && I.padAim) { const d = game.view.screenDirToGround(I.padAim[0], I.padAim[1]); if (Math.hypot(d[0], d[1]) > .2) a = Math.atan2(d[1], d[0]); }
  if (game.settings.aimAssist) {
    let best = null, bd = 1e9;
    for (const f of foes) { if (f.kind === 'cop' || f.dead) continue; const d = dist2(f.b, h); if (d < 80 && d < bd && Math.abs(E.angDiff ? E.angDiff(a, ang(h, f.b)) : 0) < .8) { best = f; bd = d; } }
    if (best) a = ang(h, best.b);
  }
  return a;
}
function throwFlask(ctl) {
  if (S.flasks <= 0 || hero.thr > 0) { if (S.flasks <= 0) { A.sfx('cancel'); } return; }
  const h = hero.b, a = aimAngle(); hero.face = a; hero.thr = .45; S.flasks--; A.sfx('whoosh');
  let tx = h.x + Math.cos(a) * 70, ty = h.y + Math.sin(a) * 70;
  if (game.input.aimSource === 'mouse') { const m = game.mouseGround(); if (m) { const d = Math.min(95, Math.hypot(m.x - h.x, m.y - h.y)), aa = Math.atan2(m.y - h.y, m.x - h.x); tx = h.x + Math.cos(aa) * d; ty = h.y + Math.sin(aa) * d; } }
  const t = .55, g = 700;
  flasks.push({ x: h.x, y: h.y, z: 16, vx: (tx - h.x) / t, vy: (ty - h.y) / t, vz: (g * t / 2) - 16 / t, g, t: 0, lit: 0 });
  hero.rigThrow = .3;
}
function boomFlask(f) {
  P.explosion(f.x, f.y, 4, 1.1, { freeze: false }); game.shake(3); P.smoke(f.x, f.y, 6, 5, { color: '#7acc6a' });
  P.ring(f.x, f.y, 4, 30, '#9aff7a', .35); A.sfx('explode', { vol: .7 });
  for (const e of foes) { if (e.dead || e.kind === 'cop') continue; const d = Math.hypot(e.b.x - f.x, e.b.y - f.y); if (d < 32) hitFoe(e, 3, Math.atan2(e.b.y - f.y, e.b.x - f.x), 1.4); }
  if (Math.hypot(hero.b.x - f.x, hero.b.y - f.y) < 18) hurtHero(1, Math.atan2(hero.b.y - f.y, hero.b.x - f.x));
}
function swingWrench() {
  if (hero.swing.busy || hero.atk > 0) return;
  hero.face = aimAngle(); hero.b.facing = hero.face;
  if (hero.swing.start()) { A.sfx('swing'); hero.b.vx += Math.cos(hero.face) * 38; hero.b.vy += Math.sin(hero.face) * 38; }
}
