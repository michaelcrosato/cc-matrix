// King Famish, on the banquet floor. Three phases by his health. Phase one (100 to 70 percent): he stays on his throne and
// throws fans of plates, and stomps when a hero comes near. Phase two (70 to 35): he walks to the nearest platter and eats
// it, healing while he does; each platter a hero shoots or takes denies him, and gnasher waves come in from the doors.
// Phase three (under 35): his ribcage opens (shots from the front deal double), he charges along a straight line after a
// telegraph, breathes a fog that triples the drain, and each flask takes six percent of his health. Defeat drops the
// Iron Gauntlet; the hero who takes it scores five thousand, and the ending begins.

function loadBoss(index) {
  const W = WORLD;
  const stage = STAGES[index], realm = REALMS[stage.realm];
  const cw = 44, ch = 32;
  const rows = [];
  for (let y = 0; y < ch; y++) {
    let s = '';
    for (let x = 0; x < cw; x++) s += (x === 0 || y === 0 || x === cw - 1 || y === ch - 1) ? '#' : '.';
    rows.push(s);
  }
  // the doorways in the south wall: four gaps of two tiles, where the gnasher waves come in
  const doorways = [[10, ch - 1], [18, ch - 1], [26, ch - 1], [34, ch - 1]];
  const grid = rows.map(r => r.split(''));
  for (const [dx, dy] of doorways) { grid[dy][dx] = '.'; grid[dy][dx + 1] = '.'; }
  // the rows of the hall: a pillar at each corner, the banquet table down the middle
  for (const [px, py] of [[6, 6], [36, 6], [6, 24], [36, 24]]) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) grid[py + dy][px + dx] = '#';
  const table = [];
  for (let x = 12; x <= 31; x++) for (const y of [14, 15]) { table.push([x, y]); }
  W.map = new E.TileMap({
    rows: grid.map(r => r.join('')),
    legend: { '#': 1 },
    types: {
      1: { h: 24, top: realm.wall.top, side: realm.wall.side, cut: true, cutH: 6, face: realm.wall.face }
    },
    floorMat: realm.floor
  });
  W.F = { stairs: [-5, -5], starts: [[21, 27], [22, 27], [23, 27], [22, 28]], padPair: new Map(), doors: [], traps: [], ents: new Map(), g: grid, W: cw, H: ch };
  W.stage = stage; W.index = index;
  W.doors = []; W.doorsByCell = new Map(); W.fakes = new Map(); W.cracks = new Map(); W.gens = []; W.items = []; W.itemAt = new Map();
  W.monsters = []; W.fields = []; W.spikes = []; W.runes = new Map(); W.pads = new Map(); W.plates = new Map(); W.bell = null;
  // the platters on the table, and the food in the corners
  for (const [x, y] of [[14, 14], [22, 14], [29, 14]]) spawnItemAt('P', (x + .5) * T, (y + .5) * T);
  for (const [x, y] of [[3, 3], [40, 3], [3, 28], [40, 28]]) spawnItemAt('f', (x + .5) * T, (y + .5) * T);
  for (const [x, y] of [[2, 16], [41, 16]]) spawnItemAt('m', (x + .5) * T, (y + .5) * T);
  // the king: the throne at the north end, a gauntlet glowing in his ribcage
  const hp = 300 * (1 + .5 * (W.heroes.length - 1)) * TUNE.generatorHp;
  W.boss = {
    x: 22 * T, y: 4 * T, r: 14, hp, max: hp, alive: true, phase: 1, state: 'throne', t: 0, cd: 2.5, stompCd: 4,
    eating: null, healT: 0, charge: null, fogT: 10, fog: 0, waveT: 12, plates: 0, tele: 0, dir: 0, intro: 3.5, rise: 0,
    body: new E.Body({ x: 22 * T, y: 4 * T, r: 14 }), rig: new E.Humanoid({ size: 2.4, build: 'skeleton', hat: 'crown', colors: { cloth: '#5a2a6a', skin: '#d8d0c0', trim: '#d0a040' } }),
    doorways: doorways.map(([x, y]) => [(x + .5) * T, (y - 2 + .5) * T])
  };
  W.boss.body.gravity = 0; W.boss.body.friction = 0;
  W.shots = new E.Bullets(game, { plane: 'ground', max: 400, sparks: true });
  W.foeShots = new E.Bullets(game, { plane: 'ground', max: 200, sparks: true });
  W.flows = []; W.crocks = []; W.torches = []; W.hoard = null;
  W.heroes.forEach((h, i) => { h.body.x = (W.F.starts[i % 4][0] + .5) * T; h.body.y = (W.F.starts[i % 4][1] + .5) * T; h.body.vx = 0; h.body.vy = 0; h.down = false; h.hp = Math.max(h.hp, 1); });
  W.bellT = 0; W.bellHero = null;
  return grid;
}

