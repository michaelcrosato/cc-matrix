/* 31-map: the island map. Pins for the places (closed ones greyed, the Dock for departures only); the stick jumps between
 * pins; confirm opens the location card and travels; the header shows the clock, the money and the day's weather. */
G.mapScene = {
  enter(data) {
    const st = G.state;
    this.afterLocation = !!(data && data.afterLocation);
    if (this.afterLocation) {
      const r = G.advanceSlot();
      if (r === 'dayEnd') return G.game.go('dayend', {});
    }
    G.game.audio.music && G.music('island');
    G.game.setView(E.VIEWS.iso);
    this.bg = new E.Backdrop('day');
    this.items = G.PLACE_ORDER.map(id => ({ id, label: G.PLACES[id].name }));
    this.list = new G.List({ items: this.buildItems(), x: 14, y: 52, w: 150, rowH: 22, max: 6, scale: 1 });
    this.card = null;
    const ev = G.storyDue && G.storyDue('map');
    if (ev) G.game.go('story', { event: ev });
    if (G.state.slot === 0 && !G.state.dayAnnounced) { G.state.dayAnnounced = G.state.day; G.toast('Day ' + G.state.day + ' · ' + G.WEATHER_LABEL[G.weatherNow()]); G.sfx('daystart'); }
  },
  isOpen(id) {
    const P = G.PLACES[id], slot = G.SLOTS[G.state.slot].toLowerCase();
    if (P.storyOnly) return false;
    return P.open.includes(slot);
  },
  buildItems() {
    return G.PLACE_ORDER.map(id => {
      const P = G.PLACES[id], open = this.isOpen(id);
      return { label: P.name, disabled: !open, id, sub: open ? P.blurb : (P.storyOnly ? 'Departures only' : 'Closed right now'), onPick: () => { if (open) G.game.go('location', { place: id }); else G.sfx('ui_error'); } };
    });
  },
  update(dt) {
    const I = G.game.input;
    if (I.pressed('bag') || I.pressed('alt')) { G.game.go('journal', { back: 'map' }); return; }
    if (I.pressed('extra')) { G.game.go('journal', { back: 'map', tab: 'friends' }); return; }
    if (I.pressed('cancel') || I.pressed('pause')) { /* the pause menu handles pause */ }
    this.list.items = this.buildItems();
    const pick = this.list.update(I, dt);
    if (pick && pick.item && pick.item.onPick && !pick.item.disabled) { /* picked */ }
    const it = this.list.items[this.list.i]; this.card = it ? G.PLACES[it.id] : null;
  },
  draw(r) {
    const st = G.state, W = r.W, H = r.H;
    this.bg.draw(r);
    r.overlay(g => {
      // the island: a rough outline with pins on it
      const cx = W * .62, cy = H * .52, rx = W * .34, ry = H * .36;
      const pts = [];
      for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2, wob = 1 + .08 * Math.sin(a * 5) + .05 * Math.cos(a * 3); pts.push([cx + Math.cos(a) * rx * wob, cy + Math.sin(a) * ry * wob]); }
      E.px.poly(g, pts, '#2f8f4e');
      const inner = pts.map(p => [cx + (p[0] - cx) * .92, cy + (p[1] - cy) * .92]);
      E.px.poly(g, inner, G.SHOW_NIGHT ? '#3a6a4a' : '#5fc35a');
      E.px.poly(g, pts.map(p => [cx + (p[0] - cx) * .98, cy + (p[1] - cy) * .98]).slice(0, 0), '#000');
      E.px.disc(g, cx + rx * .45, cy - ry * .55, 7, '#c8502c');
      E.px.disc(g, cx + rx * .45, cy - ry * .55, 3, '#3a2014');
      for (const id of G.PLACE_ORDER) {
        const P = G.PLACES[id], px = W * P.pin[0] * .55 + W * .2, py = H * P.pin[1] * .75 + H * .12;
        const open = this.isOpen(id), focused = this.list.items[this.list.i] && this.list.items[this.list.i].id === id;
        E.px.disc(g, px, py, focused ? 6 : 4, open ? (focused ? '#ffd36a' : '#fff8e8') : '#6a7a7e');
        if (focused) E.px.disc(g, px, py, 2, '#1a1a24');
        E.font.text(g, P.name, px + 7, py - 4, open ? '#fff8e8' : '#8aa0a4', { shadow: '#000', scale: 1 });
      }
    });
    this.list.draw(r);
    r.overlay(g => {
      E.ui.box(g, W - 170, 6, 164, 30, { bg: ['#0a2d3d', '#051a26'], border: '#f6d38a', alpha: .9 });
      E.font.text(g, G.SLOTS[st.slot] + ' · Day ' + st.day, W - 162, 12, '#fff8e8', { shadow: '#000' });
      E.font.text(g, G.WEATHER_LABEL[G.weatherNow()], W - 162, 23, '#9fd3d6', { shadow: '#000' });
      E.font.text(g, G.fmtMoney(st.money), W - 8, 12, '#ffd36a', { align: 'right', scale: 2, shadow: '#000' });
    });
    const card = this.card;
    if (card) r.overlay(g => {
      E.ui.box(g, 14, H - 62, W - 28, 44, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .92 });
      E.font.text(g, card.name, 22, H - 56, '#ffd36a', { scale: 2, shadow: '#000' });
      E.font.text(g, card.blurb, 22, H - 36, '#fff8e8', { shadow: '#000' });
    });
    G.promptBar(r, [['confirm', 'Go'], ['alt', 'Journal'], ['extra', 'Friends']]);
  }
};
G.storyDue = function (where) { return G.storyPending ? G.storyPending(where) : null; };
