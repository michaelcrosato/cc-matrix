/* BATZOOKA BASEBALL: the game object, its settings and the pause menu's extras. */
const game = BZ.game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', bg: '#06060c', input: BZ.PRESET,
  menu: {
    quit: (window.AIHub && window.AIHub.active) ? false : 'title',
    items: () => [BZ.inSession() ? null : ['Dev Mode', () => { game.resume(); if (game.scene && game.scene.openDev) game.scene.openDev(); }], game.scene && game.scene.canHelp ? ['Playbook', () => { game.resume(); if (game.scene.openHelp) game.scene.openHelp(); }] : null].filter(Boolean),
    settings: [
      { key: 'commentary', label: 'Radio commentary', value: true, group: 'Game' },
      { key: 'cpuLevel', label: 'CPU level', options: [['rookie', 'Rookie'], ['pro', 'Pro'], ['allstar', 'All-Star']], value: 'pro', type: 'select', group: 'Game' },
      { key: 'camMode', label: 'Camera in play', options: [['follow', 'Follow the ball'], ['wide', 'Wide']], value: 'follow', type: 'select', group: 'Game' },
      { key: 'crowdFx', label: 'Crowd detail', value: true, group: 'Game' }
    ]
  }
});
BZ.bindGame(game);
BZ.inSession = () => !!(window.AIHub && window.AIHub.active);
BZ.levelDiff = () => ({ rookie: .22, pro: .5, allstar: .82 }[game.settings.cpuLevel] ?? .5);
BZ.initAudio(game);
BZ.scenes = {};
