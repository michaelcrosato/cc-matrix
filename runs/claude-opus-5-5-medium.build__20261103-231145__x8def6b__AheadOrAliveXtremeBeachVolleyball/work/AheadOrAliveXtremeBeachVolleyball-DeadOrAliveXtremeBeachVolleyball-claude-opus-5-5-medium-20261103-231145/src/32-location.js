/* 32-location: every walkable place is one scene driven by data (04-data-world): you walk (hold run), the people the
 * schedule put here sit at their spots doing idle things and turn to look at you, you talk to them (chat, gifts, team-ups,
 * challenges), use the place's things (Match Board, changing hut, shops, bed, desk, album, mailbox, Pool Hop, the casino's
 * tables) and leave for the island map, which ends the slot. The mouse hovers and clicks people and things. */
G.talkBox = () => G._talk || (G._talk = new E.Dialog(G.game, { lines: 2, place: 'bottom', border: '#f6d38a', bg: '#0f4c5c' }));
/** a line (or lines) spoken by someone, with their portrait and voice; then onDone */
G.say = (who, lines, o = {}) => {
  // a line opened from inside a dialog's own callback (a choice, or a page closing) waits a step: the box finishes closing
  // first, so it doesn't fire the new line's onDone at once
  if (G._inDialogCb) { G._sayQueue = [who, lines, o]; return; }
  const wrap = f => f && function (...a) { G._inDialogCb = true; try { return f.apply(this, a); } finally { G._inDialogCb = false; const q = G._sayQueue; if (q) { G._sayQueue = null; G.game.after(0, () => G.say(...q)); } } };
  o = Object.assign({}, o, { onDone: wrap(o.onDone), onChoice: wrap(o.onChoice) });
  const T = G.talkBox(), c = G.CAST[who] || { short: who };
  T.speed = G.T.textSpeed; T.voice = G.voice.hook(who, o.mood);
  const port = G.CAST[who] ? (g, x, y, size) => G.portrait(g, who, x, y, size, { frame: false }) : null;
  T.say(Array.isArray(lines) ? lines : [lines], Object.assign({ name: (c.short || who).toUpperCase(), portrait: port, portraitSize: 36, nameColor: c.color || '#ffd36a' }, o));
};
G.SCENES.location = {
  pausable: true, view: 'threequarter', input: G.INPUT.EXPLORE, camera: { zoom: [.7, 1.6], start: .8 },
  enter(d) {
    d = d || {}; const S = G.state, id = d.loc || 'beach'; this.loc = id; this.L = G.LOCS[id]; G.LOC = { id }; this.demo = d.demo || null; this.t = 0;
    this.map = G.locMaps()[id]; this.night = S ? S.slot === 2 : false; this.tod = S ? G.todNow(S) : 'afternoon'; G.curTod = this.tod;
    const sp = d.at || this.L.spawn; this.hero = new E.Body({ x: sp[0], y: sp[1], r: 5 }); this.hero.facing = -Math.PI / 2;
    const me = S ? S.me : 'amara', w = G.wearOf(me); this.rig = G.anim.rig(G.rigFor(me, w.suit, w.acc));
    G.game.follow(this.hero, { z: 18 }); G.game.cam.bounds = v => this.map.bounds(v); G.game.cam.smooth = .15;
    G.UI.theme = this.night || id === 'casino' ? 'night' : 'day';
    G.applyLight(this.tod, S ? G.weatherNow(S) : 'sunny', this.night || id === 'casino' || id === 'villa');
    if (id === 'casino') G.game.lights.ambient = .55; if (id === 'villa' && !this.night) G.game.lights.ambient = .9;
    G.game.weather = S && G.weatherNow(S) === 'rain' && id !== 'villa' && id !== 'casino' ? { kind: 'rain', amount: .6, wind: .2 } : null;
    G.music(this.L.music); G.ambience.set(this.night && id !== 'casino' ? 'night' : this.L.amb);
    // the people here, at their spots
    this.npcs = [];
    const here = S ? G.present(id) : [], spots = this.L.spots.slice();
    here.forEach((nid, k) => { const sp2 = spots[k % spots.length]; const ww = G.wearOf(nid); this.npcs.push({ id: nid, x: sp2[0], y: sp2[1], kind: sp2[2], rig: G.anim.rig(G.rigFor(nid, ww.suit, ww.acc)), facing: Math.PI / 2, react: null }); });
    if (S && S.partner && id === 'beach' && !here.includes(S.partner) && S.slot < 2) this.partnerJog = true;
    this.panel = null; this.focus = new G.Focus(); this.hover = null; this.walkTo = null; this.prompt = null;
    G.photoSubjects = () => [{ id: me, rig: this.rig }].concat(this.npcs.map(n => ({ id: n.id, rig: n.rig })));
    G.talkBox().close();
    if (S && !this.demo) G.locEvents(id, this);
    if (this.demo === 'photo') G.game.after(1.2, () => { G.photo.demo = true; G.photo.open(); G.photo.demo = false; });
  },
  exit() { G.game.follow(null); G.game.cam.bounds = null; G.game.weather = null; G.photoSubjects = null; },
  back() { if (this.panel) { this.panel = null; return true; } return false; },
  /** what is near: the nearest person or thing within reach */
  near() {
    const h = this.hero; let best = null, bd = 24;
    for (const n of this.npcs) { const d = Math.hypot(n.x - h.x, n.y - h.y); if (d < bd) { bd = d; best = { kind: 'npc', n, label: G.CAST[n.id].short }; } }
    for (const [iid, label, x, y] of this.L.inter) { const d = Math.hypot(x - h.x, y - h.y); if (d < bd) { bd = d; best = { kind: 'inter', id: iid, label, x, y }; } }
    return best;
  },
  update(dt) {
    this.t += dt; const I = G.game.input, S = G.state;
    G.ambience.update(dt);
    for (const n of this.npcs) this.npcStep(n, dt);
    this.rig.update(dt, { x: this.hero.x, y: this.hero.y, z: this.hero.z, vx: this.hero.vx, vy: this.hero.vy, facing: this.hero.facing, sprint: I.down('run') && !this.panel });
    if (this.demo) return this.demoStep(dt);
    if (G.talkBox().update(dt)) return;
    if (this.panel) { this.panelStep(dt); this.hero.vx = this.hero.vy = 0; this.hero.update(dt, this.map); return; }
    // movement
    const m = I.move(); let mx = m[0], my = m[1];
    const run = I.down('run'), sp = run ? 110 : 70;
    let dir = Math.hypot(mx, my) > .15 ? G.game.view.screenDirToGround(mx, my) : null;
    if (dir) this.walkTo = null;
    if (!dir && this.walkTo) { const dx = this.walkTo.x - this.hero.x, dy = this.walkTo.y - this.hero.y, d = Math.hypot(dx, dy); if (d < 16) { const w = this.walkTo; this.walkTo = null; this.use(w.target); } else dir = [dx / d, dy / d]; }
    this.hero.vx = dir ? dir[0] * sp : 0; this.hero.vy = dir ? dir[1] * sp : 0;
    if (dir) this.hero.facing = Math.atan2(dir[1], dir[0]);
    this.hero.update(dt, this.map);
    if (dir && Math.floor(this.t * 4) !== Math.floor((this.t - dt) * 4)) G.sfx('step_sand', { vol: .5 });
    // the mouse: hover names a person or thing, a click walks there and uses it
    const mg = I.lastDevice === 'mouse' && G.game.mouseGround ? G.game.mouseGround() : null; this.hover = null;
    if (mg) { for (const n of this.npcs) if (Math.hypot(n.x - mg[0], n.y - mg[1]) < 12) this.hover = { kind: 'npc', n, label: G.CAST[n.id].short, x: n.x, y: n.y }; for (const [iid, label, x, y] of this.L.inter) if (Math.hypot(x - mg[0], y - mg[1]) < 14) this.hover = { kind: 'inter', id: iid, label, x, y }; }
    const c = I.clicked(); if (c && this.hover) { const h = this.hover; this.walkTo = { x: h.kind === 'npc' ? h.n.x : h.x, y: h.kind === 'npc' ? h.n.y : h.y, target: h }; }
    this.prompt = this.near();
    if (I.pressed('interact') && this.prompt) this.use(this.prompt);
    if (I.pressed('bag') && S) this.openBag(null);
    if (I.pressed('snap') && G.canPhoto()) G.photo.open();
    if (I.pressed('leave')) this.askLeave();
    if (this.partnerJog && S && S.partner && Math.hypot(this.hero.x - 300, this.hero.y - 290) < 40) { this.partnerJog = false; const ww = G.wearOf(S.partner); this.npcs.push({ id: S.partner, x: 330, y: 300, kind: 'stand', rig: G.anim.rig(G.rigFor(S.partner, ww.suit, ww.acc)), facing: Math.PI, react: { kind: 'wave', t: 0, dur: 1.2 } }); }
  },
  npcStep(n, dt) {
    const h = this.hero, near = Math.hypot(h.x - n.x, h.y - n.y) < 40, k = n.kind;
    let face = near ? Math.atan2(h.y - n.y, h.x - n.x) : Math.PI / 2 + Math.sin(this.t * .3 + n.x) * .4;
    n.facing = E.approachAng(n.facing, face, dt * 4);
    let vb = null, pose = null, z = 0, down = 0, expr = null;
    const r = n.react; if (r) { r.t += dt; if (r.t > r.dur) n.react = null; else { vb = G.MOVES[r.kind] ? { kind: r.kind, u: r.t / r.dur, w: G.anim.weight(r.t / r.dur) } : null; pose = G.anim.pose(r.kind) || (r.kind === 'hop' ? 'cheer' : null); expr = r.expr || 'smile'; z = r.kind === 'hop' ? Math.abs(Math.sin(r.t * 10)) * 5 : 0; } }
    if (!r) {
      if (k === 'stool' || k === 'bench' || k === 'slot' || k === 'edge') { pose = 'kneel'; }
      else if (k === 'stand' && Math.sin(this.t * .4 + n.x) > .3) vb = { kind: 'foldarms', u: 0, w: .9 };
      else if (k === 'lounge') { down = .85; }
      else if (k === 'swim') { z = -14; pose = 'cheer'; }
      else if (k === 'practice') { vb = { kind: 'bump', u: (this.t * 1.2 + n.x) % 1, w: .9 }; }
      else if (k === 'shop' || k === 'shore') vb = { kind: 'lookback', u: 0, w: .6 };
      else if (Math.sin(this.t * .7 + n.y) > .6) pose = 'hips';
    }
    n.z = z; n.rig.vb = vb;
    n.rig.update(dt, { x: n.x, y: n.y, z, facing: n.facing, pose, down, expr: expr || (near ? 'smile' : null) });
  },
  /** use a person (the talk panel) or a thing */
  use(t) {
    const S = G.state; if (!t) return;
    if (t.kind === 'npc') { this.openTalk(t.n); return; }
    const id = t.id;
    if (id === 'board') this.openBoard();
    else if (id === 'hut' || id === 'closet') G.go('wardrobe', { back: { loc: this.loc, at: [this.hero.x, this.hero.y] } });
    else if (id === 'riptide' || id === 'coral' || id === 'sundries') { G.sfx('door'); G.go('shop', { shop: id, back: { loc: 'promenade', at: [this.hero.x, this.hero.y + 20] } }); }
    else if (id === 'bed') this.openBed();
    else if (id === 'desk') G.go('journal', { back: { loc: 'villa', at: [this.hero.x, this.hero.y] } });
    else if (id === 'frame') G.go('album', { from: 'location', back: { loc: 'villa', at: [this.hero.x, this.hero.y] } });
    else if (id === 'mailbox') G.openLetters();
    else if (id === 'hopdeck') G.go('poolhop', { back: { loc: 'pool' } });
    else if (['cashier', 'slots', 'blackjack', 'roulette', 'prize'].includes(id)) G.go('casino', { game: id, back: { loc: 'casino', at: [this.hero.x, this.hero.y] } });
    else if (id === 'vip') G.vipLounge(this);
  },
  askLeave() {
    const S = G.state; if (!S) { G.go('title'); return; }
    const slot = G.SLOTS[S.slot];
    this.panel = { kind: 'confirm', text: 'Leave? This ends the ' + slot + '.', yes: () => { this.panel = null; G.endSlot('leave'); }, no: () => { this.panel = null; } };
  },
  openTalk(n) {
    const S = G.state, id = n.id, isP = S.partner === id, team = G.teamOf(id), L = G.LINES[id], a = G.aff(id);
    G.say(id, L.greet[a >= 80 ? 2 : a >= 40 ? 1 : 0]);
    const items = [{ id: 'chat', label: 'Chat' }, { id: 'gift', label: 'Give a Gift', disabled: !G.canGift(id) }, isP ? { id: 'next', label: 'Our next match?' } : { id: 'team', label: 'Team Up' }];
    if (this.loc === 'beach' && team && !isP && S.slot < 2) items.push({ id: 'challenge', label: 'Challenge her team' });
    items.push({ id: 'bye', label: 'Bye' });
    this.panel = { kind: 'talk', n, items }; this.focus.i = 0;
  },
  openBag(n) { const S = G.state; this.panel = { kind: 'bag', n, tab: 0, page: 0, prev: this.panel }; this.focus.i = 0; },
  openBoard() {
    const S = G.state;
    const pairs = S.teams.filter(t => t.every(id => S.where[id] === 'beach') || S.slot < 2).map(t => t);
    this.panel = { kind: 'board', pairs, items: pairs.map((t, k) => ({ id: k, label: t.map(x => G.CAST[x].short).join(' & ') })).concat([{ id: 'close', label: 'Close' }]) }; this.focus.i = 0;
  },
  openBed() {
    const S = G.state, night = S.slot === 2;
    this.panel = { kind: 'confirm', text: night ? 'Sleep until morning?' : 'Rest until ' + G.SLOTS[S.slot + 1] + '?', yes: () => { this.panel = null; G.restInVilla(); }, no: () => { this.panel = null; } };
  },
  layoutPanel() {
    const P = this.panel, W = G.game.W, H = G.game.H; if (!P) return [];
    if (P.kind === 'talk') return G.UI.column(P.items, Math.round(W * .78), Math.round(H * .2) + 40, 120, 17, 3);
    if (P.kind === 'board') return G.UI.column(P.items, Math.round(W / 2), Math.round(H * .26), 220, 22, 4);
    if (P.kind === 'confirm') return [{ id: 'yes', label: 'Yes', x: Math.round(W / 2) - 70, y: Math.round(H * .48), w: 60, h: 18 }, { id: 'no', label: 'No', x: Math.round(W / 2) + 10, y: Math.round(H * .48), w: 60, h: 18 }];
    if (P.kind === 'bag') { const list = this.bagList(), cw = 84, ch = 48, x0 = Math.round(W / 2 - (cw * 3 + 12) / 2), y0 = Math.round(H * .26); return list.slice(P.page * 6, P.page * 6 + 6).map((it, k) => ({ id: it.id, it, x: x0 + (k % 3) * (cw + 6), y: y0 + Math.floor(k / 3) * (ch + 6), w: cw, h: ch })); }
    return [];
  },
  bagList() {
    const S = G.state, P = this.panel, tab = ['gift', 'suit', 'acc'][P.tab];
    if (tab === 'gift') return Object.keys(S.bag).filter(k => S.bag[k] > 0).map(k => G.ITEMS[k]).sort((a, b) => a.cat.localeCompare(b.cat));
    if (tab === 'suit') return S.wardrobe.suits.filter(s => s !== S.wearing.suit && G.ITEMS[s].price !== undefined && !['fortunagold', 'pinstripe'].includes(s) || false).map(k => G.ITEMS[k]);
    return S.wardrobe.acc.filter(a => !S.wearing.acc.includes(a)).map(k => G.ITEMS[k]);
  },
  panelStep(dt) {
    const P = this.panel, I = G.game.input, S = G.state, L = this.layoutPanel(), f = this.focus.set(L).update();
    if (P.kind === 'confirm') { if (f.pick) (f.pick.id === 'yes' ? P.yes : P.no)(); else if (f.back) P.no(); return; }
    if (P.kind === 'talk') {
      if (f.back) { this.panel = null; return; }
      if (!f.pick) return; const id = P.n.id, k = f.pick.id;
      if (k === 'chat') { const r = G.chat(id); G.say(id, r.line); if (r.d > 0) G.fx.hearts(P.n.x, P.n.y, 40, 3); P.n.react = { kind: 'nod', t: 0, dur: 1 }; }
      else if (k === 'gift') this.openBag(P.n);
      else if (k === 'team') { const r = G.invite(id); if (r.ok) { G.sting('gift_love'); G.fx.hearts(P.n.x, P.n.y, 40, 6); P.n.react = { kind: 'hop', t: 0, dur: 1 }; } else P.n.react = { kind: 'shrug', t: 0, dur: 1 }; G.say(id, r.extra ? [r.line, r.extra] : r.line); this.openTalk(P.n); this.panel = null; }
      else if (k === 'next') this.openBoard();
      else if (k === 'challenge') { const t = G.teamOf(id); this.panel = null; this.challenge(t); }
      else { this.panel = null; G.talkBox().close(); }
      return;
    }
    if (P.kind === 'board') {
      if (f.back || (f.pick && f.pick.id === 'close')) { this.panel = null; return; }
      if (f.pick) { const t = P.pairs[f.pick.id]; this.panel = null; this.challenge(t); }
      return;
    }
    if (P.kind === 'bag') {
      if (f.back) { this.panel = P.n ? null : null; if (P.n) this.openTalk(P.n); else this.panel = null; return; }
      if (f.tabL || f.tabR) { P.tab = (P.tab + (f.tabR ? 1 : 2)) % 3; P.page = 0; this.focus.i = 0; }
      if (I.pressed('alt')) { const n = this.bagList().length; P.page = (P.page + 1) % Math.max(1, Math.ceil(n / 6)); }
      if (f.pick && P.n) { const it = f.pick.it, n = P.n, res = G.giveGift(n.id, it.id); this.panel = null; if (!res) return;
        G.sfx('gift_unwrap');
        if (res.taste === 'love') { n.react = { kind: 'hop', t: 0, dur: 1.2 }; G.fx.hearts(n.x, n.y, 40, 10); G.sting('gift_love'); }
        else if (res.taste === 'like' || res.taste === 'neutral') { n.react = { kind: 'nod', t: 0, dur: 1 }; G.fx.hearts(n.x, n.y, 40, res.taste === 'like' ? 4 : 1); }
        else { n.react = { kind: 'reject', t: 0, dur: 1.6, expr: 'angry' }; G.sting('gift_refuse'); }
        this.rig.vb = { kind: 'give', u: .5, w: 1 };
        if (it.kind === 'suit' && res.accepted) { const ww = G.wearOf(n.id); G.dress(n.rig, ww.suit, ww.acc); }
        G.say(n.id, res.line, { mood: res.taste === 'refuse' ? 'sad' : 'happy' }); }
    }
  },
  /** a challenge: you and your partner against a pair */
  challenge(t) {
    const S = G.state;
    if (!S.partner) { G.say('pepper', 'You need a partner first. Team up with someone you get along with.'); return; }
    if (t.includes(S.partner)) { G.say(S.partner, 'Play against my own team? Nice try.'); return; }
    G.say(t[0], G.rpick('cosmetic', G.LINES[t[0]].taunt), { onDone: () => G.startMatch(G.vacationMatchCfg(t, { title: 'BEACH MATCH' })) });
  },
  draw(r) {
    const night = this.night, id = this.loc;
    if (id === 'beach' || id === 'pool' || id === 'promenade' || id === 'dock') G.backdrop(this.tod, G.state ? G.weatherNow() : 'sunny').draw(r);
    this.map.drawFloor(r); this.map.queueWalls(r);
    G.drawLocProps(r, id, night);
    for (const n of this.npcs) {
      if (n.kind !== 'swim') r.shadow(n.x, n.y, 6, .3);
      r.actor(n.x, n.y, n.z || 0, (g, ox, oy) => n.rig.draw(g, ox, oy, r.view), { key: n.rig, outline: (this.hover && this.hover.n === n) || (this.prompt && this.prompt.n === n) ? '#ffd36a' : undefined });
      if (n.kind === 'swim') r.queue(n.x, n.y + 1, 0, g => { const [sx, sy] = r.w(n.x, n.y, 0); px.blend(g, .7, 'normal', () => px.ell(g, sx, sy - 2, 9, 4, '#2ec4c9')); px.ell(g, sx, sy - 2, 9, 4, '#9ff3e8'); px.blend(g, .6, 'normal', () => px.ell(g, sx, sy - 2, 8, 3, '#2ec4c9')); }, { bias: 3 });
      if (G.state && G.state.partner === n.id) r.textAt(n.x, n.y, 52, '♥', '#ff5f7a');
    }
    r.shadow(this.hero.x, this.hero.y, 6, .35);
    r.actor(this.hero.x, this.hero.y, this.hero.z, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view), { key: this.rig, xray: true });
    for (const [iid, label, x, y] of this.L.inter) { const on = (this.prompt && this.prompt.id === iid) || (this.hover && this.hover.id === iid); r.groundRing(x, y, on ? 9 : 6, on ? '#ffd36a' : '#ffffff', on ? 1 : .5); if (on) r.textAt(x, y, 28, label, '#ffd36a'); }
    if (this.hover && this.hover.kind === 'npc') r.textAt(this.hover.n.x, this.hover.n.y, 50, this.hover.label, '#ffd36a');
    if (night) G.game.lights.add(this.hero.x, this.hero.y, 30, 70, .5, { color: '#ffe0b0' });
    this.drawHud(r);
  },
  drawHud(r) {
    const S = G.state, I = G.game.input, P = this.panel;
    r.overlay(g => {
      const W = r.W, H = r.H, x0 = Math.round(W * .04), y0 = Math.round(H * .04);
      E.ui.box(g, x0, y0, E.font.width(this.L.name, { scale: 1 }) + 16, 15, { bg: G.UI.T.bg, border: G.UI.T.border, alpha: .9 }); E.font.text(g, this.L.name, x0 + 8, y0 + 4, '#ffd36a', { outline: false, shadow: '#000' });
      if (S) { G.UI.clock(g, Math.round(W * .96) - (G.game.cornerArea() ? 46 : 0), y0, S.day, S.slot, G.weatherNow(), 'right'); G.UI.money(g, x0, y0 + 18, S.money); if (S.partner) { G.portrait(g, S.partner, x0, y0 + 38, 20); G.UI.hearts(g, x0 + 24, y0 + 44, G.aff(S.partner)); } }
      if (P && P.kind === 'talk') {
        const n = P.n, id = n.id, a = G.aff(id), px0 = Math.round(W * .78) - 64, py0 = Math.round(H * .2) - 4;
        G.UI.panel(g, px0, py0, 128, 44 + P.items.length * 20);
        G.portrait(g, id, px0 + 4, py0 + 4, 30); E.font.text(g, G.CAST[id].short, px0 + 38, py0 + 5, '#ffd36a', { outline: false }); G.UI.mood(g, px0 + 38, py0 + 16, S.mood[id]); E.font.text(g, G.cap(S.mood[id] || 'normal'), px0 + 48, py0 + 16, '#9fd3d6', { outline: false });
        G.UI.hearts(g, px0 + 38, py0 + 26, a); E.font.text(g, G.UI.stage(a), px0 + 38, py0 + 36 - 1, '#fff8e8', { outline: false });
        this.layoutPanel().forEach((it, k) => G.UI.button(g, it, k === this.focus.i));
      } else if (P && P.kind === 'board') {
        const L = this.layoutPanel(); G.UI.panel(g, Math.round(W / 2) - 124, Math.round(H * .12), 248, Math.round(H * .74));
        G.UI.heading(g, 'MATCH BOARD', Math.round(W / 2) - 112, Math.round(H * .14));
        E.font.text(g, S.partner ? 'Your partner: ' + G.CAST[S.partner].short : 'No partner yet', Math.round(W / 2) - 112, Math.round(H * .14) + 18, '#9fd3d6', { outline: false });
        L.forEach((it, k) => { G.UI.button(g, Object.assign({}, it, { align: 'left' }), k === this.focus.i); const t = P.pairs[it.id]; if (t) { const rec = S.record[t.slice().sort().join('+')] || [0, 0], sk = Math.round((G.DAY_BASE[S.day] + t.reduce((a, x) => a + G.CAST[x].stats.POW + G.CAST[x].stats.TEC, 0) / 60) * 3); E.font.text(g, '★'.repeat(clamp(sk, 1, 5)) + '  ' + rec[0] + '-' + rec[1], it.x + it.w - 8, it.y + 7, '#ffd36a', { align: 'right', outline: false }); } });
        if (!P.pairs.length) E.font.text(g, 'No teams on the courts right now.', W / 2, H / 2, '#fff8e8', { align: 'center', outline: false });
      } else if (P && P.kind === 'confirm') {
        G.UI.panel(g, Math.round(W / 2) - 110, Math.round(H * .38), 220, 52); E.font.text(g, P.text, W / 2, Math.round(H * .38) + 10, '#fff8e8', { align: 'center', outline: false });
        this.layoutPanel().forEach((it, k) => G.UI.button(g, it, k === this.focus.i));
      } else if (P && P.kind === 'bag') {
        const tabs = ['Gifts', 'Swimsuits', 'Accessories'], L = this.layoutPanel(); G.UI.panel(g, Math.round(W / 2) - 140, Math.round(H * .1), 280, Math.round(H * .74));
        G.UI.heading(g, P.n ? 'GIVE ' + G.CAST[P.n.id].short.toUpperCase() + ' A GIFT' : 'GIFT BAG', Math.round(W / 2) - 128, Math.round(H * .12));
        tabs.forEach((t, k) => { const x = Math.round(W / 2) - 128 + k * 86; E.ui.box(g, x, Math.round(H * .12) + 18, 82, 12, { bg: k === P.tab ? ['#ff9e5e', '#c86a3a'] : G.UI.T.bg, border: G.UI.T.border, gradient: false }); E.font.text(g, t, x + 41, Math.round(H * .12) + 21, '#fff', { align: 'center', outline: false }); });
        L.forEach((it, k) => { const foc = k === this.focus.i, im = it.it; E.ui.box(g, it.x, it.y, it.w, it.h, { bg: foc ? ['#1f7a8c', '#12475a'] : G.UI.T.bg, border: foc ? '#ffd36a' : G.UI.T.border }); if (foc) G.UI.focus(g, it.x, it.y, it.w, it.h); G.UI.itemIcon(g, it.x + 4, it.y + 6, im, 2); E.font.text(g, im.name, it.x + 40, it.y + 6, '#fff8e8', { outline: false, wrap: it.w - 42 });
          if (im.kind === 'gift') E.font.text(g, '×' + S.bag[im.id], it.x + it.w - 6, it.y + it.h - 11, '#ffd36a', { align: 'right', outline: false });
          const known = P.n && S.known[P.n.id] && S.known[P.n.id][im.id]; if (known) E.font.text(g, { love: '♥♥', like: '♥', neutral: '•', dislike: '×' }[known] || '', it.x + 40, it.y + it.h - 11, known === 'dislike' ? '#ff7a7a' : '#ff8ac8', { outline: false }); });
        if (!L.length) E.font.text(g, 'Nothing here. Shops on the Promenade sell gifts.', W / 2, H / 2, '#fff8e8', { align: 'center', outline: false });
      }
      if (this.demo) return;
    });
    G.talkBox().draw(r);
    if (G.talkBox().open) return;
    if (P) G.promptBar(r, P.kind === 'bag' ? [['confirm', P.n ? 'Give' : 'Look'], ['tabL', 'Tab'], ['tabR', 'Tab'], ['cancel', 'Back']] : [['confirm', 'Select'], ['cancel', 'Back']]);
    else { const list = []; if (this.prompt) list.push(['interact', this.prompt.kind === 'npc' ? 'Talk to ' + this.prompt.label : this.prompt.label]); list.push(['run', 'Run'], ['bag', 'Gift bag'], ['leave', 'Island map']); G.promptBar(r, list, I); }
  },
  /** the attract's scripted visits */
  demoStep(dt) {
    const n = this.npcs[0];
    if (this.demo === 'gift' && n) {
      const dx = n.x - this.hero.x, dy = n.y + 14 - this.hero.y, d = Math.hypot(dx, dy);
      if (d > 4 && !this.gave) { this.hero.vx = dx / d * 70; this.hero.vy = dy / d * 70; this.hero.facing = Math.atan2(dy, dx); }
      else { this.hero.vx = this.hero.vy = 0; this.hero.facing = -Math.PI / 2; if (!this.gave) { this.gave = true; this.rig.vb = { kind: 'give', u: .5, w: 1 }; G.sfx('gift_unwrap'); G.game.after(.6, () => { n.react = { kind: 'hop', t: 0, dur: 1.4 }; G.fx.hearts(n.x, n.y, 40, 12); G.sting('gift_love'); G.say(n.id, G.LINES[n.id].love[0], { auto: 3, modal: false }); }); } }
      this.hero.update(dt, this.map); G.talkBox().update(dt);
    } else if (this.demo === 'photo') { if (G.photo.st) { G.photo.st.yaw += dt * 30; G.photo.st.zoom = 1.3 + Math.sin(this.t) * .2; G.photo.st.pose = 2 + Math.floor(this.t) % 6; } }
  }
};
/** the place's own events as you arrive (casino opening, the overheard call, rain PA, …) */
G.locEvents = (id, sc) => { if (G.storyArrive) G.storyArrive(id, sc); };
G.restInVilla = () => {
  const S = G.state;
  if (S.slot === 2 || S.slot === 1) { const visit = G.villaVisit && G.villaVisit(); if (visit) return; }
  G.endSlot('rest');
};
