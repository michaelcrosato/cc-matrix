// Browser checks on the bundle (file://, Playwright headless Chromium): the title draws; 10.5 s idle starts attract and
// a key returns; keyboard: Enter, CAREER, the tutorial via the menus, W held moves the train; mouse hover moves the menu
// focus and a click picks; touch emulation shows the notice and attract still runs; no page errors.
import { createRequire } from 'node:module';
const require = createRequire(new URL('../engine/package.json', import.meta.url));
const { chromium } = require('playwright');
const NAME = 'DenshaDeHalo-DenshaDeGo-claude-opus-5-5-medium-20261104-050235';
const url = new URL('../../' + NAME + '.html', import.meta.url).href;
let fails = 0; const check = (w, ok, d = '') => { if (!ok) { fails++; console.log('FAIL browser: ' + w + (d ? ' (' + d + ')' : '')); } };
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const snap = p => p.evaluate(() => window.__dh.snapshot());
{
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(url); await p.waitForTimeout(1500);
  check('the title is drawn', (await snap(p)).scene === 'title');
  await p.waitForTimeout(10500); check('10.5 s idle starts attract', (await snap(p)).scene === 'attract', (await snap(p)).scene);
  await p.keyboard.press('KeyA'); await p.waitForTimeout(1200); check('a key returns to the title', (await snap(p)).scene === 'title');
  await p.keyboard.press('Enter'); await p.waitForTimeout(900); check('Enter opens CAREER', (await snap(p)).scene === 'halomap');
  await p.keyboard.press('Enter'); await p.waitForTimeout(900); await p.keyboard.press('Escape'); await p.waitForTimeout(400); await p.keyboard.press('Enter'); await p.waitForTimeout(1200);
  check('the tutorial starts from the menus', (await snap(p)).scene === 'drive', (await snap(p)).scene);
  await p.keyboard.down('KeyW'); await p.waitForTimeout(3000); await p.keyboard.up('KeyW'); await p.waitForTimeout(500);
  check('holding W moves the train', (await snap(p)).v > 0, JSON.stringify(await snap(p)).slice(0, 120));
  check('no page errors', !errs.length, errs.join(' | '));
  await p.close();
}
{
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); await p.goto(url); await p.waitForTimeout(1500);
  const i0 = await p.evaluate(() => window.__dh.DH.scenes.title.list.i);
  const r = await p.evaluate(() => { const q = window.__dh.DH.scenes.title.list.rects[2]; const c = document.getElementById('screen').getBoundingClientRect(), g = window.__dh.game; return [c.left + (q[0] + q[2] / 2) * c.width / g.W, c.top + (q[1] + q[3] / 2) * c.height / g.H]; });
  await p.mouse.move(r[0] - 5, r[1]); await p.mouse.move(r[0], r[1]); await p.waitForTimeout(300);
  check('mouse hover moves the focus', (await p.evaluate(() => window.__dh.DH.scenes.title.list.i)) === 2, i0);
  await p.mouse.click(r[0], r[1]); await p.waitForTimeout(900); check('a click picks', (await snap(p)).scene === 'duelLobby', (await snap(p)).scene);
  await p.close();
}
{
  const ctx = await b.newContext({ viewport: { width: 400, height: 800 }, hasTouch: true, isMobile: true }); const p = await ctx.newPage();
  await p.goto(url); await p.waitForTimeout(1500);
  check('touch-only shows the notice', await p.evaluate(() => window.__dh.DH.touchOnly));
  await p.waitForTimeout(10500); check('touch-only: attract still runs', (await snap(p)).scene === 'attract');
  await ctx.close();
}
await b.close();
console.log(fails ? fails + ' browser check(s) failed' : 'browser: all passed');
process.exit(fails ? 1 : 0);
