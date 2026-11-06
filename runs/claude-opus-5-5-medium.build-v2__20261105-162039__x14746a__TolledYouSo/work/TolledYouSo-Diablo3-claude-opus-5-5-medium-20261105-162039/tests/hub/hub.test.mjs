// The AI Hub harness in all five variants, then a game-level check: two frames, P2 moved by synthetic keys, seen in both worlds.
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { ok, eq, guarded } from '../lib.mjs';
import { FLAGS, HTML, NAME } from '../../tools/browser.mjs';
const hubDir = resolve('tools/hub'); const TYPES = { '.html': 'text/html', '.js': 'text/javascript' };
const server = createServer((req, res) => {
  const u = new URL(req.url, 'http://x'); const f = u.pathname === '/game.html' ? HTML : join(hubDir, u.pathname.slice(1));
  if (!existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(f)] ?? 'application/octet-stream' }); res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r)); const port = server.address().port;
const only = process.argv[2]; const VARIANTS = ['players=2', 'players=4&latency=150&jitter=50&loss=5', 'players=4&latency=150&jitter=50&loss=5&scenario=host-leave', 'players=2&scenario=server', 'players=1'];
await guarded(async () => {
  const browser = await chromium.launch({ args: FLAGS });
  for (const v of VARIANTS) {
    if (only && v !== only) continue;
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    await page.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&${v}&auto=1`);
    let doneNow = false; const t0 = Date.now();
    while (Date.now() - t0 < 500000) { doneNow = await page.evaluate(() => document.body.dataset.complete === 'true'); if (doneNow) break; await page.waitForTimeout(1500); }
    ok(doneNow, `harness completes for ${v}`);
    const r = await page.evaluate(() => JSON.parse(JSON.stringify(window.__hubCheck ?? {})));
    if (!ok(r.pass === true, `harness passes for ${v}`)) console.log(JSON.stringify(r).slice(0, 2500));
    if (errs.length) console.log(`page errors ${v}: ${errs.slice(0, 3).join(' | ')}`.slice(0, 500));
    await ctx.close();
  }
  if (!only || only === 'game') {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&players=2&limit=120`);
    const wantFrames = async () => { for (let i = 0; i < 90; i++) { const fs = page.frames().filter((f) => f !== page.mainFrame()); if (fs.length >= 2) { const rd = await Promise.all(fs.map((f) => f.evaluate(() => !!window.__GAME__?.session).catch(() => false))); if (rd.every(Boolean)) return fs; } await page.waitForTimeout(1000); } return null; };
    const frames = await wantFrames(); if (!ok(frames, 'two frames with a session')) { await browser.close(); return; }
    for (const f of frames) await f.evaluate(() => { if (window.AIHub?.answer) window.AIHub.answer('ready'); });
    const roles = await Promise.all(frames.map((f) => f.evaluate(() => ({ me: AIHub.me, host: AIHub.isHost }))));
    const client = frames[roles.findIndex((r) => !r.host)]; const host = frames[roles.findIndex((r) => r.host)]; const cMe = roles.find((r) => !r.host).me; const hMe = roles.find((r) => r.host).me;
    for (let i = 0; i < 60; i++) { const t = await host.evaluate(() => AIHub.time()); if (t >= 500) break; await page.waitForTimeout(1000); }
    const pos = (f, seat) => f.evaluate((s) => { const h = window.__GAME__.session.world.heroes.find((q) => q.seat === s); return [h.x, h.z]; }, seat);
    const p0 = await pos(host, cMe); const m0 = await pos(client, hMe);
    await client.evaluate(() => { const e = window.__PIXEL_ENGINE__; e.input.setKey('KeyD', true); });
    await host.evaluate(() => { const e = window.__PIXEL_ENGINE__; e.input.setKey('KeyS', true); });
    await page.waitForTimeout(8000);
    await client.evaluate(() => { window.__PIXEL_ENGINE__.input.setKey('KeyD', false); }); await host.evaluate(() => { window.__PIXEL_ENGINE__.input.setKey('KeyS', false); });
    await page.waitForTimeout(1500);
    const p1 = await pos(host, cMe); const m1 = await pos(client, hMe); const c1 = await pos(client, cMe);
    ok(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) > 1, `P2 moved in P1's world: ${p0} to ${p1}`);
    ok(Math.hypot(m1[0] - m0[0], m1[1] - m0[1]) > 1, `P1 moved in P2's world: ${m0} to ${m1}`);
    ok(Math.hypot(c1[0] - p1[0], c1[1] - p1[1]) < 5, `P2 agrees with the host: ${c1} vs ${p1}`);
    await ctx.close();
  }
  await browser.close();
  void eq; void NAME;
});
server.close();
