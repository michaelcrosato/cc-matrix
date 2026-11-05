/* AMERICAN FOOTBALL FIASCO — start: the boot scene, the debug handle, touch-only detection, and the first scene. */
(() => {
'use strict';
const E = My3D2dge, FF = globalThis.FF, game = FF.game;
FF.scenes.boot = { view: 'threequarter', input: 'FOOTBALL', update() {}, draw(r) { r.sky(['#101848', '#402a70']); r.text('AMERICAN FOOTBALL FIASCO', r.W / 2, r.H / 2 - 8, '#ffe08a', { align: 'center', scale: 2 }); r.text('Waiting for the hub...', r.W / 2, r.H / 2 + 14, '#c8c0e8', { align: 'center' }); } };
// the title entered inside a hub round (Quit does nothing): back to the round
const titleEnter = FF.scenes.title.enter;
FF.scenes.title.enter = function (d) { if (FF.flags.hub && FF.S.M) { game.go('match', { resume: true }, { fade: 0 }); return; } titleEnter.call(this, d); };
if (FF.DOM) { FF.flags.touchOnly = !!(window.matchMedia && !matchMedia('(any-pointer: fine)').matches && navigator.maxTouchPoints > 0); const off = () => { FF.flags.touchOnly = false; }; addEventListener('keydown', off); addEventListener('gamepadconnected', off); }
// 10-foot Shell theme: the pause, settings and controls screens (the engine's HTML) are drawn larger for a TV
if (FF.DOM) { const st = document.createElement('style'); st.textContent = '.esh-sh .esh-mod{zoom:1.25}@media (min-width:1000px){.esh-sh .esh-mod{zoom:1.6}}@media (min-width:1700px){.esh-sh .esh-mod{zoom:2.1}}.esh-sh .esh-wide{width:min(900px,100%)}'; document.head.appendChild(st); }
game.debug = {
  snapshot() { const S = FF.S, M = S.M; return { scene: game.scene && game.scene.name || (game.sceneName || ''), match: FF.matchDebug(), errors: game.errors.length, hub: FF.flags.hub }; },
  S: () => FF.S, FF
};
game.start({ scene: FF.net && FF.net.active ? 'boot' : 'title', scenes: FF.scenes });
if (FF.net && FF.net.active) FF.net.begin();
})();
