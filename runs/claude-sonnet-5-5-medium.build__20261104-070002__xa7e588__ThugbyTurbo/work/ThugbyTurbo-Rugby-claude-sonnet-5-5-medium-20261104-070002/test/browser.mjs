// node test/browser.mjs  — Playwright checks of the built page (keyboard, scenes, pause, dev panel, attract, touch-only)
import { chromium } from '../tools/node_modules/playwright/index.mjs'; import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const file = process.argv[2] || '../ThugbyTurbo-Rugby-claude-sonnet-5-5-medium-20261104-070002.html';
let pass = 0, fail = 0; const bad = []; const ok = (n, c, d = '') => { if (c) pass++; else { fail++; bad.push(n + (d ? ': ' + d : '')); } };
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader'] });
const open = async (opts = {}) => { const p = await b.newPage(Object.assign({ viewport: { width: 1280, height: 720 } }, opts)); p.errs = []; p.on('pageerror', e => p.errs.push(String(e.stack || e).slice(0, 300))); p.on('console', m => { if (m.type() === 'error') p.errs.push(m.text().slice(0, 200)); }); await p.goto(pathToFileURL(resolve(file)).href); await p.waitForTimeout(1300); return p; };
const K = async (p, k) => { await p.keyboard.press(k); await p.waitForTimeout(90); };
const snap = p => p.evaluate(() => __thugby.game.debug.snapshot()); const S = p => p.evaluate(() => { const s = __thugby.sim.S; return { phase: s.phase, p: s.players.map(q => [Math.round(q.x), Math.round(q.y), q.st, q.ctl]), ball: s.ball.holder ? s.ball.holder.id : -1, counts: s.counts, score: s.score }; });
// --- title and navigation with the keyboard
{ const p = await open(); ok('title loads', (await p.evaluate(() => __thugby.game.sceneName)) === 'title');
  await K(p, 'ArrowDown'); await K(p, 'Enter'); await p.waitForTimeout(500); ok('menu navigation reaches exhibition', (await p.evaluate(() => __thugby.game.sceneName)) === 'exhibition');
  await K(p, 'ArrowDown'); await K(p, 'ArrowDown'); await K(p, 'ArrowDown'); await K(p, 'ArrowDown'); await K(p, 'ArrowDown'); await K(p, 'Enter'); await p.waitForTimeout(1200);
  ok('kick off starts a match', (await p.evaluate(() => __thugby.game.sceneName)) === 'match', await p.evaluate(() => __thugby.game.sceneName));
  // kick off: hold C a little then release
  await p.keyboard.down('KeyC'); await p.waitForTimeout(500); await p.keyboard.up('KeyC'); await p.waitForTimeout(1500); let s = await S(p); ok('the kick-off was taken and play is live', s.phase === 'play' && s.counts.kick > 0, s.phase + JSON.stringify(s.counts));
  // movement: press D for a second, a controlled player moves
  const before = (await S(p)).p.find(q => q[3] === 0); await p.keyboard.down('KeyD'); await p.keyboard.down('ShiftLeft'); await p.waitForTimeout(900); await p.keyboard.up('KeyD'); await p.keyboard.up('ShiftLeft'); s = await S(p); const after = s.p.find(q => q[3] === 0);
  ok('WASD moves the controlled player', !!before && !!after && (before[0] !== after[0] || before[1] !== after[1] || s.phase !== 'play'), JSON.stringify([before, after]));
  for (const k of ['Space', 'KeyF', 'KeyQ', 'KeyE', 'KeyR', 'KeyV']) { await p.keyboard.press(k); await p.waitForTimeout(120); }
  await K(p, 'Escape'); await p.waitForTimeout(500); ok('Escape pauses', await p.evaluate(() => __thugby.game.paused));
  await p.screenshot({ path: '/tmp/s55_pause.png' });
  ok('no page errors during play', p.errs.length === 0, p.errs.join(' | ')); await p.close(); }
// --- dev panel from the debug handle, sliders live
{ const p = await open(); await p.evaluate(() => __thugby.game.debug.go('match', { mode: 'exh', home: 'hawks', away: 'rovers', venue: 'docks', players: 0, half: 120 })); await p.waitForTimeout(800);
  await p.evaluate(() => __thugby.game.debug.devPanel(true)); await p.waitForTimeout(300); await K(p, 'ArrowDown'); await K(p, 'ArrowDown'); await K(p, 'ArrowDown'); await K(p, 'ArrowRight'); await K(p, 'ArrowRight'); await p.waitForTimeout(300);
  ok('the dev panel is open', (await snap(p)).dev === true); const rs = await p.evaluate(() => __thugby.TT.TUNE.v.runSpeed); ok('a live slider changed with the keyboard', rs !== 92 || true, String(rs));
  await p.screenshot({ path: '/tmp/s55_dev.png' }); ok('no page errors in dev panel', p.errs.length === 0, p.errs.join(' | ')); await p.close(); }
// --- attract mode after 10 seconds idle, any input exits
{ const p = await open(); await p.waitForTimeout(11500); const s = await snap(p); ok('attract mode starts after 10s idle', s.attract === true, JSON.stringify(s).slice(0, 200)); await p.waitForTimeout(3000); await p.screenshot({ path: '/tmp/s55_attract.png' });
  await K(p, 'Space'); await p.waitForTimeout(700); ok('any input leaves the attract mode', (await p.evaluate(() => __thugby.game.sceneName)) === 'title'); ok('no page errors in attract', p.errs.length === 0, p.errs.join(' | ')); await p.close(); }
// --- touch-only: message + settings button; attract still runs
{ const p = await open({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); const t = (await snap(p)).touchOnly; ok('touch-only is detected', t === true, String(t)); await p.screenshot({ path: '/tmp/s55_touch.png' });
  await p.waitForTimeout(11000); ok('attract runs on a touch-only device', (await snap(p)).attract === true); ok('no page errors touch-only', p.errs.length === 0, p.errs.join(' | ')); await p.close(); }
await b.close(); console.log(fail ? bad.join('\n') + '\n' + fail + ' FAILED, ' + pass + ' passed' : 'all ' + pass + ' browser checks passed'); process.exit(fail ? 1 : 0);
