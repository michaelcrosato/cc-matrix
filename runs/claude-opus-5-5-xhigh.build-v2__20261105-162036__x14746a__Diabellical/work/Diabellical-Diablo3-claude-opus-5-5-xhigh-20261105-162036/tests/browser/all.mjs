// Tier 3: the real deliverable, over file://, on WebGPU (SwiftShader). Time is stepped, never waited.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { devices } from 'playwright';
import { DEV, HTML, launch, openGame } from '../../tools/browser.mjs';
import { assert, eq, test } from '../lib.mjs';

let shared = null;
const browserOnce = async () => (shared ??= await launch());
export const closeBrowser = async () => { if (shared) { await shared.close(); shared = null; } };

const PAD_STUB = `
window.__pads = [];
window.__mkPad = () => { const p = { connected: true, mapping: 'standard', id: 'stub', index: window.__pads.length, buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] }; window.__pads.push(p); return p; };
navigator.getGamepads = () => window.__pads;
`;
const ev = (page, fn, arg) => page.evaluate(fn, arg);
const step = (page, n = 1) => ev(page, (m) => window.__PIXEL_ENGINE__.step(m), n);
const padTap = (page, btn, i = 0) => ev(page, ([b, k]) => { const e = window.__PIXEL_ENGINE__, p = window.__pads[k]; p.buttons[b].pressed = true; p.buttons[b].value = 1; e.step(2); p.buttons[b].pressed = false; p.buttons[b].value = 0; e.step(2); }, [btn, i]);
const keyTap = (page, code) => ev(page, (c) => { const e = window.__PIXEL_ENGINE__; e.input.setKey(c, true); e.step(1); e.input.setKey(c, false); e.step(1); }, code);
const top = (page) => ev(page, () => window.__GAME__.topScreen()?.tag ?? null);
const texts = (page) => ev(page, () => window.__GAME__.ui.drawnText.map((t) => t.text).join(' | '));
const focus = (page) => ev(page, () => window.__GAME__.ui.focus);
const B = { CROSS: 0, CIRCLE: 1, SQUARE: 2, TRIANGLE: 3, L1: 4, R1: 5, L2: 6, R2: 7, CREATE: 8, OPTIONS: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };

async function freshPage(o = {}) {
  const browser = await browserOnce();
  const { context, page, errors } = await openGame({ browser, ...o });
  await ev(page, () => { window.__PIXEL_ENGINE__.manual = true; });
  return { context, page, errors };
}

const skipOpening = (page) => ev(page, () => { const g = window.__GAME__; g.skipCutscenes = true; window.__PIXEL_ENGINE__.step(4); g.skipCutscenes = false; window.__PIXEL_ENGINE__.step(2); });

test('boot: one file, no errors, a real picture, session.js first', async () => {
  const html = readFileSync(HTML, 'utf8');
  const session = readFileSync(join(DEV, 'session.js'), 'utf8');
  const first = html.indexOf('<script>');
  assert(first > 0 && first < 200, 'first script right after charset');
  assert(html.indexOf('<meta charset') < first, 'charset first');
  assert(html.slice(first + 8).startsWith(session), 'session.js is byte for byte the first script');
  for (const m of ['hub:session', 'hub:session-players', 'hub:session-mode', 'hub:session-minutes', 'hub:session-goal', 'hub:session-howto', 'hub:webgpu']) assert(html.includes(`name="${m}"`), `meta ${m}`);
  assert(html.indexOf('hub:session') > first + session.length, 'metas after the client');
  assert(!/src="|href="(?!data:)/.test(html.slice(0, first + session.length + 1200).replace(session, '')), 'nothing external in the head');
  const { context, page, errors } = await freshPage();
  const r = await ev(page, async () => {
    const e = window.__PIXEL_ENGINE__;
    e.step(30);
    const c = await e.renderer.capture();
    let lit = 0;
    const seen = new Set();
    for (let i = 0; i < c.pixels.length; i += 4 * 97) { const v = c.pixels[i] + c.pixels[i + 1] + c.pixels[i + 2]; if (v > 40) lit++; seen.add((c.pixels[i] >> 4) * 256 + (c.pixels[i + 1] >> 4) * 16 + (c.pixels[i + 2] >> 4)); }
    return { lit, colours: seen.size, errors: e.errors, gpu: e.state().gpuErrors, backend: e.state().backend };
  });
  eq(r.backend, 'WebGPU', 'backend');
  assert(r.lit > 20 && r.colours > 6, `blank picture: lit ${r.lit}, colours ${r.colours}`);
  assert(!r.errors.length, `engine errors: ${r.errors[0]}`);
  assert(!r.gpu?.length, `gpu errors: ${r.gpu?.[0]}`);
  assert(!errors.length, `page errors: ${errors[0]}`);
  await context.close();
});

