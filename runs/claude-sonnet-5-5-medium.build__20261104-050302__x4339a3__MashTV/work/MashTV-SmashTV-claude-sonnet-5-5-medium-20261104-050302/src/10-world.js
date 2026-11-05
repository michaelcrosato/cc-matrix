// MASH TV: the World. Owns everything in a room. step() is authoritative (solo / host / server); mirror() is a hub client.
MT.WEAPONS = {
  blaster: { name: 'STUDIO BLASTER', kind: 'primary', letter: 'B', rate: () => MT.T.fireRate, dur: 0 },
  spread: { name: 'TRIPLE PLAY', kind: 'primary', letter: 'S', rate: () => 8, dur: 14 },
  rockets: { name: 'PRIME-TIME ROCKETS', kind: 'primary', letter: 'R', rate: () => 3.5, dur: 12 },
  popcorn: { name: 'POPCORN POPPER', kind: 'primary', letter: 'P', rate: () => 2.5, dur: 12 },
  laser: { name: 'LIMELIGHT LASER', kind: 'primary', letter: 'L', rate: () => 0, dur: 10 },
  records: { name: 'GOLD RECORDS', kind: 'addon', letter: 'G', dur: 15 },
  shield: { name: 'SPONSOR SHIELD', kind: 'addon', letter: 'K', dur: 8 },
  speed: { name: 'SPEED SNEAKERS', kind: 'addon', letter: 'F', dur: 10 }
};
MT.CAPSULES = ['spread', 'rockets', 'popcorn', 'laser', 'records', 'shield', 'speed'];
MT.DIFF = { ROOKIE: { hp: 5, lives: 5, es: .85, eb: .8, scale: .8 }, CONTESTANT: { hp: 3, lives: 3, es: 1, eb: 1, scale: 1 }, CHAMPION: { hp: 1, lives: 3, es: 1.15, eb: 1, scale: 1.2 } };
MT.ENEMIES = {};
MT.BOSSES = {};

// ---- arena map ---------------------------------------------------------------------------------------------------
MT.buildMap = function (set) {
  const rows = [];
  for (let y = 0; y < 15; y++) { let s = ''; for (let x = 0; x < 23; x++) s += (x === 0 || x === 22 || y === 0 || y === 14) ? '#' : '.'; rows.push(s); }
  for (const d of Object.values(MT.DOORS)) for (const [cx, cy] of d.cells) rows[cy] = rows[cy].slice(0, cx) + 'D' + rows[cy].slice(cx + 1);
  const S = MT.SETS[set] || MT.SETS.studio;
  const map = new E.TileMap({ rows, legend: { '#': 1, 'D': 2 }, floorTex: S.floorTex, outside: S.outside || '#0a0414', ao: 3,
    types: { 1: Object.assign({ h: 26, cut: true }, S.wall), 2: Object.assign({ h: 24, cut: true }, S.door) } });
  return map;
};

// ---- contestants -------------------------------------------------------------------------------------------------
MT.newContestant = function (slot, o = {}) {
  const d = MT.DIFF[(MT.run && MT.run.diff) || 'CONTESTANT'];
  const hp = MT.T.hpPerLife || d.hp, lives = MT.T.startLives || d.lives;
  const c = Object.assign({ slot, name: MT.PNAMES[(o.look !== undefined ? o.look : slot) % 4] || 'P' + (slot + 1), look: slot, color: MT.PCOL[slot % 4], kind: 'local', input: null,
    x: 184, y: 160, z: 0, r: 6, vx: 0, vy: 0, face: -Math.PI / 2, aim: -Math.PI / 2, hp, maxHp: hp, lives, cash: 0, kills: 0, deaths: 0, prizes: [], bombs: 2,
    wpn: 'blaster', wT: 0, addons: {}, state: 'alive', invuln: 0, hurtT: 0, slideT: 0, slideCd: 0, slideDir: [0, 1], boatT: 0, boatCd: 0, fireCd: 0, respawnT: 0, down: 0,
    continues: 0, nextLife: 250000, boatGain: 0, pose: null, expr: null, intent: null, laserOn: false, recC: 0, lastMove: [0, 1], arrowT: 0, flash: 0, alpha: 1, landK: 0, dropZ: 0, sneakT: 0 }, Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)));
  c.body = new E.Body({ x: c.x, y: c.y, r: c.r });
  return c;
};
MT.EXTRA_LIVES = [250000, 750000, 1500000, 3000000];

