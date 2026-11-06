import { launch, url } from './lib.mjs';
import { S, adv, press, untilScreen, playEvent } from './drive.mjs';
const b = await launch({}); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const logs = []; p.on('pageerror', (e) => logs.push('PAGEERR ' + e.message + (e.stack || '').slice(0, 300))); p.on('console', (m) => { if (m.type() === 'error') logs.push('E: ' + m.text().slice(0, 200)); });
await p.goto(url('test=1&render=0&manual=1')); await p.waitForFunction(() => window.__done);
await adv(p, 2); await press(p, 'ok'); await adv(p, 0.3); await press(p, 'ok'); await adv(p, 0.3); // menu -> programme -> profiles
console.log((await S(p)).screen);
await press(p, 'ok'); await adv(p, 0.3); console.log('create', (await S(p)).screen); // empty mat -> create
await press(p, 'down'); await press(p, 'down'); await press(p, 'ok'); await adv(p, 1.5); console.log('after accept', (await S(p)).screen);
await adv(p, 4); let s = await S(p); console.log('morning', s.screen, s.speech);
for (let i = 0; i < 160; i++) { s = await S(p); if (s.screen === 'play') { await p.evaluate(() => window.__TEST__.bot('sharp')); await adv(p, 3); continue; } if (s.screen !== 'reveal') await press(p, 'ok'); await adv(p, 1); if (i % 10 === 0) console.log(i, s.screen, s.event && s.event.id + ':' + s.event.phase, s.wobbleAge, (s.speech || '').slice(0, 40)); if (s.screen === 'plan') break; }
s = await S(p); console.log('state', s.screen, s.event && s.event.id, s.wobbleAge, s.day, JSON.stringify(s.errors));
console.log(logs.join('\n')); await b.close();
