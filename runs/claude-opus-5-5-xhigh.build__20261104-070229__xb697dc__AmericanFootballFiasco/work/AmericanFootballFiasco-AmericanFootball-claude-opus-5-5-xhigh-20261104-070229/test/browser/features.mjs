// The TASK.md features, checked on the bundled .html in Chromium through the real DOM, keyboard, mouse, touch and a
// simulated Gamepad API: PlayStation glyphs by default and Xbox from Settings, prompts that follow the last device,
// the attract mode after 10 s idle and any input leaving it, Dev mode from the pause menu with live sliders and a reset,
// the About pages against exit-interview.json, and a touch-only phone (the notice, its Settings button, the attract
// mode still running). Prints failures and a one-line count. node test/browser/features.mjs [bundle.html]
import { chromium, devices } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync, mkdirSync } from 'node:fs';
const bundle = resolve(process.argv[2] || '../AmericanFootballFiasco-AmericanFootball-claude-opus-5-5-xhigh-20261104-070229.html');
const url = pathToFileURL(bundle).href, shots = resolve('shots/features'); mkdirSync(shots, { recursive: true });
const interview = JSON.parse(readFileSync(resolve(bundle, '../exit-interview.json'), 'utf8'));
let passed = 0, failed = 0;
const ok = (name, cond, info = '') => { if (cond) passed++; else { failed++; console.log('FAIL ' + name + (info !== '' ? ': ' + info : '')); } };
// a standard-mapping pad the page polls through navigator.getGamepads; window.__pad.press(i, on) presses button i
const PAD = () => {
  const mk = (id) => ({ id: id || 'Simulated pad (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) });
  let pad = null;
  window.__pad = { plug(id) { pad = mk(id); window.dispatchEvent(Object.assign(new Event('gamepadconnected'), { gamepad: pad })); }, press(i, on) { pad.buttons[i] = { pressed: on, touched: on, value: on ? 1 : 0 }; pad.timestamp++; } };
  navigator.getGamepads = () => [pad, null, null, null];
};
const external = new Set();
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
async function open(ctx, hash = '') {
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('request', r => { if (/^https?:/i.test(r.url())) external.add(r.url()); }); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(PAD);
  await page.goto('about:blank'); await page.goto(url + (hash ? '#' + hash : '')); await page.waitForTimeout(2500);
  return { page, errors, ev: (f, a) => page.evaluate(f, a) };
}
const scene = p => p.ev(() => FF.game.sceneName);
const visibleButtons = p => p.ev(() => [...document.querySelectorAll('.esh button')].filter(e => e.offsetParent).map(e => e.textContent.trim()));
const clickButton = async (p, text) => { const h = await p.page.evaluateHandle(t => [...document.querySelectorAll('.esh button')].find(e => e.offsetParent && e.textContent.trim() === t), text); const el = h.asElement(); if (!el) return false; await el.click(); await p.page.waitForTimeout(250); return true; };

/* ---- desktop: glyphs, devices, attract ---- */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }), p = await open(ctx);
  ok('the bundle boots to the title', await scene(p) === 'title', await scene(p));
  ok('button symbols default to PlayStation', await p.ev(() => FF.game.settings.glyphs === 'playstation' && FF.glyph.text(FF.game.input, 'b1', 'gamepad') === '✕' && FF.glyph.text(FF.game.input, 'b2', 'gamepad') === '○'), await p.ev(() => FF.game.settings.glyphs + ' ' + FF.glyph.text(FF.game.input, 'b1', 'gamepad')));
  // prompts follow the device used last: keyboard, mouse, pad
  await p.page.keyboard.press('ArrowLeft'); await p.page.waitForTimeout(150);
  ok('a key press makes the prompts keyboard prompts', await p.ev(() => FF.glyph.device() === 'keyboard'), await p.ev(() => FF.game.input.lastDevice));
  await p.ev(() => { window.__pad.plug(); window.__pad.press(14, true); }); await p.page.waitForTimeout(150); await p.ev(() => window.__pad.press(14, false)); await p.page.waitForTimeout(150);
  ok('a pad button makes them pad prompts (✕ for confirm)', await p.ev(() => FF.glyph.device() === 'gamepad' && FF.glyph.text(FF.game.input, 'b1') === '✕'), await p.ev(() => FF.game.input.lastDevice + ' ' + FF.glyph.text(FF.game.input, 'b1')));
  // Xbox from the Settings screen (the Shell's DOM): Menu -> Settings -> Button symbols
  await p.page.getByRole('button', { name: 'Menu' }).click(); await p.page.waitForTimeout(300);
  if (await p.ev(() => FF.game.shell.screen !== 'settings')) await clickButton(p, 'Settings');   // (on the title, Menu opens Settings itself)
  ok('the Menu button reaches the Settings screen', await p.ev(() => FF.game.shell.screen === 'settings'), await p.ev(() => FF.game.shell.screen));
  const sel = p.page.locator('.esh button[aria-label^="Button symbols"]');
  ok('Settings lists Button symbols: PlayStation', await sel.count() === 1 && /PlayStation/.test(await sel.first().getAttribute('aria-label')), await sel.count());
  if (await sel.count()) { await sel.first().click(); await p.page.waitForTimeout(200); }
  ok('choosing Xbox there switches the setting', await p.ev(() => FF.game.settings.glyphs === 'xbox'), await p.ev(() => FF.game.settings.glyphs));
  await p.page.screenshot({ path: shots + '/settings-xbox.png' });
  ok('pad prompts become Xbox letters (A for confirm, B for back)', await p.ev(() => FF.glyph.text(FF.game.input, 'b1', 'gamepad') === 'A' && FF.glyph.text(FF.game.input, 'b2', 'gamepad') === 'B'), await p.ev(() => FF.glyph.text(FF.game.input, 'b1', 'gamepad')));
  await p.page.keyboard.press('Escape'); await p.page.waitForTimeout(200); await p.page.keyboard.press('Escape'); await p.page.waitForTimeout(300);
  ok('the Shell closes again', await p.ev(() => !FF.game.shell.screen), await p.ev(() => FF.game.shell.screen));
  // the setting is kept across a reload
  await p.page.reload(); await p.page.waitForTimeout(2500);
  ok('the Xbox choice is kept after a reload', await p.ev(() => FF.game.settings.glyphs === 'xbox'));
  // attract: 10 s without input on the title, then any input goes back
  await p.page.waitForTimeout(5500);
  ok('8 s after loading, idle: still on the title', await scene(p) === 'title', await scene(p));
  await p.page.waitForTimeout(4000);
  ok('past 10 s idle: the attract mode plays', await scene(p) === 'attract', await scene(p));
  await p.page.waitForTimeout(4000);
  ok('the attract mode is playing a demo', await p.ev(() => !!FF.attract.seg && FF.attract.t > 0), await p.ev(() => FF.attract.seg && FF.attract.seg.id));
  await p.page.screenshot({ path: shots + '/attract.png' });
  await p.page.keyboard.press('KeyZ'); await p.page.waitForTimeout(1200);
  ok('a key bound to nothing (Z) leaves it, back to the title', await scene(p) === 'title', await scene(p));
  await p.page.waitForTimeout(11000);
  ok('the attract mode starts again after another 10 s', await scene(p) === 'attract', await scene(p));
  await p.ev(() => { window.__pad.plug(); window.__pad.press(0, true); }); await p.page.waitForTimeout(150); await p.ev(() => window.__pad.press(0, false)); await p.page.waitForTimeout(1200);
  ok('a pad button leaves it too', await scene(p) === 'title', await scene(p));
  // a mouse click: mouse prompts, and on the title it starts the game
  await p.page.waitForTimeout(1000); await p.page.mouse.click(640, 400); await p.page.waitForTimeout(1200);
  ok('a mouse click makes the prompts mouse prompts', await p.ev(() => FF.glyph.device() === 'mouse'), await p.ev(() => FF.game.input.lastDevice));
  ok('a click on the title goes on to the main menu', await scene(p) === 'menu', await scene(p));
  await p.page.screenshot({ path: shots + '/menu-mouse.png' });
  ok('desktop: no page errors', !p.errors.length, p.errors.slice(0, 3).join(' | '));
  await ctx.close();
}

