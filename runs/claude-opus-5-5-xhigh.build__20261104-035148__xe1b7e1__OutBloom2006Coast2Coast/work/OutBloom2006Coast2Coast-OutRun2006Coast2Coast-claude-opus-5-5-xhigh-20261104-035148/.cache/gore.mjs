import { raceIn, run } from '../tests/lib/boot.mjs';
const { race, OB } = raceIn({ players: [{ car: 'orchidea' }] }); const d = race.p1, road = d.road, SEG = 200;
race.place(d, 'S1', road.junctionAt + 36 * SEG, .02); d.car.v = 100; d.input = null;
OB.bus.on('*', (e, n) => { if (n.startsWith('car') || n.startsWith('fork')) console.log(race.t.toFixed(2), n, JSON.stringify(e)); });
for (let i = 0; i < 150; i++) { race.step(1/120); if (i % 15 === 0) { const info = OB.World.info(road, d.car.z, d.car.x, d.branch); console.log('seg', Math.floor(d.car.z / SEG) - road.stageLen, 'abs', d.absX().toFixed(2), 'v', d.car.v.toFixed(0), 'split', info.split.toFixed(2), 'hits', info.hits.map(h => h.kind).join(), 'gore', info.gore, 'phase', race.phase); } }
