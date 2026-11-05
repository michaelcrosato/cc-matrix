// The handle for tests and tools (game.debug), and the start.
game.debug = {
  snapshot: () => ({
    scene: game.sceneName, stage: WORLD.index, floor: WORLD.index + 1, t: Math.round(WORLD.time * 100) / 100, floorClock: Math.round(WORLD.floorClock * 100) / 100,
    heroes: WORLD.heroes.map(h => ({ cls: h.cls, x: Math.round(h.body.x), y: Math.round(h.body.y), hp: Math.round(h.hp), score: h.score, keys: h.keys, flasks: h.flasks, kills: h.kills, down: !!h.down, queasy: h.queasy > 0, treasure: h.treasure || 0 })),
    monsters: { total: WORLD.monsters.filter(m => m.alive).length, ghosts: WORLD.monsters.filter(m => m.alive && m.kind === 'ghost').length, gnashers: WORLD.monsters.filter(m => m.alive && m.kind === 'gnasher').length },
    generators: WORLD.gens.filter(g => g.alive).length, items: WORLD.items.filter(i => i.alive).length,
    doorsOpen: WORLD.doors ? WORLD.doors.filter(d => d.open).length : 0, doors: WORLD.doors ? WORLD.doors.length : 0,
    over: !!WORLD.over, attract: !!WORLD.attract, caption: WORLD.caption, stairs: WORLD.F ? WORLD.F.stairs : null, kills: WORLD.kills,
    touchOnly: !!(TITLE && TITLE.touchOnly), cheats: Object.assign({}, CHEATS)
  }),
  // the stairs' cell, for a test to walk onto
  stairsPoint: () => WORLD.F ? [(WORLD.F.stairs[0] + .5) * T, (WORLD.F.stairs[1] + .5) * T] : null,
  teleport(i, x, y) { const h = WORLD.heroes[i]; if (h) { h.body.x = x; h.body.y = y; h.body.vx = 0; h.body.vy = 0; } },
  // hand the heroes straight to a floor (tests, the warp in Dev Tools)
  start(cls) { PICKS = (cls || ['berserker']).map((c, i) => ({ input: i === 0 ? game.input : null, cls: c, locked: true, name: 'P' + (i + 1) })); startRun(); },
  floor: n => makeFloor(n),
  // the attract run's heroes, moved onto floor n (tests)
  warp: n => { loadStage(n); },
  world: () => WORLD,
  // the rules themselves, for the tests
  fn: { damageGen, damageMonster, killMonster, useMagic, spawnMonster, heroDown, rise, stairBonus, seedSim, damageHero, openDoorGroup },
  setDevCheat: (k, v) => { CHEATS[k] = v; },
  makeHero, stepWorld, botIntent,
  validate: () => STAGES.map((s, i) => s.kind === 'floor' || s.kind === 'treasure' ? !!makeFloor(i) : true)
};

applyPref('glyphs');
applyPref('cameraView');
const SCENES = { title, classes, howto, scores, settings, about, card, play, gameover, ending, attract, hubcard, roundover, initials };
game.start({ scenes: SCENES, scene: SESSION ? 'hubcard' : 'title' });
if (SESSION) hubStart();