test('pad only: title to play to every menu and back to the menu', async () => {
  const { context, page, errors } = await freshPage({ init: PAD_STUB });
  await ev(page, () => { window.__mkPad(); });
  await step(page, 5);
  eq(await top(page), 'title', 'title');
  await padTap(page, B.CROSS);
  eq(await top(page), 'menu', 'any button');
  const glyph = () => ev(page, () => (window.__GAME__.input.lastDevice === 'pad' ? (window.__GAME__.settings.glyphs === 'xbox' ? 'xbox' : 'ps') : 'kbm'));
  eq(await glyph(), 'ps', 'PlayStation glyphs');
  await padTap(page, B.CROSS);
  eq(await top(page), 'newhero', 'new hero');
  await padTap(page, B.RIGHT);
  await padTap(page, B.CROSS);
  await padTap(page, B.CROSS);
  await skipOpening(page);
  eq(await ev(page, () => window.__GAME__.mode), 'play', 'in play');
  eq(await ev(page, () => window.__GAME__.world.heroes[0].cls), 'lamplighter', 'second class');
  const hx = () => ev(page, () => { const h = window.__GAME__.world.heroes[0]; return [h.x, h.z]; });
  const p0 = await hx();
  await ev(page, () => { window.__pads[0].axes[0] = 1; window.__PIXEL_ENGINE__.step(30); window.__pads[0].axes[0] = 0; window.__PIXEL_ENGINE__.step(3); });
  const p1 = await hx();
  assert(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) > 0.5, 'the stick moves the hero');
  // First skill.
  await ev(page, () => { const g = window.__GAME__; g.world.heroes[0].cast = null; });
  const clips = await ev(page, () => window.__GAME__.world.heroes[0].clipN);
  await padTap(page, B.CROSS);
  assert((await ev(page, () => window.__GAME__.world.heroes[0].clipN)) > clips, 'Cross casts');
  // Dodge and potion.
  await padTap(page, B.L2);
  assert((await ev(page, () => window.__GAME__.world.heroes[0].dodges ?? 0)) > 0, 'L2 rolls');
  await padTap(page, B.L1);
  assert((await ev(page, () => window.__GAME__.world.heroes[0].potionCd)) > 0, 'L1 drinks');
  // Hero screen from Create, on release.
  await ev(page, () => { const e = window.__PIXEL_ENGINE__, p = window.__pads[0]; p.buttons[8].pressed = true; e.step(2); p.buttons[8].pressed = false; e.step(2); });
  eq(await top(page), 'hero', 'Create opens the Hero screen');
  await padTap(page, B.R1);
  assert((await texts(page)).includes('VOWS'), 'R1: skills tab');
  await padTap(page, B.R1); await padTap(page, B.R1); await padTap(page, B.R1);
  assert((await texts(page)).includes('HOW TO PLAY'), 'codex');
  await padTap(page, B.CIRCLE);
  eq(await top(page), null, 'Circle closes');
  // Options + Create belongs to the hub.
  await ev(page, () => { const e = window.__PIXEL_ENGINE__, p = window.__pads[0]; p.buttons[8].pressed = true; e.step(1); p.buttons[9].pressed = true; e.step(2); p.buttons[9].pressed = false; p.buttons[8].pressed = false; e.step(3); });
  eq(await top(page), null, 'Create + Options does not pause');
  await padTap(page, B.OPTIONS);
  eq(await top(page), 'pause', 'Options pauses');
  // Settings: switch glyphs.
  const go = async (label) => { for (let i = 0; i < 12; i++) { const f = await focus(page); if (f === label) break; await padTap(page, B.DOWN); } eq(await focus(page), label, 'focus reached'); await padTap(page, B.CROSS); };
  await go('pause:SETTINGS');
  eq(await top(page), 'settings', 'settings');
  for (let i = 0; i < 4; i++) await padTap(page, B.DOWN);
  eq(await focus(page), 'set:BUTTON GLYPHS', 'glyph row');
  await padTap(page, B.CROSS);
  eq(await glyph(), 'xbox', 'Xbox glyphs');
  await keyTap(page, 'KeyW');
  eq(await glyph(), 'kbm', 'a key switches to keycaps');
  await padTap(page, B.DOWN);
  eq(await glyph(), 'xbox', 'a pad press switches back');
  await padTap(page, B.CIRCLE);
  eq(await top(page), 'pause', 'back');
  await go('pause:DEV MODE');
  eq(await top(page), 'dev', 'dev mode by pad');
  await padTap(page, B.R1);
  await padTap(page, B.CIRCLE);
  await go('pause:SAVE AND QUIT');
  eq(await ev(page, () => window.__GAME__.mode), 'shell', 'quit to the shell');
  assert(!errors.length, errors[0]);
  assert(!(await ev(page, () => window.__PIXEL_ENGINE__.errors.length)), 'engine errors');
  await context.close();
});

