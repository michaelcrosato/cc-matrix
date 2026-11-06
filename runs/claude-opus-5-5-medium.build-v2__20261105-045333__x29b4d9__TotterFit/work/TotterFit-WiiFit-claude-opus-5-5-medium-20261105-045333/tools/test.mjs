// node tools/test.mjs [group ...]  Prints each failure with its reason, then one line: N passed, M failed.
import { chromium, webkit } from 'playwright'; import { dirname, join } from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url'; import { readdirSync } from 'node:fs';
const here = dirname(dirname(fileURLToPath(import.meta.url))); process.chdir(here);
export const NAME = here.split('/').pop(); export const HTML = join(here, '..', `${NAME}.html`); export const EXIT = join(here, '..', 'exit-interview.json'); export const URLBASE = pathToFileURL(HTML).href;
export const RENDER = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-webgpu-adapter=swiftshader', '--use-vulkan=swiftshader', '--use-angle=swiftshader'];
let pass = 0, fail = 0; const t0 = Date.now();
export const T = { ok(c, msg) { if (c) pass++; else { fail++; console.log(`FAIL ${msg}`); } return c; }, eq(a, b, msg) { return T.ok(a === b, `${msg}: got ${JSON.stringify(a)}, wanted ${JSON.stringify(b)}`); }, note(m) { if (process.env.V) console.log(m); } };
export const PAD = `(() => { const blank = () => ({ connected: false, mapping: 'standard', axes: [0,0,0,0], buttons: Array.from({length:17}, () => ({pressed:false,value:0})), vibrationActuator:{playEffect(){ window.__rumble=(window.__rumble||0)+1; return Promise.resolve(); }} });
  window.__pads = [blank(), blank(), blank(), blank()]; window.__pads[0].connected = !!window.__padOn; navigator.getGamepads = () => window.__pads; })();`;
export async function openPage(browser, { query = 'test=1&render=0&manual=1', pad = true, context = {}, keepStorage = false, url } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, ...context }); const page = await ctx.newPage(); page.errors = []; page.on('pageerror', (e) => page.errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) page.errors.push(m.text()); });
  if (pad) await page.addInitScript(PAD);
  await page.goto(url || `${URLBASE}?${query}`); await page.waitForFunction(() => window.__TEST__ || window.__BOOTERR__, null, { timeout: 120000 });
  return page;
}
const groups = process.argv.slice(2); const all = readdirSync('test').filter(f => f.endsWith('.mjs')).map(f => f.replace('.mjs', ''));
const run = groups.length ? (groups.includes('full') ? ['unit', 'flow', 'events', 'balance', 'input', 'coverage', 'audio', 'hub', 'ui'] : groups) : all;
let browser = null; const getBrowser = async () => (browser ||= await chromium.launch({ args: ['--no-sandbox'] }));
for (const g of run) { try { const m = await import(pathToFileURL(join(here, 'test', `${g}.mjs`)).href); await m.default({ T, openPage, getBrowser, RENDER, HTML, EXIT, URLBASE, chromium, webkit, NAME, here }); } catch (e) { T.ok(false, `${g} crashed: ${e && e.stack || e}`); } if (browser) { await browser.close().catch(() => {}); browser = null; } } // A fresh browser per group: this computer is shared.
if (browser) await browser.close();
console.log(`${pass} passed, ${fail} failed (${Math.round((Date.now() - t0) / 1000)} s)`); process.exit(fail ? 1 : 0);
