// Max. Reads an Intent per fixed step; plants her feet to aim; everything she does that takes time is a
// timed action with its own clip, so nothing cancels into anything by accident.
import { CharacterController, THREE, glowMaterial, PALETTE, SpringChain, Squash, toonMaterial, setLookLayer } from '../../pixel-engine.js';
import { MOVE, TUNING, CAM } from '../data/tuning.js';
import { GRENADES, KNIFE, WEAPONS, WEAPON_ORDER } from '../data/weapons.js';
import { ITEMS } from '../data/items.js';
import { app } from '../core/app.js';
import { Humanoid } from './actor.js';
import { fireWeapon, kickCone, knifeArc, takedownBurst } from './combat.js';
import { angleDiff } from './enemy.js';

const AIM_LEAN = [['Torso', 0.3], ['Head', 0.2], ['ArmR', 0.7], ['ArmL', 0.7]];

const { BoxGeometry, Group, Mesh, Quaternion, Vector3, Matrix4, Euler } = THREE;
const TOP = 12; // the controller's top speed; the move vector scales down from it
const vec = new Vector3();
const v2 = new Vector3();
const q1 = new Quaternion();
const q2 = new Quaternion();
const m1 = new Matrix4();
const YUP = new Vector3(0, 1, 0);
const BARKS = {
  kill: ['CLAIM CLOSED.', 'PRE-EXISTING CONDITION.', "YOU'RE NOT COVERED.", 'TOTAL LOSS.'],
  kick: ['DEDUCTIBLE.', 'EXCESS APPLIES.'],
  reload: ['ONE MOMENT, PLEASE.'],
  low: ["MY PREMIUM'S GOING UP."],
  empty: ["THAT'S NOT IN THE BUDGET."],
};
export { BARKS };

export class Player {
  constructor(area, ctx, { x, z, y = 0, yaw = 0, store, seat = 0, palette, isLocal = true, modelId = 'max' }) {
    this.area = area;
    this.ctx = ctx;
    this.store = store; // a Run
    this.seat = seat;
    this.isLocal = isLocal;
    this.remote = false;
    this.alive = true;
    this.ctrl = new CharacterController(ctx.physics, { position: [x, y, z], speed: TOP, radius: 0.3, halfHeight: 0.5 });
    { // See blockByBodies: the controller walks through enemies and other players, and the game stops her instead.
      const { softBodies } = area;
      softBodies.add(this.ctrl.collider.handle);
      const kcc = this.ctrl.controller; const move = kcc.computeColliderMovement.bind(kcc);
      kcc.computeColliderMovement = (collider, desired) => move(collider, desired, undefined, undefined, (other) => !softBodies.has(other.handle));
    }
    ctx.physics.tag(this.ctrl.collider, 'noCamera', 'player');
    this.actor = new Humanoid(modelId, { palette });
    this.root = this.actor.root;
    ctx.scene.add(this.root);
    this.facing = yaw;
    this.x = x; this.z = z; this.y = y;
    this.vx = 0; this.vz = 0;
    this.speed = 0;
    this.floor = 0;
    this.state = 'free';
    this.action = null;
    this.fireT = 0; this.reloadT = 0; this.reloadDur = 0; this.invuln = 0;
    this.aiming = false; this.aimBlend = 0;
    this.slowT = 0; this.slow = 1;
    this.grabbedBy = null; this.grabMash = 0;
    this.throwT = 0;
    this.fireAnimT = 0;
    this.grenadeCooldown = 0;
    this.hurtArcs = [];
    this.barkT = 0;
    this.lowBarked = false;
    this.heartT = 0;
    this.stepT = 0;
    this.shots = 0; this.hits = 0;
    this.buildGuns();
    this.buildTails();
    this.laser = new Mesh(new BoxGeometry(0.02, 0.02, 1), glowMaterial(0xff3030));
    this.laser.castShadow = false;
    this.laser.visible = false;
    ctx.scene.add(this.laser);
    this.fill = ctx.lights.request({ follow: this.root, offset: [0.3, 1.8, 0.5], color: 0xffe0a0, intensity: 1.2, radius: 5, priority: 8 });
    this.actor.play('Idle');
    this.muzzle = new Vector3(x, y + 1.2, z);
    this.laserHit = new Vector3();
    this.laserZone = null;
    this.laserOn = false;
    this.squash = new Squash();
    this.squash.amount = 1.4;
  }
  get hp() { return this.store.health; }
  set hp(v) { this.store.health = v; }
  get maxHp() { return this.store.maxHealth; }
  get weapon() { return this.store.weaponStats(); }
  get mag() { return this.store.weapons[this.store.equipped]?.mag ?? 0; }
  set mag(v) { this.store.weapons[this.store.equipped].mag = v; }

