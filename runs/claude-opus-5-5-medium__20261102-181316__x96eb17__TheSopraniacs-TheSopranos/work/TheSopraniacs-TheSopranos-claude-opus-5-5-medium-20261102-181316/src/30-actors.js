/* ---- CAST: HD Humanoids, dressed ---- */
const LOOKS = {
  tonyRobe: { size: 1.35, build: 'bulky', weapon: null, outfit: 'robe', hair: 'short', sleeves: 'long', hunch: .08, colors: { skin: '#e2b08a', hair: '#3a3430', cloth: '#f0eee8', coat: '#f4f2ea', pants: '#e8e6de', boot: '#6a4a3a', belt: '#d8d4c8', trim: '#c8c4b8' } },
  tony: { size: 1.35, build: 'bulky', weapon: null, outfit: 'coat', hair: 'short', sleeves: 'long', hunch: .08, colors: { skin: '#e2b08a', hair: '#3a3430', cloth: '#5a7a9a', coat: '#2a2a30', pants: '#2a2a34', boot: '#1a1a1e', belt: '#141418', trim: '#8a8a90' } },
  paulie: { size: 1.2, build: 'heroic', weapon: null, outfit: 'shirt', hair: 'short', sleeves: 'long', colors: { skin: '#dcaa84', hair: '#e8e8ec', cloth: '#2a3a6a', pants: '#2a3a6a', boot: '#f0f0f0', belt: '#1a1a2a', trim: '#f0f0f0' } },
  chrissy: { size: 1.25, build: 'heroic', weapon: null, outfit: 'coat', hair: 'spiky', sleeves: 'long', colors: { skin: '#e8b890', hair: '#1a1210', cloth: '#d8d8d0', coat: '#1a1a1a', pants: '#2a2a3a', boot: '#3a2a1a', belt: '#1a1a1a' } },
  sil: { size: 1.25, build: 'bulky', weapon: null, outfit: 'shirt', hair: 'short', sleeves: 'long', colors: { skin: '#dca880', hair: '#2a2420', cloth: '#6a1a2a', pants: '#2a2a2a', boot: '#1a1a1a', belt: '#c8a040' } },
  melba: { size: 1.2, build: 'heroic', weapon: null, outfit: 'coat', hair: 'long', sleeves: 'long', colors: { skin: '#f0c8a8', hair: '#6a3420', cloth: '#e8e0d0', coat: '#4a4a52', pants: '#4a4a52', boot: '#2a2a2a' } },
  carla: { size: 1.18, build: 'heroic', weapon: null, outfit: 'shirt', hair: 'long', sleeves: 'long', colors: { skin: '#f0c8a8', hair: '#e8c870', cloth: '#c83a6a', pants: '#2a2a3a', boot: '#2a2a2a' } },
  ma: { size: 1.1, build: 'heroic', weapon: null, outfit: 'robe', hair: 'ponytail', sleeves: 'long', hunch: .45, colors: { skin: '#e0c0a8', hair: '#b8b8b8', cloth: '#5a4a6a', coat: '#6a5a7a', pants: '#5a4a6a', boot: '#2a2a2a' } },
  artie: { size: 1.25, build: 'bulky', weapon: null, outfit: 'shirt', hair: 'short', hat: { style: 'cap', color: '#f4f4f4' }, sleeves: 'short', colors: { skin: '#e8b890', hair: '#4a3020', cloth: '#f4f4f4', pants: '#3a3a3a', boot: '#1a1a1a' } },
  enzo: { size: 1.2, build: 'heroic', weapon: null, outfit: 'shirt', hair: 'bald', sleeves: 'short', colors: { skin: '#d8a880', cloth: '#f0e8f0', pants: '#4a4a5a', boot: '#2a2a2a', belt: '#e890b0' } },
  georgie: { size: 1.2, build: 'heroic', weapon: null, outfit: 'shirt', hair: 'short', sleeves: 'short', colors: { skin: '#e0b090', hair: '#7a5a3a', cloth: '#1a1a1a', pants: '#1a1a1a', boot: '#1a1a1a' } },
  gambler: { size: 1.2, build: 'heroic', weapon: null, outfit: 'shirt', hair: 'spiky', sleeves: 'long', colors: { skin: '#e8c0a0', hair: '#c89a5a', cloth: '#e8a83a', pants: '#3a3a5a', boot: '#3a2a1a' } },
  harrow: { size: 1.2, build: 'heroic', weapon: null, outfit: 'coat', hair: 'short', sleeves: 'long', colors: { skin: '#e8c0a0', hair: '#6a5a4a', cloth: '#e8e8f0', coat: '#2a3040', pants: '#2a3040', boot: '#141414' } },
  ralphie: { size: 1.3, build: 'heroic', weapon: null, outfit: 'coat', hair: 'short', sleeves: 'long', colors: { skin: '#e8b890', hair: '#c8a060', cloth: '#e8e0c8', coat: '#6a4a2a', pants: '#3a2a20', boot: '#1a1210', belt: '#c8a040' } },
  tj: { size: 1.05, build: 'chibi', weapon: null, outfit: 'shirt', hair: 'short', sleeves: 'short', colors: { skin: '#e8b890', hair: '#2a1a14', cloth: '#3a3a3a', pants: '#3a4a7a', boot: '#e8e8e8' } },
  medora: { size: 1.12, build: 'heroic', weapon: null, outfit: 'coat', hair: 'long', sleeves: 'long', colors: { skin: '#f0c8a8', hair: '#2a1a14', cloth: '#e8e0d8', coat: '#8a6a4a', pants: '#2a2a3a', boot: '#2a2a2a' } },
  stranger: { size: 1.2, build: 'heroic', weapon: null, outfit: 'coat', hair: 'short', sleeves: 'long', colors: { skin: '#e0b090', hair: '#2a2420', cloth: '#d8d0c0', coat: '#3a3a2a', pants: '#2a2a2a', boot: '#1a1a1a' } }
};
const THUGS = {
  thug: { name: 'NY MUSCLE', hp: 30, r: 6, speed: 46, wind: .3, moves: [['jab', 'cross'], ['jab', 'jab', 'hook']], cash: 300,
    rig: { size: 1.25, build: 'heroic', weapon: null, outfit: 'shirt', hair: 'short', sleeves: 'short', colors: { skin: '#dcaa84', hair: '#1a1a1a', cloth: '#3a3a42', pants: '#2a2a32', boot: '#1a1a1a' } } },
  bruiser: { name: 'BIG LOUIE', hp: 55, r: 8, speed: 32, wind: .42, moves: [['haymaker'], ['bash'], ['hook', 'haymaker']], cash: 600,
    rig: { size: 1.45, build: 'bulky', weapon: null, outfit: 'shirt', hair: 'bald', sleeves: 'none', colors: { skin: '#c8906a', cloth: '#7a2a2a', pants: '#3a3a3a', boot: '#2a2a2a', belt: '#c8a040' } } },
  gunner: { name: 'TRIGGER', hp: 24, r: 6, speed: 40, wind: .3, moves: [['jab', 'cross']], gun: true, cash: 400,
    rig: { size: 1.25, build: 'heroic', weapon: 'gun', outfit: 'coat', hair: 'short', sleeves: 'long', colors: { skin: '#e0b090', hair: '#3a2a1a', cloth: '#5a5a62', coat: '#2a2a2e', pants: '#2a2a2e', boot: '#1a1a1a', metal: '#2a2a30' } } },
  boss: { name: 'RALPHIE', hp: 150, r: 7, speed: 52, wind: .28, moves: [['cross', 'hook', 'uppercut'], ['jab', 'elbow'], ['roundhouse'], ['jab', 'cross', 'haymaker']], gun: true, cash: 2500, boss: true, rig: LOOKS.ralphie }
};
// moves tuned for 1.3-size fighters on the ground plane
const TUNE = { hook: { reach: 5.4, a0: 1.9 }, haymaker: { a0: 2.7, z0: -2 }, bash: { plane: 'side', a0: 2, a1: -.4 }, roundhouse: { hitAt: .5 } };
const BLOW = { jab: [5, 12, 0], cross: [6, 18, 0], hook: [8, 26, 0], uppercut: [11, 90, 200], haymaker: [16, 130, 170], bash: [12, 150, 0], elbow: [8, 90, 0], kick: [7, 40, 0],
  roundhouse: [11, 130, 150], stomp: [14, 0, 0], plunge: [14, 0, 0], sweep: [6, 50, 120] };
