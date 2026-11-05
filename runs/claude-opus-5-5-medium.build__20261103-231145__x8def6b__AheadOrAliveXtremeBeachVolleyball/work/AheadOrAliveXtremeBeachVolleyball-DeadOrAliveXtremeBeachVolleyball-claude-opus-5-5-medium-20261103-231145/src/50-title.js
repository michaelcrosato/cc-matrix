/* 50-title: the title (a sunset beach, the six fighters idling on the sand, the logo), the main menu, How to Play and
 * About & Credits. The touch-only gate shows on the title and menu. */
G.INPUT.MENU.snap = ['KeyC', 'Pad8'];
G.TITLE_IDLE = { rin: 'stretch', lola: 'fistpump', ingrid: 'foldarms', amara: 'dance', tess: 'shaka', mei: 'backflip' };
G.titleCast = () => G.FIGHTERS.map((id, k) => ({ id, x: 268 + k * 34, y: 84 + (k % 2) * 8, rig: G.anim.rig(G.makeRig(id)), ph: k * .7 }));
G.drawBeachStage = (r, cast, tod = 'sunset', focusY = 300) => {
  G.backdrop(tod).draw(r); G.courtMap().drawFloor(r);
  r.prop('palm', 170, 70, 0, { size: 1.8 }); r.prop('palm', 540, 64, 0, { size: 1.9 }); r.prop('palm', 590, 110, 0, { size: 1.5 });
  r.shape('umbrella', 210, 96, 0, { mats: { a: 'aoa_canvasP' } }); r.shape('lounger', 196, 110, 0, { facing: Math.PI / 2 }); r.shape('surfrack', 500, 100, 0, { facing: Math.PI / 2 });
  r.shape('beachtowel', 300, 118, 0); r.shape('beachtowel', 420, 120, 0, { mats: { t: 'aoa_canvasB' } }); r.shape('sandcastle', 460, 126, 0); r.shape('cooler', 330, 124, 0);
  if (tod === 'night') for (const x of [230, 480]) r.shape('torchpost', x, 90, 0, { light: true });
  for (const c of cast) { r.shadow(c.x, c.y, 7, .35); r.actor(c.x, c.y, 0, (g, ox, oy) => c.rig.draw(g, ox, oy, r.view), { key: c.rig }); }
};
G.updateCast = (cast, dt, t) => {
  for (const c of cast) {
    const mv = G.TITLE_IDLE[c.id] || 'wave', u = ((t * .5 + c.ph) % 3) / 3, act = u < .55;
    c.rig.vb = act && G.MOVES[mv] ? { kind: mv, u: u / .55, w: G.anim.weight(u / .55) } : null;
    c.rig.update(dt, { x: c.x, y: c.y, z: 0, facing: Math.PI / 2 + Math.sin(t * .3 + c.ph) * .25, pose: act && !G.MOVES[mv] ? mv : null, expr: act ? 'smile' : null });
  }
};
G.drawLogo = (g, W, y, small) => {
  const sc = small ? 3 : 4;
  E.font.title(g, 'AHEAD OR ALIVE', W / 2, y, { scale: sc, colors: ['#fff7d6', '#ffd36a', '#ff9e5e', '#ff5f7a'], depth: 3, align: 'center', depthColor: '#5a1a3a' });
  const lw = E.font.width('AHEAD OR ALIVE', { scale: sc }), bx = Math.round(W / 2 + lw / 2 + 10), by = y + 10, rot = Math.floor(G.game.real * 8) % 3;
  px.sprite(g, G.BALL_SPR[rot], bx, by - 4);
  E.font.text(g, 'XTREME BEACH VOLLEYBALL', W / 2, y + sc * 7 + 8, '#ffffff', { scale: 2, align: 'center', shadow: '#1f7a8c', outline: false });
};
/** the touch-only gate's panel: returns the Settings button's rect */
G.drawTouchGate = (g, W, H) => {
  const w = Math.min(280, W - 30), h = 74, x = Math.round(W / 2 - w / 2), y = Math.round(H * .58);
  G.UI.panel(g, x, y, w, h);
  E.font.text(g, 'Controller or keyboard required', W / 2, y + 8, '#ffd36a', { align: 'center', shadow: '#000', outline: false });
  E.font.text(g, 'Connect a controller or keyboard to play.', W / 2, y + 22, '#fff8e8', { align: 'center', outline: false });
  E.font.text(g, 'The demo keeps running.', W / 2, y + 32, '#9fd3d6', { align: 'center', outline: false });
  const b = { x: Math.round(W / 2 - 50), y: y + 46, w: 100, h: 20, label: 'SETTINGS', scale: 1 }; G.UI.button(g, b, true); return b;
};
G.gateTap = () => { const c = G.game.input.clicked(); if (!c) return; const W = G.game.W, H = G.game.H, y = Math.round(H * .58) + 46; if (c[0] > W / 2 - 50 && c[0] < W / 2 + 50 && c[1] > y && c[1] < y + 20) G.game.menu('settings'); };
G.SCENES.title = {
  view: 'court', input: G.INPUT.MENU,
  enter() {
    this.cast = this.cast || G.titleCast(); this.t = 0; G.UI.theme = 'day'; G.applyLight('sunset'); G.music('sunrise'); G.ambience.set('beach');
    G.game.cam.frame(null); G.game.setZoom(1.3); this.sonnyX = -999; this.sonnyRig = this.sonnyRig || G.anim.rig(G.makeRig('sonny')); G.attract.reset();
    this.backdrop = G.titlePostcard();
  },
  exit() { G.game.setZoom(1); },
  update(dt) {
    this.t += dt; G.updateCast(this.cast, dt, this.t); G.ambience.update(dt);
    // now and then Sonny jogs across the back with a giant trophy
    if (this.sonnyX < -900 && this.t % 14 < dt) this.sonnyX = 120;
    if (this.sonnyX > -900) { this.sonnyX += 70 * dt; this.sonnyRig.vb = { kind: 'stretch', u: 0, w: .8 }; this.sonnyRig.update(dt, { x: this.sonnyX, y: 56, z: 0, vx: 70, vy: 0, facing: 0, expr: 'shout' }); if (this.sonnyX > 640) this.sonnyX = -999; }
    G.game.focus(352, 96, 30);
    if (G.touchOnly()) { G.gateTap(); return; }
    const I = G.game.input;
    if (I.pressed('confirm') || I.pressed('start') || I.clicked()) { G.sfx('ui_select'); G.go('menu', null, { fade: .2 }); }
  },
  draw(r) {
    if (!this.cast) this.cast = G.titleCast();
    if (this.backdrop && this.backdrop.complete && this.backdrop.width) r.overlay(g => g.drawImage(this.backdrop, 0, 0, r.W, r.H));
    else {
      G.drawBeachStage(r, this.cast, 'sunset');
      if (this.sonnyX > -900) { const sr = this.sonnyRig, x = this.sonnyX; r.actor(x, 56, 0, (g, ox, oy) => sr.draw(g, ox, oy, r.view)); r.queue(x + 6, 56, 34, g => { const [sx, sy] = r.w(x + 6, 58, 30); px.rect(g, Math.round(sx) - 3, Math.round(sy) - 10, 7, 8, '#ffd36a'); px.rect(g, Math.round(sx) - 1, Math.round(sy) - 2, 3, 4, '#c89020'); px.rect(g, Math.round(sx) - 3, Math.round(sy) + 2, 7, 2, '#8a5a10'); px.dot(g, Math.round(sx) - 1, Math.round(sy) - 8, '#fff3c0'); }, { bias: 5 }); }
    }
    r.overlay(g => {
      const W = r.W, H = r.H;
      G.drawLogo(g, W, Math.round(H * .1));
      if (G.touchOnly()) G.drawTouchGate(g, W, H);
      else if (Math.floor(G.game.real * 2) % 2 === 0) { const I = G.game.input, txt = 'PRESS', code = G.codeFor('confirm', I), w = E.font.width(txt, { scale: 2 }) + 6 + G.glyphW(code, I); const x = Math.round(W / 2 - w / 2), y = Math.round(H * .62); E.font.text(g, txt, x, y, '#fff8e8', { scale: 2, shadow: '#000', outline: false }); G.drawGlyph(g, x + w - G.glyphW(code, I), y + 3, code, I); }
      E.font.text(g, (E.versionLabel ? E.versionLabel() : 'v' + E.version).replace(/·/g, '•'), 6, H - 10, '#c8b8e0', { outline: false, shadow: '#000' });
      E.font.text(g, 'An original parody-tribute game • Game v' + G.VERSION, W - 6, H - 10, '#c8b8e0', { align: 'right', outline: false, shadow: '#000' });
    });
  }
};
/** the main menu: a big list at the left, a turning fighter at the right */
G.SCENES.menu = {
  view: 'court', input: G.INPUT.MENU,
  enter() {
    this.focus = this.focus || new G.Focus(); this.t = 0; this.cast = G.SCENES.title.cast || G.titleCast(); this.prev = this.prev || 0;
    G.applyLight('sunset'); G.music('sunrise'); G.game.setZoom(1.3); G.attract.reset();
    this.preview = this.preview || G.anim.rig(G.makeRig('rin', { size: 2.2 }));
  },
  exit() { G.game.setZoom(1); },
  items() {
    const saves = G.game.saves, any = !G.hub && saves.latest && saves.latest();
    const album = G.albumAll().length > 0;
    return [
      { id: 'new', label: 'New Vacation' }, any ? { id: 'continue', label: 'Continue' } : null, { id: 'load', label: 'Load', disabled: !any },
      { id: 'beach', label: 'Beach Match' }, album ? { id: 'album', label: 'Album' } : null,
      { id: 'howto', label: 'How to Play' }, { id: 'settings', label: 'Settings' }, { id: 'about', label: 'About & Credits' }
    ].filter(Boolean);
  },
  layout() { const H = G.game.H, W = G.game.W, list = this.items(), h = 18, gap = 4, y0 = Math.round(H * .26); return G.UI.column(list, Math.round(W * .05) + 70, y0, 140, h, gap, { align: 'left' }); },
  update(dt) {
    this.t += dt; G.updateCast(this.cast, dt, this.t); G.game.focus(352, 96, 30);
    if (G.touchOnly()) { G.gateTap(); return; }
    const f = this.focus.set(this.layout()).update();
    const fighter = G.FIGHTERS[Math.floor(this.t / 4) % 6];
    if (this.preview.castId !== fighter) { this.preview = G.anim.rig(G.makeRig(fighter, { size: 2.2 })); }
    this.preview.update(dt, { x: 0, y: 0, z: 0, facing: this.t * .9, pose: null });
    if (f.back || G.game.input.pressed('pause')) { G.go('title', null, { fade: .2 }); return; }
    if (!f.pick) return;
    const id = f.pick.id;
    if (id === 'new') G.newVacationFlow();
    else if (id === 'continue') { const s = G.game.saves.latest(); if (s && G.game.saves.load(s.slot)) G.resumeVacation(); }
    else if (id === 'load') G.game.saves.show('load', save => { if (save) G.resumeVacation(); });
    else if (id === 'beach') G.go('exhibition');
    else if (id === 'album') G.go('album', { all: true });
    else if (id === 'howto') G.go('howto', { from: 'menu' });
    else if (id === 'settings') G.game.menu('settings');
    else if (id === 'about') G.go('about');
  },
  draw(r) {
    if (!this.cast) this.cast = G.SCENES.title.cast || G.titleCast();
    G.drawBeachStage(r, this.cast, 'sunset');
    r.overlay(g => {
      const W = r.W, H = r.H;
      px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, Math.round(W * .05) + 150, H, '#061a24'));
      E.font.title(g, 'AHEAD OR ALIVE', Math.round(W * .05) + 70, Math.round(H * .08), { scale: 2, colors: ['#fff7d6', '#ffd36a', '#ff9e5e'], align: 'center', depth: 2 });
      E.font.text(g, 'XTREME BEACH VOLLEYBALL', Math.round(W * .05) + 70, Math.round(H * .08) + 18, '#ffffff', { align: 'center', shadow: '#1f7a8c', outline: false });
      if (G.touchOnly()) { G.drawTouchGate(g, W, H); return; }
      const L = this.layout(); L.forEach((it, k) => G.UI.button(g, it, k === this.focus.i));
      // the turning fighter
      const pv = this.preview; if (!pv) return; const c = G.CAST[pv.castId], px0 = Math.round(W * .72), py0 = Math.round(H * .72);
      G.UI.panel(g, px0 - 70, Math.round(H * .18), 140, Math.round(H * .66), { alpha: .7 });
      pv.draw(g, px0, py0, G.VIEW_COURT);
      E.font.text(g, c.name, px0, Math.round(H * .18) + 6, '#ffd36a', { align: 'center', shadow: '#000', outline: false });
      E.font.text(g, '"' + c.epithet + '"', px0, Math.round(H * .18) + 16, '#fff8e8', { align: 'center', shadow: '#000', outline: false });
      const tip = { new: 'Five days on Isla Fortuna. Friends, swimsuits, the Cup.', continue: 'Back to your latest save.', load: 'Pick a save slot.', beach: 'Any fighters, 1-4 players on this machine.', album: 'Your postcards from the island.', howto: 'Ten short pages: the controls and the island.', settings: 'Difficulty, timing, camera, sound, button symbols.', about: 'Credits, source information and feedback.' }[(this.focus.cur || {}).id] || '';
      E.font.text(g, tip, W / 2, Math.round(H * .88), '#fff8e8', { align: 'center', shadow: '#000', outline: false });
    });
    G.promptBar(r, [['confirm', 'Select'], ['cancel', 'Back']]);
  }
};
/* ---- How to Play: ten pages, one idea each, with a live mini scene ---- */
G.HOWTO = [
  ['Moving and the ring', 'Move with the stick, the d-pad or WASD. A ring on the sand shows where the ball comes down: run into it. It shrinks as the ball falls and turns gold in the PERFECT window.', 'ring'],
  ['Bump, set, spike', 'One button does it all. Press {play} as the ball reaches you: the first touch bumps, the second sets, the third spikes. You jump on your own for the spike: press at the top.', 'chain'],
  ['Aiming and shots', 'Hold the stick as you hit to aim: toward the net for short, away for deep, up or down for the lines. With a mouse, point at their court. {shot} plays a soft cut shot that floats over the block.', 'aim'],
  ['Serving', 'Walk along the baseline. {play} tosses a float serve, {shot} a jump serve. Press again at the top of the toss. Late, early or slow serves go wide or into the net.', 'serve'],
  ['Blocking and diving', 'When they attack near the net, press {shot} to jump and block. Time it with their hit. Out of reach? {dive} lunges for a dig.', 'block'],
  ['Calls and chemistry', '{call} calls Mine, Yours or Auto, and your partner listens. The better you get along, the better your partner passes, sets and covers.', 'call'],
  ['The vacation', 'Five days, each a Morning, an Afternoon and a Night. Visiting a place or playing a match uses the slot. Matches pay Sonny Dollars; nights are for the casino or the villa.', 'map'],
  ['Friends and gifts', 'Talk to the fighters, learn what they like and bring gifts. Hearts show your friendship. Friends team up with you; strangers decline. Lose too often and partners walk.', 'gift'],
  ['Casino and Pool Hop', 'Pool Hop: press the button shown on each pad as you land, on the beat. Casino Fortuna at night: Fortuna Sevens slots, blackjack and roulette. Chips cash out at S$100.', 'pool'],
  ['Postcards', 'Pause and choose Take a Postcard (or {snap}) to freeze the moment. Orbit, zoom, pose everyone, add a filter and a frame. Your album keeps up to 24.', 'photo']
];
G.HowTo = class {
  constructor(back) { this.page = 0; this.back = back; this.t = 0; this.focus = new G.Focus(); this.rig = G.anim.rig(G.makeRig('tess', { size: 1.6 })); }
  update(dt, I = G.game.input) {
    this.t += dt; const f = this.focus.set(this.items()).update(I);
    if (f.back || I.pressed('pause')) { this.back(); return true; }
    if (f.tabR || I.repeat('right', .35, .2) || (f.pick && f.pick.id === 'next')) { this.page = (this.page + 1) % G.HOWTO.length; this.t = 0; G.sfx('ui_tab'); }
    if (f.tabL || I.repeat('left', .35, .2) || (f.pick && f.pick.id === 'prev')) { this.page = (this.page + G.HOWTO.length - 1) % G.HOWTO.length; this.t = 0; G.sfx('ui_tab'); }
    if (f.pick && f.pick.id === 'done') this.back();
    const demo = G.HOWTO[this.page][2], u = (this.t % 2) / 2;
    const move = { ring: 'ready', chain: ['bump', 'set', 'spike'][Math.floor(this.t / 1.2) % 3], aim: 'spike', serve: u < .5 ? 'toss' : 'serve', block: 'block', call: 'call', map: 'wave', gift: 'give', pool: null, photo: 'peace' }[demo];
    this.rig.vb = move ? { kind: move, u: (this.t % 1.2) / 1.2, w: 1 } : null;
    this.rig.update(dt, { x: 0, y: 0, z: demo === 'block' || (demo === 'chain' && move === 'spike') ? Math.abs(Math.sin(this.t * 2.6)) * 8 : 0, facing: .3, pose: demo === 'pool' ? 'cheer' : null, expr: 'smile' });
    return true;
  }
  items() { const W = G.game.W, H = G.game.H, y = Math.round(H * .84) - 6; return [{ id: 'prev', label: '◀ Prev', x: Math.round(W / 2) - 150, y, w: 80, h: 18 }, { id: 'done', label: 'Done', x: Math.round(W / 2) - 40, y, w: 80, h: 18 }, { id: 'next', label: 'Next ▶', x: Math.round(W / 2) + 70, y, w: 80, h: 18 }]; }
  draw(r, I = G.game.input) {
    r.overlay(g => {
      const W = r.W, H = r.H, [title, text, demo] = G.HOWTO[this.page];
      px.blend(g, .8, 'normal', () => px.rect(g, 0, 0, W, H, '#061a24'));
      G.UI.panel(g, Math.round(W * .05), Math.round(H * .06), Math.round(W * .9), Math.round(H * .76));
      E.font.text(g, 'HOW TO PLAY  ' + (this.page + 1) + ' / ' + G.HOWTO.length, Math.round(W * .05) + 10, Math.round(H * .06) + 8, '#9fd3d6', { outline: false });
      G.UI.heading(g, title, Math.round(W * .05) + 10, Math.round(H * .06) + 20);
      const tw = Math.round(W * .5), lines = E.font.wrap(G.fillTips(text, I), tw);
      lines.forEach((l, k) => E.font.text(g, l, Math.round(W * .05) + 10, Math.round(H * .06) + 44 + k * 11, '#fff8e8', { shadow: '#000', outline: false }));
      // the live mini scene
      const bx = Math.round(W * .62), by = Math.round(H * .16), bw = Math.round(W * .3), bh = Math.round(H * .58);
      E.ui.box(g, bx, by, bw, bh, { bg: ['#7ccaf0', '#f3d9a4'], border: '#f6d38a' });
      px.rect(g, bx + 2, by + Math.round(bh * .55), bw - 4, Math.round(bh * .45) - 2, '#f3d9a4');
      this.rig.draw(g, bx + bw / 2, by + Math.round(bh * .85), G.VIEW_COURT);
      if (demo === 'ring' || demo === 'chain') { const rr = 4 + (1 - (this.t % 1)) * 14; px.ell(g, bx + bw / 2 + 12, by + Math.round(bh * .85), rr, rr * .5, (this.t % 1) > .85 ? '#ffd36a' : '#ffffff'); px.ell(g, bx + bw / 2 + 12, by + Math.round(bh * .85), Math.max(1, rr - 1), Math.max(1, rr * .5 - 1), '#f3d9a4'); }
      if (demo === 'pool') { for (let k = 0; k < 4; k++) { const x = bx + 12 + k * (bw - 24) / 3; px.ell(g, x, by + bh * .75, 9, 4, '#ffd04a'); G.drawGlyph(g, x - 4, by + bh * .75 - 14, G.codeFor(['hopA', 'hopB', 'hopX', 'hopY'][k], I) || 'Pad' + k, I); } }
      if (demo === 'gift') { px.rect(g, bx + bw / 2 + 8, by + bh * .6, 8, 7, '#ff6a3a'); px.rect(g, bx + bw / 2 + 11, by + bh * .6, 2, 7, '#ffffff'); }
      if (demo === 'photo') { px.rect(g, bx + 4, by + 4, bw - 8, 2, '#ffffff'); px.rect(g, bx + 4, by + bh - 6, bw - 8, 2, '#ffffff'); }
      this.items().forEach((it, k) => G.UI.button(g, it, k === this.focus.i));
    });
    G.promptBar(r, [['tabL', 'Prev'], ['tabR', 'Next'], ['cancel', 'Back']], I);
  }
};
G.SCENES.howto = {
  input: G.INPUT.MENU,
  enter(d) { this.from = (d && d.from) || 'menu'; this.h = new G.HowTo(() => G.go(this.from, null, { fade: .2 })); G.music('sunrise'); },
  update(dt) { G.howtoPoolBinds(); this.h.update(dt); },
  draw(r) { G.backdrop('afternoon').draw(r); this.h.draw(r); }
};
G.howtoPoolBinds = () => { const I = G.game.input; for (const a of ['hopA', 'hopB', 'hopX', 'hopY']) if (!I.map[a]) I.map[a] = G.INPUT.POOLHOP[a]; };
G.howtoOverlay = () => {
  const prev = G.game.input.preset;
  G.game.input.use(Object.assign({}, prev || G.INPUT.MENU, G.INPUT.MENU));
  const o = { kind: 'howto', modal: true, h: null,
    open() { this.ts = G.game.timeScale; G.game.timeScale = 0; this.h = new G.HowTo(() => { G.overlay.remove(this); }); },
    close() { G.game.timeScale = this.ts || 1; if (prev) G.game.input.use(prev); },
    update(dt) { return this.h.update(1 / 120); }, draw(r) { this.h.draw(r); } };
  return o;
};
/* ---- About & Credits: pages turned with L1/R1, left/right or the arrows; the stick scrolls ---- */
G.SCENES.about = {
  input: G.INPUT.MENU,
  enter() { this.page = 0; this.scroll = 0; this.focus = new G.Focus(); G.music('farewell'); },
  items() { const W = G.game.W, H = G.game.H, y = Math.round(H * .9); return [{ id: 'prev', label: '◀', x: Math.round(W * .05), y, w: 30, h: 16 }, { id: 'back', label: 'Back', x: Math.round(W / 2) - 35, y, w: 70, h: 16 }, { id: 'next', label: '▶', x: Math.round(W * .95) - 30, y, w: 30, h: 16 }]; },
  update(dt) {
    const I = G.game.input, f = this.focus.set(this.items()).update(), n = G.ABOUT.length;
    if (f.back || I.pressed('pause') || (f.pick && f.pick.id === 'back')) { G.go('menu', null, { fade: .2 }); return; }
    if (f.tabR || I.repeat('right', .35, .2) || (f.pick && f.pick.id === 'next')) { this.page = (this.page + 1) % n; this.scroll = 0; }
    if (f.tabL || I.repeat('left', .35, .2) || (f.pick && f.pick.id === 'prev')) { this.page = (this.page + n - 1) % n; this.scroll = 0; }
    const m = I.move(); this.scroll = clamp(this.scroll + m[1] * 120 * dt, 0, this.maxScroll || 0);
  },
  draw(r) {
    G.backdrop('night').draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H, [title, rowsF] = G.ABOUT[this.page], rows = rowsF(), x = Math.round(W * .06), w = Math.round(W * .88), top = Math.round(H * .06) + 30, bottom = Math.round(H * .86);
      G.UI.panel(g, Math.round(W * .04), Math.round(H * .04), Math.round(W * .92), Math.round(H * .84), { bg: ['#2a1240', '#12081e'], border: '#ff5fa2' });
      E.font.text(g, 'ABOUT & CREDITS  ' + (this.page + 1) + ' / ' + G.ABOUT.length, x, Math.round(H * .06), '#c8a8e0', { outline: false });
      G.UI.heading(g, title, x, Math.round(H * .06) + 10);
      let y = top - this.scroll;
      for (const [k, v] of rows) {
        const lines = E.font.wrap(v, w - (k ? 4 : 0));
        if (k) { if (y > top - 10 && y < bottom) E.font.text(g, k, x, y, '#ffd36a', { outline: false, shadow: '#000' }); y += 10; }
        for (const l of lines) { if (y > top - 10 && y < bottom) E.font.text(g, l, x + (k ? 4 : 0), y, '#fff8e8', { outline: false, shadow: '#000' }); y += 9; }
        y += 4;
      }
      this.maxScroll = Math.max(0, y + this.scroll - bottom);
      if (this.maxScroll > 0) { const sh = bottom - top, k = this.scroll / this.maxScroll; px.rect(g, Math.round(W * .94), top, 2, sh, '#4a2a5a'); px.rect(g, Math.round(W * .94), top + Math.round(k * (sh - 10)), 2, 10, '#ff5fa2'); }
      this.items().forEach((it, k) => G.UI.button(g, it, k === this.focus.i));
    });
    G.promptBar(r, [['tabL', 'Page'], ['tabR', 'Page'], ['down', 'Scroll'], ['cancel', 'Back']], G.game.input, Math.round(r.H * .9) - 14);
  }
};
