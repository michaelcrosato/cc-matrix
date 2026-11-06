// Plays the harness at the five settings the hub uses. Serves tests/hub on a port the OS picks; stops only that server.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const Q = ['players=1&auto=1', 'players=2&auto=1', 'players=3&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave'];
export async function run(ok) {
  const dir = new URL('./hub/', import.meta.url).pathname, srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
  const port = await new Promise((res, rej) => { let b = ''; const f = d => { b += d; const m = b.match(/port (\d+)/); if (m) res(+m[1]); }; srv.stdout.on('data', f); srv.stderr.on('data', f); setTimeout(() => rej(new Error('no port')), 8000); });
  const base = 'http://127.0.0.1:' + port + '/', browser = await chromium.launch();
  try {
    const only = process.env.HUBQ ? [process.env.HUBQ] : Q;
    for (const q of only) { const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); const url = base + 'harness.html?game=game.html&' + q; await page.goto(url); let done = false; for (let i = 0; i < 300 && !done; i++) { await page.waitForTimeout(2000); done = await page.evaluate(() => document.body.dataset.complete === 'true'); } const r = await page.evaluate(() => window.__hubCheck || null); ok(done && r && r.pass, 'harness ' + q + ': ' + JSON.stringify(r && (r.checks || r).filter ? (r.checks || []).filter(c => !c.ok && !c.pass) : r).slice(0, 600)); await page.close(); }
    const page = await browser.newPage(); await page.goto(base + 'game.html'); let name = null; for (let i = 0; i < 30 && name !== 'title'; i++) { await page.waitForTimeout(500); name = await page.evaluate(() => { try { return G.game.sceneName; } catch (e) { return 'no'; } }); } ok(name === 'title', 'game on its own reaches the title: ' + name); await page.close();
  } finally { await browser.close(); srv.kill(); }
}
