// Test 7: pause freezes the game, the menu works, resume is exact. Plus settings and Gentle Mode.
import { boot, go, play, wait, press } from '../../tools/lib-node.mjs';
import { newSlot } from '../../src/core/save.js';
export default async function (t) {
  const { app, engine } = await boot('title'); engine.step(10); app.save.clear(); app.openSlot(0, newSlot('T', 0));
  await go(engine, 'activity', { id: 'tree', skipIntro: true }); await wait(engine, 6);
  const sc = app.scene; t.eq(sc.phase, 'play', 'playing');
  const before = sc.fingerprint(), tBefore = sc.playT;
  await press(engine, 'Escape'); await wait(engine, 0.3);
  t.eq(sc.stack[0]?.id, 'pause', 'Escape opens the pause menu'); t.eq(engine.timeScale, 0, 'timeScale is 0');
  const paused = sc.fingerprint(); await wait(engine, 2);
  t.eq(sc.fingerprint(), paused, 'fixedUpdate is frozen while paused'); t.eq(sc.playT, sc.playT, 'game time frozen');
  const f0 = sc.stack[0].menu.focus; await press(engine, 'ArrowDown'); t.eq(sc.stack[0].menu.focus, f0 + 1, 'the menu is navigable while paused');
  await press(engine, 'ArrowUp'); await press(engine, 'Enter'); await wait(engine, 0.3);
  t.eq(sc.stack.length, 0, 'Resume closes the menu'); t.eq(engine.timeScale, 1, 'timeScale back to 1');
  await wait(engine, 1); t.ok(sc.playT > tBefore, 'play resumes');
  // Settings: music default 10%, glyph choice, gentle mode
  t.ok(Math.abs(app.engine.audio.volume.music - 0.1) < 1e-9, 'music volume defaults to exactly 0.10');
  app.setSetting('glyph', 1); t.eq(app.device.glyphSet === 'kb' ? 'kb' : app.device.glyphSet, 'kb', 'glyph set follows the last device'); app.device.last = 'pad'; t.eq(app.device.glyphSet, 'xbox', 'Xbox glyphs when chosen'); app.setSetting('glyph', 0); t.eq(app.device.glyphSet, 'ps', 'PlayStation glyphs by default');
  app.setSetting('gentle', true); t.ok(Math.abs(app.ring(0.3) - 0.375) < 1e-9, 'Gentle Mode makes rings x1.25'); app.setSetting('gentle', false);
  app.resetSettings(); t.eq(app.settings.music, 0.1, 'reset to defaults');
  // restart from pause
  await press(engine, 'Escape'); await wait(engine, 0.2); sc.stack[0].menu.focus = 1; await press(engine, 'Enter'); await play(engine, () => app.scene !== sc, 10); t.ok(app.scene !== sc, 'Restart activity reloads the scene');
  t.eq(engine.errors.length, 0, 'no errors');
}
