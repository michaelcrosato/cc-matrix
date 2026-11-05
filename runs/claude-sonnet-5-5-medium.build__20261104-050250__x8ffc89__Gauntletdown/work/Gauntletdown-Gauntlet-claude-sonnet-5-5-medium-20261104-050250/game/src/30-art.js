/* Art: item sprites, generator drawings, HUD icons, projectile drawing. All drawn from code. */
const SPR = {};
function mk(name, rows, pal, scale = 2) { SPR[name] = E.sprite(rows, pal, scale); }
mk('roast', ['..dddd..', '.dRRRRd.', 'dRRhRRRd', 'dRRRRRRd', '.dRRRRd.', '..dddwww', '.....wWw', '......ww'], { d: '#5a2810', R: '#c8602a', h: '#f0a060', w: '#e8e0d0', W: '#fff' });
mk('loaf', ['........', '..dddd..', '.dBBBBd.', 'dBhBBBBd', 'dBBBBhBd', 'dBBBBBBd', '.dddddd.', '........'], { d: '#5a3010', B: '#c88a40', h: '#f0c070' });
mk('cider', ['...cc...', '...CC...', '..jjjj..', '.jJJJJj.', '.jJhJJj.', '.jJJJJj.', '.jJJJJj.', '..jjjj..'], { c: '#5a3a20', C: '#8a6a40', j: '#6a4a18', J: '#c8903a', h: '#f0d080' });
mk('stew', ['........', '.sssssss', 'sGGgGGGs', 'sGgGGgGs', '.sGGGGs.', '..ssss..', '.bbbbbb.', '........'], { s: '#403828', G: '#6a9a3a', g: '#a0d060', b: '#202018' });
mk('flask', ['...kk...', '...kk...', '..kppk..', '.kpPPpk.', '.kPpPPk.', '.kPPPPk.', '..kkkk..', '........'], { k: '#2a1a50', p: '#9a60e0', P: '#d0a0ff' });
mk('key', ['.yyyy...', 'y....y..', 'y....yyy', 'y....y.y', '.yyyy.yy', '........', '........', '........'], { y: '#f0d040' });
mk('gold', ['........', '..yyyy..', '.yYYYYy.', '.yYooYy.', '.yYooYy.', '.yYYYYy.', '..yyyy..', '........'], { y: '#a07a10', Y: '#f0c830', o: '#fff0a0' });
mk('gem', ['...tt...', '..tGGt..', '.tGhGGt.', 'tGhGGGGt', '.tGGGGt.', '..tGGt..', '...tt...', '........'], { t: '#104a5a', G: '#30c8d8', h: '#d0ffff' });
mk('crown', ['y..y..y.', 'yy.yy.yy', 'yYyyYyYy', 'yYYYYYYy', 'yYrYYrYy', 'yYYYYYYy', 'yyyyyyyy', '........'], { y: '#a07a10', Y: '#f0d040', r: '#e03050' });
mk('platter', ['....pp..', '..pppppp', '.pPPPPPp', '.pPhPPPp', 'ppPPPPPp', 'oooooooo', '.oOOOOo.', '........'], { p: '#8a8a98', P: '#c8c8d8', h: '#fff', o: '#6a5a40', O: '#a08a60' });
mk('bell', ['...bb...', '..bBBb..', '.bBhBBb.', '.bBBBBb.', 'bBBBBBBb', 'bbbbbbbb', '...cc...', '........'], { b: '#8a6a10', B: '#e0b030', h: '#fff0a0', c: '#403010' });
mk('amulet', ['..cccc..', '.c....c.', 'c......c', 'c......c', '.c....c.', '..cGGc..', '..cGGc..', '........'], { c: '#a0a0b0', G: '#ffffff' });
mk('skull', ['.wwwwww.', 'wWWWWWWw', 'wWkWWkWw', 'wWkWWkWw', '.wWWWWw.', '..wWWw..', '..w..w..', '........'], { w: '#8a8a80', W: '#e8e8d8', k: '#201820' });
mk('heart', ['.rr..rr.', 'rRRrrRRr', 'rRhRRRRr', 'rRRRRRRr', '.rRRRRr.', '..rRRr..', '...rr...', '........'], { r: '#802020', R: '#e04040', h: '#ff9090' }, 1);
const SPR1 = {
  key: E.sprite(['.yyy....', 'y...y...', 'y...yyyy', '.yyy.y.y'], { y: '#f0d040' }, 1),
  flask: E.sprite(['..kk..', '.kppk.', 'kpPPpk', 'kPPPPk', '.kkkk.'], { k: '#2a1a50', p: '#9a60e0', P: '#d0a0ff' }, 1)
};
const POTION_SPR = {};
function potionSpr(sub) { if (POTION_SPR[sub]) return POTION_SPR[sub]; const c = SPECIAL_COL[sub] || '#ccc'; return POTION_SPR[sub] = E.sprite(['...kk...', '...kk...', '..kxxk..', '.kxXXxk.', '.kXxXXk.', '.kXXXXk.', '..kkkk..', '........'], { k: '#201830', x: c, X: '#ffffff' }, 2); }
const AMU_SPR = {};
function amuSpr(sub) { if (AMU_SPR[sub]) return AMU_SPR[sub]; const c = AMULET_COL[sub] || '#fff'; return AMU_SPR[sub] = E.sprite(['..cccc..', '.c....c.', 'c......c', 'c......c', '.c....c.', '..cGGc..', '..cGGc..', '........'], { c: '#b0a890', G: c }, 2); }

