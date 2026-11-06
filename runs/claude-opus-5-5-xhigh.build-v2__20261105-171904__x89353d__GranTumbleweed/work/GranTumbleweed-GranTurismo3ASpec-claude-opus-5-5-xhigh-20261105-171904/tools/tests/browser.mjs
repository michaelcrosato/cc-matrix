// The built HTML from file://: boots clean; a pad drives every top-level screen; prompts follow the last device; Xbox glyphs; mouse;
// attract at 10 s; dev sliders; the touch gate; Couch Duel with two pads; About shows every field.
import { suite } from './_lib.mjs';
import { HTML, launch, open, PAD_STUB, pressPad, state, waitFor } from './_browser.mjs';
import { devices, webkit } from 'playwright';
import { readFileSync } from 'node:fs';
const t = suite(), b = await launch();
const fail = (name, errors) => t.eq(errors.filter((e) => !/vertex count of 0/.test(e)).length, 0, `${name}: ${errors.slice(0, 3).join(' | ')}`);
{ // Boot with a pad, and walk the screens by pad.
  const { page, errors, ctx } = await open(b, { init: PAD_STUB + 'window.__padCount(1);' });
  await page.waitForTimeout(3000);
  let s = await state(page); t.eq(s.scene, 'menu', 'boots into the menu'); t.eq(s.screen, 'title', 'title first');
  t.near(s.music, 0.1, 1e-6, 'music at 10% on a fresh profile');
  { const html = readFileSync(HTML, 'utf8'), client = readFileSync('tools/hub/session.js', 'utf8'); t.ok(html.startsWith(`<!doctype html><html lang="en"><head><meta charset="utf-8"><script>${client}</script>`), 'the hub client is unmodified and the first script after the charset'); t.ok(await page.evaluate(() => window.AIHub && window.AIHub.active === false), 'AIHub is there, and not in a session'); }
  // The pad moves focus and confirms.
  await pressPad(page, 13); s = await state(page); t.eq(s.device, 'pad', 'prompts follow the pad'); t.ok(s.focus !== 'new', 'dpad moves focus');
  await pressPad(page, 12); s = await state(page); t.eq(s.focus, 'new', 'and back');
  await pressPad(page, 0); await page.waitForTimeout(800); s = await state(page); t.eq(s.screen, 'greeting', 'cross starts a new game');
  await pressPad(page, 0); await page.waitForTimeout(800); s = await state(page); t.eq(s.screen, 'dealer', 'to Dealer Row');
  await pressPad(page, 15); s = await state(page); await pressPad(page, 0); await page.waitForTimeout(400); s = await state(page); t.eq(s.profile.current, 'kite', 'buys the Kite with the pad');
  await pressPad(page, 1); await page.waitForTimeout(600); s = await state(page); t.eq(s.screen, 'map', 'circle goes back to the Map');
  for (const [place, screen] of [['licence', 'licenceList'], ['events', 'eventList'], ['dealer', 'dealer'], ['tuning', 'tuning'], ['service', 'service'], ['garage', 'garage'], ['museum', 'museum'], ['theatre', 'theatre'], ['arcade', 'arcade']]) {
    await page.evaluate((p) => window.__GAME__.focus(p), place); await page.waitForTimeout(200); await pressPad(page, 0); await page.waitForTimeout(700); s = await state(page); t.eq(s.screen, screen, `${place} opens by pad`); await pressPad(page, 1); await page.waitForTimeout(500);
  }
  // Options opens the Map's menu, and Settings, Handbook, About from there.
  await pressPad(page, 9); await page.waitForTimeout(400); s = await state(page); t.eq(s.screen, 'mapPause', 'options opens the menu');
  for (const [item, screen] of [['settings', 'settings'], ['handbook', 'handbook'], ['about', 'about']]) { await page.evaluate((i) => window.__GAME__.focus(i), item); await page.waitForTimeout(150); await pressPad(page, 0); await page.waitForTimeout(350); s = await state(page); t.eq(s.screen, screen, `${item} by pad`); await pressPad(page, 1); await page.waitForTimeout(300); }
  // Create held: Options belongs to the hub.
  await pressPad(page, 1); await page.waitForTimeout(300); await page.evaluate(() => window.__pad(0, 8, 1)); await page.waitForTimeout(120); await pressPad(page, 9); await page.evaluate(() => window.__pad(0, 8, 0)); await page.waitForTimeout(150); s = await state(page); t.eq(s.screen, 'map', 'Options is ignored while Create is held');
  // Keyboard, then mouse: prompts swap the moment the player switches.
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(200); s = await state(page); t.eq(s.device, 'key', 'prompts follow the keyboard');
  await page.mouse.move(300, 300); await page.waitForTimeout(100); await page.mouse.move(640, 400); await page.waitForTimeout(2500); s = await state(page); t.eq(s.device, 'mouse', 'prompts follow the mouse');
  // Hover moves focus, click confirms, right click goes back.
  const pos = await page.evaluate(() => { const ui = window.__APP__.ui, i = ui.items.find((x) => x.id === 'garage'); return { x: (i.x + i.w / 2) / ui.w, y: (i.y + i.h / 2) / ui.h }; });
  await page.mouse.move(pos.x * 1280, pos.y * 720); await page.waitForTimeout(250); s = await state(page); t.eq(s.focus, 'garage', 'hover moves the focus on the Map');
  await page.mouse.click(pos.x * 1280, pos.y * 720); await page.waitForTimeout(500); s = await state(page); t.eq(s.screen, 'garage', 'a click goes in'); await page.mouse.click(640, 500, { button: 'right' }); await page.waitForTimeout(400); s = await state(page); t.eq(s.screen, 'map', 'a right click goes back');
  // Xbox glyphs setting.
  await page.evaluate(() => { window.__APP__.options.glyphs = 'xbox'; }); s = await state(page); t.eq(s.glyphs, 'xbox', 'the Xbox glyph setting');
  await page.evaluate(() => { window.__APP__.options.glyphs = 'ps'; });
  // A race, then pause by pad, dev sliders, resume.
  await page.evaluate(() => window.__APP__.startQuick({ track: 'kestrel', carId: 'ginga', laps: 1, field: 3, difficulty: 'normal' })); await waitFor(page, () => window.__GAME__.state().scene === 'race', null); await page.waitForTimeout(1500);
  s = await state(page); t.eq(s.race?.track, 'kestrel', 'a race runs'); t.eq(s.race?.phase, 'rolling', 'rolling start');
  await page.evaluate(() => { window.__axis(0, 0, 0.5); window.__pad(0, 7, 0.7); }); await page.waitForTimeout(600); await page.evaluate(() => { window.__axis(0, 0, 0); window.__pad(0, 7, 0); });
  const d = await page.evaluate(() => { const a = window.__APP__.actions.driver[0]; return { t: a.throttle }; }); t.ok(typeof d.t === 'number', 'the pad reaches the driver');
  await pressPad(page, 9); await page.waitForTimeout(300); s = await state(page); t.eq(s.screen, 'pause', 'options pauses');
  await page.evaluate(() => window.__GAME__.focus('dev')); await page.waitForTimeout(150); await pressPad(page, 0); await page.waitForTimeout(300); s = await state(page); t.eq(s.screen, 'dev', 'Dev Mode is on the pause menu');
  await page.evaluate(() => window.__GAME__.focus('gripScale')); await page.waitForTimeout(150); await pressPad(page, 15); let g = await page.evaluate(() => window.__GAME__.env.gripScale); t.ok(g > 1, 'dev slider changes env live');
  await pressPad(page, 3); g = await page.evaluate(() => window.__GAME__.env.gripScale); t.near(g, 1, 1e-6, 'triangle resets all');
  await pressPad(page, 1); await page.waitForTimeout(200); await pressPad(page, 1); await page.waitForTimeout(250); s = await state(page); t.eq(s.screen, null, 'back to the race');
  fail('pad walk', errors);
  await ctx.close();
}
{ // Attract: starts at 10 s of no input, any input exits.
  const { page, errors, ctx } = await open(b);
  await page.waitForTimeout(9000); let s = await state(page); t.ok(!s.attract, 'no attract before 10 s');
  await waitFor(page, () => window.__GAME__.state().attract, null, 15000); s = await state(page); t.ok(s.attract, 'attract starts after 10 s idle');
  await page.waitForTimeout(3500); s = await state(page); t.ok(s.attract, 'it keeps playing');
  await page.keyboard.press('KeyK'); await waitFor(page, () => !window.__GAME__.state().attract, null, 10000); await page.waitForTimeout(2500); s = await state(page); t.eq(s.screen, 'title', 'any input returns to the title');
  fail('attract', errors); await ctx.close();
}
{ // Every attract clip plays, with the game's own step, and nothing touches the save.
  const { page, errors, ctx } = await open(b, { query: '?attract=1' });
  await page.waitForTimeout(800);
  const before = await page.evaluate(() => JSON.stringify(window.__APP__.profile));
  const seen = await page.evaluate(async () => { const at = window.__APP__.attract, out = []; for (let i = 0; i < 10; i++) { at.i = i; at.play(); await new Promise((r) => setTimeout(r, 200)); let w = 0; while (window.__APP__.switching && w++ < 200) await new Promise((r) => setTimeout(r, 100)); await new Promise((r) => setTimeout(r, 1200)); at.t = 0; out.push(window.__APP__.scene?.name ?? 'none'); at.grace = 3; } return out; });
  t.eq(seen.length, 10, 'ten clips'); t.ok(seen.filter((x) => x === 'race').length >= 5, `race clips run real scenes: ${seen.join(',')}`);
  const after = await page.evaluate(() => JSON.stringify(window.__APP__.profile)); t.eq(after, before, 'attract never changes the save');
  fail('attract clips', errors); await ctx.close();
}
{ // Touch-only: the gate, the settings tap, attract runs, no on-screen controls.
  const { page, errors, ctx } = await open(b, { context: { ...devices['Pixel 7'] }, viewport: undefined });
  await page.waitForTimeout(2000); let s = await state(page); t.ok(s.touchGate, 'a touch-only device gets the gate'); t.eq(s.screen, 'title', 'on the title');
  t.ok(!s.items.includes('new') && s.items.includes('settings'), 'only the settings button');
  const pos = await page.evaluate(() => { const ui = window.__APP__.ui, i = ui.items.find((x) => x.id === 'settings'), v = window.innerWidth, h = window.innerHeight; return { x: ((i.x + i.w / 2) / ui.w) * v, y: ((i.y + i.h / 2) / ui.h) * h }; });
  await page.touchscreen.tap(pos.x, pos.y); await page.waitForTimeout(700); s = await state(page); t.eq(s.screen, 'settings', 'a tap opens Settings');
  t.ok(s.items.includes('backBtn'), 'a Back button appears');
  const bp = await page.evaluate(() => { const ui = window.__APP__.ui, i = ui.items.find((x) => x.id === 'backBtn'), v = window.innerWidth, h = window.innerHeight; return { x: ((i.x + i.w / 2) / ui.w) * v, y: ((i.y + i.h / 2) / ui.h) * h }; });
  await page.touchscreen.tap(bp.x, bp.y); await page.waitForTimeout(600); s = await state(page); t.eq(s.screen, 'title', 'back by tap');
  t.ok(await page.evaluate(() => !document.querySelector('.touch-controls, .joystick, [data-touch]')), 'no on-screen controls');
  await waitFor(page, () => window.__GAME__.state().attract, null, 20000); t.ok(true, 'attract runs on a touch-only device');
  await page.waitForTimeout(1200); await page.touchscreen.tap(50, 50); await waitFor(page, () => !window.__GAME__.state().attract, null, 10000); await page.waitForTimeout(800); s = await state(page); t.eq(s.touchGate, true, 'a tap returns to the gate');
  await page.evaluate(() => window.dispatchEvent(new Event('gamepadconnected'))); await page.waitForTimeout(500); s = await state(page); t.eq(s.touchGate, false, 'a connected pad lifts the gate'); t.ok(s.items.includes('new'), 'and the title menu appears');
  fail('touch', errors); await ctx.close();
}
{ // Couch Duel with two pads: two engines up, then disposed, no errors.
  const { page, errors, ctx } = await open(b, { init: PAD_STUB + 'window.__padCount(2);' });
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__APP__.startCouch({ track: 'kestrel', carA: 'ginga', carB: 'kite', laps: 1, ai: 0 })); await waitFor(page, () => !!window.__APP__.engine2, null, 60000); await page.waitForTimeout(2500);
  let info = await page.evaluate(() => ({ p2: getComputedStyle(document.getElementById('p2')).display, canv: document.querySelectorAll('canvas').length, w1: document.getElementById('p1').offsetWidth, w2: document.getElementById('p2').offsetWidth, cars: window.__APP__.scene.sim.cars.length, ps: window.__APP__.scene.sim.players.length }));
  t.eq(info.p2, 'block', 'the second container shows'); t.ok(info.w1 > 0 && Math.abs(info.w1 - info.w2) < 4, 'split in two'); t.eq(info.ps, 2, 'two players');
  // Each pad drives its own car.
  await page.evaluate(() => { window.__pad(0, 7, 1); }); await page.waitForTimeout(5000); const v = await page.evaluate(() => { const s = window.__APP__.scene.sim; return { phase: s.phase, a: s.cars[0].c.u, b: s.cars[1].c.u, ta: window.__APP__.actions.driver[0].throttle, tb: window.__APP__.actions.driver[1].throttle }; }); t.ok(v.ta > 0.5 && v.tb < 0.1, `pad 1 is P1, pad 2 is P2: ${JSON.stringify(v)}`); await page.evaluate(() => window.__pad(0, 7, 0));
  await page.evaluate(() => { const a = window.__APP__; a.restartRun = a.restartRun; a.retireRun(a.scene); }); await page.waitForTimeout(3000); info = await page.evaluate(() => ({ e2: !!window.__APP__.engine2, p2: getComputedStyle(document.getElementById('p2')).display, w1: document.getElementById('p1').offsetWidth })); t.ok(!info.e2 && info.p2 === 'none', 'the second engine is disposed'); t.eq(info.w1, 1280, 'the first engine takes the screen again');
  fail('couch', errors); await ctx.close();
}
{ // About shows every field.
  const { page, errors, ctx } = await open(b);
  await page.waitForTimeout(2500); await page.evaluate(() => window.__GAME__.focus('about')); await page.waitForTimeout(600); await page.keyboard.press('Enter'); await waitFor(page, () => window.__GAME__.state().screen === 'about', null, 10000);
  const a = await page.evaluate(() => { const s = window.__APP__.ui.top; const text = s.pages.flatMap((p) => p.lines.map((l) => l.t)).join(' | '); return { id: s.id, text, tabs: [...new Set(s.pages.map((p) => p.tab))] }; });
  t.eq(a.id, 'about', 'About opens from the title'); for (const f of ['DATE', 'SOURCE', 'PLAN', 'GENRE', 'PERSPECTIVE', 'TECH', 'ART DIRECTION', 'ANIMATION', 'AUDIO', 'ONLINE', 'TESTING', 'RESEARCH', 'ENVIRONMENT', 'MODEL', 'USAGE', 'ADDED ON IMPORT', 'INSPIRED BY', 'SWEETIE 16', 'THREE.JS', 'RAPIER']) t.ok(a.text.includes(f), `About has ${f}`);
  t.eq(a.tabs.length, 5, 'five sections'); t.ok(!a.text.includes('UNKNOWN UNKNOWN'), 'answers are filled in');
  fail('about', errors); await ctx.close();
}
{ // Every look, and the URL flags.
  const { page, errors, ctx } = await open(b);
  await page.waitForTimeout(800);
  for (const look of ['playstation', 'arcade', 'vhs_rental', 'no_filters', 'none']) { await page.evaluate((l) => { const a = window.__APP__; a.options.look = l; a.applyPicture(); }, look); await page.waitForTimeout(600); } await page.evaluate(() => { const a = window.__APP__; a.options.pixel = 'chunky'; a.applyPicture(); }); await page.waitForTimeout(500); await page.evaluate(() => { const a = window.__APP__; a.options.pixel = 'fine'; a.options.quality = 'low'; a.applyPicture(); }); await page.waitForTimeout(500);
  fail('looks', errors); await ctx.close();
  for (const [q, check, name] of [['?scene=race&track=harbour&car=works&hour=21&rain=1&laps=2&ai=3&pace=0.92', (s) => s.scene === 'race' && s.race.track === 'harbour' && s.race.laps === 2, 'race flag'], ['?scene=licence&test=B-2', (s) => s.scene === 'race' && /licence B-2/.test(s.status), 'licence flag'], ['?scene=replay', (s) => s.scene === 'replay', 'replay flag'], ['?scene=map', (s) => s.screen === 'map', 'map flag'], ['?dev=1', (s) => s.screen === 'dev', 'dev flag']]) {
    const o = await open(b, { query: q }); let ok = false; for (let i = 0; i < 40 && !ok; i++) { await o.page.waitForTimeout(500); ok = check(await state(o.page)); } t.ok(ok, `${name}: ${JSON.stringify((await state(o.page)).status)}`); fail(name, o.errors); await o.ctx.close();
  }
}
await b.close();
{ // A browser without WebGPU gets a plain line. WebKit here has none.
  const wb = await webkit.launch({ headless: true }), page = await wb.newPage(); await page.goto(`file://${HTML}`); let text = ''; for (let i = 0; i < 40 && !/WebGPU/.test(text); i++) { await page.waitForTimeout(500); text = await page.evaluate(() => document.body.innerText).catch(() => ''); } t.ok(/GRAN TUMBLEWEED needs WebGPU/.test(text), `no WebGPU: a plain line: ${text.slice(0, 160)}`); await wb.close();
}
t.done();
