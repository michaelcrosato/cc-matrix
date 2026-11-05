import { boot } from '../tests/lib/boot.mjs';
const { OB } = boot(); const route = process.argv[2] || 'RRRR';
console.log('tuning', OB.tune('startTime'), OB.tune('checkpointBonus2'), OB.tune('checkpointBonus5'));
const race = OB.Race.create({ mode: 'arcade', seed: 11, players: [{ car: 'orchidea', bot: { route } }] });
OB.bus.on('*', (e, n) => { if (['checkpoint', 'stage:enter', 'time:up', 'car:crash', 'goal'].includes(n)) console.log(race.t.toFixed(1), n, JSON.stringify(e).slice(0, 90), 'clock', race.clock.toFixed(1)); });
for (let n = 0; n < 120 * 520 && race.phase !== 'done'; n++) race.step(1 / 120);
console.log('end', race.phase, race.endReason, race.clock.toFixed(1));
