import { makeStub, run } from './headless.mjs';
import { RoomService } from '../src/events/roomService.js';
const game = await makeStub();
const ev = new RoomService(game, { tier: 0, seed: 1, lanes: [{ kind: 'bot', skill: 'sharp' }] }); const l = ev.lanes[0]; let n = 5; const log = [];
run(ev, 30, (e, i) => { if (l.glasses.length !== n) { n = l.glasses.length; const g = l.bal; log.push(`t=${e.t.toFixed(2)} glasses=${n} lean=${g.leanDeg.toFixed(1)} cob=${g.cobX.toFixed(2)},${g.cobZ.toFixed(2)} gust=${l.gust ? JSON.stringify(l.gust) : 'none'} dist=${l.dist.toFixed(1)} vel=${g.footV.z.toFixed(2)} bodyY=${g.body.translation().y.toFixed(2)}`); } if (i % 120 === 0 && i < 600) log.push(`t=${e.t.toFixed(1)} lean=${l.bal.leanDeg.toFixed(1)} off=${(l.bal.fx - l.x).toFixed(2)} g=${l.glasses.map(g => g.body.translation().y.toFixed(2)).join(',')}`); });
console.log(log.join('\n'));
