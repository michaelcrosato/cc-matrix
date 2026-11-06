import { makeStub, run } from './headless.mjs';
import { RoomService } from '../src/events/roomService.js';
const game = await makeStub();
const ev = new RoomService(game, { tier: 0, seed: 1, lanes: [{ kind: 'bot', skill: 'sharp' }] }); const l = ev.lanes[0]; const log = [];
run(ev, 11, (e, i) => { if (e.t > 3.5 && i % 30 === 0) { const bp = l.bal.body.translation(); const q = l.bal.body.rotation(); log.push(`t=${e.t.toFixed(2)} ` + l.glasses.map(g => { const t = g.body.translation(); return `(${(t.x - bp.x).toFixed(2)},${(t.y - bp.y).toFixed(2)},${(t.z - bp.z).toFixed(2)})`; }).join(' ') + ` lean=${l.bal.leanDeg.toFixed(1)} zv=${l.bal.footV.z.toFixed(2)}`); } });
console.log(log.slice(0, 22).join('\n'));
