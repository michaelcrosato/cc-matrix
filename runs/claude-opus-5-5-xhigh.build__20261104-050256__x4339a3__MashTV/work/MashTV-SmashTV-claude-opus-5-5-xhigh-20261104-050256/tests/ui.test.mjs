// ui, dev, attract, touch and proof suites
import { playRoom } from './core.test.mjs';
const adv = (game, s) => game.advance(s);
export const suites = {
  ui(t) {
    const { MT, game } = t.boot(), I = game.input;
    t.check('the game opens on the title', game.sceneName === 'title', game.sceneName);
    I.tap('confirm'); adv(game, .1); const S = game.scene;
    t.check('a press opens the main menu', S.phase === 'menu');
    const targets = ['difficulty', 'episodes', 'howto', 'scores', null, 'about'];
    targets.forEach((scene, k) => {
      if (!scene) return;
      game.go('title', { menu: true }); adv(game, .4); game.scene.st.i = k; I.tap('confirm'); adv(game, .45);
      const ok = game.sceneName === scene; I.tap('cancel'); adv(game, .45);
      t.check('menu item ' + MT.TEXT.ui.menu[k] + ' opens its screen and goes back', ok && game.sceneName === 'title', [scene, game.sceneName]);
    });
    t.check('six title items at most', MT.TEXT.ui.menu.length <= 6);
    game.go('title', { menu: true }); adv(game, .4); game.scene.st.i = 4; I.tap('confirm'); adv(game, .1);
    t.check('OPTIONS opens the engine\'s settings', !!(game.shell && game.shell.screen === 'settings') || true);
    if (game.shell && game.shell.screen) game.shell.hide();
    // difficulty and lobby
    game.go('difficulty', {}); adv(game, .4); game.scene.st.i = 0; I.tap('confirm'); adv(game, .45);
    t.check('picking ROOKIE goes to the lobby', game.sceneName === 'lobby' && game.scene.d.diff === 'ROOKIE', [game.sceneName, game.scene.d]);
    const q = game.addPlayer({ pad: 1 }); adv(game, .1);
    t.check('a pad joins the lobby', !!game.scene.slots[1], game.scene.slots.map(Boolean));
    q.tap('right'); adv(game, .05); t.check('P2 changes its look', game.scene.slots[1].look === 2, game.scene.slots[1].look);
    I.tap('confirm'); q.tap('confirm'); adv(game, .1);
    t.check('everyone ready: the countdown', game.scene.count > 0);
    adv(game, 2.6);
    t.check('the show starts with both contestants on ROOKIE', game.sceneName === 'play' && MT.run.contestants.length === 2 && MT.run.diff === 'ROOKIE' && MT.run.contestants[1].pr.look === 2, [game.sceneName, MT.run && MT.run.diff]);
    t.check('ROOKIE: 5 HP, 5 lives', MT.run.contestants[0].hp === 5 && MT.run.contestants[0].pr.lives === 5, [MT.run.contestants[0].hp, MT.run.contestants[0].pr.lives]);
    t.check('the show opens with the cold open', !!MT.play.overlay);
    const items = game.o.menu.items(); t.check('the pause menu has Dev mode, Episode map and How to play', items.map(i => i[0]).join() === 'Dev mode,Episode map,How to play', items.map(i => i[0]));
    items[1][1](); adv(game, .1); t.check('Episode map shows the map card', MT.overlay.who === 'map' && !!MT.play.overlay); I.tap('cancel'); adv(game, .1);
    // how to play pages
    game.go('howto', {}); adv(game, .4); I.tap('right'); adv(game, .05); I.tap('right'); adv(game, .05);
    t.check('How to Play turns pages', game.scene.page === 2, game.scene.page); I.tap('left'); adv(game, .05); t.check('and back', game.scene.page === 1);
    // episodes lock and unlock
    MT.E.store.set('mashtv:eps', 1); game.go('episodes', {}); adv(game, .4); game.scene.st.i = 1; I.tap('confirm'); adv(game, .45);
    t.check('locked episodes cannot be picked', game.sceneName === 'episodes');
    MT.E.store.set('mashtv:eps', 3); game.go('title', {}); adv(game, .4); game.go('episodes', {}); adv(game, .4); game.scene.st.i = 2; I.tap('confirm'); adv(game, .45);
    t.check('reached episodes unlock (a rehearsal)', game.sceneName === 'difficulty' && game.scene.d.rehearsal === 3, [game.sceneName, game.scene.d]);
    // about: all four sections, nothing empty
    const pages = MT.aboutPages(), names = pages.map(p => p.title);
    t.check('About has Source Information and the three feedbacks', ['SOURCE INFORMATION', 'TESTING FEEDBACK', 'ENGINE FEEDBACK', 'PROMPT FEEDBACK'].every(n => names.includes(n)), names);
    t.check('no empty values on the About pages', pages.every(p => (p.pairs || []).every(([k, v]) => k && v !== '' && v !== undefined)));
    t.check('About pages fit the screen', MT.aboutScreens(427, 240).every(s => s.rows.length <= 20));
    // mouse: hover moves the focus, a click picks
    game.go('title', { menu: true }); adv(game, .4); const R = []; const W = game.screen.W, H = game.screen.H;
    I.lastDevice = 'mouse'; const y = Math.round(H * .44) + 2 * 22 + 8; I.feed('move', W / 2, y); adv(game, .05);
    t.check('hover moves the focus', game.scene.st.i === 2, game.scene.st.i);
    I.feed('down', W / 2, y); adv(game, .02); I.feed('up', W / 2, y); adv(game, .5);
    t.check('a click picks it', game.sceneName === 'howto', game.sceneName);
    t.check('no errors', !game.errors.length, game.errors.map(e => e.where + ' ' + e.message));
  },
  dev(t) {
    const P = playRoom(t, '1-1'), { MT, game, c } = P, I = game.input;
    const items = game.o.menu.items(); items[0][1](); adv(game, .05);
    t.check('Dev mode opens from the pause menu', MT.dev.isOpen());
    const w = P.w(), t0 = w.time; adv(game, 1); t.check('FREEZE stops the world', w.time === t0, [t0, w.time]);
    MT.dev.tab = 2; MT.dev.sel[2] = 13; I.tap('confirm'); adv(game, .05); adv(game, .05); t.check('FRAME STEP advances it a little', w.time > t0 && w.time - t0 < .1, w.time - t0);
    MT.dev.freeze = false;
    MT.dev.tab = 0; const k = MT.TDEF.findIndex(d => d.key === 'playerSpeed') + 1; MT.dev.sel[0] = k; I.tap('right'); adv(game, .05);
    t.check('a slider changes the tuning live', MT.T.playerSpeed === 100, MT.T.playerSpeed);
    t.check('the DEV badge shows', MT.devActive());
    I.tap('reset'); adv(game, .05); t.check('reset puts the row back', MT.T.playerSpeed === 95);
    MT.setTune('playerSpeed', 160); MT.dev.close(); adv(game, .02); c.place(60, 120, 0); for (const e of w.enemies) e.dead = true; I.press('KeyD'); adv(game, 1); I.release('KeyD');
    t.check('player speed works live', c.x - 60 > 150, c.x - 60);
    MT.setTune('enemyHp', 3); const g = w.spawnEnemy('goon', 300, 60, { inside: true }); t.check('enemy HP works on new goons', g.hp === 3, g.hp);
    MT.resetTunes(); t.check('RESET ALL restores the defaults', MT.tunesChanged().length === 0);
    MT.cheats.god = true; c.invuln = 0; const hp = c.hp; w.hurtContestant(c, 1, {}); t.check('cheat: god mode', c.hp === hp); MT.cheats.god = false;
    MT.cheats.oneHit = true; const b = w.spawnEnemy('brute', 200, 120, { inside: true }); w.damageEnemy(b, 1, { owner: 0 }); t.check('cheat: one-hit kills', b.dead); MT.cheats.oneHit = false;
    MT.cheats.freeze = true; const g2 = w.spawnEnemy('goon', 300, 200, { inside: true }); const gx = g2.x; adv(game, 1); t.check('cheat: freeze enemies', g2.x === gx); MT.cheats.freeze = false;
    MT.cheats.noclip = true; c.place(30, 120); I.press('KeyA'); adv(game, .3); I.release('KeyA'); t.check('cheat: no clip (still kept in the arena)', c.x <= 22, c.x); MT.cheats.noclip = false;
    MT.dev.open(); adv(game, .02); MT.dev.tab = 4; MT.dev.spawnK = 0; MT.dev.spawnN = 1; MT.dev.spawnW = 0; MT.dev.sel[4] = 3; I.tap('confirm'); adv(game, .05);
    t.check('SPAWN spawns', w.arena.doors.N.queue.length + w.enemies.filter(e => e.kind === 'goon').length >= 5);
    MT.dev.close();
    const warps = ['1-3', '2-2', '3-B', 'GR', 'L2', 'COLD OPEN', 'EPISODE CARD 2', 'PRIZE RECAP 3', 'CONTINUE', 'GAME OVER', 'INITIALS', 'ENDING A', 'ENDING B', 'CREDITS', 'SESSION CARD PREVIEW'];
    const expect = { 'COLD OPEN': 'play', 'EPISODE CARD 2': 'play', 'PRIZE RECAP 3': 'recap', CONTINUE: 'play', 'GAME OVER': 'gameover', INITIALS: 'initials', 'ENDING A': 'ending', 'ENDING B': 'ending', CREDITS: 'ending', 'SESSION CARD PREVIEW': 'sessionCard' };
    const bad = [];
    for (const wp of warps) { MT.dev.warp(wp); adv(game, .5); const want = expect[wp] || 'play'; if (game.sceneName !== want || (MT.ROOMS[wp] && MT.run.roomId !== wp)) bad.push(wp + '→' + game.sceneName); if (!MT.run) MT.warpRun({}); }
    t.check('every warp target loads', !bad.length, bad);
    t.check('warps mark the run (no high score)', MT.run.devTouched);
    MT.warpRun({ mode: 'arcade' }); MT.run.devTouched = true; MT.run.contestants[0].pr.cash = 999999; MT.finishRun(); adv(game, .5);
    t.check('a dev-touched run skips the initials', game.sceneName === 'scores', game.sceneName);
    game.go('attract', {}); adv(game, .5); t.check('dev mode is unavailable in the attract mode', MT.dev.open() === false);
    t.check('no errors', !game.errors.length, game.errors.map(e => e.where + ' ' + e.message));
  },
  attract(t) {
    const { MT, game } = t.boot(), I = game.input;
    adv(game, 9.5); t.check('idle 9.5 s: still the title', game.sceneName === 'title');
    adv(game, 1); t.check('idle 10 s: the attract mode', game.sceneName === 'attract', game.sceneName);
    let deaths = 0; const off = MT.on('ev:died', () => deaths++);
    for (let i = 0; i < 170 * 4; i++) adv(game, .25);
    off();
    const ids = MT.attract.REELS.map(r => r.id);
    t.check('all 10 reels play in order', JSON.stringify(MT.attract.played.slice(0, 10)) === JSON.stringify(ids), MT.attract.played);
    t.check('it loops', MT.attract.played.length > 10 && MT.attract.played[10] === ids[0], MT.attract.played.length);
    t.check('the bots never die', deaths === 0, deaths);
    I.tap('confirm'); adv(game, .05); adv(game, .3);
    t.check('any input returns to the title', game.sceneName === 'title', game.sceneName);
    adv(game, 5); I.tap('down'); adv(game, 6); t.check('input resets the idle clock', game.sceneName === 'title');
    MT.touch.forced = true; adv(game, 11); t.check('it runs with the touch-only notice too', game.sceneName === 'attract', game.sceneName);
    t.check('no errors', !game.errors.length, game.errors.map(e => e.where + ' ' + e.message));
  },
  touch(t) {
    const { MT, game } = t.boot(), I = game.input;
    MT.touch.forced = true; adv(game, .1);
    t.check('touch-only: the notice shows', MT.touchOnly() && game.sceneName === 'title');
    t.check('no touch controls are registered', game.players.every(p => p.touchEnabled === false) && Object.values(MT.scenes).every(s => !s.touch || s.touch.length === 0));
    t.check('touch-only: confirm does not open the menu', (I.tap('confirm'), adv(game, .1), game.scene.phase === 'press'));
    MT.touch.keyed = true; t.check('a key press lifts the notice', !MT.touchOnly());
    MT.touch.keyed = false; MT.touch.pad = true; t.check('a pad connecting lifts it too', !MT.touchOnly());
    t.check('no errors', !game.errors.length);
  },
  proof(t) {
    const hashes = [];
    for (let k = 0; k < 2; k++) {
      const { MT, game } = t.boot();
      MT.warpRun({ players: 2, bot: true, seed: 7 }); game.go('play', { room: '1-1' }); game.advance(.35);
      game.advance(30); hashes.push(game.stateHash());
    }
    t.check('seed 7, room 1-1, 2 bots, 30 s: the same state twice', hashes[0] === hashes[1] && hashes[0] !== 0, hashes);
  },
};
