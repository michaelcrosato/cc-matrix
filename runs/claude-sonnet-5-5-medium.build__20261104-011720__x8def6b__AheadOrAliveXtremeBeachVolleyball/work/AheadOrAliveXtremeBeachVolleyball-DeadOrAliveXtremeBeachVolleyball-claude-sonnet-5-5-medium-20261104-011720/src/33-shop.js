/* 33-shop: shops, wardrobe, journal and postcard album. Full-screen canvas UI over a live preview. */
const previewStage = (r, rig, x, y, t) => {
  r.shadow(x, y, 9, .4); r.actor(x, y, 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view));
};
G.scenes.shop = G.wrapScene({
  view: 'threequarter', input: G.INPUT_MENU, res: 'ps1', expand: true, name: 'shop', pausable: true,
  enter(d) {
    this.d = d; this.t = 0; this.kind = d.kind; G.music('promenade'); G.game.focus(-40, 0, 20); this.sp = null; this.build();
    this.rig = G.rigOf('you', 1.8); this.msg = '';
  },
  build() {
    const s = G.state, k = this.kind; let items;
    if (k === 'suit') items = G.SUITS.map(x => ({ label: x.name, it: x, value: () => s.owned.suits.includes(x.id) ? 'owned' : G.fmtMoney(x.price) }));
    else if (k === 'hat') items = G.HATS.map(x => ({ label: x.name, it: x, value: () => s.owned.hats.includes(x.id) ? 'owned' : G.fmtMoney(x.price) }));
    else items = G.GIFTS.map(x => ({ label: x.name, it: x, value: () => G.fmtMoney(x.price) + (s.bag[x.id] ? '  (x' + s.bag[x.id] + ')' : '') }));
    items.push({ label: 'Leave', onPick: () => G.game.go('location', { loc: this.d.back }) });
    items.forEach(i => { if (i.it) i.onPick = () => this.buy(i.it); });
    this.menu = new G.Menu(items, { x: 6, y: 34, w: 168, gap: 12, onCancel: () => G.game.go('location', { loc: this.d.back }) });
    this.menu.rows = 14;
  },
  buy(it) {
    const s = G.state, k = this.kind;
    if (k === 'suit') { if (s.owned.suits.includes(it.id)) { s.suit = it.id; this.msg = 'Wearing the ' + it.name + '.'; this.rig = G.rigOf('you', 1.8); return; } if (G.buySuit(it.id)) { s.suit = it.id; this.msg = 'Bought the ' + it.name + '! You put it on.'; G.toast('New swimsuit: ' + it.name, '#9bffb0'); this.rig = G.rigOf('you', 1.8); } else { G.sfx('cancel'); this.msg = 'Not enough money.'; } }
    else if (k === 'hat') { if (s.owned.hats.includes(it.id)) { s.hat = it.id; this.msg = 'Wearing: ' + it.name; this.rig = G.rigOf('you', 1.8); return; } if (G.buyHat(it.id)) { s.hat = it.id; this.msg = 'Bought: ' + it.name; this.rig = G.rigOf('you', 1.8); } else { G.sfx('cancel'); this.msg = 'Not enough money.'; } }
    else { if (G.buyGift(it.id)) this.msg = 'Added to your bag: ' + it.name; else { G.sfx('cancel'); this.msg = 'Not enough money.'; } }
  },
  update(dt) { this.t += dt; const m = this.menu; m.update(dt); const it = m.items[m.i].it; if (it && this.kind !== 'gift') { const sid = this.kind === 'suit' ? it.id : G.state.suit, hid = this.kind === 'hat' ? it.id : G.state.hat; this.prev = G.rig('you', sid, hid, 1.8); } else this.prev = G.rigOf('you', 1.8); this.prev.update(dt, { x: 50, y: 36, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 + Math.sin(this.t * .8) * .6 }); },
  draw(r) {
    const W = r.W, H = r.H; G.beach(r, this.t, { noPalms: true, sky: ['#ffd9a0', '#ffe9b8', '#fff3d0', '#fff8e0', '#ffffff'] });
    const title = this.kind === 'suit' ? 'SWIMSUIT BOUTIQUE' : this.kind === 'hat' ? 'HAT STAND' : 'GIFT KIOSK';
    r.overlay(g => { px.rect(g, 0, 0, W, 20, '#0b2430cc'); E.font.title(g, title, 8, 5, { scale: 1, colors: ['#fff6c8', '#ffd24a'], depth: 1 }); G.text(g, G.fmtMoney(G.state.money), W - 6, 7, '#9bffb0', { align: 'right' }); });
    const m = this.menu; const rows = 14, first = clamp(m.i - 6, 0, Math.max(0, m.items.length - rows));
    // draw only the visible slice of the menu by temporarily slicing
    const all = m.items, idx = m.i; m.items = all.slice(first, first + rows); m.i = idx - first; m.draw(r); m.items = all; m.i = idx;
    // we must keep rects aligned to the slice for hover/click; map them back
    this.menu.rectsSlice = true;
    if (this.prev) { r.shadow(50, 36, 10, .4); r.actor(50, 36, 0, (g, ox, oy) => this.prev.draw(g, ox, oy, r.view)); }
    const it = all[idx].it;
    r.overlay(g => {
      const x = Math.round(W - 150), y = 26, w = 144; G.panel(g, x, y, w, 62);
      if (it) {
        G.text(g, it.name, x + 6, y + 5, '#ffd24a');
        if (this.kind === 'suit') { px.rect(g, x + 6, y + 18, 24, 8, it.top); px.rect(g, x + 32, y + 18, 24, 8, it.bottom); G.text(g, G.state.owned.suits.includes(it.id) ? 'In your wardrobe' : 'Price ' + G.fmtMoney(it.price), x + 6, y + 30, '#bfe9ee'); }
        else if (this.kind === 'hat') G.text(g, G.state.owned.hats.includes(it.id) ? 'In your wardrobe' : 'Price ' + G.fmtMoney(it.price), x + 6, y + 20, '#bfe9ee');
        else { G.text(g, G.LABELS[it.cat] + ' gift', x + 6, y + 18, '#ffb0c0'); G.text(g, 'Base friendship +' + it.pts, x + 6, y + 30, '#bfe9ee'); const k = G.state.known; const seen = k ? Object.keys(k).filter(id => k[id][it.cat]).map(id => G.CAST[id].name + ': ' + k[id][it.cat]) : []; G.wrap(seen.length ? seen.join(', ') : 'Try it on someone to learn who likes it.', w - 12).slice(0, 3).forEach((ln, i) => G.text(g, ln, x + 6, y + 42 + i * 9, '#fff')); }
      }
      if (this.msg) G.text(g, this.msg, Math.round(W / 2), H - 30, '#fff6c8', { align: 'center' });
    });
    G.drawPrompts(r, [['confirm', this.kind === 'gift' ? 'Buy' : 'Buy / wear'], ['cancel', 'Leave']]);
  }
});
// the shop menu draws a slice: remap clicks by overriding pick/hover to the real index
(() => {
  const M = G.Menu.prototype, upd = M.update;
  M.update = function (dt) {
    if (!this.rows) return upd.call(this, dt);
    // windowed menus (shop, wardrobe): swap in the visible slice while handling input
    const all = this.items, idx = this.i, first = clamp(idx - 6, 0, Math.max(0, all.length - this.rows));
    this.items = all.slice(first, first + this.rows); this.i = idx - first; const r = upd.call(this, dt); const ni = this.i + first; this.items = all; this.i = clamp(ni, 0, all.length - 1); return r;
  };
})();

