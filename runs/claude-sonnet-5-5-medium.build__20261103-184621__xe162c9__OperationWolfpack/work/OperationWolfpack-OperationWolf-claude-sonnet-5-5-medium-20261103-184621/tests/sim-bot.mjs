import { load } from './load.mjs';
const ctx = load(); const WP = ctx.WP;
for (let op = 0; op < 4; op++) {
  const sim = new WP.Sim({ op, players: 1, seed: 7 + op, invincible: true, infAmmo: true });
  const bot = new WP.Bot(0); const dt = 1 / 120;
  let t = 0, lastPhase = '', cleared = false;
  while (t < 600 && sim.phase !== 'clear') {
    const f = bot.frame(sim, dt); sim.step(dt, [f]); t += dt;
    if (sim.phase !== lastPhase) { lastPhase = sim.phase; console.log('op' + (op + 1), 't=' + t.toFixed(0), 'phase', sim.phase, 'd', Math.round(sim.d), JSON.stringify(sim.q.got)); }
  }
  const s = sim.snapshot();
  console.log('op' + (op + 1), 'result', sim.phase, 'time', t.toFixed(0), 'kills', s.stats.kills, 'q', JSON.stringify(s.q), 'host', JSON.stringify(s.host));
}
