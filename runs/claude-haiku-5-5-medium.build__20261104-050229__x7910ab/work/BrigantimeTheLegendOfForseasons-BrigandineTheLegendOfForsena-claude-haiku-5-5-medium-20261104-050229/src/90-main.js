// The entry: the game is built here. It sets the tunables (the hub always uses the defaults), the input map, the pause
// menu (dev mode and how to play are left out of a hub round), the settings (button symbols), the save slots, the scenes,
// the AI Hub connection, and the debug handle that the tests and the tools read.
(() => {
  const H = G;
  const hub = typeof AIHub !== 'undefined' && !!AIHub.active;
  if (hub) H.resetTune();
  else {
    const saved = E.store.get('brigantime:tune', null);
    if (saved) for (const k of Object.keys(H.TUNE_DEFAULTS)) if (typeof saved[k] === 'number') H.tune[k] = saved[k];
  }

  const menuItems = hub ? [] : [['How to play', () => game.go('help')], ['Dev mode', () => game.go('dev')]];
  const game = new E.Game({
    canvas: 'screen', res: 'ps1', expand: true, view: 'overhead', input: H.STRATEGY_INPUT, bg: '#07060d',
    menu: { items: menuItems, quit: hub ? false : 'title', saves: { slots: 3, version: 1 } }
  });
  game.settings.define({ key: 'buttons', label: 'Button symbols', type: 'select', group: 'Game', value: 'playstation',
    options: [['playstation', 'PlayStation'], ['xbox', 'Xbox (A B X Y)']],
    apply(g, v) { g.input.glyphs = v; } });
  game.input.glyphs = game.settings.buttons || 'playstation';
  game.input.touchEnabled = false;
  H.defineSounds(game);
  H.defineNamedSounds(game);

  // the saves: a campaign at its muster is what a slot holds
  game.saves.write = () => {
    const cs = H.session.cs;
    if (!cs) return null;
    return { data: cs.serialize(), place: H.get('season', cs.season).name + ' ' + cs.s.year, level: 'Candle ' + cs.s.candle };
  };
  game.saves.read = save => {
    if (!save || !save.data) return;
    H.session.cs = H.CampaignSim.load(save.data);
    H.session.human = H.session.cs.s.humans[0];
    game.go('campaign', {});
  };

  // the AI Hub: the round starts when the hub says so; the host's copy runs the shared battle and every copy plays its own troop
  if (hub) {
    AIHub.connect({ mode: 'shared-world', seats: [1, 4] }).then(info => {
      if (!info) return;
      H.session.hub = info;
      AIHub.on('start', () => { H.hubRound.start(info, game); });
      AIHub.on('message', (data, from) => H.hubRound.message(data, from));
      AIHub.on('leave', ({ id }) => H.hubRound.left(id));
      AIHub.on('time-up', () => H.hubRound.timeUp());
      AIHub.on('end', () => { H.hubRound.ended = true; });
      AIHub.ready();
    });
  }

  const scenes = {
    title: H.titleScene, attract: H.attractScene, setup: H.setupScene, skirmish: H.skirmishScene,
    campaign: H.campaignScene, battle: H.battleScene, event: H.eventScene, ending: H.endingScene,
    about: H.aboutScene, help: H.helpScene, dev: H.devScene, hubWait: H.hubWaitScene, hubBattle: H.hubBattleScene, gallery: H.galleryScene
  };
  for (const sc of Object.values(scenes)) sc.game = game;   // each scene reaches the game through this
  H.session.touchOnly = H.touchOnly(game);

  // the debug handle: what tests and tools read and drive (the same state the screens show)
  const sceneBattle = () => (game.sceneName === 'battle' ? game.scene : null);
  game.debug = {
    snapshot: () => {
      const cs = H.session.cs, b = sceneBattle(), sim = b ? b.sim : null;
      return {
        scene: game.sceneName, phase: cs ? cs.s.phase : null, screen: game.scene && game.scene.phase ? game.scene.phase : null, season: cs ? H.SEASON_ORDER[cs.s.season] : null,
        year: cs ? cs.s.year : null, candle: cs ? cs.s.candle : null, realm: H.session.human, mana: cs ? cs.s.realms[H.session.human].mana : null,
        ended: cs ? cs.s.ended : null,
        battle: sim ? { map: sim.s.map, bell: sim.s.bell, mode: b.mode, cursor: b.cursor, over: sim.s.over, winner: sim.s.winner,
          units: sim.s.units.map(u => [u.uid, u.side, u.name, u.q, u.r, u.hp, u.maxHp, u.dead ? 1 : 0]) } : null,
        touchOnly: !!H.session.touchOnly, tune: Object.assign({}, H.tune), errors: game.errors.length
      };
    },
    // a campaign for the tests: { humans, seed }
    newCampaign: (o = {}) => { H.session.cs = H.CampaignSim.create({ humans: o.humans || ['verdance'], seed: o.seed || 1 }); H.session.human = (o.humans || ['verdance'])[0]; return H.session.cs.hash(); },
    campaign: () => H.session.cs,
    // a battle for the tests: the spec for BattleSim.create (map, season, seed, sides)
    startBattle: (spec) => { const sim = H.BattleSim.create(spec); game.go('battle', { sim, playerSide: spec.playerSide ?? 0, onDone: () => game.go('title') }); return sim.hash(); },
    sim: () => (sceneBattle() ? game.scene.sim : null),
    autoplayBattle: (sim, limit) => H.autoplayBattle(sim, limit || 5000),
    setTune: (k, v) => { H.tune[k] = v; },
    resetTune: () => H.resetTune(),
    hash: () => (H.session.cs ? H.session.cs.hash() : null),
    // one step of an automated player, through the real scenes: a playthrough calls it until the campaign ends.
    // The human realm musters with the planner, battles are delegated, and every screen's own method moves it on.
    autopilotStep: () => {
      const cs = H.session.cs, sc = game.scene, name = game.sceneName;
      if (name === 'title') return 'title';
      if (name === 'campaign' && cs) {
        if (cs.s.ended) return 'ended';
        if (sc.phase === 'tidings') { sc.afterTidings(); return 'tidings'; }
        if (sc.phase === 'pass') { sc.phase = 'muster'; sc.enterPhase(); return 'pass'; }
        if (sc.phase === 'aftermath') { sc.phase = 'tidings'; sc.enterPhase(); return 'aftermath'; }
        if (sc.phase === 'muster' && cs.s.phase !== 'muster') return 'marching';
        if (sc.phase === 'muster') {
          // every ruler of the campaign musters in turn, with the planner, then the marches resolve
          // the automated player builds its realm and keeps its knights at home (marches are the player's choice)
          const aggression = H.tune.rivalAggression;
          H.tune.rivalAggression = 0;
          try { for (const realm of cs.s.humans) H.aiCampaign.muster(cs, realm); } finally { H.tune.rivalAggression = aggression; }
          sc.endMuster();
          return 'muster';
        }
        return sc.phase;
      }
      if (name === 'event' && sc.finish) { sc.finish(); return 'event'; }
      if (name === 'battle' && sc.delegate) { if (!sc.doneCalled) sc.delegate(); return 'battle'; }
      if (name === 'ending') return 'ending';
      return name;
    }
  };
  H.Brigantime = H;
  game.start({ scenes, scene: hub ? 'hubWait' : 'title' });
  if (!hub) game.saves.canSave = false;
})();