  buildGuns() {
    this.guns = {};
    this.knifeObj = this.actor.attach('HandR', 'w-knife', { at: [0, -0.06, 0.02], rot: [Math.PI / 2, 0, 0] });
    this.knifeObj.visible = false;
    for (const id of WEAPON_ORDER) {
      const pivot = this.actor.attach('HandR', WEAPONS[id].model, { at: [0, -0.08, 0.02], rot: [Math.PI / 2, 0, 0] });
      pivot.visible = false;
      this.guns[id] = pivot;
    }
    this.showGun();
  }
  showGun() {
    const eq = this.store.equipped;
    if (!this.guns[eq]) return;
    for (const id of WEAPON_ORDER) this.guns[id].visible = id === eq;
  }

  /** The scarf and the coat's back flap: spring chains of little boxes in world space. */
  buildTails() {
    const { scene } = this.ctx;
    const makeChain = (segments, length, rest, size, color, stiffness, gravity) => {
      const chain = new SpringChain({ segments, length, rest, stiffness, gravity });
      const group = new Group();
      setLookLayer(group, 'actors');
      const boxes = [];
      for (let i = 0; i < segments; i++) {
        const m = new Mesh(new BoxGeometry(size[0], size[1], length * 1.05), toonMaterial(color));
        m.castShadow = true;
        group.add(m);
        boxes.push(m);
      }
      scene.add(group);
      return { chain, boxes, group };
    };
    this.scarf = makeChain(5, 0.13, [0.15, -0.2, -1], [0.1, 0.04], PALETTE.red, 7, 3.5);
    this.flap = makeChain(3, 0.2, [0, -1, -0.2], [0.32, 0.03], PALETTE.slate, 16, 6);
    this.tailReady = false;
  }

  updateTails(dt) {
    const f = this.root.rotation.y;
    const fwd = [Math.sin(f), 0, Math.cos(f)];
    const right = [-Math.cos(f), 0, Math.sin(f)];
    const up = [0, 1, 0];
    const basis = [right, up, fwd];
    const apply = (t, rootPos, joinOffset) => {
      if (!this.tailReady) t.chain.reset(rootPos, basis);
      t.chain.update(Math.min(dt, 1 / 30), rootPos, basis);
      const pts = t.chain.points;
      for (let i = 0; i < t.boxes.length; i++) {
        const a = pts[i]; const b = pts[i + 1];
        const m = t.boxes[i];
        m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
        vec.set(b[0], b[1], b[2]);
        m.lookAt(vec);
      }
    };
    const neck = this.actor.worldOf('Head', v2);
    apply(this.scarf, [neck.x, neck.y - 0.03, neck.z]);
    const hip = this.actor.worldOf('Pelvis', v2);
    apply(this.flap, [hip.x - fwd[0] * 0.17, hip.y - 0.12, hip.z - fwd[2] * 0.17]);
    this.tailReady = true;
  }

  setVisible(v) {
    this.root.visible = v;
    this.scarf.group.visible = v;
    this.flap.group.visible = v;
    if (!v) this.laser.visible = false;
  }

  teleport(x, y, z, yaw) {
    this.ctrl.teleport([x, y, z]);
    this.x = x; this.y = y; this.z = z;
    if (yaw !== undefined) this.facing = yaw;
    this.vx = 0; this.vz = 0;
    this.tailReady = false;
  }

  // ---- Fixed step ----
  fixed(dt, it) {
    const { area } = this;
    const f = this.ctrl.feet;
    this.x = f.x; this.y = f.y; this.z = f.z;
    this.fireT -= dt; this.invuln -= dt; this.grenadeCooldown -= dt; this.fireAnimT -= dt;
    if (this.slowT > 0) { this.slowT -= dt; if (this.slowT <= 0) this.slow = 1; }
    if (this.barkT > 0) this.barkT -= dt;
    if (this.reloadT > 0) {
      this.reloadT -= dt;
      this.reloadSfx(dt);
      if (this.reloadT <= 0) this.finishReload();
    }
    if (!this.alive) { this.stay(dt); return; }
    if (it.setYaw !== null) area.cam.yaw = it.setYaw;
    if (it.setPitch !== null) area.cam.pitch = it.setPitch;

    switch (this.state) {
      case 'free': this.stepFree(dt, it); break;
      case 'action': this.stepAction(dt, it); break;
      case 'grabbed': this.stepGrabbed(dt, it); break;
      case 'script': this.stay(dt); break;
      default: this.stay(dt); break;
    }
    // Health warnings.
    if (this.isLocal && this.hp < this.maxHp * 0.25) {
      if (!this.lowBarked) { this.lowBarked = true; area.maxBark(BARKS.low[0]); }
    } else if (this.hp > this.maxHp * 0.5) this.lowBarked = false;
    if (!this.isLocal) return;
    if (app.dev.infiniteAmmo) { this.mag = Math.max(this.mag, this.weapon.mag); this.reloadT = 0; }
    if (app.dev.god) this.hp = this.maxHp;
  }

