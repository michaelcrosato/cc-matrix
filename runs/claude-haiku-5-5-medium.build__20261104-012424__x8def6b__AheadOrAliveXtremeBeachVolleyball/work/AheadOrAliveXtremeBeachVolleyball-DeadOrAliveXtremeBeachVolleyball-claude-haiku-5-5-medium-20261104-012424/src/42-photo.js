/* 42-photo: postcards (photo mode) and the album. A photo is saved as a spec (where, when, the pose, the filter, the frame),
 * never as pixels. The album shows each postcard as a framed card. */
G.POSES = ['Wave', 'Peace', 'Hips', 'Cheer', 'Stretch', 'Look Back', 'Sit', 'Victory', 'Salute', 'Bow'];
G.POSE_STATE = { Wave: { pose: 'wave' }, Peace: { pose: 'wave' }, Hips: { pose: 'hips' }, Cheer: { pose: 'cheer' }, Stretch: {}, 'Look Back': {}, Sit: { pose: 'kneel' }, Victory: { pose: 'cheer' }, Salute: { pose: 'cheer' }, Bow: { pose: 'kneel' } };
G.FILTERS = ['Clean', 'Sunny', 'Sepia', 'Retro', 'Night Glow'];
G.photoScene = {
  enter(data) {
    this.from = data.from || 'location'; this.place = data.place || 'beach';
    this.pose = 0; this.filter = 0; this.zoom = 1; this.panel = false; this.hideUi = false;
    this.flash = 0; this.last = null; this.bg = new E.Backdrop('dusk');
    this.rig = G.rigFor(G.state.me, { suit: G.state.wearing.suit, acc: G.state.wearing.acc });
    this.freeze = G.attractOn ? null : G.game.after(.5, () => { G.game.timeScale = 0; });
    this.t = 0;
  },
  exit() { if (this.freeze && this.freeze.cancel) this.freeze.cancel(); G.game.timeScale = 1; },
  update(dt) {
    const I = G.game.input; this.t += dt;
    if (this.flash > 0) this.flash -= dt;
    if (I.pressed('cancel')) return G.game.go(this.from === 'location' ? 'location' : 'map', { place: this.place });
    if (I.pressed('hideUi')) this.hideUi = !this.hideUi;
    if (I.pressed('subject')) { this.group = !this.group; G.toast(this.group ? 'Group photo' : 'Just you'); }
    if (I.pressed('panel')) this.panel = !this.panel;
    if (this.panel) { if (I.pressed('left')) this.pose = (this.pose + G.POSES.length - 1) % G.POSES.length; if (I.pressed('right')) this.pose = (this.pose + 1) % G.POSES.length; if (I.pressed('confirm')) { this.filter = (this.filter + 1) % G.FILTERS.length; } return; }
    if (I.pressed('shoot')) this.take();
  },
  take() {
    const st = G.state;
    const spec = { place: this.place, day: st.day, slot: st.slot, weather: G.weatherNow(), pose: G.POSES[this.pose], filter: G.FILTERS[this.filter], frame: 'postcard', who: st.me, suit: st.wearing.suit, acc: st.wearing.acc.slice(), t: Math.round(this.t) };
    st.album = st.album || [];
    if (st.album.length >= 24) { G.toast('The album is full: 24 postcards'); return; }
    spec.people = [{ who: st.me, suit: st.wearing.suit, acc: st.wearing.acc.slice(), x: 0 }].concat(G.npcsAt(this.place, st.slot).slice(0, this.group ? 2 : 0).map(f => ({ who: f, suit: st.npcWear[f].suit, acc: (st.npcWear[f].acc || []).slice(), x: 0 })));
    st.album.push(spec); st.stats.photos = (st.stats.photos || 0) + 1;
    this.flash = .25; G.sfx('shutter');
    this.last = spec; G.toast('Postcard saved');
  },
  draw(r) {
    const W = r.W, H = r.H;
    this.bg.draw(r);
    const pose = G.POSE_STATE[G.POSES[this.pose]] || {};
    r.actor(0, 0, 0, (g, ox, oy) => { this.rig.draw(g, ox, oy, r.view); G.dress(g, r, this.rig, ox, oy); }, { pick: 'photo' });
    if (this.flash > 0) r.overlay(g => E.px.rect(g, 0, 0, W, H, '#ffffff'));
    if (!this.hideUi) {
      r.overlay(g => {
        E.font.text(g, 'POSTCARD · ' + G.POSES[this.pose] + ' · ' + G.FILTERS[this.filter], 8, 8, '#fff8e8', { shadow: '#000' });
        E.font.text(g, 'Album ' + ((G.state.album || []).length) + '/24', W - 8, 8, '#9fd3d6', { align: 'right', shadow: '#000' });
      });
      if (this.panel) { r.overlay(g => { E.ui.box(g, W - 130, 30, 124, 70, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .95 }); E.font.text(g, 'Pose ◂ ▸', W - 122, 36, '#fff8e8', { shadow: '#000' }); E.font.text(g, 'Filter ✕', W - 122, 50, '#fff8e8', { shadow: '#000' }); }); }
      G.promptBar(r, [['shoot', 'Shoot'], ['panel', 'Panel'], ['cancel', 'Exit']]);
    }
    if (this.last && this.t < 3) r.overlay(g => { E.ui.box(g, 10, H - 80, 140, 40, { bg: ['#fff8e8', '#e8e0cc'], border: '#c8502c', alpha: 1 }); E.font.text(g, 'Greetings from', 16, H - 74, '#c8502c', { scale: 1 }); E.font.text(g, 'Isla Fortuna', 16, H - 62, '#1a1a24', { scale: 1 }); E.font.text(g, 'Day ' + this.last.day, 16, H - 52, '#1a1a24', { scale: 1 }); });
  }
};
G.albumScene = {
  enter(data) {
    this.from = data.from || 'menu'; this.bg = new E.Backdrop('dusk');
    const album = (G.state && G.state.album) || E.store.get('aoa-album', []);
    this.items = album.map((sp, i) => ({ id: i, sp }));
    this.grid = new G.Grid({ items: this.items.length ? this.items : [{ id: -1, sp: null }], cols: 4, rows: 2, x: 16, y: 46, cw: 100, ch: 74, gap: 6 });
    this.from = data.from || 'menu';
    this.box = G.box;
  },
  update(dt) {
    const I = G.game.input;
    if (this.box.open) { this.box.update(I, dt); return; }
    if (I.pressed('cancel')) return G.game.go(this.from === 'menu' ? 'menu' : 'map', {});
    const hit = this.grid.update(I, dt);
    if (hit && hit.confirm && hit.item.sp) G.game.go('postcard', { spec: hit.item.sp, back: 'album' });
  },
  draw(r) {
    this.bg.draw(r);
    G.screenTitle(r, 'ALBUM', (this.items.length) + ' postcards');
    this.grid.draw(r, (g, it, x, y, w, h, focused) => {
      if (!it.sp) { E.font.text(g, 'No postcards yet', x + 6, y + 26, '#9fd3d6', { scale: 1, shadow: '#000' }); return; }
      E.ui.box(g, x, y, w, h, { bg: ['#fff8e8', '#e8e0cc'], border: '#c8502c', alpha: 1 });
      E.font.text(g, G.PLACES[it.sp.place].name, x + 5, y + 4, '#1a1a24', { scale: 1 });
      E.font.text(g, 'Day ' + it.sp.day + ' · ' + G.SLOTS[it.sp.slot], x + 5, y + 14, '#1a1a24', { scale: 1 });
      // a live thumbnail: the saved fighter in her suit and pose, drawn into the card
      const people = it.sp.people || [{ who: it.sp.who, suit: it.sp.suit, acc: it.sp.acc }];
      people.slice(0, 3).forEach((pe, i) => { const rig = G.beatRig(pe.who, { suit: pe.suit, acc: pe.acc }); rig.update(.02, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: .4, pose: (G.POSE_STATE[it.sp.pose] || {}).pose || null }); rig.draw(g, x + w / 2 + (i - (Math.min(3, people.length) - 1) / 2) * 18, y + h - 6, r.view); });
    });
    G.promptBar(r, [['confirm', 'View'], ['cancel', 'Back']]);
    this.box.draw(r);
  }
};
/* a saved postcard, re-rendered live: the fighter in the suit and accessories she wore, in the pose and with the filter it was
 * taken with, on a backdrop for the time of day it was taken */
