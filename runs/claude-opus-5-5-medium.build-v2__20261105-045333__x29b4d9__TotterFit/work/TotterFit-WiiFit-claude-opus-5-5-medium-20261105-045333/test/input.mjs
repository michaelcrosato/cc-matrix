// Every verb from each device, same game effect. Prompts, menus, four pads.
const B = { cross: 0, circle: 1, square: 2, tri: 3, r1: 5, l2: 6, r2: 7, create: 8, opt: 9, up: 12, down: 13, left: 14, right: 15 };
export default async function ({ T, openPage, getBrowser }) {
  const b = await getBrowser(); const page = await openPage(b);
  const adv = (s) => page.evaluate((x) => __TEST__.advance(x), s);
  const st = () => page.evaluate(() => __TEST__.state());
  const setBtn = (i, n, v) => page.evaluate(([a, c, d]) => { const p = window.__pads[a]; p.connected = true; p.buttons[c] = { pressed: d > .5, value: d }; }, [i, n, v]);
  const tap = async (i, n) => { await setBtn(i, n, 1); await adv(.03); await setBtn(i, n, 0); await adv(.03); };
  const start = (id, extra = {}) => page.evaluate(([i, e]) => { const g = __TEST__.g; g.ui.closeAll(); g.scripts.clear(); g.speech.clear(); g.clearMode(); const ev = g.startEventMode(__TEST__.EVENTS[i], { tier: 0, ...e }, [{ kind: 'local', name: 'P', colour: '#E8443A' }]); ev.count = .01; }, [id, extra]);
  const lane = () => page.evaluate(() => { const l = __TEST__.g.mode.event.lanes[0]; return { x: l.bal?.cobX ?? 0, z: l.bal?.cobZ ?? 0, wx: l.wishX, wz: l.wishZ, flailN: l.flailN, banks: l.banks, hat: l.hatFruit?.length, steps: l.steps, in: l.in, combo: l.combo, depth: l.depth }; });
  const prompts = () => page.evaluate(() => [...document.querySelectorAll('[data-glyph]')].map(e => e.dataset.glyph));
  // PAD: lean, flail, feet
  await start('poses'); await page.evaluate(() => { const p = window.__pads[0]; p.connected = true; p.axes[0] = .8; }); await adv(2); let l = await lane(); T.ok(l.x > .3, `pad stick leans right, ${l.x}`); await page.evaluate(() => { window.__pads[0].axes[0] = 0; }); await adv(1);
  T.ok((await st()).input.lastDevice === 'pad', 'pad becomes last device'); T.ok((await prompts()).some(g => g.startsWith('ps:')), 'PlayStation glyphs for a pad');
  await tap(0, B.square); l = await lane(); T.eq(l.flailN, 1, 'Square flails');
  // Stick is screen-relative: up is away from the camera.
  await page.evaluate(() => { window.__pads[0].axes[1] = -1; }); await adv(1.5); l = await lane(); T.ok(l.z < -.3, `stick up leans away, ${l.z}`); await page.evaluate(() => { window.__pads[0].axes[1] = 0; }); await adv(.5);
  // Options with Create held is the hub's.
  await setBtn(0, B.create, 1); await tap(0, B.opt); await setBtn(0, B.create, 0); await adv(.05); T.eq((await st()).screen, 'play', 'Options ignored while Create is held');
  await tap(0, B.opt); T.eq((await st()).screen, 'pause', 'Options pauses'); await tap(0, B.circle); await adv(.05); T.eq((await st()).screen, 'play', 'Circle resumes');
  // Rotated cameras: stick right is screen right in The Cairn.
  await start('cairn'); await page.evaluate(() => { window.__pads[0].axes[0] = 1; }); await adv(.1); l = await lane(); T.ok(l.wx > .8 && l.wz > .3, `screen-relative rotate ${l.wx} ${l.wz}`); await page.evaluate(() => { window.__pads[0].axes[0] = 0; });
  // KEYBOARD: ring model, recentre, foot keys, flail, breath, latch of a quick tap.
  await start('poses'); await page.keyboard.press('KeyF'); await adv(.03); l = await lane(); T.eq(l.flailN, 1, 'F flails (tap between polls is latched)');
  T.eq((await st()).input.lastDevice, 'kbm', 'keyboard becomes last device'); T.ok((await prompts()).some(g => g.startsWith('kbm:')), 'keyboard prompts same frame');
  await page.keyboard.down('KeyD'); await adv(.3); await page.keyboard.up('KeyD'); await adv(.5); l = await lane(); T.ok(Math.abs(l.wx - .48) < .08, `key ring moves 1.6/s and stays: ${l.wx}`); await adv(.5); const l2 = await lane(); T.ok(Math.abs(l2.wx - l.wx) < .001, 'ring stays where you leave it'); await page.keyboard.press('KeyC'); await adv(.05); l = await lane(); T.ok(Math.abs(l.wx) < .001, 'C recentres');
  // synthetic hub-style events: code is just a
  await page.evaluate(() => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'a', key: 'a' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'a', key: 'a' })); }); await adv(.02); l = await lane(); T.ok(l.wx < 0, `code 'a' accepted like KeyA, ${l.wx}`); await page.keyboard.press('KeyC'); await adv(.05);
  await start('stepClass'); await page.keyboard.down('KeyQ'); await adv(.13); const q = await page.evaluate(() => __TEST__.g.input.kbm.lf); await page.keyboard.up('KeyQ'); await adv(.2); T.ok(q > .9, `Q ramps the left foot, ${q}`);
  await start('fruitHat'); await adv(.5); await page.keyboard.press('Space'); const sp = await page.evaluate(() => { const g = __TEST__.g; g.input.poll(1 / 120); return g.input.kbm.hop; }); T.ok(sp, 'Space hops, even as a quick tap');
  // MOUSE: pointer weight, both buttons, buttons bitmask, cursor hidden.
  await start('poses'); await page.mouse.move(960, 540); await page.mouse.move(960 + 356, 540, { steps: 3 }); await adv(.05); l = await lane(); T.ok(l.wx > .9, `pointer weight normalised by a third of the height, ${l.wx}`); T.ok(await page.evaluate(() => document.body.classList.contains('hidecursor')), 'cursor hidden in class');
  await page.mouse.move(960, 540, { steps: 2 }); await adv(.05);
  await start('roomService'); await adv(.1); await page.mouse.down({ button: 'left' }); await adv(.12); await page.mouse.up({ button: 'left' }); await adv(.1); l = await lane(); T.eq(l.steps, 1, 'left button is the left foot'); await page.mouse.down({ button: 'right' }); await adv(.12); await page.mouse.up({ button: 'right' }); await adv(.1); l = await lane(); T.eq(l.steps, 2, 'right button is the right foot');
  await start('fruitHat'); await adv(.2); await page.mouse.down({ button: 'left' }); await adv(.02); await page.mouse.down({ button: 'right' }); const chord = await page.evaluate(() => { __TEST__.g.input.poll(1 / 120); return __TEST__.g.input.kbm.hop || __TEST__.g.input.kbm.hopHeld; }); await page.mouse.up({ button: 'right' }); await page.mouse.up({ button: 'left' }); T.ok(chord, 'both buttons register together'); await adv(.1);
  await start('poses'); await page.mouse.click(960, 540, { button: 'middle' }); await adv(.03); l = await lane(); T.eq(l.flailN, 1, 'middle button flails');
  // Menus by pad alone, by keys alone, by mouse alone. Hover only when the pointer moved.
  await page.evaluate(() => { const g = __TEST__.g; g.ui.closeAll(); g.scripts.clear(); g.clearMode(); g.goTitle(true); __TEST__.Menus.openMenu(g); }); await adv(.05);
  const f0 = (await st()).focus; await tap(0, B.down); await adv(.05); const f1 = (await st()).focus; T.ok(f0 !== f1, `D-pad moves focus ${f0} ${f1}`);
  await page.evaluate(() => { const p = window.__pads[0]; p.axes[1] = 1; }); await adv(.05); const f2 = (await st()).focus; await page.evaluate(() => { window.__pads[0].axes[1] = 0; }); await adv(.05); T.ok(f2 !== f1, 'stick moves focus');
  await page.keyboard.press('ArrowDown'); await adv(.05); const f3 = (await st()).focus; T.ok(f3 !== f2, 'arrows move focus'); await page.keyboard.press('KeyW'); await adv(.05); T.ok((await st()).focus === f2, 'W moves focus');
  // Settings by mouse: hover, click, right click back.
  const pos = await page.evaluate(() => { const it = __TEST__.g.ui.focus.items().find(i => /Settings/.test(i.textContent)); const r = it.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await page.mouse.move(pos[0] - 3, pos[1]); await page.mouse.move(pos[0], pos[1]); await adv(.05); T.ok(/Settings/.test((await st()).focus), `hover moves the focus, on ${(await st()).focus}`);
  await page.mouse.click(pos[0], pos[1]); await adv(.05); T.eq((await st()).screen, 'settings', 'click activates'); await page.mouse.click(pos[0], pos[1], { button: 'right' }); await adv(.05); T.eq((await st()).screen, 'menu', 'right click is back');
  // Parked mouse doesn't steal focus when a menu appears under it, or when the pointer re-reports the same spot.
  await page.evaluate(() => { const g = __TEST__.g; g.ui.close(); __TEST__.Menus.openMenu(g); }); await adv(.05); const parked = await page.evaluate(() => { const r = __TEST__.g.ui.focus.items()[3].getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); await page.mouse.move(parked[0] - 2, parked[1]); await page.mouse.move(parked[0], parked[1]); await adv(.05); await tap(0, B.up); await tap(0, B.up); await tap(0, B.up); await adv(.05); const want = (await st()).focus; T.ok(!/Journal/.test(want), `focus moved off the parked item, on ${want}`);
  await page.evaluate(() => { const g = __TEST__.g; g.ui.close(); __TEST__.Menus.openMenu(g); }); await adv(.05); const f5 = (await st()).focus; await page.mouse.move(parked[0], parked[1]); await adv(.05); T.eq((await st()).focus, f5, 'a parked mouse does not steal focus');
  // The island: click a thing to walk there and use it, E and Cross use it, right-drag looks, wheel zooms.
  await page.evaluate(() => { const g = __TEST__.g; g.ui.closeAll(); g.scripts.clear(); g.clearMode(); g.save.profiles[0] = g.freshProfile('Tester', '#E8443A'); g.save.current = 0; const p = g.profile; p.tutorial = true; p.checkinDone = true; p.planShown = true; g.startHub(); g.hub.teleport(1, 13); }); await adv(1);
  const spot = await page.evaluate(() => { const g = __TEST__.g, h = g.hub; g.frame(1 / 60); g.camera.updateMatrixWorld(); const s = h.spots.find(x => x.id === 'board'); const hit = (px, py) => h.hoverAt(px, py); h.isl.group.updateMatrixWorld(); for (let y = 100; y < 1000; y += 20) for (let x = 100; x < 1800; x += 20) if (hit(x, y)?.id === 'board') return [x, y]; return null; });
  T.ok(spot, 'a hotspot can be hovered'); if (spot) { await page.mouse.move(spot[0], spot[1]); await page.evaluate(() => __TEST__.g.frame(1 / 60)); T.ok(await page.evaluate(() => __TEST__.g.hub.label.style.display !== 'none'), 'hover shows the label'); await page.mouse.click(spot[0], spot[1]); let scr = null; for (let i = 0; i < 40 && scr !== 'plan'; i++) { await adv(.25); scr = (await st()).screen; } T.eq(scr, 'plan', 'clicking a thing walks there and uses it'); await page.keyboard.press('Escape'); await adv(.1); }
  await page.evaluate(() => { const h = __TEST__.g.hub; h.teleport(8, 10.2); }); await adv(.2); await page.keyboard.press('KeyT'); await adv(.1); T.eq((await st()).screen, 'plan', 'T opens the plan'); await page.keyboard.press('Escape'); await adv(.1); await page.evaluate(() => { __TEST__.g.speech.clear(); }); const px0 = await page.evaluate(() => __TEST__.g.hub.px); await page.keyboard.down('KeyD'); await adv(.5); await page.keyboard.up('KeyD'); await adv(.05); const moved = await page.evaluate((a) => __TEST__.g.hub.px - a, px0); T.ok(Math.abs(moved) > .5, `D walks, moved ${moved}`);
  const yaw0 = await page.evaluate(() => __TEST__.g.hub.camYawO); await page.mouse.move(500, 500); await page.mouse.down({ button: 'right' }); await page.mouse.move(700, 500, { steps: 4 }); await adv(.05); await page.mouse.up({ button: 'right' }); const yaw1 = await page.evaluate(() => __TEST__.g.hub.camYawO); T.ok(yaw0 !== yaw1, 'right-drag looks'); const d0 = await page.evaluate(() => __TEST__.g.hub.camDist); await page.mouse.wheel(0, 200); await page.waitForTimeout(50); await adv(.05); T.ok(await page.evaluate((a) => __TEST__.g.hub.camDist !== a, d0), 'wheel zooms');
  await page.evaluate(() => { const p = window.__pads[0]; p.axes[2] = .9; }); await adv(.2); await page.evaluate(() => { window.__pads[0].axes[2] = 0; }); T.ok(yaw1 !== await page.evaluate(() => __TEST__.g.hub.camYawO), 'right stick looks');
  // Xbox glyph option.
  await page.evaluate(() => { const g = __TEST__.g; g.settings.glyph = 'xbox'; g.applySettings(); }); await tap(0, B.down); await adv(.05); T.ok((await prompts()).some(g => g.startsWith('xbox:')), 'Xbox glyphs'); await page.evaluate(() => { const g = __TEST__.g; g.settings.glyph = 'ps'; g.applySettings(); });
  // Haptics fire on a pad.
  await start('poses'); await tap(0, B.square); await page.evaluate(() => __TEST__.g.mode.event.forceFall()); await adv(.1); T.ok(await page.evaluate(() => (window.__rumble || 0) > 0), 'rumble on a fall');
  // Group Class: four pads join, each controls its own lane; Tippy Raft has a winner.
  await page.evaluate(() => { const g = __TEST__.g; g.ui.closeAll(); g.scripts.clear(); g.clearMode(); g.goTitle(true); __TEST__.Menus.openMenu(g); __TEST__.Menus.openGroup(g); for (const p of window.__pads) p.connected = true; }); await adv(.3);
  for (let i = 0; i < 4; i++) { await tap(i, B.cross); await adv(.1); }
  T.eq(await page.evaluate(() => __TEST__.g.ui.top().el.querySelectorAll('.mat .chip').length), 4, 'four pads join');
  await page.evaluate(() => { const g = __TEST__.g; const seats = g.input.pads.map((c, i) => ({ dev: 'pad' + i, ctrl: c, colour: '#E8443A', name: 'Seat ' + (i + 1) })); g.ui.closeAll(); g.clearMode(); const ev = g.startEventMode(__TEST__.EVENTS.fruitHat, { tier: 0 }, seats.map((s, i) => ({ kind: 'local', ctrl: s.ctrl, name: s.name, colour: s.colour, seat: i }))); ev.count = .01; }); await adv(.1);
  await page.evaluate(() => { window.__pads[2].axes[0] = 1; }); await adv(1.2); const leans = await page.evaluate(() => __TEST__.g.mode.event.lanes.map(x => x.bal.cobX)); await page.evaluate(() => { window.__pads[2].axes[0] = 0; }); T.ok(leans[2] > .3 && Math.abs(leans[0]) < .2 && Math.abs(leans[1]) < .2 && Math.abs(leans[3]) < .2, `each pad controls its own lane ${leans}`);
  const raft = await page.evaluate(() => __TEST__.runEvent('raft', { skills: ['sharp', 'average', 'average', 'clumsy'] })); T.ok(raft.done && raft.res.some(r => r.big >= 1), 'Tippy Raft has a winner');
  // A full group class through menus: quick class, podium.
  await page.evaluate(() => { const g = __TEST__.g; g.ui.closeAll(); g.scripts.clear(); g.clearMode(); g.goTitle(true); __TEST__.Menus.openMenu(g); __TEST__.Menus.openGroup(g); for (const p of window.__pads) p.connected = true; }); await adv(.3); await tap(0, B.cross); await adv(.1); await tap(1, B.cross); await adv(.3);
  await page.evaluate(() => { const g = __TEST__.g; g.ui.focus.set(g.ui.focus.items().find(i => /Quick/.test(i.textContent))); g.ui.focus.activate(); }); let seen = new Set();
  for (let i = 0; i < 2500; i++) { const s = await st(); seen.add(s.screen); if (s.errors.length) { T.ok(false, 'group: ' + s.errors[0].slice(0, 200)); break; } if (s.screen === 'title' && seen.has('podium')) break; if (s.screen === 'play') { await page.evaluate(() => { const ev = __TEST__.g.mode.event; if (ev.playT > 3) ev.forceFinish(); }); await adv(.5); } else if (['intro', 'groupresult', 'podium'].includes(s.screen)) { await tap(0, B.cross); await adv(.5); } else await adv(.3); }
  T.ok(seen.has('podium'), `group class reaches the podium, saw ${[...seen]}`);
  T.ok(!page.errors.length, `input errors ${page.errors.slice(0, 2).join('|').slice(0, 400)}`);
  await page.context().close();
}
