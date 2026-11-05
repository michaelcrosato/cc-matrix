// A driver that plays the whole game through the real input path: menus by taps, events by the AutoPlayer.
export function makeDriver(c, o = {}) {
  const O = c.OLY, game = O.game, I = game.input, log = [];
  let lastScene = null, sceneT = 0;
  const seen = new Set();
  function step(sec = .1) {
    const sc = game.sceneName; if (sc !== lastScene) { log.push(sc); lastScene = sc; sceneT = 0; seen.add(sc); } sceneT += sec;
    const def = game.scene && game.scene.def;
    if (sc && sc.startsWith('ev:')) { O.Dev.cheats.autopilot = true; }
    else if (sc === 'title' || sc === 'menu' && o.menuPick !== undefined) {}
    if (sceneT > .7 && !(sc && sc.startsWith('ev:'))) {
      if (sc === 'opening') { const s = game.scene.def; if (def && def.script && def.script[def.si] && def.script[def.si][0] === 'flame') { if (def.bar && Math.abs(def.bar.v - .5) < .04) I.tap('action'); } else if (o.watch) {} else I.hold('confirm', true), game.advance(1.1), I.hold('confirm', false); }
      else if (sc === 'closing' || sc === 'podium') { if (!o.watch || sceneT > 30) I.tap('confirm'); }
      else if (sc === 'torch') { I.tap('confirm'); }
      else if (sc === 'nations') { I.tap('confirm'); }
      else if (sc === 'credits') I.tap('confirm');
      else if (sc === 'hubCard' || sc === 'hubSplash' || sc === 'start') {}
      else for (const p of game.players) p.tap('confirm');
    }
    game.advance(sec);
  }
  return { step, log, seen };
}
