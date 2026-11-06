/** @file Four-point suspension and buoyancy, seating, bonnet repairs, mounted guns and vehicle destruction. */
import { physicsOf, spawnProp, placeActor, Vector3, Quaternion, actOn, damage } from '../../../engine/sim-api';
import { campaign, players, people, value, mark, say, type GW, type Person, type Ride } from './state';
import { ground, WATER } from './map';
import { blast } from './arms';

export function spawnVehicle(w: GW, kind: string, x: number, z: number, yaw = 0): number {
  const physics = physicsOf(w),
    boat = kind === 'boat',
    y = boat ? WATER + 0.12 : ground(x, z) + 1.15;
  const body = physics.addBody({
    type: 'dynamic',
    position: [x, y, z],
    rotation: [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)],
    group: 'flyer',
    linearDamping: boat ? 0.05 : 0.02,
    angularDamping: boat ? 1.2 : 0.6,
    canSleep: false,
    colliders: [{ shape: { type: 'box', size: boat ? [1.7, 0.7, 5] : [1.8, 1, 3.9] }, density: boat ? 150 : 220 }],
  });
  const blocker = physics.addBody({
    type: 'kinematic',
    group: 'crowd',
    position: [x, y, z],
    colliders: [{ shape: { type: 'box', size: [1.8, 1.5, boat ? 5 : 3.9] } }],
  });
  const data: Ride = {
    kind,
    body,
    blocker,
    hp: 300,
    yaw,
    speed: 0,
    spin: 0,
    steer: 0,
    driver: -1,
    wheels: [],
    heat: 0,
    burning: 0,
  };
  if (!boat)
    for (const wx of [-0.9, 0.9])
      for (const wz of [-1.35, 1.35])
        data.wheels.push(spawnProp(w, { prop: 'prop:field-wheel', at: [x + wx, ground(x, z) + 0.42, z + wz], yaw }));
  return spawnProp(
    w,
    { prop: `prop:field-${kind}`, at: [x, y - (boat ? 0.3 : 0.8), z], yaw },
    { components: { ride: { data } } },
  );
}
export function enterVehicle(w: GW, p: Person, id: number): void {
  const r = w.get(id)?.ride?.data;
  if (!r || r.hp <= 0) return;
  const s = p.seat!.data;
  if (r.driver >= 0) {
    s.vehicle = id;
    s.mounted = !players(w).some((other) => other.seat!.data.vehicle === id && other.seat!.data.mounted);
    mark(w, 'mounted gun');
  } else {
    r.driver = p.id;
    s.vehicle = id;
    s.mounted = false;
    mark(w, r.kind === 'boat' ? 'boat' : 'drive');
  }
  p.weapons.slot = -1;
  if (r.blocker >= 0) {
    physicsOf(w).removeBody(r.blocker);
    r.blocker = -1;
  }
  actOn(w, p.id, (a) => a.play('action:field-drive'));
  w.emit('engine-start', { id });
}
export function exitVehicle(w: GW, p: Person): void {
  const s = p.seat!.data,
    r = w.get(s.vehicle)?.ride?.data;
  s.vehicle = -1;
  s.mounted = false;
  s.useHeld = -1;
  actOn(w, p.id, (a) => a.stop());
  if (!r) return;
  if (r.driver === p.id) r.driver = -1;
  const { position: pos } = physicsOf(w).readBody(r.body);
  const x = pos.x + Math.cos(r.yaw) * 2.4,
    z = pos.z - Math.sin(r.yaw) * 2.4;
  placeActor(w, p.id, [x, Math.max(ground(x, z), WATER), z]);
  mark(w, 'exit vehicle');
}
function applyWheel(w: GW, r: Ride, offset: Vector3, front: boolean, throttle: number, steer: number): void {
  const physics = physicsOf(w),
    state = physics.readBody(r.body),
    q = state.rotation;
  const up = new Vector3(0, 1, 0).applyQuaternion(q),
    at = offset.clone().applyQuaternion(q).add(state.position);
  const hit = physics.raycast(at, up.clone().negate(), {
    maxDistance: 0.75,
    groups: ['world', 'prop'],
    exclude: r.body,
  });
  if (!hit) return;
  const vel = state.velocity.clone().add(state.angularVelocity.clone().cross(at.clone().sub(state.position)));
  const yawQ = new Quaternion().setFromAxisAngle(up, front ? steer * 0.5 : 0);
  const fwd = new Vector3(0, 0, 1).applyQuaternion(q).applyQuaternion(yawQ),
    right = new Vector3(1, 0, 0).applyQuaternion(q).applyQuaternion(yawQ);
  const compression = 1 - hit.distance / 0.75,
    F = Math.max(0, value(w, 'car.spring') * compression * 0.75 - value(w, 'car.damper') * vel.dot(up));
  const limit = F * 1.1,
    lat = Math.max(-limit, Math.min(limit, (-vel.dot(right) * 350 * value(w, 'car.grip')) / 0.35));
  let drive = ((throttle * value(w, 'car.engine')) / 4) * (r.hp < 120 ? 0.6 : 1);
  drive = Math.max(-limit, Math.min(limit, drive));
  physics.applyImpulse(
    r.body,
    up.multiplyScalar(F).add(right.multiplyScalar(lat)).add(fwd.multiplyScalar(drive)).multiplyScalar(w.dt),
    at,
  );
}
function applyBoat(w: GW, r: Ride, throttle: number, steer: number): void {
  const physics = physicsOf(w),
    s = physics.readBody(r.body);
  let wet = 0;
  for (const x of [-0.7, 0.7])
    for (const z of [-2, 2]) {
      const at = new Vector3(x, -0.3, z).applyQuaternion(s.rotation).add(s.position),
        depth = WATER - at.y;
      if (depth <= 0) continue;
      wet++;
      const v = s.velocity.clone().add(s.angularVelocity.clone().cross(at.clone().sub(s.position)));
      physics.applyImpulse(r.body, [0, Math.max(0, 14000 * Math.min(depth, 0.6) - 2400 * v.y) * w.dt, 0], at);
    }
  if (!wet) return;
  const fwd = new Vector3(0, 0, 1).applyQuaternion(s.rotation),
    right = new Vector3(1, 0, 0).applyQuaternion(s.rotation),
    speed = s.velocity.dot(fwd),
    side = s.velocity.dot(right);
  const stern = new Vector3(0, -0.3, -2.2).applyQuaternion(s.rotation).add(s.position);
  physics.applyImpulse(
    r.body,
    fwd
      .clone()
      .multiplyScalar(throttle * 5200 * w.dt)
      .add(right.clone().multiplyScalar(-steer * Math.min(1, Math.abs(speed) / 4) * 1500 * w.dt)),
    stern,
  );
  physics.applyImpulse(
    r.body,
    fwd
      .multiplyScalar((-speed * Math.abs(speed) * 14 - speed * 40) * w.dt)
      .add(right.multiplyScalar(-side * 900 * w.dt)),
  );
}
export function vehicleForces(w: GW): void {
  const physics = physicsOf(w);
  for (const e of w.query('ride', 'sceneProp')) {
    const r = e.ride.data;
    if (r.hp <= 0) continue;
    const driver = players(w).find((p) => p.id === r.driver && !p.seat!.data.mounted),
      I = driver?.seat?.data.wants,
      b = I?.b ?? [];
    let throttle = (b.includes('throttle') ? 1 : 0) - (b.includes('brake') ? 0.65 : 0),
      steer = (b.includes('driveLeft') ? 1 : 0) - (b.includes('driveRight') ? 1 : 0);
    if (I?.move && !throttle) throttle = I.move[0] * Math.sin(r.yaw) + I.move[1] * Math.cos(r.yaw);
    if (I?.move && !steer) steer = -(I.move[0] * Math.cos(r.yaw) - I.move[1] * Math.sin(r.yaw));
    r.steer = steer;
    if (r.kind === 'boat') applyBoat(w, r, throttle, steer);
    else {
      const state = physics.readBody(r.body);
      if (
        state.position.y < WATER + 0.5 &&
        Math.abs(state.position.z - 902) < 21 &&
        Math.abs(state.position.x - 560) > 30
      )
        throttle = 0;
      for (const x of [-0.85, 0.85])
        for (const z of [-1.35, 1.35]) applyWheel(w, r, new Vector3(x, -0.2, z), z > 0, throttle, steer);
      if (b.includes('handbrake'))
        physics.applyImpulse(r.body, state.velocity.clone().multiplyScalar(-state.mass * 0.07));
    }
  }
}
export function vehicleSeats(w: GW): void {
  const physics = physicsOf(w),
    c = campaign(w);
  for (const e of w.query('ride', 'sceneProp')) {
    const r = e.ride.data,
      s = physics.readBody(r.body),
      q = s.rotation;
    Object.assign(e.sceneProp, {
      x: s.position.x,
      y: s.position.y - (r.kind === 'boat' ? 0.3 : 0.8),
      z: s.position.z,
      q: [q.x, q.y, q.z, q.w],
    });
    r.yaw = Math.atan2(2 * (q.w * q.y + q.x * q.z), 1 - 2 * (q.y * q.y + q.z * q.z));
    r.speed = s.velocity.length();
    r.spin += r.speed / 25;
    for (let k = 0; k < r.wheels.length; k++) {
      const wheel = w.get(r.wheels[k])?.sceneProp;
      if (!wheel) continue;
      const offset = new Vector3(k < 2 ? -0.9 : 0.9, -0.25, k % 2 === 0 ? -1.35 : 1.35)
        .applyQuaternion(q)
        .add(s.position);
      const floor = ground(offset.x, offset.z);
      if (Math.abs(offset.y - floor - 0.42) < 0.5) offset.y = floor + 0.42;
      const rotation = q
        .clone()
        .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), k % 2 === 1 ? r.steer * 0.5 : 0))
        .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), r.spin));
      Object.assign(wheel, {
        x: offset.x,
        y: offset.y,
        z: offset.z,
        q: [rotation.x, rotation.y, rotation.z, rotation.w],
      });
    }
    if (r.blocker >= 0) physics.setBody(r.blocker, { position: s.position, rotation: q });
    const occupants = players(w).filter((p) => p.seat!.data.vehicle === e.id);
    if (!occupants.length && r.blocker < 0)
      r.blocker = physics.addBody({
        type: 'kinematic',
        position: s.position,
        group: 'crowd',
        colliders: [{ shape: { type: 'box', size: [1.8, 1.4, r.kind === 'boat' ? 5 : 3.9] } }],
      });
    for (const p of occupants) {
      const seat = p.seat!.data,
        I = seat.wants;
      if ((I.p ?? []).includes('interact')) {
        exitVehicle(w, p);
        continue;
      }
      if ((I.p ?? []).includes('seat')) {
        if (!seat.mounted && occupants.some((other) => other.id !== p.id && other.seat!.data.mounted))
          say(w, 'Field note', 'The gun is occupied.');
        else seat.mounted = !seat.mounted;
        mark(w, 'mounted gun');
      }
      const passenger = occupants
        .filter((other) => other.id !== r.driver && !other.seat!.data.mounted)
        .findIndex((other) => other.id === p.id);
      const sx = seat.mounted ? 0 : p.id === r.driver ? -0.35 : passenger === 0 ? 0.35 : -0.4,
        sz = seat.mounted ? (r.kind === 'boat' ? 1.4 : -1) : p.id === r.driver ? 0 : passenger === 0 ? -0.1 : -1.45;
      const pos = new Vector3(sx, -0.3, sz).applyQuaternion(q).add(s.position);
      try {
        placeActor(w, p.id, pos, r.yaw);
      } catch {
        exitVehicle(w, p);
      }
      if (seat.mounted && !seat.map && (I.b ?? []).includes('fire') && w.tick % 6 === 0 && r.heat < 100) {
        r.heat += 4;
        const from: [number, number, number] = [pos.x, pos.y + 1.25, pos.z];
        let yaw = I.look?.[0] ?? r.yaw,
          pitch = I.look?.[1] ?? 0;
        if (I.aim) {
          yaw = Math.atan2(I.aim[0] - from[0], I.aim[2] - from[2]);
          pitch = Math.atan2(I.aim[1] - from[1], Math.hypot(I.aim[0] - from[0], I.aim[2] - from[2]));
        }
        const dir: [number, number, number] = [
          Math.sin(yaw) * Math.cos(pitch),
          Math.sin(pitch),
          Math.cos(yaw) * Math.cos(pitch),
        ];
        const hit = physics.raycast(from, dir, {
          maxDistance: 200,
          groups: ['actor', 'world', 'prop'],
          exclude: p.actor.body,
        });
        if (hit)
          for (const target of people(w))
            if (target.actor.body === hit.body) damage(w, target, { amount: 25, from, source: p.id });
        w.emit('gunshot', {
          id: p.id,
          weapon: 'weapon:mother-new-0',
          from,
          to: hit
            ? [hit.point.x, hit.point.y, hit.point.z]
            : [from[0] + dir[0] * 200, from[1] + dir[1] * 200, from[2] + dir[2] * 200],
          normal: null,
          body: hit?.body ?? -1,
          target: -1,
          hit: !!hit,
        });
        mark(w, 'mounted gun');
      }
    }
    r.heat = Math.max(0, r.heat - 0.2);
    if (c.fire[Math.floor(s.position.z / 8) * 192 + Math.floor(s.position.x / 8)] === 2)
      r.hp -= value(w, 'fire.damage') / 60;
    if (r.hp < 45 && r.hp > 0) {
      if (!r.burning) r.burning = w.tick + 600;
      if (w.tick >= r.burning) r.hp = 0;
    }
    if ((r.hp <= 0 && !r.burning) || (r.hp <= 0 && r.burning > 0)) {
      for (const p of occupants) exitVehicle(w, p);
      r.burning = -1;
      blast(w, s.position.x, s.position.y, s.position.z, 130, 14);
      mark(w, 'vehicle explosion');
    }
    if (r.hp > 0 && r.speed > 8)
      for (const p of people(w))
        if ((p.seat?.data.vehicle ?? -1) < 0 && Math.hypot(p.actor.x - s.position.x, p.actor.z - s.position.z) < 2) {
          damage(w, p, { amount: r.speed * 8, from: [s.position.x, s.position.y, s.position.z] });
          mark(w, 'run over');
        }
  }
}