G.scenes.wardrobe = G.wrapScene({
  view: 'threequarter', input: G.INPUT_MENU, res: 'ps1', expand: true, name: 'wardrobe', pausable: true,
  enter(d) { this.d = d; this.t = 0; G.music('villa'); G.game.focus(-40, 0, 20); this.build(); },
  build() {
    const s = G.state, items = [];
    G.SUITS.filter(x => s.owned.suits.includes(x.id)).forEach(x => items.push({ label: x.name, value: () => s.suit === x.id ? 'wearing' : '', onPick: () => { s.suit = x.id; this.refresh(); } }));
    G.HATS.filter(x => s.owned.hats.includes(x.id)).forEach(x => items.push({ label: 'Hat: ' + x.name, value: () => s.hat === x.id ? 'wearing' : '', onPick: () => { s.hat = x.id; this.refresh(); } }));
    items.push({ label: 'Done', onPick: () => G.game.go('location', { loc: this.d.back }) });
    this.menu = new G.Menu(items, { x: 6, y: 34, w: 168, gap: 12, onCancel: () => G.game.go('location', { loc: this.d.back }) }); this.menu.rows = 14;
  },
  refresh() { G.sfx('confirm'); },
  update(dt) { this.t += dt; this.menu.update(dt); const s = G.state, all = this.menu.items, it = all[this.menu.i]; let sid = s.suit, hid = s.hat; const label = it && it.label || '';
    const su = G.SUITS.find(x => x.name === label), ha = G.HATS.find(x => 'Hat: ' + x.name === label); if (su) sid = su.id; if (ha) hid = ha.id;
    this.prev = G.rig('you', sid, hid, 1.8); this.prev.update(dt, { x: 50, y: 36, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 + Math.sin(this.t * .8) * .8 }); },
  draw(r) {
    const W = r.W; G.beach(r, this.t, { noPalms: true, sky: ['#cfe8f4', '#dff0f8', '#eef8fc', '#f6fcff', '#ffffff'] });
    r.overlay(g => { px.rect(g, 0, 0, W, 20, '#0b2430cc'); E.font.title(g, 'WARDROBE', 8, 5, { scale: 1, colors: ['#fff6c8', '#ffd24a'], depth: 1 }); });
    const m = this.menu, all = m.items, idx = m.i, first = clamp(idx - 6, 0, Math.max(0, all.length - 14)); m.items = all.slice(first, first + 14); m.i = idx - first; m.draw(r); m.items = all; m.i = idx;
    r.shadow(50, 36, 10, .4); r.actor(50, 36, 0, (g, ox, oy) => this.prev.draw(g, ox, oy, r.view));
    G.drawPrompts(r, [['confirm', 'Wear'], ['cancel', 'Back']]);
  }
});

