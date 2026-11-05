// browser verification: audio and voices after a gesture, the Lodge rigs, the Trophy Cam, bonus games, remaining sites
import { chromium } from 'playwright';
const F = 'file://' + process.argv[2];
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = async (hash) => { const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); await p.goto(F + hash); return { p, errs }; };
// audio: a key starts the sound; every song, sfx and voice plays through the Sound Lab without error
{ const { p, errs } = await page('#soundlab'); await p.waitForTimeout(2500); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(300);
  const r = await p.evaluate(async () => { const A = My3D2dge.current.audio; const out = { ctx: A.ctx && A.ctx.state, bus: !!A.bus('sfx') };
    let n = 0; for (const k in BB.VOICES) { BB.babble(k, 'Well howdy there, how ya doin?'); n++; } for (const k in BB.SFX) { BB.sfx(k); n++; } BB.music('hoedown', { restart: true });
    await new Promise(r => setTimeout(r, 600)); out.played = n; out.song = !!A.song; out.errors = My3D2dge.current.errors.length; return out; });
  console.log('AUDIO', JSON.stringify(r), errs.join('|') || 'no page errors'); await p.close(); }
// the Lodge: Dub (E.Humanoid) and the hound (E.Blob) drawn by the engine
{ const { p, errs } = await page('#lodge'); await p.waitForTimeout(3500); await p.screenshot({ path: 'tests/out/v-lodge.png' });
  console.log('LODGE', await p.evaluate(() => My3D2dge.current.sceneName + ' errors ' + My3D2dge.current.errors.length), errs.join('|') || 'no page errors'); await p.close(); }
// Trophy Cam on Big Mo
{ const { p, errs } = await page('#trophy/muskeg'); await p.waitForTimeout(6000);
  await p.evaluate(() => BB.bagAll()); await p.waitForTimeout(700); await p.screenshot({ path: 'tests/out/v-trophycam.png' });
  console.log('TROPHYCAM', await p.evaluate(() => JSON.stringify({ cam: My3D2dge.current.debug.snapshot().trophyCam, ts: My3D2dge.current.timeScale })), errs.join('|') || 'no page errors'); await p.close(); }
// bonus games mid-play, the bot shooting
for (const bg of ['saucer', 'snowball', 'crow']) { const { p, errs } = await page('#bonus/' + bg); await p.waitForTimeout(3000);
  for (let k = 0; k < 4; k++) { await p.keyboard.press('Enter'); await p.waitForTimeout(500); }
  await p.evaluate(() => My3D2dge.current.debug.bot(true, { skill: 'expert', cheat: true })); await p.waitForTimeout(9000);
  await p.screenshot({ path: 'tests/out/v-bonus-' + bg + '.png' });
  console.log('BONUS', bg, await p.evaluate(() => { const s = My3D2dge.current.debug.snapshot(); return s.seg + ' ' + s.site + ' score ' + s.players[0].score + ' targets ' + s.actors.length; }), errs.join('|') || 'no page errors'); await p.close(); }
await b.close();