const mkMove = (m, o) => new E.Attack(m, Object.assign({}, TUNE[m], o));

class Fighter extends E.Humanoid {}
const rigOf = look => new Fighter(Object.assign({}, look));
// an actor: an E.Body with a rig, health, its moves and its knock-down state
function actor(x, y, look, extra = {}) {
  return Object.assign(new E.Body({ x, y, r: extra.r || 6 }), { rig: rigOf(look), look, facing: Math.PI / 2, hp: 100, max: 100, stun: 0, inv: 0, flash: 0, knocked: false, down: 0, floor: 0, rise: 0, act: null, t: 1 }, extra);
}

/* ---- WORLD STATE ---- */
let S = null;                    // the story's state (saved)
let A = null, map = null;        // the area the player is in
let hero = null, hero2 = null, heroes = [];
let car = null, driving = false; // Tony's SUV
let foes = [], npcs = [], peds = [], traffic = [], ducks = [], pickups = [], puffs = [];
let van = null;                  // the FBI's van
let shots = null;                // bullets
let attract = false;             // the AI plays
let fightOn = null;              // the running encounter
let panic = 0;                   // seconds of a panic attack left
let breathing = false;
let intents = null;              // the AI's intent in attract mode

function newState() {
  return { ch: 1, step: 'paper', money: 200, respect: 10, stress: 35, heat: 0, hp: 100, ammo: 12, outfit: 'tonyRobe', area: 'town', x: 19.5 * T, y: 12 * T,
    car: { x: 21.5 * T + 8, y: 9 * T + 4, angle: Math.PI / 2 }, flags: {}, envelopes: 0, jobs: {}, hits: 0, kos: 0, panics: 0, played: 0, song: 0 };
}

/* ---- MOVEMENT HELPERS ---- */
function pushOut(b, list) {
  for (const o of list) { const dx = b.x - o.x, dy = b.y - o.y, d = Math.hypot(dx, dy), R = o.r + (b.r || 6); if (d < R && d > .01) { b.x = o.x + dx / d * R; b.y = o.y + dy / d * R; } }
}
function solidAll(b) {
  pushOut(b, A.blockers);
  if (A.id === 'town') { pushOut(b, traffic.map(c => ({ x: c.x, y: c.y, r: 13 }))); if (van && van.area === 'town') pushOut(b, [{ x: van.x, y: van.y, r: 14 }]); if (car && !driving && car.area === 'town') pushOut(b, [{ x: car.x, y: car.y, r: 13 }, { x: car.x + Math.cos(car.angle) * 12, y: car.y + Math.sin(car.angle) * 12, r: 10 }, { x: car.x - Math.cos(car.angle) * 12, y: car.y - Math.sin(car.angle) * 12, r: 10 }]); }
}
const pose = (a, k = .2) => a;

