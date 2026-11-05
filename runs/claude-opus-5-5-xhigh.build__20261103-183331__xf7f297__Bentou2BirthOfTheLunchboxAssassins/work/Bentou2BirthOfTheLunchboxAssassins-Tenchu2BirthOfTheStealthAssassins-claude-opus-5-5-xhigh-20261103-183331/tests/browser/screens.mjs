// browser/screens: the screens TASK.md asks for, read off the real canvas of the single file in Chromium. Every string
// the pixel font draws is recorded (a wrapper on E.font.text and E.font.title), so a check passes only when the words
// were drawn: the About / Credits screen reached from the title menu with keys, paged with the arrows and scrolled, every
// line of its six pages drawn; on a touch-only phone, the "Controller or keyboard required" notice and its Settings
// button drawn, and a tap on that button opening Settings with the PlayStation / Xbox symbols option
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { NAME } from '../../tools/name.mjs';
const SPY = () => {   // in the page: record every string the pixel font draws
  const F = window.My3D2dge.font; window.__drawn = new Set();
  for (const k of ['text', 'title']) { const f = F[k]; F[k] = function (g, s, ...a) { window.__drawn.add(String(s)); return f.call(this, g, s, ...a); }; }
};
export default async function ({ dev, check }) {
  const require = createRequire(join(dev, 'handoff', 'package.json')), { chromium } = require('playwright');
  const url = pathToFileURL(join(dev, '..', NAME + '.html')).href;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(url); await page.waitForTimeout(2500); await page.evaluate(SPY);
    // the title menu, by keyboard, to About
    await page.keyboard.press('Enter'); await page.waitForTimeout(400);
    const items = await page.evaluate(() => window.My3D2dge.current.scene.menu.items.map(i => typeof i === 'string' ? i : i.label));
    check('the title menu lists About', items.includes('About'), items.join(','));
    for (let k = 0; k < 12; k++) {
      if (await page.evaluate(() => window.My3D2dge.current.scene.menu.selected) === 'About') break;
      await page.keyboard.press('ArrowDown'); await page.waitForTimeout(120);
    }
    await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
    check('Enter on About opens the About / Credits screen', await page.evaluate(() => window.My3D2dge.current.sceneName) === 'about', '');
    // every page, every line, drawn
    const pages = await page.evaluate(() => window.__BENTOU.About.pages().map(p => p[0]));
    check('six pages: About, Source Information, the three feedback pages, Credits', pages.join('|') === 'About|Source Information|Testing Feedback|Engine Feedback|Prompt Feedback|Credits', pages.join('|'));
    for (let p = 0; p < pages.length; p++) {
      await page.evaluate(() => window.__drawn.clear()); await page.waitForTimeout(150);
      const shown = await page.evaluate(() => window.My3D2dge.current.scene.p);
      let stopped = false;
      for (let y = 0; y < 4000 && !stopped; y += 80) {   // scroll the page through, a frame or more at each step, until the screen stops it
        await page.evaluate(y => { window.My3D2dge.current.scene.scroll = y; }, y); await page.waitForTimeout(60);
        stopped = await page.evaluate(y => window.My3D2dge.current.scene.scroll < y, y);
      }
      const miss = await page.evaluate(i => {
        const E = window.My3D2dge, g = E.current, pg = window.__BENTOU.About.pages()[i], W = g.W, w = W - Math.round(W * .08) * 2, out = [];
        if (!window.__drawn.has(pg[0].toUpperCase())) out.push('title ' + pg[0]);
        for (const para of pg[1]) for (const l of E.font.wrap(para.startsWith('# ') ? para.slice(2) : para, w)) if (!window.__drawn.has(l)) out.push(l);
        return out;
      }, p);
      check('About page ' + (p + 1) + ' (' + pages[p] + '): shown, and every line of it drawn on the canvas', shown === p && !miss.length, shown + ' ' + miss.slice(0, 3).join(' | '));
      // at the end of the scroll the page's last line is still on screen (the words never scroll away)
      await page.evaluate(() => window.__drawn.clear()); await page.waitForTimeout(150);
      const last = await page.evaluate(i => { const E = window.My3D2dge, g = E.current, pg = window.__BENTOU.About.pages()[i], w = g.W - Math.round(g.W * .08) * 2, para = pg[1][pg[1].length - 1], ls = E.font.wrap(para.startsWith('# ') ? para.slice(2) : para, w); return [ls[ls.length - 1], window.__drawn.has(ls[ls.length - 1])]; }, p);
      check('About page ' + (p + 1) + ' (' + pages[p] + '): scrolled to its end, its last line still shows', stopped && last[1], (stopped ? 'stopped' : 'never stopped') + ' / ' + last[0]);
      await page.screenshot({ path: join(dev, 'shots', 'about-' + (p + 1) + '-end.png') });
      await page.evaluate(() => { window.My3D2dge.current.scene.scroll = 0; }); await page.waitForTimeout(120);
      await page.screenshot({ path: join(dev, 'shots', 'about-' + (p + 1) + '.png') });
      if (p === 2) {   // the wheel, far past the end, by real input: the words stay
        const bx = await page.evaluate(() => [window.innerWidth / 2, window.innerHeight / 2]); await page.mouse.move(bx[0], bx[1]);
        for (let k = 0; k < 60; k++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(16); }
        await page.waitForTimeout(150); await page.evaluate(() => window.__drawn.clear()); await page.waitForTimeout(150);
        const n = await page.evaluate(() => { const E = window.My3D2dge, g = E.current, pg = window.__BENTOU.About.pages()[2], w = g.W - Math.round(g.W * .08) * 2, own = new Set(pg[1].flatMap(t => E.font.wrap(t.startsWith('# ') ? t.slice(2) : t, w))); return [...window.__drawn].filter(t => own.has(t)).length; });
        check('About page 3: the mouse wheel far past the end leaves its last lines on screen', n >= 3, n + ' lines drawn');
        await page.evaluate(() => { window.My3D2dge.current.scene.scroll = 0; }); await page.waitForTimeout(100);
      }
      await page.keyboard.press('ArrowRight'); await page.waitForTimeout(250);
    }
    check('the arrows page round to the first page again', await page.evaluate(() => window.My3D2dge.current.scene.p) === 0, '');
    await page.keyboard.press('Escape'); await page.waitForTimeout(1200);
    check('Back returns to the title', await page.evaluate(() => window.My3D2dge.current.sceneName) === 'title', '');
    check('no page errors on the About screen', !errs.length, errs.slice(0, 3).join(' | '));
    // a touch-only phone: the notice, its Settings button, and a tap on it
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    const ph = await ctx.newPage(); const perr = []; ph.on('pageerror', e => perr.push(e.message));
    await ph.goto(url); await ph.waitForTimeout(2500); await ph.evaluate(SPY); await ph.waitForTimeout(300);
    const drawn = await ph.evaluate(() => [...window.__drawn]);
    check('the phone draws "Controller or keyboard required" and a SETTINGS button', drawn.includes('Controller or keyboard required') && drawn.includes('SETTINGS'), drawn.slice(0, 8).join(' | '));
    check('the phone shows no touch controls (no PRESS START, no menu)', !drawn.some(s => /^PRESS/.test(s)) && !drawn.includes('New Story'), '');
    const at = await ph.evaluate(() => { const g = window.My3D2dge.current, b = g.scene.setBtn, c = g.screen.canvas.getBoundingClientRect(), W = g.renderer ? g.renderer.W : g.W, H = g.renderer ? g.renderer.H : g.H;
      return b && [c.left + (b.x + b.w / 2) * c.width / W, c.top + (b.y + b.h / 2) * c.height / H]; });
    for (let k = 0; at && k < 2; k++) {   // (a phone's first tap may go to full screen)
      await ph.touchscreen.tap(at[0], at[1]); await ph.waitForTimeout(600);
      if (await ph.evaluate(() => window.My3D2dge.current.shell && window.My3D2dge.current.shell.screen) === 'settings') break;
    }
    const sym = () => ph.evaluate(() => { const b = document.querySelector('button[aria-label^="Button symbols:"]'); return b ? b.getAttribute('aria-label') : null; });
    const scr = await ph.evaluate(() => window.My3D2dge.current.shell && window.My3D2dge.current.shell.screen), s0 = await sym();
    check('a tap on SETTINGS opens Settings, with Button symbols on it set to PlayStation', scr === 'settings' && s0 === 'Button symbols: PlayStation', String(scr) + ' ' + s0 + ' ' + JSON.stringify(at));
    const sb = ph.locator('button[aria-label^="Button symbols:"]');
    if (s0) { await sb.scrollIntoViewIfNeeded(); await ph.waitForTimeout(200); const bb = await sb.boundingBox(); await ph.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await ph.waitForTimeout(300); }
    const s1 = await sym(), xb = await ph.evaluate(() => { const g = window.My3D2dge.current, d = g.input.lastDevice; g.input.lastDevice = 'gamepad'; const l = g.input.label('jump'); g.input.lastDevice = d; return [g.settings.glyphs, l].join(' '); });
    check('a tap on it switches to Xbox: the setting, and the controller prompts become A B X Y', s1 === 'Button symbols: Xbox' && xb === 'xbox A', s1 + ' / ' + xb);
    await ph.screenshot({ path: join(dev, 'shots', 'touch-settings.png') });
    check('no page errors on the phone', !perr.length, perr.slice(0, 3).join(' | '));
  } finally { await browser.close(); }
}
