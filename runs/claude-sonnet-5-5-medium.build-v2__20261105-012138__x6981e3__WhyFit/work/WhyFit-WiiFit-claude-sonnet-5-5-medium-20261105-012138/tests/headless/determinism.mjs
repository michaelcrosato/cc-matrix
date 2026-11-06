// Test 10: record an activity, replay it, fingerprints equal.
import { boot, go, wait, play } from '../../tools/lib-node.mjs';
import { newSlot } from '../../src/core/save.js';
export default async function (t) {
  for (const id of ['tree', 'squat', 'header']) {
    const { app, engine } = await boot('title'); engine.step(10); app.save.clear(); app.openSlot(0, newSlot('T', 0));
    const args = { id, skipIntro: true };
    await go(engine, 'activity', args);
    const keys = ['KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyD', 'KeyA'];
    for (let i = 0; i < 18; i++) { const k = keys[i % keys.length]; engine.input.setKey(k, true); await wait(engine, 0.35, 5); engine.input.setKey(k, false); await wait(engine, 0.1, 5); }
    const rec = engine.recording(), end = engine.fingerprint(), status = app.scene.status();
    t.ok(!!rec, `${id}: recording exists`);
    await engine.replay(rec, () => engine.loadGame(app.make('activity', args)));
    t.eq(engine.fingerprint(), end, `${id}: replay reproduces the fingerprint`);
    t.eq(app.scene.status(), status, `${id}: replay reproduces the status`);
  }
}
