import vm from 'node:vm';
import { readFileSync } from 'node:fs';
export function loadGame(extra = '') {
  const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, setTimeout, clearTimeout }; vm.createContext(ctx);
  for (const f of ['../engine/my-3d2dge.js', '../dist/game.js']) vm.runInContext(readFileSync(new URL(f, import.meta.url), 'utf8'), ctx, { filename: f });
  const E = ctx.My3D2dge, game = E.current;
  return { ctx, E, game, I: game.input, D: game.debug };
}
export const results = { n: 0, fails: [] };
export const check = (what, ok, detail = '') => { results.n++; if (!ok) results.fails.push(what + (detail ? ' -> ' + detail : '')); };
