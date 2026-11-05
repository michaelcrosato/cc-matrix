/* AMERICAN FOOTBALL FIASCO: the start. The title, or a scene named in the address (#attract, #play, #about, #hall, #dev).
 * game.debug is the handle the tests and the tools read: the scene, the match's phase and score, the players on the field. */
(() => {
'use strict';
const FF = window.FF, game = FF.game;
const [first] = (location.hash || '').slice(1).split('/');
game.debug = {
  snapshot: () => { const S = FF.sim; return { scene: game.sceneName, phase: S.phase, poss: S.poss, los: Math.round(S.los), down: S.down, togo: S.togo, score: S.score.slice(), qtr: S.qtr, clock: Math.round(S.clock), over: S.over, play: S.play, players: S.all.length }; },
  state: () => FF.sim.state()
};
// in an AI Hub session the game opens straight into the round (no title, no menus); the round's own card is the hub's
const inHub = !!(window.AIHub && window.AIHub.active);
game.start({ scenes: FF.scenes, scene: inHub ? 'online' : FF.scenes[first] ? first : 'title', data: first === 'play' ? { mode: 'exhibition' } : undefined });
window.__ff = FF;
})();
