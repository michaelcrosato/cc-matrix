import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const file = resolve(process.argv[2]);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; page.on('pageerror', e => errs.push(String(e.stack || e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(pathToFileURL(file).href); await page.waitForTimeout(2000);
const ev = js => page.evaluate(js);
await ev(`My3D2dge.current.debug.startMatch({mode:'attract',attract:true,overs:2,wickets:3,opp:'mega',ground:'dome',seed:11})`);
let n = 0;
for (let i = 0; i < 40 && n < 8; i++) {
  await page.waitForTimeout(700);
  const s = JSON.parse(await ev(`JSON.stringify(My3D2dge.current.debug.snapshot())`));
  const ph = s.m && s.m.ph, lastk = s.m && s.m.last && s.m.last.text;
  if (ph === 'inplay' || (ph === 'between' && /SIX|FOUR|BOWLED|CAUGHT/.test(lastk || ''))) { await page.screenshot({ path: `shots/a${n++}-${ph}.png` }); }
}
console.log(errs.length ? errs.slice(0, 4).join('\n') : 'no errors', n);
await browser.close();
