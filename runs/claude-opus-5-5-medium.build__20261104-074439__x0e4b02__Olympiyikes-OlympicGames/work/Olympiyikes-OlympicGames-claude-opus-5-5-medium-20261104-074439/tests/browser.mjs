// Browser suites (Playwright against the bundled HTML): the bundle, touch-only, and the AI Hub harness.
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
const require = createRequire(new URL('../vendor/my-3d2dge/dist/handoff/package.json', import.meta.url));
const ROOT = new URL('../', import.meta.url), NAME = 'Olympiyikes-OlympicGames-claude-opus-5-5-medium-20261104-074439.html', BUNDLE = new URL('../../' + NAME, import.meta.url);

export async function browserSuites(check) {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const S = 'bundle';
  try {
    check(S, 'the root HTML exists with the TASK.md name', existsSync(BUNDLE));
    const html = readFileSync(BUNDLE, 'utf8'), session = readFileSync(new URL('vendor/hub/session.js', ROOT), 'utf8');
    const m = html.match(/^<!doctype html><html lang="en"><head><meta charset="utf-8">\n<script>([\s\S]*?)<\/script>/);
    check(S, 'session.js is the first script after <meta charset>, byte-identical', m && m[1] === session);
    for (const t of ['hub:session" content="1"', 'hub:session-players', 'hub:session-mode" content="ghost"', 'hub:session-goal', 'hub:session-howto']) check(S, 'bundle tag ' + t, html.includes(t));
    const ex = JSON.parse(readFileSync(new URL('../../exit-interview.json', import.meta.url), 'utf8'));
    const si = ex.sourceInformation || {}; check(S, 'exit-interview.json parses with every field', ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'].every(k => typeof si[k] === 'string' && si[k].length) && ex.testingFeedback.length === 4 && ex.engineFeedback.length === 6 && ex.promptFeedback.length === 4 && ex.aiHub && ex.aiHub.name && ex.aiHub.tags.length >= 3);
    // opens from file:// with no console errors; the title; a deep link plays
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errs = [];
    page.on('pageerror', e => errs.push(e.message)); page.on('console', m2 => { if (m2.type() === 'error') errs.push(m2.text()); });
    await page.goto(BUNDLE.href); await page.waitForFunction(() => window.__oly && window.__oly.game.sceneName === 'title', null, { timeout: 10000 }).catch(() => {});
    check(S, 'title within 10 s from file://', await page.evaluate(() => window.__oly && window.__oly.game.sceneName) === 'title');
    await page.waitForTimeout(900); await page.keyboard.press('Enter'); await page.waitForTimeout(900); check(S, 'a key leaves the title', await page.evaluate(() => window.__oly.game.sceneName) === 'menu');
    await page.goto(BUNDLE.href + '#ev/sprint/auto'); await page.waitForTimeout(400); await page.reload(); await page.waitForTimeout(16000);
    const sc = await page.evaluate(() => window.__oly.game.debug.snapshot());
    check(S, '#ev/sprint plays in the browser', sc.event === 'sprint' || sc.scene === 'results', JSON.stringify(sc).slice(0, 200));
    check(S, 'no console errors', errs.length === 0, errs.join(' | '));
    await page.close();
    // touch-only: a phone context shows the notice and the settings button; attract after 10 s; a key restores the title
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const tp = await ctx.newPage(); await tp.goto(BUNDLE.href); await tp.waitForTimeout(2500);
    check('touch', 'touch-only notice shows', await tp.evaluate(() => window.__oly.touchOnly() && window.__oly.game.sceneName === 'title'));
    const R = await tp.evaluate(() => { const sc2 = window.__oly.game.scene.def; return sc2.setR; });
    check('touch', 'a SETTINGS button is drawn', Array.isArray(R));
    await tp.waitForTimeout(9500); check('touch', 'attract runs on a touch-only device', await tp.evaluate(() => window.__oly.Attract.on));
    await tp.keyboard.press('KeyA'); await tp.waitForTimeout(800);
    check('touch', 'a key press exits attract to the title, no longer touch-only', await tp.evaluate(() => !window.__oly.Attract.on && window.__oly.game.sceneName === 'title' && !window.__oly.touchOnly()));
    await ctx.close();
  } catch (e) { check(S, 'browser suite threw', false, e.stack); }
  // the AI Hub harness, served on a port the OS picks
  const H = 'hub-harness'; let server = null;
  try {
    const dir = new URL('.hubtest/', ROOT); mkdirSync(dir, { recursive: true });
    copyFileSync(BUNDLE, new URL('game.html', dir)); for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(new URL('vendor/hub/' + f, ROOT), new URL(f, dir));
    server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir.pathname, stdio: ['ignore', 'pipe', 'pipe'] });
    const port = await new Promise((res, rej) => { const to = setTimeout(() => rej(new Error('no port')), 8000); const on = d => { const m2 = String(d).match(/port (\d+)/); if (m2) { clearTimeout(to); res(+m2[1]); } }; server.stdout.on('data', on); server.stderr.on('data', on); });
    const base = 'http://127.0.0.1:' + port + '/';
    const gp = await browser.newPage(); await gp.goto(base + 'game.html'); const title = await gp.title(); await gp.close();
    check(H, 'the served page is our game', /Olympiyikes/.test(title), title);
    for (const q of ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=2&scenario=host-leave&auto=1', 'players=1&auto=1']) {
      const p = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
      await p.goto(base + 'harness.html?game=game.html&' + q);
      const done = await p.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 600000 }).then(() => true).catch(() => false);
      const res = await p.evaluate(() => ({ pass: window.__hubCheck && window.__hubCheck.pass, fails: window.__hubCheck && window.__hubCheck.checks.filter(c => !c.pass).map(c => c.name + ': ' + c.detail) }));
      check(H, 'harness ' + q + ' passes', done && res.pass === true, JSON.stringify(res).slice(0, 600));
      await p.close();
    }
  } catch (e) { check(H, 'hub harness threw', false, e.stack); }
  finally { if (server) server.kill(); }
  await browser.close();
}
