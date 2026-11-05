// node test/hub-harness.mjs [players] [extra query]   runs the AI Hub harness against the bundled game (server on 127.0.0.1, port picked by the OS)
import { chromium } from '../engine/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { resolve, basename } from 'node:path';
const root = resolve(new URL('../', import.meta.url).pathname), name = basename(root), dir = root + '/.hubtest';
mkdirSync(dir, { recursive: true });
for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(root + '/vendor/aihub/' + f, dir + '/' + f);
copyFileSync(resolve(root, '..', name + '.html'), dir + '/game.html');
const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir });
const port = await new Promise((res, rej) => { srv.stdout.on('data', d => { const m = /port (\d+)/.exec(String(d)); if (m) res(+m[1]); }); srv.stderr.on('data', d => { const m = /port (\d+)/.exec(String(d)); if (m) res(+m[1]); }); setTimeout(() => rej(new Error('no port')), 8000); });
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
const q = process.argv[3] || '&players=' + (process.argv[2] || 2) + '&auto=1';
try {
  const title = await (await fetch('http://127.0.0.1:' + port + '/game.html')).text(); if (!/Densha de Halo/.test(title)) throw new Error('not my game on port ' + port);
  await p.goto('http://127.0.0.1:' + port + '/harness.html?game=game.html' + q);
  await p.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 170000 });
  const r = await p.evaluate(() => window.__hubCheck);
  console.log('pass:', r.pass); if (!r.pass) console.log(JSON.stringify(r, null, 1).slice(0, 3000));
  const txt = await p.evaluate(() => document.body.innerText.split('\n').filter(l => /✗|fail|FAIL|✕/.test(l)).slice(0, 12)); if (txt.length) console.log(txt.join('\n'));
} catch (e) { console.log('harness error', e.message); } finally { console.log(errs.slice(0, 5).join('\n') || 'no page errors'); await b.close(); srv.kill(); }
