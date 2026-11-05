/* 32-location: a walkable place (the beach, the pool, the promenade, the villa, the casino floor). The hero is a Body on the
 * place's TileMap; NPCs present stand at their spots; interactables open their screens; talk, gifts, team-ups and the
 * Match Board run from the talk menu. Leaving ends the slot. */
G.placeMap = function (id) {
  G._maps = G._maps || {};
  if (G._maps[id]) return G._maps[id];
  const P = G.PLACES[id];
  const floorTex = (x, y, tag) => {
    const n = (Math.sin(x * .41) * Math.cos(y * .33) + 1) * 3;
    if (tag === 'sea' || tag === 'pool') return [18 + n, 110 + n, 150 + n];
    if (tag === 'wet') return [201 + n, 160 + n, 106 + n];
    if (tag === 'boardwalk') return [196 + n, 150 + n, 104 + n];
    if (tag === 'tile') return [226 + n, 220 + n, 210 + n];
    if (tag === 'carpet') return [120 + n, 28 + n * .5, 60 + n * .5];
    if (tag === 'deck') return [236 + n, 214 + n, 180 + n];
    return [243 + n * .4, 217 + n * .4, 164 + n * .4];
  };
  const types = { 1: { h: 26, top: '#8a6a58', side: '#5a4238', face: 'brick' } };
  const W = Math.max(...P.rows.map(s => s.length)), pad = P.legend['#'] ? '#' : '~', rows = P.rows.map(s => s + pad.repeat(W - s.length));
  const m = new E.TileMap({ rows, legend: P.legend, types, floorTex, outside: id === 'casino' ? '#14050e' : id === 'villa' ? '#2a1a18' : '#0a2d3d', ao: 3 });
  G._maps[id] = m;
  return m;
};
G.entryOf = function (id) {
  const P = G.PLACES[id];
  return P.entry || [3, 3];
};
G.locScene = {
  enter(data) {
    const game = G.game, st = G.state;
    this.place = data.place; this.P = G.PLACES[this.place];
    this.map = G.placeMap(this.place);
    this.slot = st.slot;
    this.tod = this.P.tod;
    this.mode = 'walk'; this.visits = 0; this.menuNPC = null;
    const c = this.map.center(G.entryOf(this.place)[0], G.entryOf(this.place)[1]), sx = c[0], sy = c[1];
    this.hero = new E.Body({ x: sx, y: sy, r: 5 });
    this.heroRig = G.rigFor(st.me, { suit: st.wearing.suit, acc: st.wearing.acc });
    this.npcs = [];
    const here = G.npcsAt(this.place, this.slot);
    const spots = this.map.findAll ? null : null;
    const tags = G.SPOTS[this.place] || [];
    let k = 0;
    const free = [];
    for (const t of tags) for (const pt of this.map.findAll(t)) free.push({ tag: t, x: pt.x, y: pt.y });
    for (const npc of here) {
      const spot = free[k++ % Math.max(1, free.length)];
      const rig = G.rigFor(npc, { suit: st.npcWear[npc].suit, acc: st.npcWear[npc].acc });
      this.npcs.push({ id: npc, rig, x: spot ? spot.x : sx + 20 + 14 * k, y: spot ? spot.y : sy + 10, face: Math.PI / 2 });
    }
    this.inter = [];
    for (const [tag, def] of Object.entries(G.INTERACT)) for (const pt of this.map.findAll(tag)) this.inter.push({ tag, def, x: pt.x, y: pt.y });
    game.follow(this.hero, { z: 16 });
    game.cam.bounds = v => this.map.bounds(v);
    game.setView(E.VIEWS.threequarter);
    game.cam.smooth = .12;
    G.music(this.P.music || 'island');
    this.lights = !!(this.tod === 'night');
    if (this.lights) { game.lights.enabled = true; game.lights.ambient = .55; } else game.lights.enabled = false;
    this.bg = new E.Backdrop(this.tod === 'night' ? 'night' : 'day');
    this.list = null;
    this.box = G.box;
    this.box.open = false;
    G.locVisit(this.place);
  },
  exit() { G.game.lights.enabled = false; },
  nearNPC() { let best = null; for (const n of this.npcs) { const d = Math.hypot(n.x - this.hero.x, n.y - this.hero.y); if (d < 22 && (!best || d < best.d)) best = { n, d }; } return best && best.n; },
  nearInter() { let best = null; for (const it of this.inter) { const d = Math.hypot(it.x - this.hero.x, it.y - this.hero.y); if (d < 20 && (!best || d < best.d)) best = { it, d }; } return best && best.it; },
  update(dt) {
    const I = G.game.input, st = G.state;
    if (this.box.open) { this.box.update(I, dt); return; }
    if (this.mode === 'talk') return this.updateTalk(I, dt);
    if (this.mode === 'gift') return this.updateGift(I, dt);
    if (this.mode === 'leave') return this.updateLeave(I, dt);
    if (this.mode === 'board') return this.updateBoard(I, dt);
    // walking
    const m = I.move(), d = G.game.view.screenDirToGround(m[0], m[1]);
    const sp = (I.down('run') ? 110 : 70);
    this.hero.vx = d[0] * sp * Math.min(1, Math.hypot(m[0], m[1])); this.hero.vy = d[1] * sp * Math.min(1, Math.hypot(m[0], m[1]));
    this.hero.update(dt, this.map);
    if (Math.hypot(d[0], d[1]) > .1) this.heroFace = Math.atan2(d[1], d[0]);
    this.heroRig.update(dt, { x: this.hero.x, y: this.hero.y, z: this.hero.z, vx: this.hero.vx, vy: this.hero.vy, facing: this.heroFace || 0 });
    for (const n of this.npcs) { n.rig.update(dt, { x: n.x, y: n.y, z: 0, vx: 0, vy: 0, facing: n.face, pose: 'hips' }); }
    if (I.pressed('interact')) {
      const n = this.nearNPC(), it = this.nearInter();
      if (n) this.openTalk(n.id);
      else if (it) this.useInter(it);
    }
    if (I.pressed('bag')) this.openGiftBag(null);
    if (I.pressed('leave')) this.askLeave();
    if (I.pressed('snap')) G.game.go('photo', { from: 'location', place: this.place });
    if (I.pressed('start') || I.pressed('pause')) { /* the pause menu is the engine's */ }
  },
  openTalk(npc) {
    this.mode = 'talk'; this.menuNPC = npc;
    const st = G.state, stage = G.stageIndex(st.aff[npc] || 0);
    const opts = [{ label: 'Chat', onPick: () => this.doChat(npc) }, { label: 'Give a gift', onPick: () => this.openGiftBag(npc) }];
    if (st.partner === npc) opts.push({ label: 'Our next match?', onPick: () => this.openBoard() });
    else opts.push({ label: 'Team up', onPick: () => this.doTeam(npc) });
    if (this.place === 'beach') opts.push({ label: 'Challenge', onPick: () => this.doChallenge(npc) });
    opts.push({ label: 'Bye', onPick: () => this.closeTalk() });
    this.list = new G.List({ items: opts, x: G.game.W - 150, y: 40, w: 130, rowH: 22, max: 6, scale: 2 });
    this.greetDone = this.greetDone || {};
    const key = st.day + ':' + npc;
    if (!this.greetDone[key]) { this.greetDone[key] = true; this.box.say(G.lineFor(npc, 'greet', stage), { name: G.CAST[npc].short, color: '#ffd36a', prof: G.CAST[npc].voice || null, prof2: null, onDone: null }); }
  },
  closeTalk() { this.mode = 'walk'; this.list = null; this.menuNPC = null; },
  updateTalk(I, dt) {
    if (I.pressed('cancel')) { this.closeTalk(); return; }
    if (this.list) this.list.update(I, dt);
  },
  doChat(npc) {
    const st = G.state, before = st.aff[npc] || 0;
    const gain = G.chatWith(npc);
    const stage = G.stageIndex(st.aff[npc] || 0);
    const line = gain ? G.lineFor(npc, 'chat', stage) : '…We already talked this slot. Later, okay?';
    this.box.say(line, { name: G.CAST[npc].short, prof: G.CAST[npc].voice, color: '#ffd36a' });
    if (gain) G.toast(G.CAST[npc].short + ' +' + gain + ' ' + (st.aff[npc] >= 80 ? 'best' : 'hearts'));
    if (st.aff[npc] >= 40 && before < 40) G.sfx('levelup');
  },
  doTeam(npc) {
    const st = G.state;
    if (G.inviteOK(npc)) {
      const old = G.setPartner(npc);
      this.box.say(G.lineFor(npc, 'inviteOK', G.stageIndex(st.aff[npc])), { name: G.CAST[npc].short, prof: G.CAST[npc].voice, onDone: () => { if (old) G.toast((G.CAST[old] || {}).short + ' is sour with you.'); } });
      G.sfx('heart_up');
    } else {
      this.box.say(G.lineFor(npc, 'inviteNo', G.stageIndex(st.aff[npc])), { name: G.CAST[npc].short, prof: G.CAST[npc].voice });
      G.sfx('ui_error');
    }
    this.closeTalk();
  },
  doChallenge(npc) {
    // the pair she plays with (or the next NPC by affinity) takes the court
    const st = G.state;
    const team = st.teams.find(t => t.includes(npc));
    const opp = team ? team : [npc, G.NPCS.find(f => f !== st.me && f !== npc && f !== st.partner)];
    this.box.say('Challenge accepted. Court one, ten minutes. Bring your A-game.', { name: G.CAST[npc].short, prof: G.CAST[npc].voice });
    this.closeTalk();
    this.startMatch(opp.filter(Boolean).slice(0, 2));
  },
  openBoard() { this.mode = 'board'; this.boardItems = this.boardList(); this.list = new G.List({ items: this.boardItems, x: 40, y: 58, w: 260, rowH: 22, max: 7, scale: 2 }); },
  boardList() {
    const st = G.state, out = [];
    for (const [a, b] of st.teams) {
      if (!G.npcsAt('beach', st.slot).includes(a)) continue;
      const rec = st.record[a + '+' + b] || [0, 0];
      out.push({ label: G.CAST[a].short + ' & ' + G.CAST[b].short, value: rec[0] + '-' + rec[1], onPick: () => this.startMatch([a, b]) });
    }
    if (st.partner) out.push({ label: 'Play with ' + G.CAST[st.partner].short, onPick: () => this.startMatch(null) });
    if (!out.length) out.push({ label: 'Nobody is free to play', disabled: true });
    out.push({ label: 'Back', onPick: () => { this.mode = 'walk'; this.list = null; } });
    return out;
  },
  updateBoard(I, dt) { if (I.pressed('cancel')) { this.mode = 'walk'; this.list = null; return; } if (this.list) this.list.update(I, dt); },
  startMatch(opp) {
    const st = G.state, me = st.me, partner = st.partner || null;
    let o1, o2;
    if (opp) { o1 = opp[0]; o2 = opp[1]; }
    else { const others = G.NPCS.filter(f => f !== me && f !== partner); o1 = others[0]; o2 = others[1]; }
    const pt = partner || (G.NPCS.filter(f => f !== me && ![o1, o2].includes(f)).sort((a, b) => (st.aff[b] || 0) - (st.aff[a] || 0))[0]);
    const chem = (a) => (1 - G.T.chemistry / 2) + G.T.chemistry * (st.aff[a] || 0) / 100;
    const teams = [[{ id: me, human: G.game.input, suit: st.wearing.suit, acc: st.wearing.acc, base: G.dayBase(), skill: .5 }, { id: pt, suit: st.npcWear[pt].suit, base: G.dayBase(), chem: chem(pt), aff: st.aff[pt] || 0 }],
      [{ id: o1, suit: st.npcWear[o1].suit, base: G.dayBase() }, { id: o2, suit: st.npcWear[o2].suit, base: G.dayBase() }]];
    const opts = { teams, pointsToWin: G.T.pointsToWin, setsToWin: 1, difficulty: 'normal', timingAssist: 'normal', court: this.slot === 1 ? 'sunset' : 'day', serveSide: 0, vacation: { opp: [o1, o2], partner: pt }, onEnd: r => G.vacationMatchEnd(r) };
    G.game.go('match', { opts });
  },
  openGiftBag(npc) {
    this.mode = 'gift'; this.giftFor = npc;
    const st = G.state, gifts = Object.keys(st.bag).filter(g => st.bag[g] > 0);
    if (!gifts.length) { this.box.say('Your gift bag is empty. Visit the shops on the Promenade.', { name: 'BAG' }); this.mode = 'walk'; return; }
    this.gifts = gifts;
    this.grid = new G.Grid({ items: gifts.map(g => ({ id: g })), cols: 3, rows: 2, x: 30, y: 48, cw: 96, ch: 50, gap: 6, onFocus: null });
  },
  updateGift(I, dt) {
    if (I.pressed('cancel')) { this.mode = 'walk'; return; }
    const hit = this.grid.update(I, dt);
    if (hit && (hit.confirm || hit.click)) {
      const id = hit.item.id;
      if (!this.giftFor) { this.mode = 'walk'; this.box.say('Pick someone to give it to. Walk up to them and press interact.', { name: 'BAG' }); return; }
      const r = G.giveGift(this.giftFor, id);
      this.mode = 'walk';
      if (r && r.already) { this.box.say('You already gave her something this slot.', { name: 'BAG' }); return; }
      if (r) {
        const stg = G.stageIndex(G.state.aff[this.giftFor]);
        const kind = r.accepted ? r.level : 'refuse';
        const line = G.lineFor(this.giftFor, kind, stg);
        this.box.say(line, { name: G.CAST[this.giftFor].short, prof: G.CAST[this.giftFor].voice, onDone: null });
        G.sfx(r.accepted ? (r.level === 'love' ? 'gift_love' : 'heart_up') : 'gift_refuse');
        G.toast(r.accepted ? ((r.level === 'love' ? 'Loved it!' : r.level === 'like' ? 'Liked it' : 'It was fine') + '.') : 'Not her thing.');
      }
    }
  },
  useInter(it) {
    const def = it.def, st = G.state;
    if (def.kind === 'shop') return G.game.go('shop', { shop: def.shop, back: 'location', place: this.place });
    if (def.kind === 'wardrobe') return G.game.go('wardrobe', { back: 'location', place: this.place });
    if (def.kind === 'board') return this.openBoard();
    if (def.kind === 'poolhop') return G.game.go('poolhop', { from: 'location' });
    if (def.kind === 'desk') return G.game.go('journal', { back: 'location', place: this.place });
    if (def.kind === 'album') return G.game.go('album', { from: 'location' });
    if (def.kind === 'mail') return G.game.go('mail', { back: 'location', place: this.place });
    if (def.kind === 'bed') return this.sleep();
    if (def.kind === 'slots' || def.kind === 'blackjack' || def.kind === 'roulette' || def.kind === 'cashier' || def.kind === 'prize' || def.kind === 'vip') return G.game.go('casino', { from: 'location', focus: def.kind });
  },
  sleep() {
    this.box.say('Rest for the day? Going to sleep ends the day.', { name: 'BED', choices: ['Sleep', 'Not yet'], onChoice: i => { if (i === 0) G.endDayFromVilla(); } });
  },
  askLeave() {
    this.mode = 'leave';
    this.list = new G.List({ items: [{ label: 'Leave', onPick: () => this.doLeave() }, { label: 'Stay', onPick: () => { this.mode = 'walk'; this.list = null; } }], x: G.game.W / 2 - 60, y: 110, w: 120, rowH: 24, max: 2, scale: 2 });
    this.leaveText = 'Leave? This ends the ' + G.SLOTS[G.state.slot] + '.';
  },
  updateLeave(I, dt) { if (I.pressed('cancel')) { this.mode = 'walk'; this.list = null; return; } if (this.list) this.list.update(I, dt); },
  doLeave() { G.game.go('map', { afterLocation: true }); }
};
G.locVisit = function (place) { const st = G.state; st.visited = st.visited || {}; st.visited[place] = true; };
G.dayBase = function () { const d = G.state ? G.state.day : 1; return [.4, .5, .58, .66, .74][Math.min(4, d - 1)] || .4; };
G.locDraw = function (r) {
  this.bg && this.bg.draw(r);
  this.map.drawFloor(r);
  for (const it of this.inter) { r.shadow(it.x, it.y, 4, .3); }
  r.shadow(this.hero.x, this.hero.y, 5, .4);
  r.actor(this.hero.x, this.hero.y, this.hero.z, (g, ox, oy) => { this.heroRig.draw(g, ox, oy, r.view); G.dress(g, r, this.heroRig, ox, oy); }, { pick: 'hero' });
  for (const n of this.npcs) r.actor(n.x, n.y, 0, (g, ox, oy) => { n.rig.draw(g, ox, oy, r.view); G.dress(g, r, n.rig, ox, oy); }, { pick: n });
  this.map.queueWalls && this.map.queueWalls(r);
};
G.locHud = function (r) {
  const st = G.state, W = r.W, H = r.H;
  r.overlay(g => {
    E.ui.box(g, 6, 6, 170, 26, { bg: ['#0a2d3d', '#051a26'], border: '#f6d38a', alpha: .9 });
    E.font.text(g, this.P.name, 12, 10, '#fff8e8', { shadow: '#000' });
    E.font.text(g, G.SLOTS[st.slot] + ' · Day ' + st.day, 12, 20, '#9fd3d6', { shadow: '#000' });
    E.font.text(g, G.fmtMoney(st.money), W - 8, 10, '#ffd36a', { align: 'right', scale: 2, shadow: '#000' });
    const near = this.nearNPC(), it = this.nearInter();
    if (this.mode === 'walk' && (near || it)) {
      const label = near ? G.CAST[near.id].short + ' · talk' : it.def.label;
      E.font.text(g, label, W / 2, H - 52, '#fff8e8', { align: 'center', shadow: '#000' });
    }
  });
  if (this.list) this.list.draw(r, {});
  if (this.mode === 'talk' && this.menuNPC) {
    const f = this.menuNPC, aff = G.state.aff[f] || 0;
    r.overlay(g => {
      E.ui.box(g, 10, 36, 110, 40, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .92 });
      E.font.text(g, G.CAST[f].name.split(' ')[0], 16, 42, '#fff8e8', { shadow: '#000' });
      E.font.text(g, G.stageName(aff), 16, 56, '#9fd3d6', { shadow: '#000' });
      G.drawHearts(g, 16, 66, aff);
    });
  }
  if (this.mode === 'gift' && this.grid) {
    r.overlay(g => { E.ui.box(g, 16, 36, W - 32, H - 72, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .95 }); E.font.text(g, 'GIFT BAG', W / 2, 42, '#ffd36a', { align: 'center', scale: 2, shadow: '#000' }); });
    this.grid.draw(r, (g, id, x, y, w, h, focused) => {
      E.ui.box(g, x, y, w, h, { bg: ['#17495c', '#0c2e3a'], border: null, alpha: .95 });
      E.font.text(g, G.GIFTS[id.id].name, x + 4, y + 4, '#fff8e8', { scale: 1, shadow: '#000' });
      E.font.text(g, '× ' + G.state.bag[id.id], x + w - 4, y + h - 12, '#ffd36a', { scale: 1, align: 'right', shadow: '#000' });
    });
    G.promptBar(r, [['confirm', 'Give'], ['cancel', 'Back']]);
  }
  if (this.mode === 'leave') r.overlay(g => E.font.text(g, this.leaveText, W / 2, 96, '#ffd36a', { align: 'center', shadow: '#000' }));
  if (this.mode === 'board') r.overlay(g => { E.font.text(g, 'MATCH BOARD', W / 2, 26, '#ffd36a', { align: 'center', scale: 2, shadow: '#000' }); });
  if (this.mode === 'walk') G.promptBar(r, [['interact', near2(this) ? 'Talk' : 'Use'], ['bag', 'Gift bag'], ['leave', 'Leave'], ['snap', 'Postcard']]);
  this.box.draw(r);
};
function near2(s) { return s.nearNPC() || s.nearInter(); }
G.drawHearts = function (g, x, y, aff) {
  const h = Math.round(aff / 10) / 2;
  for (let i = 0; i < 5; i++) {
    const v = h - i; const col = v >= 1 ? '#ff5fa2' : v >= .5 ? '#ff9ec8' : '#4a3a4a';
    E.px.rect(g, x + i * 9, y, 6, 5, col); E.px.rect(g, x + i * 9 + 1, y + 5, 4, 1, col);
  }
};
G.locScene.draw = function (r) { G.locDraw.call(this, r); G.locHud.call(this, r); };
G.vacationMatchEnd = function (r) { G.game.go('vacmatch-result', r); };
G.endDayFromVilla = function () { G.game.go('dayend', {}); };
