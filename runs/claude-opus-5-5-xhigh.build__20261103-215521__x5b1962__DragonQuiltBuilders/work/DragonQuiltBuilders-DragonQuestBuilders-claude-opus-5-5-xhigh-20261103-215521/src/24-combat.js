// Combat: the damage formula, hit feedback, projectiles (ballista bolts, pebbles, pies, a boss's buttons and yarn balls
// that leave Tangle blocks), and Drops: item entities that bounce out, bob, spin, then fly to a builder nearby.
(() => {
const DQ = globalThis.DQ, E = DQ.E, px = E.px, T = 16;
class Combat {
  constructor(ctx) { this.ctx = ctx; this.shots = []; this.tangles = []; this.R = DQ.rng('combat', ctx.seed); }
  roll() { return .9 + this.R() * .2; }
  /** a builder's swing or spin lands on a monster */
  builderHits(b, m, o = {}) {
    if (m.dead) return;
    let dmg = Math.max(1, Math.round((b.atk - m.def.def / 2) * this.roll())), crit = false;
    if (!o.spin && this.R() < .05) { dmg = Math.round(dmg * 1.5); crit = true; }
    if (o.mult) dmg = Math.round(dmg * o.mult);
    if (this.ctx.dev.oneHit || b.cheatOneHit) dmg = 9999;
    if (m.onHit) dmg = m.onHit(dmg, b, o);
    if (this.ctx.net && this.ctx.net.client) { DQ.game.hitFx(m.x, m.y, m.z + 10, { power: 1, damage: dmg, sound: 'hit' }); m.flashT = .15; this.ctx.net.sendOp(['hit', m.uid, dmg]); b.combat = 3; return; }
    this.damageMonster(m, dmg, b, { kb: o.kb || (m.boss ? 20 : 120), crit, power: o.spin ? 1.4 : crit ? 1.6 : 1 });
    b.combat = 3;
  }
  /** damage any monster (traps, residents, bolts): flash, number, knockback, stagger, death */
  damageMonster(m, dmg, from, o = {}) {
    if (m.dead || dmg <= 0) return 0;
    m.hp -= dmg; m.flashT = .15; const G = DQ.game;
    G.hitFx(m.x, m.y, m.z + 10, { power: o.power || (dmg >= 20 ? 1.5 : 1), damage: dmg, angle: from ? Math.atan2(m.y - from.y, m.x - from.x) : undefined, sound: false, textColor: o.crit ? '#ffe070' : '#fff2c4', textScale: o.crit ? 2 : 1, rumble: !!(from && from.isBuilder && from.local) });
    DQ.sfx(m.def.voice === 'grunt' ? 'hurtLow' : m.boss ? 'hurtBoss' : 'monsterHurt', { vol: .45, pitch: m.def.body === 'blob' ? 1.4 : .8 });
    if (from && !m.boss && o.kb !== 0 && !(m.kind === 'pinhog' && m.move && m.move.name === 'roll' && m.move.phase === 'active')) { E.knockback(from, m.body, o.kb || 120, 40); m.hurtT = .25; if (m.move && m.move.phase === 'wind') { m.move = null; m.atk = null; } }
    if (!m.target && from) m.target = { kind: from.isBuilder ? 'builder' : 'npc', ent: from };
    if (m.hp <= 0) { if (m.onDeath) m.onDeath(from); else this.ctx.monsters.kill(m, from); }
    this.ctx.events.emit('monsterHurt', { m, dmg, from });
    return dmg;
  }
  /** a ballista's spool bolt: 260 u/s, pierces 1; counts as a Tangle hit on Gnarlgrim */
  fireBolt(ob, angle, o = {}) {
    const x = ob.x * T + 8 + Math.cos(angle) * 10, y = ob.y * T + 8 + Math.sin(angle) * 10, z = ob.z * T + 11;
    this.shots.push({ kind: 'bolt', x, y, z, vx: Math.cos(angle) * 260, vy: Math.sin(angle) * 260, vz: 0, t: 0, life: 1.4, dmg: o.dmg || 30, pierce: 1, hit: new Set(), friendly: true, manned: !o.auto, by: o.by || null, trail: [] });
    DQ.sfx('ballistaFire', { vol: .55 }); DQ.game.shake(1.5);
  }
  /** a resident's throw (pebble, pie): a lob that lands on the monster */
  throwAt(from, m, o = {}) {
    const a = { x: from.x, y: from.y, z: from.z + 18 }, b = { x: m.x, y: m.y, z: m.z + 8 }, v = E.arc(a, b, 300, { time: .5 });
    this.shots.push({ kind: o.kind || 'pebble', x: a.x, y: a.y, z: a.z, vx: v.vx, vy: v.vy, vz: v.vz, g: 300, t: 0, life: 1.2, dmg: o.dmg || 4, pierce: 0, hit: new Set(), friendly: true, by: from });
    DQ.sfx('throw', { vol: .3 });
  }
  /** a hostile shot (boss buttons, yarn balls) */
  hostile(s) { this.shots.push(Object.assign({ t: 0, life: 3, hit: new Set(), friendly: false, g: 0, vz: 0 }, s)); }
  update(dt) {
    const ctx = this.ctx, w = ctx.world, G = DQ.game;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i]; s.t += dt;
      if (s.trail) { s.trail.push([s.x, s.y, s.z]); if (s.trail.length > 6) s.trail.shift(); }
      s.vz -= (s.g || 0) * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
      let gone = s.t > s.life;
      const cx = Math.floor(s.x / T), cy = Math.floor(s.y / T), cz = Math.floor(s.z / T);
      if (DQ.SOLID[w.get(cx, cy, cz)] || s.z < -32) {
        gone = true; G.particles.bits(s.x, s.y, s.z, 5, s.kind === 'pie' ? ['#e8b060', '#c84a3a'] : ['#f1e6c8', '#c8c0b0']);
        if (s.kind === 'yarn') this.landYarn(s);
      }
      if (s.target && s.kind === 'yarn' && s.t >= s.tland) { gone = true; this.landYarn(s); }
      if (!gone && s.friendly) {
        const targets = ctx.monsters.list.concat(ctx.bossTargets ? ctx.bossTargets() : []);
        for (const m of targets) {
          if (m.dead || s.hit.has(m)) continue;
          if (Math.hypot(m.x - s.x, m.y - s.y) < (m.body.r || 5) + 4 + (m.boss ? 10 : 0) && s.z > m.z - 4 && s.z < m.z + 16 + (m.tall || 0)) {
            s.hit.add(m); let dmg = s.dmg; if (m.onBolt && s.kind === 'bolt') dmg = m.onBolt(s, dmg);
            this.damageMonster(m, dmg, { x: s.x - s.vx * .05, y: s.y - s.vy * .05, z: s.z, isBuilder: false }, { kb: m.boss ? 0 : 90, power: s.kind === 'bolt' ? 1.6 : .8 });
            if (s.kind === 'bolt') G.particles.bits(s.x, s.y, s.z, 8, ['#f1e6c8', '#e84a4a', '#ffffff']);
            if (s.pierce-- <= 0) { gone = true; break; }
          }
        }
      } else if (!gone && !s.friendly) {
        for (const b of ctx.builders || []) { if (b.ko || s.hit.has(b)) continue; if (Math.hypot(b.x - s.x, b.y - s.y) < 8 && s.z > b.z - 2 && s.z < b.z + 28) { s.hit.add(b); b.hurt(s.dmg, { x: s.x - s.vx * .05, y: s.y - s.vy * .05 }); gone = s.kind !== 'yarn'; if (s.kind === 'yarn') { gone = true; this.landYarn(s); } break; } }
      }
      if (gone) this.shots.splice(i, 1);
    }
    // Tangle blocks fall apart after 20 s
    for (let i = this.tangles.length - 1; i >= 0; i--) { const t = this.tangles[i]; t.t += dt; if (t.t > 20) { if (w.get(t.x, t.y, t.z) === DQ.blockId('tangle')) { w.set(t.x, t.y, t.z, 0, { silent: false }); G.particles.bits(t.x * T + 8, t.y * T + 8, t.z * T + 8, 6, ['#3a2a50', '#6a5a8a']); } this.tangles.splice(i, 1); } }
  }
  landYarn(s) {
    const ctx = this.ctx, w = ctx.world, G = DQ.game, x = Math.floor(s.x / T), y = Math.floor(s.y / T);
    G.particles.bits(s.x, s.y, s.z, 10, ['#3a2a50', '#6a5a8a', '#14101e']); DQ.sfx('thump', { vol: .5 }); G.shake(2);
    for (const b of ctx.builders || []) if (!b.ko && Math.hypot(b.x - s.x, b.y - s.y) < 22 && Math.abs(b.z - s.z) < 30 && !s.hit.has(b)) b.hurt(s.dmg || 10, { x: s.x, y: s.y });
    const L = w.topZ(x, y);
    if (L > 0 && L < w.H - 1 && !w.get(x, y, L) && !(ctx.builders || []).some(b => b.body.aabbHits(x, y, L))) { w.set(x, y, L, DQ.blockId('tangle'), { silent: true }); this.tangles.push({ x, y, z: L, t: 0 }); }
  }
  draw(r) {
    for (const s of this.shots) r.queue(s.x, s.y, s.z, g => {
      const p = r.w(s.x, s.y, s.z), x = Math.round(p[0]), y = Math.round(p[1]);
      if (s.kind === 'bolt') { const q = r.w(s.x - s.vx * .03, s.y - s.vy * .03, s.z); px.line(g, Math.round(q[0]), Math.round(q[1]), x, y, '#8a5a32', 2); px.disc(g, x, y, 2, '#f1e6c8'); px.dot(g, x, y, '#e84a4a'); if (s.trail) for (let i = 0; i < s.trail.length - 1; i++) { const a = r.w(...s.trail[i]); px.dot(g, Math.round(a[0]), Math.round(a[1]), '#f1e6c8'); } }
      else if (s.kind === 'pie') { px.disc(g, x, y, 3, '#e8b060'); px.rect(g, x - 2, y - 1, 4, 1, '#c84a3a'); }
      else if (s.kind === 'button') { px.disc(g, x, y, 3, '#c8a878'); px.dot(g, x - 1, y, '#5a4010'); px.dot(g, x + 1, y, '#5a4010'); }
      else if (s.kind === 'yarn') { px.disc(g, x, y, 5, '#2a1a3a'); px.disc(g, x - 1, y - 1, 3, '#4a3a6a'); px.line(g, x - 3, y, x + 3, y - 2, '#6a5a8a'); }
      else { px.disc(g, x, y, 1.5, '#9a96a0'); }
    }, { bias: .01 });
    // a yarn ball's landing spot: a pulsing red disc
    for (const s of this.shots) if (s.kind === 'yarn' && s.tx !== undefined) { const k = .3 + .3 * Math.abs(Math.sin(DQ.game.real * 10)); r.decal(() => r.groundDisc(s.tx, s.ty, 14, '#ff3040', k, s.tz)); }
  }
  serialize() { return { tangles: this.tangles.map(t => [t.x, t.y, t.z, t.t]) }; }
}
DQ.Combat = Combat;

