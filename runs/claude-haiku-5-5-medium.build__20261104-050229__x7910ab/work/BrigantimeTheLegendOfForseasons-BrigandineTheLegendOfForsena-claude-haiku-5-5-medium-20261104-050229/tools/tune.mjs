// Balance search (plan §14.5): node tools/tune.mjs <configs> <seed> > tune.jsonl
// Draws random settings of the tunables, plays AI-only campaigns, player campaigns and battles with each, and prints one
// JSON line per configuration: the settings and the measured targets. Pick the line that meets the targets.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const DEV = dirname(dirname(fileURLToPath(import.meta.url)));
const configs = Number(process.argv[2] || 10), seedBase = Number(process.argv[3] || 7);
const ctx = { console }; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'dist/game.js']) vm.runInContext(readFileSync(join(DEV, f), 'utf8'), ctx, { filename: f });
const G = ctx.My3D2dge.Brigantime;
const rng = new G.Rng(seedBase);
const RANGES = { rivalAggression: [.5, 1.5], summonCost: [1, 4], manaYield: [.6, 2], humanYield: [1, 2.5], upkeep: [.3, 1.5],
  battleDamage: [1, 2], defenderGuard: [0, 3], knightXp: [1, 3], odds: [.6, 1.2], meridianGarrison: [2, 9] };
const GAMES = Number(process.argv[5] || 8);
const BASE = process.argv[4] ? JSON.parse(process.argv[4]) : null;   // a settings object to search around (each value moved up to 15%)
const runCampaign = (humans, seed) => {
  const cs = G.CampaignSim.create({ humans, seed });
  const musterAll = () => { if (humans.length) G.autoplayMuster(cs, 'verdance'); };
  musterAll();
  let res = cs.endMuster(), guard = 0;
  while (!cs.s.ended && guard++ < 100) {
    while (res.battle) { const sim = G.BattleSim.load(res.battle.sim); G.autoplayBattle(sim, 5000); res = cs.finishPending(sim); }
    if (cs.s.ended) break;
    musterAll(); res = cs.endMuster();
  }
  return cs;
};
for (let c = 0; c < configs; c++) {
  const pick = {};
  for (const [k, [lo, hi]] of Object.entries(RANGES)) {
    if (BASE && BASE[k] !== undefined) { const f = 1 + (rng.next() * 2 - 1) * .15; pick[k] = Math.round(Math.min(hi, Math.max(lo, BASE[k] * f)) * 100) / 100; }
    else pick[k] = Math.round((lo + (hi - lo) * rng.next()) * 100) / 100;
  }
  // the settings the search draws
  G.resetTune();
  for (const k of ['rivalAggression', 'summonCost', 'manaYield', 'humanYield', 'upkeep', 'battleDamage', 'defenderGuard', 'knightXp', 'meridianGarrison']) G.tune[k] = Math.round(pick[k]);
  G.AUTOPLAY_ODDS = pick.odds;
  // AI-only campaigns: average length and the largest share any realm wins
  const winners = {}; let aiSeasons = 0;
  for (let s = 1; s <= GAMES; s++) { const cs = runCampaign([], seedBase * 100 + s); aiSeasons += cs.s.seasonsPlayed; if (cs.s.ended && cs.s.ended.winner) winners[cs.s.ended.winner] = (winners[cs.s.ended.winner] || 0) + 1; }
  const aiAvg = aiSeasons / GAMES, aiMaxShare = Math.max(0, ...Object.values(winners)) / GAMES;
  // the player: how often Meridian falls to the player, and in which season
  let won = 0, wonSeasons = [];
  for (let s = 1; s <= GAMES; s++) { const cs = runCampaign(['verdance'], seedBase * 100 + 50 + s); if (cs.outcome() === 'won-verdance') { won++; wonSeasons.push(cs.s.seasonsPlayed); } }
  // battles: the average length
  let bells = 0; const N = 150;
  for (let b = 0; b < N; b++) {
    const sim = G.BattleSim.create({ map: G.ids('map')[b % G.ids('map').length], season: G.SEASON_ORDER[b % 4], seed: 900 + b, sides: [
      { troops: [{ kind: 'knight', ref: 'oren', leader: true }, { kind: 'monster', ref: 'gleam-slime', form: 0 }, { kind: 'monster', ref: 'thorn-hare', form: 0 }] },
      { troops: [{ kind: 'knight', ref: 'shade', leader: true }, { kind: 'monster', ref: 'dusk-bat', form: 0 }, { kind: 'monster', ref: 'cinder-imp', form: 0 }] }] });
    G.autoplayBattle(sim, 5000); bells += sim.s.bell;
  }
  const playerWin = won / GAMES, playerInWindow = wonSeasons.filter(x => x >= 10 && x <= 14).length / GAMES;
  console.log(JSON.stringify({ settings: pick, aiAvgSeasons: aiAvg, aiMaxRealmShare: aiMaxShare, playerWinShare: playerWin, playerWinIn10to14: playerInWindow, battleBellsAvg: bells / N }));
}
