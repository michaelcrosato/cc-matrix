// The world: the stage's state and everything that happens on it, one fixed step at a time. Heroes, their items, specials
// and amulets, doors and trap walls, the pads, the shots, the life-force drain, the continue and the game over. The
// monsters, the hazards and the boss are in their own files and are stepped from here. Drawing reads WORLD; nothing in
// the sim touches the screen.

const WORLD = {
  index: 0, stage: null, F: null, map: null, heroes: [], monsters: [], gens: [], items: [], itemAt: new Map(),
  doors: [], doorsByCell: new Map(), shots: null, foeShots: null, flows: [], crocks: [], fields: [], spikes: [], runes: new Map(),
  pads: new Map(), plates: new Map(), fakes: new Map(), cracks: new Map(), bell: null, bellHero: null, boss: null,
  time: 0, floorClock: 0, over: false, downClock: 0, continueLeft: 0, kills: 0, puffs: [], blasts: [], events: [],
  caption: null, captionT: 0, lastSay: {}, sayAt: -10, descend: null, loop: 0, doorsOpen: false, wallStairs: false,
  titheArrived: false, hoard: null, attract: false, gameOverGone: false, torches: [], shake: 0
};

// The stage's map: the TileMap from the rows, with the realm's wall and floor looks, and the stage's entities set up.
function loadStage(index) {
  const W = WORLD;
  const stage = STAGES[index];
  W.index = index; W.stage = stage; W.time = 0; W.over = false; W.floorClock = 0; W.kills = 0;
  W.puffs = []; W.blasts = []; W.events = []; W.doorsOpen = false; W.wallStairs = false; W.titheArrived = false; W.warned = false;
  W.gameOverGone = false; W.descend = null; W.bell = null; W.bellHero = null; W.crocks = []; W.hoard = null;
  W.gens = []; W.monsters = []; W.items = []; W.itemAt = new Map(); W.doors = []; W.doorsByCell = new Map();
  W.fields = []; W.spikes = []; W.runes = new Map(); W.pads = new Map(); W.plates = new Map(); W.fakes = new Map(); W.cracks = new Map();
  W.flows = []; W.boss = null; W.keyFirst = 0; W.foodFirst = 0; W.skipStairs = []; W.descendTo = null;
  if (stage.kind === 'boss') return loadBoss(index);
  const realm = REALMS[stage.realm];
  const F = makeFloor(index);
  W.F = F;
  W.map = new E.TileMap({
    rows: floorRows(F),
    legend: { '#': 1, '+': 2, T: 4, X: 3, L: 5 },
    types: {
      1: { h: 24, top: realm.wall.top, side: realm.wall.side, cut: true, cutH: 6, face: realm.wall.face },
      2: { h: 24, top: '#6a6a78', side: '#3a3a44', cut: true, cutH: 6, face: 'plank' },
      3: { h: 24, top: '#5a4a3a', side: '#2e241a', cut: true, cutH: 6, face: realm.alt.face },
      4: { h: 24, top: realm.alt.top, side: realm.alt.side, cut: true, cutH: 6, face: 'plank' },
      5: { h: 3, top: '#ff7a20', side: '#a03a10', face: 'stone' }   // lava: low, and it glows
    },
    floorMat: realm.floor
  });
  W.doors = F.doors.concat(F.traps);
  for (const d of W.doors) { d.open = false; for (const [x, y] of d.cells) W.doorsByCell.set(x + ',' + y, d); }
  for (const [x, y] of F.fakes) W.fakes.set(x + ',' + y, { x, y, bump: 0 });
  for (const [x, y] of F.cracks) W.cracks.set(x + ',' + y, 4);
  const fieldCells = new Map();
  for (const [key, raw] of F.ents) {
    // a marker with a value: 'u:type' (a special), 'a:type' (an amulet), 'skip:N' (a skip stair to stage N)
    const colon = raw.indexOf(':'), ch = raw.startsWith('skip:') ? 'Z' : colon > 0 ? raw.slice(0, 1) : raw, sub = colon > 0 ? raw.slice(colon + 1) : null;
    const [x, y] = key.split(',').map(Number), wx = (x + .5) * T, wy = (y + .5) * T;
    if (GEN_OF_CHAR[ch]) {
      const def = GENERATORS[GEN_OF_CHAR[ch]];
      W.gens.push({ kind: GEN_OF_CHAR[ch], def, x: wx, y: wy, r: 7, hp: def.hp * TUNE.generatorHp, max: def.hp * TUNE.generatorHp, timer: def.interval * .5, children: 0, alive: true, flash: 0, shake: 0 });
    } else if (MON_OF_CHAR[ch]) {
      if (ch === 't') continue;   // the Tithe comes on its own schedule
      spawnMonster(MON_OF_CHAR[ch], wx, wy, 0, true);
    } else if (ch === 'B') {
      W.bell = { x: wx, y: wy, r: 7, alive: true, cell: key, rang: false };
    } else if (ch === 'O') {
      const partner = F.padPair.get(key);
      if (partner) { const [px, py] = partner.split(',').map(Number); W.pads.set(key, { x: (px + .5) * T, y: (py + .5) * T, cool: 0 }); }
    } else if (ch === '^') {
      // a plate opens the next trap wall that has none yet
      const trap = F.traps.find(t => !t.plate);
      if (trap) { trap.plate = key; W.plates.set(key, { used: false, group: trap }); }
    } else if (ch === '!') {
      W.runes.set(key, { x: wx, y: wy, cool: 0 });
    } else if (ch === '|') {
      fieldCells.set(key, { x: wx, y: wy });
    } else if (ch === 's') {
      W.spikes.push({ x: wx, y: wy, cell: key, phase: SIM() * 1.6, up: false, hit: false });
    } else if (raw.startsWith('skip:')) {
      W.skipStairs.push({ x: wx, y: wy, cell: key, to: +sub });
    } else if ('kl hwz$*mjbfua'.includes(ch) && ch !== ' ') {
      spawnItemAt(ch === 'u' ? 'u' : ch, wx, wy, ch === 'u' ? sub : null, ch === 'a' ? sub : null);
    }
  }
  // force fields: each run of three beam tiles is one field, on a two second cycle with its own phase
  const seen = new Set();
  for (const [key] of fieldCells) {
    if (seen.has(key)) continue;
    const [x, y] = key.split(',').map(Number);
    const cells = [[x, y], [x, y + 1], [x, y + 2]].map(([cx, cy]) => { seen.add(cx + ',' + cy); return { x: (cx + .5) * T, y: (cy + .5) * T }; });
    W.fields.push({ cells, phase: SIM() * 4, on: false });
  }
  // the treasure room: the hoard clock and the treasure to take
  if (stage.kind === 'treasure') W.hoard = { left: stage.par, total: W.items.filter(i => ['$', '*', 'w', 'h'].includes(i.ch)).length, taken: 0 };
  // the heroes stand on the starts
  let si = 0;
  for (const h of W.heroes) {
    const s = F.starts[si++ % F.starts.length];
    h.body.x = (s[0] + .5) * T; h.body.y = (s[1] + .5) * T; h.body.vx = 0; h.body.vy = 0;
    h.stair = 0; h.queasy = 0; h.cd = .4; h.melee = 0; h.stun = 0; h.bump = 0; h.wallPush = 0; h.bot = null; h.invuln = 1;
    if (h.down) { h.down = false; h.hp = TUNE.startHealth * DIFFICULTY[prefs.difficulty].startHealth; }
  }
  W.shots = new E.Bullets(game, { plane: 'ground', max: 400, sparks: true });
  W.foeShots = new E.Bullets(game, { plane: 'ground', max: 200, sparks: true });
  W.flows = [];
  W.torches = [];
  for (let y = 1; y < F.H - 1; y++) for (let x = 1; x < F.W - 1; x++) {
    if (F.g[y][x] !== '.' || F.ents.has(x + ',' + y)) continue;
    const near = F.g[y - 1][x] === '#' || F.g[y + 1][x] === '#' || F.g[y][x - 1] === '#' || F.g[y][x + 1] === '#';
    if (near && ((x * 73856093 ^ y * 19349663) >>> 0) % 13 === 0) W.torches.push([(x + .5) * T, (y + .5) * T]);
  }
  return F;
}

