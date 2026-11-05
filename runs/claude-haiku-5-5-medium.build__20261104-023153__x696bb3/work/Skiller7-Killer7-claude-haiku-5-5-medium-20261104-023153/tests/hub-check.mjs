// AI Hub check (standalone): a mock hub page frames the game with ?aihub=1, answers its hello with a welcome in ghost
// mode, starts the round, and records what the game reports. Then the game plays its Echo Run and must report a result.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { GAME, OUT } from './lib/open.mjs';

const parent = path.join(OUT, 'hub-parent.html');
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(parent, `<!doctype html><body style="margin:0;background:#000"><iframe id="g" style="width:960px;height:540px;border:0" src="${pathToFileURL(GAME).href}?aihub=1"></iframe>
<script>
window.log = []; window.result = null;
addEventListener('message', e => {
  const g = document.getElementById('g');
  if (e.source !== g.contentWindow) return;
  const m = e.data; if (!m || m.aihub !== 1) return;
  log.push(m.type);
  if (m.type === 'hello') g.contentWindow.postMessage({ aihub: 1, type: 'welcome', players: [{ id: 'a', name: 'Me' }], me: 'a', host: 'a', seed: 42, mode: 'ghost', splash: false, limits: {} }, '*');
  if (m.type === 'ready') g.contentWindow.postMessage({ aihub: 1, type: 'start', in: 0 }, '*');
  if (m.type === 'result') window.result = m;
}, false);
</script></body>`);

const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await browser.newPage({ viewport: { width: 980, height: 560 } });
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.goto(pathToFileURL(parent).href, { waitUntil: 'load' });
for (let i = 0; i < 360 && !(await p.evaluate(() => window.log.includes('ready'))); i++) await p.waitForTimeout(500);
const frame = p.frames().find(f => f.url().includes('aihub=1'));
for (let i = 0; i < 480 && !(await frame.evaluate(() => !!(window.__game && window.__game.debug)).catch(() => false)); i++) await p.waitForTimeout(500);
if (!(await frame.evaluate(() => !!(window.__game && window.__game.debug)).catch(() => false))) throw new Error('the game never came up in the frame');
for (let i = 0; i < 60; i++) { await frame.evaluate(() => window.__game.debug.play('echo', true)); await p.waitForTimeout(700); if (await frame.evaluate(() => window.__game.debug.snapshot().scene === 'play')) break; }
for (let i = 0; i < 240 && !(await p.evaluate(() => window.log.includes('progress'))); i++) await p.waitForTimeout(500);
await frame.evaluate(() => window.__game.debug.finishRun());
for (let i = 0; i < 20; i++) { await p.waitForTimeout(500); }
console.log('after finish:', JSON.stringify(await frame.evaluate(() => { const s = window.__game.debug.snapshot(); return { scene: s.scene, complete: s.complete, leg: s.leg, s: s.s, time: s.time }; })));
for (let i = 0; i < 240 && (await p.evaluate(() => window.result)) === null; i++) await p.waitForTimeout(500);
const messages = [...new Set(await p.evaluate(() => window.log))];
const result = await p.evaluate(() => window.result);
const ok = !!result && typeof result.time === 'number' && messages.includes('ready') && messages.includes('hello');
console.log(ok ? 'hub: the round reported its time (' + result.time + ' ms) to the hub' : 'hub: FAILED, messages ' + messages.join(',') + ' result ' + JSON.stringify(result));
if (errs.length) console.log('page errors: ' + errs.slice(0, 3).join(' | '));
await browser.close();
process.exitCode = ok && !errs.length ? 0 : 1;
