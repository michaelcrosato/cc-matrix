import { boot } from '../tests/lib/boot.mjs';
const routes = process.argv[2] ? process.argv[2].split(',') : ['LLLL','RRRR','LRLR','RLRL','LLRR','RRLL'];
for (const route of routes) {
  const { OB, game } = boot({ quiet: false });
  const race = OB.Race.create({ mode: 'arcade', noIntro: true, players: [{ car: 'orchidea', bot: { route } }] });
  let crashes = 0, bumps = 0; const cps = [];
  OB.bus.on('car:crash', () => crashes++); OB.bus.on('car:bump', () => bumps++); OB.bus.on('checkpoint', d => cps.push(Math.round(race.clock - d.bonus)));
  for (let n = 0; n < 120 * 420 && race.phase !== 'done'; n++) race.step(1 / 120);
  const r = race.result || {}; const p = race.p1;
  console.log(route, 'reason', r.reason, 'goal', p.goal, 'stage', p.stage, 'left', race.clock.toFixed(1), 'cpLeft', cps.join('/'), 'crash', crashes, 'bump', bumps, 'times', p.stageTimes.join(','), 'err', game.errors.length);
}
