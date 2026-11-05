// Loads the engine, the motion-capture runtime and the built game into a fresh vm context (no DOM).
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const DEV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export function load() {
  const ctx = { console, Math, Date, JSON, setTimeout, clearTimeout, setInterval, clearInterval, performance: { now: () => Date.now() } };
  ctx.window = ctx; ctx.self = ctx; ctx.AOA_NO_BOOT = true; ctx.addEventListener = () => {}; ctx.removeEventListener = () => {};
  ctx.location = { href: 'file:///test.html', hash: '' }; ctx.navigator = { maxTouchPoints: 0, userAgent: 'node' };
  ctx.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
  vm.createContext(ctx);
  const files = [['engine', 'engine/my-3d2dge.js'], ['readable', 'vendor/mocap/readable.js'], ['mocap', 'vendor/mocap/mocap.js'], ['clips', 'vendor/mocap/aoa-clips.js'], ['volley', 'vendor/mocap/aoa-volley.js'], ['game', 'build/game.js']];
  for (const [name, rel] of files) vm.runInContext(fs.readFileSync(path.join(DEV, rel), 'utf8'), ctx, { filename: name + '.js' });
  return { ctx, E: ctx.My3D2dge, G: ctx.AOA, DEV };
}
