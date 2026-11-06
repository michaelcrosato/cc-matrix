// 7 Pause, 8 Dev, 9 Attract, 11 Medley, 19 layout.
import { assert, boot, done, eq, near, test, App, tick } from '../lib.mjs';
import { T, TUNABLE_DEFS, resetTunables } from '../../src/core/tunables.js';
import { layout } from '../../src/ui/layout.js';
import { ATTRACT_PLAYLIST, ATTRACT_SECONDS } from '../../src/scenes/attract.js';
import { ACTIVITY_IDS } from '../../src/data/activities.js';
import { MEDLEY } from '../../src/data/medley.js';
import { MEDLEY_LENGTH } from '../../src/scenes/medley.js';
import { GhostDriver } from '../../src/core/drivers.js';
import { dripsFor, starsFor, ageFromTests } from '../../src/core/week.js';
import { ACTIVITIES } from '../../src/data/activities.js';
import { repTarget } from '../../src/scenes/activity/reps.js';

const h = await boot({ scene: 'title' });
const { engine } = h;

// ---- Pause ------------------------------------------------------------------------------------
await test('pause: timeScale 0, fixedUpdate frozen, menu navigable, resume exact', async () => {
  await h.go('activity', { id: 'tree', mode: 'dropin', noPractice: true });
  App.dev.autopilot = 'good';
  h.step(60 * 6);
  const s = App.scene;
  eq(s.phase, 'play');
  h.press('Escape');
  eq(App.stack.top?.name, 'pause');
  eq(engine.timeScale, 0);
  const fp = engine.fingerprint();
  const t = s.eventT;
  const time = engine.time;
  h.step(120);
  eq(engine.fingerprint(), fp, 'frozen');
  eq(s.eventT, t);
  eq(engine.time, time, 'game time frozen');
  const f0 = App.stack.top.menu.focus;
  h.press('ArrowDown');
  assert(App.stack.top.menu.focus !== f0, 'menu moves');
  h.press('ArrowUp');
  engine.input.setKey('Escape', true);
  h.step(1);
  engine.input.setKey('Escape', false);
  eq(App.stack.open, false, 'resumed by Back');
  eq(engine.timeScale, 1);
  eq(s.eventT, t, 'resume is exact');
  h.step(10);
  assert(s.eventT > t, 'runs again');
  App.dev.autopilot = null;
});
await test('pause: every item works: Restart, Settings, How to play, About, Dev Tools', async () => {
  const open = () => { h.press('Escape'); eq(App.stack.top?.name, 'pause'); };
  const pick = (id) => {
    const m = App.stack.top.menu; const i = m.items.findIndex((x) => x.id === id);
    assert(i >= 0, id);
    m.focus = i;
    h.press('Enter');
  };
  open();
  for (const [id, name] of [['settings', 'settings'], ['howto', 'howto'], ['about', 'about'], ['dev', 'dev']]) {
    pick(id);
    eq(App.stack.top?.name, name, id);
    h.step(3);
    h.press('Escape');
    eq(App.stack.top?.name, 'pause', `back from ${id}`);
  }
  pick('resume');
  eq(App.stack.open, false);
  open();
  pick('restart');
  await h.settle();
  eq(App.scene.phase, 'intro', 'restarted');
  eq(engine.timeScale, 1, 'time back after restart');
});
await test('Create + Options does not pause (the hub\'s chord)', async () => {
  engine.input.setKey('PadCreate', true);
  h.press('PadOptions');
  eq(App.stack.open, false);
  engine.input.setKey('PadCreate', false);
  h.press('PadOptions');
  eq(App.stack.top?.name, 'pause');
  h.press('Escape');
});

