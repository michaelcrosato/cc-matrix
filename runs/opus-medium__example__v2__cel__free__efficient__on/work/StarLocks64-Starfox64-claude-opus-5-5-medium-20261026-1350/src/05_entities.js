// ============================================================================
// Entities — ships (players, wingmen, rivals, bots), weapons, enemies, bosses, items
// ============================================================================
const CHARS = {
  kit: { name: 'KIT EMBER', pitch: 210, role: 'Team Leader' },
  skye: { name: 'SKYE TALONSBY', pitch: 300, role: 'Ace Pilot' },
  bramble: { name: 'BRAMBLE OAKHART', pitch: 115, role: 'Veteran' },
  pip: { name: 'PIP MARSH', pitch: 430, role: 'Engineer' },
  marlowe: { name: 'GENERAL MARLOWE', pitch: 135, role: 'Verdalis Defense Command' },
  bolt: { name: 'B.O.L.T.', pitch: 250, role: 'Longhaul Ship AI' },
  vex: { name: 'VEX CORSAC', pitch: 170, role: 'Jackal Squadron Leader' },
  mink: { name: 'MINK SLYVER', pitch: 380, role: 'Jackal Squadron' },
  brute: { name: 'BRUTE HOGGARD', pitch: 95, role: 'Jackal Squadron' },
  mandrillo: { name: 'EMPEROR MANDRILLO', pitch: 80, role: 'Tyrant of the Outer Rim' },
};
const TEAM_PILOTS = ['kit', 'skye', 'bramble', 'pip'];

// shared world/session state
const W = {
  scene: null, mode: 'rail', stage: null, ships: [], players: [], enemies: [], bolts: [], items: [], props: [], time: 0,
  lives: 3, attract: false, boss: null, coop: 1, versus: null, wingStatus: { skye: 100, bramble: 100, pip: 100 }, retired: {}, paused: false,
  targets(team) {
    const out = [];
    for (const e of this.enemies) if (e.alive && e.targetable && (team === 'star' || W.mode === 'versus')) out.push(e);
    for (const s of this.ships) if (!s.dead && !s.retired && s.team !== team && (W.mode !== 'versus' || s !== null)) out.push(s);
    return out;
  },
};

// ---------------------------------------------------------------------------
// Rail — the on-rails corridor. Curved centre line, frame lookup by progress s
// ---------------------------------------------------------------------------
const Rail = {
  s: 0, speed: 52, baseSpeed: 52, curve: true, groundY: 0,
  cx(s) { return this.curve ? 70 * Math.sin(s / 900) + 28 * Math.sin(s / 340 + 1) : 0; },
  cy(s) { return 0; },
  frame(s, f = this._f) {
    const x = this.cx(s), dx = (this.cx(s + 1) - this.cx(s - 1)) / 2;
    f.pos.set(x, this.cy(s), -s);
    f.fwd.set(dx, 0, -1).normalize();
    f.right.crossVectors(f.fwd, UP).normalize();
    return f;
  },
  _f: { pos: new V3(), fwd: new V3(), right: new V3() },
  _f2: { pos: new V3(), fwd: new V3(), right: new V3() },
  toWorld(x, y, s, out = new V3()) {
    const f = this.frame(s, this._f2);
    return out.copy(f.pos).addScaledVector(f.right, x).addScaledVector(UP, y);
  },
  // inverse: world → local (x,y,s) approx (rail curvature is gentle)
  toLocal(p, out = new V3()) {
    const s = -p.z; const f = this.frame(s, this._f2);
    tmpV.copy(p).sub(f.pos);
    out.set(tmpV.dot(f.right), p.y, s + tmpV.dot(f.fwd));
    return out;
  },
};

// ---------------------------------------------------------------------------
// Projectiles
// ---------------------------------------------------------------------------
const BOLT_KINDS = {
  laser: { speed: 420, life: 0.9, dmg: 1, color: 0x5dff7a, scale: [1, 1, 1], geo: 'capsule' },
  laser2: { speed: 440, life: 0.9, dmg: 1, color: 0x5dff7a, scale: [1.2, 1, 1.2], geo: 'capsule' },
  laser3: { speed: 470, life: 0.9, dmg: 2, color: 0x4fb0ff, scale: [1.8, 1.1, 1.8], geo: 'capsule' },
  rlaser: { speed: 320, life: 1.2, dmg: 5, color: 0xff3b8a, scale: [1.4, 1, 1.4], geo: 'capsule' },
  eshot: { speed: 95, life: 4, dmg: 8, color: 0xff6a1a, scale: [1.2, 1.2, 1.2], geo: 'bolt' },
  bigshot: { speed: 80, life: 5, dmg: 12, color: 0xff2a7a, scale: [2.4, 2.4, 2.4], geo: 'bolt' },
  charge: { speed: 190, life: 3, dmg: 12, color: 0x5dff7a, scale: [2.2, 2.2, 2.2], geo: 'sphere', splash: 16 },
  bomb: { speed: 150, life: 1.4, dmg: 30, color: 0xff3b4e, scale: [1.3, 1.3, 1.3], geo: 'sphere', splash: 34 },
  missile: { speed: 62, life: 7, dmg: 14, color: 0xffffff, geo: 'missile' },
};
class Bolt {
  constructor(kind, owner, pos, dir, target = null) {
    const k = BOLT_KINDS[kind];
    this.kind = kind; this.k = k; this.owner = owner; this.team = owner ? owner.team : 'enemy';
    this.pos = pos.clone(); this.vel = dir.clone().normalize().multiplyScalar(k.speed);
    if (owner && owner.velWorld && (kind.startsWith('laser') || kind === 'rlaser' || kind === 'charge' || kind === 'bomb')) this.vel.add(owner.velWorld);
    this.life = k.life; this.dmg = k.dmg; this.target = target; this.alive = true; this.t = 0;
    if (k.geo === 'missile') { this.obj = Models.missile(); this.hp = 1; this.targetable = false; this.radius = 1.5; this.collider = Phys.addBall(pos, 1.6, this, GRP.ENEMY); this.isMissile = true; }
    else {
      const geo = k.geo === 'capsule' ? G.capsule : k.geo === 'sphere' ? G.sphere : G.bolt;
      this.obj = new THREE.Mesh(geo, Toon.glow(k.color, 1, true));
      const core = new THREE.Mesh(geo, Toon.glow(0xffffff, 1, false)); core.scale.setScalar(0.5); this.obj.add(core);
      this.obj.scale.set(...k.scale);
      if (k.geo === 'capsule') this.obj.rotation.x = Math.PI / 2;
    }
    W.scene.add(this.obj);
    this.orient();
  }
  orient() {
    if (this.k.geo === 'capsule' || this.k.geo === 'missile') {
      tmpV.copy(this.vel).normalize();
      this.obj.quaternion.setFromUnitVectors(this.k.geo === 'missile' ? FWD : UP, tmpV);
    }
    this.obj.position.copy(this.pos);
  }
  // missiles are shootable
  damage(n, src) { if (!this.isMissile) return; this.hp -= n; if (this.hp <= 0) { this.explode(); if (src && src.isPlayer) src.addHits(0); } }
  explode() {
    if (!this.alive) return;
    this.alive = false;
    if (this.k.splash) {
      const big = this.kind === 'bomb';
      FX.explode(this.pos, big ? 5 : 2.5); FX.shock(this.pos, this.k.splash * (big ? 1.2 : 0.8), 0.6, big ? 0xff9cf0 : 0x5dff7a);
      if (big) { FX.flash(0.5); FX.shake(1.2, 0.5); }
      let kills = 0;
      for (const e of [...W.enemies, ...W.ships]) {
        if (!e.alive || e.team === this.team || e.dead) continue;
        if (W.mode === 'versus' && e === this.owner) continue;
        const d = e.pos.distanceTo(this.pos);
        if (d < this.k.splash + (e.radius || 2)) { const wasAlive = e.alive && !e.dead; e.damage(this.dmg * (d < 6 ? 1 : 0.7), this.owner, this.pos); if (wasAlive && (!e.alive || e.dead) && e.hitValue) kills++; }
      }
      for (const b of W.bolts) if (b.isMissile && b.alive && b.pos.distanceTo(this.pos) < this.k.splash) b.explode();
      if (kills > 1 && this.owner && this.owner.isPlayer) { this.owner.addHits(kills - 1); UI.popup(this.pos, `+${kills - 1} BONUS`, '#ffcc33'); }
    } else if (this.isMissile) { FX.explode(this.pos, 1.2); }
  }
  update(dt) {
    this.t += dt; this.life -= dt;
    if (this.life <= 0) { if (this.k.splash) this.explode(); else this.alive = false; return; }
    if (this.target && (this.kind === 'charge' || this.kind === 'missile' || this.kind === 'bomb')) {
      const tgt = this.target;
      if (!tgt.alive || tgt.dead) this.target = null;
      else {
        tmpV.copy(tgt.pos).sub(this.pos).normalize().multiplyScalar(this.k.speed);
        const turn = this.kind === 'missile' ? 1.6 : 9;
        this.vel.lerp(tmpV, Math.min(1, turn * dt));
        this.vel.setLength(this.k.speed + (this.kind === 'missile' ? this.t * 6 : 0));
      }
    }
    const step = this.vel.length() * dt;
    tmpV2.copy(this.vel).normalize();
    let mask;
    if (this.team === 'enemy' || this.team === 'jackal') mask = GRP.WORLD | GRP.PLAYER;
    else if (W.mode === 'versus') mask = GRP.WORLD | GRP.PLAYER | GRP.ENEMY;
    else mask = GRP.WORLD | GRP.ENEMY;
    if (this.isMissile) mask = GRP.WORLD | GRP.PLAYER;
    const hit = Phys.ray(this.pos, tmpV2, step + (this.k.geo === 'capsule' ? 1.5 : 0.5), mask, this.isMissile ? this : this.owner);
    if (hit && !(hit.owner && (hit.owner === this || hit.owner.team === this.team && W.mode !== 'versus'))) {
      this.pos.copy(hit.point);
      if (hit.owner && hit.owner.damage) {
        if (this.k.splash) { this.explode(); return; }
        const res = hit.owner.damage(this.dmg, this.owner, hit.point, this);
        if (res === 'deflect') { this.vel.negate(); this.team = this.owner && this.owner.team === 'star' ? 'enemy' : 'star'; this.owner = hit.owner; this.life = 1.5; return; }
        FX.spark(hit.point, tmpV.set(rand(-8, 8), rand(-8, 8), rand(-8, 8)), res === 'clank' ? 0xaaaaff : 0xffee88, 0.3, 0.4);
        for (let i = 0; i < 3; i++) FX.spark(hit.point, tmpV.set(rand(-20, 20), rand(-20, 20), rand(-20, 20)), this.k.color, 0.35, 0.25);
      } else {
        if (this.k.splash) { this.explode(); return; }
        for (let i = 0; i < 4; i++) FX.spark(hit.point, tmpV.set(rand(-15, 15), rand(0, 20), rand(-15, 15)), 0xffee88, 0.4, 0.3);
        if (this.isMissile) FX.explode(this.pos, 1);
      }
      this.alive = false; return;
    }
    this.pos.addScaledVector(this.vel, dt);
    if (this.isMissile) { Phys.move(this.collider, this.pos); if (Math.random() < 0.7) FX.fireball(this.pos, 0.7, 0.5, null, 0xdddddd, 0x888899); }
    if (this.kind === 'bomb' && Math.random() < 0.8) FX.fireball(this.pos, 0.6, 0.35, null, 0xffffff, 0xff3b4e);
    if (this.kind === 'charge') this.obj.scale.setScalar(2.2 + Math.sin(this.t * 40) * 0.4);
    this.orient();
  }
  remove() { W.scene.remove(this.obj); if (this.collider) Phys.remove(this.collider); }
}
function fire(kind, owner, pos, dir, target) { const b = new Bolt(kind, owner, pos, dir, target); W.bolts.push(b); return b; }

