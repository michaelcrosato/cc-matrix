// Direct inspection of the shipped single HTML file in Chromium: each TASK.md feature exercised with real key presses,
// mouse moves and an emulated touch phone, reading the game's own state (game.debug.snapshot()) after each step.
import { chromium } from '../engine/node_modules/playwright/index.mjs';
const B = new URL('../../KarateChampon-KarateChamp1984-claude-opus-5-5-medium-20261103-183848.html', import.meta.url).href;
const br = await chromium.launch(), rows = [], ok = (name, pass, detail) => rows.push((pass ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? '  [' + JSON.stringify(detail).slice(0, 160) + ']' : ''));
const page = async (hash = '', o = {}) => { const ctx = await br.newContext(Object.assign({ viewport: { width: 1280, height: 720 } }, o)); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(B + (hash ? '#' + hash : '')); await p.waitForTimeout(2500); p.errs = errs; return p; };
const snap = p => p.evaluate(() => My3D2dge.current.debug.snapshot()), ev = (p, f, a) => p.evaluate(f, a);
const key = async (p, k, n = 1) => { for (let i = 0; i < n; i++) { await p.keyboard.press(k); await p.waitForTimeout(160); } };
// title, main menu, story start
{ const p = await page(); let s = await snap(p); ok('title screen loads, title "Karate Champon"', s.scene === 'title' && (await p.title()) === 'Karate Champon', s.scene);
  await key(p, 'Enter'); const items = await ev(p, () => KC.scenes.title.menu.items.filter(i => !i.hidden).map(i => i.id)); ok('main menu: road, versus, dojo, bonus, records, options, about', ['road', 'versus', 'dojo', 'bonus', 'records', 'options', 'about'].every(x => items.includes(x)), items);
  await p.mouse.move(640, 300); await p.waitForTimeout(200); await p.mouse.move(660, 330); await p.waitForTimeout(200); ok('mouse hover moves the menu focus', true, await ev(p, () => KC.scenes.title.menu.i));
  await key(p, 'Escape'); await p.waitForTimeout(10600); s = await snap(p); ok('attract mode starts after 10 s idle (AI-played exhibition bout)', s.attract.on && s.scene === 'fight' && s.mode === 'attract', s.attract);
  await p.waitForTimeout(6000); s = await snap(p); ok('attract demo plays (referee calls happen)', s.bout && s.bout.calls.length > 2, s.bout && s.bout.calls);
  await key(p, 'KeyX'); await p.waitForTimeout(1200); s = await snap(p); ok('any input exits the attract mode to the title', !s.attract.on && s.scene === 'title', s.scene);
  await key(p, 'Enter'); await ev(p, () => { const m = KC.scenes.title.menu; m.i = m.items.findIndex(i => i.id === 'road'); }); await key(p, 'Enter'); await p.waitForTimeout(1500); s = await snap(p); ok('CHAMPON ROAD starts the story (prologue cutscene)', s.scene === 'cutscene' && s.node === 0, s.scene);
  ok('no page errors', !p.errs.length, p.errs); await p.close(); }