test('mouse and keyboard only: hover, click, click-to-move, click to attack, every key', async () => {
  const { context, page, errors } = await freshPage({ width: 1280, height: 720 });
  await step(page, 5);
  await keyTap(page, 'Enter');
  await step(page, 3);
  eq(await top(page), 'menu', 'menu');
  const rectOf = (id) => ev(page, (k) => { const g = window.__GAME__; const w = g.ui.lastWidgets.find((x) => x.id === k); const hud = g.ctx.hud; if (!w) return null; const c = g.ctx.engine.gpu.renderer.domElement.getBoundingClientRect(); return { x: c.left + ((w.x + w.w / 2) / hud.width) * c.width, y: c.top + ((w.y + w.h / 2) / hud.height) * c.height }; }, id);
  const moveTo = async (id) => { const r = await rectOf(id); assert(r, `no widget ${id}`); await page.mouse.move(r.x, r.y); await step(page, 2); return r; };
  await moveTo('menu:SETTINGS');
  eq(await focus(page), 'menu:SETTINGS', 'hover moves focus');
  await moveTo('menu:ABOUT');
  eq(await focus(page), 'menu:ABOUT', 'hover moves focus again');
  const r = await moveTo('menu:NEW HERO');
  await page.mouse.click(r.x, r.y);
  await step(page, 3);
  eq(await top(page), 'newhero', 'click activates');
  const c2 = await moveTo('class:bellwarden');
  await page.mouse.click(c2.x, c2.y);
  await step(page, 3);
  const b = await moveTo('start:begin');
  await page.mouse.click(b.x, b.y);
  await step(page, 3);
  await skipOpening(page);
  eq(await ev(page, () => window.__GAME__.mode), 'play', 'in play by mouse alone');
  // Clear the first monsters, then test on an open floor.
  await ev(page, () => { const g = window.__GAME__; g.world.cheats.god = true; g.cmd({ c: 'dev_kill_all' }); window.__PIXEL_ENGINE__.step(2); });
  const screenOf = (x, z) => ev(page, ([px, pz]) => { const g = window.__GAME__; const [sx, sy] = g.view.project(px, 0, pz); const hud = g.ctx.hud; const c = g.ctx.engine.gpu.renderer.domElement.getBoundingClientRect(); return { x: c.left + (sx / hud.width) * c.width, y: c.top + (sy / hud.height) * c.height }; }, [x, z]);
  const hero = () => ev(page, () => { const h = window.__GAME__.world.heroes[0]; return { x: h.x, z: h.z, clipN: h.clipN, goal: !!h.goal }; });
  await step(page, 30);
  const h0 = await hero();
  const tgt = await screenOf(h0.x + 3, h0.z);
  await page.mouse.move(tgt.x, tgt.y);
  await step(page, 2);
  await page.mouse.down();
  await step(page, 2);
  await page.mouse.up();
  await step(page, 40);
  const h1 = await hero();
  assert(Math.hypot(h1.x - h0.x, h1.z - h0.z) > 1, `click moves the hero: ${JSON.stringify([h0, h1])}`);
  // Click on a monster attacks it.
  await ev(page, () => { const g = window.__GAME__; const h = g.world.heroes[0]; h.dirX = 1; h.dirZ = 0; g.cmd({ c: 'dev_spawn', type: 'pallid_bearer', n: 1 }); window.__PIXEL_ENGINE__.step(2); });
  const m = await ev(page, () => { const g = window.__GAME__; const o = g.world.monsters[g.world.monsters.length - 1]; o.def = { ...o.def, speed: 0 }; return { x: o.x, z: o.z }; });
  const ms = await ev(page, ([px, pz]) => { const g = window.__GAME__; const [sx, sy] = g.view.project(px, 0.9, pz); const hud = g.ctx.hud; const c = g.ctx.engine.gpu.renderer.domElement.getBoundingClientRect(); return { x: c.left + (sx / hud.width) * c.width, y: c.top + (sy / hud.height) * c.height }; }, [m.x, m.z]);
  await page.mouse.move(ms.x, ms.y);
  await step(page, 3);
  const cBefore = (await hero()).clipN;
  await page.mouse.down();
  await step(page, 3);
  await page.mouse.up();
  await step(page, 150);
  assert((await hero()).clipN > cBefore, 'click on a monster attacks it');
  // Keys.
  await ev(page, () => { const g = window.__GAME__; g.cmd({ c: 'dev_kill_all' }); g.cmd({ c: 'dev_level_max' }); const h = g.world.heroes[0]; g.cmd({ c: 'skill', slot: 1, id: 'clapper_charge' }); g.cmd({ c: 'skill', slot: 2, id: 'chain_reap' }); g.cmd({ c: 'skill', slot: 3, id: 'great_toll' }); g.cmd({ c: 'skill', slot: 4, id: 'reverberate' }); g.cmd({ c: 'skill', slot: 5, id: 'bellfall' }); h.res = 100; g.world.cheats.infRes = true; });
  await step(page, 5);
  const moved = async (code) => { const a = await hero(); await ev(page, (c) => { const e = window.__PIXEL_ENGINE__; e.input.setKey(c, true); e.step(12); e.input.setKey(c, false); e.step(2); }, code); const q = await hero(); return Math.hypot(q.x - a.x, q.z - a.z); };
  for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']) assert((await moved(k)) > 0.2, `${k} moves`);
  await page.mouse.move(5, 5);
  await step(page, 2);
  for (const k of ['Digit1', 'Digit2', 'Digit3', 'Digit4']) { const c = (await hero()).clipN; await ev(page, () => { const h = window.__GAME__.world.heroes[0]; h.cast = null; h.move = null; h.cds = {}; h.charges = {}; }); await keyTap(page, k); await step(page, 2); assert((await hero()).clipN > c, `${k} casts`); await step(page, 60); }
  const d0 = await ev(page, () => window.__GAME__.world.heroes[0].dodges ?? 0);
  await step(page, 200);
  await keyTap(page, 'Space');
  assert((await ev(page, () => window.__GAME__.world.heroes[0].dodges ?? 0)) > d0, 'Space rolls');
  await ev(page, () => { window.__GAME__.world.heroes[0].potionCd = 0; });
  await keyTap(page, 'KeyQ');
  assert((await ev(page, () => window.__GAME__.world.heroes[0].potionCd)) > 0, 'Q drinks');
  await step(page, 30);
  const r0 = await ev(page, () => window.__GAME__.world.heroes[0].clipN);
  await ev(page, () => { const h = window.__GAME__.world.heroes[0]; h.cast = null; });
  await page.mouse.move(640, 300);
  await step(page, 2);
  await page.mouse.down({ button: 'right' });
  await step(page, 3);
  await page.mouse.up({ button: 'right' });
  await step(page, 2);
  const dbg = await ev(page, () => { const g = window.__GAME__, h = g.world.heroes[0], e = window.__PIXEL_ENGINE__; return JSON.stringify({ clip: h.clipN, skill: h.skills[1], top: g.topScreen()?.tag, st: h.state, cast: h.cast?.sk?.id, move: h.move?.k, cds: h.cds, ch: h.charges, res: h.res, dead: h.dead, stun: h.stunned }); });
  assert((await ev(page, () => window.__GAME__.world.heroes[0].clipN)) > r0, `right click casts the second skill: ${r0} ${dbg}`);
  for (const [key, tag] of [['KeyI', 'hero'], ['KeyC', 'hero'], ['KeyK', 'hero'], ['KeyL', 'hero'], ['KeyM', 'map'], ['Tab', 'map'], ['Escape', 'pause']]) {
    await keyTap(page, key);
    eq(await top(page), tag, key);
    await keyTap(page, 'Escape');
    await step(page, 2);
  }
  await ev(page, () => { window.__GAME__.cmd({ c: 'dev_item', slot: 'ring', rarity: 'legendary' }); const h = window.__GAME__.world.heroes[0]; h.newest = h.inv.find(Boolean).uid; });
  const eq0 = await ev(page, () => window.__GAME__.world.heroes[0].equips ?? 0);
  await keyTap(page, 'KeyF');
  assert((await ev(page, () => window.__GAME__.world.heroes[0].equips ?? 0)) > eq0, 'F equips');
  await ev(page, () => { window.__GAME__.cmd({ c: 'dev_goto', zone: 'causeway' }); window.__PIXEL_ENGINE__.step(3); window.__GAME__.closeAll(); window.__PIXEL_ENGINE__.step(1); });
  await ev(page, () => { const e = window.__PIXEL_ENGINE__; e.input.setKey('KeyT', true); e.step(100); e.input.setKey('KeyT', false); e.step(3); });
  eq(await ev(page, () => window.__GAME__.world.zone.id), 'town', 'hold T: the Passing Bell');
  await ev(page, () => { const e = window.__PIXEL_ENGINE__; e.input.setKey('AltLeft', true); e.step(2); });
  assert(await ev(page, () => window.__GAME__.labelsHeld), 'Alt shows labels');
  await ev(page, () => { const e = window.__PIXEL_ENGINE__; e.input.setKey('AltLeft', false); e.step(2); });
  assert(!errors.length, errors[0]);
  await context.close();
});

