/* 42-photo: postcards (photo mode), the album, and the postcard painter used by the title. */
G.POST_CAPTIONS = ['Wish you were here (I am winning)', 'Greetings from Isla Fortuna!', 'Sunscreen: applied. Dignity: pending.', 'The sea says hi. It also says "pay up".', 'Tan lines are a love language', 'Day well spent, sand well kicked'];
G.FILTERS = [['Normal', null], ['Sunset', ['#ff8a3a', .22]], ['Noir', ['#000000', .0]], ['Lagoon', ['#2ab8e0', .2]], ['Rose', ['#ff4f8a', .18]]];
const imgCache = {};
G.drawPostcard = (g, card, x, y, w, h) => {
  if (card.img && typeof Image !== 'undefined') {
    let im = imgCache[card.id];
    if (!im) { im = imgCache[card.id] = new Image(); im.src = card.img; }
    if (im.complete && im.naturalWidth) { try { g.drawImage(im, x, y, w, h); return; } catch (e) { /* fall through */ } }
  }
  // procedural fallback: a sunset postcard
  const bands = ['#2a1a5a', '#8a2a7a', '#ff6a5a', '#ffb347', '#ffe08a']; bands.forEach((c, i) => px.rect(g, x, y + Math.floor(i * h * .5 / 5), w, Math.ceil(h * .5 / 5) + 1, c));
  px.rect(g, x, y + Math.round(h * .5), w, Math.round(h * .2), '#1a6a9a'); px.rect(g, x, y + Math.round(h * .7), w, h - Math.round(h * .7), '#f2d79a'); px.disc(g, x + Math.round(w * .7), y + Math.round(h * .5), 14, '#fff2c8');
  E.font.title(g, 'GREETINGS', x + w / 2, y + 8, { align: 'center', scale: 1, colors: ['#fff6c8', '#ffd24a'], depth: 1 });
};

G.openPhoto = (place) => {
  const game = G.game; if (G.overlay.has('photo')) return;
  const s = G.state; if (!s) return;
  const ov = {
    name: 'photo', t: 0, fi: 0, zoom: 1, px: 0, py: 0, shot: 0, flash: 0, place: place || 'Isla Fortuna',
    enter() { this.px = game.cam.tx || 0; this.py = game.cam.ty || 0; this.zoom0 = game.zoom || 1; G.sfx('confirm'); },
    exit() { game.setZoom && game.setZoom(this.zoom0 || 1); },
    update(dt) {
      const I = game.input; this.t += dt;
      if (this.shot > 0) { this.shot--; if (this.shot === 0) this.capture(); return true; }
      if (this.flash > 0) this.flash -= dt;
      const mv = I.move(); const sc = this.scene = game.scene;
      if (sc && sc.me) { /* the scene keeps its camera; photo pans a free offset */ }
      this.px += mv[0] * 60 * dt; this.py += mv[1] * 60 * dt; game.focus((game.cam.tx || 0) * 0 + this.px, this.py, 10);
      if (I.pressed('tab')) { this.fi = (this.fi + 4) % 5; G.sfx('select'); } if (I.pressed('tabNext')) { this.fi = (this.fi + 1) % 5; G.sfx('select'); }
      if (I.down('play') || I.down('confirm')) { /* handled on press below */ }
      if (I.pressed('confirm') || I.pressed('play')) { this.shot = 2; this.flash = .3; G.sfx('shutter'); }
      if (I.pressed('cancel') || I.pressed('photo')) { G.overlay.pop(this); }
      const z = I.zoom && I.zoom(); if (z) { this.zoom = clamp(this.zoom * z, .8, 2.5); game.setZoom && game.setZoom(this.zoom); }
      if (I.pressed('up') && I.down('dive')) { this.zoom = clamp(this.zoom + .25, .8, 2.5); game.setZoom && game.setZoom(this.zoom); }
      return true;
    },
    capture() {
      const buf = game.screen && game.screen.buf; let img = null;
      try { if (buf && typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = 160; c.height = 90; const cx = c.getContext('2d'); cx.imageSmoothingEnabled = false; cx.drawImage(buf, 0, 0, buf.width, buf.height, 0, 0, 160, 90); img = c.toDataURL('image/jpeg', .75); } } catch (e) { img = null; }
      const who = (game.scene && game.scene.npcs ? game.scene.npcs.map(n => n.id) : []);
      const card = { id: 'pc' + Date.now() % 1e9 + s.album.length, loc: this.place, day: Math.min(5, s.day), slot: Math.min(2, s.slot), caption: G.rpick(G.POST_CAPTIONS, 'cosmetic'), img, who, filter: this.fi };
      s.album.push(card); s.stats.postcards = s.album.length; if (s.album.length > 12) s.album.shift();
      try { if (img) E.store.set('aoa-postcard', img); } catch (e) { /* blocked */ }
      G.toast('Postcard saved to the album!', '#9bffb0'); G.bus.emit('photo', { card });
    },
    draw(r) {
      if (this.shot > 0) return;
      const W = r.W, H = r.H, f = G.FILTERS[this.fi][1];
      r.overlay(g => {
        if (f && f[1] > 0) { px.blend ? px.blend(g, f[1], 'multiply', () => px.rect(g, 0, 0, W, H, f[0])) : 0; }
        if (this.fi === 2) { px.blend ? px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, W, H, '#555555')) : 0; }
        // frame and thirds
        px.rect(g, 0, 0, W, 10, '#000000aa'); px.rect(g, 0, H - 10, W, 10, '#000000aa'); px.rect(g, 0, 0, 10, H, '#000000aa'); px.rect(g, W - 10, 0, 10, H, '#000000aa');
        for (const k of [1, 2]) { px.rect(g, Math.round(W * k / 3), 10, 1, H - 20, '#ffffff33'); px.rect(g, 10, Math.round(H * k / 3), W - 20, 1, '#ffffff33'); }
        G.text(g, 'POSTCARD  ' + G.FILTERS[this.fi][0].toUpperCase(), W / 2, 2, '#fff6c8', { align: 'center' });
        if (this.flash > 0) px.rect(g, 0, 0, W, H, '#ffffff');
      });
      G.drawPrompts(r, [['confirm', 'Shoot'], ['tab', 'Filter -'], ['tabNext', 'Filter +'], ['cancel', 'Exit']]);
    }
  };
  G.overlay.push(ov);
  return ov;
};