/* ---- COMBAT (after the BRAWLER kit: strings, knock-downs, get-ups) ---- */
function heroMoves() { return { punch: new E.Combo(['jab', 'cross', mkMove('hook'), 'uppercut'], { window: .38 }), heavy: mkMove('haymaker'), stomp: new E.Attack('plunge', { name: 'stomp' }) }; }
const contactZ = (c, a) => a.spec.kick ? c.z + 14 : (c.rig.hand(a.spec.hand)[2] || c.z + 20);
function strike(t, a, by) {
  const name = a.spec.name, b = BLOW[name] || [6, 20, 0], rage = by === hero && S.stress > 75 ? 1.5 : 1;
  const dmg = Math.round(b[0] * rage * (by.isP2 ? .9 : 1)), heavy = b[0] > 9 || b[2] > 0, dir = Math.atan2(t.y - by.y, t.x - by.x);
  const z = t.down ? t.z + 4 : contactZ(by, a);
  game.hitFx(t.x - Math.cos(dir) * 5, t.y - Math.sin(dir) * 5, z, { power: heavy ? 1.8 : 1.2, angle: dir, color: rage > 1 ? '#ff5a3a' : '#ffd23a', sound: 'punchHit', damage: dmg, textScale: 2, textZ: 30, textColor: rage > 1 ? '#ff8a6a' : '#ffffff' });
  t.flash = game.real + .06; S.hits++;
  if (t.ped) { knock(t, by, [0, 90, 120]); t.flee = 5; addHeat(8, 'Assaulting a civilian'); return; }
  knock(t, by, [dmg, b[1], b[2]]);
  witnessed(by, 4);
  if (t.hp <= 0 && !t.dead) ko(t);
}
function knock(c, from, [dmg, force, lift]) {
  c.hp -= dmg; c.stun = .34; c.vx = c.vy = 0; c.rig.kick(-1); if (c.act) c.act.cancel(); c.act = null;
  if (c.hp <= 0) { force = Math.max(force, 120); lift = Math.max(lift, 170); }
  if (lift) Object.assign(c, { knocked: true, bounce: .4, friction: 1.4 });
  if (force) E.knockback(from, c, force, lift);
}
function fall(c, dt) {
  if (!c.knocked) return;
  if (c.bounced || c.landed) { const first = !c.down; if (first) { c.down = 1; c.floor = .9; c.rig.kick(-4); } dust(c.x, c.y, first ? 8 : 3); game.shake(first ? 2 : 1); audio.sfx('land'); }
  if (c.down && c.onGround) c.friction = 5;
  if (c.down && (c.floor -= dt) <= 0 && c.hp > 0) { c.down = 0; c.rise = .7; c.inv = Math.max(c.inv, 1.2); }
  else if (c.rise > 0 && (c.rise -= dt) <= 0) Object.assign(c, { knocked: false, bounce: 0, friction: 0, t: .8 });
}
function ko(f) {
  f.dead = 2.4; S.kos++;
  const cash = Math.round((f.k ? f.k.cash : 0) * (.7 + Math.random() * .6));
  if (cash) pickups.push({ kind: 'cash', x: f.x, y: f.y, z: 0, v: cash, t: 0, area: A.id });
  if (f.k && f.k.boss) { game.flash('#ffffff', .3, .5); game.timeScale = .3; game.after(.6, () => { game.timeScale = 1; }); audio.sfx('boom'); }
  if (Math.random() < .35) pickups.push({ kind: 'gabagool', x: f.x + 8, y: f.y + 4, z: 0, t: 0, area: A.id });
}
const dust = (x, y, n, s = 3) => { for (let i = 0; i < n; i++) puffs.push({ x: x + E.rand(-5, 5), y: y + E.rand(-3, 3), vx: E.rand(-40, 40), vy: E.rand(-20, 20), t: 0, s: s * E.rand(.7, 1.2) }); };

// Tony is hit
function hurtHero(f, a, h) {
  if (attract) { h.flash = game.real + .05; return; }
  const more = f.act && f.act.step < f.act.moves.length - 1, b = BLOW[a.spec.name] || [6, 20, 0], dmg = Math.round(b[0] * .9 * diff());
  game.hitFx(h.x, h.y, 22, { power: b[2] ? 1.8 : 1.2, color: '#ff6a4a', sound: 'hurt', damage: dmg, textScale: 2, textZ: 30, textColor: '#ff8a7a' });
  knock(h, f, more ? [dmg, 8, 0] : [dmg, b[1], b[2]]); h.flash = game.real + .06; h.inv = more ? 0 : .6;
  if (h === hero) { S.hp = h.hp; addStress(2.5); input.rumble && input.rumble(.5, .15); }
  if (h.hp <= 0) heroDown(h);
}
function shotHero(h, dmg) {
  if (attract) return;
  if (h.inv > 0 || h.knocked) return;
  dmg = Math.round(dmg * diff()); h.hp -= dmg; h.flash = game.real + .06; h.inv = .3;
  game.hitFx(h.x, h.y, 22, { power: 1, color: '#ff6a4a', sound: 'hurt', damage: dmg, textScale: 2, textZ: 30 });
  if (h === hero) { S.hp = h.hp; addStress(3); }
  if (h.hp <= 0) heroDown(h);
}
function heroDown(h) {
  h.hp = 0; Object.assign(h, { knocked: true, down: 1, floor: 99 });
  if (h === hero2) { game.after(4, () => { if (hero2) Object.assign(hero2, { hp: hero2.max * .6, knocked: false, down: 0, floor: 0, inv: 2 }); }); return; }
  game.after(1.6, () => game.go('over', { why: 'down' }));
}

