/* scenes/tareday.js: Day 4. Tare is recalibrated on a huge old scale. You press the button to read it. */
(() => {
'use strict';
const E = My3D2dge, G = window.G, { px, clamp } = E, game = G.game;
const txt = (...a) => G.txt(...a);
let t = 0, step = 'talk', tare, needle = 0, target = 0, shake = 0;
const hugeScale = (r, x, y) => {
  const g = r.ctx, p = r.w(x, y, 0), W = 110, H = 110;
  px.rect(g, p[0] - W / 2 + 6, p[1] - 8, W - 12, 8, '#7a5a3a');
  px.rect(g, p[0] - W * .2, p[1] - H, W * .4, H - 6, '#a57f54'); px.rect(g, p[0] - W * .2, p[1] - H, 5, H - 6, '#c49c6c');
  px.rect(g, p[0] - W / 2, p[1] - 16, W, 8, '#c49c6c'); px.rect(g, p[0] - W / 2, p[1] - 16, W, 2, '#e0c094');
  const cy = p[1] - H - 20; px.disc(g, p[0], cy, 36, '#7a5a3a'); px.disc(g, p[0], cy, 32, '#f7f0dc'); for (let i = 0; i < 20; i++) { const a = -Math.PI * 1.25 + i / 19 * Math.PI * 1.5; px.rect(g, p[0] + Math.cos(a) * 27, cy + Math.sin(a) * 27, 2, 2, '#7a5a3a'); }
  const a = -Math.PI * 1.25 + needle * Math.PI * 1.5; px.line(g, p[0], cy, p[0] + Math.cos(a) * 24, cy + Math.sin(a) * 24, '#e0553a', 2); px.disc(g, p[0], cy, 3, '#20404c');
  E.font.text(g, 'grams', p[0], cy + 12, '#7a5a3a', { align: 'center', outline: false });
};
G.scenes.tareday = {
  view: 'brawler', camera: { zoom: false }, pausable: true,
  enter() {
    t = 0; step = 'talk'; needle = 0; target = 0; shake = 0; G.dbg.activity = null; G.talk.close(); G.setDayLight('morning'); G.music('islandDusk');
    tare = new G.TareBody(-110, 10); tare.scale = 1.8; tare.say('worried', 30);
    G.say('tare', G.DATA.lines.tareDay, { face: 'worried', onDone() { step = 'hop'; t = 0; } });
  },
  update(dt) {
    t += dt; G.stageCam(40, 8); tare.update(dt, step === 'hop' ? [60, 10, 3] : null); if (G.talk.update(dt)) return;
    if (step === 'hop') { if (Math.hypot(tare.x - 60, tare.y - 10) < 8) { tare.x = 60; tare.z = 0; tare.vz = 0; step = 'press'; t = 0; target = 0; G.A.sfx('stamp'); needle = .02; } return; }
    if (step === 'press') { needle = .02 + Math.sin(t * 2) * .004; if (game.input.pressed('confirm') || game.input.clicked()) { game.input.consumeAll(); step = 'read'; t = 0; G.A.sfx('creak'); G.A.sfx('tareBoop'); } return; }
    if (step === 'read') { const k = clamp(t / 2.2, 0, 1); needle = .02 + Math.sin(k * Math.PI * 4) * (1 - k) * .4 + k * .03; shake = (1 - k) * .4; if (k >= 1) { step = 'after'; tare.say('sad', 30); G.say('tare', G.DATA.lines.tareRead, { face: 'sad', onDone() { G.S.tareDay = true; G.Save.save(); G.startDay(); } }); } }
  },
  draw(r) {
    G.ROOMS.reception(r); hugeScale(r, 60, -6); 
    const z = step === 'press' || step === 'read' || step === 'after' ? 18 : 0;
    tare.z = Math.max(tare.z, step === 'press' || step === 'read' || step === 'after' ? 18 : 0);
    tare.draw(r, { scale: 1.8, shake });
    r.overlay(g => { if (step === 'press') { G.panel(g, game.W / 2 - 100, game.H - 60, 200, 24, { r: 9 }); txt(g, "Read Tare's weight", game.W / 2, game.H - 53, '#20404c', { align: 'center' }); G.prompts(g, [['confirm', 'Read it']]); } });
    G.talk.draw(r);
  }
};
})();
