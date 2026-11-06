// The scripted playthrough of the whole game, then a replay of a purely input-driven run.
import { playthrough } from './playthrough.mjs';
import { part2 } from './part2.mjs';
import { part3 } from './part3.mjs';
import * as tools from '../../src/systems/tools.js';
import * as mail from '../../src/systems/mail.js';
import * as newgame from '../../src/systems/newgame.js';
import { replayRun } from './replay.mjs';
import { monkeyRun } from './monkey.mjs';

const fails = [];
let n = 0;
try {
  const r = await playthrough();
  r.tools = tools; r.mail = mail; r.newgame = newgame;
  part2(r);
  part3(r);
  n += r.b.frames > 0 ? 1 : 0;
  for (const f of r.b.fails) fails.push(f);
  for (const e of r.g.engine.errors) fails.push(`engine: ${e}`);
  n += Object.keys(r.seenEvents).length;
} catch (e) { fails.push(`playthrough threw: ${e.message} ${(e.stack ?? '').split('\n').filter((l) => !l.includes('pixel-engine')).slice(1, 5).join(' ')}`); }
try {
  const rr = await replayRun();
  n += rr.n;
  fails.push(...rr.fails);
} catch (e) { fails.push(`replay threw: ${e.message} ${(e.stack ?? '').split('\n').filter((l) => !l.includes('pixel-engine')).slice(1, 5).join(' ')}`); }
try {
  const m = await monkeyRun();
  n += m.n;
  fails.push(...m.fails);
} catch (e) { fails.push(`monkey threw: ${e.message} ${(e.stack ?? '').split('\n').filter((l) => !l.includes('pixel-engine')).slice(1, 5).join(' ')}`); }
for (const f of fails) console.log(f);
console.log(`play: ${n} milestones, ${fails.length} failures`);
process.exit(fails.length ? 1 : 0);
