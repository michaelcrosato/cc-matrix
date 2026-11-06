import { boot, go, run } from '../../tools/lib-node.mjs';
import { newSlot } from '../../src/core/save.js';
const { app, engine } = await boot('title');
engine.step(30);
const chk = (l) => console.log(l, app.scene?.status?.(), engine.errors.slice(-2));
app.openSlot(0, newSlot('Tester', 0));
for (const id of ['ferry', 'weighin', 'hub', 'jar', 'locker', 'records', 'report', 'ending']) {
  try { await go(engine, id, id === 'weighin' ? { skill: 'good' } : {}); run(engine, id === 'ferry' ? 16 : 3); chk(id); } catch (e) { console.log(id, 'THROW', e.stack.split('\n').slice(0, 4).join(' | ')); }
}
process.exit(0);