// shots, drawn in the depth queue
function drawShot(r, s) {
  r.queue(s.x, s.y, s.z, g => {
    const [sx, sy] = r.w(s.x, s.y, s.z), a = Math.atan2(s.vy, s.vx);
    const p = (d, c, w = 1) => px.line(g, Math.round(sx - Math.cos(a) * d), Math.round(sy - Math.sin(a) * d * .55), Math.round(sx), Math.round(sy), c, w);
    switch (s.kind) {
      case 'axe': { const k = Math.floor(s.spin) % 4; const o = [[-3, -3], [3, -3], [3, 3], [-3, 3]][k]; px.line(g, sx - o[0], sy - o[1], sx + o[0], sy + o[1], '#8a6a3a', 1); px.rect(g, sx + o[0] - 1, sy + o[1] - 1, 3, 3, '#d8dce8'); px.dot(g, sx, sy, '#fff'); break; }
      case 'javelin': p(9, '#d8c090', 1); px.rect(g, Math.round(sx), Math.round(sy) - 1, 2, 2, '#e8ecf8'); break;
      case 'arrow': p(8, '#c8a060', 1); px.dot(g, Math.round(sx), Math.round(sy), '#fff'); p(2, '#d0e8c0', 1); break;
      case 'hex': r.glowDisc(g, Math.round(sx), Math.round(sy), 7, '#c070ff', .7); px.disc(g, Math.round(sx), Math.round(sy), 2, '#f0d0ff'); break;
    }
  }, { emissive: true });
}
function drawFoe(r, f) {
  if (f.kind === 'pot') {
    r.groundDisc(f.tx, f.ty, 8, '#ff4030', .35 + .25 * Math.sin(W.time * 20));
    r.queue(f.x, f.y, f.z, g => { const [sx, sy] = r.w(f.x, f.y, f.z); px.disc(g, sx, sy, 3, '#8a5a30'); px.disc(g, sx - 1, sy - 1, 1, '#d8a860'); px.rect(g, sx - 2, sy - 3, 4, 1, '#5a3010'); });
  } else {
    r.queue(f.x, f.y, f.z, g => { const [sx, sy] = r.w(f.x, f.y, f.z); r.glowDisc(g, sx, sy, 8, '#ff8030', .8); px.disc(g, sx, sy, 3, '#ffb040'); px.disc(g, sx, sy, 1, '#fff6c0'); }, { emissive: true });
  }
}

