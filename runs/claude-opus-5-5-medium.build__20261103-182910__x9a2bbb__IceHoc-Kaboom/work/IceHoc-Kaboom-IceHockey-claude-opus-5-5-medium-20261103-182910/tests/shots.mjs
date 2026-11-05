// Screenshots for what scripts can't judge: node tests/shots.mjs "name|hash|waitMs|js-before" ...
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const NAME = 'IceHoc-Kaboom-IceHockey-claude-opus-5-5-medium-20261103-182910';
const url = new URL('../../' + NAME + '.html', import.meta.url).href;
mkdirSync(new URL('../shots/', import.meta.url), { recursive: true });
const size = (process.env.SIZE || '1280x720').split('x').map(Number);
const b = await chromium.launch();
for (const spec of process.argv.slice(2)) {
  const [name, hash, wait, js, wait2] = spec.split('|');
  const p = await b.newPage({ viewport: { width: size[0], height: size[1] } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(url + (hash ? '#' + hash : '')); await p.waitForTimeout(+wait || 2000);
  if (js) { await p.evaluate(js); await p.waitForTimeout(+wait2 || 1000); }
  await p.screenshot({ path: new URL('../shots/' + name + '.png', import.meta.url).pathname });
  const st = await p.evaluate(() => JSON.stringify(window.__game && window.__game.game.debug.snapshot()).slice(0, 200));
  const e2 = await p.evaluate(() => window.__game ? window.__game.game.errors.map(e => e.message) : []);
  console.log(name, st, errs.concat(e2).slice(0, 3).join(' | '));
  await p.close();
}
await b.close();