/* ---- STRESS, HEAT ---- */
function addStress(n, why) {
  if (attract || HUB) return;
  S.stress = clamp(S.stress + n, 0, 100);
  if (why && n < 0) note(why);
  if (S.stress >= 100 && panic <= 0 && !talk.open) startPanic();
}
function addHeat(n, why) {
  if (attract) return;
  const was = S.heat; S.heat = clamp(S.heat + n, 0, 100);
  if (why && was < 50 && S.heat >= 50) radio('AGENT HARROW', 'We got eyes on you, Tony. Smile for the camera.', LOOKS.harrow);
  if (S.heat >= 100 && !game.sceneName.startsWith('over')) game.after(.4, () => game.go('over', { why: 'busted' }));
}
// violence where the FBI's van can see it
function witnessed(by, n) {
  if (!van || A.id !== 'town' || van.area !== 'town') return;
  if (by !== hero && by !== hero2 && by !== car) return;
  if (vanSees(by)) { addHeat(n, 'seen'); van.alert = 1.2; }
}
function vanSees(t) {
  const dx = t.x - van.x, dy = t.y - van.y, d = Math.hypot(dx, dy);
  if (d > van.range) return false;
  if (Math.abs(E.angDiff(van.look, Math.atan2(dy, dx))) > .55) return false;
  return map.los(van.x, van.y, t.x, t.y);
}
function startPanic() {
  panic = 4.5; S.panics++; S.stress = 60; audio.sfx('heartbeat'); game.flash('#000000', .5, 1);
  hero.knocked = true; hero.down = 1; hero.floor = 4; hero.vx = hero.vy = 0;
  if (driving) { car.speed *= .2; }
  radio('TONY', 'The room... it\'s spinning... the ducks...', LOOKS.tony);
}

/* ---- FOES ---- */
function spawnFoe(kind, x, y, o = {}) {
  const k = THUGS[kind];
  const f = actor(x, y, k.rig, { k, name: o.name || k.name, hp: Math.round(k.hp * (k.boss ? diff() : (.8 + diff() * .2))), max: k.hp, r: k.r, t: 1 + Math.random(), friction: 5, team: 'foe', gunT: 2 + Math.random() * 2,
    moves: k.moves.map(s => new E.Combo(s.map((m, j) => mkMove(m, { wind: Math.max(E.MOVES[m].wind, j ? k.wind / 2 : k.wind) })))) });
  f.max = f.hp; f.area = A.id; foes.push(f); return f;
}
const aimAt = f => { const live = heroes.filter(c => c.hp > 0 && !driving); return live.sort((a, b) => E.dist(a, f) - E.dist(b, f))[0] || null; };
function updateFoes(dt) {
  for (const f of foes) {
    f.stun -= dt; f.inv -= dt; if (f.dead) f.dead -= dt;
    const h = aimAt(f);
    if (f.dead) { f.update(dt, map); fall(f, dt); driveRig(f, dt); continue; }
    if (f.act) {
      if (f.act.update(dt) === 'active') audio.sfx('whoosh', { pitch: .7 });
      f.act.hits(heroes, t => t.inv <= 0 && !t.knocked && E.inArc(f, f.facing, t, 18 + 6 * f.k.rig.size, 1), t => hurtHero(f, f.act.state, t));
      if (!f.act.busy) { if (f.act.step < f.act.moves.length - 1 && f.act.press()) { /* the next blow */ } else f.act = null; }
    } else if (h && !f.knocked && f.stun <= 0 && !talk.open) {
      const dx = h.x - f.x, dy = h.y - f.y, d = Math.hypot(dx, dy), gap = 13 + 5 * f.k.rig.size;
      f.facing = Math.atan2(dy, dx);
      // gunners keep their distance and shoot (a red aim line telegraphs it)
      if (f.k.gun && (f.k.boss ? f.hp < f.max * .6 : true) && d > 50 && d < 170) {
        f.vx = approach(f.vx, 0, 400 * dt); f.vy = approach(f.vy, 0, 400 * dt);
        if ((f.gunT -= dt) < .6) f.aiming = true;
        if (f.gunT <= 0) { f.gunT = (f.k.boss ? 1.1 : 2.2) + Math.random(); f.aiming = false; foeShoot(f, h); }
      } else {
        f.aiming = false;
        const want = d > gap + 3 ? 1 : d < gap - 4 ? -.5 : 0;
        f.vx = approach(f.vx, Math.cos(f.facing) * f.k.speed * want, 300 * dt); f.vy = approach(f.vy, Math.sin(f.facing) * f.k.speed * want, 300 * dt);
        if ((f.t -= dt) <= 0 && !h.knocked && d < gap + 6) { f.act = E.pick(f.moves); f.act.press(); f.t = (f.k.boss ? .5 : 1 + Math.random()) / Math.sqrt(diff()); }
        if (f.k.gun) f.gunT = Math.max(f.gunT - dt * .3, .8);
      }
    } else if (!f.knocked) { f.vx = approach(f.vx, 0, 300 * dt); f.vy = approach(f.vy, 0, 300 * dt); }
    f.update(dt, map); fall(f, dt); solidAll(f);
    driveRig(f, dt);
  }
  for (const a of foes) for (const b of foes) if (a !== b && !a.dead && !b.dead) pushOut(b, [{ x: a.x, y: a.y, r: a.r + 4 }]);
  E.prune(foes, f => { const gone = f.dead !== undefined && f.dead <= 0; if (gone) dust(f.x, f.y, 6); return gone; });
}
function foeShoot(f, h) {
  const a = Math.atan2(h.y - f.y, h.x - f.x) + E.rand(-.08, .08);
  shots.fire({ x: f.x + Math.cos(a) * 10, y: f.y + Math.sin(a) * 10, z: 20, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190, vz: 0, r: 2, team: 'foe', color: '#ffd080', life: 1.4, dmg: f.k.boss ? 12 : 9 });
  audio.sfx('gun', { vol: .6 }); P.sparks(f.x + Math.cos(a) * 12, f.y + Math.sin(a) * 12, 20, 4, a);
  for (const p of peds) if (E.dist(p, f) < 160) p.flee = 5;
}