// ---- Settings ---------------------------------------------------------------------------------
await test('settings: music defaults to 10%, and every control takes effect', async () => {
  eq(App.settings.music, 0.1);
  eq(engine.audio.volume.music, 0.1);
  App.settings.music = 0.3; App.saveSettings();
  near(engine.audio.volume.music, 0.3, 1e-6);
  App.settings.music = 0.1; App.saveSettings();
  App.settings.glyphs = 'xbox'; App.saveSettings();
  eq(App.device.glyphs, 'xbox');
  App.settings.glyphs = 'ps'; App.saveSettings();
  App.settings.gentle = true;
  near(App.ringOf(0.4), 0.5, 1e-6);
  near(App.noiseScale(), 0.8, 1e-6);
  App.settings.gentle = false;
  App.settings.look = 'arcade'; App.saveSettings();
  eq(engine.settings.values.look, 'arcade');
  App.settings.look = 'default'; App.saveSettings();
  eq(engine.settings.values.look, undefined);
  App.settings.mouseLeanRadius = 90; App.saveSettings();
  eq(T.mouseLeanRadius, 90);
  App.settings.mouseLeanRadius = 70; App.saveSettings();
});

// ---- Dev tools: every slider changes live behaviour ------------------------------------------
async function fingerprintAfter(id, frames = 300, skill = 'average', extra = {}) {
  await h.go('activity', { id, mode: 'dropin', noPractice: true, ...extra });
  App.dev.autopilot = skill;
  h.step(10);
  h.step(60 * 3 + frames);
  const fp = engine.fingerprint();
  App.dev.autopilot = null;
  return fp;
}
const PROBE = {
  dotInstability: 'tree', dotAuthority: 'tree', dotDamping: 'tree', dotNoise: 'tree', dotLag: 'tree', ringScale: 'tree', gustForce: 'slackline',
  breathBonus: 'warrior', repLag: 'squats', repFatigue: 'squats', repTempoScale: 'squats',
  hoopLow: 'hoop', hoopHigh: 'hoop', hoopLiftRate: 'hoop', headerInterval: 'header', slackWalkInst: 'slackline', trayGravity: 'tray', trayMaxTilt: 'tray',
  jogTargetCadence: 'jog', pierBoost: 'pier', stepWindow: 'step', stepOffsetMs: 'step',
};
for (const d of TUNABLE_DEFS) {
  const probe = PROBE[d.id];
  if (!probe) continue;
  await test(`dev slider ${d.id} changes live behaviour`, async () => {
    resetTunables();
    const frames = d.id === 'gustForce' || d.id === 'slackWalkInst' ? 60 * 8 : d.id === 'pierBoost' ? 60 * 10 : d.id === 'stepWindow' || d.id === 'stepOffsetMs' ? 60 * 12 : 300;
    const skill = d.id === 'hoopHigh' || d.id === 'hoopLow' ? 'average' : d.id === 'stepWindow' || d.id === 'stepOffsetMs' ? 'sloppy' : 'average';
    const a = await fingerprintAfter(probe, frames, skill);
    T[d.id] = d.id === 'stepOffsetMs' ? 150 : d.id === 'stepWindow' ? 0.5 : d.id === 'hoopLow' ? 1.6 : d.id === 'hoopHigh' ? 1.05 : d.id === 'dotLag' ? d.def * 3 : d.max;
    const b = await fingerprintAfter(probe, frames, skill);
    resetTunables();
    assert(a !== b, `${probe} fingerprint unchanged: ${a}`);
  });
}
await test('dev slider mouseLeanRadius changes the lean', async () => {
  await h.go('activity', { id: 'tree', mode: 'dropin', noPractice: true });
  h.press('Enter');
  h.step(30);
  App.device.last = 'mouse';
  const s = App.scene;
  const lane = s.playerLane;
  engine.input.setPointer(0.2, 0.2, false);
  h.step(3);
  const x0 = lane.inp.x;
  T.mouseLeanRadius = 140;
  h.step(3);
  const x1 = lane.inp.x;
  resetTunables();
  assert(Math.abs(x0) > Math.abs(x1) * 1.5, `${x0} vs ${x1}`);
  engine.input.setPointer(0, 0, false);
  App.device.last = 'keyboard';
});
await test('dev slider dripRate, starThresholdScale, ageTrainingWeight change the economy', () => {
  const d0 = dripsFor(2, 60);
  T.dripRate = 2;
  assert(dripsFor(2, 60) === d0 * 2);
  T.dripRate = 1;
  const s0 = starsFor(ACTIVITIES.tree, 80);
  T.starThresholdScale = 1.5;
  assert(starsFor(ACTIVITIES.tree, 80) < s0);
  T.starThresholdScale = 1;
  const a0 = ageFromTests([0.5], 10);
  T.ageTrainingWeight = 2;
  assert(ageFromTests([0.5], 10) < a0);
  resetTunables();
});
await test('dev: one button resets the tab, one resets everything, export lists changes', async () => {
  const { DevScreen } = await import('../../src/ui/screens/dev.js');
  const dev = new DevScreen();
  T.dotNoise = 2; T.repLag = 0.3;
  dev.menu.items.find((i) => i.id === 'resetTab').action();
  eq(T.dotNoise, 0.8, 'tab');
  eq(T.repLag, 0.3, 'other tab untouched');
  dev.menu.items.find((i) => i.id === 'export').action();
  assert(dev.exported.includes('repLag'));
  dev.menu.items.find((i) => i.id === 'resetAll').action();
  eq(T.repLag, 0.1, 'all');
});
await test('dev tools: every tool works', async () => {
  const { DevScreen } = await import('../../src/ui/screens/dev.js');
  const toolDev = () => new DevScreen();
  const item = (d, id) => d.toolItems().find((i) => i.id === id);
  App.store.create(1, 'Dev', { skin: 'sand', top: 'white', bottom: 'sky', shoe: 'white', hair: 'ink' });
  App.slot.phase = 'day';
  await h.go('hub', {});
  let d = toolDev();
  App.stack.push(d);
  item(d, 'god').action(); eq(App.dev.god, true); item(d, 'god').action(); eq(App.dev.god, false);
  item(d, 'overlay').action(); h.step(2); eq(App.dev.overlay, true); item(d, 'overlay').action();
  item(d, 'hideHud').action(); h.step(2); eq(App.dev.hideHud, true); item(d, 'hideHud').action();
  item(d, 'unlock').action(); eq(App.dev.allUnlocked, true); item(d, 'unlock').action();
  item(d, 'autopilot').adjust(1); eq(App.dev.autopilot, 'idle'); item(d, 'autopilot').adjust(-1); eq(App.dev.autopilot, null);
  item(d, 'timescale').adjust(1); eq(App.dev.timeScale, 1.25); item(d, 'timescale').adjust(-1); eq(App.dev.timeScale, 1);
  const before = App.slot.drips;
  item(d, 'drips').action();
  eq(App.slot.drips, before + 50);
  await tick(); await tick();
  assert(App.slot.wardrobe.length >= 2, 'milestones from 50 Drips');
  item(d, 'freeCam').action(); h.step(2); eq(engine.camera.preset, 'free'); item(d, 'freeCam').action(); h.step(2); eq(engine.camera.preset, 'iso');
  item(d, 'dialogue').action();
  eq(App.stack.top?.name, 'dialogue');
  h.press('Enter'); h.press('Enter'); h.step(2);
  item(d, 'sound').action();
  eq(App.stack.top?.name, 'soundtest');
  for (const it of App.stack.top.menu.items) it.action?.();
  h.step(2);
  App.stack.pop();
  // Finish the current activity with N stars.
  d.closeAll();
  await h.go('activity', { id: 'tree', mode: 'dropin', noPractice: true });
  d = toolDev();
  App.stack.push(d);
  item(d, 'finish').adjust(-1);
  eq(d.starPick, 2);
  item(d, 'finish').action();
  eq(App.scene.lastResult.stars, 2);
  eq(App.stack.top?.name, 'results');
  // Go to a day, a scene, an activity.
  d = toolDev();
  App.stack.push(d);
  d.dayPick = 4;
  item(d, 'day').action();
  await h.settle();
  eq(App.slot.day, 4);
  eq(App.scene.id, 'weighin');
  d = toolDev();
  App.stack.push(d);
  d.sceneI = d.constructor === DevScreen ? 3 : 3;
  item(d, 'scene').action();
  await h.settle();
  eq(App.scene.id, 'report');
  d = toolDev();
  App.stack.push(d);
  d.activityI = ACTIVITY_IDS.indexOf('hoop');
  item(d, 'activity').action();
  await h.settle();
  eq(App.scene.activity, 'hoop');
  d = toolDev();
  App.stack.push(d);
  item(d, 'anim').action();
  await h.settle();
  eq(App.scene.id, 'viewer');
  h.press('ArrowRight'); h.step(10);
  assert(App.scene.i === 1);
  h.press('Escape');
  await h.settle();
  d = toolDev();
  App.stack.push(d);
  item(d, 'resetSave').action();
  await h.settle();
  eq(App.scene.id, 'title');
  eq(App.store.data.slots[1], null);
  App.stack.clear();
  App.dev = { god: false, autopilot: null, overlay: false, hideHud: false, timeScale: 1, freeCam: false, allUnlocked: false };
});
await test('dev: no tab shows more than 8 rows at once, the plan\'s tabs, and one Tools tab holds every tool', async () => {
  const { DevScreen } = await import('../../src/ui/screens/dev.js');
  const d = new DevScreen();
  for (let i = 0; i < d.tabs.labels.length; i++) {
    d.tabs.set(i);
    assert(d.menu.visibleRows() <= 8, `${d.tabs.current} shows ${d.menu.visibleRows()}`);
  }
  eq(d.tabs.labels.join(), 'Balance,Breath and reps,Rhythm,Games,Economy,Tools');
  d.tabs.set(5);
  eq(d.menu.items.length, 16, 'every tool');
  eq(d.menu.pageCount, 2, 'on two pages');
});
await test('every scene gives a real status line and a fingerprint', async () => {
  App.store.create(0, 'Scenes', { skin: 'sand', top: 'white', bottom: 'sky', shoe: 'white', hair: 'ink' });
  App.slot.phase = 'day'; App.slot.heardBeat = 7;
  const list = [['title', {}], ['hub', {}], ['weighin', {}], ['report', {}], ['jar', {}], ['records', {}], ['locker', {}], ['ferry', {}], ['ending', {}], ['viewer', {}], ['join', {}], ['medley', { family: [{ kind: 'bot' }] }], ...ACTIVITY_IDS.map((id) => ['activity', { id, mode: 'dropin', noPractice: true }])];
  for (const [id, args] of list) {
    await h.go(id, args);
    h.step(5);
    const s = App.scene.status(App.ctx);
    assert(typeof s === 'string' && s.length > 3 && s.includes(id === 'activity' ? args.id : id), `${id} status: ${s}`);
    assert(typeof App.scene.fingerprint(App.ctx) === 'string', `${id} fingerprint`);
    assert(engine.fingerprint().length > 0);
    App.stack.clear();
  }
  App.store.resetAll();
  await h.go('title', {});
});
await test('tabs change with the wheel; lists with pages keep the wheel', async () => {
  const { SettingsScreen } = await import('../../src/ui/screens/settings.js');
  const { DevScreen } = await import('../../src/ui/screens/dev.js');
  const s = new SettingsScreen();
  App.stack.push(s);
  h.step(1);
  engine.input.addPointer(0, 0, 1);
  h.step(2);
  eq(s.tabs.i, 1, 'Settings tab by wheel');
  App.stack.pop(s);
  const d = new DevScreen();
  App.stack.push(d);
  h.step(1);
  engine.input.addPointer(0, 0, 1);
  h.step(2);
  eq(d.tabs.i, 0, 'Balance has 11 rows, so the wheel turns its page');
  eq(d.menu.top, 8, 'page 2');
  App.stack.clear();
});
await test('Step Class: pause stops the music; resume counts in and restarts at the current bar', async () => {
  await h.go('activity', { id: 'step', mode: 'dropin', noPractice: true });
  App.dev.autopilot = 'good';
  h.step(60 * 3 + 60 * 12);
  const s = App.scene;
  eq(s.phase, 'play');
  const { BAR_SECONDS } = await import('../../src/scenes/activity/step.js');
  const before = s.localClock;
  engine.input.setKey('Escape', true); h.step(1); engine.input.setKey('Escape', false); h.step(1);
  eq(App.stack.top?.name, 'pause');
  eq(engine.audio.playing, '', 'the music stopped');
  engine.input.setKey('Escape', true); h.step(1); engine.input.setKey('Escape', false);
  const bar = Math.floor(before / BAR_SECONDS);
  near(s.localClock, bar * BAR_SECONDS, 1e-6, 'clock back at the bar');
  assert(s.counting > 0, 'counting in');
  h.step(30);
  near(s.localClock, bar * BAR_SECONDS, 1e-6, 'held during the count');
  h.step(120);
  eq(engine.audio.playing, 'step', 'music back');
  assert(s.localClock > bar * BAR_SECONDS, 'moving again');
  App.dev.autopilot = null;
});
await test('the island talks: classmates when you pass, Coach during a hold', async () => {
  App.store.create(0, 'Talk', { skin: 'sand', top: 'white', bottom: 'sky', shoe: 'white', hair: 'ink' });
  App.slot.phase = 'day'; App.slot.heardBeat = 7;
  await h.go('hub', {});
  const hub = App.scene;
  const l = hub.locals.june;
  hub.hero.teleport([l.at.x + 1, 0.1, l.at.z]);
  hub.barkT = 99; hub.chatT = 0;
  h.step(30);
  eq(App.bark.who, 'june', 'June says something');
  await h.go('activity', { id: 'tree', mode: 'dropin', noPractice: true });
  App.dev.autopilot = 'expert';
  let coach = false;
  for (let i = 0; i < 60 && !coach; i++) { h.step(30); if (App.bark.who === 'coach' && App.scene.phase === 'play') coach = true; }
  assert(coach, 'Coach remarks during the hold');
  App.dev.autopilot = null;
  App.store.resetAll();
  await h.go('title', {});
});
await test('Island Jog is about 220 m', async () => {
  await h.go('activity', { id: 'jog', mode: 'dropin', noPractice: true });
  assert(App.scene.length > 205 && App.scene.length < 235, `${App.scene.length}`);
  await h.go('title', {});
});
await test('the wobble count reaches the remark', async () => {
  const { ResultsScreen } = await import('../../src/ui/screens/results.js');
  await h.go('activity', { id: 'tree', mode: 'dropin', noPractice: true });
  let found = false;
  for (let i = 0; i < 40 && !found; i++) {
    const r = new ResultsScreen(App.scene, { id: 'tree', stars: 1, score: 50, firstEver: false, wobbles: 9, mode: 'dropin' });
    found = r.line.includes('You wobbled 9 times');
  }
  assert(found);
  await h.go('title', {});
});
await test('god mode keeps the Dot in the ring; autopilot plays', async () => {
  await h.go('activity', { id: 'plank', mode: 'dropin', noPractice: true });
  h.press('Enter');
  App.dev.god = true;
  h.step(60 * 3 + 60 * 10);
  const s = App.scene;
  const ring = s.event.ring();
  assert(Math.hypot(s.playerLane.dot.x, s.playerLane.dot.y) <= ring + 0.01, 'held');
  App.dev.god = false;
});

