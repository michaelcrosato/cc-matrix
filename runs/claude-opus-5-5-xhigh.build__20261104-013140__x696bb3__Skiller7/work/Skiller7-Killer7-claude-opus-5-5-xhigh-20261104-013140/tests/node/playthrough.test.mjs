// The scripted playthrough (§14.3): the honest bot plays the whole demo on Piste through the same intents a player
// makes, from the cold open to the credits, and every milestone is checked in order. --metrics prints its numbers.
import { boot } from '../lib/node-harness.mjs';
import { golden } from '../routes/golden.js';
export default async (T) => {
  const { game, S7, sim, I, snap, step } = boot({ seed: 11 });
  step(.3); S7.newGame('piste'); step(.2);
  sim.o.bot = true; S7.bot.run(golden, { honest: true });
  const seen = new Set(), scenes = new Set(); let tGame = 0, lastI = -1, lastLog = 0;
  const verbose = process.argv.includes('--verbose');
  while (tGame < 3 * 3600) {
    step(.25); tGame += .25;
    const s = snap(); seen.add(s.area); scenes.add(s.scene);
    if (s.scene === 'results') { I.tap('confirm'); step(.2); }
    if (s.scene === 'gameover') { T.check('the bot never reaches game over', false, JSON.stringify(S7.bot.status())); break; }
    if (verbose && S7.bot.i !== lastI) { lastI = S7.bot.i; console.log('  step', S7.bot.i, JSON.stringify(golden[S7.bot.i] || 'END').slice(0, 70), 'area', s.area, 'persona', s.persona, 'hp', s.hp, 't', tGame.toFixed(0)); }
    if (verbose && tGame - lastLog > 30) { lastLog = tGame; console.log('    …', s.area, s.node || s.edge, 'mode', s.mode, 'enemies', JSON.stringify(s.enemies), 'boss', JSON.stringify(s.boss)); }
    if (S7.bot.failed) break;
    if (s.scene === 'credits' || s.scene === 'title' && S7.bot.done) break;
  }
  const st = S7.bot.status();
  T.check('the bot finished its route', S7.bot.done && !S7.bot.failed, (S7.bot.failed || '') + ' ' + JSON.stringify(st));
  for (const a of ['00A', '00B', '00C', '01A', '01B', '01C', '01D', '01E', '01F', 'room7']) T.check('reached ' + a, seen.has(a));
  const f = sim.st ? sim.st.flags : {};
  for (const k of ['bellRung', 't00Done', 'churchBell', 'edelweiss1', 'exposure1', 'mirrorsOpen', 'bandDead', 'corniceDown', 'shelterDone', 'powerBack', 'ledgerRead', 'seracsDown', 't01Done']) T.check('milestone ' + k, !!f[k]);
  T.check('both results shown', scenes.has('results'));
  T.check('the credits rolled', scenes.has('credits'));
  T.check('no errors', !game.errors.length, game.errors.map(e => e.message).slice(0, 3).join(' | '));
  if (process.argv.includes('--metrics') || verbose) console.log('metrics', JSON.stringify({ time: Math.round(tGame), hurt: S7.bot.metrics.hurt, areaTime: Object.fromEntries(Object.entries(S7.bot.metrics.time).map(([k, v]) => [k, Math.round(v)])), red: sim.st && sim.st.red, rime: sim.st && sim.st.rime, results: sim.st && sim.st.results }));
};
