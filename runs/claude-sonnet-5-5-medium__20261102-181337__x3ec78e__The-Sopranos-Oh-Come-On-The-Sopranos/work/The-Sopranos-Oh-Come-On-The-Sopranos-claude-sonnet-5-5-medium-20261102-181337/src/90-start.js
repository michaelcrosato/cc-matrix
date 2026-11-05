/* ---- 90-start: register the scenes, boot, join an AI Hub session when there is one ---- */
scenes.play = PLAY; scenes.cut = SCENE; scenes.kitchen = KITCHEN;
const startScene = (location.hash || '').slice(1);
const hash = startScene && scenes[startScene.split('/')[0]] ? startScene.split('/') : null;
let first = 'title', data;
if (hash) { first = hash[0]; if (first === 'play') { S.step = 1; data = { level: hash[1] || 'street' }; } if (first === 'cut') data = { id: hash[1] || 'intro' }; if (first === 'kitchen') S.step = 2; }
game.start({ scenes, scene: first, data });
window.__game = { game, scenes, PLAY, SCENE, KITCHEN, S: () => S, setS: s => { S = s; }, FLOW, LEVELS, FOES, CAST, UPGRADES, hub, titleMenu: () => titleMenu, beginRun, startDemo, flowNext, score, heroMax, interactions: { feedDucks: () => PLAY.interactNow }, TALK, CUTS, SONGS, VOICES, blip, act, touchOnly };
// AI Hub: in a session the game opens straight into the round (no title, no menus), then calls ready()
hubInit().then(active => {
  if (!active) return;
  PLAY.pausable = false; S = blank(); S.step = 1; game.menu = () => false;
  game.go('play', { level: 'street', session: true }, { fade: 0 });
  AH.ready();
});
})();
