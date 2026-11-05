// A few things only a real browser can show: the pause menu lists Dev Mode, mouse hover/click, touch-only gate, no console errors.
import { chromium } from 'playwright';
import { resolve, basename, dirname } from 'node:path'; import { pathToFileURL, fileURLToPath } from 'node:url';
const DEV = resolve(dirname(fileURLToPath(import.meta.url)), '../..'), file = resolve(DEV, '..', basename(DEV) + '.html');
export default async function (check) {
  const br = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const p = await br.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
    p.on('pageerror', e => errs.push(String(e.stack || e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(pathToFileURL(file).href); await p.waitForTimeout(700);
    check('page boots the title scene', await p.evaluate(() => My3D2dge.current.sceneName) === 'title');
    await p.keyboard.press('Enter'); await p.waitForTimeout(500);
    check('Enter reaches the menu', await p.evaluate(() => My3D2dge.current.sceneName) === 'menu');
    // mouse hover moves focus; click picks
    await p.mouse.move(150, 355); await p.waitForTimeout(300);
    const i = await p.evaluate(() => My3D2dge.current.scene.menu.i); check('mouse hover moves the focus', i >= 1, 'i=' + i);
    await p.evaluate(() => { AOA.state = AOA.newState(8); AOA.reseedWorld(); My3D2dge.current.go('match', { cfg: { teams: [['you', 'mika'], ['ruby', 'tomo']], skipIntro: true }, humanTeam: 0 }, { fade: 0 }); });
    await p.waitForTimeout(600); await p.keyboard.press('Escape'); await p.waitForTimeout(600);
    const txt = await p.evaluate(() => document.body.innerText + ' ' + [...document.querySelectorAll('button')].map(b => b.textContent).join('|'));
    check('the pause menu offers Dev Mode', /Dev Mode/.test(txt), txt.slice(0, 200));
    check('the pause menu offers Settings', /Settings/.test(txt));
    // press Dev Mode
    await p.evaluate(() => { [...document.querySelectorAll('button')].find(b => /Dev Mode/.test(b.textContent)).click(); }); await p.waitForTimeout(500);
    check('Dev Mode opens from the pause menu', await p.evaluate(() => AOA.overlay.has('dev')));
    await p.screenshot({ path: resolve(DEV, 'test-output/dev-from-pause.png') });
    check('no console errors in the browser', errs.length === 0, errs.slice(0, 2).join(' | '));
    // touch-only device: gate + attract
    const ctx = await br.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }); const t = await ctx.newPage(); const terrs = [];
    t.on('pageerror', e => terrs.push(String(e))); await t.goto(pathToFileURL(file).href); await t.waitForTimeout(800);
    check('touch-only detected', await t.evaluate(() => AOA.touchOnly));
    await t.waitForTimeout(4500); check('touch-only: the attract mode runs on its own', await t.evaluate(() => !!AOA.attract));
    check('touch-only: no page errors', terrs.length === 0, terrs.join('|'));
    await t.screenshot({ path: resolve(DEV, 'test-output/touch.png') });
  } finally { await br.close(); }
}
