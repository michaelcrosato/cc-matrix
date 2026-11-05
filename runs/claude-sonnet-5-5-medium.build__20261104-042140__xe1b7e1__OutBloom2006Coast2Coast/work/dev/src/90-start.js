/* Start: boot steps behind the engine's loading screen, then the title (or, inside AI Hub, the card). */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, game = OB.game;
game.debug = {
  OB,
  snapshot() { const sc = game.scene, R = sc && sc.race; return { scene: game.sceneName, race: R ? R.snapshot() : null, hub: OB.hub ? { active: OB.hub.active, started: OB.hub.started } : null }; },
  go(name, data) { game.go(name, data, { fade: 0 }); }
};
const hubMode = OB.env.hub && OB.hub && OB.hub.active;
game.start({
  scenes: OB.scenes, scene: hubMode ? 'hubcard' : 'title',
  boot: {
    title: OB.TITLE, version: '1.0', min: 0,
    steps: [
      ['Waking the engine', () => OB.engine && true],
      ['Planting the first flowers', () => { OB.getStage(0); OB.getStage(14); }],
      ['Tuning the radio', () => OB.SONGS.length],
      ['Meeting your passenger', () => { OB.rigOf('marisol'); OB.rigOf('bruno'); }],
      ['Joining the road trip', () => hubMode ? OB.hub.boot() : null]
    ],
    messages: ['Polishing the chrome', 'Folding the map wrong', 'Watering the roadside', 'Counting petals']
  }
});
})();
