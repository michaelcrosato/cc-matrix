/* Side-view vignette at every start line: Bruno waves the flag beside the car as the couple pull up. Skippable. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, px = E.px, game = OB.game, S = OB.scenes, T = OB.txt;
S.startline = {
  view: 'side', res: [480, 270], expand: true,
  enter(d) { this.d = d; this.t = 0; OB.voice.clear(); OB.playSong(d.station || 0, .1); OB.voice.say(OB.pickOf(OB.CAST.bruno.lines, Math.random), 'bruno'); },
  update(dt) { this.t += dt; OB.voice.update(dt); const I = game.input; if (this.t > .5 && (I.pressed('confirm') || I.clicked()) || this.t > 3.6) { OB.sfx('confirm'); game.go('race', this.d, { fade: .2 }); } },
  draw(r) {
    const W = r.W, H = r.H, t = this.t, st = OB.getStage(this.d.stage || 0), d = this.d;
    st.sky.draw(r);
    r.overlay(g => {
      const gy = Math.round(H * .72), B = OB.BIOMES[st.def.biome];
      px.rect(g, 0, gy - 18, W, H, B.grass[0]); px.rect(g, 0, gy, W, H, '#5a5668'); px.rect(g, 0, gy, W, 2, '#ffffff'); px.rect(g, 0, gy + 40, W, 2, '#ffd6f0');
      for (let i = 0; i < 14; i++) px.rect(g, ((i * 52 - t * 60) % (W + 52) + W + 52) % (W + 52) - 20, gy + 22, 26, 3, '#e8e0d0');
      px.rect(g, W * .62, gy - 46, 4, 46, '#f4f0ea'); px.rect(g, W * .62 - 20, gy - 46, 44, 5, '#2a2a3a');   // the start gantry post and banner
      for (let i = 0; i < 3; i++) px.disc(g, W * .62 - 12 + i * 12, gy - 44, 3, t > 1 + i * .8 ? (i === 2 ? '#40e060' : '#ffd23a') : '#7a2a3a');
      // the car, from the side, rolling in then waiting at the line
      const x = Math.min(W * .45, -60 + t * 190) , y = gy + 34, col = OB.COLORS[d.color || 0].c;
      px.ell(g, x, y + 4, 52, 5, 'rgba(0,0,0,.35)');
      px.poly(g, [[x - 50, y - 6], [x - 46, y - 22], [x - 10, y - 24], [x + 6, y - 34], [x + 18, y - 24], [x + 48, y - 20], [x + 54, y - 6]], col);
      px.rect(g, x - 50, y - 12, 104, 6, E.shade(col, -.3));
      const pc = OB.CAST[['marisol', 'dante', 'wren'][d.pass || 0] || 'marisol'];
      px.disc(g, x - 4, y - 36, 5, '#d8a078'); px.disc(g, x - 4, y - 38, 5, '#3a2010'); px.disc(g, x + 12, y - 36, 5, pc.colors.skin); px.disc(g, x + 12, y - 38, 5, pc.colors.hair);
      for (const wx of [-30, 32]) { px.disc(g, x + wx, y - 2, 9, '#14101a'); px.disc(g, x + wx, y - 2, 4, '#c8c8d8'); }
      // Bruno and his flag, animated by the rig (portrait) and a waving cloth
      OB.rigUpdate('bruno', 1 / 60, 'wave', t > 1 ? 'shout' : 'smile');
      const bx = W * .78; px.rect(g, bx - 8, gy - 4, 16, 30, '#f2f2f2'); px.rect(g, bx - 8, gy + 20, 16, 8, '#2f5fd0'); OB.portrait(g, 'bruno', bx - 22, gy - 52, 44, { bg: '#2a1a4a' });
      px.rect(g, bx + 14, gy - 60, 2, 56, '#d8d8e0'); const fl = Math.sin(t * 9) * 6;
      px.poly(g, [[bx + 16, gy - 60], [bx + 46, gy - 56 + fl], [bx + 16, gy - 44]], '#ffd23a'); px.disc(g, bx + 30, gy - 52 + fl / 2, 3, '#e8782a');
      OB.heading(g, W, st.def.name, 10, 2); T(g, 'DAWN TO DUSK: THE COAST IS WAITING', W / 2, 36, '#ffe2f4', { align: 'center' });
      OB.panel(g, 12, H - 46, 220, 28, { bg: '#2a1346dd' }); T(g, 'BRUNO BREZZA', 18, H - 42, '#ffe27a', { font: 'tiny' }); T(g, 'Flag up... flag down... go go GO!', 18, H - 32, '#ffffff', {});
      OB.drawPrompts(g, W, H, [['confirm', 'Skip']]);
    });
  }
};
})();
