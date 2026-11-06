import vm from 'node:vm';
import fs from 'node:fs';
export function load(extra = false) {
  const c = vm.createContext({ console, TextEncoder });
  for (const file of [
    'vendor/engine/dist/handoff/my-3d2dge.js',
    'content/tower.js',
    'src/simulation.js',
    ...(extra ? ['src/presentation.js'] : []),
  ])
    vm.runInContext(fs.readFileSync(file, 'utf8'), c, { filename: file });
  return c;
}