test('couch: four pads join, each moves its own hero, the camera holds them', async () => {
  const { context, page, errors } = await freshPage({ init: PAD_STUB });
  await ev(page, () => { window.__mkPad(); });
  await step(page, 5);
  await padTap(page, B.CROSS); await padTap(page, B.CROSS); await padTap(page, B.CROSS); await padTap(page, B.CROSS);
  await skipOpening(page);
  eq(await ev(page, () => window.__GAME__.mode), 'play', 'seat one in play');
  await ev(page, () => { window.__GAME__.world.cheats.god = true; window.__GAME__.cmd({ c: 'dev_goto', zone: 'town' }); window.__PIXEL_ENGINE__.step(3); window.__GAME__.closeAll(); });
  for (let i = 1; i < 4; i++) {
    await ev(page, () => { window.__mkPad(); window.__PIXEL_ENGINE__.step(2); });
    await padTap(page, B.OPTIONS, i);
    await step(page, 2);
    const t = await top(page);
    if (t === 'party') { await padTap(page, B.CROSS, i); }
    eq(await ev(page, () => window.__GAME__.world.heroes.filter((h) => !h.companion).length), i + 1, `seat ${i + 1} joined`);
    await ev(page, () => window.__GAME__.closeAll());
    await step(page, 2);
  }
  const pos = () => ev(page, () => window.__GAME__.world.heroes.filter((h) => !h.companion).map((h) => [h.x, h.z]));
  for (let i = 0; i < 4; i++) {
    const a = await pos();
    await ev(page, (k) => { const e = window.__PIXEL_ENGINE__, p = window.__pads[k]; p.axes[1] = k % 2 ? 1 : -1; p.axes[0] = 0.4; e.step(20); p.axes[1] = 0; p.axes[0] = 0; e.step(3); }, i);
    const b = await pos();
    for (let j = 0; j < 4; j++) {
      const d = Math.hypot(a[j][0] - b[j][0], a[j][1] - b[j][1]);
      if (j === i) assert(d > 0.3, `seat ${i} did not move`);
      else assert(d < 0.2, `seat ${j} moved when seat ${i} pressed`);
    }
  }
  // Camera: every hero on screen, zoomed out as needed.
  await ev(page, () => { window.__PIXEL_ENGINE__.step(120); });
  const inFrame = await ev(page, () => { const g = window.__GAME__; const hud = g.ctx.hud; return g.world.heroes.filter((h) => !h.companion).every((h) => { const [x, y] = g.view.project(h.x, 1, h.z); return x > 0 && x < hud.width && y > 0 && y < hud.height; }); });
  assert(inFrame, 'all four in frame');
  // Couch HUD.
  const t = await texts(page);
  assert(!errors.length, errors[0]);
  assert(t.length > 0, 'hud');
  await context.close();
});

