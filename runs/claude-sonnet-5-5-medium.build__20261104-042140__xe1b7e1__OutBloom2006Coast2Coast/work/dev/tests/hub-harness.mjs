// the AI Hub conformance harness: serves the bundle and the harness from a folder inside .cache, 127.0.0.1, OS-picked port
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
const root = new URL('../../', import.meta.url), dev = new URL('../', import.meta.url), file = readdirSync(root).find(f => /^OutBloom.*\.html$/.test(f));
const dir = new URL('.cache/serve/', dev); mkdirSync(dir, { recursive: true });
for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(new URL('vendor/hub/' + f, dev), new URL(f, dir));
copyFileSync(new URL(file, root), new URL('game.html', dir));
const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir.pathname, stdio: ['ignore', 'pipe', 'pipe'] });
const port = await new Promise((res, rej) => { let b = ''; const f = d => { b += d; const m = /port (\d+)/.exec(b); if (m) res(Number(m[1])); }; srv.stdout.on('data', f); srv.stderr.on('data', f); setTimeout(() => rej(new Error('no port: ' + b)), 8000); });
let out = 1;
try {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });
  await page.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&auto=1&players=${process.argv[2] || 2}&play=7000`);
  const title = await page.title(); if (!/harness/i.test(title)) throw new Error('not the harness: ' + title);
  const fr = await page.waitForSelector('iframe'); const gt = await (await fr.contentFrame()).title().catch(() => ''); console.log('frame title:', gt);
  await page.waitForSelector('body[data-complete]', { timeout: 150000 });
  const rep = await page.evaluate(() => window.__hubCheck);
  console.log('PASS', rep.pass, 'failed:', JSON.stringify(rep.checks.filter(c => !c.pass)), 'checks', rep.checks.length);
  out = 0; await browser.close();
} catch (e) { console.log('ERR', e.message); }
srv.kill();
process.exit(out);
