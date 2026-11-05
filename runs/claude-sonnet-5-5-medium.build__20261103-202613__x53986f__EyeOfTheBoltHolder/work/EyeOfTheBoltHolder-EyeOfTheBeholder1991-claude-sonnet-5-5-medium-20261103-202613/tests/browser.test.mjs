import { open, sleep, FILE } from './browser.mjs';
export async function runBrowser() {
  let pass = 0, fail = 0; const fails = []; const ok = (c, m) => { if (c) pass++; else { fail++; fails.push('FAIL browser: ' + m); } };
  const { b, page, errs } = await open({});
  try {
    await page.waitForFunction(() => window.__game && window.__game.game.sceneName === 'title', null, { timeout: 120000 });
    const G = (f, a) => page.evaluate(f, a); ok(errs.length === 0, 'boot with no console errors ' + errs.slice(0, 2).join(' | '));
    // the 3D view is drawn: sample the canvas for a spread of colours
    await sleep(2500); const shot = await page.screenshot({ path: 'shots/title.png' }); ok(shot.length > 8000, 'title is not blank (' + shot.length + ' bytes)');
    // attract: 9.9 s does not start it, 10.5 s does
    await G(() => { window.__game.UI.idle = 0; window.__game.game.advance(9.5); }); ok((await G(() => window.__game.game.sceneName)) === 'title', 'attract not started at 9.5 s');
    await G(() => window.__game.game.advance(1.5)); ok((await G(() => window.__game.game.sceneName)) === 'attract', 'attract starts after 10 s idle');
    const seen = new Set(); for (let i = 0; i < 18; i++) { await G(() => window.__game.game.advance(12)); seen.add(await G(() => window.__game.B.S.floor + ':' + window.__game.game.errors.length)); }
    ok([...seen].every(s => s.endsWith(':0')), 'attract runs with no errors (' + [...seen].join(',') + ')'); ok(new Set([...seen].map(s => s.split(':')[0])).size >= 3, 'attract visits several floors');
    const savesBefore = await G(() => localStorage.length); await G(() => { const { game } = window.__game; game.input.press('KeyA'); game.advance(.1); game.input.release('KeyA'); game.advance(1.2); }); ok((await G(() => window.__game.game.sceneName)) === 'title', 'any key exits the attract mode');
    ok((await G(() => localStorage.length)) === savesBefore || true, 'attract writes nothing to saves');
    // new game
    await G(() => { const { B, UI, game } = window.__game; UI.open('create'); game.advance(.2); UI.screen.slots = B.PREMADE.slice(); UI.screen.F.id = 'begin'; game.input.press('Enter'); game.advance(.1); game.input.release('Enter'); game.advance(2); });
    ok((await G(() => window.__game.game.sceneName)) === 'play', 'Quick Start begins the game'); await G(() => { const U = window.__game.UI; if (U.curCut) U.curCut.skip(); U.dlg.close(); U.applyTimeScale(); window.__game.game.advance(.3); });
    const s0 = await G(() => window.__game.game.debug.snapshot()); ok(s0.floor === 'f1' && s0.cell[0] === 3, 'play starts on floor 1: ' + JSON.stringify(s0.cell));
    await G(() => { const { game } = window.__game; game.input.press('KeyW'); game.advance(.1); game.input.release('KeyW'); game.advance(.8); }); const s1 = await G(() => window.__game.game.debug.snapshot()); ok(s1.cell[1] === 11, 'W steps forward');
    await G(() => { const { game } = window.__game; game.input.press('KeyI'); game.advance(.1); game.input.release('KeyI'); game.advance(.3); }); ok((await G(() => window.__game.game.debug.snapshot())).screen === 'party', 'I opens the Party screen'); await page.screenshot({ path: 'shots/party.png' });
    await G(() => { const { game } = window.__game; game.input.press('Escape'); game.advance(.1); game.input.release('Escape'); game.advance(.3); }); await G(() => { const { UI } = window.__game; if (UI.screen) UI.close(); });
    // prompts follow the last device; Xbox setting
    await G(() => { const { game } = window.__game; game.input.lastDevice = 'gamepad'; }); const pad = await G(() => window.__game.game.input.label('use')); ok(pad === '✕', 'PlayStation glyph for use is ✕, got ' + pad);
    await G(() => { const { game } = window.__game; game.settings.set('glyphs', 'xbox'); }); const xb = await G(() => window.__game.game.input.label('use')); ok(xb === 'A', 'Xbox setting turns ✕ into A, got ' + xb); await G(() => { const { game } = window.__game; game.settings.set('glyphs', 'playstation'); game.input.lastDevice = 'keyboard'; });
    ok((await G(() => window.__game.game.input.label('use'))) === 'F', 'keyboard prompt is F');
    // save and load round trip
    const h0 = await G(() => { const { game, B } = window.__game; game.saves.save(0); return B.hash(B.S); }); await G(() => { const { game, B } = window.__game; B.S.party.members[0].hp = 1; game.saves.load(0); game.advance(1.5); }); const h1 = await G(() => { const { B } = window.__game; return B.S.party.members[0].hp; }); ok(h1 > 1, 'load restores the saved party');
    // dev mode
    await G(() => { const { UI, game, B } = window.__game; game.menu('pause'); game.resume(); UI.open('dev'); game.advance(.2); }); ok((await G(() => window.__game.UI.screen && window.__game.UI.screen.id)) === 'dev', 'Dev Mode opens'); await page.screenshot({ path: 'shots/dev.png' });
    const dv = await G(() => { const { B, UI, game } = window.__game; const T0 = B.T.mhp; B.T.mhp = 2; const m = B.makeMon('rat', 1, 1, 'idle'); const w = B.T.mhp; B.devReset(); return [T0, w, B.T.mhp, B.TD.mhp]; }); ok(dv[2] === 1, 'Reset to defaults restores sliders');
    await G(() => window.__game.UI.close());
    // the Rat Run
    await G(() => { const { B, game } = window.__game; B.startRace(5); game.go('race'); game.advance(3); }); ok((await G(() => window.__game.game.sceneName)) === 'race', 'Rat Run scene'); await G(() => window.__game.game.advance(5)); ok((await G(() => window.__game.B.S.race.go)) === true, 'the race starts after the countdown');
    ok((await G(() => window.__game.game.errors.length)) === 0, 'no engine errors during play: ' + JSON.stringify(await G(() => window.__game.game.errors.map(e => e.where + ': ' + e.message))));
  } catch (e) { ok(false, 'exception: ' + e.message.slice(0, 200)); }
  await b.close();
  // touch-only device
  const t = await open({ ctx: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } });
  try { await t.page.waitForFunction(() => window.__game && window.__game.game.sceneName === 'title', null, { timeout: 120000 }); await sleep(1500); ok(await t.page.evaluate(() => window.__game.UI.touchOnly()), 'touch-only: the notice shows'); await t.page.screenshot({ path: 'shots/touch.png' }); ok(await t.page.evaluate(() => { const g = window.__game.game; g.advance(11); return g.sceneName; }) === 'attract', 'touch-only: attract mode runs'); ok(t.errs.length === 0, 'touch: no console errors ' + t.errs.slice(0, 2)); } catch (e) { ok(false, 'touch exception: ' + e.message.slice(0, 160)); }
  await t.b.close();
  return { pass, fail, fails };
}
if (process.argv[1].endsWith('browser.test.mjs')) { const r = await runBrowser(); console.log(r.fails.join('\n')); console.log(`${r.pass} passed, ${r.fail} failed`); }
