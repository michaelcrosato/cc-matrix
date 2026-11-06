import { makeStub, run } from './headless.mjs';
import { LogReps } from '../src/events/logReps.js';
const game = await makeStub();
for (const tier of [0, 1, 2]) { const out = []; for (const skill of ['sharp', 'average', 'clumsy']) { const ev = new LogReps(game, { tier, seed: 1, lanes: [{ kind: 'bot', skill }] }); run(ev, 100); out.push(skill + ' ' + ev.lanes[0].form.toFixed(0) + '/' + ev.lanes[0].falls + 'f/lost' + ev.lanes[0].lost); ev.dispose(); } console.log('logReps T' + (tier + 1), out.join(' | ')); }
