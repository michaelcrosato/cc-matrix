import { boot } from '../tests/lib/boot.mjs';
const { OB, game } = boot({ quiet: false });
const race = OB.Race.create({ mode: 'arcade', noIntro: true, players: [{ car: 'orchidea', bot: { route: 'LLLL' } }] });
let last = '', n = 0;
const ev = []; OB.bus.on('*', (d, name) => { if (!['car:shift','slip:start','slip:end','overtake','car:offroad','drift:start','air:start'].includes(name)) ev.push(name + ' ' + JSON.stringify(d).slice(0, 80)); });
for (; n < 120 * 400 && race.phase !== 'done'; n++) { race.step(1 / 120); const s = race.p1.stage; if (s !== last) { last = s; console.log('t', race.t.toFixed(1), 'stage', s, 'clock', race.clock.toFixed(1)); } }
console.log(JSON.stringify(race.snapshot()));
console.log(ev.filter(e => !e.startsWith('drift:end')).slice(0, 60).join('\n'));
console.log('drifts', ev.filter(e => e.startsWith('drift:end')).length, 'errors', game.errors.length);
