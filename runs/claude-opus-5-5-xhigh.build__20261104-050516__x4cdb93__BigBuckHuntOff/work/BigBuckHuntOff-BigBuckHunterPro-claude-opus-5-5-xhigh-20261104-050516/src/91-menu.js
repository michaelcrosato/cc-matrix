// 91-menu: the main menu and its pages, one scene with a page stack: the Hunt-Off (and Continue), a single hunt, the
// party hunt's join page, the bonus games, the Practice Range, the Lodge, Settings, About & Credits.
const HUNT_ORDER = ['hollow', 'bugle', 'muskeg'];
const DIFFS = [['easy', 'EASY'], ['normal', 'NORMAL'], ['pro', 'PRO']];
function huntIcon(id) { return (g, x, y, s, on) => { const h = reg('hunt', id), sk = h.sky.sky; for (let i = 0; i < 4; i++) px.rect(g, x, y - s / 2 + i * s / 8, s, s / 8 + 1, sk[Math.min(sk.length - 1, i)]); px.rect(g, x, y, s, s / 2, h.palette.types[0].a); px.poly(g, [[x, y + 2], [x + s * .3, y - s * .2], [x + s * .6, y + 1], [x + s, y - s * .25], [x + s, y + 2]], h.sky.layers[1].color); drawRackIcon(g, x + s / 2, y + s * .15, 'bagged', '#e8dcc0'); px.rect(g, x - 1, y - s / 2 - 1, s + 2, 1, '#1a0c08'); px.rect(g, x - 1, y + s / 2, s + 2, 1, '#1a0c08'); }; }
const glyphIcon = kind => (g, x, y, s, on) => {
  const c = on ? '#ffd040' : '#e8c890';
  if (kind === 'rifle') { px.line(g, x, y + 4, x + s, y - 3, '#1a0c08', 4); px.line(g, x, y + 4, x + s, y - 3, '#8a5a30', 2); px.line(g, x + s * .5, y, x + s, y - 3, '#9aa0a8', 2); }
  else if (kind === 'party') { for (let i = 0; i < 4; i++) drawReticleShape(g, x + 4 + i * (s / 4), y, SHAPES[i], SEAT_COLORS[i], 3); }
  else if (kind === 'bonus') { px.disc(g, x + s / 2, y, s * .32, '#1a0c08'); px.disc(g, x + s / 2, y, s * .28, '#e8743a'); px.disc(g, x + s / 2 - 2, y - 2, s * .1, '#ffb070'); }
  else if (kind === 'range') { for (let i = 3; i > 0; i--) px.disc(g, x + s / 2, y, i * s * .12, i % 2 ? '#f4ecd8' : '#c83a2a'); }
  else if (kind === 'lodge') { px.poly(g, [[x + 2, y], [x + s / 2, y - s * .4], [x + s - 2, y]], '#7a3a22'); px.rect(g, x + 4, y, s - 8, s * .35, '#8a5a34'); px.rect(g, x + s / 2 - 2, y + 2, 4, s * .3, '#2a1a10'); }
  else if (kind === 'gear') { px.disc(g, x + s / 2, y, s * .3, c); px.disc(g, x + s / 2, y, s * .12, '#1a0c08'); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; px.rect(g, x + s / 2 + Math.cos(a) * s * .32 - 1, y + Math.sin(a) * s * .32 - 1, 3, 3, c); } }
  else if (kind === 'about') { px.rect(g, x + 4, y - s * .35, s - 8, s * .7, '#e8dcc0'); for (let i = 0; i < 4; i++) px.rect(g, x + 7, y - s * .25 + i * 4, s - 14, 1, '#5a4a3a'); }
  else if (kind === 'trophy') { drawRackIcon(g, x + s / 2, y, 'bagged', '#ffd040'); }
};
const menuScene = {
  camera: { zoom: false }, touch: [],
  enter(o = {}) { G.scene = 'menu'; Idle.reset(); showcase(); this.stack = []; this.open(o.page || 'main'); if (G.sfx) G.sfx.music('hoedown', { fade: .6 }); game.allowJoin(false); },
  exit() { game.allowJoin(false); },
  open(page, keep) { const L = this.page(page); if (!L) return; L.id = page; if (!keep) this.stack.push(L); else this.stack[this.stack.length - 1] = L; },
  back() { if (this.stack.length > 1) { const top = this.stack.pop(); if (top.id === 'party') game.allowJoin(false); } else G.game.go('title', {}, { fade: .3 }); },
  get top() { return this.stack[this.stack.length - 1]; },
  page(id) {
    const S = G.game.settings, best = k => Records.d.best[k] ? 'BEST ' + fmt(Records.d.best[k]) : '';
    const di = Math.max(0, DIFFS.findIndex(d => d[0] === S.difficulty));
    const diffItem = () => ({ label: 'DIFFICULTY', choices: DIFFS.map(d => d[1]), ci: di, onTurn: (v, i) => S.set('difficulty', DIFFS[i][0]) });
    if (id === 'main') {
      const save = G.game.saves.get('auto'), cont = save && !save.damaged && !save.newer && save.data;
      const items = [
        cont ? { label: 'CONTINUE HUNT-OFF', sub: 'Next: ' + save.place, icon: glyphIcon('trophy'), act: () => { G.campaign = save.data; startHunt({ mode: 'campaign', hunt: HUNT_ORDER[save.data.next] || 'hollow' }); } } : { label: 'HUNT-OFF', sub: 'Three hunts. The trophy wall.', icon: glyphIcon('trophy'), act: () => { G.campaign = { next: 0, scores: {} }; startHunt({ mode: 'campaign', hunt: 'hollow', first: true }); } },
        { label: 'SINGLE HUNT', sub: 'One hunt, start to trophy', icon: glyphIcon('rifle'), act: () => this.open('single') },
        { label: 'PARTY HUNT', sub: '2 to 4 on one screen', icon: glyphIcon('party'), act: () => this.open('party') },
        { label: 'BONUS GAMES', sub: 'Crows, clays, snowmen', icon: glyphIcon('bonus'), act: () => this.open('bonus') },
        { label: 'PRACTICE RANGE', sub: "Uncle Dub's lessons", icon: glyphIcon('range'), act: () => startHunt({ mode: 'range', hunt: 'range' }) },
        { label: 'THE LODGE', sub: 'Trophies and records', icon: glyphIcon('lodge'), act: () => G.game.go('lodge', {}) },
        { label: 'SETTINGS', sub: 'Sound, controls, assists', icon: glyphIcon('gear'), act: () => G.game.menu('settings') },
        { label: 'ABOUT & CREDITS', sub: 'Who made this, and how', icon: glyphIcon('about'), act: () => G.game.go('about', {}) }
      ];
      if (cont) items.splice(1, 0, { label: 'NEW HUNT-OFF', sub: 'Start over at Hollow Creek', icon: glyphIcon('trophy'), act: () => { G.game.saves.erase('auto'); G.campaign = { next: 0, scores: {} }; startHunt({ mode: 'campaign', hunt: 'hollow', first: true }); } });
      return new UIList({ items, cols: 2, w: 236, h: 30, gap: 6, y: 'center', title: '', top: true });
    }
    if (id === 'single') return new UIList({ title: 'SINGLE HUNT', sub: 'Pick your ground', w: 330, h: 34, y: 76, items: HUNT_ORDER.map(h => { const H = reg('hunt', h); return { label: H.name.toUpperCase(), sub: H.when + ' · ' + reg('species', H.species).label + ' · Trophy: ' + reg('trophy', H.trophy).name, right: best(h), icon: huntIcon(h), act: () => startHunt({ mode: 'single', hunt: h }) }; }).concat([diffItem()]) });
    if (id === 'bonus') return new UIList({ title: 'BONUS GAMES', sub: '30 seconds. A bigger tube. Go for PERFECT.', w: 330, h: 34, y: 80, items: HUNT_ORDER.map(h => { const B = reg('bonus', reg('hunt', h).bonus); return { label: B.name.toUpperCase(), sub: B.blurb, right: best(B.id), icon: glyphIcon('bonus'), act: () => startHunt({ mode: 'bonusOnly', hunt: h }) }; }) });
    if (id === 'party') { game.allowJoin({ max: 4, onJoin: (input, n) => { G.sfx && G.sfx.play('confirm'); } }); return new UIList({ title: 'PARTY HUNT', sub: 'Press OPTIONS or START on a controller to join', w: 300, h: 26, y: 150, party: true, items: HUNT_ORDER.map(h => ({ label: reg('hunt', h).name.toUpperCase(), sub: '', icon: huntIcon(h), act: () => startParty({ mode: 'party', hunt: h }) })).concat([{ label: 'QUICK DRAW', sub: 'Site 1 of each hunt, then Saucer Season', icon: glyphIcon('bonus'), act: () => startParty({ mode: 'quick', hunt: 'hollow' }) }]) }); }
    return null;
  },
  update(dt) {
    showcase().update(dt); if (G.sfx) G.sfx.update(dt);
    Idle.update(dt);
    if (Idle.t > 10 && this.stack.length === 1 && !G.ui.screen) { G.game.go('attract', {}, { fade: .5 }); return; }
    if (G.ui.screen) return;
    const L = this.top; if (!L) return;
    const r = L.update(dt);
    if (r === 'back') this.back();
  },
  draw(r) {
    showcase().draw(r);
    r.overlay(g => {
      const W = r.W, Ht = r.H, L = this.top; dim(g, W, Ht, .5);
      if (!L) return;
      if (L.id === 'main') drawLogo(g, W, 28, .55);
      if (L.party) drawJoin(g, W, Ht);
      L.draw(g, W, Ht);
      promptBar(g, W, Ht, [['confirm', 'SELECT'], ['cancel', 'BACK']]);
    });
  }
};
function drawJoin(g, W, Ht) {
  const P = G.game.players, y = 64;
  for (let i = 0; i < 4; i++) {
    const x = W / 2 - 190 + i * 96, on = !!P[i];
    E.ui.box(g, x, y, 88, 70, { bg: on ? [E.tones(SEAT_COLORS[i]).sh, '#1a0e06'] : ['#2a2018', '#140c08'], border: on ? SEAT_COLORS[i] : '#5a4a3a', alpha: .9 });
    drawReticleShape(g, x + 44, y + 22, SHAPES[i], on ? SEAT_COLORS[i] : '#5a4a3a', 8);
    E.font.text(g, 'P' + (i + 1), x + 44, y + 38, on ? '#ffffff' : '#8a7a68', { align: 'center', scale: 2, outline: false });
    E.font.text(g, on ? (i === 0 ? (P[0].lastDevice === 'gamepad' ? 'CONTROLLER' : 'MOUSE + KEYS') : 'CONTROLLER') : 'PRESS START', x + 44, y + 56, on ? '#e8dcc8' : '#8a7a68', { align: 'center', outline: false });
  }
}
function startParty(o) {
  const ins = G.game.players.slice(0, 4), players = ins.map((I, i) => new Player(i + 1, I));
  game.allowJoin(false);
  startHunt(Object.assign({ players }, o));
}