class World {
  constructor(o = {}) {
    const game = this.game = MT.game;
    this.mode = o.mode || 'solo';              // 'solo' | 'host' | 'server' | 'client'
    this.session = !!o.session; this.demo = !!o.demo;
    this.cs = o.contestants || [];             // contestants (live objects)
    this.room = o.room; this.rm = o.room;
    this.set = o.room ? (o.room.set || 'studio') : 'studio';
    this.map = MT.buildMap(this.set);
    this.pShots = new E.Bullets(game, { max: 400 }); this.fShots = new E.Bullets(game, { max: 700, sparks: false });
    this.enemies = []; this.pickups = []; this.rockets = []; this.bags = []; this.lobs = []; this.shells = []; this.flames = []; this.decals = []; this.pops = [];
    this.props = []; this.nextId = 1; this.time = 0; this.phase = 'enter'; this.phaseT = 0; this.boss = null; this.crates = [];
    this.doors = {}; for (const k in MT.DOORS) this.doors[k] = { state: 'closed', t: 0, queue: [], hold: 0, exit: null, openT: 0 };
    this.spawnQ = []; this.waveI = -1; this.waveT = 0; this.wavesDone = false; this.itemQ = []; this.survive = null;
    this.rat = { R: o.R !== undefined ? o.R : 20, X: 1, prime: 0, cool: 0, lastGain: 0, lowT: 0, stunt: false, kills: [], last: 0 };
    this.events = []; this.evSeq = 0; this.keyDropped = false; this.exitPicked = null; this.exitT = 0; this.hurryT = 0; this.hazards = []; this.stats = { kills: 0 };
    this.seenKinds = {}; this.time0 = 0; this.cleared = false; this.clearTime = 0; this.bossDead = false; this.statuette = null; this.shakeT = 0; this.drops = { caps: 0 };
    this.entry = o.entry || 'S'; this.freezeE = 0; this.stunT = 0; this.onExit = o.onExit || null; this.onBossDone = o.onBossDone || null; this.onDone = o.onDone || null;
    this.cheats = o.cheats || MT.cheats; this.audience = []; this.lowSeen = {}; this.jackpot = 0;
    if (this.room) this.setupRoom();
  }
  get nPlayers() { return Math.max(1, this.cs.filter(c => c.state !== 'gone').length); }
  alive() { let n = 0; for (const e of this.enemies) if (e.alive && e.count !== false) n++; for (const d of Object.values(this.doors)) n += d.queue.length; for (const q of this.spawnQ) n += q.n || 1; return n; }
  living() { return this.cs.filter(c => c.state === 'alive' || c.state === 'walkin' || c.state === 'drop'); }
  event(name, data) { const ev = { seq: ++this.evSeq, name, data: data || {} }; this.events.push(ev); if (this.events.length > 80) this.events.shift(); if (MT.react) MT.react.handle(this, ev); if (this.evHook) this.evHook(ev); return ev; }

