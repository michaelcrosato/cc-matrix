// The hub harness: 2 players, 4 players with latency/jitter/loss, and host-leave; then the game outside a session reaches the title.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';
import { launch, serve, sleep } from './lib.mjs';
export default async (t) => {
  mkdirSync('tools/.hubtest', { recursive: true }); for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync('tools/hub/' + f, 'tools/.hubtest/' + f); execFileSync('node', ['tools/build.mjs', 'tools/.hubtest/game.html'], { stdio: 'ignore' });
  const srv = await serve(process.cwd() + '/tools/.hubtest'), b = await launch();
  try {
    for (const q of ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=2&scenario=host-leave&auto=1']) {
      let pg, attempt = 0; for (;;) { try { pg = await b.newPage({ viewport: { width: 1280, height: 720 } }); break; } catch (e) { if (++attempt > 2) throw e; } } const errs = []; pg.on('pageerror', (e) => errs.push(String(e)));
      await pg.goto(`http://127.0.0.1:${srv.port}/harness.html?game=game.html&${q}`); let ok = {}, msMax = 0; for (let i = 0; i < 150; i++) { await sleep(1000); if (q.startsWith('players=2&auto') && msMax < 6) for (const f of pg.frames()) { try { msMax = Math.max(msMax, await f.evaluate(() => window.__MARSHALS__ ?? 0)); } catch {} } ok = await pg.evaluate(() => ({ pass: window.__hubCheck?.pass, done: document.body.dataset.complete })); if (ok.done === 'true') break; }
      if (q.startsWith('players=2&auto')) { let m = null; for (const f of pg.frames()) { try { const v = await f.evaluate(() => window.__HUBMUSIC__ ?? null); if (v != null) m = v; } catch {} } t.check(m !== null && Math.abs(m - 0.1) < 0.001, 'music is 10% in a real session: ' + m); let ms = msMax; t.check(ms >= 6, 'marshals appear in a real hub round: ' + ms); }
      t.check(ok.done === 'true' && ok.pass === true, 'hub harness ' + q + ' ' + JSON.stringify(ok)); t.check(errs.length === 0, 'hub page errors ' + errs[0]); await pg.close();
    }
    const pg = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; pg.on('pageerror', (e) => errs.push(String(e))); await pg.goto(`http://127.0.0.1:${srv.port}/game.html`); await sleep(5000);
    const s = await pg.evaluate(() => window.__GAME__?.state()); t.check(s?.scene === 'menu' && s.screen === 'title', 'outside a session the game reaches the title: ' + JSON.stringify(s)); t.check(errs.length === 0, 'standalone errors ' + errs[0]); await pg.close();
  } finally { await b.close(); srv.stop(); }
};
