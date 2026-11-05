// Bosses (Sir Buttonsworth, Gnarlgrim the Knotted), the siege director, the day clock with light and weather.
(() => {
const E = My3D2dge, DQ = globalThis.DQ, px = E.px, T = 16, tun = k => DQ.tuning.get(k);

// ---------------- BOSSES ----------------
const Bosses = DQ.Bosses = {
  setup(m) { m.phase = 1; m.cool = 1.5; m.move = null; m.mt = 0; m.rings = []; m.summoned = 0; m.tangled = 0; m.hits = []; m.weak = 0; m.tangleDmg = 0; m.roar = 0; m.downK = 0; m.order = 0; m.awake = m.id !== 'buttonGolem'; },
  defOf(m) { if (m.id === 'gnarlgrim') return m.tangled > 0 ? 0 : 25; return m.def.def; },
  modDamage(m, dmg, b, o) {
    if (m.id !== 'gnarlgrim') return dmg;
    if (m.tangled > 0) {
      const a = Math.atan2(b.body.y - m.body.y, b.body.x - m.body.x), front = Math.abs(E.angDiff(m.body.facing, a)) < 1.2;
      const k = front ? (b.weapon.ripper ? 4 : 2) : 1; dmg *= k; m.tangleDmg += dmg;
      if (front) m.ctx.game.particles.glints(m.body.x, m.body.y, m.body.z + 40, 6, '#ff5aff');
      return dmg;
    }
    m.weak++; if (m.weak === 3) m.ctx.events.emit('bossHint', { id: m.id });
    return dmg;
  },
  onHit(m, o) {
    if (m.id !== 'gnarlgrim' || o.src !== 'ballista') return;
    const now = m.ctx.game.time; m.hits = m.hits.filter(t => now - t < tun('tangleWindow')); m.hits.push(now);
    if (m.tangled <= 0 && (m.hits.length >= 2 || m.move === 'charge')) Bosses.tangle(m);
  },
  tangle(m) { m.tangled = 5; m.move = null; m.hits = []; m.tangleDmg = 0; m.charging = false; m.body.vx = m.body.vy = 0; m.ctx.events.emit('tangled', { id: m.id }); m.ctx.audioX && m.ctx.audioX.sfx('tangle'); m.ctx.hud && m.ctx.hud.flashText('TANGLED!'); },
  update(m, dt) {
    const ctx = m.ctx, b = m.body, tg = m.pickTarget(); m.target = tg;
    m.roar = Math.max(0, m.roar - dt);
    for (const r of m.rings) r.t += dt; m.rings = m.rings.filter(r => r.t < r.dur);
    if (!m.awake) { b.vx = b.vy = 0; m.downK = .6; return; }
    m.downK = E.approach(m.downK, m.tangled > 0 ? .6 : 0, dt * 3);
    if (m.attack) { m.attack.update(dt); if (!m.attack.busy) m.attack = null; }
    if (m.tangled > 0) { m.tangled -= dt; b.vx = b.vy = 0; if (m.tangleDmg >= 100 && !m._stag) { m._stag = true; ctx.game.shake(4); } if (m.tangled <= 0) { m._stag = false; m.roar = 1; Bosses.knockRing(m, 3.5 * T, 6); ctx.audioX && ctx.audioX.sfx('roar'); } return; }
    // phases by health
    if (m.id === 'gnarlgrim') { const ph = m.hp > m.maxHp * .66 ? 1 : m.hp > m.maxHp * .33 ? 2 : 3; if (ph !== m.phase) { m.phase = ph; m.roar = 1.2; Bosses.knockRing(m, 4 * T, 8); ctx.audioX && ctx.audioX.sfx('roar'); ctx.events.emit('bossPhase', { id: m.id, phase: ph }); if (ph === 2) for (let i = 0; i < 4; i++) Bosses.summon(m, 'lintling'); if (ph === 3) Bosses.summon(m, 'knotbrute'); } }
    else if (m.hp < m.maxHp * .5 && !m.summoned) { m.summoned = 1; for (let i = 0; i < 3; i++) Bosses.summon(m, 'lintling'); }
    const fast = m.phase >= 3 ? .75 : 1;
    if (!tg) { b.vx = b.vy = 0; return; }
    const dx = tg.body.x - b.x, dy = tg.body.y - b.y, d = Math.hypot(dx, dy);
    if (m.move) { Bosses._move(m, dt, tg, fast); return; }
    // walk toward the target, pick the next move
    b.facing = E.approachAng(b.facing, Math.atan2(dy, dx), dt * 3);
    if (d > 40) { b.vx = dx / d * m.def.speed * tun('monsterSpeed') * .8; b.vy = dy / d * m.def.speed * tun('monsterSpeed') * .8; if (b.hitWall && b.onGround) b.jump(220); } else { b.vx = b.vy = 0; }
    m.cool -= dt;
    if (m.cool <= 0) {
      const opts = m.id === 'buttonGolem' ? ['slam', 'volley', 'charge'] : m.phase === 1 ? ['slam', 'toss'] : ['slam', 'toss', 'charge'];
      m.move = d < 50 ? 'slam' : opts[m.order++ % opts.length]; if (m.move === 'slam' && d > 70) m.move = opts[(m.order) % opts.length] === 'slam' ? 'toss' : opts[m.order % opts.length];
      if (m.id === 'buttonGolem' && m.move === 'toss') m.move = 'volley';
      m.mt = 0; m.fired = 0;
      m.attack = new E.Attack(m.move === 'slam' ? 'haymaker' : m.move === 'charge' ? 'cross' : 'throw', { wind: .4, active: .15, recover: .4 }); m.attack.start();
      ctx.audioX && ctx.audioX.sfxAt('windup', b.x, b.y);
    }
  },
  _move(m, dt, tg, fast) {
    const ctx = m.ctx, b = m.body; m.mt += dt; b.vx *= .8; b.vy *= .8;
    const W = { slam: .6, volley: .4, charge: .7, toss: .5 }[m.move] * fast;
    if (m.move === 'slam') {
      if (m.mt >= W && !m.fired) { m.fired = 1; const R = (m.id === 'gnarlgrim' ? 3.5 : 3) * T; m.rings.push({ t: 0, dur: .5, R, hit: new Set(), z: b.z }); ctx.game.shake(5); ctx.audioX && ctx.audioX.sfx('slam'); ctx.game.particles.dust(b.x, b.y, b.z, 12); ctx.game.input.rumble(.8, .2); }
      // the ring hurts anyone on the ground where it passes
      for (const r of m.rings) { const rad = r.R * (r.t / r.dur); for (const q of ctx.builders) { if (r.hit.has(q)) continue; const dd = Math.hypot(q.body.x - b.x, q.body.y - b.y); if (Math.abs(dd - rad) < 8 && q.body.z < r.z + 6 && q.body.onGround) { r.hit.add(q); q.hurt(ctx.combat.formula(12 * tun('monsterDmg'), q.def), { x: b.x, y: b.y }); } } }
      if (m.mt > W + .9) Bosses._done(m);
    } else if (m.move === 'volley') {
      if (m.mt >= W && !m.fired) { m.fired = 1; const a0 = Math.atan2(tg.body.y - b.y, tg.body.x - b.x); for (let i = 0; i < 5; i++) { const a = a0 + (i - 2) * (25 * Math.PI / 180) / 2; ctx.monsters.fire({ x: b.x + Math.cos(a) * 14, y: b.y + Math.sin(a) * 14, z: b.z + 24, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, vz: 0, dmg: 8, r: 4, color: '#e8c040', life: 2.5 }); } ctx.audioX && ctx.audioX.sfx('volley'); }
      if (m.mt > W + .8) Bosses._done(m);
    } else if (m.move === 'toss') {
      const n = m.phase >= 3 ? 2 : 1;
      if (m.mt >= W && m.fired < n && m.mt >= W + m.fired * .35) {
        const off = m.fired ? 24 : 0, tx = tg.body.x + off * Math.cos(m.mt * 7), ty = tg.body.y + off * Math.sin(m.mt * 7), tz = ctx.world.groundAt(tx, ty, 2, tg.body.z + 8, 8);
        const a = E.arc({ x: b.x, y: b.y, z: b.z + 48 }, { x: tx, y: ty, z: tz }, 600, { time: 1.1 });
        ctx.monsters.fire({ x: b.x, y: b.y, z: b.z + 48, vx: a.vx, vy: a.vy, vz: a.vz, arc: true, dmg: 10, r: 6, color: '#3a2a4a', life: 1.4, tx, ty, tz, colors: ['#2a1a3a', '#6a4a8a'], onLand: s => Bosses.tangleBlock(ctx, s.x, s.y, s.z) });
        m.fired++; ctx.audioX && ctx.audioX.sfx('whoosh');
      }
      if (m.mt > W + 1.4) Bosses._done(m);
    } else if (m.move === 'charge') {
      if (m.mt < W) { if (!m._ct) { const ba = ctx.objects.filter(o => o.def.ballista && !o.broken); let t = tg.body; if (m.id === 'gnarlgrim' && ba.length) { const o = ba[Math.floor(DQ.rng('boss')() * ba.length)]; t = { x: (o.x + .5) * T, y: (o.y + .5) * T }; } m._ct = Math.atan2(t.y - b.y, t.x - b.x); b.facing = m._ct; } return; }
      m.charging = true; const a = m._ct; b.vx = Math.cos(a) * 140; b.vy = Math.sin(a) * 140;
      // breaks blocks in its path; hitting a wall leaves it dizzy
      const cx = Math.floor((b.x + Math.cos(a) * (b.r + 6)) / T), cy = Math.floor((b.y + Math.sin(a) * (b.r + 6)) / T), L = Math.floor((b.z + 1) / T);
      let wall = false; for (const l of [L, L + 1, L + 2]) { const id = ctx.world.get(cx, cy, l); if (id && DQ.BLOCKS[id].tier < 99 && DQ.BLOCKS[id].solid) { ctx.combat.hitBlock(cx, cy, l, 999); wall = true; } const o = ctx.world.objAt(cx, cy, l); if (o && (o.def.ballista || o.def.door)) ctx.combat.hitObject(o, 60, m); }
      for (const q of ctx.builders) if (!q.ko && Math.hypot(q.body.x - b.x, q.body.y - b.y) < b.r + 8 && !m._chit) { m._chit = 1; q.hurt(ctx.combat.formula(m.def.atk * tun('monsterDmg'), q.def), { x: b.x, y: b.y }); }
      if (wall && m.id === 'buttonGolem') { m.dizzy = 2; ctx.game.shake(5); ctx.audioX && ctx.audioX.sfx('slam'); Bosses._done(m); return; }
      if (m.mt > W + 1.1 || (b.hitWall && m.mt > W + .2)) { if (m.id === 'buttonGolem' && b.hitWall) m.dizzy = 2; Bosses._done(m); }
    }
  },
  _done(m) { m.move = null; m.charging = false; m._ct = null; m._chit = 0; m.cool = (m.id === 'gnarlgrim' ? 1.4 : 1.6) * (m.phase >= 3 ? .75 : 1); },
  knockRing(m, R, dmg) { const ctx = m.ctx, b = m.body; m.rings.push({ t: 0, dur: .4, R, hit: new Set(), z: b.z }); ctx.game.particles.ring(b.x, b.y, 8, R, '#ff6aff', .4); for (const q of ctx.builders) { const d = Math.hypot(q.body.x - b.x, q.body.y - b.y); if (d < R) { const a = Math.atan2(q.body.y - b.y, q.body.x - b.x); q.body.push(Math.cos(a) * 180, Math.sin(a) * 180, 120); } } },
  summon(m, id) { const a = DQ.rng('boss')() * Math.PI * 2; const s = m.ctx.monsters.spawn(id, m.body.x + Math.cos(a) * 40, m.body.y + Math.sin(a) * 40, m.body.z + 4, { siege: m.ctx.siege && m.ctx.siege.active }); s.aggro = true; s.state = 'chase'; m.ctx.game.particles.smoke(s.body.x, s.body.y, s.body.z + 6, 6); return s; },
  tangleBlock(ctx, x, y, z) {
    const cx = Math.floor(x / T), cy = Math.floor(y / T), L = Math.floor((z + 1) / T), w = ctx.world;
    for (const q of ctx.builders) if (Math.hypot(q.body.x - x, q.body.y - y) < 20) q.hurt(ctx.combat.formula(10 * tun('monsterDmg'), q.def), { x, y });
    if (!w.get(cx, cy, L) && !w.objAt(cx, cy, L) && !ctx.builders.some(q => q.blockedByBody(cx, cy, L, 1))) { w.set(cx, cy, L, DQ.blockId('tangle'), { by: 'boss' }); (ctx.temps || (ctx.temps = [])).push({ x: cx, y: cy, z: L, t: 20 }); }
    ctx.game.particles.bits(x, y, z + 4, 10, ['#2a1a3a', '#6a4a8a']);
  },
  defeated(m) { const ctx = m.ctx; ctx.flags['boss_' + m.id] = true; ctx.events.emit('bossDefeated', { id: m.id }); },
  drawUnder(m, r) {
    for (const ring of m.rings) { const rad = ring.R * (ring.t / ring.dur); r.queue(m.body.x, m.body.y, ring.z + .5, g => { const pts = r.groundPts(m.body.x, m.body.y, rad, 28, ring.z + .5); for (let i = 0; i < pts.length; i++) { const a = pts[i], b2 = pts[(i + 1) % pts.length]; px.line(g, a[0], a[1], b2[0], b2[1], m.id === 'gnarlgrim' ? '#ff6aff' : '#ffd84a', 2); } }, { bias: -.002, emissive: true }); }
    if (m.move === 'slam' && !m.fired) r.queue(m.body.x, m.body.y, m.body.z + .5, g => px.polyDither(g, r.groundPts(m.body.x, m.body.y, (m.id === 'gnarlgrim' ? 3.5 : 3) * T, 24, m.body.z + .5), '#ff3a3a', .25 + .15 * Math.sin(r.game.real * 20), r.ix, r.iy), { bias: -.003 });
  },
  drawOver(m, g, ox, oy, r) {
    const s = (r.view.zoom || 1) * (m.def.size || 1);
    if (m.id === 'gnarlgrim') { const k = m.tangled > 0 ? 1 : .35, pulse = 2 + Math.sin(r.game.real * 8) * (m.tangled > 0 ? 1.5 : .5); px.disc(g, ox, oy - 15 * s, (2.5 + pulse) * (r.view.zoom || 1), m.tangled > 0 ? '#ff5aff' : '#8a2a8a'); px.disc(g, ox, oy - 15 * s, 2 * (r.view.zoom || 1), '#ffe0ff'); if (m.tangled > 0) for (let i = 0; i < 6; i++) { const a = r.game.real * 2 + i; px.line(g, ox + Math.cos(a) * 6 * s, oy - 10 * s + Math.sin(a) * 4 * s, ox + Math.cos(a + 2) * 7 * s, oy - 14 * s + Math.sin(a + 2) * 4 * s, '#6a4a8a'); } }
    if (m.id === 'buttonGolem') { px.disc(g, ox, oy - 11 * s, 2.2 * (r.view.zoom || 1), '#e8c040'); px.dot(g, ox - 1, oy - 11 * s, '#8a6a20'); px.dot(g, ox + 1, oy - 11 * s, '#8a6a20'); }
  }
};

// ---------------- THE SIEGE ----------------
class Siege {
  constructor(ctx) { this.ctx = ctx; this.active = false; this.phase = null; this.wave = 0; this.left = 0; this.spawns = []; this.boss = null; this.failed = false; this.script = null; this.bee = false; }
  points() {
    if (this.bee) { const s = DQ.BEE.spawns; return { east: s[1], north: s[0], rift: s[3], south: s[2] }; }
    return { east: [104, 76], north: [72, 52], rift: [91, 81] };
  }
  start(o = {}) {
    const ctx = this.ctx; this.active = true; this.failed = false; this.phase = 'prep'; this.wave = 0; this.left = o.prep === undefined ? 90 : o.prep; this.boss = null; this.bee = !!o.bee; this.waves = o.waves || DQ.SIEGE_WAVES;
    ctx.flags.siegeStarted = true; ctx.events.emit('siegeWave', { phase: 'prep' });
    const ban = ctx.town && ctx.town.bannerObj(); if (ban) ban.hp = o.bannerHp || 300;
    if (!this.bee && ctx.save) ctx.save.checkpoint('siege');
  }
  stop() { this.active = false; this.phase = null; for (const m of this.ctx.monsters.list) if (m.siege) { m.dead = true; m.deadT = 99; } }
  skipPrep() { if (this.phase === 'prep') this.left = 0; }
  update(dt) {
    if (!this.active) return;
    const ctx = this.ctx;
    // spawns trickle in over 10 s
    for (let i = this.spawns.length - 1; i >= 0; i--) { const s = this.spawns[i]; s.t -= dt; if (s.t <= 0) { const [x, y] = this.points()[s.from] || this.points().east; const m = ctx.monsters.spawnCell(s.id, x + Math.round((DQ.rng('siege')() - .5) * 4), y + Math.round((DQ.rng('siege')() - .5) * 4), { siege: true, wave: this.wave }); m.aggro = true; m.state = 'chase'; this.spawns.splice(i, 1); } }
    if (this.phase === 'prep') { this.left -= dt; if (this.left <= 0) this.nextWave(); return; }
    if (this.phase === 'wave') {
      const alive = ctx.monsters.list.filter(m => !m.dead && m.siege && m.wave === this.wave).length;
      if (!alive && !this.spawns.length) { ctx.events.emit('siegeWave', { phase: 'cleared', wave: this.wave }); if (this.wave >= this.waves.length) { if (!this.bee) ctx.flags.siegeDone = true; this.phase = 'boss-in'; this.left = this.bee ? 0 : 6; } else { this.phase = 'breather'; this.left = 25; } }
      return;
    }
    if (this.phase === 'breather') { this.left -= dt; if (this.left <= 0) this.nextWave(); return; }
    if (this.phase === 'boss-in') { this.left -= dt; if (this.left <= 0) { if (this.bee) { this.finish(); return; } this.phase = 'boss'; ctx.events.emit('siegeWave', { phase: 'boss' }); } return; }
    if (this.phase === 'boss' && this.boss && this.boss.dead) { this.finish(); }
  }
  nextWave() {
    const ctx = this.ctx; this.wave++; this.phase = 'wave';
    const W = this.waves[this.wave - 1], k = tun('siegeSize');
    let t = 0; for (const [id, n, from] of W) for (let i = 0; i < Math.max(1, Math.round(n * k)); i++) this.spawns.push({ id, from, t: (t += 10 / 12) });
    ctx.events.emit('siegeWave', { phase: 'wave', wave: this.wave });
  }
  spawnBoss() { const ctx = this.ctx, [x, y] = this.points().rift; this.boss = ctx.monsters.spawnCell('gnarlgrim', x, y, { siege: false }); this.boss.awake = true; return this.boss; }
  finish() { const ctx = this.ctx; this.active = false; this.phase = 'done'; ctx.flags.siegeDone = true; ctx.events.emit('siegeWave', { phase: 'done' }); }
  fail(why) { if (this.failed) return; this.failed = true; this.ctx.events.emit('siegeFailed', { why }); }
  serialize() { return { active: this.active, phase: this.phase, wave: this.wave }; }
}
DQ.Siege = Siege;

// ---------------- THE CLOCK ----------------
class Clock {
  constructor(ctx) { this.ctx = ctx; this.day = 1; this.hour = 8; this.total = 0; this.frozen = false; this.region = null; this._night = false; this.rainDays = { 2: [13, 17], 4: [7, 11] }; }
  get isNight() { return this.hour >= 19 || this.hour < 5; }
  get phase() { const h = this.hour; return h >= 5 && h < 7 ? 'dawn' : h >= 7 && h < 17 ? 'day' : h >= 17 && h < 19 ? 'dusk' : 'night'; }
  update(dt) {
    const ctx = this.ctx;
    if (!this.frozen && !DQ.dev.freezeTime) {
      const hrs = dt * 24 / (tun('dayMinutes') * 60);
      this.hour += hrs; this.total += hrs;
      if (this.hour >= 24) { this.hour -= 24; this.day++; }
    }
    const n = this.isNight; if (n !== this._night) { this._night = n; ctx.events.emit('timeOfDay', { night: n, day: this.day }); }
    // temporary blocks (Gnarlgrim's tangles) vanish
    if (ctx.temps) for (let i = ctx.temps.length - 1; i >= 0; i--) { const q = ctx.temps[i]; q.t -= dt; if (q.t <= 0) { if (ctx.world.get(q.x, q.y, q.z) === DQ.blockId('tangle')) { ctx.world.set(q.x, q.y, q.z, 0, { silent: true }); ctx.game.particles.dust((q.x + .5) * T, (q.y + .5) * T, q.z * T, 4); } ctx.temps.splice(i, 1); } }
  }
  set(h) { this.hour = ((h % 24) + 24) % 24; }
  sleep() { if (this.hour >= 19) this.day++; this.hour = 6; this.total += 8; this._night = false; }
  // the light by the hour (and the region: the Fraying is always purple, the Hollow dark until lit)
  applyLight(game, region, extra) {
    const L = game.lights, h = this.hour;
    let amb = h >= 7 && h < 17 ? 1 : h >= 5 && h < 7 ? E.lerp(.3, 1, (h - 5) / 2) : h >= 17 && h < 19 ? E.lerp(1, .3, (h - 17) / 2) : .3;
    let tint = h >= 5 && h < 8 ? [1, .85, .7] : h >= 16 && h < 19 ? [1, .8, .65] : h >= 19 || h < 5 ? [.55, .6, 1] : [1, 1, 1];
    if (region === 'fraying' || region === 'verge' || region === 'rift') { amb = Math.min(amb, .72); tint = [.85, .7, 1]; }
    if (extra !== undefined) amb = Math.min(amb, extra);
    L.enabled = amb < .99; L.ambient = amb;
    const key = tint.join();
    if (this._tk !== key) { this._tk = key; L.dark = tint.map(v => Math.round(v * 40)); try { L.refresh(); } catch (e) { /* older engines */ } }
  }
  weatherFor(region) {
    if (region === 'fraying' || region === 'rift') return { kind: 'ash', amount: .6, wind: .2 };
    const r = this.rainDays[this.day]; if (region === 'glen' && r && this.hour >= r[0] && this.hour < r[1]) return { kind: 'rain', amount: .5, wind: .2 };
    return null;
  }
  serialize() { return { day: this.day, hour: this.hour, total: this.total }; }
  load(d) { this.day = d.day || 1; this.hour = d.hour || 8; this.total = d.total || 0; }
}
DQ.Clock = Clock;
})();
