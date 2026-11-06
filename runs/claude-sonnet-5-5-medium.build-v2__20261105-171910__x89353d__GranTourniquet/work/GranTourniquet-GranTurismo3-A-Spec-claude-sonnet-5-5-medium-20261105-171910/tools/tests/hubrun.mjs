import { launch, serve, sleep } from './lib.mjs';
const srv = await serve(new URL('../.hubtest/', import.meta.url).pathname), b = await launch();
try {
  for (const q of ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=2&scenario=host-leave&auto=1']) {
    const pg = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; pg.on('pageerror', (e) => errs.push(String(e))); pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await pg.goto(`http://127.0.0.1:${srv.port}/harness.html?game=game.html&${q}`); let ok = null; for (let i = 0; i < 120; i++) { await sleep(1000); ok = await pg.evaluate(() => ({ pass: window.__hubCheck?.pass, done: document.body.dataset.complete })); if (ok.done === 'true') break; }
    const rep = await pg.evaluate(() => JSON.stringify(window.__hubCheck, null, 0).slice(0, 6000)); console.log(q, JSON.stringify(ok), errs.slice(0, 3)); if (!ok.pass) console.log(rep); await pg.close();
  }
} finally { await b.close(); srv.stop(); }
