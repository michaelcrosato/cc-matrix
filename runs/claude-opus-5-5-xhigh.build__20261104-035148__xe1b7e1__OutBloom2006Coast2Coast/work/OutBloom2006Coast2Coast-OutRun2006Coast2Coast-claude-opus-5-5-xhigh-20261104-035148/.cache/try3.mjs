import { boot } from '../tests/lib/boot.mjs';
const { OB, game } = boot({ quiet: false });
const race = OB.Race.create({ mode: 'arcade', noIntro: true, players: [{ car: 'orchidea', bot: { route: 'LLLL' } }] });
let hist = [];
OB.bus.on('car:crash', d => { console.log('CRASH at', race.t.toFixed(2)); for (const h of hist.slice(-12)) console.log(h); });
for (let n = 0; n < 120 * 70 && race.phase !== 'done'; n++) {
  race.step(1 / 120);
  if (n % 12 === 0) { const c = race.p1.car, it = race.p1.lastIntent || {steer:0}; const vs = race.traffic.of(race.p1.stage).filter(v => v.z - c.z > -600 && v.z - c.z < 3000).map(v => `[dz${Math.round(v.z-c.z)} x${v.x.toFixed(2)} v${v.v.toFixed(0)}${v.changeT>0?' chg':''}]`).join(''); hist.push(`${race.t.toFixed(2)} x${c.x.toFixed(2)} v${c.v.toFixed(0)} st${it.steer.toFixed(2)} g${(it.gas||0).toFixed(1)} b${(it.brake||0).toFixed(1)} ${vs}`); }
}
