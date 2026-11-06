import { boot, go, play, wait, press, pressUntil, settle } from '../../tools/lib-node.mjs';
import { newSlot } from '../../src/core/save.js';
const { app, engine } = await boot('title');
app.save.clear(); engine.step(20);
app.openSlot(0, newSlot('A', 0));
await go(engine, 'ferry', {});
await wait(engine, 3);
console.log(app.scene.status(), app.busy);
for (let i = 0; i < 8; i++) { await press(engine, 'Enter'); console.log(i, app.scene.constructor.id, app.scene.status(), app.busy, app.scene.tl?.ended); }
await settle(engine); await wait(engine, 1);
console.log(app.scene.constructor.id, app.busy, engine.errors);
process.exit(0);
