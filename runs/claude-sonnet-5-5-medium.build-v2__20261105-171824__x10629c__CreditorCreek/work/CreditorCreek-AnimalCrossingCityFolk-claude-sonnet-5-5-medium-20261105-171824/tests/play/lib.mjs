// Headless harness: boots the real game in Node, plays it through real input, checks state.
import { Engine } from '../../src/pixel-engine.js';
import { createGame } from '../../src/game.js';
import { newWorld } from '../../src/core/world.js';
const yieldNow = () => new Promise(r => setImmediate(r));
export async function boot() { const game = createGame(); const e = await Engine.headless(game, { assets: async () => new ArrayBuffer(0) }); return { e, g: game }; }
export async function step(e, n) { for (let i = 0; i < n; i += 4) { e.step(Math.min(4, n - i)); await yieldNow(); } }
export async function newGame(g, e, seed = 1) { const w = newWorld(seed); g.startGame(w, true); w.errands.active = false; await step(e, 5); return w; }
export async function hold(e, keys, n) { for (const k of keys) e.input.setKey(k, true); await step(e, n); for (const k of keys) e.input.setKey(k, false); }
export async function press(e, key, n = 3) { e.input.setKey(key, true); await step(e, n); e.input.setKey(key, false); await step(e, 2); }
/** Drive any open UI to completion: dialogue advances, text entry finishes, lists pick the first row, others close. */
export async function driveUI(e, g, max = 400) {
  let n = 0; while (g.ui.stack.length && n++ < max) {
    const t = g.ui.top;
    if (t.id === 'dialogue') { t.shown = 1e6; await step(e, 2); await press(e, 'Enter', 2); }
    else if (t.id === 'textentry') { t.text = t.text || 'Test'; t.done(g.ui); await step(e, 2); }
    else if (t.id === 'look') { t.st.i = 4; await press(e, 'Enter', 2); }
    else if (t.id === 'list') { await press(e, 'Enter', 2); if (g.ui.top === t) { await press(e, 'Escape', 2); } }
    else if (t.id === 'auction' || t.id === 'laugh') { await press(e, 'Enter', 2); await step(e, 120); }
    else if (t.id === 'pockets') { if (t.mode === 'act') await press(e, 'Escape', 2); else await press(e, 'Escape', 2); }
    else await press(e, 'Escape', 2);
  }
  return n;
}
export async function walkTo(e, g, x, z, max = 1200) { let n = 0; g.player.moveTarget = { x, z }; while (n++ < max) { await step(e, 4); if (Math.hypot(g.player.pos.x - x, g.player.pos.z - z) < 0.45) break; if (!g.player.moveTarget) g.player.moveTarget = { x, z }; } g.player.moveTarget = null; return Math.hypot(g.player.pos.x - x, g.player.pos.z - z); }
let fails = 0, count = 0; export const T = { ok(c, m) { count++; if (!c) { fails++; console.log('FAIL', m); } }, eq(a, b, m) { count++; if (a !== b) { fails++; console.log('FAIL', m, 'got', a, 'want', b); } }, get fails() { return fails; }, get count() { return count; } };
