// The Debug tab's overlays draw in a real frame without errors (all on at once, at a built-up story beat).
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = createRequire(path.join(root, 'engine/package.json'))('playwright');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; page.on('pageerror', e => errs.push(String(e)));
await page.goto('file://' + path.resolve(root, '..', path.basename(root) + '.html'));
await page.waitForFunction(() => window.My3D2dge && My3D2dge.current && My3D2dge.current.sceneName === 'title', null, { timeout: 30000 });
const r = await page.evaluate(async () => {
  const G = My3D2dge.current; G.go('play', { fresh: true, skipIntro: true }); await new Promise(r => setTimeout(r, 800));
  G.debug.beat('hall'); G.debug.teleport(72, 79); const ctx = G.debug.ctx; ctx.monsters.spawnCell('lintling', 76, 80);
  for (const k of ['showCollide', 'showRooms', 'showNav', 'showAggro', 'showLights', 'showPattern', 'perf']) DQ.dev[k] = true;
  ctx.town.layPattern('hall', 74, 61, 9, 0); await new Promise(r => setTimeout(r, 1500));
  const out = { frames: G.stats.items, errors: G.errors.map(e => e.message) };
  for (const k of ['showCollide', 'showRooms', 'showNav', 'showAggro', 'showLights', 'showPattern', 'perf']) DQ.dev[k] = false;
  return out;
});
console.log((r.errors.length || errs.length ? 'FAIL' : 'PASS') + ' every Debug overlay draws in a real frame without errors' + (r.errors.length || errs.length ? ': ' + r.errors.concat(errs).join('; ') : ''));
console.log((r.frames > 0 ? 'PASS' : 'FAIL') + ' the frame with overlays drew its queue (' + r.frames + ' items)');
await page.screenshot({ path: path.join(root, 'check-output', 'overlays.png') });
await browser.close();
