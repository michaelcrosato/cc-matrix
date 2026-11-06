// The whole game, played by the bot: Arrival to the credits on Standard, no cheats. --verbose prints the
// balance report: per-chapter ammo, money and deaths.
import { boot, setup, step, BalanceBook, outOfMap } from '../helpers.mjs';
import { PRICES, STOCK } from '../../src/data/shop.js';
import { Area } from '../../src/game/area.js';
import { Bot } from '../../src/game/bot.js';
import { app } from '../../src/core/app.js';
import { Run } from '../../src/core/run.js';

const ORDER = ['quay', 'road', 'cannery', 'yard', 'causeway', 'abbey', 'nave', 'launch'];
const MAX_DEATHS_PER_CHAPTER = 3;
const STUCK_LIMIT_S = 60;

export default async function (t) {
  setup();
  app.run = new Run();
  const report = {};
  const bot = new Bot({ report });
  const e = await boot(new Area('quay', { bot }));
  const seen = [];
  let last = null;
  const chapterDeaths = {};
  let lastDeaths = 0;
  let stuckFor = 0; let px = 0; let pz = 0;
  const started = Date.now();
  let credits = false;
  const book = new BalanceBook(PRICES, (ch) => STOCK[ch] ?? []);
  let outFor = 0;
  for (let i = 0; i < 60 * 60 * 90 && !credits; i += 30) {
    await step(e, 30);
    const g = e.game;
    book.update(g.def.chapter ?? 1, app.run);
    outFor = outOfMap(g) && !g.cut ? outFor + 0.5 : 0;
    if (outFor > 3) { t.ok(false, `she has walked out of the map in ${g.id}: ${g.status()}`); break; }
    if (g.id !== last) {
      t.log(`${g.id.padEnd(9)} at ${(i / 60 | 0)}s money ${app.run.money} coverage ${app.run.health | 0}/${app.run.maxHealth} ammo .38 ${app.run.case.count('ammoPistol')} shells ${app.run.case.count('ammoShells')} rifle ${app.run.case.count('ammoRifle')} bolts ${app.run.case.count('ammoBolts')} herbs ${app.run.case.count('samphire') + app.run.case.count('mixS2') + app.run.case.count('mixSD') + app.run.case.count('tin')} weapons ${app.run.ownedWeapons().join('+')} deaths so far ${report.deaths ?? 0} kills ${app.run.totals.kills + app.run.stats.kills}`);
      seen.push(g.id);
      last = g.id;
      stuckFor = 0;
    }
    const died = (report.deaths ?? 0) - lastDeaths;
    if (died) {
      lastDeaths = report.deaths;
      const ch = g.def.chapter ?? 1;
      chapterDeaths[ch] = (chapterDeaths[ch] ?? 0) + died;
      if (chapterDeaths[ch] > MAX_DEATHS_PER_CHAPTER) { t.ok(false, `too many deaths in chapter ${ch} (${g.id}): ${chapterDeaths[ch]}: ${g.status()}`); break; }
    }
    const P = g.player;
    if (P && !g.cut && !app.stack.length) {
      if (Math.hypot(P.x - px, P.z - pz) < 0.4 && !P.aiming && g.bossLive !== true && !g.crypt && !g.rolling) stuckFor += 0.5; else stuckFor = 0;
      px = P.x; pz = P.z;
      if (stuckFor > STUCK_LIMIT_S) { t.ok(false, `stuck ${stuckFor}s in ${g.id} at step ${g.brain?.stepI}: ${g.status()}`); break; }
    }
    if (app.top?.name === 'credits') { credits = true; }
    if (e.errors.length) break;
  }
  t.eq(e.errors.length, 0, `no errors: ${e.errors[0] ?? ''}`);
  for (const id of ORDER) t.ok(seen.includes(id), `the bot reached ${id}`);
  t.ok(credits, `the bot reached the credits (last area ${last}, ${e.game.status()})`);
  if (credits) {
    book.close(app.run);
    for (const line of book.lines()) t.log(line);
    for (const [ok, text] of book.verdicts()) t.ok(ok, text);
  }
  t.log(`deaths by chapter: ${JSON.stringify(chapterDeaths)}`);
  t.log(`finished: deaths ${report.deaths ?? 0}, kills ${app.run.totals.kills}, money ${app.run.money}, deductions ${app.run.deductions}, tannoys ${app.run.tannoys.length}, wall ${(Date.now() - started) / 1000 | 0}s`);
}
