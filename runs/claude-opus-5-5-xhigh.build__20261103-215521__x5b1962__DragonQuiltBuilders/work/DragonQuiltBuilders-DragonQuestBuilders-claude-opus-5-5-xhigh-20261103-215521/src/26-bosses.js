// The bosses. Sir Buttonsworth (the Button Quarry): Slam (a ring to jump over), Button Volley, Stomp Charge (dizzy after
// a wall: double damage), Lintlings at half health. Gnarlgrim the Knotted (the siege's end): wound too tight to hurt until
// manned Ballistas Tangle him; then strike his Heart Knot. Three phases: Yarn Slam and Tangle Toss, then Charge and
// summons, then everything faster.
(() => {
const DQ = globalThis.DQ, E = DQ.E, px = E.px, T = 16;
class Bosses {
  constructor(ctx) { this.ctx = ctx; this.list = []; }
  active() { return this.list.find(m => !m.dead && m.awake) || null; }
  rigOf(who) { const m = this.list.find(b => (who === 'gnarlgrim' && b.kind === 'gnarlgrim') || (who === 'buttonsworth' && b.kind === 'buttonGolem')); return m ? m.rig : null; }
  /** Sir Buttonsworth sleeps in a heap on the Quarry floor until M11 sends you there */
  placeButtonsworth() { if (this.list.some(m => m.kind === 'buttonGolem') || this.ctx.flags.boss_buttonGolem) return null; const m = this.ctx.monsters.spawn('buttonGolem', 22, 18, 6, { fixed: true }); m.brain = new ButtonBrain(m); m.awake = false; m.phases = 2; this.list.push(m); return m; }
  wakeButtonsworth() { let m = this.list.find(b => b.kind === 'buttonGolem' && !b.dead) || this.placeButtonsworth(); if (!m || m.awake || m.waking) return; m.waking = true; DQ.Cutscenes.play(this.ctx, 'buttonsworthIntro', { m }); }
  spawnGnarlgrim(o = {}) {
    const ctx = this.ctx, t = ctx.town, x = o.x || 93, y = o.y || 80;
    const m = ctx.monsters.spawn('gnarlgrim', x, y, undefined, { siege: true }); m.brain = new GnarlBrain(m); m.awake = true; m.phases = 3; this.list.push(m);
    if (o.hp) m.hp = o.hp; DQ.AudioX && DQ.AudioX.music('boss');
    return m;
  }
  update(dt) { for (let i = this.list.length - 1; i >= 0; i--) if (this.list[i].dead && this.list[i].deadT > 2) this.list.splice(i, 1); }
}
DQ.Bosses = Bosses;

const victims = m => (m.ctx.builders || []).filter(b => !b.ko);
const nearestBuilder = m => { let best = null, bd = 1e9; for (const b of victims(m)) { const d = DQ.d2(b.x, b.y, m.x, m.y); if (d < bd) { bd = d; best = b; } } return best; };
/** a shockwave ring on the ground: hurts walkers it passes under (jump over it) */
function ring(m, R, dmg, dur = .5) {
  const ctx = m.ctx, s = { x: m.x, y: m.y, z: m.groundZ(), r: 0, R: R * T, t: 0, dur, dmg, hit: new Set() };
  (ctx.rings || (ctx.rings = [])).push(s); DQ.game.shake(4); DQ.sfx('slam', { vol: .7 }); DQ.game.particles.ring(s.x, s.y, 4, s.R, '#f1e6c8', dur, s.z + 1);
  if (DQ.game.input.lastDevice === 'gamepad') DQ.game.input.rumble(.8, .2);
}
DQ.updateRings = (ctx, dt) => {
  const L = ctx.rings || []; for (let i = L.length - 1; i >= 0; i--) {
    const s = L[i]; s.t += dt; s.r = s.R * Math.min(1, s.t / s.dur);
    for (const b of (ctx.builders || [])) { if (b.ko || s.hit.has(b)) continue; const d = Math.hypot(b.x - s.x, b.y - s.y); if (Math.abs(d - s.r) < 8 && b.z < s.z + 6) { s.hit.add(b); b.hurt(s.dmg, { x: s.x, y: s.y }, { kb: 140 }); } }
    if (s.t > s.dur + .1) L.splice(i, 1);
  }
};
DQ.drawRings = (ctx, r) => { for (const s of ctx.rings || []) r.decal(() => { r.groundRing(s.x, s.y, Math.max(1, s.r), '#fff0c0', 1, s.z + 1); r.groundRing(s.x, s.y, Math.max(1, s.r - 2), '#c8a878', .8, s.z + 1); }); };
// a Monster helper
DQ.Monster.prototype.groundZ = function () { return this.body.groundZ > -1e9 ? this.body.groundZ : this.z; };

// ================================================================ Sir Buttonsworth
class ButtonBrain {
  constructor(m) { this.m = m; this.t = 2; this.move = null; this.summoned = false; m.onHit = (dmg, b) => (m.dizzy > 0 ? dmg * 2 : dmg); m.onDeath = by => this.die(by); }
  update(dt) {
    const m = this.m, b = m.body; if (!m.awake) { b.vx = b.vy = 0; m.rig.update(dt, { x: b.x, y: b.y, z: b.z, vx: 0, vy: 0, facing: Math.PI / 2, down: .9 }); return; }
    const tgt = nearestBuilder(m); m.dizzy = Math.max(0, m.dizzy - 0);
    if (!this.summoned && m.hp < m.maxHp * .5) { this.summoned = true; for (let i = 0; i < 3; i++) m.ctx.monsters.spawn('lintling', 19 + i * 3, 14, 6, { fixed: true }); m.ctx.say('buttonsworth', ['To me, my fluffy footmen!'], { auto: 1.6, modal: false }); }
    const mv = this.move; let attack = null, pose, lean = 0;
    if (m.dizzy > 0) { b.vx *= .9; b.vy *= .9; pose = 'kneel'; }
    else if (!mv) {
      this.t -= dt;
      if (tgt) { const d = Math.hypot(tgt.x - m.x, tgt.y - m.y); m.facing = E.approachAng(m.facing, Math.atan2(tgt.y - m.y, tgt.x - m.x), dt * 3); const sp = 30 * DQ.tune('monsterSpeed'); if (d > 40) { b.vx = Math.cos(m.facing) * sp; b.vy = Math.sin(m.facing) * sp; } else { b.vx *= .8; b.vy *= .8; }
        if (this.t <= 0) { const r = DQ.h01(Math.floor(DQ.game.time * 10), 7), kind = d < 50 && r < .45 ? 'slam' : r < .75 ? 'volley' : 'charge'; this.move = { kind, t: 0, wind: kind === 'slam' ? .6 : kind === 'volley' ? .4 : .7, fired: false }; DQ.sfx('windup_heavy', { vol: .5 }); } }
    } else {
      mv.t += dt; b.vx *= .85; b.vy *= .85;
      if (mv.t < mv.wind) { pose = mv.kind === 'charge' ? 'crouch' : undefined; attack = E.move(mv.kind === 'volley' ? 'throw' : 'haymaker', mv.t / mv.wind, 'wind'); }
      else if (!mv.fired) {
        mv.fired = true;
        if (mv.kind === 'slam') ring(m, 3, Math.round(12 * DQ.tune('monsterDmg')), .5);
        if (mv.kind === 'volley' && tgt) { const a0 = Math.atan2(tgt.y - m.y, tgt.x - m.x); for (let i = -2; i <= 2; i++) { const a = a0 + i * .22; m.ctx.combat.hostile({ kind: 'button', x: m.x + Math.cos(a) * 12, y: m.y + Math.sin(a) * 12, z: m.z + 18, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, dmg: Math.round(8 * DQ.tune('monsterDmg')), life: 2.5 }); } DQ.sfx('throw', { vol: .5 }); }
        if (mv.kind === 'charge' && tgt) { mv.dir = Math.atan2(tgt.y - m.y, tgt.x - m.x); mv.ct = 0; DQ.sfx('rollStart'); }
      } else if (mv.kind === 'charge') {
        mv.ct += dt; lean = .5; const s = 140 * DQ.tune('monsterSpeed'); b.vx = Math.cos(mv.dir) * s; b.vy = Math.sin(mv.dir) * s; m.facing = mv.dir; m.smashAhead(mv.dir);
        for (const v of victims(m)) if (Math.hypot(v.x - m.x, v.y - m.y) < 20 && !mv.hit) { mv.hit = true; v.hurt(Math.round(m.def.atk * DQ.tune('monsterDmg')), m, { kb: 180 }); }
        if ((b.hitWall && mv.ct > .15) || mv.ct > 1.6) { if (b.hitWall) { m.dizzy = 2; DQ.sfx('bonk'); DQ.game.shake(5); DQ.game.particles.bits(m.x, m.y, m.z + 30, 10, ['#c8a878', '#5a4010']); } this.move = null; this.t = 1.4; }
      } else if (mv.t > mv.wind + .5) { this.move = null; this.t = 1.6 + DQ.h01(Math.floor(DQ.game.time), 3); }
    }
    m.rig.update(dt, { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, facing: m.facing, attack, pose, lean, expr: m.flashT > 0 ? 'wince' : 'angry', hurt: m.flashT > 0 ? 1 : 0 });
  }
  die(by) {
    const m = this.m, ctx = m.ctx; m.dead = true; m.deadT = 0;
    for (let i = 0; i < 40; i++) DQ.game.particles.add({ kind: 'bit', x: m.x, y: m.y, z: m.z + 20, vx: (Math.random() - .5) * 200, vy: (Math.random() - .5) * 200, vz: 100 + Math.random() * 160, g: 420, bounce: .5, max: 1.6, size: 2, color: ['#c8a878', '#e8c040', '#5a4010'][i % 3] });
    DQ.sfx('explode'); DQ.game.shake(6); ctx.say('buttonsworth', DQ.LINES.buttonsworthDown, { auto: 2, modal: false });
    ctx.drops.spawn('goldenNeedle', 1, m.x, m.y, m.z + 16); ctx.drops.spawn('steelThread', 3, m.x, m.y, m.z + 16);
    ctx.flags.boss_buttonGolem = true; ctx.events.emit('bossDefeated', { id: 'buttonGolem' }); ctx.events.emit('flag', { k: 'boss_buttonGolem' }); ctx.stats.killed++;
    DQ.AudioX && DQ.AudioX.jingle('victory'); DQ.AudioX && DQ.AudioX.music(null, { region: true });
  }
}
// ================================================================ Gnarlgrim the Knotted
class GnarlBrain {
  constructor(m) {
    this.m = m; this.t = 2.5; this.move = null; this.phase = 1; this.bolts = []; this.tangled = 0; this.tangleDmg = 0; this.weakHits = 0; this.hinted = false;
    m.tangled = 0; m.tall = 34;
    m.onHit = (dmg, b, o) => this.onHit(dmg, b, o); m.onBolt = (s, dmg) => this.onBolt(s, dmg); m.onDeath = by => this.die(by);
  }
  get speedK() { return this.phase >= 3 ? 1.25 : 1; }
  onBolt(s, dmg) {
    const m = this.m, now = DQ.game.time;
    if (!s.manned) return 4;
    this.bolts.push(now); this.bolts = this.bolts.filter(t => now - t <= DQ.tune('tangleWindow'));
    if (this.bolts.length >= 2 || (this.move && this.move.kind === 'charge' && this.move.fired)) this.tangle();
    return this.tangled > 0 ? dmg : 6;
  }
  tangle() { const m = this.m; if (this.tangled > 0) return; this.tangled = 5; m.tangled = 5; this.tangleDmg = 0; this.move = null; this.bolts = []; DQ.sfx('tangle'); DQ.game.flash('#ffe070', .15, .4); m.ctx.say('granny', DQ.LINES.tangled, { auto: 1.6, modal: false }); m.ctx.events.emit('bossTangled', {}); }
  onHit(dmg, b, o) {
    const m = this.m;
    if (this.tangled <= 0) {
      this.weakHits++; if (this.weakHits >= 3 && !this.hinted) { this.hinted = true; m.ctx.say('mortimer', DQ.LINES.gnarlHint, { auto: 2.6, modal: false }); }
      return Math.max(1, Math.round((b.atk - 25 / 2) * .2));
    }
    const front = Math.abs(E.angDiff(m.facing, Math.atan2(b.y - m.y, b.x - m.x))) < 1.2, ripper = b.equip.weapon === 'seamRipper';
    let d = Math.max(1, Math.round(b.atk * (front ? (ripper ? 4 : 2) : 1.5)));
    this.tangleDmg += d; if (this.tangleDmg >= 100) { this.tangleDmg = -999; m.hurtT = .25; DQ.sfx('stagger'); }
    return d;
  }
  update(dt) {
    const m = this.m, b = m.body, ctx = m.ctx, tgt = nearestBuilder(m);
    // phases at 66% and 33%
    const ph = m.hp > m.maxHp * .66 ? 1 : m.hp > m.maxHp * .33 ? 2 : 3;
    if (ph > this.phase) { this.phase = ph; this.roar(); if (ph === 2) for (let i = 0; i < 4; i++) ctx.monsters.spawn('lintling', m.cx + (i % 2 ? 3 : -3), m.cy + (i < 2 ? 3 : -3), undefined, { siege: true }); if (ph === 3) { ctx.monsters.spawn('knotbrute', m.cx + 4, m.cy, undefined, { siege: true }); DQ.AudioX && DQ.AudioX.layer('fury', 1); } }
    let attack = null, pose, down = 0, lean = 0;
    if (this.tangled > 0) { this.tangled -= dt; m.tangled = this.tangled; b.vx *= .8; b.vy *= .8; down = .6; if (this.tangled <= 0) { this.roar(); m.tangled = 0; this.t = 1.5; } }
    else if (!this.move) {
      this.t -= dt * this.speedK;
      if (tgt) { const d = Math.hypot(tgt.x - m.x, tgt.y - m.y), want = Math.atan2(tgt.y - m.y, tgt.x - m.x); m.facing = E.approachAng(m.facing, want, dt * 2.5); const sp = 34 * DQ.tune('monsterSpeed') * this.speedK; if (d > 50) { b.vx = Math.cos(m.facing) * sp; b.vy = Math.sin(m.facing) * sp; } else { b.vx *= .8; b.vy *= .8; }
        if (this.t <= 0) { const r = DQ.h01(Math.floor(DQ.game.time * 10), 13); let kind = d < 60 && r < .4 ? 'slam' : 'toss'; if (this.phase >= 2 && r > .7) kind = 'charge'; this.move = { kind, t: 0, wind: (kind === 'slam' ? .7 : kind === 'toss' ? .5 : .8) / this.speedK, fired: false }; DQ.sfx('windup_heavy', { vol: .6 }); } }
    } else {
      const mv = this.move; mv.t += dt; b.vx *= .85; b.vy *= .85;
      if (mv.t < mv.wind) { attack = E.move(mv.kind === 'toss' ? 'throw' : 'haymaker', mv.t / mv.wind, 'wind'); if (mv.kind === 'charge') pose = 'crouch'; }
      else if (!mv.fired) {
        mv.fired = true;
        if (mv.kind === 'slam') ring(m, 3.5, Math.round(14 * DQ.tune('monsterDmg')), .55);
        if (mv.kind === 'toss') for (let k = 0; k < (this.phase >= 3 ? 2 : 1); k++) this.toss(tgt, k);
        if (mv.kind === 'charge') { const balls = ctx.objects.list.filter(o => o.def.ballista && !o.data.broken && !o.gone); const aim = balls.length ? balls[0] : tgt; mv.dir = aim ? Math.atan2((aim.y * (aim.def ? T : 1) + (aim.def ? 8 : 0)) - m.y, (aim.x * (aim.def ? T : 1) + (aim.def ? 8 : 0)) - m.x) : m.facing; mv.ct = 0; DQ.sfx('rollStart'); }
      } else if (mv.kind === 'charge') {
        mv.ct += dt; lean = .5; const s = 140 * DQ.tune('monsterSpeed') * this.speedK; b.vx = Math.cos(mv.dir) * s; b.vy = Math.sin(mv.dir) * s; m.facing = mv.dir; m.smashAhead(mv.dir);
        for (const o of ctx.objects.list) if (o.def.ballista && !o.data.broken && Math.hypot(o.x * T + 8 - m.x, o.y * T + 8 - m.y) < 22) ctx.objects.damage(o, 60, m);
        for (const v of victims(m)) if (!mv.hit && Math.hypot(v.x - m.x, v.y - m.y) < 24) { mv.hit = true; v.hurt(Math.round(m.def.atk * DQ.tune('monsterDmg')), m, { kb: 200 }); }
        if ((b.hitWall && mv.ct > .2) || mv.ct > 1.4) { this.move = null; this.t = 1.6; }
      } else if (mv.t > mv.wind + .6) { this.move = null; this.t = 2 + DQ.h01(Math.floor(DQ.game.time), 9); }
    }
    m.rig.update(dt, { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, facing: m.facing, attack, pose, down, lean, expr: this.tangled > 0 ? 'wince' : 'shout', hurt: m.flashT > 0 ? 1 : 0 });
  }
  toss(tgt, k) {
    const m = this.m; if (!tgt) return;
    const tx = tgt.x + (k ? (DQ.h01(k, 3) - .5) * 60 : tgt.vx * .5), ty = tgt.y + (k ? (DQ.h01(3, k) - .5) * 60 : tgt.vy * .5), tz = m.ctx.world.groundAt(tx, ty, 2, tgt.z + 32, 40);
    const a = { x: m.x, y: m.y, z: m.z + 50 }, v = E.arc(a, { x: tx, y: ty, z: isFinite(tz) ? tz : tgt.z }, 300, { time: 1.1 });
    m.ctx.combat.hostile({ kind: 'yarn', x: a.x, y: a.y, z: a.z, vx: v.vx, vy: v.vy, vz: v.vz, g: 300, dmg: Math.round(10 * DQ.tune('monsterDmg')), life: 3, tland: 1.1, target: true, tx, ty, tz: isFinite(tz) ? tz : tgt.z });
    DQ.sfx('throw', { vol: .5 });
  }
  roar() { const m = this.m; DQ.sfx('roar', { vol: .8 }); DQ.game.shake(6); ring(m, 2.5, 6, .4); for (const v of victims(m)) if (Math.hypot(v.x - m.x, v.y - m.y) < 60) E.knockback(m, v.body, 200, 60); }
  die(by) {
    const m = this.m, ctx = m.ctx; m.dead = true; m.deadT = 0;
    for (let i = 0; i < 80; i++) DQ.game.particles.add({ kind: 'spark', x: m.x + (Math.random() - .5) * 30, y: m.y + (Math.random() - .5) * 30, z: m.z + Math.random() * 60, vx: (Math.random() - .5) * 40, vy: (Math.random() - .5) * 40, vz: 20 + Math.random() * 80, g: -10, drag: 1, max: 1.5 + Math.random() * 1.2, color: ['#2a1a3a', '#5a2a6a', '#ff40c0', '#f1e6c8'][i % 4] });
    DQ.sfx('unravelBig'); ctx.say('gnarlgrim', DQ.LINES.gnarlDown, { auto: 2, modal: false });
    ctx.monsters.clear(x => x !== m);
    ctx.flags.boss_gnarlgrim = true; ctx.flags.bossDone = true; ctx.events.emit('bossDefeated', { id: 'gnarlgrim' }); ctx.events.emit('flag', { k: 'boss_gnarlgrim' }); ctx.stats.killed++;
    if (ctx.siege) ctx.siege.end(true);
    if (ctx.town) ctx.town.addCheer(150, 'boss');
  }
}
DQ.ButtonBrain = ButtonBrain; DQ.GnarlBrain = GnarlBrain;
// the bosses' own drawing extras: Gnarlgrim's glowing Heart Knot
DQ.drawBossExtras = (ctx, r) => {
  for (const m of ctx.bosses ? ctx.bosses.list : []) {
    if (m.dead || m.kind !== 'gnarlgrim') continue;
    r.queue(m.x, m.y, m.z + 30, g => { const p = r.w(m.x + Math.cos(m.facing) * 8, m.y + Math.sin(m.facing) * 8, m.z + (m.tangled > 0 ? 22 : 34)), x = Math.round(p[0]), y = Math.round(p[1]), k = m.tangled > 0 ? 1 : .35; px.blend(g, .5 * k, 'add', () => px.disc(g, x, y, 7 + Math.sin(DQ.game.real * 8) * 2, '#ff40c0')); px.disc(g, x, y, 3, m.tangled > 0 ? '#ffb0e8' : '#a03080'); px.dot(g, x - 1, y - 1, '#ffffff'); }, { bias: .02, emissive: true });
  }
};
// cutscenes the bosses need
DQ.CUTSCENES = DQ.CUTSCENES || {};
DQ.CUTSCENES.buttonsworthIntro = {
  *run(ctx, d) {
    const m = d.m; ctx.camFocus = { x: ctx.builder.x, y: ctx.builder.y, z: ctx.builder.z + 14 }; yield DQ.game.tween(ctx.camFocus, { x: m.x, y: m.y, z: m.z + 30 }, 1, { ease: 'inOutSine' });
    for (let i = 0; i < 20; i++) DQ.game.particles.add({ kind: 'bit', x: m.x, y: m.y, z: m.z + 4, vx: (Math.random() - .5) * 80, vy: (Math.random() - .5) * 80, vz: 80 + Math.random() * 80, g: 400, bounce: .4, max: 1, size: 2, color: '#c8a878' });
    DQ.sfx('rumble'); DQ.game.shake(4); yield .6; m.awake = true; m.waking = false; DQ.AudioX && DQ.AudioX.music('miniboss');
    ctx.say('buttonsworth', DQ.LINES.buttonsworth); yield E.until(() => !ctx.talk.open);
  },
  apply(ctx, d) { if (d.m) { d.m.awake = true; d.m.waking = false; } DQ.AudioX && DQ.AudioX.music('miniboss'); }
};
DQ.CUTSCENES.gnarlgrimEnter = {
  *run(ctx) {
    ctx.camFocus = { x: ctx.builder.x, y: ctx.builder.y, z: ctx.builder.z + 14 }; yield DQ.game.tween(ctx.camFocus, { x: 93 * T, y: 80 * T, z: 9 * T + 30 }, 1.2, { ease: 'inOutSine' });
    DQ.sfx('roar'); DQ.game.shake(6); ctx.bosses.spawnGnarlgrim(); yield .8;
    ctx.say('gnarlgrim', DQ.LINES.gnarlgrim); yield E.until(() => !ctx.talk.open);
    yield DQ.game.tween(ctx.camFocus, { x: ctx.builder.x, y: ctx.builder.y, z: ctx.builder.z + 14 }, .8);
  },
  apply(ctx) { if (!ctx.bosses.list.some(m => m.kind === 'gnarlgrim' && !m.dead)) ctx.bosses.spawnGnarlgrim(); }
};
})();
