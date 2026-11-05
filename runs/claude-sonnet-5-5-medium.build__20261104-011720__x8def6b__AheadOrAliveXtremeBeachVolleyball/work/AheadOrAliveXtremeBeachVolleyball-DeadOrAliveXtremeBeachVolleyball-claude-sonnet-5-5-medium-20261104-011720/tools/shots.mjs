// node tools/shots.mjs out-dir name1=js1 ...  : opens the built game, runs each snippet, screenshots after it
import { chromium } from 'playwright';
import { resolve, basename, dirname } from 'node:path'; import { pathToFileURL, fileURLToPath } from 'node:url'; import { mkdirSync } from 'node:fs';
const DEV = resolve(dirname(fileURLToPath(import.meta.url)), '..'); const file = resolve(DEV, '..', basename(DEV) + '.html');
const out = resolve(process.argv[2]); mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(pathToFileURL(file).href); await p.waitForTimeout(600);
await p.evaluate(() => { window.G = AOA; AOA.state = AOA.newState(77); AOA.reseedWorld(); AOA.installSaves(My3D2dge.current); window.g = My3D2dge.current; });
for (const a of process.argv.slice(3)) {
  const i = a.indexOf('='), name = a.slice(0, i), js = a.slice(i + 1);
  try { await p.evaluate(js); } catch (e) { errs.push(name + ': ' + e.message); }
  await p.waitForTimeout(900); await p.screenshot({ path: out + '/' + name + '.png' });
}
console.log('errors:', errs.slice(0, 6));
await b.close();
