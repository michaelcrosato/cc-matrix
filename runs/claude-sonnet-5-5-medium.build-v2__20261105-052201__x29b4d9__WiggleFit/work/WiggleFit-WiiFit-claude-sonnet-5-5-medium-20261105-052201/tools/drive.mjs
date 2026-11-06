// Helpers that drive the built game through __TEST__ (shared by test.mjs groups).
export const S = (p) => p.evaluate(() => window.__TEST__.state());
export const adv = (p, s) => p.evaluate((x) => window.__TEST__.advance(x), s);
export const press = (p, a) => p.evaluate((x) => window.__TEST__.press(x), a);
export async function untilScreen(p, name, maxS = 60, step = 0.5) { for (let t = 0; t < maxS; t += step) { const s = await S(p); if (s.screen === name) return s; if (s.speech) await press(p, 'ok'); await adv(p, step); } return S(p); }
export async function playEvent(p, id, tier = 0, { skill = 'sharp', programme = true, maxS = 400 } = {}) {
  await p.evaluate(() => { const g = window.__TEST__.game; g.busy = false; g.endSpeech(); });
  await p.evaluate(([i, t, pr]) => { const g = window.__TEST__.game; g.startEvent(i, { programme: pr, tier: t }); }, [id, tier, programme]);
  await adv(p, 1.5); let s = await S(p); if (s.screen !== 'intro') await untilScreen(p, 'intro', 10);
  await p.evaluate((sk) => { window.__TEST__.bot(sk); }, skill); await press(p, 'ok'); await adv(p, 0.3);
  await p.evaluate((sk) => { window.__TEST__.bot(sk); }, skill);
  for (let t = 0; t < maxS; t += 2) { s = await S(p); if (s.screen === 'results' || (s.event && s.event.phase === 'done')) break; await adv(p, 2); }
  for (let i = 0; i < 12; i++) { s = await S(p); if (s.screen === 'results') break; await adv(p, 0.5); }
  return S(p);
}
export async function newGame(b, { w = 1920, h = 1080, qs = 'test=1&render=0&manual=1&audio=0', ctx = {} } = {}) {
  const { url } = await import('./lib.mjs'); const page = await b.newPage({ viewport: { width: w, height: h }, ...ctx }); const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 200))); page.on('console', (m) => { if (m.type() === 'error') errs.push('E: ' + m.text().slice(0, 200)); });
  await page.goto(url(qs)); await page.waitForFunction(() => window.__done || window.__err, null, { timeout: 90000 }); page.errs = errs; return page;
}
export async function newProfile(p) { await adv(p, 2); await press(p, 'ok'); await adv(p, 0.3); await press(p, 'ok'); await adv(p, 0.3); await press(p, 'ok'); await adv(p, 0.3); await press(p, 'down'); await press(p, 'down'); await press(p, 'ok'); await adv(p, 1.5); return S(p); }
// Morning + Check-In: presses Use through speech and menus, bot plays the tests
export async function doMorning(p, skill = 'sharp') {
  await adv(p, 1.5); for (let i = 0; i < 6; i++) { if (await p.evaluate(() => window.__TEST__.game.busy)) break; await adv(p, 0.5); }
  for (let i = 0; i < 400; i++) { const s = await S(p); if (s.screen === 'plan') return s; if (s.screen === 'play') { await p.evaluate((k) => window.__TEST__.bot(k), skill); await adv(p, 4); continue; } if (s.screen !== 'reveal') await press(p, 'ok'); await adv(p, 1); }
  return S(p);
}
export async function playDay(p, { skill = 'sharp', log = () => {} } = {}) {
  const s0 = await S(p); const classes = await p.evaluate(() => window.__TEST__.game.todaysClasses()); const tier = await p.evaluate(() => window.__TEST__.game.tierFor ? 0 : 0);
  for (const id of classes) {
    const r = await playEvent(p, id, await p.evaluate((i) => window.__TEST__.game.tierFor(i), id), { skill, maxS: 500 }); log('class', id, r.screen, r.event && r.event.lanes[0] && r.event.lanes[0].form);
    for (let i = 0; i < 60; i++) { const s = await S(p); if (s.screen === 'island' || s.screen === 'ending') break; if (s.screen === 'results' || s.screen === 'jar') await press(p, 'ok'); else if (s.speech) await press(p, 'ok'); await adv(p, 1); }
    const s = await S(p); if (s.screen === 'ending') return s;
    for (let i = 0; i < 6; i++) { const q = await S(p); if (q.speech) await press(p, 'ok'); await adv(p, 0.5); }
  }
  return S(p);
}
export async function sleepThrough(p) {
  await p.evaluate(() => { const g = window.__TEST__.game; g.go('island', {}); }); await adv(p, 1); await p.evaluate(() => window.__TEST__.game.useHotspot({ id: 'bed' }));
  for (let i = 0; i < 40; i++) { const s = await S(p); if (s.speech) await press(p, 'ok'); await adv(p, 1); const t = await S(p); if (t.screen === 'island' && !t.speech && i > 6) break; }
}
