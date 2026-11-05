// ---- bosses: one framework (parts, armor, weak points, phases as coroutines, netplay state) and the three bosses ----
// A boss draws from this.rs only, so a client draws the host's boss from toNet()/fromNet().
const BOSSES = MT.BOSSES = {};
const bossScale = world => MT.T.bossHp * (1 + .5 * (world.playerCount() - 1));
class Boss {
  constructor(world, kind, name) {
    this.world = world; this.kind = kind; this.name = name; this.x = AR.CX; this.y = 60; this.z = 0; this.parts = []; this.phase = 'intro'; this.t = 0; this.phaseT = 0;
    this.script = null; this.dead = false; this.introDone = false; this.gone = false; this.rs = { x: this.x, y: this.y, z: 0, phase: 'intro', t: 0 }; this.flash = {};
  }
  part(id, o) { const k = bossScale(this.world); const p = Object.assign({ id, ox: 0, oy: 0, r: 8, hp: 10, armor: 1, weak: 1, alive: true, flash: 0 }, o); p.hp *= k; p.max = p.hp; this.parts.push(p); return p; }
  get(id) { return this.parts.find(p => p.id === id); }
  partPos(p) { return { x: this.rs.x + p.ox, y: this.rs.y + p.oy, r: p.r }; }
  partHittable(p) { return p.alive && !this.gone && !this.dead && this.phase !== 'intro' && (!p.when || p.when(this)); }
  hitList() { const out = []; for (const p of this.parts) if (this.partHittable(p)) { const q = this.partPos(p); out.push({ x: q.x, y: q.y, z: 10, r: p.r, part: p }); } return out; }
  armorOf(p) { return typeof p.armor === 'function' ? p.armor(this) : p.armor; }
  damage(world, p, dmg, src = {}) {
    if (!this.partHittable(p) || world.cosmetic) return;
    const target = p.route ? this.get(p.route) : p;
    if (!target || !target.alive) return;
    const ar = this.armorOf(target) * (p.weak || 1);
    if (MT.cheats.oneHit && !world.session) dmg = 1e6;
    if (ar < .2 && !src.beam) { const q = this.partPos(p); if (game.particles && !world.quietFx && RNG.fx() < .5) game.particles.sparks(q.x, q.y, 14, 2, null, { color: '#c8d0e0' }); if (!world.quietFx && RNG.fx() < .3) MT.sfx('tink'); }
    target.hp -= dmg * ar; target.flash = .08; p.flash = .08;
    if (target.hp <= 0) {
      target.hp = 0; target.alive = false;
      const q = this.partPos(target);
      if (game.particles && !world.quietFx) game.particles.explosion(q.x, q.y, 14, 1.2, { shake: 0, freeze: false });
      if (!world.session) game.freeze(.03); world.shake(4); MT.sfx('boom');
      world.ratings.add(10, world);
      const owner = src.owner !== undefined ? world.contestantById(src.owner) : null; if (owner) world.credit(owner, 5000, { at: q });
      world.event('partDown', { boss: this.kind, part: target.id });
      if (target.onDestroy) target.onDestroy(this, world);
    }
  }
  setPhase(name, gen) { if (this.dying && name !== 'death') { if (gen && gen.return) gen.return(); return; } if (this.script) this.script.cancel(); this.phase = name; this.phaseT = 0; this.script = gen ? new Co(gen) : null; this.world.event('bossPhase', { boss: this.kind, phase: name }); }
  hpPct() { let a = 0, b = 0; for (const p of this.parts) if (!p.noBar) { a += Math.max(0, p.hp); b += p.max; } return b ? a / b : 0; }
  step(world, dt) { this.t += dt; this.phaseT += dt; for (const p of this.parts) p.flash = Math.max(0, p.flash - dt); if (this.script) this.script.step(dt); this.update(world, dt); this.sync(); }
  update() {}
  animate() {}
  sync() { const s = this.rs; s.x = this.x; s.y = this.y; s.z = this.z; s.phase = this.phase; s.t = this.t; s.parts = this.parts.map(p => p.alive ? Math.max(1, Math.round(p.hp / p.max * 100)) : 0); s.pf = this.parts.map(p => p.flash > 0 ? 1 : 0); s.gone = this.gone; s.dead = this.dead; }
  /** netplay: a small array of its render state (numbers), and back */
  toNet() { if (!this.rs.parts) this.sync(); const s = this.rs, out = [this.kind, Math.round(s.x), Math.round(s.y), Math.round(s.z), s.phase, Math.round(s.t * 10), s.parts, (s.pf || []).reduce((a, f, i) => a | (f << i), 0), s.gone ? 1 : 0, s.dead ? 1 : 0]; for (const k of this.netKeys || []) out.push(typeof s[k] === 'number' ? Math.round(s[k] * 100) / 100 : s[k]); return out; }
  fromNet(a) { const s = this.rs; [, s.x, s.y, s.z, s.phase, s.t] = a; s.t /= 10; s.parts = a[6]; s.pf = s.parts.map((_, i) => (a[7] >> i) & 1); s.gone = !!a[8]; s.dead = !!a[9]; (this.netKeys || []).forEach((k, i) => { s[k] = a[10 + i]; }); this.parts.forEach((p, i) => { p.alive = (s.parts[i] || 0) > 0; p.hp = (s.parts[i] || 0) / 100 * p.max; }); this.x = s.x; this.y = s.y; this.dead = s.dead; this.gone = s.gone; }
  /** contact: the body hurts a contestant it touches */
  contact(world, x, y, r, dmg) { for (const c of world.contestants) if (c.ctl !== 'remote' && c.ctl !== 'mirror' && dist2(c, { x, y }) < (r + c.r) ** 2) world.hurtContestant(c, dmg, { kind: this.kind, x, y }); }
  /** a solid body: contestants are pushed out of its circle */
  solid(world, x, y, r) { for (const c of world.contestants) { const dx = c.x - x, dy = c.y - y, d = Math.hypot(dx, dy) || .01; if (d < r + c.r) { c.x = x + dx / d * (r + c.r); c.y = y + dy / d * (r + c.r); clampInterior(c.body, 5); } } }
  drawShadow(r, x, y, rad) { r.decal(() => r.groundDisc(x, y, rad, '#000000', .45)); }
  /** the death: chain explosions, then a shower of cash, prizes and a capsule */
  *deathShower(world, colors) {
    for (let i = 0; i < 10; i++) { const x = this.x + (RNG.fx() - .5) * 60, y = this.y + (RNG.fx() - .5) * 40; if (game.particles && !world.quietFx) { game.particles.explosion(x, y, 10, .9, { shake: 0, freeze: false }); game.particles.bits(x, y, 10, 14, colors); } if (!world.quietFx) MT.sfx('boom'); world.shake(3); yield .2; }
    if (!world.quietFx) game.flash('#ffffff', .2);
    for (let i = 0; i < 30; i++) { const a = RNG.drops() * TAU, sp = 40 + RNG.drops() * 90; world.addPickup(MT.makePickup(rpick(RNG.drops, ['bill', 'stack', 'gold', 'stack', 'case']), this.x, this.y, { z: 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + 30, vz: 100 + RNG.drops() * 60 })); }
    for (let i = 0; i < 2; i++) world.addPickup(MT.makePickup('prize', this.x + (i ? 20 : -20), this.y + 30, { z: 20, vz: 120 }));
    world.addPickup(MT.makePickup('capsule', this.x, this.y + 40, { z: 20, vz: 120 }));
  }
}
MT.Boss = Boss;
const nearestC = (world, o) => MT.nearestContestant(world, o) || { x: AR.CX, y: AR.CY + 60, body: { vx: 0, vy: 0 } };
// =========================================================================================== MASHY
class Mashy extends Boss {
  constructor(world) {
    super(world, 'mashy', 'MASHY'); this.y = -30; this.armAng = [Math.PI / 2, Math.PI / 2]; this.hatch = 0; this.dir = 1; this.charge = null; this.eyes = 0; this.tread = 0;
    const armsAlive = () => this.get('armL').alive || this.get('armR').alive;
    this.part('body', { r: 26, hp: 130, armor: () => armsAlive() ? .15 : .5 });
    this.part('armL', { ox: -30, oy: 6, r: 10, hp: 36, onDestroy: (b, w) => { w.event('line', { id: 'mashyArm' }); b.onArmDown(); } });
    this.part('armR', { ox: 30, oy: 6, r: 10, hp: 36, onDestroy: (b, w) => b.onArmDown() });
    this.part('hatch', { oy: 14, r: 9, hp: 1, weak: 2, route: 'body', noBar: true, when: b => b.hatch > .6 });
    this.netKeys = ['hatch', 'armL', 'armR', 'eyes', 'tread', 'tele', 'chg'];
  }
  static enter(world) { const b = world.boss = new Mashy(world); b.setPhase('intro', b.intro()); world.event('bossIntro', { boss: 'mashy' }); }
  *intro() {
    const w = this.world; w.arena.doors.N.state = 'open'; w.arena.doors.N.u = 1; w.arena.doors.N.hold = 2.5; MT.sfx('crash');
    for (let t = 0; t < 2; t += this.world.lastDt) { this.y = lerp(-30, 70, easeOut(t / 2)); this.tread += this.world.lastDt * 40; yield; }
    this.y = 70; w.event('line', { id: 'mashyIntro' }); yield 2.2;
    this.introDone = true; this.setPhase('p1', this.p1());
  }
  skipIntro() { this.y = 70; this.x = AR.CX; this.introDone = true; this.setPhase('p1', this.p1()); }
  onArmDown() { this.rate = 1.3; if (this.phase === 'p1' && !this.get('armL').alive && !this.get('armR').alive) this.setPhase('p2', this.p2()); }
  *p1() {
    let butter = 1.5, gravy = 2.5, stream = 0;
    while (true) {
      const dt = this.world.lastDt, w = this.world, c = nearestC(w, this), k = this.rate || 1;
      this.x += this.dir * 30 * dt; if (this.x > 260) this.dir = -1; if (this.x < 108) this.dir = 1; this.tread += 30 * dt;
      const L = this.get('armL'), R = this.get('armR');
      if (L.alive) { this.armAng[0] = approachAng(this.armAng[0], Math.atan2(c.y - (this.y + 6), c.x - (this.x - 30)), 3 * dt); butter -= dt * k; if (butter <= 0) { butter = 1.8; for (let i = 0; i < 5; i++) w.fireFoe('butter', this.x - 30, this.y + 12, this.armAng[0] + (i - 2) * .225, bulletSpd(95)); MT.sfx('thunk'); } }
      if (R.alive) { gravy -= dt * k; if (gravy <= 0 && stream <= 0) { stream = 1.2; gravy = 3.2; this.sweep0 = Math.atan2(c.y - this.y, c.x - (this.x + 30)) - .87; } if (stream > 0) { stream -= dt; const a = this.sweep0 + (1 - stream / 1.2) * 1.745; this.armAng[1] = a; this._g = (this._g || 0) - dt; if (this._g <= 0) { this._g = .14 / k; w.fireFoe('gravy', this.x + 30, this.y + 12, a, bulletSpd(120)); } } else this.armAng[1] = approachAng(this.armAng[1], Math.atan2(c.y - this.y, c.x - (this.x + 30)), 2 * dt); }
      if (this.get('body').hp < this.get('body').max * .35) { this.setPhase('p3', this.p3()); return; }
      yield;
    }
  }
  *p2() {
    this.world.event('line', { id: 'mashyP2' });
    let ring = 1, tots = 2.5, goons = 3, hatchT = 0, off = 0;
    while (true) {
      const dt = this.world.lastDt, w = this.world;
      this.x += this.dir * 24 * dt; if (this.x > 260) this.dir = -1; if (this.x < 108) this.dir = 1; this.tread += 24 * dt;
      hatchT = (hatchT + dt) % 4.5; this.hatch = approach(this.hatch, hatchT > 2.3 ? 1 : 0, dt * 4);
      ring -= dt; if (ring <= 0) { ring = 3; off = off ? 0 : Math.PI / 14; for (let i = 0; i < 14; i++) w.fireFoe('orb', this.x, this.y + 4, off + i / 14 * TAU, bulletSpd(80)); }
      tots -= dt; if (tots <= 0) { tots = 5; for (let i = 0; i < 3; i++) { const c = nearestC(w, this); w.lob('tot', this.x, this.y + 14, 30, clamp(c.x + (i - 1) * 40, AR.X0 + 10, AR.X1 - 10), clamp(c.y + 10, AR.Y0 + 10, AR.Y1 - 10), 1.1, { id: 1 }); } MT.sfx('thunk'); }
      goons -= dt; if (goons <= 0) { goons = 9; w.arena.queueSpawn('S', 'goon', MT.scaleAdds(w, 6), .3); }
      if (this.get('body').hp < this.get('body').max * .35) { this.setPhase('p3', this.p3()); return; }
      yield;
    }
  }
  *p3() {
    const w = this.world; w.event('line', { id: 'mashyP3' }); MT.music.layer('phase2', true);
    let adds = 2;
    while (true) {
      for (let k = 0; k < 3; k++) {
        this.tele = 1; this.hatch = 0; const c = nearestC(w, this); this.chg = Math.atan2(c.y - this.y, c.x - this.x); MT.sfx('roar');
        for (let t = 0; t < .9; t += w.lastDt) { this.eyes = 1; if (RNG.fx() < .4 && game.particles && !w.quietFx) game.particles.smoke(this.x + (RNG.fx() - .5) * 30, this.y + 20, 6, 1, { size: 3, color: '#5a5468' }); adds -= w.lastDt; yield; }
        this.tele = 0; let vx = Math.cos(this.chg) * 170, vy = Math.sin(this.chg) * 170, bounced = 0;
        for (let t = 0; t < 2.2 && bounced < 1; t += w.lastDt) { this.x += vx * w.lastDt; this.y += vy * w.lastDt; this.tread += 170 * w.lastDt; adds -= w.lastDt; if (this.x < AR.X0 + 30 || this.x > AR.X1 - 30) { vx = -vx; bounced++; this.x = clamp(this.x, AR.X0 + 30, AR.X1 - 30); } if (this.y < AR.Y0 + 26 || this.y > AR.Y1 - 26) { vy = -vy; bounced++; this.y = clamp(this.y, AR.Y0 + 26, AR.Y1 - 26); } if (bounced) { MT.sfx('crash'); w.shake(5); } this.contact(w, this.x, this.y, 28, 2); yield; }
        this.eyes = 0;
      }
      this.hatch = 1; for (let t = 0; t < 2.5; t += w.lastDt) { adds -= w.lastDt; yield; }
      this.hatch = 0;
      if (adds <= 0) { adds = 10; w.arena.queueSpawn('E', 'clapbot', MT.scaleAdds(w, 3), .25); w.arena.queueSpawn('W', 'clapbot', MT.scaleAdds(w, 3), .25); }
    }
  }
  update(world, dt) {
    if (this.dead || this.phase === 'intro') return;
    this.solid(world, this.x, this.y, 24);
    if (this.get('body').alive === false && !this.dying) { this.dying = true; this.setPhase('death', this.death()); }
  }
  *death() { this.world.event('line', { id: 'mashyDown' }); yield* this.deathShower(this.world, ['#f0d8a0', '#d8b880', '#fff0c0', '#ffffff']); this.dead = true; this.world.event('bossDead', { boss: 'mashy' }); }
  sync() { super.sync(); const s = this.rs; s.hatch = this.hatch; s.armL = this.armAng[0]; s.armR = this.armAng[1]; s.eyes = this.eyes; s.tread = this.tread; s.tele = this.tele || 0; s.chg = this.chg || 0; }
  draw(r, t, world) {
    const s = this.rs; if (s.dead) return;
    const x = s.x, y = s.y, P = s.parts || [], body = P[0] > 0, armL = P[1] > 0, armR = P[2] > 0, fl = s.pf || [];
    this.drawShadow(r, x, y + 6, 30);
    if (s.tele) r.decal(g => { const a = r.w(x, y, 0), b = r.w(x + Math.cos(s.chg) * 300, y + Math.sin(s.chg) * 300, 0); px.line(g, a[0], a[1], b[0], b[1], Math.floor(t * 12) % 2 ? '#ff3344' : '#ff9a3c', 3); });
    r.actor(x, y + 10, 0, (g, ox, oy) => {
      const W = (dx, dy, z) => { const p = r.w(x + dx, y + dy, z); return [p[0] - r.w(x, y + 10, 0)[0] + ox, p[1] - r.w(x, y + 10, 0)[1] + oy]; };
      for (const sd of [-1, 1]) { const a = W(sd * 22 - 6, 14, 0), b = W(sd * 22 + 6, -10, 8); px.rect(g, Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), '#1a1420'); for (let k = 0; k < 5; k++) { const yy = Math.min(a[1], b[1]) + ((k * 4 + (s.tread || 0)) % 20); px.rect(g, Math.min(a[0], b[0]), yy, Math.abs(b[0] - a[0]), 1, '#4a4458'); } }
      const c = W(0, 0, 26), wob = Math.sin(t * 3) * 1;
      px.ell(g, c[0], c[1] + 4, 33, 26, '#140a24'); px.ell(g, c[0], c[1] + 4, 32, 25, '#c8a060'); px.ell(g, c[0] - 6, c[1] - 4, 22, 15, '#e0c080'); px.ell(g, c[0] - 10, c[1] - 9, 8, 5, '#f4dca0');
      for (const [dx, dy] of [[14, -6], [-18, 6], [6, 10], [20, 8], [-6, -14]]) px.disc(g, c[0] + dx, c[1] + dy, 2, '#a07840');
      px.poly(g, [[c[0] - 26, c[1] + 12], [c[0] + 26, c[1] + 12], [c[0] + 18, c[1] + 28], [c[0] - 18, c[1] + 28]], '#1a1420');
      px.poly(g, [[c[0] - 6, c[1] + 12], [c[0] + 6, c[1] + 12], [c[0], c[1] + 24]], '#fff7e8');
      px.poly(g, [[c[0] - 7, c[1] + 10], [c[0], c[1] + 13], [c[0] - 7, c[1] + 16]], '#d02a3a'); px.poly(g, [[c[0] + 7, c[1] + 10], [c[0], c[1] + 13], [c[0] + 7, c[1] + 16]], '#d02a3a'); px.disc(g, c[0], c[1] + 13, 1.5, '#ff5a5a');
      const hz = s.hatch || 0, my = c[1] + 2;
      px.ell(g, c[0], my, 12, 2 + hz * 6, '#3a0a10'); if (hz > .3) { px.ell(g, c[0], my + 1, 9, hz * 4, '#ff3344'); for (let k = -8; k <= 8; k += 4) px.rect(g, c[0] + k - 1, my - 2 - hz * 3, 2, 2, '#fff7e8'); }
      for (const sd of [-1, 1]) { const ex = c[0] + sd * 10, ey = c[1] - 12, j = Math.sin(t * 9 + sd) * 1.5; px.disc(g, ex, ey, 6, '#140a24'); px.disc(g, ex, ey, 5.2, '#ffffff'); px.disc(g, ex + j, ey + 1 + Math.cos(t * 7) * 1.2, 2.5, s.eyes ? '#ff3344' : '#140a24'); }
      for (const [sd, alive, ang, col] of [[-1, armL, s.armL, '#ffe070'], [1, armR, s.armR, '#a0602a']]) {
        if (!alive) continue; const a = W(sd * 30, 6, 18), dx = Math.cos(ang || 0), dy = Math.sin(ang || 0) * .8;
        px.disc(g, a[0], a[1], 7, '#140a24'); px.disc(g, a[0], a[1], 6, '#5a5468'); px.line(g, a[0], a[1], a[0] + dx * 12, a[1] + dy * 12, '#140a24', 7); px.line(g, a[0], a[1], a[0] + dx * 12, a[1] + dy * 12, col, 5); px.disc(g, a[0] + dx * 12, a[1] + dy * 12, 2.5, '#140a24');
      }
    }, { flash: fl[0] || fl[1] || fl[2] || fl[3] ? '#ffffff' : false, outline: false });
    if (s.eyes) game.lights.add(x, y, 30, 50, .5, { color: '#ff3344' });
  }
}
BOSSES.mashy = Mashy;
// =========================================================================================== THE WHEEL OF MISFORTUNE
const SEGMENTS = ['TOMATO TIME', 'LASER LIGHTS', 'MIME TIME', 'BANKRUPT', 'DISCO FEVER', 'GOON SQUAD', 'JACKPOT', 'SPIN AGAIN'];
const SEG_COL = ['#d02a3a', '#2ee6ff', '#f0f0f4', '#141018', '#ff2e88', '#3a4a6a', '#ffcc33', '#5fe0a0'];
MT.SEGMENTS = SEGMENTS;
class Wheel extends Boss {
  constructor(world) {
    super(world, 'wheel', 'THE WHEEL OF MISFORTUNE'); this.x = AR.CX; this.y = 60; this.ang = 0; this.spin = 0; this.seg = -1; this.beams = []; this.loose = false; this.vx = 0; this.vy = 0; this.flat = 0; this.speedMul = 1; this.forced = [];
    this.part('core', { r: 14, hp: 220, armor: b => b.loose || b.jackpotT > 0 ? 1 : .15 });
    SEGMENTS.forEach((n, i) => this.part('seg' + i, { r: 9, hp: 18, seg: i, onDestroy: (b, w) => { w.event('segDown', { seg: i, name: n }); if (b.parts.filter(p => p.seg !== undefined && !p.alive).length >= 4 && !b.loose) b.breakLoose(); } }));
    this.netKeys = ['ang', 'seg', 'flat', 'beamA', 'beamT', 'jack'];
    this.jackpotT = 0;
  }
  static enter(world) { const b = world.boss = new Wheel(world); b.setPhase('intro', b.intro()); world.event('bossIntro', { boss: 'wheel' }); }
  partPos(p) { if (p.seg === undefined) return { x: this.rs.x, y: this.rs.y, r: p.r }; const a = (this.rs.ang || 0) + (p.seg + .5) * TAU / 8; return { x: this.rs.x + Math.cos(a) * 34, y: this.rs.y + Math.sin(a) * 34 * .9, r: p.r }; }
  liveSegs() { return this.parts.filter(p => p.seg !== undefined && p.alive).map(p => p.seg); }
  skipIntro() { this.introDone = true; this.setPhase('p1', this.cycle()); }
  *intro() { const w = this.world; this.flat = 0; for (let t = 0; t < 1.5; t += w.lastDt) { this.ang += w.lastDt * 4; yield; } w.event('line', { id: 'wheelIntro' }); yield 2.2; this.introDone = true; this.setPhase('p1', this.cycle()); }
  /** spin, slow to a stop on a living segment (pointer clicks, a drum roll), then that segment's attack */
  *cycle() {
    const w = this.world;
    while (true) {
      const live = this.liveSegs(); if (!live.length) { yield; continue; }
      const seg = this.forced.length ? this.forced.shift() : rpick(RNG.ai, live);
      const T = 2.5 / this.speedMul, a0 = this.ang, k = Math.ceil(2 + RNG.ai() * 2);
      const pointer = -Math.PI / 2, a1 = pointer - (seg + .5) * TAU / 8 + Math.ceil((a0 - (pointer - (seg + .5) * TAU / 8)) / TAU + k) * TAU;
      MT.sfx('drumroll'); this.seg = -1; let lastTick = Math.floor(a0 / (TAU / 8));
      for (let t = 0; t < T; t += w.lastDt) { const u = t / T, e = 1 - Math.pow(1 - u, 3); this.ang = a0 + (a1 - a0) * e; const tk = Math.floor(this.ang / (TAU / 8)); if (tk !== lastTick) { lastTick = tk; if (!w.quietFx) MT.sfx('wheelclick'); } if (this.loose) this.roll(w.lastDt); yield; }
      this.ang = a1; this.seg = seg; w.event('wheelStop', { seg, name: SEGMENTS[seg] });
      yield* this.attack(seg);
      this.seg = -1;
      if (seg !== 7) this.speedMul = 1;
    }
  }
  *attack(seg) {
    const w = this.world, bmul = this.speedMul > 1 ? 1.2 : 1, sp = v => bulletSpd(v) * bmul;
    const hold = (s, fn) => (function* (self) { for (let t = 0; t < s; t += w.lastDt) { if (fn) fn(t); if (self.loose) self.roll(w.lastDt); yield; } })(this);
    if (seg === 0) { for (let i = 0; i < 8; i++) { const c = nearestC(w, this), side = i % 2 ? -30 : 398; w.lob('tomato', side, 40 + RNG.ai() * 160, 20, clamp(c.x + (RNG.ai() - .5) * 60, AR.X0 + 8, AR.X1 - 8), clamp(c.y + (RNG.ai() - .5) * 40, AR.Y0 + 8, AR.Y1 - 8), 1.1, { id: 2 }); yield* hold(.3); } yield* hold(2); }
    else if (seg === 1) {
      const c = nearestC(w, this), base = Math.atan2(c.y - this.y, c.x - this.x);
      this.beamA = base - .6; this.beamT = .8; yield* hold(.8, t => { this.beamT = .8 - t; });
      this.beamT = 0; MT.sfx('laser');
      yield* hold(4, t => { this.beamA = base - .6 + (t / 4) * 1.2; this.beamOn = true; this.beamHit(w); });
      this.beamOn = false; this.beamA = null;
    }
    else if (seg === 2) { for (let i = 0; i < 6; i++) { const c = nearestC(w, this); let x, y, k = 0; do { x = AR.X0 + 20 + RNG.ai() * 300; y = AR.Y0 + 60 + RNG.ai() * 140; k++; } while (Math.hypot(x - c.x, y - c.y) < 40 && k < 30); const e = w.spawnEnemy('mime', x, y, { inside: true }); if (game.particles && !w.quietFx) game.particles.smoke(x, y, 6, 4, { size: 3, color: '#f0f0f4' }); } yield* hold(4); }
    else if (seg === 3) { w.ratings.lose(10); w.event('bankrupt', {}); for (const off of [0, Math.PI / 20]) { for (let i = 0; i < 20; i++) w.fireFoe('coin', this.x, this.y, off + i / 20 * TAU, sp(85)); yield* hold(.5); } yield* hold(3); }
    else if (seg === 4) { for (let i = 0; i < 2; i++) w.spawnEnemy('disco', this.x + (i ? 20 : -20), this.y + 40, { inside: true, ang: Math.PI / 2 + (i ? .7 : -.7) }); yield* hold(5); }
    else if (seg === 5) { for (const d of ['E', 'W', 'S']) w.arena.queueSpawn(d, 'goon', MT.scaleAdds(w, 4), .25); yield* hold(5); }
    else if (seg === 6) { w.event('jackpot', {}); this.jackpotT = 3; for (let i = 0; i < 20; i++) { const [x, y] = w.freePoint(0); w.addPickup(MT.makePickup(rpick(RNG.drops, ['bill', 'stack', 'gold']), x, y, { z: 80, vz: -10 })); } { const [x, y] = w.freePoint(30); w.addPickup(MT.makePickup('capsule', x, y, { z: 80, vz: -10 })); } yield* hold(3, t => { this.jackpotT = 3 - t; }); this.jackpotT = 0; }
    else if (seg === 7) { this.speedMul = 1.5; w.event('spinAgain', {}); }
  }
  beamHit(w) {
    for (let k = 0; k < 4; k++) {
      const a = (this.beamA || 0) + k * Math.PI / 2;
      for (const c of w.contestants) { if (c.ctl === 'remote' || c.ctl === 'mirror') continue; const dx = c.x - this.x, dy = c.y - this.y, along = dx * Math.cos(a) + dy * Math.sin(a), off = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a)); if (along > 0 && off < c.r + 3) w.hurtContestant(c, 1, { kind: 'beam', x: this.x, y: this.y }); }
    }
  }
  breakLoose() { this.loose = true; const w = this.world; w.event('line', { id: 'wheelLoose' }); MT.music.layer('phase2', true); const a = Math.PI / 4 + RNG.ai() * .5; this.vx = Math.cos(a) * 85; this.vy = Math.sin(a) * 85; this.phase = 'p2'; }
  roll(dt) {
    const w = this.world; this.x += this.vx * dt; this.y += this.vy * dt; let b = false;
    if (this.x < AR.X0 + 40 || this.x > AR.X1 - 40) { this.vx = -this.vx; this.x = clamp(this.x, AR.X0 + 40, AR.X1 - 40); b = true; }
    if (this.y < AR.Y0 + 40 || this.y > AR.Y1 - 40) { this.vy = -this.vy; this.y = clamp(this.y, AR.Y0 + 40, AR.Y1 - 40); b = true; }
    if (b) { MT.sfx('crash'); w.shake(3); for (let i = 0; i < 8; i++) w.fireFoe('spark', this.x, this.y, i / 8 * TAU + this.ang, bulletSpd(90)); }
    this.ang += dt * 2;
  }
  update(world, dt) {
    if (this.dead || this.phase === 'intro') return;
    if (this.loose) this.contact(world, this.x, this.y, 40, 2); else this.solid(world, this.x, this.y, 44);
    if (!this.get('core').alive && !this.dying) { this.dying = true; this.setPhase('death', this.death()); }
  }
  *death() { const w = this.world; w.event('line', { id: 'wheelDown' }); for (let t = 0; t < 1.2; t += w.lastDt) { this.flat = t / 1.2; this.ang += w.lastDt * (8 - t * 6); yield; } yield* this.deathShower(w, ['#ffcc33', '#fff6b0', '#ff2e88', '#2ee6ff']); this.dead = true; w.event('bossDead', { boss: 'wheel' }); }
  sync() { super.sync(); const s = this.rs; s.ang = this.ang; s.seg = this.seg; s.flat = this.flat; s.beamA = this.beamA === undefined || this.beamA === null ? -99 : this.beamA; s.beamT = this.beamOn ? -1 : (this.beamT || 0); s.jack = this.jackpotT > 0 ? 1 : 0; }
  draw(r, t, world) {
    const s = this.rs; if (s.dead) return;
    const x = s.x, y = s.y, R = 44, P = s.parts || [], z = 8 + (s.phase === 'p2' ? 4 + Math.sin(t * 6) * 2 : 0);
    if (s.phase !== 'p2' && s.phase !== 'death') r.queue(x, y - 40, 0, g => r.box(g, x - 10, y - 50, 0, x + 10, y - 36, 24, '#c8a040', '#8a6a20'), { occluder: true });
    this.drawShadow(r, x, y + 4, R);
    r.queue(x, y, z, g => {
      const W = (a, rad, zz = z) => r.w(x + Math.cos(a) * rad, y + Math.sin(a) * rad * .9, zz);
      const rim = []; for (let i = 0; i < 40; i++) rim.push(W(i / 40 * TAU, R + 3));
      const rimLow = []; for (let i = 0; i < 40; i++) rimLow.push(W(i / 40 * TAU, R + 3, z - 4));
      px.poly(g, rimLow, '#5a3a10'); px.poly(g, rim, '#c8a040');
      for (let i = 0; i < 8; i++) {
        const a0 = (s.ang || 0) + i * TAU / 8, a1 = a0 + TAU / 8, alive = (P[1 + i] || 0) > 0, pts = [W(0, 0)];
        for (let k = 0; k <= 6; k++) pts.push(W(a0 + (a1 - a0) * k / 6, R));
        const lit = s.seg === i && Math.floor(t * 8) % 2 === 0;
        px.poly(g, pts, alive ? (lit ? '#ffffff' : SEG_COL[i]) : '#0a0610');
        const mid = W(a0 + TAU / 16, R * .62);
        if (alive) E.font.text(g, SEGMENTS[i].split(' ')[0], mid[0], mid[1] - 3, i === 3 || i === 5 ? '#ffcc33' : '#140a24', { align: 'center', outline: false, font: 'tiny' });
        else E.font.text(g, 'VOID', mid[0], mid[1] - 3, '#5a4a6a', { align: 'center', outline: false, font: 'tiny' });
        const b = W(a0 + TAU / 16, 34);
        if (alive) for (let k = 0; k < 5; k++) { const bb = W(a0 + TAU / 16 + (k - 2) * .07, 34 + (k % 2) * 4); px.disc(g, bb[0], bb[1], 2, (Math.floor(t * 10) + k + i) % 3 ? '#fff6b0' : '#ffcc33'); }
        const edge = W(a0, R); const c0 = W(0, 0); px.line(g, c0[0], c0[1], edge[0], edge[1], '#8a6a20');
      }
      const c = W(0, 0); px.disc(g, c[0], c[1], 13, '#140a24'); px.disc(g, c[0], c[1], 12, s.jack ? '#ffffff' : '#ffcc33'); px.disc(g, c[0], c[1], 8, '#ff2e88'); E.font.text(g, '$', c[0] + 1, c[1] - 3, '#ffffff', { align: 'center', outline: false });
      if (s.phase !== 'p2') { const p = W(-Math.PI / 2, R + 6, z + 2); px.poly(g, [[p[0] - 5, p[1] - 6], [p[0] + 5, p[1] - 6], [p[0], p[1] + 4]], '#d02a3a'); px.dot(g, p[0], p[1] - 4, '#ffffff'); }
      if ((s.pf || []).some(f => f)) px.blend(g, .5, 'add', () => px.poly(g, rim, '#ffffff'));
    }, { emissive: false });
    game.lights.add(x, y, 20, 80, .6, { color: '#ffcc33' });
    if (s.beamA > -90) {
      const tele = s.beamT > 0;
      r.queue(x, y, 14, g => { for (let k = 0; k < 4; k++) { const a = s.beamA + k * Math.PI / 2, A = r.w(x, y, 14), B = r.w(x + Math.cos(a) * 400, y + Math.sin(a) * 400, 14); if (tele) px.line(g, A[0], A[1], B[0], B[1], Math.floor(t * 16) % 2 ? '#ff3344' : '#ff9a3c'); else { px.line(g, A[0], A[1], B[0], B[1], '#a0f6ff', 5); px.line(g, A[0], A[1], B[0], B[1], '#ffffff', 2); } } }, { emissive: true, bias: 4 });
    }
  }
}
BOSSES.wheel = Wheel;
// =========================================================================================== LANCE LUSTRE LIVE! -> THE NETWORK
const CHANNELS = ['STATIC', 'NEWS', 'CARTOON', 'SHOPPING', 'LANCE'];
class Finale extends Boss {
  constructor(world) {
    super(world, 'finale', 'LANCE IN THE STARMAKER 9000'); this.x = AR.CX; this.y = -40; this.z = 20; this.lance = makeLance(1.4); this.mic = null; this.cones = [null, null]; this.robot = 0; this.wallUp = 0; this.breaks = 0; this.eyeOpen = 0;
    this.part('podium', { r: 22, hp: 260 });
    this.part('turretL', { ox: -26, oy: 4, r: 8, hp: 30 });
    this.part('turretR', { ox: 26, oy: 4, r: 8, hp: 30 });
    const cols = [72, 128, 240, 296], rows = [36, 62, 88];
    this.tvs = []; for (const ty of rows) for (const tx of cols) { const p = this.part('tv' + this.tvs.length, { r: 10, hp: 22, tv: true, tx, ty, when: b => b.stage === 'network', noBar: true, onDestroy: (b, w) => { if (b.tvsDown() >= 8 && !b.eyeOpen) { b.eyeOpen = 1; w.event('line', { id: 'eyeOpen' }); } } }); p.ch = -1; p.chT = 1 + this.tvs.length * .4; this.tvs.push(p); }
    this.part('eye', { r: 18, hp: 300, armor: b => b.tvsDown() >= 8 ? 1 : .15, when: b => b.stage === 'network', noBar: true });
    this.stage = 'lance'; this.netKeys = ['stage', 'robot', 'wallUp', 'eyeOpen', 'micX', 'micY', 'micR', 'micT', 'cone0', 'cone1', 'tvch', 'newsX', 'shock', 'shockX', 'shockY', 'lz'];
  }
  static enter(world) { const b = world.boss = new Finale(world); b.setPhase('intro', b.intro()); world.event('bossIntro', { boss: 'finale' }); }
  tvsDown() { return this.tvs.filter(p => !p.alive).length; }
  partPos(p) { if (p.tv) return { x: p.tx, y: p.ty, r: p.r }; if (p.id === 'eye') return { x: AR.CX, y: 62, r: p.r }; return { x: this.rs.x + p.ox, y: this.rs.y + p.oy, r: p.r }; }
  partHittable(p) { if (p.tv || p.id === 'eye') return p.alive && this.stage === 'network' && this.wallUp >= 1 && !this.dead; return p.alive && this.stage === 'lance' && !this.gone && !this.dead && this.phase !== 'intro'; }
  hpPct() { if (this.stage === 'network') { const eye = this.get('eye'); let a = eye.hp, b = eye.max; for (const p of this.tvs) { a += p.hp; b += p.max; } return a / b; } const L = ['podium', 'turretL', 'turretR'].map(id => this.get(id)); return L.reduce((a, p) => a + p.hp, 0) / L.reduce((a, p) => a + p.max, 0); }
  skipIntro() { this.y = 80; this.z = 20; this.introDone = true; this.setPhase('lance', this.lancePhase()); }
  *intro() { const w = this.world; for (let t = 0; t < 2; t += w.lastDt) { this.y = lerp(-40, 80, easeOut(t / 2)); yield; } w.event('line', { id: 'finaleIntro' }); yield 3; this.introDone = true; this.setPhase('lance', this.lancePhase()); }
  *hover(s) { const w = this.world; for (let t = 0; t < s; t += w.lastDt) { const c = nearestC(w, this), d = dist(c, this), a = angTo(c, this), want = d < 100 ? 1 : d > 140 ? -1 : 0; this.x = clamp(this.x + Math.cos(a) * want * 40 * w.lastDt, AR.X0 + 40, AR.X1 - 40); this.y = clamp(this.y + Math.sin(a) * want * 40 * w.lastDt, AR.Y0 + 30, AR.Y1 - 60); this.z = 20 + Math.sin(this.t * 2) * 3; yield; } }
  *lancePhase() {
    const w = this.world, pod = this.get('podium');
    while (true) {
      for (const pat of ['cyclone', 'micdrop', 'sweep']) {
        if (this.breaks < 2 && pod.hp < pod.max * (this.breaks === 0 ? .66 : .33)) { yield* this.commercial(); }
        if (!pod.alive) { yield* this.robotReveal(); return; }
        if (pat === 'cyclone') { w.event('pattern', { name: 'CUE CARD CYCLONE' }); let a = 0, acc = 0; for (let t = 0; t < 3; t += w.lastDt) { a += 1.4 * w.lastDt; acc += 12 * w.lastDt; while (acc >= 1) { acc--; for (let k = 0; k < 3; k++) w.fireFoe('card', this.x, this.y + 6, a + k * TAU / 3, bulletSpd(95)); } this.z = 20 + Math.sin(this.t * 2) * 3; if (!pod.alive) break; yield; } yield* this.hover(1); }
        else if (pat === 'micdrop') {
          w.event('pattern', { name: 'MIC DROP' }); const c = nearestC(w, this); this.micX = c.x; this.micY = c.y; this.micR = 30; this.micT = 1;
          for (let t = 0; t < 1; t += w.lastDt) { this.micT = 1 - t; this.z = 20 + t * 40; this.x = lerp(this.x, this.micX, w.lastDt * 4); this.y = lerp(this.y, this.micY - 20, w.lastDt * 4); yield; }
          this.x = this.micX; this.y = this.micY - 10; this.z = 0; this.micT = 0; MT.sfx('bigboom'); w.shake(7);
          for (let i = 0; i < 24; i++) w.fireFoe('orb', this.micX, this.micY, i / 24 * TAU, bulletSpd(85));
          this.shock = .01; this.shockX = this.micX; this.shockY = this.micY; this.shockHit = new Set();
          for (let t = 0; t < .8; t += w.lastDt) { this.shock = t / .8 * 80; for (const c2 of w.contestants) { if (c2.ctl === 'remote' || c2.ctl === 'mirror' || this.shockHit.has(c2.cid)) continue; const d = Math.hypot(c2.x - this.shockX, c2.y - this.shockY); if (Math.abs(d - this.shock) < 6) { this.shockHit.add(c2.cid); w.hurtContestant(c2, 1, { kind: 'shock', x: this.shockX, y: this.shockY }); } } yield; }
          this.shock = 0; this.micT = 0; this.micX = this.micY = -999; for (let t = 0; t < .6; t += w.lastDt) { this.z = t / .6 * 20; yield; }
          yield* this.hover(1);
        }
        else if (pat === 'sweep') {
          w.event('pattern', { name: 'SPOTLIGHT SWEEP' }); const turrets = [this.get('turretL'), this.get('turretR')];
          const base = [Math.PI * .6, Math.PI * .4];
          for (let t = 0; t < 4.5; t += w.lastDt) {
            for (let i = 0; i < 2; i++) { if (!turrets[i].alive) { this.cones[i] = null; continue; } const tele = t < .8; const a = base[i] + Math.sin((t - .8) * 1.2 + i * 2) * .9; this.cones[i] = { a, tele }; if (!tele) this.coneHit(w, i, a); }
            this.z = 20 + Math.sin(this.t * 2) * 3; yield;
          }
          this.cones = [null, null]; yield* this.hover(1);
        }
      }
    }
  }
  coneHit(w, i, a) {
    const ox = this.x + (i ? 26 : -26), oy = this.y + 4;
    for (const c of w.contestants) { if (c.ctl === 'remote' || c.ctl === 'mirror') continue; const d = Math.hypot(c.x - ox, c.y - oy), da = Math.abs(angDiff(a, Math.atan2(c.y - oy, c.x - ox))); const inside = d < 200 && da < .22; c.coneT = inside ? (c.coneT || 0) + w.lastDt : 0; if (c.coneT >= .4) { c.coneT = 0; w.hurtContestant(c, 1, { kind: 'spotlight', x: ox, y: oy }); } }
  }
  *commercial() {
    const w = this.world; this.breaks++; w.event('commercial', {}); this.cones = [null, null];
    const y0 = this.y; for (let t = 0; t < 1; t += w.lastDt) { this.y = lerp(y0, -60, t); this.z = 20 + t * 40; yield; }
    this.gone = true;
    w.arena.queueSpawn('W', 'goon', MT.scaleAdds(w, 5), .3); w.arena.queueSpawn('E', 'goon', MT.scaleAdds(w, 5), .3); w.arena.queueSpawn('S', 'clapbot', MT.scaleAdds(w, 6), .25); w.arena.queueSpawn('N', 'brute', 1, .5);
    let t = 0; yield 1;
    while (t < 12 && (w.countedAlive() > 0 || w.arena.pendingSpawns() > 0)) { t += w.lastDt; yield; }
    this.gone = false; w.event('backFromBreak', {});
    for (let k = 0; k < 1; k += w.lastDt) { this.y = lerp(-60, 80, easeOut(k)); this.z = 60 - k * 40; yield; }
  }
  *robotReveal() {
    const w = this.world; this.cones = [null, null]; this.stage = 'crash'; w.event('lanceDown', {}); w.fShots.clear();
    for (let t = 0; t < 1; t += w.lastDt) { this.z = Math.max(0, 20 * (1 - t * 2)); yield; }
    MT.sfx('crash'); w.shake(8); if (game.particles && !w.quietFx) game.particles.explosion(this.x, this.y, 10, 1.6, { shake: 0, freeze: false });
    this.lz = 1; yield 2.5;
    this.robot = 1; w.event('robotReveal', {}); yield 3.5;
    this.stage = 'rise'; w.event('networkReveal', {});
    for (let t = 0; t < 2; t += w.lastDt) { this.wallUp = t / 2; yield; }
    this.wallUp = 1; this.stage = 'network'; this.name = 'THE NETWORK'; MT.music.layer('phase2', true);
    this.setPhase('network', this.networkPhase());
  }
  *networkPhase() {
    const w = this.world, eye = this.get('eye');
    let eyeT = 0, mode = 0;
    while (true) {
      const dt = w.lastDt;
      let active = this.tvs.filter(p => p.alive && p.ch >= 0).length;
      for (const tv of this.tvs) {
        if (!tv.alive) { tv.ch = -1; continue; }
        tv.chT -= dt;
        if (tv.ch === -2 && tv.chT <= 0) { tv.ch = tv.next; tv.chT = tv.ch === 1 ? 1.8 : 1.2; tv.fired = false; tv.newsT = 0; }
        else if (tv.ch >= 0) {
          if (!tv.fired && tv.ch !== 1) { tv.fired = true; this.channel(w, tv); }
          if (tv.ch === 1) { tv.newsT += dt; if (tv.newsT > .8) this.newsHit(w, tv); }
          if (tv.chT <= 0) { tv.ch = -1; tv.chT = 4 + RNG.ai() * 2; }
        } else if (tv.ch === -1 && tv.chT <= 0 && active < 4) { tv.ch = -2; tv.next = Math.floor(RNG.ai() * 5); tv.chT = .5; active++; MT.sfx('channel'); }
        else if (tv.ch === -1 && tv.chT <= 0) tv.chT = .5;
      }
      if (this.tvsDown() >= 8) { this.eyeOpen = Math.min(1, this.eyeOpen + dt); eyeT -= dt; if (eyeT <= 0) { eyeT = 3; mode = 1 - mode; this.eyeMode = mode; } if (mode === 0) { this._sp = (this._sp || 0) + dt; this._spA = (this._spA || 0) + dt * 1.6; while (this._sp > .1) { this._sp -= .1; for (let k = 0; k < 2; k++) w.fireFoe('static', AR.CX, 62, this._spA + k * Math.PI, bulletSpd(90)); } } else if (eyeT > 2.9) for (let i = 0; i < 18; i++) w.fireFoe('orb', AR.CX, 62, i / 18 * TAU + this.t, bulletSpd(80)); }
      if (!eye.alive) { this.setPhase('death', this.death()); return; }
      yield;
    }
  }
  channel(w, tv) {
    const c = nearestC(w, { x: tv.tx, y: tv.ty });
    if (tv.ch === 0) { for (let i = 0; i < 5; i++) w.fireFoe('static', tv.tx, tv.ty + 8, Math.atan2(c.y - tv.ty, c.x - tv.tx) + (i - 2) * .12, bulletSpd(100)); MT.sfx('static'); }
    else if (tv.ch === 2) { for (let i = 0; i < 2; i++) w.spawnEnemy('clapbot', tv.tx + (i ? 6 : -6), tv.ty + 16, { inside: true }); }
    else if (tv.ch === 3) w.addPickup(MT.makePickup('stack', tv.tx, tv.ty + 24, { z: 10, vz: 60 }));
    else if (tv.ch === 4) { for (let i = -1; i <= 1; i++) w.fireFoe('orb', tv.tx, tv.ty + 8, Math.atan2(c.y - tv.ty, c.x - tv.tx) + i * .25, bulletSpd(95)); }
  }
  newsHit(w, tv) { for (const c of w.contestants) if (c.ctl !== 'remote' && c.ctl !== 'mirror' && Math.abs(c.x - tv.tx) < c.r + 5 && c.y > tv.ty) w.hurtContestant(c, 1, { kind: 'news', x: tv.tx, y: c.y }); }
  *death() { const w = this.world; w.event('line', { id: 'networkDown' }); for (const tv of this.tvs) { if (tv.alive) { tv.alive = false; if (game.particles && !w.quietFx) game.particles.explosion(tv.tx, tv.ty, 14, .7, { shake: 0, freeze: false }); MT.sfx('static'); yield .18; } } this.x = AR.CX; this.y = 80; yield* this.deathShower(w, ['#c8d0e0', '#2ee6ff', '#ffffff', '#ff2e88']); this.dead = true; w.event('bossDead', { boss: 'finale' }); }
  update(world, dt) {
    if (this.dead) return;
    if (this.stage === 'lance' && this.phase === 'lance' && !this.get('podium').alive) this.setPhase('reveal', this.robotReveal());
    if (this.stage === 'lance' && !this.gone && this.phase !== 'intro') this.solid(world, this.x, this.y, 18);
    if (this.stage === 'network') for (const tv of this.tvs) if (tv.alive) this.solid(world, tv.tx, tv.ty, 10);
  }
  animate(dt) {
    if (MT.cfg.skipRigs) return;
    const s = this.rs, down = s.lz && (s.stage === 'crash' || s.stage === 'rise' || s.stage === 'network');
    this.lance.update(dt, { x: s.x, y: s.y - 2, z: down ? 0 : s.z + 10, vx: 0, vy: 0, facing: Math.PI / 2, pose: down ? (s.robot ? 'kneel' : 'die') : s.micT > 0 ? 'cheer' : Math.floor(s.t) % 3 === 0 ? 'wave' : 'hips', expr: s.robot ? 'shout' : 'smile' });
  }
  sync() { super.sync(); const s = this.rs; s.stage = this.stage; s.robot = this.robot; s.wallUp = this.wallUp; s.eyeOpen = this.eyeOpen; s.micX = this.micX === undefined ? -999 : this.micX; s.micY = this.micY === undefined ? -999 : this.micY; s.micR = 30; s.micT = this.micT || 0; s.cone0 = this.cones[0] ? this.cones[0].a * (this.cones[0].tele ? -1 : 1) : 0; s.cone1 = this.cones[1] ? this.cones[1].a * (this.cones[1].tele ? -1 : 1) : 0; s.tvch = this.tvs.map(p => p.ch).join(','); s.shock = this.shock || 0; s.shockX = this.shockX || 0; s.shockY = this.shockY || 0; s.lz = this.lz || 0; }
  draw(r, t, world) {
    const s = this.rs; if (s.dead && s.stage === 'network') return;
    if (s.stage === 'rise' || s.stage === 'network') this.drawNetwork(r, t, s);
    if (s.micX > -900 && s.micT > 0) r.decal(() => { r.groundDisc(s.micX, s.micY, 30 * (1 - s.micT * .5), '#000000', .5); r.groundRing(s.micX, s.micY, 30, Math.floor(t * 10) % 2 ? '#ff3344' : '#ffcc33', 1); });
    if (s.shock > 0) r.decal(() => { r.groundRing(s.shockX, s.shockY, s.shock, '#ffffff', 1); r.groundRing(s.shockX, s.shockY, Math.max(1, s.shock - 3), '#ffcc33', .8); });
    for (const [i, a] of [[0, s.cone0], [1, s.cone1]]) { if (!a) continue; const tele = a < 0, ang = Math.abs(a), ox = s.x + (i ? 26 : -26), oy = s.y + 4; r.decal(g => { const pts = [r.w(ox, oy, 0)]; for (let k = -1; k <= 1; k += .25) pts.push(r.w(ox + Math.cos(ang + k * .22) * 200, oy + Math.sin(ang + k * .22) * 200, 0)); if (tele) { for (let k = 1; k < pts.length - 1; k++) px.line(g, pts[0][0], pts[0][1], pts[k][0], pts[k][1], '#ff3344'); } else px.blend(g, .45, 'add', () => px.poly(g, pts, '#fff6c0')); }, { emissive: tele ? 0 : 1 }); if (!tele) game.lights.add(ox + Math.cos(ang) * 90, oy + Math.sin(ang) * 90, 0, 70, .8, { color: '#fff6c0' }); }
    if (s.stage === 'network') return;
    if (s.gone && s.stage === 'lance') return;
    const x = s.x, y = s.y, z = s.stage === 'lance' ? s.z : 0, P = s.parts || [];
    this.drawShadow(r, x, y + 4, 24);
    if (s.stage === 'lance') {
      r.actor(x, y + 6, z, (g, ox, oy) => {
        const pf = (s.pf || []).slice(0, 3).some(f => f);
        px.poly(g, [[ox - 22, oy - 4], [ox + 22, oy - 4], [ox + 16, oy + 8], [ox - 16, oy + 8]], '#140a24'); px.poly(g, [[ox - 21, oy - 4], [ox + 21, oy - 4], [ox + 15, oy + 7], [ox - 15, oy + 7]], pf ? '#ffffff' : '#c8a040');
        px.rect(g, ox - 18, oy - 16, 36, 13, '#140a24'); px.rect(g, ox - 17, oy - 15, 34, 11, '#ffcc33'); px.rect(g, ox - 17, oy - 15, 34, 2, '#fff6b0');
        E.font.text(g, 'STARMAKER', ox, oy - 13, '#7a2ad0', { align: 'center', outline: false, font: 'tiny' }); E.font.text(g, '9000', ox, oy - 8, '#7a2ad0', { align: 'center', outline: false, font: 'tiny' });
        for (const k of [-10, 0, 10]) { px.disc(g, ox + k, oy + 10, 3, Math.floor(t * 20 + k) % 2 ? '#ff9a3c' : '#ffcc33'); }
        for (const [sd, alive] of [[-1, P[1] > 0], [1, P[2] > 0]]) { if (!alive) continue; const tx = ox + sd * 26, ty = oy - 8; px.disc(g, tx, ty, 7, '#140a24'); px.disc(g, tx, ty, 6, '#5a5468'); px.disc(g, tx, ty + 1, 4, '#fff6c0'); px.dot(g, tx - 1, ty - 1, '#ffffff'); }
      }, { outline: false });
      game.lights.add(x, y, z + 6, 50, .6, { color: '#ffcc33' });
    }
    r.actor(x, y - 2, s.stage === 'lance' ? z + 10 : 0, (g, ox, oy) => {
      this.lance.draw(g, ox, oy, r.view);
      if (s.robot) { const h = this.lance.head(), [hx, hy] = r.w(h.x, h.y, h.z); px.rect(g, hx - 4, hy - 3, 8, 6, '#5a5f70'); for (let k = -3; k <= 3; k += 2) px.line(g, hx + k, hy - 2, hx + k, hy + 2, '#1a1a24'); px.dot(g, hx - 2, hy - 4, Math.floor(t * 8) % 2 ? '#ff3344' : '#2a0008'); px.dot(g, hx + 2, hy - 4, Math.floor(t * 8) % 2 ? '#ff3344' : '#2a0008'); }
      else MT.paint.drawMic(g, r, this.lance);
    }, { xray: true });
  }
  drawNetwork(r, t, s) {
    const up = s.wallUp || 0, ch = String(s.tvch || '').split(',').map(Number);
    r.queue(AR.CX, 8, 0, g => { const a = r.w(40, 10, 0), b = r.w(328, 10, 60 * up); px.rect(g, a[0], b[1], b[0] - a[0], a[1] - b[1], '#0c0a18'); for (let x = a[0]; x < b[0]; x += 6) px.line(g, x, b[1], x, a[1], '#141024'); }, { bias: -5 });
    if (up < 1) return;
    this.tvs.forEach((tv, i) => {
      const alive = (s.parts || [])[this.parts.indexOf(tv)] > 0, c = ch[i];
      r.queue(tv.tx, tv.ty, 0, g => {
        r.box(g, tv.tx - 11, tv.ty - 5, 0, tv.tx + 11, tv.ty + 5, 20, '#2a2838', '#141018');
        const p0 = r.w(tv.tx - 9, tv.ty + 5, 18), p1 = r.w(tv.tx + 9, tv.ty + 5, 4), x0 = Math.round(p0[0]), y0 = Math.round(p0[1]), w = Math.round(p1[0] - p0[0]), h = Math.round(p1[1] - p0[1]);
        if (!alive) { px.rect(g, x0, y0, w, h, '#0a0a0a'); px.line(g, x0, y0, x0 + w, y0 + h, '#5a5468'); return; }
        const bg = c === -2 ? (Math.random() < .5 ? '#ffffff' : '#3a3a48') : c === 0 ? '#5a5a68' : c === 1 ? '#1a3a8a' : c === 2 ? '#ff9a3c' : c === 3 ? '#2a8a4a' : c === 4 ? '#7a2ad0' : '#141030';
        px.rect(g, x0, y0, w, h, bg);
        if (c === 0 || c === -2) for (let k = 0; k < 14; k++) px.dot(g, x0 + Math.random() * w, y0 + Math.random() * h, Math.random() < .5 ? '#ffffff' : '#000000');
        if (c === 1) { E.font.text(g, 'NEWS', x0 + w / 2, y0 + 1, '#ffffff', { align: 'center', outline: false, font: 'tiny' }); }
        if (c === 2) { px.disc(g, x0 + w / 2, y0 + h / 2, 3, '#ffffff'); px.dot(g, x0 + w / 2 - 1, y0 + h / 2 - 1, '#000'); }
        if (c === 3) E.font.text(g, '$', x0 + w / 2, y0 + 1, '#ffcc33', { align: 'center', outline: false });
        if (c === 4) { px.disc(g, x0 + w / 2, y0 + h / 2, 3, '#f0c8a0'); px.rect(g, x0 + w / 2 - 3, y0 + h / 2 - 4, 6, 2, '#e8e8f4'); }
        if (c === -1) { E.font.text(g, 'N', x0 + w / 2, y0 + 1, '#3a3a5a', { align: 'center', outline: false, font: 'tiny' }); }
      }, { occluder: true, top: 20 });
      if (alive && c === 1) r.decal(g => { const a = r.w(tv.tx, tv.ty + 8, 0), b = r.w(tv.tx, AR.Y1, 0); px.line(g, a[0], a[1], b[0], b[1], Math.floor(t * 12) % 2 ? '#ff3344' : '#ffffff', 3); }, { emissive: 1 });
    });
    const eyeA = (s.parts || [])[this.parts.indexOf(this.get('eye'))] > 0;
    if (eyeA) r.queue(AR.CX, 62, 0, g => {
      r.box(g, AR.CX - 20, 54, 0, AR.CX + 20, 70, 26, '#3a3448', '#1a1420');
      const [ex, ey] = r.w(AR.CX, 70, 14), open = s.eyeOpen || 0;
      px.ell(g, ex, ey, 16, 9, '#140a24'); px.ell(g, ex, ey, 15, 2 + 6 * open, '#fff7e8'); if (open > .2) { px.disc(g, ex, ey, 5 * open + 1, '#2ee6ff'); px.disc(g, ex, ey, 2.5 * open + .5, '#140a24'); px.dot(g, ex - 2, ey - 2, '#ffffff'); }
    }, { occluder: true, top: 26 });
    game.lights.add(AR.CX, 62, 20, 90, .7, { color: '#2ee6ff' });
  }
}
BOSSES.finale = Finale;