let SIM_STREAM = stream(20261104);
function SIM() { return SIM_STREAM(); }
function seedSim(n) { SIM_STREAM = stream(n); }

// --- helpers ---
const liveHeroes = () => WORLD.heroes.filter(h => !h.down && h.alive);
function nearestHero(x, y, maxD) {
  let best = null, bd = maxD * maxD;
  for (const h of WORLD.heroes) if (!h.down && h.alive) { const d = (h.body.x - x) ** 2 + (h.body.y - y) ** 2; if (d < bd) { bd = d; best = h; } }
  return best;
}
// The narrator: one line at a time, a tip once per game (per hero class), and a short gap between lines.
function say(key, hero, force) {
  if (!WORLD.heroes.length) return;
  if (key.indexOf('tip_') === 0 && !prefs.tips && !force) return;
  const now = WORLD.time, cls = hero ? hero.cls : null, id = key + (cls || '');
  const tip = key.indexOf('tip_') === 0;
  if (!force && WORLD.lastSay[id] && now - WORLD.lastSay[id] < (tip ? 1e9 : 6)) return;
  if (!force && now - WORLD.sayAt < 1.2) return;
  WORLD.lastSay[id] = now; WORLD.sayAt = now;
  WORLD.caption = line(key, cls); WORLD.captionT = 3.4;
  WORLD.events.push({ type: 'say', key });
  if (SAY_HOOK) SAY_HOOK(WORLD.caption, key);
}
let SAY_HOOK = null;   // the voice: set by the audio file (the Babble)
function damageHero(h, amount, by) {
  if (h.down || !h.alive || CHEATS.god || h.invuln > 0 || WORLD.attract) return;
  if (h.amulet && h.amulet.type === 'ironskin') return;
  const diff = DIFFICULTY[prefs.difficulty];
  const dmg = amount * h.def.armor * diff.monsterDamage * TUNE.monsterDamage * (h.ironbrew ? .8 : 1);
  h.hp -= dmg; h.flash = .25; h.hurt = .3;
  if (h.hp > 0) bark(h, 'OUCH!');
  if (h.hp < 200 && h.hp > 0) say('starving', h);
  if (h.hp <= 0) heroDown(h, by);
}
function heroDown(h, by) {
  h.hp = 0; h.down = true; h.downT = 0; h.stun = 0;
  say('eaten', h, true);
  game.shake(4);
  game.audio.sfx('hurt');
}
function damageMonster(m, amount, h) {
  if (!m.alive || m.kind === 'tithe' || (m.kind === 'fryar' && m.hidden)) return;
  m.hp -= amount; m.flash = .12;
  const newRank = Math.max(1, Math.ceil(m.hp / m.def.base));
  if (newRank < m.rank) { m.rank = newRank; m.shrink = .25; }
  if (m.hp <= 0) killMonster(m, h);
}
function killMonster(m, h) {
  m.alive = false; m.fade = .4; WORLD.kills++;
  if (h) { h.kills++; h.score += m.def.points * m.spawnRank; }
  if (m.gen) m.gen.children = Math.max(0, m.gen.children - 1);
  if (m.loot) spawnItemAt(m.loot.ch, m.x, m.y, m.loot.special, m.loot.amulet);
  game.hitFx(m.x, m.y, 4, { power: .6, sound: 'hit', damage: null });
  WORLD.events.push({ type: 'kill', kind: m.kind });
}
function damageGen(g, amount, h) {
  if (!g.alive) return;
  g.hp -= amount; g.flash = .15; g.shake = .2;
  if (g.hp <= 0) {
    g.alive = false; WORLD.shake = .3; game.shake(6);
    if (h) { h.score += g.def.points; h.gensBroken = (h.gensBroken || 0) + 1; }
    game.audio.sfx('explode', { vol: .6 });
    if (SIM() < .1) spawnItemAt('b', g.x, g.y);
    WORLD.events.push({ type: 'gen', kind: g.kind });
    say('tip_generator', h, false);
  }
}
function spawnItemAt(ch, x, y, special, amulet) {
  const it = { ch, def: ITEMS[ch], x, y, r: 5, alive: true, id: WORLD.items.length, bob: SIM() * 6, special: special || null, amulet: amulet || null, cell: Math.floor(x / T) + ',' + Math.floor(y / T) };
  WORLD.items.push(it); WORLD.itemAt.set(it.cell, it);
  return it;
}
function removeItem(it) {
  it.alive = false;
  if (WORLD.itemAt.get(it.cell) === it) WORLD.itemAt.delete(it.cell);
}

