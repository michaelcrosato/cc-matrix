import { boot } from '../tests/lib/boot.mjs';
const stage = process.argv[2] || 'S4', verbose = process.argv[3] === 'v';
const { OB, game } = boot({ quiet: false });
OB.cheats.infiniteTime = true;
const race = OB.Race.create({ mode: 'arcade', noIntro: true, route: { stages: [stage], sprint: true }, players: [{ car: 'orchidea', bot: {} }] });
OB.bus.on('car:crash', d => console.log('CRASH', race.t.toFixed(1), JSON.stringify(d), 'seg', Math.round(race.p1.car.z / 200), 'x', race.p1.car.x.toFixed(2), 'curve', race.p1.road.curveAt(race.p1.car.z)));
let slow = 0;
for (let n = 0; n < 120 * 200 && race.phase !== 'done'; n++) {
  race.step(1 / 120); const c = race.p1.car;
  if (race.phase === 'race' && c.v < 200 && race.t > 15) slow += 1 / 120;
  if (verbose && n % 120 === 0) { const vs = race.traffic.of(stage).filter(v => v.z - c.z > -600 && v.z - c.z < 4000).map(v => `[${v.type} dz${Math.round(v.z - c.z)} x${v.x.toFixed(2)} v${v.v.toFixed(0)}]`).join(''); console.log(race.t.toFixed(0), 'seg', Math.floor(c.z / 200), 'x', c.x.toFixed(2), 'v', c.v.toFixed(0), 'curve', race.p1.road.curveAt(c.z).toFixed(1), vs); }
}
console.log(stage, 'time', race.p1.finishTime && race.p1.finishTime.toFixed(1), 'slow s', slow.toFixed(1), 'phase', race.phase);
