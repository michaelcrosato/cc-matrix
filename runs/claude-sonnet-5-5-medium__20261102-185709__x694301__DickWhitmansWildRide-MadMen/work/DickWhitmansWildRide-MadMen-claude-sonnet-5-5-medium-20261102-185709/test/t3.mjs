import { open } from './lib.mjs';
const { browser, page, errors } = await open({ q: '?debug' });
await page.evaluate(() => { __game.go('attract'); __game.timeScale = 3; });
for (let i = 0; i < 16; i++) {
  await page.waitForTimeout(6000);
  const st = await page.evaluate(() => JSON.stringify({ sc: __game.scene && __game.scene.name, mode: __M.mode, w: __M.S.world, clk: Math.round(__M.S.clock), f: Object.keys(__M.S.flags).join(','), rep: __M.S.rep, talk: __M.talkRef().open, h: [Math.round(__M.hero.x), Math.round(__M.hero.y)] }));
  console.log(i * 5, st);
  if (i % 4 == 1) await page.screenshot({ path: `/tmp/dw_demo_${i}.png` });
  if (errors.length) { console.log(errors.slice(0, 8).join('\n')); break; }
}
await browser.close();
