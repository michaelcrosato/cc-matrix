/* 13-art: new art for the Gaunt. String sprites (items, shots, icons), monster rigs (with the engine's new gear), the
 * Shade (a cloth ghost drawn in code), and painters for the generators, doors' bars, pads, fields and the stairs. */

const SPR = {};
const PALS = {
  k: { y: '#f8d048', Y: '#a87018', w: '#fff6c0' },
  g: { y: '#f8d048', Y: '#b07818', o: '#fff0a0', d: '#6a4410' }
};
function buildArt() {
  if (SPR.key) return;
  const S = (rows, pal, sc) => E.sprite(rows, pal, sc);
  SPR.key = S(['.yy.....', 'y..y....', 'Y..Yyyyy', '.YY..y.y', '.....Y.Y'], PALS.k);
  SPR.keySmall = SPR.key;
  SPR.gold = S(['...oo...', '..oyyo..', '.yyoyyy.', 'yyyYyyYy', 'YyYYyYYY', '.YYddYY.'], PALS.g);
  SPR.gem = S(['..www..', '.wGGgg.', 'wGGGggd', 'gGGggdd', '.gggdd.', '..gdd..', '...d...'], { w: '#e8fff0', G: '#5ae0a0', g: '#1ea870', d: '#0e6a44' });
  SPR.crown = S(['y...y...y', 'yy.yyy.yy', 'yyyyyyyyy', 'YrYbYrYbY', 'YYYYYYYYY', '.YYYYYYY.'], { y: '#ffe06a', Y: '#c8901a', r: '#e83a4a', b: '#4a8ae8' });
  SPR.roast = S(['......ww..', '..bbbb.ww.', '.bBBBBbw..', 'bBBbBBBb..', 'bBbBBBBb..', 'bbBBBbbb..', '.dbbbbd...', '..dddd....'], { b: '#b0602a', B: '#d8844a', d: '#6a3014', w: '#f4ecd8' });
  SPR.loaf = S(['..bbbbb..', '.bBwBwBb.', 'bBBBBBBBb', 'bBBBBBBBb', 'dbbbbbbbd', '.ddddddd.'], { b: '#c8883a', B: '#e8b064', w: '#f8e0a8', d: '#7a4a1a' });
  SPR.cider = S(['..cc...', '.cCCc..', '.cccc.h', 'jJJJJjh', 'jJlJJjh', 'jJJJJj.', 'jjJJjj.', '.jjjj..', '.dddd..'], { c: '#8a5a2a', C: '#b07a3a', j: '#8a4a26', J: '#c87a3a', l: '#f0c890', h: '#6a3a1a', d: '#4a2410' });
  SPR.stew = S(['.g.G..g..', '..G.g.G..', 'GgggGgggG', 'bGgGgGgGb', '.bbbbbbb.', '..bbbbb..'], { g: '#5aa02a', G: '#9ae84a', b: '#6a5a4a' });
  const potion = (c) => S(['..cc..', '..ww..', '.wllw.', 'wlLLlw', 'wLLLLw', 'wLLLLw', '.wLLw.', '..ww..'], { c: '#8a5a2a', w: '#d8e8f0', l: E.shade(c, -.2), L: c });
  SPR.flask = potion('#4a9ae8');
  SPR.special = {}; for (const k in SPECIALS) SPR.special[k] = potion(SPECIALS[k].color);
  const amulet = (c) => S(['.yyy.', 'y...y', 'y...y', '.yGy.', '.GGG.', '..G..'], { y: '#e8c04a', G: c });
  SPR.amulet = {}; for (const k in AMULETS) SPR.amulet[k] = amulet(AMULETS[k].color);
  SPR.platter = S(['....rrr.....', '..rRRRRr.g..', '.rRRwRRRrgg.', 'ppppppppppp.', '.PPPPPPPPP..'], { r: '#b0602a', R: '#d8844a', w: '#f4ecd8', g: '#5aa02a', p: '#e8e0d0', P: '#a8a090' });
  SPR.bell = S(['....y....', '...yyy...', '..yYYYy..', '..yYYYy..', '.yYYYYYy.', '.yYYYYYy.', 'yYYYYYYYy', 'YYYYYYYYY', '....d....'], { y: '#ffe06a', Y: '#c8901a', d: '#6a4410' });
  SPR.gauntlet = S(['.mm.mm....', 'mMMmMMm...', 'mMMmMMmm..', 'mMMMMMMmm.', 'mMMMMMMMm.', '.mMMMMMMm.', '.mMMMMMm..', '..gggggg..', '..gGGGGg..', '...gggg...'], { m: '#5a5a6a', M: '#a8acc0', g: '#c8901a', G: '#ffe06a' });
  SPR.gauntletBig = E.sprite(['.mm.mm....', 'mMMmMMm...', 'mMMmMMmm..', 'mMMMMMMmm.', 'mMMMMMMMm.', '.mMMMMMMm.', '.mMMMMMm..', '..gggggg..', '..gGGGGg..', '...gggg...'], { m: '#5a5a6a', M: '#a8acc0', g: '#c8901a', G: '#ffe06a' }, 2);
  SPR.lock = S(['.yy.', 'y..y', 'YYYY', 'YdYY', 'YYYY'], { y: '#c8c8d0', Y: '#e8c04a', d: '#3a2a10' });
  // shots
  SPR.shot_axe = S(['..mm.', '.mMMm', 'wwwMm', '.mMMm', '..mm.'], { m: '#7a7a86', M: '#d8dce8', w: '#8a5a2a' });
  SPR.shot_javelin = S(['ww........', '.wwwwwwwMM', 'ww........'], { w: '#b08a50', M: '#e8ecf4' });
  SPR.shot_arrow = S(['f.......', '.wwwwwwM', 'f.......'], { w: '#c8a060', M: '#e8ecf4', f: '#e84a4a' });
  SPR.shot_hex = S(['.p.', 'pPp', '.p.'], { p: '#c86af0', P: '#ffe8ff' });
  SPR.crock = S(['.bb.', 'bBBb', 'bBBb', '.bb.'], { b: '#8a5a3a', B: '#c88a5a' });
  SPR.plate = S(['.www.', 'wWWWw', '.www.'], { w: '#c8c0b0', W: '#f4f0e8' });
  SPR.fireball = S(['.oo.', 'oYYo', 'oYYo', '.oo.'], { o: '#ff6a1a', Y: '#fff0a0' });
  // icons for menus and How to Play
  SPR.stairsIcon = S(['mmmmmmmmmm', 'mddddddddm', 'mdkkkkkkdm', 'mdkddddkdm', 'mdkdkkdkdm', 'mdkdkkdkdm', 'mdkddddkdm', 'mdkkkkkkdm', 'mddddddddm', 'mmmmmmmmmm'], { m: '#6a6a74', d: '#2a2228', k: '#120c10' });
  SPR.urnIcon = S(['..cccc..', '.c....c.', '..cCCc..', '.cCCCCc.', 'cCCCCCCc', 'cCCdCCCc', 'cCCCCCCc', '.cCCCCc.', '..cccc..'], { c: '#5a4a3a', C: '#8a7a6a', d: '#2a1a10' });
  SPR.ghostIcon = S(['..wwww..', '.wwwwww.', 'wwkwwkww', 'wwwwwwww', 'ww.kk.ww', 'wwwwwwww', 'w.ww.ww.'], { w: '#d8e0f0', k: '#1a1028' });
  SPR.heart = S(['.R.R.', 'RRRRR', 'RRRRR', '.RRR.', '..R..'], { R: '#e8384a' });
}
buildArt();