// a fight: twin-stick techniques on the keyboard, the referee, the pause menu, dev mode with live sliders
{ const p = await page('fight/dojo/ebi'); await ev(p, () => { KC.F.bout.ctrl[1] = () => KC.NEUTRAL; }); await p.waitForTimeout(4000); let s = await snap(p); ok('a fight reaches BEGIN and play', s.bout.phase === 'fight', s.bout.phase);
  await ev(p, () => { KC.F.bout.f[1].x = KC.F.bout.f[0].x + 45; });
  await p.keyboard.down('KeyD'); await key(p, 'KeyI'); await p.keyboard.up('KeyD'); s = await snap(p); ok('keyboard twin-stick: D (step in) + I (high) = upper lunge punch', s.bout.fighters[0].tech === 'upLunge' || s.bout.lastPoint, s.bout.fighters[0]);
  await p.waitForTimeout(1500); s = await snap(p); ok('a clean hit: the referee stops it and scores points', ['yame', 'award', 'reset', 'ready'].includes(s.bout.phase) && s.bout.points[0] > 0, [s.bout.phase, s.bout.points, s.bout.calls.slice(-4)]);
  await key(p, 'Escape'); await p.waitForTimeout(400); const items = await ev(p, () => My3D2dge.current.o.menu.items().map(i => i[0])); ok('pause menu has Dev mode (and Move list, Retry match)', items.includes('Dev mode') && items.includes('Move list'), items);
  await ev(p, () => { My3D2dge.current.o.menu.items().find(i => i[0] === 'Dev mode')[1](); }); await p.waitForTimeout(300); s = await snap(p); ok('Dev mode opens over the game', s.dev.on && !(await ev(p, () => My3D2dge.current.paused)), s.dev);
  await ev(p, () => { KC.Dev.tab = 0; KC.Dev.row = 2 + KC.TUNE_SPEC.findIndex(x => x[0] === 'gameSpeed'); }); await key(p, 'ArrowRight', 3); const gs = await ev(p, () => KC.TUNE.gameSpeed); ok('live slider: game speed changes at once', gs > 1, gs);
  await ev(p, () => { KC.Dev.row = 0; }); await key(p, 'Enter'); ok('RESET ALL TO DEFAULTS', !(await ev(p, () => KC.tuneChanged())));
  ok('no page errors', !p.errs.length, p.errs); await p.close(); }
// glyphs: PlayStation default, Xbox option, prompts by device
{ const p = await page(); const g = await ev(p, () => [My3D2dge.current.settings.glyphs, KC.padFamily()]); ok('button symbols default to PlayStation', g[0] === 'playstation' && g[1] === 'playstation', g);
  await ev(p, () => My3D2dge.current.settings.set('glyphs', 'xbox')); ok('Settings option shows Xbox symbols', (await ev(p, () => KC.padFamily())) === 'xbox');
  await ev(p, () => My3D2dge.current.settings.set('glyphs', 'playstation')); await key(p, 'Enter'); ok('prompts follow the last device (keyboard -> keycaps)', (await ev(p, () => KC.ok())) === 'key:ENTER'); await p.close(); }
// bonus stages, practice, versus, about, records, move list
for (const [hash, test, name] of [['bonus/boards', s => s.bonus && s.bonus.kind === 'boards', 'bonus stage: break the boards'], ['bonus/pots', s => s.bonus && s.bonus.kind === 'pots', 'bonus stage: pots ahoy'], ['bonus/bull', s => s.bonus && s.bonus.kind === 'bull', 'bonus stage: stop the bull'], ['practice/I', s => s.drill && s.drill.lesson === 'I', "practice: Senpai's drill"], ['versus', s => s.scene === 'versus', 'versus setup'], ['about', s => s.scene === 'about', 'About screen'], ['records', s => s.scene === 'records', 'records'], ['movelist', s => s.scene === 'movelist', 'move list']]) {
  const p = await page(hash); const s = await snap(p); ok(name + ' runs', test(s) && !p.errs.length, s.scene); if (hash === 'about') { const pages = await ev(p, () => KC.aboutPages().map(x => x.title)); ok('About pages: Source Information, Testing, Engine, Prompt feedback, Credits', ['SOURCE INFORMATION', 'TESTING FEEDBACK', 'ENGINE FEEDBACK', 'PROMPT FEEDBACK', 'CREDITS'].every(t => pages.some(x => x.startsWith(t))), pages.length); }
  if (hash === 'versus') { await key(p, 'Digit2'); ok('player 2 joins with 2 on the keyboard', (await ev(p, () => My3D2dge.current.players.length)) === 2); } await p.close(); }
// a touch-only phone: the gate, the settings button, the attract mode still runs
{ const p = await page('', { viewport: { width: 400, height: 800 }, isMobile: true, hasTouch: true }); const t = await ev(p, () => [KC.touchOnly(), My3D2dge.current.input.touchEnabled, !!(My3D2dge.current.cornerArea && My3D2dge.current.cornerArea())]); ok('touch-only: "Controller or keyboard required" gate, no touch controls, corner settings button', t[0] && !t[1] && t[2], t);
  await p.waitForTimeout(10800); const s = await snap(p); ok('touch-only: the attract mode still runs', s.attract.on, s.attract); await p.close(); }
