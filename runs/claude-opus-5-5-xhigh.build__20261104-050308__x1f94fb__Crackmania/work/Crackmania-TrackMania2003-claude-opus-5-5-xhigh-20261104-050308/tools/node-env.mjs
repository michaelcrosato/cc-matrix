// the engine, the 3D engine and the game in Node, no browser (PLAN §9.1)
import { registerHooks } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const ROOT = fileURLToPath(new URL('..', import.meta.url)), V = ROOT + 'engine/vendor/';
const MAP = { 'three': 'three-0.182.0/three.webgpu.min.js', 'three/webgpu': 'three-0.182.0/three.webgpu.min.js', 'three/tsl': 'three-0.182.0/three.tsl.min.js', '@dimforge/rapier3d-simd-compat': 'rapier3d-simd-compat-0.19.3/rapier.js' };
registerHooks({ resolve: (spec, ctx, next) => MAP[spec] ? { url: pathToFileURL(V + MAP[spec]).href, format: 'module', shortCircuit: true } : next(spec, ctx) });
// Rapier's harmless warning about its init parameters
const warn = console.warn; console.warn = (...a) => { if (String(a[0]).includes('deprecated parameters')) return; warn(...a); };
vm.runInThisContext(readFileSync(ROOT + 'engine/my-3d2dge.js', 'utf8'), { filename: 'my-3d2dge.js' });
export const E = globalThis.My3D2dge;
const standIn = () => { const d = globalThis.document; delete globalThis.document; const c = E.mkCanvas(1, 1); globalThis.document = d; return c; };
globalThis.document = { createElement: standIn, getElementById: () => null, querySelector: () => null, addEventListener() {}, removeEventListener() {} };
await import(pathToFileURL(ROOT + 'engine/my-3d2dge-3d.js').href);
export async function makeGame(o = {}) {
  const { createGame } = await import(pathToFileURL(ROOT + 'src/main.js').href);
  return createGame({ headless: true, ...o });
}
export { ROOT };
