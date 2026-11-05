// browser/bundle: the single file from file:// in Chromium: the head's order (charset, the session client, the hub tags),
// the title, zero console errors, prompts switching to a (fake) controller's symbols, the touch-only notice, attract at 10 s
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { NAME } from '../../tools/name.mjs';
export default async function ({ dev, check }) {
  const require = createRequire(join(dev, 'handoff', 'package.json')), { chromium } = require('playwright');
  const file = join(dev, '..', NAME + '.html'), html = readFileSync(file, 'utf8');
  const head = html.slice(0, html.indexOf('</head>')), iC = head.indexOf('<meta charset'), iS = head.indexOf('<script>/*! aihub-session 1.4.0'), iH = head.indexOf('<meta name="hub:session"');
  check('the head: charset, then the session client, then the hub tags', iC >= 0 && iS > iC && iH > iS && head.indexOf('<script') === iS, [iC, iS, iH].join(','));
  check('the hub goal and howto are short enough', /hub:session-goal" content="([^"]{1,60})"/.test(head) && /hub:session-howto" content="([^"]{1,80})"/.test(head), '');
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.addInitScript(() => {   // a standard-mapping controller that presses cross after a moment
      let t0 = performance.now(); const pad = () => ({ id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', index: 0, connected: true, mapping: 'standard', timestamp: performance.now(), axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: window.__padPress === i, touched: false, value: window.__padPress === i ? 1 : 0 })) });
      navigator.getGamepads = () => (window.__padOn ? [pad()] : [null]); void t0;
    });
    await page.goto(pathToFileURL(file).href);
    await page.waitForTimeout(2500);
    const s1 = await page.evaluate(() => window.My3D2dge.current.debug.snapshot());
    check('the title after boot', s1.scene === 'title', s1.scene);
    await page.evaluate(() => { window.__padOn = true; window.__padPress = 0; }); await page.waitForTimeout(400); await page.evaluate(() => { window.__padPress = -1; }); await page.waitForTimeout(300);
    const pad = await page.evaluate(() => ({ dev: window.My3D2dge.current.input.lastDevice, label: window.My3D2dge.current.input.label('jump') }));
    check('a controller press switches the prompts to its symbols', pad.dev === 'gamepad' && pad.label === '✕', JSON.stringify(pad));
    await page.evaluate(() => { window.__padOn = false; }); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(200);
    const kb = await page.evaluate(() => window.My3D2dge.current.input.label('jump'));
    check('a key press switches them back to keys', kb === 'Space', kb);
    await page.waitForTimeout(11000);
    const s2 = await page.evaluate(() => window.My3D2dge.current.sceneName);
    check('attract mode after 10 s without input', s2 === 'attract', s2);
    await page.mouse.move(300, 300); await page.waitForTimeout(80); await page.mouse.move(340, 330); await page.waitForTimeout(100); await page.mouse.move(380, 360); await page.waitForTimeout(900);
    const s3 = await page.evaluate(() => [window.My3D2dge.current.sceneName, window.__BENTOU.lastInput.toFixed(2), window.My3D2dge.current.real.toFixed(2)].join(' '));
    check('a mouse move returns to the title', /^title/.test(s3), s3);
    await page.goto('about:blank'); await page.goto(pathToFileURL(file).href + '#m1'); await page.waitForTimeout(3000);
    check('a mission plays from the single file', await page.evaluate(() => window.My3D2dge.current.sceneName) === 'mission', '');
    check('no console errors', !errs.filter(e => !/GPU|adapter|WebGPU/i.test(e)).length, errs.slice(0, 4).join(' | '));
    // a phone: no fine pointer, touch only
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    const ph = await ctx.newPage(); const perr = []; ph.on('pageerror', e => perr.push(e.message));
    await ph.goto(pathToFileURL(file).href); await ph.waitForTimeout(2500);
    const tO = await ph.evaluate(() => window.__BENTOU.touchOnly());
    check('a touch-only device gets the controller-or-keyboard notice', tO === true, String(tO));
    await ph.screenshot({ path: join(dev, 'shots', 'touch.png') });
    await ph.waitForTimeout(10500); check('attract still runs on a touch-only device', await ph.evaluate(() => window.My3D2dge.current.sceneName) === 'attract', '');
    check('no errors on the phone', !perr.length, perr.join(' | '));
  } finally { await browser.close(); }
}
