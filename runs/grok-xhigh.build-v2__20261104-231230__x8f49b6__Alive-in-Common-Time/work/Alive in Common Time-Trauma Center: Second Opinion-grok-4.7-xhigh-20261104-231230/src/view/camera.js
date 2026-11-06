import * as THREE from 'three/webgpu';

/** One conversion: field (x right, y up the drape) → world (x, y up, z). Camera sits on +z. */
export function fieldToWorld(x, y, lift = 0) {
  return new THREE.Vector3(x, lift, -y);
}

export function placeOrCamera(camera, aspect) {
  const target = new THREE.Vector3(0, 0.1, 0.06);
  const base = new THREE.Vector3(0, 3.55, 1.65);
  const dir = base.sub(target);
  const scale = aspect < 16 / 9 ? (16 / 9) / aspect : 1;
  camera.fov = 34;
  camera.near = 0.1;
  camera.far = 60;
  camera.aspect = aspect || 16 / 9;
  camera.position.copy(target).addScaledVector(dir, scale);
  camera.up.set(0, 1, 0);
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  return target;
}

export function placeStoryCamera(camera, aspect) {
  camera.fov = 30;
  camera.near = 0.1;
  camera.far = 60;
  camera.aspect = aspect || 16 / 9;
  camera.position.set(0, 0.2, 12.5);
  camera.up.set(0, 1, 0);
  camera.lookAt(0, 0.4, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

const rayNdc = new THREE.Vector3();
const rayFar = new THREE.Vector3();

export function pointerToField(camera, clientX, clientY, rect) {
  const w = rect?.width || 1;
  const h = rect?.height || 1;
  const nx = ((clientX - (rect?.left || 0)) / w) * 2 - 1;
  const ny = -((clientY - (rect?.top || 0)) / h) * 2 + 1;
  rayNdc.set(nx, ny, 0).unproject(camera);
  rayFar.set(nx, ny, 1).unproject(camera);
  const dir = rayFar.sub(rayNdc);
  const t = dir.y !== 0 ? (0 - rayNdc.y) / dir.y : 0;
  const hitX = rayNdc.x + dir.x * t;
  const hitZ = rayNdc.z + dir.z * t;
  return { x: hitX, y: -hitZ };
}
