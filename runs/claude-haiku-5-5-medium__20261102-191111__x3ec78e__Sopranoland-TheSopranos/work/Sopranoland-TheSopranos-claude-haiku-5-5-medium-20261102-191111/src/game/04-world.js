// ---------------------------------------------------------------------------------------------
// 04 · WORLD — the town and the story's rules: the hero's walk, bat, pistol and dodge; the
// people and their fights; the pickups; the chapters and the interactions. The world is built
// once a run starts. A death rebuilds the chapter's fights at its checkpoint. Input comes from
// game.input or, in the attract mode, from the AI pad (08); the hub's ghosts are drawn by 09.
// ---------------------------------------------------------------------------------------------
const SPR = {
  duck: E.sprite(['..yy....', '.yYYy...', 'yYYYYyy.', 'yYYYYYYy', '.yyyyyy.', '..yyyy..'], { y: '#f2d24a', Y: '#fff2a0' }, 2),
  cannoli: E.sprite(['..ww..', '.wWWw.', 'wWsWWw', '.wWWw.', '..ww..'], { w: '#e8c890', W: '#f6e6c0', s: '#b07840' }, 2),
  ammo: E.sprite(['.bb.', 'bBBb', 'bBBb', '.bb.'], { b: '#8a6a2a', B: '#d8a84a' }, 2),
};

let W = null;   // the live world (map, hero, people, pickups, flags). Set by buildWorld().

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angleDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const centerOf = cell => { const c = W.map.center(cell[0], cell[1]); return { x: c[0], y: c[1] }; };
const sfx = (name, o) => game.audio.sfx(name, o);

function buildWorld() {
  const floorTex = (x, y, tag) => tag === 'grass' ? E.tex.grass(x, y)
    : tag === 'road' || tag === 'yard' ? E.tex.dirt(x, y)
    : tag === 'water' ? E.tex.water(x, y)
    : E.tex.flagstone(x, y, { stones: ['#7a6a5a', '8a7a6a'].map(E.hex), mortar: E.hex('#4a3e36'), hi: E.hex('#9a8a7a'), lo: E.hex('#5a4a40'), speck: E.hex('#3a302a') });
  const map = new E.TileMap({ rows: buildTownRows(), legend: TOWN_LEGEND, types: TOWN_TYPES, floorTex });
  for (const [id, x, y, o] of DRESS) map.solid(id, x * 16 + 8, y * 16 + 8, 0, o);
  W = {
    map, flow: new E.FlowField(map), flowT: 0,
    hero: null, heroRig: makeHeroRig(), shots: new E.Bullets(game, { plane: 'ground', max: 240, sparks: true }),
    foes: [], boss: null, combo: null, shotCool: 0, panicT: 0, yardOn: false, feds: 0, fedT: 4,
    toast: null, toastT: 0, ctl: game.input, aim: null, frozen: false,
    npcs: {}, ducks: [], cannoli: [], ammo: [], civs: [],
  };
  W.hero = makeHero(centerOf(START_CELL));
  W.hero.iframes = 0;
  // the people who talk: each has a rig and a place. Vashti is in the session room, not on the street.
  for (const k of Object.keys(NPC_DEFS)) {
    if (k === 'vashti') continue;
    const d = NPC_DEFS[k], p = centerOf(d.cell);
    W.npcs[k] = { key: k, def: d, x: p.x, y: p.y, rig: makeNPCRig(d) };
  }
  W.ducks = DUCKS.map(c => Object.assign(centerOf(c), { taken: false }));
  W.cannoli = CANNOLI.map(c => Object.assign(centerOf(c), { taken: false }));
  W.ammo = AMMO.map(c => Object.assign(centerOf(c), { taken: false }));
  for (const c of CIVILIANS) { const p = centerOf(c); W.civs.push(new Foe('civ', LOOKS.civ, p)); }
  W.foes.push(...W.civs);
  W.combo = newCombo();
  return W;
}
function newCombo() { return new E.Combo(['backslash', 'overhead', 'thrust'], { window: .4 }); }

// The hero's own controls: the stick through the player's inversions, the buttons from game.input.
const PLAYER_MOVE = Object.create(game.input, { move: { value: () => stickMove(game.input) } });

