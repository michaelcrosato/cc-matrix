/* 33-shop: the shops (Riptide Sports, Coral Couture, Sundries & Smiles), the wardrobe, the journal and the mailbox. */
G.priceFor = function (id, shop) {
  const st = G.state, base = G.itemPrice(id);
  const deal = (st.shopDeals[shop] || []).includes(id);
  return { price: Math.round(deal ? base * .75 : base), deal, base };
};
G.ownsSuit = (id) => G.state.wardrobe.suits.includes(id);
G.ownsAcc = (id) => G.state.wardrobe.acc.includes(id);
G.buyItem = function (id, shop) {
  const st = G.state, pr = G.priceFor(id, shop);
  if (G.SUITS[id]) { if (G.ownsSuit(id)) return 'owned'; }
  if (G.ACCESSORIES[id]) { if (G.ownsAcc(id)) return 'owned'; }
  if (st.money < pr.price) return 'poor';
  G.spend(pr.price);
  if (G.SUITS[id]) st.wardrobe.suits.push(id);
  else if (G.ACCESSORIES[id]) st.wardrobe.acc.push(id);
  else st.bag[id] = (st.bag[id] || 0) + 1;
  st.stats.suitsOwned = st.wardrobe.suits.length;
  G.sfx('cash');
  return 'bought';
};
G.shopScene = {
  enter(data) {
    this.shop = data.shop || 'sundries'; this.back = data.back || 'map'; this.place = data.place;
    this.S = G.SHOPS[this.shop];
    this.tab = 0; this.tabs = this.S.cats;
    this.preview = null; this.confirmFor = null;
    this.box = G.box;
    this.build();
    G.music('boutique');
    this.box.say(G.SHOP_QUIPS[this.S.keeper][0], { name: G.CAST[this.S.keeper] ? G.CAST[this.S.keeper].short : G.STAFF[this.S.keeper].short, prof: (G.CAST[this.S.keeper] || G.STAFF[this.S.keeper]).voice });
    this.bg = new E.Backdrop('day');
  },
  build() {
    const list = G.itemsForShop(this.shop, G.state.day);
    const cat = this.tabs[this.tab];
    const ids = cat === 'suits' ? list.suits : cat === 'acc' ? list.acc : list.gifts;
    this.ids = ids;
    this.grid = new G.Grid({ items: ids.map(id => ({ id, cat })), cols: 3, rows: 2, x: 16, y: 46, cw: 100, ch: 52, gap: 6 });
  },
  update(dt) {
    const I = G.game.input;
    if (this.box.open) { this.box.update(I, dt); return; }
    if (this.confirmFor) return this.updateConfirm(I);
    if (I.pressed('cancel')) return this.leave();
    if (I.pressed('tabR')) { this.tab = (this.tab + 1) % this.tabs.length; this.build(); }
    if (I.pressed('tabL')) { this.tab = (this.tab + this.tabs.length - 1) % this.tabs.length; this.build(); }
    const hit = this.grid.update(I, dt);
    if (this.grid.items.length) {
      const cur = this.grid.items[this.grid.i];
      if (cur && (!this.preview || this.preview.id !== cur.id)) this.setPreview(cur.id);
    }
    if (hit && (hit.confirm || hit.click)) {
      const it = hit.item.id;
      if (this.tabs[this.tab] === 'gifts' || G.GIFTS[it]) { this.askBuy(it); return; }
      this.askBuy(it);
    }
    if (I.pressed('alt') && this.preview) this.previewWorn = !this.previewWorn;
  },
  setPreview(id) {
    this.preview = { id, rig: null };
    const isSuit = !!G.SUITS[id], isAcc = !!G.ACCESSORIES[id];
    const st = G.state;
    const suit = isSuit ? id : st.wearing.suit, acc = isAcc ? (st.wearing.acc.concat([id])) : st.wearing.acc;
    this.preview.rig = G.rigFor(st.me, { suit, acc: [...new Set(acc)] });
    this.previewWorn = false;
  },
  askBuy(id) {
    const st = G.state, pr = G.priceFor(id, this.shop);
    if (G.SUITS[id] && G.ownsSuit(id)) { this.equip(id); return; }
    if (G.ACCESSORIES[id] && G.ownsAcc(id)) { this.equipAcc(id); return; }
    if (st.money < pr.price) { G.sfx('ui_error'); G.toast('Not enough money: ' + G.fmtMoney(pr.price - st.money) + ' short'); return; }
    this.confirmFor = id;
    this.box.say('Buy ' + G.itemName(id) + ' for ' + G.fmtMoney(pr.price) + '?', { name: 'SHOP', choices: ['Buy', 'Not now'], onChoice: i => { if (i === 0) { const r = G.buyItem(id, this.shop); G.toast(r === 'bought' ? 'Bought ' + G.itemName(id) : 'Could not buy'); if (r === 'bought' && G.SUITS[id]) this.equip(id); } this.confirmFor = null; } });
  },
  updateConfirm() { /* the box owns the input while it is open */ },
  equip(id) { const st = G.state; if (G.SUITS[id]) st.wearing.suit = id; G.toast('Wearing ' + G.SUITS[id].name); },
  equipAcc(id) { const st = G.state; const i = st.wearing.acc.indexOf(id); if (i >= 0) st.wearing.acc.splice(i, 1); else st.wearing.acc.push(id); },
  leave() { G.game.go(this.back, { place: this.place }); },
  draw(r) {
    const st = G.state, W = r.W, H = r.H;
    this.bg.draw(r);
    G.screenTitle(r, this.S.name, 'Keeper: ' + (G.CAST[this.S.keeper] || G.STAFF[this.S.keeper]).short.toLowerCase().replace(/^./, c => c.toUpperCase()));
    r.overlay(g => { E.ui.box(g, W - 190, 40, 180, 22, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .9 }); E.font.text(g, ['SUITS', 'ACCESSORIES', 'GIFTS'][this.tab] || '', W - 182, 46, '#ffd36a', { shadow: '#000' }); E.font.text(g, G.fmtMoney(st.money), W - 14, 46, '#fff8e8', { align: 'right', shadow: '#000' }); });
    this.grid.draw(r, (g, it, x, y, w, h, focused) => {
      const id = it.id, pr = G.priceFor(id, this.shop);
      E.ui.box(g, x, y, w, h, { bg: ['#17495c', '#0c2e3a'], border: null, alpha: .95 });
      const owned = G.SUITS[id] ? G.ownsSuit(id) : G.ACCESSORIES[id] ? G.ownsAcc(id) : false;
      E.font.text(g, G.itemName(id), x + 4, y + 4, '#fff8e8', { scale: 1, shadow: '#000' });
      E.font.text(g, G.fmtMoney(pr.price), x + 4, y + h - 12, pr.deal ? '#7cff9a' : '#ffd36a', { scale: 1, shadow: '#000' });
      if (owned) E.font.text(g, 'OWNED', x + w - 4, y + 4, '#9fd3d6', { scale: 1, align: 'right', shadow: '#000' });
      if (pr.deal) E.font.text(g, '-25%', x + w - 4, y + h - 12, '#7cff9a', { scale: 1, align: 'right', shadow: '#000' });
    });
    // the live preview: the fighter in the focused item, turning on a pedestal
    const pv = this.preview;
    if (pv && pv.rig) {
      const rig = pv.rig;
      r.actor(60, 0, 0, (g, ox, oy) => { rig.draw(g, ox, oy, r.view); G.dress(g, r, rig, ox, oy); }, { pick: 'preview' });
    }
    G.promptBar(r, [['confirm', 'Buy'], ['tabL', 'Tab'], ['cancel', 'Leave']]);
    this.box.draw(r);
  }
};
/* the wardrobe: the suits and accessories owned; equip one, toggle accessories */
G.wardrobeScene = {
  enter(data) {
    this.back = data.back || 'map'; this.place = data.place; this.tab = 0; this.build();
    this.box = G.box; this.bg = new E.Backdrop('night');
    G.music('boutique');
  },
  build() {
    const st = G.state;
    const ids = this.tab === 0 ? st.wardrobe.suits : st.wardrobe.acc;
    this.grid = new G.Grid({ items: ids.map(id => ({ id })), cols: 3, rows: 2, x: 16, y: 46, cw: 100, ch: 52, gap: 6 });
  },
  update(dt) {
    const I = G.game.input;
    if (this.box.open) { this.box.update(I, dt); return; }
    if (I.pressed('cancel')) return G.game.go(this.back, { place: this.place });
    if (I.pressed('tabR') || I.pressed('tabL')) { this.tab = 1 - this.tab; this.build(); }
    const hit = this.grid.update(I, dt);
    if (this.grid.items.length) { const cur = this.grid.items[this.grid.i]; if (cur && (!this.preview || this.preview.id !== cur.id)) { const st = G.state; const isS = this.tab === 0; this.preview = { id: cur.id, rig: G.rigFor(st.me, { suit: isS ? cur.id : st.wearing.suit, acc: isS ? st.wearing.acc : [...st.wearing.acc, cur.id] }) }; } }
    if (hit && (hit.confirm || hit.click)) {
      const st = G.state, id = hit.item.id;
      if (this.tab === 0) st.wearing.suit = id;
      else { const i = st.wearing.acc.indexOf(id); if (i >= 0) st.wearing.acc.splice(i, 1); else st.wearing.acc.push(id); }
      G.sfx('ui_select');
    }
    if (I.pressed('extra') && this.tab === 1 && this.grid.items.length) { const st = G.state, id = this.grid.items[this.grid.i].id; st.wearing.acc = st.wearing.acc.filter(a => a !== id); }
  },
  draw(r) {
    const st = G.state;
    this.bg.draw(r);
    G.screenTitle(r, 'WARDROBE', this.tab === 0 ? 'Suits you own' : 'Accessories you own');
    this.grid.draw(r, (g, it, x, y, w, h, focused) => {
      const id = it.id, worn = this.tab === 0 ? st.wearing.suit === id : st.wearing.acc.includes(id);
      E.ui.box(g, x, y, w, h, { bg: ['#17495c', '#0c2e3a'], border: null, alpha: .95 });
      E.font.text(g, G.itemName(id), x + 4, y + 4, '#fff8e8', { scale: 1, shadow: '#000' });
      if (worn) E.font.text(g, 'WEARING', x + w - 4, y + h - 12, '#7cff9a', { scale: 1, align: 'right', shadow: '#000' });
    });
    const pv = this.preview;
    if (pv && pv.rig) r.actor(60, 0, 0, (g, ox, oy) => { pv.rig.draw(g, ox, oy, r.view); G.dress(g, r, pv.rig, ox, oy); }, { pick: 'preview' });
    G.promptBar(r, [['confirm', 'Wear'], ['extra', 'Remove'], ['tabR', 'Tab'], ['cancel', 'Back']]);
    this.box.draw(r);
  }
};
/* the journal: friends (affinity, mood and the likes learned), stats, and a save */
G.journalScene = {
  enter(data) {
    this.back = data.back || 'map'; this.place = data.place; this.tabs = ['friends', 'stats', 'save'];
    this.tab = Math.max(0, this.tabs.indexOf(data.tab || 'friends'));
    this.build();
    this.bg = new E.Backdrop('night');
  },
  build() {
    const st = G.state;
    if (this.tabs[this.tab] === 'friends') this.list = new G.List({ items: G.NPCS.filter(f => f !== st.me).map(f => ({ label: G.CAST[f].short, id: f, value: G.stageName(st.aff[f] || 0) })), x: 26, y: 58, w: 200, rowH: 22, max: 7, scale: 2 });
    else if (this.tabs[this.tab] === 'save') this.list = new G.List({ items: [{ label: 'Save to a slot', onPick: () => G.game.saves && G.game.saves.show('save') }, { label: 'Back', onPick: () => G.game.go(this.back, { place: this.place }) }], x: 26, y: 58, w: 220, rowH: 22, max: 4, scale: 2 });
    else this.list = new G.List({ items: [{ label: 'Back', onPick: () => G.game.go(this.back, { place: this.place }) }], x: 26, y: 58, w: 220, rowH: 22, max: 4, scale: 2 });
  },
  update(dt) {
    const I = G.game.input;
    if (I.pressed('cancel')) return G.game.go(this.back, { place: this.place });
    if (I.pressed('tabR')) { this.tab = (this.tab + 1) % 3; this.build(); }
    if (I.pressed('tabL')) { this.tab = (this.tab + 2) % 3; this.build(); }
    this.list.update(I, dt);
  },
  draw(r) {
    const st = G.state, W = r.W, H = r.H;
    this.bg.draw(r);
    G.screenTitle(r, 'JOURNAL', ['Friends', 'Stats', 'Save'][this.tab]);
    this.list.draw(r);
    r.overlay(g => {
      E.ui.box(g, 240, 46, W - 254, H - 92, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .92 });
      if (this.tabs[this.tab] === 'friends') {
        const f = this.list.items[this.list.i] && this.list.items[this.list.i].id;
        if (f) {
          E.font.text(g, G.CAST[f].name, 252, 56, '#ffd36a', { scale: 2, shadow: '#000' });
          E.font.text(g, G.CAST[f].epithet + ' · ' + (G.CAST[f].style || ''), 252, 76, '#9fd3d6', { shadow: '#000' });
          G.drawHearts(g, 252, 96, st.aff[f] || 0);
          E.font.text(g, G.stageName(st.aff[f] || 0) + ' · ' + (st.mood[f] || 'Normal'), 252, 108, '#fff8e8', { shadow: '#000' });
          E.font.text(g, 'LIKES', 252, 124, '#ffd36a', { shadow: '#000' });
          let x = 252; const known = st.known[f] || {};
          Object.keys(known).forEach((gift, i) => { const lvl = known[gift]; E.font.text(g, (lvl === 'love' ? '♥ ' : lvl === 'like' ? '+ ' : lvl === 'neutral' ? '· ' : '- ') + G.GIFTS[gift].name, 252, 136 + i * 10, lvl === 'dislike' ? '#ff9a9a' : '#fff8e8', { scale: 1, shadow: '#000' }); });
          if (!Object.keys(known).length) E.font.text(g, 'Give her a gift to learn her tastes.', 252, 136, '#9fd3d6', { scale: 1, shadow: '#000' });
        }
      } else if (this.tabs[this.tab] === 'stats') {
        const s = st.stats, rows = [['Matches won', s.wins + ' / ' + s.matches], ['Points', s.points], ['Gifts given', s.gifts], ['Earned', G.fmtMoney(s.earned)], ['Spent', G.fmtMoney(s.spent)], ['Suits', st.wardrobe.suits.length + ' / 21'], ['Best Pool Hop', s.poolBest !== null ? s.poolBest + 's' : 'none']];
        rows.forEach((rw, i) => { E.font.text(g, rw[0], 252, 56 + i * 16, '#9fd3d6', { shadow: '#000' }); E.font.text(g, String(rw[1]), W - 24, 56 + i * 16, '#fff8e8', { align: 'right', shadow: '#000' }); });
      } else {
        E.font.text(g, 'Save your vacation to one of three slots.', 252, 60, '#fff8e8', { shadow: '#000' });
        E.font.text(g, 'The game also saves itself at each slot.', 252, 74, '#9fd3d6', { shadow: '#000' });
      }
    });
    G.promptBar(r, [['confirm', 'Select'], ['tabR', 'Tab'], ['cancel', 'Back']]);
  }
};
/* the mailbox: letters from the island */
G.mailScene = {
  enter(data) { this.back = data.back || 'map'; this.place = data.place; this.bg = new E.Backdrop('night'); this.letters = G.lettersDue(); this.list = new G.List({ items: this.letters.map(l => ({ label: l.title, onPick: () => this.box.say(l.text, { name: l.from }) })).concat([{ label: 'Back', onPick: () => G.game.go(this.back, { place: this.place }) }]), x: 26, y: 58, w: 260, rowH: 22, max: 6, scale: 2 }); this.box = G.box; },
  update(dt) { const I = G.game.input; if (this.box.open) { this.box.update(I, dt); return; } if (I.pressed('cancel')) return G.game.go(this.back, { place: this.place }); this.list.update(I, dt); },
  draw(r) { this.bg.draw(r); G.screenTitle(r, 'MAILBOX', 'Letters from the island'); this.list.draw(r); this.box.draw(r); G.promptBar(r, [['confirm', 'Read'], ['cancel', 'Back']]); }
};
G.lettersDue = function () {
  const st = G.state, out = [];
  const L = G.LINES.pepper;
  if (st.day >= 1) out.push({ title: 'Welcome card', from: 'PEPPER', text: L.letterWelcome });
  if (st.day >= 2) out.push({ title: 'Sonny\'s flyer', from: 'SONNY', text: L.letterFlyer });
  if (st.day >= 4) out.push({ title: 'Pepper\'s warning', from: 'PEPPER', text: L.letterWarn });
  if (st.day >= 4) out.push({ title: 'Final poster', from: 'SONNY', text: L.letterPoster });
  if (st.day >= 4 && st.flags.final) out.push({ title: 'Final tomorrow', from: 'PEPPER', text: L.letterFinal });
  return out;
};
