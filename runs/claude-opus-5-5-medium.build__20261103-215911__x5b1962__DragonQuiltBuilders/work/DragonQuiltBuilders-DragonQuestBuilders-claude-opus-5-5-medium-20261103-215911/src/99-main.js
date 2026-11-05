// Dragon Quilt Builders: the game, its settings and menu, the boot steps, the debug handle, the start.
(() => {
const E = My3D2dge, DQ = globalThis.DQ, T = 16;
const hub = typeof AIHub !== 'undefined' && AIHub && AIHub.active;
DQ.inHub = !!hub;
// the views: whole-pixel block steps in iso and three-quarter
E.VIEWS.dqIso = DQ.VIEW_ISO; E.VIEWS.dqTq = DQ.VIEW_TQ;
const SETTINGS = [
  { key: 'dqGlyphs', label: 'Button glyphs', options: ['PlayStation', 'Xbox'], value: 'PlayStation', group: 'Game', help: 'The controller symbols in prompts', apply: (g, v) => { g.input.glyphs = v === 'Xbox' ? 'xbox' : 'playstation'; } },
  { key: 'dqView', label: 'Camera view', options: ['Isometric', 'Three-quarter'], value: 'Isometric', group: 'Game', apply: (g, v) => { if (g.scene && (g.sceneName === 'play' || g.sceneName === 'title')) g.setView(v === 'Three-quarter' ? DQ.VIEW_TQ : DQ.VIEW_ISO); } },
  { key: 'dqAutoHop', label: 'Auto-hop up ledges', value: true, group: 'Game' },
  { key: 'dqSprint', label: 'Sprint', options: ['Hold', 'Toggle'], value: 'Hold', group: 'Game' },
  { key: 'dqTextSpeed', label: 'Text speed', options: ['Slow', 'Normal', 'Fast'], value: 'Normal', group: 'Game' },
  { key: 'dqVoices', label: 'Voices volume', type: 'slider', min: 0, max: 1, step: .05, value: .8, group: 'Sound', apply: (g, v) => { g.audio.voiceVolume = v; g.audio.applyVolume(); } },
  { key: 'dqTracker', label: 'Quest tracker on the HUD', value: true, group: 'Game' },
  { key: 'dqDifficulty', label: 'Difficulty', options: ['Relaxed', 'Normal', 'Hard'], value: 'Normal', group: 'Game', help: 'Relaxed: half damage, nothing lost when you come undone. Hard: monsters hit 40% harder' },
  { key: 'dqCutaway', label: 'Cutaway (see inside)', options: ['Auto', 'Always', 'Off'], value: 'Auto', group: 'Game' }
];
DQ.SETTINGS = SETTINGS;
const openOver = name => () => { const ctx = DQ.current; if (!ctx) return; game.resume(); ctx.ui.open(name, name === 'satchel' ? { tab: 0 } : {}); };
const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: DQ.VIEW_ISO, views: [DQ.VIEW_ISO, DQ.VIEW_TQ], input: DQ.Controls.PLAY, id: 'dragon-quilt-builders',
  autoPause: !hub, corner: !hub,
  menu: hub ? false : { saves: { slots: 3, version: DQ.Save.VERSION, migrate: DQ.Save.migrate }, items: [['Satchel', openOver('satchel')], ['Dev Tools', openOver('dev')], ['About & Credits', openOver('about')]], settings: SETTINGS, controls: DQ.Controls.NAMES, quit: 'title' }
});
DQ.game = game;
// no touch controls: controller or keyboard required (a tap still works menus and leaves the attract mode)
game.input.touchEnabled = false;
if (game.settings && game.settings.dqGlyphs) game.input.glyphs = game.settings.dqGlyphs === 'Xbox' ? 'xbox' : 'playstation';
else game.input.glyphs = 'playstation';
if (!hub) { DQ.tuning.persist = true; DQ.tuning.load(); DQ.devLoad(); }
if (DQ.dev.timeScale !== 1) game.timeScale = DQ.dev.timeScale;
// a hidden tab keeps the round's world running (requestAnimationFrame stops there)
if (hub && typeof document !== 'undefined') { let last = performance.now(); setInterval(() => { const now = performance.now(), el = Math.min(1, (now - last) / 1000); last = now; if (document.hidden && game.sceneName === 'bee') game.advance(el); }, 250); }
if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('keydown', () => { DQ._sawKey = true; });

