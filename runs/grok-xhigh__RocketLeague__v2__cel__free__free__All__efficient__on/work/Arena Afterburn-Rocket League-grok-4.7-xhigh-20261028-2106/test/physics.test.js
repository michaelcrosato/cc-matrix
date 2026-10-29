import assert from 'node:assert/strict';
import test from 'node:test';
import RAPIER from '@dimforge/rapier3d-compat';
import { CAR } from '../src/constants.js';
import { createPhysics } from '../src/physics.js';

test('rapier arena floor holds a dynamic ball and a ground ray points up', async () => {
  const physics = await createPhysics(RAPIER);
  const body = physics.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 6, 0).setCanSleep(false));
  physics.world.createCollider(RAPIER.ColliderDesc.ball(1.2).setRestitution(0.15), body);
  for (let i = 0; i < 240; i += 1) physics.world.step();
  const y = body.translation().y;
  assert.ok(y < 4, `ball should fall, y=${y}`);
  assert.ok(y > 0.5, `ball should rest on the floor, y=${y}`);

  physics.ensureCars(1);
  const normal = physics.sampleSurface(
    { id: 'probe', pos: { x: 0, y: CAR.half.y, z: 0 } },
    physics.carBodies[0],
  );
  assert.ok(normal, 'expected a floor hit');
  assert.ok(normal.y > 0.5, `floor normal should point up, got ${JSON.stringify(normal)}`);
});