G.scenes.journal = G.wrapScene({
  view: 'threequarter', input: G.INPUT_MENU, res: 'ps1', expand: true, name: 'journal', pausable: true,
  enter(d) { this.d = d; this.t = 0; this.tab = 0; this.sel = 0; G.music('villa'); G.game.focus(-40, 0, 20); this.ids = ['mika', 'hana', 'gwen', 'ruby', 'tomo', 'ines', 'sonny', 'pepper']; },
  update(dt) {
    this.t += dt; const I = G.game.input;
    if (I.pressed('cancel') || I.pressed('pause')) { G.game.go(this.d.back || 'map', this.d.back && this.d.back !== 'map' ? { loc: this.d.back } : undefined); return; }
    if (I.pressed('left') && this.tab > 0) { this.tab--; G.sfx('select'); } if (I.pressed('right') && this.tab < 2) { this.tab++; G.sfx('select'); }
    if (I.pressed('tab') || I.pressed('tabNext')) { this.tab = (this.tab + 1) % 3; G.sfx('select'); }
    if (this.tab === 0) { if (I.pressed('up')) { this.sel = (this.sel + 7) % 8; G.sfx('select'); } if (I.pressed('down')) { this.sel = (this.sel + 1) % 8; G.sfx('select'); } }
    const c = I.clicked(); if (c) { if (c[1] < 24) { const w = (G.game.W - 62) / 3; this.tab = clamp(Math.floor(c[0] / w), 0, 2); } else if (this.tab === 0 && c[0] < 140) this.sel = clamp(Math.floor((c[1] - 30) / 20), 0, 7); }
    if (I.pressed('confirm') && this.tab === 0) this.sel = this.sel;
  },
  draw(r) {
    const W = r.W, H = r.H, s = G.state; G.beach(r, this.t, { noPalms: true, sky: ['#2a3a5a', '#3a4a6a', '#4a5a7a', '#5a6a8a', '#6a7a9a'] });
    r.overlay(g => {
      px.rect(g, 0, 0, W, H, '#0b2430dd'); ['FRIENDS', 'STORY', 'STATS'].forEach((n, i) => { const w = Math.round((W - 62) / 3); E.ui.box(g, i * w + 2, 2, w - 4, 18, this.tab === i ? { bg: ['#ff9a3c', '#ff4f6a'], border: '#fff6c8' } : { bg: ['#1b4a5a', '#0b2430'], border: '#2a6a7a' }); G.text(g, n, i * w + w / 2, 8, '#fff', { align: 'center' }); });
      if (this.tab === 0) {
        this.ids.forEach((id, i) => { const y = 28 + i * 20, sel = i === this.sel, c = G.CAST[id]; E.ui.box(g, 6, y, 134, 18, sel ? { bg: ['#ff9a3c', '#ff4f6a'], border: '#fff6c8' } : { bg: ['#1b4a5a', '#0b2430'], border: '#2a6a7a', alpha: .9 }); px.disc(g, 16, y + 9, 5, c.cloth); G.text(g, c.name, 26, y + 5, '#fff'); G.text(g, '♥'.repeat(G.hearts(id)), 134, y + 5, '#ff6a8a', { align: 'right' }); });
        const id = this.ids[this.sel], c = G.CAST[id], x = 150, w = W - 156; G.panel(g, x, 28, w, 150);
        G.text(g, c.full, x + 6, 33, '#ffd24a'); G.text(g, c.style + ' · ' + c.tag, x + 6, 44, '#bfe9ee'); G.wrap(c.bio, w - 12).forEach((ln, i) => G.text(g, ln, x + 6, 58 + i * 9, '#fff'));
        G.text(g, 'Friendship ' + G.affinity(id) + '/100', x + 6, 100, '#fff6c8'); px.rect(g, x + 6, 110, w - 12, 5, '#06141c'); px.rect(g, x + 6, 110, Math.round((w - 12) * G.affinity(id) / 100), 5, '#ff6a8a');
        G.text(g, 'Mood today: ' + G.MOOD_TXT[G.moodOf(id, s.day)], x + 6, 122, '#bfe9ee');
        const k = (s.known && s.known[id]) || {}; const ks = Object.keys(k).map(cat => G.LABELS[cat] + ' (' + k[cat] + ')'); G.wrap('Tastes found: ' + (ks.length ? ks.join(', ') : 'none yet. Try gifts.'), w - 12).forEach((ln, i) => G.text(g, ln, x + 6, 136 + i * 9, '#ffb0c0'));
      } else if (this.tab === 1) {
        const rows = [['1 Arrival', s.flags['done:1:0']], ['1 Welcome match', s.results.welcome], ['2 Qualifier', s.results.qualifier], ['3 Semifinal', s.results.semifinal], ['4 The Reveal', s.flags.reveal], ['5 Fortuna Cup', s.results.final], ['5 Farewell party', s.ending]];
        rows.forEach((rw, i) => { G.text(g, rw[0], 20, 34 + i * 16, '#fff'); G.text(g, rw[1] ? (typeof rw[1] === 'string' ? rw[1] : 'done') : '...', W - 20, 34 + i * 16, rw[1] === 'win' ? '#9bffb0' : rw[1] === 'loss' ? '#ffb0a0' : rw[1] ? '#fff6c8' : '#6a8a94', { align: 'right' }); });
        G.text(g, 'Partner: ' + (s.partner ? G.CAST[s.partner].full : 'none yet'), 20, 156, '#ffd0dc');
      } else {
        const rows = [['Played', s.stats.played], ['Won / Lost', s.stats.wins + ' / ' + s.stats.losses], ['Spikes', s.stats.spikes], ['Aces', s.stats.aces], ['Blocks', s.stats.blocks], ['Perfect touches', s.stats.perfects], ['Money earned', G.fmtMoney(s.stats.earned)], ['Money spent', G.fmtMoney(s.stats.spent)], ['Pool Hop best', s.stats.poolBest], ['Postcards', s.album.length]];
        rows.forEach((rw, i) => { G.text(g, rw[0], 30, 30 + i * 14, '#bfe9ee'); G.text(g, '' + rw[1], W - 30, 30 + i * 14, '#fff6c8', { align: 'right' }); });
      }
    });
    G.drawPrompts(r, [['cancel', 'Back'], ['tab', 'Next tab']]);
  }
});

