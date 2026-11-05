// Monsters (AI states with telegraphed wind-ups), spawning, combat and damage, projectiles, and the two bosses.
(() => {
const E = My3D2dge, DQ = globalThis.DQ, px = E.px, T = 16, tun = k => DQ.tuning.get(k);
let UID = 1;

DQ.makeMonsterRig = (id) => {
  const d = DQ.MONSTERS[id], tn = E.tones(d.col);
  if (d.body === 'blob') return new E.Blob({ R: d.R, colors: { base: d.col, dk: tn.sh, lt: tn.lt, eye: '#1a1020', pupil: '#ffffff' }, wings: !!d.wings, mouth: id === 'mothlet' ? 'fangs' : true, feet: id === 'pinhog' || id === 'lintling', face: 'front' });
  if (id === 'frayedKnight') return new E.Humanoid({ size: d.size, build: 'heroic', weapon: 'sword', outfit: 'robe', hair: 'bald', eyeGlow: '#b070ff', colors: { skin: '#e8dcc0', cloth: '#d8c8a8', coat: '#c8b898', trim: '#8a7a5a', metal: '#d8dce8', pants: '#b8a888', boot: '#6a5a4a', hair: '#e8dcc0' } });
  if (id === 'knotbrute') return new E.Humanoid({ size: d.size, build: 'bulky', weapon: null, hunch: .3, hair: 'bald', eyeGlow: '#ff3a3a', colors: { skin: '#2a2a48', cloth: '#1a1a38', pants: '#22223a', boot: '#101020', hair: '#2a2a48', trim: '#4a4a6a' } });
  if (id === 'buttonGolem') return new E.Humanoid({ size: d.size, build: 'bulky', weapon: null, hair: 'bald', outfit: 'coat', colors: { skin: '#c8a878', cloth: '#a88858', coat: '#b89868', trim: '#e8c040', pants: '#8a6a48', boot: '#5a4a3a', hair: '#c8a878' } });
  if (id === 'gnarlgrim') return new E.Humanoid({ size: d.size, build: 'bulky', weapon: null, hat: 'crown', cape: { len: 7, width: 6, seg: 2.5 }, eyeGlow: '#ff3aff', hair: 'spiky', colors: { skin: '#3a2a4a', cloth: '#2a1a3a', coat: '#2a1a3a', cape: '#1a1028', capeIn: '#4a2a5a', pants: '#2a1a3a', boot: '#100818', hair: '#4a2a6a', metal: '#6a3a8a', trim: '#8a3aaa' } });
  return new E.Blob({ R: 6, colors: { base: d.col } });
};

class Monster {
  constructor(ctx, id, x, y, z, o = {}) {
    this.ctx = ctx; this.id = id; this.def = DQ.MONSTERS[id]; this.uid = o.uid || UID++; this.monster = true;
    const d = this.def, big = d.size || 1;
    this.body = new DQ.VoxelBody({ x, y, z, kind: d.fly ? 'fly' : 'monster', r: d.body === 'blob' ? Math.min(6, d.R) : 5 * Math.min(1.6, big), h: d.body === 'blob' ? 14 : 26 * Math.min(1.8, big), step: 2 });
    this.rig = DQ.makeMonsterRig(id);
    this.maxHp = Math.round(d.hp * tun('monsterHp')); this.hp = this.maxHp; this.state = 'idle'; this.t = 0; this.home = [x, y, z];
    this.target = null; this.aggro = false; this.flash = 0; this.dead = false; this.slow = 1; this.dizzy = 0; this.siege = !!o.siege; this.wave = o.wave;
    this.wander = 0; this.attack = null; this.hitDone = false; this.alt = 18 + DQ.rng('mon')() * 10; this.squash = 0; this.fixed = !!o.fixed; this.tag = o.tag;
    if (d.boss) DQ.Bosses.setup(this);
  }
  get x() { return this.body.x; } get y() { return this.body.y; }
  update(dt) {
    const ctx = this.ctx, b = this.body, d = this.def, w = ctx.world;
    this.flash = Math.max(0, this.flash - dt); this.t += dt; if (this.dizzy > 0) this.dizzy -= dt;
    if (this.dead) { this.deadT += dt; return; }
    const sp = d.speed * tun('monsterSpeed') * this.slow; this.slow = 1;
    if (d.boss) { DQ.Bosses.update(this, dt); }
    else this._ai(dt, sp);
    if (d.fly) { const tz = (this.target ? this.target.body.z : this.home[2]) + this.alt; if (this.state !== 'dive') b.vz = (tz - b.z) * 2; b.fly = true; }
    b.update(dt, w);
    if (b.fellOut) { this.dead = true; this.deadT = 99; }
    // the rig
    if (d.body === 'blob') { this.squash = E.approach(this.squash, this.state === 'wind' ? .35 : this.state === 'roll' ? -.3 : Math.hypot(b.vx, b.vy) > 5 ? Math.sin(this.t * 14) * .2 : 0, dt * 4); this.rig.update(dt, { squash: this.squash, walk: Math.min(1, Math.hypot(b.vx, b.vy) / 40), flap: d.wings ? 1 : 0, look: this.target ? [this.target.body.x - b.x, this.target.body.y - b.y] : [Math.cos(b.facing), Math.sin(b.facing)], squint: this.dizzy > 0 }); }
    else this.rig.update(dt, { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, facing: b.facing, attack: this.attack ? this.attack.state : null, stance: this.id === 'frayedKnight' ? 'ready' : undefined, hurt: this.flash > .1, down: this.downK || 0, expr: this.roar > 0 ? 'shout' : 'angry', lean: this.charging ? .4 : 0 });
  }
  pickTarget() {
    const ctx = this.ctx, b = this.body; let best = null, bd = 1e9;
    if (this.siege) {
      const ban = ctx.town && ctx.town.bannerObj(); if (ban && ban.hp > 0) return { body: { x: (ban.x + .5) * T, y: (ban.y + .5) * T, z: ban.z * T }, obj: ban };
    }
    for (const q of ctx.builders) { if (q.ko || (DQ.dev.invisible && q.local) || q.seat === 'x') continue; const d = Math.hypot(q.body.x - b.x, q.body.y - b.y); if (d < bd) { bd = d; best = q; } }
    if (this.siege && ctx.npcs) for (const n of ctx.npcs.list) { const d = Math.hypot(n.body.x - b.x, n.body.y - b.y); if (d < bd * .6 && d < 60) { bd = d; best = n; } }
    return best;
  }
  _ai(dt, sp) {
    const ctx = this.ctx, b = this.body, d = this.def, w = ctx.world;
    const tg = this.pickTarget(); this.target = tg;
    const R = tun('aggro') / 8 * d.aggro * T;
    const dist = tg ? Math.hypot(tg.body.x - b.x, tg.body.y - b.y) : 1e9, dz = tg ? Math.abs(tg.body.z - b.z) : 0;
    if (this.dizzy > 0) { b.vx *= .8; b.vy *= .8; return; }
    switch (this.state) {
      case 'idle': case 'wander': {
        if (tg && (this.siege || (dist < R && dz < 48 && this._sees(tg)))) { this.state = 'notice'; this.t = 0; this.aggro = true; b.facing = Math.atan2(tg.body.y - b.y, tg.body.x - b.x); ctx.audioX && ctx.audioX.sfxAt('notice', b.x, b.y); break; }
        this.wander -= dt;
        if (this.wander <= 0) { this.wander = 2 + DQ.rng('mon')() * 3; const a = DQ.rng('mon')() * Math.PI * 2, go = DQ.rng('mon')() < .6; b.facing = a; this._wv = go ? [Math.cos(a) * sp * .4, Math.sin(a) * sp * .4] : [0, 0]; }
        b.vx = this._wv ? this._wv[0] : 0; b.vy = this._wv ? this._wv[1] : 0;
        if (Math.hypot(b.x - this.home[0], b.y - this.home[1]) > 6 * T) { const a = Math.atan2(this.home[1] - b.y, this.home[0] - b.x); b.vx = Math.cos(a) * sp * .5; b.vy = Math.sin(a) * sp * .5; }
        this._hop(sp * .4); break;
      }
      case 'notice': b.vx = b.vy = 0; if (this.t > .3) { this.state = 'chase'; this.t = 0; } break;
      case 'chase': {
        if (!tg) { this.state = 'idle'; break; }
        if (!this.siege && Math.hypot(b.x - this.home[0], b.y - this.home[1]) > 24 * T) { this.state = 'idle'; this.aggro = false; this.home = [b.x, b.y, b.z]; break; }
        if (d.flee && this.hp < this.maxHp * d.flee) { this.state = 'flee'; this.t = 0; break; }
        const a = Math.atan2(tg.body.y - b.y, tg.body.x - b.x); b.facing = a;
        const reach = (d.move === 'roll' ? 70 : d.move === 'swoop' ? 60 : d.move === 'thrust' ? 26 : d.move === 'haymaker' ? 24 : 30);
        if (dist < reach && dz < 30) { this.state = 'wind'; this.t = 0; b.vx = b.vy = 0; this.attack = d.body === 'humanoid' ? new E.Attack(d.move === 'thrust' ? 'thrust' : 'haymaker', { wind: d.wind }) : null; if (this.attack) this.attack.start(); ctx.audioX && ctx.audioX.sfxAt('windup', b.x, b.y); break; }
        // in a siege: blocked by a wall -> break it
        if (this.siege && b.hitWall) { this._breakAhead(dt); }
        b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; this._hop(sp);
        break;
      }
      case 'wind': {
        if (this.attack) this.attack.update(dt);
        if (this.t >= d.wind) {
          this.state = 'attack'; this.t = 0; this.hitDone = false;
          const a = b.facing;
          if (d.move === 'lunge' || d.move === 'double') { b.vx = Math.cos(a) * 110; b.vy = Math.sin(a) * 110; b.jump(170); }
          else if (d.move === 'roll') { this.rollT = 1.2; this.state = 'roll'; ctx.audioX && ctx.audioX.sfxAt('roll', b.x, b.y); }
          else if (d.move === 'swoop') { this.state = 'dive'; this._dive = [tg ? tg.body.x : b.x, tg ? tg.body.y : b.y, tg ? tg.body.z + 10 : b.z]; }
          else if (d.move === 'thrust') { b.vx = Math.cos(a) * 120; b.vy = Math.sin(a) * 120; }
          ctx.audioX && ctx.audioX.sfxAt(d.move === 'haymaker' ? 'punch' : 'swing', b.x, b.y);
        }
        break;
      }
      case 'attack': {
        if (this.attack) this.attack.update(dt);
        this._contact(1); b.vx *= .92; b.vy *= .92;
        if (this.t > .35) { if (d.move === 'double' && !this._second) { this._second = true; this.state = 'wind'; this.t = d.wind * .6; } else { this._second = false; this.state = 'recover'; this.t = 0; } }
        break;
      }
      case 'roll': {
        const a = b.facing; b.vx = Math.cos(a) * 110; b.vy = Math.sin(a) * 110; this.rollT -= dt; this._contact(1.1);
        if (b.hitWall) { this.dizzy = 1.2; this.state = 'recover'; this.t = 0; ctx.audioX && ctx.audioX.sfxAt('bump', b.x, b.y); ctx.game.particles.sparks(b.x, b.y, b.z + 8, 5); }
        else if (this.rollT <= 0) { this.state = 'recover'; this.t = 0; }
        break;
      }
      case 'dive': {
        const [tx, ty, tz] = this._dive, dx = tx - b.x, dy = ty - b.y, dzz = tz - b.z, l = Math.hypot(dx, dy, dzz) || 1;
        b.vx = dx / l * 140; b.vy = dy / l * 140; b.vz = dzz / l * 140; this._contact(1);
        if (l < 8 || this.t > 1.2) { this.state = 'recover'; this.t = 0; }
        break;
      }
      case 'recover': b.vx *= .85; b.vy *= .85; if (this.t > .6) { this.state = 'chase'; this.t = 0; this.attack = null; } break;
      case 'flee': { if (!tg) { this.state = 'idle'; break; } const a = Math.atan2(b.y - tg.body.y, b.x - tg.body.x); b.vx = Math.cos(a) * sp * 1.2; b.vy = Math.sin(a) * sp * 1.2; b.facing = a; this._hop(sp); if (this.t > 3) { this.state = 'chase'; this.t = 0; } break; }
      case 'hurt': b.vx *= .9; b.vy *= .9; if (this.t > .25) { this.state = this.aggro ? 'chase' : 'idle'; this.t = 0; } break;
    }
  }
  _sees(tg) { const w = this.ctx.world, b = this.body, eye = [b.x, b.y, b.z + 10], to = [tg.body.x - b.x, tg.body.y - b.y, tg.body.z + 16 - eye[2]], l = Math.hypot(...to); const hit = w.raycast(eye, to, l - 8, (x, y, z) => w.opaqueAt(x, y, z)); return !hit; }
  _hop(sp) { const b = this.body; if (b.hitWall && b.onGround && !this.def.fly) b.jump(200); if (this.def.body === 'blob' && b.onGround && Math.hypot(b.vx, b.vy) > 8 && this.id !== 'pinhog' && DQ.rng('mon')() < .03) b.jump(110); }
  // touching the target during an attack hurts it once
  _contact(mult) {
    if (this.hitDone || !this.target) return;
    const tg = this.target, b = this.body, d = Math.hypot(tg.body.x - b.x, tg.body.y - b.y), reach = this.def.body === 'blob' ? 14 : 22 * Math.min(1.5, this.def.size || 1);
    if (d > reach || Math.abs(tg.body.z - b.z) > 24) return;
    if (tg.obj) { this.hitDone = true; this.ctx.combat.hitObject(tg.obj, (this.def.blockDmg || 6) * mult * (this.siege ? 1 : 1), this); return; }
    const a = Math.atan2(tg.body.y - b.y, tg.body.x - b.x); if (Math.abs(E.angDiff(b.facing, a)) > 1.6) return;
    this.hitDone = true;
    const dmg = this.ctx.combat.formula(this.def.atk * tun('monsterDmg') * mult, tg.def || 0);
    if (tg.hurt) tg.hurt(dmg, { x: b.x, y: b.y, src: this });
    else if (tg.npc) { tg.emote('dots', 1); tg.body.push(Math.cos(a) * 80, Math.sin(a) * 80, 50); }
  }
  // a siege breaker: hit the block (or door, ballista) in front
  _breakAhead(dt) {
    const ctx = this.ctx, b = this.body, w = ctx.world; this._brk = (this._brk || 0) - dt; if (this._brk > 0) return;
    this._brk = .9; const cx = Math.floor((b.x + Math.cos(b.facing) * 10) / T), cy = Math.floor((b.y + Math.sin(b.facing) * 10) / T), L = Math.floor((b.z + 1) / T);
    for (const l of [L, L + 1]) {
      const o = w.objAt(cx, cy, l); if (o && (o.def.door || o.def.ballista || o.def.solid) && !o.def.banner) { ctx.combat.hitObject(o, this.def.blockDmg || 6, this); this.attack = this.def.body === 'humanoid' ? new E.Attack('haymaker') : null; if (this.attack) this.attack.start(); return; }
      const id = w.get(cx, cy, l); if (id && DQ.BLOCKS[id].tier < 99) { ctx.combat.hitBlock(cx, cy, l, this.def.blockDmg || ({ lintling: 3, dyedLintling: 3, pinhog: 6, mothlet: 2, frayedKnight: 8 }[this.id] || 4)); this.squash = .3; return; }
    }
  }
  draw(r) {
    const b = this.body, d = this.def;
    if (this.dead) { if (this.deadT < .25) r.queue(b.x, b.y, b.z + 8, g => { const [sx, sy] = r.w(b.x, b.y, b.z + 8); px.disc(g, sx, sy, 10 * (1 - this.deadT * 4), '#f8f4ec'); }, { emissive: true }); return; }
    if (d.boss && DQ.Bosses.drawUnder) DQ.Bosses.drawUnder(this, r);
    DQ.FX.shadow(r, this.ctx.world, b.x, b.y, d.fly ? this.ctx.world.groundAt(b.x, b.y, 2, b.z, 200) : b.z, d.boss ? 18 : d.body === 'blob' ? d.R * .8 : 7);
    const s = r.view.zoom || 1;
    r.actor(b.x, b.y, b.z, (g, ox, oy) => {
      this.rig.draw(g, ox, oy, r.view);
      const R = (d.R || 6) * s * 1.4;
      if (d.fuzz) for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + this.t; px.dot(g, ox + Math.cos(a) * R, oy - R * .9 + Math.sin(a) * R * .8, i % 2 ? '#f0eef4' : '#9a94a8'); }
      if (d.body === 'blob' && this.id !== 'mothlet') { px.disc(g, ox - 2.6 * s, oy - R * .95, 1.7 * s, '#1a1020'); px.disc(g, ox + 2.6 * s, oy - R * .95, 1.7 * s, '#1a1020'); px.dot(g, ox - 3 * s, oy - R - .5, '#ffffff'); px.dot(g, ox + 2.2 * s, oy - R - .5, '#ffffff'); }
      if (d.pins) { const curl = this.state === 'wind' || this.state === 'roll' ? .6 : 1, rot = this.state === 'roll' ? this.t * 12 : 0, cs = ['#e84a4a', '#4a8ae8', '#e8d04a', '#5ad05a']; for (let i = 0; i < 10; i++) { const a = -Math.PI * .1 - i / 9 * Math.PI * .8 + rot, l = R * 1.25 * curl; const x0 = ox + Math.cos(a) * R * .5, y0 = oy - R * .9 + Math.sin(a) * R * .5, x1 = ox + Math.cos(a) * l, y1 = oy - R * .9 + Math.sin(a) * l; px.line(g, x0, y0, x1, y1, '#d8d8e0'); px.dot(g, x1, y1, cs[i % 4]); } }
      if (this.dizzy > 0) for (let i = 0; i < 3; i++) { const a = this.t * 6 + i * 2.1; E.font.text(g, '★', Math.round(ox + Math.cos(a) * 7) - 3, Math.round(oy - 26 * Math.min(2, d.size || 1) + Math.sin(a) * 2), '#ffe060', false); }
      if (d.boss && DQ.Bosses.drawOver) DQ.Bosses.drawOver(this, g, ox, oy, r);
    }, { flash: this.flash > 0 ? '#ffffff' : (this.state === 'wind' && Math.floor(this.t * 20) % 2 ? '#ff8060' : undefined), flashMix: .6, pick: this, xray: d.boss ? { color: '#ff6aff', actors: false } : false });
    if (this.state === 'notice') r.queue(b.x, b.y, b.z + 30, g => DQ.drawBalloon(g, r, b.x, b.y, b.z + (d.body === 'blob' ? 24 : 40), '!', r.game.real), { bias: .05 });
    if (!d.boss && this.hp < this.maxHp) r.queue(b.x, b.y, b.z + 2, g => { const [sx, sy] = r.w(b.x, b.y, b.z + (d.body === 'blob' ? 22 : 36) * Math.min(1.6, d.size || 1)); px.rect(g, Math.round(sx) - 8, Math.round(sy), 16, 3, '#200810'); px.rect(g, Math.round(sx) - 7, Math.round(sy) + 1, Math.round(14 * this.hp / this.maxHp), 1, '#e04848'); }, { bias: .04 });
  }
}
DQ.Monster = Monster;

class Monsters {
  constructor(ctx) { this.ctx = ctx; this.list = []; this.spawnT = 3; this.shots = []; }
  spawn(id, x, y, z, o) { const m = new Monster(this.ctx, id, x, y, z, o); this.list.push(m); this.ctx.world.escape(m.body); return m; }
  spawnCell(id, cx, cy, o) { const z = this.ctx.world.topZ(cx, cy) * T; return this.spawn(id, (cx + .5) * T, (cy + .5) * T, z, o); }
  alive(fn) { return this.list.filter(m => !m.dead && (!fn || fn(m))); }
  inArc(from, facing, range, half, dz) { return this.list.filter(m => !m.dead && E.inArc(from, facing, m.body, range + m.body.r, half, (dz || 14) + (m.def.boss ? 30 : 0))); }
  update(dt) {
    const ctx = this.ctx;
    for (const m of this.list) m.update(dt);
    for (let i = this.list.length - 1; i >= 0; i--) { const m = this.list[i]; if (m.dead && m.deadT > .3) this.list.splice(i, 1); }
    this._shots(dt);
    if (ctx.mode === 'story' && !ctx.cutscene) this._spawning(dt);
  }
  _spawning(dt) {
    const ctx = this.ctx, b = ctx.builder; if (!b || ctx.siege && ctx.siege.active) return;
    // despawn: far for 20 s
    for (const m of this.list) { if (m.fixed || m.siege || m.def.boss) continue; const d = Math.hypot(m.body.x - b.body.x, m.body.y - b.body.y); m.far = d > 40 * T ? (m.far || 0) + dt : 0; if (m.far > 20) { m.dead = true; m.deadT = 99; } }
    const night = ctx.clock && ctx.clock.isNight, every = night ? tun('spawnNight') : 8;
    this.spawnT -= dt; if (this.spawnT > 0) return; this.spawnT = every;
    const live = this.list.filter(m => !m.dead && !m.fixed).length; if (live >= tun('maxMonsters')) return;
    const w = ctx.world, bx = Math.floor(b.body.x / T), by = Math.floor(b.body.y / T);
    for (let tries = 0; tries < 12; tries++) {
      const a = DQ.rng('spawn')() * Math.PI * 2, rr = 10 + DQ.rng('spawn')() * 8, cx = Math.round(bx + Math.cos(a) * rr), cy = Math.round(by + Math.sin(a) * rr);
      if (!w.insideCol(cx, cy)) continue;
      const reg = DQ.regionAt(cx, cy), tab = DQ.WORLD.spawns[reg]; if (!tab) continue;
      const list = tab[night ? 1 : 0]; if (!list.length) continue;
      if (ctx.town && ctx.town.planted && Math.abs(cx - ctx.town.bx) <= ctx.town.radius + 3 && Math.abs(cy - ctx.town.by) <= ctx.town.radius + 3) continue;
      const L = w.topZ(cx, cy); if (!w.standable(cx, cy, L, 'monster')) continue;
      let open = true; for (let l = L; l < w.H; l++) if (w.opaqueAt(cx, cy, l)) { open = false; break; } if (!open) continue;
      if (ctx.rooms && ctx.rooms.roomAt(cx, cy, L)) continue;
      const tot = list.reduce((s, e) => s + e[1], 0); let q = DQ.rng('spawn')() * tot, id = list[0][0]; for (const [k, wt] of list) { if ((q -= wt) <= 0) { id = k; break; } }
      if (DQ.MONSTERS[id].night && !night) continue;
      this.spawnCell(id, cx, cy); return;
    }
  }
  // boss and monster projectiles: buttons, yarn balls, pies, sling stones
  fire(o) { this.shots.push(Object.assign({ t: 0, life: 3, r: 4, team: 'monster' }, o)); }
  _shots(dt) {
    const ctx = this.ctx, w = ctx.world;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i]; s.t += dt;
      if (s.arc) { s.vz -= 600 * dt; }
      s.x += s.vx * dt; s.y += s.vy * dt; s.z += (s.vz || 0) * dt;
      let hit = s.t > s.life;
      const cx = Math.floor(s.x / T), cy = Math.floor(s.y / T), cz = Math.floor(s.z / T);
      if (!hit && w.solidAt(cx, cy, cz)) hit = 'ground';
      if (!hit && s.team === 'monster') for (const b of ctx.builders) if (!b.ko && Math.hypot(b.body.x - s.x, b.body.y - s.y) < s.r + 5 && s.z > b.body.z - 2 && s.z < b.body.z + 28) { b.hurt(ctx.combat.formula(s.dmg * tun('monsterDmg'), b.def), { x: s.x - s.vx, y: s.y - s.vy }); hit = 'body'; break; }
      if (!hit && s.team === 'ally') for (const m of ctx.monsters.list) if (!m.dead && Math.hypot(m.body.x - s.x, m.body.y - s.y) < s.r + m.body.r && s.z > m.body.z - 4 && s.z < m.body.z + 30) { ctx.combat.hitMonster(m, s.dmg, { src: 'ally', kx: s.vx * .3, ky: s.vy * .3 }); hit = 'body'; break; }
      if (hit) { if (s.onLand) s.onLand(s, hit); ctx.game.particles.bits(s.x, s.y, s.z, 5, s.colors || ['#e8c040', '#f8f4ec']); this.shots.splice(i, 1); }
    }
  }
  drawShots(r) {
    for (const s of this.shots) {
      r.queue(s.x, s.y, s.z, g => { const [sx, sy] = r.w(s.x, s.y, s.z); px.disc(g, sx, sy, s.r * .7 * (r.view.zoom || 1), s.color || '#e8c040'); px.dot(g, sx - 1, sy - 1, '#ffffff'); }, { emissive: !!s.glow });
      if (s.arc && s.tx !== undefined) r.queue(s.tx, s.ty, s.tz, g => { const k = .5 + .5 * Math.sin(r.game.real * 12); px.polyDither(g, r.groundPts(s.tx, s.ty, 10 + k * 3, 14, s.tz + .5), '#ff3a3a', .4, r.ix, r.iy); }, { bias: -.004 });
    }
  }
  draw(r) { for (const m of this.list) m.draw(r); this.drawShots(r); }
  serialize() { return this.list.filter(m => !m.dead && m.fixed).map(m => ({ id: m.id, x: m.body.x, y: m.body.y, z: m.body.z, tag: m.tag })); }
}
DQ.Monsters = Monsters;