test('touch: no controls, the message, the settings button, attract runs', async () => {
  for (const name of ['Pixel 7', 'iPad Mini']) {
    const browser = await browserOnce();
    const dev = devices[name];
    const context = await browser.newContext({ ...dev, defaultBrowserType: undefined });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`file://${HTML}`);
    await page.waitForFunction(() => window.__PIXEL_READY__, null, { timeout: 60000 });
    await page.evaluate(() => window.__PIXEL_READY__);
    const state = await ev(page, () => { const e = window.__PIXEL_ENGINE__; const g = window.__GAME__; e.step(10); return { touch: e.touch, only: g.touchOnly, tag: g.topScreen()?.tag, text: g.ui.drawnText.map((t) => t.text).join(' | '), mode: g.mode, w: g.ctx.hud.width, gear: !!document.querySelector('button[title], .pe-settings-button, button') }; });
    assert(state.only, `${name}: seen as touch-only`);
    eq(state.touch, null, `${name}: no touch controls`);
    eq(state.mode, 'attract', `${name}: attract runs`);
    const joined = state.text.replace(/ \| /g, ' ');
    assert(joined.includes('CONTROLLER OR') && joined.includes('REQUIRED'), `${name}: message: ${state.text.slice(0, 200)}`);
    assert(state.gear, `${name}: settings button`);
    assert(!/MOVE|EQUIP|PRESS ANY BUTTON/.test(joined), `${name}: nothing asks for a key or button on a touch-only screen: ${state.text.slice(0, 200)}`);
    eq(joined.split('DIABELLICAL').length - 1, 1, `${name}: the title once`);
    const inside = await ev(page, () => { const g = window.__GAME__; return g.ui.drawnText.filter((t) => t.text.includes('CONTROLLER') || t.text.includes('REQUIRED')).every((t) => t.x >= 0 && t.x + t.w <= g.ctx.hud.width); });
    assert(inside, `${name}: message wrapped to the screen`);
    const vp = page.viewportSize();
    await page.touchscreen.tap(vp.width / 2, vp.height / 2);
    await step(page, 5);
    eq(await ev(page, () => window.__GAME__.mode), 'attract', `${name}: a tap does not start a game`);
    assert(!errors.length, errors[0]);
    await context.close();
  }
});

