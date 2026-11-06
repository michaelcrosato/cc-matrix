// The AI Hub harness against the built file: all four scenarios, one at a time.
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from '../lib/browser.mjs';
import { serve } from '../lib/server.mjs';
import { ROOT, OUT } from '../lib/paths.mjs';
export const name = 'hub';
export const covers = ['src', 'vendor', 'tools', 'pixel-engine.js'];
export const needsBuild = true;
const SCENARIOS = ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave', 'players=2&auto=1&scenario=server'];
export async function run(t) {
  const site = join(ROOT, 'tests', '.site');
  mkdirSync(site, { recursive: true });
  copyFileSync(OUT, join(site, 'game.html'));
  for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(join(ROOT, 'vendor', 'hub', f), join(site, f));
  const server = await serve(site);
  const browser = await launch();
  try {
    const titleHtml = await (await fetch(`${server.url}/game.html`)).text();
    const { GAME_TITLE } = await import('../../src/content/title.js');
    t.ok('served page is the game', titleHtml.includes(`<title>${GAME_TITLE}</title>`));
    for (const sc of SCENARIOS) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      const page = await ctx.newPage();
      await page.goto(`${server.url}/harness.html?game=game.html&${sc}`);
      let done = false;
      try { await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 150000 }); done = true; } catch { done = false; }
      const report = await page.evaluate(() => window.__hubCheck ? { pass: window.__hubCheck.pass, checks: window.__hubCheck.checks } : null);
      t.ok(`hub ${sc}: completes`, done);
      t.ok(`hub ${sc}: pass`, !!(report && report.pass), report ? report.checks.filter((c) => !c.pass && !c.ok).map((c) => `${c.name}: ${c.detail ?? ''}`).join(' | ') : 'no report');
      await ctx.close();
    }
  } finally {
    await browser.close();
    server.stop();
  }
}
