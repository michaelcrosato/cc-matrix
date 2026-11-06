// Bosses: the Bosun (crane fight) and the Commodore's Bathysphere (valves, hatch, the Mother).
import { THREE, buildModel, setLookLayer } from '../../pixel-engine.js';
import { MODELS } from '../models/index.js';
import { Enemy, S } from './enemy.js';
import { Humanoid } from './actor.js';
import { raySphere, angleDiff, turnToward, clamp } from './geom.js';
import { TUNING } from '../data/tuning.js';

const { Vector3 } = THREE;
const fwd = (yaw) => [Math.sin(yaw), Math.cos(yaw)];

/** Base for scripted bosses: an Enemy with its own update and weak points. */
class BossBase extends Enemy {
  constructor(area, type, x, z, o) { super(area, type, x, z, o); this.weak = []; this.barName = ''; this.phase = 1; this.kneeling = 0; this.intro = true; this.cdAttack = 3; this.mode = 'walk'; this.modeT = 0; }
  barInfo() { return { name: this.barName, frac: this.totalFrac() }; }
  totalFrac() { return this.weak.length ? this.weak.reduce((a, w) => a + Math.max(0, w.hp), 0) / this.weak.reduce((a, w) => a + w.max, 0) : this.hp / this.maxHp; }
  traceWeak(ray, maxT) {
    let best = null;
    for (const w of this.weak) { if (w.dead || !w.visible()) continue; const p = w.pos(); const t = raySphere(ray.ox, ray.oy, ray.oz, ray.dx, ray.dy, ray.dz, p.x, p.y, p.z, w.r); if (t >= 0 && t < maxT && (!best || t < best.t)) best = { t, w }; }
    return best ? { t: best.t, ...best.w, ref: best.w } : null;
  }
  shootWeak(hit, dmg, weapon) { const w = hit.ref || hit; w.hit(dmg, weapon); this.area.audio('hit', this.x, this.z); this.area.fx.sparks(w.pos()); this.h.flash(2); }
  extraBodyZones() { return null; }
  takeHit(o) {
    if (this.dead) return { killed: false };
    const mult = this.bodyMult ? this.bodyMult(o) : 0.25;
    const r = super.takeHit({ ...o, amount: o.amount * mult });
    if (this.hp <= 1 && !this.dead) this.hp = this.maxHp;
    return { ...r, killed: this.dead };
  }
  die(o) { super.die(o); }
  update(dt) {
    if (this.dead) { this.deadT = (this.deadT || 0) + dt; return; }
    this.px = this.x; this.pz = this.z; this.stateTimer += dt; this.modeT += dt;
    if (this.area.frozen) return;
    this.bossUpdate(dt);
  }
  bossUpdate() {}
  releaseToken() { if (this.tokenHeld) { this.tokenHeld = false; this.area.tokensInUse = Math.max(0, this.area.tokensInUse - 1); } }
}
const mkWeak = (boss, id, hp, r, posFn, visible = () => true) => ({ id, hp, max: hp, r, dead: false, pos: posFn, visible, hit(d) { if (this.dead) return; this.hp -= d * (boss.sacMult ? boss.sacMult() : 1); boss.area.fx.ctx.particles.burst('brine', this.pos(), { count: 4 }); if (this.hp <= 0) { this.dead = true; boss.onWeakBurst?.(this); } } });

