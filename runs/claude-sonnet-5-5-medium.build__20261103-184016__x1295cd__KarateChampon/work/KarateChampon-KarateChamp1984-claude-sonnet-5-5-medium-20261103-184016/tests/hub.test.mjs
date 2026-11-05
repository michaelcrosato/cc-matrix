import { chromium } from '../engine/node_modules/playwright/index.mjs'; import path from 'node:path'; import fs from 'node:fs'; import { spawn } from 'node:child_process';
export default async t => {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), name = path.basename(root), dir = path.join(root, 'tests/hubsite');
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true }); for (const f of ['harness.html', 'bridge.js', 'round.js']) fs.copyFileSync(path.join(root, 'vendor/aihub', f), path.join(dir, f)); fs.copyFileSync(path.join(root, '..', name + '.html'), path.join(dir, 'game.html'));
  const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
  let port = 0; await new Promise(res => { srv.stdout.on('data', d => { const m = /port (\d+)/.exec(String(d)); if (m) { port = +m[1]; res(); } }); setTimeout(res, 8000); });
  try {
    const r = await fetch(`http://127.0.0.1:${port}/game.html`); const txt = await r.text(); t.check('the served page is Karate Champon', txt.includes('<title>Karate Champon'), txt.slice(0, 80));
    const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
    const runs = [['2 players', 'players=2&auto=1'], ['4 players, latency 150, jitter 50, loss 5', 'players=4&latency=150&jitter=50&loss=5&auto=1'], ['host leaves', 'players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave'], ['server hosts', 'players=2&scenario=server&auto=1']];
    for (const [label, q] of runs) {
      const page = await browser.newPage({ viewport: { width: 1000, height: 700 } }); const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
      try { await page.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&${q}`); await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 150000 }); const res = await page.evaluate(() => JSON.parse(JSON.stringify(window.__hubCheck || {})));
        const bad = (res.checks || []).filter(c => c.ok === false || c.pass === false); t.check(`hub harness: ${label}`, res.pass === true, JSON.stringify(bad).slice(0, 600) || JSON.stringify(res).slice(0, 400)); if (errs.length) t.check(`hub harness page errors: ${label}`, false, errs.join('|')); }
      catch (e) { t.check(`hub harness: ${label}`, false, String(e).slice(0, 300)); }
      await page.close();
    }
    await browser.close();
  } finally { srv.kill(); }
};
