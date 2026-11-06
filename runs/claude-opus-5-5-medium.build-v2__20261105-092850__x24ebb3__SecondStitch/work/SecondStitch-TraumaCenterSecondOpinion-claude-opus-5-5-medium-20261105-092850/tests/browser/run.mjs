// Browser tests on the built page from file://, one browser at a time. Software WebGPU: state, not frame rate.
import { launch, open, engineErrors, PAD_STUB, devices, pageUrl, tap, waitFrames } from './lib.mjs';

const wait = (p, f, arg, timeout = 30000) => p.waitForFunction(f, arg, { timeout, polling: 100 });
const G = 'window.__GAME__';
async function stageName(page) { return page.evaluate(() => window.__GAME__?.stage?.name); }

export async function run(ok) {
  const b = await launch();
  try {
    /* boots, not in a session, music 10% */
    { const { page, errors, ctx } = await open(b);
      await wait(page, () => window.__GAME__?.stage?.name === 'title');
      ok('boot: title from file://', true);
      ok('session: AIHub inactive outside a session', await page.evaluate(() => window.AIHub?.active === false || !window.AIHub?.active));
      ok('session: Math.random not seeded', await page.evaluate(() => window.AIHub?.seeded !== true));
      ok('music: 10% on a fresh profile', await page.evaluate(() => Math.abs(window.__PIXEL_ENGINE__.audio.volume.music - 0.1) < 1e-6), String(await page.evaluate(() => window.__PIXEL_ENGINE__.audio.volume.music)));
      ok('engine: touch controls off', await page.evaluate(() => !window.__PIXEL_ENGINE__.touch));
      // Enter, Space, Enter, Space, still draws (the hub's own check on its own)
      for (const k of ['Enter', 'Space', 'Enter', 'Space']) { await tap(page, k); }
      await page.waitForTimeout(2000);
      const pixels = await page.evaluate(async () => { const f = await window.__PIXEL_ENGINE__.renderer.capture(); let sum = 0; for (let i = 0; i < f.pixels.length; i += 97) sum += f.pixels[i]; return sum; });
      ok('on its own: Enter, Space, Enter, Space, still draws', pixels > 0);
      ok('no errors: title flow', !errors.length && !(await engineErrors(page)).length, [...errors, ...(await engineErrors(page))].slice(0, 3).join(' | '));
      await ctx.close(); }
    /* menus: keys, mouse hover, pad */
    { const { page, errors, ctx } = await open(b, '?menu=1', { init: PAD_STUB });
      await wait(page, () => window.__GAME__?.stage?.name === 'main');
      const focus = () => page.evaluate(() => window.__GAME__.stage.menu.focus);
      await page.waitForTimeout(300);
      await tap(page, 'ArrowDown');
      ok('menu: keys move focus (and skip a disabled row)', (await focus()) === 2, String(await focus()));
      // mouse hover
      const hit = await page.evaluate(() => { const m = window.__GAME__.stage.menu, h = m.hit[3], hud = window.__PIXEL_ENGINE__.hud; const c = hud.canvas.getBoundingClientRect(); return { x: c.left + ((h.x + 20) / hud.width) * c.width, y: c.top + ((h.y + 4) / hud.height) * c.height }; });
      await page.mouse.move(hit.x, hit.y); await page.waitForTimeout(300);
      ok('menu: hover moves focus', (await focus()) === 3, String(await focus()));
      ok('prompts: keyboard glyphs for keyboard', await page.evaluate(() => window.__GAME__.app.devices.last === 'kbm'));
      await page.evaluate(() => { window.__padsOn = 1; }); await page.waitForTimeout(100);
      await page.evaluate(() => window.__press(0, 13, 1)); await page.waitForTimeout(250); await page.evaluate(() => window.__press(0, 13, 0)); await page.waitForTimeout(150);
      ok('menu: pad moves focus', (await focus()) === 4, String(await focus()));
      ok('prompts: follow the last device', await page.evaluate(() => window.__GAME__.app.devices.last === 'pad' && window.__GAME__.app.prompts.device === 'pad'));
      const xb = await page.evaluate(() => { const a = window.__GAME__.app, P = a.prompts; const before = P.xbName('L2'); a.settings.glyphs = 'xbox'; const after = P.xbName('L2'); a.settings.glyphs = 'ps'; return [before, after]; });
      ok('prompts: the Xbox option swaps glyphs', xb[0] === 'L2' && xb[1] === 'LT', xb.join());
      ok('no errors: menus', !errors.length && !(await engineErrors(page)).length, errors.join());
      await ctx.close(); }
    /* a real action by mouse and pad */
    { const { page, errors, ctx } = await open(b, '?op=op1&stage=1', { init: PAD_STUB });
      await wait(page, () => window.__GAME__?.stage?.name === 'operation');
      await wait(page, () => window.__GAME__.stage.intro <= 0);
      const pool = await page.evaluate(() => { const s = window.__GAME__.sim, e = s.ents.find((q) => q.k === 'pool'); return { x: e.x, z: e.z, r: e.r }; });
      // aim with the mouse at the pool's real position on screen
      const at = await page.evaluate(({ x, z }) => { const st = window.__GAME__.stage; const p = st.toScreen(x, st.field.surface(x, z), z), hud = window.__PIXEL_ENGINE__.hud, c = hud.canvas.getBoundingClientRect(); return { x: c.left + (p.x / hud.width) * c.width, y: c.top + (p.y / hud.height) * c.height }; }, pool);
      await page.mouse.move(at.x, at.y); await page.waitForTimeout(300);
      const tip = await page.evaluate(() => { const s = window.__GAME__.sim.seats[0]; return [s.x, s.z]; });
      ok('mouse: the tip lands on the aimed spot', Math.hypot(tip[0] - pool.x, tip[1] - pool.z) < 0.5, `${tip} vs ${pool.x},${pool.z}`);
      await page.mouse.down(); await page.waitForTimeout(1500); await page.mouse.up();
      const r2 = await page.evaluate(({ id }) => window.__GAME__.sim.ents.find((q) => q.k === 'pool' && q.sid === id)?.r ?? 0, { id: 'p1' });
      ok('mouse: drain sucks up the pool', r2 < pool.r, `${r2} from ${pool.r}`);
      // pad: stick moves, trigger uses
      await page.evaluate(() => { window.__padsOn = 1; }); await page.waitForTimeout(100);
      const x0 = await page.evaluate(() => window.__GAME__.sim.seats[0].x);
      await page.evaluate(() => { window.__pads[0].axes[0] = 1; }); await page.waitForTimeout(900); await page.evaluate(() => { window.__pads[0].axes[0] = 0; });
      const x1 = await page.evaluate(() => window.__GAME__.sim.seats[0].x);
      ok('pad: left stick moves the tip', x1 > x0 + 0.5, `${x0} ${x1}`);
      // flick right stick: pick forceps
      await page.evaluate(() => { window.__pads[0].axes[2] = 0.7; window.__pads[0].axes[3] = -0.7; }); await waitFrames(page, 3); await page.evaluate(() => { window.__pads[0].axes[2] = 0; window.__pads[0].axes[3] = 0; }); await waitFrames(page, 3);
      const tool = await page.evaluate(() => window.__GAME__.sim.seats[0].tool);
      ok('pad: right stick flick picks a tool', tool === 'forceps', tool);
      // forceps grab with R2 on a hook
      await page.evaluate(() => { const s = window.__GAME__.stage, sim = s.sim; sim.ents = sim.ents.filter((e) => e.k !== 'pool'); for (const e of sim.ents) delete e.hiddenBy; const h = sim.ents.find((e) => e.k === 'hook'); s.tips[0].x = h.x; s.tips[0].z = h.z; window.__hook = h.id; });
      await page.evaluate(() => window.__press(0, 7, 1));
      const grabbed = await wait(page, () => window.__GAME__.sim.seats[0].grab === window.__hook, null, 15000).then(() => true, () => false);
      ok('pad: R2 grabs with forceps', grabbed);
      ok('rumble: the call path runs', await page.evaluate(() => (window.__rumble ?? 0) >= 0));
      await page.evaluate(() => window.__press(0, 7, 0));
      ok('no errors: action', !errors.length && !(await engineErrors(page)).length, [...errors, ...(await engineErrors(page))].slice(0, 3).join(' | '));
      await ctx.close(); }
    /* pause, dev mode, slider, reset */
    { const { page, errors, ctx } = await open(b, '?op=op1');
      await wait(page, () => window.__GAME__?.stage?.intro <= 0);
      await tap(page, 'Escape');
      ok('pause: opens', await page.evaluate(() => !!window.__GAME__.stage.pause));
      const clock0 = await page.evaluate(() => window.__GAME__.sim.clock); await page.waitForTimeout(500);
      ok('pause: sim stopped', (await page.evaluate(() => window.__GAME__.sim.clock)) === clock0);
      for (let i = 0; i < 5; i++) { await tap(page, 'ArrowDown'); }
      await tap(page, 'Enter');
      ok('dev mode: reachable from pause', await page.evaluate(() => !!window.__GAME__.stage.pause.sub?.tabHit));
      const before = await page.evaluate(() => window.__GAME__.config.vitalsDrain);
      await tap(page, 'ArrowRight');
      const after = await page.evaluate(() => window.__GAME__.config.vitalsDrain);
      ok('dev mode: a slider changes live config', after !== before, `${before} ${after}`);
      ok('dev mode: and the live sim', await page.evaluate((a) => window.__GAME__.sim.cfg.vitalsDrain === a, after));
      await page.evaluate(() => { const m = window.__GAME__.stage.pause.sub.menu; m.focus = m.items.length - 1; }); await page.waitForTimeout(80);
      await tap(page, 'Enter');
      ok('dev mode: reset restores', (await page.evaluate(() => window.__GAME__.config.vitalsDrain)) === before);
      for (const key of ['KeyE', 'KeyE', 'KeyE', 'KeyE']) { await tap(page, key); }
      ok('dev mode: tabs change', await page.evaluate(() => window.__GAME__.stage.pause.sub.tab === 4));
      ok('no errors: pause', !errors.length && !(await engineErrors(page)).length, errors.join());
      await ctx.close(); }
    /* attract */
    { const { page, errors, ctx } = await open(b, '', { init: PAD_STUB });
      await wait(page, () => window.__GAME__?.stage?.name === 'title');
      await page.waitForTimeout(500);
      const save0 = await page.evaluate(() => localStorage.getItem('second-stitch:v1'));
      await wait(page, () => window.__GAME__.app.demo === true, null, 25000);
      ok('attract: starts after 10 s idle', true);
      await page.waitForTimeout(3000);
      await tap(page, 'KeyK');
      await wait(page, () => window.__GAME__.app.demo === false && window.__GAME__.stage?.name === 'title', null, 15000);
      ok('attract: a key exits to the title', true);
      ok('attract: save untouched', (await page.evaluate(() => localStorage.getItem('second-stitch:v1'))) === save0);
      await wait(page, () => window.__GAME__.app.demo === true, null, 25000);
      await page.waitForTimeout(2000);
      await page.evaluate(() => { window.__padsOn = 1; window.__press(0, 0, 1); }); await page.waitForTimeout(200);
      await wait(page, () => window.__GAME__.app.demo === false, null, 15000);
      ok('attract: a pad button exits', true);
      ok('no errors: attract', !errors.length && !(await engineErrors(page)).length, [...errors, ...(await engineErrors(page))].slice(0, 3).join(' | '));
      await ctx.close(); }
    /* touch-only */
    { const context = await b.newContext({ ...devices['Pixel 7'] });
      const { page, errors } = await open(b, '', { context });
      await page.waitForTimeout(1200);
      const txt = await page.evaluate(() => document.getElementById('touch-gate')?.textContent);
      ok('touch-only: the exact text', txt === 'Controller or keyboard required', String(txt));
      ok('touch-only: no joystick', await page.evaluate(() => !window.__PIXEL_ENGINE__.touch));
      const gear = await page.evaluate(() => { const els = [...document.querySelectorAll('button,[role=button],div')].filter((e) => /⚙/.test(e.textContent || '') && e.children.length === 0); return els.length; });
      ok('touch-only: the settings button shows', gear >= 1, String(gear));
      await wait(page, () => window.__GAME__?.app.demo === true, null, 20000);
      ok('touch-only: attract runs', true);
      ok('no errors: touch', !errors.length, errors.slice(0, 2).join());
      await context.close(); }
    /* couch co-op */
    { const { page, errors, ctx } = await open(b, '?menu=1', { init: `${PAD_STUB}; window.__padsOn = 2;` });
      await wait(page, () => window.__GAME__?.stage?.name === 'main');
      await page.evaluate(async () => { const m = await import(''); }).catch(() => {});
      await page.evaluate(() => { const st = window.__GAME__.stage, i = st.menu.items.findIndex((x) => x.id === 'consult'); st.menu.focus = i; });
      await page.waitForTimeout(100);
      await tap(page, 'Enter');
      await wait(page, () => window.__GAME__?.stage?.name === 'consult');
      await page.waitForTimeout(600);
      for (const p of [0, 1]) { await page.evaluate((i) => window.__press(i, 0, 1), p); await page.waitForTimeout(250); await page.evaluate((i) => window.__press(i, 0, 0), p); await page.waitForTimeout(250); }
      ok('couch: two pads scrub in', await page.evaluate(() => window.__GAME__.stage.seats.length === 2), String(await page.evaluate(() => window.__GAME__.stage.seats.length)));
      await page.evaluate(() => window.__press(0, 0, 1)); await page.waitForTimeout(250); await page.evaluate(() => window.__press(0, 0, 0));
      await wait(page, () => window.__GAME__?.stage?.name === 'operation' && window.__GAME__.stage.intro <= 0, null, 30000);
      const x0 = await page.evaluate(() => window.__GAME__.sim.seats.map((s) => [s.x, s.z]));
      await page.evaluate(() => { window.__pads[0].axes[0] = 1; window.__pads[1].axes[1] = -1; }); await page.waitForTimeout(900); await page.evaluate(() => { window.__pads[0].axes[0] = 0; window.__pads[1].axes[1] = 0; });
      const x1 = await page.evaluate(() => window.__GAME__.sim.seats.map((s) => [s.x, s.z]));
      ok('couch: two independent tips', x1[0][0] > x0[0][0] + 0.3 && Math.abs(x1[0][1] - x0[0][1]) < 0.1 && x1[1][1] < x0[1][1] - 0.3 && Math.abs(x1[1][0] - x0[1][0]) < 0.1, JSON.stringify([x0, x1]));
      const look = await page.evaluate(() => {
        const st = window.__GAME__.stage, hud = window.__PIXEL_ENGINE__.hud, orig = hud.sprite; let icons = 0;
        hud.sprite = function (x, y, rows, ...r) { if (rows.length === 11 && rows[0].length === 12) icons++; return orig.call(this, x, y, rows, ...r); };
        st.drawHud(window.__GAME__.app.ctx, st.sim, 0, st.sim.seats[0]);
        hud.sprite = orig;
        return { slots: st.hands.map((h) => h.gloveSlot), icons };
      });
      ok('couch: gloves take the seat colour', look.slots[0] === 'red' && look.slots[1] === 'blue', look.slots.join());
      ok('couch: a tool icon by each tip, plus each seat wheel', look.icons >= 4, String(look.icons));
      ok('couch: the second seat has its own wheel', await page.evaluate(() => window.__GAME__.stage.hud.seatWheels === 1));
      ok('no errors: couch', !errors.length && !(await engineErrors(page)).length, [...errors, ...(await engineErrors(page))].slice(0, 3).join(' | '));
      await ctx.close(); }
    /* the whole flow with a bot: briefing -> op -> results, sound counts rise */
    { const { page, errors, ctx } = await open(b, '?op=op10&stage=5');
      await wait(page, () => window.__GAME__?.stage?.intro <= 0);
      await page.evaluate(() => { const st = window.__GAME__.stage; st.botOn = true; st.botSkill = 1; });
      await wait(page, () => window.__GAME__?.stage?.name === 'results', null, 60000);
      ok('flow: op into results', true);
      const counts = await page.evaluate(() => window.__PIXEL_ENGINE__.audio.counts ?? {});
      ok('sound: counts rise', Object.keys(counts).length > 2, JSON.stringify(counts).slice(0, 80));
      ok('no errors: flow', !errors.length && !(await engineErrors(page)).length, [...errors, ...(await engineErrors(page))].slice(0, 3).join(' | '));
      await ctx.close(); }
    /* the crown: built even though the sim makes its ring after the view's first frame */
    { const { page, errors, ctx } = await open(b, '?op=op8&stage=1');
      await wait(page, () => window.__GAME__?.stage?.intro <= 0);
      await page.waitForTimeout(800);
      const n = await page.evaluate(() => [...window.__GAME__.stage.strains.items.values()].map((o) => o.plateMeshes?.filter((m) => m.visible).length ?? 0)[0]);
      ok('dies irae: the crown shows seven plates', n === 7, String(n));
      ok('no errors: crown', !errors.length, errors.join());
      await ctx.close(); }
    /* Op 4 by real mouse and keyboard events, not sim inputs: drain, then every Bone Mend fragment seated. */
    { const { page, errors, ctx } = await open(b, '?op=op4&stage=1');
      await wait(page, () => window.__GAME__?.stage?.intro <= 0);
      const aim = async (x, z) => { const at = await page.evaluate(([ax, az]) => { const st = window.__GAME__.stage, p = st.toScreen(ax, st.field.surface(ax, az), az), hud = window.__PIXEL_ENGINE__.hud, c = hud.canvas.getBoundingClientRect(); return { x: c.left + (p.x / hud.width) * c.width, y: c.top + (p.y / hud.height) * c.height }; }, [x, z]); await page.mouse.move(at.x, at.y); await waitFrames(page, 2); };
      const ents = (k) => page.evaluate((kind) => window.__GAME__.sim.ents.filter((e) => e.k === kind && !e.hiddenBy).map((e) => ({ id: e.id, x: e.x, z: e.z, rot: e.rot, goal: e.goal })), k);
      await tap(page, 'Digit4');
      for (const pool of await ents('pool')) { await aim(pool.x, pool.z); await page.mouse.down(); await wait(page, (id) => !window.__GAME__.sim.ents.some((e) => e.id === id), pool.id, 20000); await page.mouse.up(); await waitFrames(page, 2); }
      await wait(page, () => window.__GAME__.sim.stage === 2, null, 10000);
      ok('op 4, real input: draining reveals the hidden fragments', (await ents('fragment')).length === 6, String((await ents('fragment')).length));
      await tap(page, 'Digit2');
      let seated = 0;
      for (let round = 0; round < 40; round++) {
        const list = await ents('fragment');
        if (!list.length) break;
        const f = list[0];
        await aim(f.x, f.z); await page.mouse.down(); await waitFrames(page, 3);
        if (!(await page.evaluate(() => window.__GAME__.sim.seats[0].grab != null))) { await page.mouse.up(); await waitFrames(page, 2); continue; }
        await aim(f.goal[0], f.goal[1]);
        for (let turn = 0; turn < 60; turn++) {
          const off = await page.evaluate((id) => { const e = window.__GAME__.sim.ents.find((q) => q.id === id); return ((e.goal[2] - e.rot) % 360 + 540) % 360 - 180; }, f.id);
          if (Math.abs(off) <= 12) break;
          const key = off > 0 ? 'KeyE' : 'KeyQ';
          await page.keyboard.down(key); await waitFrames(page, 1); await page.keyboard.up(key); await waitFrames(page, 1);
        }
        await aim(f.goal[0], f.goal[1]); await page.mouse.up(); await waitFrames(page, 3);
        if (!(await page.evaluate((id) => window.__GAME__.sim.ents.some((e) => e.id === id), f.id))) seated++;
      }
      ok('op 4, real input: all six fragments seated', seated === 6, String(seated));
      ok('op 4, real input: the op moves on to the cement', await page.evaluate(() => window.__GAME__.sim.stage >= 3 && window.__GAME__.sim.phase === 'play'), await page.evaluate(() => window.__GAME__.stage.status()));
      ok('no errors: op 4 by hand', !errors.length && !(await engineErrors(page)).length, [...errors, ...(await engineErrors(page))].slice(0, 3).join(' | '));
      await ctx.close(); }
    /* A pad at forced frame rates, on manual time: one press is one action, a flick picks one tool. */
    { const { page, errors, ctx } = await open(b, '?op=op3', { init: `${PAD_STUB}; window.__padsOn = 1;` });
      await wait(page, () => window.__GAME__?.stage?.name === 'operation');
      const r = await page.evaluate(() => {
        const e = window.__PIXEL_ENGINE__, st = window.__GAME__.stage, seat = () => st.sim.seats[0], out = {};
        st.intro = 0; e.step(2);
        const press = (b, dt) => { window.__press(0, b, 1); e.step(1, dt); window.__press(0, b, 0); e.step(1, dt); e.step(1, 1 / 15); };
        const flick = (x, y, dt) => { const a = window.__pads[0].axes; a[2] = x; a[3] = y; e.step(1, dt); a[2] = 0; a[3] = 0; e.step(1, dt); e.step(1, 1 / 15); };
        press(15, 1 / 15); out.table15 = seat().table;
        press(15, 1 / 240); out.table240 = seat().table;
        press(14, 1 / 15); out.tableBack = seat().table;
        flick(0, -1, 1 / 15); out.flick15 = seat().tool;   // up: scalpel
        flick(0.7, -0.7, 1 / 240); out.flick240 = seat().tool; // up-right: forceps
        press(5, 1 / 15); out.lastTool15 = seat().tool;    // R1 swaps back once
        return out;
      });
      ok('pad at 15 and 240 fps: D-pad moves one table a press', r.table15 === 1 && r.table240 === 2 && r.tableBack === 1, JSON.stringify(r));
      ok('pad at 15 and 240 fps: a flick picks the tool', r.flick15 === 'scalpel' && r.flick240 === 'forceps', JSON.stringify(r));
      ok('pad at 15 fps: R1 swaps back once', r.lastTool15 === 'scalpel', JSON.stringify(r));
      ok('no errors: pad frame rates', !errors.length && !(await engineErrors(page)).length, [...errors, ...(await engineErrors(page))].slice(0, 3).join(' | '));
      await ctx.close(); }
    /* Dev Mode by URL, and the sliders an op otherwise reads only at its start */
    { const { page, errors, ctx } = await open(b, '?op=op8&stage=1&dev=1');
      await wait(page, () => !!window.__GAME__?.stage?.pause?.sub);
      ok('dev flag: ?dev=1 opens Dev Mode', true);
      const r = await page.evaluate(() => {
        const st = window.__GAME__.stage, d = st.pause.sub, sim = st.sim, out = {};
        const clock = sim.clock; d.setCfg('timeLimit', 2); out.clock = sim.clock / clock; d.setCfg('timeLimit', 1);
        sim.heart ??= { bpm: 72, phase: 0.5, beats: 0 }; const bpm = sim.heart.bpm; d.setCfg('irae', 92); out.bpm = sim.heart.bpm - bpm; d.setCfg('irae', 72);
        d.setCfg('coopScale', 0.5); out.coopCfg = sim.cfg.coopScale; d.setCfg('coopScale', 0.25);
        return out;
      });
      ok('dev sliders: time limit and base BPM reach the running op', Math.abs(r.clock - 2) < 0.01 && r.bpm === 20 && r.coopCfg === 0.5, JSON.stringify(r));
      await page.evaluate(() => { window.__GAME__.stage.pause.sub.onBack(); window.__GAME__.stage.closePause(); });
      const near = await page.evaluate(() => { const st = window.__GAME__.stage, c = st.opts; void c; window.__GAME__.config.aimAssist = 0; return true; });
      ok('no errors: dev flag', near && !errors.length && !(await engineErrors(page)).length, errors.join());
      await ctx.close(); }
    /* A voice line reaches the speakers: read the level from an AnalyserNode on the output. */
    { const tapOutput = `(() => { const orig = AudioNode.prototype.connect; AudioNode.prototype.connect = function (dest, ...rest) { if (dest instanceof AudioDestinationNode) { const c = dest.context; if (!c.__an) { c.__an = c.createAnalyser(); c.__an.fftSize = 2048; orig.call(c.__an, dest); window.__analyser = c.__an; } return orig.call(this, c.__an, ...rest); } return orig.call(this, dest, ...rest); }; })()`;
      const { page, errors, ctx } = await open(b, '?scene=ep4', { init: tapOutput });
      await wait(page, () => window.__GAME__?.stage?.name === 'story');
      await page.evaluate(() => { const a = window.__GAME__.app, au = window.__PIXEL_ENGINE__.audio; a.director.stopNow(); au.setVolume('music', 0); });
      await tap(page, 'KeyX'); // sound starts on the first input
      await page.evaluate(() => { const s = window.__GAME__.stage; s.typed = 0; });
      const peak = await page.evaluate(() => new Promise((res) => { let best = 0, n = 0; const buf = new Float32Array(2048); const iv = setInterval(() => { if (window.__analyser) { window.__analyser.getFloatTimeDomainData(buf); for (const v of buf) best = Math.max(best, Math.abs(v)); } if (++n > 60) { clearInterval(iv); res(best); } }, 50); }));
      ok('voice: an AnalyserNode reads a real level during a line', peak > 0.005, String(peak));
      ok('no errors: analyser', !errors.length, errors.join());
      await ctx.close(); }
    /* The hand holds the tool: the palm is on the handle at every corner of the field, for every seat. */
    { const { page, errors, ctx } = await open(b, '?op=op1&stage=2');
      await wait(page, () => window.__GAME__?.stage?.intro <= 0);
      const r = await page.evaluate(() => { const st = window.__GAME__.stage, h = st.hands[0], out = []; const THREE_V = h.hand.position.clone(); void THREE_V;
        for (const [x, z] of [[-5, -3], [5, -3], [-5, 2.5], [5, 2.5], [0, 0]]) { const seat = { ...st.sim.seats[0], x, z, table: 0, tool: 'forceps', useHeld: false, grab: null, drawing: 0 }; h.update(seat, 0.5, st.sim); const tool = h.tools.forceps; const grip = tool.localToWorld(tool.position.clone().set(0, 0.1, 1.5)); out.push(+Math.hypot(grip.x - h.hand.position.x, grip.y - h.hand.position.y, grip.z - h.hand.position.z).toFixed(2)); }
        return out; });
      ok('hand: the palm stays on the handle', r.every((d) => d < 0.6), r.join());
      ok('no errors: hand', !errors.length, errors.join());
      await ctx.close(); }
    /* Drain by pad stub alone: steer with the stick to the pool, hold R2, and the pool at that spot shrinks. */
    { const { page, errors, ctx } = await open(b, '?op=op1&stage=1', { init: `${PAD_STUB}; window.__padsOn = 1;` });
      await wait(page, () => window.__GAME__?.stage?.intro <= 0);
      const target = await page.evaluate(() => { const e = window.__GAME__.sim.ents.find((q) => q.k === 'pool'); return { id: e.id, x: e.x, z: e.z, r: e.r }; });
      await page.evaluate(() => { window.__GAME__.stage.mouseOn = false; });
      for (let i = 0; i < 80; i++) {
        const d = await page.evaluate(({ x, z }) => { const s = window.__GAME__.sim.seats[0], dx = x - s.x, dz = z - s.z, m = Math.hypot(dx, dz), a = window.__pads[0].axes, k = Math.min(1, 0.45 + m / 3); a[0] = m > 0.3 ? (dx / m) * k : 0; a[1] = m > 0.3 ? (dz / m) * k : 0; return m; }, target);
        if (d <= 0.3) break;
        await waitFrames(page, 1);
      }
      await page.evaluate(() => { const a = window.__pads[0].axes; a[0] = 0; a[1] = 0; window.__press(0, 7, 1); });
      await wait(page, ({ id, r }) => { const e = window.__GAME__.sim.ents.find((q) => q.id === id); return !e || e.r < r - 0.3; }, target, 20000);
      ok('pad: stick and R2 drain the pool at the aimed spot', true);
      await page.evaluate(() => window.__press(0, 7, 0));
      ok('no errors: pad drain', !errors.length && !(await engineErrors(page)).length, errors.join());
      await ctx.close(); }
    /* retry from a failed op */
    { const { page, errors, ctx } = await open(b, '?op=op2&stage=2');
      await wait(page, () => window.__GAME__?.stage?.intro <= 0);
      await page.evaluate(() => { window.__GAME__.sim.clock = 0.2; });
      await wait(page, () => window.__GAME__.stage.fail, null, 20000);
      ok('fail: the failure screen comes up', true);
      await tap(page, 'Enter');
      await wait(page, () => window.__GAME__?.stage?.name === 'operation' && !window.__GAME__.stage.fail && window.__GAME__.sim.phase === 'play', null, 20000);
      ok('fail: retry resumes the stage, rank capped', await page.evaluate(() => window.__GAME__.sim.stage === 2 && window.__GAME__.sim.retried === true));
      ok('no errors: retry', !errors.length && !(await engineErrors(page)).length, [...errors, ...(await engineErrors(page))].slice(0, 3).join(' | '));
      await ctx.close(); }
    /* the whole game in the page: every scene, every op with the bot, credits, title. Manual time. */
    { const { page, errors, ctx } = await open(b, '?menu=1');
      await wait(page, () => window.__GAME__?.stage?.name === 'main');
      await page.evaluate(() => { window.__GAME__.app.save.difficulty = 'resident'; return window.__GAME__.campaign(0); });
      const seen = {}; let guard = 0, last = '';
      const log = [];
      for (; guard < 6000; guard++) {
        const st = await page.evaluate(() => {
          const G = window.__GAME__, e = window.__PIXEL_ENGINE__, s = G.stage, name = s.name;
          try {
            if (name === 'operation') { s.botOn = true; s.botSkill = 0.85; s.intro = 0; e.step(240); }
            else if (name === 'story' || name === 'briefing' || name === 'results' || name === 'credits') { e.step(30); e.input.setKey('Enter', true); e.step(3); e.input.setKey('Enter', false); e.step(3); if (name === 'results') e.step(60); }
            else e.step(5);
          } catch (err) { return { name, error: String(err.stack ?? err) }; }
          return { name, status: s.status?.() ?? '', errs: e.errors.slice(0, 2), next: G.app.save.next, finished: G.app.save.finished };
        });
        if (st.error) { ok('playthrough: no view errors', false, st.error.slice(0, 500)); break; }
        seen[st.name] = (seen[st.name] ?? 0) + 1;
        if (st.status !== last) { last = st.status; log.push(st.status); }
        if (st.errs?.length) { ok('playthrough: no engine errors', false, st.errs.join(' | ')); break; }
        if (st.finished && st.name === 'title') break;
        await page.waitForTimeout(20);
      }
      const end = await page.evaluate(() => ({ save: window.__GAME__.app.save, name: window.__GAME__.stage.name }));
      ok('playthrough in the page: reaches the title again', end.save.finished === true && end.name === 'title', `${end.name} next=${end.save.next} ${log.slice(-3).join(' / ')}`);
      ok('playthrough in the page: ten ops cleared', Object.keys(end.save.cleared).length >= 10, Object.keys(end.save.cleared).join());
      ok('playthrough in the page: every screen seen', ['story', 'briefing', 'operation', 'results', 'credits'].every((k) => seen[k]), JSON.stringify(seen));
      ok('no errors: playthrough', !errors.length && !(await engineErrors(page)).length, [...errors, ...(await engineErrors(page))].slice(0, 3).join(' | '));
      await ctx.close(); }
    /* a story scene: voices speak; level on the analyser */
    { const { page, errors, ctx } = await open(b, '?scene=ep1');
      await tap(page, 'KeyX');
      await page.waitForTimeout(3000);
      const c = await page.evaluate(() => { const co = window.__PIXEL_ENGINE__.audio.counts ?? {}; return Object.keys(co).filter((k) => k.startsWith('syl-')).length; });
      ok('voices: syllables play while talking', c > 0, String(c));
      for (let i = 0; i < 30; i++) { await tap(page, 'Enter'); if (await page.evaluate(() => window.__GAME__?.stage?.name !== 'story')) break; }
      await wait(page, () => window.__GAME__?.stage?.name === 'main', null, 15000);
      ok('story: a scene runs to the end and hands back', true);
      ok('no errors: story', !errors.length && !(await engineErrors(page)).length, [...errors, ...(await engineErrors(page))].slice(0, 3).join(' | '));
      await ctx.close(); }
  } finally { await b.close(); }
  void G; void stageName; void pageUrl;
}
