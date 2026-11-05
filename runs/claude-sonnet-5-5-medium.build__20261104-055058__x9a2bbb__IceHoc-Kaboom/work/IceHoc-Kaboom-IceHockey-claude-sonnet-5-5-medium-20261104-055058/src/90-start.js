/* ---- START: scene table, deep links, debug handle ---- */
const ABOUT_PAGES = (() => {
  const si = FEEDBACK.sourceInformation, lab = { date: 'Date', source: 'Source', plan: 'Plan', genre: 'Genre', perspective: 'Perspective', tech: 'Tech', artDirection: 'Art Direction', animation: 'Animation', audio: 'Audio', online: 'Online', testing: 'Testing', research: 'Research', environment: 'Environment', model: 'Model', usage: 'Usage' };
  const keys = Object.keys(lab), half = Math.ceil(keys.length / 2);
  const qa = (arr, qs) => arr.map((a, i) => qs[i] + ' ' + a);
  return [
    { title: 'Credits', lines: ['Ice Hoc-Kaboom: over-the-top 3-on-3 arcade hockey. Skate, dangle and rip it past the goalie while you hammer rivals through the glass; fill BOOM, go KABOOM, win the scrap when the gloves drop.', 'Game design and code: Claude Sonnet 5.5 (claude-sonnet-5-5) for Michael Crosato\'s cc-matrix. Plan: PLAN.md by claude-opus-5-5.', 'Engine: my-3D2dge v0.85.2 (MIT). AI Hub session client 1.4.0.', 'Every sound, voice and song is synthesized in code. Every logo, rink and fan is drawn in code. No asset files.', 'Starring Coach Marge, Dunny, Snipes, Big Lou, Lemmy, Old Gus, Doris, Chuck Wallop and Moose Plunkett.'] },
    { title: 'Source Information 1/3', lines: keys.slice(0, 5).map(k => lab[k] + ': ' + si[k]) },
    { title: 'Source Information 2/3', lines: keys.slice(5, 10).map(k => lab[k] + ': ' + si[k]) },
    { title: 'Source Information 3/3', lines: keys.slice(10).map(k => lab[k] + ': ' + si[k]) },
    { title: 'Testing Feedback', lines: qa(FEEDBACK.testingFeedback, ['How many issues did testing catch?', 'How many were critical?', 'Most helpful test:', 'Least helpful test:']) },
    { title: 'Engine Feedback', lines: qa(FEEDBACK.engineFeedback, ['Liked most:', 'Stuck or guessed wrong:', 'Had to build myself:', 'Hardest part:', 'Changed in the engine:', 'One thing to change:']) },
    { title: 'Prompt Feedback', lines: qa(FEEDBACK.promptFeedback, ['Liked most:', 'Confusing:', 'Hardest thing:', 'What I would change:']) },
    { title: 'Engine changes', lines: ['1. Font: added the PlayStation symbols (cross, circle, square, triangle) to the 5x7 pixel font.', '2. Gamepad: Options is ignored while Create is held (AI Hub reserves the pair).', '3. Audio: audio.bus(name) plus voice and crowd buses with their own volume fields.', '4. Dialog: a voice option that is a function babbles each new letter, for per-speaker voices.', 'Hockey gear, sticks, pads, numbers, logos and all synthesized voices live in the game, not the engine.'] },
    { title: 'Controls', lines: ['Move: left stick / WASD / arrows. Pass or switch: cross / J / right click. Shoot or check: square / K / left click. Hold shoot to wind a slapshot.', 'Deke or poke: circle / L / Space. Saucer pass or hold for gloves: triangle / I / middle click. Turbo: R2 or R1 / Shift. Chirp: L1 / C. Switch skater: L2 / Q. Camera: R3 / V.', 'Press shoot as a pass arrives for a one-timer. Hold deke or triangle near a rival with a grudge to drop the gloves.', 'Two on one keyboard: the second player joins with 2 and takes the arrows. Settings holds the Xbox symbols option.'] }
  ];
})();
Scenes.sc.session = Net.sc;
const debug = {
  snapshot() {
    const m = Match.cur(); const base = { scene: game.sceneName, errors: game.errors.length, dev: { open: Dev.visible } };
    const at = Scenes.sc.attract.state && Scenes.sc.attract.state(); if (at) base.attract = at;
    if (!m) return base;
    return Object.assign(base, { mode: m.cfg.story ? 'story' : m.cfg.drill ? 'drill' : m.cfg.session ? 'session' : 'exhibition', phase: m.phase, period: m.period, clock: +m.clock.toFixed(1), score: m.score.slice(), shots: m.stats.shots.slice(), puck: { x: Math.round(m.puck.x), y: Math.round(m.puck.y), z: Math.round(m.puck.z), owner: m.puck.owner ? m.puck.owner.id : null },
      skaters: m.sk.map(s => ({ id: s.id, team: s.side, x: Math.round(s.x), y: Math.round(s.y), state: s.state, ctrl: s.ctrl.kind })), goalies: m.gl.map(g => ({ x: Math.round(g.x), y: Math.round(g.y), state: g.state })), boom: m.boom.map(Math.round), kaboom: m.kaboom.map(x => +x.toFixed(1)), fight: !!m.fight, items: m.items.length, sinBin: m.sinBin.length,
      story: { chapter: m.cfg.story ? m.cfg.story.id : 0, stars: Objectives.stars() }, net: { role: Net.role, players: Net.info ? Net.info.players.length : 0 }, drill: Drills.st ? { id: Drills.st.id, n: Drills.st.n, done: Drills.st.done } : null });
  },
  warp(target, o = {}) { const m = Match.cur(); const rows = Dev.rows(2); const row = rows.find(r => r.label && r.label.toLowerCase().includes(String(target).toLowerCase())); if (row && row.action) { row.action(); return true; } return false; },
  set(k, v) { if (k in T) { T[k] = v; T.save(); } else game.settings.set(k, v); },
  cheat(name, on) { Dev.cheats[name] = on; Dev.rows(1); },
  event(type, data) { Bus.emit(type, data); }, seed(n) { RNG.setSeed(n); }
};
function startMatchDirect(home, away, arena, extra) { const cfg = Object.assign({ home, away, arena, humans: [{ side: 0, input: game.input, seat: 0 }], intros: false, periodLen: 90 }, extra || {}); return { scene: 'match', data: { cfg, ret: 'title', kind: 'exh' } }; }
function bootTarget() {
  const h = (location.hash || '').slice(1).split('/'), k = h[0];
  if (k === 'attract') return { scene: 'attract' }; if (k === 'about') return { scene: 'about' }; if (k === 'records') return { scene: 'records' }; if (k === 'lab') return { scene: 'lab' };
  if (k === 'story') return { scene: 'cutscene', data: { id: +h[1] || 1, kind: 'pre' } }; if (k === 'cutscene') return { scene: 'cutscene', data: { id: +h[1] || 1, kind: 'pre' } };
  if (k === 'match') return startMatchDirect(h[1] || 'muskrats', h[2] || 'drillers', h[3] || 'icebox'); if (k === 'fight') return startMatchDirect('muskrats', 'bruisers', 'grind', { forceFight: true }); if (k === 'kaboom') return startMatchDirect('muskrats', 'drillers', 'dome', { alwaysKaboom: true });
  if (k === 'shootout') return startMatchDirect('muskrats', 'drillers', 'icebox', { startShootout: true }); if (k === 'flood') return startMatchDirect('muskrats', 'drillers', 'icebox', { startFlood: true }); if (k === 'practice') return { scene: 'match', data: { cfg: Drills.cfg ? null : null } };
  if (k === 'dev') return startMatchDirect('muskrats', 'drillers', 'icebox', { openDev: true }); return null;
}
(function start() {
  const scenes = Object.assign({}, Scenes.sc);
  const steps = [['Baking the ice', () => { Rink.buildMap(ARENAS.icebox); }], ['Tuning the organ', () => { Synth.init(); Talk.init(); Save.load(); Talk.loadTips(); Fx.hook(); }], ['Checking the books', () => { for (const t of TEAMS) if (t.skaters.length !== 3) throw new Error('team ' + t.id); }]];
  const go = (info) => {
    let t = bootTarget(); let scene = 'title', data; if (info) scene = 'session'; else if (t) { scene = t.scene; data = t.data; }
    if (scene === 'match' && data && data.cfg === null) { scene = 'practice'; data = null; }
    game.debug = debug; window.__game = { game, scenes, Match, Flow, T, Rink, Sim, Bus, TEAM, STORY, Dev, Net, Skating, U, TEXT, DRILLS, TEAMS, Crowd, Cam, Hud, DrawMatch, Drills, Objectives, Save, Scenes, Backdrop, Synth, Idle, Results, Replay, Fight, Hits, Items, Boom, Puck, Goalie, AI, UI, Glyphs, Rigs, Story, Shootout, Flood, Talk, Fx };
    game.start({ scenes, scene, data, boot: { title: 'ICE HOC-KABOOM', steps } });
    if (data && data.cfg && data.cfg.openDev) setTimeout(() => Dev.open(), 400);
  };
  if (HUB) Net.boot().then(go); else go(null);
})();
