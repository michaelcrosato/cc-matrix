// Couch: 4 stub pads join, each moves its own hero, camera holds them.
import { ok, eq, guarded } from '../lib.mjs';
import { openGame, pressKey, step } from '../../tools/browser.mjs';
const padInit = () => {
  const mk = (i) => ({ index: i, id: `stub ${i}`, connected: true, mapping: 'standard', buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })), axes: [0, 0, 0, 0], timestamp: 0 });
  window.__pads = [mk(0), mk(1), mk(2), mk(3)]; navigator.getGamepads = () => window.__pads;
  window.__press = (i, b, on) => { const p = window.__pads[i]; p.buttons[b].pressed = on; p.buttons[b].value = on ? 1 : 0; };
};
await guarded(async () => {
  const { browser, page, errors } = await openGame({ width: 1280, height: 720, init: padInit });
  const tap = async (b, pad = 0, n = 3) => { await page.evaluate(([x, y, k]) => { __press(y, x, true); E.step(k); __press(y, x, false); E.step(k); }, [b, pad, n]); };
  await step(page, 30); await tap(0); await tap(0); await tap(0); await page.evaluate(() => { G.ui.focus = 'n:last'; }); await step(page, 2); await tap(0); await step(page, 5);
  eq(await page.evaluate(() => G.shell.state), 'play', 'seat one plays');
  for (const pad of [1, 2, 3]) {
    await tap(9, pad); await step(page, 3); eq(await page.evaluate(() => G.play.menus.top?.type), 'joinclass', `pad ${pad} is asked to pick a trade`);
    await page.evaluate((c) => { G.ui.focus = `jc:${c}`; }, ['lamplighter', 'sexton', 'bellwarden'][pad - 1]); await step(page, 2); await tap(0, pad); await step(page, 3);
  }
  eq(await page.evaluate(() => G.play.world.heroes.filter((h) => !h.left).length), 4, 'four heroes in the party'); eq(await page.evaluate(() => G.play.local.length), 4, 'four local seats');
  // Each pad moves its own hero.
  for (const pad of [0, 1, 2, 3]) {
    const before = await page.evaluate(() => G.play.world.heroes.map((h) => [h.x, h.z]));
    await page.evaluate((i) => { __pads[i].axes[0] = i % 2 ? 1 : -1; E.step(20); __pads[i].axes[0] = 0; E.step(2); }, pad);
    const after = await page.evaluate(() => G.play.world.heroes.map((h) => [h.x, h.z]));
    const seat = await page.evaluate((i) => G.router.padSeat[i], pad);
    ok(seat === pad, `pad ${pad} holds seat ${seat}`);
    for (let s = 0; s < 4; s++) { const d = Math.hypot(after[s][0] - before[s][0], after[s][1] - before[s][1]); if (s === seat) ok(d > 0.5, `pad ${pad} moved its hero: ${d}`); else ok(d < 0.3, `pad ${pad} left seat ${s} alone: ${d}`); }
  }
  // Camera holds them: zoomed out, all on screen.
  await page.evaluate(() => { __pads[0].axes[0] = -1; __pads[3].axes[0] = 1; E.step(90); __pads[0].axes[0] = 0; __pads[3].axes[0] = 0; E.step(30); });
  ok((await page.evaluate(() => E.camera.zoom)) < 1, 'camera zooms out');
  const onScreen = await page.evaluate(() => G.play.world.heroes.every((h) => { const p = G.play.view.project(h.x, 1, h.z, G.ui); return p.x > 0 && p.x < G.ui.W && p.y > 0 && p.y < G.ui.H; })); ok(onScreen, 'all heroes on screen');
  const txt = await page.evaluate(() => G.ui.drawnText.map((t) => t.text).join('|')); ok(/LAMPLIGHTER/i.test(txt), 'couch panels drawn');
  ok(await page.evaluate(() => G.play.view.heroes.size === 4), 'four actors');
  // Pause is one seat's: its panel only takes that pad.
  await tap(9, 2); await step(page, 2); eq(await page.evaluate(() => G.play.menus.top?.type), 'pause', 'seat 3 pauses'); eq(await page.evaluate(() => G.game?.menuOwner ?? G.menuOwner), 2, 'seat owns the menu');
  eq(await page.evaluate(() => G.ui.seatFrame), 2, 'panel framed in the seat colour');
  await page.evaluate(() => { G.play.menus.closeAll(); }); await step(page, 3); await tap(8, 1); await step(page, 3); eq(await page.evaluate(() => G.play.menus.top?.type), 'hero', 'seat 2 opens its own Hero screen'); eq(await page.evaluate(() => G.menuOwner), 1, 'seat 2 owns it'); const before = await page.evaluate(() => G.play.menus.top.tab); await tap(5, 3); eq(await page.evaluate(() => G.play.menus.top.tab), before, 'another seat cannot drive it'); await tap(5, 1); ok((await page.evaluate(() => G.play.menus.top.tab)) !== before, 'the owner can'); eq(await page.evaluate(() => E.timeScale), 0, 'the world pauses');
  await page.evaluate(() => { G.play.menus.closeAll(); }); await step(page, 3);
  eq(errors.length, 0, `no page errors: ${errors[0]}`); await browser.close();
});
