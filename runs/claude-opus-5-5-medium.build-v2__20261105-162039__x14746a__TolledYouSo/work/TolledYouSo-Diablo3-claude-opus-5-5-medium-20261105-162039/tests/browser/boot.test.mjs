// Boot: no page, console, game or GPU errors. The picture isn't blank. The bundle is one file: session.js byte-identical and first; metas present.
import { readFileSync } from 'node:fs';
import { ok, eq, guarded } from '../lib.mjs';
import { HTML, openGame, pressKey, step } from '../../tools/browser.mjs';
await guarded(async () => {
  const html = readFileSync(HTML, 'utf8'); const session = readFileSync('session.js', 'utf8');
  const first = html.indexOf('<script>'); ok(first > 0 && html.indexOf('<meta charset') < first, 'charset then the first script');
  ok(html.slice(first + 8).startsWith(session), 'session.js byte-identical and first');
  for (const m of ['hub:session', 'hub:session-players', 'hub:session-mode', 'hub:session-minutes', 'hub:session-goal', 'hub:session-howto', 'hub:webgpu']) ok(html.includes(`name="${m}"`), `meta ${m}`);
  ok(html.indexOf('hub:session') < html.indexOf('<title>'), 'metas before title');
  ok(!/src="|href="http/.test(html.replace(/<script type="module">[\s\S]*$/, '')), 'nothing external');
  const { browser, page, errors } = await openGame({ width: 1280, height: 720 });
  await step(page, 30);
  const blank = await page.evaluate(async () => { const f = await E.renderer.capture(); const p = f.pixels; let lo = 255; let hi = 0; for (let i = 0; i < p.length; i += 97) { lo = Math.min(lo, p[i]); hi = Math.max(hi, p[i]); } return hi - lo; });
  ok(blank > 8, `picture is not blank: ${blank}`);
  const st = await page.evaluate(() => E.state()); eq(String(st.backend).toLowerCase(), 'webgpu', 'WebGPU in use'); eq(await page.evaluate(() => E.errors.length), 0, 'no game errors'); ok((st.gpuErrors?.length ?? 0) === 0, 'no GPU errors');
  eq(st.game, 'Tolled You So', 'the page is the game');
  await pressKey(page, 'Enter'); await step(page, 3); eq(await page.evaluate(() => G.shell.state), 'menu', 'menu');
  eq(errors.length, 0, `no page errors: ${errors[0]}`);
  await browser.close();
});
