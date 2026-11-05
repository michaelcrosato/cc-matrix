import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const file = resolve(process.argv[2]);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; page.on('pageerror', e => errs.push(String(e.stack || e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(pathToFileURL(file).href); await page.waitForTimeout(1800);
const ev = js => page.evaluate(js), G = 'My3D2dge.current';
await ev(`${G}.debug.startMatch({mode:'quick',overs:2,wickets:3,diff:0,opp:'witt',ground:'green',chaos:'none',seed:21})`);
// bat: swing at the ball with good timing
let shots = 0;
for (let i = 0; i < 700 && shots < 3; i++) {
  await page.waitForTimeout(16);
  const s = JSON.parse(await ev(`(()=>{const M=${G}.debug.match();if(!M)return JSON.stringify({ph:'none'});return JSON.stringify({ph:M.ph,y:M.ball.y,vy:M.ball.vy,t:M.t,swing:!!M.swing})})()`));
  if (s.ph === 'flight' && !s.swing) {
    const tl = (s.y - 364) / Math.max(40, Math.abs(s.vy));
    if (tl < .55 && !s.shownRing) { await page.screenshot({ path: `shots/b-ring${shots}.png` }); }
    if (tl < .115 && tl > 0) { await page.keyboard.down('ArrowDown'); await page.keyboard.press(shots % 2 ? 'KeyK' : 'KeyJ'); await page.keyboard.up('ArrowDown'); await page.waitForTimeout(350); await page.screenshot({ path: `shots/b-hit${shots}.png` }); await page.waitForTimeout(700); await page.screenshot({ path: `shots/b-play${shots}.png` }); shots++; }
  }
}
await page.keyboard.press('Escape'); await page.waitForTimeout(600); await page.screenshot({ path: 'shots/b-pause.png' });
console.log(errs.length ? errs.slice(0, 4).join('\n') : 'no errors', shots);
await browser.close();
