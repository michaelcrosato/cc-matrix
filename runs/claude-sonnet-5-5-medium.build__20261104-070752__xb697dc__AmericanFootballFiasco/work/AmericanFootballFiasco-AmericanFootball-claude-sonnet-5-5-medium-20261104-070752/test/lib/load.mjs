// Loads the game's scripts (index.html order) into a vm context, headless: no screen, no sound, fixed steps.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const root = new URL('../../', import.meta.url);
export function loadGame(extra = {}) {
  const html = readFileSync(new URL('index.html', root), 'utf8');
  const srcs = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]).filter(s => !s.includes('session.js'));
  const ctx = Object.assign({ console }, extra); vm.createContext(ctx);
  for (const f of srcs) {
    try { vm.runInContext(readFileSync(new URL(f, root), 'utf8'), ctx, { filename: f }); }
    catch (e) { throw new Error('loading ' + f + ': ' + (e.stack || e)); }
  }
  const E = ctx.My3D2dge, FF = ctx.FF, game = FF.game;
  return { ctx, E, FF, game };
}
