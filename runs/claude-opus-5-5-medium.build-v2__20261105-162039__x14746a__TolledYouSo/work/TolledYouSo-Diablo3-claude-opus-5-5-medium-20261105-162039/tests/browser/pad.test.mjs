// Pad only: press through title, hero select, play, skills, Hero screen, pause, dev mode, settings, quit. Glyphs follow the last device.
import { ok, eq, guarded } from '../lib.mjs';
import { openGame, step } from '../../tools/browser.mjs';
const padInit = () => {
  const mk = (i) => ({ index: i, id: `stub ${i}`, connected: true, mapping: 'standard', buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })), axes: [0, 0, 0, 0], timestamp: 0 });
  window.__pads = [mk(0), null, null, null]; navigator.getGamepads = () => window.__pads;
  window.__press = (i, b, on) => { const p = window.__pads[i]; p.buttons[b].pressed = on; p.buttons[b].value = on ? 1 : 0; };
};
export const tap = async (page, b, pad = 0, n = 3) => { await page.evaluate(([x, y, k]) => { __press(y, x, true); E.step(k); __press(y, x, false); E.step(k); }, [b, pad, n]); };
await guarded(async () => {
  const { browser, page, errors } = await openGame({ width: 1280, height: 720, init: padInit });
  await step(page, 30);
  const CROSS = 0; const CIRCLE = 1; const SQUARE = 2; const TRI = 3; const L1 = 4; const R1 = 5; const OPT = 9; const CREATE = 8; const DOWN = 13; const RIGHT = 15;
  const st = () => page.evaluate(() => G.shell.state); const txt = () => page.evaluate(() => G.ui.drawnText.map((t) => t.text).join('|'));
  await tap(page, CROSS); eq(await st(), 'menu', 'pad leaves the title');
  eq(await page.evaluate(() => G.router.lastDevice), 'pad', 'last device is the pad');
  await tap(page, CROSS); eq(await st(), 'newhero', 'NEW HERO by pad');
  await tap(page, RIGHT); await tap(page, CROSS); ok((await txt()).includes('THE BEGINNING'), 'start choice');
  await tap(page, DOWN); await page.evaluate(() => { G.ui.focus = 'n:last'; }); await step(page, 2); await tap(page, CROSS); await step(page, 3);
  eq(await st(), 'play', 'in play by pad');
  const cls = await page.evaluate(() => G.play.world.heroes[0].cls); eq(cls, 'lamplighter', 'second class by pad');
  await step(page, 5);
  eq(await page.evaluate(() => { G.ui.frameN; return G.ui.lastPromptKind; }), 'playstation', 'PlayStation glyphs');
  // Moves with the stick, attacks with Cross.
  const x0 = await page.evaluate(() => G.play.world.heroes[0].x + G.play.world.heroes[0].z);
  await page.evaluate(() => { __pads[0].axes[1] = -1; E.step(30); __pads[0].axes[1] = 0; E.step(2); });
  ok(Math.abs((await page.evaluate(() => G.play.world.heroes[0].x + G.play.world.heroes[0].z)) - x0) > 1, 'stick moves the hero');
  await page.evaluate(() => { G.play.command({ c: 'dev', k: 'spawn', type: 'peatwalker' }, 0); E.step(2); }); const s0 = await page.evaluate(() => G.play.world.heroes[0].castSeq);
  await tap(page, SQUARE); await step(page, 3); ok((await page.evaluate(() => G.play.world.heroes[0].castSeq)) > s0, 'Square casts a skill');
  await page.evaluate(() => { G.play.world.heroes[0].dodgeCd = 0; }); await tap(page, 6); ok((await page.evaluate(() => G.play.world.heroes[0].dodges)) >= 1, 'L2 dodges');
  await page.evaluate(() => { G.play.world.heroes[0].hp = 10; }); await tap(page, L1); ok((await page.evaluate(() => G.play.world.heroes[0].potions)) >= 1, 'L1 drinks');
  // Hero screen on Create's release, tabs on L1 and R1.
  await tap(page, CREATE); await step(page, 3); eq(await page.evaluate(() => G.play.menus.top?.type), 'hero', 'Create opens the Hero screen');
  await tap(page, R1); ok((await txt()).includes('VOWS'), 'R1 goes to skills');
  await tap(page, CROSS); ok((await txt()).includes('PICK A SKILL'), 'Cross opens the skill picker'); await tap(page, CIRCLE); ok((await txt()).includes('VOWS'), 'Circle backs out');
  await tap(page, L1); ok((await txt()).includes('EQUIP'), 'L1 back to gear'); await tap(page, CIRCLE); eq(await page.evaluate(() => G.play.menus.open), false, 'Circle closes');
  // Pause, dev mode, settings, quit.
  await tap(page, OPT); ok((await txt()).includes('DEV MODE'), 'Options pauses');
  await page.evaluate(() => { G.ui.focus = 'pause:DEV MODE'; }); await step(page, 2); await tap(page, CROSS); eq(await page.evaluate(() => G.play.menus.top?.type), 'dev', 'dev mode by pad');
  await tap(page, R1); await tap(page, CIRCLE);
  await page.evaluate(() => { G.ui.focus = 'pause:SETTINGS'; }); await step(page, 2); await tap(page, CROSS); ok((await txt()).includes('BUTTON GLYPHS'), 'settings by pad');
  await page.evaluate(() => { G.ui.focus = 'set:BUTTON GLYPHS'; }); await step(page, 2); await tap(page, CROSS); await step(page, 2); eq(await page.evaluate(() => G.ui.glyphs), 'xbox', 'Xbox option');
  eq(await page.evaluate(() => G.ui.lastPromptKind), 'xbox', 'Xbox glyphs drawn');
  // A key press switches prompts to keycaps; a pad press switches back.
  await page.evaluate(() => { E.input.setKey('KeyX', true); E.step(2); E.input.setKey('KeyX', false); E.step(2); }); eq(await page.evaluate(() => G.router.lastDevice), 'kbm', 'a key switches to keyboard'); eq(await page.evaluate(() => G.ui.lastPromptKind), 'key', 'keycaps drawn');
  await tap(page, DOWN, 0, 2); eq(await page.evaluate(() => G.router.lastDevice), 'pad', 'a pad press switches back');
  await tap(page, CIRCLE); await page.evaluate(() => { G.ui.focus = 'pause:SAVE AND QUIT'; }); await step(page, 2); await tap(page, CROSS); await step(page, 2); eq(await st(), 'menu', 'quit by pad');
  void TRI;
  eq(errors.length, 0, `no page errors: ${errors[0]}`); await browser.close();
});
