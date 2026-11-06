import { makeStub, run } from './headless.mjs';
import { RoomService } from '../src/events/roomService.js';
const game = await makeStub();
const ev = new RoomService(game, { tier: 1, seed: 1, lanes: [{ kind: 'bot', skill: 'sharp' }] }); const l = ev.lanes[0]; const log = []; let n = 5;
run(ev, 20, (e, i) => { if (l.gust && l.gust.on > 0 && i % 10 === 0) log.push(`t=${e.t.toFixed(2)} gust dir=${l.gust.dir} lean=${l.bal.leanX * 57.3 | 0} wish=${l.bal.wishX.toFixed(2)} push=${l.bal.pushX.toFixed(2)}`); if (l.glasses.length !== n) { n = l.glasses.length; log.push(`LOST t=${e.t.toFixed(2)} n=${n} leanX=${(l.bal.leanX * 57.3).toFixed(1)}`); } });
console.log(log.slice(0, 30).join('\n'));
