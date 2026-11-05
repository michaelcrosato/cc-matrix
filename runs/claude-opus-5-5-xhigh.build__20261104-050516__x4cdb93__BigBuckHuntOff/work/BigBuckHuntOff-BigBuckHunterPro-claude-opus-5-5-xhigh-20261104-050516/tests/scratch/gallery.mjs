// screenshots of deep links in one browser: node tests/scratch/gallery.mjs '#hunt/bugle/1@14000' ...
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
for (const spec of process.argv.slice(2)) {
  const [hash, ms = '12000', bot = 'expert'] = spec.split('@'); const p = await b.newPage({ viewport: { width: 1440, height: 810 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(pathToFileURL(resolve('../BigBuckHuntOff-BigBuckHunterPro-claude-opus-5-5-xhigh-20261104-050516.html')).href + hash);
  await p.waitForTimeout(2600);
  if (bot !== 'none') await p.evaluate(s => { const g = My3D2dge.current; if (g.debug.hunt()) g.debug.bot(true, { skill: s }); }, bot);
  await p.waitForTimeout(+ms);
  const name = 'tests/out/g-' + hash.slice(1).replace(/\//g, '-') + '.png'; await p.screenshot({ path: name });
  const info = await p.evaluate(() => { const g = My3D2dge.current, s = g.debug.snapshot(); return { seg: s.segment, site: s.site, score: (s.players[0] || {}).score, fps: g.fps, errors: g.errors.length }; });
  console.log(name, JSON.stringify(info), errs.slice(0, 3).join(' | '));
  await p.close();
}
await b.close();
