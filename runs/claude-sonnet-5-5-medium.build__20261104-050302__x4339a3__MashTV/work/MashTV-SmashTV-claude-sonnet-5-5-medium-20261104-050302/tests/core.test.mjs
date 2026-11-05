import { load, arena } from './lib.mjs';
export const suites = {
  core(C) {
    const { MT, E, game } = load();
    C.eq('tuning default playerSpeed', MT.T.playerSpeed, 95); C.eq('25 tuning sliders', Object.keys(MT.TDEF).length, 25);
    MT.setTune('playerSpeed', 120); C.eq('set tune', MT.T.playerSpeed, 120); C.ok('tuneTouched', MT.tuneTouched());
    MT.setTune('playerSpeed', 9999); C.eq('tune clamps to max', MT.T.playerSpeed, 160);
    C.eq('export tuning diff', MT.tuneDiff().playerSpeed, 160);
    MT.resetTune('playerSpeed'); C.eq('reset one', MT.T.playerSpeed, 95); MT.setTune('enemyHp', 2); MT.resetTunes(); C.eq('reset all', MT.T.enemyHp, 1); C.ok('untouched after reset', !MT.tuneTouched());
    MT.seedAll(5); const a = [MT.R.ai(), MT.R.spawn(), MT.R.drops()]; MT.seedAll(5); const b = [MT.R.ai(), MT.R.spawn(), MT.R.drops()]; C.ok('rng streams deterministic', a.every((v, i) => v === b[i]));
    let n = 0; const off = MT.on('x', v => { n += v; }); MT.emit('x', 2); off(); MT.emit('x', 5); C.eq('event bus', n, 2);
    C.eq('arena size', MT.AW * 100 + MT.AH, 36800 + 240); C.eq('door N cells', MT.DOORS.N.cells.length, 3); C.eq('cell->world', MT.cellXY(0, 0)[0], 24); C.eq('cell->world y', MT.cellXY(20, 12)[1], 216);
    const m = MT.buildMap('studio'); C.eq('map cols', m.cols || m.width || 23, 23); C.ok('wall at 0,0', m.cell(0, 0) === 1); C.ok('door cell is type 2', m.cell(11, 0) === 2); C.ok('interior open', m.cell(5, 5) === 0);
    C.ok('no errors on boot', game.errors.length === 0);
    C.ok('every room has data', Object.keys(MT.ROOMS).length >= 22); C.eq('9 keys in the game', Object.values(MT.ROOMS).filter(r => r.key && !r.lightning).length, 9);
    for (const k of ['goon', 'clapbot', 'popper', 'mime', 'disco', 'discoBig', 'heckler', 'hecklerKing', 'tank', 'snake', 'brute', 'crate', 'lock']) C.ok('enemy registry ' + k, !!MT.ENEMIES[k]);
  },
  input(C) {
    const A = arena(); const { game, MT, w, c } = A; const I = game.input;
    I.press('ArrowUp'); A.adv(.2); const aim = c.aim; C.ok('ArrowUp fires up (aim up the screen)', c.intent && c.intent.fire && Math.abs(aim - Math.atan2(-1, 0)) < .2 || Math.sin(aim) < -.5, 'aim ' + aim); I.release('ArrowUp');
    C.ok('play preset has aim actions', !!I.map.aimUp && !I.map.aimUp.includes('Pad12'));
    game.pause('test'); A.adv(.1); I.release('ArrowUp'); C.ok('menu preset while paused', !!I.preset && I.preset === MT.MENU); game.resume(); A.adv(.1); C.ok('play preset after resume', I.preset === MT.PLAY);
    // glyph resolution by last device and family
    const pi = { lastDevice: 'gamepad', padStyle: () => 'playstation', bindings: {} }; C.eq('pad slide = L2 (Pad6)', MT.glyph.resolve('slide', pi).code, 'Pad6'); C.eq('pad bomb = R1', MT.glyph.resolve('bomb', pi).code, 'Pad5');
    C.eq('ps family', MT.glyph.family(pi), 'playstation'); C.eq('xbox family', MT.glyph.family({ padStyle: () => 'xbox' }), 'xbox');
    const ki = { lastDevice: 'keyboard', padStyle: () => 'playstation', bindings: {} }; C.eq('keyboard slide = Space', MT.glyph.resolve('slide', ki).code, 'Space'); C.eq('keyboard bomb = E', MT.glyph.resolve('bomb', ki).code, 'E');
    const mi = { lastDevice: 'mouse', padStyle: () => 'playstation', bindings: {} }; C.eq('mouse fire = left click', MT.glyph.resolve('fire', mi).kind, 'mouse');
    C.eq('default glyph setting', game.settings.glyphs, 'playstation'); game.settings.set('glyphs', 'xbox'); C.eq('xbox option applies to P1', game.input.padStyle(), 'xbox'); game.settings.set('glyphs', 'playstation');
    // pad stick intent
    I.padAim = [0, 1]; const it = MT.intentFrom(I, c, w); C.ok('right stick aims and fires', it.fire && it.aim !== null && it.aimSrc === 'pad'); I.padAim = null;
    I.press('KeyD'); A.adv(.3); C.ok('WASD moves', c.x > 190); I.release('KeyD');
  },
  audio(C) {
    const { MT, game } = load(); let threw = 0; const t = f => { try { f(); } catch (e) { threw++; } };
    for (const n of Object.keys(MT.SFX)) t(() => MT.sfx(n)); t(() => MT.crowd('cheer', .5)); for (const k of ['ooh', 'laugh', 'gasp', 'boo']) t(() => MT.crowd(k, 1)); t(() => MT.music.play('theme')); for (const s of Object.keys(MT.SONGS)) t(() => MT.music.play(s, { restart: true }));
    C.eq('audio calls never throw headless', threw, 0);
    const d1 = MT.babble.say('HELLO', 'lance'), d2 = MT.babble.say('GOOD EVENING, PLANET EARTH! I AM LANCE LUSTRE AND THIS IS THE SHOW!', 'lance'); C.ok('babble duration scales with text', d2 > d1 * 3, d1 + ' vs ' + d2);
    for (const v of ['lance', 'penny', 'annc', 'network', 'mashy', 'goon']) C.ok('voice ' + v, MT.babble.say('MASH TV!', v) > 0);
    for (const s of ['theme', 'studioBattle', 'warehouseFunk', 'finaleOverture', 'bossShowdown', 'commercial', 'recap', 'ending']) C.ok('song ' + s, MT.SONGS[s] && MT.SONGS[s].tracks.length >= 2);
    const w = { game, event() {}, cs: [], mode: 'solo' }; const evs = ['shot', 'laser', 'slide', 'hit', 'kill', 'boom', 'cash', 'bomb', 'showboat', 'multikill', 'hurt', 'lowHp', 'death', 'weapon', 'prize', 'key', 'life', 'prime', 'primeEnd', 'stunt', 'bankrupt', 'wheelStop', 'clear', 'exit', 'hurry', 'roomIntro', 'enemy', 'commercial', 'bossDead'];
    let rt = 0; for (const e of evs) t(() => MT.react.handle({ game, cs: [{ slot: 0, color: '#fff' }], mode: 'solo', session: false, demo: false }, { seq: 1, name: e, data: { slot: 0, x: 1, y: 1, w: 'spread', amt: 5, n: 1, name: 'X', value: 5, joke: 'J', seg: 0, kind: 'goon', first: true, gain: 5 } })); C.eq('every reaction id resolves without error', rt + threw, 0);
    C.ok('lines pool', MT.TEXT.pool.clear.length >= 5);
  }
};
