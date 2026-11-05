/* MASH TV — 07-world: the room as a simulation (§5.5–§5.7, §5.4, §5.3). One World per room: its arena, doors, waves, enemies,
 * shots, pickups, hazards, the ratings, and the room phases ENTER → INTRO → WAVES → CLEAR → EXIT. It emits events (W.evq); the
 * play scene turns them into sound, banners and lines through the reaction table. It draws nothing (09-draw does). */

// the generator scheduler: a task yields a number (seconds), a function (a condition), or nothing (one step)
MT.task = (gen) => ({ gen, wait: 0, cond: null, done: false });

class World {
  constructor(run, roomId, o = {}) {
    this.run = run; this.id = roomId; this.R = MT.ROOMS[roomId]; this.set = this.R.set; this.ep = this.R.ep;
    this.map = MT.buildMap(this.set); this.time = 0; this.phase = 'enter'; this.phaseT = 0; this.entry = o.entry || MT.ENTRY_DOOR(roomId) || 'S';
    this.enemies = []; this.pShots = []; this.fShots = []; this.rockets = []; this.lobs = []; this.pickups = []; this.splats = []; this.decals = [];
    this.evq = []; this.tasks = []; this.spawnQ = []; this.doorState = {}; this.pops = []; this.banners = []; this.stats = { kills: 0, hits: 0, spawned: 0, kinds: {} };
    this.kindsSeen = new Set(); this.players = o.players;
    this.solids = []; this.hazards = []; this.vents = []; this.conveyors = []; this.keyHolder = null; this.keyPlaced = false; this.waveIdx = 0;
    this.waveStart = 0; this.clearT = 0; this.clearTime = 0; this.hurryT = 0; this.exitT = 0; this.exitPick = null; this.wavesDone = false;
    this.stunt = false; this.lowRatT = 0; this.mimeOpen = false; this.survive = null; this.cage = null; this.bonusAt = 0; this.primeAt = -1;
    this.players_n = this.players.length || 1; this.doorDelay = 0; this.lastPlayerXY = [0, 0]; this.reactEvents = [];
    this.ceilingPts = [];
    for (const d of ['N', 'S', 'E', 'W']) this.doorState[d] = { state: 'closed', t: 0, up: 0, queue: [], exitOn: false, lastSpawn: 0 };
    this.buildRoom();
    if (this.R.type === 'boss') this.boss = new MT.BOSS_CLASS[this.R.boss](this);
  }
  get diffMul() { return this.run.diff.mul; }
  get aliveCounted() { return this.enemies.filter(e => e.alive && e.counted).length; }
  get multiplier() { return this.primeOn ? 5 : this.ratingMul(this.run.ratings.R); }
  ratingMul(R) { return R < 20 ? 1 : R < 40 ? 2 : R < 60 ? 3 : R < 80 ? 4 : 5; }
  emit(type, data = {}) { this.evq.push({ type, data, t: this.time }); }
  // the walk-in: contestants start at the entry door and walk to a 2 x 2 formation 40 units inside (§5.1)
  formationCentre() { return { S: [184, 192], N: [184, 48], W: [48, 120], E: [320, 120] }[this.entry] || [184, 192]; }
  formation(slot) { const c = this.formationCentre(), f = [[-14, 8], [14, 8], [-14, -8], [14, -8]][slot % 4]; return [c[0] + f[0], c[1] + f[1]]; }
  doorStart() { return { S: [184, 218], N: [184, 22], W: [22, 120], E: [346, 120] }[this.entry] || [184, 218]; }
  dropPoint(slot) { const c = this.formationCentre(); return [c[0] + (slot % 2 ? 22 : -22), c[1]]; }
  nearestPlayer(x, y) {
    let best = null, bd = 1e9;
    for (const c of this.players) { if (!c.inPlay || c.state === 'out') continue; const d = (c.x - x) * (c.x - x) + (c.y - y) * (c.y - y); if (d < bd) { bd = d; best = c; } }
    return best;
  }
  get livePlayers() { return this.players.filter(c => c.state === 'play' || c.state === 'walk' || c.state === 'drop' || c.state === 'dead'); }
  hurtPlayer(c, dmg, src) {
    const real = Math.max(1, Math.round(dmg)); if (dmg <= 0) return false;
    if (!c.hurt(real, src, this)) return false;
    this.run.ratings.R = Math.max(0, this.run.ratings.R - 12 * MT.T.ratingsGain); this.run.ratings.lastGain = this.time;
    return true;
  }
  wallClamp(c) {
    const A = MT.ARENA, pad = 6;
    const openN = this.doorState.N.state === 'exit', openS = this.doorState.S.state === 'exit', openE = this.doorState.E.state === 'exit', openW = this.doorState.W.state === 'exit';
    // a door that is an exit (or open) lets a contestant through its gap, to the trigger
    const inN = c.x > 160 && c.x < 208, inS = inN, inE = c.y > 96 && c.y < 144, inW = inE;
    if (c.x < A.X0 + pad && !(openW && inW)) c.x = A.X0 + pad;   // (exits only: an open door during a wave is a wall)
    if (c.x > A.X1 - pad && !(openE && inE)) c.x = A.X1 - pad;
    if (c.y < A.Y0 + pad && !(openN && inN)) c.y = A.Y0 + pad;
    if (c.y > A.Y1 - pad && !(openS && inS)) c.y = A.Y1 - pad;
    if (c.y < A.Y0 - 14 && openN) c.y = A.Y0 - 14; if (c.y > A.Y1 + 14 && openS) c.y = A.Y1 + 14;
    if (c.x < A.X0 - 14 && openW) c.x = A.X0 - 14; if (c.x > A.X1 + 14 && openE) c.x = A.X1 + 14;
    for (const s of this.solids) { const dx = c.x - s.x, dy = c.y - s.y, d = Math.hypot(dx, dy), m = s.r + c.r; if (d < m && d > 0) { c.x = s.x + dx / d * m; c.y = s.y + dy / d * m; } }
    if (this.cage && this.cage.up < 1) { const dx = c.x - this.cage.x, dy = c.y - this.cage.y, d = Math.hypot(dx, dy); if (d < 14 + c.r && d > 0) { c.x = this.cage.x + dx / d * (14 + c.r); c.y = this.cage.y + dy / d * (14 + c.r); } }
  }
  touchFloor(c) { /* conveyors push, splats slow: applied in step */ }
  doorBlocks(x, y) {   // a closed door is a wall: shots stop at it
    for (const d of ['N', 'S', 'E', 'W']) {
      const st = this.doorState[d]; if (st.state === 'exit' || st.state === 'open' || st.state === 'opening') continue;
      const D = MT.DOORS[d];
      if (d === 'N' && y < A_Y0 + 2 && x > 160 && x < 208) return true;
      if (d === 'S' && y > A_Y1 - 2 && x > 160 && x < 208) return true;
      if (d === 'W' && x < A_X0 + 2 && y > 96 && y < 144) return true;
      if (d === 'E' && x > A_X1 - 2 && y > 96 && y < 144) return true;
    }
    return false;
  }
  splatAt(x, y) { for (const s of this.splats) if (s.t > 0 && MT.dist(s.x, s.y, x, y) < s.r) return true; return false; }
  ratingsAdd(amount, why) {
    const rt = this.run.ratings; const k = MT.T.ratingsGain;
    const gain = amount > 0 ? amount * k : amount;
    rt.R = clampN(rt.R + gain, 0, 100); if (amount > 0) rt.lastGain = this.time;
    if (rt.R >= 100 && rt.primeCD <= 0 && !this.primeOn) this.startPrime();
  }
  startPrime() {
    this.primeOn = true; this.primeT = MT.T.primeTime; this.run.ratings.primeCD = 20;
    this.emit('prime', {}); for (let i = 0; i < 3; i++) this.spawnPickup(['capsule'], MT.rand(40, 330), MT.rand(30, 210), { cap: MT.pick(MT.CAPSULES) });
  }
  popup(x, y, text, color) { this.pops.push({ x, y, z: 14, text: String(text), color: color || '#ffe080', t: 1.2 }); }
  shake(n) { this.shakeN = Math.max(this.shakeN || 0, n); }
  // cash in the collector's pocket, ratings and the multiplier (§5.3)
  cashGive(c, amount, pos, label) {
    const v = Math.round(amount * this.multiplier * (this.roomCashMul || 1) * (label === 'pick' ? MT.T.cashMul : 1));
    c.cash += v; this.popup(pos ? pos.x : c.x, pos ? pos.y : c.y, '+$' + v.toLocaleString('en-US') + (label && label !== 'pick' ? ' ' + label : ''), c.color);
    this.emit('cash', { c, v }); this.checkEncore(c); return v;
  }
  // an extra life at each winnings threshold: $250,000, $750,000, $1,500,000 and $3,000,000 (§5.1)
  checkEncore(c) {
    c.lifeMark = c.lifeMark || 0;
    while (c.lifeMark < MT.LIFE_MARKS.length && c.cash >= MT.LIFE_MARKS[c.lifeMark]) { c.lifeMark++; c.lives++; this.emit('encore', { c }); }
  }
  // the room's initial state: door shutters, the walls, the key rules and the enemies waiting in the room
  buildRoom() {
    const R = this.R;
    this.roomCashMul = R.cashMul || 1;
    this.dropBoost = R.dropBoost || 1;
    if (R.key === 'crate') this.keyCrate = MT.rng.spawn() * (R.crates || []).length | 0;
    for (const [cx, cy] of (R.crates || [])) { const [x, y] = MT.cellXY(cx, cy); this.enemies.push(this.mk('crate', x, y, { counted: false })); this.solids.push({ x, y, r: 8 }); }
    for (const [cx, cy] of (R.locks || [])) { const x = 24 + cx * 16, y = 14; this.enemies.push(this.mk('lock', x, y, { counted: false })); }
    if (R.key === 'vault') this.vaultLocks = (R.locks || []).length;
    for (const [kind, cx, cy] of (R.place || [])) { const [x, y] = MT.cellXY(cx, cy); const e = this.mk(kind, x, y, { counted: false }); e.mimeKey = true; this.enemies.push(e); }
    if (R.key === 'mimes') this.mimesLeft = (R.place || []).length;
    for (const h of (R.hazards || [])) this.setupHazard(h);
    this.scheduleItems();
    if (R.key === 'place') { const [cx, cy] = R.keyAt; const [x, y] = MT.cellXY(cx, cy); this.keyPickup = this.mkPickup('key', x, y, { persist: true, belt: true }); this.pickups.push(this.keyPickup); }
    if (R.type === 'key' && R.survive) { this.cage = { x: 184, y: 120, r: 14, up: 0 }; this.keyPickup = this.mkPickup('key', 184, 120, { persist: true, caged: true }); this.pickups.push(this.keyPickup); }
    this.phase = 'enter'; this.phaseT = 0; this.placePlayers();
  }
  setupHazard(h) {
    if (h.kind === 'conveyor') for (let i = 0; i < h.rows.length; i++) { const r = h.rows[i], y0 = 24 + (r - 1) * 16 - 4, dir = h.dirs[i]; this.conveyors.push({ y0, y1: y0 + 32, dir, dirTimer: 12, warn: 0, rowIdx: r }); }
    if (h.kind === 'vents') { this.vents = h.cells.map(([cx, cy], i) => ({ x: 24 + cx * 16, y: 24 + cy * 16, cx, cy, state: 'idle', t: 0, id: i })); this.ventCycle = 0; this.ventT = 1.5; }
  }
  placePlayers() {
    const d = this.doorStart();
    this.players.forEach((c, i) => {
      if (c.state === 'out') return;
      c.x = d[0] + (i % 2 ? 10 : -10) * (this.entry === 'S' || this.entry === 'N' ? 1 : 0);
      c.y = d[1] + (i % 2 ? 10 : -10) * (this.entry === 'W' || this.entry === 'E' ? 1 : 0);
      c.state = 'walk'; c.walkT = 1.2; c.invulnT = 2; c.arrowT = 3;
    });
  }

