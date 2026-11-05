// The AI Hub harness driver: node tools/hub-check.mjs <base url> [query ...] — loads harness.html?game=game.html&<query>,
// waits for document.body.dataset.complete, prints pass and the failed checks
import { createRequire } from 'node:module';
const { chromium } = createRequire(new URL('../engine/package.json', import.meta.url))('playwright');
const [, , base, ...queries] = process.argv;
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
let allPass = true;
for (const q of queries) {
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(base + '/harness.html?game=game.html&' + q);
  const t0 = Date.now(); let done = false;
  while (Date.now() - t0 < 240000) { done = await p.evaluate(() => document.body.dataset.complete === 'true').catch(() => false); if (done) break; await p.waitForTimeout(1000); }
  const r = await p.evaluate(() => { const c = window.__hubCheck || {}; const fails = []; const walk = (o, k) => { if (!o || typeof o !== 'object') return; if (o.ok === false || o.pass === false) fails.push(k + ': ' + (o.detail || o.message || o.note || JSON.stringify(o).slice(0, 160))); for (const kk in o) if (o[kk] && typeof o[kk] === 'object') walk(o[kk], k + '.' + kk); }; walk(c, 'check'); return { pass: c.pass, fails: fails.slice(0, 12), text: (document.querySelector('#checks, .checks, ul') || document.body).innerText.slice(0, 1500) }; });
  console.log(q, '=> pass', r.pass, 'complete', done, errs.length ? 'pageErrors ' + errs.slice(0, 2) : ''); if (!r.pass) { console.log(r.fails.join('\n')); console.log(r.text); allPass = false; }
  await p.close();
}
await b.close(); process.exit(allPass ? 0 : 1);
