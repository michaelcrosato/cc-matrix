import { chromium } from 'playwright';
import { url } from '../tools/lib.mjs';
import { S, adv, press } from '../tools/drive.mjs';
export default async function (t) {
  const b = await chromium.launch({ args: ['--disable-gpu', '--autoplay-policy=no-user-gesture-required'] });
  try {
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('request', (r) => { if (/\.(mp3|ogg|wav|m4a)(\?|$)/.test(r.url())) errs.push('audio file requested ' + r.url()); });
    await p.goto(url('test=1&render=0&manual=1')); await p.waitForFunction(() => window.__done);
    let s = await S(p); t.eq(s.audio.music, 10, 'music setting defaults to 10'); t.ok(Math.abs(s.audio.musicGain - 0.1) < 1e-6, 'music bus gain is 0.10 (' + s.audio.musicGain + ')');
    t.eq(await p.evaluate(() => window.__TEST__.lib.REV), '180', 'Three.js revision is 180'); t.ok(/0\.19\.3/.test(await p.evaluate(() => window.__TEST__.lib.RV)), 'Rapier is 0.19.3');
    // render every track, sting, sfx and voice offline
    const res = await p.evaluate(async () => {
      const { AUD, TRACKS, SFX, VOX } = window.__TEST__.lib; const out = {}; const sr = 22050;
      const stat = (buf) => { let s = 0, pk = 0, ok = true; const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) { const v = d[i]; if (!isFinite(v)) ok = false; s += v * v; pk = Math.max(pk, Math.abs(v)); } return { rms: Math.sqrt(s / d.length), peak: pk, ok }; };
      for (const name of Object.keys(TRACKS)) { const ctx = new OfflineAudioContext(2, sr * 9, sr); const g = AUD.buildGraph(ctx, { music: 1, sfx: 1, voice: 1 }); let t0 = 0.1; for (let bar = 0; bar < 3; bar++) t0 += AUD.scheduleBar(ctx, g.musicIn, name, bar, t0, 0, (x) => 0); out['track:' + name] = stat(await ctx.startRendering()); }
      for (const name of Object.keys(SFX)) { const ctx = new OfflineAudioContext(2, sr * 3, sr); const g = AUD.buildGraph(ctx, { music: 1, sfx: 1, voice: 1 }); SFX[name](ctx, g.sfx, 0.05); out['sfx:' + name] = stat(await ctx.startRendering()); }
      for (const v of ['trudy', 'stillwater', 'bolster', 'guest1', 'gary']) { const ctx = new OfflineAudioContext(2, sr * 6, sr); const g = AUD.buildGraph(ctx, { music: 1, sfx: 1, voice: 1 }); const d = VOX.speak(ctx, g.voice, 0.05, 'Oh! You came back. I was not counting. Hello there, friend?', v); const r = stat(await ctx.startRendering()); r.dur = d; r.blips = VOX.plan('Oh! You came back. I was not counting.', v).blips.length; out['voice:' + v] = r; }
      return out;
    });
    for (const [k, r] of Object.entries(res)) { t.ok(r.ok, k + ' is finite'); t.ok(r.rms > 0.0005, k + ' is not silent (rms ' + r.rms.toFixed(4) + ')'); t.ok(r.peak <= 1.0001, k + ' is not clipped (peak ' + r.peak.toFixed(2) + ')'); }
    for (const v of ['trudy', 'stillwater', 'bolster']) { const r = res['voice:' + v]; t.ok(r.blips >= 10, v + ' voice makes blips: ' + r.blips); }
    t.ok(Math.abs(res['voice:trudy'].peak - res['voice:bolster'].peak) < 0.6, 'voices are roughly balanced');
    // live mix: after input, the context runs, music plays and an analyser hears it
    await p.keyboard.press('Enter'); await p.evaluate(() => { const g = window.__TEST__.game; g.audio.wake(); g.audio.play('levelBest', 0); }); await p.waitForTimeout(3500); s = await S(p);
    t.ok(['running', 'suspended'].includes(s.audio.state), 'audio context exists: ' + s.audio.state);
    if (s.audio.state === 'running') { const lv = await p.evaluate(async () => { let m = 0; for (let i = 0; i < 20; i++) { m = Math.max(m, window.__TEST__.game.audio.level('music')); await new Promise((r) => setTimeout(r, 100)); } return m; }); t.ok(lv > 0.0001, 'live music bus has signal (' + lv.toFixed(5) + ')'); }
    // detune is 0 at level
    t.eq(await p.evaluate(() => { const a = window.__TEST__.game.audio; a.setTilt(0); return a.detune(1.7); }), 0, 'detune is exactly 0 at tilt 0'); t.ok(await p.evaluate(() => { const a = window.__TEST__.game.audio; a.setTilt(9); return Math.abs(a.detune(2)) > 1; }), 'detune is audible at tilt 9');
    t.ok(errs.length === 0, 'no audio files requested, no errors: ' + errs.slice(0, 2).join(' | '));
  } finally { await b.close(); }
}
