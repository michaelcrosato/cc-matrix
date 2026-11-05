// not hearing, but measuring: tap the master gain with an AnalyserNode and report the loudest sample while a sound plays
import { chromium } from 'playwright'; import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage(); const errs = [];
p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
await p.goto(pathToFileURL(resolve('game/index.html')).href); await p.waitForTimeout(1500); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
const peak = (code) => p.evaluate(async code => {
  const a = __gd.game.audio; a._init(); await a.ctx.resume(); const an = a.ctx.createAnalyser(); an.fftSize = 2048; a._master.connect(an); const buf = new Float32Array(an.fftSize); let max = 0;
  new Function(code)(); const t0 = performance.now(); while (performance.now() - t0 < 1400) { await new Promise(r => setTimeout(r, 30)); an.getFloatTimeDomainData(buf); for (const v of buf) max = Math.max(max, Math.abs(v)); }
  a._master.disconnect(an); return +max.toFixed(3); }, code);
const R = {};
R.sfx_magic = await peak("__gd.game.audio.sfx('magic')");
R.gaunt_voice = await peak("__gd.game.debug.api.Voice.gaunt('THE GAUNT GROWS IMPATIENT')");
R.hero_voice = await peak("__gd.game.debug.api.Voice.hero({ cls: 3 }, 'ready')");
R.song_larder = await peak('__gd.game.audio.music(__gd.game.debug.api.SONGS.larder)');
console.log('audio ctx state:', await p.evaluate(() => __gd.game.audio.ctx.state), JSON.stringify(R), errs.join('') || 'no page errors'); await b.close();
