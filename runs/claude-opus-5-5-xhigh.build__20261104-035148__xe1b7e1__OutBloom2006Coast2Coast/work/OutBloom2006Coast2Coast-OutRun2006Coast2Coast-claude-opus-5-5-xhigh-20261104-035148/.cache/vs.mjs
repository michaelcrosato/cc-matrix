import { boot, run } from '../tests/lib/boot.mjs';
const { OB, game } = boot(); game.advance(.1); OB.cheats.noCollide = true;
const race = OB.Race.create({ mode: 'versus', route: { stages: ['S1', 'S2', 'S5'], sprint: true }, noIntro: true, seed: 4, startTime: 400, finishWait: 90, players: [{ car: 'orchidea', bot: {} }, { car: 'orchidea', bot: {}, cpu: true }] }); race.phase = 'race';
OB.bus.on('*', (e, n) => { if (['stage:enter', 'car:crash', 'goal', 'fork:choose'].includes(n)) console.log(race.t.toFixed(1), n, JSON.stringify(e)); });
for (let s = 0; s < 360 && race.phase !== 'done'; s += 10) { run(race, 10); console.log('t', race.t.toFixed(0), race.players.map(p => p.stage + ':' + Math.round(p.car.z / 200) + ' v' + Math.round(p.car.v) + ' x' + p.car.x.toFixed(2)).join('  ')); }
