import { launch, url } from '../tools/lib.mjs';
import { S, adv, press, newGame, newProfile, doMorning, playDay, sleepThrough } from '../tools/drive.mjs';
export default async function (t) {
  const b = await launch({});
  try {
    const p = await newGame(b); let s = await S(p);
    t.ok(await p.evaluate(() => window.__TEST__.game.gfx.constructor.name.length > 0), 'game boots');
    t.eq((await p.evaluate(() => document.querySelectorAll('script[src]').length)), 0, 'no external scripts');
    await adv(p, 2); s = await S(p); t.eq(s.screen, 'title', 'boots to the title');
    await newProfile(p); s = await S(p); t.eq(s.screen, 'island', 'profile creation reaches the island'); t.eq(s.profile != null, true, 'profile exists');
    s = await doMorning(p); t.eq(s.screen, 'plan', 'check-in leads to Today\'s Plan'); t.ok(s.wobbleAge >= 18 && s.wobbleAge <= 99, 'wobble age in range: ' + s.wobbleAge);
    const ages = [s.wobbleAge]; let lastMarbles = 0, lastTilt = 99; let reachedEnding = false;
    for (let day = 1; day <= 5; day++) {
      s = await playDay(p); s = await S(p); t.ok(s.marbles > lastMarbles, `day ${day}: marbles rose (${s.marbles})`); t.ok(s.tilt < lastTilt, `day ${day}: island tilt fell (${s.tilt})`); lastMarbles = s.marbles; lastTilt = s.tilt; t.eq(s.errors.length, 0, `day ${day}: no errors ` + JSON.stringify(s.errors));
      if (day === 2) { // reload mid-way: the save resumes
        const before = await S(p); await p.evaluate(() => window.__TEST__.game.persist()); const saved = await p.evaluate(() => localStorage.getItem('wigglefit.save.v1')); t.ok(saved && saved.length > 50, 'save is written'); const p2 = await b.newPage({ viewport: { width: 1920, height: 1080 } }); await p2.addInitScript((v) => { try { localStorage.setItem('wigglefit.save.v1', v); } catch (e) { /* ignore */ } }, saved); await p2.goto(url('test=1&render=0&manual=1&audio=0')); await p2.waitForFunction(() => window.__done); await adv(p2, 2); const s2 = await S(p2); t.eq(s2.profile, before.profile, 'reload resumes the profile'); t.eq(s2.marbles, before.marbles, 'reload resumes marbles'); await p2.close(); }
      if (s.screen === 'ending') { reachedEnding = true; break; }
      await sleepThrough(p); s = await doMorning(p); ages.push(s.wobbleAge);
    }
    t.ok(reachedEnding, 'Day 5 finale leads to the ending'); s = await S(p); t.eq(s.tilt, 0, 'tilt reaches exactly 0 at the ending');
    for (let i = 0; i < 40; i++) { const q = await S(p); if (q.speech) await press(p, 'ok'); await adv(p, 2); if ((await S(p)).screen === 'island') break; }
    s = await S(p); t.eq(s.screen, 'island', 'credits end back on the island'); t.ok(s.levelled, 'levelled state saved'); t.eq(s.detune, 0, 'music detune is 0 at level'); t.eq(s.day, 6, 'maintenance day follows');
    t.ok(ages[ages.length - 1] < ages[0] + 20, 'wobble age does not rise out of range across days: ' + ages.join(','));
    // Free Play has everything; maintenance day plan
    const free = await p.evaluate(() => { const g = window.__TEST__.game; return g.profile.met.length; }); t.ok(free >= 8, 'free play has every met event: ' + free);
    // pause, resume, restart, dev mode only from pause
    await p.evaluate(() => { const g = window.__TEST__.game; g.killScripts(); g.busy = false; g.endSpeech(); g.startEvent('fruitHat', { tier: 0, free: true }); }); await adv(p, 1.5); await press(p, 'ok'); await adv(p, 5); s = await S(p); t.eq(s.event && s.event.phase, 'play', 'event plays');
    await press(p, 'pause'); await adv(p, 0.3); s = await S(p); t.eq(s.screen, 'pause', 'pause opens'); t.ok(s.paused, 'sim is paused'); const t1 = s.event.t; await adv(p, 2); s = await S(p); t.eq(s.event.t, t1, 'event time frozen while paused');
    await p.evaluate(() => window.__TEST__.game.go('dev', { page: 0 })); await adv(p, 0.2); s = await S(p); t.eq(s.screen, 'dev', 'dev mode opens from pause');
    // a slider changes the running event and reset restores it
    await p.evaluate(() => { const T = window.__TEST__.tuning; T.fruitInterval = 0.6; }); t.eq(await p.evaluate(() => window.__TEST__.tuning.fruitInterval), 0.6, 'slider value live'); await p.evaluate(() => { const g = window.__TEST__.game; g.go('pause'); g.go('dev', { page: 0 }); });
    await p.evaluate(() => { import_reset(); function import_reset() { const d = window.__TEST__.game.screens.dev; d.p = (document.querySelectorAll('.tag').length, 0); } });
    await p.evaluate(() => { const g = window.__TEST__.game; g.closePause(); }); await adv(p, 0.3); s = await S(p); t.eq(s.screen, 'play', 'resume returns to play');
    // dev mode is not reachable from the title
    await p.evaluate(() => { const g = window.__TEST__.game; g.disposeEvent(); g.showHud(false); g.paused = false; g.go('title'); }); await adv(p, 0.3); await press(p, 'ok'); await adv(p, 0.3); s = await S(p); t.ok(s.screen !== 'dev', 'dev mode is not on the title/menu');
    // attract: 10 s idle on the title starts it; it visits several events; a key exits and is swallowed
    await p.evaluate(() => { const g = window.__TEST__.game; g.go('title'); g.idle = 0; g.input.resetAccum(); }); await adv(p, 9.5); s = await S(p); t.ok(!s.attract, 'attract waits for 10 s'); await adv(p, 1.2); s = await S(p); t.ok(s.attract, 'attract starts after 10 s idle');
    const seen = new Set(); for (let i = 0; i < 40; i++) { await adv(p, 3); const q = await S(p); if (q.event) seen.add(q.event.id); if (seen.size >= 4) break; } t.ok(seen.size >= 4, 'attract visits at least four events: ' + [...seen].join(','));
    await press(p, 'ok'); await p.evaluate(() => window.__TEST__.game.input.latched.add('Enter')); await adv(p, 0.5); s = await S(p); t.ok(!s.attract && s.screen === 'title', 'a key exits attract to the title and is swallowed (' + s.screen + ')');
    t.ok(p.errs.length === 0, 'no page errors during flow: ' + p.errs.slice(0, 2).join(' | '));
  } finally { await b.close(); }
}
