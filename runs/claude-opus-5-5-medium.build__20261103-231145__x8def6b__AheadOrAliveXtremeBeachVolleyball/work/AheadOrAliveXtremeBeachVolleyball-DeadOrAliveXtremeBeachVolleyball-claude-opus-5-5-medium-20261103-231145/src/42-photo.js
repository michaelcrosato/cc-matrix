/* 42-photo: Postcards (photo mode) and the album. Photo mode freezes play; the stick pans, the right stick or a right-drag
 * orbits, L2/R2 or the wheel zoom; the subject (you or anyone present) takes a pose and an expression; a filter and a
 * postcard frame; the shutter keeps a small picture and its spec in the album (24 at most). The album shows them 4 x 2,
 * opens one large, deletes, sets one as the title's backdrop, and exports a PNG (not in hub sessions). */
G.PHOTO_POSES = ['none', 'wave', 'peace', 'hips', 'cheer', 'stretch', 'lookback', 'sit', 'victory', 'salute', 'bow'];
G.PHOTO_EXPR = ['smile', 'shout', 'wince', 'neutral'];
G.PHOTO_FILTERS = ['Clean', 'Sunny', 'Sepia', 'Retro', 'Night Glow'];
G.PHOTO_FRAMES = ['None', 'Postcard'];
G.albumAll = () => { const S = G.state; if (S && S.album && S.album.length) return S.album; return G.store.get('aoa-album', []) || []; };
G.titlePostcard = () => {
  if (G.hub || typeof Image === 'undefined') return null; const src = G.store.get('aoa-title-postcard', null); if (!src) return null;
  if (G._tpc && G._tpc.src === src) return G._tpc; const im = new Image(); im.src = src; G._tpc = im; return im;
};
/** where the camera looks now: the people in the shot, on average */
G.photoFocus = () => { const subs = (G.photoSubjects && G.photoSubjects()) || []; if (!subs.length) return null; let x = 0, y = 0; for (const p of subs) { x += p.rig.x; y += p.rig.y; } return [Math.round(x / subs.length), Math.round(y / subs.length)]; };
/** a postcard drawn again, live, from its spec: the place's floor and props at its time of day, everyone in their
 *  outfits, positions and poses (their idles still breathe), the camera's turn and zoom, the filter and the frame */
