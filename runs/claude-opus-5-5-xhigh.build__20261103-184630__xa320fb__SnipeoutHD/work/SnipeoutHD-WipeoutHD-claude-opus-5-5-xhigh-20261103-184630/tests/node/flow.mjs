// flow: title -> menu -> setup -> race -> results -> replay -> menu by scripted input; the mouse (hover moves the focus,
// a click activates); the pause items; the settings; button labels per device and setting; the touch-only notice;
// the attract mode's timing, content and exit; dev mode's sliders, reset and every cheat.
import { load } from '../lib/vm.mjs';
import { bot, drive } from '../lib/bot.mjs';
export async function run(T) {
  const { SN, game } = load({ quiet: true }); await game.booted;
  const I = game.input, snap = () => game.debug.snapshot(), adv = s => game.advance(s), tap = (a, s = .25) => { I.tap(a); adv(s); };
  adv(1); T.check('the game boots to the title', snap().scene === 'title', snap().scene);
  tap('start', 1); T.check('start opens the main menu', snap().scene === 'front' && snap().screen === 'main', snap());
  // the mouse: hover moves the focus, a click activates
  { const s = SN.UI.top(), it = s.items[2]; adv(.5); const r = it._r; I.feed('move', r[0] + 10, r[1] + 5); adv(.1); T.check('mouse hover moves the focus', SN.UI.top().focus === 2, SN.UI.top().focus);
    I.feed('down', r[0] + 10, r[1] + 5); I.feed('up', r[0] + 10, r[1] + 5); adv(.3); T.check('a click activates the tile', snap().screen === 'challenges', snap().screen); tap('cancel'); I._fedAt = null; }
  T.check('back returns to the main menu', snap().screen === 'main', snap().screen);
  // quick race setup by taps (the menu kept its focus on CHALLENGES)
  tap('up'); tap('confirm'); T.check('quick race opens the class select', snap().screen === 'cls', snap().screen);
  tap('right'); tap('confirm'); T.check('a locked class says so and stays', snap().screen === 'cls', snap().screen); tap('left');
  tap('confirm'); T.check('the class opens the track select', snap().screen === 'track', snap().screen);
  tap('tabR'); T.check('R1 / E pages to the next circuit', SN.setupState.track === 'karakum', SN.setupState.track); tap('tabL');
  tap('confirm'); T.check('the track opens the team select', snap().screen === 'team', snap().screen);
  tap('right'); T.check('right changes the team', SN.UI.top().i === 1, SN.UI.top().i); tap('left');
  tap('down'); tap('down'); tap('confirm'); T.check('confirm opens the summary', snap().screen === 'confirm', snap().screen);
  tap('right'); T.check('laps change with left / right', SN.setupState.laps === 4, SN.setupState.laps); tap('left'); tap('left'); tap('left');
  tap('down'); tap('confirm', 1.5); T.check('START RACE loads the race', snap().scene === 'race' && snap().state === 'intro', snap());
  tap('confirm', .2); T.check('the intro skips on confirm', snap().state === 'grid' || snap().state === 'countdown', snap().state);
  // the pause menu's items
  { const items = (game.o.menu.items() || []).filter(Boolean).map(x => x[0]); T.check('the pause menu has Restart, Camera, How to play and Dev mode', ['Restart', 'How to play', 'Dev mode'].every(n => items.includes(n)) && items.some(n => n.startsWith('Camera')), items);
    T.check('a race has no End run', !items.includes('End run'), items); }
  // camera cycling
  { const c = game.debug.cams()[0], m0 = c.mode; tap('camera', .1); T.check('camera cycles chase -> far -> cockpit', c.mode !== m0, [m0, c.mode]); tap('camera', .1); tap('camera', .1); }
  // drive it with the bot to the results, then the replay
  { const b = bot(SN, game); let t = 0; while (snap().scene !== 'results' && t < 260) { drive(game, [b], .5); t += .5; } b.stop();
    T.check('the race ends in the results', snap().scene === 'results', snap()); adv(5);
    T.check('the results offer CONTINUE / RETRY / REPLAY', (SN.UI.top().items || []).map(i => i.label).join(',') === 'MENU,RETRY,REPLAY', (SN.UI.top().items || []).map(i => i.label));
    const rec = game.debug.race().recording; T.check('the race kept a recording', rec && rec.frames[0].length > 10 && rec.hash, rec && rec.frames[0].length);
    tap('right'); tap('right'); tap('confirm', 1); T.check('REPLAY plays the race again', snap().scene === 'replay', snap().scene);
    adv(4); tap('tabR', .5); tap('cancel', 1); T.check('cancel leaves the replay for the results', snap().scene === 'results', snap().scene);
    const v = SN.Replay.verify(rec); T.check('the replay matches the race exactly (hash)', v.ok, [v.hash, v.want]);
    adv(5); tap('confirm', 1); T.check('MENU returns to the main menu', snap().scene === 'front' && snap().screen === 'main', snap()); }
  // settings, labels, glyphs
  { const S = game.settings; for (const k of ['difficulty', 'units', 'defaultCam', 'hudSize', 'subtitles', 'announcer', 'speedLines', 'bloom', 'picture3d', 'shadows3d', 'filter3d', 'glyphs']) T.check('setting ' + k + ' exists', S.spec(k) !== undefined, k);
    T.check('button symbols default to PlayStation, in Display', S.glyphs === 'playstation' && S.spec('glyphs').group === 'Display', [S.glyphs, S.spec('glyphs').group]);
    T.check('gamepad labels are PlayStation symbols', I.label('fire', 'gamepad') === '□' && I.label('thrust', 'gamepad') === '✕' && I.label('absorb', 'gamepad') === '○', [I.label('fire', 'gamepad'), I.label('thrust', 'gamepad')]);
    S.set('glyphs', 'xbox'); T.check('the Xbox setting shows A B X Y', I.label('fire', 'gamepad') === 'X' && I.label('thrust', 'gamepad') === 'A', I.label('fire', 'gamepad')); S.set('glyphs', 'playstation');
    T.check('keyboard labels name the PC keys', I.label('thrust', 'keyboard') === 'W' && I.label('fire', 'keyboard') === 'Space' && I.label('brakeL', 'keyboard') === 'Q', [I.label('thrust', 'keyboard'), I.label('fire', 'keyboard')]);
    T.check('mouse labels name the buttons', I.label('fire', 'mouse') === 'Left click' && I.label('absorb', 'mouse') === 'Right click', [I.label('fire', 'mouse'), I.label('absorb', 'mouse')]);
    I.press('Pad0'); adv(.05); I.release('Pad0'); T.check('prompts follow the device used last (pad)', SN.glyph.device(I) === 'gamepad', I.lastDevice); I.press('KeyW'); adv(.05); I.release('KeyW'); T.check('…then the keyboard', SN.glyph.device(I) === 'keyboard', I.lastDevice);
    T.check('no touch controls', I.touchEnabled === false); }
  // the attract mode: not at 9.9 s, at 10 s; content across the loop; any input exits within a step
  { SN.flow.toTitle(); adv(1); SN.attract.idleT = 0; if (process.env.DBG) { const ai = SN.attract.anyInput; SN.attract.anyInput = I2 => { const r = ai(I2); if (r) console.log('input at', game.real.toFixed(2), [...I2._now], [...I2.held], !!I2.clicked(), game.sceneName); return r; }; } if (process.env.DBG) { for (let q = 0; q < 10; q++) { adv(.98); console.log('t', q, game.sceneName, SN.attract.idleT.toFixed(2), game._fade ? 'fade' : '', game._next ? 'next' : ''); } } else adv(9.8); T.check('no attract at 9.9 s idle', snap().scene === 'title', snap().scene); adv(.4); adv(.4); T.check('the attract starts after 10 s idle', snap().scene === 'attract', snap().scene);
    SN.attract.seen.weapons.clear(); SN.attract.seen.tracks.clear(); adv(150);
    T.check('the attract shows at least 8 weapons', SN.attract.seen.weapons.size >= 8, [...SN.attract.seen.weapons]); T.check('the attract shows at least 3 circuits', SN.attract.seen.tracks.size >= 3, [...SN.attract.seen.tracks]);
    I.tap('fire'); adv(1 / 120); adv(1 / 120); adv(1 / 120); T.check('any input exits the attract to the title', snap().scene === 'title', snap().scene); }
  // touch-only: the notice, a settings button, no touch controls, the attract still runs
  { SN._fakeTouchOnly = true; adv(.5); tap('start', .5); T.check('touch-only: start does not leave the title', snap().scene === 'title', snap().scene); SN.attract.idleT = 0; adv(10.5); T.check('touch-only: the attract still runs', snap().scene === 'attract', snap().scene); SN._fakeTouchOnly = false; I.tap('confirm'); adv(.2); }
  // dev mode: from the front end and the pause menu; sliders, reset, cheats
  { SN.flow.start({ mode: 'race', track: 'solenne', cls: 'SPARK', team: 'kestrel', pilot: 'vale', intro: false, seed: 3 }); adv(1.5);
    const devItem = game.o.menu.items().find(x => x && x[0] === 'Dev mode'); devItem[1](); adv(.1); T.check('Dev mode opens from the pause menu', SN.dev.isOpen, SN.dev.isOpen);
    const R = game.debug.race(), pl = R.player, t0 = R.t; adv(1); T.check('the race holds still under dev mode', R.t === t0, [t0, R.t]);
    SN.dev.tab = 1; SN.dev.focus = 2; adv(.05); const k = SN.dev.rows[2].key, v0 = SN.Tune.T[k]; tap('right', .05); T.check('right on a slider changes it', SN.Tune.T[k] > v0, [k, v0, SN.Tune.T[k]]);
    SN.dev.focus = SN.dev.rows.length - 1; tap('confirm', .05); T.check('RESET ALL restores every default', SN.Tune.order.every(q => SN.Tune.T[q] === SN.Tune.specs[q].def));
    SN.Tune.set('topSpeedMul', 1.5); const st = SN.craftStats('kestrel', 'SPARK'); SN.Tune.reset(); T.check('topSpeedMul 1.5 raises top speed', st.top > SN.craftStats('kestrel', 'SPARK').top * 1.45, st.top);
    const cheat = label => SN.dev.cheatRows().find(r => r.label.startsWith(label));
    SN.dev.tab = 0; cheat('God mode').act(); pl.energy = 50; SN.Ship.damage(pl, 30, 'wall', null, R); T.check('god mode: no damage', pl.energy === 50, pl.energy); cheat('God mode').act();
    cheat('Give weapon').act(); T.check('give weapon', pl.weapon === 'swarm', pl.weapon);
    cheat('Infinite weapon').act(); R.weapons.fire(pl, 'swarm'); T.check('infinite weapon: it comes back', pl.weapon === 'swarm', pl.weapon); cheat('Infinite weapon').act();
    cheat('Refill energy').act(); T.check('refill energy', pl.energy === 100); cheat('Energy to 10%').act(); T.check('energy to 10%', pl.energy === 10); cheat('Refill energy').act();
    cheat('Skip to final lap').act(); T.check('skip to the final lap', pl.lapsDone === R.laps - 1, pl.lapsDone);
    cheat('Freeze AI').act(); cheat('AI weapons off').act(); cheat('Ghost AI').act(); T.check('freeze AI, AI weapons off, ghost AI', SN.cheats.freezeAI && SN.cheats.aiWeaponsOff && SN.cheats.ghostAI); cheat('Freeze AI').act(); cheat('AI weapons off').act(); cheat('Ghost AI').act();
    cheat('Eliminate all AI').act(); T.check('eliminate all AI', R.ships.filter(s => s.control === 'ai').every(s => s.elim), R.ships.map(s => s.elim));
    cheat('Unlock everything').act(); T.check('unlock everything', SN.save.classUnlocked('SINGULARITY') && SN.save.tierOpen('t4'), SN.save.data.unlocked);
    const rs = cheat('Reset season'); rs.act(); T.check('reset season asks first', SN.dev.confirmReset); cheat('Reset season').act(); T.check('reset season clears it', !SN.save.classUnlocked('FLARE') && !SN.save.data.started, SN.save.data.unlocked);
    cheat('Win now').act(); adv(.1);
    tap('cancel', .2); T.check('cancel closes dev mode back to the pause menu', !SN.dev.isOpen && game.paused, [SN.dev.isOpen, game.paused]); game.resume(); adv(12); T.check('win now ends the race', snap().scene === 'results', { scene: snap().scene, state: game.debug.race().state, fin: game.debug.race().ships.map(s => [s.finished, s.dnf, s.elim]), paused: game.paused });
    // overclock's pause menu has End run
    SN.flow.start({ mode: 'overclock', track: 'solenne', team: 'kestrel', pilot: 'vale', intro: false }); adv(1.5); T.check('overclock pauses with End run', game.o.menu.items().some(x => x && x[0] === 'End run')); }
  T.check('no errors anywhere in the flow', game.errors.length === 0, game.errors.map(e => e.where + ': ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 4).join(' | ')));
}
