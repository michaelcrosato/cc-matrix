// Screenshots of the bundle in headless Chromium: node tools/shot.mjs <name> [steps...]
// steps: wait:ms  key:Code  down:Code  up:Code  eval:js  shot:name  size:WxH
import { chromium } from 'playwright';
import { OUT } from './bundle.mjs';
const args = process.argv.slice(2);
const sz = (args.find(a => a.startsWith('size:')) || 'size:1280x720').slice(5).split('x').map(Number);
const browser = await chromium.launch({ args: process.env.GPUFLAGS ? process.env.GPUFLAGS.split(' ') : [] });
const page = await browser.newPage({ viewport: { width: sz[0], height: sz[1] } });
const errs = []; page.on('pageerror', e => errs.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text().slice(0, 300)); });
const t0 = Date.now();
await page.goto(OUT.href + (process.env.Q || ''));
for (const a of args) {
  const [k, ...rest] = a.split(':'), v = rest.join(':');
  if (k === 'wait') await page.waitForTimeout(+v);
  else if (k === 'key') await page.keyboard.press(v);
  else if (k === 'down') await page.keyboard.down(v);
  else if (k === 'up') await page.keyboard.up(v);
  else if (k === 'eval') console.log('eval:', JSON.stringify(await page.evaluate(v)).slice(0, 2000));
  else if (k === 'shot') { await page.screenshot({ path: 'tests/out/' + v + '.png' }); console.log('shot', v, ((Date.now() - t0) / 1000).toFixed(1) + 's'); }
}
console.log(errs.slice(0, 20).join('\n'));
await browser.close();
