// A whole-game playthrough on the single-file bundle, in Chromium: a three-inning CPU game from the attract match to its
// final, then the results screen. node tests/bundle-playthrough.mjs. Prints one line; exit 1 on failure.
import { chromium } from 'playwright';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bundle = join(root, '..', 'BatzookaBaseball-Baseball-claude-haiku-5-5-medium-20261104-060643.html');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto(pathToFileURL(bundle).href + '#attract');
await page.waitForFunction(() => window.My3D2dge && My3D2dge.current && My3D2dge.current.debug, null, { timeout: 60000 });
// start a CPU-only three-inning match, then wait for its final
await page.evaluate(() => My3D2dge.current.debug.warp('match', { human: [false, false], innings: 3 }));
const snap = () => page.evaluate(() => My3D2dge.current.debug.snapshot());
let s = null;
const deadline = Date.now() + 360000;
while (Date.now() < deadline) {
  await page.waitForTimeout(2000);
  s = await snap();
  if (s.scene === 'results' || (s.over && s.phase === 'final')) break;
}
const reached = s && (s.scene === 'results' || s.over);
await page.waitForTimeout(500);
const after = await snap();
const ok = reached && after.errors === 0 && errors.length === 0;
console.log(ok
  ? `bundle playthrough passed: ${after.scene}, final ${s.score.join('-')} after ${s.inning} innings`
  : `bundle playthrough FAILED: scene ${after.scene}, over ${s && s.over}, errors ${errors.length}`);
await browser.close();
process.exit(ok ? 0 : 1);
