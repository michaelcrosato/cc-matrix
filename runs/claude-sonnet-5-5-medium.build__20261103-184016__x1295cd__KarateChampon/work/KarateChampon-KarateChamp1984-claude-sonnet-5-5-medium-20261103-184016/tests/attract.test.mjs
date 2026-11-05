import { fresh } from './lib/helpers.mjs';
import { until, press, sceneIs } from './lib/play.mjs';
export default async t => {
  const G = fresh(), { KC, game } = G, I = game.input;
  const idleTo = (scene, secs) => { game.go(scene, scene === 'title' ? undefined : null, { fade: 0 }); game.advance(.5); KC.idle.t = 0; game.advance(secs); return sceneIs(game, 'attract'); };
  t.check('10 s idle on the title starts the attract mode', idleTo('title', 10.6)); t.check('9.4 s idle does not', !idleTo('title', 9.2) && sceneIs(game, 'title'));
  game.go('title', { menu: true }, { fade: 0 }); game.advance(.5); KC.idle.t = 0; game.advance(10.5); t.check('10 s idle on the main menu starts it', sceneIs(game, 'attract'));
  t.check('10 s idle on a sub-menu (dojo) starts it', idleTo('dojoMenu', 10.6)); t.check('10 s idle on the bonus menu starts it', idleTo('bonusMenu', 10.6)); t.check('10 s idle on versus setup starts it', idleTo('versusSetup', 10.6));
  // any input exits to the title
  for (const [what, fn] of [['a key', () => I.tap('tRight')], ['a pad button', () => { I.press('Pad0'); game.advance(.02); I.release('Pad0'); }], ['mouse movement', () => { I.feed('move', 120, 90); }], ['a click', () => { I.feed('down', 100, 100); I.feed('up', 100, 100); }], ['a stick push', () => { G.ctx.navigator.getGamepads = () => [{ index: 0, id: 'Wireless Controller (054c)', connected: true, axes: [.9, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false })) }]; }]]) {
    game.go('attract', null, { fade: 0 }); game.advance(1); fn(); game.advance(.8); G.ctx.navigator.getGamepads = () => []; t.check(`${what} exits the attract mode to the title`, sceneIs(game, 'title'), game.scene.name); }
  // the loop: bout, bonus reel, how-to, scores, title, then again
  game.go('attract', null, { fade: 0 }); const sc = game.scene; const order = []; const seen = {}; let last = ''; let guard = 0;
  while (guard++ < 400) { game.advance(1); if (sceneIs(game, 'attract')) { const nm = game.scene.stepName; if (nm !== last) { order.push(nm); last = nm; } if (game.scene.seen) for (const k in game.scene.seen) seen[k] = (seen[k] || 0) + game.scene.seen[k]; if (game.scene.bout) for (const k of Object.keys(game.scene.seen || {})) seen[k] = Math.max(seen[k] || 0, game.scene.seen[k]); } if (order.length >= 6) break; }
  t.check('the loop visits bout, bonus, how-to, scores, title in order, then repeats', order.slice(0, 6).join() === 'bout,bonus,howto,scores,title,bout', order.join());
  t.check('the exhibition shows a half point', seen.half >= 1, JSON.stringify(seen)); t.check('the exhibition shows a full point', seen.full >= 1); t.check('the exhibition shows aiuchi', seen.aiuchi >= 1); t.check('the exhibition ends in a time-out hantei', seen.judges >= 1 && seen.time >= 1, JSON.stringify(seen));
  // deterministic per loop index
  { const run = loop => { game.go('attract', { loop }, { fade: 0 }); game.advance(.02); const s = game.scene; const ids = s.bout.f.map(f => f.id).join() + s.stage.d.id; return ids; }; t.check('loop index seeds the exhibition (same loop, same bout)', run(3) === run(3) && run(3) !== run(4)); }
  t.check('no engine errors during attract', game.errors.length === 0, game.errors.slice(0, 2).map(e => e.message).join('|'));
};
