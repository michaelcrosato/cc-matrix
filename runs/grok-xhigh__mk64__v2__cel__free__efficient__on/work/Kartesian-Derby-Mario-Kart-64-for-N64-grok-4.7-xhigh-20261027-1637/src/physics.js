import RAPIER from "@dimforge/rapier3d-compat";
import { sampleCourse } from "./courses.js";

let ready = null;

export function loadRapier() {
  if (!ready) ready = RAPIER.init().then(() => RAPIER);
  return ready;
}

function addCuboid(world, R, body, hx, hy, hz, x, y, z) {
  world.createCollider(R.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z), body);
}

export async function createRaceWorld(course) {
  const R = await loadRapier();
  const world = new R.World({ x: 0, y: -22, z: 0 });
  const ground = world.createRigidBody(R.RigidBodyDesc.fixed());
  addCuboid(world, R, ground, 420, 1, 420, 0, -1.4, 0);
  if (course.kind === "circuit") {
    const step = Math.max(6, course.length / 90);
    for (let distance = 0; distance < course.length; distance += step) {
      const sample = sampleCourse(course, distance);
      const wallY = sample.y + 0.8;
      const side = course.wallHalf + 0.4;
      addCuboid(world, R, ground, 1.1, 1.1, 1.1, sample.x + sample.right.x * side, wallY, sample.z + sample.right.z * side);
      addCuboid(world, R, ground, 1.1, 1.1, 1.1, sample.x - sample.right.x * side, wallY, sample.z - sample.right.z * side);
      addCuboid(world, R, ground, 2.4, 0.25, 2.4, sample.x, sample.y - 0.35, sample.z);
    }
  } else {
    const hx = course.width / 2;
    const hz = course.depth / 2;
    addCuboid(world, R, ground, hx, 1.2, 0.6, 0, 1.2, -hz);
    addCuboid(world, R, ground, hx, 1.2, 0.6, 0, 1.2, hz);
    addCuboid(world, R, ground, 0.6, 1.2, hz, -hx, 1.2, 0);
    addCuboid(world, R, ground, 0.6, 1.2, hz, hx, 1.2, 0);
    for (const obstacle of course.obstacles || []) {
      if (obstacle.type === "cyl") {
        world.createCollider(
          R.ColliderDesc.cylinder(1.2, obstacle.r).setTranslation(obstacle.x, 1.2, obstacle.z),
          ground,
        );
      } else {
        addCuboid(world, R, ground, obstacle.hx, 1.2, obstacle.hz, obstacle.x, 1.2, obstacle.z);
      }
    }
  }
  const drop = course.kind === "arena" ? { x: 8, z: 8 } : sampleCourse(course, course.length * 0.25);
  const cone = world.createRigidBody(
    R.RigidBodyDesc.dynamic().setTranslation(drop.x || 0, 8, drop.z || 0).setCanSleep(false).setCcdEnabled(true),
  );
  world.createCollider(R.ColliderDesc.ball(0.45).setDensity(1.2).setRestitution(0.35), cone);
  return { RAPIER: R, world, cone };
}

export function stepWorld(world, steps = 1) {
  for (let i = 0; i < steps; i++) world.step();
}

export function bodyTranslation(body) {
  const t = body.translation();
  return { x: t.x, y: t.y, z: t.z };
}

export function pushBody(body, x, y, z) {
  body.applyImpulse({ x, y, z }, true);
  body.wakeUp();
}
