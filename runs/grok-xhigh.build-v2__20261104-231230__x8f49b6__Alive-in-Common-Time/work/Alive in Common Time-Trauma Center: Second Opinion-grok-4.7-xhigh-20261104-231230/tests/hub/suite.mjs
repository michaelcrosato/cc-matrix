import http from 'node:http';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const devRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const site = path.join(devRoot, 'tests/hub/site');
const workRoot = path.resolve(devRoot, '..');
const GPU = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-webgpu-adapter=swiftshader', '--use-angle=swiftshader'];

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

function serve(root) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    let name = decodeURIComponent(url.pathname);
    if (name.endsWith('/')) name += 'index.html';
    const file = path.join(root, name);
    if (!file.startsWith(root) || !existsSync(file)) {
      res.writeHead(404);
      res.end('missing');
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function findHtml() {
  const name = readdirSync(workRoot).find((file) => file.endsWith('-Trauma Center: Second Opinion-grok-4.7-xhigh-20261104-231230.html'));
  if (!name) return null;
  return path.join(workRoot, name);
}

async function hubRun(origin, check, spec) {
  const browser = await chromium.launch({ headless: true, args: spec.gpu ? GPU : [] });
  const lines = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.startsWith('[AIHub]')) lines.push(text);
    });
    page.on('pageerror', (err) => lines.push(String(err)));
    const game = encodeURIComponent(spec.game);
    await page.goto(`${origin}/harness.html?game=${game}&auto=1&play=8000&${spec.query}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 300000 });
    const report = await page.evaluate(() => window.__hubCheck);
    const ours = await page.evaluate(() => {
      const frame = document.querySelector('iframe');
      return !!(frame && frame.contentWindow && frame.contentWindow.__game);
    });
    check(`${spec.name} is this game`, ours, 'missing __game');
    check(`${spec.name} pass`, report?.pass === true, JSON.stringify((report?.checks || []).filter((c) => !c.pass).map((c) => `${c.name}: ${c.detail}`)));
    check(`${spec.name} quiet`, lines.length === 0, lines.slice(0, 4).join(' | '));
  } finally {
    await browser.close();
  }
}

async function alone(check) {
  const html = findHtml();
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', (err) => errors.push(String(err)));
    await page.goto(pathToFileURL(html).href, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__game && window.__game.state().screen === 'Title', null, { timeout: 30000 });
    await page.waitForTimeout(2500);
    for (const key of ['Enter', 'Space', 'Enter', 'Space']) {
      await page.keyboard.press(key);
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(2000);
    const shot = await page.screenshot();
    const flags = await page.evaluate(() => ({
      active: window.AIHub.active,
      seeded: window.AIHub.seeded,
      screen: window.__game.state().screen,
    }));
    check('alone active', flags.active === false, String(flags.active));
    check('alone seeded', flags.seeded !== true, String(flags.seeded));
    check('alone shot', shot.length > 12000, `${shot.length}`);
    check('alone errors', errors.length === 0, errors.slice(0, 3).join(' | '));
    check('alone advanced', flags.screen === 'Story' || flags.screen === 'Main Menu', flags.screen);
  } finally {
    await browser.close();
  }
}

export async function cardCountdown(origin, check) {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1 });
    page.on('pageerror', (err) => errors.push(String(err)));
    const game = encodeURIComponent('game.html?webgl=1');
    await page.goto(`${origin}/harness.html?game=${game}&players=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      const frame = document.querySelector('iframe');
      let g = null;
      try { g = frame && frame.contentWindow && frame.contentWindow.__game; } catch { g = null; }
      if (!g || !g.state) return false;
      const st = g.state();
      const text = frame.contentDocument?.querySelector('[data-live="card"]')?.textContent?.trim() || '';
      return st.screen === 'Card' && text !== '' && st.cardLeft != null;
    }, null, { timeout: 20000 });
    const card = await page.evaluate(() => {
      const frame = document.querySelector('iframe');
      const text = frame.contentDocument.querySelector('[data-live="card"]').textContent.trim();
      const left = frame.contentWindow.__game.state().cardLeft;
      return { text, left, screen: frame.contentWindow.__game.state().screen };
    });
    const shown = Number(card.text);
    const expect = Math.max(0, Math.ceil(Number(card.left) / 1000));
    check(
      'card seconds',
      card.screen === 'Card' && Number.isInteger(shown) && shown >= 0 && shown <= 30 && shown === expect,
      `shown ${card.text} left ${card.left} expect ${expect}`,
    );
    await page.evaluate(async () => {
      const deadline = performance.now() + 4000;
      while (performance.now() < deadline) {
        const frame = document.querySelector('iframe');
        const screen = frame.contentWindow.__game.state().screen;
        if (screen === 'Countdown' || screen === 'Operation') return;
        const btn = frame.contentDocument.querySelector('[data-item="ready"]');
        if (btn) btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
        frame.contentWindow.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
        await new Promise((r) => setTimeout(r, 50));
      }
    });
    const seen = await page.evaluate(async () => {
      const deadline = performance.now() + 8000;
      let digit = '';
      while (performance.now() < deadline) {
        const frame = document.querySelector('iframe');
        const screen = frame.contentWindow.__game.state().screen;
        const text = frame.contentDocument.querySelector('[data-live="count"]')?.textContent?.trim() || '';
        if (screen === 'Countdown' && (text === '1' || text === '2' || text === '3')) {
          digit = text;
          break;
        }
        if (screen === 'Operation') break;
        await new Promise((r) => setTimeout(r, 40));
      }
      const opDeadline = performance.now() + 6000;
      let op = false;
      while (performance.now() < opDeadline) {
        const frame = document.querySelector('iframe');
        if (frame.contentWindow.__game.state().screen === 'Operation') { op = true; break; }
        await new Promise((r) => setTimeout(r, 40));
      }
      return { digit, op };
    });
    check('countdown digit', (seen.digit === '1' || seen.digit === '2' || seen.digit === '3') && seen.op, JSON.stringify(seen));
    check('card page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  } finally {
    await browser.close();
  }
}

