import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const R = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const ctx = { console, addEventListener() {}, location: { hash: '' }, setTimeout, clearTimeout }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'game/core.js', 'game/balance.js', 'game/data/activities.js']) vm.runInContext(R(f), ctx, { filename: f });
const G = ctx.G; G.game = { settings: {}, time: 0 };
const rows = { body: 0, flow: 0, stork1: 0, stork2: 0, candle: 0, rope: 0 };
for (const set in rows) {
  const out = [];
  for (const sk of ['passive', 'poor', 'average', 'good', 'expert']) { let s = 0, f = 0; for (let seed = 1; seed <= 12; seed++) { const r = G.simLean(set, sk, seed, 45, rows[set]); s += r.pct; f += r.falls; } out.push(sk + ' ' + Math.round(s / 12 * 100) + '%(' + (f / 12).toFixed(1) + ')'); }
  console.log(set.padEnd(7), out.join('  '));
}