/* ---- THE RIG FROM THE BODY ---- */
function driveRig(c, dt, o = {}) {
  const sz = c.rig.o.size, st = c.act && c.act.state, ok = !c.knocked && c.stun <= 0;
  const fly = c.knocked && !c.down && !(c.rise > 0);
  c.rig.update(dt, Object.assign({ x: c.x, y: c.y, z: c.z, vx: c.vx / sz, vy: c.vy / sz, facing: c.facing, air: !c.onGround && !c.knocked,
    stance: ok && (c.team === 'foe' || (c.fighting)) ? 'guard' : null, point: !!(c.aiming || c.pointT > 0), hurt: !ok && !c.down && !(c.rise > 0),
    down: fly ? clamp(.6 - c.vz / 480, 0, 1) : undefined, pose: c.down ? 'down' : c.rise > .22 ? 'kneel' : c.rise > 0 ? 'crouch' : (c.pose || null), attack: st, expr: c.expr }, o));
}

/* ---- TONY ---- */
function makeHero(x, y) {
  const h = actor(x, y, LOOKS[S.outfit], { hp: S.hp, max: 100, r: 6, team: 'hero', moves: heroMoves(), lag: 1, pointT: 0, rollT: 0 });
  h.facing = Math.PI / 2; return h;
}
function joinP2(inp) {
  if (driving || !hero) return;
  hero2 = actor(hero.x - 16, hero.y + 10, LOOKS.chrissy, { hp: 90, max: 90, r: 6, team: 'hero', moves: heroMoves(), isP2: true, input: inp, inv: 2, pointT: 0, rollT: 0 });
  hero2.moves.heavy = mkMove('roundhouse'); heroes = [hero, hero2];
  dust(hero2.x, hero2.y, 8); audio.sfx('powerup'); note('Chrissy jumps in (Player 2)');
}
// what a player (or the attract AI) asks for this step
function readIntent(inp) {
  const m = inp.move(), mouse = inp.aimSource === 'mouse' && inp.lastDevice === 'mouse';
  return { move: m, attack: inp.buffered('attack', .35), heavy: inp.buffered('heavy', .35), dodge: inp.pressed('dodge'), interact: inp.pressed('interact'),
    fire: inp.pressed('fire'), fireHeld: inp.down('fire'), breathe: inp.down('breathe'), sprint: inp.down('sprint'), aim: (() => { const pa = inp === input ? padAim() : inp.padAim; if (pa) return game.view.screenDirToGround(pa[0], pa[1]); return inp === input && mouse && (inp.down('fire') || inp.pressed('fire') || inp.buffered('attack', .35)) ? mouseAim() : null; })(),
    consume: k => inp.consume(k) };
}
function mouseAim() { const m = game.mouseGround(); return m && hero ? [m[0] - hero.x, m[1] - hero.y] : null; }