function bossPhase() {
  const b = WORLD.boss, f = b.hp / b.max;
  return f > .7 ? 1 : f > .35 ? 2 : 3;
}

function stepBoss(dt) {
  const W = WORLD, b = W.boss;
  // the staging: he rises from the throne with a line, and his rig is posed from his state
  if (b.intro > 0) { b.intro -= dt; b.rise = Math.min(1, b.rise + dt / 3.5); if (b.intro <= 0) say('king_intro', null, true); }
  b.rig.update(dt, { x: b.x, y: b.y, z: 0, pose: !b.alive ? 'die' : b.eating ? 'kneel' : null, hurt: b.flash > 0, attack: null });
  if (b.intro > 0) return;
  if (!b.alive) {
    b.dying = (b.dying || 0) + dt;
    if (b.dying > .6 && !b.gauntletDropped) { b.gauntletDropped = true; spawnItemAt('G', b.x, b.y); say('king_dead', null, true); }
    return;
  }
  b.t += dt;
  const target = nearestHero(b.x, b.y, 2000);
  if (!target) return;
  const ph = bossPhase();
  if (ph !== b.phase) {
    b.phase = ph;
    say(ph === 2 ? 'king_second' : 'king_third', null, true);
    if (ph === 2) { b.waveT = 6; } else { b.fogT = 4; game.shake(10); }
    game.audio.layer('drums', 1, .5);
    game.flash('#ff8040', .3, .8);
  }
  // breathing the health back while eating
  if (b.eating) {
    const plat = W.itemAt.get(b.eating.cell);
    if (!plat || !plat.alive) { b.eating = null; b.state = 'walk'; }
    else { b.healT += dt; b.hp = Math.min(b.max, b.hp + b.max * .05 * dt); if (b.healT > 2.5) { removeItem(plat); b.eating = null; b.state = 'walk'; } }
  }
  if (b.state === 'charge') {
    const c = b.charge;
    c.t += dt;
    if (c.t < .6) { /* telegraph: a line on the floor */ }
    else {
      b.x += c.dx * 230 * dt; b.y += c.dy * 230 * dt;
      if (!W.map.standable || W.map.solidAt(b.x, b.y)) { b.state = 'walk'; b.charge = null; game.shake(6); }
      for (const h of W.heroes) if (!h.down && Math.hypot(h.body.x - b.x, h.body.y - b.y) < 22 && !h.chargeHit) { h.chargeHit = true; damageHero(h, 15, null); h.body.x += c.dx * 30; h.body.y += c.dy * 30; }
      if (c.t > 1.8) { b.state = 'walk'; b.charge = null; for (const h of W.heroes) h.chargeHit = false; }
    }
    return;
  }
  // phase one: the throne, plates, and the stomp
  if (ph === 1) {
    b.body.x = b.x; b.body.y = b.y;
    b.cd -= dt; b.stompCd -= dt;
    if (b.cd <= 0 && Math.hypot(target.body.x - b.x, target.body.y - b.y) < 260) {
      b.cd = 2.5;
      for (const a of [-.25, 0, .25]) {
        const dx = target.body.x - b.x, dy = target.body.y - b.y, d = Math.hypot(dx, dy) || 1, s = 110, c = Math.cos(a), sn = Math.sin(a);
        W.foeShots.fire({ x: b.x, y: b.y, z: 12, vx: (dx / d * c - dy / d * sn) * s, vy: (dx / d * sn + dy / d * c) * s, vz: 0, r: 4, dmg: 10, life: 2.4, team: 'foe', color: '#f4e6c8', core: '#fff', data: { owner: b } });
      }
      game.audio.sfx('hit', { vol: .3, pitch: .7 });
    }
    if (b.stompCd <= 0 && Math.hypot(target.body.x - b.x, target.body.y - b.y) < 40) {
      b.stompCd = 4;
      W.blasts.push({ x: b.x, y: b.y, t: 0, color: '#ffd080' });
      for (const h of W.heroes) if (!h.down && Math.hypot(h.body.x - b.x, h.body.y - b.y) < 46) damageHero(h, 15, null);
      game.shake(8); game.audio.sfx('boom', { vol: .5, pitch: .6 });
    }
    return;
  }
  // phase two: walk to the nearest platter and eat it; gnasher waves from the doors
  if (ph >= 2) {
    b.waveT -= dt;
    if (b.waveT <= 0) {
      b.waveT = 12;
      for (const [x, y] of b.doorways) if (W.gens.length >= 0) spawnMonster('gnasher', x, y, 2, false, null);
    }
    if (!b.eating) {
      let best = null, bd = Infinity;
      for (const it of W.items) if (it.alive && it.ch === 'P') { const d = Math.hypot(it.x - b.x, it.y - b.y); if (d < bd) { bd = d; best = it; } }
      if (best && b.state !== 'eat') {
        const dx = best.x - b.x, dy = best.y - b.y, d = Math.hypot(dx, dy);
        if (d > 10) { b.x += dx / d * 40 * dt; b.y += dy / d * 40 * dt; }
        else { b.state = 'eat'; b.eating = { cell: best.cell }; b.healT = 0; say('king_eating', null, true); }
      }
    }
    b.body.x = b.x; b.body.y = b.y;
  }
  // phase three: the charge, the fog
  if (ph === 3) {
    b.tele -= dt;
    b.fogT -= dt;
    if (b.fogT <= 0) { b.fog = 3; b.fogT = 10; }
    b.fog = Math.max(0, b.fog - dt);
    if (b.tele <= 0 && !b.eating && Math.hypot(target.body.x - b.x, target.body.y - b.y) < 260) {
      b.tele = 4.5;
      const dx = target.body.x - b.x, dy = target.body.y - b.y, d = Math.hypot(dx, dy) || 1;
      b.state = 'charge'; b.charge = { dx: dx / d, dy: dy / d, t: 0 };
      say('king_near', null, true);
    }
  }
  // the fog triples the drain for the heroes within it
  for (const h of W.heroes) if (!h.down && b.fog > 0 && Math.hypot(h.body.x - b.x, h.body.y - b.y) < 80) h.fogDrain = true; else h.fogDrain = false;
}

