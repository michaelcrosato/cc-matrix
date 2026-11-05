// Browser checks (node test/run.mjs --browser): the single HTML file from file:// in Chromium. A standard-mapping
// controller (navigator.getGamepads, the API a real DualSense or Xbox pad uses), the Settings screen's glyph option, the
// keyboard and mouse, the attract mode, touch-only phones, and TV and laptop sizes. Screenshots go to .cache/shots.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { OUT } from '../build.mjs';
const url = pathToFileURL(OUT.pathname).href, shots = new URL('../.cache/shots/', import.meta.url).pathname; mkdirSync(shots, { recursive: true });
const assert = (ok, m) => { if (!ok) throw new Error(m); };
/** a fake controller in standard mapping: window.__pad.buttons[i].pressed, window.__pad.axes */
const PAD = id => `(() => { const pad = { id: ${JSON.stringify(id)}, index: 0, connected: true, mapping: 'standard', timestamp: 0, buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), axes: [0, 0, 0, 0] }; window.__pad = pad; navigator.getGamepads = () => [pad, null, null, null]; })()`;
const btn = (page, i, on) => page.evaluate(([i, on]) => { const b = window.__pad.buttons[i]; b.pressed = on; b.value = on ? 1 : 0; window.__pad.timestamp++; }, [i, on]);
const tapBtn = async (page, i) => { await btn(page, i, true); await page.waitForTimeout(120); await btn(page, i, false); await page.waitForTimeout(250); };
const scene = page => page.evaluate(() => window.__thugby.game.sceneName);
async function open(browser, o = {}) {
  const page = await browser.newPage({ viewport: o.viewport || { width: 1280, height: 720 }, ...(o.mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 3 } : {}) }), errs = [];
  page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  if (o.pad) await page.addInitScript(PAD(o.pad));
  await page.goto(url + (o.hash || '')); await page.waitForTimeout(o.wait || 2000);
  page.errs = errs; return page;
}
/** a game pixel (the HUD's space) to a CSS pixel on the page */
const toCss = (page, gx, gy) => page.evaluate(([gx, gy]) => { const g = window.__thugby.game, r = document.getElementById('screen').getBoundingClientRect(); return [r.left + gx * r.width / g.W, r.top + gy * r.height / g.H]; }, [gx, gy]);
export const cases = {
  async 'a PlayStation controller plays the game: Options, the d-pad and Cross in menus, the stick and buttons in a match, PlayStation glyphs'() {
    const browser = await chromium.launch();
    try {
      const page = await open(browser, { pad: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)' });
      eq0(await scene(page), 'title', 'title');
      await tapBtn(page, 9); await page.waitForTimeout(700); eq0(await scene(page), 'menu', 'Options at the title opens the menu');
      await tapBtn(page, 13); eq0(await page.evaluate(() => window.__thugby.game.scenes.menu.menu.i), 1, 'the d-pad moves the focus');
      await tapBtn(page, 0); await page.waitForTimeout(700); eq0(await scene(page), 'join', 'Cross picks EXHIBITION');
      await tapBtn(page, 1); await page.waitForTimeout(700); eq0(await scene(page), 'menu', 'Circle goes back');
      await page.evaluate(() => { const H = window.__thugby; H.game.go('match', { exhibition: true, skipIntro: true, seed: 9 }, { fade: 0 }); });
      await page.waitForTimeout(1500);
      await page.evaluate(() => { const H = window.__thugby, m = H.TT.MS.m; H.game.debug.force('give', { id: 5 }); m.players[5].x = 500; m.players[5].y = 384; window.__ev = []; H.TT.bus.on('*', (d, n) => window.__ev.push(n)); });
      const x0 = await page.evaluate(() => window.__thugby.TT.MS.m.players[5].x);
      await page.evaluate(() => { window.__pad.axes[0] = 1; }); await page.waitForTimeout(900); await page.evaluate(() => { window.__pad.axes[0] = 0; });
      const x1 = await page.evaluate(() => window.__thugby.TT.MS.m.players[5].x);
      assert(x1 > x0 + 40, 'the left stick runs the player: ' + Math.round(x0) + ' -> ' + Math.round(x1));
      const labels = await page.evaluate(() => { const I = window.__thugby.game.input, U = window.__thugby.TT.ui; return { dev: I.lastDevice, x: U.label('x', I), sq: U.label('sq', I), ci: U.label('ci', I), tri: U.label('tri', I), l1: U.label('l1', I), turbo: U.label('turbo', I) }; });
      assert(labels.dev === 'gamepad' && labels.x === '✕' && labels.sq === '□' && labels.ci === '○' && labels.tri === '△' && labels.l1 === 'L1' && labels.turbo === 'R2', 'PlayStation prompts: ' + JSON.stringify(labels));
      await page.screenshot({ path: shots + 'pad-playstation.png' });
      await tapBtn(page, 5); await page.waitForTimeout(500);
      const ev = await page.evaluate(() => window.__ev);
      assert(ev.includes('pass'), 'R1 passed the ball (' + ev.slice(-8).join(',') + ')');
      assert(!page.errs.length, page.errs.join(' | '));
    } finally { await browser.close(); }
  },
  async 'Settings, Display: "Controller buttons" switches the prompts to Xbox A B X Y'() {
    const browser = await chromium.launch();
    try {
      const page = await open(browser, { pad: 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)' });
      eq0(await page.evaluate(() => window.__thugby.game.settings.glyphs), 'playstation', 'PlayStation by default, whatever pad is plugged in');
      await page.evaluate(() => window.__thugby.game.menu('settings')); await page.waitForTimeout(500);
      const where = await page.evaluate(() => { let sec = ''; for (const el of document.querySelectorAll('.esh-sec, .esh-row')) { if (el.classList.contains('esh-sec')) sec = el.textContent; else if (/Controller buttons/.test(el.textContent)) return sec; } return null; });
      eq0(where, 'Display', 'the option is in Settings, Display');
      await page.locator('.esh-row', { hasText: 'Controller buttons' }).locator('button').click(); await page.waitForTimeout(300);
      eq0(await page.evaluate(() => window.__thugby.game.settings.glyphs), 'xbox', 'clicking it chose Xbox');
      await page.screenshot({ path: shots + 'settings-xbox.png' });
      await page.keyboard.press('Escape'); await page.waitForTimeout(400);
      await page.evaluate(() => window.__thugby.game.go('match', { exhibition: true, skipIntro: true, seed: 4 }, { fade: 0 })); await page.waitForTimeout(1500);
      await page.evaluate(() => { window.__thugby.game.debug.force('give'); window.__pad.axes[0] = .8; }); await page.waitForTimeout(400); await page.evaluate(() => { window.__pad.axes[0] = 0; });
      const labels = await page.evaluate(() => { const I = window.__thugby.game.input, U = window.__thugby.TT.ui; return { dev: I.lastDevice, x: U.label('x', I), sq: U.label('sq', I), ci: U.label('ci', I), tri: U.label('tri', I), l1: U.label('l1', I), turbo: U.label('turbo', I) }; });
      assert(labels.dev === 'gamepad' && labels.x === 'A' && labels.sq === 'X' && labels.ci === 'B' && labels.tri === 'Y' && labels.l1 === 'LB' && labels.turbo === 'RT', 'Xbox prompts: ' + JSON.stringify(labels));
      await page.screenshot({ path: shots + 'pad-xbox.png' });
      assert(!page.errs.length, page.errs.join(' | '));
    } finally { await browser.close(); }
  },
  async 'keyboard and mouse: hover moves a menu\'s focus and a click picks; a click on a teammate passes; the right button kicks to the cursor'() {
    const browser = await chromium.launch();
    try {
      const page = await open(browser);
      await page.keyboard.press('Enter'); await page.waitForTimeout(800); eq0(await scene(page), 'menu', 'Enter at the title');
      const rc = await page.evaluate(() => window.__thugby.game.scenes.menu.menu.f.rects[2]);
      const [cx, cy] = await toCss(page, rc[0] + rc[2] / 2, rc[1] + rc[3] / 2);
      await page.mouse.move(cx - 30, cy - 30); await page.mouse.move(cx, cy, { steps: 4 }); await page.waitForTimeout(300);
      eq0(await page.evaluate(() => window.__thugby.game.scenes.menu.menu.i), 2, 'hovering TRAINING GROUND focuses it');
      await page.mouse.click(cx, cy); await page.waitForTimeout(900); eq0(await scene(page), 'training', 'a click picks it');
      await page.evaluate(() => window.__thugby.game.go('match', { exhibition: true, skipIntro: true, seed: 5 }, { fade: 0 })); await page.waitForTimeout(1500);
      // the carrier stands still; a teammate behind him: the mouse over the teammate, a click passes to him
      await page.evaluate(() => { const H = window.__thugby, m = H.TT.MS.m; m.parked = new Set(m.players.filter(p => p.team === 1).map(p => p.id)); H.game.debug.force('give', { id: 5 }); const c = m.players[5], r = m.players[4]; c.x = 600; c.y = 384; r.x = 560; r.y = 330; r.vx = r.vy = 0; m.forced = m.forced || {}; m.forced[4] = { t: 1e9, I: H.TT.emptyIntent() }; window.__ev = []; H.TT.bus.on('*', (d, n) => window.__ev.push([n, d.to])); });
      await page.waitForTimeout(2000);   // the camera settles on the new ball position
      const pt = await page.evaluate(() => { const H = window.__thugby, r = H.TT.MS.m.players[4], g = H.game; return g.r.w(r.x, r.y, r.z + 16); });
      const [tx, ty] = await toCss(page, pt[0], pt[1]);
      await page.mouse.move(tx + 5, ty + 5); await page.mouse.move(tx, ty, { steps: 3 }); await page.waitForTimeout(250);
      eq0(await page.evaluate(() => window.__thugby.TT.MS.ctx.hoverId), 4, 'the mouse is over the teammate (he shows PASS / FORWARD)');
      await page.mouse.click(tx, ty); await page.waitForTimeout(500);
      const ev = await page.evaluate(() => window.__ev);
      assert(ev.some(([n, to]) => n === 'pass' && to === 4), 'a click passed to him: ' + JSON.stringify(ev.slice(-6)));
      // the right button: held, then let go, kicks toward the cursor
      await page.evaluate(() => { const H = window.__thugby; H.game.debug.force('give', { id: 4 }); window.__ev = []; });
      await page.waitForTimeout(200);
      const kp = await page.evaluate(() => { const H = window.__thugby, c = H.TT.MS.m.players[4]; return H.game.r.w(c.x + 200, c.y, 0); });
      const [kx, ky] = await toCss(page, kp[0], kp[1]);
      await page.mouse.move(kx, ky, { steps: 3 }); await page.mouse.down({ button: 'right' }); await page.waitForTimeout(600); await page.mouse.up({ button: 'right' }); await page.waitForTimeout(400);
      const ev2 = await page.evaluate(() => window.__ev);
      assert(ev2.some(([n]) => n === 'kick'), 'the right button kicked: ' + JSON.stringify(ev2.slice(-6)));
      assert(!page.errs.length, page.errs.join(' | '));
    } finally { await browser.close(); }
  },
  async 'attract: 10 s idle on the title starts the demo; a key returns to the title'() {
    const browser = await chromium.launch();
    try {
      const page = await open(browser, { wait: 1500 });
      await page.waitForTimeout(11000);
      const s = await page.evaluate(() => window.__thugby.game.debug.snapshot()); assert(s.scene === 'match' && s.attract, 'demo after 10 s: ' + s.scene);
      await page.waitForTimeout(4000); await page.screenshot({ path: shots + 'attract-browser.png' });
      await page.keyboard.press('KeyK'); await page.waitForTimeout(900); eq0(await scene(page), 'title', 'a key: back to the title');
      assert(!page.errs.length, page.errs.join(' | '));
    } finally { await browser.close(); }
  },
  async 'a touch-only phone: "Controller or keyboard required", the SETTINGS button opens Settings, the attract mode still runs'() {
    const browser = await chromium.launch();
    try {
      const page = await open(browser, { viewport: { width: 390, height: 844 }, mobile: true });
      assert(await page.evaluate(() => window.__thugby.TT.touchOnly), 'touch-only detected');
      assert(await page.evaluate(() => window.__thugby.game.input.touchEnabled === false), 'no touch controls');
      const b = await page.evaluate(() => window.__thugby.game.scenes.title.btn);
      const [bx, by] = await toCss(page, b[0] + b[2] / 2, b[1] + b[3] / 2);
      await page.touchscreen.tap(bx, by); await page.waitForTimeout(700);
      assert(await page.evaluate(() => !!document.querySelector('.esh-sh') && /Settings/.test(document.body.textContent)), 'the SETTINGS button opened Settings');
      await page.screenshot({ path: shots + 'touch-settings.png' });
      await page.reload(); await page.waitForTimeout(12500);
      assert(await page.evaluate(() => window.__thugby.game.debug.snapshot().attract), 'the attract mode runs on a touch-only phone');
      assert(!page.errs.length, page.errs.join(' | '));
    } finally { await browser.close(); }
  },
  async 'TV and laptop sizes: a match played from the keyboard, the pause menu has DEV MODE, no errors'() {
    const browser = await chromium.launch();
    try {
      for (const [w, h] of [[1920, 1080], [1280, 720]]) {
        const page = await open(browser, { viewport: { width: w, height: h } });
        await page.keyboard.press('Enter'); await page.waitForTimeout(800); eq0(await scene(page), 'menu', w + ': menu');
        await page.evaluate(() => window.__thugby.game.go('match', { exhibition: true, skipIntro: true }));
        await page.waitForTimeout(2500);
        await page.evaluate(() => window.__thugby.game.debug.force('give'));
        await page.keyboard.down('KeyD'); await page.keyboard.down('ShiftLeft'); await page.waitForTimeout(900); await page.keyboard.press('Space'); await page.waitForTimeout(500);
        await page.keyboard.press('KeyE'); await page.waitForTimeout(600); await page.keyboard.up('ShiftLeft'); await page.keyboard.up('KeyD');
        await page.keyboard.press('KeyC'); await page.waitForTimeout(1500);
        eq0(await scene(page), 'match', 'still playing');
        await page.keyboard.press('Escape'); await page.waitForTimeout(600);
        assert(await page.evaluate(() => [...document.querySelectorAll('button')].some(b => /dev mode/i.test(b.textContent))), w + ': DEV MODE in the pause menu');
        await page.locator('button', { hasText: /dev mode/i }).click(); await page.waitForTimeout(500);
        assert(await page.evaluate(() => window.__thugby.TT.dev.open), w + ': DEV MODE opens the panel');
        if (w === 1920) await page.screenshot({ path: shots + 'dev-browser.png' });
        assert(!page.errs.length, w + ': ' + page.errs.slice(0, 2).join(' | '));
        await page.close();
      }
    } finally { await browser.close(); }
  }
};
function eq0(a, b, m) { if (a !== b) throw new Error(`${m}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
