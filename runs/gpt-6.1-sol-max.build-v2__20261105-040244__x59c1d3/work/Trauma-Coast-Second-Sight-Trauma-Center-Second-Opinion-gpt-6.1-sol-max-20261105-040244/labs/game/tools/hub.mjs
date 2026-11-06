/** @file Official AI Hub harness acceptance, on a task-owned ephemeral loopback HTTP server. */
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { createReadStream, copyFileSync, existsSync, readFileSync, globSync, writeFileSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { homedir } from 'node:os';
const { base } = JSON.parse(readFileSync('identity.json', 'utf8')),
  root = resolve('out/hub');
copyFileSync(resolve('..', base + '.html'), resolve(root, 'game.html'));
const server = createServer((req, res) => {
  const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname));
  if (!path.startsWith(root + sep) || !existsSync(path)) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.setHeader('Content-Type', extname(path) === '.html' ? 'text/html' : 'text/javascript');
  createReadStream(path).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port,
  url = `http://127.0.0.1:${port}`;
const records = [];
let browser;
const check = (name, ok, detail = '') => {
  records.push({ name, ok: !!ok, detail });
  console.log(JSON.stringify(records.at(-1)));
};
try {
  const content = await (await fetch(url + '/game.html')).text();
  if (!content.includes('<title>Trauma Coast: Second Sight</title>'))
    throw new Error('Loopback server returned the wrong game');
  browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ?? globSync(`${homedir()}/.cache/ms-playwright/chromium-*/chrome-linux64/chrome`)[0],
    args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader'],
  });
  for (const [name, query] of [
    ['two players', 'players=2'],
    ['four players under loss', 'players=4&latency=150&jitter=50&loss=5'],
    ['host leaves', 'players=4&latency=150&jitter=50&loss=5&scenario=host-leave'],
    ['dedicated host', 'players=2&scenario=server'],
  ]) {
    const page = await browser.newPage({ viewport: { width: 1000, height: 720 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${url}/harness.html?game=game.html&${query}&limit=8&auto=1`);
    await page
      .waitForFunction(() => document.body.dataset.complete === 'true', undefined, { timeout: 120000 })
      .catch(() => {});
    const result = await page.evaluate(() => ({
      check: window.__hubCheck,
      text: document.body.innerText.slice(-6000),
    }));
    const frames = [];
    for (const frame of page.frames().slice(1)) {
      try {
        frames.push(
          await frame.evaluate(() => ({
            mismatches: (window.__surgery?.session ?? window.__surgerySession)?.seq.mismatches ?? 0,
            checked: (window.__surgery?.session ?? window.__surgerySession)?.seq.checked ?? 0,
            engineErrors: window.__engine?.errors ?? [],
          })),
        );
      } catch {}
    }
    const mismatches = frames.reduce((n, f) => n + f.mismatches, 0);
    check(
      'AI Hub ' + name,
      result.check?.pass === true && mismatches === 0 && errors.length === 0,
      JSON.stringify({
        check: result.check,
        mismatches,
        frames,
        errors,
        text: result.check?.pass ? '' : result.text,
      }).slice(0, 7000),
    );
    await page.close();
  }
} catch (error) {
  check('AI Hub harness', false, String(error.stack ?? error));
} finally {
  if (browser) await browser.close();
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
  writeFileSync(resolve(root, 'results.json'), JSON.stringify(records, null, 2) + '\n');
}
process.exitCode = records.some((r) => !r.ok) ? 1 : 0;
