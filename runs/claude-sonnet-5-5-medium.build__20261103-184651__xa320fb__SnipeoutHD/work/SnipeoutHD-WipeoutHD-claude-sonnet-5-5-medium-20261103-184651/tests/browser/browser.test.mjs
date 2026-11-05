import { chromium } from 'playwright'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import fs from 'node:fs';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..'), bundle = path.resolve(root, '..', path.basename(root) + '.html');
const ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'];
export default async function (t) {
  const b = await chromium.launch({ args: ARGS }); const out = path.join(root, 'tests', 'out'); fs.mkdirSync(out, { recursive: true });
  const open = async (init) => { const p = await b.newPage({ viewport: { width: 960, height: 540 } }); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) p.errs.push('console: ' + m.text().slice(0, 200)); }); if (init) await p.addInitScript(init); await p.goto('file://' + bundle); await p.waitForFunction(() => window.game && window.game.sceneName && window.SN, null, { timeout: 90000 }); return p; };
  const adv = (p, s) => p.evaluate(s => { game.advance(s); return 1; }, s);
  try {
    // ---- boot, title, scenes ----
    let p = await open(); await p.waitForFunction(() => game.sceneName === 'title', null, { timeout: 60000 }); t.ok(true, 'bundle boots to the title');
    for (const sc of ['menu', 'setup', 'season', 'howto', 'about']) { await p.evaluate(sc => { game.go(sc, sc === 'setup' ? { mode: 'race' } : {}); return 1; }, sc); await adv(p, .5); t.ok(await p.evaluate(sc => game.sceneName === sc, sc), 'scene ' + sc + ' loads'); }
    await p.evaluate(() => { game.go('brief', { event: SN.STORY.events[0] }); return 1; }); await adv(p, .5); t.ok(await p.evaluate(() => game.sceneName === 'brief'), 'briefing loads');
    // ---- every mode plays and ends with a bot ----
    const modes = [['race', 'solenne', 'flare', 2], ['time', 'karakum', 'spark', 1], ['snipeout', 'karakum', 'flare', 0], ['overclock', 'meridian', 'flare', 0], ['academy', 'solenne', 'spark', 2]];
    for (const [mode, track, cls, laps] of modes) {
      await p.evaluate(a => { SN.CHEATS.god = a.mode === 'academy' || a.mode === 'overclock'; SN.startRace({ mode: a.mode, track: a.track, cls: a.cls, laps: a.laps || 3, team: 'volta', goal: a.mode === 'overclock' ? 2 : 0 }); return 1; }, { mode, track, cls, laps });
      await adv(p, .3);
      await p.evaluate(() => { const d = SN.director(), h = d.race.human; h.inputFn = s => SN.AI.controls(s, d.race, true); return 1; });
      for (let k = 0; k < 14; k++) { await adv(p, 20); const sc = await p.evaluate(() => game.sceneName); if (sc === 'results') break; }
      const sc = await p.evaluate(() => game.sceneName); t.ok(sc === 'results' || mode === 'academy', mode + ' reaches results (scene ' + sc + ')');
      if (sc === 'results') { await adv(p, .5); t.ok(await p.evaluate(() => !game.errors || game.errors.length === 0), mode + ' results draw without errors'); }
      await p.evaluate(() => { SN.CHEATS.god = false; return 1; });
    }
    await p.evaluate(() => { SN.startRace({ mode: 'race', track: 'meridian', cls: 'storm', laps: 3, team: 'kestrel' }); return 1; }); await adv(p, 2); await p.waitForTimeout(800);
    await p.screenshot({ path: path.join(out, 'race.png') });
    // ---- pause menu, dev mode ----
    const items = await p.evaluate(() => SN.pauseItems().map(i => i[0])); t.ok(items.includes('Dev mode') && items.includes('Restart') && items.includes('How to play'), 'pause menu has restart, how-to and dev mode');
    await p.evaluate(() => { SN.Dev.open(SN.director()); return 1; }); await adv(p, .2); t.ok(await p.evaluate(() => !!SN.director().overlay), 'dev panel opens');
    t.ok(await p.evaluate(() => { const m = SN.director().overlay; SN.Tune.T.topSpeed = 1.4; SN.Tune.reset(); return SN.Tune.T.topSpeed === 1; }), 'tuning reset restores defaults');
    await p.evaluate(() => { SN.director().overlay = null; return 1; });
    // ---- settings: glyph option, touch notice ----
    t.ok(await p.evaluate(() => { game.settings.set('glyphs', 'xbox'); const a = game.input.padStyle() === 'xbox'; game.settings.set('glyphs', 'playstation'); return a && game.input.padStyle() === 'playstation'; }), 'button symbols setting: Xbox and PlayStation');
    t.ok(await p.evaluate(() => game.settings.glyphs === 'playstation'), 'PlayStation symbols are the default');
    // ---- attract: 10 s idle on the title ----
    await p.evaluate(() => { game.go('title'); return 1; }); await adv(p, 1); await adv(p, 9); t.ok(await p.evaluate(() => game.sceneName === 'title'), 'no attract before 10 s'); await adv(p, 2.5); t.ok(await p.evaluate(() => game.sceneName === 'attract'), 'attract starts after 10 s without input');
    await adv(p, 20); t.ok(await p.evaluate(() => game.sceneName === 'attract'), 'attract keeps playing');
    await p.screenshot({ path: path.join(out, 'attract.png') });
    await p.keyboard.press('Enter'); await adv(p, 1.2); t.ok(await p.evaluate(() => game.sceneName === 'title'), 'any input leaves attract');
    t.ok(await p.evaluate(() => { Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true }); window.matchMedia = () => ({ matches: false }); game.input.lastDevice = 'touch'; const r = SN.touchOnly(); return r; }), 'touch-only devices are detected');
    t.ok(p.errs.length === 0, 'no page errors: ' + p.errs.slice(0, 3).join(' | ')); await p.close();

    // ---- controller (DualSense standard mapping) and keyboard drive the craft ----
    { const pg = await open(`(() => { const pad = { index: 0, connected: true, id: 'Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) }; window.__pad = pad; navigator.getGamepads = () => [pad, null, null, null]; })();`);
      await pg.waitForFunction(() => game.sceneName === 'title', null, { timeout: 60000 });
      await pg.evaluate(() => { SN.startRace({ mode: 'time', track: 'solenne', cls: 'flare', laps: 3, team: 'kestrel' }); return 1; }); await adv(pg, 1); await adv(pg, 3.5);
      await pg.evaluate(() => { __pad.buttons[0] = { pressed: true, value: 1 }; return 1; }); await adv(pg, 4);
      t.ok(await pg.evaluate(() => SN.kmh(SN.director().race.human.v) > 150), 'controller: cross thrusts');
      t.ok(await pg.evaluate(() => game.input.lastDevice === 'gamepad' && game.input.label('thrust') === '✕'), 'controller: prompts show PlayStation symbols');
      const psi0 = await pg.evaluate(() => SN.director().race.human.u); await pg.evaluate(() => { __pad.axes[0] = 1; return 1; }); await adv(pg, .6);
      t.ok(await pg.evaluate(u0 => SN.director().race.human.u > u0 + 20, psi0), 'controller: left stick steers right');
      await pg.evaluate(() => { __pad.axes[0] = 0; __pad.buttons[7] = { pressed: true, value: .8 }; return 1; }); const vA = await pg.evaluate(() => SN.director().race.human.v); await adv(pg, 1);
      t.ok(await pg.evaluate(v => SN.director().race.human.v < v - 20, vA), 'controller: analog R2 airbrake slows the craft');
      await pg.evaluate(() => { __pad.buttons[7] = { pressed: false, value: 0 }; game.settings.set('glyphs', 'xbox'); return 1; }); await adv(pg, .1);
      t.ok(await pg.evaluate(() => game.input.label('thrust', 'gamepad') === 'A'), 'controller: Xbox symbols option');
      await pg.evaluate(() => { game.settings.set('glyphs', 'playstation'); return 1; });
      await pg.evaluate(() => { SN.startRace({ mode: 'time', track: 'solenne', cls: 'flare', laps: 3, team: 'kestrel' }); return 1; }); await adv(pg, 1); await adv(pg, 3.5);
      await pg.keyboard.down('KeyW'); await adv(pg, 4); t.ok(await pg.evaluate(() => SN.kmh(SN.director().race.human.v) > 150 && game.input.lastDevice === 'keyboard'), 'keyboard: W thrusts and prompts follow the keyboard');
      const u1 = await pg.evaluate(() => SN.director().race.human.u); await pg.keyboard.down('KeyD'); await adv(pg, .6); await pg.keyboard.up('KeyD'); t.ok(await pg.evaluate(u => SN.director().race.human.u > u + 20, u1), 'keyboard: D steers right'); await pg.keyboard.up('KeyW');
      t.ok(pg.errs.length === 0, 'controls: no page errors: ' + pg.errs.slice(0, 3).join(' | ')); await pg.close(); }
    // ---- season progress, time-trial ghost ----
    { const sp = await open(); await sp.waitForFunction(() => game.sceneName === 'title', null, { timeout: 60000 });
      await sp.evaluate(() => { SN.S.done = {}; SN.Tune.T.aiSkill = .6; SN.startRace({ mode: 'race', track: 'solenne', cls: 'spark', laps: 2, team: 'kestrel', event: SN.STORY.events[0] }); return 1; }); await adv(sp, .3);
      await sp.evaluate(() => { const d = SN.director(); d.race.human.inputFn = s => SN.AI.controls(s, d.race); return 1; });
      for (let k = 0; k < 12; k++) { await adv(sp, 20); if (await sp.evaluate(() => game.sceneName === 'results')) break; }
      t.ok(await sp.evaluate(() => game.sceneName === 'results'), 'season event reaches results'); t.ok(await sp.evaluate(() => !!SN.S.done.e1), 'passing event 1 records it as done'); await sp.evaluate(() => { SN.Tune.reset(); return 1; });
      await sp.evaluate(() => { game.go('season', {}); return 1; }); await adv(sp, .5); t.ok(await sp.evaluate(() => game.sceneName === 'season'), 'season screen shows after progress');
      await sp.evaluate(() => { SN.S.ghosts = {}; SN.startRace({ mode: 'time', track: 'solenne', cls: 'spark', laps: 1, team: 'kestrel' }); return 1; }); await adv(sp, .3);
      await sp.evaluate(() => { const d = SN.director(); d.race.human.inputFn = s => SN.AI.controls(s, d.race, true); return 1; });
      for (let k = 0; k < 10; k++) { await adv(sp, 15); if (await sp.evaluate(() => game.sceneName === 'results')) break; }
      t.ok(await sp.evaluate(() => !!SN.S.ghosts['solenne:spark'] && SN.S.ghosts['solenne:spark'].s.length > 100), 'time trial saves a ghost');
      await sp.evaluate(() => { SN.startRace({ mode: 'time', track: 'solenne', cls: 'spark', laps: 1, team: 'kestrel' }); return 1; }); await adv(sp, .3); await adv(sp, 8);
      t.ok(await sp.evaluate(() => { const d = SN.director(); return !!d.ghost && !!d.race.ghostShips[0].pose; }), 'time trial plays the saved ghost');
      t.ok(sp.errs.length === 0, 'season/ghost: no page errors: ' + sp.errs.slice(0, 3).join(' | ')); await sp.close(); }

    // ---- local VERSUS: two players, split screen, half a keyboard each ----
    { const vp = await open(); await vp.waitForFunction(() => game.sceneName === 'title', null, { timeout: 60000 });
      await vp.evaluate(() => { game.go('setup', { mode: 'versus' }); return 1; }); await adv(vp, .5);
      t.ok(await vp.evaluate(() => game.players.length === 1), 'versus setup waits for player 2');
      await vp.evaluate(() => { game.addPlayer({ keys: 'right' }); return 1; }); await adv(vp, .3);
      t.ok(await vp.evaluate(() => game.players.length === 2), 'player 2 joins on the right half of the keyboard');
      await vp.evaluate(() => { SN.startRace({ mode: 'race', versus: true, track: 'solenne', cls: 'flare', laps: 2, team: 'kestrel', team2: 'soratek' }); return 1; }); await adv(vp, 1); await adv(vp, 3.5);
      t.ok(await vp.evaluate(() => game.viewports.length === 2 && SN.director().race.humans.length === 2), 'two viewports and two human craft');
      await vp.keyboard.down('KeyF'); await vp.keyboard.down('Period'); await adv(vp, 4);
      t.ok(await vp.evaluate(() => SN.director().race.humans.every(h => SN.kmh(h.v) > 150)), 'both players thrust with their own keys');
      const u = await vp.evaluate(() => SN.director().race.humans.map(h => h.u)); await vp.keyboard.down('KeyD'); await adv(vp, .6); const split = await vp.evaluate(() => game.players[0].down('right') && !game.players[1].down('right')); await vp.keyboard.up('KeyD');
      const u2 = await vp.evaluate(() => SN.director().race.humans.map(h => h.u)); t.ok(u2[0] > u[0] + 20 && split, 'P1 steers with D, which P2 does not share');
      await vp.waitForTimeout(600); await vp.screenshot({ path: path.join(out, 'versus.png') });
      await vp.keyboard.up('KeyF'); await vp.keyboard.up('Period');
      await vp.evaluate(() => { for (const h of SN.director().race.humans) h.inputFn = s => SN.AI.controls(s, SN.director().race, true); return 1; });
      for (let k = 0; k < 12; k++) { await adv(vp, 20); if (await vp.evaluate(() => game.sceneName === 'results')) break; }
      t.ok(await vp.evaluate(() => game.sceneName === 'results'), 'versus race ends in results');
      t.ok(vp.errs.length === 0, 'versus: no page errors: ' + vp.errs.slice(0, 3).join(' | ')); await vp.close(); }

    // ---- replay: recorded controls re-simulate to the same hash ----
    { const rp = await open(); await rp.waitForFunction(() => game.sceneName === 'title', null, { timeout: 60000 });
      await rp.evaluate(() => { SN.startRace({ mode: 'race', track: 'solenne', cls: 'spark', laps: 1, team: 'kestrel' }); return 1; }); await adv(rp, .3);
      await rp.evaluate(() => { const d = SN.director(); d.race.human.inputFn = s => { const c = SN.AI.controls(s, d.race, true); d.frames.push(Object.assign({}, c)); return c; }; return 1; });
      for (let k = 0; k < 12; k++) { await adv(rp, 20); if (await rp.evaluate(() => game.sceneName === 'results')) break; }
      t.ok(await rp.evaluate(() => !!SN.replay && SN.replay.frames.length > 1000), 'a finished race keeps its recording');
      await rp.evaluate(() => { SN.startRace(Object.assign({}, SN.replay.cfg, { replay: SN.replay })); return 1; }); await adv(rp, .3);
      for (let k = 0; k < 12; k++) { await adv(rp, 20); if (await rp.evaluate(() => SN.director() && SN.director().race.over)) break; }
      t.ok(await rp.evaluate(() => SN.director().race.hash() === SN.replay.hash), 'the replay reproduces the race exactly');
      t.ok(rp.errs.length === 0, 'replay: no page errors: ' + rp.errs.slice(0, 3).join(' | ')); await rp.close(); }
    // ---- AI Hub session with a stand-in hub ----
    p = await open(`(() => { const L = {}; const w = window; w.__hub = { calls: [], sent: 0 }; w.AIHub = { active: true, version: '1.4.0', me: 'a', players: [{ id: 'a', name: 'ALPHA', color: '#2ec4ff' }, { id: 'b', name: 'BRAVO', color: '#ff4a5a' }], _t: -3000, async connect(o) { w.__hub.calls.push('connect:' + JSON.stringify(o)); return { me: 'a', players: this.players, mode: 'ghost' }; }, rng(n) { let a = n.length + 7; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; }, on(ev, f) { L[ev] = f; }, answer(a) { w.__hub.calls.push('answer:' + a); }, ready() { w.__hub.calls.push('ready'); }, time() { return this._t; }, send(d) { w.__hub.sent++; w.__hub.last = d; }, progress(p) { w.__hub.calls.push('progress'); }, result(r) { w.__hub.result = r; w.__hub.calls.push('result'); }, _emit(ev, ...a) { L[ev] && L[ev](...a); } }; })();`);
    await p.waitForFunction(() => game.sceneName === 'session', null, { timeout: 60000 }); t.ok(true, 'hub session skips the title and opens the session scene');
    t.ok(await p.evaluate(() => __hub.calls.includes('ready')), 'ready() is called once the world is warm'); t.ok(await p.evaluate(() => __hub.calls.filter(c => c === 'ready').length === 1), 'ready() only once');
    t.ok(await p.evaluate(() => __hub.calls.some(c => c.startsWith('connect:') && c.includes('ghost'))), 'connects in ghost mode');
    await p.keyboard.press('Enter'); await adv(p, .2); t.ok(await p.evaluate(() => __hub.calls.includes('answer:ready')), 'Enter answers ready');
    await p.evaluate(() => { AIHub._t = -2000; AIHub._emit('start'); return 1; });
    for (let k = 0; k < 40; k++) { await p.evaluate(() => { AIHub._t += 3000; return 1; }); await adv(p, 3); if (await p.evaluate(() => !!__hub.result)) break; }
    await p.evaluate(() => { const d = SN.Hub.dir; d.race.human.inputFn = s => SN.AI.controls(s, d.race, true); return 1; });
    for (let k = 0; k < 40; k++) { await p.evaluate(() => { AIHub._t += 4000; return 1; }); await adv(p, 4); if (await p.evaluate(() => !!__hub.result)) break; }
    t.ok(await p.evaluate(() => __hub.sent > 20), 'ghost state is sent about 10 times a second'); t.ok(await p.evaluate(() => __hub.last && __hub.last.t === 'g' && typeof __hub.last.p === 'number'), 'ghost message shape');
    t.ok(await p.evaluate(() => !!__hub.result && typeof __hub.result.time === 'number'), 'finishing reports a time result');
    await p.evaluate(() => { AIHub._emit('end', {}); return 1; }); await adv(p, .5); await p.screenshot({ path: path.join(out, 'hub-over.png') });
    t.ok(p.errs.length === 0, 'hub session: no page errors: ' + p.errs.slice(0, 3).join(' | ')); await p.close();
  } finally { await b.close(); }
}
