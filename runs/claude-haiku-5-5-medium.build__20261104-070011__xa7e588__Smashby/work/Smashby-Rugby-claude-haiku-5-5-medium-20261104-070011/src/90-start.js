// THE START: the scene table, the attract's random match, the deep links (#title, #menu, #setup, #cup, #match, #about),
// and the handle the tests read (window.__smashby: the game, the simulation and the tuning).
SM.attractData = () => {
  const home = 0, away = 1 + Math.floor(SM.fx() * 4), venue = Math.floor(SM.fx() * 4);
  return { home, away: Math.min(4, away), venue, halves: 60, attract: true, seed: 1 + Math.floor(SM.fx() * 9000) };
};
game.debug = {
  snapshot() {
    const M = SM.M;
    return {
      scene: game.sceneName,
      phase: M ? M.phase : null, half: M ? M.half : null, run: M ? +M.run.toFixed(2) : null, score: M ? M.score.slice() : null,
      hype: M ? M.hype.slice() : null, hooter: M ? M.hooter : null, over: M ? M.over : null,
      ball: M ? { x: +M.ball.x.toFixed(1), y: +M.ball.y.toFixed(1), z: +M.ball.z.toFixed(1), state: M.ball.state, owner: M.ball.owner ? M.ball.owner.nick : null } : null,
      players: M ? M.players.map(p => ({ i: p.i, side: p.side, pos: p.pos, x: +p.x.toFixed(1), y: +p.y.toFixed(1), st: p.st, bin: +p.bin.toFixed(1), seat: !!p.seat })) : null,
      seats: M ? M.seats.map(s => ({ side: s.side, pos: s.p ? s.p.pos : null })) : null,
      stats: M ? M.stats.map(s => ({ tries: s.tries, tackles: s.tackles, bigHits: s.bigHits, passes: s.passes, kicks: s.kicks, poss: +s.poss.toFixed(1) })) : null,
      dev: SM.dev.open, tune: SM.TUNE.v.halfLength
    };
  },
  tune: (key, value) => { SM.TUNE.set(key, value); },
  cheat: (key, on) => { SM.CHEATS[key] = !!on; }
};
window.__smashby = { game, SM };
const hash = (location.hash || '').slice(1);
const startScene = { title: 'title', menu: 'menu', setup: 'setup', cup: 'cup', about: 'about', match: 'match' }[hash] || 'title';
game.start({ scenes: SM.scenes, scene: startScene, data: startScene === 'match' ? { home: 0, away: 1, venue: 0, halves: 120 } : undefined });
