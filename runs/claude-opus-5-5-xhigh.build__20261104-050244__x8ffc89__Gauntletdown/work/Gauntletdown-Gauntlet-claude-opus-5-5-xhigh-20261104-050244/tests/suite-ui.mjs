// The built single file in a real browser (headless Chromium), from file://: no errors, no network, the title draws,
// the attract mode on 10 s idle and out on a key, mouse hover and click on the class cards; a touch-only device.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { suite } from './lib.mjs';
import { bundle, NAME } from '../build.mjs';
export default async function () {
  const S = suite('ui');
  bundle();
  const url = pathToFileURL(resolve(new URL('../../' + NAME + '.html', import.meta.url).pathname)).href;
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    // ---- a computer with a keyboard and mouse ----
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = [], requests = [];
    page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('request', r => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) requests.push(r.url()); });
    await page.goto(url);
    await page.waitForFunction(() => window.My3D2dge && My3D2dge.current && My3D2dge.current.sceneName === 'title', null, { timeout: 20000 });
    const G = f => page.evaluate(f);
    await page.waitForTimeout(500);
    const lit = await G(() => { const c = document.getElementById('screen'), g = document.createElement('canvas'); g.width = 64; g.height = 36; const x = g.getContext('2d'); x.drawImage(c, 0, 0, 64, 36); const d = x.getImageData(0, 0, 64, 36).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 60) n++; return n; });
    S.check('the title draws', lit > 200, lit);
    S.check('the AI Hub client is first and dormant outside a session', await G(() => !!window.AIHub && window.AIHub.active === false && document.head.querySelector('script').textContent.startsWith('/*! aihub-session')));
    await page.waitForTimeout(10800);
    S.check('10 s idle starts the attract mode', await G(() => My3D2dge.current.sceneName === 'attract'));
    await page.waitForTimeout(3000);
    await page.keyboard.press('KeyX'); await page.waitForTimeout(900);
    S.check('a key returns to the title', await G(() => My3D2dge.current.sceneName === 'title'));
    await page.keyboard.press('Enter'); await page.waitForTimeout(400); await page.keyboard.press('Enter'); await page.waitForTimeout(900);
    S.check('Enter, Enter: class select', await G(() => My3D2dge.current.sceneName === 'select'));
    const box = await G(() => { const c = document.getElementById('screen').getBoundingClientRect(), s = My3D2dge.current.scene.cards[2], k = c.width / My3D2dge.current.W; return [c.left + (s[0] + s[2] / 2) * k, c.top + (s[1] + 30) * k]; });
    await page.mouse.move(box[0] - 30, box[1]); await page.mouse.move(box[0], box[1], { steps: 4 }); await page.waitForTimeout(300);
    S.check('the mouse over a class card moves the focus there', await G(() => My3D2dge.current.scene.cur[0].i === 2), await G(() => My3D2dge.current.scene.cur[0].i));
    await page.mouse.click(box[0], box[1]); await page.waitForTimeout(1500);
    S.check('a click picks it and the descent begins', await G(() => My3D2dge.current.sceneName === 'play' && My3D2dge.current.debug.world().heroes[0].cls === 'ranger'), await G(() => My3D2dge.current.sceneName));
    await page.keyboard.press('Enter'); await page.waitForTimeout(400); await page.keyboard.press('Enter'); await page.waitForTimeout(600);
    await page.mouse.move(700, 500, { steps: 3 }); await page.keyboard.down('KeyD'); await page.mouse.down(); await page.waitForTimeout(1500); await page.mouse.up(); await page.keyboard.up('KeyD');
    S.check('play: the mouse aims and fires, WASD moves', await G(() => { const h = My3D2dge.current.debug.world().heroes[0]; return h.x > 50 && h.cool !== undefined; }));
    await page.keyboard.press('Escape'); await page.waitForTimeout(500);
    S.check('Escape pauses with the menu', await G(() => My3D2dge.current.paused && !!document.querySelector('.esh-sh')));
    S.check('the pause menu has How to Play and Dev Tools', await G(() => [...document.querySelectorAll('.esh-sh button')].map(b => b.textContent).join('|')).then(t => /How to Play/i.test(t) && /Dev Tools/i.test(t)));
    S.check('no network requests from file://', requests.length === 0, requests);
    S.check('no page errors', errors.length === 0, errors.slice(0, 3));
    await page.close();
    // ---- a touch-only device ----
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const tp = await ctx.newPage(), terr = []; tp.on('pageerror', e => terr.push(String(e)));
    await tp.goto(url);
    await tp.waitForFunction(() => window.My3D2dge && My3D2dge.current && My3D2dge.current.sceneName === 'title', null, { timeout: 20000 });
    await tp.waitForTimeout(400);
    const touch = await tp.evaluate(() => ({ only: My3D2dge.current.debug.snapshot().touchOnly, fine: matchMedia('(any-pointer: fine)').matches, buttons: document.querySelectorAll('[data-sys=touch] button').length, corner: !!document.querySelector('[data-sys=corner], .e3-corner, button[aria-label*=enu]') }));
    S.check('touch-only: the notice shows', touch.only, touch);
    S.check('touch-only: no touch controls', touch.buttons === 0, touch);
    S.check('touch-only: the corner menu button stays', touch.corner, touch);
    const sb = await tp.evaluate(() => { const c = document.getElementById('screen').getBoundingClientRect(), b = My3D2dge.current.scene.settingsBtn, k = c.width / My3D2dge.current.W; return b && [c.left + (b[0] + b[2] / 2) * k, c.top + (b[1] + b[3] / 2) * k]; });
    if (sb) { await tp.touchscreen.tap(sb[0], sb[1]); await tp.waitForTimeout(500); }
    S.check('touch-only: SETTINGS opens the settings', await tp.evaluate(() => !!document.querySelector('.esh-sh') && My3D2dge.current.sceneName === 'title'));
    await tp.evaluate(() => My3D2dge.current.shell.hide()); await tp.waitForTimeout(10800);
    S.check('touch-only: the attract mode still runs', await tp.evaluate(() => My3D2dge.current.sceneName === 'attract'));
    S.check('touch-only: no page errors', terr.length === 0, terr.slice(0, 3));
    await ctx.close();
  } finally { await browser.close(); }
  return S;
}
