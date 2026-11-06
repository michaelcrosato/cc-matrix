// Sound, by what Web Audio produces: an AnalyserNode on everything reaching the destination.
import { ok, eq, guarded } from '../lib.mjs';
import { openGame, pressKey, step } from '../../tools/browser.mjs';
const init = () => {
  const c = AudioNode.prototype.connect; window.__an = null;
  AudioNode.prototype.connect = function (dest, ...rest) { const ctx = this.context; if (dest === ctx.destination) { if (!window.__an) { window.__an = ctx.createAnalyser(); window.__an.fftSize = 2048; window.__an.smoothingTimeConstant = 0; } c.call(this, window.__an); } return c.call(this, dest, ...rest); };
  window.__level = () => { const a = window.__an; if (!a) return 0; const b = new Float32Array(a.fftSize); a.getFloatTimeDomainData(b); let p = 0; for (const v of b) p = Math.max(p, Math.abs(v)); return p; };
  window.__peak = async (ms) => { let p = 0; const t0 = performance.now(); while (performance.now() - t0 < ms) { p = Math.max(p, window.__level()); await new Promise((r) => setTimeout(r, 15)); } return p; };
};
await guarded(async () => {
  const { browser, page, errors } = await openGame({ width: 640, height: 360, init });
  await page.keyboard.press('Enter'); await page.waitForTimeout(100); await page.evaluate(() => { E.manual = false; });
  await page.waitForTimeout(800); ok(await page.evaluate(() => E.audio.unlocked), 'key unlocks audio'); eq(await page.evaluate(() => E.audio.volume.music), 0.1, 'music 10%');
  const m = await page.evaluate(() => __peak(2500)); ok(m > 0.0002, `music alone gives a level: ${m}`);
  await page.evaluate(() => E.audio.play('bell_big', { volume: 1 })); const sfx = await page.evaluate(() => __peak(700)); ok(sfx > m * 2, `an effect stands well above the music: ${sfx} vs ${m}`);
  await page.evaluate(() => { E.audio.playMusic(null); }); await page.waitForTimeout(1200); await page.evaluate(() => G.voice.say('crier', 'Hear ye, hear ye! The dead are up.')); const v = await page.evaluate(async () => { const t0 = performance.now(); let p = 0; while (performance.now() - t0 < 1000) { p = Math.max(p, __level()); await new Promise((r) => setTimeout(r, 10)); } return p; }); ok(v > 0.001, `a spoken line produces sound: ${v}`);
  void pressKey; void step;
  eq(errors.length, 0, `no page errors: ${errors[0]}`); await browser.close();
});
