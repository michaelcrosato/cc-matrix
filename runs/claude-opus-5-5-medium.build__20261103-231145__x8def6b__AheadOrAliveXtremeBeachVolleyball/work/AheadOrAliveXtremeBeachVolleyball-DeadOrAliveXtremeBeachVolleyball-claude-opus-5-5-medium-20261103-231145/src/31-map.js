/* 31-map: the island map, an iso view of Isla Fortuna: sea all round, beaches, palm groves, a dormant volcano in three
 * steps with steam, the lagoon, the courts, the Promenade, the villas, the casino (neon at night), the Dock with Sonny's
 * seaplane and a lighthouse. The cursor jumps between pins; a location card says who is there; travel ends at the place. */
G.islandMap = () => {
  if (G._island) return G._island;
  const W = 48, H = 36, rows = [];
  for (let y = 0; y < H; y++) { let s = ''; for (let x = 0; x < W; x++) {
    const dx = (x - 24) / 20, dy = (y - 18) / 14, d = Math.hypot(dx, dy) + E.noise2(x * .2, y * .2) * .18;
    const vd = Math.hypot((x - 30) / 6, (y - 12) / 5);
    let c = d > 1.02 ? '~' : d > .88 ? 's' : 'g';
    if (c === 'g' && vd < 1) c = vd < .35 ? '3' : vd < .7 ? '2' : '1';
    if (x >= 28 && x <= 33 && y >= 13 && y <= 16 && c === 'g') c = 'l';   // the lagoon pool
    if (x >= 12 && x <= 19 && y >= 19 && y <= 24) c = 'c';               // the courts
    if (x >= 20 && x <= 28 && y >= 8 && y <= 10 && c !== '~') c = 'p';   // the promenade
    if (x >= 7 && x <= 10 && y >= 27 && y <= 33) c = 'p';                // the dock
    if (x >= 34 && x <= 39 && y >= 23 && y <= 25 && c !== '~') c = 'v';   // villas
    if (x >= 18 && x <= 22 && y >= 27 && y <= 29 && c !== '~') c = 'k';   // the casino
    s += c; } rows.push(s); }
  const tex = (x, y, tag) => {
    const n = E.hash2(Math.floor(x / 2), Math.floor(y / 2)) - .5, m = E.noise2(x * .02, y * .02);
    if (tag === 'sea') { const k = E.noise2(x * .01 + G.game.real * 0, y * .01); return [20 + k * 20, 120 + k * 50 + n * 8, 170 + k * 30 + n * 8]; }
    if (tag === 'sand') return [236 + n * 14, 212 + n * 12, 160 + n * 10];
    if (tag === 'lagoon') return [70 + n * 10, 210 + n * 10, 220 + n * 10];
    if (tag === 'court') { const line = (Math.floor(x) % 32 < 1) || (Math.floor(y) % 24 < 1); return line ? [60, 120, 220] : [240 + n * 10, 214 + n * 10, 160]; }
    if (tag === 'planks') return G.tex.planks(x, y);
    return [60 + m * 30 + n * 16, 150 + m * 40 + n * 20, 70 + m * 20 + n * 10];
  };
  G._island = new E.TileMap({ rows, legend: { '~': { floor: 'sea', block: true }, s: { floor: 'sand' }, g: { floor: 'grass' }, l: { floor: 'lagoon' }, c: { floor: 'court' }, p: { floor: 'planks' },
    1: 1, 2: 2, 3: 3, v: 4, k: 5 },
    types: { 1: { h: 14, top: '#6a5a4a', side: '#4a3a30', face: 'rock', roof: 'grass' }, 2: { h: 30, top: '#5a4a3a', side: '#3a2a22', face: 'rock', roof: 'plain' }, 3: { h: 48, top: '#3a2a22', side: '#2a1a14', face: 'rock', roof: 'plain' },
      4: { h: 18, top: '#ff8a6a', side: '#f4e8c8', face: 'plaster', roof: 'tiles' }, 5: { h: 26, top: '#2a1240', side: '#4a1a5a', face: 'plaster', roof: 'slab' } }, floorTex: tex, outside: '#1a78a0', ao: 4 });
  return G._island;
};
G.PINS = ['beach', 'pool', 'promenade', 'villa', 'casino', 'dock'];
G.pinPos = id => { const p = G.LOCS[id].pin; return [p[0] * 16 + 8, p[1] * 16 + 8]; };
G.isOpen = (id, S = G.state) => { const L = G.LOCS[id]; if (!S) return true; if (id === 'casino') return S.slot === 2; return L.open.includes(S.slot); };
G.SCENES.map = {
  pausable: true, view: 'iso', input: G.INPUT.MENU, camera: { zoom: [.55, 1.4], start: .7 },
  enter(d) {
    this.demo = d && d.demo; this.t = 0; const S = G.state; this.map = G.islandMap(); this.cur = this.cur && G.PINS.includes(this.cur) ? this.cur : 'beach'; this.card = false;
    if (S && !G.isOpen(this.cur)) this.cur = S.slot === 2 ? 'casino' : 'beach';
    this.tod = S ? G.todNow(S) : 'afternoon'; G.UI.theme = this.tod === 'night' ? 'night' : 'day';
    G.applyLight(this.tod, S ? G.weatherNow(S) : 'sunny', this.tod === 'night'); G.game.weather = S && G.weatherNow(S) === 'rain' ? { kind: 'rain', amount: .5 } : null;
    G.music(this.tod === 'night' ? 'siesta' : 'island'); G.ambience.set(this.tod === 'night' ? 'night' : 'beach');
    this.focus = new G.Focus(); G.game.cam.bounds = null; this.camX = G.pinPos(this.cur)[0]; this.camY = G.pinPos(this.cur)[1];
    if (S) S.atMap = true;
  },
  exit() { G.game.weather = null; },
  update(dt) {
    this.t += dt; const I = G.game.input, S = G.state; G.ambience.update(dt);
    const [tx, ty] = G.pinPos(this.cur); this.camX += (tx - this.camX) * Math.min(1, dt * 4); this.camY += (ty - this.camY) * Math.min(1, dt * 4); G.game.focus(this.camX, this.camY, 0);
    if (this.demo) { const k = Math.floor(this.t / 1.1) % G.PINS.length; this.cur = G.PINS[k]; this.card = (this.t % 1.1) > .5; this.tod = ['morning', 'afternoon', 'sunset', 'night'][Math.floor(this.t / 1.8) % 4]; G.applyLight(this.tod, 'sunny', this.tod === 'night'); return; }
    if (G.talkBox().update(dt)) return;
    if (this.card) {
      const f = this.focus.set(this.cardItems()).update();
      if (f.back) { this.card = false; return; }
      if (f.pick) { if (f.pick.id === 'go') this.travel(); else this.card = false; }
      return;
    }
    // the stick or d-pad jumps to the nearest pin that way; L1 / R1 cycle; the mouse hovers
    const dirs = [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]], v = G.game.view;
    for (const [a, dx, dy] of dirs) if (I.repeat(a, .35, .15)) { const p0 = v.p(...G.pinPos(this.cur), 0); let best = null, bd = 1e9; for (const id of G.PINS) { if (id === this.cur) continue; const p = v.p(...G.pinPos(id), 0), vx = p[0] - p0[0], vy = p[1] - p0[1], al = vx * dx + vy * dy; if (al <= 0) continue; const dd = al + Math.abs(vx * dy - vy * dx) * 2; if (dd < bd) { bd = dd; best = id; } } if (best) { this.cur = best; G.sfx('ui_tick'); } }
    const w = G.takeWheel(); if (I.pressed('tabR') || w > 0) { this.cur = G.PINS[(G.PINS.indexOf(this.cur) + 1) % G.PINS.length]; G.sfx('ui_tick'); } if (I.pressed('tabL') || w < 0) { this.cur = G.PINS[(G.PINS.indexOf(this.cur) + G.PINS.length - 1) % G.PINS.length]; G.sfx('ui_tick'); }
    const mg = I.lastDevice === 'mouse' && G.game.mouseGround ? G.game.mouseGround() : null;
    if (mg) for (const id of G.PINS) { const p = G.pinPos(id); if (Math.hypot(p[0] - mg[0], p[1] - mg[1]) < 28 && this.cur !== id) { this.cur = id; G.sfx('ui_tick'); } }
    if (I.pressed('confirm') || (I.clicked() && mg)) { G.sfx('ui_select'); this.card = true; this.focus.i = 0; }
    if (I.pressed('alt')) G.go('journal', { page: 1, back: 'map' });
    if (I.pressed('extra')) G.go('journal', { page: 0, back: 'map' });
  },
  cardItems() { const W = G.game.W, H = G.game.H, open = G.isOpen(this.cur) && this.cur !== 'dock', y = Math.round(H * .62) + 34; return [{ id: 'go', label: open ? 'Go there' : 'Closed', disabled: !open, x: Math.round(W / 2) - 100, y, w: 96, h: 18 }, { id: 'back', label: 'Back', x: Math.round(W / 2) + 4, y, w: 96, h: 18 }]; },
  travel() { const id = this.cur; if (id === 'casino') G.go('location', { loc: 'casino' }, { fade: 'iris', seconds: .5 }); else G.go('location', { loc: id }, { fade: 'iris', seconds: .5 }); },
  draw(r) {
    const S = G.state, night = this.tod === 'night', t = G.game.real;
    G.backdrop(this.tod, S ? G.weatherNow(S) : 'sunny').draw(r);
    this.map.drawFloor(r); this.map.queueWalls(r);
    // landmarks
    for (const [x, y] of [[160, 120], [190, 160], [600, 360], [640, 420], [300, 460], [560, 190], [130, 330], [700, 300], [420, 520], [250, 220]]) r.prop('palm', x, y, 0, { size: 1.1 });
    r.shape('lighthouse', 690, 120, 0, { light: night }); r.shape('seaplane', 140, 540, 0, { facing: Math.PI / 2, scale: .8 });
    r.shape('umbrella', 230, 330, 0, { scale: .8 }); r.shape('tikibar', 180, 300, 0, { scale: .6 }); r.shape('cabana', 520, 200, 0, { scale: .7 });
    for (const x of [340, 390, 440]) r.shape('shopfront', x, 140, 0, { facing: Math.PI / 2, scale: .5 });
    // steam from the volcano
    if (Math.floor(t * 3) % 2 === 0 && G.rng('cosmetic') < .5) G.game.particles.smoke(480 + (G.rng('cosmetic') - .5) * 10, 192, 52, 1, { size: 1, color: '#e8ecf0' });
    if (night) { G.game.lights.add(330, 450, 30, 80, .9, { color: '#ff5fa2' }); G.game.lights.add(590, 390, 24, 70, .7, { color: '#ffd890' }); G.game.lights.add(690, 120, 70, 120, .8, { color: '#fff0c0' }); }
    // pins
    for (const id of G.PINS) {
      const [x, y] = G.pinPos(id), on = this.cur === id, open = G.isOpen(id) && id !== 'dock', bob = on ? Math.abs(Math.sin(t * 4)) * 4 : 0;
      r.queue(x, y, 30 + bob, g => {
        const [sx, sy] = r.w(x, y, 30 + bob), X = Math.round(sx), Y = Math.round(sy), c = open ? (on ? '#ffd36a' : '#ff9e5e') : '#7a8a90';
        px.disc(g, X, Y, on ? 6 : 5, '#1a1020'); px.disc(g, X, Y, on ? 5 : 4, c); px.poly(g, [[X - 3, Y + 3], [X + 3, Y + 3], [X, Y + 9]], c); px.disc(g, X, Y, 2, '#ffffff');
        const label = G.LOCS[id].short, w = E.font.width(label) + 6; px.rect(g, X - w / 2, Y - 17, w, 10, '#101820'); E.font.text(g, label, X, Y - 16, open ? '#ffffff' : '#9aa0a8', { align: 'center', outline: false });
      }, { bias: 100 });
    }
    r.overlay(g => {
      const W = r.W, H = r.H, x0 = Math.round(W * .04), y0 = Math.round(H * .04);
      if (S) { G.UI.clock(g, Math.round(W * .96) - (G.game.cornerArea() ? 46 : 0), y0, S.day, S.slot, G.weatherNow(S), 'right'); G.UI.money(g, x0, y0, S.money); if (S.partner) { G.portrait(g, S.partner, x0, y0 + 20, 22); E.font.text(g, 'Partner: ' + G.CAST[S.partner].short, x0 + 26, y0 + 22, '#fff8e8', { shadow: '#000', outline: false }); G.UI.hearts(g, x0 + 26, y0 + 32, G.aff(S.partner)); } }
      G.UI.title(g, 'ISLA FORTUNA', W / 2, y0, { scale: 2 });
      if (this.card) {
        const id = this.cur, L = G.LOCS[id], w = Math.min(300, W - 30), x = Math.round(W / 2 - w / 2), y = Math.round(H * .3), h = Math.round(H * .32) + 30, open = G.isOpen(id) && id !== 'dock';
        G.UI.panel(g, x, y, w, h + 26);
        G.UI.heading(g, L.name, x + 10, y + 8);
        E.font.text(g, open ? 'Open now' : id === 'dock' ? 'Departures only' : id === 'casino' ? 'Opens at night' : 'Closed at night', x + 10, y + 26, open ? '#7cff5a' : '#ff9e5e', { outline: false });
        E.font.text(g, L.about, x + 10, y + 38, '#fff8e8', { outline: false, wrap: w - 20 });
        const here = S ? G.present(id) : []; E.font.text(g, here.length ? 'Here now:' : 'Nobody you know is here.', x + 10, y + 62, '#9fd3d6', { outline: false });
        here.slice(0, 5).forEach((nid, k) => { const px0 = x + 10 + k * 54; G.portrait(g, nid, px0, y + 72, 22); G.UI.mood(g, px0 + 26, y + 74, S.mood[nid]); const t2 = G.teamOf(nid); if (t2) E.font.text(g, '+' + G.CAST[t2.find(q => q !== nid)].short.slice(0, 3), px0 + 24, y + 84, '#ffd36a', { outline: false }); });
        this.cardItems().forEach((it, k) => G.UI.button(g, it, k === this.focus.i));
      }
    });
    if (!this.demo) G.promptBar(r, this.card ? [['confirm', 'Go'], ['cancel', 'Back']] : [['confirm', 'Choose'], ['alt', 'Friends'], ['extra', 'Journal'], ['pause', 'Options']]);
  }
};
