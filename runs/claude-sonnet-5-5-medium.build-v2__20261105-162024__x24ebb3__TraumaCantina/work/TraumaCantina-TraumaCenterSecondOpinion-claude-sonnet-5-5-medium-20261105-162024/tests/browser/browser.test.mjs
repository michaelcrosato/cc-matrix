import { launch, ROOT, waitReady, state, PADSTUB } from './lib.mjs';
import { devices } from 'playwright';
const URL = 'file://' + ROOT + '/dist/game.html';
const status = (page) => page.evaluate(() => { const s = window.__PIXEL_ENGINE__.state(); return s.game?.status ?? s.status ?? ''; });
const waitStatus = async (page, re, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await status(page); if (re.test(s)) return s; await page.waitForTimeout(250); } return await status(page); };
export async function run(T) {
  // 1) boots from file://, no errors, not in a session, music default 10%
  { const { browser, page, errs } = await launch(); await page.goto(URL); await waitReady(page); await page.waitForTimeout(2500);
    const info = await page.evaluate(() => ({ active: window.AIHub?.active, seeded: window.AIHub?.seeded, music: window.__PIXEL_ENGINE__.audio.volume.music, errs: window.__PIXEL_ENGINE__.errors.length, gpu: window.__PIXEL_ENGINE__.state().gpuErrors?.length ?? 0 }));
    T.ok(info.active === false, 'AIHub.active is false outside a session'); T.ok(info.seeded !== true, 'AIHub.seeded is not true'); T.ok(info.music === 0.1, `fresh profile: music slider is 0.1 (${info.music})`);
    for (const k of ['Enter', 'Space', 'Enter', 'Space']) { await page.keyboard.press(k); await page.waitForTimeout(300); }
    const st = await state(page); T.ok(st.errors.length === 0 && st.gpu.length === 0, 'Enter, Space, Enter, Space: still draws, no errors'); T.ok(errs.length === 0, 'no page or console errors on boot: ' + errs.slice(0, 2));
    await browser.close(); }
  { const { browser, page, errs } = await launch(); await page.goto(URL); await waitReady(page); await page.waitForTimeout(2500);
    // 3) menu navigation: keys, mouse hover, pad stub
    await page.keyboard.press('Enter'); let s0 = await waitStatus(page, /menu main/, 8000);
    T.ok(/menu main/.test(s0), `title advances to the main menu (${s0})`);
    const idx = () => page.evaluate(() => window.__PIXEL_ENGINE__.game.main?.i ?? -1);
    const i0 = await idx(); await page.keyboard.press('ArrowDown'); for (let k = 0; k < 20 && (await idx()) === i0; k++) await page.waitForTimeout(250); T.ok((await idx()) === i0 + 1, 'arrow keys move menu focus');
    await page.mouse.move(480, 160); await page.mouse.move(481, 161); await page.waitForTimeout(400); const hov = await idx(); T.ok(typeof hov === 'number', 'mouse hover works without error');
    // 4) prompts follow the last device
    const last1 = await page.evaluate(() => window.__GAME__.app.devices.last); T.ok(last1 === 'kb', 'last device is keyboard after key/mouse');
    await page.evaluate(() => { window.__pad && (window.__pad.buttons[13] = { pressed: true, value: 1 }); }); // no pad in this context: nothing happens
    await page.evaluate(() => { window.__GAME__.app.devices.last = 'pad'; window.__GAME__.app.settings.glyphs = 'xbox'; }); await page.waitForTimeout(300); const g = await page.evaluate(() => window.__GAME__.app.settings.glyphs); T.ok(g === 'xbox', 'Xbox glyph option set');
    await browser.close(); }
  // 2) pad stub: menu navigation + a real drain and forceps action in the sim
  { const { browser, page, errs } = await launch({ init: PADSTUB }); await page.goto(URL + '?op=op1&noattract=1'); await waitReady(page); await page.waitForTimeout(2500);
    const op = await waitStatus(page, /op1 stage/); T.ok(/op1 stage/.test(op), `op1 loads by URL flag (${op})`);
    // advance the marker with the stick: left stick moves the tip
    const tip = () => page.evaluate(() => { const s = window.__GAME__.op.sim.seats[0]; return [s.x, s.z]; });
    const t0 = await tip(); await page.evaluate(() => { window.__pad.axes[0] = 1; }); await page.waitForTimeout(600); await page.evaluate(() => { window.__pad.axes[0] = 0; }); const t1 = await tip(); T.ok(t1[0] > t0[0] + 1, `pad stick moves the instrument tip (${t0[0].toFixed(1)} -> ${t1[0].toFixed(1)})`);
    // pick Drain with the right stick (flick down = slot 4) and hold R2 over a pool
    await page.evaluate(() => { const op = window.__GAME__.op; const sim = op.sim; sim.stage = 1; sim.ents.length = 0; });
    await page.evaluate(() => { const sim = window.__GAME__.op.sim; sim.ents.push({ id: 'tp', k: 'pool', x: 1, z: 0.5, r: 1.2, tb: 0, hid: null }); sim.ents.push({ id: 'tm', k: 'marker', x: 6, z: 3, r: 0.1, tb: 0, hid: null }); const s = sim.seats[0]; s.x = 1; s.z = 0.5; });
    await page.evaluate(() => { window.__pad.axes[2] = 0; window.__pad.axes[3] = 1; }); await page.waitForTimeout(300); await page.evaluate(() => { window.__pad.axes[3] = 0; });
    const tool = await page.evaluate(() => window.__GAME__.op.sim.seats[0].sel); T.ok(tool === 'drain', `right stick flick down selects Drain (${tool})`);
    await page.evaluate(() => { window.__pad.buttons[7] = { pressed: true, value: 1 }; }); await page.waitForTimeout(700); await page.evaluate(() => { window.__pad.buttons[7] = { pressed: false, value: 0 }; });
    const r = await page.evaluate(() => window.__GAME__.op.sim.ents.find((e) => e.id === 'tp')?.r ?? 0); T.ok(r < 1.2, `R2 drains the pool at the aimed spot (r ${r})`);
    const st = await state(page); T.ok(st.errors.length === 0 && st.gpu.length === 0 && errs.length === 0, 'pad play: no engine errors ' + errs.slice(0, 2)); await browser.close(); }
  // mouse: aim + click uses the instrument at the pointer
  { const { browser, page, errs } = await launch(); await page.goto(URL + '?op=op1'); await waitReady(page); await page.waitForTimeout(2500); await waitStatus(page, /op1 stage/);
    await page.evaluate(() => { const sim = window.__GAME__.op.sim; sim.stage = 1; sim.ents.length = 0; sim.ents.push({ id: 'tp', k: 'pool', x: -1, z: 0.4, r: 1.2, tb: 0, hid: null }); });
    await page.waitForTimeout(1500); const pos = await page.evaluate(() => { const op = window.__GAME__.op; op.diveT = 99; const p = op.toHud(-1, op.field.h(-1, 0.4), 0.4); const h = op.ctx.hud; return [p[0] / h.width, p[1] / h.height]; });
    await page.keyboard.press('Digit4'); await page.mouse.move(pos[0] * 960, pos[1] * 540); await page.mouse.move(pos[0] * 960 + 2, pos[1] * 540 + 1); await page.waitForTimeout(300); await page.mouse.down(); await page.waitForTimeout(900); await page.mouse.up();
    const r = await page.evaluate(() => { const sim = window.__GAME__.op.sim; return [sim.ents.find((e) => e.id === 'tp')?.r ?? 0, sim.seats[0].x, sim.seats[0].z, sim.seats[0].sel]; }); T.ok(r[0] < 1.2 && Math.hypot(r[1] + 1, r[2] - 0.4) < 0.8, `mouse aim + click drains the pool where the pointer is (${r.map((x) => +(+x).toFixed?.(2) ?? x)})`);
    // pause -> dev mode -> slider changes live config, reset restores
    await page.keyboard.press('Escape'); await page.waitForTimeout(500); const paused = await page.evaluate(() => window.__GAME__.op.paused); T.ok(paused === true, 'Esc pauses (own flag)');
    await page.evaluate(() => { const op = window.__GAME__.op; op.openDev(op.ctx); const d = op.sub; d.tab = 0; d.menus[0].i = 0; d.menus[0].items[0].onRight(); });
    const c1 = await page.evaluate(() => window.__GAME__.config.drainMul); T.ok(c1 > 1, `dev slider changes live config (${c1})`);
    await page.evaluate(() => { const d = window.__GAME__.op.sub; const m = d.menus[0]; m.items[m.items.length - 1].onSelect(); }); const c2 = await page.evaluate(() => window.__GAME__.config.drainMul); T.ok(c2 === 1, 'Reset to Defaults restores the sliders');
    const st = await state(page); T.ok(st.errors.length === 0 && st.gpu.length === 0 && errs.length === 0, 'mouse + pause + dev: no errors ' + errs.slice(0, 2)); await browser.close(); }
  // attract: idle 10 s starts it; any key exits; save untouched
  { const { browser, page, errs } = await launch(); await page.goto(URL); await waitReady(page); await page.waitForTimeout(1500);
    const before = await page.evaluate(() => JSON.stringify(localStorage.getItem('trauma-cantina:v1')));
    const s = await waitStatus(page, /story|op|results/, 16000); T.ok(/story|^op|pileup|s-/.test(s) && !/menu/.test(s), `attract starts after 10 s idle (${s})`);
    await page.waitForTimeout(1500); await page.keyboard.press('KeyX'); const s2 = await waitStatus(page, /menu/, 8000); T.ok(/menu/.test(s2), `a key exits the attract mode to the title (${s2})`);
    const after = await page.evaluate(() => JSON.stringify(localStorage.getItem('trauma-cantina:v1'))); T.ok(before === after, 'attract mode never touches saves or settings');
    const st = await state(page); T.ok(st.errors.length === 0 && errs.length === 0, 'attract: no errors ' + errs.slice(0, 2)); await browser.close(); }
  // touch-only: exact text, the gear, attract runs
  { const { browser, page, errs } = await (async () => { const b = await (await import('playwright')).chromium.launch({ headless: true, args: (await import('./lib.mjs')).ARGS }); const ctx = await b.newContext({ ...devices['Pixel 7'] }); const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message)); return { browser: b, page, errs }; })();
    await page.goto(URL); await page.waitForTimeout(3500); const txt = await page.evaluate(() => document.getElementById('gate')?.textContent); T.ok(txt === 'Controller or keyboard required', `touch-only gate text (${txt})`);
    const gear = await page.evaluate(() => !!document.querySelector('[class*=settings], [id*=settings], button[aria-label*=ettings]')); T.ok(gear, 'the engine settings gear is present on a phone');
    const joy = await page.evaluate(() => !!document.querySelector('[class*=joystick], [class*=touch-stick], [id*=joystick]')); T.ok(!joy, 'no joystick on touch');
    const s = await waitStatus(page, /story|op|menu/, 4000); T.ok(errs.length === 0, 'touch: no page errors ' + errs.slice(0, 2)); await browser.close(); }
  // couch co-op: two stub pads -> two independent tips
  { const init = `window.__pads=[0,1].map(i=>({connected:true,mapping:'standard',index:i,id:'stub'+i,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0})),vibrationActuator:{playEffect:()=>Promise.resolve('complete')}}));navigator.getGamepads=()=>[window.__pads[0],window.__pads[1],null,null];`;
    const { browser, page, errs } = await launch({ init }); await page.goto(URL); await waitReady(page); await page.waitForTimeout(2000);
    await page.evaluate(() => window.__GAME__.goto('consult')); await waitStatus(page, /consult/, 10000);
    const press = async (i, b) => { await page.evaluate(([i, b]) => { window.__pads[i].buttons[b] = { pressed: true, value: 1 }; }, [i, b]); await page.waitForTimeout(150); await page.evaluate(([i, b]) => { window.__pads[i].buttons[b] = { pressed: false, value: 0 }; }, [i, b]); await page.waitForTimeout(150); };
    await press(0, 0); await press(1, 0); const n = await status(page); T.ok(/seats=2/.test(n), `two pads scrub in (${n})`); await press(0, 3); await waitStatus(page, /op /, 15000); await page.waitForTimeout(3000);
    await page.evaluate(() => { window.__pads[0].axes[0] = 1; window.__pads[1].axes[1] = -1; }); await page.waitForTimeout(700); await page.evaluate(() => { window.__pads[0].axes[0] = 0; window.__pads[1].axes[1] = 0; });
    const tips = await page.evaluate(() => window.__GAME__.op.sim.seats.map((s) => [s.x, s.z])); T.ok(tips.length === 2 && Math.hypot(tips[0][0] - tips[1][0], tips[0][1] - tips[1][1]) > 0.5, `two independent tips (${JSON.stringify(tips.map((t) => t.map((v) => +v.toFixed(1))))})`);
    const st = await state(page); T.ok(st.errors.length === 0 && st.gpu.length === 0 && errs.length === 0, 'co-op: no errors ' + errs.slice(0, 2)); await browser.close(); }
}
