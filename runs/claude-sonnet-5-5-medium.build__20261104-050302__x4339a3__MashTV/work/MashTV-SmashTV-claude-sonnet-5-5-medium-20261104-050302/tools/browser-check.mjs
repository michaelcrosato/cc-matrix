// Playwright on the deliverable over file://: no console/page errors, no external requests, every deep link draws a real frame,
// keyboard + mouse + touch behave, the pause menu has our items. Screenshots go to shots/.
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const DEV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), FILE = 'file://' + path.resolve(DEV, '..', 'MashTV-SmashTV-claude-sonnet-5-5-medium-20261104-050302.html');
const fails = []; const fail = (n, d = '') => fails.push(n + (d ? ': ' + d : ''));
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
async function page(o = {}, hash = '') {
  const ctx = await b.newContext(Object.assign({ viewport: { width: 1280, height: 720 } }, o)); const p = await ctx.newPage(); const errs = [], ext = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('request', r => { const u = r.url(); if (!/^(file|data|blob):/.test(u)) ext.push(u); });
  await p.goto(FILE + (hash ? '#' + hash : '')); return { p, ctx, errs, ext };
}
const variance = p => p.evaluate(() => { const c = document.getElementById('screen'), o = document.createElement('canvas'); o.width = 64; o.height = 36; const g = o.getContext('2d'); g.drawImage(c, 0, 0, 64, 36); const d = g.getImageData(0, 0, 64, 36).data; let s = 0, s2 = 0, n = 0; const cols = new Set(); for (let i = 0; i < d.length; i += 4) { const l = d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11; s += l; s2 += l * l; n++; cols.add((d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4)); } const m = s / n; return { sd: Math.sqrt(s2 / n - m * m), colors: cols.size }; });
const LINKS = ['title', 'lobby', 'room=1-1', 'room=2-2', 'room=3-2', 'boss=1', 'boss=2', 'boss=3', 'greenroom', 'recap=1', 'ending=b', 'about', 'dev', 'card', 'howto', 'scores', 'attract'];
for (const link of LINKS) {
  const { p, ctx, errs, ext } = await page({}, link + (link.startsWith('room') || link.startsWith('boss') || link === 'greenroom' ? '&god=1&bot=1&players=2' : '')); await p.waitForTimeout(link === 'attract' ? 3500 : 3000);
  const v = await variance(p); if (v.sd < 6 || v.colors < 8) fail('deep link ' + link + ' draws a real frame', JSON.stringify(v)); if (errs.length) fail('deep link ' + link + ' console/page errors', errs.slice(0, 3).join(' | ')); if (ext.length) fail('external requests on ' + link, ext.join(','));
  const ge = await p.evaluate(() => MT.game.errors.length); if (ge) fail('engine errors on ' + link, String(ge)); await p.screenshot({ path: path.join(DEV, 'shots', 'link-' + link.replace(/[^a-z0-9]/gi, '_') + '.png') }); await ctx.close();
}
// keyboard from the title: Enter, Enter -> difficulty -> lobby
{ const { p, ctx, errs } = await page(); await p.waitForTimeout(2200); await p.keyboard.press('Enter'); await p.waitForTimeout(300); await p.keyboard.press('Enter'); await p.waitForTimeout(900); let sc = await p.evaluate(() => MT.game.sceneName); if (sc !== 'difficulty') fail('keyboard Enter x2 reaches difficulty', sc); await p.keyboard.press('Enter'); await p.waitForTimeout(900); sc = await p.evaluate(() => MT.game.sceneName); if (sc !== 'lobby') fail('Enter on difficulty reaches the lobby', sc);
  await p.keyboard.press('Escape'); await p.waitForTimeout(800); sc = await p.evaluate(() => MT.game.sceneName); if (sc !== 'difficulty') fail('Escape goes back', sc); if (errs.length) fail('keyboard flow errors', errs.join('|')); await ctx.close(); }
// mouse hover moves focus, click activates
{ const { p, ctx } = await page(); await p.waitForTimeout(2200); await p.keyboard.press('Enter'); await p.waitForTimeout(600);
  const pt = await p.evaluate(i => { const g = MT.game, S = g.screen, r = g.scene.menu.rects[i], rc = S.canvas.getBoundingClientRect(); const cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2; return [(cx * S.S + S.OX) / S.dpr + rc.left, (cy * S.S + S.OY) / S.dpr + rc.top]; }, 3);
  await p.mouse.move(pt[0] - 20, pt[1]); await p.mouse.move(pt[0], pt[1], { steps: 4 }); await p.waitForTimeout(300); const foc = await p.evaluate(() => MT.game.scene.menu.i); if (foc !== 3) fail('mouse hover moves the focus', String(foc)); await p.mouse.click(pt[0], pt[1]); await p.waitForTimeout(900); const sc = await p.evaluate(() => MT.game.sceneName); if (sc !== 'scores') fail('mouse click activates the item', sc); await ctx.close(); }
// pause menu has Dev mode, Episode map, How to play (in play)
{ const { p, ctx } = await page({}, 'room=1-1&god=1'); await p.waitForTimeout(2500); await p.keyboard.press('Escape'); await p.waitForTimeout(700); const txt = (await p.evaluate(() => document.body.innerText)).toLowerCase(); for (const s of ['Dev mode', 'Episode map', 'How to play']) if (!txt.includes(s.toLowerCase())) fail('pause menu has ' + s); await p.screenshot({ path: path.join(DEV, 'shots', 'pause.png') }); await ctx.close(); }
// touch emulation: notice
{ const { p, ctx } = await page({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true }); await p.waitForTimeout(2500); const t = await p.evaluate(() => ({ t: MT.touchOnly, s: MT.game.sceneName })); if (!t.t) fail('touch emulation shows the controller-or-keyboard notice', JSON.stringify(t)); await p.screenshot({ path: path.join(DEV, 'shots', 'touch.png') }); await ctx.close(); }
// two resolutions through the engine's own look-check
for (const [w, h] of [[1280, 720], [1920, 1080]]) { const { p, ctx, errs } = await page({ viewport: { width: w, height: h } }, 'room=1-1&god=1&bot=1&players=2'); await p.waitForTimeout(4000); const v = await variance(p); if (v.sd < 6) fail('room at ' + w + 'x' + h + ' draws', JSON.stringify(v)); if (errs.length) fail('errors at ' + w, errs[0]); await p.screenshot({ path: path.join(DEV, 'shots', 'room-' + w + '.png') }); await ctx.close(); }
await b.close();
if (fails.length) { console.log(fails.join('\n')); process.exit(1); } console.log('browser: ok');
