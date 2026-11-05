// Screenshots for what scripts can't judge: node tests/browser/shots.mjs [name ...]  (writes check-output/*.png)
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
const require = createRequire(path.join(root, 'engine/package.json'));
const { chromium } = require('playwright');
const html = 'file://' + path.resolve(root, '..', path.basename(root) + '.html');
const only = process.argv.slice(2).filter(a => !a.startsWith('--'));
const size = (process.argv.find(a => a.startsWith('--size=')) || '--size=1280x720').slice(7).split('x').map(Number);
const SHOTS = [
  ['title', `null`],
  ['hollow', `G().go('play', { fresh: true, skipIntro: true })`, 2],
  ['glen', `G().debug.teleport(60, 60); `, 1.5],
  ['town-lv1', `G().debug.beat('banner')`, 1.5],
  ['town-lv4', `G().debug.beat('hall'); G().debug.teleport(72, 79)`, 2],
  ['inside', `G().debug.teleport(61, 71)`, 1.5],
  ['satchel', `G().debug.ctx.ui.open('satchel', { tab: 0 })`, .6],
  ['craft', `G().debug.ctx.ui.close(); G().debug.ctx.ui.open('craft', { station: 'bench' })`, .6],
  ['map', `G().debug.ctx.ui.close(); G().debug.ctx.ui.open('satchel', { tab: 1 })`, .6],
  ['journal', `G().debug.ctx.ui.close(); G().debug.ctx.ui.open('satchel', { tab: 2 })`, .6],
  ['dev', `G().debug.ctx.ui.close(); G().debug.ctx.ui.open('dev', {})`, .6],
  ['night', `G().debug.ctx.ui.close(); G().debug.ctx.clock.set(22); G().debug.teleport(72, 82)`, 2],
  ['crags', `G().debug.ctx.clock.set(11); G().debug.teleport(50, 30)`, 1.5],
  ['quarry', `G().debug.teleport(26, 18)`, 1.5],
  ['tweedwood', `G().debug.teleport(116, 33)`, 1.5],
  ['coast', `G().debug.teleport(22, 129)`, 1.5],
  ['fraying', `G().debug.teleport(110, 118)`, 2],
  ['spire', `G().debug.teleport(124, 124, 22)`, 2],
  ['siege', `G().debug.beat('siege'); G().debug.ctx.siege.start({ prep: 0 }); G().debug.ctx.siege.nextWave()`, 5],
  ['boss', `G().debug.beat('boss'); G().debug.teleport(92, 80)`, 3],
  ['about', `G().debug.ctx.ui.open('about', {})`, .6],
  ['bee', `G().debug.ctx.ui.close(); G().go('bee', { solo: true })`, 6],
  ['attract', `G().go('attract')`, 9],
];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: size[0], height: size[1] } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(html);
await page.waitForFunction(() => window.My3D2dge && My3D2dge.current && My3D2dge.current.sceneName === 'title', null, { timeout: 30000 });
await page.evaluate(() => { window.G = () => My3D2dge.current; });
for (const [name, code, wait] of SHOTS) {
  await page.evaluate(code);
  await page.waitForTimeout((wait || 1) * 1000);
  if (only.length && !only.includes(name)) continue;
  await page.screenshot({ path: path.join(root, 'check-output', name + '.png') });
}
const gameErrors = await page.evaluate(() => My3D2dge.current.errors.map(e => e.where + ': ' + e.message));
console.log('errors:', JSON.stringify(errors.concat(gameErrors).slice(0, 10)));
await browser.close();
