// The AI Hub harness, four scenarios, run one at a time against the built single file.
import { chromium } from 'playwright';
import { serveSite, CHROME_FLAGS } from '../lib/serve.mjs';
export const covers = ['src', 'vendor/hub', 'tools'];
const SCENARIOS = ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave', 'players=2&auto=1&scenario=server'];
export async function run(t) {
  process.env.PLAYWRIGHT_HOST_PLATFORM_OVERRIDE ||= 'ubuntu24.04-x64';
  const srv = await serveSite();
  const browser = await chromium.launch({ args: CHROME_FLAGS });
  try {
    for (const sc of SCENARIOS) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      const errs = [];
      page.on('pageerror', (e) => errs.push(String(e)));
      const html = await (await fetch(`http://127.0.0.1:${srv.port}/game.html`)).text(); const title = (/<title>(.*?)<\/title>/.exec(html) || [])[1];
      t.eq(title, 'Far Pry 2', 'served page title');
      await page.goto(`http://127.0.0.1:${srv.port}/harness.html?game=game.html&${sc}`);
      try { await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 120000 }); } catch { t.fail(`${sc}: harness never completed`); await page.close(); continue; }
      const res = await page.evaluate(() => ({ pass: window.__hubCheck.pass, checks: window.__hubCheck.checks }));
      t.ok(res.pass, `hub ${sc}`);
      if (!res.pass) for (const c of res.checks || []) if (c && (c.ok === false || c.pass === false)) t.fail(`  check failed: ${JSON.stringify(c).slice(0, 300)}`);
      await page.close();
    }
  } finally { await browser.close(); srv.stop(); }
}
