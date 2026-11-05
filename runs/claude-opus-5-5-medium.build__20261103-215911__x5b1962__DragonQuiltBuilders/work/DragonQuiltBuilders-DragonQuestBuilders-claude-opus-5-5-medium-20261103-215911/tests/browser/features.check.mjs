// In a real browser: all audio is generated in code and plays without errors; mouse hover moves menu focus; the
// corner settings button shows on the title. Prints PASS/FAIL lines.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = createRequire(path.join(root, 'engine/package.json'))('playwright');
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
process.on('uncaughtException', async e => { console.log('FAIL the features check ran to its end: ' + String(e).split('\n')[0]); try { await browser.close(); } catch (x) {} process.exit(1); });
process.on('unhandledRejection', async e => { console.log('FAIL the features check ran to its end: ' + String(e).split('\n')[0]); try { await browser.close(); } catch (x) {} process.exit(1); });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [], requests = [];
page.on('pageerror', e => errs.push(String(e))); page.on('request', r => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) requests.push(r.url()); });
await page.goto('file://' + path.resolve(root, '..', path.basename(root) + '.html'));
await page.waitForFunction(() => window.My3D2dge && My3D2dge.current && My3D2dge.current.sceneName === 'title', null, { timeout: 60000 });
await page.waitForFunction(() => My3D2dge.current.scene.menu && My3D2dge.current.scene.menu.rects.length > 3, null, { timeout: 15000 }).catch(async () => console.log('debug', await page.evaluate(() => JSON.stringify({ touch: DQ.touchOnly(My3D2dge.current), rects: My3D2dge.current.scene.menu && My3D2dge.current.scene.menu.rects }))));
const say = (ok, what, d) => console.log((ok ? 'PASS ' : 'FAIL ') + what + (ok || !d ? '' : ': ' + d));
// mouse hover moves the title menu's focus
const box = await page.evaluate(() => { const m = My3D2dge.current.scene.menu; const r = m.rects.find(q => q[4] === 3); const c = document.querySelector('canvas').getBoundingClientRect(), S = My3D2dge.current.screen; return { x: c.left + (r[0] + r[2] / 2) * S.S / S.dpr, y: c.top + (r[1] + r[3] / 2) * S.S / S.dpr, before: m.focus }; });
await page.mouse.move(box.x - 40, box.y - 40); await page.mouse.move(box.x, box.y, { steps: 4 }); await page.waitForTimeout(300);
const after = await page.evaluate(() => My3D2dge.current.scene.menu.focus);
say(after === 3 && box.before !== 3, 'mouse hover over a menu entry moves the focus', box.before + ' -> ' + after);
say(await page.evaluate(() => My3D2dge.current.input.lastDevice) === 'mouse', 'moving the mouse switches prompts to mouse icons');
say(await page.evaluate(() => { const c = document.querySelector('[data-sys="corner"], .e3-corner, button[aria-label*="enu" i]'); return !!c || !!My3D2dge.current.cornerArea; }), 'the corner settings/menu button exists on the title');
// audio: every song, jingle, sound effect and every speaker's voice, synthesized with no files
await page.mouse.click(box.x, box.y - 200);
const a = await page.evaluate(async () => {
  const G = My3D2dge.current, A = G.audio, X = G._audioX; A._init(); try { await A.ctx.resume(); } catch (e) {}
  const out = { state: A.ctx && A.ctx.state, songs: 0, jingles: 0, sfx: 0, voices: 0, errors: [] };
  for (const k in DQ.SONGS) { try { A.music(DQ.SONGS[k]); out.songs++; } catch (e) { out.errors.push('song ' + k + ': ' + e.message); } await new Promise(r => setTimeout(r, 30)); }
  for (const k in DQ.JINGLES) { try { X.jingle(k); out.jingles++; } catch (e) { out.errors.push('jingle ' + k + ': ' + e.message); } }
  for (const k in DQ.SFX) { try { A.sfx(k); out.sfx++; } catch (e) { out.errors.push('sfx ' + k + ': ' + e.message); } }
  for (const who in DQ.NPCS) { if (!DQ.NPCS[who].voice) continue; try { X._vt = 0; X.voiceLetter(who, 'h', 0, 'hello?'); X._vt = 0; X.voiceLetter(who, 'A', 1, 'WHOA!'); out.voices++; } catch (e) { out.errors.push('voice ' + who + ': ' + e.message); } }
  A.music(null); out.gameErrors = G.errors.map(e => e.message);
  out.audioFiles = performance.getEntriesByType('resource').filter(r => /\.(mp3|ogg|wav|m4a)/i.test(r.name)).length;
  return out;
});
say(a.state === 'running', 'the Web Audio context runs', a.state);
say(!a.errors.length && a.songs === 14 && a.jingles === 12 && a.sfx === 45, 'all 14 songs, 12 jingles and ' + a.sfx + ' sound effects play from code', a.errors.join('; '));
say(!a.errors.length && a.voices === 9, 'every speaker\'s Animalese voice synthesizes (' + a.voices + ' voices)', a.errors.join('; '));
say(a.audioFiles === 0 && !requests.length, 'no audio files and no network requests', requests.join(', '));
say(!errs.length && !a.gameErrors.length, 'no errors', errs.concat(a.gameErrors).join('; '));
// the voices are audible: an analyser on the Voices bus reads real signal while each speaker talks
const v = await page.evaluate(async () => {
  const G = My3D2dge.current, A = G.audio, X = G._audioX, an = A.ctx.createAnalyser(); an.fftSize = 2048; A._voiceBus.connect(an);
  const buf = new Float32Array(an.fftSize), peaks = {};
  for (const who in DQ.NPCS) { if (!DQ.NPCS[who].voice) continue; let peak = 0; const text = 'Hello there, Builder!';
    for (let i = 0; i < 8; i++) { X._vt = 0; X.voiceLetter(who, text[i], i, text); for (let k = 0; k < 3; k++) { await new Promise(r => setTimeout(r, 12)); an.getFloatTimeDomainData(buf); for (const x of buf) peak = Math.max(peak, Math.abs(x)); } }
    peaks[who] = +peak.toFixed(3); }
  return peaks;
});
say(Object.values(v).length === 9 && Object.values(v).every(p => p > .01), 'every speaker\'s Animalese voice is audible on the Voices bus', JSON.stringify(v));
say(new Set(Object.values(v)).size > 3, 'the voices differ between speakers', JSON.stringify(v));
await page.close();
// touch-only, for real: an emulated phone (touch, coarse pointer, no keyboard or pad)
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const pp = await phone.newPage(); const perrs = []; pp.on('pageerror', e => perrs.push(String(e)));
await pp.goto('file://' + path.resolve(root, '..', path.basename(root) + '.html'));
await pp.waitForFunction(() => window.My3D2dge && My3D2dge.current && My3D2dge.current.sceneName === 'title', null, { timeout: 60000 });
const t = await pp.evaluate(() => ({ coarse: matchMedia('(pointer: coarse)').matches, fine: matchMedia('(any-pointer: fine)').matches, notice: DQ.touchOnly(My3D2dge.current), touchStick: My3D2dge.current.input.touchEnabled, touchButtons: document.querySelectorAll('[data-sys="touch"] button[data-act]:not([data-act="menu"])').length }));
say(t.coarse && !t.fine && t.notice, 'a real touch phone gets the "Controller or keyboard required" notice', JSON.stringify(t));
say(!t.touchStick && t.touchButtons === 0, 'no touch controls on the phone', JSON.stringify(t));
await pp.waitForTimeout(10800); const sc = await pp.evaluate(() => My3D2dge.current.sceneName);
say(sc === 'attract', 'the attract mode runs on the phone', sc);
await pp.touchscreen.tap(200, 400); await pp.waitForTimeout(800); const back = await pp.evaluate(() => My3D2dge.current.sceneName);
say(back === 'title', 'a tap leaves the attract mode', back);
await pp.screenshot({ path: path.join(root, 'check-output', 'touch-only.png') });
say(!perrs.length, 'no errors on the phone', perrs.join('; '));
await browser.close();
