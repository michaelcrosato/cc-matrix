// Main: the game, its settings additions, the pause menu's items, saves, boot steps, game.debug, and the start.
(() => {
const DQ = globalThis.DQ, E = DQ.E, T = 16, HUB = DQ.HUB;
DQ.ABOUT = (typeof DQ_ABOUT !== 'undefined' && DQ_ABOUT) || null;
DQ.SETTINGS = [
  { key: 'glyphs', group: 'Controller', label: 'Button glyphs', type: 'select', value: 'playstation', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']], apply: (g, v) => { g.input.glyphs = v; } },
  { key: 'camView', group: 'Game', label: 'Camera view', type: 'select', value: 'Isometric', options: ['Isometric', 'Three-quarter'], apply: (g, v) => { if (g.scene && g.sceneName !== undefined && DQ.ctx) { g.setView(v === 'Three-quarter' ? 'threequarter' : 'iso'); const zs = DQ.ZOOMS[g.baseView.id]; g.setZoom(zs[E.clamp(DQ.ctx.zoomI === undefined ? 1 : DQ.ctx.zoomI, 0, zs.length - 1)]); } } },
  { key: 'difficulty', group: 'Game', label: 'Difficulty', type: 'select', value: 'Normal', options: ['Relaxed', 'Normal', 'Hard'], help: 'Relaxed: half damage taken, nothing lost when you come undone. Hard: 1.4x damage' },
  { key: 'autoHop', group: 'Game', label: 'Auto-hop', type: 'toggle', value: true, help: 'Hop up one-block ledges by walking into them' },
  { key: 'sprintMode', group: 'Game', label: 'Sprint', type: 'select', value: 'hold', options: [['hold', 'Hold'], ['toggle', 'Toggle']] },
  { key: 'textSpeed', group: 'Game', label: 'Text speed', type: 'select', value: 'Normal', options: ['Slow', 'Normal', 'Fast'] },
  { key: 'tracker', group: 'Game', label: 'HUD tracker', type: 'toggle', value: true, help: 'The objective and its marker' },
  { key: 'tutorials', group: 'Game', label: 'Tutorial tips', type: 'toggle', value: true },
  { key: 'cutaway', group: 'Game', label: 'Cutaway', type: 'select', value: 'Auto', options: ['Auto', 'Always', 'Off'], help: 'See inside roofs, tunnels and treetops around you' },
  { key: 'voices', group: 'Sound', label: 'Voices', type: 'slider', value: .8 }
];
const game = DQ.game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'iso', views: ['iso', 'threequarter'], input: DQ.Controls.PLAY, id: 'dragon-quilt-builders',
  autoPause: !HUB, corner: !HUB, fullscreen: HUB ? false : 'tap', backGesture: !HUB,
  menu: HUB ? false : { saves: { slots: 3, version: 1, migrate: (d, f) => DQ.Save.migrate(d, f) },
    items: [['Satchel', () => { game.resume(); if (DQ.ctx && game.sceneName === 'play') DQ.Menus.openSatchel(DQ.ctx); }], ['Dev Tools', () => { game.resume(); if (DQ.Dev) DQ.Dev.open(); }], ['About & Credits', () => { game.resume(); game.go('about', { back: game.sceneName === 'play' ? 'pause' : 'title' }); }]],
    settings: DQ.SETTINGS, controls: DQ.Controls.NAMES, quit: 'title' } });
game.input.glyphs = game.settings.glyphs || 'playstation';
if (game.saves) {
  game.saves.write = () => DQ.Save.write(DQ.ctx);
  game.saves.read = s => { game.go('play', { saveData: s.data }); };
}
// keys seen (touch-only detection), letters typed (name entry)
if (typeof window !== 'undefined' && window.addEventListener && !game.headless) {
  window.addEventListener('keydown', e => { DQ._keySeen = true; if (DQ.Controls.typing && !e.repeat) DQ.typedKeys.push(e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter' ? e.key : ''); });
  window.addEventListener('gamepadconnected', () => { DQ._keySeen = true; });
}
game.debug = {
  snapshot() {
    const c = DQ.ctx, sc = game.sceneName; if (!c || !c.builder) return { scene: sc, errors: game.errors.length };
    const b = c.builder, bag = b.bag.ids(); Object.assign(bag, b.bag.keys);
    const boss = c.bosses && c.bosses.active();
    return { scene: sc, mode: c.mode, day: c.clock.day, hour: Math.round(c.clock.hour * 100) / 100,
      builder: { x: Math.round(b.x), y: Math.round(b.y), z: Math.round(b.z), cx: b.cx, cy: b.cy, L: b.L, hp: b.hp, maxHp: b.maxHp, belly: Math.round(b.belly), equip: b.equip.weapon, ko: !!b.ko },
      bag, town: { planted: c.town.planted, level: c.town.level, cheer: c.town.cheer, border: c.town.rShown, rooms: c.rooms.list.filter(r => r.inTown).map(r => r.type) },
      quests: Object.fromEntries(Object.entries(c.quests.s).map(([k, s]) => [k, s.status === 'done' ? 'done' : s.status === 'active' ? s.step : s.status])),
      residents: c.npcs.list.map(n => ({ id: n.id, x: n.cx, y: n.cy, state: n.sleeping ? 'sleep' : n.state })), monsters: c.monsters.list.filter(m => !m.dead).length,
      siege: { active: c.siege.active, phase: c.siege.phase, wave: c.siege.wave }, boss: boss ? { id: boss.kind, hp: boss.hp, tangled: boss.tangled || 0 } : null,
      modal: c.modal, cutscene: c.cutscene ? c.cutscene.name : null, flags: Object.keys(c.flags).filter(k => c.flags[k]), errors: game.errors.length };
  },
  teleport(x, y, z) { const b = DQ.ctx && DQ.ctx.builder; if (b) { if (z === undefined) z = DQ.ctx.world.topZ(Math.floor(x / T), Math.floor(y / T)) * T; b.place3(x, y, z); game.cam.snap = true; } },
  give(id, n = 1) { const b = DQ.ctx && DQ.ctx.builder; if (b) b.bag.add(id, n); },
  flag(k, v = true) { if (DQ.ctx) DQ.ctx.quests.setFlag(k, v); },
  beat(id) { return DQ.ctx && DQ.Beats.apply(DQ.ctx, id); },
  get world() { return DQ.ctx && DQ.ctx.world; },
  get ctx() { return DQ.ctx; }
};
const scenes = DQ.SCENES;
// a deep link for checks: #play, #play:lv3 (a story beat), #bee, #attract, #about
const hash = !HUB && typeof location !== 'undefined' && location.hash ? location.hash.slice(1).split(':') : null;
const start = HUB ? 'bee' : (DQ.TEST.scene || (hash && DQ.SCENES[hash[0]] ? hash[0] : 'title'));
if (hash && hash[0] === 'play') DQ.startData = { name: 'Patch', beat: hash[1] || null };
game.start({ scene: start, data: DQ.startData, scenes, boot: { title: 'DRAGON QUILT BUILDERS', steps: [
  ['Unrolling the quilt', () => { if (!HUB && start === 'title') DQ.demoCtx(); }],
  ['Threading the needles', () => { if (!game.headless) { DQ.atlasFor(E.VIEWS.iso); for (const id in DQ.ITEMS) DQ.Icons.get(id); } }],
  ['Waking the residents', () => { DQ.tuning.load(); }],
  ['Tuning the voices', () => { DQ.AudioX.init(game); }]
], messages: ['Counting the buttons', 'Untangling yarn', 'Ironing the seams'] } });
})();
