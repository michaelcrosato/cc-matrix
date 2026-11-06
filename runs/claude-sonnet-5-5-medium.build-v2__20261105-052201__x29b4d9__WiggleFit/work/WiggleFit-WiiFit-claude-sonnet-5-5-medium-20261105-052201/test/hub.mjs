import { chromium } from 'playwright';
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { RENDER, GAME, url } from '../tools/lib.mjs';
import { FILE } from '../src/data/config.js';
import { S, adv, press } from '../tools/drive.mjs';
const MIME = { '.html': 'text/html', '.js': 'text/javascript' };
function serve() {
  const files = { '/harness.html': 'tools/hub/harness.html', '/bridge.js': 'tools/hub/bridge.js', '/round.js': 'tools/hub/round.js', ['/' + FILE + '.html']: GAME };
  const srv = http.createServer((req, res) => { const u = req.url.split('?')[0]; const f = files[u]; if (!f || !existsSync(f)) { res.writeHead(404); res.end('no'); return; } res.writeHead(200, { 'content-type': u.endsWith('.js') ? 'text/javascript' : 'text/html' }); res.end(readFileSync(f)); });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv)));
}
export default async function (t) {
  const srv = await serve(); const port = srv.address().port; const base = `http://127.0.0.1:${port}`;
  try {
    const b = await chromium.launch({ args: [...RENDER, '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
    // confirm the page is our game
    const chk = await b.newPage(); await chk.goto(`${base}/${FILE}.html?test=1&render=0&manual=1&audio=0`); await chk.waitForFunction(() => window.__done, null, { timeout: 60000 }); t.ok(await chk.evaluate(() => document.title === 'Wiggle Fit' && !!window.__TEST__), 'the served page is the game');
    // on its own: Enter and Space on the title are harmless
    await chk.evaluate(() => window.__TEST__.advance(2)); for (const k of ['Enter', 'Space', 'Enter', 'Space']) { await chk.keyboard.press(k === 'Space' ? ' ' : k); await chk.evaluate(() => window.__TEST__.advance(0.3)); } const st = await chk.evaluate(() => window.__TEST__.state()); t.ok(!(await chk.evaluate(() => window.AIHub.active)), 'AIHub is not active on its own'); t.ok(st.errors.length === 0 && ['menu', 'profiles', 'title', 'island'].includes(st.screen), 'Enter/Space on the title are harmless (' + st.screen + ')'); await chk.close();
    const runs = [['players=1', 'one player'], ['players=2', 'two players'], ['players=4&latency=150&jitter=50&loss=5', 'four players, bad network'], ['players=4&latency=150&jitter=50&loss=5&scenario=host-leave', 'four players, host leaves']];
    for (const [q, name] of runs) {
      const pg = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message.slice(0, 120)));
      const render0 = q.startsWith('players=4') ? '%3Frender%3D0' : '';
      await pg.goto(`${base}/harness.html?game=${FILE}.html${render0}&${q}&auto=1&limit=190`);
      try { await pg.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 280000 }); } catch (e) { t.ok(false, `hub ${name}: harness did not complete`); }
      const res = await pg.evaluate(() => (window.__hubCheck ? { pass: window.__hubCheck.pass, fails: (window.__hubCheck.checks || window.__hubCheck.items || []).filter((c) => c && c.ok === false || c.pass === false).map((c) => c.name || c.label || JSON.stringify(c)).slice(0, 6) } : null));
      t.ok(res && res.pass, `hub ${name}: harness passes ${res ? JSON.stringify(res.fails) : 'no result'}`); await pg.close();
    }
    await b.close();
  } finally { srv.close(); }
}