  stay(dt) {
    this.ctrl.setInput(vec.set(0, 0, 0), false, false);
    this.ctrl.fixedUpdate(dt);
    this.vx = 0; this.vz = 0; this.speed = 0;
  }

  stepFree(dt, it) {
    const { area } = this;
    const yaw = area.cam.yaw;
    let aim = it.aim && !area.noAim;
    this.aiming = aim;
    this.aimBlend = Math.min(1, Math.max(0, this.aimBlend + (aim ? dt / CAM.ease : -dt / CAM.ease)));
    // Movement: plant your feet.
    const mag = Math.min(1, Math.hypot(it.moveX, it.moveY));
    let want = 0;
    if (aim) want = TUNING.aimWalkSpeed * (mag > 0.1 ? 1 : 0);
    else if (mag > 0.05) want = it.run ? TUNING.runSpeed : (mag < MOVE.slowTilt ? MOVE.slowSpeed : TUNING.walkSpeed);
    want *= this.slow * this.surfaceSlow();
    const fx = Math.sin(yaw); const fz = Math.cos(yaw);
    const rx = -Math.cos(yaw); const rz = Math.sin(yaw);
    let dirX = 0; let dirZ = 0;
    if (mag > 0.05) { dirX = (rx * it.moveX + fx * it.moveY) / mag; dirZ = (rz * it.moveX + fz * it.moveY) / mag; }
    const tx = dirX * want; const tz = dirZ * want;
    const ax = tx - this.vx; const az = tz - this.vz;
    const al = Math.hypot(ax, az);
    const maxA = MOVE.accel * dt;
    if (al > maxA) { this.vx += (ax / al) * maxA; this.vz += (az / al) * maxA; } else { this.vx = tx; this.vz = tz; }
    if (app.dev.noclip && this.isLocal) {
      const s = (it.run ? 12 : 7);
      this.ctrl.teleport([this.x + dirX * s * dt, this.y, this.z + dirZ * s * dt]);
      this.speed = mag > 0.05 ? s : 0;
    } else this.moveBody(dt, this.vx, this.vz);
    // Facing.
    if (aim) this.facing += angleDiff(yaw, this.facing) * Math.min(1, dt * 18);
    else if (Math.hypot(this.vx, this.vz) > 0.4) {
      const a = Math.atan2(this.vx, this.vz);
      const d = angleDiff(a, this.facing);
      const m = MOVE.turnRate * dt;
      this.facing += Math.max(-m, Math.min(m, d));
    }
    // Things you can press.
    if (it.turn && !aim) { this.startTurn(); return; }
    if (it.swap) area.shoulder *= -1;
    if (it.reload) this.startReload();
    if (it.heal) this.useBestHerb();
    if (it.command) area.onCommand?.();
    if (it.nextWeapon) this.cycleWeapon(1);
    if (it.prevWeapon) this.cycleWeapon(-1);
    if (it.slot >= 0) this.selectSlot(it.slot);
    if (it.action && area.interact?.use(this)) return;
    if (it.knife && !aim) { this.startKnife(); return; }
    if (it.throw && aim) this.throwGrenade();
    if (aim && (it.fire || it.firePressed)) this.tryFire(it);
  }

  /** Conveyors and the shallows: added or scaled by the cell under the feet. */
  /**
   * Bodies are solid, but not to the character controller: an enemy walks into her, and once anything overlaps the
   * controller's capsule it reports a hit at zero distance whichever way she goes, so she couldn't move at all, not even
   * away. So it ignores them (see the constructor), and here she just can't walk into one: the part of her move that goes
   * into a body is taken off, and walking away or sliding past is always free.
   */
  blockByBodies(v) {
    const { area } = this;
    for (const e of area.enemies) {
      if (e.dead || !e.body || e.floor !== this.floor || Math.abs((e.y ?? 0) - this.y) > 1.2) continue;
      const reach = (e.d.crawler ? 0.18 : 0.28 * (e.scale ?? 1)) + 0.3;
      const dx = this.x - e.x; const dz = this.z - e.z; const dd = dx * dx + dz * dz;
      if (dd > reach * reach || dd < 1e-6) continue;
      const d = Math.sqrt(dd); const nx = dx / d; const nz = dz / d;
      const into = v[0] * nx + v[1] * nz;
      if (into < 0) { v[0] -= into * nx; v[1] -= into * nz; }
    }
    return v;
  }

