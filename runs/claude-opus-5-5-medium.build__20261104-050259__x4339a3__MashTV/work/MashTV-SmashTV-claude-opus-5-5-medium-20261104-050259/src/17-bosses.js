// ---------------------------------------------------------------- bosses: one framework (parts, armor, weak points, phases as coroutines)
MT.Boss = class Boss {
  constructor(W, kind, name, parts) {
    this.W = W; this.kind = kind; this.name = name; this.x = AR.cx; this.y = -40; this.z = 0; this.vx = 0; this.vy = 0; this.r = 26;
    const pl = Math.max(1, W.contestants.filter(c => c.state !== 'gone').length), k = MT.T.bossHp * (1 + .5 * (pl - 1));
    this.parts = parts.map(p => Object.assign({ armor: 1, weak: 1, alive: true, open: true, flash: 0 }, p, { hp: p.hp * k, max: p.hp * k }));
    this.phase = 'intro'; this.introDone = false; this.dead = false; this.deathT = 0; this.co = null; this.wait = 0; this.cond = null; this.t = 0; this.fireMul = 1;
    this.netKeys = [];
  }
  part(id) { return this.parts.find(p => p.id === id); }
  partPos(p) { return [this.x + (p.ox || 0), this.y + (p.oy || 0)]; }
  get hpPct() { const a = this.parts.reduce((s, p) => s + Math.max(0, p.hp), 0), b = this.parts.reduce((s, p) => s + p.max, 0); return b ? a / b : 0; }
  run(gen) { this.co = gen; this.wait = 0; this.cond = null; }
  setPhase(name) { this.phase = name; const f = this['ph_' + name]; this.run(f ? f.call(this, this.W) : null); this.W.event('bossPhase', { kind: this.kind, phase: name }); }
  stepCo(dt) {
    if (!this.co) return;
    if (this.wait > 0) { this.wait -= dt; if (this.wait > 0) return; }
    if (this.cond) { if (!this.cond()) return; this.cond = null; }
    const co = this.co, r = co.next();
    if (this.co !== co) return;   // the phase switched inside that step: the new coroutine runs from the next step
    if (r.done) { this.co = null; return; }
    const v = r.value; if (typeof v === 'number') this.wait = v; else if (typeof v === 'function') this.cond = v;
  }
  update(dt, W) {
    this.t += dt; for (const p of this.parts) p.flash = Math.max(0, p.flash - dt);
    if (this.dead) { this.deathT += dt; this.dying && this.dying(dt, W); return; }
    if (W.phase === 'bossIntro' && MT.game.players.some(p => p.pressed('confirm')) && this.skipIntro) this.skipIntro();
    this.stepCo(dt); this.tick && this.tick(dt, W);
    for (const c of W.contestants) if (c.state === 'play') for (const p of this.parts) if (p.alive && p.solid !== false) { const [x, y] = this.partPos(p), d = Math.hypot(c.x - x, c.y - y), m = p.r + c.r; if (d < m && d > 0) { c.x = x + (c.x - x) / d * m; c.y = y + (c.y - y) / d * m; } }
  }
  hittable(p) { return p.alive && p.open && this.introDone && !this.dead && !this.away; }
  hitTest(b) { for (const p of this.parts) { if (!this.hittable(p)) continue; const [x, y] = this.partPos(p); if (Math.hypot(b.x - x, b.y - y) < p.r + b.r) return p; } return null; }
  damagePart(p, dmg, owner) {
    if (!this.hittable(p)) return;
    if (MT.CHEATS.oneHit) dmg = p.hp;
    const arm = typeof p.armor === 'function' ? p.armor.call(this) : p.armor, d = dmg * arm * p.weak;
    p.flash = .06;
    if (arm < .3) { this.W.event('tink', { x: this.partPos(p)[0], y: this.partPos(p)[1] }, false); if (!MT.CHEATS.oneHit) return; }
    p.hp -= d; if (owner && d > 0 && MT.R('drops') < .3) owner.addCash(Math.round(20 * this.W.ratings.X * MT.T.cashMul), this.W);
    if (p.hp <= 0) { p.hp = 0; p.alive = false; const [x, y] = this.partPos(p); this.W.event('partDown', { x, y, id: p.id, kind: this.kind }); this.W.ratings.gain(10, this.W); if (owner) owner.addCash(Math.round(5000 * this.W.ratings.X * MT.T.cashMul), this.W); this.onPart && this.onPart(p, this.W); }
  }
  splash(x, y, r, dmg, owner) { for (const p of this.parts) { if (!this.hittable(p)) continue; const [px2, py2] = this.partPos(p); if (Math.hypot(px2 - x, py2 - y) < r + p.r) this.damagePart(p, dmg, owner); } }
  laser(x0, y0, dx, dy, L, dmg, c) { for (const p of this.parts) { if (!this.hittable(p)) continue; const [x, y] = this.partPos(p), t = (x - x0) * dx + (y - y0) * dy; if (t < 0 || t > L) continue; if (Math.hypot(x0 + dx * t - x, y0 + dy * t - y) < p.r) this.damagePart(p, dmg, c); } }
  bomb(dmg, c) { for (const p of this.parts) if (this.hittable(p)) this.damagePart(p, dmg / Math.max(1, this.parts.filter(q => q.alive).length) * 2, c); }
  contact(c, W) { if (this.dead || this.away || !this.introDone) return; const R = this.contactR; if (R && Math.hypot(c.x - this.x, c.y - this.y) < R + c.r) c.hurt(this.contactDmg || 1, this, W); }
  die(W) {
    if (this.dead) return; this.dead = true; this.deathT = 0; W.event('bossDie', { kind: this.kind, x: this.x, y: this.y });
    W.fShots.clear(); for (const e of W.enemies) if (!e.dead && e.counted) W.kill(e, null, { silent: true });
  }
  shower(W, n = 30) {
    for (let i = 0; i < n; i++) W.addPickup(MT.Rpick(['bill', 'stack', 'stack', 'gold', 'case'], 'drops'), this.x, this.y, { vx: MT.Rr(-140, 140, 'drops'), vy: MT.Rr(-20, 160, 'drops'), vz: MT.Rr(100, 220, 'drops'), z: 10 });
    for (let i = 0; i < 2; i++) W.addPickup('prize', this.x, this.y, { vx: MT.Rr(-80, 80, 'drops'), vy: MT.Rr(30, 120, 'drops'), vz: 200, z: 10 });
    W.addPickup('cap', this.x, this.y, { w: MT.Rpick(MT.CAPSULES, 'drops'), vy: 80, vz: 200, z: 10 });
  }
  aimAt(W) { const t = W.target(this); return t ? MT.ang(this, t) : Math.PI / 2; }
  toNet() { const o = [this.kind, Math.round(this.x), Math.round(this.y), Math.round(this.z), this.phase, this.parts.map(p => (p.alive ? 1 : 0) + (p.open ? 2 : 0)).join(''), this.parts.map(p => Math.round(p.hp / p.max * 99)), this.dead ? 1 : 0, this.introDone ? 1 : 0]; for (const k of this.netKeys) o.push(typeof this[k] === 'number' ? Math.round(this[k] * 100) / 100 : this[k]); return o; }
  fromNet(a) {
    this.x = a[1]; this.y = a[2]; this.z = a[3]; this.phase = a[4]; const bits = String(a[5]);
    this.parts.forEach((p, i) => { const b = +bits[i] || 0; p.alive = !!(b & 1); p.open = !!(b & 2); p.hp = (a[6][i] || 0) / 99 * p.max; });
    this.dead = !!a[7]; this.introDone = !!a[8]; this.netKeys.forEach((k, i) => { this[k] = a[9 + i]; });
  }
};

