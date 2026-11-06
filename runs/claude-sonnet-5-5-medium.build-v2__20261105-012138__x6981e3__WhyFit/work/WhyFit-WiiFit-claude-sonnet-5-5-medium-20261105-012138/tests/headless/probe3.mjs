import { boot, go, run, finishActivity } from '../../tools/lib-node.mjs';
import { newSlot } from '../../src/core/save.js';
const { app, engine } = await boot('title');
engine.step(30);
app.openSlot(0, newSlot('Tester', 0));
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['squat', 'lunge', 'press', 'hoop', 'header', 'step'];
for (const id of ids) for (const skill of ['idle', 'sloppy', 'average', 'good', 'expert']) {
  try {
    await go(engine, 'activity', { id, skipIntro: true, skill });
    finishActivity(engine, 6 + app.scene.duration * 1.5);
    console.log(id, skill, app.scene.phase, app.scene.result?.score, app.scene.result?.stars, engine.errors.length ? engine.errors[0] : '');
  } catch (e) { console.log(id, skill, 'THROW', e.stack.split('\n').slice(0, 4).join(' | ')); }
}
process.exit(0);
