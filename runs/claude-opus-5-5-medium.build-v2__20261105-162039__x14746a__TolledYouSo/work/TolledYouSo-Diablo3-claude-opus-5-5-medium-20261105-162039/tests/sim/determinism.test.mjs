import { ok, eq, guarded } from '../lib.mjs';
import { newWorld, addHero, stepWorld, simHash, applyCommand } from '../../src/sim/step.js';
import { enterZone } from '../../src/sim/world.js';
import { botIntent, makeBot } from '../../src/sim/bot.js';
import { afterTalk } from '../../src/sim/quests.js';
const run = (seed, ticks) => { const w = newWorld({ seed }); const h = addHero(w, { seat: 0, cls: 'sexton' }); enterZone(w, 'yard'); const b = makeBot(); for (let i = 0; i < ticks; i++) { const c = []; const it = botIntent(w, h, b, c); stepWorld(w, { 0: it }); for (const x of c) applyCommand(w, 0, x); for (const e of w.events) if (e.t === 'npc' && e.d) afterTalk(w, e.d); w.events.length = 0; } return simHash(w); };
await guarded(async () => { const T = 5 * 60 * 60; eq(run(3, T), run(3, T), 'same seed same hash over 5 minutes'); ok(run(3, 3000) !== run(4, 3000), 'different seed differs'); });