// ---- Attract ----------------------------------------------------------------------------------
await test('attract: 10 s idle on the title starts it', async () => {
  await h.go('title', {});
  engine.input.setKey('Enter', false);
  h.step(60 * 9);
  eq(App.attract, null, 'not yet');
  h.step(60 * 1 + 5);
  assert(App.attract, 'started');
  await h.settle();
  eq(App.scene.id, 'hub');
});
await test('attract: any input exits: key, click, mouse move, wheel, stick', async () => {
  const inputs = {
    key() { engine.input.setKey('KeyQ', true); h.step(2); engine.input.setKey('KeyQ', false); },
    click() { engine.input.setButtons(1); h.step(1); engine.input.setButtons(0); h.step(1); },
    move() { engine.input.setPointer(0.5, 0.5, false); h.step(2); engine.input.setPointer(0, 0, false); },
    wheel() { engine.input.addPointer(0, 0, 1); h.step(2); },
    pad() { engine.input.setKey('PadCross', true); h.step(2); engine.input.setKey('PadCross', false); },
  };
  for (const [name, fn] of Object.entries(inputs)) {
    if (!App.attract) { App.startAttract(); await h.settle(); }
    h.step(30);
    fn();
    eq(App.attract, null, `${name} exits`);
    await h.settle();
    eq(App.scene.id, 'title', `${name} returns to title`);
    h.step(5);
  }
});
await test('attract: 10 s idle on a menu starts it; no trigger during play or on pause', async () => {
  await h.go('title', {});
  h.press('Enter');
  eq(App.stack.top?.name, 'main');
  h.step(60 * 10 + 30);
  assert(App.attract, 'started from a menu');
  App.attract.exit();
  await h.settle();
  h.step(5);
  await h.go('activity', { id: 'tree', mode: 'dropin', noPractice: true });
  h.step(60 * 12);
  eq(App.attract, null, 'not during an intro');
  h.press('Enter');
  h.step(60 * 12);
  eq(App.attract, null, 'not during play');
  h.press('Escape');
  h.step(60 * 12);
  eq(App.attract, null, 'not on the pause menu');
  h.press('Escape');
});
await test('attract: a full loop covers every item with no errors, then comes round again', async () => {
  await h.go('title', {});
  App.startAttract();
  await h.settle();
  const seen = new Set();
  let n = 0;
  const startLoops = App.attract.loops;
  while (App.attract.loops === startLoops && n < 60 * ATTRACT_SECONDS * (ATTRACT_PLAYLIST.length + 2)) {
    h.step(15);
    await tick();
    n += 15;
    seen.add(App.scene.activity ?? App.scene.id);
    if (App.loading) await h.settle();
  }
  for (const item of ATTRACT_PLAYLIST) assert(seen.has(item.args.id ?? item.scene), `${item.args.id ?? item.scene} never showed: ${[...seen].join(',')}`);
  eq(h.errors().length, 0, h.errors().join(' | '));
  eq(App.scene.resultsShown ?? false, false);
  App.attract.exit();
  await h.settle();
});
await test('attract: each activity actually plays, cheating freely', async () => {
  for (const id of ['tree', 'hoop', 'header', 'step', 'slackline', 'tray', 'pier', 'jog', 'squats']) {
    await h.go('activity', { id, attract: true });
    const fp = engine.fingerprint();
    h.step(60 * 6);
    assert(engine.fingerprint() !== fp, `${id} stands still`);
    assert(App.scene.phase === 'play', `${id} phase ${App.scene.phase}`);
    assert(App.scene.result().score >= 0);
  }
  await h.go('title', {});
});

