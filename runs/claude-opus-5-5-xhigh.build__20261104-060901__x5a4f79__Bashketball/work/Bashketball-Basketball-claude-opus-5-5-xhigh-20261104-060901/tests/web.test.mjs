// Web suites. bundle: the deliverable's name, its head (the AI Hub client first, byte for byte; the hub tags), no
// external loads, no TODOs, and its inline scripts run headless to the title. browser (Playwright, file://): the
// handoff's check.mjs, every deep link without errors, the audio smoke test, and the screenshot set for review. hub:
// the AI Hub harness's four scenarios on a 127.0.0.1 port-0 server (checked to be ours, stopped by its PID).
import { readFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { DEV, makeCtx } from './helpers.mjs';
const NAME = 'Bashketball-Basketball-claude-opus-5-5-xhigh-20261104-060901';
const BUNDLE = join(DEV, '..', NAME + '.html');

const bundle = async t => {
  t.check('the deliverable exists with its exact name', existsSync(BUNDLE), BUNDLE);
  const html = readFileSync(BUNDLE, 'utf8'), client = readFileSync(join(DEV, 'vendor/aihub-session.js'), 'utf8');
  const head = html.slice(0, html.indexOf('</head>')), first = head.indexOf('<script>');
  t.check('the client is the first script in <head>, right after <meta charset>', head.indexOf('<meta charset="utf-8">') < first && head.indexOf('<script') === first);
  t.check('the client is byte-identical', head.slice(first + 8, head.indexOf('</script>', first)) === client);
  for (const tag of ['hub:session', 'hub:session-players', 'hub:session-mode', 'hub:session-goal', 'hub:session-howto', 'hub:session-minutes']) t.check('tag ' + tag, head.includes('name="' + tag + '"'));
  t.check('mode shared-world, 1-4 players', head.includes('content="shared-world"') && head.includes('name="hub:session-players" content="1-4"'));
  t.check('no external scripts or styles', !/<script[^>]+src=|<link[^>]+href=/i.test(html));
  const game = readFileSync(join(DEV, 'build/game.js'), 'utf8');
  t.check('the game opens no sockets or fetches', !/new WebSocket|fetch\(|XMLHttpRequest|RTCPeerConnection|window\.open\(|alert\(|confirm\(|prompt\(/.test(game), (game.match(/new WebSocket|fetch\(|XMLHttpRequest|RTCPeerConnection|window\.open\(|alert\(|confirm\(|prompt\(/) || [])[0]);
  const src = readdirSync(join(DEV, 'src')).map(f => readFileSync(join(DEV, 'src', f), 'utf8')).join('\n');
  t.check('no TODO, FIXME, XXX or placeholder in the source', !/\bTODO\b|\bFIXME\b|\bXXX\b|placeholder/i.test(src), (src.match(/.{30}(\bTODO\b|\bFIXME\b|\bXXX\b|placeholder).{30}/i) || [])[0]);
  t.check('no unfinished text on the About pages', !/See the final report/.test(src));
  // its inline scripts run headless and reach the title
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1].replace(/<\\\/script/g, '</script'));
  t.check('three inline scripts', scripts.length === 3, scripts.length);
  const ctx = makeCtx(); for (const s of scripts) vm.runInContext(s, ctx);
  const g = ctx.__bb.game; if (g.booted && g.booted.then) await g.booted; await new Promise(r => setTimeout(r, 0)); g.advance(.5);
  t.check('the bundle boots headless to the title', g.sceneName === 'title' && !g.errors.length, [g.sceneName, g.errors.map(e => e.message)]);
};

const LINKS = ['', '#menu', '#join', '#teams', '#courtsel', '#matchup', '#results', '#hall', '#howto', '#about', '#credits', '#camp', '#camp/oop', '#tourmenu', '#tour/3', '#story/reveal', '#story/ending', '#attract', '#attract/5', '#dev', '#animlab', '#shootaround', '#hubcard',
  '#exhibition/skybox/hightops-breakers', '#exhibition/pier/breakers-crushers', '#exhibition/scrapyard/crushers-magma', '#exhibition/caldera/magma-hightops', '#exhibition/dome/blambots-allstars'];
const browser = async t => {
  const out = join(DEV, 'check-output'); mkdirSync(out, { recursive: true });
  const r = spawnSync('node', [join(DEV, 'handoff/tools/check.mjs'), BUNDLE, '--seconds', '4', '--out', join(out, 'check')], { encoding: 'utf8', timeout: 180000 });
  t.check('check.mjs passes on the bundle', r.status === 0 && /no errors/.test(r.stdout), (r.stdout || '').split('\n').slice(-8).join(' / ') + (r.stderr || '').slice(0, 300));
  const { chromium } = await import('playwright');
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const url = h => 'file://' + BUNDLE + h;
  const open = async (h, o = {}) => { const p = await b.newPage(o.size || { viewport: { width: 1280, height: 720 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/AudioContext/.test(m.text())) errs.push(m.text().slice(0, 200)); }); await p.goto(url(h)); return { p, errs }; };
  for (const h of LINKS) {
    const { p, errs } = await open(h); await p.waitForTimeout(1500);
    const st = await p.evaluate(() => ({ scene: window.__bb && window.__bb.game.sceneName, errors: window.__bb ? window.__bb.game.errors.map(e => e.message) : ['no game'] }));
    t.check('deep link ' + (h || '(none)') + ' renders', !errs.length && !st.errors.length && !!st.scene, [st.scene, errs.concat(st.errors).slice(0, 3)]);
    await p.close();
  }
  // the audio smoke test: after a key press the AudioContext runs; a voice line and a song play without errors
  { const { p, errs } = await open(''); await p.waitForTimeout(800); await p.keyboard.press('KeyA'); await p.waitForTimeout(300);
    const a = await p.evaluate(async () => { const bb = window.__bb, A = bb.game.audio; bb.playMusic('skybox', { restart: true }); bb.Voice.say('BLAMMO! WHAT A DUNK!', 'vinnie'); bb.sfx('slam'); await new Promise(r => setTimeout(r, 900)); return { state: A.ctx && A.ctx.state, song: !!A.song, voiced: !!bb.Voice.last && bb.Voice.last.plan.length > 0 }; });
    t.check('audio runs after a key press', a.state === 'running', a); t.check('a song plays', a.song, a); t.check('a voice line speaks', a.voiced, a); t.check('no audio errors', !errs.length, errs); await p.close(); }
  // the screenshot set (for review), at 1920x1080 unless noted
  const shot = async (name, h, fn, size) => { const { p, errs } = await open(h, { size: size || { viewport: { width: 1920, height: 1080 } } }); await p.waitForTimeout(1600); if (fn) await fn(p); await p.screenshot({ path: join(out, 'shot-' + name + '.png') }); t.check('screenshot ' + name + ' without errors', !errs.length, errs.slice(0, 2)); await p.close(); };
  await shot('title', '');
  await shot('menu', '#menu');
  await shot('join4', '#join', async p => { await p.evaluate(() => { const g = window.__bb.game; g.addPlayer({ keys: 'right' }); g.addPlayer({ pad: 1 }); g.addPlayer({ pad: 2 }); }); await p.waitForTimeout(400); });
  await shot('teams', '#teams'); await shot('matchup', '#matchup');
  for (const c of ['skybox', 'pier', 'scrapyard', 'caldera', 'dome']) await shot('court-' + c, '#exhibition/' + c + '/' + { skybox: 'hightops-breakers', pier: 'breakers-crushers', scrapyard: 'crushers-magma', caldera: 'magma-hightops', dome: 'blambots-allstars' }[c], async p => { await p.waitForTimeout(5000); });
  await shot('dunk', '#exhibition/skybox/hightops-breakers', async p => { await p.evaluate(() => { const bb = window.__bb, S = bb.S, M = S.match; M.phase = 'live'; for (const q of S.players) q.setState('run'); const v = S.players[0], R = bb.RIMS[1]; v.x = R.x - 120; v.y = R.y + 10; bb.giveBall(v); bb.startDunk(v, { force: 'flip' }); }); await p.waitForTimeout(700); });
  await shot('shatter', '#exhibition/dome/blambots-allstars', async p => { await p.evaluate(() => { const bb = window.__bb, S = bb.S, M = S.match; M.phase = 'live'; for (const q of S.players) q.setState('run'); const v = S.players[0], R = bb.RIMS[1]; v.x = R.x - 70; v.y = R.y; bb.giveBall(v); S.cheats.shatterNext = true; bb.startDunk(v, { force: 'hammer' }); }); await p.waitForTimeout(1500); });
  await shot('sponsor', '#exhibition/dome/blambots-allstars', async p => { await p.evaluate(() => { const bb = window.__bb, S = bb.S, M = S.match; M.phase = 'live'; for (const q of S.players) q.setState('run'); const v = S.players[0], R = bb.RIMS[1]; v.x = R.x - 70; v.y = R.y; bb.giveBall(v); S.cheats.shatterNext = true; bb.startDunk(v, { force: 'hammer' }); }); await p.waitForTimeout(5000); });
  await shot('supernova', '#exhibition/skybox/hightops-breakers', async p => { await p.evaluate(() => { const bb = window.__bb, S = bb.S, M = S.match; M.phase = 'live'; for (const q of S.players) q.setState('run'); bb.novaOn(S.players[0]); bb.giveBall(S.players[0]); S.players[0].x = bb.CMX; }); await p.waitForTimeout(1200); });
  await shot('halftime', '#exhibition/pier/breakers-crushers', async p => { await p.evaluate(() => { const S = window.__bb.S, M = S.match; M.phase = 'live'; M.quarter = 2; M.clock = .05; }); await p.waitForTimeout(1500); });
  await shot('results', '#results'); await shot('tourmap', '#tour/2'); await shot('story', '#story/reveal', async p => { await p.waitForTimeout(2500); });
  for (let tab = 0; tab < 7; tab++) await shot('dev-' + tab, '#dev', async p => { await p.evaluate(t2 => { window.__bb.DEV.tab = t2; window.__bb.S.dev.overlays = t2 === 4 ? { hit: true, ai: true, shot: true, log: true } : {}; }, tab); await p.waitForTimeout(600); });
  await shot('pause', '#exhibition/skybox/hightops-breakers', async p => { await p.keyboard.press('Escape'); await p.waitForTimeout(600); });
  await shot('howto-keys', '#howto'); await shot('howto-pad', '#howto', async p => { await p.evaluate(() => { window.__bb.game.input.lastDevice = 'gamepad'; }); await p.waitForTimeout(300); });
  await shot('about', '#about'); await shot('about-source', '#about', async p => { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(300); });
  await shot('hubcard', '#hubcard'); await shot('camp', '#camp/steal', async p => { await p.waitForTimeout(1500); });
  await shot('touch-only', '', null, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await shot('title-720', '', null, { viewport: { width: 1280, height: 720 } });
  await b.close();
};

const hub = async t => {
  const dir = join(DEV, 'build/hub');
  t.check('the hub copy is built', existsSync(join(dir, 'game.html')) && existsSync(join(dir, 'harness.html')));
  const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    const port = await new Promise((res, rej) => { let buf = ''; const on = d => { buf += d; const m = /port (\d+)/.exec(buf); if (m) res(+m[1]); }; srv.stdout.on('data', on); srv.stderr.on('data', on); setTimeout(() => rej(new Error('no port: ' + buf)), 15000); });
    const page = await (await fetch(`http://127.0.0.1:${port}/game.html`)).text();
    t.check('the server serves our game', /<title>BASHKETBALL/.test(page));
    const { chromium } = await import('playwright');
    const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
    for (const q of ['players=2&auto=1&limit=45', 'players=4&latency=150&jitter=50&loss=5&auto=1&limit=45', 'players=4&latency=150&jitter=50&loss=5&auto=1&limit=45&scenario=host-leave', 'players=2&scenario=server&auto=1&limit=45']) {
      const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
      await p.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&${q}`);
      await p.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 240000 }).catch(() => {});
      const rep = await p.evaluate(() => window.__hubCheck ? { pass: window.__hubCheck.pass, done: window.__hubCheck.done, fails: window.__hubCheck.checks.filter(c => !c.pass).map(c => c.name + ': ' + c.detail) } : null);
      t.check('harness ' + q, rep && rep.pass === true, rep);
      await p.close();
    }
    await b.close();
  } finally { srv.kill('SIGTERM'); }
};
export default { bundle, browser, hub };
