// In a real browser: a key press unlocks the sound, a cutscene types its lines, and the babble synth must create
// oscillators and formant filters on the 'voices' bus as the letters type (Animalese), then commentary in a match (Simlish).
import { chromium } from 'playwright';
import { resolve } from 'node:path';
const file = resolve(process.argv[2]);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.addInitScript(() => { window.__osc = 0; window.__bp = 0; const AC = window.AudioContext; const o = AC.prototype.createOscillator, f = AC.prototype.createBiquadFilter; AC.prototype.createOscillator = function () { window.__osc++; return o.call(this); }; AC.prototype.createBiquadFilter = function () { window.__bp++; return f.call(this); }; });
await page.goto('file://' + file + '#story/ch2');
await page.waitForTimeout(1500); await page.keyboard.press('ShiftLeft');
await page.waitForTimeout(800);
const r0 = await page.evaluate(() => ({ osc: window.__osc, bp: window.__bp, planned: window.FF.voice.planned || 0, ready: window.FF.game.audio.ready, scene: window.FF.game.sceneName, voiceBus: !!(window.FF.game.audio._buses && window.FF.game.audio._buses.voices) }));
await page.waitForTimeout(3500);
const r1 = await page.evaluate(() => ({ osc: window.__osc, bp: window.__bp, planned: window.FF.voice.planned || 0, voiceBus: !!(window.FF.game.audio._buses && window.FF.game.audio._buses.voices), line: window.FF.cut.lines && window.FF.cut.lines[window.FF.cut.i] && window.FF.cut.lines[window.FF.cut.i][0] }));
const ok = r0.ready && r1.voiceBus && r1.osc - r0.osc >= 10 && r1.bp - r0.bp >= 20 && r1.planned > r0.planned;
console.log(JSON.stringify({ before: r0, after: r1 }));
console.log(ok ? 'PASS the cutscene voices make real Web Audio oscillators and formant filters as the letters type' : 'FAIL no voice synthesis in the browser');
await browser.close(); process.exit(ok ? 0 : 1);
