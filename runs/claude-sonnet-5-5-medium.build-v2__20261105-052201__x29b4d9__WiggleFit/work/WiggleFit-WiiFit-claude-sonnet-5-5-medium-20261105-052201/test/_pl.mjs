import { makeStub, run } from './headless.mjs';
import { Plates } from '../src/events/plates.js';
const game = await makeStub();
for (const tier of [0, 1, 2]) { const out = []; for (const skill of ['sharp', 'average', 'clumsy']) { const ev = new Plates(game, { tier, seed: 1, lanes: [{ kind: 'bot', skill }] }); run(ev, 70); const l = ev.lanes[0]; out.push(skill + ' ' + l.form.toFixed(0) + ' crash' + l.crashes); ev.dispose(); } console.log('plates T' + (tier + 1), out.join(' | ')); }