// --- shots ---
// A hero's shot: its kind decides the look; hexers splash, berserkers pierce, rending pierces everything, ricochet bounces.
function fireShot(h, aim) {
  const d = h.def, speed = d.shotSpeed * (h.quick ? 1.2 : 1), life = 220 / speed;
  const dmg = d.shotDmg * TUNE.shotDamage + (h.hardshot ? 1 : 0) + (h.rending ? 1 : 0);
  const c = Math.cos(aim), s = Math.sin(aim);
  WORLD.shots.fire({ x: h.body.x + c * 8, y: h.body.y + s * 8, z: 12, vx: c * speed, vy: s * speed, vz: 0, r: 3, dmg,
    life, team: 'hero', color: d.color, core: '#ffffff', pierce: !!(d.pierce || h.rending), data: { owner: h, kind: d.shot, bounces: h.ricochet ? 3 : 0 } });
  h.cd = d.cooldown / (TUNE.shotRate * (h.quick ? .75 : 1));
  h.throwT = .3;
  game.audio.sfx('hit', { vol: .2, pitch: d.shot === 'arrow' ? 1.6 : .8 });
}

// Smart melee: a non-ghost monster inside reach and roughly in front swings the hero's melee instead of a throw.
function meleeTarget(h, aim) {
  const reach = h.def.reach;
  let best = null, bd = Infinity;
  for (const m of WORLD.monsters) {
    if (!m.alive || m.kind === 'ghost' || m.kind === 'tithe' || (m.kind === 'fryar' && m.hidden)) continue;
    const dx = m.x - h.body.x, dy = m.y - h.body.y, d = Math.hypot(dx, dy);
    if (d > reach + m.r + 8) continue;
    if (Math.abs(angleDiff(aim, Math.atan2(dy, dx))) > .87) continue;
    if (d < bd) { bd = d; best = m; }
  }
  return best;
}
function doMelee(h, aim) {
  h.melee = .42; h.meleeAim = aim; h.cd = .4;
  game.audio.sfx('hit', { vol: .3, pitch: .6 });
  const reach = h.def.reach + 8, dmg = h.def.melee * TUNE.shotDamage * (h.ogre ? 1.5 : 1);
  for (const m of WORLD.monsters) {
    if (!m.alive) continue;
    const dx = m.x - h.body.x, dy = m.y - h.body.y, d = Math.hypot(dx, dy);
    if (d > reach + m.r) continue;
    if (Math.abs(angleDiff(aim, Math.atan2(dy, dx))) > 1.2) continue;
    damageMonster(m, dmg, h);
    game.hitFx(m.x, m.y, 6, { power: .8, angle: Math.atan2(dy, dx), damage: null, sound: 'hit' });
  }
  for (const g of WORLD.gens) {
    if (!g.alive) continue;
    const dx = g.x - h.body.x, dy = g.y - h.body.y, d = Math.hypot(dx, dy);
    if (d <= reach + g.r && Math.abs(angleDiff(aim, Math.atan2(dy, dx))) <= 1.2) damageGen(g, dmg, h);
  }
  for (const key of [...WORLD.cracks.keys()]) {
    const [cx, cy] = key.split(',').map(Number), dx = (cx + .5) * T - h.body.x, dy = (cy + .5) * T - h.body.y, d = Math.hypot(dx, dy);
    if (d <= reach + 8 && Math.abs(angleDiff(aim, Math.atan2(dy, dx))) <= 1.2) crackWall(key);
  }
}
function crackWall(key) {
  const hp = (WORLD.cracks.get(key) || 0) - 1;
  if (hp <= 0) {
    WORLD.cracks.delete(key);
    const [cx, cy] = key.split(',').map(Number);
    WORLD.map.set(cx, cy, 0); WORLD.map.version = (WORLD.map.version || 0) + 1;
    game.audio.sfx('explode', { vol: .4, pitch: 1.6 });
    game.shake(4);
    if (SIM() < .5) spawnItemAt('b', (cx + .5) * T, (cy + .5) * T);
    say('tip_secret', null, false);
  } else WORLD.cracks.set(key, hp);
}

