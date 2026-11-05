import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const D = process.cwd();
const ctx = { console, addEventListener() {}, location: { hash: '' } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js']) vm.runInContext(readFileSync(D + '/' + f, 'utf8'), ctx, { filename: f });
const G = ctx.BRIG;
for (const lv of [10, 13, 16, 20]) {
  let w = 0, dials = 0, turned = 0; const N = 10;
  for (let seed = 1; seed <= N; seed++) {
    const s = { seed, map: 'clockwork_sanctum', season: 'autumn', mode: 'sanctum', sides: [{ realm: 'verdance', role: 'att', ai: 'normal', troops: ['gareth', 'lynette', 'wren'].map(id => G.troopAt(id, lv, { realm: 'verdance' })) }, { realm: 'dominion', role: 'def', ai: 'normal', troops: [G.CampaignSim.prototype._grayKnightTroop.call(null)] }] };
    const sim = G.BattleSim.create(s); G.BattleAI.resolve(sim); if (sim.s.over.winner === 0) w++; dials += sim.s.dials.filter(d => d.lit).length; if (sim.s.wheelTurned) turned++;
  }
  console.log('level', lv, 'wins', w + '/' + N, 'avg dials', (dials / N).toFixed(1), 'wheel turned', turned);
}
for (let seed = 1; seed <= 4; seed++) {
  const s = { seed, map: 'clockwork_sanctum', season: 'autumn', mode: 'sanctum', sides: [{ realm: 'verdance', role: 'att', ai: 'normal', troops: ['gareth', 'lynette', 'wren'].map(id => G.troopAt(id, 16, { realm: 'verdance' })) }, { realm: 'dominion', role: 'def', ai: 'normal', troops: [G.CampaignSim.prototype._grayKnightTroop.call(null)] }] };
  const sim = G.BattleSim.create(s); const ev = G.BattleAI.resolve(sim); const gk = sim.units.find(u => u.ref === 'graynight');
  const hitsOnGk = ev.filter(e => e.e === 'hit' && e.t === gk.id); const kos = ev.filter(e => e.e === 'ko').map(e => sim.unit(e.t).name);
  console.log('seed', seed, JSON.stringify(sim.s.over), 'gk hp', gk.hp + '/' + gk.mhp, 'hits on gk', hitsOnGk.length, 'dmg', hitsOnGk.reduce((a, e) => a + e.dmg, 0), 'wheel at bell', ev.findIndex(e => e.e === 'wheel') >= 0 ? ev.slice(0, ev.findIndex(e => e.e === 'wheel')).filter(e => e.e === 'bell').length : '-', 'KOs', kos.join(','));
}