// A hero's shot hits the king: from the front, double, in phase three.
function bossShot(shots) {
  const b = WORLD.boss;
  shots.hit([{ x: b.x, y: b.y, r: 14, alive: true, boss: true }], (bullet, t) => {
    const mult = bossPhase() === 3 && bullet.vy < 0 ? 2 : 1;   // shots from the south, the front of the king
    b.hp -= bullet.dmg * mult;
    game.hitFx(b.x, b.y, 6, { power: .4, damage: Math.round(bullet.dmg * mult), sound: 'hit' });
    if (b.hp <= 0) bossDefeat();
  }, 'hero');
}
// A flask takes six percent of the king's health (and a shot flask's blast does the same)
function bossFlask(h) {
  const b = WORLD.boss;
  if (!b || !b.alive) return;
  b.hp -= b.max * .06;
  if (b.hp <= 0) bossDefeat(h);
}
function bossDefeat(h) {
  const b = WORLD.boss;
  if (!b.alive) return;
  b.alive = false; b.dying = 0; b.state = 'dead';
  if (h) h.kills++;
  game.shake(14); game.flash('#ffffff', .4, 1);
  game.audio.sfx('boom', { vol: .7, pitch: .5 });
  for (let i = 0; i < 4; i++) WORLD.blasts.push({ x: b.x + (i - 2) * 10, y: b.y + (i % 2) * 8, t: -i * .08, color: '#f4e6c8' });
}
