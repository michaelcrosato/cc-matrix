// screenshots of deep links: node tools/shots.mjs out-prefix "hash1" "hash2" ... (waits WAIT ms each; W x H)
import { chromium } from 'playwright';
const [prefix, ...hashes] = process.argv.slice(2), W = +(process.env.W || 1280), H = +(process.env.H || 720), WAIT = +(process.env.WAIT || 4000);
const root = new URL('..', import.meta.url).pathname, NAME = 'TideCrisis3-TimeCrisis3-claude-opus-5-5-medium-20261103-183213';
const url = process.env.DEV ? 'file://' + root + 'index.html' : 'file://' + root + '../' + NAME + '.html';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
for (let i = 0; i < hashes.length; i++) {
  const p = await b.newPage({ viewport: { width: W, height: H } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(url + '#' + hashes[i]); await p.waitForTimeout(WAIT);
  await p.screenshot({ path: `${prefix}-${i}.png` });
  const snap = await p.evaluate(() => { try { return JSON.stringify(My3D2dge.current.debug.snapshot()); } catch (e) { return String(e); } });
  console.log(i, hashes[i], snap.slice(0, 300)); if (errs.length) console.log('ERRORS', errs.slice(0, 4).join(' | '));
  await p.close();
}
await b.close();
