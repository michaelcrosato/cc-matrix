import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { chromium } from 'playwright';

const dir = decodeURIComponent(new URL('../.harness/', import.meta.url).pathname);
const types = { '.html': 'text/html', '.js': 'text/javascript' };
const server = createServer(async (req, res) => {
  try {
    const name = decodeURIComponent(new URL(req.url, 'http://x').pathname.slice(1)) || 'harness.html';
    const data = await readFile(join(dir, name));
    res.writeHead(200, { 'Content-Type': types[extname(name)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
console.log('port', port);
const cases = [
  'harness.html?game=game.html&auto=1&players=1',
  'harness.html?game=game.html&auto=1&players=2',
  'harness.html?game=game.html&auto=1&players=4&latency=150&jitter=50&loss=5',
  'harness.html?game=game.html&auto=1&players=4&latency=150&jitter=50&loss=5&scenario=host-leave',
];
const browser = await chromium.launch({ args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader'] });
let allPass = true;
for (const c of cases) {
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', c, e.message));
  await page.goto(`http://127.0.0.1:${port}/${c}`);
  try {
    await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 120000 });
    const result = await page.evaluate(() => ({ pass: window.__hubCheck?.pass, checks: window.__hubCheck?.checks || window.__hubCheck }));
    console.log(c, 'pass=', result.pass);
    if (!result.pass) { allPass = false; console.log(JSON.stringify(result.checks, null, 1).slice(0, 4000)); }
  } catch (e) {
    allPass = false;
    const dump = await page.evaluate(() => ({ complete: document.body.dataset.complete, check: window.__hubCheck })).catch(() => null);
    console.log(c, 'TIMEOUT', JSON.stringify(dump).slice(0, 3000));
  }
  await page.close();
}
await browser.close();
server.close();
console.log(allPass ? 'HARNESS ALL PASS' : 'HARNESS FAILURES');
process.exitCode = allPass ? 0 : 1;