/* ---- Dev mode from the pause menu: live sliders, reset to defaults ---- */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }), p = await open(ctx, 'match');
  ok('#match starts a match', await scene(p) === 'match', await scene(p));
  await p.page.keyboard.press('Escape'); await p.page.waitForTimeout(400);
  ok('Esc pauses the match', await p.ev(() => FF.game.paused));
  const items = await visibleButtons(p);
  ok('the pause menu has Dev Mode', items.includes('Dev Mode'), items.join(','));
  await clickButton(p, 'Dev Mode');
  ok('Dev Mode opens its page', await p.ev(() => FF.game.shell.screen === 'dev' && FF.dev.on), await p.ev(() => FF.game.shell.screen));
  { const nav = ['TUNING', 'CHEATS', 'JUMP TO', 'PLAY LAB', 'OVERLAYS', 'TOOLS'], have = await visibleButtons(p); ok('Dev Mode lists Tuning, Cheats, Jump To, Play Lab, Overlays, Tools', nav.every(t => have.includes(t)), have.join(',')); }
  await clickButton(p, 'TUNING');
  const sliders = p.page.locator('.esh input[type=range]');
  const n = await sliders.count();
  ok('Tuning shows live sliders', n >= 4, n);
  // move the first slider: the sim's value follows at once
  const first = await p.ev(() => { const r = [...document.querySelectorAll('.esh input[type=range]')][0]; return { label: r.getAttribute('aria-label'), min: +r.min, max: +r.max, value: +r.value }; });
  const keyOf = await p.ev(lab => { const g = FF.T_GROUPS[FF.dev.group]; return FF.T_KEYS(g).find(k => (FF.game.settings.spec('dev.' + k).label || k) === lab); }, first.label);
  const def = await p.ev(k => FF.T[k], keyOf);
  const want = first.max;
  await p.ev(v => { const r = [...document.querySelectorAll('.esh input[type=range]')][0]; r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); }, want);
  await p.page.waitForTimeout(200);
  const moved = await p.ev(k => FF.T[k], keyOf);
  ok('moving a slider changes the game value live (' + first.label + ')', keyOf && moved !== def && Math.abs(moved - want) < 1e-6, keyOf + ': ' + def + ' -> ' + moved);
  await p.page.screenshot({ path: shots + '/dev-tuning.png' });
  await clickButton(p, 'Reset all to defaults');
  const back = await p.ev(k => FF.T[k], keyOf);
  ok('Reset all to defaults puts it back', back === def, back + ' vs ' + def);
  ok('the slider shows the default again', await p.ev(() => +[...document.querySelectorAll('.esh input[type=range]')][0].value) === def);
  // a cheat from the Cheats page reaches the match
  await clickButton(p, 'Back'); await clickButton(p, 'CHEATS');
  const god = p.page.locator('.esh .esh-row', { hasText: 'God mode' }).locator('button');
  if (await god.count()) { await god.first().click(); await p.page.waitForTimeout(200); }
  ok('a Dev cheat toggles on in the match', await p.ev(() => !!(FF.match && FF.match.cheats.godMode)), await god.count());
  ok('Dev settings stay off the player\'s Settings screen', await p.ev(() => { FF.game.shell.show('settings'); return ![...document.querySelectorAll('.esh')].some(e => /God mode|Dev Cheats|Dev Lab/.test(e.textContent)); }));
  ok('dev: no page errors', !p.errors.length, p.errors.slice(0, 3).join(' | '));
  await ctx.close();
}