// ---- combat ----
class Combat {
  constructor(ctx) { this.ctx = ctx; this.kills = {}; }
  formula(atk, def) { const r = .9 + DQ.rng('combat')() * .2; return Math.max(1, Math.round((atk - def / 2) * r)); }
  builderHits(b, m, mult = 1, o = {}) {
    const wp = b.weapon; let atk = (4 + wp.atk) * tun('builderAtk') * mult;
    let def = m.def.def; if (m.def.boss) def = DQ.Bosses.defOf(m);
    let dmg = this.formula(atk, def), crit = false;
    if (!o.spin && DQ.rng('combat')() < .05) { dmg = Math.round(dmg * 1.5); crit = true; }
    if (m.def.boss) dmg = DQ.Bosses.modDamage(m, dmg, b, o);
    if (DQ.dev.oneHit && b.local) dmg = 99999;
    if (m.dizzy > 0) dmg *= 2;
    const a = Math.atan2(m.body.y - b.body.y, m.body.x - b.body.x);
    this.hitMonster(m, dmg, { src: b, kx: Math.cos(a) * (o.kb || 120), ky: Math.sin(a) * (o.kb || 120), crit, by: b });
  }
  hitMonster(m, dmg, o = {}) {
    if (m.dead) return;
    const ctx = this.ctx, b = m.body;
    if (ctx.netClient && !ctx.netClient.local && o.by && o.by.local) { ctx.netClient.act(['hit', m.uid, dmg, Math.round(o.kx || 0), Math.round(o.ky || 0)]); m.flash = .12; return; }
    if (m.def.boss && DQ.Bosses.onHit) DQ.Bosses.onHit(m, o);
    m.hp -= dmg; m.flash = .15; m.aggro = true;
    if (!m.def.boss) { b.push((o.kx || 0) * (m.def.size > 1.2 ? .4 : 1), (o.ky || 0) * (m.def.size > 1.2 ? .4 : 1), 40); if (m.state !== 'roll' && m.state !== 'dive') { m.state = 'hurt'; m.t = 0; } }
    ctx.game.hitFx(b.x, b.y, b.z + 12, { power: o.crit ? 1.4 : .8, damage: dmg, textScale: o.crit ? 2 : 1, textZ: 26, rumble: !!(o.by && o.by.local) });
    ctx.audioX && ctx.audioX.monsterHurt(m.id);
    if (m.hp <= 0) this.kill(m, o);
  }
  kill(m, o = {}) {
    const ctx = this.ctx, b = m.body; m.dead = true; m.deadT = 0; m.hp = 0;
    this.kills[m.id] = (this.kills[m.id] || 0) + 1; ctx.stats.kills++;
    ctx.game.particles.bits(b.x, b.y, b.z + 8, 12, [m.def.col, E.tones(m.def.col).lt, '#f8f4ec']); ctx.game.particles.smoke(b.x, b.y, b.z + 6, 4);
    ctx.audioX && ctx.audioX.sfxAt('monsterDie', b.x, b.y);
    if (!m.def.boss) for (const [item, n, ch] of m.def.drops) if (DQ.rng('drops')() < ch * tun('dropRate')) ctx.drops.spawn(item, n, b.x, b.y, b.z + 6, { owner: o.by ? o.by.id : 0 });
    if (o.by && o.by.stats) o.by.stats.kills++;
    ctx.events.emit('monsterKilled', { id: m.id, m, by: o.by });
    if (m.def.boss) DQ.Bosses.defeated(m);
  }
  hitBlock(x, y, z, dmg) {
    const ctx = this.ctx, w = ctx.world, id = w.get(x, y, z); if (!id) return;
    const bk = DQ.BLOCKS[id], i = w.idx(x, y, z), m = w.meta.get(i) || {}; m.hp = (m.hp || 0) + dmg; m.t = ctx.game.time; w.meta.set(i, m); w.colVer[y * w.W + x]++;
    ctx.audioX && ctx.audioX.sfxAt('hitHard', x * T, y * T); ctx.game.particles.bits((x + .5) * T, (y + .5) * T, (z + .5) * T, 3, [bk.col]);
    if (m.hp >= bk.hp) { w.set(x, y, z, 0, { by: 'monster' }); ctx.game.particles.bits((x + .5) * T, (y + .5) * T, (z + .5) * T, 8, [bk.col, E.tones(bk.col).lt]); ctx.audioX && ctx.audioX.sfxAt('crumble', x * T, y * T); }
  }
  hitObject(o, dmg, by) {
    const ctx = this.ctx; if (o.broken) return;
    o.hp = (o.hp || 0) - dmg; const [x, y, z] = ctx.objects.pos(o);
    ctx.game.particles.bits(x, y, z + 10, 5, ['#a07040', '#f1e6c8']); ctx.audioX && ctx.audioX.sfxAt('hitHard', x, y);
    if (o.def.banner) { ctx.events.emit('bannerHit', { hp: o.hp }); if (o.hp <= 0) { o.hp = 0; ctx.events.emit('bannerFallen', {}); } return; }
    if (o.hp <= 0) {
      if (o.def.ballista) { o.broken = true; o.manned = false; ctx.hud && ctx.hud.hint('A Ballista is broken! Repair it with 2 Planks.'); }
      else if (o.def.door) { ctx.objects.remove(o, { by: 'monster' }); ctx.rooms && ctx.rooms.mark(); }
      else ctx.objects.remove(o, { by: 'monster' });
    }
  }
  // a resident's thrown pie or sling stone, landing on a monster
  lob(n, m, dmg, kind) {
    const b = n.body, a = E.arc({ x: b.x, y: b.y, z: b.z + 20 }, { x: m.body.x, y: m.body.y, z: m.body.z + 8 }, 600, { time: .6 });
    this.ctx.monsters.fire({ x: b.x, y: b.y, z: b.z + 20, vx: a.vx, vy: a.vy, vz: a.vz, arc: true, dmg, team: 'ally', r: 4, color: kind === 'pie' ? '#e0a060' : '#9a96a0', life: 1.2 });
  }
}
DQ.Combat = Combat;
})();
