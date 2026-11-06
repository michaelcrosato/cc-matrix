// Usage: node tests/shot.mjs <html> <out.png> [js-to-eval-before-shot] [steps]
import { chromium } from 'playwright'; import { resolve } from 'node:path';
const [,, file, out, js = '', steps = '60'] = process.argv;
const b = await chromium.launch({ headless: true, args: ['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader','--use-webgpu-adapter=swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 300))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
await p.goto('file://' + resolve(file));
try {
  const r = await p.evaluate(async ({ js, steps }) => { const e = await window.__PIXEL_READY__; if (js) await (0, eval)(`(async()=>{${js}})()`); e.step(+steps); const err = e.errors.slice(0, 3).map(x => String(x.message ?? x)); return { status: e.state().status, err, dbg: window.__dbg ?? null }; }, { js, steps: +steps });
  console.log(JSON.stringify(r));
  await p.evaluate(async () => { const e = await window.__PIXEL_READY__; e.manual = false; await new Promise(r => setTimeout(r, 1500)); });
} catch (e) { console.log('EVAL ERR', String(e).slice(0, 400)); }
console.log('page errors:', JSON.stringify(errs.slice(0, 6)));
await p.screenshot({ path: out }); await b.close();
