import { makeStub } from './headless.mjs';
import { GrandHold } from '../src/events/grandHold.js';
const game = await makeStub();
const ev = new GrandHold(game, { tier: 0, seed: 4, lanes: [{ kind: 'bot', skill: 'sharp' }] }); ev.begin(); let i = 0;
try { for (; i < 600; i++) ev.fixed(1 / 120); const l = ev.lanes[0]; console.log('before fall', l.bal.leanDeg, l.ph); ev.fallLane(l); console.log('fall started'); for (i = 0; i < 700; i++) { ev.fixed(1 / 120); if (i % 100 === 0) console.log(i, l.bal.fallen, l.rag.active, l.fallT.toFixed(2)); } } catch (e) { console.log('panic at', i, String(e).slice(0, 50)); }
