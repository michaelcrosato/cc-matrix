import * as THREE from 'three/webgpu';
import { makeInk } from './ink.js';
import { T } from '../core/tuning.js';
export const R = { renderer: null, ink: null, backend: 'none', lost: null, frames: 0, sun: null, hemi: null };
export function makeScene() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, innerWidth / Math.max(1, innerHeight), .1, 1500);
  const hemi = new THREE.HemisphereLight(0xffffff, 0xa09080, 1.35); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 3); sun.position.set(24, 42, 18); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0006; sun.shadow.normalBias = .035;
  const c = sun.shadow.camera; c.left = -34; c.right = 34; c.top = 34; c.bottom = -34; c.near = 1; c.far = 140; scene.add(sun); scene.add(sun.target);
  R.sun = sun; R.hemi = hemi;
  return { scene, camera };
}
export async function startRenderer(scene, camera) {
  const canvas = document.createElement('canvas'); canvas.id = 'game'; document.body.prepend(canvas);
  const renderer = new THREE.WebGPURenderer({ antialias: true, canvas });
  await renderer.init();
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  R.renderer = renderer;
  R.backend = renderer.backend.isWebGPUBackend ? 'webgpu' : 'webgl2';
  const dev = renderer.backend.device;
  if (dev && dev.lost) dev.lost.then((i) => { R.lost = i.message || i.reason || 'device lost'; });
  R.ink = makeInk(renderer, scene, camera);
  addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / Math.max(1, innerHeight); camera.updateProjectionMatrix(); });
  return renderer;
}
export function draw() {
  if (!R.renderer) return;
  const u = R.ink.u;
  u.hull.value = T.inkHull * R.inkScale(); u.width.value = T.inkWidth * R.inkScale(); u.boil.value = T.inkBoil; u.grain.value = T.inkGrain;
  R.ink.post.render(); R.frames++;
}
R.inkStrength = 1; R.inkOn = true;
R.inkScale = () => (R.inkOn ? R.inkStrength : 0);
export function setWipe(v) { R.wipe = v; if (R.ink) R.ink.u.wipe.value = v; }
R.wipe = 0;
