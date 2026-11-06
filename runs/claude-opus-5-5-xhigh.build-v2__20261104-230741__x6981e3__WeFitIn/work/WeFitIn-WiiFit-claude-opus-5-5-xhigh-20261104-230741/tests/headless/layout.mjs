// 19: no layout overflow at 1920x1080, 1280x720 and 640x360 (and 800x600): widgets record rects.
import { assert, boot, done, eq, test, App, tick } from '../lib.mjs';
import { layout } from '../../src/ui/layout.js';
import { PLAYABLE_IDS } from '../../src/data/activities.js';
import { MainMenuScreen, DropInScreen, SlotScreen, NameEntryScreen, DropInStation } from '../../src/ui/screens/mainmenu.js';
import { SettingsScreen } from '../../src/ui/screens/settings.js';
import { AboutScreen } from '../../src/ui/screens/about.js';
import { DevScreen } from '../../src/ui/screens/dev.js';
import { HowToScreen } from '../../src/ui/screens/howto.js';
import { StationScreen } from '../../src/scenes/hub.js';

const SAFE = 12;
const SIZES = [[1920, 1080, 480, 270], [1280, 720, 427, 240], [640, 360, 640, 360], [800, 600, 400, 300]];

// A portrait phone: only the title's message and attract run here.
{
  const h = await boot({ scene: 'title', viewport: { width: 412, height: 915, dpr: 2.625 } });
  App.touchOnly = true;
  App.gamepadSeen = false;
  await h.go('title', {});
  h.step(10);
  layout.record = true;
  const { hud } = App.engine;
  const check = (where) => {
    const bad = layout.overflow(hud.width, hud.height);
    assert(!bad.length, `${where} at ${hud.width}x${hud.height}: ${bad.slice(0, 4).map((r) => `${r.name} "${r.text}" ${r.x},${r.y} ${r.w}x${r.h}`).join('; ')}`);
  };
  await test('layout phone: the message fits, wrapped, and the attract banner fits on every line', async () => {
    assert(hud.width <= 200, `narrow art: ${hud.width}`);
    assert(App.scene.touchMessage, 'message on');
    h.step(3);
    check('title');
    assert(layout.rects.some((r) => r.name === 'touch-message'), 'message drawn');
    App.startAttract();
    await h.settle();
    for (let i = 0; i < 12; i++) {
      App.attract.lineI = i % 5;
      h.step(3);
      check(`attract line ${i}`);
    }
    assert(layout.rects.some((r) => r.name === 'attract-title'), 'banner drawn');
    App.attract.exit();
    await h.settle();
  });
  layout.record = false;
  App.touchOnly = false;
}

