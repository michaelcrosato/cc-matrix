// The hub's own harness: 2 players; 4 players on a bad network; the host leaving. Pass means window.__hubCheck.pass. Then outside a session.
import { suite } from './_lib.mjs';
import { launch, open } from './_browser.mjs';
import { spawn } from 'node:child_process';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
const t = suite(), html = process.env.GAME_HTML, dir = resolve('tools/.hubrun');
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true }); cpSync(html, join(dir, 'game.html')); for (const f of ['harness.html', 'bridge.js', 'round.js', 'session.js']) cpSync(join('tools/hub', f), join(dir, f));
const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
const port = await new Promise((res, rej) => { const on = (b) => { const m = /port (\d+)/.exec(String(b)); if (m) res(+m[1]); }; srv.stdout.on('data', on); srv.stderr.on('data', on); setTimeout(() => rej(new Error('no port')), 15000); });
const b = await launch();
async function run(name, q, ms = 420000) {
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } }), page = await ctx.newPage(), errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 240)));
  await page.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&${q}`);
  // Music at 10% in a session, on every copy that has started.
  { let vols = []; for (let i = 0; i < 80 && !vols.length; i++) { await page.waitForTimeout(250); vols = (await Promise.all(page.frames().filter((f) => new URL(f.url()).pathname.endsWith('/game.html')).map((f) => f.evaluate(() => window.__APP__?.engine?.audio.volume.music ?? null).catch(() => null)))).filter((v) => v !== null); } t.ok(vols.length > 0 && vols.every((v) => Math.abs(v - 0.1) < 1e-6), `${name}: music at 10% in a session: ${vols.join(',')}`); }
  try { await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: ms, polling: 1000 }); } catch { errs.push('timed out'); }
  const res = await page.evaluate(() => { const c = window.__hubCheck; return { pass: c?.pass, checks: c?.checks ?? c?.results ?? null, list: [...document.querySelectorAll('[data-check], li')].map((n) => n.textContent.trim()).filter((x) => /fail|✗|✘/i.test(x)).slice(0, 8) }; });
  t.ok(res.pass === true, `${name}: harness did not pass: ${JSON.stringify(res.list).slice(0, 600)} ${errs.slice(0, 2).join(' | ')}`);
  await ctx.close();
}
try {
  await run('2 players', 'players=2&auto=1');
  await run('4 players, latency', 'players=4&latency=150&jitter=50&loss=5&auto=1');
  await run('host leaves', 'players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave');
  // In a round: Options opens a menu that never pauses and has no quit; a finished player can watch another ghost.
  { const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } }), page = await ctx.newPage(); await page.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&players=2`); const games = async () => page.frames().filter((f) => new URL(f.url()).pathname.endsWith('/game.html')); let fs = []; for (let i = 0; i < 120; i++) { await page.waitForTimeout(250); fs = await games(); const ok = fs.length === 2 && (await Promise.all(fs.map((f) => f.evaluate(() => !!window.__APP__?.scene?.sim).catch(() => false)))).every(Boolean); if (ok) break; }
    for (const f of fs) await f.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' })));
    const me = fs[0]; let on = false; for (let i = 0; i < 120 && !on; i++) { await page.waitForTimeout(250); on = await me.evaluate(() => window.AIHub.time() >= 500); } t.ok(on, 'the round starts');
    await me.evaluate(() => window.__GAME__.press('pause')); await page.waitForTimeout(600); const m = await me.evaluate(() => { const a = window.__APP__; return { top: a.ui.top?.id, paused: a.scene.paused, items: a.ui.items.map((i) => i.id), f: a.scene.sim.frame }; }); t.eq(m.top, 'hubMenu', 'Options opens the session menu'); t.eq(m.paused, false, 'it never pauses'); t.ok(!m.items.includes('retire') && !m.items.includes('restart') && !m.items.includes('dev'), `no quit, restart or Dev Mode: ${m.items.join(',')}`);
    await page.waitForTimeout(600); t.ok((await me.evaluate(() => window.__APP__.scene.sim.frame)) > m.f, 'the race goes on behind it'); await me.evaluate(() => window.__GAME__.press('back')); await page.waitForTimeout(500); t.eq(await me.evaluate(() => window.__APP__.ui.top?.id ?? null), null, 'back closes it');
    await page.waitForTimeout(1500); t.ok(await me.evaluate(() => window.__APP__.scene.ghosts.list.size === 1), 'the other copy shows as a ghost');
    await me.evaluate(() => { const s = window.__APP__.scene; s.sim.finishNow(0, 1); }); await page.waitForTimeout(500); await me.evaluate(() => window.__GAME__.press('tabR')); await page.waitForTimeout(600); t.eq(await me.evaluate(() => typeof window.__APP__.scene.camOverride), 'function', 'a finished player can follow another ghost');
    await ctx.close(); }
} finally { await b.close(); srv.kill(); rmSync(dir, { recursive: true, force: true }); }
{ const b2 = await launch(); const { page, errors, ctx } = await open(b2); await page.waitForTimeout(1500); const s = await page.evaluate(() => window.__GAME__.state()); t.eq(s.screen, 'title', 'outside a session it still reaches the title'); t.eq(errors.length, 0, `no errors outside a session: ${errors.slice(0, 2).join(' | ')}`); await ctx.close(); await b2.close(); }
void basename;
t.done();