  // ---- room setup ---------------------------------------------------------------------------------------------------
  setupRoom() {
    const rm = this.rm, S = MT.SETS[this.set];
    this.phase = 'enter'; this.phaseT = 0;
    for (const c of this.cs) this.placeAtEntry(c);
    if (this.mode !== 'client') {
    for (const p of (rm.place || [])) { const [k, cx, cy] = p, [x, y] = MT.cellXY(cx, cy); this.spawnEnemy(k, x, y, { placed: true }); }
    if (rm.crates) for (const [cx, cy] of rm.crates) { const [x, y] = MT.cellXY(cx, cy); this.spawnEnemy('crate', x, y, {}); }
    if (rm.locks) for (const [cx, cy] of rm.locks) { const [x, y] = MT.cellXY(cx, cy); const e = this.spawnEnemy('lock', x, y + 4, {}); }
    for (const it of (rm.items || [])) this.itemQ.push({ at: it[0], kind: it[1], where: it[2], done: false });
    if (rm.key && rm.key.rule === 'crate') { const cs = this.enemies.filter(e => e.kind === 'crate'); if (cs.length) cs[Math.floor(MT.R.spawn() * cs.length)].carryKey = true; }
    if (rm.key && rm.key.rule === 'belt') { const [kx, ky] = MT.cellXY(19, 5); this.addPickup('key', kx, ky, { fixed: true }); }
    if (rm.key && rm.key.rule === 'survive') { this.survive = { len: rm.surviveLen || 35, t: 0 }; this.spawnKeyCage(); }
    if (rm.hazards) for (const h of rm.hazards) this.hazards.push(MT.makeHazard(this, h));
    if (rm.boss) this.bossSetup();
    }
    this.audience = []; for (let i = 0; i < 26; i++) this.audience.push({ x: i < 13 ? -20 - (i % 4) * 24 - MT.fxr() * 6 : 388 + (i % 4) * 24 + MT.fxr() * 6, y: 30 + Math.floor(i / 2) % 7 * 28 + MT.fxr() * 6, v: i % 8, ph: MT.fxr() * 6.28, sign: i % 11 === 3 ? 'MASH!' : i % 11 === 7 ? 'KA-CHING!' : i % 13 === 5 ? 'HI MOM' : null });
  }
  placeAtEntry(c) {
    const d = MT.DOORS[this.entry], ix = -d.dx, iy = -d.dy, lx = -iy, ly = ix, idx = Math.max(0, this.cs.indexOf(c)), side = idx % 2 ? 1 : -1, row = idx >> 1;
    c.x = c.body.x = d.x + ix * 14 + lx * side * 6; c.y = c.body.y = d.y + iy * 14 + ly * side * 6;
    c.walkTo = [d.x + ix * (56 + row * 22) + lx * side * 16, d.y + iy * (56 + row * 22) + ly * side * 16];
    if (c.state !== 'out') c.state = 'walkin'; c.walkT = 1.2; c.invuln = Math.max(c.invuln, 1.4); c.arrowT = 3;
    c.vx = c.vy = 0; c.body.vx = c.body.vy = 0; c.z = 0; c.body.z = 0; c.face = Math.atan2(iy, ix); c.aim = c.face;
  }
  spawnKeyCage() { const [x, y] = [184, 120]; this.keyCage = { x, y, r: 16, open: false }; const k = this.addPickup('key', x, y, { fixed: true }); k.caged = true; this.map.solid && 0; }