  moveBody(dt, vxIn, vzIn) {
    const { area } = this;
    const [vx, vz] = this.blockByBodies([vxIn, vzIn]);
    let bx = 0; let bz = 0;
    const belt = this.floor === 0 ? area.level.beltAt(this.x, this.z) : null;
    if (belt) { bx = belt.v[0]; bz = belt.v[1]; }
    const px = (vx + bx) / TOP; const pz = (vz + bz) / TOP;
    this.ctrl.setInput(vec.set(px, 0, pz), false, false);
    this.ctrl.fixedUpdate(dt);
    this.speed = Math.hypot(vx, vz);
    this.stepUnjam(dt, Math.hypot(px, pz));
  }

  /**
   * Two props a body's width apart can jam the controller, so that no direction moves her. Nobody should have to
   * reload for that: pushing for a while and getting nowhere, off the walkable grid, she comes out on the nearest open cell.
   */
  stepUnjam(dt, push) {
    const { area } = this;
    const moved = Math.hypot(this.x - (this.jamX ?? this.x), this.z - (this.jamZ ?? this.z));
    this.jamX = this.x; this.jamZ = this.z;
    const { nav, info } = area.level;
    if (push < 0.2 || moved > 0.004 || this.floor !== 0 || nav.walkable(this.x, this.z)) { this.jamT = 0; return; }
    this.jamT = (this.jamT ?? 0) + dt;
    if (this.jamT < 1.5) return;
    this.jamT = 0;
    const c0 = info.col(this.x); const r0 = info.row(this.z);
    let best = null; let bd = Infinity;
    for (let c = c0 - 4; c <= c0 + 4; c++) {
      for (let r = r0 - 4; r <= r0 + 4; r++) {
        const x = info.x(c); const z = info.z(r);
        const d = Math.hypot(x - this.x, z - this.z);
        if (d < bd && nav.walkable(x, z)) { bd = d; best = [x, z]; }
      }
    }
    if (best) this.teleport(best[0], this.y, best[1]);
  }

  surfaceSlow() {
    const { area } = this;
    if (this.floor !== 0) return 1;
    const ch = area.level.info.at(this.x, this.z);
    let s = ch === '%' ? 0.7 : 1;
    if (area.tide) s = Math.min(s, area.tide.speedScale(this));
    return s;
  }

  applySlow(scale, seconds) { this.slow = Math.min(this.slow, scale); this.slowT = Math.max(this.slowT, seconds); }

  // ---- Actions ----
  doAction(name, dur, { clip, rate = 1, invuln = 0, at, onEnd, from, to, y0, y1, fade = 0.08, keepAim = false } = {}) {
    this.state = 'action';
    this.aiming = keepAim && this.aiming;
    this.action = { name, t: 0, dur, at, fired: false, onEnd, from, to, y0, y1 };
    if (invuln) this.invuln = Math.max(this.invuln, invuln);
    if (clip) { this.actor.clearUpper(0.05); this.actor.play(clip, { once: !['LadderUp'].includes(clip), fade, rate }); }
    this.vx = 0; this.vz = 0;
  }

  stepAction(dt, it) {
    const A = this.action;
    A.t += dt;
    this.aimBlend = Math.max(0, this.aimBlend - dt / CAM.ease);
    if (A.at && !A.fired && A.t >= A.at[0]) { A.fired = true; A.at[1](); }
    if (A.from) {
      const t = Math.min(1, A.t / A.dur);
      this.actionPos = { x: A.from[0] + (A.to[0] - A.from[0]) * t, z: A.from[1] + (A.to[1] - A.from[1]) * t, y: (A.y0 ?? this.y) + ((A.y1 ?? A.y0 ?? this.y) - (A.y0 ?? this.y)) * t };
    }
    this.stay(dt);
    if (A.t >= A.dur) {
      this.state = 'free';
      this.action = null;
      this.actionPos = null;
      A.onEnd?.();
      this.actor.baseName = null;
    }
  }

  startTurn() {
    const { area } = this;
    this.doAction('turn', MOVE.quickTurn, { clip: 'QuickTurn' });
    const from = area.cam.yaw;
    const to = from + Math.PI;
    area.ctx.tweens.value(from, to, { duration: MOVE.quickTurn, ease: 'outSine' }, (v) => { area.cam.yaw = v; });
    this.facing = to;
  }

