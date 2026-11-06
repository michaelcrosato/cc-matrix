import { makeStub, run } from './headless.mjs';
import { CheckInTest, CHECK_KINDS } from '../src/events/checkin.js';
const game = await makeStub();
for (const kind of CHECK_KINDS) for (const skill of ['sharp', 'average', 'clumsy']) { const ev = new CheckInTest(game, { kind, seed: 2, lanes: [{ kind: 'bot', skill }] }); try { run(ev, 40); console.log(kind, skill, ev.phase, ev.score01.toFixed(2)); } catch (e) { console.log(kind, skill, 'ERR', String(e).slice(0, 100)); } ev.dispose(); }
