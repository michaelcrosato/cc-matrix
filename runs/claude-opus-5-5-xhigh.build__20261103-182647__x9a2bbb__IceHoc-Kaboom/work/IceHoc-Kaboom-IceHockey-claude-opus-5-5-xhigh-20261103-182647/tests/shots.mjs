// Screenshots for what scripts can't judge (18.7): node tests/shots.mjs [name...] [--size WxH]
import { chromium } from 'playwright';
const args = process.argv.slice(2), sizeI = args.indexOf('--size'), size = sizeI >= 0 ? args.splice(sizeI, 2)[1] : '1280x720', [w, h] = size.split('x').map(Number);
const S = {
  title: ['', 3, null], menu: ['', 3, "__game.game.input.tap('confirm')"], storymap: ['story/1', 2.5, null], cutscene: ['cutscene/ch1-pre', 4, null], cut2: ['cutscene/ch2-pre', 4, null], cut3: ['cutscene/ch3-pre', 4, null], cut4: ['cutscene/ch4-pre', 4, null], cut5: ['cutscene/ch5-pre', 4, null], ending: ['cutscene/ch5-post', 6, null],
  results: ['results', 7, null], practice: ['practice', 2, "__game.game.go('practice')"], drill: ['practice/1', 3, "__game.game.go('match', { cfg: __game.Drills.cfg(1) })"], setup: ['setup', 2, null], sides: ['sides', 2, null], records: ['records', 2, null], about: ['about', 2, null],
  credits: ['credits', 5, null], flood: ['flood', 4, null], lab: ['lab', 3, null], attract: ['attract', 6, null], fight: ['fight', 5, null], kaboom: ['kaboom', 6, null], shootout: ['shootout', 6, null],
  pond: ['match/lumberjacks/muskrats/pond', 6, null], grind: ['match/bruisers/muskrats/grindhouse', 6, null], mall: ['match/marauders/muskrats/mall', 6, null], dome: ['match/grizzlies/muskrats/dome', 6, null], dev: ['dev', 4, null]
};
const names = args.length ? args : Object.keys(S);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
for (const n of names) {
  const [hash, secs, js] = S[n]; const page = await browser.newPage({ viewport: { width: w, height: h } }); const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + new URL('../build/dev.html', import.meta.url).pathname + (hash ? '#' + hash : '')); await page.waitForTimeout(secs * 1000);
  if (js) { await page.evaluate(js); await page.waitForTimeout(2500); }
  await page.screenshot({ path: 'shots/' + n + '-' + size + '.png' });
  const e2 = await page.evaluate(() => __game.game.errors.map(e => String(e.message || e)).slice(0, 3)); console.log(n, errs.concat(e2).join(' | ') || 'ok'); await page.close();
}
await browser.close();
