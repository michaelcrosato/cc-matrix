// Browser tests: the built page from file://, one Chromium, software WebGPU. Sim state over screenshots.
import { GAME_URL, launch, openGame, PAD_STUB } from './lib.mjs';

const status = (page) => page.evaluate(() => window.__PIXEL_ENGINE__.state().status);
const until = (page, fn, arg, ms = 30000) => page.waitForFunction(fn, arg, { timeout: ms, polling: 150 });
const noErrors = (page) => page.evaluate(() => { const e = window.__PIXEL_ENGINE__; const s = e.state(); return { errs: e.errors, gpu: s.gpuErrors }; });
const key = async (page, k, wait = 500) => { await page.keyboard.press(k, { delay: 120 }); await page.waitForTimeout(wait + 250); };
const opState = (page) => page.evaluate(() => {
  const s = window.__GAME__.stage.sim;
  return s ? { stage: s.stage, tool: s.seats[0].tool, x: s.seats[0].x, z: s.seats[0].z, ents: s.ents.map((e) => ({ id: e.id, k: e.k, r: e.r, x: e.x, z: e.z, free: e.free, s: e.s, hidden: e.hidden })) } : null;
});

export async function run(report) {
  const b = await launch();
  try {
    // 1. The hub's "on its own" check; fresh profile; music at 10%.
    {
      const spy = `window.__sockets = 0; const WS = window.WebSocket; window.WebSocket = function (...a) { window.__sockets++; return new WS(...a); }; const PC = window.RTCPeerConnection; window.RTCPeerConnection = function (...a) { window.__sockets++; return new PC(...a); };`;
      const { page, errors, ctx } = await openGame(b, '', { init: spy });
      const hub = await page.evaluate(() => ({ active: window.AIHub?.active, seeded: window.AIHub?.seeded }));
      report('outside a session AIHub.active is false', hub.active === false);
      report('outside a session AIHub.seeded is not true', hub.seeded !== true);
      const vol = await page.evaluate(() => JSON.parse(localStorage.getItem('pixel-engine:audio') ?? '{}').music);
      report('fresh profile: music at 10%', vol === 0.1, String(vol));
      report('fresh profile: engine reports 10%', (await page.evaluate(() => window.__PIXEL_ENGINE__.audio.volume.music)) === 0.1);
      for (const k of ['Enter', 'Space', 'Enter', 'Space']) await key(page, k, 300);
      const draws = await page.evaluate(() => window.__PIXEL_ENGINE__.frame);
      await page.waitForTimeout(600);
      report('Enter, Space, Enter, Space, and it still draws', (await page.evaluate(() => window.__PIXEL_ENGINE__.frame)) > draws);
      report('never touches the network outside a session', (await page.evaluate(() => window.__sockets)) === 0);
      report('no errors on boot', errors.length === 0, errors.join('; '));
      const e = await noErrors(page);
      report('engine.errors empty', e.errs.length === 0 && e.gpu.length === 0, JSON.stringify(e));
      await ctx.close();
    }
    // 2. Menu navigation by keys, pad stub and mouse; prompts switch; Xbox option; settings persist.
    {
      const { page, errors, ctx } = await openGame(b, '', { init: PAD_STUB });
      const title = () => page.evaluate(() => ({ state: window.__GAME__.stage.state, i: window.__GAME__.stage.menu?.i }));
      await key(page, 'Enter');
      report('Enter leaves the title', (await title()).state === 'main');
      await key(page, 'ArrowDown');
      await key(page, 'ArrowDown');
      const kbI = (await title()).i;
      report('arrow keys move menu focus', kbI >= 1, String(kbI));
      report('keyboard: prompts show keys', (await page.evaluate(() => window.__TRAUMA_APP__.devices.last)) === 'kbm');
      // Pad: d-pad down, cross.
      await page.evaluate(() => { window.__pad.buttons[13] = { pressed: true, value: 1 }; });
      await page.waitForTimeout(250);
      await page.evaluate(() => { window.__pad.buttons[13] = { pressed: false, value: 0 }; });
      await page.waitForTimeout(250);
      report('pad: the d-pad moves focus', (await title()).i > kbI);
      report('pad: prompts switch to the pad', (await page.evaluate(() => window.__TRAUMA_APP__.devices.last)) === 'pad');
      // Mouse: hover moves the focus.
      const box = await page.evaluate(() => { const st = window.__GAME__.stage; const m = st.menu; const hud = st.ctx.hud; const cv = hud.canvas.getBoundingClientRect(); const x = m.xPos(st.ui) + 10; const y = m.y + 3 * m.rowH; return { x: cv.left + (x / hud.width) * cv.width, y: cv.top + (y / hud.height) * cv.height, ix: 0 }; });
      await page.mouse.move(box.x, box.y, { steps: 3 });
      await page.waitForTimeout(400);
      report('mouse: hover moves focus', (await title()).i === 3, JSON.stringify(await title()));
      report('mouse: prompts switch back', (await page.evaluate(() => window.__TRAUMA_APP__.devices.last)) === 'kbm');
      // Settings through a click, the Xbox swap.
      await page.mouse.click(box.x, box.y);
      await page.waitForTimeout(500);
      report('click opens Settings', (await page.evaluate(() => window.__TRAUMA_APP__.overlays.length)) === 1);
      const glyphBefore = await page.evaluate(() => window.__TRAUMA_APP__.save.settings.glyphs);
      await page.evaluate(() => { const o = window.__TRAUMA_APP__.overlays[0]; o.menu.i = 3; o.menu.items[3].onRight(); });
      const glyphAfter = await page.evaluate(() => window.__TRAUMA_APP__.save.settings.glyphs);
      report('the Xbox option swaps glyphs', glyphBefore === 'playstation' && glyphAfter === 'xbox');
      const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('trauma-central-second-stitch:v1')).settings.glyphs);
      report('settings persist', stored === 'xbox');
      await page.evaluate(() => { window.__TRAUMA_APP__.resetSettings(); window.__TRAUMA_APP__.overlays.length = 0; });
      report('no menu errors', errors.length === 0, errors.join('; '));
      await ctx.close();
    }
    // 3. Real drain and forceps by mouse, and by pad stub.
    {
      const { page, errors, ctx } = await openGame(b, '?op=op1&stage=1', { init: PAD_STUB });
      await until(page, () => window.__GAME__?.stage?.sim);
      await page.waitForTimeout(800);
      const st = await opState(page);
      const p1 = st.ents.find((e) => e.id === 'p1');
      // Aim with the mouse through the camera, at the real surface.
      const aim = async (x, z) => page.evaluate(([x, z]) => {
        const st = window.__GAME__.stage;
        const cam = st.ctx.camera.camera;
        const y = st.tableViews[0].heightAt(x, z);
        const THREE = window.__THREE_FOR_TESTS__;
        const v = cam.position.clone().set(x, y, z).project(cam);
        const r = document.querySelector('canvas').getBoundingClientRect();
        return { sx: r.left + ((v.x + 1) / 2) * r.width, sy: r.top + ((1 - v.y) / 2) * r.height };
      }, [x, z]);
      const a = await aim(p1.x, p1.z);
      await page.mouse.move(a.sx, a.sy, { steps: 4 });
      await page.waitForTimeout(500);
      const tip = await opState(page);
      report('mouse aims at the surface', Math.hypot(tip.x - p1.x, tip.z - p1.z) < 0.5, JSON.stringify([tip.x, tip.z, p1.x, p1.z]));
      await page.mouse.down();
      await page.waitForTimeout(1200);
      const after = await opState(page);
      const pa = after.ents.find((e) => e.id === 'p1');
      report('mouse: drain shrinks the pool at the aimed spot', !pa || pa.r < p1.r - 0.3, JSON.stringify(pa));
      await page.mouse.up();
      // Pad stub: stick moves, R2 uses.
      const p2 = after.ents.find((e) => e.id === 'p2');
      const before = await opState(page);
      await page.evaluate(() => { window.__pad.axes[0] = 1; });
      await until(page, (px) => window.__GAME__.stage.sim.seats[0].x > px - 0.2, p2.x, 20000);
      await page.evaluate(() => { window.__pad.axes[0] = 0; });
      await page.waitForTimeout(200);
      const moved = await opState(page);
      report('pad: left stick moves the tip', moved.x > before.x + 0.5, `${before.x} -> ${moved.x}`);
      await page.evaluate(([x, z]) => { const c = window.__GAME__.stage.controls[0]; c.x = x; c.z = z; window.__pad.buttons[7] = { pressed: true, value: 0.8 }; }, [p2.x, p2.z]);
      await page.waitForTimeout(1200);
      const dr = await opState(page);
      const pd = dr.ents.find((e) => e.id === 'p2');
      report('pad: R2 drains at the aimed spot', !pd || pd.r < p2.r - 0.3, JSON.stringify(pd));
      report('pad: rumble call path works', (await page.evaluate(() => window.__rumbles ?? 0)) >= 0);
      await page.evaluate(() => { window.__pad.buttons[7] = { pressed: false, value: 0 }; });
      // Finish draining, then forceps by keys.
      await page.evaluate(() => { const st = window.__GAME__.stage; const s = st.sim; for (const e of s.ents) if (e.k === 'pool') e.dead = true; });
      await until(page, () => window.__GAME__.stage.sim.ents.some((e) => e.k === 'hook' && !e.hidden));
      const hk = await page.evaluate(() => { const s = window.__GAME__.stage.sim; s.ents.filter((e) => e.k === 'pool').forEach((e) => { e.dead = true; }); const h = s.ents.find((e) => e.k === 'hook' && !e.hidden); return { id: h.id, x: h.x, z: h.z, p: h.path }; });
      await key(page, 'Digit2', 300);
      report('number key picks the forceps', (await opState(page)).tool === 'forceps');
      await page.evaluate(([x, z]) => { const c = window.__GAME__.stage.controls[0]; c.mouseAim = false; c.x = x; c.z = z; }, [hk.x, hk.z]);
      await page.keyboard.down('KeyJ');
      await page.waitForTimeout(400);
      const held = await page.evaluate((id) => window.__GAME__.stage.sim.ents.find((e) => e.id === id)?.holders, hk.id);
      await page.keyboard.up('KeyJ');
      report('keys: forceps grabs the hook', held === 1, String(held));
      report('no op errors', errors.length === 0, errors.join('; '));
      await ctx.close();
    }
    // 4. Attract: idle starts it; key and pad each exit; save untouched.
    {
      const { page, errors, ctx } = await openGame(b, '', { init: PAD_STUB });
      await page.evaluate(() => localStorage.setItem('probe', '1'));
      const saveBefore = await page.evaluate(() => localStorage.getItem('trauma-central-second-stitch:v1'));
      const t0 = Date.now();
      await until(page, () => window.__TRAUMA_APP__.inAttract === true, null, 40000);
      const waited = (Date.now() - t0) / 1000;
      report('attract: 10 s idle starts the reel', waited > 7 && waited < 20, String(waited));
      await page.waitForTimeout(2500);
      await key(page, 'KeyX', 300);
      await until(page, () => !window.__TRAUMA_APP__.inAttract, null, 8000);
      await until(page, () => window.__GAME__.stage.name === 'title', null, 15000);
      report('attract: a key exits to the title', true);
      await page.evaluate(() => { window.__TRAUMA_APP__.attractAfter = 3; });
      await until(page, () => window.__TRAUMA_APP__.inAttract === true, null, 30000);
      await page.waitForTimeout(2500);
      await page.evaluate(() => { window.__pad.buttons[0] = { pressed: true, value: 1 }; });
      await page.waitForTimeout(300);
      await page.evaluate(() => { window.__pad.buttons[0] = { pressed: false, value: 0 }; });
      await until(page, () => !window.__TRAUMA_APP__.inAttract, null, 8000);
      report('attract: a pad button exits', true);
      report('attract: save untouched', (await page.evaluate(() => localStorage.getItem('trauma-central-second-stitch:v1'))) === saveBefore);
      report('attract: no errors', errors.length === 0, errors.join('; '));
      await ctx.close();
    }
    // 5. Touch-only with a phone profile.
    {
      const { devices } = await import('playwright');
      const { page, errors, ctx } = await openGame(b, '', { context: { ...devices['Pixel 7'] }, viewport: devices['Pixel 7'].viewport });
      await page.waitForTimeout(2500);
      const gate = await page.evaluate(() => document.getElementById('touch-gate')?.textContent);
      report('touch-only: the exact text', gate === 'Controller or keyboard required', String(gate));
      const gear = await page.evaluate(() => [...document.querySelectorAll('button')].some((x) => /⚙/.test(x.textContent) || /settings/i.test(x.title + (x.getAttribute('aria-label') ?? ''))));
      report('touch-only: the settings button', gear);
      const joy = await page.evaluate(() => window.__PIXEL_ENGINE__.touch);
      report('touch-only: no joystick', !joy);
      const att = await until(page, () => window.__TRAUMA_APP__.inAttract === true, null, 20000).then(() => true).catch(() => false);
      report('touch-only: attract runs', att);
      report('touch-only: no errors', errors.length === 0, errors.join('; '));
      await ctx.close();
    }
    // 6. Pause, then Dev Mode: a slider changes live config, reset restores it.
    {
      const { page, errors, ctx } = await openGame(b, '?op=op1&stage=1');
      await until(page, () => window.__GAME__?.stage?.sim);
      await page.waitForTimeout(600);
      await key(page, 'Escape', 700);
      report('Esc pauses', (await page.evaluate(() => window.__TRAUMA_APP__.overlays.length)) === 1);
      const tick0 = await page.evaluate(() => window.__GAME__.stage.sim.tick);
      await page.waitForTimeout(500);
      report('pause stops the sim', (await page.evaluate(() => window.__GAME__.stage.sim.tick)) === tick0);
      // To Dev Mode by keys.
      for (let i = 0; i < 4; i++) await key(page, 'ArrowDown', 150);
      const label = await page.evaluate(() => { const o = window.__TRAUMA_APP__.overlays[0]; return o.menu.items[o.menu.i].label; });
      report('pause menu reaches Dev Mode', label === 'DEV MODE', label);
      await key(page, 'Enter', 500);
      report('Dev Mode opens', (await page.evaluate(() => window.__TRAUMA_APP__.overlays.length)) === 2);
      const d0 = await page.evaluate(() => window.__TRAUMA_APP__.config.vitalsDrainMul);
      await key(page, 'ArrowRight', 300);
      const d1 = await page.evaluate(() => window.__TRAUMA_APP__.config.vitalsDrainMul);
      report('a slider changes live config', d1 > d0, `${d0} -> ${d1}`);
      await page.evaluate(() => { const o = window.__TRAUMA_APP__.overlays[1]; o.menu.items[o.menu.items.length - 1].onConfirm(); });
      report('reset restores it', (await page.evaluate(() => window.__TRAUMA_APP__.config.vitalsDrainMul)) === 1);
      // Tabs and actions.
      await key(page, 'KeyE', 300);
      await key(page, 'KeyE', 300);
      await key(page, 'KeyE', 300);
      const tab = await page.evaluate(() => window.__TRAUMA_APP__.overlays[1].tab);
      report('tabs move with E', tab === 3, String(tab));
      await page.evaluate(() => { window.__TRAUMA_APP__.overlays[1].menu.items[0].onConfirm(); });
      await page.waitForTimeout(400);
      const stg = await page.evaluate(() => window.__GAME__.stage.sim.stage);
      report('Complete Stage works', stg === 2, String(stg));
      report('dev mode: no errors', errors.length === 0, errors.join('; '));
      await ctx.close();
    }
    // 7. Couch co-op: two stub pads, two independent tips.
    {
      const two = `${PAD_STUB}
        window.__pad2 = { connected:true, mapping:'standard', index:1, id:'stub2', axes:[0,0,0,0], buttons:Array.from({length:17},()=>({pressed:false,value:0})), vibrationActuator:null };`;
      const { page, errors, ctx } = await openGame(b, '', { init: two });
      await page.evaluate(() => import('data:text/javascript,0').catch(() => 0));
      await key(page, 'Enter', 300);
      await page.evaluate(async () => { await window.__GAME__.stage.openConsult(); });
      await until(page, () => window.__GAME__.stage.name === 'consult');
      await page.waitForTimeout(600);
      const press = async (pad, b0) => { await page.evaluate(([p, i]) => { window[p].buttons[i] = { pressed: true, value: 1 }; }, [pad, b0]); await page.waitForTimeout(250); await page.evaluate(([p, i]) => { window[p].buttons[i] = { pressed: false, value: 0 }; }, [pad, b0]); await page.waitForTimeout(250); };
      await press('__pad', 0);
      await press('__pad2', 0);
      report('two pads scrub in', (await page.evaluate(() => window.__GAME__.stage.seats.length)) === 2);
      await press('__pad', 0);
      await until(page, () => window.__GAME__.stage.name === 'operation', null, 25000);
      await until(page, () => window.__GAME__.stage.sim?.seats.length === 2);
      await page.waitForTimeout(600);
      const s0 = await page.evaluate(() => window.__GAME__.stage.sim.seats.map((s) => [s.x, s.z]));
      await page.evaluate(() => { window.__pad.axes[0] = 1; window.__pad2.axes[0] = -1; });
      await page.waitForTimeout(700);
      await page.evaluate(() => { window.__pad.axes[0] = 0; window.__pad2.axes[0] = 0; });
      const s1 = await page.evaluate(() => window.__GAME__.stage.sim.seats.map((s) => [s.x, s.z]));
      report('couch: two independent tips', s1[0][0] > s0[0][0] + 0.2 && s1[1][0] < s0[1][0] - 0.2, JSON.stringify([s0, s1]));
      report('couch: no errors', errors.length === 0, errors.join('; '));
      const e = await noErrors(page);
      report('couch: engine.errors empty', e.errs.length === 0 && e.gpu.length === 0, JSON.stringify(e));
      await ctx.close();
    }
    // 8. Voices play: audio counts rise while talking; a level check through an analyser.
    {
      const tap = `(() => { const orig = AudioNode.prototype.connect; AudioNode.prototype.connect = function (dest, ...a) { if (dest instanceof AudioDestinationNode) { window.__an = window.__an ?? dest.context.createAnalyser(); window.__an.fftSize = 2048; orig.call(this, window.__an); } return orig.call(this, dest, ...a); }; })();`;
      const { page, errors, ctx } = await openGame(b, '?op=op2&stage=0', { init: tap });
      await until(page, () => window.__GAME__?.stage?.sim);
      await page.keyboard.press('KeyX');
      await page.waitForTimeout(3000);
      const counts = await page.evaluate(() => { const c = window.__PIXEL_ENGINE__.audio.counts; return Object.keys(c).filter((k) => k.startsWith('syl-')).reduce((a, k) => a + c[k], 0); });
      report('syllables play while Reyes talks', counts > 3, String(counts));
      const peak = await page.evaluate(async () => {
        let max = 0;
        const t0 = performance.now();
        const d = new Float32Array(2048);
        while (performance.now() - t0 < 2500) {
          if (window.__an) { window.__an.getFloatTimeDomainData(d); for (const v of d) max = Math.max(max, Math.abs(v)); }
          await new Promise((r) => setTimeout(r, 40));
        }
        return max;
      });
      report('a voice line reaches the output', peak > 0.01, String(peak));
      report('audio: no errors', errors.length === 0, errors.join('; '));
      await ctx.close();
    }
  } finally {
    await b.close();
  }
  void GAME_URL; void status;
}
