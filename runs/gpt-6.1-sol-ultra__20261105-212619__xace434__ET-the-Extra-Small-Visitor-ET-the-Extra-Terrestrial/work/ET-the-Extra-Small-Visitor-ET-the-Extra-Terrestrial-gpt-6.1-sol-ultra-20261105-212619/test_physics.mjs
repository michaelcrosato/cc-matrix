import { createPhysics } from './physics.js';
import { pathToFileURL } from 'node:url';

export async function runPhysicsChecks() {
  const failures = [];
  let count = 0;
  function check(condition, message) {
    count++;
    if (!condition) failures.push(message);
  }
  const physics = await createPhysics([{ x: 4, z: 0, w: 2, d: 3, h: 3 }]);
  const character = physics.addCharacter(0, 0);
  const dt = 1 / 60;
  for (let i = 0; i < 120; i++) { physics.move(character, 0.10, 0, dt); physics.step(dt); }
  const blocked = character.body.translation();
  check(blocked.x > 2.5 && blocked.x < 2.66, `Capsule passed through wall or stopped too early: x=${blocked.x}`);
  check(blocked.y > 0.84 && blocked.y < 0.91 && character.grounded, `Capsule did not rest on ground: y=${blocked.y}`);
  physics.teleport(character, 0, 0);
  for (let i = 0; i < 35; i++) { physics.move(character, 0.10, 0.03, dt); physics.step(dt); }
  const sliding = character.body.translation();
  check(sliding.x > 2.5 && sliding.x < 2.66 && sliding.z > 0.95, `Move-and-slide failed against wall: ${JSON.stringify(sliding)}`);
  physics.teleport(character, 0, 0);
  physics.move(character, 30, 0, dt); physics.step(dt);
  check(character.body.translation().x < 2.66, 'Fast capsule movement tunneled through scenery');
  const friend = physics.addCharacter(0, 0);
  physics.teleport(character, 0, 0);
  for (let i = 0; i < 12; i++) { physics.move(character, 0, 0.1, dt); physics.move(friend, 0, 0.1, dt); physics.step(dt); }
  check(Math.abs(character.body.translation().z - friend.body.translation().z) < 0.01, 'Friendly characters unexpectedly blocked each other');
  const candy = physics.throwCandy(-4, 4, 1, 0);
  const start = candy.body.translation();
  for (let i = 0; i < 10; i++) physics.step(dt);
  const rising = candy.body.translation();
  check(rising.y > start.y && rising.x > start.x, 'Candy did not launch with ballistic velocity');
  for (let i = 0; i < 360; i++) physics.step(dt);
  const landed = candy.body.translation();
  check(landed.y > 0.10 && landed.y < 0.17 && Math.abs(candy.body.linvel().y) < 0.1, `Candy failed ground collision/settling: ${JSON.stringify(landed)}`);
  check(candy.age > 6, 'Candy lifetime did not advance');
  const debug = physics.debug();
  check(debug.vertices.length > 0 && debug.colors.length > 0, 'Physics debug geometry was empty');
  physics.removeCandy(candy); physics.removeCandy(candy);
  check(!candy.body.isValid() && physics.candies.size === 0, 'Candy removal left a rigid body behind');
  physics.removeCharacter(friend);
  check(!friend.body.isValid(), 'Character removal left a rigid body behind');
  physics.dispose();
  return { failures, count };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { failures, count } = await runPhysicsChecks();
  for (const failure of failures) console.log(`FAIL: ${failure}`);
  console.log(`${count - failures.length}/${count} physics checks passed`);
  process.exitCode = failures.length ? 1 : 0;
}
