/* 33-shop: the three shops (tabs, a 3 x 2 card grid, a detail panel, a live rig of you wearing the focused item on a
 * turning pedestal, try-on, daily deals, NEW / OWNED / WEARING badges), the wardrobe (yours, and a page for your
 * partner's accepted suits), the journal (Save, Friends with the likes you've learned, Stats) and the letters. */
G.ShopUI = class {
  constructor(shop, o = {}) { this.shop = shop; this.tab = 0; this.page = 0; this.focus = new G.Focus(); this.turn = 0; this.tryOn = true; this.o = o; this.quip = null; this.confirm = null; this.t = 0; }
  list() {
    const S = G.state, sh = G.SHOPS[this.shop], kind = sh.tabs[this.tab][1], day = S ? S.day : 5;
    return G.shopStock(this.shop, day).filter(it => kind === 'food' || kind === 'goods' ? it.cat === kind : kind === 'other' ? it.kind === 'gift' && !['food', 'goods'].includes(it.cat) || (it.kind === 'acc' && it.where === 'sundries') : it.kind === kind);
  }
  layout() { const W = G.game.W, H = G.game.H, L = this.list(), cw = Math.round(W * .17), ch = 40, x0 = Math.round(W * .05), y0 = Math.round(H * .26); return L.slice(this.page * 6, this.page * 6 + 6).map((it, k) => ({ id: it.id, it, x: x0 + (k % 3) * (cw + 5), y: y0 + Math.floor(k / 3) * (ch + 6), w: cw, h: ch })); }
  owned(it) { const S = G.state; if (!S) return false; return it.kind === 'suit' ? S.wardrobe.suits.includes(it.id) : it.kind === 'acc' ? S.wardrobe.acc.includes(it.id) : false; }
  update(dt, I = G.game.input) {
    this.t += dt; const S = G.state;
    if (this.confirm) { if (I.pressed('confirm')) { const c = this.confirm; this.confirm = null; this.buy(c, true); } else if (I.pressed('cancel')) this.confirm = null; return null; }
    const f = this.focus.set(this.layout()).update(I), n = this.list().length;
    if (f.back) return 'back';
    if (f.tabL || f.tabR) { this.tab = (this.tab + (f.tabR ? 1 : 2)) % 3; this.page = 0; this.focus.i = 0; }
    if (I.pressed('extra') && n > 6) { this.page = (this.page + 1) % Math.ceil(n / 6); this.focus.i = 0; }
    if (I.pressed('alt')) this.tryOn = !this.tryOn;
    const aim = I.padAim, pan = I.pan && I.pan(); this.turn += dt * .6 + (aim ? aim[0] * dt * 3 : 0) + (pan ? pan[0] * .03 : 0);
    if (f.pick) this.buy(f.pick.it);
    return null;
  }
  buy(it, ok) {
    const S = G.state; if (!S) return;
    const price = G.priceOf(it, this.shop);
    if (this.owned(it)) { G.sfx('ui_error'); this.quip = 'You already own that.'; return; }
    if (S.money < price) { G.sfx('ui_error'); this.quip = 'Short by ' + G.fmtMoney(price - S.money) + '.'; return; }
    if (!ok && price > S.money * .3) { this.confirm = it; return; }
    G.spend(price); G.sfx('cash');
    if (it.kind === 'suit') { S.wardrobe.suits.push(it.id); S.stats.suitsOwned = S.wardrobe.suits.length; G.unlock([it.id]); }
    else if (it.kind === 'acc') S.wardrobe.acc.push(it.id);
    else S.bag[it.id] = Math.min(9, (S.bag[it.id] || 0) + 1);
    this.quip = G.rpick('cosmetic', G.STAFF_LINES[G.SHOPS[this.shop].keeper]); this.quipT = 0; G.voice.say(this.quip, G.SHOPS[this.shop].keeper);
  }
  draw(r, I = G.game.input) {
    const S = G.state, sh = G.SHOPS[this.shop], cur = (this.focus.cur || {}).it;
    r.overlay(g => {
      const W = r.W, H = r.H; px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, W, H, '#061a24'));
      G.UI.panel(g, Math.round(W * .03), Math.round(H * .04), Math.round(W * .94), Math.round(H * .86));
      G.UI.heading(g, sh.name.toUpperCase(), Math.round(W * .05), Math.round(H * .06), { color: sh.color });
      if (S) G.UI.money(g, Math.round(W * .95), Math.round(H * .06), S.money, 'right');
      sh.tabs.forEach(([t], k) => { const x = Math.round(W * .05) + k * 78; E.ui.box(g, x, Math.round(H * .16), 74, 13, { bg: k === this.tab ? ['#ff9e5e', '#c86a3a'] : G.UI.T.bg, border: G.UI.T.border, gradient: false }); E.font.text(g, t, x + 37, Math.round(H * .16) + 3, '#fff', { align: 'center', outline: false }); });
      const L = this.layout(), deals = S ? S.deals[this.shop] || [] : [];
      L.forEach((it, k) => {
        const foc = k === this.focus.i, im = it.it, price = G.priceOf(im, this.shop), own = this.owned(im), poor = S && S.money < price && !own, wear = S && (S.wearing.suit === im.id || S.wearing.acc.includes(im.id));
        E.ui.box(g, it.x, it.y - (foc ? 1 : 0), it.w, it.h, { bg: foc ? ['#1f7a8c', '#12475a'] : G.UI.T.bg, border: foc ? '#ffd36a' : G.UI.T.border }); if (foc) G.UI.focus(g, it.x, it.y, it.w, it.h);
        G.UI.itemIcon(g, it.x + 3, it.y + 4, im, 2);
        E.font.text(g, im.name, it.x + 38, it.y + 4, poor ? '#8a9aa0' : '#fff8e8', { outline: false, wrap: it.w - 40 });
        E.font.text(g, own ? 'OWNED' : G.fmtMoney(price), it.x + it.w - 5, it.y + it.h - 11, own ? '#7cff5a' : deals.includes(im.id) ? '#ff5f7a' : '#ffd36a', { align: 'right', outline: false });
        if (wear) E.font.text(g, 'WEARING', it.x + 38, it.y + it.h - 11, '#5ff0ff', { outline: false });
        if (S && (im.day || 1) === S.day && S.day > 1) { E.ui.box(g, it.x - 3, it.y - 4, 26, 10, { bg: '#ff5f7a', border: '#ffffff', gradient: false }); E.font.text(g, 'NEW', it.x + 1, it.y - 3, '#ffffff', { outline: false }); }
        if (deals.includes(im.id) && !own) { E.ui.box(g, it.x + it.w - 30, it.y - 4, 30, 10, { bg: '#ffd36a', border: '#ffffff', gradient: false }); E.font.text(g, '-25%', it.x + it.w - 27, it.y - 3, '#8a2a10', { outline: false }); }
      });
      const n = this.list().length; if (n > 6) E.font.text(g, 'Page ' + (this.page + 1) + ' / ' + Math.ceil(n / 6), Math.round(W * .05), Math.round(H * .26) + 94, '#9fd3d6', { outline: false });
      // the detail panel with the live rig
      const px0 = Math.round(W * .62), py0 = Math.round(H * .16), pw = Math.round(W * .33), ph = Math.round(H * .66);
      E.ui.box(g, px0, py0, pw, ph, { bg: ['#12475a', '#0a2d3d'], border: G.UI.T.border });
      if (cur) {
        E.font.text(g, cur.name, px0 + 6, py0 + 5, '#ffd36a', { outline: false });
        if (cur.tastes) E.font.text(g, 'Style: ' + cur.tastes.join(', '), px0 + 6, py0 + 15, '#9fd3d6', { outline: false });
        if (cur.kind === 'gift') E.font.text(g, G.cap(cur.cat) + ' gift', px0 + 6, py0 + 15, '#9fd3d6', { outline: false });
        if ((cur.kind === 'suit' || cur.kind === 'acc') && S) {
          const me = S.me, key = me + '|' + (this.tryOn ? cur.id : 'cur'); if (!this._rig || this._rig.key !== key) { const w = S.wearing; this._rig = G.anim.rig(G.makeRig(me, { suit: this.tryOn && cur.kind === 'suit' ? cur.id : w.suit, acc: this.tryOn && cur.kind === 'acc' ? w.acc.filter(a => G.ITEMS[a].anchor !== cur.anchor).concat(cur.id) : w.acc, size: 2.3 })); this._rig.key = key; }
          this._rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: this.turn, pose: Math.sin(this.t * .7) > .7 ? 'hips' : null, expr: 'smile' });
          px.ell(g, px0 + pw / 2, py0 + ph - 18, 26, 6, '#0a2d3d'); this._rig.draw(g, px0 + pw / 2, py0 + ph - 18, G.VIEW_COURT);
          E.font.text(g, this.tryOn ? 'TRY-ON' : 'YOUR OUTFIT', px0 + pw - 6, py0 + 5, '#5ff0ff', { align: 'right', outline: false });
        } else if (cur) { G.UI.itemIcon(g, px0 + pw / 2 - 24, py0 + ph / 2 - 30, cur, 3); const kn = S ? G.npcs().filter(id => S.known[id] && S.known[id][cur.id]).map(id => G.CAST[id].short + ': ' + S.known[id][cur.id]) : []; kn.slice(0, 4).forEach((l, k) => E.font.text(g, l, px0 + 6, py0 + ph - 46 + k * 9, '#ff8ac8', { outline: false })); }
      }
      // the keeper's quip
      const kp = sh.keeper; G.portrait(g, kp, Math.round(W * .05), Math.round(H * .74), 26);
      E.font.text(g, (this.quip || G.STAFF_LINES[kp][0]), Math.round(W * .05) + 32, Math.round(H * .74) + 8, '#fff8e8', { outline: false, wrap: Math.round(W * .5) });
      if (this.confirm) { G.UI.panel(g, W / 2 - 110, H * .42, 220, 40); E.font.text(g, 'Buy ' + this.confirm.name + ' for ' + G.fmtMoney(G.priceOf(this.confirm, this.shop)) + '?', W / 2, H * .42 + 8, '#ffd36a', { align: 'center', outline: false }); E.font.text(g, G.btn('confirm', I) + ' Yes   ' + G.btn('cancel', I) + ' No', W / 2, H * .42 + 24, '#fff8e8', { align: 'center', outline: false }); }
    });
    G.promptBar(r, [['confirm', 'Buy'], ['alt', 'Try on'], ['tabL', 'Tab'], ['tabR', 'Tab'], ['extra', 'Page'], ['cancel', 'Leave']], I);
  }
};
G.SCENES.shop = {
  pausable: true, input: G.INPUT.MENU, view: 'threequarter',
  enter(d) { this.d = d || {}; this.ui = new G.ShopUI(this.d.shop || 'coral'); G.music('boutique'); G.UI.theme = 'day'; this.t = 0; this.loc = G.locMaps().promenade; G.game.focus(288, 100, 0); },
  update(dt) {
    this.t += dt;
    if (this.d.demo) { this.ui.tab = 0; this.ui.focus.i = Math.floor(this.t / .9) % Math.max(1, this.ui.layout().length); this.ui.focus.set(this.ui.layout()); this.ui.turn += dt; this.ui.t += dt; return; }
    const res = this.ui.update(dt); if (res === 'back') G.go('location', this.d.back || { loc: 'promenade' }, { fade: .2 });
  },
  draw(r) { this.loc.drawFloor(r); G.drawLocProps(r, 'promenade', false); this.ui.draw(r); }
};
/* ---- the wardrobe: your suits and accessories (equip with confirm, remove an accessory with Option), and your partner's ---- */
G.SCENES.wardrobe = {
  pausable: true, input: G.INPUT.MENU,
  enter(d) { this.d = d || {}; this.page = 0; this.tab = 0; this.focus = new G.Focus(); this.turn = 0; G.music('boutique'); },
  list() { const S = G.state; if (this.tab === 2) return (S.partner ? [S.npcWear[S.partner].suit] : []).concat(S.wardrobe.suits.filter(() => false)).map(id => G.ITEMS[id]); return this.tab === 0 ? S.wardrobe.suits.map(id => G.ITEMS[id]) : S.wardrobe.acc.map(id => G.ITEMS[id]); },
  layout() { const W = G.game.W, H = G.game.H, L = this.list(), cw = Math.round(W * .17), ch = 40, x0 = Math.round(W * .05), y0 = Math.round(H * .26); return L.slice(this.page * 6, this.page * 6 + 6).map((it, k) => ({ id: it.id, it, x: x0 + (k % 3) * (cw + 5), y: y0 + Math.floor(k / 3) * (ch + 6), w: cw, h: ch })); },
  update(dt) {
    const S = G.state, I = G.game.input, f = this.focus.set(this.layout()).update(); this.turn += dt * .7 + (I.padAim ? I.padAim[0] * dt * 3 : 0);
    if (f.back) { G.go('location', this.d.back || { loc: 'villa' }, { fade: .2 }); return; }
    if (f.tabL || f.tabR) { this.tab = (this.tab + (f.tabR ? 1 : 2)) % 3; this.page = 0; this.focus.i = 0; }
    if (I.pressed('extra')) { const n = this.list().length; this.page = (this.page + 1) % Math.max(1, Math.ceil(n / 6)); }
    const cur = this.focus.cur && this.focus.cur.it;
    if (f.pick && cur && this.tab < 2) { if (cur.kind === 'suit') S.wearing.suit = cur.id; else { S.wearing.acc = S.wearing.acc.filter(a => G.ITEMS[a].anchor !== cur.anchor).concat(cur.id); } G.sfx('ui_select'); G.rigs[S.me] = null; }
    if (I.pressed('alt') && cur && cur.kind === 'acc') { S.wearing.acc = S.wearing.acc.filter(a => a !== cur.id); G.rigs[S.me] = null; G.sfx('ui_back'); }
  },
  draw(r) {
    const S = G.state, me = S.me, who = this.tab === 2 && S.partner ? S.partner : me, w = G.wearOf(who);
    G.backdrop('afternoon').draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H; G.UI.panel(g, Math.round(W * .03), Math.round(H * .04), Math.round(W * .94), Math.round(H * .86));
      G.UI.heading(g, 'WARDROBE', Math.round(W * .05), Math.round(H * .06));
      ['Swimsuits', 'Accessories', S.partner ? G.CAST[S.partner].short + '\'s' : 'Partner'].forEach((t, k) => { const x = Math.round(W * .05) + k * 78; E.ui.box(g, x, Math.round(H * .16), 74, 13, { bg: k === this.tab ? ['#ff9e5e', '#c86a3a'] : G.UI.T.bg, border: G.UI.T.border, gradient: false }); E.font.text(g, t, x + 37, Math.round(H * .16) + 3, '#fff', { align: 'center', outline: false }); });
      this.layout().forEach((it, k) => { const foc = k === this.focus.i, im = it.it, wear = w.suit === im.id || (w.acc || []).includes(im.id); E.ui.box(g, it.x, it.y, it.w, it.h, { bg: foc ? ['#1f7a8c', '#12475a'] : G.UI.T.bg, border: foc ? '#ffd36a' : G.UI.T.border }); if (foc) G.UI.focus(g, it.x, it.y, it.w, it.h); G.UI.itemIcon(g, it.x + 3, it.y + 4, im, 2); E.font.text(g, im.name, it.x + 38, it.y + 4, '#fff8e8', { outline: false, wrap: it.w - 40 }); if (wear) E.font.text(g, 'WEARING', it.x + 38, it.y + it.h - 11, '#5ff0ff', { outline: false }); });
      if (this.tab === 2 && !S.partner) E.font.text(g, 'Team up with someone to see her wardrobe.', W * .3, H * .4, '#fff8e8', { align: 'center', outline: false });
      const px0 = Math.round(W * .62), py0 = Math.round(H * .16), pw = Math.round(W * .33), ph = Math.round(H * .66);
      E.ui.box(g, px0, py0, pw, ph, { bg: ['#12475a', '#0a2d3d'], border: G.UI.T.border });
      const cur = this.focus.cur && this.focus.cur.it, key = who + (this.tab < 2 && cur ? cur.id : '') + (w.suit) + (w.acc || []).join();
      if (!this._rig || this._rig.key !== key) { this._rig = G.anim.rig(G.makeRig(who, { suit: this.tab === 0 && cur ? cur.id : w.suit, acc: this.tab === 1 && cur ? (w.acc || []).filter(a => G.ITEMS[a].anchor !== cur.anchor).concat(cur.id) : w.acc, size: 2.3 })); this._rig.key = key; }
      this._rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: this.turn, expr: 'smile' }); px.ell(g, px0 + pw / 2, py0 + ph - 18, 26, 6, '#0a2d3d'); this._rig.draw(g, px0 + pw / 2, py0 + ph - 18, G.VIEW_COURT);
      E.font.text(g, G.CAST[who].short, px0 + 6, py0 + 5, '#ffd36a', { outline: false });
    });
    G.promptBar(r, [['confirm', 'Wear'], ['alt', 'Remove accessory'], ['tabL', 'Tab'], ['tabR', 'Tab'], ['cancel', 'Back']]);
  }
};
/* ---- the journal: Save, Friends (hearts, moods and the likes you've learned), Stats ---- */
G.SCENES.journal = {
  pausable: true, input: G.INPUT.MENU,
  enter(d) { this.d = d || {}; this.page = this.d.page || 0; this.focus = new G.Focus(); this.sel = 0; G.music('siesta'); },
  items() { const W = G.game.W, H = G.game.H; if (this.page === 0) return [{ id: 'save', label: 'Save the vacation', x: Math.round(W / 2) - 80, y: Math.round(H * .32), w: 160, h: 20 }, { id: 'load', label: 'Load a save', x: Math.round(W / 2) - 80, y: Math.round(H * .32) + 26, w: 160, h: 20 }]; if (this.page === 1) return G.npcs().map((id, k) => ({ id, label: G.CAST[id].short, x: Math.round(W * .06), y: Math.round(H * .2) + k * 22, w: 110, h: 20 })); return []; },
  update(dt) {
    const I = G.game.input, f = this.focus.set(this.items()).update();
    if (f.back) { if (this.d.back === 'map') G.go('map'); else G.go('location', this.d.back || { loc: 'villa' }, { fade: .2 }); return; }
    if (f.tabL || f.tabR) { this.page = (this.page + (f.tabR ? 1 : 2)) % 3; this.focus.i = 0; }
    if (f.pick && f.pick.id === 'save') { G.game.saves.canSave = true; G.game.saves.show('save', () => G.toast('Saved', 'Day ' + G.state.day)); }
    if (f.pick && f.pick.id === 'load') G.game.saves.show('load', s => { if (s) G.resumeVacation(); });
  },
  draw(r) {
    const S = G.state; G.backdrop('night').draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H; G.UI.panel(g, Math.round(W * .03), Math.round(H * .04), Math.round(W * .94), Math.round(H * .86));
      ['Save', 'Friends', 'Stats'].forEach((t, k) => { const x = Math.round(W * .05) + k * 78; E.ui.box(g, x, Math.round(H * .07), 74, 13, { bg: k === this.page ? ['#ff9e5e', '#c86a3a'] : G.UI.T.bg, border: G.UI.T.border, gradient: false }); E.font.text(g, t, x + 37, Math.round(H * .07) + 3, '#fff', { align: 'center', outline: false }); });
      const L = this.items(); L.forEach((it, k) => G.UI.button(g, it, k === this.focus.i));
      if (this.page === 0) { G.UI.heading(g, 'JOURNAL', W / 2, Math.round(H * .17), { align: 'center' }); E.font.text(g, G.CAST[S.me].name + ' • Day ' + S.day + ' • ' + G.SLOTS[S.slot], W / 2, Math.round(H * .25), '#fff8e8', { align: 'center', outline: false }); E.font.text(g, 'The game also saves by itself at the start of every slot.', W / 2, Math.round(H * .55), '#9fd3d6', { align: 'center', outline: false }); }
      if (this.page === 1) { const cur = this.focus.cur; L.forEach(it => { const id = it.id; G.UI.hearts(g, it.x + 120, it.y + 5, G.aff(id)); G.UI.mood(g, it.x + 172, it.y + 6, S.mood[id]); }); if (cur) { const id = cur.id, x = Math.round(W * .54), y = Math.round(H * .2); G.portrait(g, id, x, y, 40); E.font.text(g, G.CAST[id].name, x + 46, y, '#ffd36a', { outline: false }); E.font.text(g, '"' + G.CAST[id].epithet + '"  ' + G.UI.stage(G.aff(id)), x + 46, y + 10, '#fff8e8', { outline: false }); E.font.text(g, G.CAST[id].personality, x + 46, y + 20, '#9fd3d6', { outline: false, wrap: Math.round(W * .36) - 46 });
          E.font.text(g, 'Likes you\'ve learned:', x, y + 50, '#ffd36a', { outline: false }); const kn = Object.entries(S.known[id] || {}); if (!kn.length) E.font.text(g, 'Nothing yet. Try a gift.', x, y + 60, '#9fd3d6', { outline: false });
          kn.slice(0, 8).forEach(([it, t], k) => { G.UI.itemIcon(g, x + (k % 4) * 44, y + 60 + Math.floor(k / 4) * 26, G.ITEMS[it], 1); E.font.text(g, { love: '♥♥', like: '♥', neutral: '•', dislike: '×' }[t] || t, x + (k % 4) * 44 + 18, y + 64 + Math.floor(k / 4) * 26, t === 'dislike' ? '#ff7a7a' : '#ff8ac8', { outline: false }); }); } }
      if (this.page === 2) { const st = S.stats, rows = [['Matches', st.matches + ' (' + st.wins + ' won)'], ['Points', st.points], ['Kills • Aces • Blocks', st.kills + ' • ' + st.aces + ' • ' + st.blocks], ['Money earned', G.fmtMoney(st.earned)], ['Money spent', G.fmtMoney(st.spent)], ['Swimsuits', S.wardrobe.suits.length + ' / 21'], ['Gifts given', st.gifts], ['Best Pool Hop', st.poolBest ? st.poolBest.toFixed(1) + ' s' : '-'], ['Casino', (st.casinoNet >= 0 ? '+' : '') + st.casinoNet + ' chips'], ['Postcards', S.album.length]];
        rows.forEach(([k, v], i) => { const x = Math.round(W * .1) + (i % 2) * Math.round(W * .42), y = Math.round(H * .22) + Math.floor(i / 2) * 26; E.font.text(g, k, x, y, '#9fd3d6', { outline: false }); E.font.text(g, String(v), x, y + 10, '#fff8e8', { scale: 1, outline: false }); }); }
    });
    G.promptBar(r, [['tabL', 'Page'], ['tabR', 'Page'], ['confirm', 'Select'], ['cancel', 'Back']]);
  }
};
/* ---- letters: the mailbox at the villa ---- */
G.openLetters = () => {
  const S = G.state, unread = S.letters.filter(l => !S.read[l]), list = unread.length ? unread : S.letters.slice(-1);
  if (!list.length) { G.say('pepper', 'No mail. Mr. Fortuna is presumably busy.'); return; }
  const go = k => { if (k >= list.length) return; const L = G.LETTERS[list[k]]; S.read[list[k]] = true; G.say(L.from, L.text, { onDone: () => { if (L.after) L.after(); go(k + 1); } }); };
  G.sfx('door'); go(0);
};
