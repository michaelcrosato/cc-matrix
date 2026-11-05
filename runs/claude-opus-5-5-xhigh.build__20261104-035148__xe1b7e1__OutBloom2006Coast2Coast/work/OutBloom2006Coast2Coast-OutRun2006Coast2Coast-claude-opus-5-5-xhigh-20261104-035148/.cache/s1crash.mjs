import { boot } from '../tests/lib/boot.mjs';
const { OB } = boot(); OB.cheats.infiniteTime = true;
const race = OB.Race.create({ mode: 'arcade', seed: 11, players: [{ car: 'orchidea', bot: { route: 'LLLL' } }] });
let hist = [];
OB.bus.on('car:crash', d => { console.log('CRASH', race.t.toFixed(1), JSON.stringify(d), 'seg', Math.round(race.p1.car.z / 200), 'curve', race.p1.road.curveAt(race.p1.car.z).toFixed(1)); hist.slice(-6).forEach(h => console.log('  ', h)); });
for (let n = 0; n < 120 * 90 && race.p1.stage === 'S1'; n++) { race.step(1 / 120); if (n % 12 === 0) { const c = race.p1.car; hist.push(`${race.t.toFixed(1)} x${c.x.toFixed(2)} v${c.v.toFixed(0)} drift${c.drift.on ? c.drift.a.toFixed(2) : '-'} ` + race.traffic.of('S1').filter(v => v.z - c.z > -600 && v.z - c.z < 2500).map(v => `[${v.type} dz${Math.round(v.z - c.z)} x${v.x.toFixed(2)}]`).join('')); } }
