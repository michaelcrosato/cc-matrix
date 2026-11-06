import { makeStub, run, resetTuning } from './headless.mjs';
import { REGISTRY } from '../src/data/events.js';
const game = await makeStub();
for (const E of REGISTRY) for (const tier of [0, 1, 2]) { try { const lanes = E.id === 'raft' ? [0, 1, 2, 3].map((i) => ({ kind: 'bot', skill: 'sharp', name: 'B' + i })) : [{ kind: 'bot', skill: 'sharp' }]; const ev = new E(game, { tier, seed: 3, lanes }); run(ev, 400); ev.dispose(); } catch (e) { console.log('PANIC', E.id, tier, String(e).slice(0, 60)); } }
for (const E of REGISTRY) { try { const ev = new E(game, { tier: 0, seed: 4, lanes: [{ kind: 'bot', skill: 'sharp' }] }); ev.begin(); for (let i = 0; i < 600; i++) ev.fixed(1 / 120); const l = ev.lanes[0]; if (l.bal && !l.bal.fallen) { ev.fallLane(l); for (let i = 0; i < 600; i++) ev.fixed(1 / 120); } ev.dispose(); } catch (e) { console.log('PANIC fall', E.id, String(e).slice(0, 60)); } }
console.log('done');
