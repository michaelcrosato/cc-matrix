// ===== 07_player: player ship, controls, weapons (laser / lock-on charge / nova bomb), wingmen, autopilot =====
const CAST = {
  hazel: { name: 'Hazel Tillman', role: 'Furrow Lead', species: 'hare', color: '#f2e9d0', accent: '#2fb7a0', pitch: 210, kind: 0 },
  buckle: { name: 'Buckle', role: 'Furrow Two', species: 'goat', color: '#f6d9a0', accent: '#e2562f', pitch: 120, kind: 1 },
  clover: { name: 'Clover', role: 'Furrow Three', species: 'sheep', color: '#f7f0ff', accent: '#ff7eb6', pitch: 330, kind: 0 },
  marrow: { name: 'Marrow', role: 'Furrow Four', species: 'mole', color: '#b9a48c', accent: '#6b8f3a', pitch: 180, kind: 1 },
  granny: { name: 'Granny Mulch', role: 'Orchard Command', species: 'tortoise', color: '#a8c890', accent: '#e8c860', pitch: 150, kind: 0 },
  blight: { name: 'Baron Blight', role: 'Blight Armada', species: 'moth', color: '#8a5ab0', accent: '#ff3a5a', pitch: 70, kind: 1 },
};

const Player = {
  group: null, pos: V3(), vel: V3(), ent: null, state: 'alive',
  // stats
  hp: 100, maxHp: 100, bombs: 3, laserLv: 1, boost: 100, boostLock: false, speed: 52,
  vx: 0, vy: 0, ox: 0, oy: 0, rolling: 0, rollDir: 0, rollCd: 0, invuln: 0, bank: 0, pitch: 0,
  fireHeld: 0, fireCd: 0, charge: 0, locks: [], lockT: 0, volley: [], bombCd: 0,
  deadT: 0, lowAlarm: 0, boosting: false, braking: false, lastDamageT: 0, tailed: 0, ctl: null,

  init() {
    this.group = buildShip(PALETTES.hero);
    this.group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  },
  reset(startHp) {
    const L = Game.lvl;
    this.state = 'alive'; this.hp = startHp ?? this.maxHp; this.boost = 100; this.boostLock = false;
    this.pos.set(0, L.bounds.yMin > 0 ? (L.bounds.yMin + L.bounds.yMax) / 2 : 0, -Game.dist);
    this.vel.set(0, 0, -this.speed); this.vx = this.vy = 0; this.rolling = 0; this.rollCd = 0; this.invuln = 1.5; this.charge = 0; this.locks.length = 0; this.volley.length = 0;
    this.fireHeld = 0; this.fireCd = 0; this.bombCd = 0; this.tailed = 0;
    this.group.position.copy(this.pos); this.group.rotation.set(0, 0, 0); this.group.userData.pivot.rotation.set(0, 0, 0); this.group.visible = true;
  },
  hurt(n, kind) {
    if (this.state !== 'alive') return;
    if (Game.cheat) return;
    if (this.invuln > 0) return;
    if (kind !== 'shot') n *= Game.eDmgPlayer();
    this.hp -= n; this.invuln = kind === 'shot' ? 0.45 : 1.3; this.lastDamageT = 0;
    Game.stats.damageTaken += n;
    Fx.trauma = Math.min(1, Fx.trauma + 0.35 + n * 0.012);
    Sfx.hurt(); Input.rumble(0.8, 0.6, 220); UI.hitFlash();
    Fx.burst(this.pos, 10, { speed: 10, life: 0.5, size: 0.35, color: [0xff6040, 0xffd080] });
    if (this.hp <= 0) { this.hp = 0; this.die(); }
  },
  heal(n) { this.hp = Math.min(this.maxHp, this.hp + n); },
  die() {
    this.state = 'dead'; this.deadT = 0; this.group.visible = false;
    Fx.explosion(this.pos.clone(), 2.2, { core: 0xbff0ff, ring: 0x60d0ff }); Sfx.explosion(2.2); Input.rumble(1, 1, 600);
    Phys.spawnDebris(this.pos.clone(), 10, { size: 0.5, speed: 16, colors: [0xf2e9d0, 0x2fb7a0, 0x3b8fd9], trail: 1 });
    Sfx.engineStop(); Sfx.chargeUpdate(0, false);
    Game.onPlayerDown();
  },
  bounds() { return Game.lvl.bounds; },

  update(dt, c) {
    this.ctl = c;
    const B = this.bounds();
    const g = this.group, U = g.userData;
    if (this.state !== 'alive') { this.deadT += dt; return; }
    const intro = Game.phase === 'intro', outro = Game.phase === 'outro';
    this.invuln = Math.max(0, this.invuln - dt); this.lastDamageT += dt;
    // ---- steering
    let mx = c.mx * S().sensitivity, my = c.my * S().sensitivity;
    if (S().flightInvert) my = -my;
    mx = clamp(mx, -1, 1); my = clamp(my, -1, 1);
    if (outro) { mx = 0; my = 0; }
    const maxV = 30;
    this.vx = damp(this.vx, mx * maxV, 7, dt); this.vy = damp(this.vy, my * maxV * 0.85, 7, dt);
    this.ox = this.pos.x + this.vx * dt; this.oy = this.pos.y + this.vy * dt;
    this.pos.x = clamp(this.ox, -B.x, B.x); this.pos.y = clamp(this.oy, B.yMin, B.yMax);
    if (this.pos.x !== this.ox) this.vx = 0; if (this.pos.y !== this.oy) this.vy = 0;
    // ---- speed: boost / brake
    const wantBoost = c.boost && !this.boostLock && this.boost > 0 && !c.brake && !intro;
    const wantBrake = c.brake && !wantBoost;
    if (wantBoost && !this.boosting) { Sfx.boost(); Input.rumble(0.2, 0.5, 250); }
    if (wantBrake && !this.braking) Sfx.brake();
    this.boosting = wantBoost; this.braking = wantBrake;
    let target = 52;
    if (wantBoost) { target = 98; this.boost -= 38 * dt; Game.stats.boostTime += dt; if (this.boost <= 0) { this.boost = 0; this.boostLock = true; } }
    else { this.boost = Math.min(100, this.boost + (wantBrake ? 40 : 18) * dt); if (this.boostLock && this.boost > 35) this.boostLock = false; }
    if (wantBrake) { target = 28; Game.stats.brakeTime += dt; }
    if (outro) target = 160;
    this.speed = damp(this.speed, target, 3.2, dt);
    this.vel.set(this.vx, this.vy, -this.speed);
    // ---- roll
    this.rollCd = Math.max(0, this.rollCd - dt);
    const rq = c.roll;
    if (rq && this.rolling <= 0 && this.rollCd <= 0 && !intro) { this.rolling = 0.62; this.rollDir = rq; Sfx.roll(); Game.stats.rolls++; Game.tipEvent('roll'); }
    if (this.rolling > 0) { this.rolling -= dt; if (this.rolling <= 0) { this.rolling = 0; this.rollCd = 0.15; } }
    const rollAng = this.rolling > 0 ? (1 - this.rolling / 0.62) * TAU * this.rollDir : 0;
    // ---- weapons
    if (!intro && !outro) this.weapons(dt, c);
    // ---- visual banking
    this.bank = damp(this.bank, -this.vx / maxV * 0.75, 6, dt); this.pitch = damp(this.pitch, this.vy / maxV * 0.5, 6, dt);
    U.pivot.rotation.set(this.pitch, -this.vx / maxV * 0.18, this.bank + rollAng);
    const brakeK = this.braking ? 0.7 : 0;
    U.wings.forEach((w, i) => { const sd = i === 0 ? -1 : 1; w.rotation.z = w.userData.base + sd * (brakeK * 0.35 + (this.boosting ? -0.12 : 0)); });
    U.flames.forEach((f) => { f.scale.set(1, 1, (this.boosting ? 1.9 : this.braking ? 0.35 : 1) * (0.85 + Math.random() * 0.3)); });
    g.position.copy(this.pos);
    // blink during invulnerability
    g.visible = !(this.invuln > 0 && Math.floor(performance.now() / 70) % 2 === 0 && this.invuln < 1.45 && !Game.cheat);
    // engine trail particles
    if (Math.random() < (this.boosting ? 1 : 0.5)) { for (const sx of [-0.55, 0.55]) Fx.emit(_a.set(this.pos.x + sx, this.pos.y - 0.05, this.pos.z + 2.4), V3(0, 0, 14), 0.35, 0.28, this.boosting ? 0xffffff : 0x7fe8ff, 0, 1.5); }
    // low health alarm
    if (this.hp < this.maxHp * 0.25) { this.lowAlarm -= dt; if (this.lowAlarm <= 0) { this.lowAlarm = 1.2; Sfx.alarm(); } }
    Sfx.engineUpdate(clamp((this.speed - 28) / 70, 0, 1), this.boosting ? 1 : 0, true);
    // fire-and-forget volley (staggered homing launches)
    for (let i = this.volley.length - 1; i >= 0; i--) {
      const v = this.volley[i]; v.t -= dt;
      if (v.t <= 0) {
        if (v.tgt.alive) { const sx = (i % 2 ? 1 : -1) * 3.2; Shots.homing(_a.set(this.pos.x + sx, this.pos.y, this.pos.z - 2), v.tgt, 4); Sfx.missile(); }
        this.volley.splice(i, 1);
      }
    }
    this.bombCd = Math.max(0, this.bombCd - dt);
  },

  weapons(dt, c) {
    this.fireCd -= dt;
    if (c.firePressed) { this.fireHeld = 0; }
    if (c.fire) {
      this.fireHeld += dt;
      if (c.firePressed || (this.fireHeld < 0.3 && this.fireCd <= 0)) this.shoot();
      if (this.fireHeld > 0.3) {
        this.charge = Math.min(1, this.charge + dt / 1.0);
        Sfx.chargeUpdate(this.charge, true);
        this.lockT -= dt;
        if (this.lockT <= 0) { this.lockT = 0.11; this.acquireLock(); }
      }
    } else {
      if (this.charge > 0) this.release();
      Sfx.chargeUpdate(0, false);
      this.fireHeld = 0;
    }
    if (c.bombPressed) this.bomb();
  },
  shoot() {
    if (this.fireCd > 0.04) return;
    this.fireCd = 0.15; Game.stats.shots++; Game.tipEvent('fire');
    const lv = this.laserLv; const z = this.pos.z - 3;
    const mk3 = (x, y) => Shots.player(_a.set(x, y, z), _b.set(0, 0, -285), lv >= 3 ? 1.5 : 1, lv);
    if (lv === 1) mk3(this.pos.x, this.pos.y);
    else { mk3(this.pos.x - 2.2, this.pos.y); mk3(this.pos.x + 2.2, this.pos.y); if (lv >= 3) mk3(this.pos.x, this.pos.y + 0.3); }
    Sfx.laser(lv);
    Fx.burst(_a.set(this.pos.x, this.pos.y, z), 2, { speed: 4, life: 0.12, size: 0.25, color: 0x9affff });
    Input.rumble(0, 0.2, 30);
  },
  acquireLock() {
    if (this.locks.length >= 8) return;
    let best = null, bd = 1e9;
    for (const e of Game.ents) {
      if (!e.alive || !e.targetable || e.invuln || this.locks.includes(e)) continue;
      const ep = e.wpos(_a); const dz = this.pos.z - ep.z;
      if (dz < 12 || dz > 340) continue;
      const lat = Math.hypot(ep.x - this.pos.x, ep.y - this.pos.y);
      const lim = 6 + dz * 0.075 + e.r * 0.5;
      if (lat < lim && lat < bd) { bd = lat; best = e; }
    }
    if (best) { this.locks.push(best); Sfx.lock(this.locks.length); Input.rumble(0, 0.3, 40); }
  },
  release() {
    const n = this.locks.length;
    if (n > 0) {
      Game.stats.volleys++; Game.tipEvent('lock');
      this.locks.forEach((t, i) => this.volley.push({ tgt: t, t: i * 0.07 }));
      Game.banner(n >= 3 ? `${n}-HIT MULTI-LOCK!` : 'LOCK-ON!', '#ffe060', 0.9);
    } else if (this.charge > 0.55) {
      const s = Shots.player(_a.set(this.pos.x, this.pos.y, this.pos.z - 3), _b.set(0, 0, -240), 4, 3);
      s.mesh.scale.set(3, 3, 1.4); s.r = 2.2; s.life = 1.5; Sfx.laser(3); Sfx.laser(3);
    }
    this.locks.length = 0; this.charge = 0;
  },
  bomb() {
    if (this.bombs <= 0 || this.bombCd > 0 || this.state !== 'alive') { if (this.bombs <= 0) Sfx.uiError(); return; }
    if (!Game.cheat) this.bombs--; this.bombCd = 1.2; Game.stats.bombsUsed++; Game.tipEvent('bomb');
    Game.novaBomb(this.pos.clone());
  },
};

