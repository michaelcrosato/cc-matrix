// Loads the engine and the simulation modules (src/0*-2*) in a vm, headless, and returns TT.
import vm from 'node:vm';
import { readFileSync, readdirSync } from 'node:fs';
const root = new URL('../../', import.meta.url);
export function load(upTo = 29) {
  const ctx = { console, setTimeout, clearTimeout }; ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(readFileSync(new URL('engine/my-3d2dge.js', root), 'utf8'), ctx, { filename: 'engine' });
  const files = readdirSync(new URL('src/', root)).filter(f => /^\d+-.*\.js$/.test(f) && parseInt(f) <= upTo).sort();
  const src = '(() => { "use strict"; const E = My3D2dge;\n' + files.map(f => `/* ==== ${f} ==== */\n` + readFileSync(new URL('src/' + f, root), 'utf8')).join('\n') + '\n;window.__TT = TT; window.__sim = { get S() { return S; }, newMatch, stepMatch, emptyIntent, doKick, giveBall, place, startScrum, startLineout, startPenalty, startConversion, tackleAttempt, doPass, receivers, foul, scoreTry, useSuper, addHype }; })();';
  vm.runInContext(src, ctx, { filename: 'game' });
  return { E: ctx.My3D2dge, TT: ctx.__TT, sim: ctx.__sim, ctx };
}
