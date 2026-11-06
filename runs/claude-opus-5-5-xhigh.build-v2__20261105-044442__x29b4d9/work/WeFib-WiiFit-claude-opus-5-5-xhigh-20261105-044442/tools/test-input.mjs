// Every verb from each device, prompts, glyphs, menus by each device, hover, click, four pads.
export default async function ({ ok, launch, logicPage }) {
  const browser = await launch();
  const page = await logicPage(browser);
  const glyphs = () => page.evaluate(() => [...document.querySelectorAll('.hud-prompts [data-glyph]')].map((e) => e.dataset.glyph));
  await page.evaluate(() => { const T = window.__TEST__; T.game.save.reset(); T.goto('title'); T.advance(0.2); });
  // Same game effect from pad, keys and mouse.
  const startIn = (id) => page.evaluate((id) => { const T = window.__TEST__; T.startEvent(id, 0, {}); T.advance(0.2); }, id);
  await startIn('poses');
  // Pad: stick leans.
  let r = await page.evaluate(() => { const T = window.__TEST__; T.stick(0.9, 0); T.advance(1.5); const s = T.state(); T.stick(0, 0); T.advance(0.2); return { x: s.event.lanes[0].cob[0], dev: s.input.lastDevice }; });
  ok(r.x > 0.3 && r.dev === 'pad', 'pad stick leans', JSON.stringify(r));
  const g1 = await glyphs();
  ok(g1.some((x) => x.startsWith('ps:')), 'prompts show PlayStation glyphs for the pad', g1.join(','));
  await page.evaluate(() => { const T = window.__TEST__; T.settings.glyphs = 'xbox'; T.advance(0.05); });
  const g2 = await glyphs();
  ok(g2.some((x) => x.startsWith('xb:')), 'Xbox glyph option', g2.join(','));
  await page.evaluate(() => { const T = window.__TEST__; T.settings.glyphs = 'ps'; });
  // Keys: A moves the ring, which stays.
  await page.keyboard.down('KeyD');
  r = await page.evaluate(() => { const T = window.__TEST__; T.advance(0.6); return T.state().event.lanes[0].wish; });
  await page.keyboard.up('KeyD');
  const r2 = await page.evaluate(() => { const T = window.__TEST__; T.advance(0.5); return T.state().event.lanes[0].wish; });
  ok(r[0] > 0.8 && Math.abs(r2[0] - r[0]) < 0.05, 'a held key moves the asking ring and it stays', JSON.stringify([r, r2]));
  const g3 = await glyphs();
  ok(g3.some((x) => x.startsWith('key:')) && g3.some((x) => x.startsWith('mouse:')), 'prompts switch to keys and mouse the same frame', g3.join(','));
  await page.keyboard.press('KeyC');
  const r3 = await page.evaluate(() => { const T = window.__TEST__; T.advance(0.1); return T.state().event.lanes[0].wish; });
  ok(Math.hypot(r3[0], r3[1]) < 0.01, 'C recentres the ring', JSON.stringify(r3));
  // Mouse: pointer offset from the centre gives weight.
  await page.mouse.move(960, 540); await page.mouse.move(960 + 178, 540);
  const m = await page.evaluate(() => { const T = window.__TEST__; T.advance(0.2); return T.state().event.lanes[0].wish; });
  ok(Math.abs(m[0] - 0.5) < 0.08, 'mouse pointer asks for weight, normalised by a third of the height', JSON.stringify(m));
  // Feet from each device.
  await startIn('logReps');
  r = await page.evaluate(() => { const T = window.__TEST__; const i = T.game.currentEvent.lanes[0]; T.press(6, true); T.press(7, true); T.advance(0.2); const d = i.depth; T.press(6, false); T.press(7, false); T.advance(0.1); return { d, dev: i.input.device }; });
  ok(r.d > 0.9, 'pad triggers sink in Log Reps', JSON.stringify(r));
  await page.keyboard.down('KeyQ'); await page.keyboard.down('KeyE');
  r = await page.evaluate(() => { const T = window.__TEST__; const l = T.game.currentEvent.lanes[0]; T.advance(1); return { d: l.depth, f: [l.input.footL, l.input.footR], dev: l.input.device }; });
  ok(r.d > 0.3, 'Q and E ramp depth at the tempo', JSON.stringify(r));
  await page.keyboard.up('KeyQ'); await page.keyboard.up('KeyE');
  await page.mouse.down({ button: 'left' }); await page.mouse.down({ button: 'right' });
  r = await page.evaluate(() => { const T = window.__TEST__; const l = T.game.currentEvent.lanes[0]; T.advance(0.3); return { f: [l.input.footL, l.input.footR], hop: l.input.hop }; });
  ok(r.f[0] > 0.9 && r.f[1] > 0.9 && r.hop, 'both mouse buttons register together', JSON.stringify(r));
  await page.mouse.up({ button: 'left' }); await page.mouse.up({ button: 'right' });
  await page.evaluate(() => window.__TEST__.advance(0.2));
  // Flail, hop, breathe from each device.
  await startIn('fruitHat');
  const verb = (fn) => page.evaluate(fn);
  r = await verb(() => { const T = window.__TEST__, l = T.game.currentEvent.lanes[0]; T.tap(2); return l.bal.flailCool > 0; });
  ok(r, 'pad Square flails');
  await page.evaluate(() => { const T = window.__TEST__, l = T.game.currentEvent.lanes[0]; l.bal.flailCool = 0; });
  await page.keyboard.press('KeyF');
  r = await page.evaluate(() => { const T = window.__TEST__, l = T.game.currentEvent.lanes[0]; T.advance(0.05); return l.bal.flailCool > 0; });
  ok(r, 'F flails');
  await page.evaluate(() => { const T = window.__TEST__, l = T.game.currentEvent.lanes[0]; l.bal.flailCool = 0; });
  await page.mouse.down({ button: 'middle' }); await page.mouse.up({ button: 'middle' });
  r = await page.evaluate(() => { const T = window.__TEST__, l = T.game.currentEvent.lanes[0]; T.advance(0.05); return l.bal.flailCool > 0; });
  ok(r, 'middle button flails, even pressed and released between polls');
  await startIn('poses');
  r = await page.evaluate(() => { const T = window.__TEST__, l = T.game.currentEvent.lanes[0]; T.press(5, true); T.advance(0.1); const a = l.input.breathe; T.press(5, false); T.advance(0.1); return a; });
  ok(r, 'R1 breathes');
  await page.keyboard.down('ShiftLeft');
  r = await page.evaluate(() => { const T = window.__TEST__, l = T.game.currentEvent.lanes[0]; T.advance(0.1); return l.input.breathe; });
  await page.keyboard.up('ShiftLeft');
  ok(r, 'Shift breathes');
  // Quick taps between polls and synthetic code letters.
  await page.evaluate(() => { const T = window.__TEST__; T.goto('fruitHat' && 'menu'); T.advance(0.3); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown', key: 'ArrowDown' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowDown', key: 'ArrowDown' })); });
  r = await page.evaluate(() => { const T = window.__TEST__; T.advance(0.02); return T.state().focus; });
  ok(r === 1, 'a key tapped between two polls still counts', String(r));
  await page.evaluate(() => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 's', key: 's' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 's', key: 's' })); });
  r = await page.evaluate(() => { const T = window.__TEST__; T.advance(0.02); return T.state().focus; });
  ok(r === 2, "a synthetic event whose code is just 's' counts", String(r));
  // Menus: pad alone, keys alone, mouse alone. Hover moves focus; a parked mouse doesn't.
  r = await page.evaluate(() => { const T = window.__TEST__; T.goto('menu'); T.advance(0.2); T.tap(13); T.tap(13); const a = T.state().focus; T.tap(12); const b = T.state().focus; T.tap(0); T.advance(0.3); return { a, b, s: T.state().screen }; });
  ok(r.a === 2 && r.b === 1 && r.s === 'group' || r.s === 'lobby', 'menus by pad alone', JSON.stringify(r));
  await page.evaluate(() => { const T = window.__TEST__; T.goto('menu'); T.advance(0.2); });
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown');
  r = await page.evaluate(() => { const T = window.__TEST__; T.advance(0.02); return T.state().focus; });
  ok(r >= 1, 'menus by keys alone', String(r));
  const box = await page.evaluate(() => { const T = window.__TEST__; T.goto('menu'); T.advance(0.2); const e = document.querySelectorAll('[data-screen="menu"] .item')[4].getBoundingClientRect(); return { x: e.left + e.width / 2, y: e.top + e.height / 2 }; });
  await page.mouse.move(box.x, box.y); await page.mouse.move(box.x + 3, box.y + 1);
  r = await page.evaluate(() => { const T = window.__TEST__; T.advance(0.02); return T.state().focus; });
  ok(r === 4, 'hover moves the focus', String(r));
  await page.evaluate(() => { const T = window.__TEST__; T.goto('menu'); T.advance(0.2); });
  r = await page.evaluate(() => { const T = window.__TEST__; T.advance(0.2); return T.state().focus; });
  ok(r === 0, 'a parked mouse under a new menu does not steal focus', String(r));
  await page.mouse.click(box.x, box.y);
  r = await page.evaluate(() => { const T = window.__TEST__; T.advance(0.1); return T.state().screen; });
  ok(r === 'settings', 'clicks activate', r);
  await page.mouse.click(box.x, box.y, { button: 'right' });
  r = await page.evaluate(() => { const T = window.__TEST__; T.advance(0.1); return T.state().screen; });
  ok(r === 'menu', 'right click is Back in menus', r);
  // Touch-free keyboard back.
  await page.evaluate(() => { const T = window.__TEST__; T.goto('settings'); T.advance(0.1); });
  await page.keyboard.press('Escape');
  r = await page.evaluate(() => { const T = window.__TEST__; T.advance(0.1); return T.state().screen; });
  ok(r === 'menu', 'Esc is Back', r);
  // Esc pauses, and Esc resumes: not close and reopen. Options does both as well. Back over a menu doesn't pause.
  await page.evaluate(() => { const T = window.__TEST__; T.startEvent('fruitHat', 0, {}); T.advance(0.2); });
  await page.keyboard.press('Escape');
  const p1 = await page.evaluate(() => { const T = window.__TEST__; T.advance(0.05); return T.state().paused; });
  await page.keyboard.press('Escape');
  const p2 = await page.evaluate(() => { const T = window.__TEST__; T.advance(0.05); return T.state().paused; });
  ok(p1 === true && p2 === false, 'Esc pauses and Esc resumes', JSON.stringify([p1, p2]));
  const p3 = await page.evaluate(() => { const T = window.__TEST__; T.tap(9); const a = T.state().paused; T.tap(9); return [a, T.state().paused]; });
  ok(p3[0] === true && p3[1] === false, 'Options pauses and resumes', JSON.stringify(p3));
  await page.evaluate(() => {
    const T = window.__TEST__, g = T.game;
    g.programme.createProfile(0, 'Test Guest', 'teal');
    const p = g.save.profile;
    p.tutorialDone = true; p.today.checkin = true; p.today.question = true;
    T.goto('island', {}); T.advance(0.3); T.tap(3); g.speech.clear(); T.advance(0.05);
  });
  await page.keyboard.press('Escape');
  const p4 = await page.evaluate(() => { const T = window.__TEST__; T.advance(0.05); return { paused: T.state().paused, stack: T.state().stack }; });
  ok(!p4.paused && !p4.stack.includes('plan'), 'Esc closes a menu without pausing', JSON.stringify(p4));
  await page.keyboard.press('Escape');
  const p5 = await page.evaluate(() => { const T = window.__TEST__; T.advance(0.05); const items = [...document.querySelectorAll('[data-screen="pause"] .item')]; const i = items.findIndex((e) => e.textContent.trim() === 'Leave'); T.game.ui.top.setFocus(i, true); T.tap(0); T.advance(1); return T.state().screen; });
  ok(p5 === 'menu', 'Leave from the island goes to the menu', p5);
  await page.evaluate(() => { const T = window.__TEST__; T.game.save.reset(); T.goto('menu'); T.advance(0.1); });
  // A pad going away mid-class pauses, and says so.
  const dc = await page.evaluate(() => {
    const T = window.__TEST__;
    T.startEvent('poses', 0, {}); T.stick(0.4, 0); T.advance(0.3);
    const keep = window.__pads;
    window.__pads = [];
    T.advance(0.1);
    const r = { paused: T.state().paused, text: document.querySelector('[data-screen="pause"]')?.textContent || '' };
    window.__pads = keep; T.stick(0, 0);
    T.goto('menu');
    return r;
  });
  ok(dc.paused && /disconnected/i.test(dc.text), 'a pad disconnecting mid-class pauses and says so', JSON.stringify(dc).slice(0, 200));
  // Nonsense exclamations are written as well as said.
  const ex = await page.evaluate(() => {
    const T = window.__TEST__, sp = T.game.speech, seen = [];
    for (let i = 0; i < 7; i++) { const l = sp.say('trudy', 'Tidy.', { auto: 1 }); seen.push(l.text); }
    sp.clear();
    const blocking = sp.say('trudy', 'Oh.', {}).text;
    for (let i = 0; i < 12; i++) sp.say('trudy', 'Oh.', {});
    sp.clear();
    return { some: seen.filter((t) => t !== 'Tidy.'), blocking };
  });
  ok(ex.some.length >= 1 && ex.some[0].endsWith('Tidy.'), 'passing remarks sometimes open with nonsense', JSON.stringify(ex.some));
  ok(ex.blocking === 'Oh.', 'story lines are left exactly as written', ex.blocking);
  // The island by keyboard and mouse: walk, hover, click to walk and use, look, zoom, plan.
  await page.evaluate(() => {
    const T = window.__TEST__, g = T.game;
    g.programme.createProfile(0, 'Test Guest', 'teal');
    const p = g.save.profile;
    p.tutorialDone = true; p.today.checkin = true; p.today.question = true;
    T.goto('island', {}); T.advance(0.5); g.speech.clear();
  });
  await page.keyboard.down('KeyW');
  const wk = await page.evaluate(() => { const T = window.__TEST__, a = T.game.phys.pos.z; T.advance(0.6); return { a, b: T.game.phys.pos.z }; });
  await page.keyboard.up('KeyW');
  ok(Math.abs(wk.b - wk.a) > 1, 'W walks on the island', JSON.stringify(wk));
  const anchor = await page.evaluate(() => {
    const T = window.__TEST__, g = T.game, h = g.mode;
    T.advance(0.3);
    const s = h.spots.find((x) => x.id === 'jar');
    const v = new T.THREE.Vector3(s.x, s.y * 0.7, s.z);
    g.art.group.updateWorldMatrix(true, false);
    v.applyMatrix4(g.art.group.matrixWorld).project(g.camera);
    return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight, front: v.z < 1 };
  });
  await page.mouse.move(anchor.x - 5, anchor.y); await page.mouse.move(anchor.x, anchor.y);
  const hv = await page.evaluate(() => { const T = window.__TEST__, h = T.game.mode; T.advance(0.05); return { hover: h.hover && h.hover.id, focus: h.focus && h.focus.id, label: h.label.textContent, outline: !!(T.game.mode && true) }; });
  ok(anchor.front && hv.hover === 'jar' && hv.focus === 'jar' && /Jar/.test(hv.label), 'hovering a place on the island focuses and labels it', JSON.stringify(hv));
  await page.mouse.down({ button: 'left' }); await page.mouse.up({ button: 'left' });
  const ck = await page.evaluate(() => { const T = window.__TEST__, g = T.game, h = g.mode; T.advance(0.05); const set = !!h.walkTo; const a = g.phys.pos; const d0 = Math.hypot(a.x + 3, a.z + 4); let t = 0; while (h.walkTo && t < 12) { T.advance(0.25); t += 0.25; } const b = g.phys.pos; return { set, d0, d1: Math.hypot(b.x + 3, b.z + 4), line: T.state().speech }; });
  ok(ck.set && ck.d1 < ck.d0 && ck.d1 < 5 && /marbles/.test(ck.line || ''), 'left click walks there and uses it', JSON.stringify(ck));
  await page.evaluate(() => window.__TEST__.game.speech.clear());
  const orbit0 = await page.evaluate(() => window.__TEST__.game.mode.orbit);
  await page.mouse.move(600, 500); await page.mouse.down({ button: 'right' }); await page.mouse.move(800, 500);
  const orbit1 = await page.evaluate(() => { const T = window.__TEST__; T.advance(0.05); return T.game.mode.orbit; });
  await page.mouse.up({ button: 'right' });
  ok(orbit1 !== orbit0, 'holding the right button and dragging looks around', `${orbit0} ${orbit1}`);
  const zoom0 = await page.evaluate(() => { const T = window.__TEST__; T.advance(0.3); return T.game.mode.dist; });
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(150); // Playwright's wheel does not wait for delivery.
  const zoom1 = await page.evaluate(() => { const T = window.__TEST__; T.advance(0.05); return T.game.mode.dist; });
  ok(zoom1 !== zoom0, 'the wheel zooms', `${zoom0} ${zoom1}`);
  await page.keyboard.press('KeyT');
  const tp = await page.evaluate(() => { const T = window.__TEST__; T.advance(0.05); return T.state().screen; });
  ok(tp === 'plan', 'T opens the plan', tp);
  await page.evaluate(() => { const T = window.__TEST__; T.game.ui.close(T.game.ui.top); T.game.speech.clear(); T.game.save.reset(); T.goto('menu'); T.advance(0.1); });
  // Four pads join Group Class, each controls its own lane.
  r = await page.evaluate(() => {
    const T = window.__TEST__, g = T.game;
    const make = (i) => ({ connected: true, mapping: 'standard', index: i, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), vibrationActuator: { playEffect() { return Promise.resolve(); } } });
    window.__pads = [make(0), make(1), make(2), make(3)];
    const tap = (i, b) => { window.__pads[i].buttons[b].pressed = true; window.__pads[i].buttons[b].value = 1; T.advance(0.03); window.__pads[i].buttons[b].pressed = false; window.__pads[i].buttons[b].value = 0; T.advance(0.03); };
    T.goto('group');
    T.advance(0.4);
    for (let i = 0; i < 4; i++) tap(i, 0);
    const seats = g.mode.seats.filter(Boolean).map((s) => s.source);
    g.mode.playlist = ['poses'];
    g.mode.runNext();
    T.advance(1);
    const run = g.mode.sub;
    const startLanes = run && run.ev ? run.ev.lanes.length : 0;
    // Through the intro and countdown.
    tap(0, 0);
    T.advance(3);
    window.__pads[2].axes[0] = 0.9;
    T.advance(1.5);
    const ev = g.mode.sub.ev;
    const wish = ev.lanes.map((l) => l.input.wishX);
    const dot = ev.lanes.map((l) => l.cobX);
    window.__pads[2].axes[0] = 0;
    return { seats, startLanes, wish, dot, stage: g.mode.sub.stage, errs: g.errors.slice() };
  });
  ok(r.seats.length === 4 && r.seats[3] === 'pad:3', 'four pads join Group Class', JSON.stringify(r.seats));
  ok(r.startLanes === 4, 'four lanes', String(r.startLanes));
  ok(Math.abs(r.wish[2]) > 0.5 && Math.abs(r.wish[0]) < 0.1 && Math.abs(r.wish[1]) < 0.1, 'each pad controls its own lane', JSON.stringify(r.wish));
  ok(r.errs.length === 0, 'Group Class runs clean', r.errs.join('|').slice(0, 300));
  // Tippy Raft with four bots has a winner.
  r = await page.evaluate(() => {
    const T = window.__TEST__, g = T.game;
    window.__pads = [];
    T.startEvent('raft', 0, { lanes: [0, 1, 2, 3].map((i) => ({ kind: 'bot', skill: ['sharp', 'average', 'average', 'clumsy'][i], name: `B${i}`, colour: '#fff' })), mode: 'group' });
    const ev = g.currentEvent;
    let t = 0;
    const rounds = [];
    let last = 0;
    while (t < 400 && !ev.isDone()) { T.advance(1); t++; if (ev.stage === 'between' && ev.waitT > 3) { rounds.push(ev.roundT); } }
    void last;
    return { done: ev.isDone(), wins: ev.wins, t, rounds };
  });
  ok(r.done && Object.keys(r.wins).length > 0, 'Tippy Raft has a winner', JSON.stringify(r));
  ok(r.rounds.every((x) => x <= 90), 'every Tippy Raft round ends within 90 s', JSON.stringify(r.rounds));
  ok(page.errors.length === 0, 'input tests no page errors', page.errors.slice(0, 3).join('|').slice(0, 300));
  await page.context().close();
  await browser.close();
}
