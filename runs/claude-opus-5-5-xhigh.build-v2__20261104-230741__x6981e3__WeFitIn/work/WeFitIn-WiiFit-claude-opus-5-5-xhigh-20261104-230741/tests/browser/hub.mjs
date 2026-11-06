// Test 21-22: the four harness runs, all `pass`, then a normal boot outside a session.
import { assert, done, test } from '../lib-pure.mjs';
import { bootPage, launch, serveHarness } from './_lib.mjs';

const browser = await launch();
const server = await serveHarness();
const base = `http://127.0.0.1:${server.port}`;
const RUNS = [
  'players=1',
  'players=2',
  'players=4&latency=150&jitter=50&loss=5',
  'players=4&latency=150&jitter=50&loss=5&scenario=host-leave',
];
for (const run of RUNS) {
  await test(`hub harness ${run}`, async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(`${base}/harness.html?game=game.html&auto=1&${run}`);
    await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 170000 });
    const report = await page.evaluate(() => ({ pass: window.__hubCheck.pass, checks: window.__hubCheck.checks.filter((c) => !c.pass) }));
    const title = await page.evaluate(() => document.querySelector('iframe')?.contentDocument?.title ?? '');
    await page.close();
    assert(title === 'We Fit In', `served page is not the game: "${title}"`);
    assert(report.pass, report.checks.map((c) => `${c.name}: ${c.detail}`).join(' | '));
  });
}
await test('outside a session: normal boot, AIHub.active false', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await bootPage(page, `${base}/game.html`);
  const s = await page.evaluate(() => ({ active: !!window.AIHub?.active, scene: window.__GAME__.state().scene }));
  await page.close();
  assert(!s.active, 'AIHub.active should be false');
  assert(s.scene === 'title', `scene ${s.scene}`);
  assert(!errors.length, errors.join(' | '));
});
await browser.close();
server.stop();
done();