export class Bosun extends BossBase {
  constructor(area, x, z, o = {}) {
    super(area, 'ansgar', x, z, { ...o, model: 'bosun', scale: 2.6, noBody: true });
    this.def = { ...this.def, name: 'THE BOSUN', boss: true, small: false, money: [2000, 2000] };
    this.barName = 'THE BOSUN'; this.maxHp = 1e9; this.hp = 1e9; this.speedBase = 1.5; this.burst = 0;
    this.h.play('BosunDrag'); this.mode = 'walk'; this.anchor = null; this.chainT = 0; this.addT = 0; this.stompCd = 6; this.kneelUntil = 0; this.phaseMul = 1;
    const sacOff = [[-0.12, 0.45], [0.12, 0.45], [0, 0.2]];
    for (let i = 0; i < 3; i++) this.weak.push(mkWeak(this, 'sac' + i, 180, 0.45 * 1.2, () => { const t = this.h.j.Torso.getWorldPosition(new Vector3()); const f = fwd(this.yaw); const s = 2.6; return new Vector3(t.x + (-f[0]) * 0.18 * s + (-f[1]) * -sacOff[i][0] * s * -1, t.y + sacOff[i][1] * s, t.z + (-f[1]) * 0.18 * s + f[0] * sacOff[i][0] * s * -1); }));
    this.bodyMult = () => (this.mode === 'kneel' ? 0.5 : 0.25);
    this.sacMult = () => (this.mode === 'kneel' ? 2 : 1);
  }
  traceWeak(ray, maxT) { return super.traceWeak(ray, this.mode === 'kneel' ? maxT + 4 : maxT); }
  get liveSacs() { return this.weak.filter((w) => !w.dead).length; }
  onWeakBurst(w) {
    this.burst++; this.phase = 1 + this.burst; this.phaseMul = 1 + 0.15 * this.burst;
    this.area.audio('barrel', this.x, this.z); this.area.ctx.engine.shake.add(0.6); this.area.fx.ctx.particles.burst('brine', w.pos(), { count: 16 });
    this.h.play('BosunRoar', { once: true, restart: true }); this.area.audio('roar', this.x, this.z);
    if (this.liveSacs === 0) this.fall();
    else this.setMode('roar');
  }
  setMode(m) { this.mode = m; this.modeT = 0; this.hit = false; }
  kneel(t, why) {
    if (this.liveSacs === 0) return;
    this.setMode('kneel'); this.kneelT = t; this.h.play('BosunKneel'); this.area.audio('stomp', this.x, this.z); this.area.ctx.engine.shake.add(0.5);
    this.area.bark('DAME', 'THERE. DO PRETEND IT WAS HARD.', 3);
  }
  extend(t) { if (this.mode === 'kneel') this.kneelT += t; }
  stagger(t) { if (this.mode === 'walk' || this.mode === 'recover') { this.setMode('stagger'); this.staggerT = t; this.h.play('HitReact', { once: true, restart: true }); } }
  fall() {
    this.dead = true; this.setMode('dead'); this.h.play('Death', { once: true, hold: true, restart: true });
    this.area.ctx.engine.hitstop(0.2); this.area.ctx.engine.shake.add(1); try { this.area.ctx.engine.screen.shockwave(this.h.root.position, { radius: 0.5 }); } catch { /* headless */ }
    this.area.audio('stomp', this.x, this.z); this.area.audio('barrel');
    this.area.dropPickup({ kind: 'valuable', id: 'blackpearl', name: 'BLACK PEARL' }, this.x + 2, this.z);
    this.area.dropPickup({ kind: 'coin', count: 2000 }, this.x - 2, this.z);
    this.area.run.stats.kills++; this.area.bossDead = true; this.area.onBossDead?.(this);
  }
  onExplosion(x, z, R) { if (!this.dead && Math.hypot(this.x - x, this.z - z) < R + 1.5 && this.mode !== 'kneel') this.stagger(4); }
  bossUpdate(dt) {
    const a = this.area, p = a.player, sp = TUNING.enemySpeed * this.phaseMul;
    const dx = p.x - this.x, dz = p.z - this.z, dist = Math.hypot(dx, dz);
    this.cdAttack -= dt;
    // phase 2: reinforcements
    if (this.phase >= 2) { this.addT += dt; const easy = a.run.difficulty === 'assisted'; if (this.addT >= (easy ? 80 : 40)) { this.addT = 0; for (let i = 0; i < (easy ? 2 : 4); i++) a.spawnAtDoor('gaffer', ['1', '2', '3', '4', '5'][i % 5] in a.level.markers ? ['1', '2', '3', '4', '5'][i % 5] : '1', { state: S.APPROACH }); } }
    switch (this.mode) {
      case 'walk': {
        this.yaw = turnToward(this.yaw, Math.atan2(dx, dz), 2.2 * dt);
        if (dist > 3) { this.flowDir(p.x, p.z, this.dir); this.x += this.dir[0] * this.speedBase * 0.8 * sp * dt; this.z += this.dir[1] * this.speedBase * 0.8 * sp * dt; }
        this.locoSpeed = 1.2; this.h.play('BosunDrag');
        if (this.cdAttack <= 0) this.pickAttack(dist);
        break;
      }
      case 'roar': if (this.modeT > 1.6) this.setMode('walk'); break;
      case 'stagger': this.staggerT -= dt; if (this.staggerT <= 0) { this.setMode('walk'); this.h.play('BosunDrag'); } break;
      case 'kneel': this.kneelT -= dt; if (this.kneelT <= 0) { this.setMode('walk'); this.h.play('BosunDrag'); this.cdAttack = 2; a.bark('MAX', 'HE IS GETTING UP.', 2); } break;
      case 'sweep': {
        if (this.modeT < 0.2) this.h.play('BosunSweep', { once: true, restart: true, speed: 1 / (this.phaseMul) });
        const w = 1.0 / this.phaseMul;
        if (!this.qteAsked && this.modeT > w - 0.95 && dist < 9) { this.qteAsked = true; this.sweepDodged = null; a.scripts.start(function* (aa) { const ok = yield* aa.qte({ type: 'press', verb: 'dodge', window: 0.7, label: 'DUCK' }); this.sweepDodged = ok; if (ok) aa.player.invuln = 0.6; }.bind(this), 'sweepqte'); }
        if (!this.hit && this.modeT >= w) { this.hit = true; a.audio('whoosh', this.x, this.z); if (dist < 7.5 && !this.sweepDodged) a.hurtPlayer(45, this.x, this.z, 'bosun'); a.ctx.engine.shake.add(0.4); }
        if (this.modeT > w + 0.9) { this.qteAsked = false; if (this.phase >= 3 && !this.double) { this.double = true; this.setMode('sweep'); } else { this.double = false; this.setMode('walk'); this.cdAttack = 3.5 / this.phaseMul; } }
        break;
      }
      case 'throw': {
        if (this.modeT < 0.1) { this.h.play('BosunThrow', { once: true, restart: true }); this.tx = p.x; this.tz = p.z; }
        if (!this.hit && this.modeT >= 1.2 / this.phaseMul) { this.hit = true; a.audio('chain', this.x, this.z); this.anchor = { x: this.x, z: this.z, tx: this.tx, tz: this.tz, t: 0 }; }
        if (this.anchor) {
          const an = this.anchor; an.t += dt;
          if (an.t < 0.5) { const k = an.t / 0.5; an.x = this.x + (an.tx - this.x) * k; an.z = this.z + (an.tz - this.z) * k; }
          else if (!an.landed) { an.landed = true; a.combat.explode(an.tx, an.tz, { radius: 2, dmg: 40, owner: this, hurtEnemies: false, shake: 0.5 }); }
          else if (an.t > 0.5 + 2) { this.anchor = null; }
        }
        if (this.modeT > 3.2) { this.setMode('walk'); this.cdAttack = 3 / this.phaseMul; }
        break;
      }
      case 'stomp': {
        if (this.modeT < 0.1) this.h.play('BosunStomp', { once: true, restart: true });
        if (!this.hit && this.modeT > 0.55) { this.hit = true; a.audio('stomp', this.x, this.z); a.ctx.engine.shake.add(0.5); if (dist < 3.2) { a.hurtPlayer(25, this.x, this.z, 'stomp'); p.doMelee('stagger', 0.6); } }
        if (this.modeT > 1.2) { this.setMode('walk'); this.cdAttack = 2.5; }
        break;
      }
      case 'grab': {
        if (this.modeT < 0.1) { this.h.play('BosunRoar', { once: true, restart: true }); a.scripts.start(function* (aa) { const ok = yield* aa.qte({ type: 'mash', verb: 'action', window: 2.2, need: 9, label: 'MASH TO BREAK FREE' }); if (!ok) aa.hurtPlayer(60, aa.boss.x, aa.boss.z, 'bosun'); }, 'grabqte'); }
        if (this.modeT > 2.6) { this.setMode('walk'); this.cdAttack = 3; }
        break;
      }
    }
    // hide behind crates too long: throw the stack
    this.hideT = (this.hideT || 0) + (a.level.nav.lineOfSight(this.x, this.z, p.x, p.z, 0.3) ? -dt : dt); this.hideT = Math.max(0, this.hideT);
    if (this.hideT > 4 && this.mode === 'walk') { this.hideT = 0; this.setMode('throw'); }
    this.h.root.position.set(this.x, 0, this.z);
  }
  pickAttack(dist) {
    const a = this.area, r = a.rng; this.cdAttack = 2;
    if (dist < 3.2) { this.setMode(r.chance(0.5) ? 'stomp' : 'grab'); return; }
    if (dist < 7) { this.setMode('sweep'); return; }
    if (dist < 18 && r.chance(0.7)) { this.setMode('throw'); return; }
    this.cdAttack = 0.8;
  }
  update(dt) { super.update(dt); }
  updateVisual(dt, alpha) {
    const h = this.h, root = h.root; const ix = this.px + (this.x - this.px) * alpha, iz = this.pz + (this.z - this.pz) * alpha;
    root.position.set(ix, 0, iz); root.rotation.y = this.yaw; h.update(dt); h.placeShadow(0);
    this.cacheZones();
    if (this.anchor && !this.anchorMesh) { this.anchorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.6), new THREE.MeshBasicMaterial({ color: 0x202030 })); this.area.ctx.scene.add(this.anchorMesh); }
    if (this.anchorMesh) { this.anchorMesh.visible = !!this.anchor; if (this.anchor) this.anchorMesh.position.set(this.anchor.x, 0.5 + (this.anchor.t < 0.5 ? Math.sin(this.anchor.t / 0.5 * Math.PI) * 2 : 0), this.anchor.z); }
    for (const w of this.weak) { /* sacs glow when exposed (they are glow parts) */ }
  }
}

