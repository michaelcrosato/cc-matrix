// Getting in and out, the cab, the wheel in your hands, the map at speed, the chase camera, the mounted gun, the bonnet.
import { THREE, buildModel, setLookLayer, spatialize, twoBoneIK } from '../../pixel-engine.js';
import { TUNING } from '../core/tuning.js';
import { CABS, CAB_ARM } from '../art/viewmodels.js';
import { Vehicle2, KINDS } from './vehicle.js';
import { ROADS } from '../content/roads.js';
import { pointAlong, polyLength } from '../world/ground.js';
import { makePerson } from '../actors/rig.js';
import { clamp, lerp, wrapAngle } from '../core/rng.js';
const { Vector3, Quaternion, Group } = THREE;
const _hand = new Vector3(), _knob = new Vector3(), _local = new Vector3(), _world = new Vector3(), _joint = [0, 0, 0];
/** An arm from its shoulder to wherever its hand is now; the elbow finds itself. */
function reach(root, upper, fore, shoulder, pole, hand) {
  root.worldToLocal(_local.copy(hand));
  twoBoneIK(shoulder, [_local.x, _local.y, _local.z], CAB_ARM.upper, CAB_ARM.fore, pole, _joint);
  fore.position.set(_joint[0], _joint[1], _joint[2]);
  fore.lookAt(hand);
  fore.scale.z = Math.hypot(_local.x - _joint[0], _local.y - _joint[1], _local.z - _joint[2]);
  upper.lookAt(root.localToWorld(_world.set(_joint[0], _joint[1], _joint[2])));
  upper.scale.z = Math.hypot(shoulder[0] - _joint[0], shoulder[1] - _joint[1], shoulder[2] - _joint[2]);
}
const _v = new Vector3(), _q = new Quaternion();
const PARKED = [
  [-30, 60, 1.5, 'pickup'], [-112, 158, 0.6, 'pickup'], [60, -160, 1.9, 'pickup'], [456, -160, 3, 'truck'],
  [-190, 16, 1.5, 'technical', { paint: 'slate', hood: 'night', roof: 'mist' }], [-312, -74, 0.8, 'technical', { paint: 'slate', hood: 'night', roof: 'mist' }], [316, 402, 0.8, 'technical', { paint: 'orange', hood: 'red', roof: 'sand' }],
];
const PATROLS = [
  { road: 'north', kind: 'technical', faction: 'concord', palette: { paint: 'slate', hood: 'night', roof: 'mist' } },
  { road: 'east', kind: 'technical', faction: 'harvest', palette: { paint: 'orange', hood: 'red', roof: 'sand' } },
  { road: 'fort', kind: 'pickup', faction: 'concord', palette: { paint: 'slate', hood: 'night', roof: 'mist' } },
  { road: 'salt', kind: 'technical', faction: 'harvest', palette: { paint: 'orange', hood: 'red', roof: 'sand' } },
];
export class Vehicles {
  list = []; patrols = []; chase = false; steerVis = 0; engine = null; gravelV = null; repairT = 0; repairing = null; hasKit = false;
  constructor(game) { this.game = game; }
  /** The wheel and dash of what you just climbed into. */
  useCab(kind) {
    this.cab = this.cabs[kind] ?? this.cabs.pickup;
    const part = (n) => this.cab.object.getObjectByName(n);
    this.cabWheel = part('Wheel'); this.cabArrow = part('DashArrow'); this.cabRest = this.cabWheel.rotation.z; this.cabShifter = part('Shifter');
    this.cabGripL = part('GripL'); this.cabGripR = part('GripR'); this.cabHandR = part('HandR'); this.cabArmL = part('ArmL'); this.cabArmR = part('ArmR'); this.cabUpperL = part('UpperL'); this.cabUpperR = part('UpperR');
    this.cabHandR.visible = false;
  }
  build(ctx) {
    const g = this.game;
    if (g.views) {
      this.cabs = {};
      for (const [kind, def] of Object.entries(CABS)) {
        const cab = buildModel(def);
        setLookLayer(cab.object, 'actors');
        cab.object.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = false; } });
        cab.object.visible = false;
        ctx.scene.add(cab.object);
        this.cabs[kind] = cab;
      }
      this.useCab('pickup');
    }
  }
  spawn(kind, x, z, yaw = 0, palette) {
    const v = new Vehicle2(this.game, kind, [x, z], yaw, palette);
    this.list.push(v);
    this.game.interact.add({ vehicle: v, x, y: 0, z, r: v.def.o.size[2] + 1.6, wide: true, track: () => [v.x, v.y, v.z],
      when: () => v.alive && !v.stalled && !this.game.player.seat && v.driver == null, verb: () => 'GET IN', onUse: () => this.game.driving.enter(v) });
    this.game.interact.add({ vehicle: v, x, y: 0, z, r: 2.8, wide: true, hold: () => (this.hasKit ? 1.5 : 3), track: () => { const yw = v.yaw, d = v.def.bonnet; return [v.x + Math.sin(yw) * d[2], v.y, v.z + Math.cos(yw) * d[2]]; },
      when: () => v.alive && !this.game.player.seat && (v.stalled || v.hp < 50), verb: () => 'OPEN THE BONNET', tick: (dt, t) => this.game.driving.wrenchTick(v, dt, t), onStart: () => this.game.driving.wrenchStart(v), onCancel: () => this.game.driving.wrenchEnd(), onUse: () => { this.game.driving.wrenchEnd(); v.repair(50); this.game.sfx.play('starter-cough'); } });
    return v;
  }
  remove(v) {
    const i = this.list.indexOf(v);
    if (i >= 0) this.list.splice(i, 1);
    for (const u of [...this.game.interact.list]) if (u.vehicle === v) this.game.interact.remove(u);
    v.dispose();
  }
  /** Keep the road alive: patrol technicals follow their polylines, simulated within 400 m. */
  startPatrols() {
    const g = this.game;
    if (this.patrols.length) return;
    for (const def of PATROLS) {
      const pts = ROADS[def.road].pts, L = polyLength(pts), at = [0, 0, 0];
      const s = g.rng.ai.range(0, L);
      pointAlong(pts, s, at);
      this.patrols.push({ def, pts, L, s, dir: 1, v: null, x: at[0], z: at[1], crewOut: false });
    }
    // Something to drive: a dented pickup at home, a technical at the posts that keep one.
    for (const [x, z, yaw, kind, pal] of PARKED) this.spawn(kind, x, z, yaw, pal);
  }
  /** Somebody is at the wheel of every truck on the road. */
  seatDriver(v) {
    const g = this.game;
    if (!g.views || !v.object || v.driverView) return;
    const pal = v.faction === 'harvest' ? { cloth: 'sand', dark: 'red', hat: 'red', strap: 'orange', skin: 'plum' } : { cloth: 'slate', dark: 'night', hat: 'navy', strap: 'white', skin: 'sand' };
    const d = makePerson('soldier-b', pal);
    d.anim.set('DriveSit');
    d.object.position.set(v.def.seat[0], v.def.seat[1] - 1.55, v.def.seat[2]);
    v.object.add(d.object);
    v.driverView = d;
  }
  stopPatrols() { for (const p of this.patrols) if (p.v) this.remove(p.v); this.patrols.length = 0; }
  stepPatrols(ctx, dt) {
    const g = this.game, f = g.anchor();
    for (const p of this.patrols) {
      const d = Math.hypot(p.x - f.x, p.z - f.z);
      if (!p.v) {
        // A counter: it keeps its schedule when no one is looking.
        p.s += p.dir * 11 * dt;
        if (p.s > p.L) { p.s = p.L; p.dir = -1; } else if (p.s < 0) { p.s = 0; p.dir = 1; }
        const at = pointAlong(p.pts, p.s, [0, 0, 0]);
        p.x = at[0]; p.z = at[1];
        if (d < 380 && d > 90 && !g.story.noPatrols) { p.v = this.spawn(p.def.kind, p.x, p.z, p.dir > 0 ? at[2] : at[2] + Math.PI, p.def.palette); p.v.patrol = p; p.v.driver = 'ai'; p.v.faction = p.def.faction; p.v.crew = 2; this.seatDriver(p.v); }
        continue;
      }
      if (!p.v.alive || p.v.driver === 'player') { p.v.driver = p.v.driver === 'ai' ? null : p.v.driver; p.v.patrol = null; p.v = null; p.s = 0; p.x = 9999; p.z = 9999; p.dead = true; continue; }
      p.x = p.v.x; p.z = p.v.z;
      if (d > 420) { this.remove(p.v); p.v = null; }
    }
    this.patrols = this.patrols.filter((p) => !p.dead);
  }
  stepAI(ctx, v, dt) {
    const g = this.game, p = v.patrol;
    // Which way along the line, with a look-ahead point.
    if (!v.path) v.path = p?.pts;
    const pts = v.path;
    if (!pts) { v.fixedUpdate(ctx, dt, { throttle: 0, steer: 0, brake: true }); return; }
    if (p) {
      const look = 14;
      let best = 0, bd = 1e9, s = 0;
      for (let i = 0; i + 1 < pts.length; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[i + 1], dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz);
        const t = clamp(((v.x - ax) * dx + (v.z - az) * dz) / (l * l), 0, 1), px = ax + dx * t, pz = az + dz * t, d = Math.hypot(v.x - px, v.z - pz);
        if (d < bd) { bd = d; best = s + t * l; }
        s += l;
      }
      p.s = best;
      if (p.loop) { if (p.s > p.L - 16) p.s = 0; }
      else if (p.s > p.L - 12) p.dir = -1; else if (p.s < 12) p.dir = 1;
      const at = pointAlong(pts, clamp(p.s + p.dir * look, 0, p.L), [0, 0, 0]);
      v.aiGoal = { x: at[0], z: at[1] };
    }
    // Chase if the driver is alert, and dismount at 25 m.
    const hostile = g.hasPlayer && g.actors.hostileToPlayer({ faction: v.faction, squad: null }) && !g.dev.invisible;
    const pd = Math.hypot(g.player.feet.x - v.x, g.player.feet.z - v.z);
    if (hostile && pd < 70 && g.actors.visionFor({ role: 'rifle' }, { kind: 'player' }, pd) > pd) {
      v.chasing = true;
      if (pd < 25 && v.crew > 0 && !v.stopped) { v.stopped = true; this.dismount(ctx, v); }
      else if (!v.stopped && !v.convoy) v.aiGoal = { x: g.player.feet.x, z: g.player.feet.z };
    }
    if (v.stopped) { v.fixedUpdate(ctx, dt, { throttle: 0, steer: 0, brake: true }); return; }
    const goal = v.aiGoal;
    if (!goal) { v.fixedUpdate(ctx, dt, { throttle: 0, steer: 0, brake: true }); return; }
    const want = Math.atan2(goal.x - v.x, goal.z - v.z), err = wrapAngle(want - v.yaw);
    const steer = clamp(-err * 1.6, -1, 1);
    const target = v.aiSpeed ?? (Math.abs(err) > 0.5 ? 7 : 14);
    const throttle = clamp((target - v.car.speed) * 0.5, -1, 1);
    v.fixedUpdate(ctx, dt, { throttle, steer, brake: false });
    if (v.car.speed < 0.6 && throttle > 0.3) { v.stuckT = (v.stuckT ?? 0) + dt; if (v.stuckT > 3) { v.stuckT = 0; v.car.reset([v.x, g.world.heightAt(v.x, v.z) + 1.1, v.z], want); } }
    else v.stuckT = 0;
  }
  dismount(ctx, v) {
    const g = this.game;
    const squadKey = `crew${v.id}`;
    const sq = g.actors.addSquadDef(squadKey, { faction: v.faction, n: v.crew, at: [v.x, v.z], noReman: true });
    sq.live = true;
    for (let i = 0; i < v.crew; i++) {
      const s = g.actors.makeSoldier(ctx, { faction: v.faction, role: i ? 'rifle' : 'driver', x: v.x + (i ? 2 : -2), z: v.z + 1.5, yaw: v.yaw, squad: sq });
      if (!i) s.vehicle = v;
      s.alertTo(g.player.feet.x, g.player.feet.z, 'player');
      s.targetInfo = g.actors.playerInfo();
      sq.members.push(s);
    }
    v.crew = 0;
  }
  fixedUpdate(ctx, dt) {
    const g = this.game;
    if (g.tick % 3 === 0) this.stepPatrols(ctx, dt * 3);
    for (const v of this.list) {
      if (v.driver === 'player') continue;
      if (v.driver === 'ai') this.stepAI(ctx, v, dt);
      else v.fixedUpdate(ctx, dt, { throttle: 0, steer: 0, brake: true });
    }
  }
  /** The nearest truck on the road, by ear. */
  stepNearbyEngine(ctx) {
    const g = this.game;
    let best = null, bd = 140;
    for (const v of this.list) { if (v.driver !== 'ai' || !v.alive) continue; const d = Math.hypot(v.x - g.camPos.x, v.z - g.camPos.z); if (d < bd) { bd = d; best = v; } }
    if (best) {
      if (!this.aiEngine || this.aiEngine.stopped) this.aiEngine = ctx.audio.loop('engine-loop', { volume: 0 });
      const s = spatialize(g.listener(), [best.x, g.camPos.y, best.z], { max: 140, ref: 6 });
      if ((this.muffleT = (this.muffleT ?? 0) - 1 / 60) <= 0) { this.muffleT = 0.5; this.muffled = g.sfx.blocked(best.x, best.z); }
      this.aiEngine.set({ volume: s.gain * 0.55, pan: s.pan, pitch: -4 + Math.min(1, Math.abs(best.car.speed) / 20) * 12, muffle: this.muffled ? 0.8 : 0 });
    } else if (this.aiEngine) this.aiEngine.set({ volume: 0 });
  }
  update(ctx, dt) { this.stepNearbyEngine(ctx); for (const v of this.list) { v.update(ctx, dt); if (v.driverView) { if (v.driver !== 'ai' || !v.alive) v.driverView.object.visible = false; else v.driverView.anim.update(dt); } } }
  reset() { this.stopPatrols(); for (const v of [...this.list]) this.remove(v); }
}
export class Driving {
  seat = null; chase = false; steer = 0; gunning = false; wrench = null; repairT = 0;
  constructor(game) { this.game = game; }
  get vehicle() { return this.seat?.v ?? null; }
  enter(v) {
    const g = this.game, p = g.player;
    v.driver = 'player';
    this.seat = { v, feet: () => _v.set(v.x, v.y - 0.3, v.z), eye: (out) => this.eyeOf(v, out) };
    this.gear = null; this.shiftT = 0;
    p.seat = this.seat;
    p.cc.collider.setEnabled(false);
    g.vm.setVisible(false);
    if (g.views) { g.vehicles.useCab(v.kind); g.vehicles.cab.object.visible = true; v.object.add(g.vehicles.cab.object); const s = v.def.seat; g.vehicles.cab.object.position.set(s[0], s[1], s[2]); }
    this.gunning = false; this.chase = false;
    g.sfx.play('door', { volume: 0.7 });
    if (!this.engine || this.engine.stopped) this.engine = g.ctx.audio.loop('engine-loop', { volume: 0.4 });
    g.events.emit('vehicle-enter', v);
    p.setYaw(v.yaw + Math.PI, 0);
    g.hudTouch('vehicle');
  }
  eyeOf(v, out) {
    const s = this.gunning ? v.def.gunSeat : v.def.seat;
    _q.copy(v.object ? v.object.quaternion : _q.set(0, 0, 0, 1));
    if (!v.object) { const r = v.car.body.rotation(); _q.set(r.x, r.y, r.z, r.w); }
    out.set(s[0], s[1], s[2]).applyQuaternion(_q);
    const bx = v.object ? v.object.position.x : v.x, by = v.object ? v.object.position.y : v.y, bz = v.object ? v.object.position.z : v.z;
    out.x += bx; out.y += by; out.z += bz;
    return out;
  }
  eject() {
    const g = this.game, p = g.player, v = this.vehicle;
    if (!v) return;
    v.driver = null;
    if (v.alive) { const c = v.car.body; }
    const yw = v.yaw, d = v.def.door;
    const x = v.x + Math.cos(yw) * d[0] + Math.sin(yw) * d[2], z = v.z - Math.sin(yw) * d[0] + Math.cos(yw) * d[2];
    p.seat = null;
    this.seat = null; this.gunning = false; g.weapons.mounted = null;
    p.cc.collider.setEnabled(true);
    p.teleport(x, z);
    g.cam.override = null;
    g.vm.setVisible(true);
    g.vm.showGun(g.weapons.gun?.id ?? 'cane', false);
    if (g.views) { g.vehicles.cab.object.visible = false; g.ctx.scene.add(g.vehicles.cab.object); }
    this.engine?.stop(); this.engine = null;
    g.sfx.play('door', { volume: 0.5 });
    g.events.emit('vehicle-exit', v);
  }
  fixedUpdate(ctx, dt) {
    const g = this.game, a = g.actions, v = this.vehicle;
    if (!v) return;
    // Swap to the gun; the truck rolls on with no driver, and that is your problem.
    if (g.canActSeated()) {
      if (a.take('exit')) { this.eject(); return; }
      if (v.def.gunSeat && a.take('swap')) {
        this.gunning = !this.gunning;
        if (this.gunning) {
          g.weapons.mounted = { turret: () => { if (v.turret) { v.turret.rotation.y = g.player.yaw - v.yaw + Math.PI; } } };
          if (g.views) g.vehicles.cab.object.visible = false;
          g.sfx.play('gun-equip');
          g.events.emit('gun-seat', v);
        } else {
          g.weapons.mounted = null;
          if (g.views) g.vehicles.cab.object.visible = true;
        }
      }
      if (a.take('chase')) this.chase = !this.chase;
    }
    let input;
    if (this.gunning) input = { throttle: 0, steer: 0, brake: false };
    else {
      const axis = a.axis();
      const gas = g.mapCursorActive() && a.device === 'pad' ? a.analog('gas') : a.analog('gas');
      const br = a.analog('brake');
      const steerAxis = axis.x;
      this.steer = lerp(this.steer, steerAxis, 1 - Math.exp(-dt * 7));
      input = { throttle: gas - br, steer: -this.steer, brake: false, handbrake: a.down('handbrake') };
      if (gas === 0 && br === 0) input.brake = false;
    }
    if (a.down('handbrake') && !this.gunning) input.handbrake = true;
    v.fixedUpdate(ctx, dt, input);
    // The road talks back: gravel off the road, brakes when you stand on them.
    const sp = Math.abs(v.car.speed);
    if (sp > 5 && (this.gravelT = (this.gravelT ?? 0) - dt) <= 0) { this.gravelT = 0.35 - Math.min(0.2, sp * 0.008); if (g.ground.kindAt(v.x, v.z) !== 1) g.sfx.play('gravel', { volume: Math.min(0.6, sp * 0.03), pitch: g.rng.fx.range(-2, 2) }); }
    if (sp > 6 && (input.handbrake || a.analog('brake') > 0.5)) { if (!this.braking) { this.braking = true; g.sfx.play('brakes', { volume: 0.6 }); } } else this.braking = false;
    a.take('jump');
  }
  /** Horn on the pad's L3, Shift on keys. */
  update(ctx, dt) {
    const g = this.game, v = this.vehicle;
    if (!v) { return; }
    const speed = Math.abs(v.car.speed);
    if (this.engine) this.engine.set({ volume: v.stalled ? 0 : 0.28 + clamp(speed / 26, 0, 1) * 0.3, pitch: -6 + clamp(speed / 26, 0, 1) * 16 - (v.hp < 35 ? 2 : 0) });
    if (g.actions.tapped('sprint')) g.sfx.play('horn', { volume: 0.8 });
    if (g.views) {
      const cab = g.vehicles;
      if (cab.cabWheel) { cab.cabWheel.rotation.z = cab.cabRest + this.steer * 1.4; }
      // Through the gears: the right hand leaves the wheel for the lever and back.
      const gear = Math.floor(speed / 7);
      if (gear !== this.gear) { if (this.gear != null) { this.shiftT = 0.5; this.shiftDir = gear > this.gear ? 1 : -1; g.sfx.play('gun-mag', { volume: 0.25, pitch: -8 }); } this.gear = gear; }
      this.shiftT = Math.max(0, (this.shiftT ?? 0) - dt);
      const k = Math.sin(Math.min(1, this.shiftT / 0.5) * Math.PI);
      cab.cabShifter.rotation.x = k * 0.3 * (this.shiftDir ?? 1);
      cab.cabGripR.visible = k <= 0; cab.cabHandR.visible = k > 0;
      reach(cab.cab.object, cab.cabUpperL, cab.cabArmL, CAB_ARM.shoulderL, CAB_ARM.poleL, cab.cabGripL.getWorldPosition(_hand));
      cab.cabGripR.getWorldPosition(_hand).lerp(cab.cabShifter.localToWorld(_knob.set(0, 0.3, 0)), k);
      cab.cabHandR.parent.worldToLocal(cab.cabHandR.position.copy(_hand));
      reach(cab.cab.object, cab.cabUpperR, cab.cabArmR, CAB_ARM.shoulderR, CAB_ARM.poleR, _hand);
      if (cab.cabArrow && g.map.waypoint) { const want = Math.atan2(g.map.waypoint[0] - v.x, g.map.waypoint[1] - v.z); cab.cabArrow.rotation.y = wrapAngle(want - v.yaw); }
    }
    // The chase camera lives in the camera step, by override.
    if (this.chase && !this.gunning) {
      const yw = v.yaw, d = 9, h = 3.6;
      const o = v.object ? v.object.position : _v.set(v.x, v.y, v.z);
      g.cam.override = { position: [o.x - Math.sin(yw) * d, o.y + h, o.z - Math.cos(yw) * d], target: [o.x + Math.sin(yw) * 3, o.y + 1, o.z + Math.cos(yw) * 3] };
      if (g.views) g.vehicles.cab.object.visible = false;
    } else if (g.cam.override && !g.scene.active) { g.cam.override = null; if (g.views && !this.gunning) g.vehicles.cab.object.visible = true; }
  }
  wrenchStart(v) {
    const g = this.game;
    g.vm.showProp('p-wrench'); g.vm.play('Wrench', { keep: true });
    g.player.frozen = true;
    this.wrench = v;
  }
  wrenchTick(v, dt, t) {
    const g = this.game;
    if ((this.wrenchS = (this.wrenchS ?? 0) - dt) <= 0) {
      this.wrenchS = 0.42;
      g.sfx.play('wrench', { volume: 0.7, pitch: g.rng.fx.range(-2, 2) });
      const yw = v.yaw, d = v.def.bonnet;
      g.ctx.particles.burst('wrench-spark', [v.x + Math.sin(yw) * d[2] * 0.7, v.y + 0.6, v.z + Math.cos(yw) * d[2] * 0.7]);
    }
  }
  wrenchEnd() {
    const g = this.game;
    if (!this.wrench) return;
    this.wrench = null;
    g.player.frozen = false;
    g.vm.endAction();
    g.vm.showGun(g.weapons.gun?.id ?? 'cane', false);
  }
}