/* ---- About / Credits: the four sections, the same as exit-interview.json ---- */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }), p = await open(ctx, 'about');
  ok('#about opens the About screen', await scene(p) === 'about', await scene(p));
  const pages = await p.ev(() => FF.aboutPages().map(pg => ({ title: pg.title, lines: pg.lines.map(([k, v]) => [k, String(v)]) })));
  const byTitle = t => pages.find(pg => pg.title === t);
  for (const t of ['SOURCE INFORMATION', 'TESTING FEEDBACK', 'ENGINE FEEDBACK', 'PROMPT FEEDBACK', 'ENGINE CHANGES', 'CREDITS']) ok('About has the page ' + t, !!byTitle(t), pages.map(pg => pg.title).join(','));
  const si = byTitle('SOURCE INFORMATION');
  ok('Source Information shows all 15 answers of the exit interview', si && Object.values(interview.sourceInformation).every(v => si.lines.some(l => l[1] === v)), si && si.lines.length);
  for (const [t, k, nq] of [['TESTING FEEDBACK', 'testingFeedback', 4], ['ENGINE FEEDBACK', 'engineFeedback', 6], ['PROMPT FEEDBACK', 'promptFeedback', 4]]) {
    const pg = byTitle(t);
    ok(t + ' shows the ' + nq + ' answers of the exit interview, each under its question', pg && pg.lines.length === nq && pg.lines.every((l, i) => l[0] && l[1] === interview[k][i]), pg && pg.lines.length);
  }
  for (let k = 0; k < pages.length; k++) { await p.page.screenshot({ path: shots + '/about-' + (k + 1) + '.png' }); await p.page.keyboard.press('ArrowRight'); await p.page.waitForTimeout(250); }
  ok('about: no page errors', !p.errors.length, p.errors.slice(0, 3).join(' | '));
  await ctx.close();
}

