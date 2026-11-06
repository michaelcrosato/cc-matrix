import { launch, url } from './lib.mjs';
import { S, adv, press } from './drive.mjs';
import { mkdirSync } from 'node:fs';
mkdirSync('notes/shots', { recursive: true });
const which = process.argv.slice(2);
const b = await launch({ render: true }); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const logs = []; p.on('console', (m) => { if (['error'].includes(m.type()) || /lost/i.test(m.text())) logs.push(m.type() + ': ' + m.text().slice(0, 200)); }); p.on('pageerror', (e) => logs.push('PAGEERR ' + e.message.slice(0, 200)));
await p.goto(url('test=1&manual=1&audio=0')); await p.waitForFunction(() => window.__done || window.__err, null, { timeout: 120000 });
console.log('backend', await p.evaluate(() => JSON.stringify({ b: window.__gfx.backend, lost: window.__gfx.lost })));
const snap = async (name, secs = 0.5) => { await adv(p, secs); const e = await p.evaluate(() => window.__TEST__.render()); await p.evaluate(() => window.__TEST__.render()); await p.screenshot({ path: `notes/shots/${name}.png` }); const s = await S(p); console.log(name, s.screen, 'lost', s.render.lost, 'frames', s.render.frames, e ? 'RENDERERR ' + e.slice(0, 150) : ''); };
await adv(p, 2); await snap('title');
await press(p, 'ok'); await snap('menu', 0.3);
await p.evaluate(() => { const g = window.__TEST__.game; g.saveData.profiles[0] = { name: 'Gentle Margaret', paint: 0, hat: 0, day: 1, step: 0, doneToday: [], ages: [60], medals: {}, bestTier: {}, met: [], marbles: 3, floor: 0, minutes: 0, levelled: false, calendar: [], asked: [], checkedIn: true }; g.selectProfile(0); g.go('island', { fresh: true }); }); await snap('island', 1.5);
await p.evaluate(() => { const g = window.__TEST__.game; g.killScripts(); g.endSpeech(); g.busy = false; g.go('plan'); }); await snap('plan', 0.3);
for (const id of (which.length ? which : ['fruitHat', 'poses', 'cairn', 'logReps', 'stepClass', 'plates', 'roomService', 'springboard', 'raft', 'grandHold'])) {
  await p.evaluate((i) => { const g = window.__TEST__.game; g.killScripts(); g.endSpeech(); g.busy = false; g.startEvent(i, { programme: true, tier: 0 }); }, id); await adv(p, 1); await snap(id + '-intro', 0.4);
  await p.evaluate(() => window.__TEST__.bot('sharp')); await press(p, 'ok'); await adv(p, 0.3); await p.evaluate(() => window.__TEST__.bot('sharp')); await snap(id + '-play', 12);
}
console.log(logs.slice(0, 12).join('\n')); await b.close();