test('sound: music alone is quiet, effects and voices rise above it', async () => {
  const init = `
    window.__levels = [];
    const proto = AudioNode.prototype; const orig = proto.connect;
    proto.connect = function (dest, ...rest) {
      const r = orig.call(this, dest, ...rest);
      if (dest instanceof AudioDestinationNode) {
        const ctx = this.context;
        if (!ctx.__an) { ctx.__an = ctx.createAnalyser(); ctx.__an.fftSize = 2048; window.__an = ctx.__an; }
        orig.call(this, ctx.__an);
      }
      return r;
    };
    window.__level = () => { if (!window.__an) return -1; const d = new Float32Array(2048); window.__an.getFloatTimeDomainData(d); let p = 0; for (const v of d) p = Math.max(p, Math.abs(v)); return p; };
  `;
  const browser = await browserOnce();
  const { context, page, errors } = await openGame({ browser, init });
  await page.keyboard.press('KeyK');
  await ev(page, () => { window.__GAME__.ctx.audio.unlock(); });
  await page.waitForTimeout(2600);
  const peak = async (ms) => { let best = 0; const t0 = Date.now(); while (Date.now() - t0 < ms) { best = Math.max(best, await ev(page, () => window.__level())); await page.waitForTimeout(20); } return best; };
  eq(await ev(page, () => window.__GAME__.ctx.audio.volume.music), 0.1, 'music volume');
  const music = await peak(1500);
  assert(music > 0.0005, `music alone is silent: ${music}`);
  await ev(page, () => { window.__GAME__.audioSys.sfx('bell_big'); });
  const sfx = await peak(500);
  assert(sfx > music * 1.5, `an effect should rise well above the music: ${sfx} vs ${music}`);
  await page.waitForTimeout(2500);
  await ev(page, () => { window.__GAME__.audioSys.speak('crier', 'Hear ye, hear ye! The dead are up, the roads are closed.'); });
  const voice = await peak(900);
  assert(voice > music * 1.2, `a line should be heard: ${voice} vs ${music}`);
  await ev(page, () => { window.__GAME__.audioSys.stopAll(); });
  await page.waitForTimeout(3500);
  const quiet = await peak(400);
  assert(quiet < 0.02, `silence after stop: ${quiet}`);
  assert(!errors.length, errors[0]);
  await context.close();
});

