// Campaign balance runs (plan §14.5): node tools/simulate-campaign.mjs [games] [mode]
//   mode "ai"    : no human; every realm is run by the CPU planner. Prints the winners and the average length.
//   mode "player": the human realm (Verdance) is run by the autoplay planner, which musters and marches with care.
// Every battle is planned by the battle AI. Prints the outcomes and the seasons they came in.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const DEV = dirname(dirname(fileURLToPath(import.meta.url)));
const ctx = { console };
vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'dist/game.js']) vm.runInContext(readFileSync(join(DEV, f), 'utf8'), ctx, { filename: f });
const G = ctx.My3D2dge.Brigantime;
const games = Number(process.argv[2] || 20), mode = process.argv[3] || 'ai';
// tunables may be set on the command line: key=value (for example rivalAggression=0.8)
for (const a of process.argv.slice(4)) { const [k, v] = a.split('='); if (k === 'odds') G.AUTOPLAY_ODDS = Number(v); else G.tune[k] = Number(v); }
const tally = {}; let seasons = 0; const winners = {};
for (let s = 1; s <= games; s++) {
  const humans = mode === 'player' ? ['verdance'] : [];
  const cs = G.CampaignSim.create({ humans, seed: 500 + s });
  const musterAll = () => { if (mode === 'player') G.autoplayMuster(cs, 'verdance'); };
  musterAll();
  let res = cs.endMuster(), guard = 0;
  while (!cs.s.ended && guard++ < 100) {
    while (res.battle) { const sim = G.BattleSim.load(res.battle.sim); G.autoplayBattle(sim, 5000); res = cs.finishPending(sim); }
    if (cs.s.ended) break;
    musterAll();
    res = cs.endMuster();
  }
  const key = cs.outcome() || 'unfinished';
  tally[key] = (tally[key] || 0) + 1; seasons += cs.s.seasonsPlayed;
  if (cs.s.ended && cs.s.ended.winner) winners[cs.s.ended.winner] = (winners[cs.s.ended.winner] || 0) + 1;
}
console.log('mode', mode, 'games', games);
for (const [k, v] of Object.entries(tally).sort()) console.log(String(v).padStart(4), k);
console.log('winning realms', JSON.stringify(winners));
console.log('average seasons', (seasons / games).toFixed(1));
