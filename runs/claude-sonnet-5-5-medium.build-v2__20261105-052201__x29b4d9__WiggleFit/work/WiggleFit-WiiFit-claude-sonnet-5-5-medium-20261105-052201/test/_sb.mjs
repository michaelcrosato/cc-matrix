import { makeStub, run } from './headless.mjs';
import { Springboard } from '../src/events/springboard.js';
const game = await makeStub();
for (const tier of [0, 1, 2]) { const out = []; for (const skill of ['sharp', 'average', 'clumsy']) { const ev = new Springboard(game, { tier, seed: 2, lanes: [{ kind: 'bot', skill }] }); run(ev, 80); const l = ev.lanes[0]; out.push(skill + ' ' + l.form.toFixed(0) + ' ' + l.best.map(b => b.toFixed(0)).join(',') + ' t' + ev.t.toFixed(0)); ev.dispose(); } console.log('spring T' + (tier + 1), out.join(' | ')); }