for (const [w, h0, artW, artH] of SIZES) {
  const h = await boot({ scene: 'title', viewport: { width: w, height: h0, dpr: 1 } });
  h.step(10); // the art size settles in the first frames
  layout.record = true;
  const { hud } = App.engine;
  const check = (where) => {
    const bad = layout.overflow(hud.width, hud.height, SAFE);
    assert(!bad.length, `${where} at ${w}x${h0}: ${bad.slice(0, 4).map((r) => `${r.name} "${r.text}" ${r.x},${r.y} ${r.w}x${r.h}`).join('; ')}`);
  };
  const shot = (where, frames = 3) => { h.step(frames); check(where); };
  eq(`${hud.width}x${hud.height}`, `${artW}x${artH}`, 'art size at this window');
  App.store.create(0, 'Kimberly', { skin: 'sand', top: 'white', bottom: 'sky', shoe: 'white', hair: 'ink' });
  App.slot.phase = 'day';
  App.slot.drips = 88;
  App.slot.wardrobe = ['band2', 'cape', 'confidence', 'wrist'];
  App.slot.ages = [80, 78, 74, 70, 66];
  App.slot.day = 3;
  App.slot.heardBeat = 7;

  await test(`layout ${w}x${h0}: menus`, async () => {
    shot('title');
    App.stack.push(new MainMenuScreen()); shot('main');
    App.stack.push(new SlotScreen()); shot('slots'); App.stack.pop();
    App.stack.push(new NameEntryScreen(1)); shot('name'); App.stack.pop();
    const dropin = new DropInScreen();
    App.stack.push(dropin); shot('dropin');
    for (const g of ['pavilion', 'shed', 'beach', 'lagoon', 'gate']) { App.stack.push(new DropInStation(g)); shot(`dropin ${g}`); App.stack.pop(); }
    App.stack.pop();
    const s = new SettingsScreen();
    App.stack.push(s);
    for (let i = 0; i < 4; i++) { s.tabs.set(i); shot(`settings tab ${i}`); }
    App.stack.pop();
    const a = new AboutScreen();
    App.stack.push(a);
    for (let i = 0; i < a.pages.length; i++) { a.i = i; a.scroll = 0; shot(`about ${i}`); }
    App.stack.pop();
    App.stack.push(new HowToScreen()); shot('howto'); App.stack.pop();
    const d = new DevScreen();
    App.stack.push(d);
    for (let i = 0; i < d.tabs.labels.length; i++) { d.tabs.set(i); shot(`dev tab ${i}`); }
    App.stack.pop();
    App.stack.clear();
  });
  await test(`layout ${w}x${h0}: every device's prompts fit`, async () => {
    await h.go('hub', {});
    for (const dev of ['pad', 'keyboard', 'mouse']) {
      App.device.last = dev;
      App.engine.input.setPointer(0, 0, false);
      App.scene.stand('pavilion'); App.device.last = dev; shot(`hub ${dev} near`);
      App.stack.push(new StationScreen('pavilion', App.scene)); App.device.last = dev; shot(`station ${dev}`); App.stack.pop();
      App.scene.stand('lagoon'); App.stack.push(new StationScreen('lagoon', App.scene)); shot('station lagoon'); App.stack.pop();
    }
    App.device.last = 'keyboard';
  });
  await test(`layout ${w}x${h0}: every activity's card, play and results`, async () => {
    for (const id of [...PLAYABLE_IDS, 'stand']) {
      await h.go('activity', { id, mode: 'week', noPractice: true });
      shot(`${id} card`);
      App.dev.autopilot = 'good';
      h.step(60 * 6);
      check(`${id} play`);
      h.step(60 * 2);
      check(`${id} play later`);
      App.dev.autopilot = null;
      App.scene.devFinish(3);
      shot(`${id} results start`);
      h.step(60 * 2);
      check(`${id} results`);
      assert(App.stack.top?.menuReady, 'results menu');
      App.stack.clear();
    }
  });
  await test(`layout ${w}x${h0}: scenes of the week`, async () => {
    for (const scene of ['jar', 'records', 'locker']) { await h.go(scene, {}); shot(scene, 5); }
    await h.go('records', {});
    const r = App.scene;
    for (let i = 0; i < 3; i++) { r.tabs.set(i); shot(`records tab ${i}`); }
    await h.go('report', {});
    shot('report', 10);
    App.slot.phase = 'morning';
    App.dev.autopilot = 'good';
    await h.go('weighin', {});
    let n = 0;
    while (App.scene.id === 'weighin' && n++ < 400) {
      h.step(5);
      check(`weighin ${App.scene.phase}`);
      if (App.stack.top?.name) { h.step(10); check(`weighin ${App.stack.top.name}`); h.press('Enter'); }
      await tick();
      if (App.loading) await h.settle();
    }
    App.dev.autopilot = null;
    await h.go('join', {});
    shot('join');
    h.press('Enter');
    shot('join with one');
    App.slot.confessed = false;
    await h.go('ending', {});
    shot('ending');
    await h.go('medley', { family: [{ kind: 'keyboard' }, { kind: 'bot', skill: 'good' }, { kind: 'bot', skill: 'good' }, { kind: 'bot', skill: 'good' }], picks: { pose: 'warrior', beat: 'step', header: 'header' } });
    const m = App.scene;
    shot('medley intro');
    m.clock.local = 0;
    h.step(60 * 6 + 5);
    h.step(60 * 6);
    check('medley stillness');
    m.clock.local = 60;
    h.step(60 * 2);
    check('medley break');
    m.clock.local = 66;
    h.step(60 * 6);
    check('medley beat');
    m.clock.local = 131;
    h.step(60 * 6);
    check('medley header');
    m.clock.local = 186;
    h.step(5);
    eq(m.phase, 'podium');
    shot('podium', 10);
    h.step(60);
    check('podium later');
    eq(h.errors().length, 0, h.errors().join(' | '));
  });
  layout.record = false;
}
done();