// ---------------------------------------------------------------------------
// Ship — every fighter: players, wingmen, Jackal rivals, versus CPU
// ---------------------------------------------------------------------------
class Ship {
  constructor(o) {
    Object.assign(this, { team: 'star', pilot: 'kit', isPlayer: false, playerIndex: -1, pad: null, brain: null, maxHp: 100, ai: null }, o);
    this.color = o.color ?? PCOLORS[Math.max(0, this.playerIndex)] ?? 0x2f7bff;
    this.obj = o.model === 'jackal' ? Models.jackal(o.color ?? 0xb44dff) : Models.lockwing(this.color);
    W.scene.add(this.obj);
    this.pos = new V3(); this.q = new Q(); this.velWorld = new V3(); this.aimDir = new V3(0, 0, -1);
    this.ox = o.ox ?? 0; this.oy = o.oy ?? 16; this.dz = 0; this.vx = 0; this.vy = 0;
    this.hp = this.maxHp; this.wings = [40, 40]; this.wingBroken = [false, false];
    this.laser = 0; this.bombs = o.bombs ?? 3; this.boost = 1; this.boostLock = false; this.boostIdle = 0;
    this.roll = 0; this.rollDir = 0; this.rollSpin = 0; this.bank = 0; this.loop = null; this.invuln = 0; this.dead = false; this.respawnT = 0;
    this.fireCD = 0; this.holdT = 0; this.charge = 0; this.lockTarget = null; this.tapL = -9; this.tapR = -9; this.hurtT = 0;
    this.hits = 0; this.speed = 60; this.boosting = false; this.braking = false; this.camMode = Settings.data.camera;
    this.goldRings = 0; this.kills = 0; this.deaths = 0; this.score = 0; this.cpu = !!o.cpu;
    this.radius = 2.4; this.alive = true; this.hitValue = this.team === 'jackal' ? 10 : 0; this.targetable = true;
    this.collider = Phys.addBall(this.pos, 2.4, this, this.team === 'jackal' ? GRP.ENEMY : GRP.PLAYER);
    // per-player camera
    if (this.isPlayer || o.camera) { this.cam = new THREE.PerspectiveCamera(70, 16 / 9, 0.5, 6000); this.camPos = new V3(); this.camLook = new V3(); this.camUp = new V3(0, 1, 0); }
    this.time = 0;
    if (W.mode !== 'rail') this.q.identity();
  }
  get name() { return CHARS[this.pilot] ? CHARS[this.pilot].name : 'PILOT'; }
  addHits(n) { this.hits += n; }
  // ---------------- damage ----------------
  damage(n, src, point, bolt) {
    if (this.dead || this.retired) return;
    if (bolt && this.roll > 0 && !bolt.k.splash) { Sound.sfx('deflect'); return 'deflect'; }
    if (this.invuln > 0 || this.godMode) return 'clank';
    if (src && src.team === this.team && W.mode !== 'versus') return;
    const mult = this.isPlayer && W.mode !== 'versus' ? diff().dmgTaken : this.wingman ? 0.5 : 1;
    this.hp -= n * mult; this.hurtT = 0.3;
    if (this.isPlayer) { Sound.sfx('hurt'); FX.shake(0.6 + n * 0.04, 0.25); Input.rumble(this.pad && this.pad.kind === 'merged' ? 'all' : this.pad, 0.6, 0.8, 200); UI.hurt(this); }
    else Sound.sfx('hit', { vol: 0.6 });
    if (n >= 6 && Math.random() < 0.5 && W.mode !== 'versus') {
      const side = Math.random() < 0.5 ? 0 : 1;
      this.wings[side] -= n; if (this.wings[side] <= 0 && !this.wingBroken[side]) this.breakWing(side);
    }
    if (this.pilot && W.mode !== 'versus' && W.wingStatus[this.pilot] != null && !this.isPlayer) W.wingStatus[this.pilot] = Math.max(0, this.hp);
    if (this.hp <= 0) this.die(src);
    return 'hit';
  }
  breakWing(side) {
    this.wingBroken[side] = true;
    const w = this.obj.userData.wings[side];
    w.visible = false;
    const clone = w.clone(); clone.visible = true;
    w.getWorldPosition(tmpV); w.getWorldQuaternion(tmpQ);
    clone.scale.set(w.scale.x, 1, 1);
    Phys.spawnDebris(W.scene, clone, tmpV, tmpV2.copy(this.velWorld).multiplyScalar(0.5).add(new V3(rand(-10, 10), 10, 0)), 1.2, 5, tmpQ);
    FX.explode(tmpV, 1);
    this.laser = 0;
    if (this.isPlayer) { UI.centerMsg(this, 'WING DAMAGED!', 'Lasers downgraded — grab a laser item to repair', 2.5); Comms.say('pip', pick(['Your wing\'s shot! Find a laser item and I\'ll patch it remotely!', 'Wing damage, Kit! Your handling\'s gonna feel sluggish!'])); }
  }
  repairWings() {
    for (let i = 0; i < 2; i++) { this.wings[i] = 40; this.wingBroken[i] = false; this.obj.userData.wings[i].visible = true; }
  }
  die(src) {
    if (this.dead || this.retired) return;
    if (this.wingman && W.mode !== 'versus') { this.hp = 0; Game.retireWing(this); return; }
    this.dead = true; this.hp = 0; this.deaths++;
    FX.explode(this.pos, 3.5, { chip: this.color });
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(G.box, Toon.mat(i % 2 ? this.color : 0xdfe4ee)); m.scale.set(rand(0.6, 1.5), 0.3, rand(0.6, 1.4));
      Phys.spawnDebris(W.scene, m, this.pos, tmpV.copy(this.velWorld).multiplyScalar(0.4).add(new V3(rand(-20, 20), rand(5, 25), rand(-20, 20))), 0.7, 4);
    }
    this.obj.visible = false;
    Phys.setGroup(this.collider, GRP.DEBRIS);
    if (src && src.isPlayer && src !== this && this.hitValue && W.mode !== 'versus') { src.addHits(this.hitValue); UI.popup(this.pos, `+${this.hitValue}`, '#ff9cf0'); }
    Game.onShipDown(this, src);
  }
  respawn(pos, q) {
    this.dead = false; this.hp = this.maxHp; this.obj.visible = true; this.invuln = 3; this.repairWings(); this.laser = Math.min(this.laser, 0);
    this.boost = 1; this.boostLock = false; this.loop = null; this.charge = 0; this.lockTarget = null; this.roll = 0;
    Phys.setGroup(this.collider, this.team === 'jackal' ? GRP.ENEMY : GRP.PLAYER);
    if (pos) this.pos.copy(pos); if (q) this.q.copy(q);
    if (W.mode === 'rail') { this.ox = 0; this.oy = 16; this.vx = this.vy = 0; this.dz = 0; }
  }
  // ---------------- controls (shared) ----------------
  updateControls(dt) {
    const p = this.pad; if (!p) return;
    // boost / brake share one gauge
    const wantB = p.down('boost'), wantK = p.down('brake') && !wantB;
    const canUse = !this.boostLock && this.boost > 0 && !this.loop;
    const wasBoost = this.boosting, wasBrake = this.braking;
    this.boosting = wantB && canUse; this.braking = wantK && canUse;
    if (this.boosting && !wasBoost && this.isPlayer) Sound.sfx('boost');
    if (this.braking && !wasBrake && this.isPlayer) Sound.sfx('brake');
    if (this.boosting || this.braking) { this.boost -= dt * (this.godMode ? 0 : 0.7); this.boostIdle = 0; if (this.boost <= 0) { this.boost = 0; this.boostLock = true; } }
    else if (!this.loop) { this.boostIdle += dt; if (this.boostIdle > 0.35) this.boost = Math.min(1, this.boost + dt * 0.42); if (this.boost >= 0.6) this.boostLock = false; }
    // bank & barrel roll (double-tap)
    let bank = 0;
    if (p.down('l1')) bank -= 1; if (p.down('r1')) bank += 1;
    this.bank = damp(this.bank, bank, 10, dt);
    if (p.pressed('l1')) { if (this.time - this.tapL < 0.32) this.startRoll(-1); this.tapL = this.time; }
    if (p.pressed('r1')) { if (this.time - this.tapR < 0.32) this.startRoll(1); this.tapR = this.time; }
    if (p.pressed('loop') && !this.loop && this.boost >= 0.45 && !this.boostLock) this.startLoop('loop');
    if (p.pressed('uturn') && !this.loop && W.mode !== 'rail' && this.boost >= 0.45 && !this.boostLock) this.startLoop('uturn');
    if (p.pressed('uturn') && W.mode === 'rail' && this.isPlayer && !this.loop) UI.tip(this, 'U-TURN only works in ALL-RANGE MODE', 1.6);
    if (p.pressed('cam') && this.isPlayer) { this.camMode = (this.camMode + 1) % 2; UI.tip(this, this.camMode ? 'COCKPIT VIEW' : 'CHASE VIEW', 1); }
    // weapons
    this.fireCD -= dt;
    if (p.pressed('fire')) { this.shoot(); this.holdT = 0; }
    if (p.down('fire')) {
      this.holdT += dt;
      if (this.holdT > 0.3) {
        if (this.charge === 0 && this.isPlayer) Sound.sfx('charge');
        this.charge = Math.min(1, this.charge + dt / 0.55);
        if (this.charge >= 1) this.updateLock();
      }
    }
    if (p.released('fire') || (!p.down('fire') && this.charge > 0)) {
      if (this.charge >= 1) this.fireCharge();
      this.charge = 0; this.holdT = 0; this.lockTarget = null;
    }
    if (p.pressed('bomb')) this.dropBomb();
  }
  startRoll(dir) { if (this.roll > 0) return; this.roll = 0.6; this.rollDir = dir; this.rollSpin = 0; if (this.isPlayer || this.cam) Sound.sfx('roll'); }
  startLoop(type) {
    this.loop = { type, t: 0, dur: type === 'loop' ? (W.mode === 'rail' ? 1.7 : 1.35) : 1.15, startQ: this.q.clone() };
    if (!this.godMode) this.boost = Math.max(0, this.boost - 0.45);
    if (this.isPlayer) Sound.sfx('boost');
  }
  muzzleWorld(i, out) { return out.copy(this.obj.userData.muzzles[i]).applyQuaternion(this.obj.quaternion).add(this.pos); }
  shoot() {
    if (this.fireCD > 0) return;
    this.fireCD = 0.085;
    const team = this.team === 'jackal';
    const kind = team ? 'rlaser' : ['laser', 'laser2', 'laser3'][this.laser];
    if (this.laser === 0 && !team) { this.muzzleWorld(0, tmpV3).lerp(this.muzzleWorld(1, tmpV), 0.5); fire(kind, this, tmpV3, this.aimDir); }
    else for (let i = 0; i < 2; i++) { this.muzzleWorld(i, tmpV3); fire(kind, this, tmpV3, this.aimDir); }
    if (this.isPlayer || (this.cam && W.mode === 'versus')) Sound.sfx(team ? 'laser2' : ['laser', 'laser2', 'laser3'][this.laser], { vol: this.isPlayer ? 1 : 0.4 });
    else if (this.pos.distanceToSquared(Game.listener) < 200 * 200) Sound.sfx('laser', { vol: 0.25 });
  }
  updateLock() {
    if (this.lockTarget && (this.lockTarget.dead || !this.lockTarget.alive)) this.lockTarget = null;
    let best = this.lockTarget, bestScore = best ? 0.5 : Infinity;
    if (best) { tmpV.copy(best.pos).sub(this.pos); const d = tmpV.length(); if (tmpV.normalize().dot(this.aimDir) < 0.85 || d > 600) { best = null; bestScore = Infinity; } }
    if (!best) {
      for (const t of W.targets(this.team)) {
        if (t === this) continue;
        tmpV.copy(t.pos).sub(this.pos); const d = tmpV.length(); if (d > 550 || d < 8) continue;
        const dot = tmpV.normalize().dot(this.aimDir); if (dot < 0.965) continue;
        const sc = (1 - dot) * 400 + d * 0.05; if (sc < bestScore) { bestScore = sc; best = t; }
      }
      if (best && best !== this.lockTarget && this.isPlayer) Sound.sfx('lock');
    }
    this.lockTarget = best;
  }
  fireCharge() {
    this.muzzleWorld(0, tmpV3).lerp(this.muzzleWorld(1, tmpV), 0.5);
    fire('charge', this, tmpV3, this.aimDir, this.lockTarget);
    if (this.isPlayer) Sound.sfx('homing');
  }
  dropBomb() {
    if (this.bombs <= 0) { if (this.isPlayer) Sound.sfx('error'); return; }
    if (!this.godMode) this.bombs--;
    this.muzzleWorld(0, tmpV3).lerp(this.muzzleWorld(1, tmpV), 0.5);
    let tgt = this.lockTarget;
    if (!tgt) { this.updateLock(); tgt = this.lockTarget; this.lockTarget = null; }
    fire('bomb', this, tmpV3, this.aimDir, tgt);
    Sound.sfx('bomb');
  }
  // ---------------- per-frame ----------------
  update(dt) {
    this.time += dt;
    if (this.retired) { this.obj.visible = false; return; }
    if (this.dead) { this.respawnT -= dt; return; }
    if (this.brain) this.brain(this, dt);
    this.invuln = Math.max(0, this.invuln - dt); this.hurtT = Math.max(0, this.hurtT - dt);
    if (this.pad) this.updateControls(dt);
    if (this.roll > 0) { this.roll -= dt; this.rollSpin += dt * TAU * 2 / 0.6 * this.rollDir; if (this.roll <= 0) { this.roll = 0; this.rollSpin = 0; } }
    // engine glow & wing damage smoke
    const ud = this.obj.userData;
    ud.flame.scale.set(0.4, 1.4 * (this.boosting ? 2.2 : this.braking ? 0.4 : 1) * (0.9 + Math.random() * 0.2), 0.4);
    if (this.hp < this.maxHp * 0.3 && Math.random() < dt * 20) FX.fireball(this.pos, 0.8, 0.6, null, 0x888899, 0x444455);
    if ((this.wingBroken[0] || this.wingBroken[1]) && Math.random() < dt * 15) FX.spark(this.pos, tmpV.set(rand(-4, 4), rand(-2, 6), rand(-4, 4)), 0xffcc33, 0.4, 0.2);
    if (W.mode === 'rail') this.updateRail(dt); else this.updateFree(dt);
    // flicker while invulnerable
    this.obj.visible = !(this.invuln > 0 && Math.floor(this.time * 20) % 2 === 0) || this.godMode;
    Phys.move(this.collider, this.pos);
  }
  updateRail(dt) {
    const p = this.pad || { lx: 0, ly: 0 };
    const handling = (this.wingBroken[0] || this.wingBroken[1]) ? 0.75 : 1;
    let tx = p.lx * 42 * handling, ty = -p.ly * 34 * handling;
    if (Math.abs(this.bank) > 0.3) tx += this.bank * 26;
    if (this.wingBroken[0] !== this.wingBroken[1]) tx += (this.wingBroken[0] ? -6 : 6);
    if (this.scripted) { tx = (this.scripted.x - this.ox) * 2; ty = (this.scripted.y - this.oy) * 2; }
    this.vx = damp(this.vx, tx, 6, dt); this.vy = damp(this.vy, ty, 6, dt);
    if (this.roll > 0) this.vx += this.rollDir * 30 * dt;
    this.ox = clampN(this.ox + this.vx * dt, -46, 46); this.oy = clampN(this.oy + this.vy * dt, Rail.minY ?? 3.5, Rail.maxY ?? 48);
    const dzT = this.dzTarget != null ? this.dzTarget : this.boosting ? 16 : this.braking ? -10 : 0;
    this.dz = damp(this.dz, dzT, 2.2, dt);
    let ly = 0, lz = 0, pitch = 0;
    if (this.loop) {
      const L = this.loop; L.t += dt; const th = Math.min(1, L.t / L.dur) * TAU, R = 15;
      ly = R * (1 - Math.cos(th)); lz = R * Math.sin(th); pitch = th;
      this.invuln = Math.max(this.invuln, 0.05);
      if (L.t >= L.dur) this.loop = null;
    }
    const f = Rail.frame(Rail.s + this.dz + lz);
    const prev = tmpV3.copy(this.pos);
    this.pos.copy(f.pos).addScaledVector(f.right, this.ox).addScaledVector(UP, this.oy + ly);
    this.velWorld.copy(this.pos).sub(prev).divideScalar(Math.max(dt, 1e-4));
    if (this.velWorld.length() > 400) this.velWorld.set(0, 0, 0);
    // orientation: nose follows stick, bank rolls the airframe
    const yaw = -p.lx * 0.32 - this.vx * 0.004, pt = -p.ly * 0.28 + this.vy * 0.004;
    tmpM.makeBasis(f.right, UP, tmpV.copy(f.fwd).negate()); this.q.setFromRotationMatrix(tmpM);
    tmpE.set(pt + pitch, yaw, 0, 'YXZ'); tmpQ.setFromEuler(tmpE); this.q.multiply(tmpQ);
    this.obj.position.copy(this.pos); this.obj.quaternion.copy(this.q);
    const visRoll = -this.vx * 0.02 - this.bank * 1.35 + this.rollSpin * -1;
    this.obj.userData.body.rotation.z = visRoll;
    // aim
    this.aimDir.copy(f.fwd).addScaledVector(f.right, p.lx * 0.22 + this.vx * 0.002).addScaledVector(UP, -p.ly * 0.18 + this.vy * 0.002).normalize();
    if (this.loop) this.aimDir.set(0, 0, -1).applyQuaternion(this.q);
    this.collide(dt, f);
  }
  updateFree(dt) {
    const p = this.pad || { lx: 0, ly: 0 };
    const handling = (this.wingBroken[0] || this.wingBroken[1]) ? 0.75 : 1;
    const tSpeed = this.boosting ? 125 : this.braking ? 28 : 62;
    this.speed = damp(this.speed, tSpeed, 3, dt);
    const fwd = tmpV.set(0, 0, -1).applyQuaternion(this.q);
    if (this.loop) {
      const L = this.loop; L.t += dt;
      if (L.type === 'loop') {
        const rate = TAU / L.dur;
        tmpQ.setFromAxisAngle(RIGHT, rate * dt); this.q.multiply(tmpQ);
        if (L.t >= L.dur) { this.q.copy(L.startQ); this.loop = null; }
      } else {
        const half = L.dur * 0.6;
        if (L.t < half) { tmpQ.setFromAxisAngle(RIGHT, Math.PI / half * dt); this.q.multiply(tmpQ); }
        else { tmpQ.setFromAxisAngle(FWD, Math.PI / (L.dur - half) * dt); this.q.multiply(tmpQ); }
        if (L.t >= L.dur) {
          // snap upright, facing the reverse of where we started
          const f0 = tmpV2.set(0, 0, -1).applyQuaternion(L.startQ); f0.y = 0; f0.normalize().negate();
          tmpM.lookAt(new V3(), f0, UP); this.q.setFromRotationMatrix(tmpM);
          this.loop = null;
        }
      }
    } else {
      let yawRate = -p.lx * 1.55 * handling, pitchRate = -p.ly * 1.3 * handling;
      if (Math.abs(this.bank) > 0.3) yawRate += -this.bank * 1.1;
      if (this.wingBroken[0] !== this.wingBroken[1]) yawRate += this.wingBroken[0] ? 0.15 : -0.15;
      // keep pitch within ±80°
      if ((fwd.y > 0.97 && pitchRate > 0) || (fwd.y < -0.97 && pitchRate < 0)) pitchRate = 0;
      tmpQ.setFromAxisAngle(UP, yawRate * dt); this.q.premultiply(tmpQ);
      tmpQ.setFromAxisAngle(RIGHT, pitchRate * dt); this.q.multiply(tmpQ);
      // auto-level roll
      const f2 = tmpV2.set(0, 0, -1).applyQuaternion(this.q);
      if (Math.abs(f2.y) < 0.98) { tmpM.lookAt(new V3(), f2, UP); tmpQ2.setFromRotationMatrix(tmpM); this.q.slerp(tmpQ2, Math.min(1, dt * 4)); }
      this.q.normalize();
      this.yawVis = damp(this.yawVis || 0, yawRate, 6, dt);
    }
    fwd.set(0, 0, -1).applyQuaternion(this.q);
    this.velWorld.copy(fwd).multiplyScalar(this.speed);
    if (this.roll > 0) { tmpV2.set(1, 0, 0).applyQuaternion(this.q).multiplyScalar(this.rollDir * 30); this.velWorld.add(tmpV2); }
    this.pos.addScaledVector(this.velWorld, dt);
    // arena boundary
    const R = W.stage && W.stage.arenaR || 1100;
    const d = this.pos.length();
    this.outOfBounds = d > R;
    if (d > R && !this.loop) {
      tmpV2.copy(this.pos).negate().normalize();
      tmpM.lookAt(new V3(), tmpV2, UP); tmpQ2.setFromRotationMatrix(tmpM);
      this.q.slerp(tmpQ2, Math.min(1, dt * (d > R + 120 ? 2.5 : 0.6)));
    }
    if (this.pos.y < -400) this.pos.y = -400; if (this.pos.y > 500) this.pos.y = 500;
    this.obj.position.copy(this.pos); this.obj.quaternion.copy(this.q);
    this.obj.userData.body.rotation.z = (this.yawVis || 0) * 0.45 - this.bank * 1.35 - this.rollSpin;
    this.aimDir.copy(fwd);
    this.collide(dt, null);
  }
  collide(dt, f) {
    if (this.collideCD > 0) { this.collideCD -= dt; return; }
    let hitSomething = null;
    Phys.overlap(this.pos, 2.0, GRP.WORLD, (owner, c) => { hitSomething = c; return false; });
    if (!hitSomething) return;
    this.collideCD = 0.5;
    const ct = hitSomething.translation();
    FX.explode(this.pos, 0.7, { vol: 0.5 }); Sound.sfx('clank');
    if (!this.godMode) {
      const inv = this.invuln; this.invuln = 0; this.damage(10, null); this.invuln = Math.max(inv, 0.4);
      if (!this.dead && Math.random() < 0.6) { const side = this.pos.x < ct.x ? 1 : 0; this.wings[side] -= 18; if (this.wings[side] <= 0 && !this.wingBroken[side]) this.breakWing(side); }
    }
    if (f) { // rail bounce away from obstacle
      tmpV.copy(this.pos).sub(tmpV2.set(ct.x, ct.y, ct.z)); const lx = tmpV.dot(f.right);
      if (this.oy > 30 || tmpV.y > 2) this.vy = 30; else this.vx = Math.sign(lx || 1) * 45;
    } else {
      tmpV.copy(this.pos).sub(tmpV2.set(ct.x, ct.y, ct.z)).normalize();
      this.pos.addScaledVector(tmpV, 6);
      tmpM.lookAt(new V3(), tmpV, UP); tmpQ2.setFromRotationMatrix(tmpM); this.q.slerp(tmpQ2, 0.7);
    }
  }
  // ---------------- camera ----------------
  updateCamera(dt) {
    if (!this.cam) return;
    const cam = this.cam;
    const fovT = 68 + (this.boosting ? 14 : 0) - (this.braking ? 6 : 0);
    cam.fov = damp(cam.fov, fovT, 4, dt);
    if (this.cine) { cam.position.copy(this.cine.pos); cam.up.set(0, 1, 0); cam.lookAt(this.cine.look); cam.updateProjectionMatrix(); return; }
    if (W.mode === 'rail') {
      const look = Rail.s + this.dz;
      const f = Rail.frame(look - 26);
      const dp = tmpV.copy(f.pos).addScaledVector(f.right, this.ox * 0.72).addScaledVector(UP, this.oy * 0.78 + 5.5);
      if (this.camMode === 1 && !this.dead) { dp.copy(this.pos).addScaledVector(UP, 0.8); }
      this.camPos.lerp(dp, Math.min(1, dt * 10));
      if (this.camPos.lengthSq() === 0 || this.snapCam) { this.camPos.copy(dp); this.snapCam = false; }
      const lk = Rail.frame(look + 40);
      tmpV2.copy(lk.pos).addScaledVector(lk.right, this.ox * 0.85).addScaledVector(UP, this.oy * 0.88 + 2);
      if (this.loop) tmpV2.copy(this.pos);
      if (this.camMode === 1 && !this.dead) tmpV2.copy(this.pos).addScaledVector(this.aimDir, 50);
      this.camLook.lerp(tmpV2, Math.min(1, dt * 12));
      cam.position.copy(this.camPos);
      cam.up.set(0, 1, 0);
      if (this.camMode === 1) cam.up.set(0, 1, 0).applyAxisAngle(this.aimDir, this.obj.userData.body.rotation.z * 0.3);
      else cam.up.set(0, 1, 0).applyAxisAngle(f.fwd, (this.ox * 0.002 - this.vx * 0.003));
    } else {
      if (this.camMode === 1 && !this.dead) {
        this.camPos.copy(this.pos).add(tmpV.set(0, 0.8, -1).applyQuaternion(this.q));
        this.camLook.copy(this.pos).add(tmpV.set(0, 0.6, -60).applyQuaternion(this.q));
        this.camUp.set(0, 1, 0).applyQuaternion(this.q);
      } else {
        const back = this.loop ? 26 : 19 + this.speed * 0.04;
        const dp = tmpV.set(0, 5.5, back).applyQuaternion(this.q).add(this.pos);
        if (this.camPos.lengthSq() === 0 || this.snapCam) { this.camPos.copy(dp); this.snapCam = false; }
        this.camPos.lerp(dp, Math.min(1, dt * (this.loop ? 4 : 7)));
        this.camLook.lerp(tmpV2.set(0, 2, -25).applyQuaternion(this.q).add(this.pos), Math.min(1, dt * 10));
        this.camUp.lerp(tmpV3.set(0, 1, 0).applyQuaternion(this.q), Math.min(1, dt * 4)).normalize();
      }
      cam.position.copy(this.camPos); cam.up.copy(this.camUp);
    }
    if (FX.shakeT > 0 && (this.isPlayer)) cam.position.add(tmpV.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(FX.shakeAmp * 0.6));
    cam.lookAt(this.camLook);
    cam.updateProjectionMatrix();
  }
  remove() { W.scene.remove(this.obj); Phys.remove(this.collider); }
}

