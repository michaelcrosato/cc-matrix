/* main.js: all scenes are in; start the game. In an AI Hub session it opens straight into the round. */
(() => {
'use strict';
const E = My3D2dge, G = window.G, game = G.game;
const FLEX = name => G.scenes[name] ? name : 'title';
const link = G.inSession ? null : G.deepLink();
game.start({ scenes: G.scenes, scene: G.inSession ? 'round' : 'title',
  boot: { title: 'WEE TEETER', version: G.version, messages: G.DATA.lines.boot, steps: [
    ['Zeroing the scale', () => {}], ['Sanding the instructors', () => {}], ['Counting the ducks', () => {}], ['Telling the hippo', () => {}]] } });
if (G.Hub) G.Hub.connect();
if (link) {
  if (link.act) { G.devMember(5); G.S.freePlay = true; game.after(.05, () => G.go(G.actScene(link.act), { tier: link.tier, from: 'dev' }, { fade: 0 })); }
  else { if (link.day) G.devMember(link.day); else if (link.dev) G.devMember(5); if (link.day) G.S.day = link.day; game.after(.05, () => G.go(FLEX(link.scene), { day: link.day }, { fade: 0 })); }
}
})();
