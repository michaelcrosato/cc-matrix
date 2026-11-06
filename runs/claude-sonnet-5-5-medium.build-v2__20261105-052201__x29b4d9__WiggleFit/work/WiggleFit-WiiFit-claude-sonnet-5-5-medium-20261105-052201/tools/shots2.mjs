import { launch, url } from './lib.mjs';
import { S, adv, press } from './drive.mjs';
const b = await launch({ render: true }); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const logs = []; p.on('pageerror', (e) => logs.push('PAGEERR ' + e.message.slice(0, 200)));
await p.goto(url('test=1&manual=1&audio=0')); await p.waitForFunction(() => window.__done, null, { timeout: 120000 });
const snap = async (n, s = 0.5) => { await adv(p, s); await p.evaluate(() => window.__TEST__.render()); await p.evaluate(() => window.__TEST__.render()); await p.screenshot({ path: `notes/shots/${n}.png` }); const st = await S(p); console.log(n, st.screen, st.render.lost, st.errors.length); };
await p.evaluate(() => { const g = window.__TEST__.game; g.saveData.profiles[0] = { name: 'Gentle Margaret', paint: 0, hat: 0, day: 2, step: 3, doneToday: [], ages: [70, 55], medals: { poses: 2, fruitHat: 3 }, bestTier: {}, met: ['poses', 'fruitHat'], marbles: 20, marbleList: [1, 2, 3, 1, 2, 2, 3, 4, 1, 2], floor: 5, minutes: 12, levelled: false, calendar: [1], asked: [], checkedIn: true }; g.selectProfile(0); g.killScripts(); });
await adv(p, 2);
await p.evaluate(() => window.__TEST__.game.go('reveal', { age: 52, prev: 70, mean: 0.6 })); await snap('reveal', 3.5);
await p.evaluate(() => window.__TEST__.game.go('jar', { n: 12, next: () => {}, medal: 2 })); await snap('jar', 2.5);
await p.evaluate(() => { const g = window.__TEST__.game; g.go('island'); g.killScripts(); g.endSpeech(); g.busy = false; g.startEvent('fruitHat', { programme: true, tier: 0 }); }); await adv(p, 1.5); await press(p, 'ok'); await p.evaluate(() => window.__TEST__.bot('sharp')); await adv(p, 8);
await p.evaluate(() => { const g = window.__TEST__.game; g.ev.lanes[0].form = 88; g.ev.finish(); }); await adv(p, 3); await snap('results', 0.5);
await p.evaluate(() => { const g = window.__TEST__.game; g.disposeEvent(); g.showHud(false); g.go('group'); g.screens.group.nav('ok', { dev: 'pad', pad: 0 }); g.screens.group.nav('ok', { dev: 'pad', pad: 1 }); g.screens.group.nav('ok', { dev: 'pad', pad: 2 }); g.screens.group.nav('ok', { dev: 'pad', pad: 3 }); }); await snap('group-lobby', 0.3);
await p.evaluate(() => { const g = window.__TEST__.game; g.group = { players: g.screens.group.players.map((q) => ({ ...q, points: 0 })), list: ['springboard'], i: 0 }; g.eventOpts = { id: 'poses', group: true, tier: 0, lanes: g.group.players.map((q) => ({ kind: 'bot', skill: 'sharp', name: q.name, paint: q.paint, colorIdx: q.colorIdx })) }; g.go('intro', g.eventOpts); }); await adv(p, 1); await press(p, 'ok'); await adv(p, 12); await snap('group-play', 0.3);
await p.evaluate(() => { const g = window.__TEST__.game; g.disposeEvent(); g.showHud(false); g.group = { players: [{ name: 'A', paint: 0, colorIdx: 0, points: 9 }, { name: 'B', paint: 1, colorIdx: 1, points: 7 }, { name: 'C', paint: 2, colorIdx: 2, points: 5 }, { name: 'D', paint: 3, colorIdx: 3, points: 3 }] }; g.go('podium'); }); await snap('podium', 1);
await p.evaluate(() => { const g = window.__TEST__.game; g.go('pause'); g.go('dev', { page: 0 }); }); await snap('dev', 0.3);
await p.evaluate(() => { const g = window.__TEST__.game; g.go('dev', { page: 8 }); }); await snap('dev-sliders', 0.3);
await p.evaluate(() => { const g = window.__TEST__.game; g.go('about'); }); await snap('about', 0.3);
await p.evaluate(() => { const g = window.__TEST__.game; g.go('journal'); g.screens.journal.p = 1; g.screens.journal.draw(); }); await snap('journal', 0.3);
await p.evaluate(() => { const g = window.__TEST__.game; g.go('mirror'); }); await snap('mirror', 0.5);
for (const id of ['tug', 'plank']) { await p.evaluate((i) => { const g = window.__TEST__.game; g.killScripts(); g.endSpeech(); g.go('island'); g.startEvent(i, { programme: true, tier: 0 }); }, id); await adv(p, 1.2); await press(p, 'ok'); await p.evaluate(() => window.__TEST__.bot('sharp')); await adv(p, 0.3); await p.evaluate(() => window.__TEST__.bot('sharp')); await snap(id + '-play', 14); }
await p.evaluate(() => { const g = window.__TEST__.game; g.killScripts(); g.endSpeech(); g.busy = false; g.disposeEvent(); g.go('island'); g.run(function* () { yield* g.checkIn(); }); });
for (let i = 0; i < 30; i++) { await adv(p, 1); await p.evaluate(() => window.__TEST__.game.endSpeech()); if ((await S(p)).event && (await S(p)).event.id === 'checkin' && (await S(p)).event.phase === 'countdown') break; }
await p.evaluate(() => window.__TEST__.bot('sharp')); await snap('checkin-play', 6);
console.log(logs.join('\n')); await b.close();
