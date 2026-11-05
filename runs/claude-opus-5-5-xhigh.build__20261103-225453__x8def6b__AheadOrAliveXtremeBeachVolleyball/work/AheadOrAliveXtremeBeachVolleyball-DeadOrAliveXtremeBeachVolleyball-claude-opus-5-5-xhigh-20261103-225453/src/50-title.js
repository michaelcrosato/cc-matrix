/* 50-title: the title (a sunset beach, the six fighters each with her own idle, Sonny jogging past with a trophy, the
 * logo, PRESS in the current device's glyph), the main menu (a big list, a turning fighter), How to Play (ten pages with a
 * live mini-scene) and About & Credits (Source Information and the three feedback sections). 10 s idle starts the attract. */
const TITLE_CAST = [['rin', 'stretch'], ['lola', 'flex'], ['ingrid', 'fan'], ['amara', 'dance'], ['tess', 'juggle'], ['mei', 'wave']];
G.titleWorld = {
  rigs: null, sonny: null, t: 0,
  init() { if (this.rigs) return; this.rigs = TITLE_CAST.map(([id, idle], i) => ({ id, idle, rig: G.makeRig(id), x: 280 + i * 29, y: 150 + (i % 2) * 8 })); this.sonny = G.makeRig('sonny'); },
  update(dt) {
    this.init(); this.t += dt; const t = this.t;
    for (const f of this.rigs) {
      const s = { x: f.x, y: f.y, z: 0, facing: Math.PI / 2 + Math.sin(t * .4 + f.x) * .25, poseW: {} };
      if (f.idle === 'stretch') s.poseW.stretch = 1; else if (f.idle === 'flex') { s.pose = 'cheer'; s.expr = 'shout'; } else if (f.idle === 'fan') { s.pose = 'wave'; s.expr = 'wince'; if (G.chance('cosmetic', dt * .6)) G.fx.sweat(f.x, f.y, 34); }
      else if (f.idle === 'juggle') { s.poseW.bump = .5 + .5 * Math.max(0, Math.sin(t * 5.4)); } else if (f.idle === 'wave') s.pose = 'wave';
      if (f.idle === 'dance') G.Anim.idle(f.rig, dt, s, { clip: 'Dance_Loop', t }); else G.Anim.idle(f.rig, dt, s);
    }
    const sx = ((t * 40) % 900) - 120;
    G.Anim.idle(this.sonny, dt, { x: sx, y: 118, z: 0, vx: 70, vy: 0, facing: 0, pose: 'cheer', expr: 'smile' });
    this.sonnyX = sx;
  },
  draw(r, o = {}) {
    const g = G.game; g.focus(352, 112, 12);
    const tod = o.tod || 'sunset';
    if (o.postcard && G.photo) { G.photo.renderSpec(r, o.postcard, { title: true }); return; }
    G.drawSky(r, tod, r.w(352, 0, 0)[1]);
    G.courtMap.drawFloor(r); G.drawShore(r, G.now());
    r.prop('palm', 210, 128, 0, { size: 1.8 }); r.prop('palm', 500, 132, 0, { size: 1.9 }); r.prop('palm', 170, 176, 0, { size: 1.6 }); r.prop('palm', 548, 180, 0, { size: 1.7 });
    r.shape('umbrella', 244, 132, 0, { params: { color: '#ff5f7a' } }); r.shape('lounger', 470, 174, 0, { params: { color: '#2ec4c9' } }); r.shape('surfboard', 452, 128, 0, { params: { color: '#ffd04a' } }); r.shape('sandcastle', 352, 188, 0); r.shape('beachtowel', 310, 182, 0, { facing: 0, params: { color: '#ff9e5e' } });
    for (const f of this.rigs || []) { r.shadow(f.x, f.y, 6, .3); r.actor(f.x, f.y, 0, (gg, ox, oy) => f.rig.draw(gg, ox, oy, r.view)); }
    if (this.rigs) { const j = this.rigs[4], k = Math.abs(Math.sin(this.t * 2.7)); G.drawBall(r, j.x + 3, j.y + 2, 18 + k * 26, this.t * 3); }
    if (this.sonny && this.sonnyX > -60 && this.sonnyX < 760) { r.actor(this.sonnyX, 118, 0, (gg, ox, oy) => this.sonny.draw(gg, ox, oy, r.view)); r.queue(this.sonnyX + 6, 118, 40, gg => { const q = r.w(this.sonnyX + 4, 118, 46); px.rect(gg, q[0] - 3, q[1] - 6, 7, 6, '#ffd36a'); px.rect(gg, q[0] - 1, q[1], 3, 4, '#e8a020'); px.rect(gg, q[0] - 3, q[1] + 4, 7, 2, '#8a5a20'); }); }
  }
};
G.drawLogo = (g, r, y, o = {}) => {
  const x = Math.round(r.W / 2), sc = o.scale || (r.W < 360 ? 3 : 4);
  E.font.title(g, 'AHEAD OR ALIVE', x, y, { scale: sc, align: 'center', colors: ['#fff7d6', '#ffd36a', '#ff9e5e', '#ff5f7a'], depth: 3 });
  const w = E.font.width('AHEAD OR ALIVE', { scale: sc }), bx = x + Math.round(w / 2) + 10;
  px.sprite(g, G.BALL_SPR[Math.floor(G.now() * 6) % 3], bx, y + 6);
  E.font.text(g, 'XTREME BEACH VOLLEYBALL', x + 1, y + sc * 8 + 8 + 1, '#0f6a72', { scale: 2, align: 'center', outline: false });
  E.font.text(g, 'XTREME BEACH VOLLEYBALL', x, y + sc * 8 + 8, '#ffffff', { scale: 2, align: 'center', outline: false });
};
/** the touch-only notice: no touch controls; a Settings button */
G.touchGate = {
  rect: null,
  draw(g, r) {
    if (!G.touchOnly()) return;
    const w = 220, h = 70, x = Math.round((r.W - w) / 2), y = Math.round(r.H / 2) - 10;
    G.ui.panel(g, x, y, w, h);
    E.font.text(g, 'Controller or keyboard required', r.W / 2, y + 8, '#ffd36a', { align: 'center', shadow: '#000', outline: false });
    E.font.text(g, 'Connect a controller or keyboard to play.', r.W / 2, y + 20, '#fff8e8', { align: 'center', outline: false });
    E.font.text(g, 'The demo keeps running.', r.W / 2, y + 29, '#9fd3d6', { align: 'center', outline: false });
    this.rect = { x: Math.round(r.W / 2 - 45), y: y + 44, w: 90, h: 18 };
    G.ui.button(g, Object.assign({ label: 'Settings' }, this.rect), true);
  },
  update() {
    if (!G.touchOnly()) return false;
    const c = G.game.input.clicked(), R = this.rect;
    if (c && R && c[0] >= R.x && c[0] < R.x + R.w && c[1] >= R.y && c[1] < R.y + R.h) G.game.menu('settings');
    return true;
  }
};
G.scenes = G.scenes || {};
G.scenes.title = {
  view: 'court', input: G.PRESETS.MENU, camera: false,
  enter() { G.useInput('MENU'); G.applyLight('sunset'); G.music('sunrise'); G.ambience('beach'); G.game.setView(E.VIEWS.court); G.game.setZoom(1.15); G.game.cam.frame(null); G.attractReset && G.attractReset(); G.themeName = 'day'; this.t = 0; },
  exit() { G.game.setZoom(1); },
  update(dt) {
    this.t += dt; G.titleWorld.update(dt); G.tickAmbience(dt);
    if (G.unlocks && G.unlocks.titlePostcard) G.photo.prepare(G.unlocks.titlePostcard);
    if (G.attractIdle && G.attractIdle(dt)) return;
    if (G.touchGate.update()) return;
    const I = G.game.input;
    if (this.t > .3 && (I.pressed('confirm') || I.pressed('start') || I.clicked() || G.game.players.some(p => p.pressed('confirm') || p.pressed('start')))) { I.consumeAll(); G.sfx('ui_select'); G.game.go('menu', null, { fade: .2 }); }
  },
  draw(r) {
    G.titleWorld.draw(r, { postcard: G.unlocks && G.unlocks.titlePostcard });
    r.overlay(g => {
      G.drawLogo(g, r, Math.round(r.H * .1));
      if (!G.touchOnly()) { if (Math.floor(G.now() * 1.6) % 2 === 0) { const w = G.promptW('confirm', 'PRESS'); G.glyph(g, r.W / 2 - w / 2 + E.font.width('PRESS') + 6, Math.round(r.H * .84) + 1, 'confirm'); E.font.text(g, 'PRESS', Math.round(r.W / 2 - w / 2), Math.round(r.H * .84) + 2, '#fff8e8', { shadow: '#0a0814', outline: false }); } }
      else G.touchGate.draw(g, r);
      E.font.text(g, 'v' + G.VERSION + ' - engine v' + E.version, Math.round(r.W * .05), r.H - 14, '#c8b0d0', { shadow: '#000', outline: false });
      E.font.text(g, 'An original parody-tribute game', r.W - Math.round(r.W * .05), r.H - 14, '#c8b0d0', { align: 'right', shadow: '#000', outline: false });
    });
  }
};
G.scenes.menu = {
  view: 'court', input: G.PRESETS.MENU, camera: false,
  enter() { G.useInput('MENU'); G.applyLight('sunset'); G.music('sunrise'); G.game.setZoom(1.15); this.nav = this.nav || new G.Nav({ focus: 'new' }); this.t = 0; this.preview = this.preview || G.makeRig('tess'); this.pi = 0; G.attractReset && G.attractReset(); },
  exit() { G.game.setZoom(1); },
  entries() {
    const has = G.saveExists && G.saveExists(), album = G.unlocks && G.unlocks.album && G.unlocks.album.length;
    return [
      { id: 'new', label: 'New Vacation', onPress: () => G.newVacationFlow && G.newVacationFlow() },
      has && { id: 'cont', label: 'Continue', onPress: () => G.continueGame() },
      { id: 'load', label: 'Load', disabled: !has, onPress: () => G.loadMenu() },
      { id: 'beach', label: 'Beach Match', onPress: () => G.game.go('exhibition') },
      album && { id: 'album', label: 'Album', onPress: () => G.game.go('album', { from: 'menu' }) },
      { id: 'howto', label: 'How to Play', onPress: () => G.game.go('howto', { from: 'menu' }) },
      { id: 'settings', label: 'Settings', onPress: () => G.game.menu('settings') },
      { id: 'about', label: 'About & Credits', onPress: () => G.game.go('about', { from: 'menu' }) }
    ].filter(Boolean);
  },
  items() { const W = G.game.W, H = G.game.H, x = Math.round(W * .07), y = Math.round(H * .34); return G.listLayout(this.entries(), x, y, 128, 16, 4).map(it => Object.assign(it, { align: 'left' })); },
  update(dt) {
    this.t += dt; G.titleWorld.update(dt); G.tickAmbience(dt);
    if (G.attractIdle && G.attractIdle(dt)) return;
    if (G.touchGate.update()) return;
    const ev = this.nav.update(this.items(), G.game.input);
    if (ev.back) { G.sfx('ui_back'); G.game.go('title', null, { fade: .2 }); }
    // the preview turns, and changes fighter now and then
    if (Math.floor(this.t / 4) !== this.pi) { this.pi = Math.floor(this.t / 4); this.preview = G.makeRig(G.FIGHTERS[this.pi % 6]); }
    G.Anim.idle(this.preview, dt, { x: 0, y: 0, z: 0, facing: this.t * .9, pose: this.pi % 3 === 0 ? 'hips' : null });
  },
  draw(r) {
    G.titleWorld.draw(r);
    r.overlay(g => {
      G.drawLogo(g, r, Math.round(r.H * .06), { scale: 3 });
      if (G.touchOnly()) { G.touchGate.draw(g, r); return; }
      const its = this.items(); G.ui.panel(g, its[0].x - 8, its[0].y - 8, 144, its.length * 20 + 12, { alpha: .82 });
      this.nav.draw(g, its);
      // the turning fighter on a pedestal
      const px0 = Math.round(r.W * .78), py0 = Math.round(r.H * .74), c = G.CAST[this.preview.castId];
      px.ell(g, px0, py0 + 2, 26, 7, '#0a2d3d'); px.ell(g, px0, py0, 24, 6, '#2ec4c9'); px.ell(g, px0, py0 - 1, 20, 4, '#9ff3e8');
      this.preview.draw(g, px0, py0, E.VIEWS.court);
      E.font.text(g, c.full, px0, py0 + 12, '#fff8e8', { align: 'center', shadow: '#000', outline: false }); E.font.text(g, '"' + c.epithet + '"', px0, py0 + 22, '#ffd36a', { align: 'center', shadow: '#000', outline: false });
      G.promptBar(g, r, [['move', 'Choose'], ['confirm', 'Select'], ['cancel', 'Back']]);
    });
  }
};

