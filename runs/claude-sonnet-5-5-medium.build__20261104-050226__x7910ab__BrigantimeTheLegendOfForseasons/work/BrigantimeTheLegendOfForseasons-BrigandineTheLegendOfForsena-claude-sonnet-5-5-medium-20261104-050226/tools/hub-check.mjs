// node tools/hub-check.mjs [players] [extra query]  -- serves dist/hub on a port the OS picks, runs the AI Hub harness, prints the checklist
import { chromium } from '../engine/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist/hub'), players = process.argv[2] || '2', extra = process.argv[3] || '';
const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir }); let port = 0;
await new Promise(res => { srv.stdout.on('data', d => { const m = /port (\d+)/.exec(String(d)); if (m) { port = +m[1]; res(); } }); setTimeout(res, 4000); });
const pid = srv.pid; let code = 1;
try {
  const html = await (await fetch(`http://127.0.0.1:${port}/game.html`)).text(); if (!html.includes('<title>Brigantime')) throw new Error('not our game on port ' + port);
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e))); 
  await p.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&players=${players}&auto=1${extra}`);
  await p.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 90000 }).catch(() => console.log('timeout waiting for complete'));
  const r = await p.evaluate(() => JSON.stringify(window.__hubCheck, null, 1)); console.log(r.slice(0, 2500)); if (errs.length) console.log('page errors', errs.slice(0, 3));
  code = JSON.parse(r).pass ? 0 : 1; await b.close();
} catch (e) { console.log('ERR', e.message); } finally { process.kill(pid); }
process.exit(code);
