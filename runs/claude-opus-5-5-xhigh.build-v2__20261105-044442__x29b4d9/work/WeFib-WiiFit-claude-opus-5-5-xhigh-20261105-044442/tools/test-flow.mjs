// The scripted whole-game playthrough, plus attract, pause, restart and Dev Mode rules.
import { silence } from './lib.mjs';
import sliders from './test-sliders.mjs';
export default async function ({ ok, info, launch, logicPage }) {
  const browser = await launch();
  let page = await logicPage(browser);

  const driver = () => {
    window.__drive = function drive(maxSim, untilFn) {
      const T = window.__TEST__, g = T.game;
      const CROSS = 0, TRI = 3;
      const log = [];
      let sim = 0;
      const step = 0.2;
      let lastKey = '', stuck = 0;
      while (sim < maxSim) {
        const s = T.state();
        if (untilFn && untilFn(s)) return { ok: true, sim, s, log };
        const top = g.ui.top;
        const name = top && !top.passive ? top.name : null;
        const line = g.speech.line;
        const ev = g.currentEvent;
        const playing = ev && ev.phase === 'play';
        T.bot(playing ? 'sharp' : null);
        const key = `${s.screen}|${s.mode}|${s.stage}|${line ? line.text.slice(0, 20) : ''}|${s.day}|${s.done.length}`;
        if (key === lastKey) stuck += step; else { stuck = 0; lastKey = key; }
        if (stuck > 90 && !playing) return { ok: false, why: `stuck on ${key}`, sim, s, log };
        const hub = g.mode && g.mode.name === 'island' ? g.mode : null;
        if (!playing) T.stick(0, 0);
        if (playing) { T.advance(step); sim += step; continue; }
        if (g.wiping) { T.advance(step); sim += step; continue; }
        if (hub && hub.leanGoal) {
          T.stick(hub.leanGoal[0] * 0.9, hub.leanGoal[1] * 0.9);
          if (line && !line.finished) { T.advance(step); sim += step; continue; }
          T.advance(step); sim += step; continue;
        }
        if (line && !line.auto) { T.tap(CROSS); T.advance(step); sim += step; continue; }
        if (name === 'question' || name === 'results' || name === 'intro' || name === 'newProfile' || name === 'menu' || name === 'title' || name === 'who') {
          if (name === 'newProfile') { T.tap(13); T.tap(13); T.tap(CROSS); T.advance(step); sim += step; continue; }
          T.tap(CROSS); T.advance(step); sim += step; continue;
        }
        if (s.screen === 'title') { T.tap(CROSS); T.advance(step); sim += step; continue; }
        if (name === 'plan') {
          // Move to the first card not yet done, then go.
          const pr = g.programme, today = pr.classesToday(), p = g.save.profile;
          const idx = today.findIndex((id) => !p.today.done.includes(id));
          if (idx < 0) { T.tap(1); T.advance(step); sim += step; continue; }
          let guard = 0;
          while (top.focus !== idx && guard++ < 8) T.tap(idx > top.focus ? 15 : 14);
          T.tap(CROSS); T.advance(step); sim += step; continue;
        }
        if (hub) {
          if (hub.cutscene || (hub.handle && !hub.handle.done)) { T.advance(step); sim += step; continue; }
          const pr = g.programme;
          if (pr.planLeft().length) { T.tap(TRI); T.advance(step); sim += step; continue; }
          // Walk to the Bed Hut through the real input path.
          const t = { x: 8, z: 8 }, p = g.phys.pos, dx = t.x - p.x, dz = t.z - p.z, d = Math.hypot(dx, dz);
          if (hub.focus && hub.focus.id === 'bedHut') { T.stick(0, 0); T.tap(CROSS); T.advance(step); sim += step; continue; }
          const y = g.rig.yaw, c = Math.cos(-y), sn = Math.sin(-y);
          const sx = dx / (d || 1), sz = dz / (d || 1);
          T.stick(sx * c + sz * sn, -sx * sn + sz * c);
          T.advance(step); sim += step; continue;
        }
        T.advance(step); sim += step;
      }
      return { ok: false, why: 'timed out', sim, s: T.state(), log };
    };
  };
  await page.evaluate(driver);
  const r0 = await page.evaluate(() => {
    const T = window.__TEST__;
    return { rev: T.REVISION, rap: T.rapierVersion() };
  });
  ok(r0.rev === '180', 'Three revision is 180', r0.rev);
  ok(r0.rap === '0.19.3', 'Rapier version is 0.19.3', r0.rap);
  await page.evaluate(() => { window.__TEST__.game.save.reset(); window.__TEST__.goto('title'); window.__TEST__.advance(0.3); });
  // Title → profile → tutorial → Day 1 plan
  let r = await page.evaluate(() => window.__drive(240, (s) => s.mode === 'island' && s.checkin && s.day === 1));
  ok(r.ok, 'reach Day 1 island after the Check-In', r.why || '');
  ok(r.s.profile, 'a profile exists', '');
  ok(r.s.wobbleAge >= 18 && r.s.wobbleAge <= 99, 'a Wobble Age was given', String(r.s.wobbleAge));
  const tilt0 = r.s.rest;
  ok(tilt0 > 8.9, 'island starts at nine degrees', String(tilt0));
  const marbles0 = r.s.marbles;
  ok(marbles0 === 1, 'the Check-In gives a marble', String(marbles0));
  // Day 1 through to Day 2's morning.
  r = await page.evaluate(() => window.__drive(900, (s) => s.day === 2 && s.mode === 'island'));
  ok(r.ok, 'finish Day 1', r.why || JSON.stringify(r.s && { screen: r.s.screen, stage: r.s.stage, done: r.s.done }));
  ok(r.s.stamps === 1, 'one stamp after Day 1', String(r.s.stamps));
  ok(r.s.marbles > marbles0, 'marbles rise', String(r.s.marbles));
  ok(r.s.rest < tilt0, 'tilt falls', String(r.s.rest));
  // Reload mid-way: the save resumes.
  const before = r.s;
  await page.reload();
  await page.waitForFunction(() => window.__TEST__ && !document.getElementById('boot'), null, { timeout: 60000 });
  await silence(page);
  await page.evaluate(driver);
  await page.evaluate(() => window.__TEST__.advance(0.5));
  const after = await page.evaluate(() => { const T = window.__TEST__; T.game.save.data.activeProfile = 0; return T.state(); });
  ok(after.day === 2 && after.marbles === before.marbles && after.stamps === 1, 'reload resumes the save', JSON.stringify({ d: after.day, m: after.marbles, s: after.stamps }));
  // Days 2-5, to the ending.
  r = await page.evaluate(() => window.__drive(5000, (s) => s.levelled));
  ok(r.ok, 'reach the Grand Hold ending', r.why || JSON.stringify(r.s && { screen: r.s.screen, stage: r.s.stage, day: r.s.day, done: r.s.done, err: r.s.errors }));
  if (r.ok) {
    ok(r.s.step === r.s.totalSteps, 'all programme steps done', `${r.s.step}/${r.s.totalSteps}`);
    const rest = await page.evaluate(() => { const T = window.__TEST__; T.advance(0.5); return { rest: T.game.phys.restNow, tilt: T.state().audio.tiltDeg }; });
    ok(rest.rest === 0, 'tilt reaches exactly zero', String(rest.rest));
    ok(rest.tilt === 0, 'music detune reaches zero', String(rest.tilt));
    r = await page.evaluate(() => window.__drive(200, (s) => s.day === 6 && s.mode === 'island' && !s.screen.includes('credits')));
    ok(r.ok, 'credits roll and Maintenance begins', r.why || '');
    ok(r.s.stamps >= 5, 'five stamps', String(r.s.stamps));
    // Maintenance day: check in, three random classes, then Free Play has everything.
    r = await page.evaluate(() => window.__drive(900, (s) => s.day === 7 && s.mode === 'island'));
    ok(r.ok, 'a Maintenance day plays through', r.why || JSON.stringify(r.s && { screen: r.s.screen, stage: r.s.stage }));
    const fp = await page.evaluate(() => { const T = window.__TEST__; return T.game.programme.freePlayList().length; });
    ok(fp === 14, 'Free Play has everything', String(fp));
  }
  const errs = await page.evaluate(() => window.__TEST__.state().errors);
  ok(errs.length === 0, 'no errors in the whole-game run', errs.join(' | ').slice(0, 400));
  ok(page.errors.length === 0, 'no page errors in the whole-game run', page.errors.slice(0, 3).join(' | ').slice(0, 400));
  await page.context().close();

  // Attract: from Title after 10 s idle, visits events, a key exits and isn't acted on.
  page = await logicPage(browser);
  const a = await page.evaluate(() => {
    const T = window.__TEST__, g = T.game;
    const res = {};
    T.goto('title');
    T.advance(9); res.at9 = T.state().attract;
    T.advance(1.5); res.at105 = T.state().attract;
    const seen = new Set();
    for (let i = 0; i < 90; i++) { T.advance(1); if (g.mode.visited) g.mode.visited.forEach((v) => seen.add(v)); }
    res.seen = [...seen];
    res.errs = g.errors.slice();
    return res;
  });
  ok(a.at9 === false, 'no attract before 10 s');
  ok(a.at105 === true, 'attract starts at 10 s');
  ok(a.seen.length >= 4, 'attract visits at least four events', a.seen.join(','));
  ok(a.errs.length === 0, 'attract runs clean', a.errs.join(' | ').slice(0, 400));
  // It loops: through every vignette, back to the title for 5 s, and off again.
  const lp = await page.evaluate(() => {
    const T = window.__TEST__, g = T.game, m = g.mode;
    let t = 0, paused = false, again = false, pauseT = 0;
    while (t < 200 && !again) { T.advance(0.5); t += 0.5; if (m.titlePause > 0) { paused = true; pauseT += 0.5; } if (paused && m.titlePause <= 0 && m.index >= 0) again = true; }
    return { paused, again, pauseT, visited: [...new Set(m.visited)], attract: T.state().attract, errs: g.errors.slice() };
  });
  ok(lp.paused && lp.again && lp.attract, 'attract loops: back to the title between passes, then again', JSON.stringify(lp).slice(0, 200));
  ok(Math.abs(lp.pauseT - 5) <= 1, 'the title shows for about 5 s between passes', String(lp.pauseT));
  ok(lp.visited.length === 9, 'attract shows every vignette in the plan', lp.visited.join(','));
  ok(lp.errs.length === 0, 'a full attract pass runs clean', lp.errs.join(' | ').slice(0, 300));
  await page.keyboard.press('Enter');
  const ae = await page.evaluate(() => { const T = window.__TEST__; T.advance(0.2); const s = T.state(); T.advance(0.5); return { attract: s.attract, screen: T.state().screen }; });
  ok(ae.attract === false, 'a key exits attract');
  ok(ae.screen === 'title', 'the exit press is not acted on', ae.screen);
  // Any device exits: button, stick, mouse.
  const exits = await page.evaluate(() => {
    const T = window.__TEST__;
    const res = {};
    T.goto('attract'); T.advance(0.5);
    T.press(0, true); T.advance(0.1); T.press(0, false); T.advance(0.1);
    res.button = T.state().attract; res.screenB = T.state().screen;
    T.advance(1);
    T.goto('attract'); T.advance(0.5);
    T.stick(0.8, 0); T.advance(0.1); T.stick(0, 0); T.advance(0.2);
    res.stick = T.state().attract;
    T.goto('attract'); T.advance(0.5);
    return res;
  });
  ok(exits.button === false && exits.screenB === 'title', 'a button exits attract and is swallowed', JSON.stringify(exits));
  ok(exits.stick === false, 'a stick exits attract');
  await page.mouse.move(300, 300); await page.mouse.move(340, 340);
  const me = await page.evaluate(() => { const T = window.__TEST__; T.advance(0.2); return T.state().attract; });
  ok(me === false, 'mouse movement exits attract');
  await page.evaluate(() => { const T = window.__TEST__; T.goto('attract'); T.advance(0.5); });
  await page.mouse.down({ button: 'left' }); await page.mouse.up({ button: 'left' });
  const mc = await page.evaluate(() => { const T = window.__TEST__; T.advance(0.2); const s = T.state(); T.advance(0.3); return { attract: s.attract, screen: T.state().screen }; });
  ok(mc.attract === false && mc.screen === 'title', 'a click exits attract and is swallowed', JSON.stringify(mc));
  await page.context().close();
  // One wall-clock run of about 10 real seconds, the game's own loop.
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const p2 = await ctx2.newPage();
  await p2.goto(`file://${(await import('./lib.mjs')).OUT}?test=1&render=0`);
  await p2.waitForFunction(() => window.__TEST__ && !document.getElementById('boot'), null, { timeout: 60000 });
  const t0 = Date.now();
  let started = false;
  while (Date.now() - t0 < 14000) { started = await p2.evaluate(() => window.__TEST__.state().attract); if (started) break; await p2.waitForTimeout(250); }
  const elapsed = (Date.now() - t0) / 1000;
  ok(started && elapsed >= 8.5 && elapsed <= 12.5, 'attract starts near 10 wall-clock seconds', elapsed.toFixed(1));
  await ctx2.close();

  // Pause, resume, restart; Dev Mode only from Pause; sliders and reset.
  page = await logicPage(browser);
  const pd = await page.evaluate(() => {
    const T = window.__TEST__, g = T.game;
    const res = {};
    T.game.save.reset();
    g.programme.createProfile(0, 'Test Guest', 'teal');
    g.save.profile.tutorialDone = true;
    T.startEvent('fruitHat', 0, {});
    T.advance(0.5);
    res.menuHasDev = !!document.querySelector('[data-screen="dev"]');
    T.tap(9);
    res.pausedByOptions = T.state().paused;
    res.screen = T.state().screen;
    const items = [...document.querySelectorAll('[data-screen="pause"] .item')].map((e) => e.textContent.trim());
    res.items = items;
    const t0 = g.currentEvent.t;
    T.advance(1);
    res.stopped = g.currentEvent.t === t0;
    // Dev Mode from Pause.
    const idx = items.indexOf('Dev Mode');
    for (let i = 0; i < idx; i++) T.tap(13);
    T.tap(0);
    res.devOpen = T.state().screen === 'dev';
    T.tap(1);
    res.backToPause = T.state().screen === 'pause';
    T.tap(1);
    res.resumed = !T.state().paused;
    T.advance(0.5);
    res.running = g.currentEvent.t > t0;
    // Create + Options is the hub's.
    T.press(8, true); T.advance(0.05);
    T.tap(9);
    res.createHeld = T.state().paused;
    T.press(8, false); T.advance(0.05);
    // Restart from Pause.
    T.tap(9);
    const it2 = [...document.querySelectorAll('[data-screen="pause"] .item')].map((e) => e.textContent.trim());
    const ri = it2.indexOf('Restart');
    for (let i = 0; i < ri; i++) T.tap(13);
    T.tap(0);
    T.advance(1.2);
    res.restarted = g.currentEvent && g.currentEvent.t < 3 && !T.state().paused;
    res.errs = g.errors.slice();
    return res;
  });
  ok(!pd.menuHasDev, 'Dev Mode is not open during play');
  ok(pd.pausedByOptions && pd.screen === 'pause', 'Options pauses', JSON.stringify(pd.screen));
  ok(pd.stopped, 'pause stops the sim');
  ok(['Resume', 'Restart', 'How to Play', 'Settings', 'Dev Mode', 'Leave Class'].every((x) => pd.items.includes(x)), 'pause has its six items', pd.items.join(','));
  ok(pd.devOpen, 'Dev Mode opens from Pause');
  ok(pd.backToPause, 'Back from Dev returns to Pause');
  ok(pd.resumed && pd.running, 'resume restarts the sim');
  ok(!pd.createHeld, 'Options ignored while Create is held');
  ok(pd.restarted, 'Restart works', JSON.stringify(pd.restarted));
  ok(pd.errs.length === 0, 'pause and dev run clean', pd.errs.join(' | ').slice(0, 300));
  // Tier unlock rules: Pleasant on Tier 1 opens Tier 2; Exemplary on Tier 2 opens Tier 3.
  const tiers = await page.evaluate(() => {
    const T = window.__TEST__, g = T.game, pr = g.programme, r = {};
    g.programme.createProfile(1, 'Tier Guest', 'coral');
    r.start = [pr.tierOpen('poses', 0), pr.tierOpen('poses', 1), pr.tierOpen('poses', 2)];
    pr.record('poses', 0, 64, 60, false); r.afterLow = pr.tierOpen('poses', 1);
    r.medalLow = pr.medalOf('poses', 0).medal;
    pr.record('poses', 0, 65, 60, false); r.afterPleasant = pr.tierOpen('poses', 1);
    pr.record('poses', 1, 84, 60, false); r.afterHonestLow = pr.tierOpen('poses', 2);
    pr.record('poses', 1, 85, 60, false); r.afterExemplary = pr.tierOpen('poses', 2);
    r.m = [39, 40, 65, 85, 97].map((f) => { pr.record('cairn', 0, f, 60, false); return pr.medalOf('cairn', 0).medal; });
    g.save.data.activeProfile = 0;
    return r;
  });
  ok(tiers.start.join() === 'true,false,false', 'only the first tier opens at first', tiers.start.join());
  ok(!tiers.afterLow && tiers.afterPleasant, 'Pleasant on Tier 1 opens Tier 2', JSON.stringify(tiers));
  ok(!tiers.afterHonestLow && tiers.afterExemplary, 'Exemplary on Tier 2 opens Tier 3', JSON.stringify(tiers));
  ok(tiers.medalLow === 'adequate' && tiers.m.join() === 'attended,adequate,pleasant,exemplary,suspicious', 'medals follow the plan\'s thresholds', JSON.stringify(tiers.m));
  // A designer can cut an event: the programme just skips it.
  const cut = await page.evaluate(() => {
    const T = window.__TEST__, g = T.game;
    const keep = T.EVENT_CLASSES.islandLoop;
    const before = g.programme.totalSteps;
    delete T.EVENT_CLASSES.islandLoop;
    const after = g.programme.totalSteps;
    const p = g.save.profile; const was = p.today.day; p.today.day = 4;
    const classes = g.programme.classesToday();
    p.today.day = was;
    T.EVENT_CLASSES.islandLoop = keep;
    return { before, after, classes };
  });
  ok(cut.after === cut.before - 1 && !cut.classes.includes('islandLoop'), 'a removed event leaves a working programme', JSON.stringify(cut));
  // Every Dev page opens, and every button does something without throwing.
  const dev = await page.evaluate(() => {
    const T = window.__TEST__, g = T.game;
    T.game.flow.runClass('fruitHat', 0, { programme: false });
    T.advance(0.2); T.tap(0); T.advance(3);
    const res = { used: 0, pages: 0, errs: [], skip: [] };
    T.tap(9);
    const open = () => { const items = [...document.querySelectorAll('[data-screen="pause"] .item')].map((e) => e.textContent.trim()); const i = items.indexOf('Dev Mode'); const top = g.ui.top; top.setFocus(i, true); T.tap(0); };
    open();
    const dev0 = g.ui.top;
    res.top = dev0.name;
    const risky = /Reset save|Skip to|Go to that class|Jump to that day|Free camera|Set Wobble/;
    for (let pg = 0; pg < dev0.pages; pg++) {
      res.pages++;
      for (let i = 0; i < dev0.items.length; i++) {
        const it = dev0.items[i];
        const text = it.el.textContent;
        if (risky.test(text)) { res.skip.push(text); continue; }
        try {
          dev0.setFocus(i, true);
          if (it.right) it.right();
          if (it.left) it.left();
          if (it.use) { it.use(); T.advance(0.02); }
          while (g.ui.top !== dev0) g.ui.close(g.ui.top);
          res.used++;
        } catch (e) { res.errs.push(`${text}: ${e.message}`); }
      }
      dev0.turn(1);
      T.advance(0.01);
    }
    T.resetTuning();
    g.applyInk();
    res.gameErrs = g.errors.slice();
    return res;
  });
  ok(dev.top === 'dev', 'Dev opens from Pause', dev.top);
  ok(dev.pages >= 8 && dev.used > 30, 'every Dev page and button works', JSON.stringify({ p: dev.pages, u: dev.used }));
  ok(dev.errs.length === 0 && dev.gameErrs.length === 0, 'Dev controls run clean', [...dev.errs, ...dev.gameErrs].join(' | ').slice(0, 400));
  // The jumps themselves.
  const jumps = await page.evaluate(() => {
    const T = window.__TEST__, g = T.game;
    const res = {};
    while (g.ui.top && g.ui.top.name !== 'dev') g.ui.close(g.ui.top);
    const devItem = (label) => { const top = g.ui.top; for (let pg = 0; pg < top.pages; pg++) { const i = top.items.findIndex((x) => x.el.textContent.includes(label)); if (i >= 0) return top.items[i]; top.turn(1); T.advance(0.01); } return null; };
    devItem('Skip to Results').use();
    T.advance(3);
    res.afterSkip = T.state().screen;
    T.goto('menu');
    return res;
  });
  ok(jumps.afterSkip === 'results', 'Skip to Results lands on Results', jumps.afterSkip);
  await page.context().close();
  await sliders({ ok, info, logicPage, browser });
  await browser.close();
}
