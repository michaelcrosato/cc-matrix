/* 32-location: one scene for every walkable place, driven by G.LOCS. You walk (70 u/s, 110 running) with the camera on
 * you; the NPCs the schedule put here sit at their spots doing idles and turn to look at you; interact within 22 units
 * opens the talk panel (Chat, Give a Gift, Team Up / Our next match, Challenge, Bye) or uses a thing (the Match Board,
 * a changing hut, a shop door, the Pool Hop deck, the bed, closet, desk, album and mailbox). Hover highlights people and
 * things; a click walks there and uses them. Leaving ends the slot (it asks first). */
G.say = (who, lines, o = {}) => {
  const D = G.talk || (G.talk = new E.Dialog(G.game, { lines: 2, speed: 45, bg: '#0a2d3d', border: '#f6d38a', nameColor: '#ffd36a' }));
  D.speed = G.T.textSpeed * (G.TEXT_SPEED[G.setting('textSpeed', 'Normal')] || 1);
  const c = G.CAST[who];
  D.say(lines, Object.assign({ name: c ? c.name.toUpperCase() : who, portrait: c ? G.portraitRig(who) : null, portraitSize: 40, portraitOpts: { zoom: 3.2, turn: .4, bg: E.shade(c ? c.color : '#2a6a7a', -.45) }, voice: c ? G.voiceFn(who, o.mood) : null, nameColor: c ? c.color : '#ffd36a' }, o));
  return D;
};
G.talkOpen = () => !!(G.talk && G.talk.open && G.talk.modal);
const SPOT_PREF = { stool: 'sit', bench: 'sit', lounger: 'sunbathe', swim: 'swim', edge: 'sit', practice: 'practice', shore: 'stretch', window: 'lookback', cart: 'stand', slots: 'sit', rail: 'stand', bar: 'sit', stand: 'stand' };
G.locMaps = {};
G.getLocMap = loc => { const L = G.LOCS[loc]; if (!G.locMaps[loc]) { G.locMaps[loc] = L.map(); for (const s of L.solids || []) G.locMaps[loc].solid(s[0], s[1], s[2], 0, s[3] || {}); } return G.locMaps[loc]; };
G.scenes.location = {
  pausable: true, view: 'threequarter', input: G.PRESETS.EXPLORE, camera: { zoom: [.85, 1.4] }, res: 'ps1',
  enter(d) {
    const loc = this.loc = (d && d.loc) || 'beach', L = this.L = G.LOCS[loc], st = G.state;
    G.curPlace = loc; G.useInput('EXPLORE');
    this.map = G.getLocMap(loc);
    const s = d && d.at ? d.at : L.start;
    this.hero = new E.Body({ x: s[0], y: s[1], r: 5 }); this.hero.facing = -Math.PI / 2;
    this.heroRig = G.makeRig(st.me, G.wearOf(st.me));
    G.game.follow(this.hero, { z: 16 }); G.game.cam.bounds = v => this.map.bounds(v); G.game.cam.snap = true; G.game.setZoom(L.zoom || 1.1);
    this.tod = G.todFor(st.slot, G.weatherNow(), st.day); G.applyLight(this.tod);
    if (st.slot === 2 || L.night) { try { this.gpu = G.game.enableGPU({ map: this.map }); } catch (e) { this.gpu = null; } }
    G.game.weather = G.weatherNow() === 'rain' ? { kind: 'rain', amount: .6, wind: .25 } : null;
    G.music(st.slot === 2 && loc === 'villa' ? 'siesta' : L.music); G.ambience(st.slot === 2 && loc !== 'casino' ? 'night' : L.amb); G.themeName = st.slot === 2 || L.night ? 'night' : 'day';
    this.buildNPCs(); this.ui = null; this.nav = new G.Nav(); this.t = 0; this.hover = null; this.walkTo = null; this.emotes = []; this.near = null;
    G.photoAllowed = true;
    if (G.storyOnEnter) G.storyOnEnter(loc, this);
  },
  exit() { G.photoAllowed = false; if (this.gpu) { this.gpu.enabled = false; this.gpu = null; } G.game.weather = null; if (G.talk) G.talk.close(); },
  buildNPCs() {
    const st = G.state, L = this.L, here = G.presentAt(this.loc), spots = (L.spots || []).slice(), used = new Set();
    this.npcs = [];
    const take = pref => { let i = spots.findIndex((s, k) => !used.has(k) && (!pref || s.kind === pref)); if (i < 0) i = spots.findIndex((s, k) => !used.has(k)); if (i < 0) return null; used.add(i); return spots[i]; };
    // a team at the beach practices on the court; the rest take spots
    const practice = this.loc === 'beach' && st.teams.find(t => t.every(id => here.includes(id) && st.where[id] === 'beach'));
    for (const id of here) {
      if (id === st.partner) continue;
      let sp = practice && practice.includes(id) ? take('practice') : take(null);
      if (!sp) continue;
      this.npcs.push(this.mkNpc(id, sp));
    }
    if (st.partner && L.partnerSpot) this.npcs.push(this.mkNpc(st.partner, { x: L.partnerSpot[0], y: L.partnerSpot[1], kind: 'stand' }, true));
    for (const [id, x, y, f] of L.staff || []) this.npcs.push(Object.assign(this.mkNpc(id, { x, y, kind: 'stand' }), { staff: true, facing: f }));
    if (G.storyNPCs) G.storyNPCs(this);
  },
  mkNpc(id, sp, partner) { const r = G.makeRig(id, G.wearOf(id) || {}); return { id, rig: r, x: sp.x, y: sp.y, kind: sp.kind, idle: SPOT_PREF[sp.kind] || 'stand', facing: sp.facing !== undefined ? sp.facing : Math.PI / 2, ph: G.rand('cosmetic', 0, 9), partner: !!partner, react: null, reactT: 0 }; },
  /* ---------------- update ---------------- */
  update(dt) {
    this.t += dt; G.tickAmbience(dt);
    const I = G.game.input, st = G.state;
    for (const e of this.emotes) e.t += dt; this.emotes = this.emotes.filter(e => e.t < 1.4);
    this.animate(dt);
    if (G.talk && G.talk.open) { G.talk.update(dt); if (G.talk.modal) return; }
    if (G.storyBusy && G.storyBusy()) return;
    if (this.ui) { this.updateUI(dt); return; }
    // walking
    const m = I.move(), dvec = G.game.view.screenDirToGround(m[0], m[1]), run = I.down('run'), sp = run ? 110 : 70;
    let vx = dvec[0] * sp, vy = dvec[1] * sp;
    if (this.walkTo && Math.hypot(m[0], m[1]) < .1) { const dx = this.walkTo.x - this.hero.x, dy = this.walkTo.y - this.hero.y, d = Math.hypot(dx, dy); if (d > 14) { vx = dx / d * 90; vy = dy / d * 90; } else { const t = this.walkTo; this.walkTo = null; this.use(t); } }
    else if (Math.hypot(m[0], m[1]) > .1) this.walkTo = null;
    this.hero.vx = vx; this.hero.vy = vy; this.hero.update(dt, this.map);
    if (Math.hypot(vx, vy) > 5) this.hero.facing = Math.atan2(vy, vx);
    if (Math.hypot(vx, vy) > 5 && G.chance('cosmetic', dt * 3)) G.sfx('step_sand', { vol: .5 });
    // what is near: the nearest person or thing within 22
    this.near = this.nearest();
    if (I.pressed('interact') && this.near) { I.consume('interact'); this.use(this.near); return; }
    // the mouse: hover names a person or thing; a click walks there and uses it
    const p = I.pointer(); this.hover = null;
    if (p && I.lastDevice === 'mouse' && G.lastR && G.lastR.pick) { const hits = G.lastR.pick(p[0], p[1]); this.hover = hits.find(h => h && (h.npc || h.act)) || null; }
    const c = I.clicked(); if (c && G.lastR && G.lastR.pick) { const hits = G.lastR.pick(c[0], c[1]), h = hits.find(q => q && (q.npc || q.act)); if (h) this.walkTo = h.npc ? { npc: h.npc, x: h.npc.x, y: h.npc.y } : { act: h.act, x: h.act.x, y: h.act.y }; }
    if (I.pressed('bag')) { this.openBag(null); return; }
    if (I.pressed('snap') && G.photo) { G.photo.open(); return; }
    if (I.pressed('leave') || this.atExit()) { if (this.atExit()) { this.hero.y -= (this.L.exit.y1 && this.hero.y > this.L.exit.y1 ? 8 : 0); this.hero.x = clamp(this.hero.x, (this.L.exit.x0 || 0) + 10, (this.L.exit.x1 || 9999) - 10); } this.askLeave(); }
  },
  atExit() { const X = this.L.exit; if (!X) return false; const h = this.hero; return (X.y1 && h.y > X.y1) || (X.x0 !== undefined && h.x < X.x0) || (X.x1 !== undefined && h.x > X.x1); },
  nearest() {
    let best = null, bd = 22;
    for (const n of this.npcs) { const d = Math.hypot(n.x - this.hero.x, n.y - this.hero.y); if (d < bd + 4) { bd = d; best = { npc: n, x: n.x, y: n.y }; } }
    for (const a of this.L.acts || []) { if (a.hidden) continue; const d = Math.hypot(a.x - this.hero.x, a.y - this.hero.y); if (d < bd) { bd = d; best = { act: a, x: a.x, y: a.y }; } }
    if (this.loc === 'casino') for (const [x, y] of this.L.slots) { const d = Math.hypot(x + 14 - this.hero.x, y - this.hero.y); if (d < bd) { bd = d; best = { act: this.L.acts.find(a => a.kind === 'slots'), x, y }; } }
    return best;
  },
  use(t) {
    if (t.npc) { if (t.npc.staff) return this.staffTalk(t.npc); return this.openTalk(t.npc); }
    const a = t.act, st = G.state; if (!a) return;
    G.sfx('ui_select');
    if (a.kind === 'board') return this.openBoard();
    if (a.kind === 'wardrobe') return G.game.go('wardrobe', { from: this.loc, at: [this.hero.x, this.hero.y] });
    if (a.kind === 'shop') { G.sfx('door'); return G.game.go('shop', { shop: a.shop, from: this.loc, at: [this.hero.x, this.hero.y] }, { fade: 'iris', at: this.hero }); }
    if (a.kind === 'poolhop') return G.confirm('Play Pool Hop? Hop 32 pads on the beat. It ends the ' + G.SLOTS[st.slot] + '.', () => G.game.go('poolhop', { from: 'pool' }));
    if (a.kind === 'bed') return this.openBed();
    if (a.kind === 'journal') return G.game.go('journal', { from: this.loc, at: [this.hero.x, this.hero.y] });
    if (a.kind === 'album') return G.game.go('album', { from: this.loc, at: [this.hero.x, this.hero.y] });
    if (a.kind === 'mail') return this.openMail();
    if (['cashier', 'slots', 'blackjack', 'roulette', 'prize', 'vip'].includes(a.kind)) return G.game.go('casino', { station: a.kind, at: [this.hero.x, this.hero.y] });
  },
  staffTalk(n) { const line = n.id === 'kai' ? G.pickLine('kai', 'shop') : n.id === 'pepper' ? G.pickLine('pepper', 'quip') : G.pickLine(n.id, 'shop'); G.say(n.id, line); },
  askLeave() {
    const st = G.state;
    if (this.loc === 'casino') return G.confirm('Leave the casino? This ends the Night.', () => { G.casinoLeaveNight && G.casinoLeaveNight(); });
    G.confirm('Leave? This ends the ' + G.SLOTS[st.slot] + '.', () => G.leaveLocation());
  },
  /* ---------------- the talk panel ---------------- */
  openTalk(n) {
    const st = G.state; n.facing = Math.atan2(this.hero.y - n.y, this.hero.x - n.x); this.hero.facing = Math.atan2(n.y - this.hero.y, n.x - this.hero.x);
    this.ui = { kind: 'talk', npc: n, nav: new G.Nav({ focus: 'chat' }) };
    G.say(n.id, G.greetLine(n.id), { modal: false, auto: 2.6 });
  },
  talkItems() {
    const n = this.ui.npc, st = G.state, W = G.game.W, H = G.game.H, x = Math.round(W * .06), y = Math.round(H * .12), mine = st.partner === n.id;
    const team = G.teamOf(n.id), beach = this.loc === 'beach';
    return G.listLayout([
      { id: 'chat', label: 'Chat', onPress: () => { const r = G.chat(n.id); G.say(n.id, r.line, { modal: true }); if (r.d > 0) this.emote(n, 'heart'); } },
      { id: 'gift', label: 'Give a Gift', disabled: st.gifted[n.id] === st.slot + 1, onPress: () => this.openBag(n) },
      mine ? { id: 'next', label: 'Our next match?', disabled: !beach || st.slot === 2, onPress: () => this.openBoard() } : { id: 'team', label: 'Team Up', onPress: () => this.tryInvite(n) },
      beach && team && !mine && st.slot < 2 ? { id: 'challenge', label: 'Challenge', onPress: () => this.challenge(team) } : null,
      { id: 'bye', label: 'Bye', onPress: () => { this.ui = null; G.sfx('ui_back'); } }
    ], x, y + 40, 120, 16, 4);
  },
  tryInvite(n) {
    const st = G.state, doIt = () => { const r = G.invite(n.id); G.say(n.id, r.line); if (r.ok) { this.emote(n, 'heart'); G.toast(G.CAST[n.id].name + ' is your partner', 'Partner chemistry follows your friendship', 'heart'); n.partner = true; this.buildNPCs(); this.ui = null; } else this.emote(n, 'dots'); };
    if (st.partner && st.partner !== n.id) return G.confirm(G.CAST[st.partner].name + ' will be disappointed... Team up with ' + G.CAST[n.id].name + ' instead?', doIt, { destructive: true });
    doIt();
  },
  challenge(team) { this.ui = null; G.startVacationMatch({ pair: team }); },
  emote(n, kind) { this.emotes.push({ n, kind, t: 0 }); if (kind === 'heart') G.fx.hearts(n.x, n.y, 40, 4); },
  /* ---------------- the gift bag ---------------- */
  openBag(n) {
    const st = G.state, items = [];
    for (const id of Object.keys(st.bag).sort((a, b) => G.GIFTS[a].cat.localeCompare(G.GIFTS[b].cat))) items.push({ id, n: st.bag[id], kind: 'gift' });
    if (n) { for (const s of st.wardrobe.suits) if (s !== st.wearing.suit && s !== G.CAST[st.me].suit) items.push({ id: s, kind: 'suit' }); for (const a of st.wardrobe.acc) if (!st.wearing.acc.includes(a)) items.push({ id: a, kind: 'acc' }); }
    this.ui = { kind: 'bag', npc: n, items, page: 0, nav: new G.Nav(), prev: this.ui };
  },
  bagItems() {
    const U = this.ui, W = G.game.W, H = G.game.H, cols = 3, rows = 2, per = cols * rows, cw = 70, ch = 46, x0 = Math.round(W / 2 - (cols * cw + (cols - 1) * 6) / 2), y0 = Math.round(H * .26);
    const page = U.items.slice(U.page * per, U.page * per + per);
    return page.map((it, i) => ({ id: it.id, x: x0 + (i % cols) * (cw + 6), y: y0 + Math.floor(i / cols) * (ch + 6), w: cw, h: ch, it, onPress: () => this.giveFromBag(it) }));
  },
  giveFromBag(it) {
    const n = this.ui.npc; if (!n) { G.sfx('ui_tick'); return; }
    const r = G.giveGift(n.id, it.id); this.ui = null;
    if (r.already) { G.say(n.id, r.line); return; }
    G.sfx('gift_unwrap');
    G.say(n.id, r.line, { mood: r.accepted ? 'happy' : 'sad' });
    if (r.taste === 'love') { G.sting('gift_love'); this.emote(n, 'heart'); n.react = 'love'; } else if (r.accepted) { this.emote(n, r.taste === 'like' ? 'note' : 'dots'); n.react = r.taste; } else { G.sting('gift_refuse'); this.emote(n, '!'); n.react = 'refuse'; }
    n.reactT = 0;
    if (r.accepted && (G.SUITS[it.id] || G.ACCS[it.id])) n.rig = G.makeRig(n.id, G.wearOf(n.id));
  },
  /* ---------------- the Match Board ---------------- */
  openBoard() {
    const st = G.state; if (st.slot === 2) return;
    this.ui = { kind: 'board', nav: new G.Nav() };
    G.sfx('ui_select');
    if (st.partner && G.CAST[st.partner]) { const pn = this.npcs.find(q => q.id === st.partner); if (pn) { pn.x = 210; pn.y = 340; } }
  },
  boardEntries() {
    const st = G.state, here = new Set(G.presentAt('beach')), out = [];
    const special = G.specialMatch && G.specialMatch();
    if (special) out.push(special);
    else for (const t of st.teams) if (t.every(id => here.has(id) && st.where[id] === 'beach')) out.push({ pair: t, rec: st.record[G.teamKey(...t)] || [0, 0] });
    return out;
  },
  boardItems() {
    const W = G.game.W, H = G.game.H, E2 = this.boardEntries(), x = Math.round(W / 2 - 130), y = Math.round(H * .3);
    const its = E2.map((e, i) => ({ id: 'm' + i, x, y: y + i * 34, w: 260, h: 30, e, onPress: () => { if (!G.state.partner && !e.noPartner) { G.sfx('ui_error'); G.toast('You need a partner', 'Talk to someone and Team Up first'); return; } this.ui = null; G.startVacationMatch(e); } }));
    its.push({ id: 'close', x: Math.round(W / 2 - 40), y: y + Math.max(1, E2.length) * 34 + 10, w: 80, h: 16, label: 'Close', onPress: () => { this.ui = null; } });
    return its;
  },
  /* ---------------- the villa: bed and mailbox ---------------- */
  openBed() {
    const st = G.state;
    if (st.slot < 2) G.confirm('Rest until the ' + G.SLOTS[st.slot + 1] + '?', () => { G.restSlot(); });
    else G.confirm('Sleep? The day ends.', () => { G.sleep(); });
  },
  openMail() {
    const st = G.state; if (!st.mail.length) { G.say('pepper', 'No mail. The pelicans are on strike.'); return; }
    const k = st.mail.shift(); st.read[k] = true; const L = G.LETTERS[k];
    const from = L.from === 'best' ? G.bestFriend() : L.from, text = L.from === 'best' ? G.FRIEND_NOTES[from] : L.text;
    G.sfx('door'); this.ui = { kind: 'letter', from, title: L.title, text, nav: new G.Nav() };
    if (G.onLetter) G.onLetter(k);
  },
  updateUI(dt) {
    const U = this.ui, I = G.game.input;
    if (U.kind === 'talk') { const ev = U.nav.update(this.talkItems(), I); if (ev.back) { this.ui = null; G.sfx('ui_back'); } return; }
    if (U.kind === 'bag') {
      const per = 6, pages = Math.max(1, Math.ceil(U.items.length / per)), ev = U.nav.update(this.bagItems(), I, { wheelTabs: true });
      if (ev.tab) { U.page = (U.page + ev.tab + pages) % pages; G.sfx('ui_tab'); }
      if (ev.back) { this.ui = U.npc ? Object.assign(U.prev || {}, {}) : null; if (U.prev && U.prev.kind === 'talk') this.ui = U.prev; else this.ui = null; G.sfx('ui_back'); }
      return;
    }
    if (U.kind === 'board') { const ev = U.nav.update(this.boardItems(), I); if (ev.back) { this.ui = null; G.sfx('ui_back'); } return; }
    if (U.kind === 'letter') { if (I.pressed('confirm') || I.pressed('cancel') || I.clicked()) { this.ui = null; G.sfx('ui_back'); } }
  },
  /* ---------------- animation ---------------- */
  animate(dt) {
    const h = this.hero, t = this.t;
    G.Anim.idle(this.heroRig, dt, { x: h.x, y: h.y, z: h.z, vx: h.vx, vy: h.vy, facing: h.facing });
    for (const n of this.npcs) {
      const d = Math.hypot(this.hero.x - n.x, this.hero.y - n.y);
      if (d < 40 && n.idle !== 'swim' && n.idle !== 'sunbathe') n.facing = E.approachAng(n.facing, Math.atan2(this.hero.y - n.y, this.hero.x - n.x), dt * 4);
      const s = { x: n.x, y: n.y, z: 0, facing: n.facing, poseW: {} };
      let clip = null, ct = t + n.ph, mask = null;
      n.reactT += dt; if (n.reactT > 1.4) n.react = null;
      if (n.react === 'love') { s.pose = 'cheer'; s.expr = 'smile'; s.z = Math.abs(Math.sin(n.reactT * 8)) * 4; }
      else if (n.react === 'like') { s.expr = 'smile'; clip = 'Head Nod'; ct = n.reactT; mask = 'upper'; }
      else if (n.react === 'refuse') { clip = 'Idle_FoldArms_Loop'; ct = n.reactT; s.expr = 'angry'; }
      else if (n.idle === 'sit') { s.poseW.sit = 1; if (G.Anim.has('Sitting_Idle_Loop')) { clip = 'Sitting_Idle_Loop'; } }
      else if (n.idle === 'sunbathe') { s.down = 1; s.poseW.sunbathe = 1; }
      else if (n.idle === 'swim') { s.z = -10 + Math.sin(t * 2 + n.ph) * .8; clip = 'Swim_Idle_Loop'; }
      else if (n.idle === 'practice') { s.poseW.bump = .5 + .5 * Math.max(0, Math.sin(t * 3 + n.ph)); n.facing = n.x < 352 ? 0 : Math.PI; }
      else if (n.idle === 'stretch') s.poseW.stretch = 1;
      else if (n.idle === 'lookback') s.poseW.lookback = .6;
      else clip = n.staff ? null : 'Idle_Talking_Loop';
      if (this.ui && this.ui.npc === n) { s.expr = s.expr || 'smile'; n.rig._talk = G.talk && G.talk.open && G.talk.typing; }
      G.Anim.idle(n.rig, dt, s, { clip, t: ct, mask });
    }
  },
  /* ---------------- drawing ---------------- */
  draw(r) {
    const L = this.L, st = G.state;
    if (L.sky) G.drawSky(r, this.tod, r.w(this.hero.x, 0, 0)[1]);
    this.map.drawFloor(r); this.map.queueWalls(r);
    if (this.loc === 'beach' || this.loc === 'promenade' || this.loc === 'villa') G.drawShore(r, G.now(), 0, 800, this.loc === 'beach' ? 96 : this.loc === 'villa' ? 192 : 224);
    this.drawDressing(r);
    // people
    for (const n of this.npcs) {
      const hv = (this.hover && this.hover.npc === n) || (this.near && this.near.npc === n);
      if (n.idle !== 'swim') r.shadow(n.x, n.y, 6, .3);
      r.actor(n.x, n.y, n.idle === 'swim' ? -6 : 0, (g, ox, oy) => n.rig.draw(g, ox, oy, r.view), { pick: { npc: n }, outline: hv ? '#ffd36a' : undefined });
      if (n.idle === 'swim') r.queue(n.x, n.y, 0, g => { const q = r.w(n.x, n.y, 0); px.blend(g, .6, 'normal', () => px.ell(g, q[0], q[1] - 1, 8, 3, '#9ff3e8')); }, { bias: .5 });
      if (hv) r.queue(n.x, n.y, 46, g => { const q = r.w(n.x, n.y, 50); G.ui.tag(g, G.CAST[n.id].name + (n.partner ? ' (partner)' : ''), q[0], q[1]); }, { bias: 3 });
    }
    for (const e of this.emotes) r.queue(e.n.x, e.n.y, 50, g => { const q = r.w(e.n.x, e.n.y, 52 + e.t * 8); const s = { heart: '♥', note: '♪', dots: '...', '!': '!', '?': '?' }[e.kind] || '!'; G.ui.tag(g, s, q[0], q[1], e.kind === 'heart' ? '#ff5f7a' : '#2a1a10', '#fff8e8'); }, { bias: 3 });
    const h = this.hero; r.shadow(h.x, h.y, 6, .35);
    r.actor(h.x, h.y, h.z, (g, ox, oy) => this.heroRig.draw(g, ox, oy, r.view));
    // interactables: a sparkle over each, a name when near or hovered
    for (const a of L.acts || []) { if (a.hidden) continue; const hv = (this.hover && this.hover.act === a) || (this.near && this.near.act === a); r.queue(a.x, a.y, 30, g => { const q = r.w(a.x, a.y, 34); if (hv) G.ui.tag(g, a.label, q[0], q[1], '#2a1a10', '#ffd36a'); else if (Math.floor(G.now() * 2 + a.x) % 2) px.dot(g, q[0], q[1], '#fff6c0'); }, { bias: 3, pick: { act: a }, emissive: true }); }
    if (G.storyDraw) G.storyDraw(r, this);
    if (!G.overlay.has('photo')) r.overlay(g => this.drawHUD(g, r));   // (photo mode frames the place, not the HUD)
    if (G.talk) G.talk.draw(r);
  },
  drawDressing(r) {
    const L = this.L, loc = this.loc, night = this.tod === 'night';
    if (loc === 'beach') { G.drawCourtProps(r, { tod: this.tod }); G.drawNet(r); r.shape('sign', 196, 318, 0, { facing: Math.PI / 2 }); r.queue(196, 318, 26, g => { const q = r.w(196, 318, 28); px.rect(g, q[0] - 9, q[1] - 6, 18, 9, '#1a3a5a'); E.font.text(g, 'VS', q[0], q[1] - 5, '#ffd36a', { align: 'center', outline: false, font: 'tiny' }); }); return; }
    for (const s of L.solids || []) r.shape(s[0], s[1], s[2], 0, s[3] || {});
    for (const s of L.deco || []) { const fl = s[3] === 'float', z = fl ? 1 + Math.sin(G.now() * 2 + s[1]) : 0; r.shape(s[0], s[1], s[2], z, Object.assign({ shadow: !fl }, s[4] || {})); }
    for (const p of L.props || []) r.prop(p[0], p[1], p[2], 0, { size: p[3] || 1, light: night || L.night });
    if (L.shops) for (const [id, x, y] of L.shops) { const S = G.SHOPS[id]; r.shape('shopfront', x, y, 0, { params: { color: S.color } }); r.queue(x, y + 6, 40, g => { const q = r.w(x, y + 6, 36); E.font.text(g, S.name, q[0], q[1] - 4, '#fff8e8', { align: 'center', shadow: '#000', outline: false }); }, { bias: 2 }); }
    if (L.slots) for (const [x, y] of L.slots) r.shape('slotmachine', x, y, 0, { facing: 0, params: { color: ['#e8283a', '#ffd36a', '#5ff0ff'][Math.floor(x + y) % 3] } });
    if (loc === 'casino') { r.shape('neonsign', 240, 300, 0, { params: { color: '#ff5fa2' } }); for (const [x, y] of [[160, 120], [330, 120]]) G.game.lights.add(x, y, 40, 130, 1, { color: '#ffe0a0' }); for (const [x, y, c] of [[100, 50, '#5ff0ff'], [240, 48, '#ff5fa2'], [430, 70, '#ffd36a']]) G.game.lights.add(x, y, 20, 90, .8, { color: c }); }
    if (loc === 'villa') { r.queue(96, 33, 22, g => { const q = r.w(96, 33, 24); px.rect(g, q[0] - 8, q[1] - 6, 16, 12, '#c8a050'); px.rect(g, q[0] - 6, q[1] - 4, 12, 8, '#78c8f0'); px.rect(g, q[0] - 6, q[1] + 1, 12, 3, '#f3d9a4'); }); r.shape('mailbox', 200, 182, 0); if (night) G.game.lights.add(24, 44, 26, 120, 1, { color: '#ffd8a0' }); }
    if (loc === 'pool') { for (let i = 0; i < 6; i++) { const x = 360 + i * 16, y = 196 + (i % 2) * 6; r.shape('poolfloat', x, y, 1 + Math.sin(G.now() * 3 + i) * .6, { params: { color: ['#ffd04a', '#ff5f7a', '#2ec4c9'][i % 3] }, shadow: false }); } r.shape('sign', 400, 238, 0); }
  },
  drawHUD(g, r) {
    const st = G.state, safe = G.safe(r);
    G.clockBadge(g, r.W - safe.x, safe.y, st.day, st.slot, G.weatherNow(), { right: true });
    G.ui.panel(g, r.W - safe.x - 92, safe.y + 18, 92, 15, { alpha: .88 }); G.ui.money(g, r.W - safe.x - 88, safe.y + 22, st.money);
    E.font.text(g, this.L.name.toUpperCase(), safe.x, safe.y + 2, '#ffd36a', { scale: 1, shadow: '#000', outline: false });
    if (st.partner) { E.ui.box(g, safe.x, safe.y + 12, 92, 24, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .85 }); G.portrait(g, G.portraitRig(st.partner), safe.x + 2, safe.y + 14, 20, { frame: false }); E.font.text(g, G.CAST[st.partner].name, safe.x + 25, safe.y + 14, '#fff8e8', { outline: false }); G.ui.hearts(g, safe.x + 25, safe.y + 25, G.aff(st.partner)); }
    const U = this.ui;
    if (!U && !(G.talk && G.talk.open && G.talk.modal)) {
      const items = [this.near ? ['interact', this.near.npc ? 'Talk' : (this.near.act ? this.near.act.label : 'Use')] : null, ['run', 'Run'], ['bag', 'Gift bag'], ['leave', 'Island map'], !G.hub && ['snap', 'Postcard']];
      G.promptBar(g, r, items);
    }
    if (U && U.kind === 'talk') {
      const n = U.npc, its = this.talkItems(), x = its[0].x - 8, y = its[0].y - 48;
      G.ui.panel(g, x, y, 136, 48 + its.length * 20 + 6);
      G.portrait(g, n.rig, x + 6, y + 6, 34, { frame: false });
      E.font.text(g, G.CAST[n.id].name, x + 46, y + 6, '#ffd36a', { outline: false });
      E.font.text(g, G.stage(G.aff(n.id)), x + 46, y + 16, '#9fd3d6', { outline: false });
      G.ui.hearts(g, x + 46, y + 27, G.aff(n.id)); G.icon(g, G.moodIcon(st.mood[n.id]), x + 46, y + 37); E.font.text(g, G.MOOD_WORD[st.mood[n.id] || 'normal'], x + 56, y + 37, '#fff8e8', { outline: false });
      U.nav.draw(g, its);
      G.promptBar(g, r, [['confirm', 'Choose'], ['cancel', 'Back']]);
    }
    if (U && U.kind === 'bag') this.drawBag(g, r);
    if (U && U.kind === 'board') this.drawBoard(g, r);
    if (U && U.kind === 'letter') {
      const w = Math.min(260, r.W - 40), lines = E.font.wrap(U.text, w - 24), h = lines.length * 10 + 46, x = Math.round((r.W - w) / 2), y = Math.round((r.H - h) / 2);
      E.ui.box(g, x, y, w, h, { bg: ['#f8f0dc', '#e8d8b8'], border: '#a88a62', alpha: 1 });
      E.font.text(g, U.title, x + 12, y + 8, '#8a3a2a', { outline: false, scale: 1 });
      if (G.CAST[U.from]) G.portrait(g, G.portraitRig(U.from), x + w - 34, y + 6, 24, { frame: false });
      lines.forEach((l, i) => E.font.text(g, l, x + 12, y + 24 + i * 10, '#3a2a1a', { outline: false }));
      G.promptBar(g, r, [['confirm', 'Close']]);
    }
  },
  drawBag(g, r) {
    const U = this.ui, its = this.bagItems(), per = 6, pages = Math.max(1, Math.ceil(U.items.length / per));
    const x = its.length ? its[0].x - 12 : Math.round(r.W / 2 - 120), y = Math.round(r.H * .26) - 30;
    G.ui.panel(g, x, y, 240, 150, { title: U.npc ? 'GIVE A GIFT TO ' + G.CAST[U.npc.id].name.toUpperCase() : 'GIFT BAG' });
    if (!U.items.length) E.font.text(g, 'Your bag is empty. The shops on the Promenade sell gifts.', r.W / 2, y + 60, '#fff8e8', { align: 'center', outline: false, wrap: 200 });
    for (const it of its) {
      const on = U.nav.focus === it.id, I2 = it.it, item = G.itemById(I2.id);
      E.ui.box(g, it.x, it.y - (on ? 1 : 0), it.w, it.h, { bg: on ? ['#1f7a8a', '#0f4c5c'] : ['#174a5a', '#0c2e3a'], border: on ? '#ffd36a' : '#5a8a92', alpha: .96 });
      G.itemIcon(g, I2.id, it.x + it.w / 2 - 6, it.y + 5);
      E.font.text(g, G.fit(item.name, it.w - 6), it.x + it.w / 2, it.y + 22, '#fff8e8', { align: 'center', outline: false });
      if (I2.kind === 'gift') E.font.text(g, '×' + I2.n, it.x + it.w - 4, it.y + 3, '#ffd36a', { align: 'right', outline: false });
      const known = U.npc && G.state.known[U.npc.id][I2.id];
      if (known) E.font.text(g, known === 'love' ? '♥ loves' : known === 'like' ? '+ likes' : known === 'dislike' ? '- dislikes' : 'neutral', it.x + it.w / 2, it.y + 33, known === 'love' ? '#ff9ac8' : known === 'dislike' ? '#ff9a8a' : '#9fd3d6', { align: 'center', outline: false });
      if (on) G.ui.focus(g, it.x, it.y, it.w, it.h);
    }
    if (pages > 1) E.font.text(g, 'Page ' + (U.page + 1) + '/' + pages, x + 230, y + 138, '#9fd3d6', { align: 'right', outline: false });
    G.promptBar(g, r, [U.npc && ['confirm', 'Give'], pages > 1 && ['tabL', 'Page'], ['cancel', 'Back']]);
  },
  drawBoard(g, r) {
    const its = this.boardItems(), st = G.state, x = its[0].x - 10, y = its[0].y - 30;
    G.ui.panel(g, x, y, 280, its.length * 34 + 30, { title: 'MATCH BOARD' });
    E.font.text(g, st.partner ? 'You & ' + G.CAST[st.partner].name + ' vs...' : 'You need a partner: Team Up with someone first.', x + 12, y + 10, st.partner ? '#fff8e8' : '#ff9a8a', { outline: false });
    if (its.length === 1) E.font.text(g, 'No pair is free on the courts right now.', x + 12, y + 30, '#9fd3d6', { outline: false });
    for (const it of its) {
      if (!it.e) { G.ui.button(g, it, this.ui.nav.focus === it.id); continue; }
      const on = this.ui.nav.focus === it.id, e = it.e;
      E.ui.box(g, it.x, it.y - (on ? 1 : 0), it.w, it.h, { bg: on ? ['#1f7a8a', '#0f4c5c'] : ['#174a5a', '#0c2e3a'], border: on ? '#ffd36a' : '#5a8a92', alpha: .96 });
      e.pair.forEach((id, k) => G.portrait(g, G.portraitRig(id), it.x + 4 + k * 22, it.y + 4, 20, { frame: false }));
      E.font.text(g, e.label || e.pair.map(G.castName).join(' & '), it.x + 52, it.y + 5, e.special ? '#ffd36a' : '#fff8e8', { outline: false });
      const stars = e.stars || Math.round(G.matchSkill(e) * 5 + .3);
      for (let k = 0; k < 5; k++) G.icon(g, k < stars ? 'star' : 'starEmpty', it.x + 52 + k * 9, it.y + 16);
      if (e.rec) E.font.text(g, 'Record ' + e.rec[0] + '-' + e.rec[1], it.x + it.w - 6, it.y + 16, '#9fd3d6', { align: 'right', outline: false });
      if (e.tag) E.font.text(g, e.tag, it.x + it.w - 6, it.y + 5, '#ff9e5e', { align: 'right', outline: false });
      if (on) G.ui.focus(g, it.x, it.y, it.w, it.h);
    }
    G.promptBar(g, r, [['confirm', 'Play'], ['cancel', 'Back']]);
  }
};
/** an item's icon: gifts are pixel art; suits a hanger in the suit's colors; accessories their own little sprite */
G.itemIcon = (g, id, x, y) => {
  if (G.GIFT_ICONS[id]) { px.sprite(g, G.GIFT_ICONS[id], Math.round(x), Math.round(y)); return; }
  const s = G.SUITS[id];
  if (s) { const c = s.colors; px.rect(g, x + 5, y, 2, 2, '#c8c4d8'); px.poly(g, [[x + 1, y + 3], [x + 11, y + 3], [x + 9, y + 12], [x + 3, y + 12]], c.main); px.rect(g, x + 3, y + 6, 6, 1, c.accent); px.rect(g, x + 4, y + 9, 4, 1, c.trim); return; }
  const a = G.ACCS[id];
  if (a) { if (a.shades) G.icon(g, 'shades', x + 2, y + 4); else if (a.anchor === 'head') { px.ell(g, x + 6, y + 8, 6, 2, id === 'sunhat' ? '#f0d890' : '#ffffff'); px.disc(g, x + 6, y + 6, 3, id === 'sunhat' ? '#e8c070' : id === 'visor' ? '#3a6ad8' : '#ffffff'); } else if (id === 'hibiscus') { for (let k = 0; k < 5; k++) px.disc(g, x + 6 + Math.cos(k * 1.26) * 3, y + 6 + Math.sin(k * 1.26) * 3, 2, '#e8283a'); px.dot(g, x + 6, y + 6, '#ffd04a'); } else if (id === 'ribbon') { px.poly(g, [[x + 6, y + 6], [x, y + 2], [x, y + 10]], '#d8303a'); px.poly(g, [[x + 6, y + 6], [x + 12, y + 2], [x + 12, y + 10]], '#d8303a'); } else if (id === 'shellnecklace') { for (let k = 0; k < 6; k++) px.dot(g, x + 1 + k * 2, y + 4 + Math.abs(k - 2.5), '#f8f4e8'); } else { px.rect(g, x + 1, y + 4, 4, 4, '#ffffff'); px.rect(g, x + 7, y + 4, 4, 4, '#ffffff'); } }
};
G.bestFriend = () => { const st = G.state; return G.npcs(st).slice().sort((a, b) => st.affinity[b] - st.affinity[a])[0]; };
/** leave a place: the slot ends; the map, or the day's end after the night */
G.leaveLocation = () => { const r = G.endSlot(); if (r === 'dayEnd') G.game.go('dayend'); else G.game.go('map', null, { fade: 'iris' }); };
G.restSlot = () => { G.sfx('ui_select'); const st = G.state; if (G.storyOnRest && G.storyOnRest()) return; G.endSlot(); G.game.go('map', null, { fade: 'dissolve', seconds: .5 }); };
G.sleep = () => { if (G.storyOnSleep && G.storyOnSleep()) return; G.game.go('dayend', null, { fade: 'dissolve', seconds: .6 }); };