// Magic: a flask strikes every monster and generator on the user's screen (a rectangle about the hero). The Tithe dies
// to it, and so does nothing else that is immune to shots.
function useMagic(h) {
  if (h.flasks <= 0 && !CHEATS.infinite) return false;
  if (!CHEATS.infinite) h.flasks--;
  const power = TUNE.magicPower * h.def.magic * (h.witchwater ? 1.5 : 1), rad = 180;
  let n = 0;
  for (const m of WORLD.monsters) {
    if (!m.alive || Math.abs(m.x - h.body.x) > rad || Math.abs(m.y - h.body.y) > rad * .8) continue;
    n++;
    if (m.kind === 'tithe') { killTithe(m, h); continue; }
    if (m.kind === 'fryar') m.hidden = false;
    damageMonster(m, Math.ceil(4 * power), h);
  }
  for (const g of WORLD.gens) if (g.alive && Math.abs(g.x - h.body.x) < rad && Math.abs(g.y - h.body.y) < rad * .8) damageGen(g, Math.ceil(2 * h.def.magicGen * TUNE.magicPower), h);
  if (WORLD.boss && WORLD.boss.alive && Math.abs(WORLD.boss.x - h.body.x) < rad && Math.abs(WORLD.boss.y - h.body.y) < rad * .8) bossFlask(h);
  game.flash('#ffffff', .18, .9); game.shake(8); game.audio.sfx('boom', { vol: .6 });
  WORLD.blasts.push({ x: h.body.x, y: h.body.y, t: 0, color: h.color });
  say('tip_magic', h);
  return n;
}
function killTithe(m, h) {
  m.alive = false; m.fade = .4; WORLD.kills++;
  if (h) { h.kills++; h.score += 1000 * (1 + Math.floor(SIM() * 5)); }
  say('tithe_slain', h, true);
  game.hitFx(m.x, m.y, 8, { power: 1, damage: null, sound: 'explode' });
}

