/* SKILLER7 — the start: the game (settings, pause items, saves), the scenes, boot, game.debug (the tests' handle).
 * S7.start({ World3D }) in the page; S7.start({ headless: true, seed }) in Node (a NullPresenter, no audio). */
const SETTINGS = [
  { key: 'picture3d', label: '3D picture', group: 'Display', value: 'pixels', options: [['pixels', 'Pixels'], ['balanced', 'Balanced'], ['full', 'Full']], help: 'Pixels: the game\'s own resolution, chunky. Full: the screen\'s.' },
  { key: 'shadows3d', label: 'Shadows', group: 'Display', value: true, help: 'Lamps and the moon cast real shadows.' },
  { key: 'filter3d', label: 'Filter', group: 'Display', value: 'cel', options: [['clean', 'None'], ['cel', 'Comic cel'], ['pixel', 'Pixel']], help: 'Comic cel: flat bands of light and ink. The game is drawn for it.' },
  { key: 'difficulty', label: 'Difficulty', group: 'Game', value: 'Piste', options: ['Bunny Hill', 'Piste', 'Off-Piste'], help: 'Bunny Hill: half damage, longer reveals. Off-Piste: they hit harder and fade faster.', apply: (g, v) => { if (S7.G) S7.G.difficulty = v; } },
  { key: 'aimToggle', label: 'Aim', group: 'Game', value: 'Hold', options: ['Hold', 'Toggle'], help: 'Hold the aim button to aim, or press it once to aim and again to stop.' },
  { key: 'aimAssist', label: 'Aim assist (controller)', group: 'Game', value: 'Low', options: ['Off', 'Low', 'High'], help: 'Slows and gently pulls the aim near a revealed warm spot.' },
  { key: 'padSens', label: 'Aim speed (controller)', group: 'Game', type: 'slider', value: 1, min: .5, max: 2, step: .05 },
  { key: 'mouseMode', label: 'Mouse aim', group: 'Game', value: 'Look', options: ['Look', 'Pointer'], help: 'Look: the mouse turns the view (it is captured). Pointer: the reticle follows the mouse like a light gun.' },
  { key: 'mouseSens', label: 'Mouse sensitivity', group: 'Game', type: 'slider', value: .12, min: .03, max: .4, step: .01 },
  { key: 'laughCues', label: 'Laugh direction cues', group: 'Game', value: true, help: 'Red arcs at the screen\'s edge point at the loudest laughter.' },
  { key: 'textSize', label: 'Text size', group: 'Game', value: 'Normal', options: ['Normal', 'Large'] },
  { key: 'textSpeed', label: 'Text speed', group: 'Game', value: 'Normal', options: ['Normal', 'Fast'] },
  { key: 'voices', label: 'Voices', group: 'Game', type: 'slider', value: .8, min: 0, max: 1, step: .05 },
  { key: 'padGlyphs', label: 'Controller buttons', group: 'Game', value: 'PlayStation', options: ['PlayStation', 'Xbox'], help: 'The button symbols in prompts.', apply: (g, v) => { if (g.settings && g.settings.glyphs !== undefined) { const want = v === 'Xbox' ? 'xbox' : 'playstation'; if (g.settings.glyphs !== want) g.settings.set('glyphs', want); } g.input.glyphs = v === 'Xbox' ? 'xbox' : 'playstation'; } }
];
S7.SETTINGS = SETTINGS;
let presenter = null, NULLP = { init() {}, step() {}, draw() {}, enterArea() {}, title() {} };
S7.UIOPEN = false;

function pauseItems() {
  const hub = S7.hubActive && S7.hubActive();
  const items = [];
  if (G && G.cut && S7.UI) items.push(['Skip scene', () => { const g = S7.game; if (g.shell && g.shell.hide) g.shell.hide(); g.paused = false; S7.skipScene(); }]);
  if (S7.UI) {
    if (!hub) items.push(['Map', () => S7.UI.openFromPause('map')]);
    items.push(['Items & Dossier', () => S7.UI.openFromPause('dossier')], ['Personas', () => S7.UI.openFromPause('personas')], ['Help', () => S7.UI.openFromPause('help')], ['About & Credits', () => S7.UI.openFromPause('about')]);
    if (!hub) items.push(['Dev Mode', () => S7.UI.openFromPause('dev')]);
  }
  return items;
}