  // ---- spawning ------------------------------------------------------------------------------------------------------
  scaleN(n) {
    const d = MT.DIFF[(MT.run && MT.run.diff) || 'CONTESTANT'].scale, p = this.session ? this.nPlayers : this.nPlayers;
    return Math.max(1, Math.round(n * (1 + .35 * (p - 1)) * MT.T.waveSize * d));
  }
  queueSpawn(door, kind, n, gap) {
    n = this.scaleN(n); gap = (gap || .25) * MT.T.spawnGap;
    const doors = door === 'all' ? ['N', 'E', 'S', 'W'] : door === 'sides' ? ['E', 'W'] : door === 'ends' ? ['N', 'S'] : null;
    if (doors) { for (const d of doors) this.queueSpawn(d, kind, Math.max(1, Math.round(n / (door === 'all' ? 1 : 1))), gap / MT.T.spawnGap); return; }
    if (DOORS_OK[door]) { const d = this.doors[door]; for (let i = 0; i < n; i++) d.queue.push({ kind, at: this.time + i * gap, o: {} }); return; }
    // audience, drop, [cx,cy]
    for (let i = 0; i < n; i++) this.spawnQ.push({ kind, at: this.time + .1 + i * gap, where: door });
  }
  spawnEnemy(kind, x, y, o = {}) {
    const A = MT.ENEMIES[kind]; if (!A) throw new Error('unknown enemy ' + kind);
    const hpMul = MT.T.enemyHp;
    const e = { id: this.nextId++, kind, x, y, z: 0, r: A.r, vx: 0, vy: 0, face: Math.PI / 2, state: 'idle', t: 0, t2: 0, flash: 0, alpha: 1, alive: true, hp: Math.max(.5, A.hp * (o.hpMul || 1) * (A.noHpMul ? 1 : hpMul)), count: A.count !== false, stun: 0, kb: [0, 0], entering: !!o.entering, seed: MT.R.ai(), cd: 0.6 + MT.R.ai(), age: 0 };
    e.max = e.hp; e.hpPct = 1; e.body = new E.Body({ x, y, r: A.r }); if (o.placed) e.placed = true;
    Object.assign(e, o.props || {}); if (o.carryKey) e.carryKey = true; if (A.make) A.make(this, e, o);
    this.enemies.push(e); this.seenKinds[kind] = (this.seenKinds[kind] || 0) + 1;
    if (!this.introSeen) this.introSeen = {}; this.event('enemy', { kind, first: !MT.run || !MT.run.seenEnemies[kind] });
    if (MT.run) MT.run.seenEnemies[kind] = true;
    return e;
  }
  spawnAtDoor(dn, q) {
    const d = MT.DOORS[dn]; const jitter = (MT.R.spawn() - .5) * 30;
    const x = d.x + d.dx * 20 + (d.dx === 0 ? jitter : 0), y = d.y + d.dy * 20 + (d.dy === 0 ? jitter : 0);
    const e = this.spawnEnemy(q.kind, x, y, { entering: true, props: q.props, carryKey: q.carryKey });
    e.face = Math.atan2(-d.dy, -d.dx); return e;
  }
  spawnWhere(q) {
    const w = q.where; let x, y, o = {};
    if (w === 'audience') { const left = MT.R.spawn() < .5; x = left ? -30 : 398; y = 40 + MT.R.spawn() * 160; const tx = left ? 30 + MT.R.spawn() * 120 : 218 + MT.R.spawn() * 120, ty = 40 + MT.R.spawn() * 160; o.props = { leap: { x0: x, y0: y, x1: tx, y1: ty, t: 0 } }; x = x; }
    else if (w === 'drop') {
      let tries = 0; do { x = 40 + MT.R.spawn() * 288; y = 40 + MT.R.spawn() * 160; tries++; } while (tries < 20 && this.living().some(c => MT.hyp(c.x - x, c.y - y) < 50));
      this.pops.push({ x, y, t: .6, kind: 'shadow' }); o.props = { dropT: .6 };
    } else if (Array.isArray(w)) [x, y] = MT.cellXY(w[0], w[1]);
    const e = this.spawnEnemy(q.kind, x, y, Object.assign(o, { carryKey: q.carryKey }));
    if (o.props && o.props.leap) { e.entering = true; e.invuln = true; e.z = 0; }
    if (o.props && o.props.dropT) { e.invuln = true; e.hidden = true; }
    return e;
  }