// Items under a hero: food, keys, flasks, treasure, locked chests, specials, amulets and the Gauntlet.
function pickupItems(h) {
  const cx = Math.floor(h.body.x / T), cy = Math.floor(h.body.y / T);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const it = WORLD.itemAt.get((cx + dx) + ',' + (cy + dy));
    if (!it || !it.alive) continue;
    if (Math.hypot(it.x - h.body.x, it.y - h.body.y) > 9) continue;
    const d = it.def;
    if (d.key) { if (h.keys >= 9) continue; h.keys++; if (!WORLD.keyFirst) { WORLD.keyFirst = 1; say('key_first', h); } }
    else if (d.flask) { if (h.flasks >= (h.deepPockets ? 12 : 9)) continue; h.flasks++; }
    else if (d.lock) {
      if (h.keys <= 0 && !CHEATS.infinite) continue;
      if (!CHEATS.infinite) h.keys--;
      spawnItemAt(['m', 'f', 'k'][Math.floor(SIM() * 3)], it.x, it.y);
    }
    else if (it.special) {
      if (h.specials.includes(it.special)) continue;
      h.specials.push(it.special);
      applySpecial(h, it.special);
    }
    else if (it.amulet) applyAmulet(h, it.amulet);
    else if (d.gauntlet) { h.gauntlet = true; WORLD.events.push({ type: 'gauntlet', by: h }); }
    if (d.heal > 0) { h.hp += d.heal * TUNE.foodHeal; h.eaten = (h.eaten || 0) + 1; h.foodScore = (h.foodScore || 0) + d.heal; game.audio.sfx('coin', { pitch: .7, vol: .3 }); }
    if (d.queasy) { h.queasy = d.queasy; h.hp += d.heal * TUNE.foodHeal; say('ate_stew', h); }
    if (d.points && !d.lock) h.score += d.points;
    if (['w', 'h', '*', '$'].includes(it.ch) && WORLD.hoard) { WORLD.hoard.taken++; if (WORLD.hoard.taken >= WORLD.hoard.total && WORLD.hoard.total > 0) { h.score += 2000; WORLD.hoard.total = -1; say('hoard', h, true); } }
    if (it.ch === 'h') { game.audio.sfx('powerup'); say('treasure_first', h); }
    if (it.ch === 'f' || it.ch === 'b') { if (!WORLD.foodFirst) { WORLD.foodFirst = 1; say('tip_food', h); } }
    if (it.ch === 'k') game.audio.sfx('powerup', { pitch: 1.4, vol: .4 });
    removeItem(it);
    WORLD.events.push({ type: 'pickup', ch: it.ch });
  }
}
function applySpecial(h, type) {
  const flag = { ironbrew: 'ironbrew', ogreale: 'ogre', quickshot: 'quick', hardshot: 'hardshot', witchwater: 'witchwater', featherfoot: 'swift', deeppockets: 'deepPockets' }[type];
  h[flag] = true;
  say('special_' + type, h, true);
  game.audio.sfx('powerup');
}
function applyAmulet(h, type) {
  h.amulet = { type, t: AMULETS[type].secs };
  h.ricochet = type === 'ricochet';
  h.rending = type === 'rending';
  say('amulet_' + type, h, true);
  game.audio.sfx('powerup', { pitch: 1.2 });
}

