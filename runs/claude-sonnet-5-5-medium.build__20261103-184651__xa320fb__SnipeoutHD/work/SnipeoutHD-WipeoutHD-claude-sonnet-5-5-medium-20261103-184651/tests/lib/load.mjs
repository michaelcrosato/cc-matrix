import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
export function loadSim(files = ['00-core', '20-track', '30-sim']) {
  const ctx = { console, Math, Float32Array, Uint32Array, Set, Map, Object, Array, JSON, Number, String, Date, isFinite };
  ctx.globalThis = ctx; ctx.My3D2dge = {}; vm.createContext(ctx);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(root, 'src', f + '.js'), 'utf8'), ctx, { filename: f });
  return ctx.SN;
}
export { root };