/* ---- monster rigs (by type and rank: wounded monsters shrink and pale) ---- */
const RANK_SIZE = [.88, 1, 1.15];
function monsterRig(type, rank) {
  const s = RANK_SIZE[rank - 1] || 1, pale = rank === 1 ? .18 : rank === 2 ? .06 : 0, P = c => E.shade(c, pale);
  switch (type) {
    case 'gnasher': return new E.Humanoid({ size: .95 * s, build: 'bulky', weapon: 'club', hair: 'bald', eyeGlow: '#ffd84a', outfit: 'tunic', colors: { skin: P('#7a9a5a'), cloth: P('#6a4a2a'), trim: '#a87a3a', pants: '#3a2a1a', boot: '#2a1a10', belt: '#2a1a10', staff: '#6a4024' } });
    case 'lobber': return new E.Humanoid({ size: .85 * s, weapon: null, hat: { style: 'toque' }, outfit: 'tunic', hair: 'short', face: { eyes: 'big' }, colors: { skin: P('#e8b090'), hair: '#5a3a2a', cloth: P('#e8e4dc'), trim: '#c84a3a', pants: '#4a4a5a', boot: '#3a2a2a', belt: '#c84a3a' } });
    case 'fryar': return new E.Humanoid({ size: 1.0 * s, build: 'heroic', weapon: 'pan', outfit: 'robe', hood: true, sleeves: 'long', eyeGlow: '#ffb84a', colors: { skin: P('#c8a088'), hair: '#3a2a22', cloth: P('#5a3a2a'), trim: '#c8a040', belt: '#c8a040', boot: '#2a1a14', metal: '#3e3838' } });
    case 'snatcher': return new E.Humanoid({ size: .8 * s, weapon: null, hood: true, outfit: 'tunic', sleeves: 'long', face: { eyes: 'big' }, cape: { len: 3, width: 4, seg: 2 }, colors: { skin: P('#b8c890'), hair: '#4a4a3a', cloth: P('#6a6a4a'), trim: '#a89860', pants: '#3a3a2a', boot: '#2a2a1a', cape: '#a88a5a', capeIn: '#6a5a3a', eye: '#ff4a4a' } });
    case 'tithe': return new E.Humanoid({ size: 1.3, build: 'skeleton', weapon: 'scythe', outfit: 'robe', hood: true, sleeves: 'long', eyeGlow: '#ff3a3a', colors: { bone: '#e8e0d0', cloth: '#1a1420', hair: '#120c18', trim: '#3a2a4a', belt: '#3a2a4a', boot: '#120c18', metal: '#c8ccd8', staff: '#3a2a22' } });
    case 'imp': return new E.Blob({ R: 5 * s, colors: { dk: '#8a1a0a', base: P('#e84a1a'), lt: '#ffa04a', spec: '#fff0a0', eye: '#ffe84a', pupil: '#3a0a0a' }, horns: true, wings: true, tail: true, mouth: 'fangs', feet: true, face: 'front' });
    case 'king': return new E.Humanoid({ size: 2.3, build: 'skeleton', weapon: 'fork', hat: { style: 'crown', color: '#ffd84a' }, outfit: 'robe', sleeves: 'long', cape: { len: 9, width: 8, seg: 3 }, eyeGlow: '#ffd84a', colors: { bone: '#e8dcc0', cloth: '#5a1a6a', trim: '#e8c04a', belt: '#e8c04a', boot: '#2a1020', cape: '#8a1a3a', capeIn: '#3a0a1a', metal: '#d8c890', staff: '#c8a040' } });
    default: return null;
  }
}

