// Loads the engine and the game in node:vm, headless, with fixed steps.
import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ROOT = new URL('../', import.meta.url);
export const man = JSON.parse(readFileSync(new URL('src/manifest.json', ROOT)));
export function load({ draw = false, hub = null } = {}) { const ctx = { console, performance }; ctx.window = ctx; if (hub) ctx.AIHub = hub; ctx.__gameOptions = { headless: true, draw, fullscreen: false }; vm.createContext(ctx); vm.runInContext(readFileSync(new URL('vendor/my-3d2dge/dist/handoff/my-3d2dge.js', ROOT), 'utf8'), ctx, { filename: 'engine.js' }); for (const f of [...man.core, ...man.game]) vm.runInContext(readFileSync(new URL('src/' + f, ROOT), 'utf8'), ctx, { filename: f }); return { ctx, G: ctx.GAME, E: ctx.My3D2dge, game: ctx.GAME.game }; }
