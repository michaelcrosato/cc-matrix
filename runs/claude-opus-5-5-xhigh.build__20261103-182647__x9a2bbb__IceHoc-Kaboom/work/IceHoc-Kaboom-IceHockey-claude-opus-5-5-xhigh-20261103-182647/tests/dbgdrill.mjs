import { load } from './lib.mjs';
import { makeBot } from './bot.mjs';
import { drillBot } from './drillbot.mjs';
const { game, G } = load(); game.advance(.5);
const bot = makeBot(G, game); bot.drill = drillBot(G);
for (const d of (process.argv[2] || '1,2,3,4,5,6,7').split(',').map(Number)) {
  game.go('match', { cfg: G.Drills.cfg(d) }, { fade: 0 }); game.advance(.2);
  let t = 0; for (; t < 150 * 120 && game.sceneName !== 'practice'; t++) { bot.step(); game.advance(1 / 120); }
  const ds = G.Match.m.drillState; console.log('drill', d, game.sceneName === 'practice' ? 'DONE' : 'stuck', (t / 120).toFixed(1) + 's', JSON.stringify(Object.fromEntries(Object.entries(ds).filter(([k, v]) => typeof v !== 'object'))), 'errors', game.errors.length, game.errors.slice(0, 2).map(e => e.message));
}