test('layout: text stays on screen and does not collide, at three sizes', async () => {
  for (const [width, height] of [[1280, 720], [1920, 1080], [2560, 1440]]) {
    const { context, page, errors } = await freshPage({ width, height });
    const check = async (name) => {
      await step(page, 2);
      const r = await ev(page, () => {
        const g = window.__GAME__, W = g.ctx.hud.width, H = g.ctx.hud.height;
        const tag = g.topScreen()?.tag ?? 'hud';
        const list = g.ui.drawnText.filter((t) => t.text.trim() && t.screen === tag);
        const out = list.filter((t) => t.x < 0 || t.y < 0 || t.x + t.w > W + 1 || t.y + t.h > H + 1).map((t) => `${t.text}@${t.x},${t.y}`);
        const over = [];
        for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
          const a = list[i], b = list[j];
          if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) over.push(`${a.text} / ${b.text}`);
        }
        return { out, over, W, H };
      });
      assert(!r.out.length, `${name} at ${r.W}x${r.H}: off screen: ${r.out.slice(0, 3).join('; ')}`);
      assert(!r.over.length, `${name} at ${r.W}x${r.H}: overlap: ${r.over.slice(0, 3).join('; ')}`);
    };
    await step(page, 3);
    await check('title');
    await keyTap(page, 'Enter'); await check('menu');
    await keyTap(page, 'Enter'); await check('new hero');
    await keyTap(page, 'Enter'); await check('new hero start');
    await keyTap(page, 'Enter');
    await skipOpening(page);
    await ev(page, () => { const g = window.__GAME__; g.world.camp.flags.forge = 1; g.world.camp.flags.reliquary = 1; g.cmd({ c: 'dev_level_max' }); g.cmd({ c: 'dev_gold', n: 90000 }); g.cmd({ c: 'dev_mats' }); g.cmd({ c: 'dev_gems' }); g.cmd({ c: 'dev_legendary', id: 'plate_lining' }); g.cmd({ c: 'dev_set', slot: 'head' }); g.cmd({ c: 'writs' }); g.cmd({ c: 'dev_kill_all' }); g.closeAll(); });
    const open = async (file, cls, arg, name, tabs = 1) => {
      await ev(page, ([f, c, a]) => { const g = window.__GAME__; g.menuSeat = 0; g.openScreen(new g.screenClasses[c](g, a)); void f; }, [file, cls, arg]);
      await step(page, 2);
      for (let t = 0; t < tabs; t++) {
        await check(`${name} tab ${t}`);
        if (tabs > 1) await keyTap(page, 'KeyE');
      }
      await ev(page, () => window.__GAME__.closeAll());
      await step(page, 2);
    };
    await open('', 'HeroScreen', 0, 'hero', 5);
    await open('', 'PennywhistleScreen', null, 'pennywhistle', 3);
    await open('', 'BrasseScreen', null, 'brasse', 3);
    await open('', 'OgiveScreen', null, 'ogive', 4);
    await open('', 'StashScreen', null, 'stash', 1);
    await open('', 'PauseScreen', null, 'pause', 1);
    await open('', 'SettingsScreen', null, 'settings', 1);
    await open('', 'HowToScreen', null, 'how to play', 1);
    await open('', 'PartyScreen', null, 'party', 1);
    await open('', 'DevScreen', null, 'dev', 8);
    await open('', 'AboutScreen', null, 'about', 5);
    await open('', 'KnellScreen', null, 'knell', 1);
    await open('', 'WritsScreen', null, 'writs', 1);
    await open('', 'MapScreen', null, 'map', 1);
    assert(!errors.length, errors[0]);
    await context.close();
  }
});

