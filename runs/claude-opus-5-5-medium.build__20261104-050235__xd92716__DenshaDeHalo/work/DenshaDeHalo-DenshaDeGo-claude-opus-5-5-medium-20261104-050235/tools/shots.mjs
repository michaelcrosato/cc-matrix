// node tools/shots.mjs name=hash[@ms][!keys] ...  -> shots/name.png (1280x720 by default) from the bundle (file://)
import { createRequire } from 'node:module';
const require = createRequire(new URL('../engine/package.json', import.meta.url));
const { chromium } = require('playwright');
const NAME = 'DenshaDeHalo-DenshaDeGo-claude-opus-5-5-medium-20261104-050235';
const url = new URL('../../' + NAME + '.html', import.meta.url).href;
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const size = (process.env.SIZE || '1280x720').split('x').map(Number);
for (const arg of process.argv.slice(2)) {
  const name = arg.slice(0, arg.indexOf('=')), rest = arg.slice(arg.indexOf('=') + 1), [hash, wait] = (rest || '').split('@'), [ms, js] = (wait || '1500').split('!');
  const p = await b.newPage({ viewport: { width: size[0], height: size[1] } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  await p.goto(url + '#' + hash); await p.waitForTimeout(+ms);
  if (js) { await p.evaluate(js); await p.waitForTimeout(800); }
  await p.screenshot({ path: new URL('../shots/' + name + '.png', import.meta.url).pathname });
  const snap = await p.evaluate(() => window.__dh && JSON.stringify(window.__dh.snapshot()).slice(0, 300));
  console.log(name, errs.slice(0, 4).join(' | ') || 'ok', snap);
  await p.close();
}
await b.close();
