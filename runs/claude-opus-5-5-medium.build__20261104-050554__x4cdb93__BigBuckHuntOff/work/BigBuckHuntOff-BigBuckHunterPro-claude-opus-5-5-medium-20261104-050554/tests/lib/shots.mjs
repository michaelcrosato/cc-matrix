// screenshots of deep links of the bundle: node tests/lib/shots.mjs [waitMs] link1 link2 ...
import { chromium } from 'playwright';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = resolve(ROOT, '..', 'BigBuckHuntOff-BigBuckHunterPro-claude-opus-5-5-medium-20261104-050554.html');
const [, , wait = '8000', ...links] = process.argv;
const b = await chromium.launch();
for (const l of links) {
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + FILE + '#' + l); await p.waitForTimeout(+wait);
  const name = l.replace(/\//g, '-') || 'root';
  await p.screenshot({ path: join(ROOT, 'tests/out', name + '.png') });
  const snap = await p.evaluate(() => { try { const s = My3D2dge.current.debug.snapshot(); return s.scene + ' ' + (s.site || '') + ' errors ' + s.errors; } catch (e) { return 'no snapshot ' + e.message; } });
  console.log(l, '->', snap, errs.length ? 'ERRORS ' + errs.join(' | ') : '');
  await p.close();
}
await b.close();
