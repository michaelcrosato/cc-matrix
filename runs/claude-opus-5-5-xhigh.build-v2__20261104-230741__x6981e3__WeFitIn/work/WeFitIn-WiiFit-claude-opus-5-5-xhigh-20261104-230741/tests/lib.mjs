// Tiny test kit: every test file prints one JSON line of results for tools/test.mjs.
import { Engine, THREE } from '../pixel-engine.js';
import { App } from '../src/app.js';
import { makeScene } from '../src/scenes/index.js';

const results = [];
export async function test(name, fn) {
  try { await fn(); results.push({ name, ok: true }); } catch (e) { results.push({ name, ok: false, detail: e?.stack?.split('\n').slice(0, 4).join(' | ') ?? String(e) }); }
}
export function done() {
  process.stdout.write(`\n@@RESULTS ${JSON.stringify(results)}\n`, () => process.exit(0));
}
export function assert(c, msg = 'assertion failed') { if (!c) throw new Error(msg); }
export const eq = (a, b, msg = '') => { if (a !== b) throw new Error(`${msg} expected ${b} got ${a}`); };
export const near = (a, b, tol, msg = '') => { if (Math.abs(a - b) > tol) throw new Error(`${msg} expected ${b} +- ${tol} got ${a}`); };

export class MemoryStorage {
  m = new Map();
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}

export const tick = () => new Promise((r) => setImmediate(r));

export async function boot({ scene = 'title', args = {}, viewport = { width: 1920, height: 1080, dpr: 1 }, storage = new MemoryStorage(), seed = 7, session = null } = {}) {
  App.boot({ storage, session });
  App.attract = null;
  App.dev = { god: false, autopilot: null, overlay: false, hideHud: false, timeScale: 1, freeCam: false, allUnlocked: false };
  App.practised = {};
  const first = makeScene(scene, args);
  const engine = await Engine.headless(first, { camera: first.cameraConfig?.(), viewport, seed, aspect: 'fill' });
  App.ensureInit(engine);
  const h = {
    engine, App,
    async settle(max = 2000) {
      for (let i = 0; i < 8; i++) { await tick(); }
      let n = 0;
      while ((App.loading || App.queued) && n < max) { engine.step(1); await tick(); n++; }
      if (n >= max) throw new Error('scene never settled');
      engine.step(1);
    },
    step(n = 1) { engine.step(n); },
    /** Press and release a key across two frames. */
    press(code) { engine.input.setKey(code, true); engine.step(1); engine.input.setKey(code, false); engine.step(1); },
    hold(code, frames) { engine.input.setKey(code, true); engine.step(frames); engine.input.setKey(code, false); },
    async go(id, args2 = {}) { const p = App.go(id, args2); await h.pump(p); },
    async pump(promise) {
      let finished = false;
      promise.then(() => { finished = true; }, (e) => { finished = e; });
      let n = 0;
      while (finished === false && n < 2000) { engine.step(1); await tick(); n++; }
      if (finished !== true && finished !== false) throw finished;
      if (n >= 2000) throw new Error('pump timed out');
      await h.settle();
    },
    /** Run until a predicate holds, stepping frames. */
    async until(pred, { max = 60 * 240, every = 30, what = '' } = {}) {
      let n = 0;
      while (!pred()) {
        engine.step(every); n += every;
        await tick();
        if (n > max) throw new Error(`until timed out (${what}): ${JSON.stringify(App.state())}`);
      }
    },
    errors() { return engine.errors; },
  };
  return h;
}
export { App, Engine, THREE, makeScene };
