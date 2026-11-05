// the single-file bundle from file:// in Chromium: head order, the title, no console errors, glyph prompts follow the
// last device, the touch-only notice, attract mode after 10 s idle, a mission drawn without errors
import { chromium } from '../../handoff/node_modules/playwright/index.mjs';
import { readFileSync } from 'node:fs';
const NAME = 'Bentou2BirthOfTheLunchboxAssassins-Tenchu2BirthOfTheStealthAssassins-claude-opus-5-5-medium-20261103-183420';
export default async ({ check, dev }) => {
  const file = new URL('../' + NAME + '.html', dev), html = readFileSync(file, 'utf8');
  const head = html.slice(0, 600);
  check('head: meta charset first, then the unmodified session client', /^<!doctype html><html lang="en"><head>\n<meta charset="utf-8">\n<script>\/\*! aihub-session 1\.4\.0/.test(head), head.slice(0, 160));
  check('hub tags present', ['hub:session"', 'hub:session-players" content="1-4"', 'hub:session-mode" content="ghost"', 'hub:session-goal', 'hub:session-howto'].every(s => html.includes(s)), '');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errs = [];
    page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(file.href); await page.waitForFunction(() => window.__BENTOU && window.__BENTOU.game.sceneName === 'title', null, { timeout: 15000 });
    check('the bundle boots to the title from file://', true, '');
    const lab = await page.evaluate(() => { const B = window.__BENTOU.B; return [B.label('jump', 'keyboard'), B.label('jump', 'gamepad')]; });
    check('prompts: keys and PlayStation glyphs', lab[0] === 'Space' && lab[1] === '✕', lab.join(','));
    await page.waitForTimeout(11000);
    check('attract mode starts after 10 s idle', await page.evaluate(() => window.__BENTOU.game.sceneName) === 'attract', '');
    await page.waitForTimeout(6000); await page.keyboard.press('KeyK'); await page.waitForTimeout(900);
    check('a key press leaves attract mode', await page.evaluate(() => window.__BENTOU.game.sceneName) === 'title', '');
    await page.evaluate(() => { const { B, game } = window.__BENTOU; B.save.data = B.freshSave(); game.go('mission', { missionId: 'm2', levelId: 'm2', mode: 'missions', character: 'kaede' }, { fade: 0 }); });
    await page.waitForTimeout(3000); await page.keyboard.down('KeyW'); await page.waitForTimeout(800); await page.keyboard.up('KeyW');
    await page.evaluate(() => { const { B } = window.__BENTOU; B.Dev.open(B.mission, 4); }); await page.waitForTimeout(300);
    const rows = await page.evaluate(() => document.querySelectorAll('.esh-sh input[type=range]').length);
    check('Dev Mode balance pages show live sliders', rows >= 6, rows);
    const ge = await page.evaluate(() => window.__BENTOU.game.errors.map(e => e.message));
    check('no console or game errors through title, attract and a mission', !errs.length && !ge.length, errs.concat(ge).slice(0, 4).join(' | '));
    const ctx = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 844, height: 390 } }), tp = await ctx.newPage();
    await tp.goto(file.href); await tp.waitForFunction(() => window.__BENTOU && window.__BENTOU.game.sceneName === 'title', null, { timeout: 15000 });
    check('a touch-only device gets the "controller or keyboard required" notice', await tp.evaluate(() => window.__BENTOU.B.touchOnly), '');
    await ctx.close();
  } finally { await browser.close(); }
};