S7.start = (opts = {}) => {
  if (opts.seed) S7.reseed(opts.seed);
  const headless = !!opts.headless || typeof document === 'undefined';
  const game = S7.game = new E.Game({
    canvas: 'screen', res: 'ps1', expand: true, bg: null, input: INPUT, id: 'skiller7', headless, loop: headless ? false : undefined, fullscreen: S7.hubActive && S7.hubActive() ? false : undefined,
    menu: { items: pauseItems, settings: SETTINGS, controls: CONTROL_NAMES, saves: { slots: 3, version: 1, migrate: (d, from) => S7.migrate(d, from) }, quit: typeof AIHub !== 'undefined' && AIHub.active ? false : 'title' }
  });
  game.pauseBlock = () => !!(S7.UIOPEN || S7.hubActive && S7.hubActive() && game.input.held.has('Pad8'));
  if (game.input) game.input.touchEnabled = false;
  if (game.settings && game.settings.padGlyphs) game.input.glyphs = game.settings.padGlyphs === 'Xbox' ? 'xbox' : 'playstation';
  // saves
  const sv = game.saves;
  if (sv) {
    sv.write = () => ({ data: S7.serialize(), place: (S7.AREAS[G.area] || {}).title || G.area, level: 'TARGET 0' + (G.target || 0) });
    sv.read = save => { S7.deserialize(save.data); S7.toPlay && S7.toPlay(); };
    Object.defineProperty(sv, 'canSave', { get: () => !!(G && G.area === 'room7' && !(S7.hubActive && S7.hubActive())), configurable: true });
  }
  S7.autosave = why => { if (!G || G.attract || G.noSaves || S7.TESTING && !S7.TESTSAVES || (S7.hubActive && S7.hubActive())) return; try { if (sv) sv.autosave(); emit('save', { slot: 'auto', why }); } catch (e) { game.fail('autosave', e); } };
  S7.loadDev && S7.loadDev();
  const scenes = S7.makeScenes(game);
  presenter = headless || !opts.World3D ? NULLP : new S7.Presenter3D(game, opts.World3D);
  S7.presenter = presenter;
  S7.audioInit && S7.audioInit(game);
  const steps = [];
  if (!headless && opts.World3D) {
    steps.push(['The 3D engine: three.js r182, Rapier 0.19.3', () => opts.World3D.init(game)]);
    steps.push(['Shaking the featherbed', () => presenter.init()]);
  }
  steps.push(['Counting the coats', () => { S7.validateQuick && S7.validateQuick(); }]);
  if (S7.hubBoot) steps.push(['Calling the hub', () => S7.hubBoot(game)]);
  const first = opts.scene || (typeof AIHub !== 'undefined' && AIHub.active ? 'hub' : 'title');
  game.start({ scenes, scene: first, boot: { title: 'SKILLER7', version: S7.VERSION, steps, messages: ['Waxing the skis', 'Winding the cuckoo clock', 'Counting the coats', 'Shaking the featherbed', 'Asking the Föhn to wait'] } });
  game.debug = S7.debugHandle();
  S7.started = true;
  if (typeof window !== 'undefined') window.__game = { game, S7 };
  return game;
};

/** game.debug: the handle tests and tools use (§5.7) */
S7.debugHandle = () => ({
  snapshot() {
    const g = S7.game, wk = G ? G.walker : {};
    if (!G) return { scene: g.scene && g.sceneName, mode: null };
    return { scene: g.sceneName, mode: G.mode, area: G.area, node: wk.node, edge: wk.edge, s: Math.round(wk.s), dir: wk.dir, speed: Math.round(wk.v), persona: G.persona, hp: Math.round(G.roster[G.persona].hp),
      red: Math.round(G.red), rime: G.rime, items: Object.assign({}, G.items), pins: G.pins.length, edelweiss: G.items.edelweiss || 0, flags: Object.keys(G.flags).filter(k => G.flags[k] && !k.startsWith('trig:') && !k.startsWith('hit:')),
      objective: S7.objective(), enemies: { alive: aliveEnemies().length, revealed: G.enemies.filter(e => e.alive && e.vis > .5).length }, boss: G.boss ? { id: G.boss.id, phase: G.boss.phase, bar: G.boss.bar } : null,
      aim: { on: G.aim.on, yaw: +G.aim.yaw.toFixed(3), pitch: +G.aim.pitch.toFixed(3), scope: G.aim.scope }, target: G.target, results: G.results, time: +G.time.toFixed(2), hash: S7.hash(), bot: S7.bot.status() };
  },
  teleport(area, node) { if (G.area !== area) S7.enterArea(area, node, { noAutosave: true }); else S7.placeAtNode(node); },
  setPersona(id) { G.roster[id].unlocked = true; G.persona = id; }, give(item, n) { S7.giveItem(item, n); }, addRed(n) { S7.addRed(n); }, addRime(n) { G.rime += n; },
  tune(k, v) { S7.tune(k, v); }, cheat(name, on) { CHEATS[name] = on; }, killAll() { S7.killAll(); }, revealAll() { for (const e of G.enemies) e.revealed = 30; },
  freeze(id) { if (id && id !== G.persona) G.persona = id; S7.freezeActive(); }, wave(id) { S7.startWave(id); }, beat(id) { S7.runBeat(id); }, boss(id, phase) { S7.startBoss(id, phase); },
  skipCutscene() { S7.skipScene && S7.skipScene(); }, hash: () => S7.hash(), bot: S7.bot, S7
});
/** a stable hash of the sim state (walker, roster, enemies, economy, flags) */
S7.hash = () => {
  if (!G) return 0;
  const wk = G.walker, parts = [G.area, wk.edge, Math.round(wk.s * 10), wk.dir, Math.round(wk.v), wk.node, G.persona, Math.round(G.red * 10), G.rime, G.mode,
    ...ORDER.map(id => Math.round(G.roster[id].hp * 10)), ...G.enemies.filter(e => e.alive).map(e => e.type + Math.round(e.x) + ',' + Math.round(e.y) + ',' + Math.round(e.hp)), Object.keys(G.flags).sort().join(), Math.round(G.aim.yaw * 1000), Math.round(G.aim.pitch * 1000)];
  return hashStr(parts.join('|'));
};
