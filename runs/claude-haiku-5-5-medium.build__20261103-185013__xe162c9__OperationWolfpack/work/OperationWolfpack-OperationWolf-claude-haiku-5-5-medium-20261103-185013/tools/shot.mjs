// Screenshots for visual review only (never bundled): node tools/shot.mjs [outdir]. It opens the built HTML from file://
// in headless Chromium (the pinned Playwright under vendor/pw), starts a battle, and saves a frame of each screen.
import { chromium } from '../vendor/pw/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { TITLE_FILE } from './files.mjs';

const out = path.resolve(process.argv[2] || 'shots');
mkdirSync(out, { recursive: true });
const html = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', TITLE_FILE + '.html');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const frame = async name => { await page.waitForTimeout(250); await page.screenshot({ path: path.join(out, name + '.png') }); };
const go = async (hash, wait) => { await page.goto('about:blank'); await page.goto(pathToFileURL(html).href + '#' + hash); await page.waitForTimeout(wait || 600); };

await go('', 800); await frame('title');
await go('attract', 1500); await frame('attract');
await go('op1', 300); await page.waitForFunction(() => WP.game.sceneName === 'play' && WP.game.debug.battle()); await page.waitForTimeout(2500); await frame('op1-play');
await go('op2', 300); await page.waitForFunction(() => WP.game.sceneName === 'play' && WP.game.debug.battle() && WP.game.debug.battle().opId === 'op2'); await page.waitForTimeout(3000); await frame('op2-play');
// a battle with the bot playing, invulnerable: enemies, telegraph rings, a grenade and the crosshair on a target
await go('op1', 300); await page.waitForFunction(() => WP.game.sceneName === 'play' && WP.game.debug.battle() && WP.game.debug.battle().op.length > 0);
await page.evaluate(() => { WP.game.debug.battle().god = true; WP.game.debug.battle().infinite = true; WP.game.debug.override((b, dt) => WP.bot(b, dt)); });
await page.waitForFunction(() => WP.game.debug.battle().dist > 700, null, { timeout: 120000 }); await page.waitForTimeout(400); await frame('op1-bot');
await page.evaluate(() => WP.game.debug.override(null));
// enemies on screen: soldiers up with closing rings, a jeep, a civilian, a crate
await page.evaluate(() => {
  const b = WP.game.debug.battle(); b.override = null; WP.game.debug.override(() => ({}));
  const up = (x, z, tg) => { const s = b.spawn('soldier', x, z, {}); s.state = 'up'; s.rise = 1; s.t = 99; s.cd = 99; s.tg = tg; return s; };
  up(b.camX - 40, 120, 0.25); up(b.camX + 5, 150, 0.7); up(b.camX + 60, 135, 0);
  const j = b.spawn('jeep', b.camX - 90, 165, {}); j.vx = 0; j.cd = 99; j.tg = 0.4;
  b.spawn('civilian', b.camX + 110, 140, { vx: 0 }); b.spawn('crate', b.camX - 150, 150, {});
  b.god = true;
});
await page.waitForTimeout(150); await frame('enemies');
await go('dev', 500); await frame('dev');
await go('about', 500); await frame('about');
await go('lost', 1500); await frame('lost');
await go('scores', 500); await frame('scores');
// the last two operations: night at the Kennel, and the storm with the cargo plane overhead
for (const [op, name] of [['op5', 'op5-night'], ['op6', 'op6-storm']]) {
  await go('', 300);
  await page.evaluate(id => WP.game.debug.start(id, { seed: 5 }), op);
  await page.waitForFunction(id => WP.game.sceneName === 'play' && WP.game.debug.battle() && WP.game.debug.battle().opId === id, op, { timeout: 30000 });
  await page.evaluate(() => { const b = WP.game.debug.battle(); b.god = true; b.infinite = true; WP.game.debug.override((bb, dt) => WP.bot(bb, dt)); });
  await page.waitForFunction(() => WP.game.debug.battle().dist > 500, null, { timeout: 120000 }); await page.waitForTimeout(300);
  await frame(name);
  await page.evaluate(() => WP.game.debug.override(null));
}
console.log(errors.length ? 'errors: ' + errors.join(' | ') : 'no page errors');
await browser.close();
