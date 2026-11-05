// node tools/hubcheck.mjs [players=2] [extra query]  : serves the harness on 127.0.0.1 (an OS-picked port), runs the AI Hub checklist in headless Chromium, prints the failures and stops its own server by PID
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { copyFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..'), work = join(root, '..'), dir = join(root, 'tools/harness');
const game = readdirSync(work).find(f => f.endsWith('.html') && f.startsWith('Europhoria'));
copyFileSync(join(work, game), join(dir, 'game.html'));
const players = process.argv[2] || '2', extra = process.argv[3] || '';
const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
let port; try { port = await new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('no port')), 8000); const on = d => { const m = String(d).match(/port (\d+)/); if (m) { clearTimeout(t); res(+m[1]); } }; srv.stdout.on('data', on); srv.stderr.on('data', on); }); } catch (e) { srv.kill('SIGTERM'); throw e; }
let code = 0;
try {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await page.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&players=${players}&auto=1${extra}`);
  const probe = await page.evaluate(() => document.title); if (!/hub|harness/i.test(probe)) console.log('warning: page title is', probe);
  await page.waitForFunction(() => document.body && document.body.dataset.complete === 'true', null, { timeout: 150000 });
  const rep = await page.evaluate(() => window.__hubCheck);
  const fails = (rep.checks || rep.items || []).filter(c => c.ok === false || c.pass === false || c.status === 'fail');
  console.log('hub check pass:', rep.pass, ' failures:', fails.length); for (const f of fails) console.log(' -', JSON.stringify(f).slice(0, 300)); if (!fails.length && !rep.pass) console.log(JSON.stringify(rep).slice(0, 1500));
  if (errs.length) console.log('page errors:', errs.join(' | ')); code = rep.pass ? 0 : 1; await browser.close();
} catch (e) { console.log('hubcheck error', e.message); code = 1; } finally { srv.kill('SIGTERM'); }
process.exit(code);