  mk(kind, x, y, o = {}) {
    const e = new Enemy(this, kind, x, y, o);
    if (o.carry || (this.R.key === 'carrier' && this.R.carrier === kind)) e.carry = true;
    return e;
  }
  spawnEnemy(kind, x, y, o = {}) {
    if (this.enemies.length > 260) return null;
    const e = this.mk(kind, x, y, o);
    if (e.D.custom && kind === 'snake') { for (let k = 0; k < 10; k++) { const s = new Enemy(this, 'snakeSeg', x, y, { parent: e, seg: k, counted: true }); this.enemies.push(s); } }
    this.enemies.push(e); this.kindsSeen.add(kind); this.stats.spawned++; this.stats.kinds[kind] = (this.stats.kinds[kind] || 0) + 1;
    return e;
  }
  // a spawn request from a door, the audience or the ceiling (§5.5)
  spawnAt(where, kind, n, gap) {
    for (let i = 0; i < n; i++) {
      const t = i * gap * MT.T.spawnGap;
      this.spawnQ.push({ t: this.time + t, where, kind, idx: i });
    }
  }
  doorPoint(d) { const D = MT.DOORS[d]; return [D.x + D.out[0] * 20, D.y + D.out[1] * 20]; }
  // runs one queued spawn: a door opens for it, a heckler arcs in, a drop lands from the ceiling
  runSpawn(s) {
    const { where, kind } = s;
    if (where === 'audience') {
      const side = MT.rng.spawn() < .5 ? 'W' : 'E', sx = side === 'W' ? -30 : 398, sy = MT.rand(60, 180);
      const tx = side === 'W' ? MT.rand(30, 80) : MT.rand(290, 340), ty = MT.rand(50, 190);
      const e = this.spawnEnemy(kind, sx, sy, { entering: true, cd: 1.6 }); if (e) { e.arc = { sx, sy, tx, ty, t: 0 }; e.z = 0; }
      return;
    }
    if (where === 'drop') {
      const p = this.randomFreePoint(); this.dropShadows = this.dropShadows || []; this.dropShadows.push({ x: p[0], y: p[1], t: .6, kind });
      this.pendingDrop = this.pendingDrop || []; this.pendingDrop.push({ x: p[0], y: p[1], kind, t: .6 });
      return;
    }
    if (Array.isArray(where)) { const [cx, cy] = where; const [x, y] = MT.cellXY(cx, cy); this.spawnEnemy(kind, x, y, { }); return; }
    const d = where === 'random' ? MT.pick(['N', 'S', 'E', 'W'], MT.rng.spawn) : where;
    const D = MT.DOORS[d]; if (!D) return;
    const st = this.doorState[d];
    if (st.state === 'closed' || st.state === 'closing') { st.state = 'opening'; st.t = 0; this.emit('door-open', { d }); }
    const [x, y] = this.doorPoint(d);
    this.spawnEnemy(kind, x, y, { entering: true, face: Math.atan2(D.out[1], D.out[0]) + (MT.rng.spawn() - .5) * .6 });
    st.lastSpawn = this.time;
  }
  randomFreePoint() {   // a free point at least 50 from every contestant
    for (let i = 0; i < 60; i++) {
      const x = MT.rand(40, 330), y = MT.rand(40, 200);
      if (this.players.every(c => MT.dist(c.x, c.y, x, y) >= 50)) return [x, y];
    }
    return [184, 120];
  }
  spawnPickup(kinds, x, y, o = {}) { const k = MT.pick(kinds); const p = this.mkPickup(k, x, y, o); this.pickups.push(p); return p; }
  mkPickup(kind, x, y, o = {}) {
    const P = { kind, x, y, z: 0, life: o.persist ? Infinity : 9, age: 0, persist: !!o.persist, cap: o.cap, belt: o.belt, caged: o.caged, timer: o.timer, val: 0 };
    if (kind === 'bill') P.val = 100; else if (kind === 'stack') P.val = 500; else if (kind === 'gold') P.val = 1000; else if (kind === 'case') P.val = 5000;
    if (kind === 'prize') P.prize = this.nextPrize(); P.val = P.prize ? P.prize[1] : 0;
    if (kind === 'capsule') P.kind = 'capsule';
    if (kind === 'statuette') P.persist = true;
    if (kind === 'bomb' || kind === 'life') P.kind = kind;
    return P;
  }
  nextPrize() {
    const ep = MT.EPISODES[this.ep - 1] || MT.EPISODES[0], deck = this.run.prizeDeck[this.ep] || (this.run.prizeDeck[this.ep] = ep.prizes.map((_, i) => i));
    if (!deck.length) return null;   // no repeats: the table is shuffled with the run's seed, then runs out
    const i = Math.floor(MT.rng.drops() * deck.length) % deck.length;
    return ep.prizes[deck.splice(i, 1)[0]];
  }
  // what a dead enemy leaves behind (§5.8): the drop table scaled by the Drop chance slider
  dropFrom(e) {
    const t = MT.DROPS[e.kind]; if (!t) return;
    for (const [item, p] of t) {
      if (MT.rng.drops() < p * MT.T.dropMul * (this.dropBoost || 1)) {
        const it = item === 'capsule' ? 'capsule' : item === 'prize' ? 'prize' : item;
        const pk = it === 'bill' ? 'bill' : it === 'stack' ? 'stack' : it === 'case' ? 'case' : it === 'prize' ? 'prize' : 'capsule';
        const pu = this.mkPickup(pk, e.x, e.y, { cap: pk === 'capsule' ? MT.pick(MT.CAPSULES, MT.rng.drops) : undefined });
        if (pu.kind === 'prize' && !pu.prize) continue;
        this.pickups.length < 60 && this.pickups.push(pu);
      }
    }
    if (e.carry && this.R.key !== 'place') this.keyDrop(e.x, e.y);
  }
  keyDrop(x, y) { if (this.keyDropped) return; this.keyDropped = true; this.pickups.push(this.mkPickup('key', x, y, { persist: true })); }
  // a hit on an enemy: the damage pipeline (§5.8). Brutes stunned take double damage; bosses have their own.
  damageEnemy(e, dmg, killer, src) {
    if (!e.alive) return false;
    if (e.kind === 'crate' || e.kind === 'lock') {
      e.hp -= dmg; this.popup(e.x, e.y, '', '#fff'); if (e.hp <= 0) this.enemyDied(e, killer, 'break'); this.sparks(e.x, e.y, 3); return true;
    }
    let m = e.stun > 0 && e.kind === 'brute' ? 2 : 1;
    if (e.kind === 'mime' && e.blast === undefined) { this.enemyDied(e, killer, 'pop'); return true; }   // a mime shot first pops harmlessly
    e.hp -= dmg * m; e.flash = .12; this.stats.hits++;
    if (e.hp <= 0) { this.enemyDied(e, killer, 'kill'); return true; }
    this.emit('hit', { e, dmg, killer }); return true;
  }
  enemyDied(e, killer, why) {
    if (e.deadDone) return; e.deadDone = true;
    e.alive = false; e.hp = 0;
    if (killer && killer.kills !== undefined) { killer.kills++; }
    if (e.kind === 'crate') { this.crateSpill(e, killer); return; }
    if (e.kind === 'lock') { this.lockBroke(e, killer); return; }
    if (e.kind === 'snakeSeg') { this.emit('segment', { e }); }
    const cash = e.cash;
    if (killer && cash) this.cashGive(killer, cash, { x: e.x, y: e.y }, '');
    if (e.rat) this.ratingsAdd(e.rat * 1, 'kill');
    this.stats.kills++;
    this.emit('kill', { e, killer, why, big: ['tank', 'brute', 'snake', 'disco', 'discoBig'].includes(e.kind) });
    if (e.D.onDeath) e.D.onDeath(e, this);
    if (e.kind === 'mime' && this.R.key === 'mimes') { this.mimesLeft--; if (this.mimesLeft <= 0) this.keyDrop(e.x, e.y); }
    if (e.kind === 'tank' && why !== 'burst') this.blastRing(e.x, e.y, 30, 1, e);
    this.burst(e);
    this.dropFrom(e);
    if (e.kind === 'hecklerKing') this.keyDrop(e.x, e.y);
    if (e.kind === 'brute' && e.carry) this.keyDrop(e.x, e.y);
  }
  crateSpill(e, killer) {
    const n = 3 + Math.floor(MT.rng.drops() * 3);
    for (let i = 0; i < n; i++) this.pickups.push(this.mkPickup('bill', e.x + MT.rand(-8, 8), e.y + MT.rand(-8, 8)));
    if (MT.rng.drops() < .5) this.pickups.push(this.mkPickup('prize', e.x, e.y));
    if (this.R.key === 'crate' && this.crateIndex(e) === this.keyCrate) this.keyDrop(e.x, e.y);
    this.burst(e); this.emit('crate', { e });
  }
  crateIndex(e) { const C = this.enemies.filter(o => o.kind === 'crate'); return C.indexOf(e); }
  lockBroke(e, killer) {
    this.burst(e); this.emit('lock', { e });
    if (this.enemies.filter(o => o.kind === 'lock' && o.alive).length === 0 && this.R.key === 'vault') {
      for (let i = 0; i < 10; i++) this.pickups.push(this.mkPickup('bill', 184 + MT.rand(-30, 30), 120 + MT.rand(-30, 30)));
      this.pickups.push(this.mkPickup('key', 184, 60, { persist: true })); this.emit('vault', {});
    }
  }
  // the burst on death: confetti in the enemy's palette and a shake for the big ones
  burst(e) { this.bursts = this.bursts || []; this.bursts.push({ x: e.x, y: e.y, t: .5, big: ['tank', 'brute', 'snake'].includes(e.kind), kind: e.kind }); }
  sparks(x, y, n) { this.bursts = this.bursts || []; this.bursts.push({ x, y, t: .25, big: false, kind: 'spark', n }); }
  blastRing(x, y, r, dmg, source) {
    this.rings = this.rings || []; this.rings.push({ x, y, r, t: .35 });
    for (const c of this.players) if (c.inPlay && MT.dist(c.x, c.y, x, y) < r) this.hurtPlayer(c, dmg, { x, y });
    for (const o of this.enemies) if (o.alive && o !== source && o.counted && MT.dist(o.x, o.y, x, y) < r) this.damageEnemy(o, 3, null);
  }
  // foe bullets (§5.8): kinds orb, shard, beam, shell, tomato, butter, gravy, coin, card, static, tot
  fShot(x, y, a, speed, kind, o = {}) {
    const s = { x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, kind, r: kind === 'beam' ? 2 : kind === 'shell' ? 4 : 2.5, life: 6, team: 'f', dmg: 1, z: o.z, vz: o.vz };
    if (this.fShots.length > 220) return null;
    this.fShots.push(s); return s;
  }
  burstShards(e, n, speed, life) { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; this.fShots.push({ x: e.x, y: e.y, vx: Math.cos(a) * speed * MT.T.enemyBulletSpeed, vy: Math.sin(a) * speed * MT.T.enemyBulletSpeed, kind: 'shard', r: 2, life, team: 'f', dmg: 1 }); } this.burst(e); }
  lobTomato(e, p, t) {
    const vx = p.vx || 0, vy = p.vy || 0, tx = p.x + vx * t, ty = p.y + vy * t;
    this.lobs.push({ sx: e.x, sy: e.y, x: e.x, y: e.y, z: 14, tx, ty, t: 0, dur: t, kind: 'tomato', owner: e });
    this.decals.push({ x: tx, y: ty, t: t + .1, kind: 'ring' });
    this.emit('telegraph', { e, kind: 'heckler' });
  }
  popcorn(c, a) { MT.projectiles.popcorn(this, c, a); }
  pshot(x, y, a, speed, dmg, owner) { MT.projectiles.pshot(this, x, y, a, speed, dmg, owner); }
  rocket(x, y, a, owner) { MT.projectiles.rocket(this, x, y, a, owner); }
  rocketBoom(k, hit) {
    this.blastRing2(k.x, k.y, 24, 3, k.owner, hit ? 4 : 0);
    this.emit('boom', { x: k.x, y: k.y }); this.rings = this.rings || []; this.rings.push({ x: k.x, y: k.y, r: 24, t: .3 });
  }
  blastRing2(x, y, r, splash, owner, direct) {
    for (const o of this.enemies) if (o.alive && o.counted && MT.dist(o.x, o.y, x, y) < r + o.r) this.damageEnemy(o, splash * MT.T.dmgMul, owner);
    if (direct) for (const o of this.enemies) if (o.alive && MT.dist(o.x, o.y, x, y) < o.r + 3) { this.damageEnemy(o, direct * MT.T.dmgMul, owner); break; }
  }
  popcornBoom(l) {
    this.blastRing2(l.x, l.y, 18, 2, l.owner.kind ? null : l.owner, 0);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; this.pShots.push({ x: l.x, y: l.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, r: 2, dmg: 1.5, owner: l.owner, life: .35, kind: 'kernel', pierce: 1, hitSet: new Set() }); }
    this.rings = this.rings || []; this.rings.push({ x: l.x, y: l.y, r: 18, t: .25 });
    this.emit('pop', { x: l.x, y: l.y });
  }
  laserBeam(c, aim, dt) {
    const want = aim; let d = (want - (c.laserA ?? want)); d = Math.atan2(Math.sin(d), Math.cos(d));
    c.laserA = (c.laserA ?? want) + clampN(d, -7 * dt, 7 * dt);
    const a = c.laserA, mx = c.x + Math.cos(a) * 10, my = c.y + Math.sin(a) * 10;
    let L = 0; while (L < 420 && MT.inArena(mx + Math.cos(a) * L, my + Math.sin(a) * L, -1) && !this.doorBlocks(mx + Math.cos(a) * L, my + Math.sin(a) * L)) L += 4;
    c.laser = { x0: mx, y0: my, x1: mx + Math.cos(a) * L, y1: my + Math.sin(a) * L, t: .05 };
    for (const e of this.enemies) if (e.alive) {
      const px = e.x - mx, py = e.y - my, t = clampN((px * Math.cos(a) + py * Math.sin(a)), 0, L), dx = mx + Math.cos(a) * t - e.x, dy = my + Math.sin(a) * t - e.y;
      if (Math.hypot(dx, dy) < e.r + 2) this.damageEnemy(e, 16 * dt * MT.T.dmgMul, c);
    }
    if (this.laserHum === undefined || c.laserT === undefined || this.time - c.laserT > .12) { c.laserT = this.time; this.emit('laser', { c }); }
  }
  recordHits(c, o, dt) {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (MT.dist(e.x, e.y, o.x, o.y) < e.r + 4) { e.recCd = e.recCd || 0; if (e.recCd <= 0) { e.recCd = .15; this.damageEnemy(e, 2 * MT.T.dmgMul, c); } }
    }
    for (const s of this.fShots) if (MT.dist(s.x, s.y, o.x, o.y) < 6 && ['orb', 'shard', 'coin', 'card', 'static'].includes(s.kind)) s.dead = true;
  }
  // the showstopper: every enemy on screen takes 25, foe bullets go, enemies stun for a second (§5.1)
  showstop(c) {
    if (!c.infiniteBombs && c.bombs <= 0) return false;
    if (!c.infiniteBombs) c.bombs--;
    c.bombFlash = .12; this.flashT = .12; this.emit('showstop', { c });
    this.fShots.length = 0; this.rings = this.rings || []; this.rings.push({ x: c.x, y: c.y, r: 120, t: .45 });
    for (const e of this.enemies) if (e.alive) { if (e.counted || e.kind === 'crate' || e.kind === 'lock') this.damageEnemy(e, 25 * MT.T.dmgMul, c); e.stun = e.kind === 'brute' ? e.stun : 1.0; }
    this.ratingsAdd(8, 'stop');
    if (this.onShowstop) this.onShowstop(c);
    return true;
  }
  // the contact of records and shield on enemies, once a step
  shieldContact(dt) {
    for (const c of this.players) if (c.shielded && c.inPlay) for (const e of this.enemies) if (e.alive && e.counted && MT.dist(e.x, e.y, c.x, c.y) < 12) { e.shieldCd = (e.shieldCd || 0) - dt; if (e.shieldCd <= 0) { e.shieldCd = .2; this.damageEnemy(e, 1, c); } }
  }
  // the exit triggers: the first contestant into an exit's gap picks it; 0.8 s later everyone goes
  exitCheck() {
    if (this.phase !== 'exit' || this.exitPick) return;
    for (const d of ['N', 'S', 'E', 'W']) {
      const st = this.doorState[d]; if (st.state !== 'exit') continue;
      const T = MT.DOORS[d];
      for (const c of this.players) {
        if (!c.inPlay || c.state === 'out') continue;
        const beyond = d === 'N' ? c.y < MT.ARENA.Y0 - 4 : d === 'S' ? c.y > MT.ARENA.Y1 + 4 : d === 'W' ? c.x < MT.ARENA.X0 - 4 : c.x > MT.ARENA.X1 + 4;
        if (beyond) { this.exitPick = { d, c, t: .8 }; this.emit('exit-pick', { d, c, to: this.R.exits[d] }); return; }
      }
    }
  }
  allClear() { return !this.enemies.some(e => e.alive && e.counted) && this.spawnQ.length === 0 && !this.pendingDrop?.length; }
  // the room script (§5.7): waves start by their timers or when few enough counted enemies remain
  runWaves() {
    const R = this.R;
    if (R.survive) return this.runSurvive();
    this.tasks.push(MT.task(this.waveScript(R)));
  }
  *waveScript(R) {
    const players = Math.max(1, this.players.filter(c => c.state !== 'out').length);
    const scale = (n) => Math.max(1, Math.round(n * (1 + .35 * (players - 1)) * MT.T.waveSize * this.diffMul));
    let lastAt = 0;
    for (let wi = 0; wi < R.waves.length; wi++) {
      const w = R.waves[wi];
      if (w.spawn.length && w.spawn[0][0] === 'script') { this.runScript(w.spawn[0][1]); yield 1; continue; }
      const start = this.time;
      // wait: at seconds since the previous wave began, or when the counted field thins to 'left'
      while (true) {
        const elapsed = this.time - start;
        if (w.at !== undefined && w.at !== null && elapsed >= w.at) break;
        if (w.left !== undefined && this.aliveCounted <= w.left && (w.at === undefined || w.at === null || elapsed >= .5)) break;
        if ((w.at === undefined || w.at === null) && w.left === undefined) break;
        yield 0.05;
      }
      this.waveIdx = wi + 1;
      for (const [door, kind, n, gap = .25] of w.spawn) {
        const k = scale(n);
        if (door === 'all') for (const d of ['N', 'S', 'E', 'W']) this.spawnAt(d, kind, k, gap);
        else if (door === 'sides') for (const d of ['E', 'W']) this.spawnAt(d, kind, k, gap);
        else if (door === 'ends') for (const d of ['N', 'S']) this.spawnAt(d, kind, k, gap);
        else if (door === 'audience') this.spawnAt('audience', kind, k, gap);
        else if (door === 'drop') this.spawnAt('drop', kind, k, gap);
        else if (door === 'random') this.spawnAt('random', kind, k, gap);
        else if (Array.isArray(door)) this.spawnAt(door, kind, k, gap);
        else this.spawnAt(door, kind, k, gap);
      }
      for (const it of (w.items || [])) this.waveItem(it);
      this.emit('wave', { i: wi + 1, n: R.waves.length });
    }
    this.wavesDone = true;
  }
  waveItem([kind, where]) {
    const at = where === 'center' ? [184, 120] : where === 'drop' ? this.randomFreePoint() : [24 + 16 * (where[0] || 0), 24 + 16 * (where[1] || 0)];
    this.pickups.push(this.mkPickup('capsule', at[0], at[1], { cap: kind }));
  }
  runScript(name) {   // scripted events: the Pyro Pit's finale burst
    if (name === 'finaleBurst') {
      this.tasks.push(MT.task((function* (W) {
        for (const v of W.vents) { v.burst = true; }
        W.vents.forEach((v, i) => { v.fireAt = .6 + (i % 4) * .15; });
        yield 3.0;
        W.pickups.push(W.mkPickup('key', 184, 120, { persist: true }));
        W.emit('key-rise', {});
      })(this)));
    }
  }
  // the survive room (1-4): the streams and the timer, the cage lifting at 20 s, the final wave at the end
  runSurvive() {
    const R = this.R;
    this.survive = { t: 0, streams: R.streams.map(s => ({ t: 0, every: s.every, spawn: s.spawn })), done: false };
    this.tasks.push(MT.task((function* (W) {   // the timer, then the last wave: all goons from every door
      yield R.survive;
      W.survive.done = true;
      for (const [door, kind, n] of R.final) for (const d of (door === 'all' ? ['N', 'S', 'E', 'W'] : [door])) W.spawnAt(d, kind, n, .3);
      yield 1;
      W.wavesDone = true;
    })(this)));
  }
  stepSurvive(dt) {
    const S = this.survive; if (!S || S.done) return;
    S.t += dt;
    if (S.t > this.R.cageUntil && this.cage && this.cage.up < 1) { this.cage.up = Math.min(1, this.cage.up + dt * 1.4); if (this.cage.up >= 1) { this.cage = null; this.emit('cage-open', {}); } }
    for (const st of S.streams) { st.t += dt; if (st.t >= st.every) { st.t = 0; for (const [d, kind, n] of st.spawn) { if (d === 'random') this.spawnAt('random', kind, n, .2); else for (const dd of ['N', 'S', 'E', 'W']) if (st.spawn.length > 1 || d === dd) this.spawnAt(dd, kind, n, .2); } } }
    if (this.keyPickup && !this.cage) { this.keyPickup.caged = false; }
  }
  // hazards: conveyors push, vents fire on a pattern, splats slow (§5.5)
  stepHazards(dt) {
    for (const cv of this.conveyors) {
      cv.dirTimer -= dt;
      if (cv.dirTimer < 1.5 && !cv.warned) { cv.warned = true; this.emit('conveyor-warn', {}); }
      if (cv.dirTimer <= 0) { cv.dir = -cv.dir; cv.dirTimer = 12; cv.warned = false; }
      const push = 40 * cv.dir * dt;
      const inBelt = (x, y) => y > cv.y0 && y < cv.y1;
      for (const c of this.players) if (c.inPlay && inBelt(c.x, c.y) && c.state === 'play') { c.x += push; if (c.x < MT.ARENA.X0 + 6) c.x = MT.ARENA.X0 + 6; if (c.x > MT.ARENA.X1 - 6) c.x = MT.ARENA.X1 - 6; }
      for (const e of this.enemies) if (e.alive && inBelt(e.x, e.y) && e.counted) e.x += push;
      for (const p of this.pickups) if (p.belt && inBelt(p.x, p.y)) { p.x += push * .9; if (p.x < 40) p.x = 340; if (p.x > 344) p.x = 40; }
    }
    if (this.vents.length) this.stepVents(dt);
    for (const s of this.splats) { s.t -= dt; }
    this.splats = this.splats.filter(s => s.t > 0);
  }
  stepVents(dt) {
    this.ventT -= dt;
    if (this.ventT <= 0) {   // the pattern cycles every 3.5 s: a row, a column, a checker, all but one lane
      this.ventT = 3.5; this.ventCycle = (this.ventCycle + 1) % 4;
      const lane = Math.floor(MT.rng.spawn() * 4);
      for (const v of this.vents) {
        const row = Math.round((v.cy - 3) / 3), col = Math.round((v.cx - 4) / 4);
        let on = false;
        if (this.ventCycle === 0) on = row === (this.ventIdx || 0) % 3;
        else if (this.ventCycle === 1) on = col === (this.ventIdx || 0) % 4;
        else if (this.ventCycle === 2) on = (row + col) % 2 === 0;
        else on = col !== lane;
        if (on && v.state === 'idle') { v.state = 'telegraph'; v.t = 1.0; this.emit('vent-tele', { v }); }
      }
      this.ventIdx = (this.ventIdx || 0) + 1;
    }
    for (const v of this.vents) {
      if (v.fireAt !== undefined) { v.fireAt -= dt; if (v.fireAt <= 0) { v.fireAt = undefined; v.state = 'telegraph'; v.t = 1.0; } }
      if (v.state === 'telegraph') { v.t -= dt; if (v.t <= 0) { v.state = 'flame'; v.t = 1.2; this.emit('vent-fire', { v }); } }
      else if (v.state === 'flame') {
        v.t -= dt;
        for (const c of this.players) if (c.inPlay && MT.dist(c.x, c.y, v.x, v.y) < 12) this.hurtPlayer(c, 1, { x: v.x, y: v.y });
        for (const e of this.enemies) if (e.alive && e.counted && MT.dist(e.x, e.y, v.x, v.y) < 12) this.damageEnemy(e, 3 * dt, null);
        if (v.t <= 0) v.state = 'idle';
      }
    }
  }
  // the room clock: the spawns queue, pendings, pickups' lifetimes, the stunt, Prime Time and the decays
  step(dt) {
    this.time += dt; this.phaseT += dt;
    this.tickTasks(dt);
    this.evq.length > 500 && (this.evq.length = 0);
    // queued spawns that are due
    if (this.spawnQ.length) {
      const due = this.spawnQ.filter(s => s.t <= this.time);
      if (due.length) { this.spawnQ = this.spawnQ.filter(s => s.t > this.time); for (const s of due) this.runSpawn(s); }
    }
    if (this.pendingDrop) { for (const d of this.pendingDrop) { d.t -= dt; if (d.t <= 0) { d.done = true; this.spawnEnemy(d.kind, d.x, d.y, {}); } } this.pendingDrop = this.pendingDrop.filter(d => !d.done); }
    for (const d of ['N', 'S', 'E', 'W']) this.stepDoor(d, dt);
    this.stepHazards(dt);
    if (this.survive) this.stepSurvive(dt);
    // the contestants
    for (const c of this.players) {
      if (c.state === 'out') continue;
      if (c.state === 'dead') { c.step(dt, { move: [0, 0], aim: null, fire: false, slide: false, bomb: false, showboat: false }, this); continue; }
      const I = c.intent || { move: [0, 0], aim: null, fire: false, slide: false, bomb: false, showboat: false };
      c.step(dt, I, this);
      c.intent = null;
    }
    // the enemies: AI, then their attacks on contestants
    for (const e of this.enemies) if (e.alive) {
      e.t += dt; if (e.flash > 0) e.flash -= dt;
      if (e.entering && !e.arc) {   // a spawn from a door walks straight in, through the wall, until it is inside
        const dx = 184 - e.x, dy = 120 - e.y, d = Math.hypot(dx, dy) || 1, st = Math.min(d, 60 * MT.T.enemySpeed * dt);
        e.x += dx / d * st; e.y += dy / d * st; e.face = Math.atan2(dy, dx);
        if (MT.inArena(e.x, e.y, 0)) e.entering = false;
        continue;
      }
      e.D.update.call(e.D, e, dt, this);
    }
    for (const e of this.enemies) if (e.entering && MT.inArena(e.x, e.y, 0)) e.entering = false;
    this.enemies = this.enemies.filter(e => e.alive);
    // the projectiles and the shields
    MT.projectiles.updateRockets(this, dt);
    MT.projectiles.updateLobs(this, dt);
    MT.projectiles.updateShots(this, dt);
    this.shieldContact(dt);
    this.collideShots(dt);
    this.collideFoes(dt);
    this.updatePickups(dt);
    this.updateRunningRatings(dt);
    this.stepBossHazards(dt);
    this.exitCheck();
    if (this.exitPick) { this.exitPick.t -= dt; if (this.exitPick.t <= 0) { const p = this.exitPick; this.exitPick = null; this.leaveDoor = p.d; this.leaveTo = this.R.exits[p.d]; this.emit('leave', { d: p.d, to: this.leaveTo }); this.phase = 'left'; } }
    // the phases
    this.stepPhase(dt);
    this.tickMisc(dt);
  }
  tickMisc(dt) {
    for (const p of this.pops) { p.t -= dt; p.z += 16 * dt; }
    this.pops = this.pops.filter(p => p.t > 0);
    if (this.bursts) { for (const b of this.bursts) b.t -= dt; this.bursts = this.bursts.filter(b => b.t > 0); }
    if (this.rings) { for (const r of this.rings) r.t -= dt; this.rings = this.rings.filter(r => r.t > 0); }
    for (const d of this.decals) d.t -= dt; this.decals = this.decals.filter(d => d.t > 0);
    if (this.dropShadows) { for (const s of this.dropShadows) s.t -= dt; this.dropShadows = this.dropShadows.filter(s => s.t > 0); }
    if (this.flashT) this.flashT = Math.max(0, this.flashT - dt);
    if (this.shakeN) this.shakeN = Math.max(0, this.shakeN - dt * 20);
    for (const c of this.players) { if (c.laser) { c.laser.t -= dt; if (c.laser.t <= 0) c.laser = null; } }
    if (this.phase === 'bonus') this.bonusT = (this.bonusT || 0) + dt;
    if (this.primeOn) { this.primeT -= dt; if (this.primeT <= 0) { this.primeOn = false; this.run.ratings.R = 60; this.emit('prime-end', {}); } }
    this.run.ratings.primeCD = Math.max(0, this.run.ratings.primeCD - dt);
    for (const d of ['N', 'S', 'E', 'W']) this.doorState[d].exitOn = this.doorState[d].state === 'exit';
  }
  stepDoor(d, dt) {
    const st = this.doorState[d];
    if (st.state === 'opening') { st.t += dt; st.up = Math.min(1, st.t / .35); if (st.t >= .35) { st.state = 'open'; st.t = 0; st.up = 1; } }
    else if (st.state === 'open') { st.t += dt; const busy = this.spawnQ.some(s => s.where === d) || this.enemies.some(e => e.entering && e.spawnDoor === d); if (!busy && st.t > .6 && this.phase !== 'exit') { st.state = 'closing'; st.t = 0; } }
    else if (st.state === 'closing') { st.t += dt; st.up = Math.max(0, 1 - st.t / .3); if (st.t >= .3) { st.state = 'closed'; st.up = 0; st.t = 0; } }
    if (st.state === 'exit') st.up = 1;
  }
  updateRunningRatings(dt) {
    const rt = this.run.ratings;
    if (this.time - rt.lastGain > 2.5) rt.R = Math.max(0, rt.R - MT.T.ratingsDecay * dt);
    if (rt.R < 5 && this.phase === 'waves' && !this.stunt && this.players.some(c => c.inPlay)) { this.lowRatT += dt; if (this.lowRatT >= 10) this.runStunt(); }
    else this.lowRatT = 0;
    if (rt.primeCD > 0 && rt.R >= 100 && !this.primeOn) rt.R = 99;
  }
  runStunt() {   // the producers release the episode's stunt from a random door, once per room (§5.4)
    this.stunt = true; const S = MT.EPISODES[this.ep - 1].stunt;
    this.emit('stunt', { stunt: S });
    this.ratingsAdd(15, 'stunt');
    for (let i = 0; i < S.n; i++) {
      const d = MT.pick(['N', 'S', 'E', 'W'], MT.rng.spawn);
      if (S.kind === 'clapbot') this.spawnAt(d, 'clapbot', 1, .2);
      else if (S.kind === 'tank') this.spawnAt(d, 'tank', 1, .2);
      else this.spawnAt(d, 'brute', 1, .2);
    }
  }
  // the phases: ENTER (1.2 s walk-in), INTRO (the room's line), WAVES, CLEAR (bonus, banner), EXIT (doors open), LEFT
  stepPhase(dt) {
    const R = this.R;
    if (this.phase === 'enter') {
      if (this.phaseT >= 1.2) { this.phase = 'intro'; this.phaseT = 0; this.emit('room-intro', { room: R }); }
      return;
    }
    if (this.phase === 'intro') {
      if (this.phaseT >= 1.6 || this.noIntro) { if (this.R.type === 'boss') { this.phase = 'boss'; this.phaseT = 0; return; } this.phase = 'waves'; this.phaseT = 0; this.waveStart = this.time; this.runWaves(); this.emit('waves', {}); }
      return;
    }
    if (this.phase === 'waves') {
      if (this.survive && this.survive.done && this.wavesDone && this.allClear()) this.enterClear();
      else if (!this.survive && this.wavesDone && this.allClear()) this.enterClear();
      if (this.R.type === 'key' && this.R.survive && this.survive && !this.survive.done) { /* counting down */ }
      return;
    }
    if (this.phase === 'clear') {
      this.clearT += dt;
      if (this.clearT > .8) { this.phase = 'exit'; this.phaseT = 0; this.openExits(); }
      return;
    }
    if (this.phase === 'exit') {
      this.hurryT += dt;
      if (this.hurryT > 25 && (this.hurryT - 25) % 6 < dt) { for (const d of ['N', 'S', 'E', 'W']) if (!this.R.exits[d]) this.spawnAt(d, 'clapbot', 4, .2); this.emit('hurry', {}); }
      return;
    }
    if (this.phase === 'left') { return; }
    if (this.phase === 'boss' || this.phase === 'bossdone') return;
  }
  tickTasks(dt) {
    for (const t of this.tasks) {
      if (t.done) continue;
      if (t.wait > 0) { t.wait -= dt; continue; }
      if (t.cond) { if (!t.cond()) continue; t.cond = null; }
      const r = t.gen.next(); if (r.done) { t.done = true; continue; }
      const v = r.value;
      if (typeof v === 'number') t.wait = v; else if (typeof v === 'function') t.cond = v;
    }
    this.tasks = this.tasks.filter(t => !t.done);
  }
  enterClear() {
    this.phase = 'clear'; this.phaseT = 0; this.clearT = 0;
    this.clearTime = this.time - this.waveStart;
    const par = this.R.par, mul = this.multiplier;
    for (const c of this.players) if (c.state === 'play' || c.state === 'walk') {
      const bonus = 1000 * this.ep * mul * (this.clearTime <= par ? 1.5 : 1);
      c.cash += Math.round(bonus);
      this.popup(c.x, c.y, '+$' + Math.round(bonus).toLocaleString('en-US') + ' CLEAR', c.color);
    }
    this.run.roomsCleared++;
    this.magnetOn = true;
    this.emit('clear', { par: this.clearTime <= par, time: this.clearTime });
  }
  openExits() {   // the room's exits open: their cells become floor, and the signs light
    this.phase = 'exit'; this.hurryT = 0;
    for (const d of Object.keys(this.R.exits)) {
      this.doorState[d].state = 'exit'; this.doorState[d].to = this.R.exits[d];
      for (const [cx, cy] of MT.DOOR_CELLS[d]) this.map.set(cx, cy, 0);
    }
    this.emit('exits', { exits: this.R.exits });
  }
  // pickups: collected by the contestant that touches them, keys shared, prizes and cash to the collector (§5.3)
  updatePickups(dt) {
    for (const p of this.pickups) {
      p.age += dt; if (!p.persist) p.life -= dt;
      if (p.caged && this.cage) continue;
      if (this.magnetOn && p.kind !== 'capsule' && p.kind !== 'bomb' && p.kind !== 'life' && p.kind !== 'statuette') {
        let best = null, bd = 60;
        for (const c of this.players) { if (!c.inPlay) continue; const d = MT.dist(c.x, c.y, p.x, p.y); if (d < bd) { bd = d; best = c; } }
        if (best) { const dx = best.x - p.x, dy = best.y - p.y, d = Math.hypot(dx, dy) || 1; p.x += dx / d * 60 * dt; p.y += dy / d * 60 * dt; }
      }
    }
    this.pickups = this.pickups.filter(p => p.life > 0);
    for (const p of this.pickups) {
      if (p.collected) continue;
      for (const c of this.players) {
        if (!c.alive && c.state !== 'drop') continue;
        if (c.state !== 'play') continue;
        if (MT.dist(c.x, c.y, p.x, p.y) < c.r + 7) { this.collect(c, p); break; }
      }
    }
    this.pickups = this.pickups.filter(p => !p.collected);
    if (this.pickups.filter(p => p.kind === 'bill' || p.kind === 'stack').length > 25) { this.pickups = this.pickups.filter(p => !(p.kind === 'bill' && p.life < 3)); }
    if (this.pickups.filter(p => p.kind === 'capsule').length > 3) { this.pickups = this.pickups.filter(p => p.kind !== 'capsule' || !p.spill || true); }
  }
  collect(c, p) {
    p.collected = true;
    switch (p.kind) {
      case 'bill': case 'stack': case 'gold': case 'case': this.cashGive(c, p.val, null, 'pick'); this.emit('pick-cash', { c, kind: p.kind }); break;
      case 'prize': if (p.prize) { c.prizes.push(p.prize); this.cashGive(c, p.prize[1], null, 'pick'); this.ratingsAdd(2, 'prize'); this.emit('prize', { c, prize: p.prize }); } break;
      case 'key': this.takeKey(c, p); break;
      case 'capsule': c.give(p.cap); this.emit('capsule', { c, cap: p.cap }); break;
      case 'bomb': c.bombs = Math.min(3, c.bombs + 1); this.emit('bomb-pickup', { c }); break;
      case 'life': c.lives++; this.emit('encore', { c }); break;
      case 'statuette': this.bonusWon = true; this.cashGive(c, 100000, null, 'THE NETWORK'); this.emit('statuette', { c }); break;
    }
  }
  takeKey(c, p) {
    if (this.run.mode === 'session') { this.cashGive(c, 10000, null, 'KEY'); this.emit('key', { c, n: 0 }); return; }   // the Lightning Round pays for a key
    const k = this.run.keys; if (k >= 9) return;
    this.run.keys = k + 1; this.run.keyList.add(this.id + ':' + (p.id || k));
    this.ratingsAdd(5, 'key'); this.emit('key', { c, n: this.run.keys });
  }
  // the room's exit to the next: the run path grows here
  result() { return { id: this.id, time: this.time, kills: this.stats.kills, cleared: this.phase === 'left' || this.phase === 'clear' || this.phase === 'exit' }; }
}
const A_X0 = 16, A_X1 = 352, A_Y0 = 16, A_Y1 = 224;
const door_all = (final) => (final || []).some(f => f[0] === 'all');
function clampN(v, a, b) { return v < a ? a : v > b ? b : v; }
