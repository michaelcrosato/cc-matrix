import { boot } from '../tests/lib/boot.mjs';
const times = {}, crashes = {}, routeT = {};
const { OB: O0 } = boot();
for (const route of O0.ALL_ROUTES) {
  const { OB } = boot(); OB.cheats.infiniteTime = true;
  const race = OB.Race.create({ mode: 'arcade', seed: 11, players: [{ car: 'orchidea', bot: { route } }] });
  OB.bus.on('car:crash', d => { const s = race.p1.stage; crashes[s] = (crashes[s] || 0) + 1; });
  for (let n = 0; n < 120 * 520 && race.phase !== 'done'; n++) race.step(1 / 120);
  const st = OB.routeStages(route); race.p1.stageTimes.forEach((t, i) => { (times[st[i]] = times[st[i]] || []).push(t); });
  routeT[route] = race.p1.stageTimes.map(t => t.toFixed(0)).join('/') + (race.p1.finished ? '' : ' DNF');
}
for (const [s, l] of Object.entries(times).sort((a, b) => +a[0].slice(1) - +b[0].slice(1))) console.log(s, 'avg', (l.reduce((a, b) => a + b, 0) / l.length).toFixed(1), 'min', Math.min(...l).toFixed(1), 'max', Math.max(...l).toFixed(1), 'crashes', crashes[s] || 0, 'n', l.length);
console.log(JSON.stringify(routeT));
