import { run } from './lib/t.mjs';
import { load } from './lib/load.mjs';
import { startSite, finishSite } from './lib/play.mjs';
run('misc', async t => {
  // ---- the attract mode ----
  { const L = load({}), { game, I, step } = L, X = game.debug.internals; step(1);
    step(9); t.ok('attract: not before 10 s idle', game.sceneName === 'title');
    step(2); t.ok('attract: starts after 10 s idle on the title', game.sceneName === 'attract', game.sceneName);
    const clips = new Set(); for (let k = 0; k < 520; k++) { step(.25); if (X.G.attract) clips.add(X.G.attract.clip); }
    t.ok('attract: cycles its whole playlist', clips.size >= X.ATTRACT.length, [...clips].join(','));
    I.press('KeyA'); step(.1); I.release('KeyA'); step(.6); t.ok('attract: a key goes back to the title', game.sceneName === 'title', game.sceneName);
    step(11); t.ok('attract: and starts again after idling', game.sceneName === 'attract');
    I.feed('move', 100, 100); step(.05); I.feed('move', 140, 130); step(.6); t.ok('attract: a mouse move goes back', game.sceneName === 'title', game.sceneName);
    step(11); I.press('Pad0'); step(.1); I.release('Pad0'); step(.6); t.ok('attract: a pad button goes back', game.sceneName === 'title', game.sceneName);
    I.tap('start'); step(.8); step(11); t.ok('attract: a top menu page idles into it too', game.sceneName === 'attract', game.sceneName);
    t.ok('attract: no errors', !L.errs().length, L.errs().slice(0, 3).join(' | ')); }
  // ---- dev mode ----
  { const L = load({}), { game, I, D, step } = L, X = game.debug.internals; step(1);
    const H = startSite(L, 'hollow', 'hollow-1', { seed: 2 }); step(1);
    I.tap('pause'); step(.2); t.ok('dev: the pause menu opens', game.paused);
    t.ok('dev: the pause menu lists Dev mode', (game.o.menu.items || []).some(i => i[0] === 'Dev mode'));
    X.DEV.open(); step(.1); t.ok('dev: Dev mode opens its screen with the game running', X.G.ui.screen === 'dev' && !game.paused, X.G.ui.screen + ' ' + game.paused);
    const a = H.site.spawn('buck', { at: [0, 30], path: [[0, 30], [20, 32]], orders: [['walk', { to: 1 }]], hidden: false }); a.appear(); const w1 = a.gaitSpeed('walk');
    D.tuning('animalSpeed', 2); step(1 / 120); t.ok('dev: animal speed 2 doubles a walking deer', Math.abs(a.gaitSpeed('walk') / w1 - 2) < 1e-6);
    D.tuning('rounds', 8); game.settings.reset('Dev'); t.ok('dev: Reset to defaults restores every key', Object.keys(X.TUNE_DEFAULT).every(k => X.T(k) === X.TUNE_DEFAULT[k]));
    H.godMode = true; const doe = H.site.spawn('doe', { at: [2, 25], orders: [['hold']], hidden: false }); doe.appear(); step(.2); D.aimAt(1, doe, 'heart'); D.fire(1); step(.1); t.ok('dev: god mode means no benching', !H.players[0].benched); H.godMode = false;
    H.skipTo('site', 'hollow-3'); step(.2); t.ok('dev: jump to a site loads it', H.site && H.site.id === 'hollow-3');
    X.G.ui.hide(); X.DEV.startFree(); const x0 = H.lens.x; I.hold('up'); for (let k = 0; k < 60; k++) step(1 / 120); I.hold('up', false); H.setupLens(); t.ok('dev: the free camera moves the lens', Math.abs(H.lens.x - x0) + Math.abs(H.lens.y - H.cam.y) > 4); I.tap('cancel'); step(.1);
    t.ok('dev: no errors', !L.errs().length, L.errs().slice(0, 3).join(' | ')); }
  // ---- a touch-only device ----
  { const L = load({ touchOnly: true }), { game, I, step } = L, X = game.debug.internals; step(1);
    t.ok('touch: the title knows it is touch-only (Controller or keyboard required)', X.G.touchOnly === true);
    t.ok('touch: no touch buttons', game.input.touchEnabled === false);
    I.feed('down', 240, 140, { touch: true }); step(.05); I.feed('up', 240, 140, { touch: true }); step(.8); t.ok('touch: a tap does not start a game', game.sceneName === 'title', game.sceneName);
    step(11); t.ok('touch: the attract mode still runs', game.sceneName === 'attract', game.sceneName);
    I.feed('down', 240, 140, { touch: true }); step(.05); I.feed('up', 240, 140, { touch: true }); step(.8); t.ok('touch: a tap leaves it', game.sceneName === 'title', game.sceneName);
    I.press('KeyA'); step(.1); I.release('KeyA'); step(.1); t.ok('touch: a key clears the touch-only state', X.G.touchOnly === false); }
  // ---- saves ----
  { const storage = new Map(); let L = load({ storage }), X = L.game.debug.internals; L.step(1);
    let H = startSite(L, 'hollow', 'hollow-1', { seed: 1 }); L.game.debug.bot(true, { skill: 'expert', cheat: true }); finishSite(L, H);
    X.Records.trophy('iron-rack', { bagged: true, seen: 1, best: 80 }); X.Records.save();
    const bucks = X.Records.d.stats.bucks;
    L = load({ storage }); X = L.game.debug.internals; L.step(1);
    t.ok('saves: records and trophies survive a reload', X.Records.d.stats.bucks === bucks && bucks > 0 && X.Records.d.trophies['iron-rack'].bagged, X.Records.d.stats.bucks + ' vs ' + bucks);
    L.game.saves.save('auto', { data: { next: 1, scores: { hollow: 4000 } }, place: 'Bugle Ridge', level: 2 });   // (headless, the engine keeps save slots for the visit)
    L.I.tap('start'); L.step(.8); const menu = L.game.scenes.menu.top; t.ok('saves: the menu offers CONTINUE HUNT-OFF', menu && menu.items[0].label === 'CONTINUE HUNT-OFF', menu && menu.items[0].label);
    L.I.tap('confirm'); L.step(1); t.ok('saves: CONTINUE resumes at the next hunt', X.G.hunt && X.G.hunt.huntId === 'bugle' && X.G.hunt.mode === 'campaign'); }
  // ---- determinism ----
  { const sim = (extraFx) => { const L = load({}), X = L.game.debug.internals; L.step(1); const H = startSite(L, 'bugle', 'bugle-1', { seed: 9 }); L.game.debug.bot(true, { skill: 'average' }); for (let k = 0; k < 240; k++) { if (extraFx) for (let j = 0; j < 7; j++) X.RNG.stream('fx')(); L.step(.25); } return { hash: L.game.stateHash().join('|'), log: (H.site ? H.site.log : []).join(',') }; };
    const a = sim(false), b = sim(false), c = sim(true);
    t.ok('determinism: the same seed and inputs give the same state after 60 s', a.hash === b.hash);
    t.ok('determinism: cosmetic random draws never change the spawns', a.log === c.log && a.log.length > 0, a.log + ' vs ' + c.log); }
});