// Put the hero at the chapter's checkpoint, and the chapter's fights back in place.
function setChapter(n, o = {}) {
  S.chapter = n;
  const p = centerOf(CHECKPOINT[n]);
  Object.assign(W.hero, { x: p.x, y: p.y, vx: 0, vy: 0, z: 0, onGround: true, wall: null, action: null });
  W.hero.lastSafe = { x: p.x, y: p.y, z: 0 };
  W.foes = W.civs.slice();
  W.boss = null; W.yardOn = false; W.feds = 0; W.fedT = 4;
  W.combo = newCombo();
  if (n === 5) S.heat = Math.max(S.heat, 80);
  if (!o.quiet) toast(CHAPTERS[n].title + '  •  ' + CHAPTERS[n].goal);
}
function toast(text) { W.toast = text; W.toastT = 4.5; }

function spawnFoe(kind, look, cell, o = {}) {
  const f = new Foe(kind, look, centerOf(cell), o);
  W.foes.push(f);
  return f;
}
function spawnYard() {
  spawnFoe('crew', LOOKS.benny, [36, 28], { name: 'BENNY' });
  spawnFoe('crew', LOOKS.richie, [39, 33], { name: 'RICHIE' });
  spawnFoe('crew', LOOKS.frankie, [35, 34], { name: 'FRANKIE' });
  W.boss = spawnFoe('boss', LOOKS.gus, [38, 30], { name: 'GUS' });
  W.yardOn = true;
}
function spawnFed() {
  const west = Math.random() < .5;
  const f = spawnFoe('fed', LOOKS.fed, west ? [1, 19] : [58, 20], { name: 'AGENT' });
  f.alert = 4; W.feds++;
  return f;
}

// ---- the hero's life -------------------------------------------------------------------------
function hurtHero(n) {
  const hero = W.hero;
  if (hero.iframes > 0 || S.done || W.god) return;
  const guard = !!W.ctl.down('block');
  const dmg = n * (guard ? .3 : 1);
  S.hp = Math.max(0, S.hp - dmg);
  S.stress = Math.min(100, S.stress + n * .4);
  hero.iframes = .5;
  game.shake(3 + n / 4);
  game.hitFx(hero.x, hero.y, hero.z + 18, { power: .6, damage: Math.round(dmg), sound: guard ? 'select' : 'hurt' });
  if (S.hp <= 0) heroDown();
}

function heroDown() {
  S.deaths++;
  S.stress = Math.min(100, S.stress + 20);
  S.hp = 70;
  setChapter(S.chapter, { quiet: true });
  game.flash('#000000', .4, .8);
  startConv('downed', null);
}

function hurtFoe(f, n, how) {
  if (f.dead) return;
  f.takeHit(n, W.hero);
  E.knockback(W.hero, f, how === 'shot' ? 40 : 90);
  game.hitFx(f.x, f.y, f.z + 18, { power: how === 'shot' ? .8 : 1, damage: Math.round(n), sound: how === 'shot' ? 'hit' : 'punch' });
  if (f.kind === 'civ') {
    S.heat = Math.min(100, S.heat + 12);
    for (const o of W.civs) o.flee = 6;
    sfx('hurt');
  }
  if (f.boss && !f.phase2 && f.hp < f.maxHp / 2) { f.phase2 = true; toast('GUS IS MAD NOW'); }
  if (f.dead) {
    if (f.kind !== 'civ') S.kills++;
    sfx('die');
    if (f.kind === 'fed') W.feds = Math.max(0, W.feds - 1);
    if (f.boss) bossDown();
  }
}

function bossDown() {
  if (S.bossDown) return;
  S.bossDown = true;
  toast('GUS IS DOWN. THE FEDS ARE COMING.');
  if (S.chapter === 4) {
    setChapter(5, { quiet: true });
    toast(CHAPTERS[5].title + '  •  ' + CHAPTERS[5].goal);
    startConv('feds', null);
  }
}

// a Fed that sees the hero makes the heat rise
function spotted(f, dt) {
  if (f.kind === 'fed') S.heat = Math.min(100, S.heat + 6 * dt);
}
function anyFedSees() { return W.foes.some(f => !f.dead && f.kind === 'fed' && f.alert > 0); }

