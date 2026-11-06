// Headless harness: the real engine, real scenes, manual time.
import { Engine } from '../../pixel-engine.js';
import { App } from '../../src/app.js';
import { registerScenes, TitleScene } from '../../src/scenes/index.js';
import { Save } from '../../src/core/save.js';
registerScenes();
export { App };
export const tickle = () => new Promise((r) => setImmediate(r));
export async function steps(n, every = 30) { for (let i = 0; i < n; i++) { App.engine.step(1); if (i % every === 0) await tickle(); } await tickle(); }
export async function settle(max = 400) { for (let i = 0; i < max && App.loading; i++) { App.engine.step(1); await tickle(); } for (let i = 0; i < 6; i++) { App.engine.step(1); await tickle(); } if (App.loading) throw new Error('scene never settled'); }
export async function boot() {
  if (App.engine) { App.save = new Save(null); App.save.load(); App.slotIndex = null; App.overlays.length = 0; App.attract = null; App.god = false; App.devDriver = null; App.idle = 0; return App.engine; }
  App.save = new Save(null); App.boot = {};
  const e = await Engine.headless(new TitleScene());
  e.step(2); await tickle();
  return e;
}
export async function go(id, args) { App.loading = false; App.go(id, args); await settle(); }
export async function press(code, frames = 2) { const i = App.engine.input; i.setKey(code, true); App.engine.step(frames); await tickle(); i.setKey(code, false); App.engine.step(2); await tickle(); }
const results = { n: 0, fail: 0 };
export function check(name, cond, detail = '') { results.n++; if (!cond) { results.fail++; console.log(`FAIL ${name} ${detail}`); } }
export const report = () => results;
