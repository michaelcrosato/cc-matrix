// The hub's own harness: 1, 2 and 4 players, bad network, host leaving. Then the game on its own.
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { availableGB, waitForRoom } from './lib.mjs';
const CRASH = /crash|closed/i;
export default async function ({ ok, chromium, RENDER, OUT, dev, createServer, FILE_URL }) {
  const gameName = basename(OUT);
  const server = createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname.slice(1));
    let file = null;
    if (u === gameName) file = OUT;
    else if (['harness.html', 'bridge.js', 'round.js'].includes(u)) file = join(dev, 'tools/hub', u);
    else if (u === 'session.js') file = join(dev, 'vendor/session.js');
    if (!file || !existsSync(file)) { res.writeHead(404); res.end(); return; }
    const type = { '.html': 'text/html', '.js': 'text/javascript' }[extname(file)] || 'application/octet-stream';
    res.writeHead(200, { 'content-type': type });
    res.end(readFileSync(file));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  await waitForRoom(4);
  let browser = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', ...RENDER] });
  // Confirm the page is our game.
  const pc = await browser.newPage();
  const res0 = await pc.goto(`${base}/${encodeURIComponent(gameName)}`);
  const title = await pc.title();
  ok(res0.ok() && title === 'We Fib', 'the served page is this game', title);
  await pc.close();
  const runs = [
    ['1 player', 'players=1'],
    ['2 players', 'players=2'],
    ['4 players, bad network', 'players=4&latency=150&jitter=50&loss=5'],
    ['4 players, host leaves', 'players=4&latency=150&jitter=50&loss=5&scenario=host-leave'],
  ];
  for (const [name, q] of runs) {
    // A browser that runs out of memory says nothing about the game (TASK.md), so it gets one more go, after waiting for room.
    for (let attempt = 1; attempt <= 2; attempt++) {
      await waitForRoom(4);
      const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
      const page = await ctx.newPage();
      let crashed = false;
      page.on('crash', () => { crashed = true; });
      try {
        await page.goto(`${base}/harness.html?game=${encodeURIComponent(gameName)}&${q}&auto=1`);
        await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 420000 });
        const check = await page.evaluate(() => JSON.parse(JSON.stringify(window.__hubCheck)));
        const bad = (check.checks || check.results || []).filter((c) => c.pass === false || c.ok === false || c.status === 'fail');
        ok(check.pass === true, `hub ${name} passes`, JSON.stringify(bad).slice(0, 900));
        await ctx.close();
        break;
      } catch (e) {
        crashed = crashed || CRASH.test(e.message);
        if (crashed && attempt === 1) {
          console.log(`NOTE hub ${name}: browser ran out of memory (${availableGB().toFixed(1)} GB free), trying once more`);
          await ctx.close().catch(() => {});
          await browser.close().catch(() => {});
          await waitForRoom(4);
          browser = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', ...RENDER] });
          continue;
        }
        const partial = crashed ? 'browser crashed' : await page.evaluate(() => (window.__hubCheck ? JSON.stringify(window.__hubCheck).slice(0, 700) : document.body.innerText.slice(0, 700))).catch(() => 'page gone');
        ok(false, `hub ${name} completes`, `${e.message.slice(0, 120)} ${partial}`);
        await ctx.close().catch(() => {});
        break;
      }
    }
  }
  await browser.close();
  // On its own: Enter and Space repeatedly on the title are harmless and leave something drawn.
  const b2 = await chromium.launch({ args: ['--no-sandbox', ...RENDER] });
  const page = await b2.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`${FILE_URL}?test=1`);
  await page.waitForFunction(() => window.__TEST__ && !document.getElementById('boot'), null, { timeout: 120000 });
  for (const k of ['Enter', 'Space', 'Enter', 'Space']) { await page.keyboard.press(k); await page.waitForTimeout(500); }
  const st = await page.evaluate(() => ({ active: window.AIHub.active, s: window.__TEST__.state() }));
  ok(st.active === false, 'AIHub.active is false on its own');
  ok(st.s.errors.length === 0 && errs.length === 0, 'Enter and Space are harmless on their own', [...st.s.errors, ...errs].join('|').slice(0, 300));
  ok(st.s.render.lost === null, 'the renderer is alive on its own', String(st.s.render.lost));
  ok(st.s.render.frames > 0, 'something is drawn on its own', String(st.s.render.frames));
  await b2.close();
  await new Promise((r) => server.close(r));
}
