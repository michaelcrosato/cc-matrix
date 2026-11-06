// Node harness: headless engine + app, driven by scripts. Everything runs without a browser.
import { Engine } from '../pixel-engine.js';
import { readFile } from 'node:fs/promises';
import { app, resetApp } from '../src/app.js';
import { registerAll } from '../src/scenes/index.js';

const assets = async (p) => new Uint8Array(await readFile(new URL('../' + p, import.meta.url))).buffer;
export async function boot(first = 'title', args = {}, { viewport } = {}) {
  resetApp(); registerAll(app);
  const sc = app.make(first, args);
  const engine = await Engine.headless(sc, { assets, viewport: viewport ?? { width: 1920, height: 1080, dpr: 1 } });
  app.attach(engine);
  return { app, engine };
}
/** Step frames until the app is no longer switching scenes. */
export async function settle(engine, max = 600) { for (let i = 0; i < max && app.busy; i++) { engine.step(1); await new Promise((r) => setTimeout(r, 0)); } }
export async function go(engine, id, args = {}, instant = true) { await settle(engine); const p = app.go(id, args, { instant }); await p; engine.step(2); }
export function run(engine, seconds) { engine.step(Math.round(seconds * 60)); }
/** Step until pred() is true (or maxSec of stepped time). Returns true if reached. */
export function runUntil(engine, pred, maxSec = 200) { for (let i = 0; i < maxSec * 60; i++) { if (pred()) return true; engine.step(1); } return pred(); }
export const finishActivity = (engine, maxSec = 200) => runUntil(engine, () => app.scene?.phase === 'results', maxSec);
const tick = () => new Promise((r) => setImmediate(r));
/** Like runUntil but lets promises (scene transitions) progress between frames. */
export async function play(engine, pred, maxSec = 300, every = 4) { for (let i = 0; i < maxSec * 60; i++) { if (pred()) return true; engine.step(1); if (i % every === 0) await tick(); } return pred(); }
export async function wait(engine, sec, every = 4) { for (let i = 0; i < sec * 60; i++) { engine.step(1); if (i % every === 0) await tick(); } }
/** Press and release a key (a code like 'Enter' or 'PadCross') with frames between, letting promises run. */
export async function press(engine, code, hold = 3) { engine.input.setKey(code, true); await wait(engine, hold / 60, 1); engine.input.setKey(code, false); await wait(engine, 3 / 60, 1); }
export async function pressUntil(engine, code, pred, max = 80) { for (let i = 0; i < max && !pred(); i++) await press(engine, code); return pred(); }
