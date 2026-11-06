// Vehicles: pickup, technical, cargo truck, tanker. Driving in first person, damage, repair, patrol AI, the mounted gun.
import { THREE, Vehicle, buildModel, setLookLayer, RAPIER } from '../../pixel-engine.js';
import { CATALOG } from '../art/catalog.js';
import { TUNING } from '../core/tuning.js';
import { consume, held, pressed } from '../core/actions.js';
import { ROADS } from '../content/roads.js';

const V3 = THREE.Vector3;
const TYPES = {
  pickup: { model: 'pickup', size: [0.95, 0.45, 2.2], mass: 12, power: 160, topSpeed: 26, wheelRadius: 0.42, suspension: 0.45, stiffness: 30, grip: 2.6, seat: [-0.45, 0.95, 0.5], hp: 100 },
  technical: { model: 'technical', size: [0.95, 0.45, 2.2], mass: 13, power: 160, topSpeed: 25, wheelRadius: 0.42, suspension: 0.45, stiffness: 30, grip: 2.6, seat: [-0.45, 0.95, 0.5], hp: 110, gun: [0, 1.7, -1.0] },
  cargo: { model: 'cargo-truck', size: [1.1, 0.5, 3.0], mass: 22, power: 240, topSpeed: 20, wheelRadius: 0.5, suspension: 0.5, stiffness: 36, grip: 2.4, seat: [-0.5, 1.9, 1.9], hp: 140 },
  tanker: { model: 'tanker', size: [1.1, 0.5, 3.0], mass: 24, power: 240, topSpeed: 19, wheelRadius: 0.5, suspension: 0.5, stiffness: 36, grip: 2.4, seat: [-0.5, 1.9, 1.9], hp: 140, explosive: true },
};
export class Veh {
  constructor(sys, type, at, yaw, o = {}) {
    const g = sys.g; this.sys = sys; this.g = g; this.type = type; const T = TYPES[type]; this.T = T;
    this.id = ++sys.nid; this.kind = 'vehicle'; this.hp = this.maxHp = T.hp; this.stalled = false; this.burning = false; this.burnT = 0; this.driver = null; this.tag = o.tag || null; this.wreck = false;
    this.ai = o.ai || null; this.crew = []; this.gunner = null; this.heat = 0; this.overheat = 0; this.repairing = 0; this.smoke = 0; this.noDriver = false; this.coast = 0;
    const y = g.world.heightAt(at[0], at[1]) + 1.2;
    this.v = new Vehicle(g.ctx.physics, { at: [at[0], y, at[1]], yaw, size: T.size, mass: T.mass, power: T.power, topSpeed: T.topSpeed, wheelRadius: T.wheelRadius, suspension: T.suspension, stiffness: T.stiffness, grip: T.grip });
    this.group = new THREE.Group();
    const b = buildModel(T.model, { catalog: CATALOG }); this.body = b.object; this.body.position.y = -T.size[1] - 0.05; this.group.add(this.body);
    this.gunNode = this.body.getObjectByName('Gun');
    setLookLayer(this.group, 'actors');
    this.wheels = [0, 1, 2, 3].map(() => { const w = buildModel('wheel', { catalog: CATALOG }).object; w.traverse((m) => { m.castShadow = true; m.frustumCulled = false; }); g.ctx.scene.add(w); return w; });
    this.group.traverse((m) => { m.castShadow = true; m.frustumCulled = false; });
    g.ctx.scene.add(this.group); g.ctx.physics.bind(this.v.body, this.group);
    this.pos = new V3(at[0], y, at[1]); this.lastSpeed = 0; this.col = this.v.body.collider(0); if (this.col) sys.byCollider.set(this.col.handle, this);
    this.seatW = new V3(); this.fwd = new V3();
  }
  get yaw() { return this.v.yaw; }
  position(out) { const t = this.v.body.translation(); return out.set(t.x, t.y, t.z); }
  seatWorld(out) { const [sx, sy, sz] = this.T.seat; const q = this.v.body.rotation(); const p = this.v.body.translation(); out.set(sx, sy - this.T.size[1], sz).applyQuaternion(new THREE.Quaternion(q.x, q.y, q.z, q.w)).add(new V3(p.x, p.y, p.z)); return out; }
  speed() { return this.v.speed; }
  power() { return this.hp < 35 ? 0.6 : 1; }
  dead() { return this.hp <= 0 || this.stalled || this.wreck; }
  damage(d, by) {
    if (this.wreck) return; this.hp = Math.max(0, this.hp - d / TUNING.vehicleToughness);
    if (this.hp <= 0) { if (!this.burning && !this.stalled) { this.stalled = true; this.g.sfx('cough', { pos: this.pos }); this.g.events.emit('stalled', this); } }
    else if (this.hp < 10 && !this.burning) this.setFire();
  }
  setFire() { if (this.burning) return; this.burning = true; this.burnT = 8; this.g.events.emit('vehicleburn', this); }
  explode() {
    if (this.wreck) return; this.wreck = true; const p = this.position(new V3()); this.g.explode(p, this.T.explosive ? 12 : 7, this.T.explosive ? 190 : 130, { by: 'blast', ignite: true });
    if (this.driver === 'player') this.sys.exit(true);
    this.hp = 0; this.body.visible = true; this.g.events.emit('vehiclewreck', this); for (const c of this.crew) c.kill?.();
  }
  repair() { this.hp = Math.max(this.hp, 50); this.stalled = false; this.burning = false; this.g.sfx('starter', { pos: this.pos }); this.coast = 3; this.g.events.emit('repaired', this); }
  step(dt) {
    const g = this.g; this.position(this.pos);
    let throttle = 0, steer = 0, hb = false, brake = false;
    if (this.driver === 'player') { ({ throttle, steer, hb, brake } = this.sys.playerInput(g)); }
    else if (this.ai) ({ throttle, steer, brake } = this.sys.aiInput(this, dt));
    if (this.dead() || this.coast > 0 && this.driver) { if (this.coast > 0) { this.coast -= dt; throttle *= 0.0; } else throttle = 0; }
    if (this.repairing) throttle = 0;
    this.v.o.topSpeed = TUNING.vehicleTopSpeed * (this.T.topSpeed / 26) * this.power();
    this.v.drive({ throttle: this.dead() ? 0 : throttle * this.power(), steer, brake: brake || this.dead(), handbrake: hb }, dt);
    // collisions
    const sp = this.v.speed; const dv = Math.abs(this.lastSpeed - sp);
    if (dv > 8 && this.lastSpeed !== 0) { this.damage((dv - 8) * 6, 'crash'); g.sfx('thud', { pos: this.pos }); if (this.driver === 'player') g.hurt((dv - 8) * 1.2, 'crash'); }
    this.lastSpeed = sp;
    // fire
    if (g.fire && g.fire.stateAt(this.pos.x, this.pos.z) === 1) this.damage(6 * dt, 'fire');
    if (this.burning) { this.burnT -= dt; this.hp = Math.max(0, this.hp); g.fire.ignite(this.pos.x, this.pos.z, 3); if (this.burnT <= 0) this.explode(); }
    if (this.hp < 35 && !this.wreck && g.step % 6 === 0) g.ctx.particles.burst(this.burning ? 'ember' : 'smoke', [this.pos.x, this.pos.y + 1.2, this.pos.z], { count: 1 });
    // flip: reset when upside down and slow
    const q = this.v.body.rotation(); const up = new V3(0, 1, 0).applyQuaternion(new THREE.Quaternion(q.x, q.y, q.z, q.w));
    if (up.y < 0.2 && Math.abs(sp) < 2) { this.flipT = (this.flipT || 0) + dt; if (this.flipT > 2) { this.v.reset([this.pos.x, g.world.heightAt(this.pos.x, this.pos.z) + 1.5, this.pos.z], this.v.yaw); this.flipT = 0; } } else this.flipT = 0;
    if (this.driver === 'player' || this.sys.nearPlayer(this)) { this.sys.engineSound(this); }
  }
  frame() {
    for (let i = 0; i < 4; i++) { const w = this.wheels[i]; this.v.wheelPose(i, w.position, w.quaternion); w.position.y -= 0.42; w.visible = true; }
    if (this.gunNode && this.gunner) this.gunNode.rotation.set(0, 0, 0);
  }
  dispose() { this.g.ctx.physics.unbind?.(this.group); this.group.removeFromParent(); for (const w of this.wheels) w.removeFromParent(); try { this.g.ctx.physics.remove(this.v.body); } catch { /* gone */ } this.sys.byCollider.delete(this.col?.handle); }
}

