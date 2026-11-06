// Test 9: attract mode: 10 s idle on the title and on a menu starts it; not during play; a full loop runs error-free; any input exits.
import { boot, go, play, wait, press } from '../../tools/lib-node.mjs';
import { newSlot } from '../../src/core/save.js';
export default async function (t) {
  {
    const { app, engine } = await boot('title'); engine.step(10);
    await wait(engine, 9); t.ok(!app.attract, 'not before 10 s'); await wait(engine, 2); t.ok(!!app.attract, '10 s idle on the title starts attract');
    const seen = new Set(); await play(engine, () => { seen.add(app.scene?.constructor?.id + ':' + (app.scene?.actId ?? '')); return seen.size >= 13 || !app.attract; }, 400);
    t.ok(['hub:', 'weighin:', 'activity:tree', 'activity:squat', 'activity:hoop', 'activity:header', 'activity:step', 'activity:slack', 'activity:tray', 'activity:pier', 'activity:jog', 'activity:longstand'].every((k) => seen.has(k)), 'the loop covers every item: ' + [...seen].join(' '));
    t.eq(engine.errors.length, 0, 'the loop runs error-free'); t.ok(app.slot?.name === 'Recording', 'attract uses its own slot');
    engine.input.setKey('KeyX', true); await wait(engine, 0.5); engine.input.setKey('KeyX', false); await wait(engine, 3);
    t.ok(!app.attract, 'any input exits'); t.eq(app.scene.constructor.id, 'title', 'back on the title');
    await wait(engine, 3); t.ok(!app.attract, 'the timer re-arms');
    await wait(engine, 9); t.ok(!!app.attract, 'and starts again after 10 s');
  }
  {
    const { app, engine } = await boot('title'); engine.step(10); await press(engine, 'Enter'); await wait(engine, 0.5);
    t.eq(app.scene.mode, 'menu', 'on the main menu'); await press(engine, 'ArrowDown'); await press(engine, 'ArrowDown'); await press(engine, 'ArrowDown'); await press(engine, 'Enter'); await wait(engine, 0.3);
    t.eq(app.scene.stack[0]?.id, 'settings', 'settings open'); await wait(engine, 11); t.ok(!!app.attract, '10 s idle on a menu screen starts attract');
  }
  {
    const { app, engine } = await boot('title'); engine.step(10); app.save.clear(); app.openSlot(0, newSlot('T', 0));
    await go(engine, 'activity', { id: 'tree', skipIntro: true }); await wait(engine, 15); t.ok(!app.attract, 'no attract during play');
    await go(engine, 'hub'); await wait(engine, 15); t.ok(!app.attract, 'no attract on the island');
    await go(engine, 'activity', { id: 'tree', skipIntro: true }); await wait(engine, 5); await press(engine, 'Escape'); await wait(engine, 15); t.ok(!app.attract, 'no attract on the pause menu');
  }
}
