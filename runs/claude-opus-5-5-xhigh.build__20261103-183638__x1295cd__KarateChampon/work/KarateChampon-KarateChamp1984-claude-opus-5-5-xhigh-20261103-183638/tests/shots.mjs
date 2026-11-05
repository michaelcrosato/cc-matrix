// Screenshots of the bundle at deep links, for eye review only (tests/out/). Usage: node tests/shots.mjs [hash ...] [--wait ms] [--size WxH]
// Prints errors per page; with no hashes it shoots the standard set. Exit code 1 on any page error.
import { chromium } from 'playwright';
import { mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, basename } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..'), name = basename(root), file = join(root, '..', name + '.html');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args.splice(i, 2)[1] : d; };
const wait = +opt('wait', 2500), [w, h] = opt('size', '1280x720').split('x').map(Number), keys = opt('keys', '');
const hashes = args.length ? args : ['title', 'fight/dojo/kamaboko', 'fight/harbor/ebi', 'fight/bamboo/kikurage', 'fight/log/ika', 'fight/ship/buta', 'fight/market/asari', 'fight/fuji/kyabetsu', 'fight/stadium/mei', 'bonus/boards', 'bonus/pots', 'bonus/bull', 'practice/lessonI', 'lab/backKick', 'versus', 'records', 'about', 'attract'];
const out = join(root, 'tests/out'); mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'] });
let bad = 0;
for (const hs of hashes) {
  const p = await b.newPage({ viewport: { width: w, height: h } }), errs = [];
  p.on('pageerror', e => errs.push(String(e.stack || e).split('\n').slice(0, 3).join(' / '))); p.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && /my-3D2dge/.test(m.text()))) errs.push(m.text().slice(0, 300)); });
  await p.goto(pathToFileURL(file).href + '#' + hs); await p.waitForTimeout(wait);
  for (const k of keys ? keys.split(',') : []) { if (k.startsWith('wait')) await p.waitForTimeout(+k.slice(4)); else await p.keyboard.press(k); await p.waitForTimeout(120); }
  const f = join(out, hs.replace(/\//g, '_') + '.png'); await p.screenshot({ path: f });
  const errors = await p.evaluate(() => (window.__game ? window.__game.game.errors.map(e => e.message) : ['no game']));
  const all = errs.concat(errors); if (all.length) bad++;
  console.log((all.length ? 'ERR  ' : 'ok   ') + hs + (all.length ? ': ' + [...new Set(all)].slice(0, 4).join(' | ') : ''));
  await p.close();
}
await b.close(); process.exit(bad ? 1 : 0);
