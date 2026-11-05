// Creates the game, wires the standard menu and settings, boots and starts.
(() => {
const { E } = DQ;
const touchOnly = (() => { try { return !!(window.matchMedia && matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches); } catch (e) { return false; } })();
DQ.touchOnly = touchOnly;
const inHub = !!(typeof window !== 'undefined' && window.AIHub && window.AIHub.active);
const game = DQ.game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'iso', views: ['iso', 'threequarter'], input: DQ.PRESET, id: 'dragon-quilt-builders',
  menu: {
    saves: { slots: 3, version: 1, migrate: (d, f) => DQ.Save.migrate(d, f) },
    items: [['Satchel', () => { game.resume(); DQ.ui.open('satchel', {}); }]].concat(inHub ? [] : [['Dev Tools', () => { game.resume(); DQ.openDev(); }]]).concat([['About & Credits', () => { game.resume(); DQ.ui.open('info', { title: 'About & Credits', lines: DQ.aboutLines() }); }]]),
    settings: DQ.SETTINGS, controls: DQ.CONTROL_NAMES, quit: inHub ? false : 'title'
  }
});
game.input.glyphs = 'playstation';
DQ.initAudio(game); DQ.initDialog(game);
DQ.Save.install(game);
Object.assign(DQ.settings, game.settings || {});
const scenes = DQ.makeScenes(game);
DQ.toTitle = () => game.go('title');
if (typeof window !== 'undefined') window.addEventListener('wheel', e => { if (game.sceneName === 'play' && !DQ.ui.isOpen()) DQ.wheelAcc += Math.sign(e.deltaY); }, { passive: true });
// handle for tests and tools
game.debug = {
  snapshot() {
    const S = DQ.S, h = S && S.hero; if (!S) return { scene: game.sceneName, errors: game.errors.length + DQ.errors.length };
    return { scene: game.sceneName, mode: S.mode, day: S.clock.day, hour: +S.clock.hour.toFixed(2), builder: { x: Math.round(h.x), y: Math.round(h.y), z: Math.round(h.z), hp: Math.ceil(h.hp), maxHp: h.maxHp, belly: Math.round(h.belly), weapon: S.equip.weapon },
      bag: { ...S.bag }, town: { planted: S.town.planted, level: S.town.level, cheer: S.town.cheer, rooms: S.town.rooms.map(r => r.type) }, quests: { ...S.quests },
      residents: S.residents.map(r => ({ id: r.id, x: Math.round(r.x), y: Math.round(r.y) })), monsters: S.monsters.length, siege: { phase: S.siege.phase, wave: S.siege.wave }, boss: S.boss ? { id: S.boss.id, hp: S.boss.hp } : null, bee: S.bee ? { t: Math.round(S.bee.t), score: DQ.Bee.score(), state: S.bee.state } : null,
      cut: S.cut && S.cut.kind, dialog: DQ.dialogOpen(), ui: DQ.ui.top() && DQ.ui.top().panel, errors: game.errors.length + DQ.errors.length };
  },
  teleport(x, y, z = 0) { const h = DQ.S.hero; h.x = x; h.y = y; h.z = z; h.vx = h.vy = 0; DQ.snapCam(); },
  give(id, n = 1) { return DQ.inv.add(id, n, true); },
  flag(k, v) { DQ.S.flags[k] = v; }, beat: name => DQ.devBeat(name),
  get world() { return DQ.S && DQ.S.world; }, get ctx() { return DQ; }
};
const steps = [
  ['Unrolling the quilt', () => { }],
  ['Threading the needles', () => { }],
  ['Waking the residents', () => { }],
  ['Tuning the voices', () => { }]
];
let startScene = 'title';
if (inHub) startScene = 'hubwait';
game.start({ boot: { title: 'DRAGON QUILT BUILDERS', steps }, scenes, scene: startScene });
if (inHub) {
  DQ.Net.init(game);
  DQ.Net.join(game).then(info => { if (info) game.go('play', { mode: 'bee', fade: 0 }); else game.go('title'); }).catch(e => { DQ.err('hub', e); try { AIHub.fail('Could not join the round'); } catch (x) { } });
}
})();
