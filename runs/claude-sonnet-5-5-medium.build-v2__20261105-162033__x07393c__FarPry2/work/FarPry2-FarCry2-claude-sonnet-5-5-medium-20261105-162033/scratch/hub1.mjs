import { chromium } from 'playwright';
import { serveSite, CHROME_FLAGS } from '../tests/lib/serve.mjs';
process.env.PLAYWRIGHT_HOST_PLATFORM_OVERRIDE ||= 'ubuntu24.04-x64';
const sc = process.argv[2] || 'players=2&auto=1';
const srv = await serveSite(); const b = await chromium.launch({ args: CHROME_FLAGS });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
p.on('pageerror', (e) => errs.push(String(e).slice(0, 200))); p.on('console', (m) => { if (m.type() === 'error') errs.push('console ' + m.text().slice(0, 200)); });
await p.goto(`http://127.0.0.1:${srv.port}/harness.html?game=game.html&${sc}`);
const t0 = Date.now();
for (let i = 0; i < 24; i++) {
  await p.waitForTimeout(5000);
  const r = await p.evaluate(() => ({ done: document.body.dataset.complete, pass: window.__hubCheck?.pass, failed: (window.__hubCheck?.checks || []).filter((c) => !c.pass).map((c) => c.name + ': ' + c.detail) })).catch((e) => ({ err: String(e) }));
  console.log(((Date.now() - t0) / 1000).toFixed(0) + 's', JSON.stringify(r).slice(0, 600));
  if (r.done === 'true') break;
}
console.log('errors', errs.slice(0, 5));
await b.close(); srv.stop();
