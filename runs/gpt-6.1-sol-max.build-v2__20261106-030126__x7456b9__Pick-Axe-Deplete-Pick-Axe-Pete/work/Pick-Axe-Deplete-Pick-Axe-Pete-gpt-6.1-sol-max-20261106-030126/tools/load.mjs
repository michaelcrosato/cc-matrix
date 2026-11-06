import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function load(
  files = ['vendor/engine/my-3d2dge.js', 'src/content/content.js', 'src/sim/mine.js', 'src/input/pilot.js'],
) {
  for (const file of files)
    vm.runInThisContext(fs.readFileSync(path.join(root, file), 'utf8'), { filename: file });
  return globalThis.PD;
}
