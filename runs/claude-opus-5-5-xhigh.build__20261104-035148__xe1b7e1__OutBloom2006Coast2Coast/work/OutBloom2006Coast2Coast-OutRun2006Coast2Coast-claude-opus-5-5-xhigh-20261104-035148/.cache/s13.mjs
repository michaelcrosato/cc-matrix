import { boot } from '../tests/lib/boot.mjs';
const { OB } = boot(); OB.cheats.infiniteTime = true;
const st = process.argv[2] || 'S13';
const race = OB.Race.create({ mode: 'arcade', seed: 11, route: { stages: [st], sprint: true }, noIntro: true, players: [{ car: 'orchidea', bot: {} }] }); race.phase = 'race';
let hist = [];
OB.bus.on('car:crash', d => { console.log('CRASH', race.t.toFixed(1), JSON.stringify(d), 'seg', Math.round(race.p1.car.z / 200), 'curve', race.p1.road.curveAt(race.p1.car.z).toFixed(1), 'tunnel', race.p1.road.seg(race.p1.car.z).tunnel); hist.slice(-5).forEach(h => console.log('  ', h)); });
for (let n = 0; n < 120 * 100 && race.phase !== 'done'; n++) { race.step(1 / 120); if (n % 12 === 0) { const c = race.p1.car; hist.push(`${race.t.toFixed(1)} x${c.x.toFixed(2)} v${c.v.toFixed(0)} ` + race.traffic.of(st).filter(v => v.z - c.z > -600 && v.z - c.z < 2200).map(v => `[${v.type} dz${Math.round(v.z - c.z)} x${v.x.toFixed(2)} v${v.v.toFixed(0)}]`).join('')); } }
console.log('time', race.p1.finishTime);