// Doors: a hero with a key next to a closed door opens its whole run, and one key is used.
function openDoors(h) {
  if (h.keys <= 0 && !CHEATS.infinite && !WORLD.doorsOpen) return;
  const cx = Math.floor(h.body.x / T), cy = Math.floor(h.body.y / T);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const d = WORLD.doorsByCell.get((cx + dx) + ',' + (cy + dy));
    if (!d || d.open || d.plate !== null && d.plate !== undefined) continue;
    if (!d.cells.some(([x, y]) => x === cx + dx && y === cy + dy) || d.trap) continue;
    if (!CHEATS.infinite && !WORLD.doorsOpen) { if (h.keys <= 0) continue; h.keys--; }
    openDoorGroup(d);
    say('tip_door', h);
  }
}
function openDoorGroup(d) {
  d.open = true;
  for (const [x, y] of d.cells) WORLD.map.set(x, y, 0);
  WORLD.map.version = (WORLD.map.version || 0) + 1;
  game.audio.sfx('hit', { vol: .4, pitch: .5 });
  WORLD.events.push({ type: 'door' });
}

// Step everything on the stage by dt. `intents` is an array of { hero, intent } from the controllers.
function stepWorld(dt, intents) {
  const W = WORLD, map = W.map;
  if (!map || W.over) return;
  W.time += dt; W.floorClock += dt;
  W.blasts = W.blasts.filter(b => (b.t += dt) < .6);
  if (W.caption && (W.captionT -= dt) <= 0) W.caption = null;
  W.shake = Math.max(0, W.shake - dt);
  // the impatient Gaunt: at 2:30 a warning, at 3:00 the doors open, at 4:00 every wall is a way down
  if (W.stage.kind === 'floor') {
    if (!W.warned && W.floorClock > 150) { W.warned = true; say('impatient', null, true); }
    if (!W.doorsOpen && W.floorClock > 180) { W.doorsOpen = true; for (const d of W.doors) if (!d.open && !d.trap) openDoorGroup(d); say('doors_open', null, true); }
    if (!W.wallStairs && W.floorClock > 240) { W.wallStairs = true; say('walls_stairs', null, true); }
    // from floor five on, the Tithe comes at two minutes if none is on the floor
    if (!W.titheArrived && W.index >= 4 && !W.monsters.some(m => m.kind === 'tithe' && m.alive) && W.floorClock > 120) {
      W.titheArrived = true; say('tithe_comes', null, true); spawnMonster('tithe', (W.F.stairs[0] + .5) * T, (W.F.stairs[1] + .5) * T, 1, true);
    }
  }
  // the hoard clock (the treasure rooms)
  if (W.hoard && W.hoard.left > 0) {
    W.hoard.left -= dt;
    if (W.hoard.left <= 0) { W.hoard.left = 0; say('hoard_shut', null, true); W.descend = liveHeroes()[0] || W.heroes[0]; }
  }
  const alive = liveHeroes();
  // heroes
  for (const h of W.heroes) {
    h.cd = Math.max(0, h.cd - dt); h.melee = Math.max(0, h.melee - dt); h.invuln = Math.max(0, h.invuln - dt);
    h.flash = Math.max(0, h.flash - dt); h.hurt = Math.max(0, h.hurt - dt); h.throwT = Math.max(0, h.throwT - dt);
    h.queasy = Math.max(0, h.queasy - dt); h.stun = Math.max(0, h.stun - dt); h.rune = Math.max(0, h.rune - dt);
    if (h.amulet) { h.amulet.t -= dt; if (h.amulet.t <= 0) { h.amulet = null; h.ricochet = false; h.rending = false; } }
    if (h.down) { h.downT += dt; continue; }
    if (!h.alive) continue;
    const I = intents.find(x => x.hero === h);
    const it = I ? I.intent : { move: [0, 0] };
    const diff = DIFFICULTY[prefs.difficulty];
    const speed = h.def.speed * TUNE.heroSpeed * (h.queasy > 0 ? .6 : 1) * (h.swift ? 1.12 : 1);
    let mx = it.move[0], my = it.move[1];
    const l = Math.hypot(mx, my); if (l > 1) { mx /= l; my /= l; }
    if (it.plant || h.stun > 0) { mx = 0; my = 0; }
    h.body.vx = mx * speed; h.body.vy = my * speed;
    h.body.update(dt, map);
    if (l > .2 && !it.plant && h.stun <= 0) h.facing = Math.atan2(my, mx);
    const aim = it.aim != null ? it.aim : h.facing;
    if (it.aim != null) h.facing = it.aim;
    h.moved = Math.hypot(h.body.vx, h.body.vy);
    if (h.stun <= 0 && it.fire && h.cd <= 0) {
      if (meleeTarget(h, aim)) doMelee(h, aim);
      else fireShot(h, aim);
    }
    if (h.stun <= 0 && it.magic) useMagic(h);
    // life force
    if (!CHEATS.god && !W.attract) h.hp -= TUNE.drain * diff.drain * dt * (h.ironbrew ? .8 : 1) * (W.loop ? 1.5 : 1);
    if (h.hp < 400 && h.hp > 0) say('fading', h);
    if (h.hp <= 0) heroDown(h, null);
    pickupItems(h);
    openDoors(h);
    const hx = Math.floor(h.body.x / T), hy = Math.floor(h.body.y / T), k = hx + ',' + hy;
    // a fake wall: pushing into it for half a second reveals it
    if (h.body.hitWall && mx * mx + my * my > .01) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const fk = (hx + dx) + ',' + (hy + dy), f = W.fakes.get(fk);
        if (f) { f.bump += dt; if (f.bump > .5) { W.fakes.delete(fk); map.set(f.x, f.y, 0); map.version = (map.version || 0) + 1; say('tip_secret', h); } }
      }
      // with the impatient Gaunt, pushing into any wall for a second is a way down
      if (W.wallStairs) { h.wallPush += dt; if (h.wallPush > 1) W.descend = h; }
    } else h.wallPush = 0;
    // the stairs: stand on them for the hold and everyone goes down (the treasure rooms end on their clock instead);
    // a skip stair goes down to a later stage
    h.onStairs = W.F && hx === W.F.stairs[0] && hy === W.F.stairs[1];
    const skip = W.skipStairs.find(s => Math.floor(s.x / T) === hx && Math.floor(s.y / T) === hy);
    if (skip) { h.stair = Math.min(TUNE.stairHold, h.stair + dt); if (h.stair >= TUNE.stairHold) { W.descend = h; W.descendTo = skip.to; say('skip', h, true); } }
    else if (h.onStairs && W.stage.kind !== 'treasure') { h.stair = Math.min(TUNE.stairHold * diff.drain, h.stair + dt); if (h.stair >= TUNE.stairHold) W.descend = h; }
    else h.stair = 0;
    // a transporter pad sends the hero to its partner
    const pad = W.pads.get(k);
    if (pad && pad.cool <= 0) {
      const other = W.pads.get(W.F.padPair.get(k));
      if (other) { h.body.x = other.x; h.body.y = other.y; other.cool = .6; pad.cool = .6; h.invuln = .5; say('tip_tele', h); game.audio.sfx('powerup', { pitch: .6 }); }
    }
    // a plate opens its trap wall
    const plate = W.plates.get(k);
    if (plate && !plate.used) {
      plate.used = true; plate.group.open = true;
      for (const [x, y] of plate.group.cells) map.set(x, y, 0);
      map.version = (map.version || 0) + 1; game.shake(3); game.audio.sfx('explode', { vol: .4, pitch: .5 }); say('tip_trap', h);
    }
    // a stun rune: stunned for 0.8 s, then immune for a while
    const rune = W.runes.get(k);
    if (rune && rune.cool <= 0 && h.rune <= 0) { h.stun = .8; h.rune = 2.3; rune.cool = 2.3; say('tip_stun', h); game.audio.sfx('zap', { vol: .4 }); }
  }
  for (const r of W.runes.values()) r.cool = Math.max(0, r.cool - dt);
  for (const p of W.pads.values()) p.cool = Math.max(0, p.cool - dt);
  // a fallen hero rises when a player presses fire near it
  const pressing = intents.filter(x => x.hero.input && x.intent.fire && !x.hero.down).map(x => x.hero);
  for (const h of W.heroes) if (h.down && pressing.some(p => Math.hypot(p.body.x - h.body.x, p.body.y - h.body.y) < 26)) rise(h);
  // all down: the continue countdown; fire (any player) rises everybody, else game over
  if (alive.length === 0 && W.heroes.length) {
    W.downClock += dt;
    W.continueLeft = Math.max(0, 10 - W.downClock);
    const anyFire = intents.some(x => x.hero.input && x.intent.fire);
    if (anyFire && W.downClock > .4) { for (const h of W.heroes) rise(h, true); W.downClock = 0; }
    else if (W.continueLeft <= 0) W.over = true;
  } else W.downClock = 0;
  // the stage's own parts
  stepFeatures(dt);
  stepMonsters(dt);
  stepGenerators(dt);
  stepShots(dt);
  if (W.boss) stepBoss(dt);
  W.puffs = W.puffs.filter(p => (p.t += dt) < p.life);
}

