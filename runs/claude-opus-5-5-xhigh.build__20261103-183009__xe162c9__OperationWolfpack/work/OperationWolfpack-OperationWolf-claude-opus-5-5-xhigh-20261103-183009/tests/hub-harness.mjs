// The real AI Hub harness (17.3): the final .html and the harness files served from one origin (127.0.0.1, a port the OS
// picks), each configuration opened in Playwright until body[data-complete], then window.__hubCheck.pass required.
// Prints only failures; returns { passed, failed }. The server is stopped by its PID, and only that one.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib.mjs';
export const NAME = 'OperationWolfpack-OperationWolf-claude-opus-5-5-xhigh-20261103-183009.html';
export const CONFIGS = ['players=1&auto=1', 'players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&scenario=host-leave&auto=1', 'players=2&scenario=server&auto=1'];
export async function runHarness(configs = CONFIGS, o = {}) {
  const dir = join(ROOT, 'tests', '.serve'); mkdirSync(dir, { recursive: true });
  copyFileSync(join(ROOT, '..', NAME), join(dir, NAME));
  for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(join(ROOT, 'hub', f), join(dir, f));
  const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
  let browser = null, passed = 0, failed = 0;
  try {
    const port = await new Promise((res, rej) => { let buf = ''; const on = d => { buf += d; const m = /port (\d+)/.exec(buf); if (m) res(+m[1]); }; srv.stdout.on('data', on); srv.stderr.on('data', on); setTimeout(() => rej(new Error('no port')), 8000); });
    browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
    for (const cfg of configs) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      const url = `http://127.0.0.1:${port}/harness.html?game=${NAME}&${cfg}`;
      await page.goto(url);
      // first confirm the frames hold our game
      let ours = false;
      for (let i = 0; i < 40 && !ours; i++) { await page.waitForTimeout(500); ours = page.frames().some(f => { try { return f.url().includes(NAME); } catch (e) { return false; } }); }
      if (ours) { const titles = await Promise.all(page.frames().filter(f => f.url().includes(NAME)).map(f => f.title().catch(() => ''))); ours = titles.some(t => t === 'Operation Wolfpack'); }
      if (!ours) { console.log('FAIL harness ' + cfg + ': the frames do not hold Operation Wolfpack'); failed++; await page.close(); continue; }
      await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: o.timeout || 240000 }).catch(() => {});
      const r = await page.evaluate(() => ({ done: document.body.dataset.complete === 'true', pass: window.__hubCheck && window.__hubCheck.pass, checks: (window.__hubCheck && window.__hubCheck.checks) || [] }));
      if (r.done && r.pass) passed++;
      else { failed++; console.log('FAIL harness ' + cfg + (r.done ? '' : ' (did not complete)')); for (const c of r.checks) if (!c.pass) console.log('   - ' + c.name + (c.detail ? ': ' + c.detail : '')); }
      await page.close();
    }
  } finally { if (browser) await browser.close(); srv.kill(); }
  return { passed, failed };
}
if (process.argv[1] && process.argv[1].endsWith('hub-harness.mjs')) {
  const only = process.argv[2] ? [process.argv[2]] : CONFIGS;
  const t0 = Date.now(); const r = await runHarness(only);
  console.log(`${r.passed} passed, ${r.failed} failed (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  process.exit(r.failed ? 1 : 0);
}