export async function hubTests() {
  const fails = [];
  let passed = 0;
  const check = (name, ok, detail) => {
    if (ok) passed += 1;
    else fails.push(`${name}: ${detail || 'failed'}`);
  };
  if (!existsSync(path.join(site, 'game.html'))) {
    fails.push('hub: game.html was not copied into the harness');
    return { fails, passed };
  }
  const server = await serve(site);
  const { port } = server.address();
  const origin = `http://127.0.0.1:${port}`;
  const runs = [
    { name: '2 players', query: 'players=2', game: 'game.html', gpu: true },
    { name: '3 players', query: 'players=3&latency=150&jitter=50&loss=5', game: 'game.html', gpu: true },
    { name: '4 players', query: 'players=4&latency=150&jitter=50&loss=5', game: 'game.html', gpu: true },
    { name: 'host leave', query: 'players=3&latency=150&jitter=50&loss=5&scenario=host-leave', game: 'game.html', gpu: true },
    { name: 'server', query: 'players=2&latency=150&jitter=50&loss=5&scenario=server', game: 'game.html', gpu: true },
    { name: '4 players webgl', query: 'players=4&latency=150&jitter=50&loss=5', game: 'game.html?webgl=1', gpu: false },
  ];
  try {
    try { await cardCountdown(origin, check); }
    catch (err) { fails.push(`card countdown: ${err.stack || err.message}`); }
    for (const spec of runs) {
      try { await hubRun(origin, check, spec); }
      catch (err) { fails.push(`${spec.name}: ${err.stack || err.message}`); }
    }
    try { await alone(check); }
    catch (err) { fails.push(`alone: ${err.stack || err.message}`); }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  return { fails, passed };
}

if (process.argv[2] === 'card') {
  const server = await serve(site);
  const origin = `http://127.0.0.1:${server.address().port}`;
  const fails = [];
  let passed = 0;
  const check = (name, ok, detail) => {
    if (ok) passed += 1;
    else fails.push(`${name}: ${detail || 'failed'}`);
  };
  try {
    await cardCountdown(origin, check);
  } catch (err) {
    fails.push(String(err.stack || err));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  for (const line of fails) console.log(`FAIL ${line}`);
  console.log(`${fails.length} failed, ${passed} passed`);
  if (fails.length) process.exit(1);
}
