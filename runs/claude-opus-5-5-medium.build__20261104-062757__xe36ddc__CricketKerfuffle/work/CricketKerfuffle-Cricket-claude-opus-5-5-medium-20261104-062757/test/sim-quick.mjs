import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console }; vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('../engine/my-3d2dge.js', import.meta.url), 'utf8'), ctx);
vm.runInContext(readFileSync(new URL('../dist/game.js', import.meta.url), 'utf8'), ctx);
const E = ctx.My3D2dge, game = E.current, D = game.debug;
const seeds = process.argv.slice(2).map(Number); if (!seeds.length) seeds.push(1, 2, 3);
for (const seed of seeds) {
  const m = new D.Match({ teams: ['ker', 'mud'], ground: 'green', overs: 2, wickets: 5, seed, mode: 'quick' });
  let steps = 0, maxState = {}, last = m.state, lastT = 0;
  while (m.state !== 'over' && steps < 120 * 900) { m.update(1 / 120); steps++; if (m.state !== last) { last = m.state; lastT = steps; } else if (steps - lastT > 120 * 25) { console.log('STUCK', m.state, m.st.toFixed(1)); break; } }
  const r = m.inn.map(I => `${I.runs}/${I.wkts} (${Math.floor(I.legal/6)}.${I.legal%6}) 4s:${I.fours} 6s:${I.sixes} ex:${JSON.stringify(I.extras)}`);
  console.log('seed', seed, (steps / 120).toFixed(0) + 's', r.join(' | '), '=>', m.result && m.result.text, 'errors', game.errors.length);
  const outs = m.records.filter(x => x.wicket).map(x => x.wicket.how); console.log('  outs:', outs.join(','), ' shots:', m.records.filter(x=>x.shot).length, '/', m.records.length);
}
if (game.errors.length) console.log(game.errors.slice(0,3).map(e => e.stack || e.message || e));
