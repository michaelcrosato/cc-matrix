// can a driver earn a perfect flood after a real period? (the bot steers to the dirtiest ice, no scripted clearing)
import { load } from './lib.mjs';
import { makeBot } from './bot.mjs';
const { game, G } = load(); game.advance(.5);
const bot = makeBot(G, game); bot.wantFlood = true;
for (const seed of [11, 12, 13]) {
  game.go('match', { cfg: Object.assign(G.Setup.quickCfg({}), { seed, intros: false, replays: 'off', flood: 'ask', periodLen: 90 }) }, { fade: 0 }); game.advance(.2);
  let t = 0; while (game.sceneName !== 'flood' && t < 400 * 120) { bot.step(); game.advance(1 / 120); t++; }
  const scuff0 = G.Rink.scuffTotal(); t = 0; while (game.sceneName === 'flood' && t < 60 * 120) { bot.step(); game.advance(1 / 120); t++; }
  console.log('seed', seed, 'scuff at the intermission', scuff0.toFixed(1), 'flood', JSON.stringify({ clean: G.Flood.st && +G.Flood.clean().toFixed(3), perfect: G.Flood.st && G.Flood.st.perfect, secs: G.Flood.st && +G.Flood.st.t.toFixed(1) }), 'boom', G.Match.m.boom.map(Math.round));
}
