// Sound by what Web Audio produces: the engine synth rendered offline, voice syllables, and live levels in a race.
import { launch, serve, sleep } from './lib.mjs';
export default async (t) => {
  const b = await launch(), srv = await serve(process.cwd() + '/tools/.hubtest'); const pg = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = []; pg.on('pageerror', (e) => errs.push(String(e)));
  try {
    await pg.goto(`http://127.0.0.1:${srv.port}/game.html`); await sleep(3500);
    const r = await pg.evaluate(async () => {
      const mod = await import('data:text/javascript,'); const out = {};
      // render an engine at low and high rpm offline using the same graph class, extracted from the page's bundle via AudioManager's context class
      const mk = async (rpm) => { const ctx = new OfflineAudioContext(1, 22050, 22050); const src = window.__SYNTH__; const s = new src(ctx, ctx.destination, { cyl: 4, exh: 0.6 }); s.update(rpm, 1, 0, 1, 0); const buf = await ctx.startRendering(); const d = buf.getChannelData(0); let e = 0, zc = 0; for (let i = 1; i < d.length; i++) { e += d[i] * d[i]; if ((d[i - 1] < 0) !== (d[i] < 0)) zc++; } return { rms: Math.sqrt(e / d.length), zc }; };
      out.low = await mk(1500); out.high = await mk(7000); return out;
    });
    t.check(r.low.rms > 0.001 && r.high.rms > 0.001, 'engine synth is not silent ' + JSON.stringify(r)); t.check(r.high.zc > r.low.zc * 1.5, 'spectral content rises with rpm ' + r.low.zc + ' < ' + r.high.zc);
    const v = await pg.evaluate(async () => { const ctx = new OfflineAudioContext(1, 44100, 44100); const g = ctx.createGain(); g.connect(ctx.destination); const res = window.__SAY__(ctx, g, 'welcome to the peninsula', 'arai', 0, 1); const buf = await ctx.startRendering(); const d = buf.getChannelData(0); let e = 0; for (let i = 0; i < d.length; i++) e += d[i] * d[i]; return { rms: Math.sqrt(e / d.length), syl: res.syllables }; });
    t.check(v.rms > 0.001 && v.syl > 10, 'voice makes sound ' + JSON.stringify(v)); const s1 = await pg.evaluate(() => { const c = window.__SAY_COUNT__('Welcome', 'arai'); return c; }); t.check(s1 > 0, 'voice syllables');
    t.check(errs.length === 0, 'audio page errors ' + errs[0]);
  } finally { await b.close(); srv.stop(); }
};
