import { makeStub, run } from './headless.mjs';
import { StepClass } from '../src/events/stepClass.js';
const game = await makeStub();
for (const tier of [0, 1, 2]) { const out = []; for (const skill of ['sharp', 'average', 'clumsy']) { const ev = new StepClass(game, { tier, seed: 1, lanes: [{ kind: 'bot', skill }] }); run(ev, 130); const l = ev.lanes[0]; out.push(skill + ' ' + l.form.toFixed(0) + '/' + l.falls + 'f ' + JSON.stringify(l.hits)); ev.dispose(); } console.log('step T' + (tier + 1), out.join(' | ')); }
