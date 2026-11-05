import { load } from './lib.mjs';
const { WP, game } = load();
const ops = process.argv[2] ? process.argv[2].split(',') : ['op1', 'op2', 'op3', 'op4', 'op5', 'op6'];
for (const op of ops) {
  WP.Flow.newRun({ diff: 'VETERAN' });
  const sim = new WP.Sim({ stage: op, seed: 11, players: [{ pid: 0 }], cheats: { god: true, ammo: true }, run: WP.Flow.run });
  const bot = WP.Bot.make({ fair: false, seed: 3 });
  const dt = 1 / 120; let t = 0, err = null, kinds = {}, phases = [], swap = false;
  try {
    for (let i = 0; i < 120 * 600 && sim.state !== 'clear'; i++) {
      const f = WP.Bot.frame(bot, sim, sim.players[0], dt);
      sim.step(dt, { 0: f });
      for (const e of sim.drain()) { kinds[e.k] = (kinds[e.k] || 0) + 1; if (e.k === 'bossPhase') phases.push(e.phase); if (e.k === 'stageSwap') swap = true; if (e.k === 'warn') console.log('WARN', e.text); }
      t += dt;
    }
  } catch (e) { err = e.stack.split('\n').slice(0, 4).join(' | '); }
  const s = sim.snapshot();
  console.log(op, s.state, 't', t.toFixed(0), 'd', s.d, 'beats', s.beatsFired + '/' + s.beats, 'q', JSON.stringify(s.quotas), 'boss', JSON.stringify(s.boss), 'phases', phases.join(','), 'host', JSON.stringify(s.hostages), swap ? 'SWAP' : '', 'reinf', s.stats.reinf, 'kills', s.players[0].kills, err ? 'ERR ' + err : '');
}