function rise(h, all) {
  if (!h.down && !all) return;
  h.down = false; h.hp = TUNE.startHealth * DIFFICULTY[prefs.difficulty].startHealth; h.invuln = 1.2; h.downT = 0;
  if (!all) h.continues = (h.continues || 0) + 1;
  say('rise', h, true);
  game.audio.sfx('powerup', { vol: .5 });
}

// Creates a hero for a run: one per joined player, with their class.
function makeHero(index, cls, input) {
  const def = HEROES[cls];
  const body = new E.Body({ x: 0, y: 0, r: 5 });
  body.gravity = 0; body.friction = 0;
  const diff = DIFFICULTY[prefs.difficulty];
  return {
    i: index, cls, def, input, body, rig: def.rig(), name: input && input.name || ('P' + (index + 1)),
    color: def.color, hp: TUNE.startHealth * diff.startHealth, score: 0, keys: 0, flasks: 0, kills: 0, treasure: 0,
    down: false, alive: true, cd: 0, melee: 0, throwT: 0, flash: 0, hurt: 0, invuln: 0, facing: 0, stair: 0,
    queasy: 0, stun: 0, rune: 0, continues: 0, foodScore: 0, eaten: 0, gensBroken: 0, specials: [], amulet: null,
    quick: false, hardshot: false, ironbrew: false, swift: false, ogre: false, witchwater: false, rending: false,
    ricochet: false, deepPockets: false, downT: 0, onStairs: false, bump: 0, wallPush: 0, bot: null
  };
}

// The descent's bonus for the hero on the stairs: five points for each second under the stage's par.
function stairBonus(h) {
  const par = WORLD.stage.par || 120, left = Math.max(0, par - WORLD.floorClock);
  return 500 + Math.floor(left * 5);
}
