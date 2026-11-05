// node tools/balance.mjs [rooms] [players] [diff]: one bot (no cheats) per room; time to clear, deaths, Prime Time, ratings
import { boot } from './harness.mjs';
const rooms = (process.argv[2] || '1-1,1-2,1-3,1-4,1-5,1-6,1-B').split(','), n = +(process.argv[3] || 1), diff = process.argv[4] || 'CONTESTANT', tunes = JSON.parse(process.argv[5] || '{}');
for (const id of rooms) {
  const { MT, game } = boot();
  for (const k in tunes) MT.T[k] = tunes[k];
  MT.newRun({ mode: 'rehearsal', diff, seed: +(process.env.SEED || 9) });
  for (let i = 0; i < n; i++) MT.addRunPlayer({ slot: i, ctl: 'bot', bot: { human: true } });
  game.go('play', { room: id }); game.advance(.4);
  const w = MT.play.world; let primes = 0, maxR = 0, deaths = 0, sumR = 0, k = 0; MT.on('ev:prime', () => primes++); MT.on('ev:died', () => deaths++);
  let t = 0; while (t < 300 && !(w.phase === 'EXIT' || w.phase === 'DONE' || w.phase === 'CLEAR' || game.sceneName !== 'play' || MT.play.world !== w)) { game.advance(.5); t += .5; maxR = Math.max(maxR, w.ratings.R); sumR += w.ratings.R; k++; if (MT.play.overlay && MT.play.overlay.cont) break; }
  console.log(id.padEnd(4), (w.room.name).padEnd(20), 'time', String(Math.round(w.time)).padStart(4), 'deaths', deaths, 'primes', primes, 'R max', Math.round(maxR), 'avg', Math.round(sumR / k), 'cash', MT.run.contestants.map(c => c.pr.cash).join('/'), 'phase', w.phase, game.errors.length ? 'ERR ' + game.errors[0].message : '');
}
