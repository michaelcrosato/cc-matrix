// The game itself: the engine's Game with its controls, pause menu and settings, the boot, the scenes, and the handle
// that tests and tools read (game.debug.snapshot()). Starts last, after every module above is defined.
(() => {
const E = My3D2dge, DQ = globalThis.DQ;

// the controls: the engine's default keyboard and pad layout, with this game's actions laid over it
const INPUT = Object.assign({}, E.Input.DEFAULT, DQ.INPUT_MAP);
delete INPUT.dash; delete INPUT.skill;

const touchOnly = typeof matchMedia === 'function' && !matchMedia('(any-pointer: fine)').matches && 'ontouchstart' in globalThis;
DQ.touchOnly = !!touchOnly;

const menuItems = [];
const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'iso', views: ['iso', 'threequarter'],
  input: INPUT, id: 'dragon-quilt-builders',
  menu: {
    saves: { slots: 3, version: 1, migrate: d => d },
    items: [
      ['Dev Tools', () => { if (!(globalThis.AIHub && AIHub.active)) game.go('dev'); }],
      ['About & Credits', () => game.go('about', { from: 'play' })],
    ],
    settings: [{ key: 'glyphs', label: 'Button glyphs', options: ['PlayStation', 'Xbox'], value: 'PlayStation' }],
    controls: {
      jump: 'Jump', attack: 'Break and strike', place: 'Place block', use: 'Use, talk and sleep', dodge: 'Dodge',
      craft: 'Craft', satchel: 'Satchel', turnL: 'Turn camera left', turnR: 'Turn camera right',
      hotPrev: 'Previous slot', hotNext: 'Next slot', view: 'Camera view',
    },
    quit: 'title',
  },
});
DQ.setGame(game);
DQ.defineSounds(game);
// the save slots hold the whole session: the world, the bag, the quests, the residents and the clock
game.saves.write = () => {
  const S = DQ.session;
  if (!S || !S.play) return { data: null, place: 'Nothing to save', level: 0 };
  return { data: S.play.serialize(), place: 'Day ' + S.play.day + ', town level ' + S.play.townLevel, level: S.play.current() ? DQ.QUESTS.indexOf(S.play.current()) + 1 : 8 };
};
game.saves.read = save => { DQ.loadFromSave(save); game.go('play', { fresh: false }); };

const scenes = DQ.scenes();
game.debug = {
  snapshot: () => {
    const S = DQ.session, p = S && S.play;
    if (!p) return { scene: game.sceneName, errors: game.errors.length };
    const b = p.builder;
    return {
      scene: game.sceneName, day: p.day, hour: Math.round(p.hour * 100) / 100,
      builder: { x: Math.round(b.x * 10) / 10, y: Math.round(b.y * 10) / 10, z: Math.round(b.z * 10) / 10, hp: b.hp, maxHp: b.maxHp, belly: Math.round(b.belly), facing: Math.round(b.facing * 100) / 100 },
      bag: { ...p.bag }, hotbar: p.hotbar.slice(), sel: p.sel, notions: { ...p.notions }, stats: { ...p.stats },
      town: { level: p.townLevel, cheer: Math.floor(p.cheer), banner: !!p.banner, rooms: p.rooms.map(r => r.kind) },
      quest: p.current() ? p.current().id : 'done', questDone: { ...p.questDone },
      residents: p.residents.map(r => ({ id: r.def.id, x: Math.round(r.x), y: Math.round(r.y), mode: r.mode })),
      monsters: p.monsters.filter(m => !m.dead).length, siege: p.siege ? { wave: p.siege.wave, done: p.siege.done } : null,
      boss: p.boss ? { hp: p.boss.hp, dead: p.boss.dead } : null, dead: !!p.dead, errors: game.errors.length,
    };
  },
  // the handle the tests use: place the Builder somewhere on the ground, facing a direction
  teleport(x, y, facing = 0) {
    const p = DQ.session.play, b = p.builder;
    const cx = Math.floor(x / DQ.T), cy = Math.floor(y / DQ.T);
    Object.assign(b, { x, y, z: p.world.top(cx, cy) * DQ.T, vx: 0, vy: 0, vz: 0, facing });
  },
  give: (id, n = 1) => DQ.session.play.give(id, n),
  beat: id => { const p = DQ.session.play; const i = DQ.QUESTS.findIndex(q => q.id === id); p.quest = i; },
  session: () => DQ.session,
  dq: DQ,
};

// in an AI Hub session the page opens straight into the round (the Quilting Bee), with no title in between
game.start({
  scenes,
  scene: globalThis.AIHub && AIHub.active ? 'bee' : 'title',
  boot: {
    title: DQ.TITLE,
    steps: [
      ['Unrolling the quilt', () => { DQ.generateWorld(new DQ.VoxelWorld()); }],
      ['Threading the needles', () => { DQ.resetTuning(); }],
    ],
  },
});
})();