G.specScene = {
  rigs: new Map(),
  rigsFor(spec) {
    let list = this.rigs.get(spec); if (list) return list;
    list = (spec.people || []).filter(p => G.CAST[p.id]).map((p, k) => ({ p, rig: G.anim.rig(G.makeRig(p.id, G.CAST[p.id].shirt || G.CAST[p.id].robe ? {} : { suit: p.suit || G.CAST[p.id].suit, acc: p.acc || G.CAST[p.id].acc })),
      x: p.x !== undefined ? p.x : 300 + k * 30, y: p.y !== undefined ? p.y : 250, z: p.z || 0, f: p.facing !== undefined ? p.facing : Math.PI / 2 }));
    this.rigs.set(spec, list); return list;
  },
  POSE: { wave: 'wave', hips: 'hips', cheer: 'cheer', sit: 'kneel', victory: 'cheer' },
  MOVE: { peace: 'peace', stretch: 'stretch', lookback: 'lookback', victory: 'fistpump', salute: 'salute', bow: 'bow' },
  /** set up the camera for a spec (in update): returns the map to draw */
  prepare(spec, dt) {
    const loc = G.LOCS[spec.loc] ? spec.loc : 'beach', map = G.locMaps()[loc], list = this.rigsFor(spec), g = G.game;
    const viewId = spec.cam && spec.cam.view && E.VIEWS[spec.cam.view] ? spec.cam.view : 'threequarter';
    if (!g.view || g.view.id !== viewId) g.setView(viewId);
    const at = (spec.cam && spec.cam.at) || (list.length ? [list.reduce((a, c) => a + c.x, 0) / list.length, list.reduce((a, c) => a + c.y, 0) / list.length] : G.LOCS[loc].spawn);
    g.cam.bounds = null; g.follow(null); g.focus(at[0], at[1], 16); g.setZoom((spec.cam && spec.cam.zoom) || 1);
    const yaw = Math.round(((spec.cam && spec.cam.yaw) || 0) / 15) * 15; if (Math.round(g.yaw || 0) !== yaw && !g.view.isSide) g.rotateView(yaw - (g.yaw || 0));
    for (const c of list) { const pose = c.p.pose || 'none', mv = this.MOVE[pose]; c.rig.vb = mv ? { kind: mv, u: .5, w: 1 } : null;
      c.rig.update(dt, { x: c.x, y: c.y, z: c.z, facing: c.f, pose: this.POSE[pose] || null, expr: c.p.expr && c.p.expr !== 'neutral' ? c.p.expr : null }); }
    return { loc, map, list };
  },
  draw(r, spec) {
    const loc = G.LOCS[spec.loc] ? spec.loc : 'beach', map = G.locMaps()[loc], tod = spec.tod || 'afternoon', night = tod === 'night';
    G.applyLight(tod, 'sunny', night || loc === 'casino' || loc === 'villa');
    if (loc !== 'villa' && loc !== 'casino') G.backdrop(tod).draw(r);
    map.drawFloor(r); if (map.queueWalls) map.queueWalls(r); G.drawLocProps(r, loc, night);
    for (const c of this.rigsFor(spec)) { r.shadow(c.x, c.y, 6, .3); r.actor(c.x, c.y, c.z, (g, ox, oy) => c.rig.draw(g, ox, oy, r.view), { key: c.rig }); }
    if (night) G.game.lights.add((spec.cam && spec.cam.at || [352, 240])[0], (spec.cam && spec.cam.at || [352, 240])[1], 30, 160, .7, { color: '#ffd8a0' });
    r.overlay(g => {
      const W = r.W, H = r.H, f = spec.filter;
      if (f === 'Sunny') px.blend(g, .15, 'screen', () => px.rect(g, 0, 0, W, H, '#ffb060')); else if (f === 'Sepia') px.blend(g, .35, 'multiply', () => px.rect(g, 0, 0, W, H, '#c8a070'));
      else if (f === 'Night Glow') px.blend(g, .3, 'multiply', () => px.rect(g, 0, 0, W, H, '#6a80ff')); else if (f === 'Retro') px.blend(g, .15, 'normal', () => { for (let y = 0; y < H; y += 2) px.rect(g, 0, y, W, 1, '#000000'); });
      if (spec.frame === 'Postcard') { px.rect(g, 0, 0, W, 6, '#fff8e8'); px.rect(g, 0, H - 18, W, 18, '#fff8e8'); px.rect(g, 0, 0, 6, H, '#fff8e8'); px.rect(g, W - 6, 0, 6, H, '#fff8e8'); E.font.text(g, 'Greetings from Isla Fortuna', 10, H - 14, '#c8502a', { outline: false }); E.font.text(g, 'Day ' + (spec.day || 1), W - 10, H - 14, '#2a6ad8', { align: 'right', outline: false }); }
    });
  }
};
G.photo = {
  open() {
    if (G.hub || G.attract.active && !this.demo || G.overlay.has('photo')) return;
    const subs = (G.photoSubjects && G.photoSubjects()) || []; const self = this; const prev = G.game.input.preset;
    this.st = { subs, sub: 0, pose: 0, expr: 0, filter: 0, frame: 1, panel: false, row: 0, hide: false, yaw: 0, zoom: G.game.zoom || 1, flash: 0, saved: 0, pan: [0, 0], ask: false };
    this.cam0 = { yaw: G.game.yaw || 0, zoom: G.game.zoom || 1 };
    G.overlay.push({ kind: 'photo', modal: true,
      open() { this.ts = G.game.timeScale; G.game.timeScale = 0; G.game.input.use(Object.assign({}, prev || {}, G.INPUT.MENU)); G.sfx('ui_select'); },
      close() { G.game.timeScale = 1; G.game.resetCamera(); if (prev) G.game.input.use(prev); for (const s of self.st.subs) if (s.rig) s.rig.vb = null; G.photoPan = null; },
      update() { return self.update(); }, draw(r) { self.draw(r); } });
  },
  close() { const o = G.overlay.list.find(o => o.kind === 'photo'); if (o) G.overlay.remove(o); },
  update() {
    const I = G.game.input, S = this.st, g = G.game;
    if (S.flash > 0) S.flash -= 1 / 60;
    if (S.ask) { if (I.pressed('confirm')) { S.ask = false; this.take(true); } else if (I.pressed('cancel')) S.ask = false; return true; }
    if (I.pressed('cancel') && !S.panel) { this.close(); G.sfx('ui_back'); return true; }
    if (I.pressed('hide')) S.hide = !S.hide;
    if (I.pressed('extra')) { S.panel = !S.panel; G.sfx('ui_tick'); }
    if (S.panel) {
      if (I.pressed('cancel')) S.panel = false;
      if (I.repeat('down', .3, .1)) S.row = (S.row + 1) % 4; if (I.repeat('up', .3, .1)) S.row = (S.row + 3) % 4;
      const d = I.repeat('right', .3, .1) ? 1 : I.repeat('left', .3, .1) ? -1 : 0;
      if (d) { const k = ['pose', 'expr', 'filter', 'frame'][S.row], n = [G.PHOTO_POSES, G.PHOTO_EXPR, G.PHOTO_FILTERS, G.PHOTO_FRAMES][S.row].length; S[k] = (S[k] + d + n) % n; G.sfx('ui_tick'); }
      const c = I.clicked(); if (c) { const W = g.W, H = g.H, x0 = Math.round(W * .62), y0 = Math.round(H * .2); for (let k = 0; k < 4; k++) if (c[1] >= y0 + 16 + k * 22 && c[1] < y0 + 34 + k * 22 && c[0] > x0) { S.row = k; const key = ['pose', 'expr', 'filter', 'frame'][k], n = [G.PHOTO_POSES, G.PHOTO_EXPR, G.PHOTO_FILTERS, G.PHOTO_FRAMES][k].length; S[key] = (S[key] + (c[0] > x0 + 70 ? 1 : -1) + n) % n; } }
    } else {
      const m = I.move(); S.pan[0] += m[0] * 1.2; S.pan[1] += m[1] * 1.2; G.photoPan = S.pan;
      const aim = I.padAim, pan = I.pan && I.pan(); if (aim) S.yaw += aim[0] * 2; if (pan) S.yaw += pan[0] * .6;
      if (g.view && !g.view.isSide) { const want = Math.round(S.yaw / 15) * 15; if (want !== Math.round((g.yaw || 0))) g.rotateView(want - (g.yaw || 0)); }
      const w = G.takeWheel(); if (w) S.zoom = clamp(S.zoom * (w < 0 ? 1.1 : .9), .75, 2.5);
      if (I.down('zoomIn')) S.zoom = Math.min(2.5, S.zoom * 1.01); if (I.down('zoomOut')) S.zoom = Math.max(.75, S.zoom / 1.01);
      g.setZoom(S.zoom);
      if (I.pressed('alt') && S.subs.length) { S.sub = (S.sub + 1) % S.subs.length; G.sfx('ui_tick'); }
      if (I.pressed('confirm') || (I.clicked() && !S.hide)) this.take();
    }
    // pose the subject
    const sub = S.subs[S.sub];
    if (sub && sub.rig) { const pose = G.PHOTO_POSES[S.pose], mv = { wave: null, peace: 'peace', hips: null, cheer: null, stretch: 'stretch', lookback: 'lookback', sit: null, victory: 'fistpump', salute: 'salute', bow: 'bow' }[pose];
      sub.rig.vb = mv ? { kind: mv, u: .5, w: 1 } : null; const ex = G.PHOTO_EXPR[S.expr];
      sub.rig.update(1 / 120, { x: sub.rig.x, y: sub.rig.y, z: sub.rig.z, facing: sub.rig.facing, pose: { wave: 'wave', hips: 'hips', cheer: 'cheer', sit: 'kneel', victory: 'cheer' }[pose] || null, expr: ex === 'neutral' ? null : ex }); }
    return true;
  },
  /** the shutter: a white flash, a small picture of the buffer with the filter and frame, saved with its spec */
  take(replace) {
    const S = this.st, St = G.state, album = St ? St.album : (G.store.get('aoa-album', []) || []);
    if (album.length >= 24 && !replace) { S.ask = true; return; }
    if (album.length >= 24) album.shift();
    G.sfx('shutter'); G.sting('photo'); S.flash = .25; G.game.flash('#ffffff', .15);
    const spec = { loc: G.game.sceneName === 'location' ? (G.LOC && G.LOC.id) : G.game.sceneName, day: St ? St.day : 0, slot: St ? St.slot : 0, tod: G.curTod || 'afternoon',
      cam: { yaw: G.game.yaw || 0, zoom: S.zoom, view: G.game.baseView ? G.game.baseView.id : (G.game.view && G.game.view.id), at: G.photoFocus() },
      people: S.subs.map((p, k) => ({ id: p.id, x: Math.round(p.rig.x), y: Math.round(p.rig.y), z: Math.round(p.rig.z || 0), facing: +(p.rig.facing || 0).toFixed(2), suit: p.rig.suit || null, acc: (p.rig.acc || []).slice(), pose: k === S.sub ? G.PHOTO_POSES[S.pose] : 'none', expr: k === S.sub ? G.PHOTO_EXPR[S.expr] : 'smile' })),
      filter: G.PHOTO_FILTERS[S.filter], frame: G.PHOTO_FRAMES[S.frame], img: this.capture(), at: Date.now() };
    album.push(spec); if (St) { St.stats.photos++; } G.store.set('aoa-album', (G.store.get('aoa-album', []) || []).concat([spec]).slice(-24));
    S.saved = 1.5; G.bus.emit('photo', spec);
  },
  capture() {
    const buf = G.game.screen && G.game.screen.buf; if (!buf || typeof document === 'undefined') return null;
    const w = 192, h = Math.round(192 * G.game.H / G.game.W), c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    g.imageSmoothingEnabled = false; g.drawImage(buf, 1, 1, G.game.W, G.game.H, 0, 0, w, h);
    const S = this.st, f = G.PHOTO_FILTERS[S.filter];
    if (f !== 'Clean') { const d = g.getImageData(0, 0, w, h), a = d.data; for (let i = 0; i < a.length; i += 4) { let r = a[i], gg = a[i + 1], b = a[i + 2];
      if (f === 'Sunny') { r = r * 1.1 + 12; gg = gg * 1.04 + 6; b = b * .9; }
      else if (f === 'Sepia') { const y = r * .3 + gg * .59 + b * .11; r = y * 1.1 + 20; gg = y * .95 + 8; b = y * .75; }
      else if (f === 'Retro') { r = Math.round(r / 64) * 64; gg = Math.round(gg / 64) * 64; b = Math.round(b / 64) * 64; }
      else if (f === 'Night Glow') { r = r * .7 + 10; gg = gg * .8 + 20; b = b * 1.1 + 40; }
      a[i] = clamp(r, 0, 255); a[i + 1] = clamp(gg, 0, 255); a[i + 2] = clamp(b, 0, 255); } g.putImageData(d, 0, 0); }
    if (G.PHOTO_FRAMES[S.frame] === 'Postcard') {
      g.fillStyle = '#fff8e8'; g.fillRect(0, 0, w, 5); g.fillRect(0, h - 14, w, 14); g.fillRect(0, 0, 5, h); g.fillRect(w - 5, 0, 5, h);
      E.font.text(g, 'Greetings from Isla Fortuna', 7, h - 11, '#c8502a', { outline: false });
      const St = G.state; E.font.text(g, 'Day ' + (St ? St.day : 1), w - 8, h - 11, '#2a6ad8', { align: 'right', outline: false });
      g.fillStyle = '#ff5f7a'; g.fillRect(w - 22, 8, 14, 16); g.fillStyle = '#fff3c0'; g.fillRect(w - 20, 10, 10, 12);
    }
    try { return c.toDataURL('image/jpeg', .82); } catch (e) { return null; }
  },
  draw(r) {
    const S = this.st, W = r.W, H = r.H;
    r.overlay(g => {
      const f = G.PHOTO_FILTERS[S.filter];
      if (f === 'Sunny') px.blend(g, .15, 'screen', () => px.rect(g, 0, 0, W, H, '#ffb060')); else if (f === 'Sepia') px.blend(g, .35, 'multiply', () => px.rect(g, 0, 0, W, H, '#c8a070'));
      else if (f === 'Night Glow') px.blend(g, .3, 'multiply', () => px.rect(g, 0, 0, W, H, '#6a80ff')); else if (f === 'Retro') px.blend(g, .15, 'normal', () => { for (let y = 0; y < H; y += 2) px.rect(g, 0, y, W, 1, '#000000'); });
      if (G.PHOTO_FRAMES[S.frame] === 'Postcard') { px.rect(g, 0, 0, W, 6, '#fff8e8'); px.rect(g, 0, H - 18, W, 18, '#fff8e8'); px.rect(g, 0, 0, 6, H, '#fff8e8'); px.rect(g, W - 6, 0, 6, H, '#fff8e8'); E.font.text(g, 'Greetings from Isla Fortuna', 10, H - 14, '#c8502a', { scale: 1, outline: false }); }
      if (S.flash > 0) px.blend(g, Math.min(1, S.flash * 4), 'normal', () => px.rect(g, 0, 0, W, H, '#ffffff'));
      if (S.saved > 0) { S.saved -= 1 / 60; const k = Math.min(1, S.saved); E.ui.box(g, W - 90, Math.round(H * .1) + Math.round((1 - k) * 20), 80, 54, { bg: '#fff8e8', border: '#c8502a' }); E.font.text(g, 'Developing...', W - 50, Math.round(H * .1) + 22, '#c8502a', { align: 'center', outline: false }); }
      if (S.hide) return;
      E.ui.box(g, 8, 8, 120, 14, { bg: G.THEMES.day.bg, border: '#f6d38a' }); E.font.text(g, 'POSTCARD MODE', 14, 11, '#ffd36a', { outline: false });
      const sub = S.subs[S.sub]; if (sub) E.font.text(g, 'Subject: ' + G.CAST[sub.id].short, 14, 26, '#fff8e8', { shadow: '#000', outline: false });
      if (S.panel) {
        const x0 = Math.round(W * .62), y0 = Math.round(H * .2); G.UI.panel(g, x0 - 6, y0 - 4, Math.round(W * .34), 110);
        E.font.text(g, 'POSE & LOOK', x0, y0 + 2, '#9fd3d6', { outline: false });
        [['Pose', G.PHOTO_POSES[S.pose]], ['Expression', G.PHOTO_EXPR[S.expr]], ['Filter', G.PHOTO_FILTERS[S.filter]], ['Frame', G.PHOTO_FRAMES[S.frame]]].forEach(([k, v], i) => {
          const it = { x: x0, y: y0 + 16 + i * 22, w: Math.round(W * .3), h: 18, label: k, align: 'left', right: '◀ ' + G.cap(v) + ' ▶' }; G.UI.button(g, it, i === S.row); });
      }
      if (S.ask) { G.UI.panel(g, W / 2 - 110, H * .42, 220, 40); E.font.text(g, 'Album full: replace the oldest?', W / 2, H * .42 + 8, '#ffd36a', { align: 'center', outline: false }); E.font.text(g, G.btn('confirm') + ' Yes   ' + G.btn('cancel') + ' No', W / 2, H * .42 + 24, '#fff8e8', { align: 'center', outline: false }); }
    });
    if (!S.hide) G.promptBar(r, S.panel ? [['up', 'Choose'], ['left', 'Change'], ['cancel', 'Close panel']] : [['confirm', 'Snap'], ['alt', 'Subject'], ['extra', 'Pose & look'], ['hide', 'Hide UI'], ['cancel', 'Exit']]);
  }
};
/* ---- the album: 4 x 2 thumbnails a page ---- */
G.SCENES.album = {
  input: G.INPUT.MENU,
  enter(d) { this.d = d || {}; this.page = 0; this.open = -1; this.focus = new G.Focus(); this.ask = false; this.imgs = new Map(); G.music('siesta'); },
  list() { return G.albumAll(); },
  img(spec) { if (!spec.img || typeof Image === 'undefined') return null; let im = this.imgs.get(spec); if (!im) { im = new Image(); im.src = spec.img; this.imgs.set(spec, im); } return im; },
  layout() {
    const W = G.game.W, H = G.game.H, L = this.list(), per = 8, cw = Math.round(W * .2), ch = Math.round(cw * .62), x0 = Math.round(W / 2 - (cw * 4 + 18) / 2), y0 = Math.round(H * .18);
    const out = []; for (let k = 0; k < per; k++) { const i = this.page * per + k; if (i >= L.length) break; out.push({ id: i, x: x0 + (k % 4) * (cw + 6), y: y0 + Math.floor(k / 4) * (ch + 22), w: cw, h: ch }); } return out;
  },
  update() {
    const I = G.game.input, L = this.list();
    if (this.ask) { if (I.pressed('confirm')) { L.splice(this.open, 1); if (!G.state) G.store.set('aoa-album', L); this.open = -1; this.ask = false; G.sfx('ui_back'); } else if (I.pressed('cancel')) this.ask = false; return; }
    if (this.open >= 0) {
      if (L[this.open]) G.specScene.prepare(L[this.open], 1 / 120);
      if (I.pressed('cancel') || I.pressed('confirm') || I.clicked()) { this.open = -1; G.game.resetCamera(); return; }
      if (I.pressed('alt')) this.ask = true;
      if (I.pressed('extra')) { const s = L[this.open]; if (s && s.img) { G.store.set('aoa-title-postcard', s.img); G.toast('Title backdrop set', 'It shows behind the logo now.'); } }
      if (I.pressed('tabR') && !G.hub && typeof document !== 'undefined') { const s = L[this.open]; if (s && s.img) { const a = document.createElement('a'); a.href = s.img; a.download = 'isla-fortuna-postcard-' + (this.open + 1) + '.jpg'; a.click(); } }
      if (I.repeat('right', .35, .15)) this.open = Math.min(L.length - 1, this.open + 1); if (I.repeat('left', .35, .15)) this.open = Math.max(0, this.open - 1);
      return;
    }
    const f = this.focus.set(this.layout()).update();
    if (f.back || I.pressed('pause')) { G.go(this.d.from || (this.d.all ? 'menu' : 'location'), this.d.back || { loc: 'villa' }, { fade: .2 }); return; }
    if (f.tabR && (this.page + 1) * 8 < L.length) this.page++; if (f.tabL && this.page > 0) this.page--;
    if (f.pick) this.open = f.pick.id;
  },
  draw(r) {
    const L = this.list();
    if (this.open >= 0 && L[this.open] && !this.ask) { G.specScene.draw(r, L[this.open]); G.promptBar(r, [['alt', 'Delete'], ['extra', 'Title backdrop'], ['tabR', 'Export PNG'], ['cancel', 'Close']], G.game.input, r.H - 38); return; }
    G.backdrop('night').draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H; G.UI.title(g, 'ALBUM', W / 2, Math.round(H * .04), { scale: 2 });
      E.font.text(g, L.length + ' / 24 postcards • page ' + (this.page + 1), W / 2, Math.round(H * .04) + 20, '#9fd3d6', { align: 'center', outline: false });
      if (!L.length) E.font.text(g, 'No postcards yet. Pause anywhere on the island and choose Take a Postcard.', W / 2, H / 2, '#fff8e8', { align: 'center', outline: false });
      this.layout().forEach((it, k) => { const s = L[it.id], im = this.img(s); E.ui.box(g, it.x - 2, it.y - 2, it.w + 4, it.h + 4, { bg: '#fff8e8', border: '#c8502a' }); if (im && im.complete && im.width) g.drawImage(im, it.x, it.y, it.w, it.h); else G.drawPostcardArt(g, it.x, it.y, it.w, it.h, s); if (k === this.focus.i) G.UI.focus(g, it.x - 2, it.y - 2, it.w + 4, it.h + 4); E.font.text(g, 'Day ' + s.day + ' • ' + (G.LOCS[s.loc] ? G.LOCS[s.loc].name : G.cap(String(s.loc || ''))), it.x, it.y + it.h + 4, '#fff8e8', { outline: false }); });
      if (this.open >= 0 && L[this.open]) { const s = L[this.open], im = this.img(s), w = Math.round(W * .8), h = Math.round(w * H / W); px.blend(g, .85, 'normal', () => px.rect(g, 0, 0, W, H, '#000000')); const x = Math.round(W / 2 - w / 2), y = Math.round(H * .08); if (im && im.complete && im.width) g.drawImage(im, x, y, w, h); else G.drawPostcardArt(g, x, y, w, h, s); }
      if (this.ask) { G.UI.panel(g, W / 2 - 100, H * .42, 200, 40); E.font.text(g, 'Delete this postcard?', W / 2, H * .42 + 8, '#ffd36a', { align: 'center', outline: false }); E.font.text(g, G.btn('confirm') + ' Yes   ' + G.btn('cancel') + ' No', W / 2, H * .42 + 24, '#fff8e8', { align: 'center', outline: false }); }
    });
    G.promptBar(r, this.open >= 0 ? [['alt', 'Delete'], ['extra', 'Title backdrop'], ['tabR', 'Export PNG'], ['cancel', 'Close']] : [['confirm', 'Open'], ['tabL', 'Page'], ['tabR', 'Page'], ['cancel', 'Back']]);
  }
};
/** a painted card for a postcard with no picture (headless, or blocked canvas): its place's colours and who was in it */
G.drawPostcardArt = (g, x, y, w, h, s) => {
  const T = G.TOD[s.tod] || G.TOD.afternoon; px.rect(g, x, y, w, Math.round(h * .5), T.sky[1]); px.rect(g, x, y + Math.round(h * .5), w, Math.round(h * .2), T.sea); px.rect(g, x, y + Math.round(h * .7), w, h - Math.round(h * .7), '#f3d9a4');
  (s.people || []).slice(0, 4).forEach((p, k) => { const c = G.CAST[p.id]; if (!c) return; const cx = x + 10 + k * (w - 20) / 4; px.rect(g, cx, y + h * .52, 6, 10, c.color || '#ffffff'); px.disc(g, cx + 3, y + h * .48, 3, c.skin); });
};
