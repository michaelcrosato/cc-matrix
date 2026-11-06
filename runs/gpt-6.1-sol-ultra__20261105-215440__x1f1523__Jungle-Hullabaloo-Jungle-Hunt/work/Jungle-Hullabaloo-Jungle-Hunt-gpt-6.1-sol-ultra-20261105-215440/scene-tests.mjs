import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three/webgpu';

let checks = 0;
const failures = [];
const test = (name, fn) => {
  checks++;
  try {
    fn();
  } catch (error) {
    failures.push(name);
    console.error(`FAIL scene: ${name}: ${error.message}`);
  }
};

try {
  // The build bundles ES module sources from a package whose tools are CommonJS.
  const source = await readFile(new URL('./scene.js', import.meta.url), 'utf8');
  const { JungleScene } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const view = new JungleScene(THREE);
  const animations = ['idle', 'run', 'swim', 'swing', 'jump', 'duck', 'attack'];

  for (let stage = 0; stage < 4; stage++) {
    for (const anim of animations) {
      test(`chapter ${stage + 1}, ${anim} native clip, camera and obstacles`, () => {
        const state = {
          stage, time: 2, cameraX: 20,
          players: [{ x: 20, y: stage === 1 ? -2 : 0, anim,
            attack: anim === 'attack' ? .3 : 0, duck: anim === 'duck' }],
          vines: [{ anchorX: 20, anchorY: 13, x: 22, y: 4 }],
          enemies: [
            { id: 'croc', type: 'croc', x: 20, y: -2 },
            { id: 'small', type: 'rock', x: 24, y: 2, r: .72 },
            { id: 'large', type: 'rock', x: 28, y: 5, r: 1.45 },
            { id: 'guard', type: 'guard', x: 33, y: 0 },
          ],
          collectibles: [{ x: 15, y: 2 }],
          bells: [true, false],
        };
        view.resize(1920, 1080);
        view.update(.12, state);
        assert.equal(view.stage, stage);
        assert.ok(view.world.children.length > 100, 'stage scenery was not populated');
        assert.ok(view.camera instanceof THREE.OrthographicCamera);
        assert.ok(view.camera.matrixWorld.elements.every(Number.isFinite));
        assert.ok(view.camera.projectionMatrix.elements.every(Number.isFinite));
        assert.ok(view.camera.left < view.camera.right);
        assert.ok(view.camera.bottom < view.camera.top);
        const player = view.players[0];
        assert.ok(player.mixer instanceof THREE.AnimationMixer, 'native mixer missing');
        assert.equal(player.anim, anim);
        assert.ok(player.actions[anim].getClip() instanceof THREE.AnimationClip);
        assert.ok(player.actions[anim].getClip().tracks.length >= 4);
        assert.ok(player.actions[anim].time > 0, 'native animation did not advance');
        for (const joint of ['armL', 'armR', 'legL', 'legR']) {
          const angle = player.body.getObjectByName(joint).rotation.z;
          assert.ok(Number.isFinite(angle) && Math.abs(angle) < 3.2, `invalid ${joint} pose`);
        }
        assert.equal(view.enemyMeshes.get('small').scale.x, .72, 'small rock differs from Rapier radius');
        assert.equal(view.enemyMeshes.get('large').scale.x, 1.45, 'large rock differs from Rapier radius');
        assert.ok(view.enemyMeshes.get('croc').userData.jaw, 'crocodile jaw articulation missing');
        assert.ok(view.enemyMeshes.get('guard').userData.spear, 'guard spear articulation missing');
        assert.equal(view.vineMeshes[0].userData.knot.position.y, 4);
        assert.equal(view.coinMeshes[0].visible, true);
      });
    }
  }

  test('river banks match physics, portrait camera and rescue clearance', () => {
    view.buildStage(1);
    const tops = view.world.children.filter(mesh => mesh.isMesh && mesh.geometry === view.geo('box')
      && Math.abs(mesh.scale.y - .65) < 1e-8 && Math.abs(mesh.scale.z - 8.4) < 1e-8);
    const bank = (center, width, top) => {
      const mesh = tops.find(m => m.position.x === center && m.scale.x === width);
      assert.ok(mesh, `bank ${center} missing`);
      assert.ok(Math.abs(mesh.position.y + .32 - top) < 1e-8, 'bank top differs from physics');
      return [mesh.position.x - mesh.scale.x / 2, mesh.position.x + mesh.scale.x / 2];
    };
    assert.deepEqual(bank(-5, 10, 2), [-10, 0]);
    assert.deepEqual(bank(109, 18, 2), [100, 118]);
    view.resize(390, 844);
    assert.ok(view.camera.left < 0 && view.camera.right > 0);
    assert.ok(view.camera.projectionMatrix.elements.every(Number.isFinite));
    view.update(1 / 60, { stage: 3, time: 3, rescued: true, rescueTime: 2, players: [] });
    assert.ok(view.rescue.userData.cage.position.y > view.rescue.userData.bird.position.y,
      'cage did not lift independently clear of Pip');
    assert.equal(view.bellMeshes.length, 2);
  });
} catch (error) {
  failures.push('initialization');
  console.error(`FAIL scene: initialization: ${error.stack || error}`);
}
console.log(`${checks - failures.length} passed, ${failures.length} failed (${checks} scene checks)`);
if (failures.length) process.exitCode = 1;
