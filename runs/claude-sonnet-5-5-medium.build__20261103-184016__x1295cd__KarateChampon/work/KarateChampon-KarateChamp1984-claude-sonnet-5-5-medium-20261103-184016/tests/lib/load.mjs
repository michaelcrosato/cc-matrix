import vm from 'node:vm'; import { readFileSync } from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
export function loadGame(opts = {}) {
  const ctx = { console, setTimeout, clearTimeout, performance, Math, Date, JSON };
  ctx.window = ctx; ctx.self = ctx; ctx.addEventListener = () => {}; ctx.removeEventListener = () => {}; ctx.location = { hash: opts.hash || '', search: opts.search || '', href: 'file:///game.html' };
  ctx.navigator = { maxTouchPoints: 0, getGamepads: () => [] }; ctx.matchMedia = opts.matchMedia || (() => ({ matches: true, addEventListener() {}, addListener() {} }));
  ctx.document = undefined;
  if (opts.hub) ctx.AIHub = opts.hub;
  vm.createContext(ctx);
  const run = (f, name) => vm.runInContext(readFileSync(f, 'utf8'), ctx, { filename: name || f });
  run(path.join(root, 'engine/my-3d2dge.js'));
  if (opts.pre) opts.pre(ctx);
  run(path.join(root, 'build/game.js'), 'game.js');
  return { ctx, E: ctx.My3D2dge, KC: ctx.KC, game: ctx.KC && ctx.KC.game };
}
