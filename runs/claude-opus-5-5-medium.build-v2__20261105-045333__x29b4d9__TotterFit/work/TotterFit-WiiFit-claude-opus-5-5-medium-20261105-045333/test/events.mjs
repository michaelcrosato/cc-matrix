const IDS = ['poses', 'cairn', 'stillWater', 'logReps', 'plank', 'tug', 'stepClass', 'plates', 'islandLoop', 'fruitHat', 'roomService', 'springboard', 'raft', 'grandHold'];
export default async function ({ T, openPage, getBrowser, RENDER, URLBASE }) {
    const b = await getBrowser(); const page = await openPage(b);
  for (const id of IDS) {
    const tiers = await page.evaluate((i) => __TEST__.EVENTS[i].tiers.length, id);
    for (let t = 0; t < tiers; t++) {
      const skills = id === 'raft' ? ['sharp', 'average', 'clumsy', 'average'] : ['sharp'];
      const r = await page.evaluate(([i, tier, sk]) => { try { return __TEST__.runEvent(i, { tier, skills: sk }); } catch (e) { return { crash: String(e.stack || e) }; } }, [id, t, skills]);
      if (!T.ok(!r.crash, `${id} t${t} crash ${r.crash}`)) continue;
      T.ok(r.done, `${id} t${t} did not finish in ${r.t}s`); T.ok(!r.nan, `${id} t${t} NaN`);
      T.ok(Number.isFinite(r.res[0].form), `${id} t${t} form ${r.res[0].form}`);
      T.note(`${id} t${t}: ${JSON.stringify(r.res[0])} ${r.playT.toFixed(1)}s bodies ${r.base}->${r.bodiesEnd}`);
    }
    // Forced fall ragdolls and recovers, and the world frees.
    const f = await page.evaluate((i) => { const g = __TEST__.g; g.ui.closeAll(); g.clearMode(); const skills = i === 'raft' ? [{ kind: 'bot', skill: 'sharp' }, { kind: 'bot', skill: 'sharp' }] : [{ kind: 'bot', skill: 'sharp' }]; const ev = g.startEventMode(__TEST__.EVENTS[i], { tier: 0 }, skills); ev.count = .01; for (let k = 0; k < 240; k++) { g.fixed(1 / 120); g.frame(1 / 120); } ev.forceThing(); ev.forceGust(1); ev.forceFall(); const fell = ev.lanes.some(l => l.fallen || l.out); for (let k = 0; k < 480; k++) { g.fixed(1 / 120); g.frame(1 / 120); } const out = { fell, ok: !ev.hasNaN(), stuck: ev.lanes.some(l => l.fallen), errors: g.errors.length }; g.clearMode(); out.worlds = __TEST__.state().worlds; return out; }, id);
    T.ok(f.ok && !f.errors, `${id} force soak bad ${JSON.stringify(f)}`); T.ok(!f.stuck, `${id} stuck fallen`); T.eq(f.worlds, 0, `${id} worlds left`);
  }
  T.ok(!page.errors.length, `events page errors: ${page.errors.slice(0, 3).join(' | ')}`);
  // Soak the removal paths with the doll swaying: Rapier's panic only shows once something moves.
  const soak = await page.evaluate(() => { const g = __TEST__.g; g.clearMode(); const ev = g.startEventMode(__TEST__.EVENTS.fruitHat, {}, [{ kind: 'bot', skill: 'clumsy' }]); ev.count = .01; ev.opts.bankAt = 99; for (let i = 0; i < 60 * 120; i++) { g.fixed(1 / 120); if (i % 300 === 0) ev.forceFall(); if (i % 90 === 0) ev.forceThing(); } const e1 = g.errors.length; g.clearMode(); const c = g.startEventMode(__TEST__.EVENTS.cairn, {}, [{ kind: 'bot', skill: 'clumsy' }]); c.count = .01; for (let i = 0; i < 30 * 120; i++) { g.fixed(1 / 120); if (i % 400 === 0) c.forceFall(); } g.clearMode(); const gh = g.startEventMode(__TEST__.EVENTS.grandHold, {}, [{ kind: 'bot', skill: 'sharp' }]); gh.count = .01; for (let i = 0; i < 24 * 120; i++) { g.fixed(1 / 120); if (i === 2000) gh.forceFall(); } for (let i = 0; i < 4; i++) { gh.phaseI = 1; gh.enterPhase(1); for (let k = 0; k < 800; k++) g.fixed(1 / 120); gh.forceFall(); for (let k = 0; k < 400; k++) g.fixed(1 / 120); } g.clearMode(); for (let i = 0; i < 12; i++) { const r = g.startEventMode(__TEST__.EVENTS.roomService, {}, [{ kind: 'bot', skill: 'sharp' }]); r.count = .01; for (let k = 0; k < 400; k++) g.fixed(1 / 120); r.goOverboard(r.lanes[0]); for (let k = 0; k < 100; k++) g.fixed(1 / 120); g.clearMode(); } return { errs: g.errors.slice(0, 2), worlds: __TEST__.state().worlds }; });
  T.ok(!soak.errs.length, `soak errors ${soak.errs[0]}`); T.eq(soak.worlds, 0, 'soak leaves no worlds');
  await page.context().close();
  // Real rendering: every event on the WebGPU backend, device alive, ink in the pixels.
  const { chromium, webkit } = await import('playwright'); 
  const rb = await chromium.launch({ args: [...RENDER, '--no-sandbox'] }); const rp = await openPage(rb, { query: 'test=1&manual=1&seed=3' });
  for (const id of IDS) {
    const s = await rp.evaluate(async (i) => { const g = __TEST__.g; g.ui.closeAll(); g.scripts.clear(); g.clearMode(); const specs = i === 'raft' ? [{ kind: 'bot', skill: 'sharp' }, { kind: 'bot', skill: 'average' }] : [{ kind: 'bot', skill: 'sharp' }]; const ev = g.startEventMode(__TEST__.EVENTS[i], { tier: 0 }, specs); ev.count = .01; __TEST__.advance(2); const f0 = __TEST__.state().render.frames; for (let k = 0; k < 3; k++) { g.frame(1 / 30); g.draw(); await new Promise(r => requestAnimationFrame(r)); } const st = __TEST__.state(); return { backend: st.render.backend, lost: st.render.lost, frames: st.render.frames - f0, errors: st.errors.slice(0, 1) }; }, id);
    T.eq(s.backend, 'webgpu', `${id} backend`); T.ok(!s.lost, `${id} device lost: ${s.lost}`); T.ok(s.frames >= 3, `${id} frames ${s.frames}`); T.ok(!s.errors.length, `${id} render errors ${s.errors[0]}`);
  }
  const png = await rp.screenshot(); const px = await rp.evaluate(async (b64) => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = 320; c.height = 180; const x = c.getContext('2d'); x.drawImage(im, 0, 0, 320, 180); const d = x.getImageData(0, 0, 320, 180).data; let dark = 0; const cols = new Set(); for (let i = 0; i < d.length; i += 4) { if (d[i] < 50 && d[i + 1] < 45 && d[i + 2] < 60) dark++; cols.add((d[i] >> 4) * 256 + (d[i + 1] >> 4) * 16 + (d[i + 2] >> 4)); } return { dark, colours: cols.size }; }, png.toString('base64'));
  T.ok(px.dark > 40, `ink pixels ${px.dark}`); T.ok(px.colours > 25, `colour range ${px.colours}`); const rend = await rp.evaluate(() => ({ three: __TEST__.state().three, errs: __TEST__.state().errors.length })); T.eq(rend.errs, 0, 'render errors'); T.ok(!rp.errors.some(e => /Device Lost|device lost/i.test(e)), 'no Device Lost messages'); await rb.close();
  // The WebGL2 fallback, in WebKit.
  const wk = await webkit.launch(); const wp = await openPage(wk, { query: 'test=1&manual=1&seed=3' });
  const w = await wp.evaluate(async () => { const g = __TEST__.g; for (const i of ['poses', 'fruitHat', 'stepClass']) { g.ui.closeAll(); g.scripts.clear(); g.clearMode(); const ev = g.startEventMode(__TEST__.EVENTS[i], { tier: 0 }, [{ kind: 'bot', skill: 'sharp' }]); ev.count = .01; __TEST__.advance(1); g.frame(1 / 30); g.draw(); await new Promise(r => requestAnimationFrame(r)); } const st = __TEST__.state(); return { backend: st.render.backend, frames: st.render.frames, errors: st.errors.slice(0, 1) }; });
  T.eq(w.backend, 'webgl2', 'WebKit uses the fallback'); T.ok(w.frames >= 3, 'WebKit frames'); T.ok(!w.errors.length, `WebKit errors ${w.errors[0]}`); await wk.close();
}
