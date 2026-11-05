// Eye review only: the AI Hub harness with 2 players, screenshots of the card and the session fight (tests/out/review/)
import { spawn } from 'node:child_process';
import { mkdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { chromium } from 'playwright';
const root = join(dirname(fileURLToPath(import.meta.url)), '..'), dir = join(root, '.tmp', 'hubshot'), out = join(root, 'tests/out/review'); mkdirSync(dir, { recursive: true }); mkdirSync(out, { recursive: true });
for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(join(root, 'vendor/aihub', f), join(dir, f));
copyFileSync(join(root, '..', basename(root) + '.html'), join(dir, 'game.html'));
const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
const port = await new Promise(res => { let buf = ''; const on = d => { buf += d; const m = /port (\d+)/.exec(buf); if (m) res(+m[1]); }; srv.stdout.on('data', on); srv.stderr.on('data', on); });
try {
  const b = await chromium.launch({ args: ['--disable-dev-shm-usage'] }), p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
  await p.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&players=2&limit=60`);
  await p.waitForTimeout(4500); await p.screenshot({ path: join(out, 'hub-card.png') });
  const frames = p.frames().filter(f => /game\.html/.test(f.url()));
  for (const f of frames) await f.evaluate(() => { try { AIHub.answer('ready'); } catch (e) { /* not yet */ } });
  await p.waitForTimeout(16000); await p.screenshot({ path: join(out, 'hub-fight.png') });

  await b.close();
} finally { srv.kill('SIGTERM'); }
console.log('ok');