// ======================================================================= BOSS 1: MASHY
MT.paint.mashyFace = (g, cx, cy, k, o = {}) => {
  const T = MT.tn('#d8b070');
  px.disc(g, cx, cy, 15 * k, '#2a1a0a'); px.disc(g, cx, cy, 14 * k, T.sh); px.disc(g, cx - 2 * k, cy - 2 * k, 12 * k, T.base); px.disc(g, cx - 5 * k, cy - 6 * k, 4 * k, T.lt);
  for (const [dx, dy] of [[-6, 4], [7, -3], [3, 8], [-8, -6]]) px.dot(g, cx + dx * k, cy + dy * k, T.deep);
  const j = o.jiggle || 0, red = o.angry;
  for (const s of [-1, 1]) { px.disc(g, cx + s * 5 * k, cy - 3 * k, 3.6 * k, '#ffffff'); px.disc(g, cx + s * 5 * k + Math.sin(j + s) * 1.2 * k, cy - 3 * k + Math.cos(j * 1.3) * 1.2 * k, 1.6 * k, red ? '#ff3344' : '#1a1a1a'); }
  const mo = o.open || 0; px.rect(g, cx - 6 * k, cy + 4 * k, 12 * k, (2 + mo * 5) * k, '#3a0a0a'); if (mo > .2) px.rect(g, cx - 4 * k, cy + 5 * k, 8 * k, mo * 3 * k, '#ff6a8a');
  px.rect(g, cx - 6 * k, cy + 4 * k, 12 * k, k, '#fff7e8');
};
MT.BOSSES = {};
MT.BOSSES.mashy = {
  name: 'MASHY', create(W) { return new MT.Mashy(W); }
};
MT.Mashy = class Mashy extends MT.Boss {
  constructor(W) {
    super(W, 'mashy', 'MASHY', [
      { id: 'body', ox: 0, oy: 0, r: 26, hp: 160, armor() { return this.part('armL').alive || this.part('armR').alive ? .15 : .5; } },
      { id: 'armL', ox: -30, oy: 6, r: 10, hp: 45 }, { id: 'armR', ox: 30, oy: 6, r: 10, hp: 45 },
      { id: 'hatch', ox: 0, oy: 14, r: 9, hp: 60, weak: 2, open: false, solid: false }]);
    this.x = AR.cx; this.y = -30; this.dir = 1; this.hatchU = 0; this.charging = false; this.tread = 0; this.recoil = 0; this.chargeLine = null; this.netKeys = ['hatchU', 'tread', 'recoil', 'dir'];
    this.contactR = 30; this.contactDmg = 2;
    this.setPhase('intro');
  }
  skipIntro() { this.y = 70; this.introDone = true; this.setPhase('p1'); }
  *ph_intro(W) { W.arena.openFor('N'); W.event('bossIntro', { kind: 'mashy' }); while (this.y < 70) { this.y += 50 * W.lastDt; this.tread += W.lastDt * 30; yield; } W.arena.slam('N'); yield 1.2; this.introDone = true; this.setPhase('p1'); }
  *ph_p1(W) {
    let bT = 1, gT = 2.2;
    while (true) {
      const dt = W.lastDt; this.x += this.dir * 30 * dt; this.tread += dt * 30; if (this.x > 280) this.dir = -1; if (this.x < 88) this.dir = 1;
      const L = this.part('armL').alive, R = this.part('armR').alive, mul = (L && R) ? 1 : 1.3;
      if (!L && !R) { this.setPhase('p2'); return; }
      bT -= dt * mul; gT -= dt * mul;
      if (L && bT <= 0) { bT = 1.8; const a = this.aimAt(W); for (let k = 0; k < 5; k++) { const b = W.foe(this, 'butter', a - .45 + k * .225, 95); if (b) { b.x = this.x - 30; b.y = this.y + 12; } } this.recoil = .2; W.event('cannon', { x: this.x - 30, y: this.y }, false); }
      if (R && gT <= 0) { gT = 3.2; const a0 = this.aimAt(W) - .87; for (let k = 0; k < 12; k++) W.later(k * .1, () => { if (!this.part('armR').alive || this.dead) return; const b = W.foe(this, 'gravy', a0 + k / 11 * 1.74, 120); if (b) { b.x = this.x + 30; b.y = this.y + 12; } }); }
      this.recoil = Math.max(0, this.recoil - dt);
      yield;
    }
  }
  *ph_p2(W) {
    W.event('mashyArms', {});
    let hT = 2, rT = 1, tT = 3, gT = 4, off = 0;
    while (true) {
      const dt = W.lastDt; this.x += this.dir * 24 * dt; this.tread += dt * 24; if (this.x > 280) this.dir = -1; if (this.x < 88) this.dir = 1;
      hT -= dt; rT -= dt; tT -= dt; gT -= dt;
      const h = this.part('hatch'); const cyc = (this.t % 4.5); h.open = cyc > 2.3; this.hatchU = h.open ? Math.min(1, this.hatchU + dt * 5) : Math.max(0, this.hatchU - dt * 5);
      if (rT <= 0) { rT = 2.5; off = off ? 0 : Math.PI / 14; for (let k = 0; k < 14; k++) { const b = W.foe(this, 'orb', k / 14 * Math.PI * 2 + off, 80); } W.event('ring', { x: this.x, y: this.y }, false); }
      if (tT <= 0) { tT = 5; for (let k = 0; k < 3; k++) { const t = W.target(this); if (t) W.lob(this, clamp(t.x + MT.Rr(-40, 40), 30, 338), clamp(t.y + MT.Rr(-30, 30), 40, 210), 'tot', { time: 1.0, z: 30 }); } W.event('throw', { x: this.x, y: this.y }, false); }
      if (gT <= 0) { gT = 9; MT.spawnEntry(W, ['S', 'goon', 6, .3]); }
      if (this.part('body').hp / this.part('body').max < .35) { this.setPhase('p3'); return; }
      yield;
    }
  }
  *ph_p3(W) {
    W.event('mashyMad', {});
    const h = this.part('hatch'); let addT = 2;
    while (true) {
      for (let n = 0; n < 3; n++) {
        h.open = false; this.hatchU = 0; const t = W.target(this); if (!t) { yield .5; continue; }
        const a = MT.ang(this, t); this.chargeLine = a; W.event('rev', { x: this.x, y: this.y }, false);
        for (let k = 0; k < 108; k++) { addT -= W.lastDt; yield; }
        this.chargeLine = null; let dx = Math.cos(a), dy = Math.sin(a), tt = 0;
        while (tt < 2.5) { const dt = W.lastDt; tt += dt; this.x += dx * 170 * dt; this.y += dy * 170 * dt; this.tread += dt * 170; addT -= dt;
          let hit = false; if (this.x < 50) { this.x = 50; dx = Math.abs(dx); hit = true; } if (this.x > 318) { this.x = 318; dx = -Math.abs(dx); hit = true; } if (this.y < 50) { this.y = 50; dy = Math.abs(dy); hit = true; } if (this.y > 194) { this.y = 194; dy = -Math.abs(dy); hit = true; }
          if (hit) { W.event('crash', { x: this.x, y: this.y }); break; }
          yield; }
        if (addT <= 0) { addT = 10; MT.spawnEntry(W, ['E', 'clapbot', 3, .2]); MT.spawnEntry(W, ['W', 'clapbot', 3, .2]); }
      }
      h.open = true; for (let k = 0; k < 300; k++) { this.hatchU = Math.min(1, this.hatchU + W.lastDt * 5); addT -= W.lastDt; yield; }
    }
  }
  tick(dt, W) { if (this.part('body').hp <= 0 && !this.dead) { this.die(W); } }
  damagePart(p, dmg, owner) {
    if (p.id === 'hatch') { if (!this.hittable(p)) return; const b = this.part('body'); b.hp -= (MT.CHEATS.oneHit ? b.hp : dmg * 2); b.flash = p.flash = .06; if (b.hp <= 0) { b.hp = 0; b.alive = false; this.die(this.W); } return; }
    super.damagePart(p, dmg, owner);
  }
  onPart(p, W) { if (p.id === 'armL' || p.id === 'armR') W.event('armOff', { x: this.partPos(p)[0], y: this.partPos(p)[1] }); if (p.id === 'body') this.die(W); }
  dying(dt, W) { if (this.deathT < 2 && Math.floor(this.deathT * 8) !== Math.floor((this.deathT - dt) * 8)) W.event('boom', { x: this.x + MT.Rr(-26, 26, 'fx'), y: this.y + MT.Rr(-14, 14, 'fx'), big: true }); if (this.deathT >= 2 && !this.showered) { this.showered = true; W.event('bossBurst', { kind: 'mashy', x: this.x, y: this.y }); this.shower(W); } }
  draw(r, W) {
    if (this.showered) return;
    const x = this.x, y = this.y, T = MT.tn('#d8b070'), tn = MT.game.time, fl = (id) => this.part(id) && this.part(id).flash > 0;
    r.shadow(x, y, 30, .5);
    if (this.chargeLine !== null && this.chargeLine !== undefined) r.decal(() => { const a = this.chargeLine; for (let d = 30; d < 300; d += 10) r.groundDisc(x + Math.cos(a) * d, y + Math.sin(a) * d, 2.5, '#ff3344', .6); });
    r.queue(x, y, 0, g => {
      const k = MT.pk(r);
      for (const s of [-1, 1]) { const a = r.w(x + s * 22, y + 14, 0); px.rect(g, a[0] - 7 * k, a[1] - 9 * k, 14 * k, 10 * k, '#1a1a20'); for (let i = 0; i < 4; i++) { const yy = a[1] - 8 * k + ((i * 2.5 + this.tread * .3) % 10) * k; px.rect(g, a[0] - 7 * k, yy, 14 * k, k, '#4a4a52'); } }
      const b = r.w(x, y, 26); const f = fl('body') || (this.dead && Math.floor(tn * 20) % 2);
      px.disc(g, b[0], b[1] + 6 * k, 25 * k, '#1a1014'); px.disc(g, b[0], b[1] + 6 * k, 24 * k, f ? '#ffffff' : '#141018');
      px.poly(g, [[b[0] - 6 * k, b[1] - 6 * k], [b[0] + 6 * k, b[1] - 6 * k], [b[0], b[1] + 14 * k]], '#fff7e8');
      px.poly(g, [[b[0] - 7 * k, b[1] - 9 * k], [b[0], b[1] - 5 * k], [b[0] - 7 * k, b[1] - 1 * k]], '#c8202a'); px.poly(g, [[b[0] + 7 * k, b[1] - 9 * k], [b[0], b[1] - 5 * k], [b[0] + 7 * k, b[1] - 1 * k]], '#c8202a');
      MT.paint.mashyFace(g, b[0], b[1] - 20 * k, k * 1.1, { jiggle: tn * 9, open: this.hatchU, angry: this.phase === 'p3' });
      for (const [id, s] of [['armL', -1], ['armR', 1]]) {
        const p = this.part(id); if (!p.alive) continue; const a = r.w(x + s * 30, y + 6, 18), rc = this.recoil * 8 * k;
        px.disc(g, a[0], a[1], 9 * k, '#1a1014'); px.disc(g, a[0], a[1], 8 * k, fl(id) ? '#ffffff' : '#7a7a8a');
        const ang = this.aimAt(W), tip = [a[0] + Math.cos(ang) * (14 * k - rc), a[1] + Math.sin(ang) * 10 * k];
        px.line(g, a[0], a[1], tip[0], tip[1], s < 0 ? '#ffe680' : '#a0602a', Math.max(3, 5 * k)); px.disc(g, tip[0], tip[1], 3 * k, '#2a2a30');
        E.font.text(g, s < 0 ? 'BUTTER' : 'GRAVY', a[0], a[1] - 14 * k, '#ffcc33', { align: 'center', font: 'tiny', outline: '#000' });
      }
      if (this.phase === 'p3') for (let i = 0; i < 2; i++) px.dot(g, b[0] + MT.fxr() * 30 - 15, b[1] - 34 * k - MT.fxr() * 8, '#5a5a5a');
    });
  }
};

