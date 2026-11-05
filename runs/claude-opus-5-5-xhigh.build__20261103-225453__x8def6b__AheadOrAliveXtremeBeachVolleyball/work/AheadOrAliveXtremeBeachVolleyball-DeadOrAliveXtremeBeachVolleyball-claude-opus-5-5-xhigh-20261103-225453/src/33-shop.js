/* 33-shop: the three shops (category tabs, a 3x2 card grid paged, one detail panel, a live rig of your fighter wearing the
 * focused suit or accessory turning on a pedestal, Try on, buy with a confirm over 30% of your money, OWNED / WEARING /
 * NEW / DEAL badges, the keeper's quip with voice), the wardrobe (yours, then your partner's accepted suits) and the
 * Villa journal (Friends with the likes you've learned, Stats, Save). */
G.priceOf = (it, shop) => { if (!it.price) return 0; const deal = G.state && G.state.deals[shop] && G.state.deals[shop].includes(it.id); return Math.round(it.price * G.T.priceMul * (deal ? .75 : 1) / 100) * 100; };
G.owns = id => { const st = G.state; return st.wardrobe.suits.includes(id) || st.wardrobe.acc.includes(id); };
G.buy = (shop, id) => {
  const st = G.state, it = G.itemById(id), p = G.priceOf(it, shop);
  if (it.kind !== 'gift' && G.owns(id)) return { ok: false, why: 'owned' };
  if (it.kind === 'gift' && (st.bag[id] || 0) >= 9) return { ok: false, why: 'full' };
  if (!G.spend(p)) return { ok: false, why: 'money', short: p - st.money };
  if (it.kind === 'suit') st.wardrobe.suits.push(id); else if (it.kind === 'acc') st.wardrobe.acc.push(id); else st.bag[id] = (st.bag[id] || 0) + 1;
  G.bus.emit('purchase', { kind: 'buy', shop, id, price: p }); G.saveUnlocks();
  return { ok: true, price: p };
};
G.equip = id => { const st = G.state, it = G.itemById(id); if (!it) return; if (it.kind === 'suit') st.wearing.suit = id; else if (it.kind === 'acc') { const an = it.anchor; st.wearing.acc = st.wearing.acc.filter(a => G.ACCS[a].anchor !== an).concat(id); } };
G.unequip = id => { const st = G.state; st.wearing.acc = st.wearing.acc.filter(a => a !== id); };
const shopBg = (g, r, col, wall) => {
  const W = r.W, H = r.H; for (let y = 0; y < H; y += 2) px.rect(g, 0, y, W, 2, E.mix(wall, E.shade(wall, -.35), y / H));
  px.rect(g, 0, Math.round(H * .78), W, H, E.shade(col, -.55)); px.rect(g, 0, Math.round(H * .78), W, 2, E.shade(col, -.2));
  for (let i = 0; i < 6; i++) { const x = Math.round(W * (.08 + i * .17)); px.rect(g, x, Math.round(H * .1), 3, Math.round(H * .66), E.shade(wall, -.2)); }
  for (let y = 0; y < 3; y++) px.rect(g, 0, Math.round(H * (.24 + y * .2)), W, 2, E.shade(col, -.3));
};
G.scenes.shop = {
  view: 'court', input: G.PRESETS.MENU, camera: false, pausable: true,
  enter(d) {
    G.useInput('MENU'); this.shop = d.shop; this.from = d.from || 'promenade'; this.at = d.at; this.S = G.SHOPS[d.shop];
    this.tab = 0; this.page = 0; this.nav = new G.Nav(); this.t = 0; this.turn = 0; this.tryOn = true; this.keeper = G.makeRig(this.S.keeper); this.quip = G.pickLine(this.S.keeper, 'shop'); this.quipT = 0; this.focusId = null;
    this.say(this.quip); G.music('boutique'); G.themeName = 'day'; G.photoAllowed = false;
  },
  say(s) { this.quip = s; this.quipT = 0; this._qs = 0; },
  stock() { const st = G.state; return G.shopStock(this.shop, st.day).filter(e => e.tab === this.tab); },
  items() {
    const W = G.game.W, H = G.game.H, all = this.stock(), per = 6, list = all.slice(this.page * per, this.page * per + per), cw = Math.round(W * .15), ch = 48, x0 = Math.round(W * .06), y0 = Math.round(H * .25);
    return list.map((e, i) => ({ id: e.item.id, x: x0 + (i % 3) * (cw + 6), y: y0 + Math.floor(i / 3) * (ch + 6), w: cw, h: ch, it: e.item, onPress: () => this.tryBuy(e.item) }));
  },
  tryBuy(it) {
    const st = G.state, p = G.priceOf(it, this.shop);
    if (it.kind !== 'gift' && G.owns(it.id)) { if (it.kind === 'suit' || it.kind === 'acc') { G.equip(it.id); G.sfx('ui_select'); this.say('Wearing it. Très chic.'); this.rig = null; } return; }
    if (st.money < p) { G.sfx('ui_error'); this.say(G.LINES[this.S.keeper].shop[5]); return; }
    const go = () => { const r = G.buy(this.shop, it.id); if (r.ok) { G.sfx('cash'); this.say(G.LINES[this.S.keeper].shop[4]); if (it.kind !== 'gift') { G.equip(it.id); this.rig = null; } } else { G.sfx('ui_error'); this.say(r.why === 'full' ? 'Your bag holds nine of those. Nine is plenty.' : 'Hmm. That did not work.'); } };
    if (p > st.money * .3) G.confirm('Buy ' + it.name + ' for ' + G.fmtMoney(p) + '?', go); else go();
  },
  previewRig() {
    const st = G.state, f = this.nav.focus, it = f && G.itemById(f), wear = Object.assign({}, G.wearOf(st.me), { acc: G.wearOf(st.me).acc.slice() });
    if (it && this.tryOn && it.kind === 'suit') wear.suit = it.id;
    if (it && this.tryOn && it.kind === 'acc') wear.acc = wear.acc.filter(a => G.ACCS[a].anchor !== it.anchor).concat(it.id);
    const key = JSON.stringify(wear);
    if (!this.rig || this.rigKey !== key) { this.rig = G.makeRig(st.me, wear); this.rigKey = key; }
    return this.rig;
  },
  update(dt) {
    this.t += dt; this.quipT += dt;
    const I = G.game.input, its = this.items(), ev = this.nav.update(its, I, { wheelTabs: false });
    const n = this.stock().length, pages = Math.max(1, Math.ceil(n / 6));
    if (ev.tab) { this.tab = (this.tab + ev.tab + 3) % 3; this.page = 0; this.nav.focus = null; G.sfx('ui_tab'); }
    if (G.wheel) { this.page = (this.page + (G.wheel > 0 ? 1 : -1) + pages) % pages; G.sfx('ui_tab'); }
    if (ev.alt) { this.tryOn = !this.tryOn; G.sfx('ui_tick'); }
    if (ev.back) { G.sfx('door'); G.game.go('location', { loc: this.from, at: this.at }, { fade: 'iris' }); return; }
    // the edge of the grid pages it
    const aim = I.padAim; if (aim) this.turn += aim[0] * dt * 4; else this.turn += dt * .8;
    const dg = I.pan && I.pan(); if (dg) this.turn += dg[0] * .03;
    if (this.focusId !== this.nav.focus) { this.focusId = this.nav.focus; }
    G.Anim.idle(this.previewRig(), dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2 + this.turn, pose: 'hips' });
    G.Anim.idle(this.keeper, dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2 - .3 });
    if (this._qs < this.quip.length) { const prev = Math.floor(this._qs); this._qs += dt * 40; for (let i = prev; i < Math.floor(this._qs); i++) if (/[a-z]/i.test(this.quip[i] || '')) G.voice.letter(this.S.keeper, this.quip[i], i, this.quip); }
    const its2 = this.items(); if (I.repeat('right', .35, .12) && this.nav.focus === (its2[2] || its2[its2.length - 1] || {}).id && pages > 1) { this.page = (this.page + 1) % pages; this.nav.focus = null; }
  },
  draw(r) {
    r.overlay(g => {
      const S = this.S, st = G.state, W = r.W, H = r.H;
      shopBg(g, r, S.color, E.mix(S.color, '#fff8e8', .55));
      G.ui.title(g, S.name.toUpperCase(), W / 2, Math.round(H * .03), { scale: 2, colors: ['#ffffff', S.sign, E.shade(S.color, -.2)] });
      G.ui.tabs(g, Math.round(W * .06), Math.round(H * .15), S.tabs, this.tab);
      // the grid
      const its = this.items();
      for (const it of its) {
        const on = this.nav.focus === it.id, I2 = it.it, p = G.priceOf(I2, this.shop), owned = I2.kind !== 'gift' && G.owns(I2.id), wearing = st.wearing.suit === I2.id || st.wearing.acc.includes(I2.id), can = st.money >= p || owned;
        E.ui.box(g, it.x, it.y - (on ? 1 : 0), it.w, it.h, { bg: on ? ['#ffffff', '#f0e8d8'] : ['#f8f0e0', '#e0d4bc'], border: on ? '#ffd36a' : '#a89878', alpha: can ? 1 : .6 });
        G.itemIcon(g, I2.id, it.x + it.w / 2 - 6, it.y + 6);
        E.font.text(g, G.fit(I2.name, it.w - 6), it.x + it.w / 2, it.y + 22, can ? '#2a1a10' : '#8a7a68', { align: 'center', outline: false });
        E.font.text(g, owned ? (wearing ? 'WEARING' : 'OWNED') : G.fmtMoney(p), it.x + it.w / 2, it.y + 33, owned ? '#2a8a4a' : can ? '#8a3a2a' : '#b05a4a', { align: 'center', outline: false });
        if (st.deals[this.shop] && st.deals[this.shop].includes(I2.id) && !owned) { px.rect(g, it.x + it.w - 22, it.y + 1, 21, 8, '#ff5f7a'); E.font.text(g, '-25%', it.x + it.w - 11, it.y + 1, '#ffffff', { align: 'center', outline: false, font: 'tiny' }); }
        if ((I2.day || 1) === st.day && st.day > 1) { px.rect(g, it.x + 1, it.y + 1, 16, 8, '#ffd36a'); E.font.text(g, 'NEW', it.x + 9, it.y + 2, '#2a1a10', { align: 'center', outline: false, font: 'tiny' }); }
        if (on) G.ui.focus(g, it.x, it.y, it.w, it.h);
      }
      const n = this.stock().length, pages = Math.max(1, Math.ceil(n / 6));
      if (pages > 1) E.font.text(g, 'Page ' + (this.page + 1) + '/' + pages + ' (wheel)', Math.round(W * .06), Math.round(H * .25) + 108, '#5a4a3a', { outline: false });
      // the detail panel and the pedestal
      const f = this.nav.focus && G.itemById(this.nav.focus), dx = Math.round(W * .58), dw = Math.round(W * .36);
      G.ui.panel(g, dx, Math.round(H * .15), dw, Math.round(H * .62), { alpha: .92 });
      const pxx = dx + Math.round(dw * .3), pyy = Math.round(H * .62);
      px.ell(g, pxx, pyy + 2, 22, 6, '#0a2d3d'); px.ell(g, pxx, pyy, 20, 5, S.color); px.ell(g, pxx, pyy - 1, 16, 3, E.shade(S.color, .3));
      this.previewRig().draw(g, pxx, pyy, E.VIEWS.court);
      if (f) {
        const tx = dx + Math.round(dw * .56), p = G.priceOf(f, this.shop), tw = Math.round(dw * .42); let ty = Math.round(H * .17);
        const line = (s, col) => { for (const l of E.font.wrap(s, tw)) { E.font.text(g, l, tx, ty, col, { outline: false }); ty += 9; } ty += 3; };
        line(f.name, '#ffd36a');
        line(f.kind === 'suit' ? G.CUT_NAMES[f.cut] : f.kind === 'acc' ? f.about : G.CAT_NAMES[f.cat], '#9fd3d6');
        if (f.tastes) line('Style: ' + f.tastes.join(', '), '#fff8e8');
        line(G.fmtMoney(p), st.money >= p ? '#ffe08a' : '#ff9a8a');
        if (st.money < p && !(f.kind !== 'gift' && G.owns(f.id))) line('Short ' + G.fmtMoney(p - st.money), '#ff9a8a');
        if (f.kind === 'gift') line('In bag: ' + (st.bag[f.id] || 0), '#9fd3d6');
      }
      // the keeper's quip
      const kx = Math.round(W * .06), ky = Math.round(H * .66);
      G.ui.panel(g, kx, ky, Math.round(W * .48), 34, { alpha: .92 }); G.portrait(g, this.keeper, kx + 4, ky + 4, 26, { frame: false });
      E.font.text(g, G.CAST[S.keeper].name.toUpperCase(), kx + 34, ky + 4, '#ffd36a', { outline: false });
      E.font.text(g, this.quip.slice(0, Math.floor(this._qs || 0)), kx + 34, ky + 14, '#fff8e8', { outline: false, wrap: Math.round(W * .48) - 40 });
      G.ui.panel(g, W - Math.round(W * .06) - 100, Math.round(H * .03), 100, 15, { alpha: .9 }); G.ui.money(g, W - Math.round(W * .06) - 96, Math.round(H * .03) + 4, st.money);
      G.promptBar(g, r, [['confirm', f && f.kind !== 'gift' && G.owns(f.id) ? 'Wear' : 'Buy'], f && f.kind !== 'gift' && ['alt', this.tryOn ? 'Current outfit' : 'Try on'], ['tabL', 'Category'], ['cancel', 'Leave']]);
    });
  }
};
G.scenes.wardrobe = {
  view: 'court', input: G.PRESETS.MENU, camera: false, pausable: true,
  enter(d) { G.useInput('MENU'); this.from = d.from || 'villa'; this.at = d.at; this.page = 0; this.tab = 0; this.nav = new G.Nav(); this.t = 0; G.music('boutique'); G.photoAllowed = false; },
  owner() { const st = G.state; return this.tab === 0 ? st.me : st.partner; },
  list() {
    const st = G.state;
    if (this.tab === 0) return st.wardrobe.suits.map(id => G.SUITS[id]).concat(st.wardrobe.acc.map(id => G.ACCS[id]));
    if (!st.partner) return [];
    const got = (st.npcGot && st.npcGot[st.partner]) || [];
    return [G.SUITS[G.CAST[st.partner].suit]].concat(got.filter(s => G.SUITS[s] && s !== G.CAST[st.partner].suit).map(s => G.SUITS[s]));
  },
  items() { const W = G.game.W, H = G.game.H, all = this.list(), per = 6, list = all.slice(this.page * per, this.page * per + per), cw = Math.round(W * .15), ch = 44, x0 = Math.round(W * .06), y0 = Math.round(H * .25); return list.map((it, i) => ({ id: it.id, x: x0 + (i % 3) * (cw + 6), y: y0 + Math.floor(i / 3) * (ch + 6), w: cw, h: ch, it, onPress: () => this.wear(it) })); },
  wear(it) {
    const st = G.state;
    if (this.tab === 0) { if (it.kind === 'acc' && st.wearing.acc.includes(it.id)) G.unequip(it.id); else G.equip(it.id); }
    else { st.npcWear[st.partner].suit = it.id; G.portraitRigs[st.partner] = null; }
    G.sfx('ui_select'); this.rig = null;
  },
  update(dt) {
    this.t += dt; const I = G.game.input, ev = this.nav.update(this.items(), I);
    if (ev.tab) { this.tab = this.tab ? 0 : 1; this.page = 0; this.nav.focus = null; G.sfx('ui_tab'); this.rig = null; }
    if (ev.alt) { const f = this.nav.focus; if (f && G.ACCS[f] && this.tab === 0) { G.unequip(f); this.rig = null; G.sfx('ui_tick'); } }
    if (G.wheel) { const pages = Math.max(1, Math.ceil(this.list().length / 6)); this.page = (this.page + 1) % pages; }
    if (ev.back) { G.sfx('ui_back'); G.game.go('location', { loc: this.from, at: this.at }); return; }
    const who = this.owner(); if (who) { const key = who + JSON.stringify(G.wearOf(who)); if (!this.rig || this.rigKey !== key) { this.rig = G.makeRig(who, G.wearOf(who)); this.rigKey = key; } G.Anim.idle(this.rig, dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2 + this.t * .8, pose: 'hips' }); }
  },
  draw(r) {
    r.overlay(g => {
      const st = G.state, W = r.W, H = r.H; shopBg(g, r, '#2ec4c9', '#f4ecd8');
      G.ui.title(g, 'WARDROBE', W / 2, Math.round(H * .03), { scale: 2 });
      G.ui.tabs(g, Math.round(W * .06), Math.round(H * .15), ['Yours', st.partner ? G.CAST[st.partner].name + "'s" : 'Partner'], this.tab);
      const its = this.items();
      if (!its.length) E.font.text(g, this.tab ? 'No partner yet. Team up with someone!' : 'Nothing here yet.', Math.round(W * .06), Math.round(H * .3), '#2a1a10', { outline: false });
      for (const it of its) { const on = this.nav.focus === it.id, wearing = this.tab === 0 ? (st.wearing.suit === it.id || st.wearing.acc.includes(it.id)) : st.partner && st.npcWear[st.partner].suit === it.id; E.ui.box(g, it.x, it.y - (on ? 1 : 0), it.w, it.h, { bg: on ? ['#ffffff', '#f0e8d8'] : ['#f8f0e0', '#e0d4bc'], border: on ? '#ffd36a' : '#a89878', alpha: 1 }); G.itemIcon(g, it.id, it.x + it.w / 2 - 6, it.y + 5); E.font.text(g, G.fit(it.it.name, it.w - 6), it.x + it.w / 2, it.y + 21, '#2a1a10', { align: 'center', outline: false }); if (wearing) E.font.text(g, 'WEARING', it.x + it.w / 2, it.y + 31, '#2a8a4a', { align: 'center', outline: false }); if (on) G.ui.focus(g, it.x, it.y, it.w, it.h); }
      const dx = Math.round(W * .62), pyy = Math.round(H * .64);
      G.ui.panel(g, dx - 10, Math.round(H * .15), Math.round(W * .32), Math.round(H * .62), { alpha: .9 });
      px.ell(g, dx + 50, pyy + 2, 22, 6, '#0a2d3d'); px.ell(g, dx + 50, pyy, 20, 5, '#2ec4c9');
      if (this.rig) this.rig.draw(g, dx + 50, pyy, E.VIEWS.court);
      if (this.tab === 1 && st.partner) E.font.text(g, 'She keeps the suits she accepted. Pick what she wears.', dx, Math.round(H * .18), '#fff8e8', { outline: false, wrap: Math.round(W * .3) - 10 });
      G.promptBar(g, r, [['confirm', this.tab === 0 ? 'Wear' : 'Choose'], this.tab === 0 && ['alt', 'Remove accessory'], ['tabL', 'Yours / partner'], ['cancel', 'Back']]);
    });
  }
};
G.scenes.journal = {
  view: 'court', input: G.PRESETS.MENU, camera: false, pausable: true,
  enter(d) { G.useInput('MENU'); this.from = d.from || 'villa'; this.at = d.at; this.tab = 0; this.nav = new G.Nav(); this.fi = 0; G.photoAllowed = false; },
  items() { const W = G.game.W, H = G.game.H; if (this.tab === 2) return [{ id: 'save', x: Math.round(W / 2 - 60), y: Math.round(H * .45), w: 120, h: 20, label: 'Save the vacation', onPress: () => G.saveMenu() }]; if (this.tab === 0) return G.npcs().map((id, i) => ({ id, x: Math.round(W * .07), y: Math.round(H * .24) + i * 22, w: 110, h: 18, label: G.CAST[id].name, align: 'left', onPress: () => {} })); return []; },
  update(dt) {
    const I = G.game.input, ev = this.nav.update(this.items(), I);
    if (ev.tab) { this.tab = (this.tab + ev.tab + 3) % 3; this.nav.focus = null; G.sfx('ui_tab'); }
    if (ev.back) { G.sfx('ui_back'); if (this.from === 'map') G.game.go('map'); else G.game.go('location', { loc: this.from, at: this.at }); }
  },
  draw(r) {
    r.overlay(g => {
      const st = G.state, W = r.W, H = r.H; shopBg(g, r, '#c8a050', '#f8f0dc');
      G.ui.title(g, 'JOURNAL', W / 2, Math.round(H * .03), { scale: 2, colors: ['#ffffff', '#ffd36a', '#c8a050'] });
      G.ui.tabs(g, Math.round(W * .06), Math.round(H * .14), ['Friends', 'Stats', 'Save'], this.tab);
      if (this.tab === 0) {
        const its = this.items(); this.nav.draw(g, its);
        const id = this.nav.focus || its[0].id, x = Math.round(W * .36), y = Math.round(H * .23), w = Math.round(W * .58);
        G.ui.panel(g, x, y, w, Math.round(H * .6));
        G.portrait(g, G.portraitRig(id), x + 8, y + 8, 40, { frame: false });
        const c = G.CAST[id]; E.font.text(g, c.full, x + 54, y + 8, '#ffd36a', { outline: false }); E.font.text(g, '"' + c.epithet + '" · ' + c.from, x + 54, y + 18, '#9fd3d6', { outline: false });
        E.font.text(g, G.stage(G.aff(id)) + (st.partner === id ? ' · your partner' : ''), x + 54, y + 28, '#fff8e8', { outline: false }); G.ui.hearts(g, x + 54, y + 38, G.aff(id));
        E.font.text(g, c.personality, x + 8, y + 54, '#fff8e8', { outline: false, wrap: w - 16 });
        E.font.text(g, 'What you know she thinks:', x + 8, y + 80, '#9fd3d6', { outline: false });
        const known = Object.entries(st.known[id] || {}); if (!known.length) E.font.text(g, 'Nothing yet. Give her something and see.', x + 8, y + 92, '#c8c4d8', { outline: false });
        known.slice(0, 12).forEach(([it, taste], i) => { const xx = x + 8 + (i % 6) * 26, yy = y + 92 + Math.floor(i / 6) * 24; G.itemIcon(g, it, xx, yy); E.font.text(g, taste === 'love' ? '♥' : taste === 'like' ? '+' : taste === 'dislike' ? '-' : '·', xx + 14, yy + 6, taste === 'love' ? '#ff5f7a' : taste === 'dislike' ? '#ff9a8a' : '#9ff3a8', { outline: false }); });
        E.font.text(g, 'Likes ' + c.tastes.join(' and ') + ' styles', x + 8, y + Math.round(H * .6) - 14, '#ffd36a', { outline: false });
      } else if (this.tab === 1) {
        const S = st.stats, cards = [['Matches', S.wins + ' won of ' + S.matches], ['Points', S.points], ['Kills', S.kills], ['Aces', S.aces], ['Blocks', S.blocks], ['Perfect touches', S.perfects], ['Gifts given', S.gifts], ['Pool Hop best', S.poolBest ? S.poolBest.toFixed(1) + ' s' : '—'], ['Casino', (S.casinoNet >= 0 ? '+' : '') + G.fmtChips(S.casinoNet)], ['Postcards', st.album.length], ['Earned', G.fmtMoney(S.earned)], ['Spent', G.fmtMoney(S.spent)]];
        const cw = Math.round(W * .27), x0 = Math.round(W / 2 - cw * 1.5 - 6);
        cards.forEach(([l, v], i) => { const x = x0 + (i % 3) * (cw + 6), y = Math.round(H * .24) + Math.floor(i / 3) * 30; G.ui.panel(g, x, y, cw, 26, { alpha: .92 }); E.font.text(g, l, x + 6, y + 4, '#9fd3d6', { outline: false }); E.font.text(g, String(v), x + 6, y + 14, '#ffd36a', { outline: false }); });
      } else { this.nav.draw(g, this.items()); E.font.text(g, 'Three slots and an autosave. The game autosaves at the start of every slot.', W / 2, Math.round(H * .36), '#2a1a10', { align: 'center', outline: false, wrap: W * .7 }); }
      G.promptBar(g, r, [['tabL', 'Page'], this.tab === 2 && ['confirm', 'Save'], ['cancel', 'Back']]);
    });
  }
};