// ---- the step --------------------------------------------------------------------------------
// ctl: the buttons to read (game.input, or the AI pad). walk: the Mover's controls (PLAYER_MOVE, or the AI's intent).
function worldStep(dt, ctl, walk) {
  W.ctl = ctl;
  const hero = W.hero, map = W.map;
  S.playTime += dt;
  if (W.toastT > 0) { W.toastT -= dt; if (W.toastT <= 0) W.toast = null; }
  hero.iframes = Math.max(0, hero.iframes - dt);
  const frozen = W.frozen;
  // walking, jumping and climbing: the Mover keeps out of the walls and up the small ledges
  if (!frozen) {
    hero.update(dt, map, walk);
    if (walk === PLAYER_MOVE && ctl.pressed('dodge')) hero.dodge();
  }
  // the bat: a combo, one press a swing, hitting each foe once a swing
  const combo = W.combo;
  if (!frozen && W.panicT <= 0 && ctl.pressed('attack') && !combo.busy) combo.press();
  if (combo.busy) {
    combo.update(dt);
    combo.hits(W.foes.filter(f => !f.dead), f => E.inArc(hero, hero.facing, f, 24, 1.25, 22), f => hurtFoe(f, 16, 'melee'));
  }
  // the pistol: where the mouse points, or else the nearest foe in front
  W.shotCool = Math.max(0, W.shotCool - dt);
  if (!frozen && W.panicT <= 0 && ctl.pressed('use') && W.shotCool <= 0 && S.ammo > 0) fire();
  W.shots.update(dt, map);
  W.shots.hit(W.foes.filter(f => !f.dead), (b, f) => hurtFoe(f, b.dmg, 'shot'), 'player');
  W.shots.hit([hero], b => hurtHero(b.dmg), 'enemy');
  // the people
  for (const f of W.foes) {
    if (f.dead && f.dieT > 3) continue;
    if (frozen) { f.rig.update(dt, f.rigState(f.dead ? 'die' : null)); continue; }
    f.act(dt, { hero, map, flow: W.flow, shots: W.shots, world: WORLD });
  }
  W.foes = W.foes.filter(f => !(f.dead && f.dieT > 3));
  W.flowT -= dt;
  if (W.flowT <= 0) { W.flow.update(hero.x, hero.y); W.flowT = .3; }
  for (const k of Object.keys(W.npcs)) {
    const n = W.npcs[k];
    n.rig.update(dt, { x: n.x, y: n.y, z: 0, vx: 0, vy: 0, facing: Math.atan2(hero.y - n.y, hero.x - n.x) });
  }
  // pickups: a cannoli heals and calms; shells; a duck in the pool (a side collection)
  for (const p of W.cannoli) if (!p.taken && E.dist(hero, p) < 14) { p.taken = true; S.hp = Math.min(100, S.hp + 25); S.stress = Math.max(0, S.stress - 10); S.cannoli++; sfx('pickup'); toast('A CANNOLI. ONE FOR THE ROAD.'); }
  for (const p of W.ammo) if (!p.taken && E.dist(hero, p) < 14) { p.taken = true; S.ammo += 8; sfx('pickup'); toast('+8 SHELLS'); }
  for (const p of W.ducks) if (!p.taken && E.dist(hero, p) < 22) { p.taken = true; S.ducks++; sfx('coin'); toast('A DUCK. THE POOL IS OPEN.'); }
  chapterStep(dt);
  if (!frozen && !talk.open && ctl.pressed('interact')) {
    const it = nearestInteractable();
    if (it) it.use();
  }
  // the stress: a hot Fed raises it, a quiet street lowers it. At 100 it is a panic attack.
  S.stress = clamp(S.stress + (S.heat > 50 ? 1.2 : -1.2) * dt, 0, 100);
  if (S.stress >= 100 && W.panicT <= 0) { W.panicT = 3; S.stress = 100; toast('PANIC. BREATHE.'); sfx('cancel'); }
  if (W.panicT > 0) { W.panicT -= dt; if (W.panicT <= 0) { W.panicT = 0; S.stress = 60; } }
  S.heat = Math.max(0, S.heat - (anyFedSees() ? 0 : 2.5) * dt);
  // the look: the rigs take their pose from the bodies and the blows
  const extra = combo.busy ? { attack: combo.state } : {};
  if (ctl.down('block')) extra.pose = 'guard';
  W.heroRig.update(dt, hero.rigState(extra));
  // where the mouse points on the ground, when it's the device in use (the pistol's aim)
  W.aim = null;
  if (game.input.lastDevice === 'mouse') W.aim = game.mouseGround ? game.mouseGround() : null;
  hubTick(dt);
}

