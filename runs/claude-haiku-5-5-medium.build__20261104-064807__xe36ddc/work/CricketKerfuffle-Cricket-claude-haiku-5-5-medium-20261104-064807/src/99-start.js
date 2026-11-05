/* ---- START: the scenes, the views, the boot steps and the hub. This file runs last. ---- */
G.makeViews();
G.defineSounds();
G.scenes.match.view = G.view;
G.scenes.attract.view = G.view;
const SCENES = Object.assign({}, G.scenes);
SCENES.attract.pausable = false;
G.game.o.menu.items.push(...G.pauseItems());
G.game.debug = G.debugHandle;
// the Backquote key opens the dev panel during a match (keyboard only, not rebindable)
addEventListener('keydown', e => { if (e.code === 'Backquote' && !e.repeat && G.game.sceneName === 'match') G.dev.toggle(); });
G.game.start({
  scenes: SCENES,
  scene: G.HUB.active ? 'hubcard' : 'title',
  boot: {
    title: 'CRICKET KERFUFFLE', version: G.VERSION,
    steps: [
      ['Mowing the outfield', () => { G.makeWorld(); }],
      ['Rolling the pitch', () => { G.tuneLoad(); }],
      ['Whitening the creases', () => { G.voice.open && G.voice.open(); }],
      ['Brewing the tea', () => { G.profile(); }]
    ],
    messages: ['Polishing the ball on a trouser leg', 'Counting the crowd\'s umbrellas', 'Finding the vicar\'s spectacles']
  }
});
G.hubStart();
