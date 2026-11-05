// ---------------------------------------------------------------- the contestant (a player): move, aim, fire, slide, Showstopper, Showboat
MT.DIFF = {
  ROOKIE: { hp: 5, lives: 5, enemySpeed: .85, bullets: .8, wave: .8, label: 'ROOKIE', desc: 'MORE HEALTH, MORE LIVES, SLOWER FOES.' },
  CONTESTANT: { hp: 3, lives: 3, enemySpeed: 1, bullets: 1, wave: 1, label: 'CONTESTANT', desc: 'THE SHOW AS THE NETWORK INTENDED.' },
  CHAMPION: { hp: 1, lives: 3, enemySpeed: 1.15, bullets: 1, wave: 1.2, label: 'CHAMPION', desc: 'ONE HIT AND YOU ARE MASHED. FOR LEGENDS.' }
};
MT.diff = () => MT.DIFF[(MT.run && MT.run.diff) || 'CONTESTANT'];
MT.maxHp = () => MT.T.hpPerLife || MT.diff().hp;
MT.startLives = () => MT.T.startLives || MT.diff().lives;
MT.EXTRA_LIVES = [250000, 750000, 1500000, 3000000];

MT.Contestant = class Contestant {
  constructor(slot, o = {}) {
    this.id = slot; this.slot = slot; this.look = o.look !== undefined ? o.look : slot; this.color = MT.COLORS.p[slot % 4];
    this.name = o.name || MT.looks.LOOKS[this.look % 4].name; this.input = o.input || null; this.ctl = o.ctl || 'local';
    this.x = AR.cx; this.y = AR.cy; this.z = 0; this.vx = 0; this.vy = 0; this.kvx = 0; this.kvy = 0; this.r = 6;
    this.facing = -Math.PI / 2; this.aim = -Math.PI / 2;
    this.hp = MT.maxHp(); this.lives = MT.startLives(); this.cash = 0; this.bombs = 2;
    this.wpn = 'blaster'; this.wpnT = 0; this.addons = { records: 0, shield: 0, speed: 0 };
    this.state = 'play'; this.t = 0; this.invuln = 0; this.slideT = 0; this.slideCd = 0; this.slideDir = [0, -1]; this.fireCd = 0;
    this.boat = 0; this.boatCd = 0; this.boatPose = 0; this.boatHit = false; this.hurtT = 0; this.arrowT = 3;
    this.prizes = []; this.kills = 0; this.deaths = 0; this.boatGain = 0; this.nextLife = 0; this.firing = false; this.laserOn = false;
    this.bot = null; this.intent = MT.NOINTENT(); this.walk = null; this.landT = 0; this.godMode = false;
    this.rig = MT.looks.make(this.look, this.color);
  }
  get alive() { return this.state === 'play' || this.state === 'walkin' || this.state === 'drop'; }
  get canBeHit() { return this.state === 'play'; }
  setLook(look) { this.look = look; this.rig = MT.looks.make(look, this.color); if (!this.named) this.name = MT.looks.LOOKS[look % 4].name; }
  resetRun() { this.hp = MT.maxHp(); this.lives = MT.startLives(); this.cash = 0; this.bombs = 2; this.wpn = 'blaster'; this.wpnT = 0; this.addons = { records: 0, shield: 0, speed: 0 }; this.prizes = []; this.kills = 0; this.deaths = 0; this.boatGain = 0; this.nextLife = 0; this.state = 'play'; }
  placeWalkIn(entry, k, n) {
    const P = AR.doors[entry] || AR.doors.S, off = (k - (n - 1) / 2) * 16;
    const sx = P.x + (P.nx === 0 ? off : 0) - P.nx * 16, sy = P.y + (P.ny === 0 ? off : 0) - P.ny * 16;
    const tx = P.x + P.nx * 46 + (P.nx === 0 ? (k % 2 ? 9 : -9) : (k >= 2 ? 10 : -10)) + (P.nx === 0 ? 0 : 0), ty = P.y + P.ny * 46 + (P.ny === 0 ? (k % 2 ? 9 : -9) : (k >= 2 ? -10 : 10));
    this.x = sx; this.y = sy; this.z = 0; this.walk = { sx, sy, tx: tx + (P.nx === 0 ? (k - 1.5) * 4 : 0), ty, t: 0 };
    if (this.state !== 'out' && this.state !== 'gone') { this.state = 'walkin'; this.t = 0; }
    this.facing = Math.atan2(P.ny, P.nx); this.aim = this.facing; this.invuln = 1.2; this.arrowT = 3; this.slideT = 0; this.boat = 0;
  }
  update(dt, it, W) {
    this.t += dt; this.intent = it;
    const T = MT.T;
    for (const k in this.addons) if (this.addons[k] > 0) { this.addons[k] -= dt; if (this.addons[k] <= 0) { this.addons[k] = 0; W.event('addonEnd', { slot: this.slot, k }); } }
    if (this.wpn !== 'blaster') { this.wpnT -= dt; if (this.wpnT <= 0) { this.wpn = 'blaster'; this.wpnT = 0; W.event('wpnEnd', { slot: this.slot }); } }
    this.invuln = Math.max(0, this.invuln - dt); this.hurtT = Math.max(0, this.hurtT - dt); this.arrowT = Math.max(0, this.arrowT - dt);
    this.slideCd = Math.max(0, this.slideCd - dt); this.fireCd -= dt; this.boatCd = Math.max(0, this.boatCd - dt); this.landT = Math.max(0, this.landT - dt);
    this.firing = false; this.laserOn = false;
    if (this.state === 'walkin') {
      const w = this.walk; w.t += dt; const u = Math.min(1, w.t / 1.2);
      const nx = lerp(w.sx, w.tx, MT.ease.outQuad(u)), ny = lerp(w.sy, w.ty, MT.ease.outQuad(u));
      this.vx = (nx - this.x) / Math.max(dt, 1e-4); this.vy = (ny - this.y) / Math.max(dt, 1e-4); this.x = nx; this.y = ny;
      if (u >= 1) { this.state = 'play'; this.vx = this.vy = 0; }
      return this.pose(dt);
    }
    if (this.state === 'dead') {
      this.vx = this.vy = 0;
      if (this.t >= 2) { if (this.lives > 0) this.respawn(W); else { this.state = 'out'; this.t = 0; W.event('out', { slot: this.slot }); } }
      return this.pose(dt);
    }
    if (this.state === 'drop') {
      const u = Math.min(1, this.t / .5); this.z = 70 * (1 - MT.ease.inQuad(u));
      if (u >= 1) { this.z = 0; this.state = 'play'; this.invuln = 2.5; this.landT = .3; if (this.rig && this.rig.land) this.rig.land(.6); W.event('landed', { slot: this.slot, x: this.x, y: this.y }); }
      return this.pose(dt);
    }
    if (this.state === 'out') {
      if (it.start) W.continueContestant(this);
      return;
    }
    if (this.state === 'gone') return;
    // ---- play
    let mx = it.move[0], my = it.move[1]; const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
    if (this.boat > 0) {
      this.boat -= dt; mx = my = 0;
      if (this.boat <= 0) { this.boat = 0; if (!this.boatHit) W.showboatDone(this); }
    } else if (it.showboat && this.boatCd <= 0 && this.slideT <= 0) { this.boat = .6; this.boatCd = 3; this.boatHit = false; this.boatPose = (this.boatPose + 1) % 3; W.event('boatStart', { slot: this.slot }); }
    if (it.slide && this.slideCd <= 0 && this.boat <= 0) {
      this.slideDir = ml > .2 ? [mx / Math.max(ml, 1e-3) * (ml > 1 ? 1 : 1), my / Math.max(ml, 1e-3)] : [Math.cos(this.facing), Math.sin(this.facing)];
      const L = Math.hypot(this.slideDir[0], this.slideDir[1]) || 1; this.slideDir = [this.slideDir[0] / L, this.slideDir[1] / L];
      this.slideT = .28; this.slideCd = T.slideCooldown * (this.addons.speed > 0 ? .6 : 1); W.event('slide', { slot: this.slot, x: this.x, y: this.y });
    }
    let spd = T.playerSpeed * (this.addons.speed > 0 ? 1.45 : 1);
    if (W.arena.splatAt(this.x, this.y)) spd *= .6;
    if (this.slideT > 0) { this.slideT -= dt; this.vx = this.slideDir[0] * T.slideSpeed; this.vy = this.slideDir[1] * T.slideSpeed; }
    else { this.vx = mx * spd; this.vy = my * spd; }
    const push = W.arena.conveyorPush(this);
    this.x += (this.vx + this.kvx + push) * dt; this.y += (this.vy + this.kvy) * dt;
    const kd = Math.exp(-dt * 10); this.kvx *= kd; this.kvy *= kd;
    if (!(MT.CHEATS.noclip && this.ctl === 'local' && this.slot === 0)) W.arena.clampContestant(this);
    for (const e of W.solids) { const d = MT.dist(this, e), m = this.r + e.r; if (d < m && d > 0) { this.x = e.x + (this.x - e.x) / d * m; this.y = e.y + (this.y - e.y) / d * m; } }
    if (W.arena.cage && W.arena.cage.h > 10) { const d = Math.hypot(this.x - AR.cx, this.y - AR.cy); if (d < 20 && d > 0) { this.x = AR.cx + (this.x - AR.cx) / d * 20; this.y = AR.cy + (this.y - AR.cy) / d * 20; } }
    if (it.aim !== null && it.aim !== undefined) this.aim = it.aim;
    if (it.fire && this.boat <= 0) { this.firing = true; MT.WEAPONS[this.wpn].fire(this, W, dt); }
    if (it.bomb && this.boat <= 0) W.showstopper(this);
    if (this.firing) this.facing = this.aim; else if (ml > .15) this.facing = Math.atan2(my, mx);
    this.pose(dt);
  }
  get iframes() { return this.slideT > .06 || this.invuln > 0 || this.state !== 'play' || this.addons.shield > 0 || this.godMode || MT.CHEATS.god || (MT.run && MT.run.mode === 'attract'); }
  pose(dt) {
    const rig = this.rig; if (!rig || MT.cfg.skipRigs) return;
    const st = { x: this.x, y: this.y, z: this.z, vx: this.vx, vy: this.vy, facing: this.facing, point: this.firing || this.state === 'play' && this.intent && this.intent.aim !== null && this.firing, hurt: this.hurtT > 0 };
    if (this.slideT > 0) st.flip = 1 - this.slideT / .28;
    if (this.boat > 0) { st.pose = ['cheer', 'hips', 'wave'][this.boatPose]; st.expr = 'smile'; st.point = false; }
    if (this.state === 'dead') { st.pose = this.t < .9 ? 'die' : undefined; st.down = this.t >= .9 ? 1 : 0; st.expr = 'wince'; }
    if (this.state === 'drop') st.air = true;
    if (this.cheer) { st.pose = 'cheer'; st.expr = 'smile'; }
    if (this.hurtT > 0) st.expr = 'wince';
    rig.update(dt, st);
  }
  hurt(dmg, src, W) {
    if (this.iframes || this.ctl === 'remote' || this.ctl === 'mirror') return false;
    if (MT.run && MT.run.mode === 'session' && MT.net && !MT.net.isHostSim(this)) return false;
    dmg = Math.max(1, Math.round(dmg));
    this.hp -= dmg; this.invuln = MT.T.invulnTime; this.hurtT = .3; this.boatHit = this.boat > 0; this.boat = 0;
    if (src) { const a = Math.atan2(this.y - src.y, this.x - src.x); this.kvx = Math.cos(a) * 120; this.kvy = Math.sin(a) * 120; }
    if (this.input && this.input.rumble) this.input.rumble(.5, .15);
    W.event('hurt', { slot: this.slot, x: this.x, y: this.y, hp: this.hp });
    if (this.hp <= 0) this.die(W);
    return true;
  }
  die(W) {
    this.hp = 0; this.state = 'dead'; this.t = 0; this.deaths++; this.boat = 0; this.slideT = 0;
    if (MT.run && MT.run.mode === 'session') { this.cash = Math.max(0, this.cash - 2500); }
    else this.lives = Math.max(0, this.lives - 1);
    this.wpn = 'blaster'; this.wpnT = 0; this.addons = { records: 0, shield: 0, speed: 0 };
    W.event('death', { slot: this.slot, x: this.x, y: this.y, name: this.name });
  }
  respawn(W) {
    const e = W.entry || 'S', P = AR.doors[e];
    this.x = clamp(P.x + P.nx * 50 + (this.slot - 1.5) * 14 * (P.nx === 0 ? 1 : 0), AR.x0 + 12, AR.x1 - 12);
    this.y = clamp(P.y + P.ny * 50 + (this.slot - 1.5) * 14 * (P.ny === 0 ? 1 : 0), AR.y0 + 12, AR.y1 - 12);
    if (MT.run && MT.run.mode === 'session') { /* unlimited lives in the Lightning Round */ }
    this.hp = MT.maxHp(); this.bombs = Math.max(1, this.bombs); this.state = 'drop'; this.t = 0; this.z = 70; this.invuln = 3; this.arrowT = 3;
    W.event('respawn', { slot: this.slot, x: this.x, y: this.y });
  }
  addCash(v, W) {
    this.cash += v;
    if (MT.run && MT.run.mode !== 'session') while (this.nextLife < MT.EXTRA_LIVES.length && this.cash >= MT.EXTRA_LIVES[this.nextLife]) { this.nextLife++; this.lives++; W.event('extraLife', { slot: this.slot, x: this.x, y: this.y }); }
  }
  get rs() { return this; }
  draw(r, W) {
    if (this.state === 'out' || this.state === 'gone') return;
    const blink = this.invuln > 0 && this.state === 'play' && Math.floor(MT.game.time * 12) % 2 === 0;
    if (this.state === 'drop') {
      r.queue(this.x, this.y, this.z + 40, g => { const a = r.w(this.x, this.y, this.z + 34), top = r.w(this.x, this.y, 200); px.line(g, a[0], a[1], top[0], Math.max(-4, top[1]), '#2a2a36', 1); }, { bias: -1 });
      r.decal(() => r.groundDisc(this.x, this.y, 16, '#fff7c0', .25));
      MT.game.lights.add(this.x, this.y, 0, 40, .7, { color: '#fff0c0' });
    }
    r.shadow(this.x, this.y, 7, .45);
    if (!MT.cfg.skipRigs && this.rig) r.actor(this.x, this.y, this.z, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view), { alpha: blink ? .45 : 1, flash: this.hurtT > 0 ? '#ffffff' : false, ghost: this.addons.speed > 0 ? { color: this.color, life: .18, alpha: .5, owner: this } : undefined, key: this });
    // the back number and the P arrow
    const tn = MT.game.time;
    if (this.arrowT > 0 || (W && W.contestants.length > 1 && this.state === 'play' && Math.floor(tn * 2) % 4 === 0 && false)) r.queue(this.x, this.y, 52, g => { const p = r.w(this.x, this.y, 52 + Math.sin(tn * 8) * 2); px.poly(g, [[p[0] - 4, p[1]], [p[0] + 4, p[1]], [p[0], p[1] + 5]], this.color); E.font.text(g, 'P' + (this.slot + 1), p[0], p[1] - 9, this.color, { align: 'center', outline: '#000' }); }, { bias: 30 });
    if (this.addons.shield > 0) r.queue(this.x, this.y, 14, g => { const p = r.w(this.x, this.y, 14), k = MT.pk(r); px.blend(g, .35, 'add', () => px.disc(g, p[0], p[1], 15 * k, '#2ee6ff')); if (Math.floor(tn * 5) % 3) E.font.text(g, 'KRUNCH-O', p[0], p[1] - 3, '#ffcc33', { align: 'center', font: 'tiny', outline: false }); px.blend(g, .7, 'add', () => { for (let a = 0; a < 20; a++) { const an = a / 20 * Math.PI * 2; px.dot(g, p[0] + Math.cos(an) * 15 * k, p[1] + Math.sin(an) * 15 * k, '#c8f8ff'); } }); }, { emissive: true, bias: 2 });
    if (this.boat > 0) r.queue(this.x, this.y, 46, g => { const p = r.w(this.x, this.y, 46); for (let i = 0; i < 3; i++) { const a = tn * 6 + i * 2.1; px.dot(g, p[0] + Math.cos(a) * 9, p[1] + Math.sin(a) * 4, '#ffcc33'); } }, { emissive: true, bias: 5 });
  }
};