  startKnife() {
    this.knifeObj.visible = true;
    for (const id of WEAPON_ORDER) this.guns[id].visible = false;
    this.ctx.audio.play('knife');
    this.doAction('knife', KNIFE.time, {
      clip: 'KnifeSlash',
      at: [0.12, () => (this.area.resolveKnife ? this.area.resolveKnife(this, KNIFE) : knifeArc(this.area, this, KNIFE))],
      onEnd: () => { this.knifeObj.visible = false; this.showGun(); },
    });
  }

  startKick(target) {
    const { area, ctx } = this;
    this.facing = Math.atan2(target.x - this.x, target.z - this.z);
    ctx.audio.play('kickWhoosh');
    this.doAction('kick', 0.66, {
      clip: 'Roundhouse', invuln: 0.5,
      at: [0.26, () => {
        const n = area.resolveKick ? area.resolveKick(this, target) : kickCone(area, this, target);
        ctx.engine.hitstop(0.05);
        ctx.engine.shake.add(0.35);
        ctx.audio.play('kickImpact');
        area.fx.kickBurst(this);
        this.store.stats.kicks++;
        area.rumble(0.8, 0.3, 120);
        if (this.barkT <= 0 && n && this.isLocal) { this.barkT = 6; area.maxBark(ctx.random.pick(BARKS.kick)); }
        area.dame?.onKick?.();
      }],
    });
  }

  startTakedown(target) {
    const { area, ctx } = this;
    this.facing = Math.atan2(target.x - this.x, target.z - this.z);
    ctx.audio.play('kickWhoosh');
    this.doAction('takedown', 0.93, {
      clip: 'HipThrow', invuln: 0.7,
      at: [0.5, () => {
        if (area.resolveTakedown) area.resolveTakedown(this, target); else takedownBurst(area, this, target);
        ctx.engine.hitstop(0.05);
        ctx.engine.shake.add(0.35);
        ctx.audio.play('kickImpact');
        this.store.stats.kicks++;
      }],
    });
  }

  startReload() {
    const s = this.weapon;
    if (this.reloadT > 0) return;
    if (this.mag >= s.mag) return;
    if (this.store.case.count(s.ammo) <= 0 && !app.dev.infiniteAmmo) {
      this.ctx.audio.play('dryClick');
      if (this.barkT <= 0 && this.isLocal) { this.barkT = 5; this.area.maxBark(BARKS.empty[0]); }
      return;
    }
    this.reloadDur = s.reload / TUNING.reloadSpeed;
    this.reloadT = this.reloadDur;
    this.reloadStep = 0;
    this.actor.upper(s.reloadClip, { once: true, fade: 0.1, rate: (this.actor.lib[s.reloadClip].full.duration) / this.reloadDur });
    if (this.barkT <= 0 && this.isLocal && this.ctx.random.chance(0.18)) { this.barkT = 8; this.area.maxBark(BARKS.reload[0]); }
  }

  reloadSfx() {
    const s = this.weapon;
    const list = s.reloadSfx;
    const p = 1 - this.reloadT / this.reloadDur;
    const want = Math.floor(p * list.length);
    if (want > (this.reloadStep ?? 0) - 1 && this.reloadStep < list.length && want >= this.reloadStep) {
      this.ctx.audio.play(list[this.reloadStep]);
      this.reloadStep++;
    }
  }

  finishReload() {
    const s = this.weapon;
    const need = s.mag - this.mag;
    const got = app.dev.infiniteAmmo ? need : this.store.case.takeStack(s.ammo, need);
    this.mag += got;
    this.actor.clearUpper(0.12);
    this.store.flags.__dirtyCase = true;
  }

  cancelReload() {
    if (this.reloadT > 0) { this.reloadT = 0; this.actor.clearUpper(0.1); }
  }

  selectSlot(n) {
    const list = this.store.ownedWeapons();
    if (list[n]) this.equip(list[n]);
  }
  cycleWeapon(dir) {
    const list = this.store.ownedWeapons();
    if (list.length < 2) return;
    const i = list.indexOf(this.store.equipped);
    this.equip(list[(i + dir + list.length) % list.length]);
  }
  equip(id) {
    if (this.store.equipped === id || !this.store.weapons[id]) return;
    this.cancelReload();
    this.store.equipped = id;
    this.showGun();
    this.fireT = 0.25;
    this.ctx.audio.play('reloadIn', { pitch: -4 });
    this.actor.overlay = null;
  }

