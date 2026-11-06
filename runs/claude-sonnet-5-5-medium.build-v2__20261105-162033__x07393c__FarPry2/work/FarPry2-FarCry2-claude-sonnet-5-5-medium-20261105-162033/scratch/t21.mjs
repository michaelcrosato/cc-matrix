import { freePlay } from '../tests/lib/boot.mjs';
import { THREE } from '../pixel-engine.js';
async function trial(name, fn) { const { e, g } = await freePlay(); const s = g.spawnSoldier({ faction: 'concord', at: [30, 180], yaw: 0, duty: 'guard' }); e.step(5); s.view.object.position.copy(s.pos); s.view.object.updateMatrixWorld(true); try { fn(g, s); e.step(10); console.log(name, 'OK'); } catch (err) { console.log(name, 'ERR', err.message); } }
await trial('A remove-first', (g, s) => { g.ctx.physics.remove(s.ctrl.body); s.view.die(new THREE.Vector3(0, 1.5, 0)); });
await trial('B disable-body', (g, s) => { s.ctrl.body.setEnabled(false); s.view.die(new THREE.Vector3(0, 1.5, 0)); });
await trial('C ragdoll only', (g, s) => { s.view.die(new THREE.Vector3(0, 1.5, 0)); });
await trial('D remove only', (g, s) => { g.ctx.physics.remove(s.ctrl.body); });
