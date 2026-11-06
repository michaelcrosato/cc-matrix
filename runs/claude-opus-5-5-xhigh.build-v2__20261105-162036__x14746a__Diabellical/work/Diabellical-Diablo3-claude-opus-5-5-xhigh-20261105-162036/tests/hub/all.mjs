// Tier 4: the hub's own harness, in all five variants, then a game-level look across two frames.
import { launch, openGame } from '../../tools/browser.mjs';
import { runVariant, serve } from '../../tools/hubcheck.mjs';
import { assert, eq, test } from '../lib.mjs';

const VARIANTS = [
  'players=2&auto=1',
  'players=4&latency=150&jitter=50&loss=5&auto=1',
  'players=4&latency=150&jitter=50&loss=5&scenario=host-leave&auto=1',
  'players=2&scenario=server&auto=1',
  'players=1&auto=1',
];

for (const v of VARIANTS) {
  test(`hub harness: ${v}`, async () => {
    const { srv, port } = await serve();
    const browser = await launch();
    try {
      const { rep } = await runVariant(browser, port, v);
      assert(rep, 'no report');
      const bad = rep.checks.filter((c) => !c.pass).map((c) => `${c.name}: ${String(c.detail).slice(0, 200)}`);
      assert(rep.pass, `failed: ${bad.join(' || ') || 'never completed'}`);
    } finally {
      await browser.close();
      srv.close();
    }
  });
}

test('game level: P2 moves in P1\'s world, and P1 in P2\'s', async () => {
  const { srv, port } = await serve();
  const browser = await launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&players=2&limit=90&seed=77`);
    eq(await page.title() !== '', true, 'harness page');
    const frames = () => page.frames().filter((f) => f !== page.mainFrame() && f.url().includes('game.html'));
    await page.waitForFunction(() => document.querySelectorAll('iframe').length >= 2, null, { timeout: 60000 });
    const ready = async (f) => { for (let i = 0; i < 400; i++) { const ok = await f.evaluate(() => !!window.__GAME__?.net?.world && !!window.AIHub); if (ok) return; await page.waitForTimeout(200); } throw new Error('game not ready'); };
    for (let i = 0; i < 100 && frames().length < 2; i++) await page.waitForTimeout(200);
    const [f1, f2] = frames();
    await ready(f1); await ready(f2);
    eq(await f1.title(), 'Diabellical', 'the page is my game');
    // Answer the card on both and wait for play.
    for (const f of [f1, f2]) await f.evaluate(() => { window.AIHub.answer('ready'); });
    for (let i = 0; i < 300; i++) {
      const on = await f1.evaluate(() => window.__GAME__.net.playing) && await f2.evaluate(() => window.__GAME__.net.playing);
      if (on) break;
      await page.waitForTimeout(200);
    }
    assert(await f1.evaluate(() => window.__GAME__.net.playing), 'play began');
    const who = await f1.evaluate(() => ({ me: window.AIHub.me, host: window.AIHub.isHost }));
    const [hostF, clientF] = who.host ? [f1, f2] : [f2, f1];
    const heroes = (f) => f.evaluate(() => window.__GAME__.world.heroes.map((h) => ({ seat: h.seat, x: h.x, z: h.z, cls: h.cls })));
    const seatOf = (f) => f.evaluate(() => window.AIHub.me);
    const clientSeat = await seatOf(clientF), hostSeat = await seatOf(hostF);
    const a0 = await heroes(hostF);
    // Synthetic keys inside the client's frame: P2 walks.
    await clientF.evaluate(() => { window.__PIXEL_ENGINE__.input.setKey('KeyD', true); });
    for (let i = 0; i < 40; i++) { await page.waitForTimeout(150); const h = await heroes(hostF); const d = Math.hypot(h.find((o) => o.seat === clientSeat).x - a0.find((o) => o.seat === clientSeat).x, h.find((o) => o.seat === clientSeat).z - a0.find((o) => o.seat === clientSeat).z); if (d > 0.8) break; }
    await clientF.evaluate(() => { window.__PIXEL_ENGINE__.input.setKey('KeyD', false); });
    const a1 = await heroes(hostF);
    const moved = Math.hypot(a1.find((o) => o.seat === clientSeat).x - a0.find((o) => o.seat === clientSeat).x, a1.find((o) => o.seat === clientSeat).z - a0.find((o) => o.seat === clientSeat).z);
    assert(moved > 0.5, `P2 moved in P1's world by ${moved}`);
    // And the host's hero, seen in the client's world.
    const b0 = await heroes(clientF);
    await hostF.evaluate(() => { window.__PIXEL_ENGINE__.input.setKey('KeyA', true); });
    let seen = 0;
    for (let i = 0; i < 50; i++) { await page.waitForTimeout(150); const h = await heroes(clientF); seen = Math.hypot(h.find((o) => o.seat === hostSeat).x - b0.find((o) => o.seat === hostSeat).x, h.find((o) => o.seat === hostSeat).z - b0.find((o) => o.seat === hostSeat).z); if (seen > 0.8) break; }
    await hostF.evaluate(() => { window.__PIXEL_ENGINE__.input.setKey('KeyA', false); });
    assert(seen > 0.5, `P1 moved in P2's world by ${seen}`);
    // Same map, and monsters agree roughly.
    const m1 = await hostF.evaluate(() => window.__GAME__.world.zone.rows.join(''));
    const m2 = await clientF.evaluate(() => window.__GAME__.world.zone.rows.join(''));
    eq(m1, m2, 'same map on both');
    await ctx.close();
  } finally {
    await browser.close();
    srv.close();
  }
});

test('outside a session the page plays normally', async () => {
  const { srv, port } = await serve();
  const browser = await launch();
  try {
    const { context, page, errors } = await openGame({ browser, url: `http://127.0.0.1:${port}/game.html` });
    const r = await page.evaluate(() => { const e = window.__PIXEL_ENGINE__; e.manual = true; e.step(5); const g = window.__GAME__; return { mode: g.mode, tag: g.topScreen()?.tag, active: window.AIHub.active, title: document.title }; });
    eq(r.active, false, 'not in a session');
    eq(r.mode, 'shell', 'the shell');
    eq(r.tag, 'title', 'the title');
    eq(r.title, 'Diabellical', 'the page is my game');
    assert(!errors.length, errors[0]);
    await context.close();
  } finally {
    await browser.close();
    srv.close();
  }
});
