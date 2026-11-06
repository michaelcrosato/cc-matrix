// Tier 3: pad only (stubbed navigator.getGamepads), mouse and keyboard only, and couch co-op with four stub pads.
import { launch, openGame } from '../../tools/browser.mjs';
export const name = 'browser input';
const PAD_INIT = `(() => { window.__pads = [null, null, null, null]; const mk = (i) => ({ id: 'Stub DualSense', index: i, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), timestamp: 0 }); window.__addPad = (i) => { window.__pads[i] = mk(i); }; window.__btn = (i, b, on) => { const p = window.__pads[i]; p.buttons[b].pressed = on; p.buttons[b].value = on ? 1 : 0; }; window.__axes = (i, a) => { window.__pads[i].axes = a; }; navigator.getGamepads = () => window.__pads; })();`;
const B = { cross: 0, circle: 1, square: 2, triangle: 3, l1: 4, r1: 5, l2: 6, r2: 7, create: 8, options: 9, up: 12, down: 13, left: 14, right: 15 };
export async function run(t) {
  const b = await launch();
  try {
    const { page, errors } = await openGame(b, { init: PAD_INIT });
    const step = (n) => page.evaluate(async (n) => { const e = window.__PIXEL_ENGINE__; e.manual = true; e.step(n); }, n);
    const press = async (pad, name, n = 3) => { await page.evaluate(([i, b]) => window.__btn(i, b, true), [pad, B[name]]); await step(n); await page.evaluate(([i, b]) => window.__btn(i, b, false), [pad, B[name]]); await step(3); };
    const S = (js) => page.evaluate(js);
    await page.evaluate(() => { window.__addPad(0); window.__GAME__.noTransitions = true; }); await step(30);
    // pad only: title -> menu -> new hero -> class -> name -> begin -> play
    await press(0, 'cross'); t.ok(await S(() => window.__GAME__.mode) === 'menu', 'pad: menu after Cross');
    t.ok(await S(() => window.__GAME__.glyphs.device) === 'pad' && await S(() => window.__GAME__.glyphs.set) === 'ps', 'pad: PlayStation glyphs shown');
    await press(0, 'down'); await press(0, 'cross'); await press(0, 'cross'); await press(0, 'cross'); // new hero, slot, class
    await press(0, 'down'); await press(0, 'down'); await press(0, 'down'); await press(0, 'cross');
    for (let i = 0; i < 20 && await S(() => window.__GAME__.mode) !== 'play'; i++) await step(10);
    t.ok(await S(() => window.__GAME__.mode) === 'play', 'pad: reached play: ' + await S(() => window.__GAME__.mode));
    for (let i = 0; i < 30 && !(await S(() => { const g = window.__GAME__; return g.world && g.world.zoneId === 'yard' && !g.overlay; })); i++) { await press(0, 'cross'); await step(5); }
    // walk with the stick
    const x0 = await S(() => window.__GAME__.localHero().x); await page.evaluate(() => window.__axes(0, [1, 0, 0, 0])); await step(60); await page.evaluate(() => window.__axes(0, [0, 0, 0, 0])); await step(5);
    const x1 = await S(() => { const h = window.__GAME__.localHero(); return h.x + ',' + h.z; }); t.ok(x1 !== x0 + ',' + 0, 'pad: stick moves the hero ' + x1);
    await press(0, 'cross', 20); await press(0, 'l2'); await press(0, 'l1');
    await press(0, 'create'); t.ok(await S(() => window.__GAME__.overlay && window.__GAME__.overlay.type) === 'hero', 'pad: Create opens the Hero screen'); await press(0, 'r1'); await press(0, 'circle');
    await press(0, 'options'); t.ok(await S(() => window.__GAME__.overlay && window.__GAME__.overlay.type) === 'pause', 'pad: Options opens pause');
    for (const [label, steps] of [['DEV MODE', 6], ['SETTINGS', 5]]) { const idx = await S((l) => 0, label); }
    await S(() => { window.__GAME__.pushOverlay('dev', {}); }); await step(5); t.ok(await S(() => window.__GAME__.ui.drawnText.some((d) => /DEV MODE/.test(d.text))), 'pad: dev mode draws'); await press(0, 'circle'); await S(() => window.__GAME__.pushOverlay('settings', {})); await step(5);
    // Xbox glyphs from Settings, then back
    await S(() => { window.__GAME__.save.setSettings({ glyphs: 'xbox' }); window.__GAME__.applySettings(); }); await step(5); t.ok(await S(() => window.__GAME__.glyphs.set) === 'xbox', 'pad: Xbox option switches glyphs');
    await S(() => { window.__GAME__.save.setSettings({ glyphs: 'ps' }); window.__GAME__.applySettings(); window.__GAME__.closeAll(); }); await step(4);
    // a key press switches prompts to keycaps; a pad press switches back
    await page.keyboard.down('KeyD'); await step(3); await page.keyboard.up('KeyD'); await step(3); t.ok(await S(() => window.__GAME__.glyphs.device) === 'kbm', 'a key press switches to keycaps');
    await press(0, 'cross'); t.ok(await S(() => window.__GAME__.glyphs.device) === 'pad', 'a pad press switches back');
    // couch: four stub pads join and each moves its own hero
    for (const i of [1, 2, 3]) await page.evaluate((i) => window.__addPad(i), i); await step(10);
    for (const i of [1, 2, 3]) await press(i, 'options'); await step(10);
    const seats = await S(() => window.__GAME__.world.heroes.length); t.ok(seats === 4, 'couch: four heroes: ' + seats);
    const before = await S(() => window.__GAME__.world.heroes.map((h) => [h.x, h.z]));
    const far = [0, 0, 0, 0];
    for (const dir of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      for (const i of [0, 1, 2, 3]) await page.evaluate(([i, d]) => window.__axes(i, [d[0], d[1], 0, 0]), [i, dir]); await step(40);
      const now = await S(() => window.__GAME__.world.heroes.map((h) => [h.x, h.z])); now.forEach((a, i) => { far[i] = Math.max(far[i], Math.hypot(a[0] - before[i][0], a[1] - before[i][1])); });
    }
    for (const i of [0, 1, 2, 3]) await page.evaluate((i) => window.__axes(i, [0, 0, 0, 0]), i); await step(5);
    far.forEach((d, i) => t.ok(d > 1.5, `couch: pad ${i} moves its own hero (${d.toFixed(1)} m)`));
    const zoom = await S(() => window.__PIXEL_ENGINE__.camera.zoom); t.ok(zoom < 1 || zoom <= 1.01, 'couch: camera holds them: zoom ' + zoom);
    t.ok(errors.length === 0, 'pad page errors: ' + errors.join('|'));
    t.ok(await S(() => window.__PIXEL_ENGINE__.errors.length) === 0, 'pad: engine errors ' + await S(() => window.__PIXEL_ENGINE__.errors.join('|')));
    await page.context().close();
    // mouse and keyboard only
    const m = await openGame(b, { viewport: { width: 1280, height: 720 } }); const pg = m.page;
    const st = (n) => pg.evaluate(async (n) => { const e = window.__PIXEL_ENGINE__; e.manual = true; e.step(n); }, n);
    await st(30); await pg.keyboard.press('Enter'); await st(6); t.ok(await pg.evaluate(() => window.__GAME__.mode) === 'menu', 'kbm: menu after Enter');
    const pos = await pg.evaluate(() => { const g = window.__GAME__; const c = window.__PIXEL_ENGINE__.hud.canvas.getBoundingClientRect(); const W = window.__PIXEL_ENGINE__.hud.width; const rs = g.ui.rects.filter((r) => r.focusable); const r = rs[rs.length - 1]; return { x: c.left + ((r.x + r.w / 2) / W) * c.width, y: c.top + ((r.y + r.h / 2) / window.__PIXEL_ENGINE__.hud.height) * c.height, id: r.id, f0: g.ui.focus }; });
    await pg.mouse.move(pos.x - 20, pos.y - 40); await st(3); await pg.mouse.move(pos.x, pos.y, { steps: 4 }); await st(4); const f1 = await pg.evaluate(() => window.__GAME__.ui.focus); t.ok(f1 === pos.id, `kbm: hover moves focus (${pos.f0} -> ${f1}, wanted ${pos.id})`);
    await pg.mouse.click(pos.x, pos.y); await st(6); t.ok(await pg.evaluate(() => window.__GAME__.mode) === 'about', 'kbm: click activates About: ' + await pg.evaluate(() => window.__GAME__.mode));
    await pg.keyboard.press('Escape'); await st(4);
    // into play via quick start flow: use keys on the menu
    await pg.evaluate(async () => { const g = window.__GAME__; g.noTransitions = true; await g.startNewGame({ cls: 'bellwarden', name: 'Kay', diff: 'pilgrim', lastBell: false, slot: 0 }); }); await st(40);
    await pg.evaluate(() => { const g = window.__GAME__; g.world.camp.s = 2; }); // skip tutorial steps
    const p0 = await pg.evaluate(() => { const h = window.__GAME__.localHero(); return [h.x, h.z]; });
    await pg.keyboard.down('KeyD'); await st(50); await pg.keyboard.up('KeyD'); await st(3); const p1 = await pg.evaluate(() => { const h = window.__GAME__.localHero(); return [h.x, h.z]; }); t.ok(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) > 1, 'kbm: WASD moves');
    // click-to-move: click a ground point screen-left of the hero
    const tgt = await pg.evaluate(() => { const g = window.__GAME__; const e = window.__PIXEL_ENGINE__; const h = g.localHero(); const v = new (e.camera.camera.position.constructor)(h.x - 3, 0, h.z + 3); v.project(e.camera.camera); const c = e.hud.canvas.getBoundingClientRect(); return { x: c.left + ((v.x + 1) / 2) * c.width, y: c.top + ((1 - v.y) / 2) * c.height }; });
    const q0 = await pg.evaluate(() => { const h = window.__GAME__.localHero(); return [h.x, h.z]; }); await pg.mouse.move(tgt.x, tgt.y); await pg.mouse.down(); await st(50); await pg.mouse.up(); await st(3); const q1 = await pg.evaluate(() => { const h = window.__GAME__.localHero(); return [h.x, h.z]; }); t.ok(Math.hypot(q1[0] - q0[0], q1[1] - q0[1]) > 1, 'kbm: click-to-move moves');
    for (const k of ['Space', 'KeyQ', 'Digit1', 'Digit2', 'KeyF']) { await pg.keyboard.press(k); await st(4); }
    for (const [k, ty] of [['KeyI', 'hero'], ['KeyM', 'map'], ['Escape', 'pause']]) { await pg.keyboard.press(k); await st(5); t.ok(await pg.evaluate(() => window.__GAME__.overlay && window.__GAME__.overlay.type) === ty, `kbm: ${k} opens ${ty}`); await pg.evaluate(() => window.__GAME__.closeAll()); await st(3); }
    t.ok(await pg.evaluate(() => window.__PIXEL_ENGINE__.errors.length) === 0, 'kbm: engine errors ' + await pg.evaluate(() => window.__PIXEL_ENGINE__.errors.join('|')));
    await m.context.close();
  } finally { await b.close(); }
}
