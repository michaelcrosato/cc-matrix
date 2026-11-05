/* 04-art: everything drawn by code that is not a rig: crests (shields, roundels, charges), the balls, cards and the
 * whistle, the kipper, fans, the skylines behind the stands, tifos, the team bus, the trophy, the minibus, the trawler. */
const T_ = E.tones;
/* ---- crests: a shape, a field, a ring and charges, at any size ---- */
const CHARGES = {
  kipper: (g, cx, cy, s, c) => { px.ell(g, cx, cy, s * .32, s * .12, c); px.poly(g, [[cx + s * .28, cy], [cx + s * .45, cy - s * .14], [cx + s * .45, cy + s * .14]], c); px.dot(g, Math.round(cx - s * .2), Math.round(cy - s * .03), '#141414'); },
  anchor: (g, cx, cy, s, c) => { px.line(g, cx, cy - s * .3, cx, cy + s * .3, c, Math.max(1, s * .07)); px.line(g, cx - s * .2, cy - s * .18, cx + s * .2, cy - s * .18, c, Math.max(1, s * .06)); px.line(g, cx - s * .25, cy + s * .15, cx, cy + s * .32, c, Math.max(1, s * .06)); px.line(g, cx + s * .25, cy + s * .15, cx, cy + s * .32, c, Math.max(1, s * .06)); },
  boot: (g, cx, cy, s, c) => { px.rect(g, Math.round(cx - s * .12), Math.round(cy - s * .3), Math.round(s * .22), Math.round(s * .45), c); px.rect(g, Math.round(cx - s * .12), Math.round(cy + s * .08), Math.round(s * .42), Math.round(s * .17), c); for (let i = 0; i < 3; i++) px.dot(g, Math.round(cx - s * .08 + i * s * .14), Math.round(cy + s * .28), c); },
  sun: (g, cx, cy, s, c) => { px.disc(g, Math.round(cx), Math.round(cy - s * .08), Math.max(1, Math.round(s * .16)), c); for (let i = 0; i < 8; i++) { const a = i * PI / 4; px.line(g, cx + Math.cos(a) * s * .22, cy - s * .08 + Math.sin(a) * s * .22, cx + Math.cos(a) * s * .32, cy - s * .08 + Math.sin(a) * s * .32, c); } },
  arrows: (g, cx, cy, s, c) => { for (const d of [-1, 1]) { const y = cy + s * .24 + d * s * .05; px.line(g, cx - s * .3, y, cx + s * .3, y, c); px.line(g, cx + d * s * .3, y, cx + d * s * .2, y - s * .06, c); } },
  cog: (g, cx, cy, s, c) => { px.disc(g, Math.round(cx), Math.round(cy), Math.max(1, Math.round(s * .26)), c); for (let i = 0; i < 8; i++) { const a = i * PI / 4; px.rect(g, Math.round(cx + Math.cos(a) * s * .3 - s * .05), Math.round(cy + Math.sin(a) * s * .3 - s * .05), Math.max(1, Math.round(s * .1)), Math.max(1, Math.round(s * .1)), c); } px.disc(g, Math.round(cx), Math.round(cy), Math.max(1, Math.round(s * .1)), '#141414'); },
  hammer: (g, cx, cy, s, c) => { px.line(g, cx - s * .2, cy + s * .25, cx + s * .15, cy - s * .15, '#8a5a2a', Math.max(1, s * .06)); px.rect(g, Math.round(cx + s * .05), Math.round(cy - s * .3), Math.round(s * .25), Math.round(s * .14), c); },
  padlock: (g, cx, cy, s, c) => { px.rect(g, Math.round(cx - s * .2), Math.round(cy - s * .05), Math.round(s * .4), Math.round(s * .32), c); px.line(g, cx - s * .12, cy - s * .05, cx - s * .12, cy - s * .22, c, Math.max(1, s * .06)); px.line(g, cx + s * .12, cy - s * .05, cx + s * .12, cy - s * .22, c, Math.max(1, s * .06)); px.line(g, cx - s * .12, cy - s * .22, cx + s * .12, cy - s * .22, c, Math.max(1, s * .06)); px.dot(g, Math.round(cx), Math.round(cy + s * .08), '#141414'); },
  laurel: (g, cx, cy, s, c) => { for (let i = 0; i < 5; i++) for (const d of [-1, 1]) px.dot(g, Math.round(cx + d * s * (.36 - i * .02)), Math.round(cy + s * (-.25 + i * .12)), '#6aa040'); },
  crown: (g, cx, cy, s, c) => { px.poly(g, [[cx - s * .28, cy - s * .02], [cx - s * .28, cy - s * .3], [cx - s * .14, cy - s * .14], [cx, cy - s * .34], [cx + s * .14, cy - s * .14], [cx + s * .28, cy - s * .3], [cx + s * .28, cy - s * .02]], c); },
  coins: (g, cx, cy, s, c) => { for (let i = 0; i < 3; i++) px.ell(g, cx, cy + s * (.08 + i * .08), s * .2, s * .05, i % 2 ? '#c8a030' : c); }
};
EF.CHARGES = CHARGES;
EF.drawCrest = (g, team, cx, cy, size) => {
  const c = team.crest, f = T_(c.field), r = T_(c.ring), s = size;
  cx = Math.round(cx); cy = Math.round(cy);
  if (c.shape === 'shield') {
    const pts = k => [[cx - s * .42 * k, cy - s * .45 * k], [cx + s * .42 * k, cy - s * .45 * k], [cx + s * .42 * k, cy + s * .05 * k], [cx, cy + s * .5 * k], [cx - s * .42 * k, cy + s * .05 * k]];
    px.poly(g, pts(1.1), '#0a0a10'); px.poly(g, pts(1), r.base); px.poly(g, pts(.84), f.base); px.poly(g, pts(.84).slice(0, 3).concat([[cx, cy + s * .1]]), f.lt);
  } else {
    px.disc(g, cx, cy, Math.round(s * .52), '#0a0a10'); px.disc(g, cx, cy, Math.round(s * .48), r.base); px.disc(g, cx, cy, Math.round(s * .38), f.base);
    if (c.shape === 'roundel') px.disc(g, cx, cy, Math.round(s * .2), f.lt);
  }
  const ch = c.charges || [];
  ch.forEach((k, i) => { const fn = CHARGES[k]; if (fn) fn(g, cx + (ch.length > 1 && (k === 'kipper' || k === 'hammer') ? 0 : 0), cy + (ch.length > 1 ? (i ? s * .08 : -s * .06) : 0), s * (ch.length > 1 ? .8 : 1), i ? r.lt : r.hi); });
};
/* ---- balls: 4 frames each ---- */
const ballFrames = (w, k) => ['.ooooo.|owwkwwo|owkkkwo|owwkwwo|okwwwko|owwwwwo|.ooooo.', '.ooooo.|owwwkwo|okwwwwo|owwkwwo|owkkkwo|owwkwwo|.ooooo.', '.ooooo.|okwwwko|owwwwwo|owwkwwo|owkkkwo|owwwwwo|.ooooo.', '.ooooo.|owwkwwo|owwwwko|okwwwwo|owwkwwo|owkkkwo|.ooooo.']
  .map(s => E.sprite(s.split('|'), { w, k, o: '#141418' }));
