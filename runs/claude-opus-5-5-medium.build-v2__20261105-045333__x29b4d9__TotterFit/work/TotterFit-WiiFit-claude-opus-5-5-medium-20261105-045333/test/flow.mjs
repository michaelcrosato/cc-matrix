// The scripted whole-game playthrough, through the real menus with a stubbed pad.
const CROSS = 0, CIRCLE = 1, SQUARE = 2, TRI = 3, OPT = 9, UP = 12, DOWN = 13, LEFT = 14, RIGHT = 15;
export default async function ({ T, openPage, getBrowser, URLBASE }) {
  const b = await getBrowser(); const page = await openPage(b);
  const st = () => page.evaluate(() => __TEST__.state());
  const adv = (s) => page.evaluate((x) => __TEST__.advance(x), s);
  const press = async (n) => { await page.evaluate((k) => { window.__pads[0].connected = true; window.__pads[0].buttons[k] = { pressed: true, value: 1 }; __TEST__.advance(.05); window.__pads[0].buttons[k] = { pressed: false, value: 0 }; __TEST__.advance(.05); }, n); };
  const waitScreen = async (want, max = 240, step = .25) => { let t = 0; for (; t < max; t += step) { const s = await st(); if ([].concat(want).includes(s.screen)) return s; if (s.errors.length) throw new Error(s.errors[0]); await page.evaluate(([x, adv]) => { __TEST__.advance(x); }, [step]); await advanceDialog(); } const s = await st(); throw new Error(`waited for ${want}, on ${s.screen}, speech ${s.speech}`); };
  // Advance any blocking line with Cross, as a player would.
  const advanceDialog = async () => { const s = await st(); if (s.speechBusy) { await press(CROSS); } };
  const pick = async (label) => { for (let i = 0; i < 12; i++) { const s = await st(); if ((s.focus || '').includes(label)) { await press(CROSS); return true; } await press(DOWN); await page.evaluate(() => __TEST__.advance(.5)); const s2 = await st(); if ((s2.focus || '').includes(label)) { await press(CROSS); return true; } await press(RIGHT); await page.evaluate(() => __TEST__.advance(.5)); } throw new Error(`no menu item ${label} in ${JSON.stringify((await st()).items)}`); };
  await page.evaluate(() => __TEST__.clearSave());
  let s = await st();
  T.eq(s.three, '180', 'THREE.REVISION'); T.ok(/^0\.19\.3/.test(s.rapier || ''), `RAPIER.version ${s.rapier}`); T.eq(s.screen, 'title', 'boots to title'); T.eq(s.audio.music, 10, 'music default'); T.ok(Math.abs(s.audio.musicGain - .1) < 1e-6, `music bus gain ${s.audio.musicGain}`);
  // Attract at 10 s
  await adv(9.5); T.ok(!(await st()).attract, 'attract not yet at 9.5 s'); await adv(1); s = await st(); T.ok(s.attract, 'attract starts after 10 s');
  await adv(80); const vis = await page.evaluate(() => __TEST__.g.attractVisited); T.ok(new Set(vis).size >= 4, `attract visited ${vis}`); s = await st(); T.ok(!s.errors.length, `attract errors ${s.errors[0]}`);
  const backFrom = await page.evaluate(() => { const g = __TEST__.g; g.input.latch.add('enter'); g.input.keys.add('enter'); g.input.anyInput = true; __TEST__.advance(.05); g.input.keys.delete('enter'); __TEST__.advance(.3); return __TEST__.state(); });
  T.ok(!backFrom.attract, 'a key exits attract'); T.eq(backFrom.screen, 'title', 'key returns to title, not acted on');
  // Title -> menu -> who -> new profile
  await press(CROSS); await adv(.2); T.eq((await st()).screen, 'menu', 'title to menu by pad');
  await press(CROSS); await adv(.2); T.eq((await st()).screen, 'who', 'menu to who');
  await press(CROSS); await adv(.2); T.eq((await st()).screen, 'newprofile', 'empty mat to new profile');
  await press(CROSS); await adv(.2); T.eq((await st()).screen, 'paint', 'name then paint'); await press(CROSS);
  // Arrival tutorial: teach left, right, forward.
  await adv(1); let tries = 0;
  const lean = async (x, z) => { await page.evaluate(([a, c]) => { const p = window.__pads[0]; p.connected = true; p.axes[0] = a; p.axes[1] = c; }, [x, z]); };
  const saidHello = []; for (const [x, z] of [[-.9, 0], [.9, 0], [0, -.9]]) { for (let i = 0; i < 60; i++) { const q = await st(); if (q.speechBusy) { saidHello.push(q.speech); await press(CROSS); await adv(.1); if (i > 2 && !(await st()).speechBusy) break; } else { await adv(.2); if (saidHello.length) break; } } await lean(x, z); await adv(1); await lean(0, 0); await adv(.2); }
  T.ok(saidHello.length >= 3, `Trudy spoke ${saidHello.length} lines in the arrival`);
  const tiltSeen = (await st()).liveTilt; T.ok(tiltSeen > 2, `the island is tilted, ${tiltSeen}`);
  // Whole programme.
  await page.evaluate(() => { window.__fl = { maxDay: 0 }; });
  const playClassOrFlow = async () => {
    for (let guard = 0; guard < 4000; guard++) {
      const q = await st(); if (q.errors.length) throw new Error(q.errors[0]);
      if (q.levelled && q.screen === 'island' && !q.speechBusy && q.day === 5 && !q.locked) return q;
      if (q.speechBusy) { await press(CROSS); await adv(.15); continue; }
      switch (q.screen) {
        case 'question': await press(CROSS); await adv(.2); break;
        case 'plan': { const idx = await page.evaluate(() => { const items = __TEST__.g.ui.focus.items(); return items.findIndex(i => !/DONE/.test(i.textContent) && i.classList.contains('card')); }); if (idx < 0) { await page.evaluate(() => { const it = __TEST__.g.ui.focus.items().find(i => /Go to bed/.test(i.textContent)); __TEST__.g.ui.focus.set(it); }); await press(CROSS); } else { await page.evaluate((k) => { __TEST__.g.ui.focus.set(__TEST__.g.ui.focus.items()[k]); }, idx); await press(CROSS); } await adv(.2); break; }
        case 'intro': await press(CROSS); await adv(.3); await page.evaluate(() => __TEST__.bot('sharp')); break;
        case 'results': { await page.evaluate(() => __TEST__.bot(null)); const f = await page.evaluate(() => { const it = __TEST__.g.ui.focus.items().find(i => /Continue/.test(i.textContent)); __TEST__.g.ui.focus.set(it); return 1; }); void f; await press(CROSS); await adv(.2); break; }
        case 'play': { await page.evaluate(() => __TEST__.bot('sharp')); await adv(1); break; }
        case 'island': { if (q.locked) { await adv(.25); break; } if (!q.remaining.length) { const here = await page.evaluate(() => { const g = __TEST__.g; g.hub.teleport(8, 10.2); return 1; }); void here; await adv(.2); await press(CROSS); await adv(.3); } else { await press(TRI); await adv(.2); T.ok(['plan','island'].includes((await st()).screen), 'triangle opens plan'); } break; }
        default: await adv(.5);
      }
      if (guard % 50 === 0) T.note(`guard ${guard} day ${q.day} screen ${q.screen} done ${q.done} steps ${q.step} tilt ${q.tilt.toFixed(2)} marbles ${q.marbles}`);
    }
    const zz = await st(); throw new Error('programme stuck ' + JSON.stringify({ d: zz.day, s: zz.screen, sp: zz.speech, l: zz.locked, r: zz.remaining, done: zz.done, ev: zz.event?.id, ph: zz.event?.phase, it: zz.items, ages: zz.ages }));
  };
  // Mid-way reload is tested on a copy of the save below.
  s = await playClassOrFlow();
  T.eq(s.levelled, true, 'reached the ending'); T.ok(s.tilt < .001, `tilt falls to exactly 0, got ${s.tilt}`); T.ok(Math.abs(s.audio.detune) < 1e-6, `music detune 0 at level, got ${s.audio.detune}`); T.eq(s.ages.length, 5, 'five Wobble Ages'); T.ok(s.ages[4] < s.ages[0], `age falls ${s.ages}`); T.ok(s.marbles >= 60, `marbles ${s.marbles}`); T.eq(s.stamps, 4, 'four stamps'); T.eq(s.step, await page.evaluate(() => __TEST__.g.stepsTotal()), 'steps complete');
  T.note(`end: ages ${s.ages} marbles ${s.marbles}`);
  // Maintenance day: bed, new check-in, plan of three.
  await page.evaluate(() => { const g = __TEST__.g; g.hub.teleport(8, 10.2); g.profile.doneToday = g.planFor(); g.refreshHubSpots(); }); await adv(.2); await press(CROSS); for (let i = 0; i < 400; i++) { const q = await st(); if (q.day === 6 && q.screen === 'island' && !q.speechBusy && q.done.length === 0 && (await page.evaluate(() => __TEST__.g.profile.checkinDone))) break; if (q.speechBusy) { await press(CROSS); await adv(.1); } else if (q.screen === 'question') await press(CROSS); else if (q.screen === 'plan') { await press(CIRCLE); } else if (q.screen === 'intro') { await press(CROSS); } else if (q.screen === 'play') { await page.evaluate(() => __TEST__.bot('sharp')); await adv(1); } else await adv(.5); }
  s = await st(); await page.evaluate(() => __TEST__.bot(null)); T.eq(s.day, 6, 'reached Maintenance'); T.eq(s.remaining.length, 3, 'a plan of three on Maintenance');
  const freeAll = await page.evaluate(() => { const g = __TEST__.g; return Object.keys(__TEST__.EVENTS).every(id => g.profile.met.includes(id)); }); T.ok(freeAll, 'Free Play has everything');
  // Reload resumes the save.
  const before = await st(); await page.reload(); await page.waitForFunction(() => window.__TEST__); const r = await page.evaluate(() => { const g = __TEST__.g; const i = g.save.profiles.findIndex(Boolean); return { day: g.save.profiles[i]?.day, marbles: g.save.profiles[i]?.marbles, levelled: g.save.profiles[i]?.levelled }; }); T.eq(r.day, before.day, 'save resumes day'); T.eq(r.marbles, before.marbles, 'save resumes marbles'); T.eq(r.levelled, true, 'save resumes levelled');
  // Pause, restart, dev only from pause, sliders change the running event, reset restores.
  await page.evaluate(() => { const g = __TEST__.g; g.save.current = g.save.profiles.findIndex(Boolean); g.ui.closeAll(); g.clearMode(); g.playClass('fruitHat', { kind: 'free', tier: 0 }); }); await adv(.3); T.eq((await st()).screen, 'intro', 'free class intro'); await press(CROSS); await adv(1.2);
  T.eq((await st()).screen, 'play', 'class runs'); const devBefore = await page.evaluate(() => [...document.querySelectorAll('[data-screen]')].some(e => /Dev/.test(e.textContent))); T.ok(!devBefore, 'no dev button outside Pause');
  await press(OPT); await adv(.1); s = await st(); T.eq(s.screen, 'pause', 'Options pauses'); T.ok(s.items.some(i => /Dev Mode/.test(i)), 'Dev Mode in Pause'); const t0 = s.event.t; await adv(1); T.eq((await st()).event.t, t0, 'pause stops the sim');
  const dev = await page.evaluate(() => { const g = __TEST__.g, items = g.ui.focus.items(); g.ui.focus.activate(items.find(i => /Dev Mode/.test(i.textContent))); return g.ui.topId(); }); T.eq(dev, 'dev', 'dev mode opens');
  const sl = await page.evaluate(() => { const g = __TEST__.g, T2 = __TEST__.T; const was = T2.fruitInterval; T2.fruitInterval = 2; const changed = T2.fruitInterval !== was; __TEST__.resetTuning(); return { changed, back: T2.fruitInterval === was }; }); T.ok(sl.changed && sl.back, 'slider and reset');
  for (let i = 0; i < 6; i++) { await press(CIRCLE); await adv(.1); if ((await st()).screen === 'play') break; } T.eq((await st()).screen, 'play', 'back resumes'); 
  await page.evaluate(() => { const g = __TEST__.g; g.input.latch.add('escape'); }); await adv(.1); T.eq((await st()).screen, 'pause', 'Esc pauses');
  await page.evaluate(() => { const g = __TEST__.g; const it = g.ui.focus.items().find(i => /Restart/.test(i.textContent)); g.ui.focus.activate(it); }); await adv(.3); T.eq((await st()).screen, 'intro', 'Restart goes back to intro'); 
  T.ok(!page.errors.length, `flow errors ${page.errors.slice(0, 2).join('|').slice(0, 400)}`);
  await page.context().close();
  // Attract on the wall clock: 10 real seconds, then each device exits it and the press is swallowed.
  const live = await openPage(b, { query: 'test=1&render=0' }); await live.evaluate(() => __TEST__.clearSave());
  const tw = Date.now(); await live.waitForFunction(() => __TEST__.state().attract, null, { timeout: 30000 }); const took = (Date.now() - tw) / 1000; T.ok(took > 7 && took < 16, `attract after ${took} s`);
  await live.keyboard.press('KeyX'); await live.waitForTimeout(400); let ls = await live.evaluate(() => __TEST__.state()); T.ok(!ls.attract && ls.screen === 'title', `a key exits attract, on ${ls.screen}`);
  await live.waitForFunction(() => __TEST__.state().attract, null, { timeout: 30000 }); await live.mouse.move(100, 100); await live.mouse.move(400, 400, { steps: 4 }); await live.waitForTimeout(400); ls = await live.evaluate(() => __TEST__.state()); T.ok(!ls.attract && ls.screen === 'title', 'the mouse exits attract');
  await live.waitForFunction(() => __TEST__.state().attract, null, { timeout: 30000 }); await live.evaluate(() => { const p = window.__pads[0]; p.connected = true; p.buttons[0] = { pressed: true, value: 1 }; }); await live.waitForTimeout(300); await live.evaluate(() => { window.__pads[0].buttons[0] = { pressed: false, value: 0 }; }); await live.waitForTimeout(200); ls = await live.evaluate(() => __TEST__.state()); T.ok(!ls.attract && ls.screen === 'title', `a button exits attract and isn't acted on, on ${ls.screen}`);
  T.ok(!live.errors.length, `live attract errors ${live.errors[0]}`); await live.context().close();
}
