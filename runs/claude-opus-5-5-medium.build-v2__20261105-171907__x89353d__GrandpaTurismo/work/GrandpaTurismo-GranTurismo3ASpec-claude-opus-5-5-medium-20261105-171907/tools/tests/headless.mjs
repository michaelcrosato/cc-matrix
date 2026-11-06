import { suite, Driver } from './lib.mjs';
import { Engine, analyzeClip, HERO_RIG, compileClips } from '../../src/pixel-engine.js';
import { App } from '../../src/game/app.js';
import { MenuScene } from '../../src/game/scenes/menu.js';
import { RaceScene } from '../../src/game/scenes/race.js';
import { ReplayScene } from '../../src/game/scenes/replay.js';
import { licenceSetup, quickRaceSetup } from '../../src/game/sim/setups.js';
import { GAME_CLIPS } from '../../src/game/animation/clips.js';
import { SAVE_KEY } from '../../src/game/data/meta.js';
const t = suite();
const store = new Map(); globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
const app = new App(); app.instant = true;
const e = await Engine.headless(new MenuScene(app, { screen: 'title' }), {}); e.manual = true; const d = new Driver(e, app); d.step(5);
t.ok(e.audio.volume.music === 0.1, 'music at 10% on a fresh profile', `${e.audio.volume.music}`);
d.expect('title'); t.ok(d.items().includes('new'), 'new game offered');
await d.choose('new'); d.expect('greet'); d.step(3); await d.choose('ok'); d.expect('dealer'); t.ok(app.ui.stack[0].id === 'map', 'map under the dealer');
d.step(3); t.ok(d.items().includes('buy'), 'dealer buttons'); const c0 = app.profile.credits; d.press('right'); d.step(2); await d.choose('buy'); t.ok(app.profile.cars[0]?.id === 'kite' && app.profile.credits === c0 - 12500, 'bought the Kite through the screens', JSON.stringify(app.profile.cars.map((c) => c.id)));
t.ok(store.get(SAVE_KEY)?.includes('kite'), 'saved after a purchase');
await d.back(); d.expect('map'); d.step(3);
t.ok(d.items().length === 9, 'nine places on the map');
const visits = [['licence', 'licence'], ['events', 'events'], ['dealer', 'dealer'], ['tuning', 'tuning'], ['service', 'service'], ['home', 'garage'], ['museum', 'museum'], ['theatre', 'theatre'], ['arcade', 'arcade']];
for (const [place, id] of visits) { await d.choose(place); d.step(4); d.expect(id); t.ok(d.items().length > 0 && d.items().length <= 9, `${id} has focusable items`, `${d.items().length}`); t.ok(app.ui.promptList?.length > 0, `${id} has prompts`); await d.back(); d.step(3); d.expect('map'); }
// licence attempt: the demonstration's brain through the scene
await d.choose('licence'); d.step(3); await d.choose('licC'); d.step(3); d.expect('tests'); await d.choose('C-1'); d.step(3); d.expect('testcard'); await d.choose('start'); d.step(3); t.ok(app.scene.name === 'race' && app.scene.sim.run, 'test C-1 is running', app.scene.name);
app.demoBrain = true; let n = 0; while (!app.ui.top && n++ < 60 * 90) d.step(1); app.demoBrain = false; d.step(5); d.expect('licenceresult'); t.ok(app.lastResult.outcome.medal >= 1, 'a medal for the demo drive', JSON.stringify(app.lastResult.outcome)); t.ok(!!app.lastResult.replay, 'replay data');
await d.choose('watch'); await d.settle(); d.step(30); t.ok(app.scene.name === 'replay', 'replay plays', app.scene.name); d.press('info'); d.press('tabR'); d.press('confirm'); d.press('confirm'); d.press('back'); await d.settle(); d.step(5); d.expect('licenceresult');
await d.choose('back'); await d.settle(); d.step(3); d.expect('tests'); await d.back(); await d.back(); d.step(3); d.expect('map');
// tuning through the screens
await d.choose('tuning'); d.step(3); await d.choose('morepage'); d.step(3); await d.choose('brakes'); d.step(3); d.expect('parts'); app.profile.credits += 5000; await d.choose('pads'); t.ok(app.profile.cars[0].install.parts.brakes === 1, 'pads fitted'); await d.back(); d.step(3); d.expect('tuning'); await d.back(); d.step(3);
// a race, the results, retry restores the money
app.profile.licences.C = true; await d.choose('events'); d.step(3); await d.choose('dawn'); d.step(3); d.expect('eventcard'); await d.choose('race'); d.step(3); d.expect('roundcard'); await d.choose('go'); d.step(3); t.ok(app.scene.name === 'race', 'round runs');
const sim = app.scene.sim; t.ok(sim.cars.length === 8, 'field of eight'); t.ok(sim.cars[7].seat === 0, 'the player starts last'); t.ok(sim.phase === 'rolling', 'rolling start');
d.step(200); d.press('pause'); d.step(2); d.expect('pause'); t.ok(app.paused, 'paused'); const t0 = sim.t; d.step(10); t.ok(sim.t === t0, 'paused sim does not step'); await d.choose('resume'); d.step(3); t.ok(!app.paused, 'resumed'); sim.finishNow(1); d.step(4); d.expect('results'); const m1 = app.profile.credits; t.ok(app.lastResult.outcome.place === 1, 'place 1');
t.ok(m1 > 0, 'paid'); await d.choose('retry'); await d.settle(); t.ok(app.profile.credits < m1 && app.profile.events.dawn.round === 0, 'retry restores the profile'); app.scene.sim.finishNow(2); d.step(4); d.expect('results'); await d.choose('continue'); await d.settle(); d.step(4); d.expect('roundcard');
await d.back(); d.step(2); await d.back(); d.step(2); await d.back(); d.step(2); d.expect('map');
// settings: reset puts music back at 10%
e.audio.setVolume('music', 0.6); app.resetSettings(); t.ok(e.audio.volume.music === 0.1, 'reset sets music to 10%');
// pause menu reachable items, dev mode sliders
app.ui.clearStack(); await e.loadGame(new RaceScene(app, quickRaceSetup({ track: 'proving', carId: 'ginga', field: 3, pace: 0.9, laps: 1 }))); d.step(5); d.press('pause'); d.step(2); t.ok(d.items().includes('dev'), 'dev mode in the pause menu'); await d.choose('dev'); d.step(2); d.expect('dev'); const g0 = app.dev.tune.grip; d.press('right'); d.step(2); t.ok(app.dev.tune.grip !== g0, 'a slider moves at once', `${app.dev.tune.grip}`); t.ok(app.dev.dirty, 'dev tag'); d.press('info'); d.step(2); t.ok(app.dev.tune.grip === g0 && !app.dev.dirty, 'reset all'); await d.back(); d.step(2); d.expect('pause'); await d.choose('retire'); await d.settle(); d.step(3); d.expect('arcade'); await d.back(); d.step(2);
// the engine's own replay ends on the same fingerprint
app.ui.clearStack(); const s = licenceSetup('C-2'); await e.loadGame(new RaceScene(app, s)); e.input.setKey('KeyW', true); d.step(120); e.input.setKey('KeyW', false); d.step(40); const end = e.fingerprint(), rec = e.recording(); await e.replay(rec, () => e.loadGame(new RaceScene(app, licenceSetup('C-2')))); t.ok(e.fingerprint() === end, 'replay ends on the same fingerprint');
// plan audit: things that once existed only as data
{ app.ui.clearStack(); await e.loadGame(new RaceScene(app, quickRaceSetup({ track: 'cedar', carId: 'ginga', field: 2, pace: 0.9, laps: 1 }))); d.step(3); t.ok(app.scene.hikers.length === 3, 'hikers walk at Cedar', `${app.scene.hikers.length}`); const x0 = app.scene.hikers[0].p.root.position.x; d.step(120); t.ok(app.scene.hikers[0].p.root.position.x !== x0, 'the hikers move'); }
{ const r = new RaceScene(app, quickRaceSetup({ track: 'kestrel', carId: 'ginga', field: 3, pace: 0.9, laps: 1 })); await e.loadGame(r); r.sim.cars.forEach((c) => (c.ai = true)); for (let i = 0; i < 1500; i++) r.sim.step([]); const data = r.sim.replayData(); await e.loadGame(new ReplayScene(app, data, { screen: 'map' })); d.step(300); const sp = app.scene; t.ok(app.mix.lastVoice?.speaker === 'dell', 'Dell talks over the replay', JSON.stringify(app.mix.lastVoice)); t.ok(app.ui.subtitle?.speaker === 'DELL', 'with subtitles'); t.ok(app.ui.subLift === 15, 'the replay subtitle sits above the bottom strip'); const seen = new Set(); for (let i = 0; i < 40 && seen.size < 2; i++) { sp.tv.timer = 0; d.step(2); seen.add(sp.tv.shot); } t.ok(seen.size >= 2, 'the director cuts between shots', [...seen].join()); const fakes = sp.data.data[1]; const save = sp.t; sp.t = 2; const k = Math.floor(2 * sp.data.hz) * 12; const old = fakes[k + 10]; fakes[k + 10] = 2; fakes[k + 12 + 10] = 2; t.ok(sp.interest() === 1, 'the director prefers a sliding car', `${sp.interest()}`); fakes[k + 10] = old; sp.t = save; app.ui.subtitle = null; }
{ const lp = app.profile; app.ui.clearStack(); const prof = JSON.stringify(lp); lp.licences = {}; await e.loadGame(new MenuScene(app, { screen: 'map' })); d.step(3); const dayA = e.ambient.intensity; lp.licences = { C: true, B: true, A: true }; lp.events.h200 = { won: true, round: 0, points: {} }; app.scene.setSet('map', {}); d.step(2); t.ok(app.scene.mapNight > 0.7 && app.scene.nightLamps.visible, 'the Map has night lamps once the Grand Prix is near'); t.ok(e.ambient.intensity < dayA + 0.01 && e.sun.intensity < 0.5, 'the Map at night is dark', `${e.ambient.intensity} ${e.sun.intensity}`); lp.licences = {}; delete lp.events.h200; app.scene.setSet('map', {}); t.ok(!app.scene.nightLamps.visible, 'no lamps by day'); app.profile = JSON.parse(prof); app.ui.clearStack(); }
// clips
for (const def of GAME_CLIPS) { let ok = true; try { const model = (await e.context.loadModel('assets/hero.glb')).scene, clip = compileClips([def], HERO_RIG, model)[0], rep = analyzeClip(model, HERO_RIG, def, clip); ok = !!rep; } catch (err) { ok = false; console.log('clip', err.message); } t.ok(ok, `clip compiles ${def.name}`); }
t.done();
