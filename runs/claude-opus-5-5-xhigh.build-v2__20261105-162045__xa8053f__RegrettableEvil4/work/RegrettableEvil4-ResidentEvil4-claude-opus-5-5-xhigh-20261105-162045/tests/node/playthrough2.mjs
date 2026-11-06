// The whole game again on other seeds, under the same limits as the main playthrough, so a soft-lock can't hide behind
// one lucky seed. Seed 19 is the one that once stood at the Commodore's hatch with every gun empty.
import { setup, step, assets, BalanceBook, outOfMap } from '../helpers.mjs';
import { PRICES, STOCK } from '../../src/data/shop.js';
import { Engine } from '../../pixel-engine.js';
import { Area } from '../../src/game/area.js';
import { Bot } from '../../src/game/bot.js';
import { app } from '../../src/core/app.js';
import { Run } from '../../src/core/run.js';

const STUCK_LIMIT_S = 60;
const MAX_DEATHS_PER_CHAPTER = 3;

const SEEDS = [23, 19, 3];

async function campaign(t, seed) {
  setup();
  app.closeAll?.();
  app.run = new Run();
  const report = {};
  const e = await Engine.headless(new Area('quay', { bot: new Bot({ report }) }), { assets, camera: { preset: 'third', fov: 55 }, seed });
  let stuckFor = 0; let px = 0; let pz = 0; let credits = false; let shots = 0; let quiet = 0;
  let seen = 0; const chapters = {};
  const book = new BalanceBook(PRICES, (ch) => STOCK[ch] ?? []);
  let outFor = 0;
  for (let i = 0; i < 60 * 60 * 90 && !credits; i += 30) {
    await step(e, 30);
    const g = e.game; const P = g.player;
    book.update(g.def.chapter ?? 1, app.run);
    outFor = outOfMap(g) && !g.cut ? outFor + 0.5 : 0;
    if (outFor > 3) { t.ok(false, `seed ${seed}: she has walked out of the map in ${g.id}: ${g.status()}`); break; }
    if ((report.deaths ?? 0) > seen) {
      const ch = g.def.chapter ?? 1;
      chapters[ch] = (chapters[ch] ?? 0) + (report.deaths - seen);
      seen = report.deaths;
      if (chapters[ch] > MAX_DEATHS_PER_CHAPTER) { t.ok(false, `seed ${seed}: too many deaths in chapter ${ch} (${g.id}): ${chapters[ch]}`); break; }
    }
    if (P && !g.cut && !app.stack.length) {
      if (Math.hypot(P.x - px, P.z - pz) < 0.4 && !P.aiming && !g.crypt && !g.rolling) stuckFor += 0.5; else stuckFor = 0;
      px = P.x; pz = P.z;
      if (stuckFor > STUCK_LIMIT_S) { t.ok(false, `seed ${seed}: stuck ${stuckFor}s in ${g.id} at step ${g.brain?.stepI}: ${g.status()}`); break; }
      // A boss fight with no shots fired for minutes is a stall too, however much running there is.
      if (g.bossLive) {
        quiet = app.run.stats.shots !== shots ? 0 : quiet + 0.5;
        shots = app.run.stats.shots;
        if (quiet > 120) { t.ok(false, `seed ${seed}: 120 s of a boss fight with no shot, in ${g.id}: ${g.status()}`); break; }
      } else quiet = 0;
    }
    credits = app.top?.name === 'credits';
    if (e.errors.length) break;
  }
  t.eq(e.errors.length, 0, `seed ${seed}: no errors: ${e.errors[0] ?? ''}`);
  t.ok(credits, `seed ${seed} reaches the credits too (${e.game.status()})`);
  if (credits) {
    book.close(app.run);
    for (const line of book.lines()) t.log(`seed ${seed}: ${line}`);
    for (const [ok, text] of book.verdicts()) t.ok(ok, `seed ${seed}: ${text}`);
  }
  t.log(`seed ${seed}: deaths ${report.deaths ?? 0} by chapter ${JSON.stringify(chapters)}`);
}

export default async function (t) {
  for (const seed of SEEDS) await campaign(t, seed);
}
