// Probe: opens the single HTML and reports the game's scene and state after a wait. Usage: node tools/probe.mjs [ms]
import { chromium } from 'playwright';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const file = resolve(here, '..', '..', 'SublimeCrisis3-TimeCrisis3-claude-haiku-5-5-medium-20261103-183312.html');
const wait = Number(process.argv[2] || 8000);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
await page.waitForTimeout(wait);
const st = await page.evaluate(() => {
  const g = window.TC && TC.game;
  if (!g) return { noGame: true };
  return { scene: g.scene && (g.scene.name || g.sceneName || String(g.scene)), booted: !!g.booted, bootError: g.bootError && String(g.bootError), gameErrors: (g.errors || []).map(e => e.message || String(e)).slice(0, 5), w: g.screen && g.screen.W, h: g.screen && g.screen.H, running: g.running, paused: g.paused };
});
await page.screenshot({ path: '/tmp/probe.png' }).catch(() => {});
console.log(JSON.stringify(st));
for (const e of errors.slice(0, 15)) console.log(e);
await browser.close();
