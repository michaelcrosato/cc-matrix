// node tools/audiocheck.mjs: in Chromium, after a click unlocks sound, play every song, sting, sound, voice and crowd
// noise; print any error (sound can't be judged by a script, but it can be proven not to throw)
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { OUT } from './build.mjs';
const url = pathToFileURL(new URL('../../' + OUT + '.html', import.meta.url).pathname).href;
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(url + '?a=1'); await p.waitForTimeout(1500); await p.mouse.click(300, 300); await p.keyboard.press('KeyX'); await p.waitForTimeout(300);
const r = await p.evaluate(async () => { const A = MT.game.audio, out = { ctx: A.ctx && A.ctx.state, bus: !!A.bus };
  for (const id in MT.SONGS) { MT.music.play(id); await new Promise(r => setTimeout(r, 120)); }
  for (const id in MT.STINGS) MT.music.sting(id);
  for (const k in MT.SFX) MT.sfx(k);
  let d = 0; for (const v of Object.keys(MT.babble.voices)) d += MT.babble.say('GOOD EVENING, PLANET EARTH! KA-CHING?', v);
  for (const k of ['cheer', 'ooh', 'laugh', 'applause', 'boo', 'murmur']) MT.babble.crowd(k, .8);
  await new Promise(r => setTimeout(r, 1500)); out.dur = Math.round(d * 10) / 10; out.errors = MT.game.errors.map(e => e.message); return out; });
console.log(JSON.stringify(r), errs.length ? errs : 'no console errors');
await b.close();