// ---- The Medley -------------------------------------------------------------------------------
const FAMILY = [{ kind: 'bot', skill: 'expert' }, { kind: 'bot', skill: 'good' }, { kind: 'bot', skill: 'average' }, { kind: 'bot', skill: 'idle' }];
await test('medley: 4 bot lanes, windows respected, scores in range, podium, rematch', async () => {
  await h.go('medley', { family: FAMILY, picks: { pose: 'tree', beat: 'hoop', header: 'header' } });
  const s = App.scene;
  eq(s.lanes.length, 4);
  eq(s.phase, 'intro');
  h.step(60 * MEDLEY.introSeconds + 2);
  eq(s.phase, 'play');
  eq(s.area, 0, 'first window');
  h.step(60 * MEDLEY.eventSeconds + 30);
  eq(s.area, -1, 'a break between events');
  eq(s.lanes[0].points.length, 1);
  h.step(60 * (MEDLEY.breakSeconds + 1));
  eq(s.area, 1, 'second window');
  eq(s.current.kind, 'hoop');
  h.step(60 * (MEDLEY.eventSeconds + MEDLEY.breakSeconds));
  eq(s.area, 2, 'third window');
  eq(s.current.kind, 'header');
  h.step(60 * MEDLEY.eventSeconds + 30);
  eq(s.phase, 'podium');
  eq(s.clock.now() >= MEDLEY_LENGTH - 0.2, true);
  for (const l of s.lanes) {
    eq(l.points.length, 3);
    for (const p of l.points) assert(p >= 0 && p <= 1000, `points ${p}`);
    assert(l.total >= 0 && l.total <= 3000);
  }
  assert(s.lanes[0].total > s.lanes[3].total, 'expert beats idle');
  eq(s.order[0], s.lanes[0], 'expert on top');
  assert(s.awards.length === 4);
  h.step(10);
  eq(h.errors().length, 0, h.errors().join(' | '));
  eq(App.bark.active, true, 'Ounce is talking');
  layout.record = true;
  h.step(2);
  assert(!layout.rects.some((r) => r.name === 'menu'), 'the menu waits for her');
  await h.until(() => !App.bark.active, { every: 10, max: 60 * 15 });
  h.step(2);
  assert(layout.rects.some((r) => r.name === 'menu'), 'then it shows');
  layout.record = false;
  s.menu.items.find((i) => i.id === 'rematch').action();
  await h.settle();
  eq(App.scene.id, 'medley');
  eq(App.scene.phase, 'intro');
});
for (const [beat, kind] of [['squats', 'reps'], ['lunges', 'reps'], ['step', 'step']]) {
  await test(`medley: the Beat event ${beat} runs in its window and scores`, async () => {
    await h.go('medley', { family: FAMILY, picks: { pose: 'heron', beat, header: 'header' } });
    const s = App.scene;
    h.step(60 * MEDLEY.introSeconds + 2);
    h.step(60 * (MEDLEY.eventSeconds + MEDLEY.breakSeconds) + 5);
    eq(s.current.kind, kind);
    h.step(60 * (MEDLEY.eventSeconds - 2));
    assert(s.current.normalized(s.lanes[0]) > s.current.normalized(s.lanes[3]), `expert over idle: ${s.current.normalized(s.lanes[0])} vs ${s.current.normalized(s.lanes[3])}`);
    eq(h.errors().length, 0);
  });
}
await test('medley: ghosts send what each event means by position', async () => {
  await h.go('medley', { family: FAMILY, picks: { pose: 'tree', beat: 'hoop', header: 'header' } });
  const s = App.scene;
  h.step(60 * MEDLEY.introSeconds + 2);
  const lane = s.lanes[0];
  s.clock.local = 131;
  h.step(60 * 4);
  eq(s.current.kind, 'header');
  const [x] = s.current.ghostPos(lane);
  eq(x, lane.state.pos, 'header sends the lane position');
  assert(s.current.apex < 2, 'objects stay in the 4-mat frame');
});
await test('drop-in Long Stand does not lead to the ending', async () => {
  await h.go('activity', { id: 'stand', mode: 'dropin', noPractice: true, from: 88 });
  App.dev.autopilot = 'good';
  await h.until(() => App.scene.resultsShown, { max: 60 * 30 });
  App.dev.autopilot = null;
  h.step(60 * 3);
  const ids = App.stack.top.menu.items.map((i) => i.id);
  assert(!ids.includes('continue') && ids.includes('back'), ids.join());
  App.stack.clear();
});
await test('medley: picks come from a seeded stream, the same on every run', async () => {
  await h.go('medley', { family: FAMILY });
  const a = App.scene.picks.join();
  await h.go('medley', { family: FAMILY });
  eq(App.scene.picks.join(), a);
  for (let i = 0; i < 3; i++) assert(MEDLEY.events[i].options.includes(App.scene.picks[i]), 'pick from options');
});

