// The tally after a site, one beat at a time (10-foot): the header, an x-ray Shot Chart card for each bagged animal
// (a see-through side view, skeleton, heart and lungs, a mark where every round went), then critters, penalties,
// bonuses, the site total and the stars. Party: a column per player. Confirm skips ahead (ignored for 0.6 s).
(() => {
const B = BB, E = B.E, px = E.px;

// render an x-ray side view of an animal like `a` with its hits, into a canvas w x h
B.xrayCard = (a, w, h) => {
  const T = new B.Target(w, h), ras = new B.Raster();
  const sp = B.get('species', a.species), size = a.rig.size;
  const rig = new B.Quadruped({ species: a.rig.species, sex: 'buck', size, antlers: a.rig.antler ? { kind: a.rig.antler.kind, points: a.points, seed: a.id * 7 + 3, spread: a.spread } : null, colors: a.rig.colors, seed: a.id });
  for (let k = 0; k < 4; k++) rig.update(.1, { x: 0, y: 0, z: 0, heading: 0, speed: 0, ground: () => 0 });
  const dist = 3.9 * size;
  const lens = new B.Lens({ x: .05 * size, y: -dist, z: .8 * size, yaw: Math.PI / 2, pitch: 0, fov: 30, W: w, H: h });
  const env = { sunV: [0, -.5, .8], fogC: B.hexPk('#0c1420'), fogNear: 1e5, fogFar: 2e5, fogMax: 0, rimC: 0, outlineC: B.hexPk('#6ac8ff') };
  T.frame.fill(B.hexPk('#0c1828')); T.depth.fill(1e9); T.ids.fill(0);
  for (let y = 0; y < h; y += 6) for (let x = 0; x < w; x++) T.frame[y * w + x] = B.hexPk('#10223a');
  for (let x = 0; x < w; x += 6) for (let y = 0; y < h; y++) T.frame[y * w + x] = B.hexPk('#10223a');
  ras.begin(T, lens, env);
  // the body, see-through
  ras.xray = 1; for (const p of rig.parts) ras.capsule(p.a[0], p.a[1], p.a[2], p.b[0], p.b[1], p.b[2], p.ra, p.rb, B.tones('#5a8ab8'), { id: 1, flat: true }); ras.xray = 0;
  T.depth.fill(1e9);
  // organs
  const inner = rig.inner;
  ras.capsule(...inner[1].a, ...inner[1].b, inner[1].ra, inner[1].rb, B.tones('#f090b0'), { flat: true });
  T.depth.fill(1e9);
  ras.sphere(...inner[0].a, inner[0].ra, B.tones('#e02030'), { flat: true });
  const cv = T.canvas(), g = cv.getContext ? E.ctx2d(cv) : null;
  if (!g) return { cv: null };
  // the skeleton: lines between the joints
  const P = q => { const r = lens.project(q[0], q[1], q[2]); return r ? [Math.round(r[0]), Math.round(r[1])] : [0, 0]; };
  const bone = (a1, b1) => { const A = P(a1), Bb = P(b1); px.line(g, A[0], A[1], Bb[0], Bb[1], '#e8f0ff'); };
  const J = rig.J;
  bone(J.pelvis, J.withers); bone(J.withers, J.neckBase); bone(J.neckBase, J.headBase); bone(J.headBase, J.muzzle); bone(J.pelvis, J.tailBase);
  for (const l of rig.legs) { bone(l.top, l.mid); bone(l.mid, l.fet); bone(l.fet, l.hoof); }
  for (const pp of rig.antlerParts) bone(pp.a, pp.b);
  // the hits: the same local points, in this pose
  const o = rig.origin; const marks = [];
  for (const hh of a.hits) {
    const q = [o[0] + hh.at[0], o[1] + hh.at[1], o[2] + hh.at[2]], S = P(q), c = B.SEATS[hh.p] || '#ffffff';
    px.line(g, S[0] - 3, S[1] - 3, S[0] + 3, S[1] + 3, '#000'); px.line(g, S[0] - 3, S[1] + 3, S[0] + 3, S[1] - 3, '#000');
    px.line(g, S[0] - 2, S[1] - 2, S[0] + 2, S[1] + 2, c); px.line(g, S[0] - 2, S[1] + 2, S[0] + 2, S[1] - 2, c);
    marks.push([S[0], S[1], hh.zone.toUpperCase(), c]);
  }
  marks.forEach((m, i) => { const ly = 6 + i * 9; px.line(g, m[0], m[1], w - 46, ly + 3, '#8aa0c0'); B.text(g, m[2], w - 44, ly, m[3]); });
  return { cv };
};

class Tally {
  constructor(play, o = {}) {
    this.play = play; this.site = play.site; this.o = o; this.t = 0; this.page = 0; this.pageT = 0;
    const site = this.site, players = play.players.filter(p => !p.ghost);
    // finish the site's books: bonuses and stars
    for (const p of players) {
      if (site.def.bonus || site.def.range) continue;
      p.site.bonuses = B.siteBonuses(p, site);
      for (const [label, pts] of p.site.bonuses) play.addScore(p, pts, null, label);
      p.site.stars = B.stars(p, site);
    }
    B.clearHud();
    this.pages = [{ kind: 'head' }];
    const kills = [];
    for (const p of players) for (const k of p.site.kills) if (k.legal && !kills.some(x => x.k.a === k.a)) kills.push({ p, k });
    for (const x of kills) this.pages.push({ kind: 'card', p: x.p, k: x.k });
    this.pages.push({ kind: 'sum' });
    this.cards = new Map();
  }
  get done() { return this.page >= this.pages.length; }
  update(dt, input) {
    this.t += dt; this.pageT += dt;
    const auto = this.o.auto ? (this.pages[this.page] && this.pages[this.page].kind === 'sum' ? 3.5 : 2.4) : 12;
    if ((this.pageT > .6 && input && (input.pressed('confirm') || input.pressed('fire') || (input.clicked && input.clicked()))) || this.pageT > auto) { this.page++; this.pageT = 0; B.sfx('tick'); }
  }
  draw(g, W, H) {
    const pg = this.pages[Math.min(this.page, this.pages.length - 1)], site = this.site, players = this.play.players.filter(p => !p.ghost);
    px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a'));
    const cw = Math.min(W - 40, 380), ch = Math.min(H - 40, 214), x0 = Math.round((W - cw) / 2), y0 = Math.round((H - ch) / 2);
    B.panel(g, x0, y0, cw, ch);
    const head = site.endReason === 'clear' ? 'SITE CLEAR!' : site.endReason === 'time' ? 'TIME!' : site.endReason === 'benched' ? 'BENCHED!' : site.def.trophy ? (site.herd.list.some(a => a.trophy && a.dead) ? 'TROPHY BAGGED!' : site.flattened ? 'BIG MO SAYS NO!' : 'THE ONE THAT GOT AWAY...') : 'SITE OVER';
    B.title(g, head, W / 2, y0 + 8, 2);
    B.text(g, site.def.name.toUpperCase(), W / 2, y0 + 30, '#c8b898', { align: 'center' });
    if (pg.kind === 'head') {
      const bagged = site.bagged().length, legal = site.herd.list.filter(a => a.cat === 'animal' && a.legal).length;
      B.text(g, bagged + ' OF ' + legal + (site.def.trophy ? ' TROPHY' : ' BUCKS') + ' BAGGED', W / 2, y0 + 60, '#ffffff', { align: 'center', scale: 2 });
      const esc = site.herd.list.filter(a => a.cat === 'animal' && a.legal && a.escaped).length, lost = site.herd.list.filter(a => a.lost).length;
      if (esc) B.text(g, esc + ' GOT AWAY', W / 2, y0 + 82, '#ffb070', { align: 'center' });
      if (lost) B.text(g, lost + ' WOUNDED AND LOST', W / 2, y0 + 92, '#ff7060', { align: 'center' });
      if (site.def.trophy) { const T = B.get('trophy', site.def.trophy); B.text(g, T.name + ' · ' + T.label, W / 2, y0 + 110, '#f0c030', { align: 'center' }); }
    } else if (pg.kind === 'card') {
      const k = pg.k, a = k.a;
      let c = this.cards.get(a); if (!c) { c = B.xrayCard(a, 220, 120); this.cards.set(a, c); }
      if (c.cv) g.drawImage(c.cv, x0 + 10, y0 + 44);
      const sp = B.get('species', a.species), lx = x0 + 240;
      B.text(g, (a.trophy ? B.get('trophy', a.trophy).name : sp.label(a.points, a.spread) + ' ' + sp.targets[0].toUpperCase()), lx, y0 + 46, a.trophy ? '#f0c030' : '#ffffff');
      B.text(g, Math.round(k.dist) + ' M' + (k.running ? '  RUNNING' : ''), lx, y0 + 60, '#c8b898');
      B.text(g, B.ZONE[k.zone].call.replace('!', ''), lx, y0 + 72, k.zone === 'heart' ? '#ff6050' : '#ffd040');
      const tick = Math.min(k.pts, Math.round(k.pts * Math.min(1, this.pageT / .8)));
      B.text(g, '+' + B.fmt(tick), lx, y0 + 88, pg.p.color, { scale: 2 });
      if (k.extra && k.extra.length) B.text(g, k.extra.join(' '), lx, y0 + 108, '#80ff80');
      if (k.shared) B.text(g, 'SHARED', lx, y0 + 118, '#ffffff');
      B.text(g, 'BAGGED BY ' + pg.p.name, lx, y0 + 150, pg.p.color);
    } else {
      // the summary: a column per player
      const n = players.length, colW = Math.floor((cw - 20) / n);
      players.forEach((p, i) => {
        const x = x0 + 10 + i * colW, s = p.site; let y = y0 + 46;
        B.text(g, p.name, x + colW / 2, y, p.color, { align: 'center' }); y += 12;
        const row = (l, v, c = '#e8dcc8') => { B.text(g, l, x + 4, y, c); B.text(g, v, x + colW - 6, y, c, { align: 'right' }); y += 10; };
        row('KILLS', String(s.kills.filter(k => k.legal).length) + (s.kills.length ? ' · ' + B.fmt(s.kills.reduce((n2, k) => n2 + k.pts, 0)) : ''));
        if (s.critters.length) row('CRITTERS', '+' + s.critters.reduce((n2, c) => n2 + c.pts, 0), '#a0e080');
        for (const pn of s.penalties) row(pn[0], pn[1] ? String(pn[1]) : 'BENCHED', '#ff7060');
        for (const b of s.bonuses || []) row(b[0], '+' + b[1], '#ffd040');
        row('SHOTS', s.hits + '/' + s.shots);
        y += 4; B.text(g, B.fmt(s.score), x + colW / 2, y, '#ffffff', { align: 'center', scale: 2 }); y += 20;
        if (!site.def.bonus && !site.def.range) for (let k = 0; k < 3; k++) { const on = k < (s.stars || 0) && this.pageT > .3 + k * .25; B.drawAntlerIcon(g, x + colW / 2 - 18 + k * 13, y, on ? { fill: '#f0c030' } : {}); }
      });
      if (this.o.standings) this.o.standings(g, x0, y0 + ch - 26, cw);
    }
    // the prompt (by the device used last)
    B.drawPrompts(g, [['confirm', this.page >= this.pages.length - 1 ? 'CONTINUE' : 'NEXT']], this.o.input, W / 2, y0 + ch - 14);
    B.text(g, (this.page + 1) + '/' + this.pages.length, x0 + cw - 8, y0 + ch - 12, '#8a7a6a', { align: 'right' });
  }
}
B.Tally = Tally;
})();