/** The Dame's crane: a pallet that travels a rail between yellow drop zones. */
export class Crane {
  constructor(area, railRow, xa, xb) {
    this.area = area; this.z = area.level.wz(railRow); this.xa = area.level.wx(xa); this.xb = area.level.wx(xb); this.x = this.xa; this.dir = 1; this.speed = 3; this.state = 'travel'; this.t = 0;
    this.zones = (area.level.markers.z || []).map((m) => ({ x: m.x, z: m.z })); this.lamp = false; this.reload = 0; this.dropping = 0;
    const b = THREE_buildPallet(area); this.obj = b; area.ctx.scene.add(b); b.position.set(this.x, 4.2, this.z);
    this.lampLight = null;
  }
  overZone() { return this.zones.some((q) => Math.hypot(q.x - this.x, q.z - this.z) < 1.3); }
  update(dt) {
    const a = this.area;
    if (this.state === 'travel') { this.x += this.dir * this.speed * dt; if (this.x > this.xb) { this.x = this.xb; this.dir = -1; } if (this.x < this.xa) { this.x = this.xa; this.dir = 1; } this.lamp = this.overZone(); }
    else if (this.state === 'drop') { this.dropping += dt; this.obj.position.y = Math.max(0.1, 4.2 - this.dropping * 14); if (this.dropping > 0.5) { this.land(); } }
    else if (this.state === 'reload') { this.reload -= dt; this.obj.visible = this.reload < 1; this.obj.position.y = 4.2; if (this.reload <= 0) { this.state = 'travel'; this.obj.visible = true; } }
    if (this.state === 'travel') this.obj.position.set(this.x, 4.2, this.z + 0);
    this.obj.position.x = this.x;
  }
  /** The Dame pulls the lever. */
  release() {
    if (this.state !== 'travel') return false;
    this.state = 'drop'; this.dropping = 0; this.area.audio('chain'); this.area.audio('crane');
    return true;
  }
  land() {
    const a = this.area, b = a.boss; this.state = 'reload'; this.reload = 15; this.obj.visible = false;
    a.audio('stomp', this.x, this.z); a.ctx.engine.shake.add(0.6); a.fx.boom(new Vector3(this.x, 0.5, this.z));
    if (b && !b.dead && Math.hypot(b.x - this.x, b.z - this.z) < 3.6) { b.kneel(8); a.bark('MAX', 'CLAIM FILED.', 2); }
    else a.bark('DAME', 'I SHALL NOT BE BLAMED FOR THE ANGLE.', 3);
    for (const e of a.enemies) if (!e.dead && e !== b && Math.hypot(e.x - this.x, e.z - this.z) < 2.6) e.takeHit({ amount: 200, zone: 'torso', fromX: this.x, fromZ: this.z, raw: true, explosive: true });
  }
}
function THREE_buildPallet(area) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.2, 2.6), new THREE.MeshBasicMaterial({ color: 0x8a5a2a })); g.add(m);
  const chain = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3, 0.1), new THREE.MeshBasicMaterial({ color: 0x202030 })); chain.position.y = 2; g.add(chain);
  return g;
}

