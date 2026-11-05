// 90-title: the logo over a live Hollow Creek morning (deer grazing by the creek, a slow pan), PRESS START in the glyph
// of the device used last, the corner's settings button; ten seconds without input starts the attract mode. On a
// touch-only device: "Controller or keyboard required", and the attract mode still runs.
SEG.showcase = (H, o) => {
  const vid = o.vantage || 'creekStand', site = { id: 'showcase' }; let t = 0, spawnT = 0;
  const spawnSet = () => {
    H.actors.length = 0;
    const W = H.world, pts = (l) => l.map(p => W.at(vid, p[0], p[1]));
    const mk = (kind, path, orders, o2 = {}) => { const a = new Actor(H, Object.assign({ kind, species: 'whitetail', path: pts(path), orders, points: o2.points || 8, seed: 40 + H.actors.length * 7 }, o2)); a.calm = true; H.actors.push(a); return a; };
    mk('buck', [[-30, 40], [-8, 36], [16, 40], [40, 52]], [['walk', { to: .45 }], ['graze', { secs: 9 }], ['look', { secs: 2 }], ['walk', { to: 1 }], ['exit']], { points: 10 });
    mk('doe', [[-20, 30], [0, 28], [26, 34]], [['walk', { to: .3 }], ['graze', { secs: 14 }], ['walk', { to: 1 }], ['exit']]);
    mk('fawn', [[-18, 27], [2, 26], [28, 31]], [['walk', { to: .32 }], ['graze', { secs: 12 }], ['walk', { to: 1 }], ['exit']]);
    mk('buck', [[30, 60], [10, 56], [-16, 60], [-40, 70]], [['walk', { to: .5 }], ['graze', { secs: 7 }], ['trot', { to: 1 }], ['exit']], { points: 6, delay: 6 });
  };
  return { block: true, canShoot: false, showReticles: false, cinema: true, noForeground: true,
    enter() { H.camAt(vid, -6, 5, 33); H.vantageId = vid; H.fanB = [-60, 60]; H.vkind = 'air'; spawnSet(); },
    update(dt) { t += dt; spawnT += dt; H.camAt(vid, Math.sin(t * .05) * 14, 5, 33); H.vkind = 'air'; if (H.actors.every(a => !a.live) || spawnT > 70) { spawnT = 0; spawnSet(); } return false; }
  };
};
function showcase() { if (!G.showcase) G.showcase = new Hunt({ mode: 'title', hunt: 'hollow', queue: [{ kind: 'showcase' }], players: [], showcase: true, seed: 7 }); return G.showcase; }
const Idle = {
  t: 0, last: null,
  /** seconds since the last input (keys, mouse buttons and movement, the wheel, pad buttons and sticks, touch) */
  update(dt) {
    const I = G.game.input, m = I.pointer && I.pointer(); let any = I.anyPressed() || (I.clicked && I.clicked()) || Math.hypot(...I.move()) > .25 || (I.padAim && Math.hypot(I.padAim[0], I.padAim[1]) > .3);
    for (const P of G.game.players || []) if (P !== I && P.anyPressed()) any = true;
    if (m) { if (this.last && Math.abs(m[0] - this.last[0]) + Math.abs(m[1] - this.last[1]) > 3) any = true; this.last = m.slice(); }
    if (this.wheel) { any = true; this.wheel = false; }
    if (G.touchOnly && I.anyPressed() && I.lastDevice !== 'touch') G.touchOnly = false;
    this.t = any ? 0 : this.t + dt; return any;
  },
  reset() { this.t = 0; }
};
if (HAS_DOM) addEventListener('wheel', () => { Idle.wheel = true; }, { passive: true });
function drawLogo(g, W, y, s = 1) {
  E.font.text(g, 'THE 41ST ANNUAL', W / 2, y - 16 * s, '#f4e0b0', { align: 'center', scale: Math.max(1, Math.round(s)), shadow: '#1a0c08', outline: false });
  E.font.title(g, 'BIG BUCK', W / 2, y, { scale: Math.round(5 * s), colors: ['#fff4c8', '#f0c060', '#c8842a', '#8a5420'], outline: '#e8581a', depth: 4, depthColor: '#4a2410', align: 'center' });
  E.font.title(g, 'HUNT-OFF', W / 2, y + 40 * s, { scale: Math.round(4 * s), colors: ['#fff4c8', '#f0c060', '#c8842a', '#8a5420'], outline: '#e8581a', depth: 3, depthColor: '#4a2410', align: 'center' });
  // a rack over the logo
  const cx = W / 2, cyy = y - 26 * s, c = '#e8d8b0', d = '#3a2410', L = (a, b, w) => { px.line(g, cx + a[0] * s, cyy + a[1] * s, cx + b[0] * s, cyy + b[1] * s, d, w + 2); };
  const R = (a, b, w) => px.line(g, cx + a[0] * s, cyy + a[1] * s, cx + b[0] * s, cyy + b[1] * s, c, w);
  const rack = [[[-8, 6], [-26, -4]], [[-26, -4], [-40, -18]], [[-16, 2], [-18, -12]], [[-28, -6], [-30, -20]], [[8, 6], [26, -4]], [[26, -4], [40, -18]], [[16, 2], [18, -12]], [[28, -6], [30, -20]]];
  for (const [a, b] of rack) L(a, b, 2); for (const [a, b] of rack) R(a, b, 2);
}
const titleScene = {
  camera: { zoom: false }, touch: [],
  enter() { G.scene = 'title'; Idle.reset(); showcase(); if (G.sfx) { G.sfx.music('hoedown', { fade: .8 }); G.sfx.ambience('hollow'); } },
  update(dt) {
    const S = showcase(); S.update(dt); if (G.sfx) G.sfx.update(dt);
    const moved = Idle.update(dt);
    if (Idle.t > 10 && !G.ui.screen) { G.game.go('attract', {}, { fade: .5 }); return; }
    if (G.ui.screen) return;
    if (G.touchOnly) return;   // a tap does not start a game here
    const I = G.game.input;
    if (I.pressed('start') || I.pressed('confirm') || I.pressed('fire') || (I.clicked && I.clicked() && !G.touchOnly)) { G.sfx && G.sfx.play('confirm'); G.game.go('menu', { page: 'main' }, { fade: .3 }); return; }
    for (const P of G.game.players.slice(1)) if (P.pressed('start')) { G.game.go('menu', { page: 'main' }); return; }
    void moved;
  },
  draw(r) {
    const S = showcase(); S.draw(r);
    r.overlay(g => {
      const W = r.W, Ht = r.H; px.blend(g, .35, 'multiply', () => px.rect(g, 0, 0, W, Ht * .5, '#5a4a6a'));
      drawLogo(g, W, Ht * .2 + 8, Ht < 260 ? .8 : 1);
      if (G.touchOnly) {
        E.ui.box(g, W / 2 - 130, Ht * .62, 260, 50, { bg: ['#2a1c10', '#120a06'], border: '#e8843a', alpha: .92 });
        E.font.text(g, 'CONTROLLER OR KEYBOARD', W / 2, Ht * .62 + 10, '#ffffff', { align: 'center', scale: 2, outline: false });
        E.font.text(g, 'REQUIRED', W / 2, Ht * .62 + 30, '#ffd040', { align: 'center', scale: 2, outline: false });
        E.font.text(g, 'Settings: the button at the top right', W / 2, Ht * .62 + 58, '#d8c8a8', { align: 'center', shadow: '#000', outline: false });
      } else if (Math.floor(G.game.real * 1.6) % 2 === 0) Glyph.cue(g, 'start', 'PRESS START', W / 2, Ht * .74, G.game.input, { scale: 2 });
      E.font.text(g, 'v' + VERSION + '  ·  my-3D2dge ' + E.version, W - 6, Ht - 10, '#c8b898', { align: 'right', outline: false, shadow: '#000' });
      E.font.text(g, '© 2026 ALL SOUNDS AND PIXELS MADE IN CODE', 6, Ht - 10, '#c8b898', { outline: false, shadow: '#000' });
    });
  }
};
