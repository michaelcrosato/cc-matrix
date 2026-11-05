/* ============ 04-art: rigs in kits, crests, balls, cards, small drawing helpers ============ */
const GK_COLORS = ['#7ad84a', '#e86ad0', '#4ad0e8', '#ffa030'];
EF.makeRig = (data, kit, role, o = {}) => {
  const gk = role === 'GK' || o.gk;
  const colors = { skin: data.skin, hair: data.hairColor, cloth: kit.cloth, pants: kit.pants, boot: kit.boot, belt: kit.belt, trim: kit.trim, glove: gk ? (o.gloves || '#ffd34a') : kit.cloth };
  const rig = new E.Humanoid({ size: data.size || 1.1, build: data.build || 'heroic', weapon: null, outfit: 'shirt', hair: data.hair || 'short', sleeves: gk ? 'long' : 'short', colors, speedRef: 80,
    kit: kit.pattern ? { pattern: kit.pattern, color2: kit.color2, number: data.num, numberColor: kit.number } : { number: data.num, numberColor: kit.number, pattern: 'plain' } });
  return rig;
};
EF.gkKit = (M, side) => { const t0 = M.teams[0].kit.cloth, t1 = M.teams[1].kit.cloth; const pick = GK_COLORS.filter(c => c !== t0 && c !== t1); const c = pick[(side + ((M.teams[side].id || 'kip').length)) % pick.length]; return { cloth: c, color2: c, pattern: 'plain', pants: '#1a1d2a', boot: '#14161e', belt: '#1a1d2a', trim: c, glove: '#ffffff', number: '#141826' }; };
/** a crest, 14 px wide at scale 1 */
EF.drawCrest = (g, team, x, y, s = 1) => {
  const t = typeof team === 'string' ? EF.get('team', team) : team, c = t.crest, w = 12 * s, h = 14 * s, cx = x + w / 2;
  if (c.shape === 'shield') { px.poly(g, [[x, y], [x + w, y], [x + w, y + 8 * s], [cx, y + h], [x, y + 8 * s]], '#0a0c14'); px.poly(g, [[x + 1, y + 1], [x + w - 1, y + 1], [x + w - 1, y + 8 * s - 1], [cx, y + h - 2], [x + 1, y + 8 * s - 1]], c.c1); }
  else { px.disc(g, cx, y + 7 * s, 7 * s, '#0a0c14'); px.disc(g, cx, y + 7 * s, 7 * s - 1, c.c1); }
  const m = c.c2, mx = cx, my = y + 6.5 * s;
  switch (c.sym) {
    case 'fish': px.poly(g, [[mx - 4 * s, my], [mx, my - 2 * s], [mx + 3 * s, my], [mx, my + 2 * s]], m); px.poly(g, [[mx + 3 * s, my], [mx + 5 * s, my - 2 * s], [mx + 5 * s, my + 2 * s]], m); break;
    case 'boot': px.rect(g, mx - 3 * s, my - 3 * s, 2 * s, 5 * s, m); px.rect(g, mx - 3 * s, my + 1 * s, 6 * s, 2 * s, m); break;
    case 'sun': px.disc(g, mx, my, 2.5 * s, m); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; px.line(g, mx + Math.cos(a) * 3.5 * s, my + Math.sin(a) * 3.5 * s, mx + Math.cos(a) * 5 * s, my + Math.sin(a) * 5 * s, m, 1); } break;
    case 'cog': px.disc(g, mx, my, 3 * s, m); px.disc(g, mx, my, 1.2 * s, c.c1); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; px.rect(g, mx + Math.cos(a) * 3.5 * s - 1, my + Math.sin(a) * 3.5 * s - 1, 2, 2, m); } break;
    case 'lock': px.rect(g, mx - 3 * s, my - 1 * s, 6 * s, 4 * s, m); px.line(g, mx - 2 * s, my - 1 * s, mx - 2 * s, my - 3 * s, m, 1); px.line(g, mx + 2 * s, my - 1 * s, mx + 2 * s, my - 3 * s, m, 1); px.line(g, mx - 2 * s, my - 3 * s, mx + 2 * s, my - 3 * s, m, 1); break;
    case 'crown': px.poly(g, [[mx - 4 * s, my + 2 * s], [mx - 4 * s, my - 2 * s], [mx - 2 * s, my], [mx, my - 3 * s], [mx + 2 * s, my], [mx + 4 * s, my - 2 * s], [mx + 4 * s, my + 2 * s]], m); break;
  }
};
EF.BALLSPR = {};
EF.ballSprite = (id, k) => { const key = id + k; if (EF.BALLSPR[key]) return EF.BALLSPR[key]; const b = EF.BALLS.find(x => x.id === id) || EF.BALLS[0]; const a = ['.www.', 'wwkww', 'wkkkw', 'wwkww', '.www.'], c = ['.www.', 'wkwkw', 'wwwww', 'wkwkw', '.www.']; return (EF.BALLSPR[key] = E.sprite(k ? c : a, { w: b.c1, k: b.c2 })); };
EF.shade = (c, k) => '#' + [1, 3, 5].map(i => Math.max(0, Math.min(255, Math.round(parseInt(c.substr(i, 2), 16) * k))).toString(16).padStart(2, '0')).join('');
EF.TEAMCOL = (t, side) => { const d = EF.get('team', t); return (side === 1 && d.away ? d.away : d.kit).cloth; };