G.FILTER_TINT = { 'Clean': null, 'Sunny': ['#ffb040', .18], 'Sepia': ['#a07040', .35], 'Retro': ['#40a0c0', .22], 'Night Glow': ['#5040a0', .3] };
/* R1: the screen as a PNG, downloaded (in a browser only) */
G.exportPng = function (spec) {
  try {
    const cv = G.game.screen && G.game.screen.canvas;
    if (!cv || typeof document === 'undefined') return;
    const a = document.createElement('a');
    a.href = cv.toDataURL('image/png'); a.download = 'postcard-' + spec.place + '-day' + spec.day + '.png';
    document.body.appendChild(a); a.click(); a.remove();
    G.toast('Postcard saved as PNG');
  } catch (e) { G.toast('PNG export is not available here'); }
};
/* the party's group photo, taken by the game: everyone who is still on the island and the photographer */
G.groupPhoto = function () {
  const st = G.state, who = G.NPCS.filter(f => f !== st.me).sort((a, b) => (st.aff[b] || 0) - (st.aff[a] || 0)).slice(0, 3);
  const spec = { place: 'beach', day: st.day, slot: 2, weather: G.weatherNow(), pose: 'Cheer', filter: 'Night Glow', who: st.me, suit: st.wearing.suit, acc: st.wearing.acc.slice(), frame: 'postcard', t: 0, group: true,
    people: [{ who: st.me, suit: st.wearing.suit, acc: st.wearing.acc.slice(), x: 0 }].concat(who.map(f => ({ who: f, suit: st.npcWear[f].suit, acc: (st.npcWear[f].acc || []).slice(), x: 0 }))) };
  st.album = st.album || [];
  if (st.album.length < 24) st.album.push(spec);
  return spec;
};
G.postcardScene = {
  enter(data) {
    this.spec = data.spec; this.back = data.back || 'album';
    this.rig = G.rigFor(this.spec.who, { suit: this.spec.suit, acc: this.spec.acc });
    this.bg = new E.Backdrop(this.spec.slot === 2 ? 'night' : 'dusk');
    this.t = 0;
    G.music(this.spec.slot === 2 ? 'siesta' : 'island');
  },
  update(dt) {
    const I = G.game.input; this.t += dt;
    if (I.pressed('cancel') || I.pressed('confirm')) return G.game.go(this.back, {});
    if (I.pressed('extra')) G.exportPng(this.spec);
    const st = G.POSE_STATE[this.spec.pose] || {};
    this.rig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.sin(this.t * .3) * .4, pose: st.pose || null });
  },
  draw(r) {
    const W = r.W, H = r.H, sp = this.spec;
    this.bg.draw(r);
    const people = sp.people || [{ who: sp.who, suit: sp.suit, acc: sp.acc }], n = people.length;
    people.forEach((pe, i) => { const rig = i === 0 ? this.rig : G.beatRig(pe.who, { suit: pe.suit, acc: pe.acc }); if (i > 0) rig.update(.02, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0, pose: 'wave' }); const ox0 = (i - (n - 1) / 2) * 56; r.actor(ox0, 0, 0, (g, ox, oy) => { rig.draw(g, ox, oy, r.view); G.dress(g, r, rig, ox, oy); }, { pick: 'postcard' + i }); });
    const tint = G.FILTER_TINT[sp.filter];
    if (tint) r.overlay(g => E.px.blend(g, tint[1], 'multiply', () => E.px.rect(g, 0, 0, W, H, tint[0])));
    r.overlay(g => {
      E.ui.box(g, 10, 10, W - 20, 26, { bg: ['#fff8e8', '#e8e0cc'], border: '#c8502c', alpha: .95 });
      E.font.text(g, 'Greetings from ' + G.PLACES[sp.place].name, W / 2, 16, '#c8502c', { align: 'center', scale: 2 });
      E.font.text(g, 'Day ' + sp.day + ' · ' + G.SLOTS[sp.slot] + ' · ' + sp.weather + ' · ' + sp.pose + ' · ' + sp.filter, W / 2, H - 36, '#fff8e8', { align: 'center', shadow: '#000' });
    });
    G.promptBar(r, [['confirm', 'Back to album'], ['extra', 'Save PNG']]);
  }
};
