// screenshots of the deliverable over file:// (deep links), with console errors
import { chromium } from 'playwright';
import { resolve } from 'node:path';
const file = resolve(process.argv[2]), links = process.argv.slice(3);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; p.on('pageerror', e => errors.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
p.on('request', r => { const u = r.url(); if (!u.startsWith('file:') && !u.startsWith('data:') && !u.startsWith('blob:')) errors.push('external request ' + u); });
for (const l of links) {
  const [hash, wait = '2500'] = l.split('@');
  await p.goto('about:blank'); await p.goto('file://' + file + '#' + hash); await p.waitForTimeout(+wait);
  await p.screenshot({ path: 'shots/' + hash.replace(/[^a-z0-9-]/gi, '_') + '.png' });
  const s = await p.evaluate(() => window.My3D2dge && window.My3D2dge.current && window.My3D2dge.current.debug && JSON.stringify(window.My3D2dge.current.debug.snapshot()).slice(0, 300));
  console.log(hash, s);
}
console.log(errors.slice(0, 10).join('\n') || 'no errors');
await b.close();