// A pretend hub, in-process: the protocol's events, by hand.
function fakeHub(info) {
  const on = {};
  const hub = {
    active: true, sent: [], progressed: [], results: [], answers: [], t: -Infinity,
    on(ev, fn) { (on[ev] ??= []).push(fn); return () => { on[ev] = on[ev].filter((f) => f !== fn); }; },
    emit(ev, ...a) { for (const f of on[ev] ?? []) f(...a); },
    time() { return this.t; },
    answer(x) { this.answers.push(x); },
    send(d, o) { this.sent.push({ d, o }); return true; },
    progress(p) { this.progressed.push(p); },
    result(r) { this.results.push(r); },
    ready() {}, fail() {},
    rng: () => () => 0.5,
  };
  return hub;
}
await test('session: card, start, ghosts lerp and never simulate, leave, result once, end stops everything', async () => {
  const info = { me: 0, players: [{ id: 0, name: 'Zoë <b>', color: '#e8443a' }, { id: 1, name: 'Bea', color: '#3b82f6' }, { id: 2, name: 'Cy', color: '#22c55e' }], host: 0, isHost: true, mode: 'ghost', round: 1, limitMs: 300000, seed: 123 };
  const fake = fakeHub(info);
  globalThis.AIHub = fake;
  App.session = info;
  await h.go('medley', { session: true, picks: { pose: 'tree', beat: 'squats', header: 'header' } });
  const s = App.scene;
  eq(s.phase, 'card');
  eq(App.stack.open, false);
  h.step(5);
  fake.emit('card', { left: 12000, paused: false, starting: false, ready: [1], asking: 0, asked: false });
  h.step(2);
  h.press('PadCross');
  eq(fake.answers[0], 'ready', 'Cross answers Ready');
  h.press('KeyM');
  eq(fake.answers[1], 'more', 'M asks for more time');
  fake.emit('start', { in: 3000 });
  fake.t = -3000;
  h.step(5);
  eq(s.phase, 'countdown');
  assert(s.ghostSender.timer, 'sending as soon as start arrives');
  fake.t = 0;
  h.step(2);
  eq(s.phase, 'play');
  const ghost = s.lanes[1];
  assert(ghost.driver instanceof GhostDriver);
  assert(ghost.ghost, 'lane is a ghost');
  fake.t = 1000;
  h.step(2);
  eq(s.area, 0);
  const dot0 = [ghost.dot.x, ghost.dot.y];
  fake.emit('message', { a: 0, x: 0.5, y: -0.25, c: 1, t: 0.2, s: 77 }, 1);
  fake.t = 2000;
  h.step(90);
  eq(ghost.dot.x, dot0[0], 'a ghost never simulates');
  eq(ghost.dot.y, dot0[1]);
  near(ghost.driver.x, 0.5, 0.05, 'it lerps');
  eq(s.scoreOf(ghost), 77, 'its score is what it sent');
  eq(ghost.avatar.root.visible, true, 'same area shows');
  fake.emit('message', { a: 1, x: 0, y: 0, c: 0, t: 0, s: 80 }, 1);
  h.step(3);
  eq(ghost.avatar.root.visible, false, 'a ghost in another area is hidden');
  fake.emit('leave', { id: 2, reason: 'left' });
  h.step(30);
  assert(s.lanes[2].gone, 'leaves');
  eq(s.phase, 'play', 'the round goes on');
  fake.t = 300000;
  fake.emit('time-up', { graceMs: 3000 });
  eq(fake.results.length, 1, 'result at time-up');
  fake.emit('time-up', { graceMs: 3000 });
  eq(fake.results.length, 1, 'result only once');
  assert(typeof fake.results[0].score === 'number');
  assert(fake.results[0].awards.length >= 1);
  fake.emit('end', { reason: 'finished', standings: [] });
  eq(s.ended, true);
  eq(s.ghostSender.timer, null, 'sends nothing after end');
  eq(engine.audio.playing, '', 'sound stops');
  // In a session the pause menu has Resume and Settings, and nothing freezes.
  const { PauseScreen } = await import('../../src/ui/screens/pause.js');
  const p = new PauseScreen(s);
  eq(p.freezes, false);
  eq(p.menu.items.map((i) => i.id).join(), 'resume,settings');
  App.session = null;
  delete globalThis.AIHub;
  s.dispose();
  await h.go('title', {});
});

// ---- 19 Layout: no overflow at every size ----------------------------------------------------
await test('rep curve: 0 to 1 in 40%, hold 15%, 1 to 0 in 35%, rest 10%', () => {
  eq(repTarget(0), 0); eq(repTarget(0.4), 1); eq(repTarget(0.5), 1); near(repTarget(0.725), 0.5, 1e-9); eq(repTarget(0.95), 0);
});
done();
