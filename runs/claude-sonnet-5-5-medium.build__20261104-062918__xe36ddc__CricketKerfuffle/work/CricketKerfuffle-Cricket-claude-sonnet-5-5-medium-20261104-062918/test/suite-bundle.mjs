// the single-file bundle: contents, a browser smoke run through every scene, and the AI Hub harness
import { readFileSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { check } from './lib.mjs';
const NAME = 'CricketKerfuffle-Cricket-claude-sonnet-5-5-medium-20261104-062918.html';
const html = readFileSync(new URL('../../' + NAME, import.meta.url), 'utf8');
const client = readFileSync(new URL('../vendor/session.js', import.meta.url), 'utf8');
check('bundle holds the AI Hub client verbatim, first in the head', html.indexOf('<meta charset="utf-8"><script>' + client + '</script>') > -1);
check('bundle has the title and hub tags', /<title>Cricket Kerfuffle<\/title>/.test(html) && /hub:session-mode" content="parallel"/.test(html) && /hub:session-players" content="1-4"/.test(html));
check('bundle loads nothing from the network', !/<script[^>]+src=["']http|<link[^>]+href=["']http/.test(html));
const src = ['00-core', '21-match', '41-ui', '50-match-scene', '60-scenes'].map(f => readFileSync(new URL('../src/' + f + '.js', import.meta.url), 'utf8')).join('\n');
check('no fetch, XHR, WebSocket or TODO in the game code', !/\bfetch\(|XMLHttpRequest|WebSocket|TODO|FIXME|placeholder/i.test(src));
// browser smoke run
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
  page.on('pageerror', e => errs.push(String(e.stack || e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const reqs = []; page.on('request', r => { if (/^https?:/i.test(r.url())) reqs.push(r.url()); });
  await page.goto(pathToFileURL(resolve(new URL('../../' + NAME, import.meta.url).pathname)).href); await page.waitForTimeout(1500);
  const ev = js => page.evaluate(js), G = 'My3D2dge.current';
  check('the page title', (await page.title()) === 'Cricket Kerfuffle');
  for (const sc of ['setup', 'story', 'howto', 'about', 'scores']) { await ev(`${G}.go('${sc}')`); await page.waitForTimeout(500); }
  for (const pg of [0, 1, 2]) { await ev(`${G}.go('about')`); await page.waitForTimeout(300); }
  await ev(`${G}.debug.startMatch({mode:'attract',attract:true,overs:2,wickets:3,opp:'mega',ground:'dome',seed:12})`); await page.waitForTimeout(9000);
  await ev(`${G}.debug.startMatch({mode:'quick',overs:1,wickets:2,diff:1,opp:'gumb',ground:'cow',chaos:'all',seed:8,batFirst:1})`); await page.waitForTimeout(4000);
  await ev(`${G}.debug.devOpen()`); await page.waitForTimeout(500); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await ev(`${G}.go('cutscene', {lines:${G}.debug.CHAPTERS[2].intro, night:true, title:'x', onDone(){}})`); await page.waitForTimeout(1200);
  check('every scene draws in a real browser without errors', errs.length === 0, errs.slice(0, 2).join(' | '));
  check('the bundle made no network requests', reqs.length === 0, reqs.join(','));
  const snap = JSON.parse(await ev(`JSON.stringify(${G}.debug.snapshot())`)); check('the engine reports no game errors', snap.errors === 0, JSON.stringify(snap));
  await page.close();
}
// the AI Hub harness (served from a port the OS picks, on 127.0.0.1)
{
  const dir = new URL('./hub/', import.meta.url); mkdirSync(dir, { recursive: true });
  for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(new URL('../vendor/' + f, import.meta.url), new URL(f, dir));
  copyFileSync(new URL('../../' + NAME, import.meta.url), new URL('game.html', dir));
  const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir.pathname, stdio: ['ignore', 'pipe', 'pipe'] });
  let port = 0;
  try { port = await new Promise((res, rej) => { let b = ''; const t = setTimeout(() => rej(new Error('no port')), 8000); const on = d => { b += d; const m = /port (\d+)/.exec(b); if (m) { clearTimeout(t); res(+m[1]); } }; srv.stdout.on('data', on); srv.stderr.on('data', on); }); } catch (e) { srv.kill('SIGTERM'); throw e; }
  try {
    const mine = await (await fetch(`http://127.0.0.1:${port}/game.html`)).text();
    check('the served page is this game', /<title>Cricket Kerfuffle<\/title>/.test(mine));
    for (const q of ['players=2&auto=1&limit=40', 'players=4&latency=150&jitter=50&loss=5&auto=1&limit=40']) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      await page.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&${q}`);
      await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 150000 }).catch(() => {});
      const r = await page.evaluate(() => ({ pass: window.__hubCheck && window.__hubCheck.pass, report: JSON.stringify(window.__hubCheck && (window.__hubCheck.failures || window.__hubCheck.items || window.__hubCheck)).slice(0, 700) }));
      check('AI Hub harness passes (' + q.split('&')[0] + ')', r.pass === true, r.report);
      await page.close();
    }
  } finally { srv.kill('SIGTERM'); }
}
await browser.close();
