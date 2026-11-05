// browser and hub suites: Playwright's Chromium on the deliverable (file://), and the AI Hub harness served locally
import { chromium, devices } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { OUT } from '../tools/build.mjs';
const LINKS = ['title', 'lobby', 'room=1-1&players=2&bot=1&god=1', 'room=2-2&players=2&bot=1&god=1', 'room=3-2&players=2&bot=1&god=1', 'boss=1&players=2&bot=1&god=1', 'boss=2&players=2&bot=1&god=1', 'boss=3&players=2&bot=1&god=1', 'greenroom&players=2&bot=1', 'recap=1', 'ending=b', 'about', 'dev', 'card', 'howto', 'scores', 'attract'];
async function variance(page) { return page.evaluate(() => { const c = document.getElementById('screen'), g = document.createElement('canvas'); g.width = 64; g.height = 36; const x = g.getContext('2d'); x.drawImage(c, 0, 0, 64, 36); const d = x.getImageData(0, 0, 64, 36).data; let s = 0, s2 = 0, n = 0; const cols = new Set(); for (let i = 0; i < d.length; i += 4) { const v = (d[i] + d[i + 1] + d[i + 2]) / 3; s += v; s2 += v * v; n++; cols.add((d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4)); } const m = s / n; return { sd: Math.sqrt(s2 / n - m * m), colors: cols.size }; }); }
export const suites = {
  async browser(t) {
    const base = pathToFileURL(join(t.root, '..', OUT + '.html')).href; let nav = 0; const U = () => base + '?n=' + (++nav);
    mkdirSync(join(t.root, 'shots'), { recursive: true });
    const browser = await chromium.launch();
    try {
      for (const size of [[1280, 720], [1920, 1080]]) {
        const page = await browser.newPage({ viewport: { width: size[0], height: size[1] } });
        const errs = [], ext = [];
        page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
        page.on('pageerror', e => errs.push(e.message));
        page.on('request', r => { const u = r.url(); if (!u.startsWith('file:') && !u.startsWith('data:') && !u.startsWith('blob:')) ext.push(u); });
        for (const h of size[0] === 1280 ? LINKS : ['title', 'room=1-1&players=4&bot=1&god=1', 'boss=3&players=2&bot=1&god=1', 'about']) {
          await page.goto(U() + '#' + h); await page.waitForTimeout(h.startsWith('boss') ? 7000 : h === 'attract' ? 3500 : 2500);
          const v = await variance(page), st = await page.evaluate(() => ({ scene: MT.game.sceneName, errors: MT.game.errors.map(e => e.where + ': ' + e.message) }));
          t.check(size[0] + 'px #' + h + ' draws a real frame', v.sd > 8 && v.colors > 12, v);
          t.check(size[0] + 'px #' + h + ' has no game errors', !st.errors.length, st.errors);
          await page.screenshot({ path: join(t.root, 'shots', size[0] + '_' + h.replace(/[^a-z0-9]+/gi, '_') + '.png') });
        }
        t.check(size[0] + 'px: no console or page errors', !errs.length, errs.slice(0, 5));
        t.check(size[0] + 'px: no external requests', !ext.length, ext.slice(0, 5));
        await page.close();
      }
      // keyboard: from the title to the lobby
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      await page.goto(U()); await page.waitForTimeout(1500);
      await page.keyboard.press('Enter'); await page.waitForTimeout(300); await page.keyboard.press('Enter'); await page.waitForTimeout(700); await page.keyboard.press('Enter'); await page.waitForTimeout(700);
      t.check('keyboard: Enter, Enter, Enter goes title → menu → difficulty → lobby', await page.evaluate(() => MT.game.sceneName) === 'lobby', await page.evaluate(() => MT.game.sceneName));
      // the mouse: hover moves the focus on the menu, a click picks
      await page.goto(U() + '#title'); await page.waitForTimeout(1200); await page.keyboard.press('Enter'); await page.waitForTimeout(400);
      const box = await page.evaluate(() => { const c = document.getElementById('screen').getBoundingClientRect(), S = MT.game.screen; return { x: c.left, y: c.top, k: c.width / S.W, W: S.W, H: S.H }; });
      const yy = box.y + (Math.round(box.H * .44) + 3 * 22 + 9) * box.k, xx = box.x + box.W / 2 * box.k;
      await page.mouse.move(xx - 30, yy); await page.mouse.move(xx, yy, { steps: 4 }); await page.waitForTimeout(300);
      t.check('mouse hover moves the menu focus', await page.evaluate(() => MT.game.scene.st && MT.game.scene.st.i) === 3, await page.evaluate(() => MT.game.scene.st && MT.game.scene.st.i));
      await page.mouse.click(xx, yy); await page.waitForTimeout(800);
      t.check('a click picks the item', await page.evaluate(() => MT.game.sceneName) === 'scores', await page.evaluate(() => MT.game.sceneName));
      // mouse aim in play
      await page.goto(U() + '#room=1-1&god=1'); await page.waitForTimeout(3500);
      const b2 = await page.evaluate(() => { const c = document.getElementById('screen').getBoundingClientRect(); return { x: c.left + c.width * .9, y: c.top + c.height * .5 }; });
      await page.mouse.move(b2.x, b2.y, { steps: 5 }); await page.mouse.down(); await page.waitForTimeout(400);
      const aim = await page.evaluate(() => { const c = MT.run.contestants[0]; return { aim: c.aim, firing: c.firing, dev: MT.game.input.lastDevice, cursor: document.getElementById('screen').style.cursor }; });
      await page.mouse.up();
      t.check('the mouse aims (toward the right) and left click fires', Math.abs(aim.aim) < .6 && aim.firing, aim);
      t.check('the OS cursor hides while the reticle aims', aim.cursor === 'none', aim.cursor);
      // a gamepad's input exits the attract mode; a mouse move over 8 px does too
      await page.goto(U() + '#attract'); await page.waitForTimeout(1500);
      await page.mouse.move(10, 10); await page.mouse.move(60, 60, { steps: 3 }); await page.waitForTimeout(400);
      t.check('a mouse move leaves the attract mode', await page.evaluate(() => MT.game.sceneName) === 'title', await page.evaluate(() => MT.game.sceneName));
      await page.goto(U() + '#attract'); await page.waitForTimeout(1500); await page.keyboard.press('KeyK'); await page.waitForTimeout(400);
      t.check('a key leaves the attract mode', await page.evaluate(() => MT.game.sceneName) === 'title');
      await page.close();
      // touch-only: the notice and the settings button; the attract mode still starts
      const ctx = await browser.newContext({ ...devices['iPhone 13'] });
      const tp = await ctx.newPage(); await tp.goto(U()); await tp.waitForTimeout(2000);
      const touch = await tp.evaluate(() => ({ only: MT.touchOnly(), scene: MT.game.sceneName, btn: MT.game.scene.touchBtn, touchButtons: !!document.querySelector('[data-sys="touch"] [data-act]') }));
      t.check('touch-only: CONTROLLER OR KEYBOARD REQUIRED', touch.only && touch.scene === 'title' && !!touch.btn, touch);
      t.check('touch-only: no touch controls on the page', !touch.touchButtons);
      await tp.screenshot({ path: join(t.root, 'shots', 'touch_title.png') });
      await tp.waitForTimeout(10500);
      t.check('touch-only: the attract mode runs', await tp.evaluate(() => MT.game.sceneName) === 'attract', await tp.evaluate(() => MT.game.sceneName));
      await tp.tap('#screen', { position: { x: 100, y: 300 } }); await tp.waitForTimeout(500);
      t.check('touch-only: a tap returns to the notice', await tp.evaluate(() => MT.game.sceneName) === 'title');
      await ctx.close();
    } finally { await browser.close(); }
  },
  async hub(t) {
    const dir = join(t.root, 'build', 'hubserve'); mkdirSync(dir, { recursive: true });
    copyFileSync(join(t.root, '..', OUT + '.html'), join(dir, 'game.html'));
    for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(join(t.root, 'vendor/hub', f), join(dir, f));
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
    const server = createServer((req, res) => { const p = decodeURIComponent(new URL(req.url, 'http://x').pathname); try { const b = readFileSync(join(dir, p === '/' ? 'harness.html' : p.replace(/^\/+/, ''))); res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' }); res.end(b); } catch (e) { res.writeHead(404); res.end(); } });
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    const port = server.address().port, base = `http://127.0.0.1:${port}/`;
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      await page.goto(base + 'game.html'); await page.waitForTimeout(1500);
      t.check('the served page is MASH TV', await page.evaluate(() => document.title === 'MASH TV' && !!window.MT), await page.title());
      for (const q of ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave', 'players=2&scenario=server&auto=1']) {
        await page.goto(base + 'harness.html?game=game.html&' + q);
        await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 120000 });
        const rep = await page.evaluate(() => ({ pass: window.__hubCheck.pass, failed: window.__hubCheck.checks.filter(c => !c.pass).map(c => c.name + ' — ' + c.detail) }));
        t.check('AI Hub harness: ' + q, rep.pass, rep.failed);
      }
    } finally { await browser.close(); server.close(); }
  },
};
