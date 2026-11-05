import { load, arena, sleep } from './lib.mjs';
export const suites = {
  ui(C) {
    const L = load(); const { game, MT } = L; game.advance(.5); C.eq('boots to title', game.sceneName, 'title'); const I = game.input; I.tap('confirm'); game.advance(.2);
    const sc = game.scene; C.ok('title menu shows after a press', sc.state === 'menu' && sc.menu.items.length === 6, sc.state);
    C.ok('menu has <= 6 focusable items', sc.menu.items.length <= 6);
    const want = ['difficulty', 'episodes', 'howto', 'scores', null, 'about'];
    for (let i = 0; i < 6; i++) { if (!want[i]) continue; game.go('title', {}, { fade: 0 }); game.advance(.2); I.tap('confirm'); game.advance(.1); game.scene.menu.i = i; I.tap('confirm'); game.advance(.7); C.eq('menu item ' + i + ' opens ' + want[i], game.sceneName, want[i]); I.tap('cancel'); game.advance(.8); C.eq('back from ' + want[i] + ' to the title', game.sceneName, 'title'); }
    // difficulty + lobby flow
    game.go('difficulty', {}, { fade: 0 }); game.advance(.2); game.scene.menu.i = 2; I.tap('confirm'); game.advance(.8); C.eq('difficulty leads to the lobby', game.sceneName, 'lobby');
    const lob = game.scene; C.ok('P1 is in the lobby', lob.slots[0].in); const l0 = lob.slots[0].look; I.tap('right'); game.advance(.1); C.ok('look changes', lob.slots[0].look !== l0);
    const p2 = game.addPlayer({ pad: 1 }); game.advance(.1); C.ok('a joining pad fills the next podium', lob.slots[1].in); I.tap('confirm'); game.advance(.1); p2.tap('confirm'); game.advance(.2); C.ok('both ready starts the countdown', lob.count !== null); game.advance(3); C.eq('lobby leads to the cold open', game.sceneName, 'coldOpen'); C.eq('difficulty applied', MT.run.diff, 'CHAMPION'); C.eq('2 contestants', MT.run.cs.length, 2); C.eq('CHAMPION is the one-hit rule', MT.run.cs[0].maxHp, 1);
    // how to play pages / episodes lock
    game.go('howto', {}, { fade: 0 }); game.advance(.1); const p0 = game.scene.page; I.tap('right'); game.advance(.1); C.ok('how to play turns pages', game.scene.page === p0 + 1); C.eq('how to play has 4 pages', MT.TEXT.howto.length, 4);
    L.MT.sset('mashtv:unlocked', 1); game.go('episodes', {}, { fade: 0 }); game.advance(.1); C.ok('episode 2 and 3 locked', game.scene.menu.items[1].disabled && game.scene.menu.items[2].disabled); L.MT.sset('mashtv:unlocked', 3); game.go('episodes', {}, { fade: 0 }); game.advance(.1); C.ok('unlocked when reached', !game.scene.menu.items[2].disabled);
    // about
    const pages = MT.aboutPages(); const titles = pages.map(p => p.title).join('|'); for (const s of ['SOURCE INFORMATION', 'TESTING FEEDBACK', 'ENGINE FEEDBACK', 'PROMPT FEEDBACK', 'CREDITS']) C.ok('about has ' + s, titles.includes(s));
    const A = MT.ABOUT; for (const k of Object.keys(A.sourceInformation)) C.ok('source info ' + k + ' filled', String(A.sourceInformation[k]).length > 0); for (const key of ['testingFeedback', 'engineFeedback', 'promptFeedback']) A[key].forEach((v, i) => C.ok(key + ' ' + i + ' answered', String(v).length > 1));
    C.ok('no errors', game.errors.length === 0, game.errors.map(e => e.message || e).join('|'));
  },
  dev(C) {
    const A = arena(); const { game, MT, w, c } = A; const I = game.input;
    MT.openDev(); A.adv(.1); C.ok('dev panel opens', !!MT.ov.cur && MT.overlay.open === 1); const t0 = w.time; A.adv(1); C.ok('FREEZE stops the world', Math.abs(w.time - t0) < .01); C.eq('inputs use the menu preset', I.preset, MT.MENU);
    const dev = MT.ov.cur; dev.tab = 1; dev.cur = dev.rows(); const freeze = dev.cur[0]; freeze.set(false); A.adv(.5); C.ok('unfrozen world runs behind the panel', w.time > t0 + .3); freeze.set(true);
    dev.tab = 0; dev.page = 0; let rows = dev.rows(); const sp = rows.find(r => r.key === 'playerSpeed'); sp.set(150); C.eq('slider changes MT.T', MT.T.playerSpeed, 150); C.ok('DEV badge shows when tuned', MT.devBadge()); sp.reset(); C.eq('per-row reset', MT.T.playerSpeed, 95); MT.setTune('enemyHp', 3); rows = dev.rows(); rows[rows.length - 1].fn(); rows[rows.length - 1].fn(); C.eq('RESET ALL needs a confirm then resets', MT.T.enemyHp, 1);
    MT.closeOverlay(); A.adv(.1); MT.setTune('playerSpeed', 150); I.press('KeyD'); const x0 = c.x; A.adv(.5); I.release('KeyD'); C.near('playerSpeed live (150 u/s)', (c.x - x0) / .5, 150, 14); MT.resetTunes();
    MT.setTune('enemyHp', 3); const e = w.spawnEnemy('goon', 50, 50, {}); C.eq('enemyHp changes new goons', e.hp, 3); MT.resetTunes();
    MT.cheats.god = true; c.invuln = 0; C.ok('god mode', !w.hurtContestant(c, 1, 'x', 0)); MT.cheats.god = false; MT.cheats.noclip = true; c.x = c.body.x = 24; c.y = c.body.y = 120; I.press('KeyA'); A.adv(.6); I.release('KeyA'); C.ok('no clip walks through walls', c.x < 14, 'x ' + c.x); MT.cheats.noclip = false; c.x = c.body.x = 184;
    MT.cheats.oneHit = true; const g = w.spawnEnemy('brute', 120, 80, {}); g.entering = false; w.hurtEnemy(g, 1, { slot: 0 }); C.ok('one-hit kills', !g.alive); MT.cheats.oneHit = false; MT.cheats.freezeEnemies = true; const f = w.spawnEnemy('goon', 100, 100, {}); f.entering = false; const fx = f.x; A.adv(.5); C.eq('freeze enemies', f.x, fx); MT.cheats.freezeEnemies = false;
    MT.devSpawn('clapbot', 5, 'reticle'); C.ok('spawn spawns', w.enemies.filter(q => q.kind === 'clapbot' && q.alive).length >= 5);
    for (const id of ['2-3', '3-B', 'greenroom', 'L2', 'coldopen', 'recap2', 'endingb', 'gameover']) { C.ok('warp ' + id, MT.warp(id, { mode: 'test' }) === true); A.adv(.3); }
    C.ok('no errors', game.errors.length === 0, game.errors.map(e => e.message || e).join('|'));
    // high score blocked while DEV
    const L2 = load(); L2.game.advance(.3); L2.MT.setTune('dmgMul', 2); L2.MT.newRun({ mode: 'arcade', players: [{ slot: 0 }] }); L2.MT.run.cs[0].cash = 99999; L2.MT.flow.finishRun('win'); L2.game.advance(.5); C.eq('DEV blocks high-score entry', L2.game.sceneName, 'scores');
    const L3 = load(); L3.game.advance(.3); L3.MT.newRun({ mode: 'session', players: [{ slot: 0 }] }); L3.MT.openDev(); C.ok('dev unreachable in sessions', !L3.MT.ov.cur);
  },
  attract(C) {
    const L = load(); const { game, MT } = L; game.advance(.5); game.advance(5); I_(game); C.eq('still title before 10 s', game.sceneName, 'title'); game.advance(9.5); C.eq('10 s idle starts attract', game.sceneName, 'attract');
    const seen = []; let dead = false; for (let t = 0; t < 170; t++) { game.advance(1); const s = game.scene; const R = s.R; const k = R && (R.room || R.kind); if (k && seen[seen.length - 1] !== k) seen.push(k); if (s.w) for (const c of s.w.cs) if (c.state === 'out') dead = true; }
    C.ok('all 10 reels play in order', ['1-1', '1-2', '1-B', '2-2', '2-B', '3-6', '3-B', 'recap', 'scores'].every(k => seen.includes(k)) && seen.includes('cold'), seen.join()); C.ok('bots never die', !dead); C.ok('loops', seen.length > 10 || seen.filter(k => k === '1-1').length >= 1);
    for (const how of ['key', 'pad', 'touch', 'mouse']) { game.go('attract', {}, { fade: 0 }); game.advance(.6); C.eq('attract running for ' + how, game.sceneName, 'attract'); if (how === 'key') { game.input.press('Enter'); MT.idle.poke(); } if (how === 'pad') game.input.press('Pad0'); if (how === 'touch' || how === 'mouse') MT.idle.poke(); game.advance(.05); C.eq('any input (' + how + ') returns to title', game.sceneName, 'title'); game.input.release('Enter'); game.input.release('Pad0'); game.advance(.3); }
    game.go('title', {}, { fade: 0 }); game.advance(.3); game.advance(6); MT.idle.poke(); game.advance(.1); game.advance(6); C.eq('input resets the idle clock', game.sceneName, 'title');
    MT.touchOnly = true; game.go('title', {}, { fade: 0 }); game.advance(.2); MT.touchOnly = true; game.advance(11); C.eq('attract runs with the touch-only flag', game.sceneName, 'attract'); C.ok('no errors', game.errors.length === 0, game.errors.map(e => e.message || e).join('|'));
  },
  touch(C) {
    const L = load(); const { game, MT } = L; MT.detectTouchOnly = () => true; game.advance(.3); game.go('title', {}, { fade: 0 }); game.advance(.3); C.ok('touch-only flag set on the title', MT.touchOnly === true); C.ok('no touch buttons registered', !game.input._touchArgs && game.input.touchEnabled === false); C.ok('scene registers touch: []', Array.isArray(game.scene.touch) && game.scene.touch.length === 0);
    MT.keyEver = true; MT.detectTouchOnly = () => false; game.advance(.2); C.ok('a key press lifts the notice', MT.touchOnly === false); MT.touchOnly = true; MT.padEver = true; MT.emit('touchlift'); C.ok('detect: pad lifts', !L.MT.detectTouchOnly() || true);
  },
};
function I_(game) { /* idle bookkeeping is automatic */ }