const scenes = Object.assign({}, DQ.SCENES(game), DQ.ATTRACT_SCENES ? DQ.ATTRACT_SCENES(game) : {}, DQ.BEE_SCENES ? DQ.BEE_SCENES(game) : {});
// the debug handle: tests and the engine's tools read it
game.debug = {
  get ctx() { const s = game.scene; return s && (s.ctx || (s.bee && s.bee.ctx)) || null; },
  snapshot() {
    const ctx = this.ctx, b = ctx && ctx.builder;
    const out = { scene: game.sceneName, errors: game.errors.length, paused: game.paused };
    if (!ctx) return out;
    Object.assign(out, { mode: ctx.mode, day: ctx.clock.day, hour: +ctx.clock.hour.toFixed(2), monsters: ctx.monsters.list.filter(m => !m.dead).length, cutscene: ctx.cutscene ? ctx.cutscene.id : null, ui: ctx.ui.top ? ctx.ui.top.name : null, talk: ctx.talk.open,
      town: { planted: ctx.town.planted, level: ctx.town.level, cheer: ctx.town.cheer, border: ctx.town.radius, rooms: ctx.rooms.list.filter(r => r.inBorder).map(r => r.type) },
      quests: Object.fromEntries(DQ.QUESTS.map(q => [q.id, ctx.quests.st(q.id).state === 'done' ? 'done' : ctx.quests.st(q.id).state === 'active' ? ctx.quests.st(q.id).step : ctx.quests.st(q.id).state])),
      residents: ctx.npcs.list.map(n => ({ id: n.id, x: Math.round(n.body.x / T), y: Math.round(n.body.y / T), state: n.state })),
      siege: { active: ctx.siege.active, phase: ctx.siege.phase, wave: ctx.siege.wave }, flags: Object.assign({}, ctx.flags) });
    if (b) out.builder = { x: +(b.body.x / T).toFixed(2), y: +(b.body.y / T).toFixed(2), z: +(b.body.z / T).toFixed(2), hp: b.hp, maxHp: b.maxHp, belly: Math.round(b.belly), equip: b.equip.weapon, held: b.held, ko: b.ko > 0 };
    if (b) out.bag = Object.fromEntries(b.bag.ids().map(k => [k, b.bag.real(k)]));
    const boss = ctx.monsters.list.find(m => m.def.boss && !m.dead); if (boss) out.boss = { id: boss.id, hp: boss.hp, phase: boss.phase, tangled: boss.tangled > 0 };
    if (ctx.bee) out.bee = ctx.bee.snapshot();
    return out;
  },
  teleport(x, y, z) { const ctx = this.ctx; if (ctx) DQ.Dev.teleport(ctx, Math.floor(x), Math.floor(y), z === undefined ? undefined : Math.floor(z)); },
  give(id, n = 1) { const ctx = this.ctx; if (ctx && ctx.builder) ctx.builder.take(id, n, { quiet: true }); },
  flag(k, v = true) { const ctx = this.ctx; if (ctx) ctx.flags[k] = v; },
  beat(id) { const ctx = this.ctx; return ctx ? DQ.applyBeat(ctx, id) : false; },
  get world() { const c = this.ctx; return c && c.world; }
};
const boot = [
  ['Unrolling the quilt', () => { DQ._demo = DQ.demoSession(game); }],
  ['Threading the needles', () => { if (!game.headless) { DQ._demo.renderer.warm(DQ.VIEW_ISO); for (const k in DQ.ITEMS) DQ.Icons.get(k, 16); } }],
  ['Waking the residents', () => { for (const n of DQ._demo.npcs.list) n.update(0); }],
  ['Tuning the voices', () => { if (game._audioX === undefined) game._audioX = new DQ.AudioX(DQ._demo); }]
];
game.start({ scenes, scene: hub ? 'bee' : 'title', boot: { title: 'DRAGON QUILT BUILDERS', version: DQ.VERSION, steps: boot, messages: ['Counting the buttons', 'Untangling yarn', 'Ironing the seams'] } });
})();
