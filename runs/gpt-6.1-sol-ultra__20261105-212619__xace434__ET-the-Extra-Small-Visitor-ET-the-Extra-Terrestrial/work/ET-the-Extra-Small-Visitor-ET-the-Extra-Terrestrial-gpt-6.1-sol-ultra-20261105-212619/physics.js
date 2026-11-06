import RAPIER from '@dimforge/rapier3d-compat';

let initialized;
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

/** Ground-plane capsule movement and genuinely dynamic, bouncing candy pieces. */
export async function createPhysics(obstacles = []) {
  initialized ??= RAPIER.init();
  await initialized;
  return new Physics(obstacles);
}

class Physics {
  constructor(obstacles) {
    this.rapier = RAPIER;
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.characters = new Set();
    this.candies = new Set();
    this.staticColliders = [];
    // Membership bit 1: scenery; 2: characters; 4: candy. Friendly actors
    // never block one another, and thrown candy cannot trip up the children.
    const ground = RAPIER.ColliderDesc.cuboid(500, 0.5, 500)
      .setTranslation(0, -0.5, 0)
      .setFriction(0.9)
      .setCollisionGroups(0x00010007);
    this.staticColliders.push(this.world.createCollider(ground));
    for (const obstacle of obstacles) {
      const { x = 0, z = 0, w, d, h = 2 } = obstacle;
      if (![x, z, w, d, h].every(Number.isFinite) || w <= 0 || d <= 0 || h <= 0) {
        throw new TypeError('Physics obstacles require finite x/z and positive w/d/h.');
      }
      const desc = RAPIER.ColliderDesc.cuboid(w * 0.5, h * 0.5, d * 0.5)
        .setTranslation(x, h * 0.5, z)
        .setFriction(0.9)
        .setCollisionGroups(0x00010007);
      const collider = this.world.createCollider(desc);
      collider.userData = obstacle;
      this.staticColliders.push(collider);
    }
    // Build the query acceleration structure before the first character cast.
    this.world.step();
  }

  addCharacter(x, z) {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(finite(x), 0.9, finite(z))
        .lockRotations(),
    );
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.capsule(0.5, 0.35)
        .setFriction(0)
        .setCollisionGroups(0x00020001),
      body,
    );
    const controller = this.world.createCharacterController(0.025);
    controller.setUp({ x: 0, y: 1, z: 0 });
    controller.setSlideEnabled(true);
    controller.enableAutostep(0.20, 0.20, false);
    controller.enableSnapToGround(0.25);
    controller.setMaxSlopeClimbAngle(Math.PI / 4);
    controller.setMinSlopeSlideAngle(Math.PI / 6);
    const character = { body, collider, controller, grounded: false, verticalVelocity: -1, collisions: 0 };
    this.characters.add(character);
    return character;
  }

  /** dx/dz are desired frame displacement, rather than velocity. */
  move(character, dx, dz, dt = 1 / 60) {
    const step = Math.max(1 / 240, Math.min(0.1, finite(dt, 1 / 60)));
    character.verticalVelocity = character.grounded ? -1 : Math.max(-16, character.verticalVelocity - 9.81 * step);
    character.controller.computeColliderMovement(
      character.collider,
      { x: finite(dx), y: character.verticalVelocity * step, z: finite(dz) },
      RAPIER.QueryFilterFlags.ONLY_FIXED,
    );
    const movement = character.controller.computedMovement();
    const current = character.body.translation();
    const next = { x: current.x + movement.x, y: current.y + movement.y, z: current.z + movement.z };
    character.grounded = character.controller.computedGrounded();
    character.collisions = character.controller.numComputedCollisions();
    character.body.setNextKinematicTranslation(next);
    return { x: next.x, z: next.z };
  }

  teleport(character, x, z) {
    const position = { x: finite(x), y: 0.9, z: finite(z) };
    character.body.setTranslation(position, true);
    character.body.setNextKinematicTranslation(position);
    character.verticalVelocity = -1;
    character.grounded = false;
    this.world.propagateModifiedBodyPositionsToColliders();
    return { x: position.x, z: position.z };
  }

  step(dt = 1 / 60) {
    const timestep = Math.max(1 / 240, Math.min(0.1, finite(dt, 1 / 60)));
    this.world.timestep = timestep;
    this.world.step();
    for (const candy of this.candies) candy.age += timestep;
  }

  throwCandy(x, z, dx = 0, dz = -1) {
    let directionX = finite(dx);
    let directionZ = finite(dz, -1);
    const length = Math.hypot(directionX, directionZ);
    if (length < 0.001) { directionX = 0; directionZ = -1; }
    else { directionX /= length; directionZ /= length; }
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(finite(x) + directionX * 0.65, 1.05, finite(z) + directionZ * 0.65)
        .setLinvel(directionX * 5.0, 3.8, directionZ * 5.0)
        .setAngvel({ x: 4.2, y: 2.5, z: 3.4 })
        .setLinearDamping(0.45)
        .setAngularDamping(0.6)
        .setCcdEnabled(true),
    );
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.ball(0.13)
        .setDensity(0.6)
        .setFriction(0.85)
        .setRestitution(0.34)
        .setCollisionGroups(0x00040001),
      body,
    );
    const candy = { body, collider, age: 0 };
    this.candies.add(candy);
    return candy;
  }

  removeCandy(candy) {
    if (!this.candies.delete(candy)) return;
    if (candy.body.isValid()) this.world.removeRigidBody(candy.body);
  }

  removeCharacter(character) {
    if (!this.characters.delete(character)) return;
    this.world.removeCharacterController(character.controller);
    if (character.body.isValid()) this.world.removeRigidBody(character.body);
  }

  debug() {
    return this.world.debugRender();
  }

  dispose() {
    for (const character of [...this.characters]) this.removeCharacter(character);
    for (const candy of [...this.candies]) this.removeCandy(candy);
    this.world.free();
  }
}