function fire() {
  const hero = W.hero;
  let ang = hero.facing;
  if (W.aim) ang = Math.atan2(W.aim[1] - hero.y, W.aim[0] - hero.x);
  else {
    let best = null, bd = 170;
    for (const f of W.foes) {
      if (f.dead || f.kind === 'civ') continue;
      const d = E.dist(hero, f), a = Math.atan2(f.y - hero.y, f.x - hero.x);
      if (d < bd && angleDiff(a, hero.facing) < .8) { best = f; bd = d; }
    }
    if (best) ang = Math.atan2(best.y - hero.y, best.x - hero.x);
  }
  W.shots.fire({ x: hero.x + Math.cos(ang) * 6, y: hero.y + Math.sin(ang) * 6, z: hero.z + 14, vx: Math.cos(ang) * 320, vy: Math.sin(ang) * 320, vz: 0, r: 2, team: 'player', color: '#ffd36a', life: 1, dmg: 30, core: true });
  hero.facing = ang;
  S.ammo--; W.shotCool = .32;
  sfx('shoot');
  game.shake(1.5);
}

// ---- the things the hero can use -------------------------------------------------------------
function interactables() {
  const out = [];
  const add = (id, cell, label, use, r = 24) => { const p = centerOf(cell); out.push({ id, x: p.x, y: p.y, label, use, r }); };
  if (S.chapter === 1) {
    if (!S.got.ricci) add('ricci', NPC_DEFS.ricci.cell, 'Sal Ricci', () => collect('ricci', 800));
    if (!S.got.dorothy) add('dorothy', NPC_DEFS.dorothy.cell, 'Dorothy', () => collect('dorothy', 450));
    if (!S.got.tina) add('tina', NPC_DEFS.tina.cell, 'Tina', () => collect('tina', 1500));
  }
  if (S.chapter === 2) add('lou', NPC_DEFS.lou.cell, 'Big Lou', () => startConv('lou', () => { S.lou = true; setChapter(3); }));
  if (S.chapter === 3) add('vashti', [27, 23], 'Dr. Vashti\'s door', () => game.go('session', { from: ATTRACT ? 'attract' : 'play' }));
  if (S.chapter === 5 && !S.done) add('home', [8, 13], 'Ma\'s house', () => startConv('home', () => finish()), 26);
  return out;
}
function nearestInteractable() {
  let best = null, bd = Infinity;
  for (const it of interactables()) { const d = Math.hypot(it.x - W.hero.x, it.y - W.hero.y); if (d < it.r && d < bd) { best = it; bd = d; } }
  return best;
}
function collect(key, cash) {
  S.got[key] = true; S.cash += cash;
  sfx('coin');
  toast('+$' + cash + ' from ' + SPEAKER_NAMES[key]);
  startConv(key, () => {
    if (S.got.ricci && S.got.dorothy && S.got.tina) { setChapter(2); }
  });
}

// ---- the chapters ----------------------------------------------------------------------------
function chapterStep(dt) {
  const hero = W.hero;
  if (S.chapter === 4 && !S.bossDown && !W.yardOn && zoneAt(hero.x, hero.y) === 'yard') {
    spawnYard();
    startConv('gus', null);
    toast('THE YARD  •  PUT GUS DOWN');
  }
  if (S.chapter === 5 && !S.done) {
    W.fedT -= dt;
    const alive = W.foes.filter(f => f.kind === 'fed' && !f.dead).length;
    if (W.fedT <= 0 && alive < (S.heat > 60 ? 5 : 3)) { spawnFed(); W.fedT = 5; }
  }
  if (S.chapter === 4 && W.boss && W.boss.dead) bossDown();
}