// ---------------------------------------------------------------------------
// AI brains — write into an AIPad so AI flies with exactly the player's moveset
// ---------------------------------------------------------------------------
const AI = {
  // dogfight brain for all-range: rivals, bots, wingmen, attract pilot
  dogfight(skill = 0.7) {
    const st = { target: null, retarget: 0, fireT: 0, rollCD: rand(1, 3), jink: 0, jinkT: 0 };
    return (ship, dt) => {
      const pad = ship.pad;
      st.retarget -= dt;
      if (!st.target || st.target.dead || st.target.retired || st.target.alive === false || st.retarget <= 0) {
        st.retarget = rand(3, 6);
        let best = null, bd = Infinity;
        for (const t of W.targets(ship.team)) {
          if (t === ship) continue;
          const d = t.pos.distanceTo(ship.pos) * (t.isPlayer ? (ship.preferPlayer ? 0.5 : 1) : 1) * (t.priority ? 0.4 : 1);
          if (d < bd) { bd = d; best = t; }
        }
        st.target = best;
      }
      const s = {};
      const tgt = st.target;
      const goal = tmpV.copy(ship.pos);
      if (tgt) {
        const lead = tmpV2.copy(tgt.velWorld || tmpV3.set(0, 0, 0)).multiplyScalar(ship.pos.distanceTo(tgt.pos) / 380);
        goal.copy(tgt.pos).add(lead);
      } else goal.set(0, 0, 0);
      // avoid obstacles ahead
      const fwd = tmpV3.set(0, 0, -1).applyQuaternion(ship.q);
      const hit = Phys.ray(ship.pos, fwd, 90, GRP.WORLD);
      if (hit) goal.copy(ship.pos).addScaledVector(fwd, 50).add(tmpV2.set(0, 60, 0)).add(tmpV2.set(1, 0, 0).applyQuaternion(ship.q).multiplyScalar(60));
      if (ship.pos.length() > (W.stage && W.stage.arenaR || 1100) * 0.92) goal.set(0, 0, 0);
      // jink — evasive weave
      st.jinkT -= dt; if (st.jinkT <= 0) { st.jinkT = rand(0.8, 2.2); st.jink = rand(-1, 1) * (1 - skill) * 1.5; }
      const local = goal.sub(ship.pos).applyQuaternion(tmpQ.copy(ship.q).invert());
      const yawErr = Math.atan2(local.x, -local.z), pitchErr = Math.atan2(local.y, Math.hypot(local.x, local.z));
      s.lx = clampN(yawErr * 2.2 + st.jink * 0.4, -1, 1); s.ly = clampN(-pitchErr * 2.2, -1, 1);
      const dist = tgt ? tgt.pos.distanceTo(ship.pos) : 999;
      const aligned = Math.abs(yawErr) < 0.12 + (1 - skill) * 0.05 && Math.abs(pitchErr) < 0.12;
      st.fireT -= dt;
      if (tgt && aligned && dist < 420 && st.fireT <= 0) { s.fire = true; st.fireT = 0.14 + (1 - skill) * 0.3; }
      if (dist > 380 && ship.boost > 0.5) s.boost = true;
      if (dist < 50 && Math.abs(yawErr) > 2.2 && ship.boost > 0.6 && Math.random() < dt * 2) s.uturn = true;
      if (tgt && dist < 60 && Math.abs(yawErr) < 0.8 && !s.boost) s.brake = Math.random() < 0.5;
      // roll to dodge incoming fire
      st.rollCD -= dt;
      if (st.rollCD <= 0) {
        for (const b of W.bolts) if (b.team !== ship.team && b.pos.distanceToSquared(ship.pos) < 900) { s[Math.random() < 0.5 ? 'l1' : 'r1'] = true; st.rollPending = true; st.rollCD = 2.5 - skill; break; }
      }
      if (st.rollPending && !s.l1 && !s.r1) { s[pad.prev.l1 ? 'l1' : 'r1'] = true; st.rollPending = false; }
      if (ship.godMode && tgt && dist < 300 && aligned && ship.charge === 0 && Math.random() < dt * 0.3) s.bomb = true;
      if (Math.random() < dt * 0.08 && ship.boost > 0.8) s.loop = true;
      pad.set(s);
    };
  },
  // rail attract pilot — hunts nearest enemy, dodges obstacles, shows off moves
  railPilot() {
    const st = { fireT: 0, moveT: 0, roam: new V3(0, 16, 0), trick: rand(4, 8), fireHeld: 0 };
    return (ship, dt) => {
      const s = {};
      let best = null, bd = Infinity;
      for (const e of W.enemies) {
        if (!e.alive || !e.targetable) continue;
        const l = Rail.toLocal(e.pos, tmpV);
        const ahead = l.z - (Rail.s + ship.dz);
        if (ahead < 15 || ahead > 280) continue;
        const sc = ahead + Math.abs(l.x - ship.ox) * 2;
        if (sc < bd) { bd = sc; best = { x: l.x, y: l.y, e }; }
      }
      st.moveT -= dt;
      if (st.moveT <= 0) { st.moveT = rand(1.5, 3); st.roam.set(rand(-25, 25), rand(8, 30), 0); }
      let tx = st.roam.x, ty = st.roam.y;
      if (best) { tx = best.x; ty = clampN(best.y, 5, 44); }
      // fly through rings and items too
      for (const it of W.items) { const l = Rail.toLocal(it.pos, tmpV); const ah = l.z - Rail.s; if (ah > 10 && ah < 120 && !best) { tx = l.x; ty = l.y; } }
      const hit = Phys.ray(ship.pos, tmpV.copy(ship.aimDir), 70, GRP.WORLD);
      if (hit) ty = ship.oy + 25;
      s.lx = clampN((tx - ship.ox) / 8, -1, 1); s.ly = clampN(-(ty - ship.oy) / 8, -1, 1);
      st.fireT -= dt;
      if (best && Math.abs(best.x - ship.ox) < 9 && Math.abs(best.y - ship.oy) < 9 && st.fireT <= 0) { s.fire = true; st.fireT = 0.12; }
      st.trick -= dt;
      if (st.trick <= 0) {
        st.trick = rand(4, 9); const r = Math.random();
        st.doTrick = r < 0.4 ? 'roll' : r < 0.6 ? 'loop' : r < 0.8 ? 'boost' : 'charge';
        st.trickT = 0;
      }
      if (st.doTrick) {
        st.trickT += dt;
        if (st.doTrick === 'roll') { s.r1 = st.trickT < 0.05 || (st.trickT > 0.12 && st.trickT < 0.17); if (st.trickT > 0.3) st.doTrick = null; }
        else if (st.doTrick === 'loop') { s.loop = st.trickT < 0.05; st.doTrick = null; }
        else if (st.doTrick === 'boost') { s.boost = true; if (st.trickT > 1.2) st.doTrick = null; }
        else if (st.doTrick === 'charge') { s.fire = st.trickT < 1.3; if (st.trickT > 1.35) st.doTrick = null; }
      }
      if (W.boss && W.boss.alive && Math.random() < dt * 0.15) s.bomb = true;
      ship.pad.set(s);
    };
  },
};