// ---------- Wingmen ----------
class Wingman {
  constructor(id, castKey, pal, slot) {
    this.id = id; this.cast = castKey; this.group = buildShip(pal, 0.82); this.slot = slot; this.pos = this.group.position;
    this.hp = 80; this.maxHp = 80; this.state = 'fly'; this.t = rr(0, 6); this.assistT = rr(2, 4); this.chasers = []; this.out = 0; this.bank = 0; this.saved = false;
    this.group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  }
  reset() {
    this.hp = this.maxHp; this.state = 'fly'; this.chasers = []; this.out = 0; this.group.visible = true; this.saved = false;
    this.pos.set(Player.pos.x + this.slot.x, Player.pos.y + this.slot.y, Player.pos.z + 20);
  }
  hit(n) {
    if (this.state === 'gone') return;
    this.hp -= n; Fx.burst(this.pos, 3, { speed: 6, life: 0.3, size: 0.25, color: 0xff7040 });
    if (this.hp <= 0 && this.state !== 'gone') {
      this.state = 'gone'; this.out = 0;
      for (const c of this.chasers) if (c.alive) c.st = 'flee';
      Game.say(this.cast, pick(["I'm hit bad! Pulling out!", 'Engines failing — heading home!', 'Sorry, Hazel... I have to bail!']), 3, true);
      Game.stats.alliesLost++; Game.onAllyLost(this);
    }
  }
  update(dt) {
    this.t += dt; const P = Player; const g = this.group, U = g.userData;
    if (this.state === 'gone') {
      this.out += dt; this.pos.x += this.slot.x * 0.4 * dt * 3; this.pos.y += 6 * dt; this.pos.z += 30 * dt;
      if (Math.random() < 0.5) Fx.emit(this.pos, V3(0, 0, 8), 0.8, 0.5, 0x606060, 0, 1);
      g.rotation.z += dt * 2; if (this.out > 4) g.visible = false; return;
    }
    let tx = P.pos.x + this.slot.x + Math.sin(this.t * 0.8 + this.id) * 2.5, ty = P.pos.y + this.slot.y + Math.cos(this.t * 0.6 + this.id * 2) * 1.5, tz = P.pos.z + this.slot.z;
    if (this.state === 'chased') { tx = P.pos.x + Math.sin(this.t * 1.5) * 15; ty = P.pos.y + 2 + Math.cos(this.t * 1.1) * 5; tz = P.pos.z - 46 + Math.sin(this.t * 0.7) * 6; }
    const ox = this.pos.x;
    this.pos.x = damp(this.pos.x, tx, 2.2, dt); this.pos.y = damp(this.pos.y, ty, 2.2, dt); this.pos.z = damp(this.pos.z, tz, 2.0, dt);
    const vx = (this.pos.x - ox) / Math.max(dt, 1e-3);
    this.bank = damp(this.bank, -vx * 0.04, 5, dt);
    U.pivot.rotation.z = this.bank + (this.state === 'chased' ? Math.sin(this.t * 4) * 0.4 : 0); U.pivot.rotation.x = Math.sin(this.t * 1.3) * 0.04;
    U.flames.forEach((f) => f.scale.set(1, 1, 0.8 + Math.random() * 0.4));
    // assist fire
    this.assistT -= dt;
    if (this.assistT <= 0 && this.state === 'fly') {
      this.assistT = rr(2.4, 4.2);
      let best = null, bd = 1e9;
      for (const e of Game.ents) {
        if (!e.alive || !e.targetable || e.invuln || e.kind === 'part' || e.kind === 'ring') continue;
        const ep = e.wpos(_a); const dz = this.pos.z - ep.z;
        if (dz < 20 || dz > 200 && e.st !== 'tail') { if (e.st !== 'tail') continue; }
        const d = ep.distanceToSquared(this.pos); if (d < bd) { bd = d; best = e; }
      }
      // tailers behind the player are handled here too
      for (const e of Game.ents) { if (e.alive && e.st === 'tail') { best = e; break; } }
      if (best) {
        const bp = best.wpos(V3());
        const s = Shots.player(this.pos.clone(), bp.clone().sub(this.pos).normalize().multiplyScalar(250), 1, 1);
        s.assist = false; s.tgt = null; s.dmg = 0; s.from = 'p'; s.wing = true; s.life = bp.distanceTo(this.pos) / 250;
        Sfx.laser(1);
        if (Math.random() < 0.55) best.damage(best.kind === 'boss' ? 0 : 1, { from: 'w' });
      }
    }
    // return to formation when chasers gone
    if (this.state === 'chased') {
      this.chasers = this.chasers.filter((c) => c.alive && c.st === 'chase');
      if (this.chasers.length === 0) {
        this.state = 'fly'; Game.stats.alliesSaved++; this.saved = true;
        Game.say(this.cast, pick(['Thanks, Hazel! That was too close!', 'You got him! I owe you a basket of apples!', 'Phew — back in formation!']), 3, true);
        Game.addScore(500, 'ALLY SAVED +500');
      }
    }
  }
}

