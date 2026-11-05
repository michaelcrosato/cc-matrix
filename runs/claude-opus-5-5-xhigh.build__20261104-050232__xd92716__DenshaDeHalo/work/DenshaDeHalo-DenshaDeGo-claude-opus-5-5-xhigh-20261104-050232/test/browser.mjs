// the browser checks (Playwright, file://): the page loads and draws its title; 10.5 s of no input starts attract and a
// key returns; the keyboard drives (Enter into the career, the tutorial, W holds power); the mouse hovers and clicks a
// menu; a touch-only phone sees "Controller or keyboard required" and the Settings button, and attract still runs; the
// audio graph stays bounded after a minute of driving; the glyph switch; the duel's keyboard halves; and Dev Mode, every
// tool through its own button (the six event triggers at a station from the paused menu, then the autopilot through them).
import { chromium } from 'playwright';
const here = new URL('../', import.meta.url), P = f => decodeURIComponent(new URL(f, here).pathname);
export async function browser(o = {}) {
  let passed = 0, failed = 0; const check = (w, ok, d) => { if (ok) passed++; else { failed++; console.log('FAIL browser: ' + w + (d !== undefined ? ' (' + String(d).slice(0, 200) + ')' : '')); } };
  const file = 'file://' + (o.bundle ? P('../DenshaDeHalo-DenshaDeGo-claude-opus-5-5-xhigh-20261104-050232.html') : P('index.html'));
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const open = async (opts = {}, hash = '') => { const ctx = await b.newContext(Object.assign({ viewport: { width: 1280, height: 720 } }, opts)), page = await ctx.newPage(), errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); await page.goto(file + hash); await page.waitForFunction(() => window.__dh && window.__dh.game.sceneName, null, { timeout: 20000 }); return { ctx, page, errs, snap: () => page.evaluate(() => window.__dh.snapshot()) }; };
  try {
    if (o.only !== 'dev') {   // (o.only = 'dev': just the Dev Mode tool blocks, while working on them)
    { const { ctx, page, errs, snap } = await open(); await page.waitForTimeout(1200);
      check('the page loads to the title', (await snap()).scene === 'title', (await snap()).scene);
      await page.waitForTimeout(10500); check('10.5 s of no input starts attract', (await snap()).attract.active, JSON.stringify((await snap()).attract));
      await page.keyboard.press('KeyA'); await page.waitForTimeout(900); check('a key returns to the title', (await snap()).scene === 'title', (await snap()).scene);
      // the keyboard: Enter -> the halo map -> Enter -> briefing -> Enter x n -> drive; W held: the speed rises
      await page.keyboard.press('Enter'); await page.waitForTimeout(800); await page.keyboard.press('Enter'); await page.waitForTimeout(900);
      for (let i = 0; i < 10 && (await snap()).scene === 'briefing'; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(600); }
      check('the keyboard reaches the drive', (await snap()).scene === 'drive', (await snap()).scene);
      await page.keyboard.down('KeyW'); await page.waitForTimeout(3000); await page.keyboard.up('KeyW'); await page.waitForTimeout(500);
      const s = await snap(); check('holding W powers the train', s.v > 0, JSON.stringify({ v: s.v, notch: s.notch }));
      check('no page errors while driving', !errs.length, errs.join(' | '));
      await ctx.close(); }
    { const { ctx, page, errs, snap } = await open(); await page.waitForTimeout(1200);
      // the mouse: hover moves the focus down the title menu, a click picks it
      const box = await page.locator('#screen').boundingBox(), info = await page.evaluate(() => ({ H: window.__dh.game.H, b: window.__dh.DH.titleMenu.box[3] })), sc = box.height / info.H;
      const x = box.x + (info.b.x + 20) * sc, y = box.y + (info.b.y + info.b.h / 2) * sc;
      await page.mouse.move(x - 30, y); await page.waitForTimeout(200); await page.mouse.move(x, y); await page.waitForTimeout(400);
      check('hovering a title menu entry moves the focus there', await page.evaluate(() => window.__dh.DH.titleMenu.i) === 3);
      await page.mouse.down(); await page.waitForTimeout(80); await page.mouse.up(); await page.waitForTimeout(900);
      const sn = (await snap()).scene; check('a click on it opens that screen', sn === 'driversLog', sn);
      check('no page errors with the mouse', !errs.length, errs.join(' | ')); await ctx.close(); }
    { const { ctx, page, errs, snap } = await open({ hasTouch: true, isMobile: true, viewport: { width: 412, height: 915 } }); await page.waitForTimeout(1500);
      const s = await snap(); check('a touch-only phone sees the "controller or keyboard" message', s.touchOnly === true && s.scene === 'title', JSON.stringify({ t: s.touchOnly, sc: s.scene }));
      await page.waitForTimeout(10500); check('and attract still runs there', (await snap()).attract.active, (await snap()).scene);
      check('no page errors on the phone', !errs.length, errs.join(' | ')); await ctx.close(); }
    { const { ctx, page, errs, snap } = await open({}, '#stage=S1&auto=1'); await page.waitForTimeout(2000);
      await page.keyboard.press('KeyW'); await page.waitForTimeout(60000);
      const s = await snap(); check('a minute of auto driving runs', s.scene === 'drive' && s.s > 100, JSON.stringify({ sc: s.scene, s: s.s }));
      check('no page errors over a minute of driving', !errs.length, errs.join(' | ')); await ctx.close(); }
    { // the Xbox symbols option: prompts follow a controller and show A B X Y
      const { ctx, page, errs, snap } = await open({}, '#stage=S1'); await page.waitForTimeout(1500);
      const ps = await page.evaluate(() => { const D = window.__dh.DH, g = window.__dh.game; g.input.lastDevice = 'gamepad'; g.settings.set('buttons', 'playstation'); return [D.Glyph.label('call'), D.Glyph.label('horn'), D.Glyph.label('ats'), D.Glyph.label('lever')]; });
      check('a controller shows PlayStation symbols by default', ps.join() === 'Cross,Square,Triangle,R2 / L2', ps.join());
      const xb = await page.evaluate(() => { const D = window.__dh.DH, g = window.__dh.game; g.settings.set('buttons', 'xbox'); g.input.lastDevice = 'gamepad'; return [D.Glyph.label('call'), D.Glyph.label('horn'), D.Glyph.label('ats'), D.Glyph.label('lever'), g.input.label('call')]; });
      check('the Xbox option shows A B X Y', xb.join() === 'A,X,Y,RT / LT,A', xb.join());
      await page.waitForTimeout(600); await page.screenshot({ path: P('shots/xbox-prompts.png') });
      await page.keyboard.press('KeyE'); await page.waitForTimeout(300); const kb = await page.evaluate(() => [window.__dh.game.input.lastDevice, window.__dh.DH.Glyph.label('call')]);
      check('a key press switches the prompts back to keys', kb.join() === 'keyboard,E', kb.join());
      await page.evaluate(() => window.__dh.game.settings.set('buttons', 'playstation'));
      check('no page errors with the glyph switch', !errs.length, errs.join(' | ')); await ctx.close(); }
    { // the duel on one keyboard: 2 joins the right half; each half drives its own train
      const { ctx, page, errs, snap } = await open({}, '#duel'); await page.waitForTimeout(1500);
      await page.keyboard.press('Digit2'); await page.waitForTimeout(500);
      const lab = await page.evaluate(() => { const P = window.__dh.game.players; return P.map(I => ['call', 'horn', 'ats', 'eb', 'neutral', 'view', 'up'].map(a => I.label(a, 'keyboard')).join(' ')); });
      check('2 on the keyboard joins P2 on the right half', lab.length === 2, lab.length);
      check('P1 keeps W/S and F G H R T Y', lab[0] === 'F G H R T Y W', lab[0]); check('P2 has the arrows and . / , L ; \'', lab[1] === '. / , L ; \' ↑', lab[1]);
      await page.keyboard.press('KeyF'); await page.keyboard.press('Period'); await page.waitForTimeout(900);
      check('both ready starts the split-screen duel', (await snap()).scene === 'duel', (await snap()).scene);
      await page.waitForFunction(() => window.__dh.DH.duelDrives && window.__dh.DH.duelDrives.every(d => d.run.pilot && d.run.dwell && d.run.dwell.sigClear), null, { timeout: 30000 }); await page.waitForTimeout(300);
      await page.keyboard.down('KeyW'); await page.waitForTimeout(2500); await page.keyboard.up('KeyW'); await page.waitForTimeout(1500);
      const v1 = await page.evaluate(() => window.__dh.DH.duelDrives.map(d => +d.run.train.v.toFixed(1)));
      check('W drives P1\'s train only', v1[0] > 1 && v1[1] === 0, v1.join(' '));
      await page.keyboard.down('ArrowUp'); await page.waitForTimeout(2500); await page.keyboard.up('ArrowUp'); await page.waitForTimeout(500);
      const v2 = await page.evaluate(() => window.__dh.DH.duelDrives.map(d => +d.run.train.v.toFixed(1)));
      check('the up arrow drives P2\'s train', v2[1] > 1, v2.join(' '));
      await page.screenshot({ path: P('shots/duel-keys.png') });
      check('no page errors in the duel', !errs.length, errs.join(' | ')); await ctx.close(); }
    { // Dev Mode from the pause menu: trigger an event, play the sound board, the balance sliders
      const { ctx, page, errs, snap } = await open({}, '#stage=S1'); await page.waitForTimeout(1500);
      await page.keyboard.press('Escape'); await page.waitForTimeout(500);
      await page.getByRole('button', { name: 'Dev Mode' }).click(); await page.waitForTimeout(400);
      await page.getByRole('button', { name: 'Trigger an event…' }).click(); await page.waitForTimeout(300);
      await page.getByRole('button', { name: 'ONCOMING TRAIN' }).click(); await page.waitForTimeout(300);
      const on = await page.evaluate(() => window.__dh.DH.drive.run.actors.map(a => a.id));
      check('Dev Mode: Trigger an event sends an oncoming train', on.some(id => id.startsWith('oncoming')), on.join(','));
      await page.getByRole('button', { name: 'Trigger an event…' }).click(); await page.waitForTimeout(300);
      await page.getByRole('button', { name: 'ATS TEST' }).click(); await page.waitForTimeout(300);
      check('Dev Mode: the ATS test rings the bell', await page.evaluate(() => window.__dh.DH.drive.run.ats.ringing));
      await page.getByRole('button', { name: 'Sound board…' }).click(); await page.waitForTimeout(300);
      for (const b of ['SFX chime', 'Melody akari', 'Song march', 'Voice hoshino']) { await page.getByRole('button', { name: b, exact: true }).click(); await page.waitForTimeout(250); }
      const au = await page.evaluate(() => ({ ctx: !!window.__dh.game.audio.ctx, state: window.__dh.game.audio.ctx && window.__dh.game.audio.ctx.state, song: !!window.__dh.game.audio.song }));
      check('Dev Mode: the sound board plays effects, melodies, songs and voices', au.ctx && au.song, JSON.stringify(au));
      await page.screenshot({ path: P('shots/dev-soundboard.png') });
      await page.getByRole('button', { name: 'Back', exact: true }).first().click(); await page.waitForTimeout(300);
      await page.getByRole('button', { name: 'Balance sliders…' }).click(); await page.waitForTimeout(400);
      const sliders = await page.locator('input[type=range]').count();
      check('Dev Mode: the balance screen shows its 19 sliders', sliders === 19, sliders);
      await page.locator('input[type=range]').nth(1).fill('2'); await page.waitForTimeout(200);
      const bs = await page.evaluate(() => window.__dh.DH.TUNING.brakeScale); check('a slider changes the tuning live', bs === 2, bs);
      await page.getByRole('button', { name: 'Reset to defaults' }).click(); await page.waitForTimeout(300);
      check('Reset to defaults puts it back', await page.evaluate(() => window.__dh.DH.TUNING.brakeScale) === 1);
      await page.screenshot({ path: P('shots/dev-balance.png') });
      check('no page errors in Dev Mode', !errs.length, errs.join(' | ')); await ctx.close(); }
    }
    // Dev Mode, every tool through its own button. Helpers: click a button, wait for a condition, open Dev Mode.
    const tools = (page) => ({
      btn: async (name, ms = 250) => { await page.getByRole('button', { name }).first().click(); await page.waitForTimeout(ms); },
      until: async (fn, ms) => { try { await page.waitForFunction(fn, null, { timeout: ms, polling: 250 }); return true; } catch (e) { return false; } },
      run: f => page.evaluate(f),
      label: async re => (await page.getByRole('button', { name: re }).first().textContent()).trim()
    });
    { // S1: the six event triggers fired at Akari Central during the dwell, from the paused menu with Halo Time frozen;
      // then the autopilot (Auto-drive) deals with every one; skill, god mode, time scale; Finish the stage
      const { ctx, page, errs } = await open({}, '#stage=S1'); await page.waitForTimeout(1500);
      const { btn, until, run, label } = tools(page), dev = async () => { await page.keyboard.press('Escape'); await page.waitForTimeout(400); await btn('Dev Mode', 400); };
      await dev();
      check('Dev Mode at a station: the drive is paused in the dwell at Akari Central', await run(() => { const r = window.__dh.DH.drive.run; return window.__dh.game.paused && !!r.dwell && !r.dwell.done && r.dwell.stop.st.id === 'akari' && r.train.v === 0; }));
      await btn(/^Freeze Halo Time/); check('Freeze Halo Time: ON', await run(() => window.__dh.DH.drive.run.frozen) && /ON$/.test(await label(/^Freeze Halo Time/)));
      const g0 = await run(() => window.__dh.DH.drive.run.grace);
      for (const [lab, test] of [
        ['DOOR RUSH', () => { const r = window.__dh.DH.drive.run; return !!(r.dwell && r.dwell.rush && !r.dwell.rush.opened); }],
        ['OBSTRUCTION', () => { const o = window.__dh.DH.drive.run.events.obst; return !!(o && o.active && o.c.blocked); }],
        ['TRACK WORKERS', () => { const r = window.__dh.DH.drive.run; return r.extraLimits.length === 1 && r.limitAt(r.extraLimits[0].s + 20) === 25 && window.__dh.DH.drive.devThings.length >= 4; }],
        ['HEADLIGHT FLASH', () => { const r = window.__dh.DH.drive.run; return !!r.events.flash && r.actors.some(a => a.id === 'sato'); }],
        ['ONCOMING TRAIN', () => window.__dh.DH.drive.run.actors.some(a => /^oncoming/.test(a.id))],
        ['ATS TEST', () => window.__dh.DH.drive.run.ats.ringing]]) {
        await btn('Trigger an event…'); await btn(lab, 300);
        const said = await page.getByText(lab + ': triggered').count();
        check('Dev Mode at the station, paused: ' + lab + ' triggers', said > 0 && await run(test), 'status ' + said);
      }
      await page.screenshot({ path: P('shots/dev-triggers.png') });
      await btn(/^Auto-drive/); check('Auto-drive: ON', await run(() => !!window.__dh.DH.drive.ap) && /ON$/.test(await label(/^Auto-drive/)));
      await btn(/^Autopilot skill/); check('Autopilot skill toggles to 0.6', await run(() => window.__dh.DH.devAutoSkill === .6 && window.__dh.DH.drive.ap.skill === .6));
      await btn(/^Autopilot skill/); check('and back to 1', await run(() => window.__dh.DH.devAutoSkill === 1 && window.__dh.DH.drive.ap.skill === 1));
      await btn(/^God mode/); check('God mode: ON', await run(() => window.__dh.DH.drive.run.o.god === true));
      await btn(/^Time scale/); check('Time scale: 2×', await run(() => window.__dh.game.timeScale === 2) && (await label(/^Time scale/)) === 'Time scale: 2×');
      await btn('Back', 300); await btn('Resume', 300);
      check('Resume un-pauses the drive', await run(() => !window.__dh.game.paused && window.__dh.game.sceneName === 'drive'));
      const opened = await until(() => { const r = window.__dh.DH.drive.run; return r.dwell && r.dwell.rush && r.dwell.rush.opened && r.doors === 1; }, 45000);
      check('the door rush re-opens the doors at Akari Central', opened);
      const done = await until(() => { const r = window.__dh.DH.drive.run, e = r.events; return r.s > r.extraLimits[0].until + 50 && !e.obst.active && e.flash.done && !r.ats.ringing; }, 200000);
      const st = await run(() => { const r = window.__dh.DH.drive.run; return { s: Math.round(r.s - r.s0), hazard: !!r.misc.hazard, flash: !!r.misc.flash, ebs: r.misc.ebs, limitHits: r.misc.limitHits, spad: r.misc.spads || 0, grace: r.grace, ring: r.ats.ringing, cleared: !r.events.obst.c.blocked }; });
      check('Auto-drive leaves and deals with every triggered event', done && st.hazard && st.flash && st.cleared && !st.ring, JSON.stringify(st));
      check('it stopped short of the obstruction, kept 25 through the work site, answered the flash, no EB', st.ebs === 0 && st.limitHits === 0, JSON.stringify(st));
      check('Freeze Halo Time held the clock through all of it', st.grace === g0, st.grace + ' vs ' + g0);
      await dev();
      for (let i = 0; i < 4; i++) await btn(/^Time scale/, 150);
      check('Time scale cycles 4×, 0.25×, 0.5× and back to 1×', await run(() => window.__dh.game.timeScale === 1) && (await label(/^Time scale/)) === 'Time scale: 1×');
      await btn(/^Auto-drive/); check('Auto-drive: OFF', await run(() => !window.__dh.DH.drive.ap));
      await btn('Finish the stage (perfect)', 300);
      check('Finish the stage closes the menu and plays on', await run(() => !window.__dh.game.paused));
      check('and reaches the results', await until(() => window.__dh.game.sceneName === 'results', 30000), await run(() => window.__dh.game.sceneName));
      check('no page errors with the Dev Mode tools on S1', !errs.length, errs.join(' | ')); await ctx.close(); }
    { // S2: jumps, skip a stop, time of day, weather, force a signal, cameras, the debug overlay, the braking guide,
      // unlock all and reset the save, god mode at zero Halo Time, then Fail the stage
      const { ctx, page, errs } = await open({}, '#stage=S2'); await page.waitForTimeout(1500);
      const { btn, until, run, label } = tools(page), dev = async () => { await page.keyboard.press('Escape'); await page.waitForTimeout(400); await btn('Dev Mode', 400); };
      await dev();
      await btn(/^Jump to km .* \(change\)$/); check('Jump to km: change steps it to 1.5', (await label(/^Jump to km .* \(change\)$/)) === 'Jump to km 1.5 (change)');
      await btn('Go to km 1.5'); check('Go to km 1.5 puts the train there', await run(() => { const r = window.__dh.DH.drive.run; return Math.abs(r.s - r.s0 - 1500) < 1 && r.train.v > 0; }), await run(() => window.__dh.DH.drive.run.s - window.__dh.DH.drive.run.s0));
      await btn('Jump: next station approach (600 m)'); check('Jump: next station approach lands 600 m short', await run(() => { const r = window.__dh.DH.drive.run, p = r.stops[r.stopIdx]; return Math.abs(r.s - (p.target - 600)) < 1; }));
      const k0 = await run(() => window.__dh.DH.drive.run.stopIdx);
      await btn('Skip to the next stop (PERFECT)'); check('Skip to the next stop judges it PERFECT', await run(() => { const r = window.__dh.DH.drive.run; return !!r.lastJudgment && /^PERFECT/.test(r.lastJudgment.label) && Math.abs(r.lastJudgment.err) < .01; }) && await run(() => window.__dh.DH.drive.run.stopIdx) === k0 + 1, JSON.stringify(await run(() => window.__dh.DH.drive.run.lastJudgment && window.__dh.DH.drive.run.lastJudgment.label)));
      await btn(/^Time of day/); check('Time of day: the first click is dawn', await run(() => window.__dh.DH.devTod === 5.6) && !/timetable$/.test(await label(/^Time of day/)));
      const w0 = await run(() => window.__dh.DH.drive.run.weather); await btn(/^Weather/); const w1 = await run(() => window.__dh.DH.drive.run.weather);
      check('Weather: rain becomes fog', w0 === 'rain' && w1 === 'fog' && (await label(/^Weather/)) === 'Weather: FOG', w0 + ' > ' + w1);
      const sigLab = await label(/^Force the next signal/); await btn(/^Force the next signal/);
      const forced = await run(() => { const r = window.__dh.DH.drive.run, q = r.signalsAhead(3000, 1)[0]; return q && r.forced && r.forced[q.g.id] && r.forced[q.g.id] === q.g.aspect ? q.g.id + ' ' + q.g.aspect : null; });
      check('Force the next signal sets its aspect', !!forced && (await label(/^Force the next signal/)) === 'Force the next signal: ' + forced, sigLab + ' > ' + forced);
      await btn(/^Camera/); check('Camera: CAB becomes CHASE', await run(() => window.__dh.DH.drive.cam === 'chase') && (await label(/^Camera/)) === 'Camera: CHASE');
      await btn(/^Debug overlay/); check('Debug overlay: ON', await run(() => window.__dh.DH.debugOn === true) && /^Debug overlay: ON/.test(await label(/^Debug overlay/)));
      const gd = await run(() => window.__dh.DH.guideOn()); await btn(/^Braking guide/); check('Braking guide toggles', await run(() => window.__dh.DH.guideOn()) === !gd);
      await btn('Unlock all stages'); check('Unlock all stages unlocks every stage', await run(() => window.__dh.DH.STAGE_ORDER.every(id => window.__dh.DH.Progress.unlocked(id))));
      await btn('Reset save data…'); await btn('Keep my save'); check('Reset save data: Keep my save keeps it', await run(() => window.__dh.DH.STAGE_ORDER.every(id => window.__dh.DH.Progress.unlocked(id))));
      await btn('Reset save data…'); await btn('Erase it'); check('Reset save data: Erase it erases it', await run(() => window.__dh.DH.Progress.get().unlocked.join() === 'S0'));
      await btn('Back', 300); await btn('Resume', 800);
      await page.screenshot({ path: P('shots/dev-world.png') });
      await page.keyboard.press('Backquote'); await page.waitForTimeout(200); check('the ` key toggles the debug overlay once Dev Mode was opened', await run(() => window.__dh.DH.debugOn === false));
      await dev(); await btn(/^God mode/); await run(() => { const r = window.__dh.DH.drive.run; r.frozen = false; r.grace = 0; });
      await btn('Back', 300); await btn('Resume', 300); await page.waitForTimeout(1500);
      check('God mode: Halo Time at zero does not end the stage', await run(() => window.__dh.game.sceneName === 'drive' && window.__dh.DH.drive.run.phase !== 'over'));
      await dev(); await btn('Fail the stage (game over)', 300);
      check('Fail the stage reaches the game over screen', await until(() => window.__dh.game.sceneName === 'gameOver', 15000), await run(() => window.__dh.game.sceneName));
      check('no page errors with the Dev Mode tools on S2', !errs.length, errs.join(' | ')); await ctx.close(); }
  } catch (e) { check('the browser checks run', false, e.message); }
  await b.close();
  return { passed, failed };
}
