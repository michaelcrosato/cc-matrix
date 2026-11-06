// The hub's own harness, served beside the game from an in-process server on a port the OS picks.
import { createServer } from 'node:http'; import { readFileSync } from 'node:fs'; import { join, extname } from 'node:path';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript' };
export default async function ({ T, chromium, RENDER, HTML, NAME, here, URLBASE }) {
  const srv = createServer((q, r) => { const u = decodeURIComponent(new URL(q.url, 'http://x').pathname.slice(1)); const p = u === 'GAME.html' ? HTML : join(here, 'tools/hub', u); try { const b = readFileSync(p); r.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }); r.end(b); } catch { r.writeHead(404); r.end(); } });
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok)); const port = srv.address().port;
  const res = await fetch(`http://127.0.0.1:${port}/GAME.html`); const txt = await res.text(); T.ok(txt.includes('<title>Totter Fit</title>'), 'hub: the served page is this game');
  const browser = await chromium.launch({ args: [...RENDER, '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const runs = ['players=1', 'players=2', 'players=4&latency=150&jitter=50&loss=5', 'players=4&latency=150&jitter=50&loss=5&scenario=host-leave'];
  for (const q of runs) {
    const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(`http://127.0.0.1:${port}/harness.html?game=GAME.html&${q}&auto=1`);
    let ok = false; try { await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 280000 }); ok = true; } catch { /* reported below */ }
    const c = await page.evaluate(() => window.__hubCheck || null);
    T.ok(ok, `hub ${q}: harness did not complete`);
    if (c) { T.ok(c.pass, `hub ${q}: failed ${JSON.stringify((c.checks || c.results || []).filter(x => x && (x.ok === false || x.pass === false || x.status === 'fail')).map(x => x.name || x.id || x.label || x)).slice(0, 900)}`); T.note(`${q} ${c.pass}`); }
    await page.close();
  }
  await browser.close(); srv.close();
  // A whole round on a virtual clock: all three slots, ghosts, one result.
  const b3 = await chromium.launch({ args: ['--no-sandbox'] }); const pg = await b3.newPage({ viewport: { width: 1920, height: 1080 } }); const er3 = []; pg.on('pageerror', e => er3.push(e.message)); await pg.goto(`${URLBASE}?test=1&render=0&manual=1`); await pg.waitForFunction(() => window.__TEST__);
  const R = await pg.evaluate(() => { const g = __TEST__.g, H = globalThis.AIHub; const out = { results: [], progress: 0, sends: 0, slots: new Set(), screens: new Set() }; let t = -3000; const on = {}; const real = { ...H };
    Object.assign(H, { on: (e, f) => { on[e] = f; }, answer() {}, progress: () => { out.progress++; }, result: (r) => out.results.push(r), send: () => { out.sends++; return true; }, time: () => t, rng: (l) => { let a = 7; for (const c of l) a = a * 31 + c.charCodeAt(0); return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; }, ready() {} });
    g.ui.closeAll(); g.clearMode(); const info = { me: 0, players: [{ id: 0, name: 'Ann', color: '#e8443a' }, { id: 1, name: 'Bo', color: '#3b82f6' }], mode: 'ghost', round: 1, limitMs: 270000, seed: 1 }; const s = new __TEST__.Session(g, info); g.session = s; on.card && on.card({ left: 1000, ready: [1], asking: 0 }); on.start && on.start({ in: 3000 });
    let ghostSeen = 0; for (let k = 0; t < 192000; k++) { t += 1000 / 120; g.fixed(1 / 120); if (k % 2) g.frame(1 / 60); out.slots.add(s.slot); out.screens.add(g.ui.topId()); if (k % 12 === 0) on.message && on.message({ t: 'g', a: Math.max(0, s.slot), x: 3.2, z: 0, lx: .1, lz: 0, c: 0, f: 0, s: 5 }, 1); const gh = s.ghosts.get(1); if (gh && gh.doll.group.visible) ghostSeen++; }
    out.ghostSeen = ghostSeen; out.score = s.score; out.scores = s.slotScores; out.deal = s.deal; on['time-up'] && on['time-up']({ graceMs: 5000 }); on.end && on.end({ reason: 'finished' }); out.slots = [...out.slots]; out.screens = [...out.screens]; out.errors = g.errors.slice(0, 2); out.track = g.audio.stopped; return out; });
  T.ok(R.slots.includes(0) && R.slots.includes(1) && R.slots.includes(2), `session slots ${R.slots}`); T.eq(R.results.length, 1, 'one result'); T.ok(R.progress > 150, `progress ${R.progress}`); T.ok(R.sends > 1500, `ghost sends ${R.sends}`); T.ok(R.ghostSeen > 1000, `ghost shown ${R.ghostSeen}`); T.eq(R.scores.length, 3, `three slot scores ${R.scores}`); T.ok(!R.errors.length && !er3.length, `session errors ${R.errors[0] || er3[0]}`); T.ok(R.track, 'end stops all sound'); T.note(JSON.stringify(R).slice(0, 600));
  await b3.close();
  // On its own: Enter and Space are harmless and something is drawn.
  const b2 = await chromium.launch({ args: [...RENDER, '--no-sandbox'] }); const p = await b2.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(URLBASE); await p.waitForTimeout(12000);
  for (const k of ['Enter', 'Space', 'Enter', 'Space']) { await p.keyboard.press(k); await p.waitForTimeout(700); }
  const act = await p.evaluate(() => globalThis.AIHub ? AIHub.active : null); T.eq(act, false, 'on its own AIHub.active is false'); T.ok(!errs.length, `on its own errors: ${errs[0]}`);
  const shot = await p.screenshot(); T.ok(shot.length > 20000, `something is drawn, ${shot.length} bytes`); await b2.close();
}