/* ---- controller only, on a 1080p TV: menus, setup, a play, the pause menu; the 10-foot sizes ---- */
{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } }), p = await open(ctx);
  const tap = async (i, wait = 350) => { await p.ev(i => window.__pad.press(i, true), i); await p.page.waitForTimeout(90); await p.ev(i => window.__pad.press(i, false), i); await p.page.waitForTimeout(wait); };
  const DOWN = 13, X = 0, O = 1, START = 9;
  await p.ev(() => window.__pad.plug()); await p.page.waitForTimeout(300);
  // 10-foot sizes: the canvas is drawn at 4x or more, so its smallest (5 px) text is 20 CSS px tall or more
  const scale = await p.ev(() => document.querySelector('canvas').getBoundingClientRect().width / FF.game.W);
  ok('10-foot: the canvas is scaled 4x or more at 1080p (its 5 px text 20+ px tall)', scale >= 4, scale.toFixed(2));
  await tap(X, 900);
  ok('pad: ✕ on the title opens the main menu', await scene(p) === 'menu', await scene(p));
  ok('pad: the menu prompts are pad prompts', await p.ev(() => FF.glyph.device() === 'gamepad'));
  await p.page.screenshot({ path: shots + '/pad-menu.png' });
  await tap(DOWN); await tap(X, 900);
  ok('pad: d-pad down and ✕ open EXHIBITION', await scene(p) === 'setup', await scene(p));
  await tap(X, 500);   // ready
  await p.page.screenshot({ path: shots + '/pad-setup.png' });
  for (let k = 0; k < 4 && await scene(p) === 'setup'; k++) await tap(X, 900);   // PLAY
  ok('pad: ✕ through the setup starts a match', await scene(p) === 'match', await scene(p));
  // call plays and hike with the pad only until a snap happens on a human play
  let snapped = false;
  await p.ev(() => { window.__snaps = 0; FF.bus.on('snap', () => window.__snaps++); });
  for (let k = 0; k < 60 && !snapped; k++) { await tap(X, 400); snapped = await p.ev(() => window.__snaps > 0); }
  ok('pad: ✕ calls the play and puts the ball in play (the kickoff here)', snapped, await p.ev(() => FF.match && FF.match.phase));
  await p.ev(() => { const pad = navigator.getGamepads()[0]; pad.axes[0] = 1; pad.timestamp++; }); await p.page.waitForTimeout(700);
  await p.ev(() => { const pad = navigator.getGamepads()[0]; pad.axes[0] = 0; pad.timestamp++; });
  await p.page.screenshot({ path: shots + '/pad-play.png' });
  for (let k = 0; k < 30 && await p.ev(() => FF.match.phase === 'LIVE'); k++) await p.page.waitForTimeout(300);
  await tap(START, 600);
  ok('pad: START pauses with the pause menu', await p.ev(() => FF.game.paused && FF.game.shell.screen === 'pause'), await p.ev(() => FF.game.shell.screen));
  // 10-foot: the Shell's text and buttons
  const sh = await p.ev(() => { const b = [...document.querySelectorAll('.esh button')].find(e => e.offsetParent && e.textContent.trim() === 'Settings'); const cs = getComputedStyle(b); return { font: parseFloat(cs.fontSize), h: b.getBoundingClientRect().height }; });
  ok('10-foot: pause menu text is 24 px or more at 1080p', sh.font >= 24, sh.font);
  ok('10-foot: pause menu buttons are 48 px tall or more', sh.h >= 48, sh.h);
  // move the focus with the d-pad to Settings, open it with ✕, back with ○, resume with START
  let onSettings = false;
  for (let k = 0; k < 10 && !onSettings; k++) { onSettings = await p.ev(() => (document.activeElement && document.activeElement.textContent.trim()) === 'Settings'); if (!onSettings) await tap(DOWN, 200); }
  ok('pad: the d-pad moves the pause menu focus to Settings', onSettings, await p.ev(() => document.activeElement && document.activeElement.textContent.trim()));
  await tap(X, 500);
  ok('pad: ✕ opens Settings', await p.ev(() => FF.game.shell.screen === 'settings'), await p.ev(() => FF.game.shell.screen));
  await p.page.screenshot({ path: shots + '/pad-settings.png' });
  await tap(O, 500);
  ok('pad: ○ goes back to the pause menu', await p.ev(() => FF.game.shell.screen === 'pause'), await p.ev(() => FF.game.shell.screen));
  await tap(START, 600);
  ok('pad: START again resumes the match', await p.ev(() => !FF.game.paused && !FF.game.shell.screen), await p.ev(() => [FF.game.paused, FF.game.shell.screen].join()));
  ok('pad: no page errors', !p.errors.length, p.errors.slice(0, 3).join(' | '));
  await ctx.close();
}

