// Tier 3: boot, single-file bundle, touch-only message, no-WebGPU page, sound by what Web Audio produces, layout at three sizes.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { devices, webkit } from 'playwright';
import { launch, openGame, HTML, ROOT } from '../../tools/browser.mjs';
import { pathToFileURL } from 'node:url';
export const name = 'browser boot';
const SOUND_INIT = `(() => { const orig = AudioNode.prototype.connect; window.__lvl = { an: null, ctx: null }; AudioNode.prototype.connect = function (dest, ...r) { try { if (dest && dest.constructor && dest.constructor.name === 'AudioDestinationNode' && !this.__tapped) { this.__tapped = true; const c = this.context; if (!window.__lvl.an) { window.__lvl.an = c.createAnalyser(); window.__lvl.an.fftSize = 512; window.__lvl.ctx = c; } orig.call(this, window.__lvl.an); } } catch {} return orig.call(this, dest, ...r); }; window.__level = () => { const a = window.__lvl.an; if (!a) return 0; const d = new Float32Array(a.fftSize); a.getFloatTimeDomainData(d); let m = 0; for (const v of d) m = Math.max(m, Math.abs(v)); return m; }; })();`;
export async function run(t) {
  const html = readFileSync(HTML, 'utf8');
  const session = readFileSync(new URL('../../session.js', import.meta.url), 'utf8');
  t.ok(html.indexOf(session) > 0 && html.indexOf(session) < html.indexOf('hub:session'), 'session.js byte-identical and first');
  t.ok(createHash('sha256').update(session).digest('hex') === readFileSync(new URL('../../tools_hashes.txt', import.meta.url), 'utf8').split('\n').find((l) => l.endsWith('session.js')).split(' ')[0], 'session.js hash');
  for (const m of ['hub:session', 'hub:session-players', 'hub:session-mode', 'hub:session-minutes', 'hub:session-goal', 'hub:session-howto', 'hub:webgpu']) t.ok(html.includes(`name="${m}"`), 'meta ' + m);
  t.ok((html.match(/<script/g) || []).length === 2, 'two scripts: client and game');
  const b = await launch();
  try {
    const { page, errors } = await openGame(b, { init: SOUND_INIT });
    const r = await page.evaluate(async () => { const e = await window.__PIXEL_READY__; e.manual = true; e.step(120); const f = await e.renderer.capture(); let nz = 0, seen = new Set(); for (let i = 0; i < f.pixels.length; i += 4 * 97) { seen.add(f.pixels[i] + ',' + f.pixels[i + 1] + ',' + f.pixels[i + 2]); } return { title: document.title, colours: seen.size, errors: e.errors, gpu: e.state().gpuErrors, mode: window.__GAME__.mode }; });
    t.ok(r.title === 'Toll Booth of Doom', 'page title'); t.ok(r.colours > 12, 'picture is not blank: ' + r.colours); t.ok(r.errors.length === 0 && (!r.gpu || r.gpu.length === 0), 'engine/gpu errors: ' + JSON.stringify(r.errors) + JSON.stringify(r.gpu)); t.ok(errors.length === 0, 'page errors: ' + errors.join('|'));
    // layout at three sizes: text inside the screen, no overlaps in the menu
    for (const [w, h] of [[1280, 720], [1920, 1080], [2560, 1440]]) {
      await page.setViewportSize({ width: w, height: h }); const lay = await page.evaluate(async () => { const e = window.__PIXEL_ENGINE__; const g = window.__GAME__; g.mode = 'menu'; e.manual = true; e.step(10); const W = e.hud.width, H = e.hud.height; const d = g.ui.drawnText; const bad = d.filter((q) => q.x < 0 || q.y < 0 || q.x + q.w > W + 1 || q.y + q.h > H + 1).map((q) => q.text); let ov = 0; for (let i = 0; i < d.length; i++) for (let j = i + 1; j < d.length; j++) { const a = d[i], c = d[j]; if (a.x < c.x + c.w && c.x < a.x + a.w && a.y < c.y + c.h && c.y < a.y + a.h) ov++; } return { W, H, bad, ov, n: d.length }; });
      t.ok(lay.bad.length === 0, `layout ${w}x${h}: text outside ${lay.W}x${lay.H}: ${lay.bad.slice(0, 3)}`); t.ok(lay.ov === 0, `layout ${w}x${h}: ${lay.ov} overlapping texts`);
    }
    // sound: unlock by a key, music alone is audible, an effect raises it, a spoken line makes sound
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.keyboard.press('KeyA'); await page.mouse.click(200, 200);
    const s = await page.evaluate(async () => { const e = window.__PIXEL_ENGINE__; const g = window.__GAME__; e.manual = false; await new Promise((r) => setTimeout(r, 200)); g.audio.stopAll(); g.audio.music('vespers'); await new Promise((r) => setTimeout(r, 1800)); let music = 0; for (let i = 0; i < 20; i++) { music = Math.max(music, window.__level()); await new Promise((r) => setTimeout(r, 40)); } g.audio.stopAll(); await new Promise((r) => setTimeout(r, 400)); const quiet = window.__level(); g.audio.sfx('bell_big', { always: true }); let sfx = 0; for (let i = 0; i < 12; i++) { sfx = Math.max(sfx, window.__level()); await new Promise((r) => setTimeout(r, 30)); } await new Promise((r) => setTimeout(r, 2500)); g.audio.speak('Hear ye, hear ye! The dead are up.', 'crier'); let voice = 0; for (let i = 0; i < 30; i++) { voice = Math.max(voice, window.__level()); await new Promise((r) => setTimeout(r, 30)); } return { music, sfx, voice, quiet, unlocked: e.audio.unlocked, vol: e.audio.volume.music }; });
    t.ok(s.unlocked, 'audio unlocked by a key'); t.ok(s.music > 0, 'music alone gives a non-zero level: ' + s.music); t.ok(s.sfx > s.music * 1.5, `a sound effect raises the level well above music (${s.sfx} vs ${s.music})`); t.ok(s.voice > 0.002, 'a spoken line makes sound: ' + s.voice);
    await page.context().close();
    // touch-only: Pixel 7 profile, no controls, the message, the settings button, attract runs
    const ctx = await b.newContext({ ...devices['Pixel 7'] }); const p2 = await ctx.newPage(); const errs2 = []; p2.on('pageerror', (e) => errs2.push(e.message));
    await p2.goto(pathToFileURL(HTML).href); await p2.waitForFunction(() => window.__PIXEL_READY__ !== undefined, null, { timeout: 60000 }); await p2.evaluate(async () => { await window.__PIXEL_READY__; });
    const tc = await p2.evaluate(async () => { const e = window.__PIXEL_ENGINE__; const g = window.__GAME__; e.manual = true; e.step(60); const msg = g.ui.drawnText.map((d) => d.text).join(' '); const btn = !!document.querySelector('.px-settings, [class*=settings]'); g.forceAttract = true; e.step(30); return { msg, touchNull: e.touch === null, attract: g.mode, w: e.hud.width, lines: g.ui.drawnText.filter((d) => /REQUIRED|CONTROLLER|KEYBOARD/.test(d.text)).length, touchOnly: g.touchOnly }; });
    t.ok(tc.touchOnly, 'touch-only detected'); t.ok(/CONTROLLER/.test(tc.msg) && /KEYBOARD REQUIRED/.test(tc.msg), 'touch message present: ' + tc.msg.slice(0, 80)); t.ok(tc.touchNull, 'engine.touch is null'); t.ok(tc.attract === 'attract', 'attract runs on touch: ' + tc.attract);
    await p2.touchscreen.tap(100, 200); await p2.waitForTimeout(100); const after = await p2.evaluate(() => window.__GAME__.mode); t.ok(after !== 'play', 'a tap does not start a game: ' + after); t.ok(errs2.length === 0, 'touch page errors: ' + errs2.join('|'));
    await ctx.close();
  } finally { await b.close(); }
  // no WebGPU: WebKit here has none, so the page tells the player
  try { const wk = await webkit.launch(); const pg = await (await wk.newContext()).newPage(); await pg.goto(pathToFileURL(HTML).href); await pg.waitForTimeout(3000); const txt = await pg.evaluate(() => document.body.innerText); t.ok(/needs WebGPU/i.test(txt), 'no-WebGPU page: ' + txt.slice(0, 80)); await wk.close(); } catch (e) { t.fail('webkit: ' + e.message.slice(0, 120)); }
}
