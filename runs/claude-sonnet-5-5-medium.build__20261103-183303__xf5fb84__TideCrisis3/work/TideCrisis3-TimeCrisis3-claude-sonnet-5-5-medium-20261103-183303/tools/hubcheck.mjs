// hubcheck.mjs — copies the bundle and the AI Hub harness into hubtest/, serves it on 127.0.0.1 (port chosen by the OS),
// confirms the page is our game, runs the harness scenarios in Chromium and prints only failures. Kills only its own server.
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), work = resolve(root, '..');
const NAME = 'TideCrisis3-TimeCrisis3-claude-sonnet-5-5-medium-20261103-183303.html', dir = join(root, 'hubtest');
mkdirSync(dir, { recursive: true }); copyFileSync(join(work, NAME), join(dir, NAME)); for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(join(root, 'hub', f), join(dir, f));
const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1', '--directory', dir], { stdio: ['ignore', 'pipe', 'pipe'] });
let port = null; const ready = new Promise(res => { const on = d => { const m = /port (\d+)/.exec(String(d)); if (m && !port) { port = +m[1]; res(); } }; server.stdout.on('data', on); server.stderr.on('data', on); });
await ready; let fails = 0, total = 0; const out = [];
const scenarios = process.argv.slice(2).length ? process.argv.slice(2) : ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave', 'players=2&scenario=server&auto=1'];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
try {
  const head = await fetch('http://127.0.0.1:' + port + '/' + NAME).then(r => r.text()); if (!/TIDE CRISIS 3/.test(head)) { console.log('FAIL hubcheck: the served page is not our game'); process.exit(1); }
  for (const sc of scenarios) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; page.on('pageerror', e => errs.push(String(e.stack || e).split('\n')[0]));
    await page.goto('http://127.0.0.1:' + port + '/harness.html?game=' + NAME + '&' + sc); 
    try { await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 150000 }); } catch (e) { out.push('FAIL ' + sc + ': harness did not complete'); fails++; }
    const r = await page.evaluate(() => window.__hubCheck || null); total++;
    if (!r) { out.push('FAIL ' + sc + ': no __hubCheck'); fails++; } else if (!r.pass) { fails++; out.push('FAIL ' + sc + ': ' + JSON.stringify(r.checks ? r.checks.filter(c => !c.ok && !c.pass) : r).slice(0, 900)); }
    if (errs.length) out.push('  page errors: ' + errs.slice(0, 3).join(' | '));
    await page.close();
  }
} finally { await browser.close(); server.kill(); }
if (out.length) console.log(out.join('\n')); console.log((total - fails) + ' of ' + total + ' hub scenarios passed');
process.exit(fails ? 1 : 0);
