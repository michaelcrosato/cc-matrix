import { makeStub, run } from './headless.mjs';
import { RoomService } from '../src/events/roomService.js';
const game = await makeStub();
for (const tier of [0, 1, 2]) { const out = []; for (const skill of ['sharp', 'average', 'clumsy']) { const ev = new RoomService(game, { tier, seed: 1, lanes: [{ kind: 'bot', skill }] }); run(ev, 110); const l = ev.lanes[0]; out.push(skill + ' ' + l.form.toFixed(0) + ' glasses' + l.delivered + ' d' + l.dist.toFixed(0) + ' falls' + l.falls + ' t' + ev.t.toFixed(0)); ev.dispose(); } console.log('room T' + (tier + 1), out.join(' | ')); }