// ---------------------------------------------------------------- Drops
class Drops {
  constructor(ctx) { this.ctx = ctx; this.list = []; this.uid = 1; this.fullT = 0; }
  spawn(id, n, x, y, z, o = {}) {
    if (!DQ.ITEMS[id] || n <= 0) return null;
    const R = this.ctx.rngDrops || (this.ctx.rngDrops = DQ.rng('drops', this.ctx.seed)), a = R() * Math.PI * 2, sp = 20 + R() * 30;
    const d = { uid: o.uid || this.uid++, id, n, x, y, z, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 90 + R() * 40, t: 0, rest: false };
    this.list.push(d); if (this.ctx.net && this.ctx.net.host) this.ctx.net.event(['drop', d.uid, id, n, Math.round(x), Math.round(y), Math.round(z)]); return d;
  }
  update(dt) {
    const ctx = this.ctx, w = ctx.world;
    this.fullT = Math.max(0, this.fullT - dt);
    for (let i = this.list.length - 1; i >= 0; i--) {
      const d = this.list[i]; d.t += dt;
      if (d.t > 300) { this.list.splice(i, 1); continue; }
      let target = null;
      if (d.t > .3 && !d.netOnly) for (const b of ctx.builders || []) { if (b.ko || (ctx.net && ctx.net.client && !b.local)) continue; const dd = Math.hypot(b.x - d.x, b.y - d.y, (b.z + 10) - d.z); if (dd < 2 * T + 8) { target = b; break; } }
      if (d.netOnly && !d.rest) { d.vz -= 520 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt; const gz = w.groundAt(d.x, d.y, 2, d.z + 4, 4); if (d.z <= gz) { d.z = gz; d.vz = 0; d.vx = d.vy = 0; d.rest = true; } continue; }
      if (d.netOnly) continue;
      if (target && (target.remote || target.bag.room(d.id) > 0)) {
        const dx = target.x - d.x, dy = target.y - d.y, dz = target.z + 12 - d.z, dd = Math.hypot(dx, dy, dz) || 1, s = 160;
        d.x += dx / dd * s * dt; d.y += dy / dd * s * dt; d.z += dz / dd * s * dt; d.rest = false;
        if (dd < 8) { this.pickup(d, target); this.list.splice(i, 1); }
        continue;
      } else if (target && this.fullT <= 0 && target.local) { this.fullT = 4; if (ctx.hud) ctx.hud.toast('Your bag is full!', d.id, 'full'); }
      if (!d.rest) {
        d.vz -= 520 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
        const gz = w.groundAt(d.x, d.y, 2, d.z + 4, 4);
        if (d.z <= gz) { d.z = gz; if (d.vz < -60) { d.vz = -d.vz * .35; d.vx *= .6; d.vy *= .6; } else { d.vz = 0; d.vx = d.vy = 0; d.rest = true; } }
        if (DQ.SOLID[w.get(Math.floor(d.x / T), Math.floor(d.y / T), Math.floor((d.z + 2) / T))]) { d.x -= d.vx * dt; d.y -= d.vy * dt; d.vx = -d.vx * .3; d.vy = -d.vy * .3; }
        if (d.z < -40) { this.list.splice(i, 1); }
      } else { const gz = w.groundAt(d.x, d.y, 2, d.z + 4, 4); if (gz < d.z - .5) d.rest = false; }
    }
  }
  pickup(d, b) {
    if (b.remote && this.ctx.net && this.ctx.net.host) { this.ctx.net.event(['got', b.id, d.id, d.n]); this.ctx.net.event(['gone', d.uid]); this.ctx.events.emit('itemGained', { id: d.id, n: d.n, by: b }); return; }
    const left = b.bag.add(d.id, d.n), got = d.n - left;
    if (left) { const nd = this.spawn(d.id, left, b.x, b.y, b.z + 10); if (nd) nd.t = -2; }
    if (!got) return;
    DQ.sfx('pickup', { vol: .4 });
    if (b.local && this.ctx.hud) this.ctx.hud.pickup(d.id, got);
    this.ctx.events.emit('itemGained', { id: d.id, n: got, by: b });
    if (this.ctx.crafting && b.local) this.ctx.crafting.trigger('pickup', d.id);
    if (this.ctx.net && this.ctx.net.host) this.ctx.net.event(['gone', d.uid]);
  }
  draw(r) {
    const G = DQ.game;
    for (const d of this.list) {
      const bob = d.rest ? Math.sin(G.real * 3 + d.uid) * 1.5 + 3 : 2;
      r.shadow(d.x, d.y, 3, .35, '#000', d.z);
      r.queue(d.x, d.y, d.z + bob, g => {
        const p = r.w(d.x, d.y, d.z + bob), ic = DQ.Icons && DQ.Icons.get(d.id); if (!ic) return;
        const sq = Math.abs(Math.cos(G.real * 2.2 + d.uid)), w0 = Math.max(2, Math.round(ic.width * .75 * (.35 + .65 * sq))), h0 = Math.round(ic.height * .75);
        g.drawImage(ic, Math.round(p[0] - w0 / 2), Math.round(p[1] - h0), w0, h0);
        if (d.n > 1) E.font.text(g, String(d.n), Math.round(p[0]) + 4, Math.round(p[1]) - 6, '#ffffff', { font: 'tiny', outline: '#140c1c' });
      }, { bias: .003 });
    }
  }
  serialize() { return this.list.map(d => [d.id, d.n, Math.round(d.x), Math.round(d.y), Math.round(d.z)]); }
  load(a) { this.list = []; for (const [id, n, x, y, z] of a || []) { const d = this.spawn(id, n, x, y, z); if (d) { d.vx = d.vy = d.vz = 0; } } }
}
DQ.Drops = Drops;
})();
