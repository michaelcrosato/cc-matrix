import { boot } from '../tests/lib/boot.mjs';
const times = {}, crashes = {};
const { OB } = boot({ quiet: false });
const routes = process.argv[2] ? process.argv[2].split(',') : OB.ALL_ROUTES;
for (const route of routes) {
  const { OB, game } = boot({ quiet: false });
  OB.cheats.infiniteTime = true;
  const race = OB.Race.create({ mode: 'arcade', noIntro: true, players: [{ car: 'orchidea', bot: { route } }] });
  OB.bus.on('car:crash', d => { const s = race.p1.stage; crashes[s] = (crashes[s] || 0) + 1; });
  for (let n = 0; n < 120 * 500 && race.phase !== 'done'; n++) race.step(1 / 120);
  const st = OB.routeStages(route);
  race.p1.stageTimes.forEach((t, i) => { (times[st[i]] = times[st[i]] || []).push(t); });
  if (!race.p1.finished) console.log('not finished', route, race.p1.stage, race.p1.car.z);
}
for (const [s, l] of Object.entries(times).sort()) console.log(s, 'avg', (l.reduce((a, b) => a + b, 0) / l.length).toFixed(1), 'min', Math.min(...l).toFixed(1), 'max', Math.max(...l).toFixed(1), 'crashes', crashes[s] || 0, 'n', l.length);
