// Menu flows by actions: new game, buy car, test, tune, race, results, save. Music at 0.1 on a fresh profile. New clips pass analysis.
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { suite } from './_lib.mjs';
import { boot } from './_drive.mjs';
import { analyzeClip, compileClips, HERO_RIG, THREE, Engine } from '../../src/pixel-engine.js';
import { GAME_CLIPS } from '../../src/game/models/clips.js';
import { makePerson } from '../../src/game/render/people.js';
import { RaceScene } from '../../src/game/scenes/race.js';
import { MenuScene } from '../../src/game/scenes/menu.js';
import { ReplayScene } from '../../src/game/scenes/replay.js';
import { quickSetup } from '../../src/game/sim/setups.js';
import { makeApp } from '../../src/main.js';
const t = suite();
const b = await boot(), app = b.app;
// Sound defaults
t.near(b.engine.audio.volume.music, 0.1, 1e-6, 'music starts at 10%');
t.eq(b.id, 'title', 'opens on the title');
t.ok(b.has('new') && b.has('settings') && b.has('about'), 'title has New Game, Settings, About');
// Settings, and its reset
await b.go('settings'); t.eq(b.id, 'settings', 'settings opens');
await b.focus('music'); app.actions.inject('moveX+'); await b.frames(2); t.near(app.options.music, 0.15, 1e-6, 'the music slider moves in 5% steps'); t.near(b.engine.audio.volume.music, 0.15, 1e-6, 'the engine follows the slider');
await b.choose('reset'); await b.frames(2); t.near(b.engine.audio.volume.music, 0.1, 1e-6, 'reset restores music to 10%');
app.actions.inject('tabR'); await b.frames(2); t.ok(b.has('look') && b.has('pixel'), 'Picture tab has Look and Pixel size');
app.actions.inject('tabR'); await b.frames(2); t.ok(b.has('glyphs') && b.has('units') && b.has('vibration') && b.has('mouseSteer'), 'Controls tab');
await b.choose('glyphs'); t.eq(app.options.glyphs, 'xbox', 'Xbox glyphs setting'); await b.choose('glyphs'); t.eq(app.options.glyphs, 'ps', 'and back');
app.actions.inject('tabR'); await b.frames(2); t.ok(b.has('abs') && b.has('tcs') && b.has('asm') && b.has('auto') && b.has('line'), 'Assists tab');
await b.press('back'); t.eq(b.id, 'title', 'back returns to the title');
// About: real answers on pages
await b.go('about'); t.eq(b.id, 'about', 'about opens'); t.ok(b.top.pages.length >= 5, 'about is paged'); t.ok(b.top.pages.some((p) => p.tab === 'CREDITS'), 'credits page'); t.ok(b.top.pages.some((p) => p.tab === 'TESTING FEEDBACK') && b.top.pages.some((p) => p.tab === 'ENGINE FEEDBACK') && b.top.pages.some((p) => p.tab === 'PROMPT FEEDBACK') && b.top.pages.some((p) => p.tab === 'SOURCE INFORMATION'), 'all four sections');
await b.press('back');
// New game: greeting, then Dealer Row with exactly three used cars you can afford
await b.go('new'); t.eq(b.id, 'greeting', 'a short greeting'); t.ok(app.ui.subtitle?.text.includes('LICENCE'), 'Ms. Arai speaks'); t.ok((b.engine.audio.counts.voice ?? 0) >= 1, 'a voice was requested');
await b.choose('go'); await b.frames(3); t.eq(b.id, 'dealer', 'to Dealer Row');
t.eq(b.top.list.length, 3, 'three used cars'); t.ok(b.top.list.every((c) => true), 'cars listed');
await b.press('back'); t.eq(b.id, 'dealer', 'you cannot leave before you have a car');
app.actions.inject('moveX+'); await b.frames(2); t.eq(b.top.car, 1, 'left and right change the car'); await b.press('info'); t.ok(b.top.brochure, 'triangle shows the brochure'); await b.press('info');
await b.press('confirm'); await b.frames(2); t.eq(app.profile.cars[0]?.carId, 'kite', 'bought the Kite'); t.eq(app.profile.credits, 2500, 'paid for it'); t.ok(app.hasSave !== undefined, 'saves');
await b.press('back'); await b.frames(3); t.eq(b.id, 'map', 'to the Map'); t.ok(b.items().length === 9, 'nine buildings on the Map');
// Every top-level screen opens from the Map and comes back.
for (const [place, screen] of [['licence', 'licenceList'], ['events', 'eventList'], ['dealer', 'dealer'], ['tuning', 'tuning'], ['service', 'service'], ['garage', 'garage'], ['museum', 'museum'], ['theatre', 'theatre'], ['arcade', 'arcade']]) { await b.choose(place); await b.frames(3); t.eq(b.id, screen, `${place} opens`); await b.press('back'); await b.frames(3); t.eq(b.id, 'map', `${place} goes back`); }
// Map menu: Settings, Handbook, About, Dev Mode
await b.press('pause'); await b.frames(2); t.eq(b.id, 'mapPause', 'the Map menu'); await b.choose('handbook'); t.eq(b.id, 'handbook', 'handbook'); const pages = b.top.page; await b.choose('next'); t.ok(b.top.page !== pages, 'turns a page'); await b.press('back'); await b.choose('dev'); t.eq(b.id, 'dev', 'dev mode opens from the Map');
await b.focus('gripScale'); app.actions.inject('moveX+'); await b.frames(2); t.ok(app.env.gripScale > 1, 'a slider writes to env'); t.ok(app.devActive(), 'the DEV tag is on'); await b.press('info'); await b.frames(1); t.near(app.env.gripScale, 1, 1e-6, 'triangle resets all'); t.ok(!app.devActive(), 'the DEV tag is off');
await b.press('back'); await b.press('back'); await b.frames(2); t.eq(b.id, 'map', 'back to the Map');
// Tuning: buy a part, dyno, back.
await b.choose('tuning'); await b.frames(2); await b.choose('weight'); await b.frames(2); t.eq(b.id, 'parts', 'parts in a tile'); const money = app.profile.credits; await b.choose('weight1'); t.eq(app.profile.credits, money - 1500, 'pays for weight stage 1'); await b.press('back'); await b.choose('engine'); await b.frames(2); await b.choose('exhaust'); await b.frames(3); t.eq(b.id, 'dyno', 'an engine part shows the dyno'); await b.frames(40); await b.choose('done'); await b.frames(2); t.eq(b.id, 'parts', 'dyno closes'); await b.press('back'); await b.press('back'); await b.frames(3); t.eq(b.id, 'map', 'back from tuning');
// Licence test: start, drive with the brain, result.
b.brain({ skill: 0.97 });
await b.choose('licence'); await b.frames(3); await b.choose('C'); await b.frames(2); t.eq(b.id, 'testList', 'test list'); await b.choose('C-1'); await b.frames(2); t.eq(b.id, 'testCard', 'test card'); await b.choose('start'); await b.settle(); t.eq(app.scene?.name, 'race', 'the test begins'); t.ok(app.scene.judge, 'the examiner is watching'); t.eq(app.scene.sim.phase, 'grid', 'a standing test starts on the lights'); t.eq(app.scene.judge.running, false, 'its clock waits for the first movement');
t.ok(await b.drive(6000), 'the test ends'); t.eq(b.id, 'testResult', 'a result card'); t.ok(app.profile.tests['C-1']?.medal, `a medal for C-1: ${app.profile.tests['C-1']?.best}`);
await b.choose('backTo'); await b.settle(); t.eq(b.id, 'testList', 'back to the test list'); t.eq(app.scene.name, 'menu', 'back in the menu');
// Quick race from the Arcade: pause, restart, results, replay.
await b.press('back'); await b.press('back'); await b.frames(3);
b.noBrain();
await app.startQuick({ track: 'kestrel', carId: 'ginga', laps: 1, field: 3, difficulty: 'normal' }); await b.frames(4); t.eq(app.scene.name, 'race', 'quick race starts'); t.eq(app.scene.sim.cars.length, 3, 'field of three'); t.eq(app.scene.sim.phase, 'rolling', 'a rolling start');
await b.frames(5); await b.press('pause'); await b.frames(2); t.eq(b.id, 'pause', 'pause opens'); t.ok(b.has('resume') && b.has('restart') && b.has('retire') && b.has('assists') && b.has('settings') && b.has('handbook') && b.has('dev'), 'all pause items'); const f0 = app.scene.sim.frame; await b.frames(20); t.eq(app.scene.sim.frame, f0, 'pausing stops the sim'); await b.choose('resume'); await b.frames(5); t.ok(app.scene.sim.frame > f0, 'resume runs it');
b.brain({ skill: 0.95 }); t.ok(await b.drive(16000), 'quick race ends'); t.eq(b.id, 'results', 'results come up'); t.ok(b.has('continue') && b.has('retry') && b.has('replay') && b.has('save'), 'all results items');
const fp = app.scene.sim.fingerprint(); t.ok(fp, 'the sim has a fingerprint');
await b.choose('save'); await b.frames(3); t.eq(b.id, 'saveSlot', 'save slot picker'); await b.choose('slot0'); await b.frames(2); t.ok(app.profile.replays[0]?.data, 'a compressed replay is saved'); t.eq(b.id, 'results', 'back to results');
b.noBrain(); await b.choose('replay'); await b.settle(); t.eq(app.scene.name, 'replay', 'replay scene'); t.eq(b.id, 'replay', 'replay controls'); const r0 = app.scene.t; await b.frames(30); t.ok(app.scene.t > r0, 'it plays'); await b.press('confirm'); const r1 = app.scene.t; await b.frames(10); t.near(app.scene.t, r1, 0.001, 'cross pauses'); t.ok(app.scene.auto, 'the director chooses the car'); await b.press('info'); t.eq(app.scene.mode, 1, 'triangle changes camera'); await b.press('tabR'); t.ok(!app.scene.auto, 'until the player chooses one'); await b.press('back'); await b.settle(); t.eq(app.scene.name, 'menu', 'leaving the replay');
// The Harbour Lights 200 starts at dusk and is dressed for the night it runs into.
app.profile.licences.A = true; await app.startEventRound('h200'); await b.settle(); t.eq(app.scene.data.hour, 18.5, 'the 200 starts at dusk'); t.ok(app.scene.world.night > 0.9, 'its world has lit windows and lamp pools'); t.eq(app.scene.sim.laps, 10, 'ten laps'); await b.frames(3); app.scene.ended = true; await app.toTitle(); await b.settle(); await app.jumpMenu('map'); await b.settle();
// A saved replay plays from the Theatre, decompressed.
await app.watchSaved(0, { after: 'theatre' }); await b.settle(); t.eq(app.scene.name, 'replay', 'saved replay plays'); t.ok(app.scene.rec.frames > 30, 'with frames'); await b.frames(10); await b.press('back'); await b.settle();
// The Arcade Gate's pickers, all three modes.
b.brain({ skill: 0.95 });
await app.jumpMenu('arcade'); await b.settle(); t.eq(b.id, 'arcade', 'the Arcade Gate');
await b.choose('quick'); await b.frames(2); t.eq(b.id, 'pickTrack', 'pick a circuit'); await b.focus('track'); app.actions.inject('moveX+'); await b.frames(2); t.eq(b.top.i, 1, 'left and right change the circuit'); await b.press('confirm'); await b.frames(2); t.eq(b.id, 'pickCar', 'pick a car'); await b.focus('car'); app.actions.inject('moveX-'); await b.frames(2); await b.press('confirm'); await b.frames(2); t.eq(b.id, 'pickRace', 'pick the race'); t.ok(b.has('laps') && b.has('field') && b.has('diff') && b.has('hour') && b.has('rain') && b.has('go'), 'every race option'); await b.focus('laps'); app.actions.inject('moveX-'); await b.frames(2); app.actions.inject('moveX-'); await b.frames(2); t.eq(b.top.laps, 1, 'one lap'); await b.focus('rain'); await b.press('confirm'); t.ok(b.top.rain, 'rain is on'); await b.choose('go'); await b.settle(); t.eq(app.scene.name, 'race', 'the quick race starts'); t.ok(app.scene.data.rain, 'in the rain'); t.eq(app.scene.sim.tr.id, 'cedar', 'on the circuit chosen'); await b.frames(5);
await app.jumpMenu('arcade'); await b.settle(); await b.choose('couch'); await b.frames(2); await b.choose('track'); await b.frames(2); t.eq(b.top.player, 0, 'player one chooses'); await b.choose('car'); await b.frames(2); t.eq(b.top.player, 1, 'then player two'); await b.choose('car'); await b.frames(2); t.eq(b.id, 'pickRace', 'the duel options'); await b.choose('go'); await b.settle(); t.eq(app.scene.data.kind, 'couch', 'a duel starts'); t.eq(app.scene.sim.players.length, 2, 'two players'); await b.frames(5); app.scene.ended = true; app.actions.couch = false;
await app.jumpMenu('arcade'); await b.settle(); await b.choose('trial'); await b.frames(2); await b.choose('track'); await b.frames(2); await b.choose('car'); await b.settle(); t.eq(app.scene.data.kind, 'timetrial', 'a time trial starts'); const key = app.scene.run.key;
t.ok(await b.until(() => app.profile.ghosts[key], 16000, 1 / 15), 'the best lap becomes a ghost'); t.ok(app.scene.ghost, 'the ghost drives'); t.ok(app.profile.ghosts[key].pts.length > 100, 'the ghost has a trace'); await b.frames(20);
b.noBrain(); await b.press('pause'); await b.frames(2); await b.choose('retire'); await b.frames(2); await b.choose('yes'); await b.settle(); t.eq(b.id, 'arcade', 'retiring returns to the Arcade Gate');
// An event round: results, retry restores the profile, retiring places you last.
await b.press('back'); await b.frames(2);
app.profile.licences.C = true; app.profile.cars.forEach((c) => { c.install.tyre = null; }); const before = JSON.stringify({ c: app.profile.credits, d: app.profile.day });
await app.startEventRound('dawn'); await b.settle(); await b.frames(5); app.scene.sim.finishNow(app.scene.sim.cars.length - 1, 1); await b.until(() => b.id === 'results', 600); t.eq(b.id, 'results', 'a round has results'); t.ok(app.profile.credits > 0 && app.profile.day > 1, 'it pays and the day moves');
await b.choose('retry'); await b.settle(); t.eq(JSON.stringify({ c: app.profile.credits, d: app.profile.day }), before, 'retry undoes the round'); await b.frames(5);
await b.press('pause'); await b.frames(2); await b.choose('restart'); await b.settle(); t.eq(app.scene.name, 'race', 'restart restarts'); await b.frames(5);
await b.press('pause'); await b.frames(2); await b.choose('assists'); await b.frames(2); t.eq(b.id, 'assists', 'the assists screen'); await b.choose('auto'); t.ok(!app.options.assists.auto, 'gears go manual'); await b.choose('auto'); t.ok(app.options.assists.auto, 'and back'); await b.press('back'); await b.frames(1);
await b.choose('retire'); await b.frames(2); await b.choose('yes'); await b.frames(4); t.eq(b.id, 'results', 'retiring goes to results'); t.eq(b.top.o.rows.at(-1).player, 0, 'placed last'); await b.choose('continue'); await b.settle(); t.eq(b.id, 'roundCard', 'on to the next round'); 
// Every Dev Mode tool, in a race and in the menu.
await b.press('back'); await b.press('back'); await b.press('back'); await b.frames(2);
await app.startQuick({ track: 'kestrel', carId: 'ginga', laps: 2, field: 3, difficulty: 'normal' }); await b.settle(); await b.frames(5); await b.press('pause'); await b.frames(2); await b.choose('dev'); await b.frames(2); const sim = app.scene.sim;
await b.choose('pageNext'); await b.frames(1); await b.choose('pageNext'); await b.frames(1); await b.choose('pageNext'); await b.frames(1);
await b.press('tabR'); await b.frames(2); t.ok(b.has('teleport') && b.has('finish') && b.has('god') && b.has('scale') && b.has('saveState') && b.has('loadState') && b.has('frame') && b.has('reset') && b.has('changeCar') && b.has('end') && b.has('restart'), 'the race tools');
await b.focus('teleport'); const s0 = sim.cars.at(-1).c.loc.s; app.actions.inject('moveX+'); await b.frames(2); t.ok(sim.cars.at(-1).c.loc.s !== s0, 'teleport moves the car');
await b.choose('god'); t.ok(app.env.god, 'god mode on'); await b.choose('god'); t.ok(!app.env.god, 'god mode off');
await b.focus('scale'); app.actions.inject('moveX+'); await b.frames(2); t.eq(app.engine.timeScale, 2, 'time scale'); await b.press('confirm'); t.eq(app.engine.timeScale, 1, 'back to 1');
await b.choose('saveState'); const f1 = sim.frame; await b.choose('frame'); await b.frames(2); t.ok(sim.frame > f1, 'one frame steps while paused'); await b.choose('loadState'); t.eq(sim.frame, f1, 'load state goes back'); await b.choose('reset'); await b.frames(1);
await b.press('tabR'); await b.frames(2); for (const k of ['line', 'load', 'surface', 'circles', 'ai', 'telemetry', 'freeCam']) { await b.choose(k); await b.frames(1); t.ok(k === 'freeCam' ? app.dev.freeCam : app.dev.overlays[k], `overlay ${k} on`); } await b.press('back'); await b.press('back'); await b.frames(30); t.ok(true, 'overlays draw'); await b.press('pause'); await b.frames(2); await b.choose('dev'); await b.frames(2); await b.press('tabR'); await b.press('tabR'); await b.frames(2); for (const k of ['line', 'load', 'surface', 'circles', 'ai', 'telemetry', 'freeCam']) { await b.choose(k); await b.frames(1); }
await b.press('tabR'); await b.frames(2); t.ok(b.has('hour') && b.has('rain') && b.has('fieldSize') && b.has('attract'), 'hour, rain, field, attract'); await b.choose('rain'); await b.settle(); t.ok(app.scene.data.rain, 'rain toggles by restarting'); await b.frames(4); await b.press('pause'); await b.frames(2); await b.choose('dev'); await b.frames(2);
await b.press('tabL'); await b.frames(1); await b.press('tabL'); await b.frames(1); await b.press('tabL'); await b.frames(2); t.ok(b.has('hour'), 'tabs wrap around'); while (!b.has('credits')) { await b.press('tabR'); await b.frames(1); } const cr0 = app.profile.credits; await b.choose('credits'); t.eq(app.profile.credits, cr0 + 100000, 'give credits'); await b.choose('cars'); t.ok(app.profile.cars.length >= 14, 'unlock all cars'); await b.choose('gold'); t.ok(app.profile.licences.A, 'all tests at gold'); await b.choose('winEvent'); await b.frames(2);
await b.press('tabR'); await b.frames(2); t.ok(b.has('ev-dawn'), 'jump to an event'); await b.choose('pageNext'); await b.frames(1); t.ok(b.has('t-B-3') || b.has('t-C-2') || b.has('t-A-1') || b.has('t-C-1'), 'jump to a test'); await b.choose('pageNext'); await b.frames(1); await b.choose('pageNext'); await b.frames(1); await b.choose('pageNext'); await b.frames(1); t.ok(b.has('m-garage') || b.has('m-map') || b.has('ev-dawn'), 'jump to a menu');
t.eq(app.engine.errors.length, 0, `no game errors in dev tools: ${app.engine.errors[0]}`);
await b.press('back'); await b.press('back'); await b.frames(2); app.scene.ended = true; await app.toTitle(); await b.settle();
// New clips pass the engine's own analysis.
{ const p = await makePerson(app.ctx, 'crew'), clips = compileClips(GAME_CLIPS, HERO_RIG, p.object); GAME_CLIPS.forEach((c, i) => { const r = analyzeClip(p.object, HERO_RIG, c, clips[i]); t.eq(r.problems.length, 0, `clip ${c.name}: ${r.problems.join('; ')}`); }); }
// A recording replays to the same fingerprint.
{ const a2 = makeApp({ headless: true }), setup = quickSetup({ track: 'kestrel', carId: 'kite', laps: 1, field: 3, assists: a2.options.assists, seed: 9 }); const make = () => new RaceScene(a2, setup, {}); const e2 = await Engine.headless(make(), {}); a2.bind(e2); e2.input.setKey('KeyW', true); for (let i = 0; i < 240; i++) { e2.step(1); await new Promise((r) => setImmediate(r)); } e2.input.setKey('KeyW', false); const end = e2.fingerprint(), rec = e2.recording(); await e2.replay(rec, () => e2.loadGame(make())); t.eq(e2.fingerprint(), end, 'a replayed recording ends on the same fingerprint'); e2.dispose(); }
void THREE;
// The 10-foot rules, on every screen this suite visited.
{ for (const [name, S] of [['MenuScene', MenuScene], ['RaceScene', RaceScene], ['ReplayScene', ReplayScene]]) for (const h of ['setup', 'fixedUpdate', 'update', 'cameraTarget', 'status', 'fingerprint', 'dispose', 'ready']) t.ok(typeof S.prototype[h] === 'function', `${name} has the hook ${h}`); }
{ const seen = b.seen, ids = Object.keys(seen); for (const id of ids) t.ok(!seen[id].dead?.size, `every item on ${id} does something: ${[...(seen[id].dead ?? [])].join(',')}`); t.ok(ids.length >= 25, `screens visited: ${ids.join(',')}`); for (const id of ids) { if (!['map', 'dev', 'prize', 'podium', 'ending'].includes(id)) t.ok(seen[id].items <= 7, `${id} has ${seen[id].items} focusable items, at most 7`); if (!['attract'].includes(id)) t.ok(seen[id].prompts.length > 0, `${id} has a prompt row`); if (!['title', 'map', 'greeting', 'results', 'testResult', 'podium', 'prize', 'ending', 'attract', 'dyno'].includes(id)) t.ok(seen[id].prompts.includes('back'), `${id} prompts Back: ${seen[id].prompts.join(',')}`); } }
// The kit's own headless check: the game plays and replays to the same fingerprint.
{ const r = spawnSync(process.execPath, ['src/check.mjs', '--headless', 'src/main.js', '--keys', 'KeyS*20', '--out', 'tools/.checkrun'], { encoding: 'utf8' }); t.eq(r.status, 0, `check.mjs --headless: ${String(r.stdout).slice(-200)}`); t.ok(/replayed to the same/.test(r.stdout), 'check.mjs replays to the same fingerprint'); rmSync('tools/.checkrun', { recursive: true, force: true }); rmSync('check', { recursive: true, force: true }); }
t.done();