function controlHero(h, I, dt) {
  h.inv -= dt; h.stun -= dt; h.pointT -= dt; h.rollT -= dt;
  const busy = !!(h.act && h.act.busy), free = h.hp > 0 && !h.knocked && h.stun <= 0 && panic <= 0;
  const md = free ? game.view.screenDirToGround(I.move[0], I.move[1]) : [0, 0], mag = Math.hypot(md[0], md[1]);
  h.fighting = foes.some(f => !f.dead && E.dist(f, h) < 140);
  breathing = h === hero && free && I.breathe && !busy && S.flags.breathe;
  let speed = (I.sprint ? 125 : 82) * (breathing ? .35 : 1) * (S.outfit === 'tonyRobe' ? .9 : 1);
  if (h.rollT > 0) { h.vx = Math.cos(h.rollDir) * 190; h.vy = Math.sin(h.rollDir) * 190; }
  else if (!h.knocked && h.stun <= 0) { const stop = busy; h.vx = approach(h.vx, stop ? 0 : md[0] * speed, 900 * dt); h.vy = approach(h.vy, stop ? 0 : md[1] * speed, 900 * dt); }
  if (!busy && mag > .2 && h.rollT <= 0) h.facing = Math.atan2(md[1], md[0]);
  if (free && !busy && h.rollT <= 0) {
    // aim: the right stick or the mouse turns Tony when he swings or shoots; else the nearest foe in front
    const aimF = () => { if (I.aim && Math.hypot(I.aim[0], I.aim[1]) > .2) { const d = game.view.screenDirToGround ? I.aim : I.aim; h.facing = Math.atan2(d[1], d[0]); return; } const t = E.targets(h, foes.filter(f => !f.dead), { range: 60, arc: 1.2 })[0]; if (t) h.facing = t.angle; };
    if (I.dodge) { h.rollT = .32; h.rollDir = mag > .2 ? Math.atan2(md[1], md[0]) : h.facing; h.inv = .35; audio.sfx('whoosh'); dust(h.x, h.y, 4); }
    else if (I.attack) {
      const downed = foes.find(f => !f.dead && f.down && E.dist(f, h) < 22);
      aimF();
      if (downed && I.heavy === false && false) { /* (stomp is on heavy) */ }
      if (h.moves.punch.press()) { h.act = h.moves.punch; I.consume('attack'); }
    } else if (I.heavy) {
      const downed = foes.find(f => !f.dead && f.down && E.dist(f, h) < 24);
      aimF();
      if (downed) { if (h.moves.stomp.start()) { h.act = h.moves.stomp; h.facing = E.angleTo(h, downed); I.consume('heavy'); } }
      else if (h.moves.heavy.start()) { h.act = h.moves.heavy; I.consume('heavy'); }
    } else if (I.fire && h === hero) {
      if (I.aim && Math.hypot(I.aim[0], I.aim[1]) > .2) h.facing = Math.atan2(I.aim[1], I.aim[0]); else aimF();
      fireGun(h);
    }
  }
  if (h.act && h.act.update(dt) === 'active') audio.sfx('whoosh', { pitch: h.act.state.spec.kick ? .8 : 1 });
  const inReach = t => !t.dead && (h.act === h.moves.stomp ? t.down : !t.knocked) && E.inArc(h, h.facing, t, h.act === h.moves.stomp ? 26 : 30, h.act === h.moves.stomp ? 1.6 : 1.05);
  if (h.act) h.act.hits(foes.concat(peds.filter(p => p.area === A.id)), inReach, t => strike(t, h.act.state, h));
  if (h.act && !h.act.busy) h.act = null;
  h.update(dt, map); fall(h, dt); solidAll(h);
  // pickups
  for (const p of pickups) if (!p.got && p.area === A.id && Math.hypot(p.x - h.x, p.y - h.y) < 13) takePickup(p, h);
  E.prune(pickups, p => p.got);
  driveRig(h, dt, breathing ? { pose: 'cast' } : {});
}
function fireGun(h) {
  if (S.ammo <= 0) { audio.sfx('click'); note('Out of bullets. Paulie has more at the pork store.'); return; }
  S.ammo--; h.pointT = .5;
  const a = h.facing, sx = h.x + Math.cos(a) * 12, sy = h.y + Math.sin(a) * 12;
  shots.fire({ x: sx, y: sy, z: 21, vx: Math.cos(a) * 320, vy: Math.sin(a) * 320, vz: 0, r: 2, team: 'player', color: '#fff0a0', life: .8, dmg: 18 });
  audio.sfx('gun'); game.shake(2); P.sparks(sx, sy, 21, 5, a); game.flash('#fff0c0', .04, .25);
  addHeat(van && A.id === 'town' && vanSees(h) ? 14 : 5);
  for (const p of peds) if (p.area === A.id && E.dist(p, h) < 220) p.flee = 6;
}
function takePickup(p, h) {
  p.got = true;
  if (p.kind === 'cash') { S.money += p.v; audio.sfx('cash'); P.text(p.x, p.y, 20, '+' + fmt$(p.v), '#8af08a', { scale: 2 }); }
  else if (p.kind === 'envelope') { S.money += p.v; S.envelopes++; audio.sfx('cash'); P.text(p.x, p.y, 20, '+' + fmt$(p.v), '#f0e08a', { scale: 2 }); }
  else if (p.kind === 'gabagool') { h.hp = Math.min(h.max, h.hp + 25); if (h === hero) { S.hp = h.hp; addStress(-6); } audio.sfx('heal'); P.text(p.x, p.y, 20, 'GABAGOOL!', '#ffb0b0'); }
  else if (p.kind === 'ammo') { S.ammo += 8; audio.sfx('pickup'); P.text(p.x, p.y, 20, '+8 ROUNDS', '#e8e8f0'); }
  P.glints(p.x, p.y, 10, 6, '#ffffff');
}

