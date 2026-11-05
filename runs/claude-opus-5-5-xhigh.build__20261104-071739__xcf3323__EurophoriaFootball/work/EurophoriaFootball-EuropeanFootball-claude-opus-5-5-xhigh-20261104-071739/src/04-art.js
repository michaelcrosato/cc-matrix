/* ART (section 8.2): kits as rig colours, crests painted by code, the balls, cards, the whistle, the kipper and other
 * props as string sprites. Everything is drawn with the engine's pixel primitives. */
const hexDist = (a, b) => { const A = E.hex(a), B = E.hex(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
EF.Art = {
  /** the kits two teams wear: the away side changes when its shirt is too close to the home side's */
  pickKits(home, away) { return ['home', hexDist(home.kits.home.shirt, away.kits.home.shirt) < 120 || hexDist(home.kits.home.color2 || '#000', away.kits.home.shirt) < 60 ? 'away' : 'home']; },
  /** a player's rig colours and kit option from his team's kit */
  kitFor(team, kitName, p) {
    const k = p.pos === 'GK' ? team.kits.keeper : team.kits[kitName] || team.kits.home;
    const colors = { cloth: k.shirt, pants: k.shorts, belt: k.shorts, trim: k.socks, boot: p.boots || '#1a1a20', glove: k.glove || p.skin, skin: p.skin, hair: p.hairColor || '#3a2a1a' };
    return { colors, kit: { pattern: k.pattern || 'plain', color2: k.color2, number: p.num, numberColor: k.number || '#ffffff' } };
  },
  rigFor(team, kitName, p, o = {}) {
    const { colors, kit } = this.kitFor(team, kitName, p);
    const hat = p.band ? { style: 'band', color: team.kits.home.color2 || '#ffffff' } : p.hat || null;
    const r = new E.Humanoid(Object.assign({ weapon: null, build: p.build || 'heroic', size: (p.size || 1.1) * (o.scale || 1.12), hair: p.hair || 'short', hat, sleeves: p.pos === 'GK' ? 'long' : 'short', colors, kit, speedRef: 88 }, o.rig || {}));
    if (EF.Anim && EF.Anim.lib) Mocap.drive(r, EF.Anim.lib);
    return r;
  }
};
/* ---- crests: a shape, a field, a ring and up to two charges (section 8.2) ---- */
EF.drawCrest = (g, team, x, y, size) => {
  const c = team.crest || {}, s = size / 24, X = v => Math.round(x + v * s), Y = v => Math.round(y + v * s);
  const field = c.field || '#333', ring = c.ring || '#fff', ft = E.tones(field), rt = E.tones(ring);
  const shape = c.shape || 'shield';
  const shield = [[-11, -12], [11, -12], [11, 2], [0, 12], [-11, 2]];
  if (shape === 'shield') { px.poly(g, shield.map(([a, b]) => [X(a), Y(b)]), rt.sh); px.poly(g, shield.map(([a, b]) => [X(a * .82), Y(b * .82 - 1)]), ft.base); px.poly(g, [[X(-9), Y(-11)], [X(0), Y(-11)], [X(0), Y(9)], [X(-9), Y(1)]], ft.lt); }
  else { px.disc(g, X(0), Y(0), Math.max(2, 12 * s), rt.sh); px.disc(g, X(0), Y(0), Math.max(1.5, 10 * s), ft.base); if (shape === 'roundel') px.disc(g, X(0), Y(0), Math.max(1, 7.5 * s), ft.lt); }
  const ch = c.charges || [], one = ch.length === 1;
  ch.forEach((name, i) => { const ox = one ? 0 : i === 0 ? -3.2 : 3.2; EF.drawCharge(g, name, X(ox), Y(0), s * (one ? 1 : .8), ring, field); });
  if (size >= 40) px.line(g, X(-8), Y(-10), X(8), Y(-10), rt.hi);
};
EF.drawCharge = (g, name, x, y, s, col, bg) => {
  const t = E.tones(col), P2 = (a, b) => [Math.round(x + a * s), Math.round(y + b * s)], poly = (pts, c) => px.poly(g, pts.map(p => P2(p[0], p[1])), c), L = (a, b, c2, d, c) => { const p = P2(a, b), q = P2(c2, d); px.line(g, p[0], p[1], q[0], q[1], c, Math.max(1, Math.round(s))); };
  const disc = (a, b, r, c) => { const p = P2(a, b); px.disc(g, p[0], p[1], Math.max(.8, r * s), c); };
  switch (name) {
    case 'kipper': poly([[-7, 0], [-3, -3], [3, -3], [6, 0], [3, 3], [-3, 3]], t.base); poly([[6, 0], [9, -3], [9, 3]], t.sh); disc(-4, -1, .9, bg); L(-1, -2, -1, 2, t.sh); L(2, -2, 2, 2, t.sh); break;
    case 'anchor': L(0, -7, 0, 6, t.base); L(-4, -4, 4, -4, t.base); L(-6, 3, 0, 7, t.base); L(6, 3, 0, 7, t.base); disc(0, -8, 1.4, t.base); break;
    case 'boot': poly([[-5, -6], [0, -6], [0, 1], [7, 2], [7, 6], [-5, 6]], t.base); L(-5, 5, 7, 5, t.sh); disc(-3, 6, .9, t.hi); disc(3, 6, .9, t.hi); break;
    case 'sun': disc(0, -1, 4, t.base); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; L(Math.cos(a) * 5, -1 + Math.sin(a) * 5, Math.cos(a) * 7.5, -1 + Math.sin(a) * 7.5, t.lt); } break;
    case 'arrows': L(-6, 4, 6, 4, t.base); poly([[6, 2], [9, 4], [6, 6]], t.base); L(6, 8, -6, 8, t.lt); poly([[-6, 6], [-9, 8], [-6, 10]], t.lt); break;
    case 'cog': disc(0, 0, 5, t.base); disc(0, 0, 2, bg); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; disc(Math.cos(a) * 6, Math.sin(a) * 6, 1.4, t.base); } break;
    case 'hammer': L(-5, 6, 4, -3, t.lt); poly([[1, -7], [7, -1], [9, -3], [3, -9]], t.base); break;
    case 'padlock': poly([[-5, -1], [5, -1], [5, 7], [-5, 7]], t.base); L(-3, -1, -3, -5, t.lt); L(3, -1, 3, -5, t.lt); L(-3, -6, 3, -6, t.lt); disc(0, 3, 1.2, bg); break;
    case 'laurel': for (let k = 0; k < 5; k++) { disc(-7 + k * .6, 6 - k * 3, 1.2, t.lt); disc(7 - k * .6, 6 - k * 3, 1.2, t.lt); } break;
    case 'crown': poly([[-7, 4], [-7, -3], [-3.5, 1], [0, -5], [3.5, 1], [7, -3], [7, 4]], t.base); L(-7, 4, 7, 4, t.sh); disc(0, -5, 1, t.hi); break;
    case 'coins': for (let k = 0; k < 3; k++) { poly([[-5, 5 - k * 3], [5, 5 - k * 3], [5, 7 - k * 3], [-5, 7 - k * 3]], k % 2 ? t.lt : t.base); } break;
    default: disc(0, 0, 4, t.base);
  }
};
/* ---- the balls: 4 frames of their panels turning (section 8.2) ---- */
const ballFrames = (c) => [
  ['.ABA.', 'AAKAA', 'BKKKB', 'AAKAA', '.ABA.'], ['.AAB.', 'AKAAB', 'AKKAA', 'BAAKA', '.BAA.'],
  ['.AAA.', 'BAKAB', 'AKKKA', 'BAKAB', '.AAA.'], ['.BAA.', 'AAKBA', 'AKKAA', 'BAKAA', '.AAB.']
].map(rows => E.sprite(rows, c));
EF.BALLS = {
  classic: { name: 'CLASSIC', frames: ballFrames({ A: '#f6f6f0', B: '#d8dce4', K: '#26262e' }) },
  orange: { name: 'WINTER ORANGE', frames: ballFrames({ A: '#ff8a2a', B: '#e86a1a', K: '#5a2a10' }) },
  golden: { name: 'THE GOLDEN BALL', frames: ballFrames({ A: '#ffe070', B: '#e8b030', K: '#a86a10' }), glow: true },
  leather: { name: 'OLD LEATHER', frames: ballFrames({ A: '#a86a3a', B: '#8a5226', K: '#f0d8a8' }) }
};
EF.SPR = {
  cardY: E.sprite(['yyy', 'yYy', 'yyy', 'yyy'], { y: '#ffd83a', Y: '#fff0a0' }),
  cardR: E.sprite(['rrr', 'rRr', 'rrr', 'rrr'], { r: '#e8202a', R: '#ff7a7a' }),
  whistle: E.sprite(['.kk', 'kkk'], { k: '#c8ccd4' }),
  kipper: E.sprite(['..oooo.o', '.oOOOOoo', 'ookOOOoo', '.oOOOOoo', '..oooo.o'], { o: '#c87a2a', O: '#e8a050', k: '#1a1010' }),
  kipperBall: E.sprite(['.oooo.o', 'okOOOoo', 'oOOOOoo', '.oooo.o'], { o: '#d07a20', O: '#f0a040', k: '#1a1010' }),
  coin: [E.sprite(['.yyy.', 'yYYYy', 'yYyYy', 'yYYYy', '.yyy.'], { y: '#c89a30', Y: '#ffe070' }), E.sprite(['.y.', 'yYy', 'yYy', 'yYy', '.y.'], { y: '#c89a30', Y: '#ffe070' }), E.sprite(['y', 'Y', 'Y', 'Y', 'y'], { y: '#c89a30', Y: '#ffe070' })],
  pie: E.sprite(['.cccc.', 'cCCCCc', 'bbbbbb', '.bbbb.'], { c: '#d8a050', C: '#f0c878', b: '#a86a2a' }),
  flag: [E.sprite(['ffff', 'fFff', 'fff.', 'ff..'], { f: '#f08a24', F: '#ffb860' }), E.sprite(['.fff', 'ffFf', 'ffff', 'f...'], { f: '#f08a24', F: '#ffb860' }), E.sprite(['fff.', 'fFff', 'ffff', '.ff.'], { f: '#f08a24', F: '#ffb860' })],
  gull: E.sprite(['w.....w', 'ww...ww', '.wwkww.', '..www..', '...o...'], { w: '#f4f4f0', k: '#1a1a1a', o: '#f0a020' }),
  confetti: ['#ffd83a', '#ff5a7a', '#5ad0ff', '#7aff7a', '#ffffff', '#c87aff']
};
