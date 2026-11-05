/* 31-map: the island map, an iso view of Isla Fortuna: sea all round, beaches, grass and palms, a dormant volcano with
 * steam, the lagoon, the courts, the Promenade, the villas, the casino (neon at night), the Dock with Sonny's seaplane and
 * a lighthouse. The stick or d-pad jumps between pins, L1/R1 cycle them, the mouse hovers; Cross opens a place's card
 * (who's there, what to do, open or closed) and Cross again travels there. Square: Friends. Triangle: the Journal. */
G.buildIsland = () => {
  const I = G.ISLAND, rows = [];
  for (let cy = 0; cy < I.H; cy++) { let s = ''; for (let cx = 0; cx < I.W; cx++) s += I.cell(cx, cy); rows.push(s); }
  return new E.TileMap({ rows, legend: { w: { floor: 'sea', block: true }, s: { floor: 'sand' }, g: { floor: 'grass' }, t: { floor: 'grass', spawn: 'palm' }, p: { floor: 'lagoon', block: true }, 1: 1, 2: 2, 3: 3, c: 4 },
    types: { 1: { h: 10, face: 'rock', roof: 'grass', top: '#5f9a4a', side: '#6a5a4a' }, 2: { h: 22, face: 'rock', roof: 'grass', top: '#6a8a4a', side: '#5a4a3e' }, 3: { h: 34, face: 'rock', roof: 'plain', top: '#7a6a5a', side: '#4a3e36' }, 4: { h: 30, face: 'rock', roof: 'plain', top: '#2a2224', side: '#4a3e36' } },
    floorTex: (x, y, tag) => tag === 'sea' ? G.FLOOR_TEX.sea(x, y, clamp(1 - Math.hypot((x / 16 - 24) / 24, (y / 16 - 18) / 18) * 1.4 + .4, 0, 1)) : tag === 'lagoon' ? G.FLOOR_TEX.pool(x, y) : tag === 'sand' ? G.FLOOR_TEX.sand(x, y) : G.FLOOR_TEX.grass(x, y), outside: '#0b5a7a', ao: 4 });
};
G.scenes.map = {
  view: 'iso', input: G.PRESETS.MENU, camera: { zoom: [.7, 1.3], start: .9 }, pausable: true,
  enter(d) {
    const st = G.state; G.useInput('MENU'); G.curPlace = 'map';
    this.map = G.islandMap || (G.islandMap = G.buildIsland());
    this.palms = this.palms || this.map.findAll('palm');
    this.tod = G.todFor(st.slot, G.weatherNow(), st.day); G.applyLight(this.tod, { ambient: Math.max(.5, G.TOD[this.tod].ambient) });
    G.game.weather = G.weatherNow() === 'rain' ? { kind: 'rain', amount: .5, wind: .3 } : null;
    G.music(st.slot === 2 ? 'siesta' : 'island'); G.ambience(st.slot === 2 ? 'night' : 'map'); G.themeName = st.slot === 2 ? 'night' : 'day';
    this.pins = G.ISLAND.pins; const cur = this.pins.find(p => p.id === (d && d.at)) || this.pins.find(p => G.openAt(p.id)) || this.pins[0];
    this.sel = cur.id; this.card = null; this.nav = new G.Nav(); this.t = 0; this.hover = null; this.panel = null; this.finalAsked = false;
    G.game.follow(null); G.game.cam.bounds = v => this.map.bounds(v); G.game.focus(cur.x, cur.y, 0); G.game.cam.snap = true; G.game.cam.smooth = .25;
    if (G.storyOnMap) G.storyOnMap(this);
  },
  exit() { G.game.weather = null; },
  pin(id) { return this.pins.find(p => p.id === id); },
  update(dt) {
    this.t += dt; G.tickAmbience(dt);
    const I = G.game.input, st = G.state;
    if (G.talk && G.talk.open) { G.talk.update(dt); if (G.talk.modal) return; }
    if (G.storyBusy && G.storyBusy()) return;
    const p = this.pin(this.sel); G.game.focus(p.x, p.y, 0);
    if (this.panel) return this.updatePanel(dt);
    if (this.card) {
      const ev = this.card.nav.update(this.cardItems(), I);
      if (ev.back) { this.card = null; G.sfx('ui_back'); }
      return;
    }
    // jump between pins: the nearest one in the pushed direction (screen space)
    for (const [a, dx, dy] of [['left', -1, 0], ['right', 1, 0], ['up', 0, -1], ['down', 0, 1]]) if (I.repeat(a, .35, .14)) this.step(dx, dy);
    if (I.pressed('tabR') || I.pressed('tabL')) { const i = this.pins.findIndex(q => q.id === this.sel), n = this.pins.length; this.sel = this.pins[(i + (I.pressed('tabR') ? 1 : n - 1)) % n].id; G.sfx('ui_tick'); }
    // the mouse: hover and click a pin
    const mp = I.pointer(); if (mp && I.lastDevice === 'mouse' && G.lastR && (!this._mp || mp[0] !== this._mp[0] || mp[1] !== this._mp[1])) { const h = this.pins.find(q => { const s = G.lastR.w(q.x, q.y, 16); return Math.hypot(s[0] - mp[0], s[1] - mp[1]) < 14; }); if (h && h.id !== this.sel) { this.sel = h.id; G.sfx('ui_tick'); } } this._mp = mp ? mp.slice() : null;
    const c = I.clicked(); if (c && G.lastR) { const h = this.pins.find(q => { const s = G.lastR.w(q.x, q.y, 16); return Math.hypot(s[0] - c[0], s[1] - c[1]) < 14; }); if (h) { this.sel = h.id; this.openCard(); return; } }
    if (I.pressed('confirm')) { I.consume('confirm'); this.openCard(); }
    else if (I.pressed('alt')) this.panel = { kind: 'friends', nav: new G.Nav() };
    else if (I.pressed('extra')) G.game.go('journal', { from: 'map' });
  },
  step(dx, dy) {
    const R = G.lastR; if (!R) return; const cur = this.pin(this.sel), a = R.w(cur.x, cur.y, 0);
    let best = null, bs = 1e9;
    for (const q of this.pins) { if (q === cur) continue; const b = R.w(q.x, q.y, 0), vx = b[0] - a[0], vy = b[1] - a[1], along = vx * dx + vy * dy; if (along <= 4) continue; const sc = along + Math.abs(vx * dy + vy * dx) * 2; if (sc < bs) { bs = sc; best = q; } }
    if (best) { this.sel = best.id; G.sfx('ui_tick'); }
  },
  openCard() { this.card = { id: this.sel, nav: new G.Nav({ focus: 'go' }) }; G.sfx('ui_select'); },
  cardItems() {
    const W = G.game.W, H = G.game.H, id = this.card.id, open = G.openAt(id), x = Math.round(W / 2 + 10), y = Math.round(H * .66);
    return [{ id: 'go', x, y, w: 90, h: 18, label: open ? 'Go there' : 'Closed', disabled: !open, onPress: () => this.travel(id) }, { id: 'back', x: x + 96, y, w: 60, h: 18, label: 'Back', onPress: () => { this.card = null; } }];
  },
  travel(id) {
    G.sfx('whoosh'); this.card = null;
    if (G.storyBeforeTravel && G.storyBeforeTravel(id)) return;
    const p = this.pin(id);
    G.game.go(id === 'casino' ? 'location' : 'location', { loc: id }, { fade: 'iris', at: { x: p.x, y: p.y, z: 0 }, seconds: .4 });
  },
  updatePanel(dt) { const I = G.game.input; if (I.pressed('cancel') || I.pressed('alt') || I.pressed('confirm') || I.clicked()) { this.panel = null; G.sfx('ui_back'); } },
  draw(r) {
    const st = G.state, night = st.slot === 2, t = G.now();
    this.map.drawFloor(r); this.map.queueWalls(r);
    for (const pl of this.palms) r.prop('palm', pl.x, pl.y, 0, { size: 1.1 });
    // places
    const P = id => this.pin(id);
    r.shape('netpost', P('beach').x - 10, P('beach').y, 0); r.shape('netpost', P('beach').x + 10, P('beach').y, 0); r.shape('umbrella', P('beach').x + 24, P('beach').y - 10, 0); r.shape('bleacher', P('beach').x, P('beach').y - 22, 0, { params: { len: 30 } });
    r.shape('cabana', P('pool').x + 26, P('pool').y - 6, 0, { scale: .7 }); r.shape('flamingo', P('pool').x - 4, P('pool').y, 1);
    for (const [k, sh] of [[-28, 'riptide'], [0, 'coral'], [28, 'sundries']]) r.shape('shopfront', P('promenade').x + k, P('promenade').y - 10, 0, { scale: .5, params: { color: G.SHOPS[sh].color } });
    for (const k of [-20, 0, 20]) r.shape('changinghut', P('villa').x + k, P('villa').y + Math.abs(k) * .3, 0, { scale: .9 });
    r.shape('cashier', P('casino').x, P('casino').y - 8, 0, { scale: .9 }); r.shape('neonsign', P('casino').x + 16, P('casino').y + 4, 0, { params: { color: night ? '#ff5fa2' : '#5ff0ff' } });
    r.shape('dockplanks', P('dock').x, P('dock').y, 0, { params: { len: 40 } }); r.shape('seaplane', P('dock').x + 30, P('dock').y + 18, 0, { scale: .8 });
    r.shape('lighthouse', 16 * 6, 16 * 26, 0);
    // the volcano's steam
    if (G.chance('cosmetic', 1 / 20)) G.game.particles.smoke(16 * 30, 16 * 11, 34, 1, { size: 1.3, color: '#e8e8f0' });
    if (night) { for (const id of ['casino', 'villa', 'promenade']) G.game.lights.add(P(id).x, P(id).y, 20, 70, 1, { color: id === 'casino' ? '#ff5fa2' : '#ffd8a0' }); G.game.lights.add(16 * 6, 16 * 26, 50, 90, 1, { color: '#fff0a0' }); }
    // pins
    for (const q of this.pins) {
      const open = G.openAt(q.id), sel = q.id === this.sel, here = q.id === 'dock' ? [] : G.presentAt(q.id).filter(id => id !== st.partner);
      r.queue(q.x, q.y, 30, g => {
        const s = r.w(q.x, q.y, 24 + (sel ? Math.sin(t * 5) * 2 : 0)), X = Math.round(s[0]), Y = Math.round(s[1]);
        const col = q.greyed ? '#8a8a9a' : open ? (sel ? '#ffd36a' : '#ff9e5e') : '#6a6a7a';
        px.poly(g, [[X - 5, Y - 10], [X + 5, Y - 10], [X, Y]], '#0a0814'); px.poly(g, [[X - 4, Y - 9], [X + 4, Y - 9], [X, Y - 1]], col); px.disc(g, X, Y - 10, 4, col); px.disc(g, X, Y - 10, 2, '#fff8e8');
        if (sel || q.id === (this.hoverId || '')) G.ui.tag(g, q.label + (open ? '' : q.greyed ? ' · ' + q.greyed : ' · closed'), X, Y - 16, '#2a1a10', sel ? '#ffd36a' : '#fff8e8');
        here.slice(0, 4).forEach((id, i) => { G.portrait(g, G.portraitRig(id), X + 8 + i * 11, Y - 8, 10, { frame: false }); });
      }, { bias: 5, emissive: true });
    }
    r.overlay(g => this.drawHUD(g, r));
    if (G.talk) G.talk.draw(r);
  },
  drawHUD(g, r) {
    const st = G.state, safe = G.safe(r);
    G.clockBadge(g, safe.x, safe.y, st.day, st.slot, G.weatherNow());
    G.ui.panel(g, safe.x, safe.y + 18, 96, 15, { alpha: .9 }); G.ui.money(g, safe.x + 4, safe.y + 22, st.money);
    if (st.partner) { E.ui.box(g, r.W - safe.x - 96, safe.y, 96, 24, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .85 }); G.portrait(g, G.portraitRig(st.partner), r.W - safe.x - 94, safe.y + 2, 20, { frame: false }); E.font.text(g, 'Partner: ' + G.CAST[st.partner].name, r.W - safe.x - 70, safe.y + 3, '#fff8e8', { outline: false }); G.ui.hearts(g, r.W - safe.x - 70, safe.y + 13, G.aff(st.partner)); }
    if (this.card) this.drawCard(g, r);
    else if (this.panel) this.drawFriends(g, r);
    else G.promptBar(g, r, [['move', 'Choose a place'], ['confirm', 'Open'], ['alt', 'Friends'], ['extra', 'Journal']]);
  },
  drawCard(g, r) {
    const id = this.card.id, st = G.state, L = G.LOCS[id], open = G.openAt(id), w = 240, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H * .24), h = Math.round(r.H * .5);
    G.ui.panel(g, x, y, w, h, { title: G.placeName[id].toUpperCase() });
    const acts = { beach: 'Matches · Match Board · Changing hut · Tiki bar', pool: 'Pool Hop · Changing hut · Lounging', promenade: 'Riptide Sports · Coral Couture · Sundries & Smiles', villa: 'Rest · Sleep · Closet · Journal · Album · Mail', casino: 'Slots · Blackjack · Roulette · Prize counter', dock: 'Departures only' }[id];
    E.font.text(g, acts, x + 10, y + 10, '#9fd3d6', { outline: false, wrap: w - 20 });
    E.font.text(g, open ? 'Open now' : id === 'casino' ? 'Opens at night' : id === 'dock' ? 'Story only' : 'Closed at night', x + 10, y + 32, open ? '#9ff3a8' : '#ff9a8a', { outline: false });
    const here = id === 'dock' ? [] : G.presentAt(id).filter(q => q !== st.partner);
    E.font.text(g, here.length ? "Who's there:" : 'Nobody you know is there.', x + 10, y + 46, '#fff8e8', { outline: false });
    here.forEach((nid, i) => { const xx = x + 10 + (i % 3) * 76, yy = y + 58 + Math.floor(i / 3) * 26; G.portrait(g, G.portraitRig(nid), xx, yy, 20, { frame: false }); E.font.text(g, G.CAST[nid].name, xx + 23, yy + 2, '#fff8e8', { outline: false }); G.icon(g, G.moodIcon(st.mood[nid]), xx + 23, yy + 11); const tm = G.teamOf(nid); if (tm) E.font.text(g, 'pair', xx + 33, yy + 11, '#ffd36a', { outline: false }); });
    this.card.nav.draw(g, this.cardItems());
    G.promptBar(g, r, [['confirm', open ? 'Travel' : 'Closed'], ['cancel', 'Back']]);
  },
  drawFriends(g, r) {
    const st = G.state, w = 280, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H * .16), h = Math.round(r.H * .7);
    G.ui.panel(g, x, y, w, h, { title: 'FRIENDS' });
    G.npcs(st).forEach((id, i) => {
      const yy = y + 10 + i * 26; G.portrait(g, G.portraitRig(id), x + 8, yy, 22, { frame: false });
      E.font.text(g, G.CAST[id].name + (st.partner === id ? '  (partner)' : ''), x + 36, yy + 1, '#fff8e8', { outline: false });
      E.font.text(g, G.stage(G.aff(id)), x + 36, yy + 11, '#9fd3d6', { outline: false }); G.ui.hearts(g, x + 130, yy + 2, G.aff(id)); G.icon(g, G.moodIcon(st.mood[id]), x + 182, yy + 2);
      const tm = G.teamOf(id); E.font.text(g, tm ? 'with ' + G.castName(tm.find(q => q !== id)) : st.partner === id ? 'your team' : 'solo', x + w - 10, yy + 11, '#ffd36a', { align: 'right', outline: false });
    });
    G.promptBar(g, r, [['cancel', 'Close']]);
  }
};
