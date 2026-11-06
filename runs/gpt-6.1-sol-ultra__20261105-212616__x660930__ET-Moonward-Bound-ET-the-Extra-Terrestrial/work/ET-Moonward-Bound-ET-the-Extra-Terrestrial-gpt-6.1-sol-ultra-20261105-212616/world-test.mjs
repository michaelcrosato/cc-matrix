import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

let passed = 0, failed = 0;
function check(name, fn) {
  try { fn(); passed++; }
  catch (error) { failed++; console.error(`FAIL world: ${name}: ${error.message}`); }
}

try {
  globalThis.document = {
    createElement: () => ({
      width: 512, height: 128,
      getContext: () => ({ beginPath() {}, roundRect() {}, fill() {}, stroke() {}, fillText() {} }),
    }),
  };
  const source = await readFile(new URL('./world.js', import.meta.url), 'utf8');
  const { buildWorld } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const priorWarn = console.warn;
  console.warn = (...args) => {
    if (!String(args[0]).includes('using deprecated parameters')) priorWarn(...args);
  };
  await RAPIER.init();
  console.warn = priorWarn;
  const scene = new THREE.Scene();
  const physics = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  const world = buildWorld(THREE, scene, physics, { RAPIER });

  check('complete encounter and collectible counts', () => {
    assert.deepEqual(
      [world.targets.length, world.agents.length, world.flowers.length, world.candies.length, world.hoops.length, world.hazards.length],
      [3, 3, 4, 8, 12, 5],
    );
  });
  check('all world transforms are finite', () => {
    scene.traverse(object => assert.ok(Number.isFinite(object.position.x + object.position.y + object.position.z)));
  });
  check('all required collectibles have clear physical approach', () => {
    for (const target of world.targets) {
      let hits = 0;
      physics.intersectionsWithShape(
        { x: target.x, y: 1, z: target.z }, { x: 0, y: 0, z: 0, w: 1 }, new RAPIER.Ball(0.8),
        () => { hits++; return true; },
      );
      assert.equal(hits, 0, `blocked ${target.id}`);
    }
  });
  world.update(1, 1 / 60);
  const agent = world.agents[0], originalX = agent.x;
  world.update(5, 1 / 60);
  check('patrols move over time', () => assert.notEqual(agent.x, originalX));
  check('patrol detection data matches rendered position', () => {
    assert.equal(agent.x, agent.mesh.position.x);
    assert.equal(agent.z, agent.mesh.position.z);
    assert.equal(agent.heading, agent.mesh.rotation.y);
  });
  agent.stunned = 2;
  const stunnedX = agent.x, stunnedZ = agent.z;
  world.update(6, 1 / 60);
  check('stun freezes patrol position', () => {
    assert.equal(agent.x, stunnedX); assert.equal(agent.z, stunnedZ);
  });
  check('stun visibly extinguishes search cone and slumps agent', () => {
    assert.equal(agent.cone.visible, false); assert.equal(agent.pool.visible, false);
    assert.equal(agent.mesh.rotation.z, 0.22);
  });
  agent.stunned = 0;
  world.update(7, 1 / 60);
  check('patrol and cone recover when stun ends', () => {
    assert.ok(agent.cone.visible && agent.pool.visible); assert.notEqual(agent.x, stunnedX);
  });
  const flower = world.flowers[0];
  flower.healed = true;
  world.update(8, 1 / 60);
  check('healing visibly blooms flower', () => assert.equal(flower.plant.scale.x, 1.55));
  const petalMaterial = flower.petals[0].material;
  world.update(9, 1 / 60);
  check('flower material is stable and restart restores flower scale', () => {
    assert.equal(flower.petals[0].material, petalMaterial);
    flower.mesh.scale.setScalar(1.4);
    world.reset();
    assert.equal(flower.mesh.scale.x, 1); assert.equal(flower.plant.scale.x, 1);
    assert.equal(flower.healed, false);
  });
  check('moon and stars remain visible through world fog', () => {
    world.lighting.moon.traverse(object => { if (object.isMesh) assert.equal(object.material.fog, false); });
    for (const star of world.lighting.stars) assert.equal(star.material.fog, false);
  });
  physics.free();
} catch (error) {
  failed++; console.error(`FAIL world setup: ${error.stack || error.message}`);
}
console.log(`World: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