/* ---- keyboard and mouse, the same screens: keys PC players expect, hover moves the focus, clicks pick ---- */
{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } }), p = await open(ctx);
  const key = async (k, wait = 350) => { await p.page.keyboard.down(k); await p.page.waitForTimeout(90); await p.page.keyboard.up(k); await p.page.waitForTimeout(wait); };
  await p.page.waitForTimeout(500); await key('Enter', 900);
  ok('keys: Enter on the title opens the main menu', await scene(p) === 'menu', await scene(p));
  const kb = await p.ev(() => ({ dev: FF.glyph.device(), b1: FF.glyph.text(FF.game.input, 'b1'), pause: FF.glyph.text(FF.game.input, 'pause') }));
  ok('keys: prompts show keys, not pad symbols', kb.dev === 'keyboard' && !['✕', 'A', '○', 'B'].includes(kb.b1) && !!kb.b1, JSON.stringify(kb));
  await key('ArrowDown');
  ok('keys: the arrows move the menu focus', await p.ev(() => FF.game.debug.snapshot().menu.focus === 1), await p.ev(() => FF.game.debug.snapshot().menu.focus));
  await key('ArrowUp');
  // the mouse: moving it over an item moves the focus there (no click needed), a click picks it
  const toCss = (x, y) => p.ev(([x, y]) => { const r = document.querySelector('canvas').getBoundingClientRect(), s = r.width / FF.game.W; return [r.left + x * s, r.top + y * s]; }, [x, y]);
  const items = await p.ev(() => FF.game.debug.snapshot().menu.items);
  const ab = items.find(i => /ABOUT/.test(i.label)), ex = items.find(i => /EXHIBITION/.test(i.label));
  const [ax, ay] = await toCss(ab.x + ab.w / 2, ab.y + ab.h / 2);
  await p.page.mouse.move(ax - 40, ay - 10); await p.page.mouse.move(ax, ay, { steps: 4 }); await p.page.waitForTimeout(300);
  ok('mouse: hovering an item moves the focus to it', await p.ev(() => { const m = FF.game.debug.snapshot().menu; return m.items[m.focus].label; }) === ab.label, await p.ev(() => FF.game.debug.snapshot().menu.focus));
  ok('mouse: moving the mouse switches the prompts to keys and mouse', await p.ev(() => FF.glyph.device() === 'mouse'), await p.ev(() => FF.game.input.lastDevice));
  await p.page.screenshot({ path: shots + '/mouse-hover.png' });
  const [ex1, ey1] = await toCss(ex.x + ex.w / 2, ex.y + ex.h / 2);
  await p.page.mouse.click(ex1, ey1); await p.page.waitForTimeout(900);
  ok('mouse: a click on EXHIBITION opens it', await scene(p) === 'setup', await scene(p));
  // the keyboard from here: Space to be ready, Enter on PLAY, then Space calls plays and puts the ball in play
  await key('Space', 500);
  for (let k = 0; k < 4 && await scene(p) === 'setup'; k++) await key('Enter', 900);
  ok('keys: Space and Enter through the setup start a match', await scene(p) === 'match', await scene(p));
  await p.ev(() => { window.__snaps = 0; FF.bus.on('snap', () => window.__snaps++); });
  let live = false; for (let k = 0; k < 60 && !live; k++) { await key('Space', 400); live = await p.ev(() => window.__snaps > 0); }
  ok('keys: Space calls the play and puts the ball in play', live, await p.ev(() => FF.match && FF.match.phase));
  await p.page.keyboard.down('KeyD'); await p.page.keyboard.down('ShiftLeft'); await p.page.waitForTimeout(600); await p.page.keyboard.up('ShiftLeft'); await p.page.keyboard.up('KeyD');
  ok('keys: WASD and Shift (turbo) are bound', await p.ev(() => { const m = FF.game.input.map; return ['KeyW', 'KeyA', 'KeyS', 'KeyD'].every(c => Object.values(m).some(v => v.includes(c))) && m.turbo.includes('ShiftLeft'); }));
  await key('Escape', 600);
  ok('keys: Esc pauses', await p.ev(() => FF.game.paused && FF.game.shell.screen === 'pause'), await p.ev(() => FF.game.shell.screen));
  await key('Escape', 600);
  ok('keys: Esc again resumes', await p.ev(() => !FF.game.paused), await p.ev(() => FF.game.shell.screen));
  // the attract mode starts from the main menu too, and the mouse leaves it
  await p.ev(() => FF.game.go('menu', null, { fade: 0 })); await p.page.waitForTimeout(11500);
  ok('10 s idle on the main menu starts the attract mode', await scene(p) === 'attract', await scene(p));
  await p.page.mouse.move(500, 500); await p.page.mouse.move(700, 600, { steps: 4 }); await p.page.waitForTimeout(1200);
  ok('moving the mouse leaves it, back to the main menu', await scene(p) === 'menu', await scene(p));
  ok('keys and mouse: no page errors', !p.errors.length, p.errors.slice(0, 3).join(' | '));
  await ctx.close();
}
// all audio is made in code: no audio files or audio data in the bundle, and the game asks for nothing over the network
{
  const html = readFileSync(bundle, 'utf8');
  ok('no audio files or audio data URLs in the bundle', !/\.(mp3|ogg|wav|m4a|aac|flac|opus)\b["'`?]|data:audio\//i.test(html), (html.match(/.{30}\.(mp3|ogg|wav|m4a|aac|flac|opus)\b["'`?].{10}|data:audio\/.{20}/i) || [''])[0]);
  ok('no <audio> elements', !/<audio[\s>]/i.test(html));
}

/* ---- the ids Chrome reports for a DualSense and an Xbox pad (standard mapping) ---- */
for (const [name, id] of [['DualSense', 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)'], ['Xbox', 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)']]) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } }), p = await open(ctx);
  await p.ev(id => window.__pad.plug(id), id); await p.page.waitForTimeout(300);
  await p.ev(() => window.__pad.press(0, true)); await p.page.waitForTimeout(90); await p.ev(() => window.__pad.press(0, false)); await p.page.waitForTimeout(900);
  ok(name + ' pad: its ✕/A button opens the main menu', await scene(p) === 'menu', await scene(p));
  ok(name + ' pad: the game reads it as the pad in use, with PlayStation prompts by default', await p.ev(() => FF.game.input.lastDevice === 'gamepad' && FF.glyph.text(FF.game.input, 'b1') === '✕'), await p.ev(() => FF.game.input.padId + ' ' + FF.glyph.text(FF.game.input, 'b1')));
  ok(name + ' pad: no page errors', !p.errors.length, p.errors.slice(0, 3).join(' | '));
  await ctx.close();
}
/* ---- real phone profiles (Playwright's device descriptors) ---- */
for (const dn of ['Pixel 7', 'iPhone 13']) {
  const d = devices[dn], ctx = await browser.newContext({ viewport: d.viewport, deviceScaleFactor: d.deviceScaleFactor, isMobile: d.isMobile, hasTouch: d.hasTouch, userAgent: d.userAgent }), p = await open(ctx);
  ok(dn + ': detected as touch-only', await p.ev(() => FF.touchOnly.locked));
  const btn = await p.ev(() => { const r = document.querySelector('canvas').getBoundingClientRect(), s = r.width / FF.game.W, w = 120, h = 24, x = Math.round(FF.game.W / 2 - w / 2), y = Math.round(FF.game.H * .6 + 32); return { x: r.left + (x + w / 2) * s, y: r.top + (y + h / 2) * s }; });
  await p.page.touchscreen.tap(btn.x, btn.y); await p.page.waitForTimeout(500);
  ok(dn + ': the SETTINGS button opens Settings', await p.ev(() => FF.game.shell.screen === 'settings'), await p.ev(() => FF.game.shell.screen));
  await p.page.screenshot({ path: shots + '/' + dn.replace(/\W/g, '') + '-settings.png' });
  await p.ev(() => FF.game.shell.hide()); await p.page.waitForTimeout(11000);
  ok(dn + ': the attract mode runs', await scene(p) === 'attract', await scene(p));
  ok(dn + ': no page errors', !p.errors.length, p.errors.slice(0, 3).join(' | '));
  await ctx.close();
}

