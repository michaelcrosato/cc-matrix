// Shared headless harness: a stub game so events can run without a browser.
import * as THREE from 'three/webgpu';
import { initRapier } from '../src/physics/world.js';
import { tuning, resetTuning } from '../src/data/tuning.js';
export async function makeStub() {
  await initRapier();
  const noop = () => {};
  const game = { settings: { difficulty: 1, autoBreathe: false, rhythmOffset: 0, reduceShake: false }, gfx: { stage: new THREE.Group(), camera: new THREE.PerspectiveCamera() }, audio: { sfx: noop, speak: () => 1, play: noop }, input: { dev: () => ({}), weight: () => [0, 0, 'stick'], steer: () => [0, 0] },
    mat: (c) => new THREE.MeshBasicMaterial({ color: c }), bark: noop, rumble: noop, comic: noop, quip: noop, noteFall: noop, god: false, tuningMedalScale: () => 1 };
  return game;
}
export function run(ev, seconds, hook) { ev.begin(); const n = Math.round(seconds * 120); for (let i = 0; i < n && ev.phase !== 'done'; i++) { ev.fixed(1 / 120); hook && hook(ev, i); } }
export { tuning, resetTuning };
