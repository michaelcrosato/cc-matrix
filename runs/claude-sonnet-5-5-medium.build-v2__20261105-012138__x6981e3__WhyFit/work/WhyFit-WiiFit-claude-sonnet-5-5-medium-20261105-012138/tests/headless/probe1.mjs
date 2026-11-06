import { boot, go, run } from '../../tools/lib-node.mjs';
import { newSlot } from '../../src/core/save.js';
const { app, engine } = await boot('title');
engine.step(30);
app.openSlot(0, newSlot('Tester', 0));
for (const id of ['tree', 'heron', 'warrior', 'chair', 'fold', 'plank']) for (const skill of ['idle', 'sloppy', 'average', 'good', 'expert']) {
  await go(engine, 'activity', { id, skipIntro: true, skill });
  run(engine, 5 + (app.scene.duration)); 
  console.log(id, skill, app.scene.phase, JSON.stringify(app.scene.result), engine.errors.length);
}
process.exit(0);
