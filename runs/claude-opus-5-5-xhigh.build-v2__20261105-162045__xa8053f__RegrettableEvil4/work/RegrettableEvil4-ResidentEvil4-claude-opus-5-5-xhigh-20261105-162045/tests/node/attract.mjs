// Attract: idle title 600 frames starts it; it loops through all clips with no error; any input exits.
import { boot, setup, step, press } from '../helpers.mjs';
import { TitleScene } from '../../src/screens/title.js';
import { AttractMode, ATTRACT_CLIPS } from '../../src/screens/attract.js';
import { app, goto } from '../../src/core/app.js';

export default async function (t) {
  setup({ run: false });
  app.scenes = { title: () => goto(new TitleScene()), attract: () => goto(new AttractMode()), nightShiftMenu: () => {} };
  const e = await boot(new TitleScene());
  await step(e, 590);
  t.ok(e.game.name === 'title', 'still on the title at 590 frames');
  await step(e, 20);
  await step(e, 10);
  t.eq(e.game.name.startsWith('area:') || e.game.name === 'attract', true, 'attract started by 610 frames');
  t.eq(app.attract, true, 'app knows attract is on');
  // Step through every clip.
  const seen = new Set();
  for (let i = 0; i < 60 * 240; i += 60) {
    await step(e, 60);
    seen.add(app.attractDirector?.clip?.id);
    if (seen.size >= ATTRACT_CLIPS.length && app.attractDirector.clip?.id === 'siege') break;
  }
  t.eq(e.errors.length, 0, `no errors in attract: ${e.errors[0] ?? ''}`);
  for (const c of ATTRACT_CLIPS) t.ok(seen.has(c.id), `attract played clip ${c.id}`);
  t.eq(app.attractDirector?.failures ?? 0, 0, 'no attract clip failed');
  // Any key exits, and does nothing else.
  await step(e, 30);
  await press(e, 'KeyA', 2);
  await step(e, 20);
  t.eq(e.game.name, 'title', 'a key exits attract to the title');
  t.eq(app.attract, false, 'attract is off');
  // The crypt clip shows the crypt: the Dame all the way to the lever, not stood still for 15 s.
  {
    app.attract = false;
    const fresh = await boot(new AttractMode({ index: ATTRACT_CLIPS.findIndex((c) => c.id === 'crypt') }));
    let pulled = false; let walked = 0; let from = null;
    for (let i = 0; i < 60 * 14 && !pulled; i += 30) {
      await step(fresh, 30);
      const C = fresh.game.crypt;
      if (C) { if (from) walked += Math.hypot(C.dameP.x - from[0], C.dameP.z - from[1]); from = [C.dameP.x, C.dameP.z]; pulled = C.leverDone; }
    }
    t.ok(walked > 15, `the Dame walks the crypt in the demo (${walked.toFixed(1)} m)`);
    t.ok(pulled, 'as far as the lever, in the 15 s it has');
    t.eq(fresh.errors.length, 0, `no errors in the crypt clip: ${fresh.errors[0] ?? ''}`);
  }
}
