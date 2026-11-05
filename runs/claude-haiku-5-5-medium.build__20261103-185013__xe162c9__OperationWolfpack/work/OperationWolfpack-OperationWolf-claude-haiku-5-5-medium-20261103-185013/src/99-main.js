// Starts the game. This file loads last, so every module (the bot, the renderer, the text) exists before the first frame.
(() => {
'use strict';
const WP = globalThis.WP, game = WP.game;
game.start({ scenes: WP.scenes, scene: 'title' });
// inside an AI Hub session (the hub frames this page with ?aihub=1) the game goes straight to the session's battle;
// anywhere else AIHub.connect resolves null and the title screen runs as usual
if (globalThis.AIHub && globalThis.AIHub.active) WP.Net.connect().then(info => { if (info) game.go('net', null, { fade: 0 }); });
// deep links, for the tools and for a person opening a part directly: #op1, #op2, #attract, #scores, #about, #dev, #lost
if (typeof location !== 'undefined' && location.hash) {
  const h = location.hash.slice(1);
  if (h === 'op1' || h === 'op2') { WP.newRun(); game.go('card', { op: h }, { fade: 0 }); }
  else if (h === 'attract') game.go('attract', { op: 'op1' }, { fade: 0 });
  else if (h === 'dev') game.go('dev', { back: 'title' }, { fade: 0 });
  else if (h === 'scores' || h === 'about' || h === 'lost') game.go(h, { back: 'title', op: 'op1' }, { fade: 0 });
}
game.debug = WP.debugHandle;
})();
