import vm from 'node:vm';
import { readFileSync, readdirSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const ctx = { console }; vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('engine/my-3d2dge.js', root), 'utf8'), ctx);
const files = readdirSync(new URL('src/', root)).filter(f => /^(0|1|2)\d-.*\.js$/.test(f) && f < '30').sort();
const src = files.map(f => readFileSync(new URL('src/' + f, root), 'utf8')).join('\n');
vm.runInContext(src + '\nthis.__t = { createMatch, newIntent, T, TV, tuningReset, RNG, mkrng, predictPlane, newBall, solveDelivery, stepBall, YHIT, SY, BY, CX, MY, DELIVERIES, emit, on, bndRX, bndRY };', ctx);
export const G = ctx.__t;