/* ---- THE SUV ---- */
function makeCar() {
  car = new E.Car({ x: S.car.x, y: S.car.y, angle: S.car.angle, top: 230, accel: 190, brake: 360, reverse: 80, turn: 2.6, grip: 9, r: 9 });
  car.area = 'town';
}
function enterCar() {
  driving = true; hero.vx = hero.vy = 0; audio.sfx('door'); game.follow(car, { z: 10, lead: 46 });
  if (hero2) hero2.inCar = true;
}
function exitCar() {
  const c = Math.cos(car.angle), s = Math.sin(car.angle);
  let placed = false;
  for (const side of [1, -1, 2, -2]) {
    const x = car.x - s * 18 * side, y = car.y + c * 18 * side;
    if (map.standable ? map.standable(x, y, 0, 6) : true) { hero.x = x; hero.y = y; placed = true; break; }
  }
  if (!placed) { hero.x = car.x; hero.y = car.y + 20; }
  hero.z = 0; driving = false; car.speed = 0; car.vx = car.vy = 0; audio.sfx('door'); game.follow(hero, { z: 18, lead: 20 });
  if (hero2) { hero2.inCar = false; hero2.x = hero.x + 10; hero2.y = hero.y + 8; }
}
function driveCar(dt, I) {
  const gas = I.gas ? 1 : 0, brake = I.brake ? 1 : 0;
  const steer = I.steer;
  car.update(dt, map, { steer: panic > 0 ? Math.sin(game.time * 5) : steer, gas: panic > 0 ? 0 : gas, brake, drift: I.sprint });
  if (car.bumped && Math.abs(car.speed) > 60) { audio.sfx('crash', { vol: .5 }); game.shake(3); dust(car.x, car.y, 6); }
  pushOut(car, A.blockers);
  // other cars and the van
  for (const t of traffic) { const d = Math.hypot(car.x - t.x, car.y - t.y); if (d < 24) { const k = (24 - d) / d; car.x += (car.x - t.x) * k; car.y += (car.y - t.y) * k; if (Math.abs(car.speed) > 50) { audio.sfx('crash', { vol: .6 }); game.shake(4); t.stopT = 2; t.honk = 1; addHeat(4); } car.speed *= .4; } }
  if (van) { const d = Math.hypot(car.x - van.x, car.y - van.y); if (d < 26) { const k = (26 - d) / d; car.x += (car.x - van.x) * k; car.y += (car.y - van.y) * k; car.speed *= .3; } }
  // run into a foe or a pedestrian: they fly
  for (const f of foes.concat(peds)) {
    if (f.dead || f.knocked || f.area !== A.id && f.area) continue;
    if (Math.hypot(f.x - car.x, f.y - car.y) < 16 && Math.abs(car.speed) > 50) {
      const dmg = Math.round(Math.abs(car.speed) / 6);
      if (f.ped) { knock(f, car, [0, 140, 160]); f.flee = 6; addHeat(15, 'Hit and run'); }
      else { knock(f, car, [dmg, 160, 180]); game.hitFx(f.x, f.y, 14, { power: 1.6, damage: dmg, sound: 'punchHit' }); if (f.hp <= 0 && !f.dead) ko(f); witnessed(car, 6); }
      car.speed *= .7;
    }
  }
  if (I.horn) { audio.sfx('horn'); for (const p of peds) if (E.dist(p, car) < 90) p.flee = 2; for (const t of traffic) if (E.dist(t, car) < 90) t.honk = .8; }
  if (Math.abs(car.speed) > 20 && Math.random() < dt * 6) audio.sfx('engine', { pitch: .6 + Math.abs(car.speed) / 300, vol: .5 });
  hero.x = car.x; hero.y = car.y; hero.facing = car.angle;
  S.car = { x: car.x, y: car.y, angle: car.angle };
}

