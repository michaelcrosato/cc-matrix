// Monsters: idle / wander -> notice (!) -> chase -> wind-up (a telegraph) -> attack -> recover; flee, stagger, dizzy,
// dead. Spawned by region tables (day and night) away from the builder and the town; leashed to home; despawned far
// away. In a siege they go for the Banner, then ballistas, then the walls in their way, then residents and builders.
(() => {
const DQ = globalThis.DQ, E = DQ.E, px = E.px, T = 16;
DQ.regionAt = (x, y, ctx) => {
  for (const r of DQ.WORLD.regions) {
    if (r.town) { if (ctx && ctx.town && ctx.town.planted && ctx.town.inside(x, y)) return r; continue; }
    if (r.circle) { if (Math.hypot(x - r.circle[0], y - r.circle[1]) <= r.circle[2]) return r; continue; }
    if (r.box && x >= r.box[0] && y >= r.box[1] && x <= r.box[2] && y <= r.box[3]) return r;
  }
  return DQ.WORLD.regions[DQ.WORLD.regions.length - 1];
};
class Monster {
  constructor(ctx, kind, x, y, L, o = {}) {
    const d = this.def = DQ.MONSTERS[kind]; this.ctx = ctx; this.kind = kind; this.name = d.name; this.uid = ctx.monsters ? ctx.monsters.uid++ : 1;
    const blob = d.body === 'blob', R = blob ? d.R : Math.round(5 * (d.rig.size || 1));
    this.body = new DQ.VoxelBody({ x: x * T + 8, y: y * T + 8, z: L * T, r: Math.min(7, R), h: blob ? 14 : Math.min(30, 26 * (d.rig.size || 1)), gravity: 800, blockDoors: true, fly: !!d.fly });
    this.rig = blob ? new E.Blob({ R: d.R, colors: d.colors, feet: !d.wings, mouth: d.fangs ? 'fangs' : true, wings: !!d.wings, face: 'front' }) : new E.Humanoid(Object.assign({}, d.rig));
    this.maxHp = Math.round(d.hp * DQ.tune('monsterHp')); this.hp = this.maxHp; this.state = 'idle'; this.t = 0; this.home = [x, y, L];
    this.walker = new DQ.Walker(this, { monster: true, breaker: !!o.siege || !!d.breaker && !!o.siege }); this.facing = (DQ.h01(x, y, this.uid) * Math.PI * 2); this.target = null;
    this.flashT = 0; this.dizzy = 0; this.slowK = 1; this.siege = !!o.siege; this.fixed = !!o.fixed; this.farT = 0; this.atk = null; this.move = null; this.dead = false; this.deadT = 0; this.r = this.body.r;
    this.tall = d.tall || 0; this.flyZ = d.fly ? d.fly[0] + DQ.h01(this.uid, 3) * (d.fly[1] - d.fly[0]) : 0; this.noticeT = 0; this.cd = 0; this.wave = o.wave;
    this.bob = 0; this.boss = !!d.boss; this.retarget = 0; this.brkT = 0;
  }
  get x() { return this.body.x; } get y() { return this.body.y; } get z() { return this.body.z; }
  get cx() { return Math.floor(this.x / T); } get cy() { return Math.floor(this.y / T); } get L() { return Math.floor((this.z + 1) / T); }
  get speed() { return this.def.speed * DQ.tune('monsterSpeed') * this.slowK * (this.dizzy > 0 ? 0 : 1); }
  /** who to go for */
  pickTarget() {
    const ctx = this.ctx, aggro = DQ.tune('aggro') * (this.def.aggro / 8) * T;
    if (this.siege) {
      const ban = ctx.town && ctx.town.banner;
      const balls = ctx.objects.list.filter(o => o.def.ballista && !o.data.broken && !o.gone);
      const nearB = (ctx.builders || []).filter(b => !b.ko && !b.hidden && Math.hypot(b.x - this.x, b.y - this.y) < 3 * T)[0];
      if (nearB) return { kind: 'builder', ent: nearB };
      if (this.kind === 'knotbrute' && balls.length) { let best = balls[0], bd = 1e9; for (const o of balls) { const dd = DQ.d2(o.x * T, o.y * T, this.x, this.y); if (dd < bd) { bd = dd; best = o; } } if (bd < (8 * T) ** 2) return { kind: 'obj', ent: best }; }
      if (ban && !ban.gone && ban.hp > 0) return { kind: 'obj', ent: ban };
      const res = ctx.npcs ? ctx.npcs.list.filter(n => n.faint <= 0 && !n.hidden) : []; if (res.length) return { kind: 'npc', ent: res[0] };
    }
    let best = null, bd = aggro * aggro;
    for (const b of ctx.builders || []) { if (b.ko || b.hidden || b.mounted && !this.siege || ctx.dev.invisible && b.local) continue; const dd = DQ.d2(b.x, b.y, this.x, this.y); if (dd < bd && Math.abs(b.z - this.z) < 5 * T) { bd = dd; best = b; } }
    if (best && !this.siege && !this.def.fly) { const eye = [this.x, this.y, this.z + 10], ch = [best.x, best.y, best.z + 16]; if (!ctx.world.sight(eye, ch) && bd > (2.5 * T) ** 2) best = null; }
    if (!best && this.ctx.npcs && this.ctx.town && this.ctx.town.planted) for (const n of this.ctx.npcs.list) { if (n.faint > 0 || n.hidden || n.sleeping && !this.siege) continue; const dd = DQ.d2(n.x, n.y, this.x, this.y); if (dd < (4 * T) ** 2 && dd < bd) { bd = dd; best = n; } }
    return best ? { kind: best.isBuilder ? 'builder' : 'npc', ent: best } : null;
  }
  tpos(t) { const e = t.ent; return t.kind === 'obj' ? [e.x * T + 8, e.y * T + 8, e.z * T] : [e.x, e.y, e.z]; }
  update(dt) {
    const ctx = this.ctx, b = this.body, d = this.def;
    this.flashT = Math.max(0, this.flashT - dt); this.cd = Math.max(0, this.cd - dt); this.dizzy = Math.max(0, this.dizzy - dt); this.noticeT = Math.max(0, this.noticeT - dt);
    if (this.dead) { this.deadT += dt; return; }
    if (this.brain) { this.brain.update(dt); this.hurtT = Math.max(0, (this.hurtT || 0) - dt); b.update(dt, ctx.world); if (b.fell) { b.toSafe(); } this.slowK = 1; return; }
    if (this.hurtT > 0) { this.hurtT -= dt; b.update(dt, ctx.world); this.slowK = 1; this.rigUpdate(dt); return; }
    this.retarget -= dt; if (this.retarget <= 0 || !this.target || (this.target.ent && (this.target.ent.ko || this.target.ent.gone || this.target.ent.dead))) { this.retarget = .5; const was = this.target; this.target = this.pickTarget(); if (!was && this.target && this.state !== 'notice') { this.state = 'notice'; this.t = 0; this.noticeT = .5; DQ.sfx(d.voice || 'squeakHi', { vol: .35 }); } }
    let vx = 0, vy = 0;
    const sp = this.speed;
    if (this.move) { this.doMove(dt); }
    else if (this.state === 'notice') { this.t += dt; if (this.t > .3) this.state = this.target ? 'chase' : 'idle'; }
    else if (this.target) {
      const [tx, ty, tz] = this.tpos(this.target), dx = tx - this.x, dy = ty - this.y, dist = Math.hypot(dx, dy);
      if (!this.siege && Math.hypot(this.x - (this.home[0] * T + 8), this.y - (this.home[1] * T + 8)) > 24 * T && !this.fixed) { this.target = null; this.state = 'return'; }
      else {
        this.state = 'chase'; this.facing = Math.atan2(dy, dx);
        if (d.flee && this.hp < this.maxHp * d.flee && this.kind === 'lintling') { vx = -dx / (dist || 1) * sp * 1.1; vy = -dy / (dist || 1) * sp * 1.1; this.state = 'flee'; }
        else if (this.cd <= 0 && this.inRange(dist, tz)) this.startMove(dist);
        else if (d.fly) { vx = dx / (dist || 1) * sp; vy = dy / (dist || 1) * sp; if (dist < 30) { vx = Math.cos(DQ.game.time * 2 + this.uid) * sp; vy = Math.sin(DQ.game.time * 2 + this.uid) * sp; } }
        else {
          const direct = dist < 3 * T && Math.abs(tz - this.z) < 10;
          if (direct) { vx = dx / (dist || 1) * sp; vy = dy / (dist || 1) * sp; }
          else {
            const gl = [Math.floor(tx / T), Math.floor(ty / T), Math.floor((tz + 1) / T)];
            if (!this.walker.goal || Math.abs(this.walker.goal.x - gl[0]) + Math.abs(this.walker.goal.y - gl[1]) > 1) this.walker.to(gl[0], gl[1], gl[2], { radius: 1, monster: true, breaker: this.siege });
            const st = this.walker.steer(dt, sp); vx = st.vx; vy = st.vy; if (st.hop && b.onGround) b.jump(200);
            if (st.brk) this.breakWall(dt, st.brk);
          }
        }
      }
    } else if (this.state === 'return') {
      const st = this.walker.goal ? this.walker.steer(dt, sp) : (this.walker.to(this.home[0], this.home[1], this.home[2]), this.walker.steer(dt, sp)); vx = st.vx; vy = st.vy; if (st.arrived) this.state = 'idle';
    } else {   // wander near home
      this.t -= dt; if (this.t <= 0) { this.t = 2 + DQ.h01(this.uid, Math.floor(DQ.game.time)) * 3; this.wdir = DQ.h01(Math.floor(DQ.game.time), this.uid) < .4 ? null : DQ.h01(this.uid, Math.floor(DQ.game.time * 3)) * Math.PI * 2; }
      if (this.wdir !== null && this.wdir !== undefined) { vx = Math.cos(this.wdir) * sp * .4; vy = Math.sin(this.wdir) * sp * .4; this.facing = this.wdir; }
    }
    if (!this.move) { const k = Math.exp(-10 * dt); b.vx = vx || b.vx * k; b.vy = vy || b.vy * k; }
    // fliers hold their height over the ground
    if (d.fly) { const g = ctx.world.groundAt(b.x, b.y, b.r, b.z + 40, 40); const want = (isFinite(g) ? g : b.z) + (this.move && this.move.name === 'swoop' && this.move.phase === 'active' ? 6 : this.flyZ); b.vz = (want - b.z) * 4; }
    b.update(dt, ctx.world);
    if (b.fell && !d.fly) { this.dead = true; this.deadT = 1; ctx.events.emit('monsterGone', { m: this }); }
    this.slowK = 1;
    this.rigUpdate(dt);
  }
  inRange(dist, tz) {
    const mv = this.def.moves; if (!mv) return false;
    for (const k in mv) if (dist <= mv[k].range + (this.target && this.target.kind === 'obj' ? 8 : 0) && (Math.abs(tz - this.z) < 24 || this.def.fly)) return true;
    return false;
  }
  startMove(dist) {
    const mv = this.def.moves; let name = Object.keys(mv)[0];
    if (this.kind === 'frayedKnight') { const around = (this.ctx.builders || []).concat(this.ctx.npcs ? this.ctx.npcs.list : []).filter(a => Math.hypot(a.x - this.x, a.y - this.y) < 30).length; name = around >= 2 && DQ.h01(this.uid, Math.floor(DQ.game.time)) < .5 ? 'spin' : 'thrust'; }
    if (this.kind === 'knotbrute') name = dist > 40 ? 'charge' : 'haymaker';
    if (mv[name].range < dist - 8) return;
    const m = mv[name]; this.move = { name, spec: m, phase: 'wind', t: 0, dir: this.facing, hit: false };
    if (m.move) { this.atk = new E.Attack(m.move, { wind: m.wind }); this.atk.start(); }
    DQ.sfx('windup_' + (this.def.body === 'blob' ? 'blob' : 'heavy'), { vol: .3 });
  }
  doMove(dt) {
    const mv = this.move, m = mv.spec, b = this.body, ctx = this.ctx; mv.t += dt;
    const tgt = this.target, [tx, ty] = tgt ? this.tpos(tgt) : [this.x + Math.cos(mv.dir) * 20, this.y + Math.sin(mv.dir) * 20];
    if (mv.phase === 'wind') {
      b.vx *= .8; b.vy *= .8;
      if (mv.t >= m.wind) { mv.phase = 'active'; mv.t = 0; mv.dir = Math.atan2(ty - this.y, tx - this.x); this.facing = mv.dir;
        if (mv.name === 'lunge') { b.vx = Math.cos(mv.dir) * (m.leap + 60); b.vy = Math.sin(mv.dir) * (m.leap + 60); if (b.onGround) b.jump(140); DQ.sfx('boing', { vol: .3 }); }
        if (mv.name === 'swoop') DQ.sfx('flutter', { vol: .4 });
        if (mv.name === 'roll' || mv.name === 'charge') DQ.sfx('rollStart', { vol: .4 }); }
    } else if (mv.phase === 'active') {
      let done = false;
      if (mv.name === 'lunge') { if (mv.t > .45 || (b.onGround && mv.t > .1)) done = true; }
      else if (mv.name === 'swoop') { b.vx = Math.cos(mv.dir) * m.dive; b.vy = Math.sin(mv.dir) * m.dive; if (mv.t > .5) done = true; }
      else if (mv.name === 'roll' || mv.name === 'charge') {
        const s = m.speed * DQ.tune('monsterSpeed'); b.vx = Math.cos(mv.dir) * s; b.vy = Math.sin(mv.dir) * s;
        if (mv.name === 'charge' && this.siege) this.smashAhead(mv.dir);
        if (b.hitWall && mv.t > .1) { done = true; if (m.dizzy) { this.dizzy = m.dizzy; DQ.sfx('bonk', { vol: .4 }); } }
        if (mv.t > m.time) done = true;
      } else { if (this.atk) { this.atk.update(dt); } if (mv.t > .25) done = true; }
      // contact
      if (!mv.hit) for (const a of this.victims()) {
        const reach = (m.move ? 24 : (this.body.r + (a.r || 5) + 4)) + (this.def.body === 'humanoid' ? 4 : 0);
        if (Math.hypot(a.x - this.x, a.y - this.y) < reach && Math.abs(a.z - this.z) < 20 + this.tall && (!m.move || E.inArc(this, this.facing, a, reach, m.move === 'spin' ? Math.PI : .9))) { mv.hit = true; this.hitVictim(a, m.dmg || 1); break; }
      }
      if (!mv.hit && this.target && this.target.kind === 'obj' && Math.hypot(tx - this.x, ty - this.y) < 26) { mv.hit = true; ctx.objects.damage(this.target.ent, Math.round(this.def.atk * DQ.tune('monsterDmg')), this); }
      if (done) { mv.phase = 'recover'; mv.t = 0; }
    } else { b.vx *= .85; b.vy *= .85; if (mv.t > .35) { this.move = null; this.atk = null; this.cd = .7 + DQ.h01(this.uid, Math.floor(DQ.game.time)) * .6; } }
  }
  victims() { return [].concat((this.ctx.builders || []).filter(b => !b.ko), this.ctx.npcs ? this.ctx.npcs.list.filter(n => n.faint <= 0) : []); }
  hitVictim(a, mult) {
    const dmg = Math.max(1, Math.round(this.def.atk * mult * DQ.tune('monsterDmg') * (.9 + DQ.h01(this.uid, Math.floor(DQ.game.time * 10)) * .2)));
    if (a.isBuilder) a.hurt(dmg, this); else a.hurt(Math.ceil(dmg / 2), this);
    DQ.sfx('monsterHit', { vol: .4 });
  }
  /** a siege monster chews through the wall block in its way */
  breakWall(dt, cell) {
    this.brkT -= dt; if (this.brkT > 0) return; this.brkT = 1;
    const w = this.ctx.world, [x, y, L] = cell;
    for (const z of [L, L + 1]) { const id = w.get(x, y, z); if (!DQ.SOLID[id]) continue; const bd = DQ.BLOCKS[id]; if (bd.tier >= 99) continue;
      this.facing = Math.atan2(y * T + 8 - this.y, x * T + 8 - this.x); this.rig.kick && this.rig.kick(.3);
      const r = w.damage(x, y, z, this.def.blockDmg, DQ.game.time); DQ.sfx('hitHard', { vol: .3 }); DQ.game.particles.bits(x * T + 8, y * T + 8, z * T + 8, 4, ['#8a7a6a', '#c8b8a8']);
      if (r.broke) { w.set(x, y, z, 0, { by: this }); DQ.sfx('crumble', { vol: .5 }); this.walker.repath = 0; }
      return; }
    const ob = w.objIdx.get(w.idx(x, y, L)); if (ob && ob.def.door) { this.ctx.objects.damage(ob, this.def.blockDmg, this); if (ob.gone) this.walker.repath = 0; }
  }
  smashAhead(dir) {
    const w = this.ctx.world, x = Math.floor((this.x + Math.cos(dir) * 12) / T), y = Math.floor((this.y + Math.sin(dir) * 12) / T), L = this.L;
    for (const z of [L, L + 1]) { const id = w.get(x, y, z); if (DQ.SOLID[id] && DQ.BLOCKS[id].tier < 99 && !(x === this.cx && y === this.cy)) { const r = w.damage(x, y, z, this.def.blockDmg, DQ.game.time); if (r.broke) { w.set(x, y, z, 0, { by: this }); DQ.game.particles.bits(x * T + 8, y * T + 8, z * T + 8, 8, ['#8a7a6a', '#c8b8a8']); DQ.sfx('crumble', { vol: .5 }); } } }
  }
  rigUpdate(dt) {
    const b = this.body, mv = this.move, t = DQ.game.time;
    if (this.def.body === 'blob') {
      let sq = Math.hypot(b.vx, b.vy) > 5 ? Math.sin(t * 14 + this.uid) * .2 : Math.sin(t * 3 + this.uid) * .05;
      if (mv && mv.phase === 'wind') sq = -.35 + Math.sin(mv.t * 50) * .05; if (mv && mv.phase === 'active' && mv.name === 'lunge') sq = .3;
      if (this.kind === 'pinhog' && mv && mv.name === 'roll' && mv.phase !== 'recover') sq = -.4;
      this.rig.update(dt, { squash: sq, look: [Math.cos(this.facing), Math.sin(this.facing)], walk: Math.min(1, Math.hypot(b.vx, b.vy) / 40), flap: this.def.wings ? 1 : 0, squint: this.dizzy > 0 ? 1 : 0 });
      this.bob = this.def.fly ? 0 : (Math.hypot(b.vx, b.vy) > 5 ? Math.abs(Math.sin(t * 7 + this.uid)) * 3 : 0);
    } else {
      const attack = this.atk ? this.atk.state : (mv && mv.phase === 'wind' && mv.name === 'charge' ? null : null);
      const pose = this.dizzy > 0 ? 'kneel' : mv && mv.name === 'charge' && mv.phase === 'wind' ? 'crouch' : undefined;
      this.rig.update(dt, { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, facing: this.facing, air: !b.onGround, attack, pose, stance: this.kind === 'frayedKnight' ? 'ready' : undefined, hurt: this.flashT > 0 ? 1 : 0, expr: this.flashT > 0 ? 'wince' : 'angry', lean: mv && mv.name === 'charge' && mv.phase === 'active' ? .5 : 0 });
    }
  }
  draw(r) {
    const b = this.body, G = DQ.game; if (this.dead) return;
    r.shadow(b.x, b.y, this.body.r, .45, '#000', Math.max(0, b.groundZ));
    const mv = this.move, tele = mv && mv.phase === 'wind';
    r.actor(b.x, b.y, b.z + this.bob, (g, ox, oy) => {
      this.rig.draw(g, ox, oy, r.view);
      if (this.def.pins) DQ.Hud.pins(g, ox, oy, this.rig, mv && mv.name === 'roll' && mv.phase !== 'recover', G.time);
      if (this.def.body === 'blob' && !this.def.wings) DQ.Hud.fuzz(g, ox, oy, this.def.R, this.def.colors.lt);
    }, { flash: this.flashT > 0 ? '#ffffff' : tele && Math.floor(mv.t * 20) % 2 ? '#ff6060' : undefined, flashMix: tele ? .45 : .75, pick: this });
    if (this.noticeT > 0) r.queue(b.x, b.y, b.z + 30, g => { const p = r.w(b.x, b.y, b.z + 22 + this.tall + (this.def.body === 'blob' ? 0 : 12)); DQ.Hud.balloon(g, '!', Math.round(p[0]), Math.round(p[1])); }, { bias: .05 });
    if (this.dizzy > 0) r.queue(b.x, b.y, b.z + 30, g => { const p = r.w(b.x, b.y, b.z + 16 + this.tall); for (let i = 0; i < 3; i++) { const a = G.time * 5 + i * 2.1; E.font.text(g, '★', Math.round(p[0] + Math.cos(a) * 6) - 3, Math.round(p[1] + Math.sin(a) * 2) - 3, '#ffe070', { outline: '#3a2a10' }); } }, { bias: .05 });
    if (this.hp < this.maxHp && !this.boss) r.queue(b.x, b.y, b.z + 30, g => { const p = r.w(b.x, b.y, b.z + 18 + this.tall + (this.def.body === 'blob' ? 0 : 10)), x = Math.round(p[0]) - 8, y = Math.round(p[1]) - 6; px.rect(g, x - 1, y - 1, 18, 4, '#140c1c'); px.rect(g, x, y, Math.round(16 * this.hp / this.maxHp), 2, '#ff5a5a'); }, { bias: .04 });
  }
}
DQ.Monster = Monster;

class Monsters {
  constructor(ctx) { this.ctx = ctx; this.list = []; this.uid = 1; this.spawnT = 3; this.enabled = true; }
  spawn(kind, x, y, L, o = {}) {
    const w = this.ctx.world; if (L === undefined) L = w.topZ(x, y);
    const nav = this.ctx.nav; if (nav && !nav.standable(x, y, L)) { const p = this.near(x, y, L); if (p) [x, y, L] = p; }
    const m = new Monster(this.ctx, kind, x, y, L, o); this.list.push(m); return m;
  }
  near(x, y, L) { const nav = this.ctx.nav; for (let r = 1; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const X = x + dx, Y = y + dy, t = this.ctx.world.topZ(X, Y); if (t && nav.standable(X, Y, t)) return [X, Y, t]; } return null; }
  kill(m, by) {
    if (m.dead) return; m.dead = true; m.deadT = 0; const G = DQ.game, ctx = this.ctx;
    G.particles.explosion ? G.particles.bits(m.x, m.y, m.z + 8, 14, m.def.colors ? [m.def.colors.base, m.def.colors.lt, m.def.colors.dk] : ['#e8dcc0', '#2a2a48', '#b070ff']) : 0;
    G.particles.smoke(m.x, m.y, m.z + 6, 4, { color: '#d8d0e8' }); DQ.sfx('monsterDie', { vol: .5 });
    if (m.def.drops && !(ctx.net && ctx.net.client)) DQ.dropsFor(ctx, m.def.drops, m.x, m.y, m.z + 8, by);
    ctx.stats.killed++; ctx.events.emit('monsterKilled', { kind: m.kind, m, by });
  }
  update(dt) {
    const ctx = this.ctx;
    for (const m of this.list) m.update(dt);
    for (let i = this.list.length - 1; i >= 0; i--) if (this.list[i].dead && this.list[i].deadT > .5) this.list.splice(i, 1);
    // despawn: far from every builder for 20 s
    for (const m of this.list) { if (m.siege || m.fixed || m.boss) continue; const near = (ctx.builders || []).some(b => Math.hypot(b.x - m.x, b.y - m.y) < 40 * T); m.farT = near ? 0 : m.farT + dt; if (m.farT > 20) m.dead = true, m.deadT = 1; }
    if (!this.enabled || ctx.mode !== 'story' || ctx.modal || (ctx.siege && ctx.siege.active)) return;
    this.spawnT -= dt; if (this.spawnT > 0) return;
    const night = ctx.clock && ctx.clock.isNight; this.spawnT = night ? DQ.tune('spawnNight') : DQ.tune('spawnDay');
    if (this.list.filter(m => !m.siege && !m.fixed && !m.dead).length >= DQ.tune('maxMonsters')) return;
    const b = ctx.builder; if (!b) return; this.trySpawn(b, night);
  }
  trySpawn(b, night) {
    const ctx = this.ctx, w = ctx.world, R = this.R || (this.R = DQ.rng('spawn', ctx.seed));
    for (let tries = 0; tries < 12; tries++) {
      const a = R() * Math.PI * 2, d = 11 + R() * 14, x = Math.floor(b.cx + Math.cos(a) * d), y = Math.floor(b.cy + Math.sin(a) * d);
      if (!w.inside(x, y, 0)) continue; const L = w.topZ(x, y); if (L < 2) continue;
      if (ctx.town && ctx.town.planted && ctx.town.inside(x, y, 3)) continue;
      if (ctx.rooms && ctx.rooms.roomAt(x, y, L)) continue;
      if (!ctx.nav.standable(x, y, L)) continue;
      const reg = DQ.regionAt(x, y, ctx), table = night ? reg.night : reg.day; if (!table || !table.length) continue;
      let r = R(), kind = table[0][0]; for (const [k, p] of table) { if (r < p) { kind = k; break; } r -= p; }
      if (DQ.MONSTERS[kind].night && !night) continue;
      this.spawn(kind, x, y, L); return true;
    }
    return false;
  }
  draw(r) { for (const m of this.list) m.draw(r); }
  clear(filter) { for (const m of this.list) if (!filter || filter(m)) m.dead = true, m.deadT = 1; }
}
DQ.Monsters = Monsters;
})();
