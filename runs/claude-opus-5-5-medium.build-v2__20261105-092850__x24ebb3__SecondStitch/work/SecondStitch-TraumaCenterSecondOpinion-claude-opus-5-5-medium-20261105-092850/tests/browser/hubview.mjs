import { spawn } from 'node:child_process';
import { launch } from './lib.mjs';
const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: 'dist', stdio: ['ignore', 'pipe', 'ignore'] });
const port = await new Promise((res) => srv.stdout.on('data', (d) => { const m = String(d).match(/port (\d+)/); if (m) res(+m[1]); }));
const b = await launch();
const page = await b.newPage({ viewport: { width: 1600, height: 1000 } });
await page.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&players=2&limit=90&seed=5`);
for (const t of [12, 25, 40]) {
  await page.waitForTimeout(t === 12 ? 12000 : 14000);
  await page.screenshot({ path: `shots/hub${t}.png` });
  for (const f of page.frames()) { const st = await f.evaluate(() => (window.__GAME__ ? { stage: window.__GAME__.stage?.name, status: window.__PIXEL_ENGINE__?.state?.().status, host: window.AIHub?.isHost, ents: window.__GAME__.stage?.sim?.ents?.length, time: window.AIHub?.time?.(), errs: window.__PIXEL_ENGINE__?.errors } : null)).catch(() => null); if (st) console.log(t, st); }
}
await b.close(); srv.kill();