// ======================================================================= BOSS 2: THE WHEEL OF MISFORTUNE
MT.WHEEL_SEGS = ['TOMATO TIME', 'LASER LIGHTS', 'MIME TIME', 'BANKRUPT', 'DISCO FEVER', 'GOON SQUAD', 'JACKPOT', 'SPIN AGAIN'];
MT.WHEEL_COLS = ['#c8202a', '#2ee6ff', '#e8e8f0', '#1a1a1a', '#ff2e88', '#2a3a6a', '#ffcc33', '#22c55e'];
MT.BOSSES.wheel = { name: 'THE WHEEL OF MISFORTUNE', create(W) { return new MT.Wheel(W); } };
MT.Wheel = class Wheel extends MT.Boss {
  constructor(W) {
    const parts = MT.WHEEL_SEGS.map((n, i) => ({ id: 'seg' + i, seg: i, ox: 0, oy: 0, r: 8, hp: 18 }));
    parts.push({ id: 'core', ox: 0, oy: 0, r: 14, hp: 220, armor() { return this.phase === 'p2' || this.jackpot > 0 ? 1 : .15; } });
    super(W, 'wheel', 'THE WHEEL OF MISFORTUNE', parts);
    this.x = AR.cx; this.y = 52; this.z = 0; this.ang = 0; this.spin = 0; this.jackpot = 0; this.landed = -1; this.bulletMul = 1; this.beams = []; this.rollVX = 0; this.rollVY = 0; this.tilt = 0; this.rise = 0;
    this.netKeys = ['ang', 'jackpot', 'landed', 'tilt', 'rise']; this.forced = []; this.setPhase('intro');
  }
  partPos(p) { if (p.seg === undefined) return [this.x, this.y]; const a = this.ang + (p.seg + .5) / 8 * Math.PI * 2; return [this.x + Math.cos(a) * 34, this.y + Math.sin(a) * 34 * .55]; }
  skipIntro() { this.rise = 1; this.introDone = true; this.setPhase('p1'); }
  *ph_intro(W) { W.event('bossIntro', { kind: 'wheel' }); while (this.rise < 1) { this.rise = Math.min(1, this.rise + W.lastDt * .5); this.ang += W.lastDt * 2; yield; } yield 1.5; this.introDone = true; this.setPhase('p1'); }
  living() { return this.parts.filter(p => p.seg !== undefined && p.alive).map(p => p.seg); }
  *spinTo(W, dur = 2.5, mult = 1) {
    const live = this.living(); if (!live.length) return -1;
    const pick = this.forced.length ? (live.includes(this.forced[0]) ? this.forced.shift() : (this.forced.shift(), MT.Rpick(live, 'ai'))) : MT.Rpick(live, 'ai');
    // the pointer is at the top (angle -PI/2): land pick's centre there
    const target = -Math.PI / 2 - (pick + .5) / 8 * Math.PI * 2, a0 = this.ang, turns = Math.PI * 2 * (3 * mult);
    let end = target; while (end < a0 + turns) end += Math.PI * 2;
    W.event('spin', {}); let t = 0, lastSeg = -1;
    while (t < dur / mult) { t += W.lastDt; const u = Math.min(1, t / (dur / mult)); this.ang = a0 + (end - a0) * MT.ease.outCubic(u); const seg = Math.floor(((-Math.PI / 2 - this.ang) / (Math.PI * 2) * 8 % 8 + 8) % 8); if (seg !== lastSeg) { lastSeg = seg; W.event('wheelClick', {}, false); } yield; }
    this.landed = pick; W.event('wheelLand', { seg: pick, name: MT.WHEEL_SEGS[pick] }); return pick;
  }
  *attack(W, seg) {
    const bm = this.bulletMul; this.bulletMul = 1;
    const sp = (s) => s * bm;
    switch (MT.WHEEL_SEGS[seg]) {
      case 'TOMATO TIME': for (let i = 0; i < 8; i++) { const t = W.living()[i % Math.max(1, W.living().length)] || W.target(this); if (t) W.lob({ x: i % 2 ? -20 : 388, y: MT.Rr(40, 200), kind: 'heckler' }, clamp(t.x + MT.Rr(-20, 20), 24, 344), clamp(t.y + MT.Rr(-20, 20), 24, 216), 'tomato', { time: 1.1, z: 30 }); yield .3; } yield 2; break;
      case 'LASER LIGHTS': {
        const base = this.aimAt(W); this.beams = [0, 1, 2, 3].map(k => ({ a: base + k * Math.PI / 2, tele: .8, on: 0 }));
        let t = 0; while (t < 4.8) { const dt = W.lastDt; t += dt; for (const b of this.beams) { if (b.tele > 0) b.tele -= dt; else { b.on += dt; b.a += .3 * dt * bm; } } this.beamHurt(W); yield; }
        this.beams = []; break;
      }
      case 'MIME TIME': for (let i = 0; i < 6; i++) { const t = MT.Rpick(W.living().length ? W.living() : [{ x: 184, y: 150 }], 'spawn'); let x, y, k = 0; do { const a = MT.Rr(0, 6.28, 'spawn'), d = MT.Rr(46, 90, 'spawn'); x = clamp(t.x + Math.cos(a) * d, 30, 338); y = clamp(t.y + Math.sin(a) * d, 90, 210); k++; } while (k < 10 && W.living().some(c => Math.hypot(c.x - x, c.y - y) < 40)); W.spawnAt('mime', x, y, {}); W.event('puff', { x, y }, false); } yield 4; break;
      case 'BANKRUPT': W.ratings.lose(10); W.event('bankrupt', {}); for (let ring = 0; ring < 2; ring++) { for (let k = 0; k < 20; k++) W.foe(this, 'coin', k / 20 * Math.PI * 2 + ring * .157, sp(85)); yield .6; } yield 3; break;
      case 'DISCO FEVER': for (let i = 0; i < 2; i++) { const e = W.spawnAt('disco', this.x + (i ? 20 : -20), this.y + 30, {}); e.dy = .707; e.dx = i ? .707 : -.707; } yield 5; break;
      case 'GOON SQUAD': MT.spawnEntry(W, ['E', 'goon', 4, .25]); MT.spawnEntry(W, ['W', 'goon', 4, .25]); MT.spawnEntry(W, ['S', 'goon', 4, .25]); yield 5; break;
      case 'JACKPOT': W.event('jackpot', {}); for (let i = 0; i < 20; i++) W.addPickup(MT.Rpick(['bill', 'stack', 'gold'], 'drops'), MT.Rr(40, 328, 'drops'), MT.Rr(90, 210, 'drops'), { z: 90 }); W.addPickup('cap', MT.Rr(80, 288, 'drops'), MT.Rr(100, 200, 'drops'), { z: 90, w: MT.Rpick(MT.CAPSULES, 'drops') }); this.jackpot = 3; while (this.jackpot > 0) { this.jackpot -= W.lastDt; yield; } this.jackpot = 0; break;
      case 'SPIN AGAIN': W.event('spinAgain', {}); this.bulletMul = 1.2; { const s2 = yield* this.spinTo(W, 2.5, 1.5); if (s2 >= 0 && MT.WHEEL_SEGS[s2] !== 'SPIN AGAIN') yield* this.attack(W, s2); } break;
    }
  }
  beamHurt(W) {
    for (const b of this.beams) { if (b.tele > 0) continue; const dx = Math.cos(b.a), dy = Math.sin(b.a);
      for (const c of W.contestants) { if (!c.canBeHit) continue; const t = (c.x - this.x) * dx + (c.y - this.y) * dy; if (t < 0) continue; if (Math.hypot(this.x + dx * t - c.x, this.y + dy * t - c.y) < 5 + c.r * .6) c.hurt(1, c, W); } }
  }
  *ph_p1(W) {
    while (true) {
      if (this.living().length <= 4) { this.setPhase('p2'); return; }
      const seg = yield* this.spinTo(W); if (seg < 0) { this.setPhase('p2'); return; }
      yield .8; yield* this.attack(W, seg); yield 1;
    }
  }
  *ph_p2(W) {
    W.event('wheelLoose', {}); this.rollVX = 85; this.rollVY = 60; let landT = 6;
    while (true) {
      const dt = W.lastDt; this.x += this.rollVX * dt; this.y += this.rollVY * dt; this.ang += dt * 3 * Math.sign(this.rollVX); landT -= dt;
      let hit = false; if (this.x < 56) { this.x = 56; this.rollVX = Math.abs(this.rollVX); hit = true; } if (this.x > 312) { this.x = 312; this.rollVX = -Math.abs(this.rollVX); hit = true; } if (this.y < 48) { this.y = 48; this.rollVY = Math.abs(this.rollVY); hit = true; } if (this.y > 196) { this.y = 196; this.rollVY = -Math.abs(this.rollVY); hit = true; }
      if (hit) { for (let k = 0; k < 8; k++) W.foe(this, 'orb', k / 8 * Math.PI * 2, 90); W.event('crash', { x: this.x, y: this.y }, false); }
      if (landT <= 0) { landT = 6; const live = this.living(); if (live.length) { const seg = MT.Rpick(live, 'ai'); this.landed = seg; W.event('wheelLand', { seg, name: MT.WHEEL_SEGS[seg] }); const g = this.attack(W, seg); let r = g.next(); while (!r.done) { if (typeof r.value === 'number') { let w = r.value; while (w > 0) { w -= W.lastDt; this.x += this.rollVX * W.lastDt * .3; yield; } } else yield; r = g.next(); } } }
      yield;
    }
  }
  get contactR() { return this.phase === 'p2' ? 40 * .7 : 0; }
  get contactDmg() { return 2; }
  tick(dt, W) { if (this.part('core').hp <= 0 && !this.dead) this.die(W); }
  onPart(p, W) { if (p.seg !== undefined) W.event('segVoid', { name: MT.WHEEL_SEGS[p.seg] }); if (p.id === 'core') this.die(W); }
  dying(dt, W) { this.tilt = Math.min(1, this.deathT / 1.5); this.ang += dt * (8 - this.deathT * 3); if (this.deathT < 2.4 && Math.floor(this.deathT * 6) !== Math.floor((this.deathT - dt) * 6)) W.event('boom', { x: this.x + MT.Rr(-30, 30, 'fx'), y: this.y + MT.Rr(-12, 12, 'fx'), big: true }); if (this.deathT >= 2.4 && !this.showered) { this.showered = true; W.event('bossBurst', { kind: 'wheel', x: this.x, y: this.y }); this.shower(W); } }
  draw(r, W) {
    if (this.showered) return;
    const x = this.x, y = this.y, tn = MT.game.time, Rr = 44, flat = .55 + this.tilt * .35, lift = (1 - this.tilt) * 40 * this.rise;
    r.shadow(x, y + 6, 40, .5);
    for (const b of this.beams) r.queue(x, y, 30, g => { const a = r.w(x, y, 10), e = r.w(x + Math.cos(b.a) * 400, y + Math.sin(b.a) * 400, 10); if (b.tele > 0) { if (Math.floor(tn * 16) % 2) px.line(g, a[0], a[1], e[0], e[1], '#ff3344', 1); } else { px.line(g, a[0], a[1], e[0], e[1], '#ffffff', 3); px.line(g, a[0], a[1], e[0], e[1], '#2ee6ff', 1); } }, { emissive: true });
    if (this.phase !== 'p2' && !this.dead) r.queue(x, y - 8, 0, g => { const T = MT.tn('#5a4a6a'); r.box(g, x - 8, y - 14, 0, x + 8, y - 6, 40, T.lt, T.sh); }, { bias: -3 });
    r.queue(x, y, lift, g => {
      const c = r.w(x, y, lift + 14), k = MT.pk(r);
      for (let i = 0; i < 8; i++) {
        const p = this.parts[i], a0 = this.ang + i / 8 * Math.PI * 2, a1 = a0 + Math.PI * 2 / 8, pts = [[c[0], c[1]]];
        for (let s = 0; s <= 6; s++) { const a = a0 + (a1 - a0) * s / 6; pts.push([c[0] + Math.cos(a) * Rr * k, c[1] + Math.sin(a) * Rr * k * flat]); }
        const col = p.alive ? MT.WHEEL_COLS[i] : '#14101c'; px.poly(g, pts, p.flash > 0 ? '#ffffff' : (this.landed === i && Math.floor(tn * 8) % 2 ? '#ffffff' : col));
        const am = (a0 + a1) / 2, lx = c[0] + Math.cos(am) * Rr * .62 * k, ly = c[1] + Math.sin(am) * Rr * .62 * k * flat;
        if (p.alive) { for (let b = 0; b < 3; b++) { const bb = am - .18 + b * .18; px.disc(g, c[0] + Math.cos(bb) * 34 * k, c[1] + Math.sin(bb) * 34 * k * flat, 2.2 * k, (b + Math.floor(tn * 8)) % 3 ? '#fff4b0' : '#ffcc33'); } px.disc(g, lx, ly, 2.5 * k, i === 3 ? '#ffcc33' : '#14101c'); }
        else px.line(g, lx - 3 * k, ly - 3 * k, lx + 3 * k, ly + 3 * k, '#5a4a6a', 1);
      }
      for (let s = 0; s < 32; s++) { const a = s / 32 * Math.PI * 2; px.dot(g, c[0] + Math.cos(a) * (Rr + 1) * k, c[1] + Math.sin(a) * (Rr + 1) * k * flat, '#ffcc33'); }
      const core = this.part('core'); MT.paint.shade(g, c[0], c[1], 13 * k, core.flash > 0 ? '#ffffff' : this.jackpot > 0 ? '#ffcc33' : '#c8d0e0');
      E.font.text(g, '$', c[0], c[1] - 3, '#3a2a00', { align: 'center', outline: false });
      if (this.phase !== 'p2') { const tp = [c[0], c[1] - Rr * k * flat - 4]; px.poly(g, [[tp[0] - 4, tp[1] - 6], [tp[0] + 4, tp[1] - 6], [tp[0], tp[1] + 3]], '#ff3344'); }
    }, { emissive: false });
    MT.game.lights.add(x, y, 20, 70, .5, { color: '#ffe080' });
  }
};

