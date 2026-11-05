/* ---- start: the scene table, deep links, boot, the debug handle ---- */
(function start() {
  // touch-only devices get no touch controls anywhere
  try { game.input.touchButtons([]); } catch (e) { /* no touch layer */ }
  if (!HUB) new E.Shell(game, { theme: { ink: '#eef4ff', paper: 'rgba(10,15,28,.94)', accent: '#ffd36a', muted: '#9fb0c8', danger: '#ff7a5a', line: 'rgba(255,211,106,.35)', font: 'system-ui, sans-serif', titleFont: 'Impact, Haettenschweiler, "Arial Black", sans-serif' } });
  Bus.on('flood_perfect', () => {});
  const hash = typeof location !== 'undefined' ? (location.hash || '').slice(1) : '', parts = hash.split('/');
  let scene = HUB ? 'session' : 'title', data;
  const hum = () => [{ input: game.input, team: 0 }];
  if (!HUB && parts[0]) {
    const d = parts[0];
    if (d === 'attract') scene = 'attract';
    else if (d === 'story' && parts[1]) { scene = 'cutscene'; Story.cur = { n: +parts[1], attempt: 1, choice: {} }; data = { id: STORY.CHAPTERS[+parts[1] - 1].pre, next: 'pregame' }; }
    else if (d === 'cutscene' && parts[1]) { scene = 'cutscene'; data = { id: parts[1], next: 'title' }; }
    else if (d === 'match') { scene = 'match'; data = { home: parts[1] || 'muskrats', away: parts[2] || 'drillers', arena: parts[3] || 'icebox', periods: 3, len: 120, ot: true, shootout: true, humans: hum(), flood: true }; }
    else if (d === 'fight' || d === 'kaboom' || d === 'shootout' || d === 'dev') { scene = 'match'; data = { home: 'muskrats', away: 'bruisers', arena: 'grindhouse', periods: 3, len: 120, ot: true, shootout: true, humans: hum(), intros: false, warp: d }; }
    else if (d === 'flood') scene = 'flood';
    else if (d === 'practice' && parts[1]) { scene = 'match'; data = Drills.cfgFor(+parts[1]); }
    else if (scenes[d]) scene = d;
  }
  Object.assign(scenes, {});
  game.start({
    scenes, scene, data,
    boot: { title: 'ICE HOC-KABOOM', version: VERSION, messages: ['Flooding the ice', 'Taping the sticks', 'Tuning the organ', 'Hiding the octopi', "Waking up Old Gus"],
      steps: [['Baking the Ol\' Icebox', () => { Rink.mapFor('icebox', 'muskrats'); }], ['Synthesizing the goal horn', () => { Synth.applyVolumes(); }],
        ['Checking the rule book', () => { for (const id of TEAM_IDS) if (TEAMS[id].skaters.length !== 3) throw new Error('team ' + id + ' needs 3 skaters'); for (const ch of STORY.CHAPTERS) if (!STORY.CUTS[ch.pre] || !STORY.CUTS[ch.post]) throw new Error('chapter ' + ch.n + ' is missing a cutscene'); }]] }
  });
  game.debug = {
    snapshot() {
      const m = M;
      return { scene: game.sceneName, mode: m ? (m.attract ? 'attract' : m.cfg.session ? 'session' : m.cfg.practice ? 'practice' : m.cfg.chapter ? 'story' : 'exhibition') : null, phase: m && m.phase, period: m && m.period, clock: m && +m.clock.toFixed(2), score: m && m.score.slice(), shots: m && m.shots.slice(),
        puck: m && { x: Math.round(m.puck.x), y: Math.round(m.puck.y), z: Math.round(m.puck.z), owner: m.puck.owner ? m.puck.owner.id : null },
        skaters: m && m.skaters.map(s => ({ id: s.id, team: s.team, x: Math.round(s.x), y: Math.round(s.y), state: s.state, ctrl: s.ctrl })), goalies: m && m.goalies.map(g => ({ x: Math.round(g.x), y: Math.round(g.y), state: g.state })),
        boom: m && m.boom.map(Math.round), kaboom: m && m.kaboomT.map(v => +v.toFixed(1)), fight: !!(m && m.fight), items: m ? m.items.length : 0, sinBin: m ? m.sinBin.map(b => b.s.id) : [],
        story: { chapter: Story.cur ? Story.cur.n : null, stars: Save.stars(), step: Save.data.story.chapter }, attract: scenes.attract.state, dev: { open: Dev.isOpen }, net: { role: Net.N.role, players: Net.N.seats.length }, errors: game.errors.length };
    },
    warp: (w, a) => Dev.warp(w, a), set: (k, v) => T.set(k, v), cheat: (n, on) => { if (M) M.cheats[n] = on; }, event: (t, d) => Bus.emit(t, d), seed: n => RNG.reseed(n)
  };
  if (typeof window !== 'undefined') window.__game = { game, scenes, TEXT, Match, T, Dev, Net, STORY, Story, Save, Drills, Bus, Skater, Puck, Goalie, Fight, Boom, Items, Hits, Replay, Synth, Glyphs, UI, Rink, AI, Shootout, get M() { return M; } };
})();
