import { ARENA, BALL, CAR } from './constants.js';

/**
 * Rapier 0.19 collision world. The vehicle and ball rules live in vehicle.js and
 * ball.js. This world is stepped every frame and supplies surface normals.
 */
export async function createPhysics(RAPIER) {
  await RAPIER.init({});
  const world = new RAPIER.World({ x: 0, y: ARENA.gravity, z: 0 });
  const hx = ARENA.width / 2;
  const hz = ARENA.length / 2;
  const thick = 1;
  const mouth = ARENA.goalWidth / 2;

  function fixedBox(x, y, z, hw, hh, hd) {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z));
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(hw, hh, hd).setFriction(0.6).setRestitution(0.4),
      body,
    );
  }

  fixedBox(0, -thick, 0, hx + 6, thick, hz + ARENA.goalDepth + 6);
  fixedBox(0, ARENA.height + thick, 0, hx + 6, thick, hz + ARENA.goalDepth + 6);
  fixedBox(-hx - thick, ARENA.height / 2, 0, thick, ARENA.height / 2 + 2, hz + ARENA.goalDepth);
  fixedBox(hx + thick, ARENA.height / 2, 0, thick, ARENA.height / 2 + 2, hz + ARENA.goalDepth);

  const sideW = (hx - mouth) / 2;
  const sideCenter = mouth + sideW;
  const headerH = (ARENA.height - ARENA.goalHeight) / 2;
  for (const sign of [1, -1]) {
    const z = sign * (hz + thick);
    fixedBox(-sideCenter, ARENA.height / 2, z, sideW, ARENA.height / 2 + 1, thick);
    fixedBox(sideCenter, ARENA.height / 2, z, sideW, ARENA.height / 2 + 1, thick);
    fixedBox(0, ARENA.goalHeight + headerH, z, mouth, headerH, thick);
    const backZ = sign * (hz + ARENA.goalDepth + thick);
    fixedBox(0, ARENA.goalHeight / 2, backZ, mouth + 0.4, ARENA.goalHeight / 2 + 0.2, thick);
    const midZ = sign * (hz + ARENA.goalDepth / 2);
    fixedBox(-mouth - thick, ARENA.goalHeight / 2, midZ, thick, ARENA.goalHeight / 2, ARENA.goalDepth / 2);
    fixedBox(mouth + thick, ARENA.goalHeight / 2, midZ, thick, ARENA.goalHeight / 2, ARENA.goalDepth / 2);
  }

  const carBodies = [];
  const ballBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, BALL.radius, 0),
  );
  world.createCollider(RAPIER.ColliderDesc.ball(BALL.radius).setRestitution(BALL.restitution), ballBody);

  function ensureCars(count) {
    while (carBodies.length < count) {
      const body = world.createRigidBody(
        RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, CAR.half.y, 0),
      );
      world.createCollider(
        RAPIER.ColliderDesc.cuboid(CAR.half.x * 0.92, CAR.half.y * 0.92, CAR.half.z * 0.92).setFriction(0.4),
        body,
      );
      carBodies.push(body);
    }
  }

  function rayNormal(origin, direction, maxToi, exclude) {
    const ray = new RAPIER.Ray(origin, direction);
    const hit = world.castRayAndGetNormal(
      ray,
      maxToi,
      true,
      undefined,
      undefined,
      undefined,
      undefined,
      (collider) => {
        const parent = collider.parent();
        return parent !== exclude && parent !== ballBody;
      },
    );
    if (!hit) return null;
    const n = hit.normal;
    const length = Math.hypot(n.x, n.y, n.z);
    if (length < 0.5) return null;
    const facing = n.x * direction.x + n.y * direction.y + n.z * direction.z;
    if (facing >= -0.2) return null;
    return {
      toi: hit.timeOfImpact,
      normal: { x: n.x / length, y: n.y / length, z: n.z / length },
    };
  }

  function sampleSurface(car, body) {
    const origin = { x: car.pos.x, y: car.pos.y, z: car.pos.z };
    // Skin is shorter than the 0.12 jump separation, so the next sample misses the floor.
    const skin = 0.1;
    const probes = [
      [{ x: 0, y: -1, z: 0 }, CAR.half.y + skin],
      [{ x: 0, y: 1, z: 0 }, CAR.half.y + skin],
      [{ x: 1, y: 0, z: 0 }, CAR.half.x + skin],
      [{ x: -1, y: 0, z: 0 }, CAR.half.x + skin],
      [{ x: 0, y: 0, z: 1 }, CAR.half.z + skin],
      [{ x: 0, y: 0, z: -1 }, CAR.half.z + skin],
    ];
    let best = null;
    for (const [direction, maxToi] of probes) {
      const hit = rayNormal(origin, direction, maxToi, body);
      if (!hit) continue;
      if (!best || hit.toi < best.toi) best = hit;
    }
    return best ? best.normal : null;
  }

  function sampleWorld(cars) {
    const surfaces = {};
    for (let i = 0; i < cars.length; i += 1) {
      const normal = sampleSurface(cars[i], carBodies[i]);
      if (normal) surfaces[cars[i].id] = normal;
    }
    return surfaces;
  }

  function follow(cars, ball, quats) {
    ensureCars(cars.length);
    for (let i = 0; i < cars.length; i += 1) {
      const car = cars[i];
      carBodies[i].setNextKinematicTranslation({ x: car.pos.x, y: car.pos.y, z: car.pos.z });
      const q = quats && quats[i];
      if (q) carBodies[i].setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
    }
    ballBody.setNextKinematicTranslation({ x: ball.pos.x, y: ball.pos.y, z: ball.pos.z });
  }

  function step(dt) {
    world.timestep = dt;
    world.step();
  }

  return { world, RAPIER, ensureCars, sampleSurface, sampleWorld, follow, step, carBodies, ballBody };
}
