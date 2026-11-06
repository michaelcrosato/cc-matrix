// Serve tests/.site on 127.0.0.1 with an OS-picked port; returns { port, pid, stop }.
import { spawn } from 'node:child_process';
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './boot.mjs';
export const GAME_HTML = join(ROOT, '..', 'FarPry2-FarCry2-claude-sonnet-5-5-medium-20261105-162033.html');
export async function serveSite() {
  const dir = join(ROOT, 'tests/.site');
  mkdirSync(dir, { recursive: true });
  copyFileSync(GAME_HTML, join(dir, 'game.html'));
  for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(join(ROOT, 'vendor/hub', f), join(dir, f));
  const p = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'ignore'] });
  const port = await new Promise((res, rej) => { let buf = ''; p.stdout.on('data', (d) => { buf += d; const m = /port (\d+)/.exec(buf); if (m) res(+m[1]); }); setTimeout(() => rej(new Error('server did not start')), 10000); });
  return { port, pid: p.pid, stop: () => p.kill() };
}
export const CHROME_FLAGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader'];