/* ---- the Shade: a hungerghost's sheet, drawn in code (a sine hem that flutters, eye holes, a gaping mouth) ---- */
function drawShade(g, ox, oy, m, t, scale) {
  const s = (RANK_SIZE[m.rank - 1] || 1) * scale, H = 13 * s, Wd = 7 * s, bob = Math.sin(t * 4 + m.id) * 1.5, y0 = oy - 6 - H + bob;
  const pale = m.rank === 1 ? '#c8d0e0' : m.rank === 2 ? '#a8b4d0' : '#8a98c8', dk = E.shade(pale, -.35), hi = E.shade(pale, .3);
  const speed = Math.min(1, Math.hypot(m.vx, m.vy) / 40), pts = [];
  for (let i = 0; i <= 10; i++) { const a = Math.PI + i / 10 * Math.PI; pts.push([ox + Math.cos(a) * Wd, y0 + Wd + Math.sin(a) * Wd]); }
  for (let i = 0; i <= 8; i++) { const u = i / 8, x = ox + Wd - u * Wd * 2, wave = Math.sin(t * 9 + u * 9 + m.id) * (1.2 + speed * 1.8); pts.push([x, y0 + H + wave]); }
  px.blend(g, .8, 'normal', () => { px.poly(g, pts, dk); px.poly(g, pts.map(([x, y]) => [x - .7, y - .7]).slice(0, 11).concat([[ox - Wd + 1, y0 + H - 2], [ox + Wd - 1, y0 + H - 2]]), pale); });
  px.rect(g, ox - Wd * .5, y0 + 3, Math.max(1, s), Math.max(1, s * 2) | 0, hi);
  // eye holes and the mouth that gapes nearer a hero
  const ey = y0 + Wd * .8, open = Math.min(1, m.mouth || 0);
  px.glow(g, 1); px.rect(g, ox - 3 * s, ey, Math.max(1, 2 * s) | 0, Math.max(1, 2 * s) | 0, '#ff4a6a'); px.rect(g, ox + 1 * s, ey, Math.max(1, 2 * s) | 0, Math.max(1, 2 * s) | 0, '#ff4a6a'); px.glow(g, 0);
  px.ell(g, ox, ey + 4 * s, 2 * s, (1 + open * 2.5) * s, '#1a0a1a');
}

