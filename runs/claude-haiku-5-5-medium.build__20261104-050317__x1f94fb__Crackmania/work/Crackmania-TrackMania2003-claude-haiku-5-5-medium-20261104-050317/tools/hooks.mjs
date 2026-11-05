// Module resolution for Node: the bare specifiers the 3D engine and our game import map to the vendored files.
const ROOT = new URL('../engine/vendor/', import.meta.url);
const MAP = {
  'three': 'three-0.182.0/three.webgpu.min.js',
  'three/webgpu': 'three-0.182.0/three.webgpu.min.js',
  'three/tsl': 'three-0.182.0/three.tsl.min.js',
  '@dimforge/rapier3d-simd-compat': 'rapier3d-simd-compat-0.19.3/rapier.js',
};
export async function resolve(spec, ctx, next) {
  if (MAP[spec]) return { url: new URL(MAP[spec], ROOT).href, shortCircuit: true, format: 'module' };
  return next(spec, ctx);
}