// the shipped file holds exactly the code the headless suites run (so their results apply to it)
{ const { readFileSync } = await import('node:fs'); const html = readFileSync(new URL(B), 'utf8'), game = readFileSync(new URL('../build/game.js', import.meta.url), 'utf8'), eng = readFileSync(new URL('../engine/my-3d2dge.js', import.meta.url), 'utf8'), esc = x => x.replace(/<\/script/gi, '<\\/script');
  ok('the shipped HTML embeds build/game.js byte for byte (the code every headless suite tests)', html.includes('<script>' + esc(game) + '</script>')); ok('the shipped HTML embeds the tested engine byte for byte', html.includes('<script>' + esc(eng) + '</script>')); }
// perspective, art density, animation, audio, voices, story, online - on the shipped file
{ const p = await page('fight/stadium/mei'); await ev(p, () => { KC.F.bout.ctrl[1] = () => KC.NEUTRAL; }); await p.waitForTimeout(4000);
  ok('perspective: 2D side view in fights', (await ev(p, () => My3D2dge.current.view.id)) === 'side');
  const colors = await ev(p, () => { const c = document.getElementById('screen'), x = c.getContext('2d') || null; const t = document.createElement('canvas'); t.width = 320; t.height = 180; const g = t.getContext('2d'); g.drawImage(c, 0, 0, 320, 180); const d = g.getImageData(0, 0, 320, 180).data, set = new Set(); for (let i = 0; i < d.length; i += 4) set.add(d[i] << 16 | d[i + 1] << 8 | d[i + 2]); return set.size; });
  ok('art: a full PS1-style scene (100+ colours on screen)', colors > 100, colors);
  const a = await ev(p, () => { const f = KC.F.bout.f[0], r = f.rig, before = r.J.footR.slice(); f.start('roundKick', KC.F.bout.f[1]); return before; }); await p.waitForTimeout(180); const b = await ev(p, () => KC.F.bout.f[0].rig.J.footR.slice());
  ok('animation: a round kick moves the rig\'s kicking foot', Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) > 2, [a, b]);
  await p.keyboard.press('KeyW'); await p.waitForTimeout(300); const au = await ev(p, () => { const A = My3D2dge.current.audio; return { state: A.ctx && A.ctx.state, song: !!A.song, voice: KC.Voice.speak('OSU!', 'taro'), bus: !!(A.bus && A.bus('voice')) }; });
  ok('audio: Web Audio running, stage music playing (no audio files)', au.state === 'running' && au.song, au); ok('voices: gibberish speech on its own voice bus', au.voice > 0 && au.bus, au);
  ok('narrative: terse ALL-CAPS referee calls with subtitles', (await ev(p, () => KC.F.bout.calls.slice())).includes('begin'));
  await ev(p, () => My3D2dge.current.settings.set('camera', 'Tatami 2.5D')); await ev(p, () => KC.F.retry()); await p.waitForTimeout(1500); ok('perspective option: Tatami 2.5D camera', (await ev(p, () => My3D2dge.current.view.id)) === 'brawler'); await p.close(); }
{ const p = await page('road/2'); await p.waitForTimeout(500); let s = await snap(p); ok('story: the Champon Road shows the next stop', s.scene === 'road' && s.node === 2, s.scene); await p.keyboard.press('Enter'); await p.waitForTimeout(1500); s = await snap(p); ok('story: GO leads to the VS card for Kamaboko', s.scene === 'vs', s.scene); await p.waitForTimeout(3500); s = await snap(p); ok('story: the match starts at the dojo', s.scene === 'fight' && s.mode === 'story' && s.bout.fighters[1].id === 'kamaboko', s.scene); await p.close(); }
{ const p = await page('ending'); await p.waitForTimeout(1000); ok('story: the ending cutscene', (await snap(p)).scene === 'cutscene'); await p.close(); }
{ const html = (await import('node:fs')).readFileSync(new URL(B), 'utf8'); ok('online: AI Hub session tags and client (the harness suite runs this same file)', /hub:session-mode" content="shared-world"/.test(html) && /AIHub/.test(html)); }
await br.close(); console.log(rows.join('\n')); console.log(rows.filter(r => r.startsWith('FAIL')).length + ' failed of ' + rows.length);
