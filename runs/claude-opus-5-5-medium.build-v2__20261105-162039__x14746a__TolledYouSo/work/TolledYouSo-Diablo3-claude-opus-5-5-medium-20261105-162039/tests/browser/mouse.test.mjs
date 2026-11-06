// Mouse and keyboard only: hover moves focus, click activates, click-to-move moves, click on a monster attacks, every key works.
import { ok, eq, guarded } from '../lib.mjs';
import { openGame, pressKey, step } from '../../tools/browser.mjs';
await guarded(async () => {
  const { browser, page, errors } = await openGame({ width: 1280, height: 720 });
  const W = 427; const H = 240; const sx = 1280 / W; const sy = 720 / H;
  await step(page, 30); await pressKey(page, 'Enter'); await step(page, 5);
  const rect = (id) => page.evaluate((i) => { const w = G.ui.widgets.find((q) => q.id === i); return w && { x: w.x, y: w.y, w: w.w, h: w.h, W: G.ui.W, H: G.ui.H }; }, id);
  const scale = await page.evaluate(() => [G.ui.W, G.ui.H]); const kx = 1280 / scale[0]; const ky = 720 / scale[1];
  const moveTo = async (id) => { const r = await rect(id); await page.mouse.move((r.x + r.w / 2) * kx, (r.y + r.h / 2) * ky); await page.waitForTimeout(40); await step(page, 3); };
  await moveTo('m:SETTINGS'); eq(await page.evaluate(() => G.ui.focus), 'm:SETTINGS', 'hover moves focus');
  await moveTo('m:ABOUT'); eq(await page.evaluate(() => G.ui.focus), 'm:ABOUT', 'hover moves focus again');
  await moveTo('m:NEW HERO'); await page.mouse.down(); await page.waitForTimeout(30); await step(page, 2); await page.mouse.up(); await page.waitForTimeout(30); await step(page, 3); eq(await page.evaluate(() => G.shell.state), 'newhero', 'click activates');
  await moveTo('cl:bellwarden'); await page.mouse.down(); await page.waitForTimeout(30); await step(page, 2); await page.mouse.up(); await page.waitForTimeout(30); await step(page, 3);
  await moveTo('n:last'); await page.mouse.down(); await page.waitForTimeout(30); await step(page, 2); await page.mouse.up(); await page.waitForTimeout(30); await step(page, 5);
  eq(await page.evaluate(() => G.shell.state), 'play', 'in play by mouse');
  await step(page, 30);
  // Click to move.
  const h0 = await page.evaluate(() => { const h = G.play.world.heroes[0]; return [h.x, h.z]; });
  await page.mouse.move(900, 500); await page.waitForTimeout(30); await step(page, 2);
  await page.mouse.down(); await page.waitForTimeout(30); await step(page, 3); await page.mouse.up(); await page.waitForTimeout(30); await step(page, 90);
  const h1 = await page.evaluate(() => { const h = G.play.world.heroes[0]; return [h.x, h.z]; }); ok(Math.hypot(h1[0] - h0[0], h1[1] - h0[1]) > 1, `click-to-move moved: ${h0} to ${h1}`);
  // Click on a monster attacks.
  await page.evaluate(() => { const w = G.play.world; G.play.command({ c: 'dev', k: 'spawn', type: 'peatwalker' }, 0); E.step(3); const h = w.heroes[0]; const m = w.monsters.at(-1); m.x = h.x + 1.2; m.z = h.z - 1.2; m.px = m.x; m.pz = m.z; m.hp = m.maxHp = 1e6; E.step(3); });
  const mp = await page.evaluate(() => { const w = G.play.world; const m = w.monsters.at(-1); const p = G.play.view.project(m.x, 0.8, m.z, G.ui); return [p.x, p.y]; });
  const seq0 = await page.evaluate(() => G.play.world.heroes[0].castSeq);
  await page.mouse.move(mp[0] * kx, mp[1] * ky); await page.waitForTimeout(30); await step(page, 2); await page.mouse.down(); await page.waitForTimeout(30); await step(page, 30); await page.mouse.up(); await page.waitForTimeout(30); await step(page, 10);
  ok((await page.evaluate(() => G.play.world.heroes[0].castSeq)) > seq0, 'click on a monster attacks');
  // Every key in the table.
  const hero = (f) => page.evaluate(`(() => { const h = G.play.world.heroes[0]; return ${f}; })()`);
  const pos0 = await hero('[h.x,h.z]'); await page.evaluate(() => { E.input.setKey('KeyW', true); E.step(20); E.input.setKey('KeyW', false); E.step(2); }); const pos1 = await hero('[h.x,h.z]'); ok(Math.hypot(pos1[0] - pos0[0], pos1[1] - pos0[1]) > 0.5, 'W moves');
  await page.evaluate(() => { E.input.setKey('ArrowLeft', true); E.step(20); E.input.setKey('ArrowLeft', false); E.step(2); }); ok(Math.hypot((await hero('h.x')) - pos1[0], (await hero('h.z')) - pos1[1]) > 0.5, 'arrows move');
  await page.evaluate(() => { G.play.world.heroes[0].dodgeCd = 0; }); await pressKey(page, 'Space'); ok((await hero('h.dodges')) >= 1, 'Space dodges');
  await page.evaluate(() => { G.play.world.heroes[0].hp = 5; G.play.world.heroes[0].potionCd = 0; }); await pressKey(page, 'KeyQ'); ok((await hero('h.potions')) >= 1, 'Q drinks');
  for (const k of ['Digit1', 'Digit2', 'Digit3', 'Digit4']) { await page.evaluate(() => { const w = G.play.world; w.cheats.noCd = true; w.cheats.infRes = true; E.step(50); }); const s = await hero('h.castSeq'); await pressKey(page, k, 4); await step(page, 5); ok((await hero('h.castSeq')) > s, `${k} casts`); }
  await page.evaluate(() => { const w = G.play.world; const h = w.heroes[0]; h.inv.length = 0; }); const open = async (k, t) => { await step(page, 80); await pressKey(page, k); await step(page, 3); eq(await page.evaluate(() => G.play.menus.top?.type), t, `${k} opens ${t}`); await pressKey(page, 'Escape'); await step(page, 3); };
  await open('KeyI', 'hero'); await open('KeyC', 'hero'); await open('KeyK', 'hero'); await open('KeyL', 'hero'); await open('KeyM', 'map'); await open('Tab', 'map');
  await pressKey(page, 'Escape'); await step(page, 3); eq(await page.evaluate(() => G.play.menus.top?.type), 'pause', 'Esc pauses'); await pressKey(page, 'Escape'); await step(page, 3);
  await page.evaluate(() => { const w = G.play.world; const h = w.heroes[0]; const it = { uid: 'zz', slot: 'ring', rarity: 'reliquary', ilvl: 30, affixes: [{ k: 'power', v: 500 }], name: 'TEST RING', flavour: '' }; h.inv.push(it); h.newest = 'zz'; }); await pressKey(page, 'KeyF'); eq(await hero('h.gear.ring.uid'), 'zz', 'F equips the newest upgrade');
  await page.evaluate(() => { G.play.command({ c: 'dev', k: 'boss', zone: 'causeway' }, 0); E.input.setKey('KeyT', true); E.step(100); E.input.setKey('KeyT', false); E.step(3); }); eq(await page.evaluate(() => G.play.world.zone.id), 'town', 'hold T: the Passing Bell');
  await page.evaluate(() => { E.input.setKey('AltLeft', true); E.step(2); }); ok(await page.evaluate(() => G.router.showLabels), 'Alt shows labels'); await page.evaluate(() => { E.input.setKey('AltLeft', false); E.step(2); });
  eq(errors.length, 0, `no page errors: ${errors[0]}`); await browser.close();
});
