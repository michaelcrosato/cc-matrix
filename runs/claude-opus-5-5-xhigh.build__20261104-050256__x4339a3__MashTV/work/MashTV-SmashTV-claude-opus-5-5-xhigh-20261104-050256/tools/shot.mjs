// node tools/shot.mjs <hash> [<hash> ...] [--wait ms] [--size WxH] [--keys "Enter,wait:500,KeyD"]: screenshots of the
// deliverable over file:// into shots/, and every console or page error printed.
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { OUT } from './build.mjs';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const wait = +(opt('--wait') || 2500), size = (opt('--size') || '1280x720').split('x').map(Number), keys = opt('--keys');
const hashes = args.length ? args : ['title'];
mkdirSync(join(root, 'shots'), { recursive: true });
const url = pathToFileURL(join(root, '..', OUT + '.html')).href;
const browser = await chromium.launch();
for (const h of hashes) {
  const page = await browser.newPage({ viewport: { width: size[0], height: size[1] } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(url + '#' + h);
  await page.waitForTimeout(wait);
  if (keys) for (const k of keys.split(',')) { if (k.startsWith('wait:')) await page.waitForTimeout(+k.slice(5)); else await page.keyboard.press(k); }
  if (keys) await page.waitForTimeout(800);
  const name = h.replace(/[^a-z0-9]+/gi, '_') || 'title';
  await page.screenshot({ path: join(root, 'shots', name + '.png') });
  const snap = await page.evaluate(() => { try { const g = window.MT && window.MT.game; return { scene: g && g.sceneName, errors: g ? g.errors.map(e => e.where + ': ' + e.message) : ['no game'], snap: g && g.debug ? g.debug.snapshot() : null }; } catch (e) { return { err: String(e) }; } });
  console.log('#' + h, JSON.stringify({ scene: snap.scene, errors: snap.errors, phase: snap.snap && snap.snap.phase }), errs.length ? '\n  ' + errs.slice(0, 8).join('\n  ') : '');
  await page.close();
}
await browser.close();