/* ---- How to Play: ten pages, a live mini-scene in the panel, the current device's glyphs ---- */
G.howtoMini = (g, x, y, w, h, page, t) => {
  // a small court seen side-on: the ring shrinking, the touch chain, a serve, a block, a heart
  px.rect(g, x, y, w, h, '#5ab8d8'); px.rect(g, x, y + h * .55, w, h * .45, '#f3d9a4'); px.rect(g, x, y + h * .5, w, h * .06, '#2ec4c9');
  const nx = x + w / 2; px.rect(g, nx, y + h * .3, 1, h * .25, '#ffffff'); px.rect(g, nx - 1, y + h * .3, 3, 1, '#ffffff');
  const gy = Math.round(y + h * .8), k = (t * .5) % 1;
  const ball = (bx, by) => px.sprite(g, G.BALL_SPR[Math.floor(t * 8) % 3], Math.round(bx - 3), Math.round(by - 3));
  const fig = (fx, col, up) => { px.rect(g, fx - 2, gy - 14, 5, 7, col); px.rect(g, fx - 1, gy - 18, 3, 4, '#f1cfb2'); px.rect(g, fx - 2, gy - 7, 2, 7, '#e2ad84'); px.rect(g, fx + 1, gy - 7, 2, 7, '#e2ad84'); if (up) { px.rect(g, fx - 3, gy - 22, 1, 6, '#f1cfb2'); px.rect(g, fx + 3, gy - 22, 1, 6, '#f1cfb2'); } };
  if (page === 0) { const rr = 14 - 10 * k; px.ell(g, x + w * .3, gy + 2, rr, rr * .35, k > .8 ? '#ffd36a' : '#ffffff'); px.ell(g, x + w * .3, gy + 2, Math.max(1, rr - 1), Math.max(1, rr * .35 - 1), '#f3d9a4'); ball(x + w * .3, y + h * .1 + k * (gy - y - h * .1 - 16)); fig(x + w * .3 + (1 - k) * 20, '#2ec4c9'); }
  else if (page === 1) { const pts = [[w * .15, gy - 14], [w * .38, y + 10 - y], [w * .38, gy - 22], [w * .3, y + 4 - y], [w * .43, gy - 28], [w * .85, gy]]; const seg = Math.floor(k * 5), u = (k * 5) % 1, a = pts[seg], b = pts[seg + 1]; ball(x + lerp(a[0], b[0], u), (seg % 2 ? y : 0) + lerp(a[1] < 0 ? y + 10 : a[1], b[1] < 0 ? y + 10 : b[1], u)); fig(x + w * .15, '#2ec4c9'); fig(x + w * .38, '#ff5f7a', seg === 1); E.font.text(g, ['BUMP', 'SET', 'SPIKE', 'SPIKE', 'KILL!'][seg], x + 6, y + 4, '#2a1a10', { outline: false }); }
  else if (page === 2) { for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) px.rect(g, x + w * .55 + i * 14, gy - 4 + j * 3 - 6, 12, 2, (i === Math.floor(t) % 3 && j === 1) ? '#ff5f7a' : '#e2c088'); ball(x + w * .35 + k * w * .3, y + h * .3 + k * (gy - y - h * .3 - 6)); fig(x + w * .3, '#2ec4c9', true); }
  else if (page === 3) { const up = Math.sin(k * Math.PI); ball(x + w * .15 + (k > .6 ? (k - .6) * w * 1.5 : 0), gy - 20 - up * 24); fig(x + w * .15, '#2ec4c9', k > .5 && k < .7); }
  else if (page === 4) { fig(nx - 6, '#2ec4c9', true); fig(nx + 8, '#ff5f7a', true); ball(nx + 10 - k * 14, y + h * .25 + (k > .5 ? (k - .5) * 30 : 0)); if (k > .5) E.font.text(g, 'BLOCK!', nx - 14, y + 4, '#ff5f7a', { outline: false }); }
  else if (page === 5) { fig(x + w * .3, '#2ec4c9'); fig(x + w * .45, '#ff9e5e'); const b2 = ['MINE!', 'YOURS!'][Math.floor(t) % 2]; E.font.text(g, b2, x + w * .3, gy - 34, '#2a1a10', { align: 'center', outline: false }); for (let i = 0; i < 5; i++) G.icon(g, i < 1 + Math.floor(t) % 5 ? 'heart' : 'heartEmpty', x + w * .55 + i * 9, y + 6); }
  else if (page === 6) { const slots = ['Morning', 'Afternoon', 'Night'], s = Math.floor(t) % 3; px.rect(g, x, y, w, h * .55, ['#a8dcf0', '#78c8f0', '#14163a'][s]); E.font.text(g, 'Day ' + (1 + Math.floor(t / 3) % 5) + ' · ' + slots[s], x + w / 2, y + 6, s === 2 ? '#fff8e8' : '#2a1a10', { align: 'center', outline: false }); G.icon(g, 'coin', x + 8, gy - 6); E.font.text(g, G.fmtMoney(12000 + Math.floor(t) * 3000), x + 18, gy - 6, '#2a1a10', { outline: false }); }
  else if (page === 7) { fig(x + w * .35, '#2ec4c9'); fig(x + w * .6, '#ff5f7a'); px.sprite(g, G.GIFT_ICONS.plush_seal, Math.round(x + w * .45), Math.round(gy - 26 - k * 6)); if (k > .5) for (let i = 0; i < 3; i++) G.icon(g, 'heart', x + w * .6 - 6 + i * 6, gy - 34 - (k - .5) * 20 - i * 2); }
  else if (page === 8) { px.rect(g, x + 6, y + 6, 30, 20, '#e8283a'); for (let i = 0; i < 3; i++) E.font.text(g, String(7), x + 9 + i * 9, y + 11, k > .6 ? '#ffd36a' : '#ffffff', { outline: false }); for (let i = 0; i < 4; i++) { px.ell(g, x + w * .45 + i * 18, gy + 2, 7, 2, '#ffd04a'); } fig(x + w * .45 + Math.floor(k * 4) * 18, '#2ec4c9'); }
  else { px.rect(g, x + w * .25, y + 6, w * .5, h * .6, '#fff8e8'); px.rect(g, x + w * .25 + 3, y + 9, w * .5 - 6, h * .6 - 16, '#78c8f0'); fig(x + w * .5, '#ff5f7a', k > .5); if (k > .9) px.rect(g, x, y, w, h, '#ffffff'); }
};
const pagesScene = (kind) => ({
  view: 'court', input: G.PRESETS.MENU, camera: false,
  enter(d) { G.useInput('MENU'); this.from = (d && d.from) || 'menu'; this.page = 0; this.t = 0; this.scroll = 0; this.nav = new G.Nav(); G.applyLight('sunset'); G.game.setZoom(1.15); },
  exit() { G.game.setZoom(1); },
  pages() { return kind === 'howto' ? G.HOWTO.map(p => ({ title: p.title, text: p.text })) : G.aboutPages(); },
  items() {
    const W = G.game.W, H = G.game.H, n = this.pages().length;
    return [{ id: 'prev', x: Math.round(W * .06), y: Math.round(H / 2) - 10, w: 18, h: 20, label: '◀', disabled: this.page === 0, onPress: () => this.turn(-1) },
      { id: 'next', x: Math.round(W * .94) - 18, y: Math.round(H / 2) - 10, w: 18, h: 20, label: '▶', disabled: this.page === n - 1, onPress: () => this.turn(1) },
      { id: 'back', x: Math.round(W / 2) - 40, y: Math.round(H * .95) - 34, w: 80, h: 16, label: 'Back', onPress: () => this.leave() }];
  },
  turn(d) { const n = this.pages().length, p = clamp(this.page + d, 0, n - 1); if (p !== this.page) { this.page = p; this.scroll = 0; this.t = 0; G.sfx('ui_tab'); } },
  leave() { G.sfx('ui_back'); G.game.go(this.from === 'pause' ? 'title' : this.from, null, { fade: .2 }); },
  update(dt) {
    this.t += dt; G.titleWorld.update(dt);
    const I = G.game.input, ev = this.nav.update(this.items(), I, { wheelTabs: false });
    if (ev.back) return this.leave();
    if (ev.tab) this.turn(ev.tab);
    if (G.wheel) this.scroll = clamp(this.scroll + G.wheel * 12, 0, this.maxScroll || 0);
    if (I.down('down') && this.nav.focus === 'back') this.scroll = clamp(this.scroll + dt * 60, 0, this.maxScroll || 0);
    if (I.down('up') && this.nav.focus === 'back') this.scroll = clamp(this.scroll - dt * 60, 0, this.maxScroll || 0);
    const pad = I.padAxes && I.padAxes[3]; if (pad && Math.abs(pad) > .3) this.scroll = clamp(this.scroll + pad * dt * 90, 0, this.maxScroll || 0);
  },
  draw(r) {
    G.titleWorld.draw(r);
    r.overlay(g => {
      px.blend(g, .5, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#203040'));
      const P = this.pages(), pg = P[this.page], W = r.W, H = r.H, x = Math.round(W * .12), w = Math.round(W * .76), y = Math.round(H * .08), h = Math.round(H * .74);
      G.ui.panel(g, x, y, w, h, { title: (kind === 'howto' ? 'HOW TO PLAY' : 'ABOUT & CREDITS') + '  ' + (this.page + 1) + '/' + P.length });
      E.font.text(g, pg.title, W / 2, y + 10, '#ffd36a', { scale: 2, align: 'center', shadow: '#000', outline: false });
      let ty = y + 32;
      if (kind === 'howto') { const mw = Math.min(200, w - 40), mh = 64; G.howtoMini(g, Math.round(W / 2 - mw / 2), ty, mw, mh, this.page, this.t); ty += mh + 8; }
      const text = typeof pg.text === 'function' ? pg.text(G.game.input) : pg.text, lines = [];
      for (const para of String(text).split('\n')) { if (!para.trim()) { lines.push(''); continue; } lines.push(...E.font.wrap(para, w - 28)); }
      const lh = 10, room = y + h - 8 - ty, total = lines.length * lh; this.maxScroll = Math.max(0, total - room);
      g.save(); g.beginPath(); g.rect(x + 4, ty - 1, w - 8, room + 2); g.clip();
      lines.forEach((l, i) => { const yy = ty + i * lh - Math.round(this.scroll); if (yy > ty - lh && yy < ty + room) E.font.text(g, l, x + 14, yy, /^[A-Z][A-Za-z &]+:/.test(l) ? '#9fd3d6' : '#fff8e8', { shadow: '#0a0814', outline: false }); });
      g.restore();
      if (this.maxScroll > 0) { const sh = Math.max(10, room * room / total), sy = ty + (room - sh) * (this.scroll / this.maxScroll); px.rect(g, x + w - 6, ty, 2, room, '#0a1a20'); px.rect(g, x + w - 6, sy, 2, sh, '#ffd36a'); }
      this.nav.draw(g, this.items());
      G.promptBar(g, r, [['tabL', 'Page'], this.maxScroll > 0 && ['move', 'Scroll'], ['cancel', 'Back']]);
    });
  }
});
G.scenes.howto = pagesScene('howto');
G.scenes.about = pagesScene('about');
/** How to Play over a paused game (from the pause menu) */
G.howtoOverlay = () => {
  G.pushInput('MENU'); const sc = pagesScene('howto'); sc.enter({ from: 'overlay' }); sc.leave = () => { G.sfx('ui_back'); G.overlay.remove(ov); G.popInput(); G.game.timeScale = ov.ts; G.game.input.consumeAll(); };
  const ov = { id: 'howto', sceneBound: true, ts: G.game.timeScale, update(dt) { sc.update(dt); return true; }, draw(r) { r.overlay(g => { px.blend(g, .6, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#102030')); }); const tw = G.titleWorld.draw; G.titleWorld.draw = () => {}; sc.draw(r); G.titleWorld.draw = tw; } };
  G.game.timeScale = 0; G.overlay.push(ov);
};