/** The Commodore's Bathysphere, then the Mother. Three phases. */
export class Bathysphere extends BossBase {
  constructor(area, x, z, o = {}) {
    super(area, 'ansgar', x, z, { ...o, model: 'bathysphere', scale: 2.4, noBody: true });
    this.def = { ...this.def, name: 'THE BATHYSPHERE', boss: true, money: [3000, 3000] };
    this.barName = "THE COMMODORE'S BATHYSPHERE"; this.maxHp = 1e9; this.hp = 1e9; this.phase = 1; this.valvesLeft = 4; this.locksLeft = 3; this.speedBase = 1.3;
    this.mode = 'walk'; this.cdAttack = 3; this.stunT = 0; this.rivets = 0; this.motherHp = 0; this.over = false; this.births = 0; this.waterAdd = 0;
    const jp = (name, off) => () => { const v = this.h.worldOf(name, new Vector3()); return v.add(new Vector3(...off).multiplyScalar(this.scale)); };
    this.valves = [['ArmR', [-0.15, 0.1, 0.2]], ['ArmL', [0.15, 0.1, 0.2]], ['LegR', [-0.1, -0.1, 0.2]], ['LegL', [0.1, -0.1, 0.2]]].map(([j, off], i) => mkWeak(this, 'valve' + i, 140, 0.35 * 1.6, jp(j, off), () => this.phase === 1));
    this.locks = [[-0.3, 0.35], [0, 0.55], [0.3, 0.35]].map(([dx, dy], i) => mkWeak(this, 'lock' + i, 60, 0.3 * 1.5, () => { const t = this.h.worldOf('Torso', new Vector3()); const f = fwd(this.yaw); return new Vector3(t.x + f[1] * dx * this.scale * -1 + f[0] * 1.4, t.y + dy * this.scale, t.z + f[0] * dx * this.scale + f[1] * 1.4); }, () => this.phase === 2));
    this.weak = [...this.valves, ...this.locks];
    this.bodyMult = () => 0.04;
    this.h.play('BathyWalk');
    this.globs = [];
  }
  onWeakBurst(w) {
    const a = this.area; a.audio('barrel', this.x, this.z); a.ctx.engine.shake.add(0.5); a.fx.ctx.particles.burst('brine', w.pos(), { count: 14 });
    if (w.id.startsWith('valve')) {
      this.valvesLeft--; this.waterAdd += 0.15; a.nave && (a.nave.waterTarget = (a.nave.waterTarget || 0) + 0.15);
      for (let i = 0; i < 4; i++) a.spawnAtDoor('monk', '1' in a.level.markers ? '1' : 'o', { state: S.APPROACH });
      a.bark('COMMODORE', 'MY VALVES! THOSE WERE LOAD-BEARING!', 3);
      if (this.valvesLeft === 0) { this.phase = 2; this.mode = 'sag'; this.modeT = 0; this.h.play('BathySag'); a.audio('stoneGrind'); a.bark('MAX', 'HE IS SAGGING. SHOOT THE LOCKS.', 3); }
    } else {
      this.locksLeft--;
      if (this.locksLeft === 0) { this.mode = 'hatchWait'; a.setObjective('TEAR OPEN THE HATCH'); }
    }
  }
  stun(t) { this.stunT = t; this.mode = 'stun'; this.modeT = 0; this.h.play('BathySag'); this.area.audio('stomp', this.x, this.z); }
  onExplosion() {}
  bossUpdate(dt) {
    const a = this.area, p = a.player, sp = TUNING.enemySpeed;
    const dx = p.x - this.x, dz = p.z - this.z, dist = Math.hypot(dx, dz);
    if (this.phase === 3) return this.motherUpdate(dt, dist);
    this.cdAttack -= dt;
    switch (this.mode) {
      case 'walk': {
        this.yaw = turnToward(this.yaw, Math.atan2(dx, dz), 1.6 * dt);
        if (dist > 5) { this.flowDir(p.x, p.z, this.dir); this.x += this.dir[0] * this.speedBase * sp * dt; this.z += this.dir[1] * this.speedBase * sp * dt; }
        this.h.play('BathyWalk');
        if (this.cdAttack <= 0) { const r = a.rng; const c = r.int(0, 3); this.mode = ['steam', 'stomp', 'rivet', 'charge'][c]; this.modeT = 0; this.hit = false; this.cdAttack = 3; if (this.mode === 'charge') { a.audio('whistle', this.x, this.z); this.cx = a.player.x; this.cz = a.player.z; } }
        break;
      }
      case 'steam': {
        this.yaw = turnToward(this.yaw, Math.atan2(dx, dz), 1.2 * dt);
        if (this.modeT > 0.4 && this.modeT < 1.6 && Math.floor(this.modeT * 6) !== Math.floor((this.modeT - dt) * 6)) { a.ctx.particles.burst('smoke', this.h.worldOf('Torso', new Vector3()).add(new Vector3(fwd(this.yaw)[0] * 2, 0, fwd(this.yaw)[1] * 2)), { count: 8 }); a.audio('steam', this.x, this.z, 0.5); }
        if (!this.hit && this.modeT > 0.9) { this.hit = true; const ang = angleDiff(this.yaw, Math.atan2(dx, dz)); if (dist < 6.5 && Math.abs(ang) < 0.5) { a.hurtPlayer(30, this.x, this.z, 'steam'); a.player.slowT = 2.5; } }
        if (this.modeT > 1.8) this.mode = 'walk';
        break;
      }
      case 'stomp': if (this.modeT > 0.7 && !this.hit) { this.hit = true; a.audio('stomp', this.x, this.z); a.ctx.engine.shake.add(0.6); if (dist < 4.5) { a.hurtPlayer(25, this.x, this.z, 'stomp'); p.doMelee('stagger', 0.6); } for (const e of a.enemies) if (!e.dead && e.type !== 'ansgar' && Math.hypot(e.x - this.x, e.z - this.z) < 3) e.knockdown(1.5, this.x, this.z); } if (this.modeT > 1.3) this.mode = 'walk'; break;
      case 'rivet': {
        this.yaw = turnToward(this.yaw, Math.atan2(dx, dz), 2 * dt);
        if (this.modeT > 0.5 && this.rivets < 3 && this.modeT > 0.5 + this.rivets * 0.4) { this.rivets++; const t = this.h.worldOf('Torso', new Vector3()); a.spawnProjectile({ kind: 'harpoon', x: t.x, y: 2.2, z: t.z, tx: p.x, tz: p.z, owner: this, speed: 11, size: [0.2, 0.2, 0.5] }); a.audio('harpoon', this.x, this.z); }
        if (this.modeT > 2.2) { this.rivets = 0; this.mode = 'walk'; }
        break;
      }
      case 'charge': {
        const k = this.modeT;
        if (k < 1.2) { this.yaw = turnToward(this.yaw, Math.atan2(this.cx - this.x, this.cz - this.z), 3 * dt); this.h.play('BathyCharge'); }
        else {
          const f = fwd(this.yaw); const nx = this.x + f[0] * 8 * dt, nz = this.z + f[1] * 8 * dt; const [c, r] = a.level.cellOf(nx, nz); const ch = a.level.rows[r]?.[c];
          if (ch === 'H') { this.shatter(c, r); this.stun(3); }
          else if (!a.level.nav.walkable(nx, nz)) { this.stun(1.5); }
          else { this.x = nx; this.z = nz; if (Math.hypot(p.x - this.x, p.z - this.z) < 2.4 && p.invuln <= 0) { a.hurtPlayer(35, this.x, this.z, 'charge'); p.doMelee('stagger', 0.6); } }
          if (k > 3.5) this.mode = 'walk';
        }
        break;
      }
      case 'stun': this.stunT -= dt; if (this.stunT <= 0) { this.mode = 'walk'; this.h.play('BathyWalk'); } break;
      case 'sag': this.yaw = turnToward(this.yaw, Math.atan2(dx, dz), 0.8 * dt); if (this.modeT > 1) this.cdAttack = 99; break;
      case 'hatchWait': break;
    }
    this.h.root.position.set(this.x, 0, this.z);
  }
  shatter(c, r) {
    const a = this.area; const lv = a.level; a.audio('stomp', this.x, this.z); a.ctx.engine.shake.add(0.8);
    const rows = lv.rows[r].split(''); rows[c] = lv.rows[r + 0][c === 0 ? 1 : c - 1] === 'H' ? '_' : '_'; lv.rows[r] = rows.join('');
    lv.nav.setOpen(c, r, true); a.ctx.particles.burst('chunk', new Vector3(lv.wx(c), 1, lv.wz(r)), { count: 12 });
    a.removeCoverAt?.(c, r);
  }
  /** Phase 3 begins: he falls out, and the thing on his neck takes the altar. */
  beginMother() {
    const a = this.area; this.phase = 3; this.mode = 'mother'; this.zones = null;
    this.h.root.visible = false; if (this.h.shadow) this.h.shadow.visible = false;
    const alt = a.level.markers.o?.[0] || { x: this.x, z: this.z - 6 };
    this.mx = alt.x; this.mz = alt.z - 3;
    const b = buildModel('mother-limpet', { catalog: MODELS }); b.object.position.set(this.mx, 0, this.mz); a.ctx.scene.add(b.object); setLookLayer(b.object, 'actors');
    this.mother = { root: b.object };
    const fw = () => fwd(this.mother.root.rotation.y);
    this.mic = mkWeak(this, 'mic', 200, 0.7, () => { const f = fw(); return new Vector3(this.mx + f[0] * 0.5, 2.9, this.mz + f[1] * 0.5); }, () => true);
    this.eye = mkWeak(this, 'eye', 400, 0.9, () => { const f = fw(); return new Vector3(this.mx + f[0] * 1.6, 1.1, this.mz + f[1] * 1.6); }, () => this.micDead);
    this.weak = [this.mic, this.eye]; this.bodyMult = () => 0;
    this.eye.max = 400; this.cdAttack = 2.5; this.birthT = 4;
    this.mic.hit = function (d) { if (this.dead) return; this.hp -= d; if (this.hp <= 0) { this.dead = true; boss.onMicDead(); } }; const boss = this;
    this.eye.hit = function (d) { if (this.dead || !boss.micDead) return; this.hp -= d; if (this.hp <= 0) { this.dead = true; boss.onEyeDead(); } };
    for (const e of a.enemies) if (!e.dead && e.type === 'monk') e.die({ source: 'mother' });
    a.audio('roar', this.mx, this.mz); a.ctx.engine.shake.add(1);
    a.fx.boom(new Vector3(this.mx, 1.5, this.mz));
  }
  onMicDead() {
    const a = this.area; this.micDead = true; a.audio('tannoyOff'); a.ctx.engine.shake.add(0.6);
    a.scripts.bark('COMMODORE', 'I SHALL NOT BE CUT OFF BY A -', 3.5);
    a.later(3.2, () => { a.scripts.bark('COMMODORE', '- AND THE VOICE CARRIES ON, FROM THE THING ON HIS NECK. IT ALWAYS DID.', 6); a.audio('roar', this.mx, this.mz, 0.5); });
    a.onMicDead?.(this);
  }
  onEyeDead() { this.over = true; this.area.ctx.engine.hitstop(0.2); this.area.audio('roar', this.mx, this.mz); this.area.onMotherDown?.(this); }
  motherUpdate(dt, dist) {
    const a = this.area, p = a.player; if (!this.mother) return;
    this.cdAttack -= dt; this.birthT = (this.birthT || 0) + dt;
    this.mother.root.rotation.y = turnToward(this.mother.root.rotation.y, Math.atan2(p.x - this.mx, p.z - this.mz), 1.2 * dt);
    if (this.cdAttack <= 0 && !this.over) { this.cdAttack = this.micDead ? 2.2 : 3.2; this.spitGlob(); }
    if (this.birthT > 8 && !this.over) { this.birthT = 0; for (let i = 0; i < 2; i++) a.spawn('limpet', this.mx + (i ? 2.5 : -2.5), this.mz + 2.5, { state: S.APPROACH }); this.births++; a.audio('skitter', this.mx, this.mz); }
  }
  spitGlob() {
    const a = this.area, p = a.player; a.audio('steam', this.mx, this.mz, 0.6);
    const g = a.spawnProjectile({ kind: 'bottle', x: this.mx, y: 3.4, z: this.mz, tx: p.x, tz: p.z, owner: this, speed: 8, arc: true, size: [0.45, 0.45, 0.45] });
    g.brine = true;
  }
  cacheZones() { if (this.phase === 3) { this.zones = null; return; } super.cacheZones(); }
  barInfo() { return { name: this.phase === 3 ? 'THE MOTHER' : this.barName, frac: this.phase === 3 ? ((this.mic?.hp > 0 ? this.mic.hp : 0) + (this.eye?.hp > 0 ? this.eye.hp : 0)) / 600 : this.totalFrac() }; }
  totalFrac() { return this.phase === 1 ? this.valves.reduce((a, w) => a + Math.max(0, w.hp), 0) / 560 : this.locks.reduce((a, w) => a + Math.max(0, w.hp), 0) / 180; }
  updateVisual(dt, alpha) {
    const h = this.h, root = h.root; const ix = this.px + (this.x - this.px) * alpha, iz = this.pz + (this.z - this.pz) * alpha;
    if (this.phase < 3) { root.position.set(ix, 0, iz); root.rotation.y = this.yaw; h.update(dt); h.placeShadow(0); this.cacheZones(); }
    else if (this.mother) { this.mother.root.position.set(this.mx, 0, this.mz); }
  }
}
