/* ===== 90 main · the game: the engine, the settings, the saves, the boot, the scenes (PLAN §3.7) ===== */
const E = My3D2dge, W3 = E.World3D;
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, bg: null, input: INPUT, menu: { settings: W3.SETTINGS, items: pauseItems() } });
/** the pause menu: Journal, Dev Mode (not in a hub session), About, Title */
function pauseItems() {
  const inHub = () => !!(window.AIHub && AIHub.active);
  return [
    ['Journal', () => { if (B.sim.S && SC.scenes) UI.screen = 'journal'; }],
    ['Dev Mode', () => { if (!inHub()) { SC.devOpen = true; } }],
    ['About & Credits', () => game.go('about')],
    ['Title', () => game.go('title')]
  ];
}
game.settings.define({ key: 'difficulty', label: 'Difficulty', group: 'Game', type: 'select', value: 'Normal', options: [['Easy', 'Easy'], ['Normal', 'Normal'], ['Hard', 'Hard']] });
game.settings.define({ key: 'hints', label: 'Hints', group: 'Game', type: 'select', value: true, options: [[true, 'On'], [false, 'Off']] });
game.settings.define({ key: 'levelUp', label: 'Level up', group: 'Game', type: 'select', value: 'At once', options: [['At once', 'At once'], ['On rest', 'On rest']] });
game.settings.define({ key: 'stepMode', label: 'Step animation', group: 'Game', type: 'select', value: 'Smooth', options: [['Smooth', 'Smooth'], ['Quick', 'Quick'], ['Instant', 'Instant']] });
game.settings.define({ key: 'menuTime', label: 'Time in menus', group: 'Game', type: 'select', value: 'Slow', options: [['Pause', 'Pause'], ['Slow', 'Slow'], ['Real time', 'Real time']] });
game.settings.define({ key: 'glyphs', label: 'Button symbols', group: 'Game', type: 'select', value: 'PlayStation', options: [['PlayStation', 'PlayStation'], ['Xbox', 'Xbox (A B X Y)']] });
game.settings.define({ key: 'bobOn', label: 'Head bob', group: 'Game', type: 'select', value: true, options: [[true, 'On'], [false, 'Off']] });
/** the saves: the game's own slots hold the sim's state (the JSON) and where the party is */
game.saves.write = () => ({ data: B.sim.save(), place: curF() ? curF().name : '', level: Math.max(1, ...partyList().map(([m]) => m.lvl)) });
game.saves.read = save => { B.sim.load(save.data); };
game.saves.canSave = () => !!(B.sim.S && !B.sim.S.race && !B.sim.S.over && !partyList().some(([m]) => m.state === 'ok' && monsOn().some(x => x.hp > 0 && x.aware && cheb(x.cx, x.cy, B.sim.S.party.cx, B.sim.S.party.cy) <= 6)));
game.start({
  title: 'EYE OF THE BOLT-HOLDER',
  scenes: SC.scenes,
  scene: 'title',
  boot: {
    title: 'EYE OF THE BOLT-HOLDER',
    steps: [
      ['The 3D engine', () => W3.init(game, { backend: 'webgl' })],
      ['The sounds and songs', () => defineSounds(game.audio)],
      ['The floors', () => buildWorlds(game)],
      ['The title stage', () => { SC.stage = buildTitleStage(); }]
    ]
  }
});
// a session: the hub's connect answers with our info; the game then opens on its card
Promise.resolve(window.__hubInfo).then(info => { if (info) hubInit(info); }).catch(() => {});
game.debugHandles = { B, SC, VIEW, UI, titleMenu };
window.__game = { game, B, SC, VIEW, UI };
