// screenshots of set-up moments (what a script can't judge): node tools/moments.mjs [names...]
import { createRequire } from 'node:module'; import { join, dirname } from 'node:path'; import { pathToFileURL, fileURLToPath } from 'node:url';
import { NAME } from './name.mjs';
const DEV = join(dirname(fileURLToPath(import.meta.url)), '..'), require = createRequire(join(DEV, 'handoff', 'package.json')), { chromium } = require('playwright');
const FILE = pathToFileURL(join(DEV, '..', NAME + '.html')).href;
const C = 'const B = window.__BENTOU, g = window.My3D2dge.current, M = B.M, h = M && M.hero; B.Cutscene.clear();';
const MOMENTS = {
  cut: ['m1', C + "const v = M.guards.find(x => x.id === 'south3'); h.x = v.x - Math.cos(v.facing) * 14; h.y = v.y - Math.sin(v.facing) * 14; B.SilentCut.run(h, 'back', v, M);", 450],
  rain: ['m2', C + "g.debug.teleport(44.5 * 16, 21 * 16, 0); M.cheats.invisible = true;", 2500],
  keep: ['m3', C + "g.debug.teleport(20.5 * 16, 24.5 * 16, 64); M.cheats.invisible = true;", 2500],
  boss: ['m1', C + "M.cheats.god = true; const b = M.bosses[0]; g.debug.teleport(b.x + 40, b.y, 0); B.Bosses.start(b, M);", 4200],
  oni: ['m3', C + "M.cheats.god = true; const b = M.bosses[0]; g.debug.teleport(b.x + 36, b.y, 160); B.Bosses.start(b, M); b.hp = b.maxHp * .45; M.objectives[0].state = 'done';", 4500],
  hotaru: ['m2', C + "M.cheats.god = true; const b = M.bosses[0]; g.debug.teleport(b.x + 40, b.y, 0); B.Bosses.start(b, M);", 3800],
  swim: ['m1', C + "g.debug.teleport(40 * 16, 43 * 16, 0); M.cheats.invisible = true;", 1500],
  results: ['training', C + "g.debug.win('Makunouchi');", 8000],
  hall: ['m1', C + "g.debug.teleport(28.5 * 16, 8.5 * 16, 0); M.cheats.invisible = true;", 2500],
  market: ['m1', C + "g.debug.teleport(27.5 * 16, 25 * 16, 0); M.cheats.invisible = true; g.debug.alert('sam1');", 3500],
  focus: ['m3', C + "g.debug.teleport(26 * 16, 43 * 16, 0); M.cheats.invisible = true; B.testIntent = { focusDown: true };", 2000],
  about: ['about', '', 1200]
};
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(MOMENTS);
const browser = await chromium.launch(); 
for (const n of names) {
  const [hash, js, wait] = MOMENTS[n]; const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(FILE + '#' + hash); await page.waitForTimeout(4000);   // (past the boot screen's fade)
  if (js) await page.evaluate(js); await page.waitForTimeout(wait);
  await page.screenshot({ path: join(DEV, 'shots', n + '.png') }); console.log(n, errs.length ? errs.join(' | ') : 'ok'); await page.close();
}
await browser.close();
