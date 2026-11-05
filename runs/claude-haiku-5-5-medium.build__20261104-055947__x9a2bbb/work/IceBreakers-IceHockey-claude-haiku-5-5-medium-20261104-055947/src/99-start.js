/* the scene table, the deep links (#match, #attract, #story, #setup, #practice, #records, #about, #dev, #credits) */
const SCENE_NAMES = ['title', 'attract', 'setup', 'story', 'cutscene', 'match', 'results', 'practice', 'records', 'about', 'credits', 'dev', 'flood', 'lab'];
const first = (location.hash || '').slice(1).split('/')[0];
const deep = HUB ? 'session' : (SCENE_NAMES.includes(first) ? first : 'title');
game.start({ scenes, scene: deep, data: deep === 'cutscene' ? { chapter: 0 } : undefined });
if (HUB) netConnect();   // (in a session the round starts from the hub, with its card)
window.__game = { game, scenes, Net, netSnapshot, touchOnly, T, TUNE_DEFAULTS, STORY, TEAMS, ARENAS, makeMatch, M: () => M, startStory, finishMatch, store, starsOf,
  progress: () => STORY_SAVE(), sim: { floodStart, floodTick, getFlood: () => flood, breakGlass, fightStart, shootout, goal, faceoff, outOfPlay, activateKaboom, requestFight, fightStep }, tuneSet, tuneReset, rec };
game.debug = {
  snapshot() {
    const pk = M ? M.puck : null;
    return { scene: game.sceneName, phase: M ? M.phase : null, period: M ? M.period : null, clock: M ? +M.clock.toFixed(2) : null, score: M ? M.score.slice() : null,
      boom: M ? M.boom.slice() : null, kab: M ? M.kab.map(v => +v.toFixed(2)) : null, fight: M ? !!M.fight : null, banner: M ? M.banner : null,
      puck: pk && { x: +pk.x.toFixed(1), y: +pk.y.toFixed(1), z: +pk.z.toFixed(1), owner: pk.owner ? pk.owner.name : null },
      skaters: M ? M.skaters.map(s => ({ name: s.name, t: s.t, x: +s.x.toFixed(1), y: +s.y.toFixed(1), state: s.state, human: !!s.human })) : [],
      goalies: M ? M.goalies.map(g => ({ t: g.t, x: +g.x.toFixed(1), y: +g.y.toFixed(1), state: g.state })) : [],
      goals: M ? M.goals.length : 0, saves: M ? M.saves.slice() : null, hits: M ? M.hits.slice() : null, mode: M && M.cfg ? M.cfg.mode : null,
      errors: game.errors.length };
  }
};
