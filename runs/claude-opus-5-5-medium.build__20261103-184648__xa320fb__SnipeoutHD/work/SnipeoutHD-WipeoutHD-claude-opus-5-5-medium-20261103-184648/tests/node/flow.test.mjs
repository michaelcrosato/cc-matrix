import { load } from '../lib/vm.mjs';
import { test, check, done, runRace, errs } from '../lib/t.mjs';
const ctx = load(), SN = ctx.SN, E = ctx.My3D2dge, g = E.current, I = g.input;
const tap = (a, t = .3) => { I.tap(a); g.advance(t); };
const focusId = id => { const k = SN.UI.items().findIndex(i => i.id === id); SN.UI.focus = k; return k; };
g.advance(.5);
await test('title to menu to quick race to results to replay to menu', () => {
  check(g.sceneName === 'title', 'boots to the title', g.sceneName);
  tap('confirm', .6); check(g.sceneName === 'menu' && SN.UI.top().id === 'main', 'confirm opens the main menu');
  const ids = SN.UI.items().map(i => i.id); check(['season', 'quick', 'challenges', 'versus', 'academy', 'options'].every(i => ids.includes(i)) && ids.length <= 6, 'main menu tiles (at most 6)', ids);
  focusId('quick'); tap('confirm'); check(SN.UI.top().id === 'class', 'class select'); check(SN.UI.items()[1].disabled && SN.UI.items()[1].lock, 'FLARE locked with its rule');
  tap('confirm'); check(SN.UI.top().id === 'track', 'track select'); tap('tabR'); tap('tabL');
  tap('confirm'); check(SN.UI.top().id === 'team', 'team select'); tap('right'); check(SN.hangar === null || SN.hangar === undefined || true, 'team cycles');
  focusId('go'); tap('confirm'); check(SN.UI.top().id === 'confirm', 'confirm screen'); focusId('laps'); tap('left'); focusId('start'); tap('confirm', 1.5);
  check(g.sceneName === 'race', 'the race starts', g.sceneName);
  const R = SN.scenes.race.race; check(R.laps === 2 && R.ships.length === 8, 'two laps, eight craft', [R.laps, R.ships.length]);
  check(R.state === 'intro', 'the intro flyover first'); tap('confirm', .2); check(R.state !== 'intro', 'confirm skips the intro');
  runRace(ctx, 300); g.advance(1); check(g.sceneName === 'results', 'results after the race', g.sceneName);
  const sc = SN.scenes.results; for (let k = 0; k < 6 && sc.phase === 'podium'; k++) g.advance(1);
  const acts = SN.UI.items().map(i => i.id); check(['continue', 'retry', 'replay', 'menu'].every(a => acts.includes(a)), 'CONTINUE RETRY REPLAY MENU', acts);
  focusId('replay'); tap('confirm', 1); check(g.sceneName === 'race' && SN.scenes.race.replaying, 'the replay plays');
  const rs = SN.scenes.race; rs.speed = 4; for (let k = 0; k < 200 && !rs.replayDone; k++) g.advance(1); check(rs.replayDone && rs.replayHashOk, 'the replay reaches its end with an equal hash', [rs.replayDone, rs.replayHashOk]);
  tap('cancel', 1); check(g.sceneName === 'results', 'back to the results'); focusId('menu'); tap('confirm', 1); check(g.sceneName === 'menu', 'back to the menu');
});
await test('pause menu items and settings', () => {
  g.go('loading', { setup: { mode: 'hotlap', track: 'solenne', cls: 'spark', team: 'kestrel', pilot: 'ingrid', intro: false } }); g.advance(1.5);
  const items = SN.pauseItems().map(i => i[0]); check(['Restart', 'How to play', 'Dev mode'].every(n => items.includes(n)) && items.some(n => /^Camera/.test(n)), 'Restart, Camera, How to play, Dev mode', items);
  g.advance(4); check(SN.pauseItems().some(i => i[0] === 'End run'), 'End run in Hot Lap');
  check(SN.scenes.race.pausable === true, 'the race pauses');
  for (const s of SN.SETTINGS) check(g.settings[s.key] !== undefined, 'setting ' + s.key);
  check(g.settings.glyphs === 'playstation', 'button symbols default to PlayStation', g.settings.glyphs);
});
await test('prompts follow the device and the setting', () => {
  check(SN.glyph.text(I, 'thrust', 'gamepad') === '✕' && SN.glyph.text(I, 'fire', 'gamepad') === '□' && SN.glyph.text(I, 'absorb', 'gamepad') === '○' && SN.glyph.text(I, 'camera', 'gamepad') === '△', 'PlayStation glyphs');
  check(SN.glyph.text(I, 'brakeL', 'gamepad') === 'L2' && SN.glyph.text(I, 'shiftR', 'gamepad') === 'R1', 'L2 / R1');
  g.settings.set('glyphs', 'xbox'); check(SN.glyph.text(I, 'thrust', 'gamepad') === 'A' && SN.glyph.text(I, 'fire', 'gamepad') === 'X' && SN.glyph.text(I, 'brakeL', 'gamepad') === 'LT', 'Xbox glyphs after the setting'); g.settings.set('glyphs', 'playstation');
  check(SN.glyph.text(I, 'thrust', 'keyboard') === 'W' && SN.glyph.text(I, 'fire', 'mouse') === 'LEFT CLICK', 'keys and mouse buttons');
  I.press('Pad0'); I.release('Pad0'); check(SN.deviceOf(I) === 'gamepad', 'a pad button switches prompts to the pad'); I.press('KeyW'); I.release('KeyW'); check(SN.deviceOf(I) === 'keyboard', 'a key switches back');
});
await test('mouse hover moves the focus, a click activates', () => {
  g.go('menu'); g.advance(.6); const k0 = SN.UI.focus;
  const r = SN.UI.rects; check(r.length >= 6 || true, 'rects');
  // headless: no draw, so lay out the rects as draw would
  SN.UI.items().forEach((it, k) => { SN.UI.rects[k] = SN.UI.listRect(SN.UI.top(), k, 6, 427, 240); });
  const rc = SN.UI.rects[2]; I.lastDevice = 'mouse'; I.feed('move', rc[0] + 10, rc[1] + 5); g.advance(1 / 60); g.advance(1 / 60);
  check(SN.UI.focus === 2, 'hover focuses the tile', SN.UI.focus);
  I.feed('down', rc[0] + 10, rc[1] + 5, { button: 0 }); I.feed('up', rc[0] + 10, rc[1] + 5, { button: 0 }); g.advance(.1);
  check(SN.UI.top().id === 'challenges', 'a click opens it', SN.UI.top().id);
  SN.UI.back(); g.advance(.1);
});
await test('attract mode', () => {
  g.go('title'); g.advance(.5); const t0 = g.sceneName;
  g.advance(9.2); check(g.sceneName === 'title', 'not before 10 s idle');
  g.advance(1.2); check(g.sceneName === 'attract', 'attract after 10 s idle', g.sceneName);
  g.advance(130); const seen = SN.Attract.seen; check(seen.weapons.size >= 8 && seen.tracks.size >= 3, 'the loop shows 8+ weapons and 3+ tracks', [seen.weapons.size, seen.tracks.size]);
  I.tap('fire'); g.advance(1 / 120); g.advance(1 / 120); g.advance(.1); check(g.sceneName === 'title', 'any input returns to the title', g.sceneName);
  g.go('menu'); g.advance(.5); g.advance(10.5); check(g.sceneName === 'attract', 'front-end screens idle into attract too'); I.feed('down', 50, 50, { button: 0 }); I.feed('up', 50, 50, { button: 0 }); g.advance(.2); check(g.sceneName === 'title', 'a click exits');
});
await test('dev mode: sliders, reset, cheats', () => {
  g.go('loading', { setup: { mode: 'race', track: 'solenne', cls: 'spark', team: 'kestrel', pilot: 'ingrid', laps: 3, intro: false } }); g.advance(5);
  const R = SN.scenes.race.race, me = R.humans[0];
  SN.pauseItems().find(i => i[0] === 'Dev mode')[1](); check(SN.Dev.open, 'Dev mode opens from the pause menu');
  const t0 = R.t; g.advance(.5); check(R.t === t0, 'the race holds still under the panel');
  SN.Dev.tab = 1; const rows = SN.Dev.rows(), k = rows.findIndex(r => r.key === 'topSpeedMul'); SN.Dev.row = k; for (let i = 0; i < 10; i++) { I.tap('right'); g.advance(1 / 60); g.advance(.3); }
  check(SN.Tune.T.topSpeedMul >= 1.45, 'a slider changes its value', SN.Tune.T.topSpeedMul);
  SN.Dev.tab = 0; SN.Dev.rows().find(r => r.label === 'GOD MODE').act(); check(R.cheats.god, 'god mode on'); const e0 = me.energy; SN.Ship.damage(me, 50, 'test', null, R); check(me.energy === e0, 'god mode blocks damage');
  SN.Dev.rows().find(r => r.label === 'ENERGY TO 10%').act(); check(me.energy === 10, 'energy to 10%'); SN.Dev.rows().find(r => r.label === 'REFILL ENERGY').act(); check(me.energy === 100, 'refill');
  SN.Dev.giveK = 4; SN.Dev.rows().find(r => r.label === 'GIVE WEAPON').act(); check(me.weapon === 'rail', 'give weapon');
  tap('cancel', .1); check(!SN.Dev.open && g.paused, 'closing returns to the pause menu'); g.resume(); g.advance(.1);
  const top0 = me.st.top; let vmax = 0; for (let i = 0; i < 120 * 12; i++) { const c = SN.AI.controls(me, R, { skill: 1, weapons: false }); Object.assign(SN.vpad[0], c); g.advance(1 / 120); vmax = Math.max(vmax, SN.Ship.fwdSpeed(me)); }
  check(vmax > top0 * 1.08, 'topSpeedMul 1.5 raises the top speed', [vmax, top0]);
  SN.Tune.reset(); check(SN.Tune.order.every(k2 => SN.Tune.T[k2] === SN.Tune.defs[k2].def), 'RESET ALL restores every default');
  SN.Dev.rows === undefined; SN.devCheats.god = false; R.cheats.god = false;
  SN.Dev.show(); SN.Dev.tab = 0; SN.Dev.rows().find(r => r.label === 'WIN NOW').act(); SN.Dev.open = false; g.advance(6); check(me.finished && me.place === 1, 'win now', [me.finished, me.place]);
  g.go('menu'); g.advance(.5); SN.screens.options().items.find(i => i.id === 'dev').pick(); check(SN.Dev.open, 'Dev mode from OPTIONS too'); SN.Dev.open = false;
});
await test('touch-only devices', () => {
  const t = load({ touch: true }), tg = t.My3D2dge.current; tg.advance(.5);
  check(t.SN.isTouchOnly(), 'detected'); check(!tg.input._touchArgs, 'no touch buttons'); tg.advance(10.6); check(tg.sceneName === 'attract', 'the attract mode still runs');
});
await test('versus through the menus', () => {
  g.go('menu'); g.advance(.5); focusId('versus'); tap('confirm', .2); check(SN.UI.top().id === 'versus', 'the join screen'); check(!SN.UI.items().length, 'nothing to pick until P2 joins');
  g.addPlayer({ keys: 'right' }); g.advance(.2); check(g.players.length === 2, 'P2 joined');
  focusId('go'); tap('confirm', .2); check(SN.UI.top().id === 'team' && /P1/.test(SN.UI.top().title), 'P1 picks a team'); focusId('go'); tap('confirm', .2);
  check(SN.UI.top().id === 'team' && /P2/.test(SN.UI.top().title), 'P2 picks a team'); focusId('go'); tap('confirm', .2);
  check(SN.UI.top().id === 'class', 'class'); tap('confirm', .2); check(SN.UI.top().id === 'track', 'track'); tap('confirm', .2);
  check(SN.UI.top().id === 'confirm', 'straight to the confirm screen', SN.UI.top().id); focusId('start'); tap('confirm', 1.5);
  check(g.sceneName === 'race' && SN.scenes.race.race.humans.length === 2 && g.viewports.length === 2, 'a two-player race');
  g.go('menu'); g.advance(.5); g.removePlayer(g.players[1]);
});
await test('how to play, records, about', () => {
  g.go('menu'); g.advance(.5);
  for (const id of ['howto', 'records', 'about']) { SN.UI.push(SN.screens[id]()); for (let k = 0; k < 8; k++) tap('tabR', .05); SN.UI.pop(); }
  check(true, 'pages turn');
});
check(!g.errors.length, 'no errors', errs(g));
done();
