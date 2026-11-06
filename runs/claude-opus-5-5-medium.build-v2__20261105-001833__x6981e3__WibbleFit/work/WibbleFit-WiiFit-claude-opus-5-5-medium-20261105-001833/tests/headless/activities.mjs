import { App, boot, check, go, report, settle, steps, tickle } from './lib.mjs';
import { ACTIVITIES } from '../../src/data/activities.js';
const VERBOSE = process.argv.includes('--v');
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
await boot();
export async function runActivity(id, skill) {
  App.devDriver = skill; App.save.data.dropIn = {};
  await go('activity', { id, mode: 'dropin' });
  const sc = App.scene; sc.firstTime = false; sc.afterIntro();
  let n = 0;
  while (!sc.finished && n < 12000) { App.engine.step(1); n++; if (n % 300 === 0) await tickle(); }
  await tickle();
  check(`${id} ${skill} finished`, sc.finished, sc.status(App.ctx));
  check(`${id} ${skill} no errors`, !App.engine.errors.length, App.engine.errors.join('|').slice(0, 300));
  App.engine.errors.length = 0;
  const r = { ...App.lastResult }; App.overlays.length = 0; App.devDriver = null;
  return r;
}
const table = [];
for (const a of ACTIVITIES) {
  if (only && !only.split(',').includes(a.id)) continue;
  const idle = await runActivity(a.id, 'idle'), sloppy = await runActivity(a.id, 'sloppy'), avg = await runActivity(a.id, 'average'), expert = await runActivity(a.id, 'expert');
  table.push(`${a.id.padEnd(10)} idle ${idle.score}/${idle.stars} sloppy ${sloppy.score}/${sloppy.stars} avg ${avg.score}/${avg.stars} expert ${expert.score}/${expert.stars}`);
  check(`${a.id} idle 0 stars`, idle.stars === 0, `${idle.score}`);
  check(`${a.id} expert >=2 stars`, expert.stars >= 2, `${expert.score}/${expert.stars}`);
  check(`${a.id} sloppy < expert`, sloppy.score < expert.score, `${sloppy.score} vs ${expert.score}`);
  check(`${a.id} record written`, App.save.data.dropIn[a.id]?.plays === 1);
}
if (VERBOSE) console.log(table.join('\n'));
if (process.argv[1].endsWith('activities.mjs')) { const r = report(); console.log(`${r.n - r.fail}/${r.n} passed`); process.exit(r.fail ? 1 : 0); }
void steps; void settle;
