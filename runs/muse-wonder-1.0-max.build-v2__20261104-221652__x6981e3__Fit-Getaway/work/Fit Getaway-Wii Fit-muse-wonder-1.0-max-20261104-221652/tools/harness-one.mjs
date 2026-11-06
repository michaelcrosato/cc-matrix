import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { chromium } from 'playwright';
const dir = decodeURIComponent(new URL('../.harness/', import.meta.url).pathname);
const types = { '.html': 'text/html', '.js': 'text/javascript' };
const server = createServer(async (req, res) => {
  try { const name = decodeURIComponent(new URL(req.url, 'http://x').pathname.slice(1)) || 'harness.html'; const data = await readFile(join(dir, name)); res.writeHead(200, { 'Content-Type': types[extname(name)] || 'application/octet-stream' }); res.end(data); }
  catch { res.writeHead(404); res.end('nf'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const browser = await chromium.launch({ args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader'] });
const page = await browser.newPage();
page.on('console', m => console.log('[console]', m.type(), m.text().slice(0, 300)));
page.on('pageerror', e => console.log('[pageerror]', e.message.slice(0, 500)));
await page.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&auto=1&players=1`);
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(5000);
  const s = await page.evaluate(() => ({ complete: document.body.dataset.complete, title: document.title, check: window.__hubCheck ? { pass: window.__hubCheck.pass, keys: Object.keys(window.__hubCheck) } : null, body: document.body.innerText.slice(0, 800) })).catch(e => ({ err: e.message }));
  console.log(i * 5 + 's', JSON.stringify(s).slice(0, 1200));
  if (s.complete === 'true') break;
}
await browser.close(); server.close();
