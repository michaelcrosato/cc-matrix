import { makeStub, run } from './headless.mjs';
import { Raft } from '../src/events/raft.js';
const game = await makeStub();
for (let seed = 1; seed <= 4; seed++) { const ev = new Raft(game, { tier: 0, seed, lanes: [{ kind: 'bot', skill: 'sharp', name: 'A' }, { kind: 'bot', skill: 'average', name: 'B' }, { kind: 'bot', skill: 'average', name: 'C' }, { kind: 'bot', skill: 'clumsy', name: 'D' }] }); run(ev, 240); console.log('raft seed', seed, 'wins', ev.wins.join(','), 'rounds', ev.round, 'phase', ev.phase, 't', ev.t.toFixed(0)); ev.dispose(); }
