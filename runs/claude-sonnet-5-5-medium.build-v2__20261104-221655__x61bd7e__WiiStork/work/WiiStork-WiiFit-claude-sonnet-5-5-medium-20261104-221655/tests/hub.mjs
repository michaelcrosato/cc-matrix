// hub group: the AI Hub harness at five settings, then the game alone
import { spawn } from 'node:child_process'; import { chromium } from 'playwright'; import { copyFileSync } from 'node:fs';
const SETTINGS = ['players=1&auto=1', 'players=2&auto=1', 'players=3&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave'];
export async function run(T) {
  const dir = new URL('./hub/', import.meta.url).pathname;
  const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
  const port = await new Promise((res, rej) => { let buf = ''; const on = d => { buf += d; const m = buf.match(/port (\d+)/); if (m) res(+m[1]); }; srv.stdout.on('data', on); srv.stderr.on('data', on); setTimeout(() => rej(new Error('no port')), 8000); });
  let browser;
  try {
    const head = await (await fetch(`http://127.0.0.1:${port}/game.html`)).text(); T.ok(/Wii Stork/.test(head) && /hub:session-mode/.test(head), 'served page is the game');
    browser = await chromium.launch({ args: ['--use-gl=swiftshader'] });
    for (const q of SETTINGS) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }), page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e)));
      await page.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&${q}`);
      try { await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 280000 }); } catch (e) { T.ok(false, 'hub ' + q + ' did not complete'); }
      const res = await page.evaluate(() => ({ pass: window.__hubCheck && window.__hubCheck.pass, checks: window.__hubCheck && window.__hubCheck.checks }));
      T.ok(!!res.pass, 'hub harness ' + q + ': ' + JSON.stringify((res.checks || []).filter && (res.checks || []).filter(c => !c.pass && !c.ok).slice(0, 4)).slice(0, 600)); T.ok(!errs.length, 'hub page errors ' + errs.slice(0, 2).join(' | '));
      await ctx.close();
    }
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }), page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e)));
    await page.goto(`http://127.0.0.1:${port}/game.html`); await page.waitForFunction(() => window.G && G.game && G.game.sceneName === 'title', null, { timeout: 30000 }).catch(() => {}); T.ok(await page.evaluate(() => G.game.sceneName) === 'title', 'game alone reaches the title'); T.ok(!errs.length, 'standalone errors ' + errs.join('|')); await ctx.close();
  } finally { if (browser) await browser.close(); srv.kill(); }
}