/* ---- a touch-only phone ---- */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }), p = await open(ctx);
  ok('a phone with only touch is detected as touch-only', await p.ev(() => FF.touchOnly.locked), await p.ev(() => [matchMedia('(pointer: coarse)').matches, matchMedia('(any-pointer: fine)').matches, navigator.maxTouchPoints].join()));
  await p.page.screenshot({ path: shots + '/touch-only.png' });
  // a tap on PRESS START does nothing; the SETTINGS button opens Settings
  await p.page.touchscreen.tap(195, 300); await p.page.waitForTimeout(500);
  ok('a tap elsewhere does not start the game', await scene(p) === 'title', await scene(p));
  const btn = await p.ev(() => { const r = document.querySelector('canvas').getBoundingClientRect(), s = r.width / FF.game.W, w = 120, h = 24, x = Math.round(FF.game.W / 2 - w / 2), y = Math.round(FF.game.H * .6 + 32); return { x: r.left + (x + w / 2) * s, y: r.top + (y + h / 2) * s }; });
  await p.page.touchscreen.tap(btn.x, btn.y); await p.page.waitForTimeout(500);
  ok('the SETTINGS button opens Settings', await p.ev(() => FF.game.shell.screen === 'settings'), await p.ev(() => FF.game.shell.screen));
  await p.page.screenshot({ path: shots + '/touch-settings.png' });
  await p.ev(() => FF.game.shell.hide()); await p.page.waitForTimeout(300);
  await p.page.waitForTimeout(11000);
  ok('touch-only: the attract mode still starts after 10 s', await scene(p) === 'attract', await scene(p));
  await p.page.waitForTimeout(2000);
  await p.page.screenshot({ path: shots + '/touch-attract.png' });
  await p.page.touchscreen.tap(195, 400); await p.page.waitForTimeout(1200);
  ok('touch-only: a tap leaves the attract mode', await scene(p) === 'title', await scene(p));
  ok('touch-only: still locked after the tap', await p.ev(() => FF.touchOnly.locked));
  await p.page.keyboard.press('KeyZ'); await p.page.waitForTimeout(300);
  ok('a keyboard press unlocks the game', await p.ev(() => !FF.touchOnly.locked));
  ok('touch: no page errors', !p.errors.length, p.errors.slice(0, 3).join(' | '));
  await ctx.close();
}
ok('the game makes no network requests (everything is in the one file)', !external.size, [...external].slice(0, 3).join(' '));
await browser.close();
console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
