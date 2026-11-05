// The AI Hub harness (vendor/aihub/harness.html) over the built game: the four scenarios the hub runs, then the game on
// its own. Served from 127.0.0.1 at an OS-picked port; only that server's PID is stopped.
import { chromium } from '../../engine/node_modules/playwright/index.mjs';
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { serve } from '../../tools/hub-serve.mjs';
process.env.TMPDIR = new URL('../../check-output/tmp/', import.meta.url).pathname;   // (the shared /tmp may be full)
export default async function ({ check, DEV }) {
  const dir = join(DEV, 'check-output', 'hub'); mkdirSync(dir, { recursive: true });
  const html = readdirSync(join(DEV, '..')).find(f => f.startsWith('DragonQuiltBuilders') && f.endsWith('.html'));
  copyFileSync(join(DEV, '..', html), join(dir, 'game.html'));
  for (const f of ['harness.html', 'bridge.js', 'round.js', 'session.js']) copyFileSync(join(DEV, 'vendor/aihub', f), join(dir, f));
  const srv = await serve(dir), base = 'http://127.0.0.1:' + srv.port + '/';
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const r = await page.goto(base + 'game.html'); const title = await page.title();
    check('the served page is this game', r && r.ok() && /Dragon Quilt Builders/.test(title), title);
    await page.waitForFunction(() => window.My3D2dge && My3D2dge.current && My3D2dge.current.sceneName === 'title', null, { timeout: 30000 }).catch(() => {});
    check('outside a session the game reaches its title', await page.evaluate(() => window.My3D2dge && My3D2dge.current && My3D2dge.current.sceneName) === 'title');
    await page.close();
    for (const q of ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave', 'players=2&scenario=server&auto=1']) {
      const p = await browser.newPage({ viewport: { width: 1600, height: 900 } });
      await p.goto(base + 'harness.html?game=game.html&' + q);
      const ok = await p.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 240000 }).then(() => true).catch(() => false);
      const res = await p.evaluate(() => window.__hubCheck || null);
      const bad = res ? res.checks.filter(c => !c.pass).map(c => c.name + ' (' + c.detail + ')') : ['no result'];
      check('hub harness ' + q, ok && res && res.pass === true, bad.join(' | ').slice(0, 900));
      await p.close();
    }
  } finally { await browser.close(); srv.stop(); }
}
