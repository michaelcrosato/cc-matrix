import { open, OUT } from './open.mjs';
import path from 'node:path';
const [,, scene = 'play', area = 't00', n = '3', wait = '2500'] = process.argv;
const { browser, page, errors } = await open();
if (scene === 'room7') await page.evaluate(() => window.__game.debug.go('room7', {}));
else await page.evaluate(([a]) => window.__game.debug.play(a, true), [area]);
for (let i = 0; i < +n; i++) {
  await page.waitForTimeout(+wait);
  const s = await page.evaluate(() => window.__game.debug.snapshot());
  console.log(i, s.scene, s.area, s.leg, s.s, s.mode, s.hp, s.enemies && JSON.stringify(s.enemies), s.boss ? s.boss.hp : '-');
  await page.screenshot({ path: path.join(OUT, `${scene}-${area}-${i}.png`) });
}
console.log(errors.slice(0, 8).join('\n') || 'no errors');
await browser.close();