// ---------- Autopilot used by Attract Mode (cheats freely: invulnerable, infinite bombs) ----------
const Autopilot = {
  t: 0, fireT: 0, hold: 0, rollT: 4, target: null, retarget: 0,
  reset() { this.t = 0; this.hold = 0; this.rollT = rr(3, 6); this.target = null; },
  controls(dt) {
    const P = Player; this.t += dt;
    const c = { mx: 0, my: 0, fire: false, firePressed: false, bombPressed: false, boost: false, brake: false, roll: 0 };
    this.retarget -= dt;
    if (this.retarget <= 0 || !this.target || !this.target.alive) {
      this.retarget = 0.4; let best = null, bd = 1e9;
      for (const e of Game.ents) {
        if (!e.alive || (!e.targetable && e.kind !== 'ring' && e.kind !== 'crate')) continue;
        if (e.invuln) continue;
        const ep = e.wpos(_a); const dz = P.pos.z - ep.z;
        if (dz < 15 || dz > 300) continue;
        const score = dz + (e.kind === 'ring' ? -60 : 0) + (e.kind === 'crate' ? -80 : 0);
        if (score < bd) { bd = score; best = e; }
      }
      this.target = best;
    }
    const B = P.bounds();
    let tx = 0, ty = (B.yMin + B.yMax) / 2;
    if (this.target) { const tp = this.target.wpos(_a); tx = tp.x; ty = tp.y; }
    else { tx = Math.sin(this.t * 0.6) * 10; ty = ty + Math.sin(this.t * 0.9) * 5; }
    c.mx = clamp((tx - P.pos.x) * 0.5, -1, 1); c.my = clamp((ty - P.pos.y) * 0.5, -1, 1);
    // fire: rhythmic taps; hold for lock-on when several targets are present
    let count = 0; for (const e of Game.ents) if (e.alive && e.targetable && P.pos.z - e.p.z > 20 && P.pos.z - e.p.z < 280) count++;
    this.fireT -= dt;
    if (count >= 3 && this.hold <= 0 && Math.random() < dt * 0.5) this.hold = 1.6;
    if (this.hold > 0) { this.hold -= dt; c.fire = true; }
    else if (this.fireT <= 0) { c.fire = true; c.firePressed = true; this.fireT = 0.2; }
    this.rollT -= dt; if (this.rollT <= 0) { this.rollT = rr(4, 8); c.roll = Math.random() < 0.5 ? -1 : 1; }
    if (count >= 6 && P.bombs > 0 && P.bombCd <= 0 && Math.random() < dt * 0.6) c.bombPressed = true;
    P.bombs = Math.max(P.bombs, 2);
    c.boost = this.target && P.pos.z - this.target.p.z > 150 && P.boost > 30 && Math.sin(this.t * 0.3) > 0.5;
    return c;
  },
};
