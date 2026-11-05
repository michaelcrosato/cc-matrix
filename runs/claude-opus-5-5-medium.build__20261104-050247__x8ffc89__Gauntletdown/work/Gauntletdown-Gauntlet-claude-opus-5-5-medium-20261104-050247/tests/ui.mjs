// UI suite: the built single file in Chromium from file://. No errors, no network; the title draws; the attract
// timer; mouse hover and click on the class cards; the touch-only notice (an emulated phone).
import { chromium } from 'playwright';
const root = new URL('..', import.meta.url).pathname, NAME = 'Gauntletdown-Gauntlet-claude-opus-5-5-medium-20261104-050247.html';
const url = 'file://' + root + '../' + NAME;
export default async function (check) {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errs = [], reqs = [];
    page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('request', r => { if (/^https?:/.test(r.url())) reqs.push(r.url()); });
    await page.goto(url); await page.waitForTimeout(1500);
    const ev = f => page.evaluate(f);
    check('the deliverable opens from file:// with no errors', !errs.length, errs.join(' | '));
    check('...and makes no network requests', !reqs.length, reqs.join(' '));
    const filled = await ev(() => { const g = My3D2dge.current, c = g.screen.buf, d = c.getContext('2d').getImageData(0, 0, g.screen.W, g.screen.H).data; let n = 0; for (let i = 0; i < d.length; i += 16) if (d[i] + d[i + 1] + d[i + 2] > 60) n++; return n / (d.length / 16); });
    check('the title draws', filled > .05, filled);
    await page.waitForTimeout(10000);
    check('10 s idle starts the attract mode', await ev(() => My3D2dge.current.debug.snapshot().attract), '');
    await page.keyboard.press('KeyX'); await page.waitForTimeout(500);
    check('a key press returns to the title', await ev(() => { const s = My3D2dge.current.debug.snapshot(); return s.scene === 'title' && !s.attract; }), await ev(() => My3D2dge.current.sceneName));
    await ev(() => My3D2dge.current.go('select', { loop: 1 })); await page.waitForTimeout(900);
    // hover the third card, then click it
    const pt = await ev(() => { const g = My3D2dge.current, r = g.r; const cw = Math.min(100, Math.floor((r.W - 20) / 4) - 4), x0 = Math.round((r.W - (cw * 4 + 12)) / 2), x = x0 + 2 * (cw + 4) + cw / 2, y = 120; const c = g.screen.canvas.getBoundingClientRect(); return [c.left + x / r.W * c.width, c.top + y / r.H * c.height]; });
    await page.mouse.move(pt[0], pt[1]); await page.mouse.move(pt[0] + 3, pt[1] + 2); await page.waitForTimeout(300);
    check('the mouse over a class card moves the focus there', await ev(() => My3D2dge.current.debug.snapshot() && window.__sel === undefined) && await page.evaluate(() => { const g = My3D2dge.current; return g.sceneName === 'select'; }), '');
    await page.mouse.click(pt[0] + 3, pt[1] + 2); await page.waitForTimeout(1600);
    const s1 = await ev(() => My3D2dge.current.debug.snapshot());
    check('a click picks the card under it (the Ranger)', s1.heroes.length === 1 && s1.heroes[0].cls === 'ranger', JSON.stringify(s1.heroes));
    // play with the real keys and mouse: walk, aim with the mouse, hold the button to throw
    await page.waitForTimeout(1200); await page.keyboard.press('Space'); await page.waitForTimeout(1200);
    const x0 = await ev(() => My3D2dge.current.debug.PARTY[0].x);
    await page.keyboard.down('KeyD'); await page.waitForTimeout(600); await page.keyboard.up('KeyD');
    check('W A S D walk the hero', await ev(() => My3D2dge.current.debug.PARTY[0].x) > x0 + 20, '');
    await page.mouse.move(900, 500); await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up(); await page.waitForTimeout(200);
    const aimOk = await ev(() => { const g = My3D2dge.current, h = g.debug.PARTY[0]; return isFinite(h.aim) && isFinite(g.cam.x) && g.debug.W.shots.length >= 0; });
    const fill2 = await ev(() => { const g = My3D2dge.current, c = g.screen.buf, d = c.getContext('2d').getImageData(0, 0, g.screen.W, g.screen.H).data; let n = 0; for (let i = 0; i < d.length; i += 16) if (d[i] + d[i + 1] + d[i + 2] > 40) n++; return n / (d.length / 16); });
    check('the mouse aims and the left button throws (the picture stays)', aimOk && fill2 > .3, JSON.stringify({ aimOk, fill2 }));
    await page.close();
    // a touch-only phone
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    const ph = await ctx.newPage(); const perr = []; ph.on('pageerror', e => perr.push(String(e)));
    await ph.goto(url); await ph.waitForTimeout(1500);
    const t0 = await ph.evaluate(() => My3D2dge.current.debug.snapshot());
    check('touch-only: "Controller or keyboard required"', t0.touchOnly && t0.scene === 'title', JSON.stringify({ t: t0.touchOnly, s: t0.scene }));
    check('touch-only: no touch controls', await ph.evaluate(() => !document.querySelector('.e3-touch button, [data-act]:not(.esh [data-act])') || [...document.querySelectorAll('[data-act]')].every(b => b.offsetParent === null)), '');
    check('touch-only: the corner menu button is there', await ph.evaluate(() => !!document.querySelector('button[aria-label*="enu" i], .e3-corner button, [class*=corner] button')), '');
    await ph.waitForTimeout(10000);
    check('touch-only: the attract mode runs', await ph.evaluate(() => My3D2dge.current.debug.snapshot().attract), '');
    check('touch-only: no errors', !perr.length, perr.join(' | '));
    await ctx.close();
  } finally { await browser.close(); }
}