  // ---- pickups -------------------------------------------------------------------------------------------------------
  addPickup(kind, x, y, o = {}) {
    const p = Object.assign({ id: this.nextId++, kind, x, y, z: 0, ttl: o.fixed ? 1e9 : 9, t: 0, vx: 0, vy: 0, r: 7, w: null }, o);
    if (kind === 'cap' && !p.w) p.w = MT.pickOf('drops', MT.CAPSULES);
    if (kind === 'cap') { if (this.pickups.filter(q => q.kind === 'cap').length >= 3) return null; }
    else if (['bill', 'stack', 'bar', 'case'].includes(kind) && this.pickups.filter(q => q.cash).length >= 25) return null;
    if (['bill', 'stack', 'bar', 'case'].includes(kind)) p.cash = true;
    if (kind === 'prize') { p.prizeIdx = o.prizeIdx !== undefined ? o.prizeIdx : this.nextPrize(); p.col = p.col || ['red', 'blue', 'gold'][Math.floor(MT.R.drops() * 3)]; }
    p.vz = o.vz === undefined ? 0 : o.vz;
    this.pickups.push(p); return p;
  }
  nextPrize() {
    const run = MT.run; if (!run) return 0; const ep = MT.EPISODES[Math.min(3, run.ep)] || MT.EPISODES[1];
    if (!run.prizeBag || !run.prizeBag.length) { const idx = ep.prizes.map((_, i) => i); for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(MT.R.drops() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; } run.prizeBag = idx; }
    return run.prizeBag.shift();
  }
  scatterCash(x, y, n, boss) {
    for (let i = 0; i < n; i++) { const a = MT.R.drops() * MT.TAU, v = 30 + MT.R.drops() * 70; const k = MT.R.drops() < .15 ? 'bar' : MT.R.drops() < .5 ? 'stack' : 'bill'; const p = this.addPickup(k, x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 90 + MT.R.drops() * 60, ttl: 14 }); }
  }
  dropRoll(e, A) {
    const mul = MT.T.dropMul * ((this.rm && this.rm.billMul && 1) || 1);
    for (const [k, p] of (A.drops || [])) {
      let pp = p * mul * (k === 'bill' && this.rm && this.rm.cashRoom ? 2 : 1);
      if (MT.R.drops() < pp) {
        if (k === 'cap') this.addPickup('cap', e.x, e.y); else if (k === 'prize') this.addPickup('prize', e.x, e.y); else this.addPickup(k, e.x, e.y, { vx: (MT.R.drops() - .5) * 40, vy: (MT.R.drops() - .5) * 40, vz: 60 });
        break;
      }
    }
  }
  collect(c, p) {
    const mul = (this.rm && this.rm.cashRoom ? 1.5 : 1) * MT.T.cashMul * this.rat.X;
    const give = (v, label) => { const amt = Math.round(v * mul); this.addCash(c, amt); this.event('cash', { slot: c.slot, amt, x: p.x, y: p.y }); return amt; };
    switch (p.kind) {
      case 'bill': give(100); break; case 'stack': give(500); break; case 'bar': give(1000); break; case 'case': give(5000); break;
      case 'prize': {
        const ep = MT.EPISODES[Math.min(3, (MT.run && MT.run.ep) || 1)], pr = ep.prizes[p.prizeIdx % ep.prizes.length], amt = give(pr.value);
        c.prizes.push({ name: pr.name, value: pr.value, joke: pr.joke, ep: (MT.run && MT.run.ep) || 1 }); this.addRating(2); this.event('prize', { slot: c.slot, name: pr.name, value: pr.value, joke: pr.joke, amt });
        break; }
      case 'key': this.collectKey(c, p); break;
      case 'cap': this.giveWeapon(c, p.w); this.event('capsule', { slot: c.slot, w: p.w, x: p.x, y: p.y }); break;
      case 'bomb': if (c.bombs >= 3) give(2000); else c.bombs++; this.event('pickup', { slot: c.slot, kind: 'bomb' }); break;
      case 'life': c.lives++; this.event('life', { slot: c.slot }); break;
      case 'statue': this.event('statuette', { slot: c.slot }); give(100000); c.prizes.push({ name: 'THE NETWORK (YES, ALL OF IT)', value: 100000, joke: 'YOU OWN THE SHOW NOW!', ep: 4 }); this.statuette = { who: c.slot }; break;
    }
    p.dead = true;
  }
  collectKey(c, p) {
    const run = MT.run;
    if (this.session) { this.addCash(c, 10000); this.event('cash', { slot: c.slot, amt: 10000, x: p.x, y: p.y }); this.event('key', { slot: c.slot, n: 0, bonus: true }); return; }
    if (run) run.keys++; this.addRating(5); this.event('key', { slot: c.slot, n: run ? run.keys : 0, first: run && run.keys === 1 });
  }
  addCash(c, amt) {
    c.cash += amt; c.recC += amt;
    while (c.cash >= c.nextLife && c.nextLife > 0) { const i = MT.EXTRA_LIVES.indexOf(c.nextLife); c.lives++; c.nextLife = MT.EXTRA_LIVES[i + 1] || 0; this.event('life', { slot: c.slot, encore: true }); }
  }
  giveWeapon(c, id) {
    const W = MT.WEAPONS[id]; if (!W) return; const dur = W.dur * MT.T.puDuration;
    if (W.kind === 'primary') { c.wpn = id; c.wT = dur; c.wMax = dur; } else { c.addons[id] = dur; (c.addMax = c.addMax || {})[id] = dur; }
    this.event('weapon', { slot: c.slot, w: id });
  }

  // ---- ratings -----------------------------------------------------------------------------------------------------
  addRating(v) {
    const r = this.rat; if (r.prime > 0 || v === 0) { if (v > 0) r.lastGain = 0; return; }
    v *= MT.T.ratingsGain; r.R = Math.min(100, r.R + v); if (v > 0) r.lastGain = 0;
    if (r.R >= 100 && r.cool <= 0 && !this.session_noprime) this.startPrime();
  }
  loseRating(v) { if (this.rat.prime > 0) return; this.rat.R = Math.max(0, this.rat.R - v); }
  startPrime() {
    const r = this.rat; r.prime = MT.T.primeTime; r.R = 100; this.event('prime', {});
    for (let i = 0; i < 3; i++) { const a = MT.R.spawn() * MT.TAU; this.addPickup('cap', 184, 20, { vx: Math.cos(a) * 60, vy: 40 + Math.abs(Math.sin(a)) * 40, vz: 120, ttl: 14 }); }
  }
  tickRatings(dt) {
    const r = this.rat; r.lastGain += dt;
    if (r.prime > 0) { r.prime -= dt; r.X = 5; if (r.prime <= 0) { r.prime = 0; r.R = 60; r.cool = 20; this.event('primeEnd', {}); } }
    else {
      if (r.cool > 0) r.cool -= dt;
      if (r.lastGain > 2.5 && this.phase === 'waves') r.R = Math.max(0, r.R - MT.T.ratingsDecay * dt);
      r.X = r.R >= 80 ? 5 : r.R >= 60 ? 4 : r.R >= 40 ? 3 : r.R >= 20 ? 2 : 1;
    }
    // stunt: R < 5 for 10 s during waves
    if (this.phase === 'waves' && r.R < 5 && r.prime <= 0) { r.lowT += dt; if (r.lowT >= 10 && !r.stunt) this.releaseStunt(); } else r.lowT = 0;
    // multi-kill window
    r.kills = r.kills.filter(t => this.time - t < .4);
  }
  releaseStunt() {
    this.rat.stunt = true; this.rat.R += 15; const ep = MT.EPISODES[Math.min(3, (MT.run && MT.run.ep) || 1)]; const k = ep.stunt;
    const dn = MT.pickOf('spawn', ['N', 'E', 'S', 'W']);
    if (k === 'clapbot') this.queueSpawn(dn, 'clapbot', 12, .15); else this.queueSpawn(dn, k, 1, 1);
    this.event('stunt', {});
  }

  // ---- damage --------------------------------------------------------------------------------------------------------
  hurtEnemy(e, dmg, src, o = {}) {
    if (!e.alive || e.invuln || this.mode === 'client') return false;
    if (this.cheats && this.cheats.oneHit && src && src.slot !== undefined) dmg = 9999;
    if (e.vulnerable) dmg *= 2;
    const A = MT.ENEMIES[e.kind]; if (A.armor) dmg *= A.armor(e);
    e.hp -= dmg; e.flash = .09; e.hpPct = Math.max(0, e.hp / e.max);
    if (o.ang !== undefined && A.kb !== 0 && !e.noKb) { const k = (A.kb === undefined ? 40 : A.kb); e.kb = [Math.cos(o.ang) * k, Math.sin(o.ang) * k]; }
    if (A.onHit) A.onHit(this, e, dmg, src);
    if (e.hp <= 0) this.killEnemy(e, src, o);
    else if (!o.quiet) { this.game.particles.sparks(e.x, e.y, 12, 2, o.ang !== undefined ? o.ang : null); this.event('hit', { id: e.id, x: e.x, y: e.y }); }
    return true;
  }
  killEnemy(e, src, o = {}) {
    if (!e.alive) return; e.alive = false; const A = MT.ENEMIES[e.kind];
    const c = src && src.slot !== undefined ? this.cs.find(q => q.slot === src.slot) : null;
    if (A.onDie) A.onDie(this, e, src);
    const mul = (this.rm && this.rm.cashRoom ? 1.5 : 1) * MT.T.cashMul * this.rat.X;
    if (A.cash && !e.noCash) { const amt = Math.round(A.cash * (e.big ? 2 : 1) * mul); if (c) { this.addCash(c, amt); } this.event('cash', { slot: c ? c.slot : -1, amt, x: e.x, y: e.y, kill: true }); }
    if (c) { c.kills++; } this.stats.kills++;
    if (A.rat && !e.noRating) { this.addRating(A.rat); const r = this.rat; r.kills.push(this.time); if (r.kills.length > 2) { this.addRating(2); if (r.kills.length === 4 || r.kills.length === 6) this.event('multikill', { n: r.kills.length }); } }
    this.game.particles.bits(e.x, e.y, 12, A.big ? 22 : 10, A.palette || ['#ff2e88', '#2ee6ff', '#ffcc33', '#fff']);
    this.event('kill', { id: e.id, kind: e.kind, x: e.x, y: e.y, big: !!A.big });
    if (A.big) { this.game.particles.explosion(e.x, e.y, 10, A.big === true ? 1 : A.big); this.game.shake(4); if (!this.session && !this.game.headless) this.game.freeze(.03); }
    if (e.carryKey) this.addPickup('key', e.x, e.y, { fixed: true, vz: 80 });
    if (e.kind === 'crate') this.crateSpill(e);
    this.dropRoll(e, A);
    if (this.rm && this.rm.key && this.rm.key.rule === 'mimes' && e.placed && e.kind === 'mime') { if (!this.enemies.some(q => q.alive && q.placed && q.kind === 'mime') && !this.keyDropped) { this.keyDropped = true; this.addPickup('key', e.x, e.y, { fixed: true, vz: 80 }); this.event('mimeKey', {}); } }
  }
  crateSpill(e) { const n = 3 + Math.floor(MT.R.drops() * 3); for (let i = 0; i < n; i++) { const a = MT.R.drops() * MT.TAU; this.addPickup(MT.R.drops() < .3 ? 'stack' : 'bill', e.x, e.y, { vx: Math.cos(a) * 50, vy: Math.sin(a) * 50, vz: 90 }); } if (MT.R.drops() < .5) this.addPickup('prize', e.x, e.y, { vx: 10, vy: 10, vz: 80 }); }

  hurtContestant(c, dmg, srcKind, srcId, ang) {
    if (c.kind === 'remote' || c.kind === 'mirror') return false;
    if (c.state !== 'alive' || c.invuln > 0 || c.slideT > .06 || c.addons.shield > 0) return false;
    if (this.cheats && this.cheats.god) return false;
    if (c.boatT > 0) { c.boatT = 0; c.boatCancel = true; }
    c.hp -= dmg; c.invuln = MT.T.invulnTime; c.hurtT = .4; c.flash = .1;
    if (ang !== undefined) { c.body.vx = Math.cos(ang) * 120; c.body.vy = Math.sin(ang) * 120; c.kbT = .12; }
    this.loseRating(12); this.game.particles.sparks(c.x, c.y, 12, 6); this.game.shake(2.5);
    if (c.input && c.input.rumble) c.input.rumble(.5, .15);
    this.event('hurt', { slot: c.slot, hp: c.hp, x: c.x, y: c.y, src: srcKind, id: srcId, dmg });
    if (c.hp <= 0) this.killContestant(c);
    else if (c.hp === 1 && !this.lowSeen[c.slot]) { this.lowSeen[c.slot] = true; this.event('lowHp', { slot: c.slot }); }
    return true;
  }
  killContestant(c) {
    c.hp = 0; c.state = 'dying'; c.respawnT = 2; c.deaths++; if (!this.session) c.lives--; c.pose = 'die'; c.down = 0; c.wpn = 'blaster'; c.wT = 0; c.addons = {};
    this.loseRating(25); this.game.particles.bits(c.x, c.y, 10, 24, [c.color, '#fff', '#ffcc33']);
    this.event('death', { slot: c.slot, x: c.x, y: c.y, name: c.name, lives: c.lives });
    if (this.session && c.kind !== 'mirror') { c.cash = Math.max(0, c.cash - 2500); }
  }
  respawn(c) {
    if (c.lives <= 0 && !this.session) { c.state = 'out'; c.pose = null; this.event('out', { slot: c.slot }); this.checkAllOut(); return; }
    if (this.session && c.lives < 0) c.lives = 0;
    c.state = 'drop'; c.hp = c.maxHp; c.dropZ = 70; c.invuln = 2.5; c.pose = null; c.down = 0; c.bombs = Math.max(c.bombs, 1); c.arrowT = 3;
    const d = MT.DOORS[this.entry]; const sx = 184 + (c.slot % 2 ? 24 : -24); c.x = c.body.x = sx; c.y = c.body.y = 150; c.z = 70; c.body.z = 70;
    this.event('drop', { slot: c.slot });
  }
  checkAllOut() { if (this.cs.length && this.cs.every(q => q.state === 'out' || q.state === 'gone') && this.onAllOut) this.onAllOut(); }
}
const DOORS_OK = { N: 1, E: 1, S: 1, W: 1 };
MT.World = World;
