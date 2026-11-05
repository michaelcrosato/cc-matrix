import { boot } from '../tests/lib/boot.mjs';
const { OB, game } = boot({ quiet: false });
const noTraffic = process.argv[2] === 'nt';
const race = OB.Race.create({ mode: 'arcade', noIntro: true, traffic: !noTraffic, players: [{ car: 'orchidea', bot: { route: 'RLRL' } }] });
OB.bus.on('*', (d, name) => { if (['car:bump','car:crash','drift:start','drift:end','checkpoint','stage:enter','fork:choose','car:scrape'].includes(name)) console.log(race.t.toFixed(2), name, JSON.stringify(d).slice(0,90), 'z', Math.round(race.p1.car.z/200), 'x', race.p1.car.x.toFixed(2), 'v', race.p1.car.v.toFixed(0)); });
for (let n = 0; n < 120 * 200 && race.phase !== 'done'; n++) { race.step(1 / 120); if (n % 240 === 0) { const c = race.p1.car; console.log('  t', race.t.toFixed(0), race.p1.stage, 'seg', Math.floor(c.z/200), 'x', c.x.toFixed(2), 'v', c.v.toFixed(0), 'g', c.gear+1, 'curve', race.p1.road.curveAt(c.z).toFixed(1), 'clock', race.clock.toFixed(0)); } }
