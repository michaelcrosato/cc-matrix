import { boot, go, run, finishActivity, runUntil } from '../../tools/lib-node.mjs';
import { newSlot } from '../../src/core/save.js';
const { app, engine } = await boot('title');
engine.step(30); app.openSlot(0, newSlot('Tester', 0));
await go(engine, 'activity', { id: 'hoop', skipIntro: true, skill: 'average' });
for (let k = 0; k < 8; k++) { runUntil(engine, () => app.scene.playT > 8 * k + 5, 100); const st = app.scene.me.st; console.log(app.scene.playT.toFixed(1), 'w', st.w?.toFixed(2), 'L', st.L?.toFixed(2), 'rot', st.rot.toFixed(1), 'extra', st.hoopsExtra, 'inBand', st.inBand, 'throws', app.scene.throws.length); }
process.exit(0);
