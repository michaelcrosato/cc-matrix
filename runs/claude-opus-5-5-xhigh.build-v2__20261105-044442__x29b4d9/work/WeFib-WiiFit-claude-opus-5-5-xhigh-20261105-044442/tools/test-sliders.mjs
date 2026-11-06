// Every Dev Mode slider, moved while the game runs and judged by what the game then does.
// The ink sliders need a renderer, so the rendered page in test.mjs covers those.
const INK = ['hull', 'lineWidth', 'boil', 'grain'];

export default async function ({ ok, info, logicPage, browser }) {
  const page = await logicPage(browser);
  const rows = await page.evaluate(() => {
    const T = window.__TEST__, g = T.game, STEP = 1 / 120, out = [];
    g.save.reset(); g.programme.createProfile(0, 'Slider', 'teal'); g.save.profile.tutorialDone = true;
    const into = (id) => {
      T.resetTuning(); T.bot(null); T.stick(0, 0);
      T.startEvent(id, 0, {});
      const ev = g.currentEvent;
      for (let n = 0; ev.phase !== 'play' && n < 400; n++) T.advance(0.05);
      g.speech.clear();
      return { ev, l: ev.lanes[0], b: ev.lanes[0].bal };
    };
    // Measure, move the slider without restarting anything, measure again.
    const row = (key, value, want, fn) => { const a = fn(); T.tun[key] = value; const b = fn(); T.resetTuning(); out.push({ key, want, a, b }); };
    const quiet = () => { T.tun.swayScale = 0; T.tun.tremorScale = 0; };
    const upright = (b) => { b.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true); b.body.setAngvel({ x: 0, y: 0, z: 0 }, true); };
    const peak = (b, kick, secs = 0.6) => {
      upright(b); T.advance(0.1);
      b.body.setAngvel({ x: 0, y: 0, z: -kick }, true);
      let m = 0;
      for (let t = 0; t < secs; t += STEP) { T.advance(STEP); m = Math.max(m, b.lean); }
      return m * 57.3;
    };

    // Balance
    let s = into('poses');
    row('maxLean', 26, 'more', () => { T.stick(1, 0); T.advance(1.6); return s.b.lean * 57.3; });
    s = into('poses');
    row('margin', 1.5, 'less', () => { quiet(); return peak(s.b, 1); });
    s = into('poses');
    row('zeta', 1, 'less', () => {
      quiet(); peak(s.b, 1, 0);
      let sum = 0;
      for (let t = 0; t < 1.5; t += STEP) { T.advance(STEP); sum += s.b.lean; }
      return sum;
    });
    s = into('poses');
    row('ankleMax', 2.5, 'more', () => { quiet(); return peak(s.b, 2.2); });
    s = into('poses');
    row('fallAngle', 25, 'more', () => {
      // Push over to 32 degrees: past the moved limit, short of the default one.
      for (let n = 0; n < 240 && s.b.lean * 57.3 < 32 && !s.l.fallen; n++) { s.b.body.setAngvel({ x: 0, y: 0, z: -2 }, true); T.advance(STEP); }
      T.advance(STEP * 2);
      return s.l.fallen ? 1 : 0;
    });
    s = into('poses');
    row('reflex', 30, 'more', () => { T.stick(0, 0); T.advance(1); T.stick(1, 0); T.advance(STEP * 4); return Math.abs(s.b.wx); });
    s = into('poses');
    row('flailBoost', 1, 'more', () => { quiet(); s.b.flailLeft = 0.35; return peak(s.b, 3); });
    s = into('poses');
    row('flailCooldown', 5, 'more', () => { s.b.flailCool = 0; s.b.flail(); return s.b.flailCool; });
    s = into('stillWater');
    const wander = () => { let m = 0; T.advance(0.5); for (let t = 0; t < 3; t += STEP * 2) { T.advance(STEP * 2); m = Math.max(m, s.b.lean); } return m * 57.3; };
    row('swayScale', 3, 'more', () => { T.tun.tremorScale = 0; return wander(); });
    s = into('stillWater');
    row('tremorScale', 3, 'more', () => { T.tun.swayScale = 0; return wander(); });
    s = into('poses');
    row('recoverTime', 5, 'more', () => { s.ev.forceFall(0); const v = s.l.recoverT; T.advance(v + 1.5); return v; });
    s = into('poses');
    row('gravity', 15, 'more', () => { T.advance(STEP * 2); return Math.abs(s.ev.world.gravity.y); });

    // World: on the island itself.
    T.resetTuning(); T.goto('island', {}); T.advance(0.5); g.speech.clear();
    const ph = g.phys;
    row('islandWeight', 12, 'more', () => { ph.setPosition(12, 0); ph.tx = 0; ph.tz = 0; ph.vx = 0; ph.vz = 0; T.advance(0.1); return Math.abs(ph.tx); });
    row('islandSpring', 6, 'more', () => { ph.tx = 0.3; ph.tz = 0; ph.vx = 0; ph.vz = 0; T.advance(0.1); return Math.abs(ph.vx); });
    row('walkSpeed', 8, 'more', () => { T.stick(1, 0); T.advance(0.1); return Math.hypot(ph.wantX, ph.wantZ); });
    T.stick(0, 0);

    // Events
    s = into('fruitHat');
    row('fruitMass', 2, 'more', () => { s.ev.launch(s.l, 'fruit'); return s.ev.items[s.ev.items.length - 1].mass; });
    s = into('fruitHat');
    let thrown = 0;
    const realLaunch = s.ev.launch.bind(s.ev);
    s.ev.launch = (...a) => { thrown++; return realLaunch(...a); };
    row('fruitInterval', 3, 'less', () => { const n = thrown; T.advance(9); return thrown - n; });
    s = into('fruitHat');
    row('landingRadius', 3, 'more', () => {
      const r = s.ev.r; s.ev.r = () => 0.999;
      s.ev.launch(s.l, 'fruit'); s.ev.r = r;
      const it = s.ev.items[s.ev.items.length - 1];
      return Math.hypot(it.sx - s.l.x, it.sz);
    });
    s = into('cairn');
    row('stoneMass', 2, 'more', () => { s.ev.dropStone(s.l); return s.l.stones[s.l.stones.length - 1].body.collider(0).mass(); });
    s = into('cairn');
    row('stoneInterval', 3, 'more', () => { const p = s.ev.placed; for (let n = 0; n < 800 && s.ev.placed === p; n++) T.advance(STEP * 6); return s.ev.next; });
    s = into('poses');
    row('ringEnd', 3, 'more', () => s.ev.ringEnd());
    s = into('roomService');
    row('gustForce', 2, 'more', () => { s.ev.scheduleGust(); const v = Math.abs(s.ev.gust.x); s.ev.gust = null; return v; });
    s = into('plates');
    row('plateDecay', 2, 'more', () => { const p = s.l.plates[0]; p.state = 'on'; p.energy = 0.9; s.l.hoop = 0; T.advance(0.1); return 0.9 - p.energy; });
    s = into('plates');
    row('plateGain', 2, 'more', () => { const p = s.l.plates[0]; p.state = 'on'; p.energy = 0.5; s.l.hoop = (p.band.lo + p.band.hi) / 2; T.advance(0.1); return p.energy - 0.5; });
    s = into('stepClass');
    row('rhythmWindow', 2, 'more', () => s.ev.windows().perfect);
    s = into('logReps');
    row('repTempo', 2, 'less', () => s.ev.repLength);
    s = into('springboard');
    row('boardGain', 2, 'more', () => {
      s.l.boardY = 0; s.l.boardV = 0; T.press(6); T.press(7); T.advance(0.1); T.press(6, false); T.press(7, false);
      return Math.abs(s.l.boardV);
    });
    s = into('springboard');
    s.ev.launch(s.l); T.stick(1, 0);
    row('airTorque', 2, 'more', () => { T.advance(0.25); return Math.abs(s.l.spin); });
    T.stick(0, 0);

    // Rewards: the same class recorded before and after moving the slider.
    T.goto('menu');
    g.programme.record('poses', 0, 70, 120, false);
    row('marblesPerMinute', 10, 'more', () => g.programme.record('poses', 0, 70, 120, false).marbles);
    const RANK = ['attended', 'adequate', 'pleasant', 'exemplary', 'suspicious'];
    row('medalScale', 2, 'less', () => RANK.indexOf(g.programme.record('poses', 0, 70, 60, false).medal.id));
    return out;
  });

  for (const { key, want, a, b } of rows) {
    const gap = (want === 'more' ? b - a : a - b), big = Math.max(Math.abs(a), Math.abs(b));
    ok(gap > 0.05 * big && gap > 0, `slider ${key} changes the running game`, `${a} then ${b}, wanted ${want}`);
    if (process.env.INFO) info('slider', key, a, '->', b);
  }

  // The Dev Mode screen itself: pad, mouse, and the reset, on the slider that used to do nothing until something else synced.
  const screen = await page.evaluate(() => {
    const T = window.__TEST__, g = T.game, o = {};
    T.resetTuning(); T.goto('island', {}); T.advance(0.5); g.speech.clear();
    g.phys.snapTilt();
    o.keys = Object.keys(T.tun);
    T.tap(9); T.advance(0.02);
    const items = () => [...document.querySelectorAll('[data-screen="pause"] .item')].map((e) => e.textContent.trim());
    o.pause = items();
    const dev = o.pause.indexOf('Dev Mode');
    for (let i = 0; i < dev; i++) T.tap(13);
    T.tap(0);
    o.devOpen = T.state().screen === 'dev';
    const top = g.ui.top;
    for (let n = 0; n < top.pages && !top.items.some((it) => it.el.textContent.startsWith('Island rest tilt')); n++) { top.turn(1); T.advance(0.01); }
    const at = top.items.findIndex((it) => it.el.textContent.startsWith('Island rest tilt'));
    o.found = at >= 0;
    o.rest0 = g.phys.rest;
    top.setFocus(at, true);
    T.tap(15);
    o.padValue = T.tun.islandRest; o.padRest = g.phys.rest;
    return o;
  });
  ok(screen.devOpen && screen.found, 'Dev Mode shows the island sliders', JSON.stringify(screen.pause));
  ok(screen.padValue === 9.5, 'the d-pad moves a slider one step', String(screen.padValue));
  ok(screen.padRest === 9.5 && screen.rest0 === 9, 'Island rest tilt reaches the island at once', `${screen.rest0} then ${screen.padRest}`);
  const box = await page.evaluate(() => {
    const it = window.__TEST__.game.ui.top.items.find((x) => x.el.textContent.startsWith('Island rest tilt'));
    const r = it.el.querySelector('.track').getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  });
  await page.mouse.click(box.x + box.w * 0.8, box.y + box.h / 2);
  const after = await page.evaluate(() => {
    const T = window.__TEST__, g = T.game, o = { mouseValue: T.tun.islandRest, mouseRest: g.phys.rest };
    const top = g.ui.top;
    for (let n = 0; n < top.pages && !top.items.some((it) => it.el.textContent.startsWith('Reset tuning')); n++) { top.turn(1); T.advance(0.01); }
    top.setFocus(top.items.findIndex((it) => it.el.textContent.startsWith('Reset tuning')), true);
    T.tap(0);
    o.resetValue = T.tun.islandRest; o.resetRest = g.phys.rest;
    T.tun.islandRest = 13; g.programme.syncIsland();
    T.tap(1); T.tap(1); T.advance(3);
    o.resumed = !T.state().paused; o.moved = g.phys.restNow;
    T.resetTuning(); g.programme.syncIsland();
    return o;
  });
  ok(after.mouseValue === 12 && after.mouseRest === 12, 'a mouse click sets the slider where it lands', `${after.mouseValue}, rest ${after.mouseRest}`);
  ok(after.resetValue === 9 && after.resetRest === 9, 'Reset tuning to defaults restores the value and the island', `${after.resetValue}, rest ${after.resetRest}`);
  ok(after.resumed && after.moved > 11, 'the island eases to the new tilt after resuming', String(after.moved));

  const tested = new Set([...rows.map((r) => r.key), 'islandRest', ...INK]);
  const missing = screen.keys.filter((k) => !tested.has(k));
  ok(missing.length === 0, 'every slider has its own check', missing.join());
  await page.context().close();
}