test('a save round-trips through a reload, and Continue picks it up', async () => {
  const { context, page, errors } = await freshPage();
  await step(page, 3);
  await keyTap(page, 'Enter'); await step(page, 2);
  await keyTap(page, 'Enter'); await step(page, 2);
  await keyTap(page, 'Enter'); await step(page, 2);
  await keyTap(page, 'Enter'); await step(page, 2);
  await skipOpening(page);
  const before = await ev(page, () => { const g = window.__GAME__; g.cmd({ c: 'dev_level', n: 4 }); g.cmd({ c: 'dev_gold', n: 777 }); g.cmd({ c: 'dev_item', slot: 'ring', rarity: 'reliquary' }); g.world.camp.flags.pyx = 1; g.persist(); const h = g.world.heroes[0]; return { level: h.level, gold: h.gold, item: h.inv.find(Boolean).name, name: h.name, q: g.world.camp.q.s }; });
  await page.reload();
  await page.waitForFunction(() => window.__PIXEL_READY__, null, { timeout: 60000 });
  await page.evaluate(() => window.__PIXEL_READY__);
  await ev(page, () => { window.__PIXEL_ENGINE__.manual = true; });
  await step(page, 3);
  await keyTap(page, 'Enter'); await step(page, 2);
  eq(await top(page), 'menu', 'menu after the reload');
  assert((await texts(page)).includes('CONTINUE'), 'Continue offered');
  eq(await focus(page), 'menu:CONTINUE', 'focus starts on Continue');
  await keyTap(page, 'Enter'); await step(page, 2);
  eq(await top(page), 'heroselect', 'hero select');
  assert((await texts(page)).includes(before.name), 'my hero is listed');
  await keyTap(page, 'Enter'); await step(page, 3);
  const after = await ev(page, () => { const g = window.__GAME__; const h = g.world.heroes[0]; return { level: h.level, gold: h.gold, item: h.inv.find(Boolean)?.name, name: h.name, q: g.world.camp.q.s, mode: g.mode }; });
  eq(after.mode, 'play', 'in play');
  eq(after.level, before.level, 'level kept');
  eq(after.gold, before.gold, 'gold kept');
  eq(after.item, before.item, 'item kept');
  eq(after.name, before.name, 'name kept');
  // Music stays where the player left it, and the flag is ours.
  assert(!errors.length, errors[0]);
  await context.close();
});

test('WebKit here has no WebGPU: it shows the no-WebGPU page', async () => {
  const { webkit } = await import('playwright');
  const browser = await webkit.launch();
  const page = await browser.newPage();
  await page.goto(`file://${HTML}`);
  await page.waitForFunction(() => document.body.innerText.includes('WebGPU') || window.__PIXEL_ENGINE__, null, { timeout: 30000 });
  const t = await page.evaluate(() => document.body.innerText);
  const hasGpu = await page.evaluate(() => !!navigator.gpu);
  if (!hasGpu) { assert(t.includes('needs WebGPU'), `page says: ${t.slice(0, 200)}`); assert(t.includes('Diabellical'), 'title on the page'); }
  await browser.close();
});

test('the kit agrees: check.mjs passes the game in Node with keys that play', async () => {
  const { execFile } = await import('node:child_process');
  const out = await new Promise((res) => {
    execFile('node', ['check.mjs', '--headless', 'game.js', '--out', '.build/check', '--keys', 'Enter*2,Enter*2,Enter*2,Enter*2,Enter*50,KeyD*60,Digit1*20,KeyA*30'], { cwd: DEV, timeout: 120000 }, (e, so, se) => res({ code: e?.code ?? 0, out: `${so}${se}` }));
  });
  assert(out.code === 0, out.out.slice(-600));
});

test('all done: close the browser', async () => { await closeBrowser(); });
