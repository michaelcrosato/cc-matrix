// Screenshots of deep links for eye review only (tests/out). Fails only on page errors.
import { chromium } from '../engine/node_modules/playwright/index.mjs';
const B = new URL('../../KarateChampon-KarateChamp1984-claude-opus-5-5-medium-20261103-183848.html', import.meta.url).href;
const links = process.argv.slice(2);
const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
for (const l of links) {
  const [hash, wait = '2500', ...keys] = l.split(':');
  await pg.goto('about:blank'); await pg.goto(B + '#' + hash); await pg.waitForTimeout(+wait);
  for (const k of keys) { if (k.startsWith('w')) await pg.waitForTimeout(+k.slice(1)); else { await pg.keyboard.press(k); await pg.waitForTimeout(150); } }
  await pg.screenshot({ path: new URL('out/' + hash.replace(/\//g, '_') + (keys.length ? '_' + keys.length : '') + '.png', import.meta.url).pathname });
  const n = await pg.evaluate(() => (window.My3D2dge && window.My3D2dge.current.errors.map(e => e.message)) || []); if (n.length) errs.push(hash + ': ' + n.join(' | '));
}
await br.close(); console.log(errs.length ? 'ERRORS: ' + errs.join('\n') : 'shots ok');
