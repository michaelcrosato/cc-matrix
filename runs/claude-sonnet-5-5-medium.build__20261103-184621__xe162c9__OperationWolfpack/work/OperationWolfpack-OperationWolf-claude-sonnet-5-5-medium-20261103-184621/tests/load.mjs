// loads the engine and the game's sim files into a node:vm context (no DOM), as the engine's own game/test.mjs does
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const load = (files = ['00-core', '10-sim', '20-ops', '50-bot']) => {
  const ctx = { console, Math, setTimeout, clearTimeout }; ctx.globalThis = ctx; vm.createContext(ctx);
  const run = (f, name) => vm.runInContext(readFileSync(path.join(root, f), 'utf8'), ctx, { filename: name || f });
  run('engine/my-3d2dge.js'); run('engine/modules/mode7.js');
  for (const f of files) run('src/' + f + '.js');
  return ctx;
};
