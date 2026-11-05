/* START: S7.start({ World3D, headless, seed }) makes the game: the 2D engine's E.Game (fixed steps, scenes, input and
 * rebinding, the pause menu and settings, saves), the sim, the 3D presenter (or the null one headless), the HUD, sound,
 * voices, the scenes, the AI Hub session when there is one, and game.debug for tests and tools. */
const SETTINGS = S7.SETTINGS = [
  { key: 'picture3d', label: '3D picture', group: 'Display', value: 'pixels', options: [['pixels', 'Pixels'], ['balanced', 'Balanced'], ['full', 'Full']], help: 'Pixels: the game\'s own chunky resolution. Full: the screen\'s.' },
  { key: 'shadows3d', label: 'Shadows', group: 'Display', value: true, help: 'Lamps, the moon and the sun cast real shadows.' },
  { key: 'filter3d', label: 'Filter', group: 'Display', value: 'cel', options: [['clean', 'None'], ['cel', 'Comic cel'], ['pixel', 'Pixel']], help: 'Comic cel: flat bands of light and ink. Where a device can\'t draw it, the game falls back to None.' },
  { key: 'difficulty', label: 'Difficulty', group: 'Game', value: 'piste', options: [['bunny', 'Bunny Hill'], ['piste', 'Piste'], ['offpiste', 'Off-Piste']], help: 'Changeable mid-game.', apply: (g, v) => { if (S7.sim && S7.sim.st) S7.sim.st.difficulty = v; } },
  { key: 'aimToggle', label: 'Aim', group: 'Game', value: 'hold', options: [['hold', 'Hold'], ['toggle', 'Toggle']] },
  { key: 'aimAssist', label: 'Aim assist', group: 'Game', value: 'default', options: [['default', 'By difficulty'], ['off', 'Off'], ['low', 'Low'], ['high', 'High']], help: 'Controller only: turning slows over a warm spot and leans toward it.' },
  { key: 'padSens', label: 'Controller look speed', group: 'Game', type: 'slider', value: 1, min: .5, max: 2, step: .05 },
  { key: 'mouseMode', label: 'Mouse aim', group: 'Game', value: 'look', options: [['look', 'Look (captured)'], ['pointer', 'Pointer (light gun)']] },
  { key: 'mouseSens', label: 'Mouse look speed', group: 'Game', type: 'slider', value: .12, min: .03, max: .4, step: .01 },
  { key: 'laughCues', label: 'Laugh ripples', group: 'Game', value: true, help: 'Red arcs at the screen\'s edge toward laughter.' },
  { key: 'textSize', label: 'Text size', group: 'Game', value: 'normal', options: [['normal', 'Normal'], ['large', 'Large']] },
  { key: 'voices', label: 'Voices', group: 'Game', type: 'slider', value: .8, min: 0, max: 1, step: .05 },
  { key: 'padGlyphs', label: 'Controller buttons', group: 'Game', value: 'playstation', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']], apply: (g, v) => { if (g.settings && g.settings.glyphs !== v) g.settings.set('glyphs', v); } }
];
S7.HELP = () => {
  const pad = S7.Input.family() === 'gamepad', L = S7.label;
  return {
    keys: [[L('move'), 'Walk (hold), tuck on skis'], [L('turn'), 'Quick turn / hockey stop'], [L('aim'), 'Aim (first person)'], [L('fire'), 'Fire'], [L('scan'), 'Scan for Whiteouts (aiming)'], [L('skill'), 'Skill'], [L('ring'), 'Hold: the Featherbed (switch killer)'], [L('heal'), 'Hold: drink Red (heal)'], [L('reload'), 'Reload (aiming)'], [L('interact'), 'Check, talk, enter'], [L('map'), 'Map'], [pad ? 'Options' : 'Esc / P', 'Pause']].concat(pad ? [] : [['1-7', 'Switch killer directly'], ['Mouse', 'Look while aiming; click markers in the world']]),
    sections: [
      ['MOVING', 'You move on rails. Hold to walk, let go to stop. At a junction pick a way, then hold to go. The camera cuts like a film.'],
      ['SHOOTING', 'Stop and aim. Whiteouts are invisible: listen for laughing, look for footprints and breath, then scan. Shoot the orange warm spot: one shot thaws them.'],
      ['THE SEVEN', 'Hold the Featherbed button and pick a killer. Each has a gun and a skill. Some gates show a face: that one opens it.'],
      ['RED AND RIME', 'Red heals and pays for skills. Rime waxes your skills at the Wax Bench in Room 7. Room 7 doors save, heal nothing, and wait.'],
      ['FREEZING', 'At zero HP a killer freezes. The Sweep comes out of Room 7 to chip them free. If the Sweep falls, the mountain keeps you.']
    ]
  };
};

S7.start = (opts = {}) => {
  const W3 = opts.World3D || E.World3D || null;
  const headless = !!opts.headless || !HAS_DOM;
  S7.inSession = !headless && typeof AIHub !== 'undefined' && AIHub.active;
  S7.noPersist = S7.inSession || !!opts.noPersist;
  S7.RNG.reset(opts.seed || 7);
  S7.tuningLoad();
  const pauseItems = () => {
    if (S7.inSession) return [];
    const sim = S7.sim, scn = game.scene, inPlay = scn === scenes.play, out = [];
    const open = k => () => { game.resume(); if (game.shell) game.shell.hide(); S7.ui.open(k); };
    if (inPlay && sim.cutscene) out.push(['Skip scene', () => { game.resume(); if (game.shell) game.shell.hide(); sim.skipCutscene(); }]);
    if (inPlay) out.push(['Map', open('map')], ['Items & Dossier', open('dossier')], ['Personas', open('personas')]);
    out.push(['About & Credits', open('about')]);
    if (inPlay) out.push(['Dev Mode', open('dev')]);
    return out;
  };
  const game = new E.Game(Object.assign(opts.loop !== undefined ? { loop: opts.loop } : {}, { canvas: 'screen', res: 'ps1', expand: true, bg: null, input: S7.INPUT, headless, id: 'skiller7',
    menu: { items: pauseItems, settings: SETTINGS, controls: S7.CONTROL_NAMES, quit: S7.inSession ? false : 'title',
      saves: S7.inSession ? false : { slots: 3, version: 1, migrate: (d, from) => S7.migrateSave(d, from) } } }));
  S7.game = game;
  game.input.names = Object.assign({}, game.input.names || {}, S7.CONTROL_NAMES);
  if (game.input.touchEnabled !== undefined) game.input.touchEnabled = false;
  S7.Input.init(game);
  if (game.settings.glyphs === 'auto') game.settings.set('glyphs', 'playstation');
  // the themed shell: the standard pause, settings, controls and saves, our help
  if (!headless && E.Shell) {
    try {
      game.shell = new E.Shell(game, { theme: { ink: '#f4f1ea', paper: 'rgba(11,10,12,.94)', accent: '#d81e2a', muted: '#a8a2ac', danger: '#ff3a3a', line: '#4a2a30', font: '"Arial Narrow", "Helvetica Neue", Arial, sans-serif', titleFont: 'Impact, "Arial Black", sans-serif' },
        screens: { help: { title: 'How to play', keys: () => S7.HELP().keys, sections: () => S7.HELP().sections } } });
      // ten feet from a TV: the HTML screens scale with the window's height
      const zoom = () => { if (game.shell && game.shell.root) game.shell.root.style.zoom = String(clamp(innerHeight / 560, 1, 2.4)); };
      zoom(); addEventListener('resize', zoom);
    } catch (e) { game.fail('shell', e); }
  }
  const sim = S7.sim = new Sim(game, { attract: false, bot: false });
  let hud = null, audio = null, voice = null;
  // the presenter is made in a boot step (after the 3D engine starts); scenes reach it through this wrapper
  const pres = { step: dt => S7.pres && S7.pres.step(dt), draw: r => S7.pres && S7.pres.draw(r), ensure: id => S7.pres && S7.pres.ensure(id) };
  hud = S7.hud = new Hud(game, sim);
  audio = S7.audio = new S7Audio(game, sim);
  voice = S7.voice = new S7Voice(game);
  S7.bus.on('laugh', d => { if (!d.at || !sim.grid) return; const pose = sim.cam.pose; voice.laugh(d.style, d.pitch, d.at, pose, !sim.grid.los([pose.x, pose.y, pose.z], d.at, 6)); });
  // saves: the sim's state with its place and target
  if (game.saves && !S7.inSession) {
    game.saves.write = () => Object.assign({ data: sim.serialize() }, sim.saveMeta());
    game.saves.read = save => { sim.deserialize(save.data); S7.loadedSave = true; };
    game.saves.canSave = false;
  }
  const boot = [
    ['The mountain', () => { S7.registerShapes(); }],
    ['The 3D engine', () => W3 && !headless ? W3.init(game) : null],
    ['Room 7', () => { S7.pres = W3 && !headless ? new Presenter3D(game, sim, W3) : new NullPresenter(); sim.titleBackdrop(); S7.pres.ensure('room7'); }]
  ];
  if (S7.inSession) boot.unshift(['The hub', () => S7.hubConnect(game, sim)]);
  const first = S7.inSession ? 'echorun' : 'title';
  const scenes = S7.scenes = S7.makeScenes(game, sim, pres, hud, audio, voice);
  S7.addModeScenes(scenes, game, sim, pres, hud, audio, voice);
  game.start({ scenes, scene: first,
    boot: { title: 'SKILLER7', version: S7.VERSION, steps: boot, messages: ['Shaking the featherbed', 'Counting the coats', 'Waxing the skis', 'Winding the cuckoo clock', 'Laughing quietly'] } });
  game.debug = S7.debugHandle(game, sim);
  S7.started = true;
  return game;
};

/* ---- new game, continue ---- */
S7.newGame = (diff) => {
  const g = S7.game, sim = S7.sim;
  g.settings.set('difficulty', diff);
  sim.o.noClock = false; sim.titleMode = false; sim.hideHero = false; sim.camOverride = null;
  sim.newGame(diff);
  g.go('play', {});
};
S7.continueGame = (afterDeath) => {
  const g = S7.game, sim = S7.sim;
  let ok = false;
  try { const s = g.saves && g.saves.latest(); if (s) { const r = g.saves.load(s.slot); ok = !!r; } } catch (e) { g.fail('continue', e); }
  if (!ok) { if (afterDeath && sim.st) { sim.mode = 'rail'; for (const id of PERSONA_ORDER) { const r = sim.st.roster[id]; if (r.frozen || r.hp <= 0) { r.frozen = false; r.statue = null; r.hp = Math.ceil(S7.PERSONAS[id].hp * .5); } } sim.enterArea(sim.st.area, sim.entryNode || Object.keys(sim.rails.nodes)[0], { noSave: true }); } else { sim.newGame(g.settings.difficulty || 'piste'); } }
  sim.o.noClock = false; sim.titleMode = false; sim.hideHero = false; sim.mode = 'rail';
  g.go('play', {});
};
/** pointer lock for mouse look while aiming (the 3D module forwards the moves to camera.takeMouse) */
S7.pointerLock = (on) => {
  if (!HAS_DOM || !S7.pres || !S7.pres.cur) return;
  const cam = S7.pres.cur.world.camera, cv = S7.game.screen && S7.game.screen.canvas; if (!cv) return;
  cam.capture = on;
  if (on && document.pointerLockElement !== cv && !S7._lockAsked) { S7._lockAsked = true; try { const p = cv.requestPointerLock(); if (p && p.catch) p.catch(() => { S7.lockFailed(); }); } catch (e) { S7.lockFailed(); } }
  if (!on) { S7._lockAsked = false; if (document.pointerLockElement === cv) document.exitPointerLock(); }
};
S7.lockFailed = () => { if (S7.game.settings.mouseMode !== 'pointer') { S7.game.settings.set('mouseMode', 'pointer'); S7.ui.toastMsg('Mouse: pointer mode'); } };
S7.mouseDelta = () => { if (!S7.pres || !S7.pres.cur || !S7.pres.cur.world) return [0, 0]; const out = [0, 0]; try { S7.pres.cur.world.camera.takeMouse(out); } catch (e) { /* no camera */ } return out; };
if (HAS_DOM) document.addEventListener('pointerlockerror', () => S7.lockFailed && S7.game && S7.lockFailed());

/** shapes: S7's own set and the store entries the game uses */
S7.registerShapes = () => {
  if (S7._shapesDone) return; S7._shapesDone = true;
  const A = (typeof window !== 'undefined' ? window : globalThis).ASSETS || {};
  for (const k of ['kenney-holiday', 'kenney-furniture', 'kaykit-furniture-bits', 'kenney-nature']) if (A[k]) E.addAssets(A[k]);
  if (S7.SHAPE_SET) E.addAssets(S7.SHAPE_SET);
};
