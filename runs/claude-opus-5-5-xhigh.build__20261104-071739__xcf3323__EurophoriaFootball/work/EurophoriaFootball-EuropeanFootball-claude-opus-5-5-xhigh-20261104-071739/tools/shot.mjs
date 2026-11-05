// Screenshots of the game in given states: node tools/shot.mjs <out.png> "<hash>" [step ...]
// steps: wait:ms | eval:js | key:Code | hold:Code:ms | size:WxH | page:dev  (page:dev uses build/index.html)
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const [out, hash = '', ...steps] = process.argv.slice(2);
const sz = (steps.find(s => s.startsWith('size:')) || 'size:1280x720').slice(5).split('x').map(Number);
const dev = steps.includes('page:dev');
const file = dev ? resolve('build/index.html') : resolve('../EurophoriaFootball-EuropeanFootball-claude-opus-5-5-xhigh-20261104-071739.html');
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: sz[0], height: sz[1] } });
const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(pathToFileURL(file).href + (hash.startsWith('#') || hash.startsWith('?') ? hash : ''));
await page.waitForTimeout(1200);
for (const s of steps) {
  const [k, ...rest] = s.split(':'), v = rest.join(':');
  if (k === 'wait') await page.waitForTimeout(+v);
  else if (k === 'eval') { const r = await page.evaluate('void (' + v + ')'); void r; }
  else if (k === 'key') await page.keyboard.press(v);
  else if (k === 'hold') { const [code, ms] = v.split(':'); await page.keyboard.down(code); await page.waitForTimeout(+ms); await page.keyboard.up(code); }
  else if (k === 'shot') await page.screenshot({ path: v });
}
await page.screenshot({ path: out });
const snap = await page.evaluate(() => { try { return My3D2dge.current.debug.snapshot(); } catch (e) { return String(e); } });
console.log(JSON.stringify(snap).slice(0, 400));
console.log(errs.length ? 'ERRORS ' + errs.slice(0, 5).join(' | ') : 'no errors');
await browser.close();