const heroAlive = () => hero;
/* ---- TOWN LIFE: traffic, pedestrians, ducks, the van ---- */
const RING = new E.Path([[11.5 * T + 8, 15.5 * T + 8], [61.5 * T - 8, 15.5 * T + 8], [61.5 * T - 8, 33.5 * T - 8], [11.5 * T + 8, 33.5 * T - 8]].map(p => [p[0], p[1], 0]), { closed: true, smooth: 'catmull' });
const RING2 = new E.Path([[37.5 * T + 8, 33.5 * T + 8], [37.5 * T + 8, 15.5 * T - 8], [11.5 * T - 8, 15.5 * T - 8], [11.5 * T - 8, 33.5 * T + 8]].map(p => [p[0], p[1], 0]), { closed: true, smooth: 'catmull' });
function makeTown() {
  traffic = [];
  const cols = ['#c8c8c0', '#7a2a2a', '#2a4a7a', '#d8b040', '#3a6a3a', '#6a6a72'];
  for (let i = 0; i < 5; i++) { const path = i % 2 ? RING2 : RING; traffic.push({ path, d: path.length * i / 5, speed: 70 + i * 6, v: 0, color: cols[i], kind: i === 3 ? 'van' : 'sedan', x: 0, y: 0, ang: 0, stopT: 0, honk: 0 }); }
  peds = [];
  const loops = [[[13.4, 13.4], [35.6, 13.4], [35.6, 17.6], [13.4, 17.6]], [[39.4, 31.4], [59.6, 31.4], [59.6, 35.4], [39.4, 35.4]], [[13.4, 31.5], [35.6, 31.5], [35.6, 35.5], [13.4, 35.5]], [[63.4, 13.4], [70, 13.4], [70, 17.5], [63.4, 17.5]]];
  const looks = [{ cloth: '#3a7a8a', pants: '#3a3a4a', hair: '#8a5a2a' }, { cloth: '#c84a3a', pants: '#2a2a3a', hair: '#1a1a1a' }, { cloth: '#e8d8a0', pants: '#5a4a3a', hair: '#d8c070' }, { cloth: '#6a3a7a', pants: '#3a3a3a', hair: '#4a2a1a' }, { cloth: '#4a8a4a', pants: '#2a3a5a', hair: '#bababa' }, { cloth: '#d8a0b0', pants: '#4a4a5a', hair: '#2a1a14' }];
  for (let i = 0; i < 6; i++) {
    const pts = loops[i % loops.length].map(([x, y]) => [x * T, y * T, 0]), path = new E.Path(pts, { closed: true });
    const lk = looks[i];
    const p = actor(0, 0, { size: 1.15, build: 'heroic', weapon: null, outfit: i % 3 ? 'shirt' : 'coat', hair: i % 2 ? 'short' : 'long', sleeves: 'long', colors: Object.assign({ skin: ['#e8b890', '#c89070', '#f0c8a8', '#8a5a3a'][i % 4], boot: '#2a2a2a', coat: lk.cloth }, lk) }, { ped: true, path, d: path.length * (i / 6), dir: i % 2 ? 1 : -1, flee: 0, hp: 999, area: 'town', r: 5 });
    const at = path.at(p.d); p.x = at.x; p.y = at.y; peds.push(p);
  }
  ducks = [0, 1, 2, 3].map(makeDuck);
  ducks.forEach((d, i) => { d.x = (POOL[0] + 1 + i * 1.3) * T; d.y = (POOL[1] + 1.5 + (i % 2) * 2) * T; });
}
function updateTown(dt) {
  const hero = (heroAlive()) || { x: -9999, y: -9999, knocked: true };
  // traffic: along its loop, stopping for whatever is ahead
  for (const c of traffic) {
    c.stopT -= dt; c.honk -= dt;
    const ahead = c.path.at((c.d + 26) % c.path.length), blockers = [hero, car, ...peds, ...traffic.filter(o => o !== c)].filter(Boolean);
    const blocked = c.stopT > 0 || blockers.some(b => (b !== hero || !driving) && Math.hypot(b.x - ahead.x, b.y - ahead.y) < 18);
    c.v = approach(c.v, blocked ? 0 : c.speed, (blocked ? 260 : 60) * dt);
    if (blocked && c.v < 5 && c.honk < -3 && Math.hypot(hero.x - ahead.x, hero.y - ahead.y) < 22) { c.honk = 1; audio.sfx('horn', { vol: .4, pitch: .9 }); }
    c.d = (c.d + c.v * dt) % c.path.length;
    const p = c.path.at(c.d); c.x = p.x; c.y = p.y; c.ang = p.angle;
    // traffic hits Tony on foot
    if (!driving && c.v > 40 && hero && !hero.knocked && Math.hypot(hero.x - c.x, hero.y - c.y) < 14) { knock(hero, c, [8, 120, 120]); hero.hp -= 0; S.hp = hero.hp; audio.sfx('crash'); c.stopT = 1.5; addStress(5); }
  }
  for (const p of peds) {
    if (p.area !== A.id) continue;
    p.flee -= dt; p.stun -= dt;
    if (!p.knocked && p.stun <= 0) {
      if (p.flee > 0) { const a = Math.atan2(p.y - hero.y, p.x - hero.x); p.vx = Math.cos(a) * 70; p.vy = Math.sin(a) * 70; p.facing = a; p.expr = 'shout'; }
      else {
        p.expr = null;
        const n = p.path.nearest(p.x, p.y); p.d = n && n.d !== undefined ? n.d : p.d;
        const tgt = p.path.at((p.d + p.dir * 12 + p.path.length) % p.path.length), a = Math.atan2(tgt.y - p.y, tgt.x - p.x);
        p.vx = approach(p.vx, Math.cos(a) * 24, 200 * dt); p.vy = approach(p.vy, Math.sin(a) * 24, 200 * dt); p.facing = a;
      }
    }
    p.update(dt, map); fall(p, dt); pushOut(p, A.blockers);
    if (p.down && p.floor < .2) p.hp = 999;
    driveRig(p, dt);
  }
  // ducks paddle round the pool; fed, they come to Tony; at night they sleep under the patio umbrella
  for (const d of ducks) {
    d.t += dt; d.fed -= dt;
    const tx = d.fed > 0 ? clamp(hero.x, (POOL[0] + .5) * T, (POOL[2] + .5) * T) : (POOL[0] + 1 + (Math.sin(d.t * .3 + d.x) + 1) * 2.4) * T;
    const ty = d.fed > 0 ? clamp(hero.y, (POOL[1] + .5) * T, (POOL[3] + .5) * T) : (POOL[1] + 1 + (Math.cos(d.t * .23 + d.y * .01) + 1) * 1.6) * T;
    d.vx = approach(d.vx, clamp((tx - d.x) * .8, -18, 18), 30 * dt); d.vy = approach(d.vy, clamp((ty - d.y) * .8, -18, 18), 30 * dt);
    d.x += d.vx * dt; d.y += d.vy * dt; d.z = Math.sin(d.t * 2) * .6 + (d.fly > 0 ? 20 : 0);
    d.blob.update(dt, { walk: Math.min(1, Math.hypot(d.vx, d.vy) / 12), flap: d.fed > 2.5 ? 1 : 0, look: [Math.sign(d.vx) || 1, 0] });
    if (Math.random() < dt * .08) audio.sfx('quack', { vol: Math.max(0, .5 - E.dist(d, hero) / 400) });
  }
  if (van) { van.alert -= dt; van.sweep += dt; van.look = van.baseLook + Math.sin(van.sweep * .6) * .5; }
}
const VAN_SPOTS = { 1: null, 2: null, 3: { x: 20 * T, y: 33.9 * T, look: -Math.PI / 2 }, 4: { x: 30 * T, y: 33.4 * T, look: Math.PI / 2 }, 5: { x: 60.5 * T, y: 27 * T, look: Math.PI }, run: { x: 40 * T, y: 15.9 * T, look: Math.PI / 2 } };
function placeVan(key) {
  const s = VAN_SPOTS[key];
  van = s ? { x: s.x, y: s.y, baseLook: s.look, look: s.look, angle: 0, range: 150, alert: 0, sweep: 0, area: 'town' } : null;
}
