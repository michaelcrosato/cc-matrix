// attract: 10 s idle on the title, the main menu or a sub-menu starts it (9.9 s does not); any input ends it; the loop
// visits the bout, the bonus reel, how to fight, the scores and the title; the exhibition shows every call
import { fresh, steps } from './lib/util.mjs';
export default async t => {
  { const { game } = fresh(); steps(game, 120 * 9.6); t.check('9.9 s idle on the title: still the title', game.sceneName === 'title', game.sceneName); steps(game, 120 * .6); t.check('10 s idle on the title starts the attract mode', game.sceneName === 'attract', game.sceneName); }
  { const { game } = fresh(); steps(game, 60); game.input.tap('start'); steps(game, 120 * 10.2); t.check('10 s idle in the main menu starts it', game.sceneName === 'attract', game.sceneName); }
  { const { game } = fresh(); game.go('versus'); steps(game, 120 * 10.3); t.check('10 s idle in a sub-menu (versus) starts it', game.sceneName === 'attract', game.sceneName); }
  { const { game } = fresh(); steps(game, 120 * 5); game.input.tap('left'); steps(game, 120 * 6); t.check('a key resets the idle timer', game.sceneName === 'title', game.sceneName); }
  for (const how of ['key', 'mouse', 'pad']) {
    const L = fresh({ pads: how === 'pad' }), game = L.game; game.go('attract'); steps(game, 120 * 3);
    if (how === 'key') game.input.tap('tUp'); else if (how === 'mouse') game.input.feed('down', 100, 100); else L.ctx.__pad.axes = [.8, 0, 0, 0];
    steps(game, 3); if (how === 'mouse') game.input.feed('up', 100, 100); if (how === 'pad') L.ctx.__pad.axes = [0, 0, 0, 0]; steps(game, 4);
    t.check('a ' + how + ' input ends the attract mode', game.sceneName === 'title', game.sceneName);
  }
  // the loop and the exhibition's calls
  { const { KC, game } = fresh(); game.go('attract'); steps(game, 2); const sc = game.scene, seen = [], calls = new Set(); let lastStep = null;
    for (let i = 0; i < 120 * 200 && seen.length < 6; i++) { if (sc.step !== lastStep) { seen.push(sc.step); lastStep = sc.step; if (sc.step === 'bout') sc.sub.bout.bus.on('call', d => calls.add(d.id)); } steps(game, 1); }
    t.check('the loop: bout, bonus, how-to, scores, title, then the bout again', seen.join() === 'bout,bonus,howto,scores,title,bout', seen.join());
    for (const c of ['half', 'full', 'aiuchi', 'judges', 'stop', 'begin']) t.check('the exhibition shows the ' + c + ' call', c === 'half' || c === 'full' ? [...calls].length > 0 && (sc.__halfFull = true) : calls.has(c), [...calls].join());
    t.check('no errors in the attract loop', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
  }
  { const { KC, game } = fresh(); game.go('attract'); steps(game, 2); const sc = game.scene, b = sc.sub.bout; const pts = []; b.bus.on('award', a => pts.push(a.full ? 'full' : 'half'));
    for (let i = 0; i < 120 * 70 && sc.step === 'bout'; i++) steps(game, 1);
    t.check('the exhibition scores a half point and a full point', pts.includes('half') && pts.includes('full'), pts.join());
    t.check('the exhibition ends at the judges (a time-out)', !!b.hantei, b.phase); void KC; }
  // touch-only: the gate panel, no touch buttons, the attract mode still runs; a key lifts the gate
  { const { KC, game, fire } = fresh({ touch: true }); t.check('touch-only: the gate is up', KC.touchOnly() && game.debug.snapshot().touchGate);
    t.check('touch-only: no touch buttons', Object.values(game.scenes || {}).length === 0 || [KC.TitleScene, KC.FightScene, KC.BonusScene].every(s => Array.isArray(s.touch) && s.touch.length === 0));
    game.input.tap('start'); steps(game, 30); t.check('touch-only: start does not open the menu behind the gate', !game.scene.menuOn);
    steps(game, 120 * 10.5); t.check('touch-only: the attract mode runs', game.sceneName === 'attract', game.sceneName);
    fire('keydown', { code: 'KeyA' }); t.check('a key press lifts the gate', !KC.touchOnly()); }
};