  tryFire(it) {
    const { area, ctx } = this;
    if (this.fireT > 0 || this.reloadT > 0 || this.aimBlend < 0.55) return;
    const s = this.weapon;
    if (this.mag <= 0) {
      if (it.firePressed) {
        ctx.audio.play('dryClick');
        this.fireT = 0.2;
        if (this.store.case.count(s.ammo) > 0) this.startReload();
        else if (this.barkT <= 0 && this.isLocal) { this.barkT = 5; area.maxBark(BARKS.empty[0]); }
      }
      return;
    }
    this.fireT = s.interval / TUNING.fireRate;
    if (!app.dev.infiniteAmmo) this.mag -= 1;
    this.store.stats.shots++;
    area.aimRay();
    const r = area.resolveShot ? area.resolveShot(this, s, area.rayO, area.rayD) : fireWeapon(area, this, s, area.rayO, area.rayD, ctx.random);
    this.store.stats.hits += r.hits ? 1 : 0;
    this.store.stats.heads += r.heads;
    this.onShot(s);
    if (r.hits) area.director?.noteHit();
    else area.director?.noteMiss();
    area.onPlayerFired?.(this, s, r);
  }

  onShot(s) {
    const { area, ctx } = this;
    ctx.audio.play(s.sound, { pitch: ctx.random.range(-0.6, 0.6) });
    const kick = s.pellets > 1 ? 0.04 : s.id === 'rifle' ? 0.05 : s.id === 'harpoon' ? 0.04 : 0.012;
    area.cam.recoil += kick;
    ctx.engine.shake.add(s.pellets > 1 ? 0.22 : s.id === 'rifle' ? 0.26 : 0.12);
    area.fx.muzzle(this.muzzle, s);
    this.fireAnimT = 0.14;
    this.actor.upper(s.fireClip, { once: true, fade: 0.02 });
    area.rumble(s.pellets > 1 ? 0.7 : 0.35, 0.25, 90);
    area.alertNear(this, 15);
  }

  throwGrenade() {
    const { area } = this;
    if (this.grenadeCooldown > 0) return;
    const id = this.pickGrenade();
    if (!id) return;
    this.grenadeCooldown = 0.6;
    this.store.case.takeStack(id, 1);
    this.ctx.audio.play('throwWhoosh');
    area.throwGrenade(this, id, this.laserHit);
    this.actor.upper('Throw', { once: true, fade: 0.05 });
    this.fireAnimT = 0.45;
  }

  pickGrenade() {
    const pref = this.store.grenade;
    if (pref && this.store.case.count(pref) > 0) return pref;
    for (const id of ['depth', 'flare', 'oil']) if (this.store.case.count(id) > 0) return id;
    return null;
  }

  /** The herb that heals enough with least waste. */
  useBestHerb() {
    const { store: s } = this;
    if (this.hp >= this.maxHp - 0.5) return false;
    const need = (this.maxHp - this.hp) / this.maxHp;
    let best = null; let bestScore = Infinity;
    for (const it of s.case.items) {
      const d = ITEMS[it.id];
      if (d.kind !== 'herb' || !d.heal) continue;
      const score = Math.abs(d.heal - need) + (d.heal < need ? 0.5 : 0) + (d.maxUp ? 0.2 : 0);
      if (score < bestScore) { bestScore = score; best = it; }
    }
    if (!best) { this.ctx.audio.play('uiDeny'); return false; }
    this.useHerb(best);
    return true;
  }

  useHerb(item) {
    const d = ITEMS[item.id];
    this.store.case.remove(item);
    if (d.maxUp) this.store.maxHealth += d.maxUp;
    this.hp = Math.min(this.maxHp, this.hp + d.heal * this.maxHp);
    this.ctx.audio.play('heal');
    this.ctx.particles.burst('sparkle', [this.x, this.y + 1, this.z], { count: 12, colors: ['lime', 'white'] });
  }

  // ---- Being hit ----
  hurt(raw, from, o = {}) {
    if (!this.alive || (this.invuln > 0 && !o.dot) || o.script) return false;
    if (app.dev.god && this.isLocal) return false;
    // No damage, no hit: nothing that does no harm gets to stagger her or cancel a reload.
    if (raw <= 0) return false;
    const { area, ctx, store } = this;
    const mul = store.diff.enemyDamage * TUNING.damageTaken;
    const dmg = raw * mul;
    this.hp -= dmg;
    store.noDamageStreak = 0;
    area.director?.noteHurt();
    if (o.dot) { if (this.hp <= 0) this.die(); return true; }
    const dirx = (from?.x ?? this.x) - this.x; const dirz = (from?.z ?? this.z) - this.z;
    area.hud?.addHurtArc(dirx, dirz);
    this.actor.flash(2);
    ctx.audio.play('maxHurt');
    ctx.engine.shake.add(Math.min(0.6, 0.18 + dmg / 80));
    area.rumble(1, 0.6, 220);
    area.fx.blood(this.x, this.y + 1.1, this.z);
    if (this.hp <= 0) { this.die(); return true; }
    // A hit staggers her and doesn't undo the reload: a 2.4 s pump against a flail every couple of seconds could otherwise never finish.
    this.invuln = MOVE.hitGrace;
    if (this.state === 'free' && !o.noStagger) {
      if (o.knock) this.startKnockdown();
      else this.doAction('stagger', 0.3, { clip: 'Stagger' });
    }
    return true;
  }