// ---------------------------------------------------------------------------
// Enemies
// ---------------------------------------------------------------------------
class Enemy {
  constructor(type, o = {}) {
    this.type = type; this.alive = true; this.targetable = true; this.team = 'enemy'; this.t = 0;
    this.hp = Math.ceil((o.hp ?? 1) * diff().enemyHp); this.maxHp = this.hp; this.hitValue = o.hits ?? 1; this.radius = o.radius ?? 3;
    this.pos = new V3(); this.velWorld = new V3(); this.prevPos = new V3();
    this.obj = o.obj; this.drop = o.drop || null; this.fireRate = o.fireRate ?? 0; this.fireT = rand(0.5, 2);
    this.path = o.path || null; this.local = o.local ? o.local.clone() : null; this.ground = !!o.ground; this.s = o.s ?? 0;
    this.ax = o.x ?? 0; this.ay = o.y ?? 0; this.spawnS = Rail.s; this.flashT = 0; this.boss = o.boss || null; this.part = o.part || null;
    this.weapon = o.weapon || 'eshot'; this.armored = false; this.onKill = o.onKill || null; this.noCollide = o.noCollide;
    if (this.obj) W.scene.add(this.obj);
    this.collider = o.half ? Phys.addSensorBox(this.pos, o.half, this, GRP.ENEMY) : Phys.addBall(this.pos, this.radius, this, GRP.ENEMY);
  }
  damage(n, src, point) {
    if (!this.alive) return;
    if (this.armored) { Sound.sfx('clank'); return 'clank'; }
    this.hp -= n; this.flashT = 0.08;
    if (this.boss && this.boss.onPartHit) this.boss.onPartHit(this, n);
    Sound.sfx('hit', { vol: 0.5 });
    if (this.hp <= 0) this.kill(src);
    return 'hit';
  }
  kill(src) {
    if (!this.alive) return;
    this.alive = false;
    FX.explode(this.pos, this.explodeSize ?? (this.radius > 4 ? 3 : 1.6));
    if (this.ground) for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(G.box, Toon.mat(0x5b5040)); m.scale.set(rand(0.8, 1.6), rand(0.5, 1), rand(0.8, 1.6));
      Phys.spawnDebris(W.scene, m, tmpV.copy(this.pos).add(new V3(0, 3, 0)), new V3(rand(-15, 15), rand(15, 30), rand(-15, 15)), 0.8, 4);
    }
    else if (this.radius < 5 && Math.random() < 0.6) {
      const m = new THREE.Mesh(G.tetra, Toon.mat(0xc2410c)); m.scale.setScalar(rand(0.8, 1.4));
      Phys.spawnDebris(W.scene, m, this.pos, tmpV.copy(this.velWorld).multiplyScalar(0.5).add(new V3(rand(-10, 10), rand(0, 15), rand(-10, 10))), 0.7, 3);
    }
    if (src && src.isPlayer && this.hitValue) { src.addHits(this.hitValue); UI.popup(this.pos, `+${this.hitValue}`, this.hitValue > 1 ? '#ffcc33' : '#5dff7a'); }
    if (this.drop) spawnItem(this.drop, this.pos.clone());
    if (this.onKill) this.onKill(this, src);
  }
  nearestPlayer() {
    let best = null, bd = Infinity;
    for (const s of W.ships) { if (s.dead || s.retired || s.team === 'jackal') continue; const d = s.pos.distanceToSquared(this.pos) * (s.isPlayer ? 0.6 : 1); if (d < bd) { bd = d; best = s; } }
    return best;
  }
  shootAt(target, kind = this.weapon, spread = 0) {
    if (!target) return;
    const lead = tmpV2.copy(target.velWorld).multiplyScalar(target.pos.distanceTo(this.pos) / BOLT_KINDS[kind].speed * 0.8);
    const dir = tmpV.copy(target.pos).add(lead).sub(this.pos).normalize();
    if (spread) dir.add(tmpV3.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(spread)).normalize();
    fire(kind, this, this.pos, dir, kind === 'missile' ? target : null);
    if (this.pos.distanceToSquared(Game.listener) < 250 * 250) Sound.sfx(kind === 'missile' ? 'homing' : 'eshot', { vol: 0.5 });
  }
  update(dt) {
    this.t += dt; this.prevPos.copy(this.pos);
    if (this.path) this.path(this, dt);
    else if (this.ground) Rail.toWorld(this.ax, this.ay, this.s, this.pos);
    this.velWorld.copy(this.pos).sub(this.prevPos).divideScalar(Math.max(dt, 1e-4));
    if (this.t < 0.05) this.velWorld.set(0, 0, 0);
    if (this.obj) {
      this.obj.position.copy(this.pos);
      if (this.faceVel && this.velWorld.lengthSq() > 1) { tmpV.copy(this.velWorld).normalize(); this.obj.quaternion.slerp(tmpQ.setFromUnitVectors(FWD, tmpV), Math.min(1, dt * 6)); }
      if (this.flashT > 0) { this.flashT -= dt; this.obj.scale.setScalar(1.12); } else if (!this.keepScale) this.obj.scale.setScalar(1);
    }
    if (this.aim) this.aim(this, dt);
    // fire at players in front
    if (this.fireRate > 0 && !W.attractNoFire) {
      this.fireT -= dt * diff().enemyFire;
      if (this.fireT <= 0) {
        this.fireT = 1 / this.fireRate * rand(0.7, 1.3);
        const tgt = this.nearestPlayer();
        if (tgt) {
          const d = tgt.pos.distanceTo(this.pos);
          const inFront = W.mode !== 'rail' || Rail.toLocal(this.pos, tmpV).z > Rail.s + 25;
          if (d < 320 && d > 20 && inFront) this.shootAt(tgt, this.weapon, this.spread || 0);
        }
      }
    }
    // ram damage
    if (!this.noCollide) for (const s of W.ships) {
      if (s.dead || s.team === 'jackal' || s.retired) continue;
      if (s.pos.distanceToSquared(this.pos) < (this.radius + 1.8) ** 2) { s.damage(this.ramDmg ?? 10, this); if (this.hp <= 3 && this.alive) this.kill(s.isPlayer ? s : null); break; }
    }
    // cull behind the rail camera
    if (W.mode === 'rail' && !this.boss && !this.keep) { const l = Rail.toLocal(this.pos, tmpV); if (l.z < Rail.s - 60) this.alive = false, this.culled = true; }
    if (this.alive) Phys.move(this.collider, this.pos, this.obj ? this.obj.quaternion : null);
  }
  remove() { if (this.obj) W.scene.remove(this.obj); Phys.remove(this.collider); }
}
function addEnemy(e) { W.enemies.push(e); return e; }