function finish() {
  if (S.done) return;
  S.done = true;
  sfx('powerup');
  if (HUB) {
    HUB.result({ time: Math.max(1, Math.round(HUB.time())), stats: { deaths: S.deaths, kills: S.kills, cash: S.cash }, awards: awardsFor() });
    toast('ROUND COMPLETE. WAITING ON THE OTHERS.');
    W.frozen = true;
  } else if (!ATTRACT) {
    game.go('end', { won: true });   // (the attract demo ends on its own: the attract scene goes back to the title)
  }
}
function awardsFor() {
  const out = [];
  if (S.deaths === 0) out.push({ title: 'Never went down', detail: 'Finished without a death.' });
  if (S.ducks >= DUCKS.length) out.push({ title: 'Ducks in the pool', detail: 'Found all the ducks.' });
  return out;
}
// The run's progress as one number (the hub's scoreboard, and the time-up result)
function scoreNow() { return S.cash + S.respect * 100 + S.kills * 50 + S.ducks * 200 + (S.chapter - 1) * 500; }

// ---- drawing ----------------------------------------------------------------------------------
function drawWorld(r) {
  const hero = W.hero, map = W.map;
  map.drawFloor(r);
  for (const p of W.ducks) if (!p.taken) r.sprite(p.x, p.y, 4 + Math.sin(game.time * 2 + p.x) * .6, SPR.duck, { anchor: 'bottom' });
  for (const [name, cx, cy, o] of PROPS) r.prop(name, cx * 16 + 8, cy * 16 + 8, 0, Object.assign({ size: 1.2 }, o));
  for (const [id, cx, cy, o] of DRESS) r.shape(id, cx * 16 + 8, cy * 16 + 8, 0, o);
  map.queueWalls(r);
  for (const p of W.cannoli) if (!p.taken) { r.sprite(p.x, p.y, 8 + Math.sin(game.time * 3) * 1.2, SPR.cannoli, { glow: .3 }); game.lights.add(p.x, p.y, 10, 22, .4, { color: '#ffd9a0' }); }
  for (const p of W.ammo) if (!p.taken) r.sprite(p.x, p.y, 6, SPR.ammo, { glow: .2 });
  const near = nearestInteractable();
  for (const k of Object.keys(W.npcs)) {
    const n = W.npcs[k];
    r.shadow(n.x, n.y, 5, .35, undefined, 0);
    r.actor(n.x, n.y, 0, (g, ox, oy) => n.rig.draw(g, ox, oy, r.view));
    r.textAt(n.x, n.y, 44, SPEAKER_NAMES[k], near && near.id === k ? '#ffe08a' : '#e8e0f0', { outline: true });
  }
  for (const f of W.foes) {
    if (f.dead && f.dieT > 2.5) continue;
    const alpha = f.dead ? clamp(1 - (f.dieT - 2.5) * 2, 0, 1) : 1;
    r.shadow(f.x, f.y, 5, .35, undefined, 0);
    r.actor(f.x, f.y, f.z, (g, ox, oy) => f.rig.draw(g, ox, oy, r.view), { flash: f.flash > 0 ? '#ff5050' : false, alpha });
    if (!f.dead && f.kind !== 'civ' && (f.alert > 0 || f.boss)) r.textAt(f.x, f.y, 46, f.name, f.boss ? '#ffb040' : '#e8e0f0', { outline: true });
  }
  r.shadow(hero.x, hero.y, 6, .4, undefined, 0);
  r.actor(hero.x, hero.y, hero.z, (g, ox, oy) => W.heroRig.draw(g, ox, oy, r.view), { flash: hero.iframes > .3 ? '#ff5050' : false, flashMix: .4 });
  W.shots.draw(r);
  drawGhosts(r);
  if (S.chapter === 5 && !S.done) { const h = centerOf([8, 13]); game.lights.add(h.x, h.y, 16, 36, .6, { color: '#ffd090' }); }
  if (near && !S.done) game.lights.add(near.x, near.y, 14, 26, .5, { color: '#ffe08a' });
}

// the world's callbacks for the people (their hits and sounds)
const WORLD = {
  hurtHero: (n, from) => hurtHero(n, from),
  spotted: (f, dt) => spotted(f, dt),
  sfx: (name) => sfx(name),
};
