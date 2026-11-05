// Loads the engine and the game's src files, in manifest order, into a fresh vm context (the browser's window is the
// context itself). Returns the game handle the tests drive: game.advance, input taps and holds, game.debug.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dev = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, dev), 'utf8');

export function boot(o = {}) {
  const ctx = { console: o.quiet === false ? console : { log() {}, info() {}, warn() {}, error() {} }, addEventListener() {}, location: { hash: '' } };
  ctx.window = ctx; vm.createContext(ctx);
  const files = ['engine/my-3d2dge.js', ...JSON.parse(read('src/manifest.json')).map(f => 'src/' + f)];
  for (const f of files) vm.runInContext(read(f), ctx, { filename: f });
  const E = ctx.My3D2dge, game = E.current, OB = ctx.OB;
  return { ctx, E, game, OB, I: game.input, snap: () => game.debug.snapshot() };
}
export const fileName = fileURLToPath;