export class VehicleSystem {
  name = 'vehicles';
  list = []; nid = 0; byCollider = new Map(); tr = [0, 0]; seat = null; chase = false; mgActive = false; engineLoop = null; padSent = '';
  setup(g) {
    this.g = g; g.vehicles = this;
    g.spawnVehicle = (type, at, yaw, o) => this.spawn(type, at, yaw, o);
  }
  spawn(type, at, yaw = 0, o = {}) { const v = new Veh(this, type, at, yaw, o); this.list.push(v); return v; }
  reset() { if (this.seat) this.exit(true); for (const v of this.list.slice()) v.dispose(); this.list = []; }
  repairAll() { for (const v of this.list) if (!v.wreck) { v.hp = v.maxHp; v.stalled = false; v.burning = false; } }
  damage(v, d, by) { v.damage(d, by); }
  blast(pos, r, dmg) { for (const v of this.list) { const d = Math.hypot(v.pos.x - pos.x, v.pos.z - pos.z); if (d < r + 3 && !v.wreck) { v.damage(dmg * (1 - d / (r + 3)), 'blast'); if (v.hp <= 0 && v.T.explosive) v.setFire(); } } }
  igniteNear(o, r) { for (const v of this.list) if (Math.hypot(v.pos.x - o.x, v.pos.z - o.z) < r) v.setFire?.(); }
  nearPlayer(v) { const f = this.g.player.feet; return Math.hypot(v.pos.x - f.x, v.pos.z - f.z) < 60; }
  engineSound(v) { /* the engine loop is steered in frame() from the player's vehicle */ }
  // ---- player ----
  playerInput(g) {
    const input = g.ctx.input; const a = input.moveAxis();
    let throttle = Math.max(this.tr[1], held(input, 'up') && g.device === 'kbm' ? 1 : 0), brake = false;
    if (g.device === 'pad') { throttle = this.tr[1] - this.tr[0]; if (this.tr[0] > 0.1 && this.seat.speed() > 1) brake = true; }
    else { if (input.isDown('KeyS') || input.isDown('ArrowDown')) { throttle = -1; if (this.seat.speed() > 1) { brake = true; throttle = 0; } } if (input.isDown('KeyW') || input.isDown('ArrowUp')) throttle = 1; }
    return { throttle: Math.max(-1, Math.min(1, throttle)), steer: a.x, hb: held(input, 'handbrake'), brake };
  }
  enter(v) {
    const g = this.g, p = g.player; if (this.seat || v.dead() && v.wreck) return;
    this.seat = v; v.driver = 'player'; p.seated = true; g.hideViewmodel = true; p.ctrl.body.setEnabled(false);
    g.weapons.views.hidden = true; v.coast = v.stalled ? 99 : v.coast; g.sfx('door'); if (!v.stalled) g.sfx('starter');
    this.showDash(true); g.events.emit('enter', v);
  }
  exit(forced) {
    const g = this.g, p = g.player, v = this.seat; if (!v) return;
    this.seat = null; v.driver = null; p.seated = false; g.hideViewmodel = false; this.mgActive = false; g.camState.override = null; this.chase = false;
    const pos = v.position(new V3()); const side = new V3(-1.8, 0, 0).applyAxisAngle(new V3(0, 1, 0), v.yaw);
    const x = pos.x + side.x, z = pos.z + side.z;
    p.ctrl.body.setEnabled(true); p.ctrl.teleport([x, g.world.heightAt(x, z) + 0.5, z]); g.weapons.views.hidden = false; this.showDash(false); g.sfx('door');
    g.events.emit('exit', v, forced);
  }
  showDash(on) {
    const g = this.g;
    if (!this.dash) { const b = buildModel('dash', { catalog: CATALOG }); this.dash = b.object; this.dash.traverse((m) => { m.frustumCulled = false; m.castShadow = false; }); setLookLayer(this.dash, 'actors'); this.dash.position.set(0, -0.15, -0.6); this.dash.rotation.y = Math.PI; g.ctx.camera.camera.add(this.dash); this.wheelNode = this.dash.getObjectByName('Wheel'); this.arrowNode = this.dash.getObjectByName('Arrow'); }
    this.dash.visible = on && !this.chase;
  }
  fixed(g, dt) {
    for (const v of this.list) v.step(dt);
    if (!g.canMove()) return;
    const v = this.seat; const input = g.ctx.input;
    if (v) {
      if (consume(input, 'exitCar')) { if (this.mgActive) { this.mgActive = false; v.gunner = null; } else if (v.T.gun && false) { /* gun swap uses swapGun */ } else this.exit(false); }
      if (v.T.gun && consume(input, 'swapGun')) { this.mgActive = !this.mgActive; v.gunner = this.mgActive ? 'player' : null; g.sfx('equip'); }
      if (consume(input, 'chase')) { this.chase = !this.chase; if (!this.chase) g.camState.override = null; this.showDash(true); }
      this.mgLogic(g, dt, v);
      // keep the view turning with the car
      const yaw = v.yaw; if (this.lastYaw !== undefined && !this.mgActive) { let d = yaw - this.lastYaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; g.ctx.camera.yaw += d; } this.lastYaw = yaw;
      const sp = v.position(new V3()); g.player.ctrl.teleport([sp.x, sp.y + 1, sp.z]);
      if (v.hp < 10 && v.burning && g.step % 30 === 0) g.say('IT IS BURNING. GET OUT.', 'player', 1.5);
    } else this.lastYaw = undefined;
  }
  mgLogic(g, dt, v) {
    if (!this.mgActive) return; const input = g.ctx.input;
    v.overheat = Math.max(0, v.overheat - dt); if (v.overheat > 0) { v.heat = Math.max(0, v.heat - dt * 1.5); return; }
    v.heat = Math.max(0, v.heat - dt * 0.7);
    if (held(input, 'fire')) {
      this.mgT = (this.mgT || 0) - dt; v.heat += dt; if (v.heat >= 6) { v.overheat = 4; g.say('IT IS GLOWING. GIVE IT A MOMENT.', 'player', 2); }
      if (this.mgT <= 0) {
        this.mgT = 0.1; const cam = g.ctx.camera.camera; const o = new V3(), d = new V3(); cam.getWorldPosition(o); cam.getWorldDirection(d);
        d.x += (g.ctx.random.next() - 0.5) * 0.03; d.y += (g.ctx.random.next() - 0.5) * 0.03; d.normalize();
        const hit = g.castBullet(o, d, 180); g.sfx('shot_mg', { volume: 0.6 }); g.noise(o, 150, 'player');
        const to = hit ? hit.point : o.clone().addScaledVector(d, 180); if (this.mgShots++ % 3 === 0) g.tracer(o.clone().addScaledVector(d, 1.5).add(new V3(0, -0.3, 0)), to);
        if (hit) g.bulletImpact(hit, d, 20 * TUNING.weaponDamage, 'player');
        if (hit && hit.point && g.fire && g.ctx.random.chance(0.01)) g.fire.ignite(hit.point.x, hit.point.z, 1.5);
        g.camState.punch = (g.camState.punch || 0) + 0.004;
      }
    }
  }
  mgShots = 0;
  // ---- AI driving ----
  aiInput(v, dt) {
    const ai = v.ai; if (!ai || !ai.path || v.dead()) return { throttle: 0, steer: 0, brake: true };
    const p = v.pos, tgt = ai.chase ? this.g.player.feet : ai.path[ai.i % ai.path.length]; const tx = tgt.x ?? tgt[0], tz = tgt.z ?? tgt[1];
    const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
    if (d < 9 && !ai.chase) { ai.i++; if (ai.i >= ai.path.length && !ai.loop) { ai.path = null; return { throttle: 0, steer: 0, brake: true }; } }
    const want = Math.atan2(dx, dz); let err = want - v.yaw; while (err > Math.PI) err -= 2 * Math.PI; while (err < -Math.PI) err += 2 * Math.PI;
    const steer = Math.max(-1, Math.min(1, err * 1.6 - (ai.lastErr ? (err - ai.lastErr) / dt * 0.02 : 0))); ai.lastErr = err;
    const target = ai.speed || 12; const throttle = v.speed() < target * (Math.abs(err) > 0.8 ? 0.5 : 1) ? 1 : 0.2;
    return { throttle, steer, brake: false };
  }
  followRoad(v, id, loop = true, speed = 12) { const R = ROADS.find((r) => r.id === id); v.ai = { path: R.pts.map((q) => [q[0], q[1]]), i: 0, loop, speed }; }
  frame(g, dt) {
    for (const v of this.list) v.frame();
    const v = this.seat;
    // engine loop steered by speed
    if (v && this.wheelNode) {
      const sp = v.speed(); this.wheelNode.rotation.z = -v.v.steering * 1.2;
      if (this.arrowNode) { const wp = g.waypoint; if (wp) { const bearing = Math.atan2(wp.x - v.pos.x, wp.z - v.pos.z) - v.yaw; this.arrowNode.rotation.y = -bearing; this.arrowNode.visible = true; } else this.arrowNode.visible = false; }
      if (!this.engineLoop) { try { this.engineLoop = g.ctx.audio.loop('loop_engine', { volume: 0 }); } catch { this.engineLoop = null; } }
      try { this.engineLoop?.set({ volume: v.dead() ? 0 : 0.35, pitch: Math.min(12, 2 + Math.abs(sp) * 0.45) }); } catch { /* none */ }
      // camera: eye at the seat, or chase
      if (this.chase) { const back = new V3(0, 0, -9).applyAxisAngle(new V3(0, 1, 0), v.yaw); g.camState.override = { position: [v.pos.x + back.x, v.pos.y + 4.2, v.pos.z + back.z], target: [v.pos.x, v.pos.y + 1.2, v.pos.z] }; } else g.camState.override = null;
      if (this.mgActive && this.dash) this.dash.visible = false; else if (this.dash) this.dash.visible = !this.chase;
    } else if (this.engineLoop) { try { this.engineLoop.set({ volume: 0 }); } catch { /* none */ } }
    // analog triggers: sent through input.send so recordings keep them
    if (typeof navigator !== 'undefined' && navigator.getGamepads) { const pad = [...navigator.getGamepads()].find(Boolean); if (pad && pad.buttons[6]) { const t = [pad.buttons[6].value, pad.buttons[7].value]; const k = t.join(); if (k !== this.padSent) { this.padSent = k; g.ctx.input.send({ tr: t }); } } }
    for (const c of g.ctx.input.commands) if (c && c.tr) this.tr = c.tr;
    if (!v && !g.ctx.input.padAxis) this.tr = [0, 0];
    if (g.device !== 'pad') this.tr = [0, 0];
  }
  // ---- use prompts ----
  extra(g) {
    const out = []; const f = g.player.feet;
    if (this.seat) {
      const v = this.seat; return [{ it: v, kind: 'exitcar' }].slice(0, 0);
    }
    for (const v of this.list) {
      if (v.wreck) continue; const d = Math.hypot(v.pos.x - f.x, v.pos.z - f.z); if (d > 6) continue;
      const fwd = new V3(0, 0, 1).applyAxisAngle(new V3(0, 1, 0), v.yaw);
      const bonnet = { x: v.pos.x + fwd.x * 2.8, z: v.pos.z + fwd.z * 2.8 };
      if (v.dead() && Math.hypot(bonnet.x - f.x, bonnet.z - f.z) < 2.4) out.push({ it: v, x: bonnet.x, z: bonnet.z, y: v.pos.y + 0.8, r: 2.4, verb: 'REPAIR THE ENGINE', def: { hold: g.story?.upgrades.kit ? 1.5 : 3 }, run: () => { v.repair(); g.sfx('wrench'); } });
      else if (d < 4.5) out.push({ it: v, x: v.pos.x, z: v.pos.z, y: v.pos.y + 1, r: 4.5, verb: v.dead() ? 'GET IN (IT WILL NOT START)' : 'DRIVE', def: {}, run: () => this.enter(v) });
    }
    return out;
  }
  state() { const v = this.seat; return { vehicle: v ? { type: v.type, hp: Math.round(v.hp), speed: +v.speed().toFixed(1), stalled: v.stalled, gunner: this.mgActive, heat: +v.heat.toFixed(1) } : null }; }
}
