// the built single file in headless Chromium from file:// (PLAN §9.5): boots with no errors, draws, every deep link
// reaches its scene, the bot's times equal the baked table (Node and the browser agree), attract after 10 s idle, the
// touch-only gate; screenshots into check-output/ for a human look
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { OUT_NAME } from './build-name.mjs';
import { MEDALS } from '../src/data/medals.js';
const ROOT = fileURLToPath(new URL('..', import.meta.url)), URL0 = pathToFileURL(ROOT + '../' + OUT_NAME).href;
const IGNORE = /deprecated parameters|No available adapters|WebGPU is not available|GPU stall|Automatic fallback|GroupMarkerNotSet|WebGL: too many|a lot of|webgl.*performance/i;
export async function browser() {
  const fails = []; let n = 0; const check = (name, ok, detail = '') => { n++; if (!ok) fails.push([name, detail]); return ok; };
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const open = async (hash = '', o = {}) => {
    const ctx = await b.newContext(Object.assign({ viewport: { width: 1280, height: 720 } }, o.ctx || {})), page = await ctx.newPage(), errs = [];
    page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text().slice(0, 200)); });
    await page.goto(URL0 + (o.q || '') + hash);
    const ok = await page.waitForFunction(() => window.__crack && window.__crack.game.sceneName, null, { timeout: 90000 }).then(() => true, () => false);
    return { ctx, page, errs, ok };
  };
  const snap = page => page.evaluate(() => window.__crack.snapshot());
  // the title: boots, draws, no errors
  { const { ctx, page, errs, ok } = await open(); check('boots within 90 s', ok); await page.waitForTimeout(3000);
    const s = await snap(page); check('title scene', s.scene === 'title', s.scene);
    const shot = (await page.screenshot()).toString('base64');
    const varc = await page.evaluate(async b64 => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const g = document.createElement('canvas'); g.width = 64; g.height = 36; const x = g.getContext('2d'); x.drawImage(img, 0, 0, 64, 36); const d = x.getImageData(0, 0, 64, 36).data; let m = 0, v = 0; for (let i = 0; i < d.length; i += 4) m += d[i]; m /= d.length / 4; for (let i = 0; i < d.length; i += 4) v += (d[i] - m) ** 2; return v / (d.length / 4); }, shot);
    check('the picture is not blank', varc > 20, 'variance ' + varc);
    await page.screenshot({ path: ROOT + 'check-output/b-title.png' });
    // determinism: the author bot here equals the baked table
    for (const id of ['D1', 'D3']) { const st = await page.evaluate(i => window.__crack.api.botTime(i), id); check(id + ' bot time in the browser equals the baked table', Math.abs(st - MEDALS[id]) <= 1, st + ' vs ' + MEDALS[id]); }
    // attract after ten idle seconds; a key press ends it
    // (ten seconds of game time: software rendering runs the game slower than real time)
    const att = await page.waitForFunction(() => window.__crack.game.sceneName === 'attract', null, { timeout: 60000 }).then(() => true, () => false); let s2 = await snap(page); check('attract after 10 s idle', att, s2.scene);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: ROOT + 'check-output/b-attract.png' });
    await page.keyboard.press('Enter'); await page.waitForTimeout(1500); s2 = await snap(page); check('a key ends the attract', s2.scene === 'title', s2.scene);
    check('no errors on the title', !errs.length, errs.slice(0, 3).join(' | ')); await ctx.close(); }
  // WebGL 2 forced
  { const { ctx, page, errs, ok } = await open('', { q: '?backend=webgl' }); check('?backend=webgl boots', ok && !errs.length, errs.join(' | ')); await ctx.close(); }
  // the deep links
  const LINKS = [['race/D3', 'race'], ['race/R3', 'race'], ['race/S3', 'race'], ['editor', 'editor'], ['puzzle/PD2', 'editor'], ['survival/hedgerow', 'card'], ['split/2/S2', 'race'], ['garage', 'garage'], ['replay/last', 'replay'], ['about', 'menu'], ['lab/physics', 'race'], ['lab/blocks', 'race'], ['menu/main', 'menu']];
  for (const [h, sc] of LINKS) {
    const { ctx, page, errs, ok } = await open('#' + h); await page.waitForTimeout(4500);
    let s = ok ? await snap(page) : {}; if (sc === 'card' && s.scene === 'race') s.scene = 'card';
    check('#' + h + ' reaches ' + sc, s.scene === sc, s.scene);
    if (h === 'replay/last') { const a = await snap(page); await page.waitForTimeout(3000); const b2 = await snap(page); check('the replay plays: its clock advances', a.replay && b2.replay && b2.replay.t > a.replay.t, JSON.stringify([a.replay, b2.replay])); await page.keyboard.press('KeyC'); await page.waitForTimeout(800); const c = await snap(page); check('the replay camera cycles', c.replay && c.replay.cam === 1, JSON.stringify(c.replay)); await page.keyboard.press('Space'); await page.waitForTimeout(600); const d = await snap(page); check('the replay pauses', d.replay && d.replay.play === false); }
    if (h.startsWith('race/')) { await page.evaluate(() => window.__crack.api.botDrives(true)); await page.waitForTimeout(9000); }
    await page.screenshot({ path: ROOT + 'check-output/b-' + h.replace(/\//g, '-') + '.png' });
    check('#' + h + ' no errors', !errs.length, errs.slice(0, 3).join(' | '));
    await ctx.close();
  }
  // a phone held upright with only touch: the gate, Settings, and the attract runs
  { const { ctx, page, errs, ok } = await open('', { ctx: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } }); await page.waitForTimeout(3000);
    const s = await snap(page); check('touch-only: on the title gate', s.scene === 'title'); await page.screenshot({ path: ROOT + 'check-output/b-touch.png' });
    check('touch-only: the gate shows', s.touchGate === true, JSON.stringify(s.touchGate));
    check('touch-only: no touch buttons on the page', await page.evaluate(() => !document.querySelector('[data-sys="touch"] button[data-act]:not([data-act="menu"])')));
    const pt = await page.evaluate(() => { const S = __crack.game.screen, W = __crack.game.W, H = __crack.game.H; return [(W / 2 * S.S + S.OX) / S.dpr, ((H * .48 + 76) * S.S + S.OY) / S.dpr]; });
    await page.touchscreen.tap(pt[0], pt[1]); await page.waitForTimeout(1500);
    check('touch-only: SETTINGS opens the settings', await page.evaluate(() => !!document.querySelector('[role="dialog"]')), JSON.stringify(pt));
    await page.screenshot({ path: ROOT + 'check-output/b-touch-settings.png' });
    await page.evaluate(() => { const d = document.querySelector('[role="dialog"]'); const b = d && [...d.querySelectorAll('button')].find(x => /back|close/i.test(x.textContent || x.getAttribute('aria-label') || '')); if (b) b.click(); else __crack.game.input.tap('cancel'); });
    const att = await page.waitForFunction(() => window.__crack.game.sceneName === 'attract', null, { timeout: 60000 }).then(() => true, () => false); check('touch-only: the attract runs', att); check('touch-only: no errors', !errs.length, errs.join(' | ')); await ctx.close(); }
  await b.close();
  return { n, fails };
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) { const r = await browser(); for (const [c, d] of r.fails) console.log('FAIL browser: ' + c + (d ? ': ' + d : '')); console.log(r.n + ' checks, ' + r.fails.length + ' failed'); }