  startKnockdown() {
    this.invuln = 1.6;
    this.doAction('down', 1.0, { clip: 'KnockedDown', onEnd: () => { this.doAction('up', 0.8, { clip: 'GetUp' }); this.invuln = 0.9; } });
  }

  canBeGrabbed() { return this.alive && this.state === 'free' && this.invuln <= 0 && !this.grabbedBy; }

  startGrab(enemy, dps, slow) {
    this.state = 'grabbed';
    this.grabbedBy = enemy;
    this.grabDps = dps;
    this.grabMash = 0;
    this.grabSlow = slow;
    this.cancelReload();
    this.actor.clearUpper(0.1);
    this.actor.play('Hurt', { fade: 0.1 });
    this.area.hud?.showMash(true);
  }

  stepGrabbed(dt, it) {
    this.aiming = false;
    this.aimBlend = Math.max(0, this.aimBlend - dt / CAM.ease);
    this.stay(dt);
    const e = this.grabbedBy;
    if (it.action || it.dodge) { this.grabMash += 0.24; this.ctx.audio.play('qtePop', { pitch: this.grabMash * 8, volume: 0.6 }); }
    this.grabMash = Math.max(0, this.grabMash - dt * 0.18);
    this.hurt(this.grabDps * dt, e, { dot: true });
    if (!this.alive) { this.area.hud?.showMash(false); this.grabbedBy = null; return; }
    if (this.grabMash >= 1 || !e || e.dead || e.state !== 'GRAB') {
      this.releaseGrab();
    }
  }

  releaseGrab() {
    const e = this.grabbedBy;
    this.grabbedBy = null;
    this.state = 'free';
    this.invuln = 0.8;
    this.area.hud?.showMash(false);
    this.actor.baseName = null;
    if (e && !e.dead) e.knockdown(vec.set(e.x - this.x, 0, e.z - this.z).normalize());
    if (this.grabSlow) this.applySlow(0.6, 1.5);
  }

  /** Killed: slow fall, sting, the stamp. The area decides what happens next. */
  die() {
    if (!this.alive) return;
    this.alive = false;
    this.hp = 0;
    this.state = 'dead';
    this.grabbedBy = null;
    this.area.hud?.showMash(false);
    this.cancelReload();
    this.actor.clearUpper(0.05);
    this.actor.play('Death', { once: true, fade: 0.1, rate: 0.7 });
    this.ctx.audio.play('sting');
    this.area.onPlayerDied(this);
  }

  /** A revive in co-op, or a checkpoint respawn. */
  revive(hp) {
    this.alive = true;
    this.state = 'free';
    this.hp = hp;
    this.invuln = 2;
    this.actor.baseName = null;
    this.actor.play('GetUp', { once: true });
  }

  // ---- Per frame ----
  frame(dt, alpha) {
    const { area } = this;
    const F = this.ctrl.interpolatedFeet(alpha);
    const P = this.actionPos;
    let ox = 0;
    let oy = 0;
    if (this.floor === 0) {
      const ch = area.level.info.at(F.x, F.z);
      if (ch === '%') oy = -0.22; // standing in it
      if (ch === ',' && area.tide) oy = area.tide.rockY;
    }
    this.footOffset = (this.footOffset ?? 0) + (oy - (this.footOffset ?? 0)) * Math.min(1, dt * 8);
    if (P) this.root.position.set(P.x, P.y, P.z);
    else this.root.position.set(F.x, F.y + this.footOffset + ox, F.z);
    this.root.rotation.y = this.facing;
    this.animate(dt);
    this.actor.update(dt);
    this.squash.update(dt);
    const [sh, sv] = this.squash.scale();
    this.root.scale.set(sh, sv, sh);
    this.applyAimPose();
    this.root.updateMatrixWorld(true);
    this.updateMuzzleAndLaser();
    if (this.root.visible) this.updateTails(dt);
    this.footsteps(dt);
    this.updateHeart(dt);
  }

