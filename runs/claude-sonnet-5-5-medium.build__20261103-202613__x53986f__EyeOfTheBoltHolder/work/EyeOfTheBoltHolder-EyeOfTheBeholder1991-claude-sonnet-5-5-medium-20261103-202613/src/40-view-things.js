/* VIEW THINGS: wall features, doors and floor items drawn with the 3D engine's pen. (Runs only when E.World3D exists.) */
const W3x = (typeof My3D2dge !== 'undefined' && My3D2dge.World3D) ? My3D2dge.World3D : null;
B.shade = (c, k) => (typeof My3D2dge !== 'undefined' ? My3D2dge.shade(c, k) : c);
if (W3x) {
  const TH = W3x.THINGS, sh = B.shade;
  TH.wallLever = (p, t) => { const a = t.on ? -1 : 1; p.box(0, .8, 20, 6, 1.6, 9, '#4a4452').box(0, 1.8, 20, 2, .8, 5.5, '#24202a').tube(0, 2.2, 20, 0, 3.6, 20 + a * 5, .55, '#a8a8b8').ball(0, 3.8, 20 + a * 5.4, 1.1, 1.1, 1.1, t.on ? '#4ae070' : '#e8483a'); };
  TH.wallButton = (p, t) => { p.box(0, .7, 20, 8, 1.4, 8, '#4a4452').ball(0, 1.6 - (t.pressed ? .9 : 0), 20, 2.2, 1.2, 2.2, '#c8a050'); };
  TH.catchStone = (p, t) => { p.box(0, 1.1, 18, 7, 2.2, 6, t.done ? '#5a5a5e' : '#6a6a68').box(0, 2.3, 18.5, 5, .3, .5, '#2a2a2e'); if (t.glint) p.glow(0, 2.8, 18, 1.4 + Math.sin((t.t || 0) * 5) * .4, '#58f0d0'); };
  TH.plaque = (p, t) => { p.box(0, .8, 20, 12, 1.6, 9, '#7a7468'); for (let i = 0; i < 4; i++) p.box(0, 1.7, 23 - i * 2.2, 8 - (i % 2) * 3, .3, .6, '#2a2620'); };
  TH.alcove = (p, t) => { p.box(0, .5, 15, 17, 1, 17, '#2a2830').box(0, .2, 15, 13, 1.2, 13, '#0a0a0e'); p.box(-8, 1, 15, 2, 2, 19, '#5a5668').box(8, 1, 15, 2, 2, 19, '#5a5668').box(0, 1, 24.5, 18, 2, 2, '#5a5668').box(0, 1, 5.5, 18, 2, 2, '#5a5668'); let i = 0; for (const id of t.held || []) { drawItemSmall(p, id, -4 + (i % 3) * 4, 2.2, 9 + 0, 8); i++; } };
  TH.candle = (p, t) => { const h = 4 + (t.n || 1) * 3; p.box(0, 1.5, 17, 4, 3, 1.4, '#8a6a30').tube(0, 1.8, 17.5, 0, 1.8, 17.5 + h, 1, '#e8e0c8'); if (t.lit) p.glow(0, 1.8, 18.5 + h, 1.6 + Math.sin((t.t || 0) * 9) * .3, '#ffb040').halo(0, 2, 19 + h, 7, [.35, .22, .08]); };
  TH.clock = (p, t) => { const n = t.n || 0; p.ball(0, 1.2, 22, 12, 2, 12, '#3a3226').ball(0, 2.3, 22, 10, 1.2, 10, t.whole ? '#e8d8a0' : '#6a604a'); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + .78; const gx = Math.cos(a) * 7, gz = 22 + Math.sin(a) * 7; p.ball(gx, 3.2, gz, 2.4, .8, 2.4, i < n ? '#d8b050' : '#1a1610'); if (i < n) p.glow(gx, 3.9, gz, .5, '#fff0b0'); } const ta = (t.t || 0) * (t.whole ? 1.2 : 0); p.bar(0, 3.2, 22, Math.cos(ta) * 6, 3.4, 22 + Math.sin(ta) * 6, 1, .6, '#2a2018'); };
  TH.undergate = (p, t) => { p.box(0, 1, 22, 24, 2, 34, '#2a2630'); for (let i = 0; i < 3; i++) { const x = -7 + i * 7; p.ball(x, 2.4, 24, 2.4, .8, 2.4, (t.got || 0) > i ? '#f0e8a0' : '#0a0a10'); p.box(x, 2.4, 20, 1, .6, 4, (t.got || 0) > i ? '#f0e8a0' : '#0a0a10'); } for (let i = 0; i < 7; i++) p.box(-9 + i * 3, 2.4, 33, 1, .8, 9, '#686878'); };
  TH.greatLock = (p, t) => { const a = t.rot || 0; p.ball(0, 1.5, 22, 11, 2.5, 11, '#3a3a46'); for (let i = 0; i < 8; i++) { const an = a + i * Math.PI / 4; p.box(Math.cos(an) * 8, 3.2, 22 + Math.sin(an) * 8, 3, 1.4, 3, t.done ? '#5a5a66' : '#8a8a9a'); } p.ball(0, 3.4, 22, 4, 1.2, 4, t.done ? '#222' : '#50e8ff'); if (!t.done) p.glow(0, 4.4, 22, 2.4, '#50e8ff').halo(0, 4.8, 22, 10, [.1, .3, .4]); };
  TH.shrine = (p, t) => { p.box(0, 3, 4, 16, 8, 8, '#4a4652'); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; p.ball(Math.cos(a) * 5, 3 + Math.sin(a) * 2, 10, 1.6, 1.8, 1.6, '#8a8678').ball(Math.cos(a) * 5, 3 + Math.sin(a) * 2 + .5, 12, .9, .9, .9, '#8a8678'); } if (!t.used) p.glow(0, 3, 14, 1.2, '#ffe090'); };
  TH.stairDown = (p, t) => { const s = '#5a5468'; p.box(-13, 0, 19, 4, 5, 38, s).box(13, 0, 19, 4, 5, 38, s).box(0, 0, 39, 30, 6, 4, s); for (let k = 0; k < 4; k++) p.box(0, -2 - k * 3, -1 - k * 2.5, 22, 3, 2, '#3a3644'); p.box(0, 0, 18, 22, 1, 34, '#0e0c14'); };
  TH.stairUp = (p, t) => { const s = '#5a5468'; p.box(-13, 0, 19, 4, 5, 38, s).box(13, 0, 19, 4, 5, 38, s).box(0, 0, 39, 30, 6, 4, s); for (let k = 0; k < 4; k++) p.box(0, -2 - k * 3, 1 + k * 2.5, 22, 3, 2, '#4a4654'); p.box(0, 0, 18, 22, 1, 34, '#d8c890'); p.glow(0, -1, 30, 3, '#fff0c0'); };
  TH.plateB = (p, t) => { const s = t.on ? .2 : 1, c = t.color || '#6a6474'; p.box(0, 0, s / 2, 22, 22, s, c).box(0, 0, s + .05, 17, 17, .1, sh(c, -.2)); };
  TH.pitHole = (p, t) => { p.box(0, 0, .2, 30, 30, .4, '#05040a'); for (const [x, y, w, d] of [[0, -15, 32, 2], [0, 15, 32, 2], [-15, 0, 2, 32], [15, 0, 2, 32]]) p.box(x, y, 1, w, d, 2, '#4a4652'); };
  TH.telefield = (p, t) => { const tt = t.t || 0; for (let i = 0; i < 6; i++) { const a = tt * 2 + i * 1.05; p.glow(Math.cos(a) * 9, Math.sin(a) * 9, 14 + Math.sin(tt * 3 + i) * 6, 1.8, '#9a7aff'); } p.halo(0, 0, 14, 14, [.25, .15, .4]); };
  TH.npcMark = (p, t) => { p.glow(0, 0, 40, 1.2, '#ffe090'); };
  /* floor item models, lying flat: x,y inside the cell; scale ~ cell 32 */
  function drawItemSmall(p, id, x, y, z, s) {
    const it = B.ITEMS[id]; if (!it) return; const c = it.c || '#aaa'; s = s || 1; const k = s / 8;
    switch (it.ic) {
      case 'blade': case 'fist': p.box(x, y, z, 1.2 * k, 6 * k, .5 * k, c).box(x, y - 3.2 * k, z, 3 * k, 1 * k, .8 * k, '#8a6a30'); break;
      case 'mace': p.tube(x, y - 3 * k, z, x, y + 2 * k, z, .5 * k, '#8a6a40').ball(x, y + 3 * k, z, 1.4 * k, 1.4 * k, 1.4 * k, c); break;
      case 'axe': p.tube(x, y - 3 * k, z, x, y + 3 * k, z, .5 * k, '#8a6a40').box(x + 1 * k, y + 2.5 * k, z, 2.4 * k, 1.8 * k, .6 * k, c); break;
      case 'staff': case 'spear': p.tube(x, y - 5 * k, z, x, y + 5 * k, z, .5 * k, '#8a6a40'); p.cone(x, y + 4 * k, z, x, y + 7 * k, z, .9 * k, c); break;
      case 'bow': case 'xbow': case 'sling': p.tube(x - 2 * k, y - 3 * k, z, x - 2 * k, y + 3 * k, z, .4 * k, c).tube(x + 1 * k, y - 4 * k, z, x + 1 * k, y + 4 * k, z, .3 * k, '#d8d0b0'); break;
      case 'dart': case 'arrow': p.tube(x, y - 3 * k, z, x, y + 3 * k, z, .3 * k, c).cone(x, y + 3 * k, z, x, y + 4.5 * k, z, .7 * k, '#c0c0c8'); break;
      case 'potion': p.ball(x, y, z + 1, 1.6 * k, 1.6 * k, 1.8 * k, c).tube(x, y, z + 2.4 * k, x, y, z + 3.6 * k, .6 * k, '#cfe6f0'); break;
      case 'scroll': p.tube(x - 2 * k, y, z, x + 2 * k, y, z, 1 * k, c).ball(x - 2 * k, y, z, .9 * k, 1.1 * k, 1.1 * k, '#8a6a30'); break;
      case 'book': p.box(x, y, z, 4 * k, 5 * k, 1.4 * k, c); break;
      case 'note': p.box(x, y, z - .3, 4 * k, 3 * k, .2 * k, c); break;
      case 'key': p.tube(x, y - 1 * k, z, x, y + 3 * k, z, .4 * k, c).ball(x, y - 2.4 * k, z, 1.4 * k, 1.4 * k, .5 * k, c).box(x + .8 * k, y + 2.4 * k, z, 1.2 * k, .8 * k, .5 * k, c); break;
      case 'rock': p.ball(x, y, z, 2 * k, 1.8 * k, 1.4 * k, c).ball(x + 1 * k, y - 1 * k, z + 1 * k, 1 * k, 1 * k, .8 * k, sh(c, .15)); break;
      case 'ration': p.box(x, y, z, 3.4 * k, 2.4 * k, 1.8 * k, c).box(x, y, z + .2, 3.6 * k, .6 * k, 2 * k, '#8a6a40'); break;
      case 'armor': p.box(x, y, z, 4.6 * k, 3.6 * k, 1.4 * k, c); break;
      case 'shield': p.ball(x, y, z, 2.8 * k, 2.8 * k, .8 * k, c); break;
      case 'helm': p.ball(x, y, z + 1, 2 * k, 2 * k, 1.8 * k, c); break;
      case 'ring': p.ball(x, y, z, 1.5 * k, 1.5 * k, .5 * k, c).ball(x, y, z + .3, .8 * k, .8 * k, .5 * k, '#1a1620'); break;
      case 'wand': p.tube(x - 2.5 * k, y, z, x + 2.5 * k, y, z, .4 * k, '#6a4a3a').ball(x + 3 * k, y, z, .7 * k, .7 * k, .7 * k, c); break;
      case 'gear': for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; p.box(x + Math.cos(a) * 2 * k, y + Math.sin(a) * 2 * k, z, 1 * k, 1 * k, .6 * k, c); } p.ball(x, y, z, 1.6 * k, 1.6 * k, .6 * k, c); break;
      case 'ward': p.ball(x, y, z, 2.2 * k, 2.2 * k, .5 * k, c).ball(x, y, z + .4, 1 * k, 1 * k, .5 * k, '#1a1620'); break;
      case 'boots': case 'bracer': p.box(x, y, z, 3 * k, 3 * k, 1.6 * k, c); break;
      case 'symbol': p.ball(x, y, z, 1.8 * k, 1.8 * k, .5 * k, c).glow(x, y, z + 1, .4, '#fff0a0'); break;
      default: p.ball(x, y, z, 1.6 * k, 1.6 * k, 1 * k, c);
    }
  }
  B.drawItemModel = drawItemSmall;
}
