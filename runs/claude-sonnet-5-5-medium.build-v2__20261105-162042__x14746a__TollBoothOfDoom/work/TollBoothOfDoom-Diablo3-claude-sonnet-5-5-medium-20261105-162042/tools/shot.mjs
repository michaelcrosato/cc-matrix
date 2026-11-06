// node tools/shot.mjs "query" frames out.png [width height]  -> opens the bundle, steps, saves a screenshot with the HUD
import { launch, openGame, HTML } from './browser.mjs';
import { pathToFileURL } from 'node:url';
const [q = '', frames = '60', out = 'shots/x.png', w = '1280', h = '720', keys = ''] = process.argv.slice(2);
const b = await launch();
try {
  const url = pathToFileURL(HTML).href + (q ? '?' + q : '');
  const { page, errors } = await openGame(b, { url, viewport: { width: +w, height: +h } });
  await page.evaluate(async (n) => { const e = await window.__PIXEL_READY__; e.manual = true; e.step(n); await new Promise((r) => setTimeout(r, 50)); }, +frames);
  if (keys) { for (const k of keys.split(',')) { const [code, n] = k.split('*'); await page.evaluate(async ([c, n]) => { const e = window.__PIXEL_ENGINE__; e.input.setKey(c, true); e.step(+n); e.input.setKey(c, false); }, [code, n || '30']); } }
  if (process.env.SHOT_JS) { await page.evaluate(async (js) => { const e = window.__PIXEL_ENGINE__; await (new Function('return (async () => {' + js + '})()'))(); e.manual = true; e.step(40); }, process.env.SHOT_JS); }
  // draw a frame: step with manual off briefly so the page paints
  await page.evaluate(async () => { const e = window.__PIXEL_ENGINE__; e.manual = false; await new Promise((r) => setTimeout(r, 900)); });
  await page.screenshot({ path: out });
  const st = await page.evaluate(() => { const e = window.__PIXEL_ENGINE__; return JSON.stringify({ status: e.state().status, errors: e.errors, gpu: e.state().gpuErrors }); });
  console.log(st); if (errors.length) console.log(errors.slice(0, 6).join('\n'));
} finally { await b.close(); }
