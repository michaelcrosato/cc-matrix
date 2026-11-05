// screenshots of deep links: node tests/scratch/shots.mjs '#menu' '#lodge' ... (waits per arg: name@ms)
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const url = pathToFileURL(resolve('../BigBuckHuntOff-BigBuckHunterPro-claude-opus-5-5-xhigh-20261104-050516.html')).href;
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
for (const a of process.argv.slice(2)) {
  const [h, ms] = a.split('@'), p = await b.newPage({ viewport: { width: 1280, height: 720 } }), errs = [];
  p.on('pageerror', e => errs.push(String(e.message || e)));
  await p.goto(url + h); await p.waitForTimeout(Number(ms) || 4000);
  await p.screenshot({ path: 'tests/out/s-' + h.slice(1).replace(/\//g, '-') + '.png' }); if (errs.length) console.log(h, errs.join(' | '));
  await p.close();
}
await b.close();
