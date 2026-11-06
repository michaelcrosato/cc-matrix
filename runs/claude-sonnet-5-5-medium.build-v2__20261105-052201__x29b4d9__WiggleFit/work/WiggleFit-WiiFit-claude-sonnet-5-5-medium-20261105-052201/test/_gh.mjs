import { makeStub, run } from './headless.mjs';
import { GrandHold } from '../src/events/grandHold.js';
const game = await makeStub();
for (const skill of ['sharp', 'average', 'clumsy']) { const ev = new GrandHold(game, { tier: 0, seed: 1, lanes: [{ kind: 'bot', skill }] }); run(ev, 400); const l = ev.lanes[0]; console.log('grand', skill, l.form.toFixed(0), 'restarts', l.stats.restarts, 'phase', ev.phase, 't', ev.t.toFixed(0), 'ph', l.ph); ev.dispose(); }
