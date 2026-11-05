// The siege director (the Siege of Thimbleton: a 90 s prep, three waves from the east road, the north path and the
// Rift, breathers between, Gnarlgrim after; fail and retry from a checkpoint), and manning a Bobbin Ballista.
(() => {
const DQ = globalThis.DQ, E = DQ.E, px = E.px, T = 16;
class Siege {
  constructor(ctx, o = {}) { this.ctx = ctx; this.active = false; this.phase = 'none'; this.wave = -1; this.t = 0; this.mons = []; this.o = o; this.waves = o.waves || DQ.SIEGE_WAVES; this.spawns = o.spawns || DQ.SIEGE_SPAWNS; this.queue = []; this.failed = false; }
  get fighting() { return this.active && (this.phase === 'wave' || this.phase === 'boss' || this.phase === 'breather'); }
  label() {
    if (this.phase === 'prep') return 'The Knotted army approaches! ' + DQ.fmtTime(this.t);
    if (this.phase === 'wave') return (this.waves[this.wave] ? this.waves[this.wave].name : 'Wave') + ': ' + this.alive() + ' left';
    if (this.phase === 'breather') return 'Wave cleared! Next wave in ' + DQ.fmtTime(this.t);
    if (this.phase === 'boss') return 'Gnarlgrim attacks!';
    return '';
  }
  alive() { return this.mons.filter(m => !m.dead).length + this.queue.length; }
  begin(o = {}) {
    const ctx = this.ctx; this.active = true; this.failed = false; this.phase = 'prep'; this.t = o.prep === undefined ? 90 : o.prep; this.wave = -1; this.mons = []; this.queue = [];
    if (ctx.town && ctx.town.banner) ctx.town.banner.hp = ctx.town.banner.def.hp;
    if (ctx.save && ctx.mode === 'story') ctx.save.checkpoint('siege');
    DQ.AudioX && DQ.AudioX.music('siege');
    ctx.events.emit('siegeStart', {});
    if (ctx.monsters) ctx.monsters.clear(m => !m.siege && !m.boss);
  }
  /** jump straight to a wave (dev) */
  skipTo(w) { if (!this.active) this.begin({ prep: 0 }); this.ctx.monsters.clear(m => m.siege); this.queue = []; this.wave = w - 1; this.nextWave(); }
  nextWave() {
    this.wave++;
    if (this.wave >= this.waves.length) { this.phase = this.o.bee ? 'done' : 'boss'; this.ctx.flags.siegeDone = true; this.ctx.events.emit('siegeDone', {}); this.ctx.events.emit('flag', { k: 'siegeDone' }); if (this.o.bee) this.end(true); else this.startBoss(); return; }
    const w = this.waves[this.wave], k = DQ.tune('siegeSize') * (this.o.sizeK || 1), R = DQ.rng('siege' + this.wave, this.ctx.seed);
    this.phase = 'wave'; this.spawnT = 0; this.queue = [];
    for (const [kind, n] of w.list) for (let i = 0; i < Math.max(1, Math.round(n * k)); i++) this.queue.push({ kind, from: w.from[Math.floor(R() * w.from.length)], at: R() * 10 });
    this.queue.sort((a, b) => a.at - b.at);
    this.ctx.hud && this.ctx.hud.banner(w.name + '!', 'Defend the Banner!'); DQ.sfx('warHorn');
    this.ctx.events.emit('siegeWave', { wave: this.wave });
  }
  startBoss() { this.phase = 'boss'; const ctx = this.ctx; if (ctx.bosses) DQ.Cutscenes.play(ctx, 'gnarlgrimEnter'); }
  update(dt) {
    if (!this.active) return; const ctx = this.ctx;
    if (this.phase === 'prep') { this.t -= dt; if (this.t <= 0) this.nextWave(); return; }
    if (this.phase === 'wave') {
      this.spawnT += dt;
      while (this.queue.length && this.queue[0].at <= this.spawnT) { const q = this.queue.shift(), p = this.spawns[q.from] || this.spawns.east, m = ctx.monsters.spawn(q.kind, p[0] + Math.round((DQ.h01(this.mons.length, 3) - .5) * 4), p[1] + Math.round((DQ.h01(3, this.mons.length) - .5) * 4), undefined, { siege: true, wave: this.wave }); this.mons.push(m); DQ.game.particles.smoke(m.x, m.y, m.z + 6, 5, { color: '#5a3a6a' }); }
      if (!this.queue.length && this.alive() === 0) { if (this.wave >= this.waves.length - 1) this.nextWave(); else { this.phase = 'breather'; this.t = this.o.breather || 25; ctx.hud && ctx.hud.banner('Wave cleared!', 'Repair your walls!'); DQ.AudioX && DQ.AudioX.jingle('wave'); } }
    } else if (this.phase === 'breather') { this.t -= dt; if (this.t <= 0) this.nextWave(); }
    // the Banner falls
    const ban = ctx.town && ctx.town.banner; if (ban && ban.hp <= 0 && !this.failed && (this.phase === 'wave' || this.phase === 'boss' || this.phase === 'breather')) this.fail('banner');
  }
  fail(reason) {
    if (this.failed) return; this.failed = true; const ctx = this.ctx;
    if (this.o.bee) { this.end(false); return; }
    ctx.say('granny', [reason === 'banner' ? DQ.LINES.bannerDown[0] : DQ.LINES.siegeFail[0]], { choices: ['Try again from the start of the siege', 'Return to title'], onChoice: i => { if (i === 0) { if (ctx.save) ctx.save.restoreCheckpoint('siege'); } else DQ.game.go('title'); } });
  }
  end(won) { this.active = false; this.phase = 'done'; this.ctx.events.emit('siegeEnd', { won }); }
  serialize() { return { active: this.active, phase: this.phase, wave: this.wave }; }
}
DQ.Siege = Siege;

// ---------------------------------------------------------------- manning a Ballista
class BallistaCtl {
  constructor(ctx) { this.ctx = ctx; }
  mount(b, o) {
    if (o.data.broken) return; if (o.data.mountedBy && o.data.mountedBy !== b) return;
    o.data.mountedBy = b; b.mounted = o; o.data.base = o.data.base === undefined ? o.data.aim : o.data.base;
    const a = o.data.aim + Math.PI; b.place3(o.x * T + 8 + Math.cos(a) * 10, o.y * T + 8 + Math.sin(a) * 10, o.z * T); b.facing = o.data.aim;
    DQ.sfx('thunk'); this.ctx.events.emit('ballistaMounted', { obj: o });
  }
  dismount(b) { const o = b.mounted; if (!o) return; o.data.mountedBy = null; b.mounted = null; DQ.sfx('thunk', { vol: .3 }); }
  /** the mounted builder's step: aim within +-60 degrees (stick, keys, mouse), fire, reload, get off */
  update(b, dt, intent) {
    const o = b.mounted; if (!o) return; if (o.gone || o.data.broken) { this.dismount(b); return; }
    const B = o.data, base = B.base, G = DQ.game;
    let want = B.aim;
    if (intent.mouse) { const p = G.input.pointer(); if (p) { const gp = G.view.toGround(p[0] + (DQ.lastIX || 0), p[1] + (DQ.lastIY || 0) - G.view.bz * o.z * T); if (gp) want = Math.atan2(gp[1] - (o.y * T + 8), gp[0] - (o.x * T + 8)); } }
    else if (Math.hypot(intent.move[0], intent.move[1]) > .3) want = Math.atan2(intent.move[1], intent.move[0]);
    if (intent.hotStep) want = B.aim + intent.hotStep * .15;
    let d = E.angDiff(base, want); d = E.clamp(d, -Math.PI / 3, Math.PI / 3); want = base + d;
    // aim assist: the nearest monster in a 12 degree cone
    const ms = this.ctx.monsters.list.concat(this.ctx.bossTargets ? this.ctx.bossTargets() : []); let best = null, ba = .21;
    for (const m of ms) { if (m.dead) continue; const a = Math.atan2(m.y - (o.y * T + 8), m.x - (o.x * T + 8)), dd = Math.abs(E.angDiff(want, a)); if (dd < ba && Math.hypot(m.x - o.x * T, m.y - o.y * T) < 18 * T) { ba = dd; best = a; } }
    if (best !== null && Math.abs(E.angDiff(base, best)) <= Math.PI / 3) want = best;
    B.aim = E.approachAng(B.aim, want, dt * 4);
    b.facing = B.aim; const ba2 = B.aim + Math.PI; b.body.x = o.x * T + 8 + Math.cos(ba2) * 10; b.body.y = o.y * T + 8 + Math.sin(ba2) * 10;
    if (intent.swing && B.reload <= 0) { this.ctx.combat.fireBolt(o, B.aim, { dmg: 30, by: b }); B.reload = DQ.tune('ballistaReload'); B.crank = DQ.tune('ballistaReload'); DQ.sfx('ballistaReload', { vol: .4, delay: .3 }); }
    if (intent.interact) this.dismount(b);
  }
}
DQ.BallistaCtl = BallistaCtl;
})();
