// Loads the engine and the game sources into a headless vm context and returns { BB, game, E, ctx }.
import vm from 'node:vm';
import { readFileSync, readdirSync } from 'node:fs';
const root = new URL('../../', import.meta.url);
export async function load(opts = {}) {
  const ctx = { console, setTimeout, clearTimeout, BB_NO_AUTOSTART: true, performance };
  if (opts.AIHub) ctx.AIHub = opts.AIHub;
  vm.createContext(ctx);
  const run = (f, src) => vm.runInContext(src, ctx, { filename: f });
  run('engine', readFileSync(new URL('engine/my-3d2dge.js', root), 'utf8'));
  for (const f of readdirSync(new URL('src/', root)).filter(f => f.endsWith('.js')).sort()) run(f, readFileSync(new URL('src/' + f, root), 'utf8'));
  const BB = ctx.BB; const game = await BB.main({ headless: true });
  return { BB, game, E: ctx.My3D2dge, ctx };
}
export function makeChecker() {
  let n = 0, failed = 0; const fails = [];
  const check = (what, ok, detail = '') => { n++; if (!ok) { failed++; fails.push('FAIL ' + what + (detail ? ': ' + detail : '')); } };
  return { check, report() { for (const f of fails) console.log(f); return { n, failed }; } };
}