// rail-relative flight paths: local (x, y, ahead-of-camera) over time
const PATHS = {
  incoming(o) { return (e, dt) => { const t = e.t; e.lz = (e.lz ?? o.z ?? 260) - (o.speed ?? 35) * dt; Rail.toWorld(o.x + Math.sin(t * (o.wf ?? 1.5) + (o.ph ?? 0)) * (o.wa ?? 6), o.y + Math.cos(t * 1.1) * 3, Rail.s + e.lz, e.pos); }; },
  swoop(o) {
    return (e, dt) => {
      const t = e.t, side = o.side;
      e.lz = (e.lz ?? -30) + (t < 2.4 ? 95 : t < 6 ? 0 : 60) * dt;
      const x = side * (55 - Math.min(1, t / 2.4) * (55 - (o.x ?? 10) * side)) + (t > 2.4 ? Math.sin((t - 2.4) * 2) * 14 : 0);
      const y = (o.y ?? 20) + (t > 6 ? (t - 6) * 25 : 0) + (t < 2.4 ? (1 - t / 2.4) * 15 : 0);
      Rail.toWorld(x, y, Rail.s + e.lz, e.pos);
    };
  },
  vform(o) {
    return (e, dt) => {
      const t = e.t; e.lz = (e.lz ?? 300) - 60 * dt * (t < 3.5 ? 1 : 0.2);
      const brk = Math.max(0, t - 3.5);
      Rail.toWorld(o.x + o.slot * (6 + brk * 18), o.y + Math.abs(o.slot) * 2 + brk * brk * 6, Rail.s + e.lz - Math.abs(o.slot) * 8, e.pos);
      if (t > 8) e.alive = false;
    };
  },
  circle(o) {
    return (e, dt) => {
      const t = e.t, a = t * 1.3 + o.ph;
      e.lz = t < 2 ? lerp(260, 110, t / 2) : t < 9 ? 110 + Math.sin(t) * 10 : 110 + (t - 9) * 80;
      Rail.toWorld(Math.cos(a) * 26, 20 + Math.sin(a) * 14 + (t > 9 ? (t - 9) * 30 : 0), Rail.s + e.lz, e.pos);
      if (t > 13) e.alive = false;
    };
  },
  dive(o) {
    return (e, dt) => {
      const t = e.t; e.lz = (e.lz ?? 240) - 70 * dt;
      const y = t < 1.5 ? lerp(90, 12, t / 1.5) : 12 + (t - 1.5) * (t - 1.5) * 10;
      Rail.toWorld(o.x + Math.sin(t * 2) * 5, y, Rail.s + e.lz, e.pos);
    };
  },
  cross(o) {
    return (e, dt) => { const t = e.t; Rail.toWorld(-o.side * 70 + o.side * t * 34, o.y + Math.sin(t * 3) * 4, Rail.s + (o.z ?? 110) - t * 6, e.pos); if (t > 4.5) e.alive = false; };
  },
  // pursue a wingman who is being chased
  chase(o) {
    return (e, dt) => {
      const w = o.wing; const t = e.t;
      if (!w || w.dead || t > o.dur) { e.lz = (e.lz ?? 40) + 80 * dt; Rail.toWorld(e.lastX ?? 0, (e.lastY ?? 20) + (t - o.dur) * 20, Rail.s + e.lz, e.pos); if (t > o.dur + 3) e.alive = false; return; }
      const ox = w.ox + Math.sin(t * 3 + o.ph) * 6 + o.dx, oy = w.oy + Math.cos(t * 2.4 + o.ph) * 4;
      e.lz = w.dz - 12 - o.ph * 3; e.lastX = ox; e.lastY = oy;
      Rail.toWorld(ox, oy, Rail.s + e.lz, e.pos);
      if (Math.random() < dt * 1.2) { fire('eshot', e, e.pos, tmpV.copy(w.pos).sub(e.pos).normalize()); }
    };
  },
  hover(o) { return (e, dt) => { Rail.toWorld(o.x + Math.sin(e.t * 0.7 + o.ph) * 3, o.y + Math.sin(e.t * 1.3 + o.ph) * 2, o.s, e.pos); if (e.obj) e.obj.rotation.y += dt; }; },
  // all-range: pursue the nearest Star Locks ship
  hunt(o) {
    const st = { dir: new V3(rand(-1, 1), rand(-0.3, 0.3), rand(-1, 1)).normalize(), speed: o.speed ?? 55 };
    return (e, dt) => {
      const tgt = e.nearestPlayer();
      if (tgt) {
        const want = tmpV.copy(tgt.pos).sub(e.pos);
        const d = want.length(); want.normalize();
        if (d < 40) want.negate();
        st.dir.lerp(want, Math.min(1, dt * (o.turn ?? 1.2))).normalize();
      }
      if (e.pos.length() > 1000) st.dir.lerp(tmpV.copy(e.pos).negate().normalize(), dt * 2).normalize();
      e.pos.addScaledVector(st.dir, st.speed * dt);
    };
  },
};