G.scenes.album = G.wrapScene({
  view: 'threequarter', input: G.INPUT_MENU, res: 'ps1', expand: true, name: 'album', pausable: true,
  enter(d) { this.d = d || {}; this.t = 0; this.i = 0; G.music('villa'); G.game.focus(0, 0, 14); this.imgs = {}; },
  update(dt) {
    this.t += dt; const I = G.game.input, n = G.state ? G.state.album.length : 0;
    if (I.pressed('cancel')) { if (this.d.back === 'title') G.game.go('menu'); else G.game.go(this.d.back || 'map', this.d.back && this.d.back !== 'map' && this.d.back !== 'menu' ? { loc: this.d.back } : undefined); return; }
    if (n) { if (I.pressed('left')) { this.i = (this.i + n - 1) % n; G.sfx('select'); } if (I.pressed('right')) { this.i = (this.i + 1) % n; G.sfx('select'); } }
    if (I.pressed('confirm') && n && G.state.album[this.i]) { G.state.titleCard = this.i; G.toast('Set as title postcard', '#9bffb0'); G.sfx('confirm'); }
  },
  draw(r) {
    const W = r.W, H = r.H, s = G.state; G.beach(r, this.t, { noPalms: true, sky: ['#2a3a5a', '#3a4a6a', '#4a5a7a', '#5a6a8a', '#6a7a9a'] });
    r.overlay(g => {
      px.rect(g, 0, 0, W, H, '#0b2430dd'); E.font.title(g, 'POSTCARD ALBUM', W / 2, 5, { align: 'center', scale: 1, colors: ['#fff6c8', '#ffd24a'], depth: 1 });
      const n = s ? s.album.length : 0;
      if (!n) { G.text(g, 'No postcards yet. Press ' + G.label('photo') + ' anywhere on the island to take one.', W / 2, H / 2, '#bfe9ee', { align: 'center' }); return; }
      const card = s.album[this.i], w = 220, h = 150, x = Math.round(W / 2 - w / 2), y = 24;
      px.rect(g, x + 3, y + 3, w, h, '#00000066'); E.ui.box(g, x, y, w, h, { bg: ['#fffaf0', '#f0e6c8'], border: '#c8962a', gradient: false });
      G.drawPostcard(g, card, x + 8, y + 8, w - 16, h - 40, this);
      G.text(g, card.caption, x + w / 2, y + h - 26, '#3a2410', { align: 'center', shadow: null });
      G.text(g, card.loc + ' · Day ' + card.day + ' ' + G.SLOTS[card.slot], x + w / 2, y + h - 14, '#8a6a3a', { align: 'center', shadow: null });
      G.text(g, (this.i + 1) + ' / ' + n, W / 2, y + h + 8, '#fff6c8', { align: 'center' });
    });
    G.drawPrompts(r, [['confirm', 'Use as title card'], ['cancel', 'Back']]);
  }
});
