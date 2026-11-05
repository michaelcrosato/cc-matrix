// The play session: the Builder, monsters, residents, town, clock, quests, siege, boss, and the rules that join them.
// Systems keep their own state; Play.update runs them in order, Play.draw paints the world, actors and the HUD inputs.
(() => {
const E = My3D2dge, DQ = globalThis.DQ, T = DQ.T, B = DQ.B;
const GRAV = 520, HW = 4.5, HT = 22;
DQ.GRAV = GRAV;

// ---- physics on the voxel grid: axis-separated, one-level step-ups, gravity and landing ------------------------------
DQ.moveBody = (world, b, dt, hw, ht, opt = {}) => {
  const stepOK = (nx, ny) => b.onGround && !DQ.boxHits(world, nx, ny, b.z + T, hw, ht);
  b.hitWall = false;
  let nx = b.x + b.vx * dt;
  if (b.vx) {
    if (!DQ.boxHits(world, nx, b.y, b.z, hw, ht)) b.x = nx;
    else if (stepOK(nx, b.y)) { b.x = nx; b.z += T; }
    else { b.vx = 0; b.hitWall = true; }
  }
  let ny = b.y + b.vy * dt;
  if (b.vy) {
    if (!DQ.boxHits(world, b.x, ny, b.z, hw, ht)) b.y = ny;
    else if (stepOK(b.x, ny)) { b.y = ny; b.z += T; }
    else { b.vy = 0; b.hitWall = true; }
  }
  b.vz -= GRAV * dt;
  const nz = b.z + b.vz * dt;
  if (!DQ.boxHits(world, b.x, b.y, nz, hw, ht)) { b.z = nz; b.onGround = false; }
  else if (b.vz < 0) {
    b.z = (Math.floor((nz + 0.001) / T) + 1) * T; b.vz = 0; b.onGround = true;
  } else {
    b.z = Math.floor((nz + ht) / T) * T - ht; b.vz = 0; b.onGround = false;
  }
  if (b.onGround === false && b.vz === 0 && DQ.boxHits(world, b.x, b.y, b.z - 0.5, hw, ht)) b.onGround = true;
  if (b.z < -40) { b.z = 40; b.vz = 0; } // a fall out of the world: back up (the edges are cloth; this is a guard)
  return b;
};

// ---- the Builder ------------------------------------------------------------------------------------------------------
class Builder {
  // each Builder has its own hotbar, slot and score; in a shared round every player has one (id: the hub's player id)
  constructor(x, y, z, id = 0) {
    Object.assign(this, { x, y, z, vx: 0, vy: 0, vz: 0, facing: 0, onGround: false, hitWall: false, hp: 20, maxHp: 20, belly: 100, iframe: 0, dead: 0, dodge: 0, swingT: 0, id, score: 0, castT: 0 });
    this.hotbar = ['stick', 'workbench', 'pine', 'cobble', 'lantern', 'bed', 'door', 'chest'];
    this.sel = 0;
    const cape = DQ.SEAT_COLORS ? DQ.SEAT_COLORS[id % 4] : '#c0506a';
    this.rig = new E.Humanoid({ size: 1.2, build: 'heroic', weapon: 'sword', hood: true, outfit: 'coat', colors: { skin: '#f3c9a0', hair: '#3a2a2a', cloth: '#3a4a6a', coat: '#2e3e5e', pants: '#2a2f40', cape, glove: '#5a3a2a' } });
    this.swing = new E.Attack('slash');
  }
  get alive() { return this.hp > 0; }
}

// ---- monsters: a blob that hunts whoever is near, hops over things, and hits on contact -----------------------------
class Monster {
  constructor(def, key, x, y, z) {
    Object.assign(this, { def, key, x, y, z, vx: 0, vy: 0, vz: 0, facing: 0, onGround: false, hitWall: false, cool: 0, hurt: 0, dead: false, flash: 0 });
    this.maxHp = Math.round(def.hp * DQ.tuning.monsterHealth); this.hp = this.maxHp;
    this.rig = def.kind === 'boss' ? new E.Humanoid({ size: 2.4, build: 'bulky', weapon: null, colors: def.colors })
      : new E.Blob({ R: def.kind === 'blob' && key === 'slime' ? 6 : 7, colors: def.colors, horns: !!def.horns, feet: true });
    this.hw = def.kind === 'boss' ? 12 : 5; this.ht = def.kind === 'boss' ? 36 : 12;
  }
}

// ---- residents: they live in the rooms you make; they sleep in the bed, hang about, and cheer when things go well ----
class Resident {
  constructor(def, x, y, z, home) {
    Object.assign(this, { def, x, y, z, vx: 0, vy: 0, vz: 0, facing: 0, onGround: false, hitWall: false, home, wait: 1 + Math.random() * 0,
      mode: 'idle', target: null, bed: null, hearts: 0, cheerT: 0, sleeping: false, hw: 4.5, ht: 20 });
    this.rig = new E.Humanoid({ size: 1.15, build: 'chibi', weapon: null, hat: def.hat, hair: def.hair || 'short', outfit: 'tunic', colors: def.colors });
  }
}

// ---- the session ---------------------------------------------------------------------------------------------------------
class Play {
  constructor(opts = {}) {
    this.world = new DQ.VoxelWorld();
    this.rng = DQ.rng('play:' + (opts.stream || 'main'));
    this.bag = { batting: 0 };
    this.notions = {};
    this.stats = { broken: 0, placed: 0, crafted: 0, kills: 0, snags: 0, bossKills: 0, rooms: 0 };
    this.quest = 0; this.questDone = {}; this.started = false;
    this.cheer = 0; this.townLevel = 0; this.banner = null;
    this.residents = []; this.monsters = []; this.boss = null;
    this.siege = null; this.clockT = 0; this.day = 1; this.hour = 7;
    this.fx = []; this.popups = []; this.talkQueue = []; this.remotes = new Map(); this.serverOnly = false; this.nidSeq = 0;
    this.blueprints = []; this.patterns = []; this.region = null; this.specials = { at: -1, ballistas: [], portals: [] }; this.turretCool = new Map(); this.questTimer = 0; this.spawnT = 0; this.dead = null;
    this.t = 0; this.rooms = []; this.roomT = 0; this.bee = opts.bee || null;
    this.target = null; this.lastCheer = null; this.wantTalk = null; this.nightWas = false;
    this.grantedKey = {};
    this.siege = { wave: 0, timer: 0, spawned: 0, done: false };
    DQ.generateWorld(this.world);
    const sp = this.spawn();
    this.builder = new Builder(sp.x, sp.y, sp.z);
    this.residents = [];
    this.stateOk = true;
  }
  spawn() {
    const x = 24, y = 24; return { x: x * T + 8, y: y * T + 8, z: this.world.top(x, y) * T };
  }
  // the hotbar and the slot are the Builder's (so each player in a shared round has their own)
  get hotbar() { return this.builder.hotbar; }
  set hotbar(v) { this.builder.hotbar = v; }
  get sel() { return this.builder.sel; }
  set sel(v) { this.builder.sel = v; }
  // ---- inventory --------------------------------------------------------------------------------------------------
  count(id) { return this.bag[id] || 0; }
  give(id, n = 1) {
    if (!n) return;
    const first = !this.bag[id];
    this.bag[id] = (this.bag[id] || 0) + n;
    if (first && DQ.NOTION_TEXT[id] && !this.notions[id]) { this.notions[id] = true; this.popup(DQ.NOTION_TEXT[id], '#ffe27a', 4); DQ.events.emit('notion', id); }
    if (!this.hotbar.includes(id) && DQ.ITEMS[id] && DQ.ITEMS[id].kind !== 'material' && DQ.ITEMS[id].kind !== 'key') {
      const i = this.hotbar.indexOf(null); if (i >= 0) this.hotbar[i] = id;
    }
  }
  take(id, n) { if ((this.bag[id] || 0) < n) return false; this.bag[id] -= n; if (!this.bag[id] && this.bag[id] !== undefined) delete this.bag[id]; return true; }
  has(inputs) { return Object.entries(inputs).every(([id, n]) => this.count(id) >= n); }
  nearBench() {
    const b = this.builder, cx = Math.floor(b.x / T), cy = Math.floor(b.y / T), cz = Math.floor(b.z / T);
    for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) for (let dz = -2; dz <= 3; dz++) if (this.world.get(cx + dx, cy + dy, cz + dz) === B.BENCH) return true;
    return false;
  }
  canCraft(rec) {
    if (rec.station && !this.nearBench()) return false;
    if (!rec.known && !this.notions[rec.notion]) return false;
    return this.has(rec.inputs);
  }
  craft(rec) {
    if (!this.canCraft(rec)) return false;
    for (const [id, n] of Object.entries(rec.inputs)) this.take(id, n);
    this.give(rec.out, rec.n); this.stats.crafted++;
    if (rec.id === 'club') { this.stats.club = 1; this.flagDone('notion'); }
    this.cheer += 0.5 * DQ.tuning.cheerRate;
    DQ.audio && DQ.audio.sfx('craft');
    this.popup('Made ' + DQ.itemName(rec.out) + '!', '#f5f5a0', 2);
    return true;
  }
  // ---- popups (the top-of-screen notes) ----------------------------------------------------------------------------
  popup(text, color = '#ffffff', secs = 2.5) {
    this.popups.push({ text, color, t: secs, max: secs }); if (this.popups.length > 4) this.popups.shift();
    if (DQ.net && DQ.net.host && text) DQ.net.outPop.push([text, color, secs]);
  }
  // ---- cheer, town and residents --------------------------------------------------------------------------------------
  addCheer(n, why) {
    if (!n) return; const before = this.townLevel;
    this.cheer += n * DQ.tuning.cheerRate;
    let lv = 0; for (const L of DQ.LEVELS) if (this.cheer >= L.cheer && this.banner) lv = L.level;
    this.townLevel = lv;
    if (why) this.popup('+' + Math.round(n * DQ.tuning.cheerRate) + ' Cheer: ' + why, '#ff9ad0', 2);
    if (lv > before) { const L = DQ.LEVELS[lv - 1]; this.popup(L.text, '#ffe27a', 4); this.say(['Oh, look at this! The town is coming along, my dear!'], { name: 'GRANNY GOSSAMER' }); }
  }
  // the rooms: scanned now and then. A new bedroom invites a resident in.
  scanRooms(force) {
    if (!force && this.roomT > 0) return; this.roomT = 1.5;
    const rooms = this.world.rooms();
    const had = this.rooms.length; this.rooms = rooms;
    if (rooms.length > had) this.stats.rooms = rooms.length;
    for (const r of rooms) {
      if (!r.bed || r.kind !== 'bedroom') continue;
      const key = r.bed.x + ',' + r.bed.y + ',' + r.bed.z;
      if (this.grantedKey[key]) continue;
      if (this.residents.length >= DQ.NPCS.length) continue;
      this.grantedKey[key] = true;
      const def = DQ.NPCS[this.residents.length];
      const hx = r.bed.x, hy = r.bed.y, hz = r.bed.z;
      const res = new Resident(def, (hx + 0.5) * T, (hy + 0.5) * T, hz * T, { x: hx, y: hy, z: hz, room: key });
      res.x = (hx + 0.5) * T + 6; res.y = (hy + 0.5) * T; res.z = hz * T;
      res.bed = { x: hx, y: hy, z: hz };
      this.residents.push(res);
      this.addCheer(5, def.name + ' moves in');
      this.say([def.name + ': You made a bed, and a door, and a light! For me? Oh, thank you!'], { name: def.name.toUpperCase(), portrait: res.rig });
      DQ.events.emit('residentArrived', def.id);
    }
    if (rooms.some(r => r.kind === 'workshop') && !this.grantedKey.workshop) { this.grantedKey.workshop = true; this.addCheer(3, 'a workshop'); }
  }
  // ---- quests --------------------------------------------------------------------------------------------------------
  current() { return DQ.QUESTS[this.quest] || null; }
  flagDone(id) {
    if (this.questDone[id]) return;
    const i = DQ.QUESTS.findIndex(q => q.id === id); if (i !== this.quest) return;
    this.questDone[id] = true; this.quest = i + 1; this.addCheer(5, 'a task done');
    const q = DQ.QUESTS[i];
    if (q.id === 'footing') this.give('cobble', 2);
    if (q.id === 'banner') this.give('wool', 2);
    if (q.id === 'shelter') { this.give('gossamer', 1); }
    const lines = {
      footing: ['Oh, my dear Builder! You can do it, after all. Five blocks, and each one a patch of the world coming back.', 'Take this cobble. Bring the stones home.'],
      notion: ['A notion! That\'s how it starts, my love. The Knack is in you yet.'],
      banner: ['The Banner of Mending! Plant it, and a glowing border stitches itself into the ground.', 'Now the town has a shape to grow into.'],
      shelter: ['A room! With a bed and a light and a door! And here, a thread of my own gossamer. It makes the finest tools.'],
      gnarl: ['Snags are spilling out of the Tangle Den. Drive them back, my love, and I will keep stitching.'],
      siege: ['You held the town through the night! Every patch of it still stands. I am so proud.'],
      boss: ['Gnarlgrim is unpicked! The realm is stitching itself back together.', 'Oh, my dear Builder. You made all of this.'],
    };
    if (lines[q.id]) this.say(lines[q.id], { name: 'GRANNY GOSSAMER' });
    DQ.events.emit('questDone', q.id);
    if (q.id === 'boss') this.chapterClear = true;
  }
  checkQuests() {
    const q = this.current(); if (!q) return;
    if (q.id === 'footing' && this.stats.broken >= 5) this.flagDone('footing');
    if (q.id === 'notion' && this.stats.club) this.flagDone('notion');
    if (q.id === 'banner' && this.banner) this.flagDone('banner');
    if (q.id === 'shelter' && this.residents.length >= 1) this.flagDone('shelter');
    if (q.id === 'gnarl' && this.stats.snags >= 3) this.flagDone('gnarl');
    if (q.id === 'siege' && this.siege && this.siege.done) this.flagDone('siege');
    if (q.id === 'boss' && this.stats.bossKills >= 1) this.flagDone('boss');
  }
  // the dialog: the talk box is set by the scene (this.talk), with the portrait of the speaker
  say(lines, o = {}) { this.talkQueue.push({ lines, o }); }
  // ---- the clock ----------------------------------------------------------------------------------------------------
  get dayLen() { return DQ.tuning.dayMinutes * 60; }
  get isNight() { return this.hour >= 19 || this.hour < 5.5; }
  stepClock(dt) {
    this.clockT += dt; const frac = (this.clockT / this.dayLen) * 24;
    const h = (7 + frac) % 24, prevDay = this.day;
    this.day = 1 + Math.floor((7 + frac) / 24);
    this.hour = h;
    if (this.day !== prevDay) DQ.events.emit('newDay', this.day);
  }
  sleepUntilMorning() {
    // the clock runs in whole days from 7:00, so the next 7:00 is the next whole day
    this.clockT = Math.ceil((this.clockT + 1e-6) / this.dayLen) * this.dayLen;
    this.stepClock(0);
    this.popup('You slept until morning. Good morning, my love!', '#9ef0ff', 3);
    for (const r of this.residents) { r.sleeping = false; }
  }
  // ---- targeting: the block in front, or under the pointer ------------------------------------------------------------
  targetBlock(useMouse) {
    const b = this.builder, w = this.world;
    const feet = Math.floor(b.z / T);
    let gx = null, gy = null;
    if (useMouse) { const m = this.mouseGround(); if (m) { gx = m[0]; gy = m[1]; } }
    const reach = DQ.REACH * T;
    let dir = [Math.cos(b.facing), Math.sin(b.facing)];
    if (gx !== null) { const dx = gx - b.x, dy = gy - b.y, d = Math.hypot(dx, dy) || 1; dir = [dx / d, dy / d]; }
    let best = null;
    // the search starts past the Builder's own body, so it never picks the block it stands on
    for (let d = HW + 4; d <= reach && !best; d += 3) {
      const px = gx !== null && d === HW + 4 ? gx : b.x + dir[0] * d, py = gx !== null && d === HW + 4 ? gy : b.y + dir[1] * d;
      const cx = Math.floor(px / T), cy = Math.floor(py / T);
      for (let z = feet + 1; z >= feet - 2 && z >= 1; z--) {
        if (DQ.solidBlock(w.get(cx, cy, z))) { best = { cx, cy, cz: z, px: cx, py: cy, pz: z + 1 }; break; }
      }
    }
    if (!best) return null;
    // the cell above the target is where a block goes: it must be air and clear of the Builder's body
    const overl = (lo, hi, a, b2) => lo < b2 && hi > a;
    const bodyOver = overl(b.x - HW, b.x + HW, best.px * T, (best.px + 1) * T) && overl(b.y - HW, b.y + HW, best.py * T, (best.py + 1) * T) &&
      overl(b.z, b.z + HT, best.pz * T, (best.pz + 1) * T);
    best.placeOK = !bodyOver && w.get(best.px, best.py, best.pz) === 0;
    return best;
  }
  placeAt(item, t) {
    if (!t || !t.placeOK || !this.bag[item]) return false;
    const id = DQ.ITEMS[item].block || DQ.PLACE[item];
    if (!id) return false;
    this.world.set(t.px, t.py, t.pz, id);
    this.take(item, 1); this.stats.placed++;
    if (id === B.BANNER && !this.banner) { this.banner = { x: t.px, y: t.py, z: t.pz }; this.popup('The Banner of Mending is up! The border glows.', '#69b8ec', 4); this.flagDone('banner'); this.addCheer(4, 'the Banner'); }
    if (id === B.LANTERN) this.addCheer(1 * DQ.tuning.cheerRate, '');
    if (this.world.get(t.px, t.py, t.pz) === 0) return false;
    DQ.audio && DQ.audio.sfx('stitch');
    this.popDust(t.px, t.py, t.pz, DQ.BLOCKS[id].top);
    this.scanRooms(true);
    return true;
  }
  popDust(cx, cy, cz, col) { if (this.game && DQ.game.particles) DQ.game.particles.bits((cx + 0.5) * T, (cy + 0.5) * T, cz * T + 4, 8, [col, '#ffffff']); }
  breakBlock(t, power) {
    const w = this.world, id = w.get(t.cx, t.cy, t.cz), def = DQ.BLOCKS[id];
    if (!def || def.unbreakable) return false;
    const tool = DQ.ITEMS[this.heldItem()] || DQ.ITEMS.stick;
    if (def.tier > tool.tier) { this.popup('It needs a better tool: ' + (def.tier >= 3 ? 'the Seam Ripper' : 'a Cobble Club or better') + '.', '#ff9a9a', 2); return false; }
    const key = this.world.idx(t.cx, t.cy, t.cz);
    const dmg = power * DQ.tuning.breakSpeed * (1 + (tool.power || 1) * 0.5);
    const hp = (w.hp.get(key) || 0) + dmg;
    if (hp < def.hp) { w.hp.set(key, hp); DQ.audio && DQ.audio.sfx('rip', 0.6); this.popDust(t.cx, t.cy, t.cz, def.top); return false; }
    w.set(t.cx, t.cy, t.cz, 0); this.stats.broken++; this.builder.score = (this.builder.score || 0) + 1;
    DQ.audio && DQ.audio.sfx('rrip');
    this.popDust(t.cx, t.cy, t.cz, def.top);
    if (def.drop) { this.give(def.drop, 1); }
    if (id === B.TURF && this.rng() < 0.12) this.give('berry', 1);
    if (id === B.BANNER && this.banner && this.banner.x === t.cx && this.banner.y === t.cy) { this.banner = null; this.popup('The Banner came down. Plant it again!', '#ff9a9a', 3); }
    if (id === B.COPPER) this.addCheer(0.2 * 1, '');
    this.scanRooms(false);
    this.checkQuests();
    return true;
  }
  heldItem() { const id = this.hotbar[this.sel]; return id && DQ.ITEMS[id] && DQ.ITEMS[id].kind === 'tool' ? id : 'stick'; }
  // ---- monsters -----------------------------------------------------------------------------------------------------------
  spawnMonster(key, x, y, z) {
    const def = DQ.MONSTERS[key];
    const m = new Monster(def, key, x, y, z);
    m.nid = ++this.nidSeq;
    this.monsters.push(m); return m;
  }
  spawnNearBuilder() {
    const b = this.builder, w = this.world;
    for (let tries = 0; tries < 20; tries++) {
      const a = this.rng() * Math.PI * 2, d = (11 + this.rng() * 8) * T;
      const x = b.x + Math.cos(a) * d, y = b.y + Math.sin(a) * d;
      const cx = Math.floor(x / T), cy = Math.floor(y / T);
      if (cx < 2 || cy < 2 || cx > w.W - 3 || cy > w.D - 3) continue;
      if (this.inTown(cx, cy) && this.townLevel > 0) continue;
      const z = w.top(cx, cy) * T;
      if (z <= 0 || z < 20) continue;
      const pick = this.isNight ? (this.rng() < 0.6 ? 'slime' : 'snag') : (this.rng() < 0.85 ? 'slime' : 'snag');
      return this.spawnMonster(pick, x, y, z);
    }
    return null;
  }
  inTown(cx, cy) {
    if (!this.banner) return false;
    const r = (DQ.LEVELS[Math.max(0, this.townLevel - 1)] || { border: 5 }).border;
    return Math.abs(cx - this.banner.x) <= r && Math.abs(cy - this.banner.y) <= r;
  }
  hitMonster(m, dmg, from) {
    if (m.dead) return;
    // Gnarlgrim is made of knots: only the Seam Ripper cuts it cleanly; anything else barely scratches it
    const knot = m.key === 'gnarlgrim' && this.heldItem() !== 'ripper';
    if (knot && m.hurt <= 0) this.popup('Only the Seam Ripper cuts a knot.', '#ff9a9a', 1.5);
    const n = dmg * DQ.tuning.playerDamage * (1 + (DQ.ITEMS[this.heldItem()].power - 1) * 0.5) * (knot ? 0.2 : 1);
    m.hp -= n; m.hurt = 0.25; m.killer = this.builder;
    const a = Math.atan2(m.y - this.builder.y, m.x - this.builder.x);
    m.vx = Math.cos(a) * 80; m.vy = Math.sin(a) * 80; m.vz = 120; m.onGround = false;
    DQ.game.hitFx && DQ.game.hitFx(m.x, m.y, m.z + 8, { power: 1, angle: a, damage: Math.round(n) });
    if (m.hp <= 0) this.killMonster(m);
  }
  killMonster(m) {
    m.dead = true;
    this.stats.kills++;
    if (m.key === 'snag') this.stats.snags++;
    if (m.key === 'gnarlgrim') { this.stats.bossKills++; }
    const d = m.def;
    if (d.drop) this.give(d.drop, d.dropN || 1);
    this.addCheer(d.cheer, '');
    if (m.killer) m.killer.score = (m.killer.score || 0) + 5;
    DQ.audio && DQ.audio.sfx('defeat');
    this.checkQuests();
  }
  // ---- siege --------------------------------------------------------------------------------------------------------------
  stepSiege(dt) {
    const s = this.siege;
    if (!s || s.done) return;
    if (s.wave === 0 && !this.questDone.siege && this.quest === DQ.QUESTS.findIndex(q => q.id === 'siege') && this.isNight && this.banner) {
      s.wave = 1; s.timer = 0; s.spawned = 0; this.popup('Night visitors! Hold the town!', '#ff9a9a', 4);
      DQ.audio && DQ.audio.music('siege');
    }
    if (s.wave === 0) return;
    const alive = this.monsters.filter(m => !m.dead && m.siege === s.wave).length;
    if (s.spawned < 3 + s.wave * 2 && (s.timer -= dt) <= 0) {
      s.timer = 1.1;
      const bx = this.banner ? this.banner.x : 24, by = this.banner ? this.banner.y : 24;
      const a = this.rng() * Math.PI * 2, d = (this.townLevel ? 7 : 6) * T;
      const x = (bx + 0.5) * T + Math.cos(a) * d, y = (by + 0.5) * T + Math.sin(a) * d;
      const cx = Math.floor(x / T), cy = Math.floor(y / T);
      const z = this.world.top(cx, cy) * T;
      const m = this.spawnMonster(this.rng() < 0.7 ? 'slime' : 'snag', x, y, z); m.siege = s.wave;
      s.spawned++;
    }
    if (s.spawned >= 3 + s.wave * 2 && alive === 0) {
      if (s.wave >= 3) { s.done = true; this.popup('The siege is over. The town stands!', '#ffe27a', 4); }
      else { s.wave++; s.spawned = 0; s.timer = 0; this.popup('Wave ' + s.wave + ' is coming!', '#ff9a9a', 3); }
    }
    if (s.done) this.checkQuests();
  }
  // ---- the Den: snags come out of it while the Gnarl quest runs; Gnarlgrim waits in the middle for the last quest
  stepDen(dt) {
    const q = this.current(); if (!q) return;
    if (q.id === 'gnarl') {
      this.denT = (this.denT || 0) - dt;   // its own timer: the spawner below keeps another
      const n = this.monsters.filter(m => !m.dead && m.key === 'snag').length;
      if (this.denT <= 0 && n < 3) {
        this.denT = 6;
        const x = (41 + this.rng() * 3) * T, y = (41 + this.rng() * 3) * T;
        const cx = Math.floor(x / T), cy = Math.floor(y / T), z = this.world.top(cx, cy) * T;
        if (z > 0) this.spawnMonster('snag', x, y, z).den = true;
      }
    }
    if (q.id === 'boss' && !this.boss && !this.stats.bossKills) {
      const x = 41.5 * T, y = 41.5 * T, z = this.world.top(41, 41) * T;
      this.boss = this.spawnMonster('gnarlgrim', x, y, z); this.boss.den = true;
      this.popup('Gnarlgrim stirs in the Den!', '#ff9a9a', 4);
      DQ.audio && DQ.audio.music('boss');
    }
  }
  // ---- the frame ---------------------------------------------------------------------------------------------------------
  update(dt, I) {
    this.t += dt;
    this.stepClock(dt);
    this.fx = this.fx.filter(f => (f.t -= dt) > 0);
    if (this.dead) { this.dead.t -= dt; if (this.dead.t <= 0) this.respawn(); return; }
    for (const p of this.popups) p.t -= dt;
    this.popups = this.popups.filter(p => p.t > 0);
    this.roomT -= dt;
    if (this.roomT <= 0 && !this.dead) this.scanRooms(false);
    this.updateBuilder(dt, I);
    this.updateRemotes(dt);
    this.updateMonsters(dt);
    this.stepTurrets(dt);
    for (const pat of this.patterns) this.checkPattern(pat);
    this.stepRegion();
    this.updateResidents(dt);
    this.stepDen(dt);
    this.stepSpawns(dt);
    this.stepSiege(dt);
    this.checkQuests();
    if (this.isNight !== this.nightWas) { this.nightWas = this.isNight; DQ.events.emit(this.isNight ? 'night' : 'morning', this.day); DQ.audio && DQ.audio.music(this.isNight ? 'night' : 'meadow'); }
  }
  respawn() {
    const b = this.builder, sp = this.banner ? { x: (this.banner.x + 0.5) * T, y: (this.banner.y + 0.5) * T, z: this.banner.z * T } : this.spawn();
    Object.assign(b, { x: sp.x + 8, y: sp.y, z: sp.z, vx: 0, vy: 0, vz: 0, hp: b.maxHp, belly: Math.max(40, b.belly) });
    this.dead = null; this.popup('You came back together at the Banner.', '#ffffff', 3);
  }
  stepSpawns(dt) {
    const rate = DQ.tuning.spawnRate;
    if (!rate) return;
    this.spawnT = (this.spawnT || 0) - dt;
    if (this.spawnT <= 0) {
      this.spawnT = (this.isNight ? 4 : 9) / rate;
      const cap = this.isNight ? 6 : 3;
      if (this.monsters.filter(m => !m.dead).length < cap) this.spawnNearBuilder();
    }
    // monsters far away go back into the cloth
    for (const m of this.monsters) if (!m.dead && Math.hypot(m.x - this.builder.x, m.y - this.builder.y) > 40 * T && !m.den && !m.siege) m.dead = true;
    this.monsters = this.monsters.filter(m => !m.dead);
  }
  updateBuilder(dt, I) {
    const b = this.builder;
    this.useMouse = I.lastDevice === 'mouse';
    if (!b.alive) { this.dead = { t: 2.5 }; this.popup('You came unstitched...', '#ff9a9a', 2.5); return; }
    // movement, relative to the camera (the screen's direction on the ground)
    const m = I.move ? I.move() : [0, 0];
    const v = DQ.game.view.screenDirToGround(m[0], m[1]);
    const speed = DQ.tuning.walkSpeed * (b.dodge > 0 ? 2.4 : 1);
    if (Math.hypot(m[0], m[1]) > 0.1) { b.vx = v[0] * speed * Math.min(1, Math.hypot(m[0], m[1])); b.vy = v[1] * speed * Math.min(1, Math.hypot(m[0], m[1])); b.facing = Math.atan2(v[1], v[0]); }
    else { b.vx = 0; b.vy = 0; }
    if (I.pressed('jump') && b.onGround) { b.vz = DQ.tuning.jumpSpeed; }
    if (I.pressed('dodge') && b.dodge <= 0 && b.onGround) { b.dodge = 0.22; b.iframe = 0.3; }
    b.dodge = Math.max(0, b.dodge - dt); b.iframe = Math.max(0, b.iframe - dt);
    // the mouse aims: the facing turns to it
    if (this.useMouse) { const g = this.mouseGround(); if (g) b.facing = Math.atan2(g[1] - b.y, g[0] - b.x); }
    DQ.moveBody(this.world, b, dt, HW, HT);
    this.usePortal(b, dt);
    // hunger: a slow belly, the berries and pie mend it
    b.belly = Math.max(0, b.belly - dt * 0.35);
    if (b.belly <= 0 && (this.hungerT = (this.hungerT || 0) - dt) <= 0) { this.hungerT = 4; this.hurt(1, null); }
    else if (b.belly > 70 && b.hp < b.maxHp) { b.regen = (b.regen || 0) + dt; if (b.regen > 3) { b.regen = 0; b.hp = Math.min(b.maxHp, b.hp + 1); } }
    // attacks
    const sw = b.swing;
    if (I.pressed('attack') && !sw.busy) {
      if (sw.start()) { b.swingT = 0; }
    }
    sw.update(dt);
    if (sw.active) {
      // strikes land on the monsters in the arc; if none is struck, the swing mines the block in front (once a swing)
      const mons = this.monsters.filter(mm => !mm.dead);
      let struck = false;
      sw.hits(mons, mm => E.inArc(b, b.facing, mm, 26, 1.4, 16), mm => { struck = true; this.hitMonster(mm, 2, b); });
      if (struck) b.mined = true;
      if (!b.mined && !b.swingDone) { b.swingDone = true; this.swingMine(); }
    }
    if (!sw.busy) { b.mined = false; b.swingDone = false; }
    if (I.pressed('place')) this.placeHeld();
    if (I.pressed('use')) this.useAction();
    if (I.pressed('craft') && this.onCraft) this.onCraft();
    if (I.pressed('hotPrev')) this.sel = (this.sel + 7) % 8;
    if (I.pressed('hotNext')) this.sel = (this.sel + 1) % 8;
    for (let i = 0; i < 8; i++) if (I.pressed('slot' + (i + 1))) this.sel = i;
    // the target for the cursor and the frame
    this.target = this.targetBlock(this.useMouse);
    // talk, when a resident is close and the use button is pressed (handled in useAction)
    // the cast when a block is placed, and the roll when dodging: the engine's own pose and flip, used for these moments
    b.castT = Math.max(0, (b.castT || 0) - dt);
    const roll = b.dodge > 0 ? 1 - b.dodge / 0.22 : undefined;
    b.rigState = { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, facing: b.facing, air: !b.onGround, attack: sw.state, dash: b.dodge > 0,
      pose: b.castT > 0 ? 'cast' : undefined, flip: roll };
    b.rig.update(dt, b.rigState);
    if (b.hp < b.maxHp && b.belly > 70) b.regen = b.regen || 0;
  }
  swingMine() {
    const t = this.targetBlock(this.useMouse);
    if (t) this.breakBlock(t, 1);
  }
  placeHeld() {
    const t = this.targetBlock(this.useMouse);
    const item = this.hotbar[this.sel];
    if (!item) return;
    if (this.placeAt(item, t)) { this.builder.castT = 0.45; this.fx.push({ x: t.px, y: t.py, z: t.pz, t: 0.6, max: 0.6 }); }
  }
  useAction() {
    const b = this.builder;
    // a pattern in the hand is laid on the ground in front
    const held = this.hotbar[this.sel];
    if (held && DQ.ITEMS[held] && DQ.ITEMS[held].kind === 'pattern') { this.placePattern(held, this.targetBlock(this.useMouse)); return; }
    if (held === 'scroll') { this.captureBlueprint(this.targetBlock(this.useMouse)); return; }
    // food in the hand is eaten
    const item = this.hotbar[this.sel];
    if (item && DQ.ITEMS[item] && DQ.ITEMS[item].kind === 'food' && this.count(item) > 0 && b.belly < 100) {
      this.take(item, 1); b.belly = Math.min(100, b.belly + 35); b.hp = Math.min(b.maxHp, b.hp + DQ.ITEMS[item].heal * 2);
      this.popup('Yum. ' + DQ.itemName(item) + '.', '#f5f5a0', 2); return;
    }
    // a resident close by: talk
    const r = this.nearestResident(28);
    if (r) { this.talkTo(r); return; }
    // a bed, at night: sleep
    const t = this.targetBlock(this.useMouse);
    if (t && this.world.get(t.cx, t.cy, t.cz) === B.BED && this.isNight) { this.sleepUntilMorning(); return; }
    if (t && this.world.get(t.cx, t.cy, t.cz) === B.BED) { this.popup('Beds are for the night, or for the residents.', '#ffffff', 2.5); return; }
    if (t && this.world.get(t.cx, t.cy, t.cz) === B.CHEST) { this.popup('This chest is for storing things, one day.', '#ffffff', 2.5); return; }
    if (this.banner && !this.questDone.banner) this.say(['Plant the Banner of Mending, my love. Then the town has somewhere to be.'], { name: 'GRANNY GOSSAMER' });
  }
  nearestResident(range) {
    let best = null, bd = range * T;
    for (const r of this.residents) { const d = Math.hypot(r.x - this.builder.x, r.y - this.builder.y); if (d < bd) { bd = d; best = r; } }
    return best;
  }
  talkTo(r) {
    const lines = {
      pim: ['My bed! I never thought I\'d have a bed with a light by it.', 'Thank you, Builder. I\'ll grow you a crop of pumpkins.'],
      ottilie: ['Pie tomorrow? I can\'t cook without a bench, but I can taste anything.'],
      bramble: ['Pine boards? I cut them. You just have to make them into something!'],
      doro: ['The town is quiet, but at night I keep watch. Whistle if you need me.'],
      tilly: ['I\'d love wool, if you\'ve got any. Patchwork is everything, you know.'],
    };
    const line = (lines[r.def.id] || ['Hello, Builder!']);
    this.say(line, { name: r.def.name.toUpperCase(), portrait: r.rig });
    this.addCheer(1, '');
    r.cheerT = 2;
  }
  // ---- crafting: the menu's list, built from the recipes ----------------------------------------------------------------
  recipeLabel(rec) {
    const need = Object.entries(rec.inputs).map(([id, n]) => n + ' ' + DQ.itemName(id)).join(', ');
    return DQ.itemName(rec.out) + '  [' + need + ']' + (rec.station ? '' : ' (no bench)');
  }
  // ---- monsters update ------------------------------------------------------------------------------------------------------
  updateMonsters(dt) {
    for (const m of this.monsters) {
      if (m.dead) continue;
      const b = this.nearestPlayer(m);
      m.hurt = Math.max(0, m.hurt - dt);
      if ((m.stun || 0) > 0) { m.stun -= dt; m.vx = 0; m.vy = 0; DQ.moveBody(this.world, m, dt, m.hw, m.ht); continue; }   // tangled by a ballista
      const dx = b.x - m.x, dy = b.y - m.y, d = Math.hypot(dx, dy);
      const boss = m.key === 'gnarlgrim';
      const aggro = m.def.aggro * T;
      {
        if (d < aggro || m.siege) {
          const sp = m.def.speed * (boss ? 1.1 : 1);
          const ux = d ? dx / d : 0, uy = d ? dy / d : 0;
          m.vx = ux * sp; m.vy = uy * sp; m.facing = Math.atan2(uy, ux);
        } else { m.vx *= 0.9; m.vy *= 0.9; }
      }
      const was = m.onGround;
      DQ.moveBody(this.world, m, dt, m.hw, m.ht);
      if (m.hitWall && m.onGround && d < aggro) m.vz = boss ? 110 : 140;
      if (m.onGround && !was && m.key === 'slime') m.vz = 0;
      m.cool = Math.max(0, m.cool - dt);
      const reach = (m.def.reach || 1) * T + 8;
      if (d < reach && Math.abs(b.z - m.z) < 20 && m.cool <= 0 && b.alive) {
        m.cool = boss ? 1.6 : 1.1;
        if (b.iframe <= 0) this.hurt(m.def.dmg * DQ.tuning.monsterDamage, m, b);
      }
      if (boss) m.rig.update(dt, { x: m.x, y: m.y, z: m.z, vx: m.vx, vy: m.vy, facing: m.facing, stance: 'guard' });
      else m.rig.update(dt, { squash: m.onGround ? 0 : -0.25, look: [dx, dy], walk: Math.hypot(m.vx, m.vy) / 40 });
    }
  }
  updateResidents(dt) {
    for (const r of this.residents) {
      r.cheerT = Math.max(0, r.cheerT - dt);
      if (!r.task && !this.isNight && !r.sleeping && this.rng() < dt * 0.35) this.assignBuild(r);
      if (r.task) this.residentTask(r, dt);
      else if (this.isNight && r.bed) {
        r.sleeping = true; r.mode = 'sleep';
        const tx = (r.bed.x + 0.5) * T, ty = (r.bed.y + 0.5) * T;
        // lie beside the bed, on the floor of its room
        const d = Math.hypot(tx - r.x, ty - r.y);
        if (d > 6) { r.vx = (tx - r.x) / d * 26; r.vy = (ty - r.y) / d * 26; } else { r.vx = 0; r.vy = 0; }
      } else {
        r.sleeping = false;
        if (r.mode === 'sleep') r.mode = 'idle';
        r.wait -= dt;
        if (r.wait <= 0) {
          const a = this.rng() * Math.PI * 2, d = 2 * T + this.rng() * 3 * T;
          r.target = { x: r.home.x * T + Math.cos(a) * d, y: r.home.y * T + Math.sin(a) * d };
          r.wait = 2 + this.rng() * 4; r.mode = 'walk';
        }
        if (r.target) {
          const dx = r.target.x - r.x, dy = r.target.y - r.y, d = Math.hypot(dx, dy);
          if (d > 4) { r.vx = dx / d * 24; r.vy = dy / d * 24; r.facing = Math.atan2(dy, dx); } else { r.vx = 0; r.vy = 0; r.target = null; }
        }
      }
      DQ.moveBody(this.world, r, dt, r.hw, r.ht);
      if (r.hitWall && r.onGround) r.vz = 130;
      const rs = { x: r.x, y: r.y, z: r.z, vx: r.vx, vy: r.vy, facing: r.facing, stance: 'ready', down: r.sleeping ? 1 : 0, pose: r.cheerT > 0 ? 'cheer' : undefined };
      r.rig.update(dt, rs);
    }
  }
  // the player nearest a monster (the local Builder, or a remote one in a shared round; a server host has no body)
  nearestPlayer(m) {
    let best = this.serverOnly ? null : this.builder, bd = best ? Math.hypot(best.x - m.x, best.y - m.y) : Infinity;
    for (const b of this.remotes.values()) {
      if (!b.alive) continue;
      const d = Math.hypot(b.x - m.x, b.y - m.y);
      if (d < bd) { bd = d; best = b; }
    }
    return best || this.builder;
  }
  // where the pointer is on the ground: this player's own, or (while a remote player acts) the one that player sent
  mouseGround() {
    if (this.mouseOverride) return this.mouseOverride();
    return DQ.game.mouseGround ? DQ.game.mouseGround() : null;
  }
  // the remote players of a shared round: each takes its own input from the host's inbox, as the local one does
  updateRemotes(dt) {
    for (const [id, b] of this.remotes) {
      if (!b.alive) {
        const sp = this.banner ? { x: (this.banner.x + 0.5) * T, y: (this.banner.y + 0.5) * T, z: this.banner.z * T } : this.spawn();
        Object.assign(b, { x: sp.x + 8, y: sp.y, z: sp.z, vx: 0, vy: 0, vz: 0, hp: b.maxHp });
        continue;
      }
      const inp = DQ.net.takeInput(id), req = inp.requests();
      DQ.asPlayer(this, b, () => {
        for (const rid of req.cr) { const rec = DQ.RECIPE_ID[rid]; if (rec) this.craft(rec); }
        for (const [i, item] of req.hot) if (i >= 0 && i < 8) b.hotbar[i] = item;
        const saved = this.mouseOverride;
        this.mouseOverride = inp.mouseAt;
        try { this.updateBuilder(dt, inp); } finally { this.mouseOverride = saved; }
      });
    }
  }
  hurt(n, from, who) {
    const b = who || this.builder;
    if (!b.alive || DQ.god) return;
    b.hp = Math.max(0, b.hp - n); b.iframe = 0.6;
    if (from) { const a = Math.atan2(b.y - from.y, b.x - from.x); b.vx = Math.cos(a) * 130; b.vy = Math.sin(a) * 130; b.vz = 110; }
    DQ.audio && DQ.audio.sfx('hurt');
    DQ.game.flash && DQ.game.flash('#ff6a7a', 0.15, 0.4);
    if (b.hp <= 0 && b === this.builder) { this.dead = { t: 2.5 }; this.popup('You came unstitched...', '#ff9a9a', 2.5); }
  }
  // ---- patterns: a ghost layout laid on the ground; residents build it, block by block, from the shared bag ----------
  // a player's own blueprint: the blocks in a 5 x 5 x 4 box round the target, copied to a pattern the player can lay down
  captureBlueprint(t) {
    if (!t) { this.popup('Point the scroll at something you built.', '#ffffff', 2.5); return false; }
    const cells = [];
    for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) for (let dz = 0; dz < 4; dz++) {
      const x = t.cx + dx, y = t.cy + dy, z = t.cz + 1 + dz, id = this.world.get(x, y, z);
      if (id && id !== DQ.B.CLOTH) cells.push({ dx: dx + 2, dy: dy + 2, dz, id });
    }
    if (!cells.length) { this.popup('Nothing built there to copy.', '#ff9a9a', 2.5); return false; }
    const n = this.blueprints.length + 1, key = 'bp' + n;
    this.registerBlueprint({ key, name: 'Blueprint ' + n, w: 5, d: 5, cells });
    this.give(key, 1);
    this.popup('Blueprint ' + n + ' copied: ' + cells.length + ' blocks.', '#f4e4b0', 3);
    return true;
  }
  registerBlueprint(bp) {
    this.blueprints.push(bp);
    DQ.ITEMS[bp.key] = { name: bp.name, kind: 'pattern', pattern: bp.key, color: '#f4e4b0', blurb: 'Your own design. Lay it down and the residents build it.' };
  }
  // a pattern's layout: a built-in one, or the player's blueprint
  patternDef(key) {
    if (DQ.PATTERNS[key]) return DQ.PATTERNS[key];
    const bp = this.blueprints.find(b => b.key === key);
    return bp ? { name: bp.name, w: bp.w, d: bp.d, cells: () => bp.cells.map(c => ({ ...c })) } : null;
  }
  placePattern(item, t) {
    const key = DQ.ITEMS[item].pattern, P = this.patternDef(key);
    if (!P || !t || !this.count(item)) return false;
    const x0 = t.px - Math.floor(P.w / 2), y0 = t.py - Math.floor(P.d / 2), z0 = t.pz;
    const cells = P.cells().map(c => ({ x: x0 + c.dx, y: y0 + c.dy, z: z0 + c.dz, id: c.id }));
    if (cells.some(c => !this.world.inside(c.x, c.y, c.z) || this.world.get(c.x, c.y, c.z) !== 0)) {
      this.popup('Clear the ground for the ' + P.name + ' first.', '#ff9a9a', 2.5); return false;
    }
    this.patterns.push({ key, name: P.name, cells, warned: false });
    this.take(item, 1);
    this.popup('A ' + P.name + ' pattern is laid out. The residents will build it.', '#9fe3ff', 3);
    return true;
  }
  // the next cell a resident can build: an air cell whose block is in the bag, with a standing place beside it
  assignBuild(r) {
    for (const pat of this.patterns) {
      const cell = pat.cells.find(c => this.world.get(c.x, c.y, c.z) === 0);
      if (!cell) continue;
      const need = DQ.itemForBlock(cell.id);
      if (!need || !this.has({ [need]: 1 })) {
        if (!pat.warned) { pat.warned = true; this.popup('The ' + pat.name + ' needs ' + DQ.itemName(need) + '. Bring one to the town chest.', '#ffe27a', 3.5); }
        continue;
      }
      const spot = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [cell.x + dx, cell.y + dy])
        .find(([x, y]) => this.world.get(x, y, cell.z) === 0 && DQ.solidBlock(this.world.get(x, y, cell.z - 1)));
      if (!spot) continue;
      r.task = { pat, cell, sx: spot[0], sy: spot[1], t: 0 };
      return;
    }
  }
  residentTask(r, dt) {
    const k = r.task, c = k.cell;
    if (this.world.get(c.x, c.y, c.z) !== 0) { r.task = null; r.vx = 0; r.vy = 0; return; }   // a player got there first
    const tx = (k.sx + 0.5) * T, ty = (k.sy + 0.5) * T, dx = tx - r.x, dy = ty - r.y, d = Math.hypot(dx, dy);
    if (d > 4) { r.vx = dx / d * 24; r.vy = dy / d * 24; r.facing = Math.atan2(dy, dx); k.t = 0; return; }
    r.vx = 0; r.vy = 0; r.facing = Math.atan2((c.y + 0.5) * T - r.y, (c.x + 0.5) * T - r.x);
    k.t += dt;
    if (k.t < 1.2) return;
    const need = DQ.itemForBlock(c.id);
    if (need && this.take(need, 1)) { this.world.set(c.x, c.y, c.z, c.id); this.popDust(c.x, c.y, c.z, DQ.BLOCKS[c.id].top); DQ.audio && DQ.audio.sfx('stitch'); }
    r.task = null; r.wait = 1.5 + this.rng() * 2; r.mode = 'build';
    this.checkPattern(k.pat);
  }
  checkPattern(pat) {
    if (!this.patterns.includes(pat)) return;
    if (pat.cells.every(c => this.world.get(c.x, c.y, c.z) === c.id)) {
      this.patterns = this.patterns.filter(p => p !== pat);
      this.popup('The ' + pat.name + ' is finished!', '#ffe27a', 4);
      this.addCheer(6, pat.name);
      DQ.events.emit('patternDone', pat.key);
    }
  }
  // ---- Bobbin Ballistas and Portals: found by a scan of the world when it changes ------------------------------
  refreshSpecials() {
    if (this.specials.at === this.world.edits) return;
    this.specials.at = this.world.edits; this.specials.ballistas = []; this.specials.portals = [];
    const vox = this.world.vox, H = this.world.H, W = this.world.W;
    for (let i = 0; i < vox.length; i++) {
      const id = vox[i];
      if (id !== DQ.B.BALLISTA && id !== DQ.B.PORTAL) continue;
      const z = i % H, col = Math.floor(i / H), x = col % W, y = Math.floor(col / W);
      (id === DQ.B.BALLISTA ? this.specials.ballistas : this.specials.portals).push({ x, y, z });
    }
  }
  // each ballista fires a bolt every two seconds at the nearest monster within twelve blocks; it hits Gnarlgrim too (and tangles it)
  stepTurrets(dt) {
    this.refreshSpecials();
    for (const bl of this.specials.ballistas) {
      const key = this.world.idx(bl.x, bl.y, bl.z);
      const cool = (this.turretCool.get(key) || 0) - dt;
      this.turretCool.set(key, Math.max(0, cool));
      if (cool > 0) continue;
      const bx = (bl.x + 0.5) * T, by = (bl.y + 0.5) * T;
      let best = null, bd = 12 * T;
      for (const m of this.monsters) if (!m.dead) { const d = Math.hypot(m.x - bx, m.y - by); if (d < bd) { bd = d; best = m; } }
      if (!best) continue;
      this.turretCool.set(key, 2);
      best.hp -= 2 * DQ.tuning.playerDamage; best.hurt = 0.25;
      if (best.key === 'gnarlgrim') best.stun = 1.5;
      this.fx.push({ type: 'bolt', from: [bx, by, (bl.z + 0.7) * T], to: [best.x, best.y, best.z + 8], t: 0.25, max: 0.25 });
      DQ.audio && DQ.audio.sfx('rip', 0.5);
      if (best.hp <= 0) this.killMonster(best);
    }
  }
  // stepping onto a portal (the block below your feet) takes you out of the other one
  usePortal(b, dt) {
    b.portalCD = Math.max(0, (b.portalCD || 0) - dt);
    if (b.portalCD > 0 || this.specials.portals.length !== 2) return;
    const cx = Math.floor(b.x / T), cy = Math.floor(b.y / T), cz = Math.floor(b.z / T) - 1;
    const here = this.specials.portals.findIndex(q => q.x === cx && q.y === cy && q.z === cz);
    if (here < 0) return;
    const o = this.specials.portals[1 - here];
    Object.assign(b, { x: (o.x + 0.5) * T, y: (o.y + 0.5) * T, z: (o.z + 1) * T, vz: 0, vx: 0, vy: 0, portalCD: 1.2 });
  }
  // the names of the places, as a player walks into them
  stepRegion() {
    const name = DQ.regionName(Math.floor(this.builder.x / T), Math.floor(this.builder.y / T));
    if (name !== this.region) { this.region = name; this.popup('Now in ' + name + '.', '#d9b77c', 2.5); }
  }
  // ---- the save -----------------------------------------------------------------------------------------------------------
  serialize() {
    return {
      v: 2, world: this.world.toJSON(), blueprints: this.blueprints, patterns: this.patterns.map(q => ({ key: q.key, name: q.name, cells: q.cells })), bag: this.bag, hotbar: this.hotbar, sel: this.sel, notions: this.notions,
      stats: this.stats, quest: this.quest, questDone: this.questDone, cheer: this.cheer, banner: this.banner,
      residents: this.residents.map(r => ({ id: r.def.id, bed: r.bed })), clockT: this.clockT, day: this.day,
      grantedKey: this.grantedKey, siege: this.siege, boss: !!this.boss && !this.boss.dead,
      player: { x: this.builder.x, y: this.builder.y, z: this.builder.z, hp: this.builder.hp, belly: this.builder.belly },
    };
  }
  static restore(d) {
    const p = new Play({});
    p.world.fromJSON(d.world);
    Object.assign(p, { bag: d.bag, hotbar: d.hotbar, sel: d.sel, notions: d.notions, stats: d.stats, quest: d.quest,
      questDone: d.questDone, cheer: d.cheer, banner: d.banner, clockT: d.clockT, day: d.day, grantedKey: d.grantedKey || {}, siege: d.siege });
    p.rooms = []; p.residents = [];
    for (const bp of d.blueprints || []) p.registerBlueprint(bp);
    p.patterns = (d.patterns || []).map(q => ({ key: q.key, name: q.name, cells: q.cells, warned: false }));
    for (const rr of d.residents || []) {
      const def = DQ.NPCS.find(n => n.id === rr.id); if (!def || !rr.bed) continue;
      const res = new Resident(def, (rr.bed.x + 0.5) * T + 6, (rr.bed.y + 0.5) * T, rr.bed.z * T, { x: rr.bed.x, y: rr.bed.y, z: rr.bed.z });
      res.bed = rr.bed; p.residents.push(res);
    }
    if (d.player) Object.assign(p.builder, { x: d.player.x, y: d.player.y, z: d.player.z, hp: d.player.hp, belly: d.player.belly });
    p.builder.vz = 0;
    p.townLevel = 0;
    for (const L of DQ.LEVELS) if (p.cheer >= L.cheer && p.banner) p.townLevel = L.level;
    p.scanRooms(true);
    return p;
  }
}
DQ.Play = Play;
DQ.Builder = Builder;
DQ.Monster = Monster;
DQ.Resident = Resident;
})();

// run a function as if a Builder were the one acting: the helpers above read this.builder
DQ.asPlayer = (p, b, fn) => { const saved = p.builder; p.builder = b; try { return fn(); } finally { p.builder = saved; } };
