import { makeStub, run } from './headless.mjs';
import { Poses } from '../src/events/poses.js';
import { Cairn } from '../src/events/cairn.js';
const game = await makeStub();
for (const [E, name] of [[Poses, 'poses'], [Cairn, 'cairn']]) for (const tier of [0, 1, 2]) { const out = []; for (const skill of ['sharp', 'average', 'clumsy']) { const ev = new E(game, { tier, seed: 1, lanes: [{ kind: 'bot', skill }] }); run(ev, 140); out.push(skill + ' ' + ev.lanes[0].form.toFixed(0) + '/' + ev.lanes[0].falls + 'f'); ev.dispose(); } console.log(name, 'T' + (tier + 1), out.join(' | ')); }