// generators
function drawGen(g, ox, oy, gen, t) {
  const GD = GENDEF[gen.ch], [dk, md, hi] = GD.c, br = 1 + Math.sin(gen.breathe * 2) * .04, dmg = gen.rank0 - gen.rank, flash = gen.flash > 0;
  const c = k => flash ? '#ffffff' : k;
  switch (gen.ch) {
    case 'G': case 'U': {
      px.ell(g, ox, oy - 8, 7, 9 * br, c(md)); px.ell(g, ox - 2, oy - 10, 3, 6 * br, c(hi === '#d8e4f8' ? '#b8bcc8' : '#c0c0d0'));
      px.rect(g, ox - 5, oy - 20 * br, 10, 3, c(dk)); px.ell(g, ox, oy - 12, 4, 3, '#101018'); px.dot(g, ox - 1, oy - 12, '#fff'); px.dot(g, ox + 1, oy - 12, '#fff');
      if (gen.ch === 'U') px.rect(g, ox - 3, oy - 24 * br, 6, 3, c('#d8d8e8'));
      break;
    }
    case 'N': { px.poly(g, [[ox - 9, oy], [ox - 6, oy - 11 * br], [ox, oy - 14 * br], [ox + 6, oy - 11 * br], [ox + 9, oy]], c(md)); px.ell(g, ox, oy - 4, 4, 3, '#14100a'); for (let i = -2; i <= 2; i++) px.line(g, ox + i * 3, oy - 8, ox + i * 3 + 1, oy - 14, c('#d8d0b0'), 1); px.dot(g, ox - 1, oy - 4, '#9ad070'); px.dot(g, ox + 1, oy - 4, '#9ad070'); break; }
    case 'L': { px.rect(g, ox - 8, oy - 18 * br, 16, 18 * br, c(dk)); px.rect(g, ox - 7, oy - 17 * br, 14, 7, c(md)); px.rect(g, ox - 7, oy - 8, 14, 7, c(md)); for (let i = 0; i < 3; i++) { px.ell(g, ox - 4 + i * 4, oy - 13, 2, 1, c(hi)); px.ell(g, ox - 4 + i * 4, oy - 4, 2, 1, c(hi)); } break; }
    case 'I': { const pulse = .6 + .4 * Math.sin(t * 5); px.rect(g, ox - 9, oy - 5, 18, 5, c(dk)); for (let i = -3; i <= 3; i++) { px.rect(g, ox + i * 2 - 1, oy - 5, 1, 5, '#'+(Math.floor(255*pulse)<<16|Math.floor(90*pulse)<<8|30).toString(16).padStart(6,'0')); } px.rect(g, ox - 9, oy - 6, 18, 1, c(md)); break; }
    case 'F': { px.rect(g, ox - 7, oy - 4, 14, 4, c(dk)); for (let i = -2; i <= 2; i++) { const h = 8 + ((i * 7 + 5) % 5), x = ox + i * 3; px.rect(g, x - 1, oy - 4 - h * br, 3, h * br, c(hi === '#ffd860' ? '#e8e0c8' : hi)); px.dot(g, x, oy - 6 - h * br, '#ffd860'); px.dot(g, x, oy - 7 - h * br, '#ff8030'); } break; }
    case 'S': { px.ell(g, ox, oy - 5, 9, 6 * br, c(dk)); px.ell(g, ox - 3, oy - 8, 5, 4, c(md)); px.ell(g, ox + 4, oy - 9, 4, 4, c(md)); px.ell(g, ox + 1, oy - 12, 3, 2, c(hi)); break; }
  }
  for (let i = 0; i < dmg * 2; i++) px.line(g, ox - 5 + i * 4, oy - 14, ox - 3 + i * 4, oy - 5, '#0c0810', 1);
  if (dmg >= 2 || gen.hp / gen.maxhp < .3) for (let i = 0; i < 3; i++) px.dot(g, ox - 6 + i * 6, oy - 2 + (i % 2), '#665');
}

// HUD icons
function drawIcon(g, name, x, y, sc) { const s = SPR[name]; if (s) px.sprite(g, s, x, y); }