  animate(dt) {
    const a = this.actor;
    if (this.state === 'free') {
      const sp = Math.hypot(this.vx, this.vz);
      if (sp > 0.1) {
        const clip = sp > 3.6 ? 'Run' : 'Walk';
        a.loco(clip, sp, { fade: 0.14 });
      } else if (a.baseName !== 'Idle') {
        a.play('Idle', { fade: 0.18 });
      }
      const s = this.weapon;
      if (this.reloadT > 0) { /* the reload clip is on */ }
      else if (this.fireAnimT > 0) { /* recoil or throw is on */ }
      else if (this.aiming) {
        if (a.overlay !== s.aimClip) a.upper(s.aimClip, { fade: 0.12 });
      } else if (a.overlay) a.clearUpper(0.18);
    }
  }

  applyAimPose() {
    const { area } = this;
    const j = this.actor.joints;
    // Only the joints this frame's clips touch get reset, so last frame's lean comes off first. Left on, it adds up,
    // and anyone holding aim for long enough slowly tips over.
    this.aimLean ??= AIM_LEAN.map(([name, amount]) => ({ name, amount, before: new THREE.Quaternion(), after: new THREE.Quaternion(), on: false }));
    for (const l of this.aimLean) {
      const q = j[l.name].quaternion;
      if (l.on && q.equals(l.after)) q.copy(l.before);
      l.on = false;
    }
    if (this.aimBlend <= 0.01 || this.state !== 'free') return;
    const p = area.cam.pitch * this.aimBlend;
    // Add the pitch to the torso, head and arms, so the gun follows the laser.
    for (const l of this.aimLean) {
      const joint = j[l.name];
      l.before.copy(joint.quaternion);
      joint.rotateX(-p * l.amount);
      l.after.copy(joint.quaternion);
      l.on = true;
    }
  }

  updateMuzzleAndLaser() {
    const { area } = this;
    const eq = this.store.equipped;
    const gun = this.guns[eq];
    const s = WEAPONS[eq];
    const lenMap = { pistol: 0.3, scatter: 0.62, rifle: 0.88, harpoon: 0.7 };
    if (this.aimBlend > 0.05 && this.state === 'free') {
      // Point the gun exactly down the aim ray.
      const parent = gun.parent;
      parent.updateWorldMatrix(true, false);
      parent.getWorldQuaternion(q1).invert();
      area.aimRay();
      gun.getWorldPosition(v2);
      const target = vec.copy(v2).addScaledVector(area.rayD, 1);
      m1.lookAt(target, v2, YUP); // +Z of the gun toward the target
      q2.setFromRotationMatrix(m1);
      gun.quaternion.copy(q1).multiply(q2);
      gun.getWorldPosition(this.muzzle);
      this.muzzle.addScaledVector(area.rayD, lenMap[eq] ?? 0.4);
    } else {
      gun.rotation.set(Math.PI / 2, 0, 0);
      this.muzzle.copy(this.root.position);
      this.muzzle.y += 1.2;
    }
    // The laser.
    const scoped = this.weapon.scope && this.aiming;
    const on = this.isLocal && this.aiming && this.aimBlend > 0.4 && this.state === 'free' && !scoped;
    this.laserOn = this.isLocal && this.aiming && this.aimBlend > 0.4 && this.state === 'free';
    if (this.laserOn) {
      const hit = area.aimTrace();
      this.laserHit.copy(area.rayHitPoint);
      this.laserZone = hit?.kind === 'enemy' ? hit.zone : null;
    }
    this.laser.visible = on;
    if (on) {
      const len = this.muzzle.distanceTo(this.laserHit);
      this.laser.position.copy(this.muzzle).lerp(this.laserHit, 0.5);
      this.laser.scale.set(1, 1, Math.max(0.01, len));
      this.laser.lookAt(this.laserHit);
    }
  }

  footsteps(dt) {
    const sp = Math.hypot(this.vx, this.vz);
    if (sp < 0.5 || this.state !== 'free') { this.stepT = 0; return; }
    this.stepT -= dt * sp;
    if (this.stepT <= 0) {
      this.stepT = 1.55;
      const ch = this.floor === 0 ? this.area.level.info.at(this.x, this.z) : ':';
      this.ctx.audio.play(ch === '%' ? 'wade' : 'step', { volume: this.isLocal ? 0.8 : 0.3 });
    }
  }

  updateHeart(dt) {
    if (!this.isLocal) return;
    if (this.alive && this.hp < this.maxHp * 0.25) {
      this.heartT -= dt;
      if (this.heartT <= 0) { this.heartT = 0.9; this.ctx.audio.play('heartbeat'); }
    } else this.heartT = 0;
  }

  dispose() {
    this.actor.dispose();
  }
}
export { GRENADES };