EF.BALLS = {
  classic: { name: 'CLASSIC', frames: ballFrames('#f4f4f0', '#2a2a30') },
  orange: { name: 'WINTER ORANGE', frames: ballFrames('#ff8a2a', '#8a2a0a') },
  gold: { name: 'THE GOLDEN BALL', frames: ballFrames('#ffd84a', '#a8781a') },
  leather: { name: 'OLD LEATHER', frames: ballFrames('#a8703a', '#5a3418') }
};
EF.KIPPER_SPR = E.sprite(['...oo....', '.oooooo.o', 'ooKooooooo', '.oooooo.o', '...oo....'], { o: '#c8803a', K: '#141414' });
EF.CARD = { yellow: E.sprite(['yyy', 'yyy', 'yyy', 'yyy'], { y: '#ffe020' }, 1), red: E.sprite(['rrr', 'rrr', 'rrr', 'rrr'], { r: '#ff2a2a' }, 1) };
EF.FISH_PROP = E.sprite(['.oo..', 'oooo.o', '.oo..'], { o: '#d0a060' });

/* ---- fans: tiny people in their side's colours: idle, arms up, jumping; a scarf, a flag or a drum ---- */
EF.drawFan = (g, x, y, f, st, t) => {
  // st: 0 idle, 1 arms up, 2 jump, 3 scarf held up, 4 boo (head down), 5 despair (hands on head)
  const bob = st === 2 ? -Math.abs(Math.sin(t * 9 + f.ph)) * 3 : st === 1 ? -Math.abs(Math.sin(t * 6 + f.ph)) : Math.sin(t * 2 + f.ph) * .5;
  const X = Math.round(x), Y = Math.round(y + bob);
  px.rect(g, X - 2, Y - 6, 4, 6, f.shirt); px.rect(g, X - 2, Y - 6, 1, 6, f.shirtSh);
  px.rect(g, X - 1, Y - 9, 3, 3, f.skin); px.rect(g, X - 1, Y - 10, 3, 1, f.hair);
  if (st === 1 || st === 2) { px.rect(g, X - 3, Y - 11, 1, 5, f.shirt); px.rect(g, X + 2, Y - 11, 1, 5, f.shirt); }
  else if (st === 3) { const sw = Math.round(Math.sin(t * 3 + f.ph * .2) * 1.5); px.rect(g, X - 4 + sw, Y - 12, 9, 2, f.scarf); px.rect(g, X - 4 + sw, Y - 12, 2, 2, f.scarf2); px.rect(g, X + 3 + sw, Y - 12, 2, 2, f.scarf2); }
  else if (st === 5) { px.rect(g, X - 3, Y - 10, 1, 3, f.shirt); px.rect(g, X + 2, Y - 10, 1, 3, f.shirt); }
  else if (st === 4) { px.rect(g, X - 1, Y - 8, 3, 1, '#00000060'); }
  if (f.kind === 1 && st !== 3) { px.rect(g, X - 3, Y - 4, 7, 1, f.scarf); }
  if (f.kind === 2) { const w = Math.sin(t * 4 + f.ph) * 2; px.line(g, X + 3, Y - 6, X + 3, Y - 16, '#c8c0a0'); px.rect(g, X + 3, Y - 16, 6 + Math.round(w), 4, f.scarf); px.rect(g, X + 3, Y - 14, 6 + Math.round(w), 2, f.scarf2); }
  if (f.kind === 3) { px.rect(g, X - 2, Y - 3, 5, 3, '#e8e0d0'); if (Math.sin(t * 8 + f.ph) > .6) px.rect(g, X + 3, Y - 7, 1, 1, '#fff'); }
};
/* ---- skylines: silhouettes behind the north stand, by stadium ---- */
EF.drawSkyline = (g, r, st, t, base, W) => {
  const sky = st.look.sky || ['#102040', '#304070', '#6080a0'], dark = E.shade ? E.shade(sky[0], -.2) : '#06060c', mid = sky[1];
  const night = st.time === 'night', sil = night ? '#06060e' : st.time === 'dusk' ? '#2a1a2a' : '#5a7088';
  for (const [kind, u, h, o = {}] of st.skyline || []) {
    const x = Math.round(u * W), y = base;
    if (kind === 'chimney') { px.rect(g, x - 5, y - h, 10, h, sil); px.rect(g, x - 6, y - h, 12, 3, sil); if (o.glow) { px.rect(g, x - 4, y - h + 4, 8, 2, '#ff7a2a'); } if (o.smoke) for (let i = 0; i < 6; i++) { const k = ((t * .15 + i / 6) % 1); px.disc(g, Math.round(x + k * 30 + Math.sin(t + i) * 3), Math.round(y - h - 4 - k * 50), Math.round(3 + k * 7), night ? '#2a2a34' : '#8a8a90'); } }
    else if (kind === 'lighthouse') { px.poly(g, [[x - 7, y], [x + 7, y], [x + 4, y - h], [x - 4, y - h]], sil); for (let k = 0; k < 3; k++) px.rect(g, x - 6 + k, y - h * (.3 + k * .25), 12 - k * 2, 4, '#c83a3a'); px.rect(g, x - 5, y - h - 8, 10, 8, '#ffe8a0'); if (o.beam) { const a = t * 1.2; const dx = Math.cos(a) * 120, dy = Math.sin(a) * 14; px.blend(g, .35, 'add', () => px.poly(g, [[x, y - h - 4], [x + dx, y - h - 4 + dy - 14], [x + dx, y - h - 4 + dy + 14]], '#fff0a0')); } }
    else if (kind === 'harbour') { for (let i = 0; i < 5; i++) { const bx = x - 80 + i * 40; px.poly(g, [[bx - 12, y - 4], [bx + 12, y - 4], [bx + 8, y], [bx - 8, y]], sil); px.line(g, bx, y - 4, bx, y - 22, sil); } }
    else if (kind === 'palm') { px.line(g, x, y, x + 4, y - h, sil, 3); for (let i = 0; i < 6; i++) { const a = i / 6 * PI - PI; px.line(g, x + 4, y - h, x + 4 + Math.cos(a) * 18, y - h + Math.sin(a) * 6 + 6, sil, 2); } }
    else if (kind === 'dome') { px.rect(g, x - 30, y - h * .5, 60, h * .5, sil); px.ell(g, x, y - h * .5, 30, 26, sil); px.rect(g, x - 2, y - h * .5 - 34, 4, 10, sil); }
    else if (kind === 'hills' || kind === 'mountains') { const m = kind === 'mountains'; px.poly(g, [[x - 140, y], [x - 70, y - h * (m ? 1 : .6)], [x - 20, y - h * (m ? .6 : .4)], [x + 40, y - h * (m ? 1.1 : .7)], [x + 140, y]], m && night ? '#141826' : sil); if (m) px.poly(g, [[x + 25, y - h * .95], [x + 40, y - h * 1.1], [x + 55, y - h * .95]], '#e8ecf4'); }
    else if (kind === 'tower') { px.rect(g, x - 9, y - h, 18, h, sil); px.poly(g, [[x - 11, y - h], [x + 11, y - h], [x, y - h - 18]], sil); px.rect(g, x - 3, y - h + 10, 6, 8, night ? '#ffd890' : '#1a1a1a'); }
    else if (kind === 'walls') { px.rect(g, x - 60, y - h, 120, h, sil); for (let i = 0; i < 12; i++) px.rect(g, x - 60 + i * 10, y - h - 5, 6, 5, sil); }
    else if (kind === 'cypress') { px.ell(g, x, y - h / 2, 5, h / 2, '#1a2a1a'); }
    else if (kind === 'ribs') { for (let i = -2; i <= 2; i++) px.line(g, x + i * 26, y, x + i * 10, y - h, '#c8a040', 2); px.ell(g, x, y - h, 30, 6, '#c8a040'); }
    else if (kind === 'searchlight') { const a = Math.sin(t * .7 + u * 9) * .5 - PI / 2; px.blend(g, .25, 'add', () => px.poly(g, [[x - 3, y], [x + 3, y], [x + Math.cos(a + .08) * 260, y + Math.sin(a + .08) * 260], [x + Math.cos(a - .08) * 260, y + Math.sin(a - .08) * 260]], '#e0e8ff')); }
    else if (kind === 'seawall') { px.rect(g, 0, y - h, W, h, '#6a6a6a'); px.rect(g, 0, y - h, W, 2, '#8a8a8a'); }
  }
  if (st.id === 'euphorium') { for (let i = 0; i < 4; i++) { const a = t * .6 + i * 1.7; px.blend(g, .2, 'add', () => px.line(g, W / 2, base - 10, W / 2 + Math.cos(a) * W, base - 40 + Math.sin(a) * 30, ['#ff3aa0', '#3affd0', '#ffe03a', '#3a8aff'][i], 1)); } }
};
/* ---- tifo: the side's banner over its stand: its crest and slogan ---- */
EF.drawTifo = (g, team, x, y, w, h, u) => {
  const k = team.kits.home, f = T_(k.shirt), c2 = T_(k.color2 || '#ffffff');
  const hh = Math.round(h * u);
  px.rect(g, Math.round(x), Math.round(y), Math.round(w), hh, f.base);
  for (let i = 0; i < w; i += 16) px.rect(g, Math.round(x + i), Math.round(y), 8, hh, f.lt);
  px.rect(g, Math.round(x), Math.round(y), Math.round(w), 2, c2.base); if (hh > 2) px.rect(g, Math.round(x), Math.round(y + hh - 2), Math.round(w), 2, c2.base);
  if (u > .6) { EF.drawCrest(g, team, x + w * .18, y + h * .5, h * .7); E.font.title(g, team.tifo || team.short, Math.round(x + w * .58), Math.round(y + h * .5 - 10), { align: 'center', scale: 2, colors: [c2.hi, c2.base], depth: 1 }); }
};
/* ---- vehicles and the trophy, drawn at a screen point ---- */
EF.drawBus = (g, x, y, s, livery = '#7a1a2a', broken = false) => {
  const w = 60 * s, h = 26 * s; x = Math.round(x - w / 2); y = Math.round(y - h);
  px.rect(g, x, y, w, h, livery); px.rect(g, x, y + h - 6 * s, w, 6 * s, '#2a2a2a');
  for (let i = 0; i < 6; i++) px.rect(g, x + 4 * s + i * 9 * s, y + 4 * s, 7 * s, 8 * s, broken && i % 2 ? '#3a3a3a' : '#a8d0f0');
  px.rect(g, x, y + 14 * s, w, 2 * s, '#c8ccd4');
  for (const wx of [x + 10 * s, x + w - 10 * s]) { px.disc(g, Math.round(wx), Math.round(y + h), Math.round(5 * s), '#141414'); px.disc(g, Math.round(wx), Math.round(y + h), Math.round(2 * s), '#8a8a8a'); }
  E.font.text(g, 'AC LUCCHETTO', Math.round(x + w / 2), Math.round(y + 17 * s), '#fff', { font: 'tiny', align: 'center', outline: false });
};
EF.drawMinibus = (g, x, y, s, t) => {
  const w = 30 * s, h = 14 * s, b = Math.round(Math.sin(t * 12) * s * .6); x = Math.round(x - w / 2); y = Math.round(y - h + b);
  px.rect(g, x, y, w, h, '#e0e0d0'); px.rect(g, x, y + h * .55, w, h * .2, '#f08a24'); px.rect(g, x + w - 7 * s, y + 2 * s, 6 * s, 5 * s, '#a8d0f0'); for (let i = 0; i < 2; i++) px.rect(g, x + 3 * s + i * 7 * s, y + 2 * s, 5 * s, 4 * s, '#a8d0f0');
  for (const wx of [x + 6 * s, x + w - 6 * s]) px.disc(g, Math.round(wx), Math.round(y + h - b), Math.round(3 * s), '#141414');
};
EF.drawTrophy = (g, x, y, s, shine = 0) => {
  const m = T_('#d8dce8'), gold = T_('#e8c040');
  x = Math.round(x); y = Math.round(y);
  px.rect(g, x - 9 * s, y - 6 * s, 18 * s, 6 * s, '#3a2a1a'); px.rect(g, x - 7 * s, y - 9 * s, 14 * s, 3 * s, gold.base);
  px.rect(g, x - 2 * s, y - 18 * s, 4 * s, 9 * s, m.base);
  px.ell(g, x, y - 24 * s, 9 * s, 8 * s, m.sh); px.ell(g, x - 1 * s, y - 25 * s, 7 * s, 7 * s, m.base); px.rect(g, x - 9 * s, y - 32 * s, 18 * s, 4 * s, m.lt);
  for (const d of [-1, 1]) { px.ell(g, x + d * 11 * s, y - 25 * s, 4 * s, 6 * s, m.sh); px.ell(g, x + d * 11 * s, y - 25 * s, 2 * s, 4 * s, '#00000000'); }
  px.rect(g, x - 3 * s, y - 29 * s, 2 * s, 8 * s, m.hi);
  if (shine > 0) px.blend(g, shine, 'add', () => px.disc(g, x - 3 * s, y - 27 * s, 3 * s, '#ffffff'));
};
EF.drawTrawler = (g, x, y, s, t) => {
  const w = 120 * s; x = Math.round(x - w / 2); y = Math.round(y);
  px.poly(g, [[x, y - 30 * s], [x + w, y - 30 * s], [x + w - 12 * s, y - 6 * s], [x + 12 * s, y - 6 * s]], '#2a4a7a'); px.rect(g, x, y - 32 * s, w, 3 * s, '#f08a24');
  px.rect(g, x + w * .6, y - 52 * s, 26 * s, 22 * s, '#e8e4d8'); for (let i = 0; i < 3; i++) px.rect(g, x + w * .6 + 3 * s + i * 8 * s, y - 48 * s, 5 * s, 5 * s, '#a8d0f0');
  px.line(g, x + w * .3, y - 32 * s, x + w * .3, y - 74 * s, '#5a3a22', 2); px.rect(g, x + w * .3, y - 74 * s, 18 * s, 10 * s, '#f08a24');
  for (const wx of [x + 18 * s, x + 45 * s, x + w - 45 * s, x + w - 18 * s]) { px.disc(g, Math.round(wx), Math.round(y - 4 * s), Math.round(7 * s), '#141414'); px.disc(g, Math.round(wx), Math.round(y - 4 * s), Math.round(3 * s), '#8a8a8a'); }
  E.font.text(g, 'THE OLD TROUT II', Math.round(x + w * .35), Math.round(y - 24 * s), '#fff6e0', { align: 'center', outline: false });
};
