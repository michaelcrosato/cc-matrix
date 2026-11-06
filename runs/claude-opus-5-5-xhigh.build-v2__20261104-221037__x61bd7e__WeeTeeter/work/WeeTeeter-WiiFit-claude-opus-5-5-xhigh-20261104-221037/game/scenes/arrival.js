/* scenes/arrival.js: the arrival card, then pick an instructor. */
(() => {
'use strict';
const E = My3D2dge, G = window.G, { px } = E, game = G.game;
const txt = (...a) => G.txt(...a);
let t = 0, phase = 'card', pills = null, birch, alder, pb, pa, tare;
G.scenes.arrival = {
  view: 'brawler', camera: { zoom: false }, pausable: true,
  enter() {
    t = 0; phase = 'card'; G.music('islandAM'); G.L.enabled = false; G.talk.close();
    birch = G.instructorRig('birch', 2.1); alder = G.instructorRig('alder', 2.1); pb = new G.Poser(birch); pa = new G.Poser(alder); pb.clip('Idle_Subtle', { loop: true, tgt: 1.4 }); pa.clip('Idle_Subtle', { loop: true, tgt: 1.7 }); tare = new G.TareBody(0, 18); tare.scale = 1.4;
    pills = new G.Pills(['Open the card'], { y: () => game.H - 40, w: 130, h: 22, onPick() { phase = 'pick'; pills = choose(); G.say('tare', G.DATA.lines.tare.first, { face: 'happy' }); } });
  },
  update(dt) {
    t += dt; G.stageCam(30, 8);
    pb.update(dt); pa.update(dt); birch.update(dt, { x: -62, y: 0, z: 0, vx: 0, vy: 0, facing: pb.facing }); alder.update(dt, { x: 62, y: 0, z: 0, vx: 0, vy: 0, facing: pa.facing });
    tare.update(dt); if (Math.floor(t / 1.5) !== Math.floor((t - dt) / 1.5)) tare.hop(30);
    if (G.talk.update(dt)) return;
    pills.update(dt);
  },
  draw(r) {
    G.ROOMS.reception(r);
    if (phase !== 'card') { G.drawMat(r, -62, 0, 30, 9, '#f4e6cf'); G.drawMat(r, 62, 0, 30, 9, '#fbf0dc'); G.drawRig(r, birch, -62, 0); G.drawRig(r, alder, 62, 0); }
    tare.draw(r, { scale: 1.4 });
    r.overlay(g => {
      const W = game.W, H = game.H;
      if (phase === 'card') { const cw = Math.min(330, W - 24); G.panel(g, (W - cw) / 2, 22, cw, 120, { r: 8 }); txt(g, 'The Institute for Gentle Improvement', W / 2, 30, '#14a8c8', { align: 'center' }); G.wrapText(g, G.DATA.lines.arrival[0], W / 2, 50, cw - 30, '#20404c', { align: 'center' }); txt(g, G.DATA.lines.motto, W / 2, 124, '#5f7f8a', { align: 'center' }); }
      else { txt(g, 'Pick your instructor', W / 2, 14, '#14a8c8', { align: 'center', scale: 2, shadow: '#ffffff' }); }
      pills.draw(g);
      G.prompts(g, [['confirm', phase === 'card' ? 'Open' : 'Pick']]);
    });
    G.talk.draw(r);
  }
};
function choose() {
  return new G.Pills([{ label: 'Birch', sub: 'Patient. Slightly warped.', id: 'birch' }, { label: 'Alder', sub: 'A lot of small decisions.', id: 'alder' }], { layout: 'h', y: () => game.H - 40, h: 26, w: 150, onPick(i, it) {
    G.S.instructor = it.id; G.S.arrived = true; G.Save.save();
    G.say(it.id, G.DATA.lines[it.id].hello, { onDone() { G.startDay(); } });
    pills.enabled = false;
  } });
}
})();
