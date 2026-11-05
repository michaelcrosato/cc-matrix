import { chromium } from 'playwright'; import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const file = '../TideCrisis3-TimeCrisis3-claude-sonnet-5-5-medium-20261103-183303.html';
const steps = JSON.parse(process.argv[2] || '[]'); const size = (process.argv[3] || '1280x720').split('x').map(Number);
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: size[0], height: size[1] } });
const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e))); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
await p.goto(pathToFileURL(resolve(file)).href); await p.waitForTimeout(2500);
for (const s of steps) { if (s.js) await p.evaluate(s.js); if (s.wait) await p.waitForTimeout(s.wait); if (s.key) await p.keyboard.press(s.key); if (s.shot) await p.screenshot({ path: '.tmp/' + s.shot + '.png' }); }
console.log(errs.slice(0, 8).join('\n') || 'no errors'); await b.close();
