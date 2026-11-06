import { playCase } from './lib.mjs';
import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const root = new URL('..', import.meta.url).pathname;
const ctx = { console, performance, structuredClone, Math, JSON }; ctx.window = ctx; vm.createContext(ctx);
const man = JSON.parse(readFileSync(root + 'src/manifest.json', 'utf8'));
for (const f of man.engine.concat(man.game)) vm.runInContext(readFileSync(root + 'src/' + f, 'utf8'), ctx, { filename: f });
const G = ctx.GAME; let n = 0;
const r = playCase(G, process.argv[2], { maxT: +process.argv[3], hook: (S, bots, t) => { if (t > +process.argv[4] && n++ % 6 === 0 && n < 400) { const o = S.objs.find(o => o.type === process.argv[5]); const p = S.pl[0]; console.log(t.toFixed(2), 'fill', p.fill.toFixed(2), 'trig', p.trig, 'cur', p.x | 0, p.y | 0, 'hb', S.hb.toFixed(2), o && JSON.stringify({ flare: o.flare, amp: o.amp, st: o.stage, x: o.x, y: o.y })); } } });