// ======================================================================= BOSS 3: LANCE LUSTRE LIVE! -> THE NETWORK
MT.BOSSES.lance = { name: 'LANCE IN THE STARMAKER 9000', create(W) { return new MT.Starmaker(W); } };
MT.Starmaker = class Starmaker extends MT.Boss {
  constructor(W) {
    super(W, 'lance', 'LANCE IN THE STARMAKER 9000', [
      { id: 'podium', ox: 0, oy: 0, r: 22, hp: 260 }, { id: 'turL', ox: -28, oy: 4, r: 8, hp: 30 }, { id: 'turR', ox: 28, oy: 4, r: 8, hp: 30 }]);
    this.x = AR.cx; this.y = 60; this.z = 120; this.hover = 0; this.cones = []; this.mic = null; this.shock = null; this.away = false; this.breaks = 0; this.form = 'starmaker';
    this.tvs = []; this.eye = null; this.wallRise = 0; this.peel = 0; this.netKeys = ['hover', 'form', 'wallRise', 'peel', 'away'];
    this.rig = MT.cfg.skipRigs ? null : new E.Humanoid({ size: 1.4, build: 'heroic', weapon: null, outfit: 'coat', hair: 'spiky', sleeves: 'long', colors: { skin: '#f0c098', hair: '#d8dce8', cloth: '#7a2a9a', coat: '#6a1a8a', pants: '#14101c', boot: '#0a0a10', trim: '#ffcc33', glove: '#ffffff' } });
    this.setPhase('intro');
  }
  skipIntro() { this.z = 20; this.introDone = true; this.setPhase('pA'); }
  *ph_intro(W) { W.event('bossIntro', { kind: 'lance' }); while (this.z > 20) { this.z -= W.lastDt * 40; yield; } this.z = 20; yield 2.5; this.introDone = true; this.setPhase('pA'); }
  podiumHp() { const p = this.part('podium'); return p.hp / p.max; }
  *ph_pA(W) {
    const pats = ['cyclone', 'mic', 'sweep'];
    let k = 0;
    while (true) {
      if (this.breaks === 0 && this.podiumHp() < .66 || this.breaks === 1 && this.podiumHp() < .33) { yield* this.commercial(W); continue; }
      const p = this.forcePat || pats[k++ % 3]; this.forcePat = null;
      if (p === 'cyclone') yield* this.cyclone(W); else if (p === 'mic') yield* this.micDrop(W); else yield* this.sweep(W);
      yield 1;
    }
  }
  *cyclone(W) {
    W.event('cyclone', {}); let t = 0, acc = 0;
    while (t < 3) { const dt = W.lastDt; t += dt; acc += dt * 12; while (acc >= 1) { acc--; for (let a = 0; a < 3; a++) W.foe(this, 'card', t * 1.4 + a * Math.PI * 2 / 3, 95); } yield; }
  }
  *micDrop(W) {
    const t0 = W.target(this); if (!t0) return; const tx = clamp(t0.x, 40, 328), ty = clamp(t0.y, 60, 200);
    W.event('micDrop', {}); this.mic = { x: tx, y: ty, t: 0 };
    const sx = this.x, sy = this.y; let t = 0;
    while (t < 1.0) { const dt = W.lastDt; t += dt; this.mic.t = t; this.z = 20 + Math.sin(t / 1 * Math.PI / 2) * 60; this.x = lerp(sx, tx, t); this.y = lerp(sy, ty - 10, t); yield; }
    this.z = 0; this.x = tx; this.y = ty - 10; this.mic = null; W.event('slam', { x: tx, y: ty });
    for (let a = 0; a < 24; a++) W.foe(this, 'orb', a / 24 * Math.PI * 2, 80);
    this.shock = { x: tx, y: ty, r: 10, hit: new Set() }; while (this.shock.r < 80) { this.shock.r += W.lastDt * 110; for (const c of W.contestants) { if (!c.canBeHit || this.shock.hit.has(c.slot)) continue; const d = Math.hypot(c.x - tx, c.y - ty); if (Math.abs(d - this.shock.r) < 6) { this.shock.hit.add(c.slot); c.hurt(1, this.shock, W); } } yield; }
    this.shock = null; t = 0; while (t < .8) { t += W.lastDt; this.z = 20 * (t / .8); yield; }
  }
  *sweep(W) {
    W.event('sweep', {}); this.cones = [];
    for (const [id, s] of [['turL', -1], ['turR', 1]]) if (this.part(id).alive) this.cones.push({ id, s, a: Math.PI / 2 - s * .9, lit: {} });
    if (!this.cones.length) { yield 1; return; }
    let t = 0; while (t < 4) { const dt = W.lastDt; t += dt;
      for (const cn of this.cones) { if (!this.part(cn.id).alive) continue; cn.a += cn.s * dt * .45; const [ox, oy] = this.partPos(this.part(cn.id));
        for (const c of W.contestants) { if (!c.canBeHit) { cn.lit[c.slot] = 0; continue; } const a = Math.atan2(c.y - oy, c.x - ox), d = Math.hypot(c.x - ox, c.y - oy); if (Math.abs(MT.angDiff(cn.a, a)) < .22 && d < 230) { cn.lit[c.slot] = (cn.lit[c.slot] || 0) + dt; if (cn.lit[c.slot] >= .4) { cn.lit[c.slot] = 0; c.hurt(1, { x: ox, y: oy }, W); } } else cn.lit[c.slot] = 0; } }
      yield; }
    this.cones = [];
  }
  *commercial(W) {
    this.breaks++; W.event('commercial', {}); this.away = true;
    let t = 0; while (t < 1) { t += W.lastDt; this.z += W.lastDt * 150; yield; }
    MT.spawnEntry(W, ['all', 'goon', 3, .3]); MT.spawnEntry(W, ['sides', 'clapbot', 3, .25]); MT.spawnEntry(W, ['N', 'brute', 1]);
    yield 1.5; t = 0; while (t < 12 && W.alive() > 0) { t += W.lastDt; yield; }
    W.event('backFromBreak', {}); while (this.z > 20) { this.z -= W.lastDt * 150; yield; } this.z = 20; this.away = false;
  }
  tick(dt, W) {
    this.hover += dt; if (this.form === 'starmaker' && !this.mic && !this.away && W.phase === 'boss') {
      const t = W.target(this); if (t) { const d = MT.dist(this, t), a = MT.ang(this, t), want = d < 100 ? -1 : d > 140 ? 1 : 0; this.x = clamp(this.x + Math.cos(a) * want * 40 * dt, 50, 318); this.y = clamp(this.y + Math.sin(a) * want * 40 * dt, 46, 120); }
    }
    if (this.form === 'starmaker' && this.part('podium').hp <= 0 && !this.revealing) { this.revealing = true; this.run(this.reveal(W)); }
    if (this.form === 'network') { const eye = this.part('eye'); if (eye && eye.hp <= 0 && !this.dead) this.die(W); }
    if (this.rig && !MT.cfg.skipRigs) this.rig.update(dt, { x: this.x, y: this.y, z: this.z + 22, facing: Math.PI / 2, pose: this.form === 'starmaker' ? (this.mic ? 'cheer' : ['wave', 'hips', 'cast'][Math.floor(this.hover / 2) % 3]) : 'down', expr: 'shout' });
  }
  *reveal(W) {
    this.away = true; W.fShots.clear(); this.cones = []; this.mic = null; this.shock = null; W.event('lanceDown', {}); for (const e of W.enemies) if (!e.dead && e.counted) W.kill(e, null, { silent: true });
    let t = 0; while (t < 1.2) { t += W.lastDt; this.z = Math.max(0, this.z - W.lastDt * 60); yield; }
    W.event('boom', { x: this.x, y: this.y, big: true }); yield 1.2;
    t = 0; while (t < 1.5) { t += W.lastDt; this.peel = t / 1.5; yield; } MT.run && (MT.run.lanceRobot = true); W.event('robotReveal', {});
    yield 3;
    // THE NETWORK: the north wall rises, a wall of twelve TVs around THE EYE
    this.form = 'network'; this.name = 'THE NETWORK'; this.x = AR.cx; this.y = 52; this.z = 0; W.event('networkReveal', {});
    const cols = [96, 140, 228, 272], rows = [30, 52, 74], k = MT.T.bossHp * (1 + .5 * (Math.max(1, W.contestants.length) - 1));
    this.parts = []; let i = 0;
    for (const yy of rows) for (const xx of cols) this.parts.push({ id: 'tv' + i, tv: i++, ox: xx - AR.cx, oy: yy - 52, r: 10, hp: 22 * k, max: 22 * k, armor: 1, weak: 1, alive: true, open: true, flash: 0, ch: 'off', chT: MT.Rr(1, 4), tele: 0, act: 0 });
    this.parts.push({ id: 'eye', ox: 0, oy: 0, r: 18, hp: 300 * k, max: 300 * k, armor: () => this.parts.filter(p => p.tv !== undefined && p.alive).length > 4 ? .15 : 1, weak: 1, alive: true, open: true, flash: 0 });
    t = 0; while (t < 2) { t += W.lastDt; this.wallRise = t / 2; yield; } this.wallRise = 1; this.away = false; this.revealing = false;
    this.setPhase('pB');
  }
  *ph_pB(W) {
    let eyeT = 3, mode = 0;
    while (true) {
      const dt = W.lastDt; const tvs = this.parts.filter(p => p.tv !== undefined);
      const active = tvs.filter(p => p.alive && p.ch !== 'off').length;
      for (const p of tvs) {
        if (!p.alive) continue;
        if (p.ch === 'off') { p.chT -= dt; if (p.chT <= 0 && active < 4) { p.ch = this.forceCh || MT.Rpick(['STATIC', 'NEWS', 'CARTOON', 'SHOPPING', 'LANCE'], 'ai'); this.forceCh = null; p.tele = .5; p.act = 0; W.event('channel', {}, false); } else if (p.chT <= 0) p.chT = 1; continue; }
        if (p.tele > 0) { p.tele -= dt; if (p.tele <= 0) this.tvFire(W, p); continue; }
        p.act += dt; if (p.ch === 'NEWS') this.newsHurt(W, p);
        if (p.act > (p.ch === 'NEWS' ? 1.8 : 1)) { p.ch = 'off'; p.chT = MT.Rr(4, 6, 'ai'); }
      }
      if (tvs.filter(p => p.alive).length <= 4) { eyeT -= dt; if (eyeT <= 0) { eyeT = 3; mode ^= 1; if (mode) { for (let k = 0; k < 18; k++) W.foe(this, 'orb', k / 18 * Math.PI * 2, 85); } else W.later(0, () => this.spiral(W)); W.event('eyeFire', {}, false); } }
      yield;
    }
  }
  spiral(W) { for (let i = 0; i < 24; i++) W.later(i * .08, () => { if (this.dead) return; for (const s of [0, Math.PI]) { const b = W.foe(this, 'static', this.t * 2 + s + i * .2, 80); } }); }
  tvFire(W, p) {
    const [x, y] = this.partPos(p), o = { x, y, r: 10, kind: 'tv' };
    if (p.ch === 'STATIC') { const t = W.target(o); if (t) for (let k = 0; k < 5; k++) W.foe(o, 'static', MT.ang(o, t) + (k - 2) * .14, 80); }
    else if (p.ch === 'CARTOON') { for (let k = 0; k < 2; k++) { const e = W.spawnAt('clapbot', x + (k ? 10 : -10), y + 18, {}); } }
    else if (p.ch === 'SHOPPING') W.addPickup(MT.Rpick(['stack', 'gold'], 'drops'), x, y + 22, { vy: 60, vz: 120, z: 10 });
    else if (p.ch === 'LANCE') { const t = W.target(o); if (t) for (let k = -1; k <= 1; k++) W.foe(o, 'card', MT.ang(o, t) + k * .3, 90); }
  }
  newsHurt(W, p) { if (p.act < .8) return; const [x] = this.partPos(p); for (const c of W.contestants) if (c.canBeHit && Math.abs(c.x - x) < 7 + c.r * .5 && c.y > 80) c.hurt(1, { x, y: c.y - 5 }, W); }
  onPart(p, W) { if (p.tv !== undefined) W.event('tvDown', { x: this.partPos(p)[0], y: this.partPos(p)[1] }); if (p.id === 'eye') this.die(W); }
  dying(dt, W) { if (this.deathT < 2.6 && Math.floor(this.deathT * 6) !== Math.floor((this.deathT - dt) * 6)) { const p = MT.Rpick(this.parts, 'fx'), [x, y] = this.partPos(p); W.event('boom', { x, y, big: true }); } if (this.deathT >= 2.6 && !this.showered) { this.showered = true; W.event('signalLost', {}); this.shower(W, 40); } }
  get contactR() { return this.form === 'starmaker' && this.z < 8 ? 20 : 0; }
  draw(r, W) {
    const tn = MT.game.time, x = this.x, y = this.y;
    if (this.form === 'starmaker') {
      if (this.mic) r.decal(() => { r.groundDisc(this.mic.x, this.mic.y, 30 * (.4 + this.mic.t * .6), '#ff3344', .35); r.groundRing(this.mic.x, this.mic.y, 30, '#ffcc33', .9); });
      if (this.shock) r.decal(() => r.groundRing(this.shock.x, this.shock.y, this.shock.r, '#ffffff', .9));
      for (const cn of this.cones) { const p = this.part(cn.id); if (!p.alive) continue; const [ox, oy] = this.partPos(p); r.decal(() => r.groundArc(ox, oy, 6, 230, cn.a - .22, cn.a + .22, '#fff4c0', .35)); for (let d = 40; d < 230; d += 50) MT.game.lights.add(ox + Math.cos(cn.a) * d, oy + Math.sin(cn.a) * d, 0, 26, .5, { color: '#fff4c0' }); }
      if (this.away && !this.revealing) return;
      const z = this.z + Math.sin(this.hover * 2) * 2; r.shadow(x, y, 24, .5);
      r.queue(x, y, z, g => {
        const k = MT.pk(r), b = r.w(x, y, z), T = MT.tn('#ffcc33'), pod = this.part('podium'), fl = pod.flash > 0;
        for (const s of [-1, 1]) { const j = r.w(x + s * 14, y, z - 2); px.disc(g, j[0], j[1] + 3 * k, 4 * k, Math.floor(tn * 20) % 2 ? '#ffcc33' : '#ff6a20'); }
        px.poly(g, [[b[0] - 20 * k, b[1]], [b[0] + 20 * k, b[1]], [b[0] + 15 * k, b[1] - 20 * k], [b[0] - 15 * k, b[1] - 20 * k]], fl ? '#ffffff' : T.sh);
        px.poly(g, [[b[0] - 15 * k, b[1] - 20 * k], [b[0] + 15 * k, b[1] - 20 * k], [b[0] + 12 * k, b[1] - 24 * k], [b[0] - 12 * k, b[1] - 24 * k]], fl ? '#ffffff' : T.lt);
        E.font.text(g, '9000', b[0], b[1] - 14 * k, '#5a0a3a', { align: 'center', font: 'tiny', outline: false });
        for (const [id, s] of [['turL', -1], ['turR', 1]]) { const p = this.part(id); if (!p.alive) continue; const q = r.w(x + s * 28, y + 4, z + 8); px.disc(g, q[0], q[1], 6 * k, '#1a1a22'); px.disc(g, q[0], q[1], 5 * k, p.flash > 0 ? '#ffffff' : '#c8d0e0'); px.disc(g, q[0] + 1, q[1] + 1, 2.5 * k, '#fff4b0'); }
      });
      if (this.rig && !MT.cfg.skipRigs && this.peel < 1) r.actor(x, y + 1, z + 22, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view), { flash: this.part('podium').flash > 0 ? '#ffffff' : false });
      if (this.peel > 0) r.queue(x, y + 2, z + 50, g => { const p = r.w(x, y, z + 50), k = MT.pk(r); px.disc(g, p[0], p[1], 7 * k, '#5a5a6a'); for (let i = 0; i < 4; i++) px.rect(g, p[0] - 5 * k, p[1] - 3 * k + i * 2 * k, 10 * k, k, '#1a1a22'); px.dot(g, p[0] - 3 * k, p[1] - 4 * k, '#ff3344'); px.dot(g, p[0] + 3 * k, p[1] - 4 * k, '#ff3344'); if (this.peel < 1) px.rect(g, p[0] - 7 * k, p[1] - 8 * k + this.peel * 16 * k, 14 * k, 6 * k, '#f0c098'); }, { bias: 4 });
      return;
    }
    // the TV wall and THE EYE
    if (this.showered) return;
    r.queue(184, 20, 0, g => { const T = MT.tn('#2a2a3a'), h = 20 + 50 * this.wallRise; r.box(g, 60, 14, 0, 308, 22, h, T.lt, T.sh); }, { bias: -5 });
    for (const p of this.parts) {
      const [px0, py0] = this.partPos(p);
      if (p.tv !== undefined) r.queue(px0, py0, 0, g => {
        const T = MT.tn('#3a3a48'); r.box(g, px0 - 3, py0 - 2, 0, px0 + 3, py0 + 2, 8, T.lt, T.sh);
        const a = r.w(px0, py0, 22), k = MT.pk(r); px.rect(g, a[0] - 10 * k, a[1] - 8 * k, 20 * k, 16 * k, '#14141c');
        if (!p.alive) { px.rect(g, a[0] - 8 * k, a[1] - 6 * k, 16 * k, 12 * k, '#0a0a0a'); px.line(g, a[0] - 6 * k, a[1] - 5 * k, a[0] + 5 * k, a[1] + 4 * k, '#5a5a6a'); return; }
        const sc = p.flash > 0 ? '#ffffff' : p.tele > 0 && Math.floor(tn * 16) % 2 ? '#ffffff' : p.ch === 'off' ? '#1a2a3a' : p.ch === 'NEWS' ? '#2a4aa8' : p.ch === 'CARTOON' ? '#ffcc33' : p.ch === 'SHOPPING' ? '#22c55e' : p.ch === 'LANCE' ? '#7a2a9a' : '#8a8aa8';
        px.rect(g, a[0] - 8 * k, a[1] - 6 * k, 16 * k, 12 * k, sc);
        if (p.ch === 'STATIC') for (let i = 0; i < 12; i++) px.dot(g, a[0] - 8 * k + MT.fxr() * 16 * k, a[1] - 6 * k + MT.fxr() * 12 * k, '#ffffff');
        if (p.ch === 'LANCE' && MT.cast.robo && !MT.cfg.skipRigs) MT.cast.robo.drawPortrait(g, a[0] - 6 * k, a[1] - 6 * k, 12 * k, { zoom: 3 });
        if (p.ch !== 'off' && p.ch !== 'LANCE') E.font.text(g, p.ch.slice(0, 4), a[0], a[1] - 2, '#14101c', { align: 'center', font: 'tiny', outline: false });
      }, { emissive: p.alive && p.ch !== 'off' });
      if (p.tv !== undefined && p.alive && p.ch === 'NEWS') r.decal(() => { const on = p.tele <= 0 && p.act >= .8; for (let yy = py0 + 12; yy < 224; yy += 6) r.groundDisc(px0, yy, on ? 6 : 1.5, on ? '#9ad0ff' : '#ff3344', on ? .7 : .8); });
      if (p.id === 'eye') r.queue(px0, py0, 30, g => {
        const a = r.w(px0, py0, 30), k = MT.pk(r), open = p.armor() >= 1, fl = p.flash > 0;
        px.disc(g, a[0], a[1], 19 * k, '#14141c'); px.disc(g, a[0], a[1], 17 * k, fl ? '#ffffff' : '#c8d0e0');
        px.disc(g, a[0], a[1], (open ? 11 + Math.sin(tn * 3) * 2 : 5) * k, '#ff3344'); px.disc(g, a[0], a[1], (open ? 5 : 2) * k, '#14040a'); px.dot(g, a[0] - 4 * k, a[1] - 5 * k, '#ffffff');
        E.font.text(g, 'THE EYE', a[0], a[1] + 20 * k, '#ff3344', { align: 'center', font: 'tiny', outline: '#000' });
      }, { emissive: true });
    }
  }
};