/* ---- generators: painters with three damage states, a breathing pulse while they spawn ---- */
function drawGen(r, gen, t) {
  const dmg = gen.hp < genMaxHp(1) * .5 ? 2 : gen.rank < (gen.rank0 || gen.rank) ? 1 : 0, shake = gen.shake > 0 ? Math.sin(t * 60) * 1 : 0, br = 1 + Math.sin(t * 3 + gen.id) * .04;
  r.shadow(gen.x, gen.y, 9, .4);
  r.queue(gen.x, gen.y, 0, g => {
    const [sx, sy] = r.w(gen.x, gen.y, 0), x = sx + shake, y = sy;
    const crack = (cx0, cy0, n) => { for (let i = 0; i < n; i++) px.line(g, cx0 + i * 3 - 3, cy0 - 6 + i * 2, cx0 + i * 3 + 1, cy0 - 1 + i * 3, '#1a0e08'); };
    switch (gen.type) {
      case 'urn': case 'tureen': {
        const c = gen.type === 'tureen' ? ['#c8c0b0', '#f0ece4', '#8a8478'] : ['#6a5a4a', '#9a8a76', '#3a2e24'];
        const z = gen.onTable ? -10 : 0;
        px.ell(g, x, y - 7 * br + z, 7 * br, 7 * br, c[2]); px.ell(g, x - 1, y - 8 * br + z, 6 * br, 6 * br, c[0]); px.ell(g, x - 2, y - 10 * br + z, 3, 3, c[1]);
        px.rect(g, x - 4, y - 15 * br + z, 8, 3, c[2]); px.rect(g, x - 3, y - 15 * br + z, 6, 1, c[1]);
        if (gen.type === 'tureen') { px.rect(g, x - 9, y - 9 + z, 2, 3, c[2]); px.rect(g, x + 7, y - 9 + z, 2, 3, c[2]); }
        px.blend(g, .5, 'add', () => px.ell(g, x, y - 16 * br + z, 3, 2, '#8affd0'));
        if (dmg) crack(x - 2, y - 6 + z, dmg * 2);
        break;
      }
      case 'den': px.ell(g, x, y - 4, 10 * br, 6, '#4a3a22'); px.ell(g, x - 1, y - 5, 9 * br, 5, '#6a5432'); px.ell(g, x, y - 4, 4, 3, '#120a04'); for (let i = 0; i < 5; i++) px.line(g, x - 9 + i * 4, y - 7, x - 7 + i * 4, y - 12 - (i % 2) * 2, '#8a7a5a'); if (dmg) crack(x + 2, y - 3, dmg * 2); break;
      case 'hutch': r.box(g, gen.x - 7, gen.y - 4, 0, gen.x + 7, gen.y + 4, 18 * br, '#8a5a32', '#6a4226'); px.rect(g, x - 6, y - 14, 12, 1, '#c8c0b0'); px.rect(g, x - 5, y - 16, 3, 2, '#e8e0d0'); px.rect(g, x + 1, y - 16, 4, 2, '#b8b0a0'); if (dmg) crack(x, y - 8, dmg * 2); break;
      case 'grate': { const on = (Math.sin(t * 5 + gen.id) + 1) / 2; px.rect(g, x - 8, y - 5, 16, 10, '#2a2020'); px.glow(g, 1); for (let i = 0; i < 4; i++) px.rect(g, x - 7 + i * 4, y - 4, 2, 8, on > .5 ? '#ffb43a' : '#ff6a1a'); px.glow(g, 0); px.rect(g, x - 8, y - 5, 16, 1, '#5a4a44'); if (dmg) crack(x, y, dmg * 2); break; }
      case 'shrine': r.box(g, gen.x - 6, gen.y - 4, 0, gen.x + 6, gen.y + 4, 10, '#6a6a7a', '#4a4a5a'); for (const k of [-4, 0, 4]) { px.rect(g, x + k - 1, y - 16, 2, 5, '#f0e8d0'); px.glow(g, 1); px.rect(g, x + k - 1, y - 19 + Math.sin(t * 9 + k) * .6, 2, 2, '#ffd84a'); px.glow(g, 0); } if (dmg) crack(x, y - 6, dmg * 2); break;
      case 'sacks': for (const [dx, dy, rr] of [[-4, 0, 5], [4, 1, 5], [0, -5, 4.5]]) { px.ell(g, x + dx, y - 4 + dy, rr * br, rr * .85, '#8a6a3a'); px.ell(g, x + dx - 1, y - 5 + dy, rr * .7, rr * .6, '#b08a50'); } if (dmg) crack(x, y - 4, dmg * 2); break;
    }
  }, { solid: true });
}
