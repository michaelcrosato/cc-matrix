// The built game in Chromium from file://: a tour with no console errors, the title has pixels, the attract after 10 s,
// a touch-only device's notice and no touch buttons, and the engine's own checker.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { DEV } from '../lib/load.mjs';
import { build } from '../../tools/build.mjs';
export default async function (t) {
  build();
  const html = join(DEV, '..', basename(DEV) + '.html'), url = pathToFileURL(html).href, shots = join(DEV, 'test-output/browser'); mkdirSync(shots, { recursive: true });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errs = [];
    const key = async k => { await page.keyboard.down(k); await page.waitForTimeout(70); await page.keyboard.up(k); await page.waitForTimeout(150); };
    page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(url); await page.waitForFunction(() => window.AOA && window.AOA.game && window.AOA.game.sceneName === 'title', null, { timeout: 30000 });
    await page.waitForTimeout(1200);
    const px = await page.evaluate(() => { const c = document.getElementById('screen'), g = document.createElement('canvas'); g.width = 64; g.height = 36; const x = g.getContext('2d'); x.drawImage(c, 0, 0, 64, 36); const d = x.getImageData(0, 0, 64, 36).data, set = new Set(); for (let i = 0; i < d.length; i += 4) set.add(d[i] >> 4 << 8 | d[i + 1] >> 4 << 4 | d[i + 2] >> 4); return set.size; });
    t.ok('the title has pixels (many colors)', px > 40, px);
    await page.screenshot({ path: join(shots, 'title.png') });
    // the attract after 10 s idle
    await page.waitForTimeout(9500); const att = await page.evaluate(() => !!window.AOA.attract); t.ok('the attract starts after 10 s idle', att);
    await page.waitForTimeout(3000); await page.screenshot({ path: join(shots, 'attract.png') });
    await page.keyboard.press('Space'); await page.waitForTimeout(800); t.ok('a key returns to the title', await page.evaluate(() => !window.AOA.attract && window.AOA.game.sceneName === 'title'));
    // the tour: title -> menu -> Beach Match -> a few points -> pause -> Dev Mode -> quit
    await key('Enter'); await page.waitForTimeout(600); t.ok('Enter opens the menu', await page.evaluate(() => window.AOA.game.sceneName === 'menu'));
    await key('ArrowDown'); await key('ArrowDown'); await key('Enter'); await page.waitForTimeout(800);
    t.ok('Beach Match setup', await page.evaluate(() => window.AOA.game.sceneName === 'exhibition'), await page.evaluate(() => window.AOA.game.sceneName));
    await key('Enter'); await page.waitForTimeout(1500); t.ok('ready starts the match', await page.evaluate(() => window.AOA.game.sceneName === 'match'));
    await page.evaluate(() => { window.AOA.M.cpuControl = true; }); await page.waitForFunction(() => window.AOA.M.rules.rallies >= 1, null, { timeout: 40000 }).catch(() => {}); await page.waitForTimeout(1500); await page.screenshot({ path: join(shots, 'match.png') });
    t.ok('points are played', await page.evaluate(() => window.AOA.M.rules.rallies >= 1), await page.evaluate(() => window.AOA.M.rules.score.join('-')));
    await key('Escape'); await page.waitForTimeout(500); t.ok('Escape pauses', await page.evaluate(() => window.AOA.game.paused));
    const hasDev = await page.evaluate(() => [...document.querySelectorAll('button, [role=button]')].some(b => /Dev Mode/.test(b.textContent)));
    t.ok('the pause menu shows Dev Mode', hasDev);
    await page.evaluate(() => { window.AOA.game.resume(); window.AOA.devPanel.open(); }); await page.waitForTimeout(500); await page.screenshot({ path: join(shots, 'dev.png') });
    t.ok('Dev Mode opens', await page.evaluate(() => !!window.AOA.overlay.get('dev'))); await key('Backspace'); await page.waitForTimeout(300); t.ok('and closes', await page.evaluate(() => !window.AOA.overlay.get('dev')));
    await page.evaluate(() => window.AOA.game.go('title')); await page.waitForTimeout(800);
    t.ok('no console errors on the tour', !errs.length, errs.slice(0, 3).join(' | '));
    await page.close();
    // a touch-only device
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
    await ctx.addInitScript(() => { const real = window.matchMedia.bind(window); window.matchMedia = q => /any-pointer:\s*fine|pointer:\s*fine/.test(q) ? { matches: false, media: q, addEventListener() {}, removeEventListener() {} } : /coarse/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} } : real(q); });
    const tp = await ctx.newPage(); const terrs = []; tp.on('pageerror', e => terrs.push(e.message));
    await tp.goto(url); await tp.waitForFunction(() => window.AOA && window.AOA.game && window.AOA.game.sceneName === 'title', null, { timeout: 30000 }); await tp.waitForTimeout(1200);
    t.ok('touch-only: the notice shows', await tp.evaluate(() => window.AOA.touchOnly() && window.AOA.TOUCH_ONLY_AT_BOOT));
    t.ok('touch-only: no touch buttons', await tp.evaluate(() => !document.querySelector('[data-sys="touch"] [data-act]:not([data-act="menu"])')));
    await tp.screenshot({ path: join(shots, 'touch-only.png') });
    await tp.waitForTimeout(10000); t.ok('touch-only: the attract still runs', await tp.evaluate(() => !!window.AOA.attract));
    t.ok('touch-only: no errors', !terrs.length, terrs.slice(0, 2).join(' | '));
    await ctx.close();
  } finally { await browser.close(); }
  // the engine's own checker
  let out = ''; try { out = execFileSync('node', [join(DEV, 'tools/check.mjs'), html], { encoding: 'utf8', timeout: 180000, env: Object.assign({}, process.env) }); t.ok('tools/check.mjs passes', true); }
  catch (e) { out = String(e.stdout || '') + String(e.stderr || ''); t.ok('tools/check.mjs passes', false, out.split('\n').filter(l => /fail|error/i.test(l)).slice(0, 4).join(' | ')); }
}
