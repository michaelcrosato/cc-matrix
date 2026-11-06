/* scenes/evening.js: the recap, Gerald's count, and bed. One idea: the day is over. */
(() => {
'use strict';
const E = My3D2dge, G = window.G, { px, clamp } = E, game = G.game;
const txt = (...a) => G.txt(...a);
let t = 0, pills = null, rig, poser, tare, coins, phase = 'recap', ageBefore, gShown;
G.scenes.evening = {
  view: 'brawler', camera: { zoom: false }, pausable: true,
  enter() {
    const s = G.S; t = 0; phase = 'recap'; G.dbg.activity = null; G.talk.close(); G.setDayLight('dusk'); G.music('islandDusk'); G.sting('daydone');
    rig = G.playerRig({ size: 2 }); poser = new G.Poser(rig); poser.clip('Stretch_Yawn', { loop: true, tgt: 1.4, speed: .7 }); tare = new G.TareBody(120, 16); tare.scale = 1.4; coins = new G.Coins(); gShown = s.minutes;
    pills = new G.Pills(['Go to bed'], { x: () => game.W / 2, y: () => game.H - 36, w: 130, h: 22, onPick() {
      phase = 'night'; t = 0; poser.clip('Sleeping', { loop: true, tgt: 1.57, fade: .6 }); G.say('tare', G.line('tare.night'), { face: 'asleep', onDone() { G.nextDay(); G.go('bodycheck', null, { fade: 'iris', seconds: .6 }); } });
    } });
    if (s.day === 2 && !s.nod) game.after(.5, () => G.mutter('tare', G.DATA.lines.tare.noNod, { auto: 4 }));
    else game.after(.8, () => { if (phase === 'recap') G.mutter('tare', G.line('tare.gerald'), { auto: 4.5, y: 144 }); });
    G.Save.save();
  },
  update(dt) {
    t += dt; G.stageCam(30, 8); tare.update(dt); if (Math.floor(t / 2.3) !== Math.floor((t - dt) / 2.3)) tare.hop(22);
    poser.update(dt); rig.update(dt, { x: -60, y: 0, z: phase === 'night' ? 12 : 0, vx: 0, vy: 0, facing: poser.facing, expr: 'smile' });
    if (G.talk.update(dt)) return;
    if (phase === 'recap') pills.update(dt);
  },
  draw(r) {
    G.ROOMS.bungalow(r, { dusk: true }); const l = r.w(0, -20, 40); G.L.add(-40, -10, 30, 120, .5, { color: '#ffb860' });
    G.drawRig(r, rig, -60, 0, phase === 'night' ? 12 : 0, { noShadow: phase === 'night' }); tare.draw(r, { scale: 1.4 });
    r.overlay(g => {
      const s = G.S, W = game.W, H = game.H, cw = Math.min(230, W * .56), x0 = W - cw - 14, y0 = 14;
      G.panel(g, x0, y0, cw, 130, { r: 8 });
      txt(g, 'Day ' + s.day + ' is over', x0 + cw / 2, y0 + 7, '#14a8c8', { align: 'center' });
      const best = G.lastRun; txt(g, 'Spine Age', x0 + 40, y0 + 24, '#5f7f8a', { align: 'center' }); txt(g, G.spineShown(), x0 + 40, y0 + 36, '#ff7a59', { align: 'center', scale: 3 });
      G.drawGerald(g, x0 + cw - 44, y0 + 66, 1.5, { friend: s.minutes >= 30 }); txt(g, Math.floor(s.minutes) + ' min', x0 + cw - 40, y0 + 70, '#20404c', { align: 'center' });
      G.drawAgeGraph(g, x0 + 14, y0 + 76, cw - 28, 42, s.history.concat([G.spineShown()]));
      const nx = G.DATA.unlocks.find(u => u.minutes > s.minutes); if (nx) txt(g, 'Gerald is saving for: ' + nx.name, x0 + cw / 2, y0 + 118, '#5f7f8a', { align: 'center' });
      if (phase === 'recap') pills.draw(g);
      if (phase === 'recap') G.prompts(g, [['confirm', 'Bed']]);
    });
    G.talk.draw(r);
  }
};
})();
