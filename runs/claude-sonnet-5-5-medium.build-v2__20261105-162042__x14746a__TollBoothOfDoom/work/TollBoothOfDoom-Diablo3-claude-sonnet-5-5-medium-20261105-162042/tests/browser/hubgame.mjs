// Tier 4 game-level check: two frames in the hub harness; P2 is driven by synthetic keys inside its frame, and P2's hero moves in P1's world.
import { createServer } from 'node:http';
import { readFileSync, copyFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { launch, HTML, ROOT } from '../../tools/browser.mjs';
export const name = 'hub game';
export async function run(t) {
  const dir = join(ROOT, 'tests', 'hub-run'); mkdirSync(dir, { recursive: true });
  for (const [src, dst] of [['hub_harness.html', 'harness.html'], ['hub_bridge.js', 'bridge.js'], ['hub_round.js', 'round.js']]) copyFileSync(join(ROOT, src), join(dir, dst));
  copyFileSync(HTML, join(dir, 'GAME.html'));
  const types = { '.html': 'text/html', '.js': 'text/javascript' };
  const srv = createServer((req, res) => { const u = new URL(req.url, 'http://x'); const f = join(dir, u.pathname === '/' ? 'harness.html' : u.pathname); if (!f.startsWith(dir) || !existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[extname(f)] || 'application/octet-stream' }); res.end(readFileSync(f)); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
  const b = await launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${port}/harness.html?game=GAME.html&players=2&limit=240`);
    await page.waitForFunction(() => { const f = document.querySelectorAll('iframe'); return f.length === 2 && [...f].every((x) => x.contentWindow && x.contentWindow.__GAME__ && x.contentWindow.__GAME__.world && x.contentWindow.AIHub && x.contentWindow.AIHub.time() >= 500); }, null, { timeout: 150000, polling: 500 });
    const pos = () => page.evaluate(() => { const [a, b] = [...document.querySelectorAll('iframe')].map((f) => f.contentWindow.__GAME__); const get = (g, seat) => { const h = g.world.heroes.find((q) => q.seat === seat); return h ? [h.x, h.z] : null; }; return { p1in1: get(a, 0), p2in1: get(a, 1), p1in2: get(b, 0), p2in2: get(b, 1), mode: [a.mode, b.mode] }; });
    const before = await pos();
    // P2's frame gets the keys: hold D for a few seconds, then W
    for (const key of ['KeyD', 'KeyW']) {
      await page.evaluate((key) => { const w = document.querySelectorAll('iframe')[1].contentWindow; w.dispatchEvent(new w.KeyboardEvent('keydown', { code: key, key })); }, key);
      await page.waitForTimeout(2500);
      await page.evaluate((key) => { const w = document.querySelectorAll('iframe')[1].contentWindow; w.dispatchEvent(new w.KeyboardEvent('keyup', { code: key, key })); }, key);
    }
    await page.waitForTimeout(1200);
    const after = await pos();
    const d = (a, b) => (a && b ? Math.hypot(a[0] - b[0], a[1] - b[1]) : 0);
    t.ok(before.p2in1 && after.p2in1, 'P2 hero exists in P1 world');
    t.ok(d(before.p2in1, after.p2in1) > 1.5, `P2's hero moved in P1's world (${d(before.p2in1, after.p2in1).toFixed(1)} m)`);
    t.ok(d(before.p2in2, after.p2in2) > 1.5, `P2's hero moved in P2's own world (${d(before.p2in2, after.p2in2).toFixed(1)} m)`);
    // and P1's keys move P1's hero in P2's world (any of four directions: the start room has walls)
    let far = 0;
    for (const key of ['KeyA', 'KeyS', 'KeyD', 'KeyW']) {
      await page.evaluate((key) => { const w = document.querySelectorAll('iframe')[0].contentWindow; w.dispatchEvent(new w.KeyboardEvent('keydown', { code: key, key })); }, key);
      await page.waitForTimeout(1500);
      await page.evaluate((key) => { const w = document.querySelectorAll('iframe')[0].contentWindow; w.dispatchEvent(new w.KeyboardEvent('keyup', { code: key, key })); }, key);
      await page.waitForTimeout(500); const fin = await pos(); far = Math.max(far, d(after.p1in2, fin.p1in2));
    }
    t.ok(far > 1.0, `P1's hero moved in P2's world (${far.toFixed(1)} m)`);
    await ctx.close();
  } catch (e) { t.fail('hub game: ' + String(e.message).slice(0, 200)); } finally { await b.close(); srv.close(); }
  // outside a session the page opened on its own still plays normally
  const b2 = await launch();
  try { const { openGame } = await import('../../tools/browser.mjs'); const g = await openGame(b2); const r = await g.page.evaluate(async () => { const e = window.__PIXEL_ENGINE__; e.manual = true; e.step(60); return { mode: window.__GAME__.mode, session: !!window.__GAME__.session, errors: e.errors.length }; }); t.ok(r.mode === 'title' && !r.session && r.errors === 0, 'standalone page opens on the title: ' + JSON.stringify(r)); } finally { await b2.close(); }
}