// enemy factory
function spawnEnemy(kind, o = {}) {
  switch (kind) {
    case 'dart': { const e = addEnemy(new Enemy('dart', { obj: Models.dart(), hp: 1, hits: 1, radius: 2.6, fireRate: o.fireRate ?? 0.35, path: o.path, drop: o.drop })); e.faceVel = true; return e; }
    case 'bomber': { const e = addEnemy(new Enemy('bomber', { obj: Models.bomber(), hp: 8, hits: 3, radius: 4.5, fireRate: 0.5, path: o.path, drop: o.drop ?? pick(['bomb', 'laser', 'silver']), weapon: 'missile' })); e.faceVel = true; return e; }
    case 'tank': {
      const e = addEnemy(new Enemy('tank', { obj: Models.tank(), hp: 3, hits: 1, radius: 3.4, fireRate: 0.4, ground: true, s: o.s, x: o.x, drop: o.drop }));
      e.noCollide = true; e.obj.rotation.y = rand(-0.5, 0.5);
      e.aim = (en) => { const t = en.nearestPlayer(); if (t) { const tur = en.obj.userData.turret; tmpV.copy(t.pos).sub(en.pos); tur.rotation.y = Math.atan2(-tmpV.x, -tmpV.z) - en.obj.rotation.y; } };
      return e;
    }
    case 'launcher': {
      const e = addEnemy(new Enemy('launcher', { obj: Models.tank(), hp: 4, hits: 2, radius: 3.4, fireRate: 0.22, ground: true, s: o.s, x: o.x, weapon: 'missile', drop: o.drop }));
      e.noCollide = true; e.obj.traverse(m => { if (m.material && m.material.color && !m.userData.isOutline) m.material = Toon.mat(0x6b3a7d); });
      return e;
    }
    case 'turret': {
      const e = addEnemy(new Enemy('turret', { obj: Models.turret(), hp: 5, hits: 2, radius: 2.8, fireRate: 0.5, ground: true, s: o.s, x: o.x, ay: 9, drop: o.drop }));
      e.ay = 9; e.obj.position.y = -9; e.noCollide = true; e.spread = 0.02;
      const base = Rail.toWorld(o.x, 4, o.s); e.tower = Phys.addBox(base, new V3(1.6, 4, 1.6));
      const origUpd = e.update.bind(e);
      e.update = (dt) => { origUpd(dt); e.obj.position.copy(e.pos).add(tmpV.set(0, -9, 0)); const t = e.nearestPlayer(); if (t) { tmpV.copy(t.pos).sub(e.pos); e.obj.userData.turret.rotation.y = Math.atan2(-tmpV.x, -tmpV.z); } };
      const origRem = e.remove.bind(e); e.remove = () => { origRem(); Phys.remove(e.tower); };
      return e;
    }
    case 'mine': {
      const e = addEnemy(new Enemy('mine', { obj: Models.mine(), hp: 1, hits: 1, radius: 2.2, path: o.path, ramDmg: 16 }));
      e.ramDmg = 16;
      const orig = e.update.bind(e);
      e.update = (dt) => { orig(dt); e.obj.rotation.y += dt; for (const s of W.ships) if (!s.dead && s.team === 'star' && s.pos.distanceTo(e.pos) < 9) { e.kill(null); FX.shock(e.pos, 10, 0.4, 0xff3b4e); s.damage(12, e); break; } };
      return e;
    }
    case 'crate': {
      const obj = new THREE.Group(); obj.add(place(tmesh(G.box, 0x8892a8), 0, 0, 0, 0, 0, 0, 3.2)); obj.add(place(tmesh(G.box, 0xffcc33, { outline: 0.03 }), 0, 0, 0, 0, 0, 0, 3.3, 0.6, 3.3));
      const e = addEnemy(new Enemy('crate', { obj, hp: 2, hits: 0, radius: 2.4, path: o.path, drop: o.drop ?? 'laser' })); e.noCollide = true; return e;
    }
    case 'drone': { const e = addEnemy(new Enemy('drone', { obj: Models.drone(), hp: 2, hits: 1, radius: 2.4, fireRate: 0.3, path: PATHS.hunt({ speed: rand(40, 60) }) })); e.faceVel = true; e.keep = true; if (o.pos) e.pos.copy(o.pos); return e; }
  }
}

