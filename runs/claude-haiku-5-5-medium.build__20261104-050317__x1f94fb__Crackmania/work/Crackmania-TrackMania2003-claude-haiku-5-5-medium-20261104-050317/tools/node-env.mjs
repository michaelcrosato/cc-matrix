// The headless loader: the 2D engine (a classic script, run in this context), the 3D engine (an ES module) and the
// vendored three.js and Rapier, so a game's scenes can be stepped and checked in Node with no browser.
import { register } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInThisContext } from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

register(new URL('./hooks.mjs', import.meta.url));

/* A canvas that draws nothing: the engine bakes its textures and sprites on canvases, and the headless tests check
 * game state, not pixels. Any method call returns the context, any property is kept. */
function fakeCtx() {
  const data = { width: 0, height: 0 };
  const ctx = new Proxy({}, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'getImageData') return (x, y, w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
      if (k === 'measureText') return () => ({ width: 0 });
      return () => ctx;
    },
    set(t, k, v) { t[k] = v; return true; }
  });
  return { ctx, data };
}
function fakeCanvas() {
  const { ctx } = fakeCtx(), cv = { width: 0, height: 0, style: {}, getContext: () => ctx, toDataURL: () => '', addEventListener() {}, removeEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }) };
  return cv;
}
if (!globalThis.document) globalThis.document = { createElement: t => (t === 'canvas' ? fakeCanvas() : { style: {}, addEventListener() {}, removeEventListener() {}, appendChild() {}, setAttribute() {} }), body: { appendChild() {}, style: {} }, addEventListener() {}, removeEventListener() {}, head: { appendChild() {} }, getElementById: () => null, querySelector: () => null, fonts: null };
if (!globalThis.window) globalThis.window = globalThis;

const ENGINE = fileURLToPath(new URL('../engine/', import.meta.url));

let loaded = null;
/** loads the engines once; returns the global engine object E */
export async function loadEngine() {
  if (loaded) return loaded;
  if (!globalThis.My3D2dge) runInThisContext(readFileSync(ENGINE + 'my-3d2dge.js', 'utf8'), { filename: 'my-3d2dge.js' });
  await import(pathToFileURL(ENGINE + 'my-3d2dge-3d.js').href);
  loaded = globalThis.My3D2dge;
  return loaded;
}
