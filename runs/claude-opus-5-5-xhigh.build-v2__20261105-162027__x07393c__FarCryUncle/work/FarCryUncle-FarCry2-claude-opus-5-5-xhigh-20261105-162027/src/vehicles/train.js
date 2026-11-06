// Old Bakr's goods train: a kinematic string of cars moved along the railway polyline.
import { THREE, buildModel, setLookLayer, RAPIER } from '../../pixel-engine.js';
import { MODELS } from '../art/models.js';
import { RAIL, RIVER_Y, RAIL_BRIDGE } from '../content/roads.js';
import { pointAlong, polyLength } from '../world/ground.js';
import { clamp, lerp } from '../core/rng.js';
const { Vector3 } = THREE;
const CARS = [{ model: 'locomotive', off: 0 }, { model: 'flatcar', off: -11.5 }, { model: 'boxcar', off: -22.5 }, { model: 'flatcar', off: -33.5, hasGun: true }];
export class Train {
  s = 0; speed = 0; target = 0; cars = []; pts = RAIL.main; L = polyLength(RAIL.main); rideCar = 3; clackT = 0; moving = false; whistleN = 0; stopAt = null;
  constructor(game) { this.game = game; }
  build(ctx) {
    const g = this.game;
    for (const c of CARS) {
      const car = { ...c, x: 0, y: 0, z: 0, yaw: 0, object: null };
      const body = ctx.physics.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, -30, 0));
      const half = c.model === 'locomotive' ? [1.35, 1.6, 5.5] : c.model === 'boxcar' ? [1.35, 1.7, 5] : [1.35, 0.3, 5];
      const col = ctx.physics.world.createCollider(RAPIER.ColliderDesc.cuboid(half[0], half[1], half[2]).setTranslation(0, half[1] + 0.1, 0), body);
      car.body = body; car.half = half;
      g.hitMap.set(col.handle, { kind: 'train', ref: car });
      if (g.views) {
        const b = buildModel(c.model, { catalog: MODELS });
        car.object = b.object;
        setLookLayer(car.object, 'actors');
        car.object.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
        ctx.scene.add(car.object);
        if (c.hasGun) {
          const mg = buildModel('flat-mg', { catalog: MODELS });
          setLookLayer(mg.object, 'actors');
          mg.object.position.set(0, 0.65, 1.8);
          car.object.add(mg.object);
          car.turret = mg.object.getObjectByName('Turret');
        }
      }
      this.cars.push(car);
    }
    this.place(this.sAt(0, 70));
  }
  /** Distance along the main line nearest a world point. */
  sAt(x, z) {
    let best = 0, bd = 1e12, s = 0;
    const pts = this.pts;
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz);
      const t = clamp(((x - ax) * dx + (z - az) * dz) / (l * l), 0, 1), d = Math.hypot(x - (ax + dx * t), z - (az + dz * t));
      if (d < bd) { bd = d; best = s + t * l; }
      s += l;
    }
    return best;
  }
  railY(x, z) {
    if (Math.hypot(x - RAIL_BRIDGE.at[0], z - RAIL_BRIDGE.at[1]) < 18) return RIVER_Y + 2 + 0.75;
    return this.game.world.heightAt(x, z) + 0.75;
  }
  place(s) {
    this.s = s;
    const p = [0, 0, 0];
    for (const c of this.cars) {
      pointAlong(this.pts, clamp(s + c.off, 0, this.L), p);
      c.x = p[0]; c.z = p[1]; c.yaw = p[2]; c.y = this.railY(p[0], p[1]);
      c.body.setNextKinematicTranslation({ x: c.x, y: c.y, z: c.z });
      c.body.setTranslation({ x: c.x, y: c.y, z: c.z }, true);
      const h = c.yaw / 2;
      c.body.setRotation({ x: 0, y: Math.sin(h), z: 0, w: Math.cos(h) }, true);
      if (c.object) { c.object.position.set(c.x, c.y, c.z); c.object.rotation.y = c.yaw; }
    }
  }
  run(toS, speed = 11) { this.goalS = toS; this.target = speed; this.moving = true; }
  fixedUpdate(ctx, dt) {
    const g = this.game;
    if (!this.moving && this.speed === 0) return;
    const dir = this.goalS >= this.s ? 1 : -1;
    const left = Math.abs(this.goalS - this.s);
    const want = left < 25 ? Math.max(1.2, this.target * (left / 25)) : this.target;
    this.speed = lerp(this.speed, want, 1 - Math.exp(-dt * 0.7));
    this.s += dir * this.speed * dt;
    if (left < 0.5) { this.s = this.goalS; this.speed = 0; this.moving = false; g.events.emit('train-stopped'); }
    this.place(this.s);
    this.clackT -= this.speed * dt;
    if (this.clackT <= 0) { this.clackT = 6; g.sfx.at('train-clack', this.cars[0].x, this.cars[0].z, { max: 220, volume: 0.9 }); }
  }
  whistle() { const c = this.cars[0]; this.game.sfx.at('train-whistle', c.x, c.z, { max: 900, volume: 1 }); }
  /** Stand on a car: eye and feet follow it. Returns the seat. */
  seatOn(index, offset = [0, 2.3, 0]) {
    const car = this.cars[index];
    const v = new Vector3();
    return {
      car, invuln: false,
      feet: () => v.set(car.x, car.y + 0.8, car.z),
      eye: (out) => {
        const s = Math.sin(car.yaw), co = Math.cos(car.yaw);
        out.set(car.x + offset[0] * co + offset[2] * s, car.y + offset[1], car.z - offset[0] * s + offset[2] * co);
        return out;
      },
    };
  }
}