// ---------------------------------------------------------------------------
// Items & rings
// ---------------------------------------------------------------------------
class Item {
  constructor(kind, pos, o = {}) {
    this.kind = kind; this.pos = pos.clone(); this.alive = true; this.t = 0; this.s = o.s; this.lx = o.x; this.ly = o.y; this.fixed = o.fixed;
    this.obj = kind === 'silver' ? Models.ring(false) : kind === 'gold' ? Models.ring(true) : kind === 'checkpoint' ? Models.checkpoint() : kind === 'gate' ? new THREE.Group() : Models.item(kind);
    this.radius = kind === 'checkpoint' ? 10 : kind === 'gate' ? 11 : 5.5;
    W.scene.add(this.obj); this.obj.position.copy(this.pos);
  }
  update(dt) {
    this.t += dt;
    if (this.fixed && W.mode === 'rail') Rail.toWorld(this.lx, this.ly, this.s, this.pos);
    this.obj.position.copy(this.pos);
    if (W.mode === 'rail') { const f = Rail.frame(Rail.toLocal(this.pos, tmpV).z); this.obj.quaternion.setFromUnitVectors(new V3(0, 0, 1), f.fwd); }
    if (this.kind !== 'checkpoint' && this.kind !== 'gate' && this.kind !== 'silver' && this.kind !== 'gold') this.obj.rotation.y += dt * 2;
    else if (this.kind === 'silver' || this.kind === 'gold') this.obj.children[0].rotation.z += dt;
    if (W.mode !== 'rail') this.obj.rotation.y += dt;
    for (const s of W.ships) {
      if (!s.isPlayer || s.dead) continue;
      if (s.pos.distanceToSquared(this.pos) < (this.radius + 2) ** 2) { this.collect(s); break; }
    }
    if (W.mode === 'rail' && Rail.toLocal(this.pos, tmpV).z < Rail.s - 40) { if (this.kind === 'gate' && this.onMiss) this.onMiss(); this.alive = false; }
    if (this.life != null) { this.life -= dt; if (this.life <= 0) this.alive = false; }
  }
  collect(s) {
    this.alive = false;
    switch (this.kind) {
      case 'silver': s.hp = Math.min(s.maxHp, s.hp + 25); Sound.sfx('ring'); UI.popup(this.pos, 'SHIELD +', '#dfe4ee'); break;
      case 'gold':
        s.hp = Math.min(s.maxHp, s.hp + 25); s.goldRings++; Sound.sfx('goldring');
        if (s.goldRings === 3) { s.maxHp = 150; s.hp = Math.max(s.hp, 100); UI.centerMsg(s, 'SHIELD EXTENDED!', '3 gold rings collected', 2); }
        else if (s.goldRings === 6) { W.lives++; UI.centerMsg(s, '1-UP!', '6 gold rings collected', 2); s.goldRings = 3; }
        else UI.popup(this.pos, `GOLD ${s.goldRings}/3`, '#ffcc33');
        break;
      case 'laser':
        Sound.sfx('item');
        if (s.wingBroken[0] || s.wingBroken[1]) { s.repairWings(); UI.centerMsg(s, 'WINGS REPAIRED', '', 1.5); }
        else { s.laser = Math.min(2, s.laser + 1); UI.centerMsg(s, s.laser === 1 ? 'TWIN LASERS' : 'HYPER LASERS', '', 1.5); if (s.laser === 2 && W.mode === 'rail' && !W.attract) Comms.say('pip', 'Hyper lasers online! Now you\'re cookin\'!'); }
        break;
      case 'bomb': s.bombs = Math.min(9, s.bombs + 1); Sound.sfx('item'); UI.popup(this.pos, 'BOMB +1', '#ff3b4e'); break;
      case 'checkpoint': s.hp = Math.min(s.maxHp, s.hp + 40); Sound.sfx('shield'); for (const p of W.players) p.hp = Math.min(p.maxHp, p.hp + 40); Game.checkpoint(this); UI.centerMsg(null, 'CHECKPOINT', 'Shields restored', 1.5); break;
      case 'gate': Sound.sfx('ring'); if (this.onPass) this.onPass(s); break;
    }
    if (this.kind !== 'checkpoint' && this.kind !== 'gate') FX.shock(this.pos, 5, 0.3, 0xffffff);
  }
  remove() { W.scene.remove(this.obj); }
}
function spawnItem(kind, pos, o = {}) { const it = new Item(kind, pos, o); W.items.push(it); return it; }
