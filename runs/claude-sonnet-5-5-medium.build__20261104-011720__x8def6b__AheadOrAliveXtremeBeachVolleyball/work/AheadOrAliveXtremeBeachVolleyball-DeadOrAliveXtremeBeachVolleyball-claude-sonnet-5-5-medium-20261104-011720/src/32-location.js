/* 32-location: the walkable places. Walk with the stick, WASD or by clicking; talk to people, use the things. */
const quad = (r, x0, y0, x1, y1, c, z = 0) => px.poly(r.tgt, [r.w(x0, y0, z), r.w(x1, y0, z), r.w(x1, y1, z), r.w(x0, y1, z)], c);
const solidBox = (r, x, y, w, d, h, top, side, light) => r.queue(x, y + d / 2, 0, g => { r.box(g, x - w / 2, y - d / 2, 0, x + w / 2, y + d / 2, h, top, side); });
const lineQ = (r, a, b, c = '#ffffff', w = 1) => { const p = r.w(a[0], a[1], a[2] || 0), q = r.w(b[0], b[1], b[2] || 0); px.line(r.tgt, Math.round(p[0]), Math.round(p[1]), Math.round(q[0]), Math.round(q[1]), c, w); };

G.LOCS = {
  courts: {
    name: 'Sunset Courts', hw: 170, hh: 100, start: [0, 70], music: 'beach',
    spots: [[-80, 20], [-30, 52], [50, 52], [100, 10], [-120, 60], [130, 60]],
    hot: [{ id: 'net', x: 0, y: 36, label: 'Play volleyball', kind: 'court' }, { id: 'exit', x: 150, y: 88, label: 'Island map', kind: 'exit' }, { id: 'board', x: -140, y: 80, label: 'Scoreboard', kind: 'board' }],
    scenery(r, t, night) {
      quad(r, -170, -100, 170, 100, night ? '#7a6a5a' : '#f4dca0');
      quad(r, -75, -34, 75, 34, night ? '#8a7a6a' : '#fbe9b8');
      const L = night ? '#cbd5ff' : '#ffffff'; lineQ(r, [-75, -34], [75, -34], L); lineQ(r, [-75, 34], [75, 34], L); lineQ(r, [-75, -34], [-75, 34], L); lineQ(r, [75, -34], [75, 34], L); lineQ(r, [0, -34], [0, 34], L);
      for (const sy of [-38, 38]) r.queue(0, sy, 0, g => { const [x0, y0] = r.w(0, sy, 0), [x1, y1] = r.w(0, sy, 24); px.line(g, Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), '#d8d8e0', 2); });
      r.queue(0, 0, 24, g => { const [x0, y0] = r.w(0, -38, 24), [x1, y1] = r.w(0, 38, 24); px.line(g, Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), '#ffffff', 2); });
      r.prop('palm', -150, -86, 0, { size: 1.5 }); r.prop('palm', 150, -88, 0, { size: 1.6 }); r.prop('palm', -158, 40, 0, { size: 1.3 }); r.prop('sign', -140, 80, 0, { size: 1.1 });
      solidBox(r, -100, -76, 60, 10, 10, '#c8a060', '#8a6a3a'); solidBox(r, 100, -76, 60, 10, 10, '#c8a060', '#8a6a3a');
    }
  },
  pool: {
    name: 'Lagoon Pool', hw: 170, hh: 100, start: [0, 80], music: 'pool',
    spots: [[-130, 60], [-60, 66], [60, 66], [120, 30], [130, -50], [-130, -50]],
    hot: [{ id: 'hop', x: -20, y: 52, label: 'Pool Hop', kind: 'poolhop' }, { id: 'lounge', x: 110, y: -10, label: 'Poolside chat', kind: 'lounge' }, { id: 'exit', x: 0, y: 92, label: 'Island map', kind: 'exit' }],
    scenery(r, t, night) {
      quad(r, -170, -100, 170, 100, night ? '#4a5a6a' : '#e8e0d0');
      for (let x = -170; x < 170; x += 20) for (let y = -100; y < 100; y += 20) if (((x + y) / 20) & 1) quad(r, x, y, x + 20, y + 20, night ? '#44525e' : '#dcd2c0');
      quad(r, -120, -60, 50, 44, night ? '#0a3a5a' : '#2ab8e0');
      for (let i = 0; i < 24; i++) { const x = -112 + (i * 37) % 160, y = -54 + (i * 53) % 92; lineQ(r, [x, y], [x + 6 + (i & 3), y], night ? '#1a5a8a' : '#aef0ff'); }
      for (const [x, y] of [[-90, -20], [-40, 10], [0, -30], [20, 20]]) r.queue(x, y, 0, g => { const [sx, sy] = r.w(x, y, 0.5); px.ell ? px.ell(g, Math.round(sx), Math.round(sy), 6, 3, '#3fb860') : px.disc(g, Math.round(sx), Math.round(sy), 4, '#3fb860'); px.dot(g, Math.round(sx) + 2, Math.round(sy) - 1, '#ff8ac8'); });
      r.prop('palm', -150, -86, 0, { size: 1.6 }); r.prop('palm', 150, -80, 0, { size: 1.5 }); r.prop('bush', 150, 70, 0, { size: 1.2 }); r.prop('flowers', -150, 80, 0, { size: 1.2 });
      for (const [x, y] of [[100, -30], [120, -30], [100, 10]]) solidBox(r, x, y, 12, 24, 5, '#ffffff', '#e84a6a');
    }
  },
  promenade: {
    name: 'Fortuna Promenade', hw: 190, hh: 100, start: [0, 70], music: 'promenade',
    spots: [[-60, 40], [30, 50], [90, 45], [150, 40], [-150, 50], [10, -10]],
    hot: [{ id: 'suits', x: -100, y: -52, label: 'Swimsuit Boutique', kind: 'shopSuit' }, { id: 'gifts', x: 0, y: -52, label: 'Gift Kiosk', kind: 'shopGift' }, { id: 'hats', x: 100, y: -52, label: 'Hat Stand', kind: 'shopHat' }, { id: 'smoothie', x: 150, y: 30, label: 'Smoothie Bar: hang out', kind: 'hang' }, { id: 'exit', x: 0, y: 92, label: 'Island map', kind: 'exit' }, { id: 'statue', x: -150, y: 20, label: 'Sonny statue', kind: 'statue' }],
    scenery(r, t, night) {
      quad(r, -190, -100, 190, 100, night ? '#4a4a5a' : '#e8d8b8'); quad(r, -190, -10, 190, 60, night ? '#3a3a4a' : '#c8b898');
      for (let x = -190; x < 190; x += 24) lineQ(r, [x, -10], [x, 60], night ? '#333344' : '#b8a888');
      for (const [x, c, n] of [[-100, '#ff6a8a', 'suits'], [0, '#ffcf33', 'gifts'], [100, '#3ab0ff', 'hats']]) { solidBox(r, x, -70, 56, 14, 36, '#fff8e8', '#e0cfa8'); r.prop('awning', x, -58, 24, { size: 1.5, color: c }); solidBox(r, x, -50, 40, 6, 10, c, '#8a6a4a'); void n; }
      solidBox(r, 150, 20, 30, 10, 14, '#ffcf33', '#c8962a'); r.prop('awning', 150, 14, 24, { size: 1.1, color: '#ff6a5a' });
      r.prop('statue', -150, 10, 0, { size: 1.5 }); r.prop('streetlamp', -60, 20, 0, { size: 1.3, light: true }); r.prop('streetlamp', 60, 20, 0, { size: 1.3, light: true }); r.prop('palm', -170, -80, 0, { size: 1.6 }); r.prop('palm', 170, -80, 0, { size: 1.6 }); r.prop('bush', 170, 80, 0, { size: 1.2 });
    }
  },
  villa: {
    name: 'Your Villa', hw: 120, hh: 80, start: [0, 50], music: 'villa',
    spots: [[-50, 20], [50, 20], [0, -10], [80, 40], [-80, 40], [0, 30]],
    hot: [{ id: 'bed', x: -70, y: -30, label: 'Nap', kind: 'nap' }, { id: 'wardrobe', x: 0, y: -48, label: 'Wardrobe', kind: 'wardrobe' }, { id: 'desk', x: 80, y: -30, label: 'Writing desk', kind: 'desk' }, { id: 'mirror', x: -30, y: -48, label: 'Mirror: postcard', kind: 'mirror' }, { id: 'exit', x: 0, y: 70, label: 'Island map', kind: 'exit' }],
    scenery(r, t, night) {
      quad(r, -120, -80, 120, 80, night ? '#5a3a2a' : '#c89860'); for (let x = -120; x < 120; x += 16) lineQ(r, [x, -80], [x, 80], night ? '#4a2a1a' : '#a87840');
      solidBox(r, -70, -48, 40, 28, 12, '#ffffff', '#d8a0b0'); solidBox(r, -70, -60, 40, 6, 22, '#8a5a3a', '#6a3a22');
      solidBox(r, 0, -62, 36, 10, 40, '#6a4a3a', '#4a2a1a'); solidBox(r, 80, -48, 34, 18, 12, '#8a5a3a', '#6a3a22'); solidBox(r, -30, -66, 18, 4, 34, '#bfe9ee', '#8a6a4a');
      r.prop('flowers', 100, 40, 0, { size: 1.2 }); r.prop('lantern', 80, -52, 12, { size: 1, light: true }); r.prop('window', 50, -76, 8, { size: 1.3, colors: ['#8ad8ff'] });
    }
  },
  casino: {
    name: 'Casino Fortuna', hw: 160, hh: 100, start: [0, 80], music: 'casino',
    spots: [[-50, 10], [10, 30], [70, 30], [120, 10], [-110, 40], [0, -10]],
    hot: [{ id: 'slots', x: -90, y: -40, label: 'Fortuna Sevens', kind: 'slots' }, { id: 'bj', x: 10, y: -10, label: 'Blackjack', kind: 'bj' }, { id: 'roulette', x: 100, y: -10, label: 'Roulette', kind: 'roulette' }, { id: 'cashier', x: 120, y: 60, label: 'Cashier', kind: 'cashier' }, { id: 'exit', x: -140, y: 88, label: 'Leave the casino', kind: 'exit' }],
    scenery(r, t, night) {
      quad(r, -160, -100, 160, 100, '#6a1a3a'); for (let x = -160; x < 160; x += 20) for (let y = -100; y < 100; y += 20) if (((x + y) / 20) & 1) quad(r, x, y, x + 20, y + 20, '#5a1430');
      for (let i = 0; i < 4; i++) { const x = -120 + i * 24, c = ['#ff4f6a', '#ffd24a', '#3ab0ff', '#9be060'][(i + Math.floor(t * 4)) & 3]; solidBox(r, x, -60, 14, 12, 26, '#2a2a4a', '#1a1a3a'); r.queue(x, -52, 22, g => { const [sx, sy] = r.w(x, -52, 22); px.rect(g, Math.round(sx) - 4, Math.round(sy), 8, 5, c); }, { emissive: true }); }
      solidBox(r, 10, -10, 40, 22, 12, '#1a7a4a', '#5a3a1a'); r.queue(100, -10, 0, g => { const [sx, sy] = r.w(100, -10, 12); px.disc(g, Math.round(sx), Math.round(sy), 16, '#2a1a1a'); px.disc(g, Math.round(sx), Math.round(sy), 12, '#1a7a4a'); }, { bias: 1 });
      solidBox(r, 120, 76, 40, 12, 14, '#c8962a', '#8a6a1a'); r.prop('pillar', -150, -80, 0, { size: 1.4 }); r.prop('pillar', 150, -80, 0, { size: 1.4 }); r.prop('candelabra', 60, -70, 0, { size: 1.3, light: true }); r.prop('candelabra', -60, -80, 0, { size: 1.3, light: true });
    }
  }
};

G.scenes.location = G.wrapScene({
  view: 'threequarter', input: G.INPUT_MENU, res: 'ps1', expand: true, name: 'location', pausable: true,
  enter(d) {
    const L = G.LOCS[d.loc]; this.d = d; this.loc = L; this.id = d.loc; this.t = 0; const s = G.state;
    this.me = { x: L.start[0], y: L.start[1], vx: 0, vy: 0, face: -Math.PI / 2 };
    this.rig = G.rigOf('you', 1.0); this.sp = new G.Speech(); this.menu = null; this.menuTitle = ''; this.sel = null; this.target = null; this.lastPtr = null; this.bubble = null;
    G.locState = G.locState && G.locState.key === s.day + ':' + s.slot ? G.locState : { key: s.day + ':' + s.slot, spent: false };
    this.npcs = G.npcsAt(d.loc).map((id, i) => ({ id, x: L.spots[i % L.spots.length][0], y: L.spots[i % L.spots.length][1], rig: G.rigOf(id, 1.0), ph: i * 1.7, face: Math.PI / 2 }));
    G.music(L.music || 'promenade'); G.game.follow(null); G.game.focus(this.me.x, this.me.y, 10);
    const night = s.slot === 2; G.game.lights.enabled = night; G.game.lights.ambient = night ? .42 : 1;
    this.night = night;
    G.game.weather = null; this.cam = [this.me.x, this.me.y]; this.pend = null; G.game.setZoom && G.game.setZoom(.62);
    if (d.after) { this.sp.play(d.after, () => { }); }
  },
  exit() { G.game.lights.enabled = false; G.game.setZoom && G.game.setZoom(1); },
  worldPoint(n) { return n.hot ? [n.x, n.y] : [n.x, n.y]; },
  entities() { return this.npcs.map(n => ({ kind: 'npc', n, x: n.x, y: n.y, label: G.CAST[n.id].name })).concat(this.loc.hot.map(h => ({ kind: 'hot', h, x: h.x, y: h.y, label: h.label, disabled: false }))); },
  spendSlot() { G.locState.spent = true; },
  leave() { const sp = G.locState.spent; G.locState = null; if (sp) G.finishSlot(); else G.game.go('map'); },
  openMenu(title, items, cancel) { this.menu = new G.Menu(items, { y: 70, w: 190, gap: 15, onCancel: cancel || (() => { this.menu = null; }) }); this.menuTitle = title; },
  say(lines, done) { this.sp.play(lines, done); },
  /* ---------- interactions ---------- */
  interact(e) {
    if (e.kind === 'npc') return this.talkMenu(e.n);
    const k = e.h.kind, s = G.state;
    switch (k) {
      case 'exit': this.leave(); break;
      case 'court': this.courtMenu(); break;
      case 'poolhop': this.openMenu('POOL HOP', [{ label: 'Hop for prizes (uses the slot)', onPick: () => { this.menu = null; G.game.go('poolhop', { done: sc => { const m = Math.round(sc.money * G.T.moneyMul); G.earn(m); s.stats.poolBest = Math.max(s.stats.poolBest, sc.score); const pid = s.partner || s.tempPartner; if (pid && G.npcsAt('pool').includes(pid)) G.addAff(pid, 5, 'poolhop'); this.spendSlot(); G.finishSlot(); }, quit: () => G.game.go('location', { loc: 'pool' }) }); } }, { label: 'How to play', onPick: () => { this.menu = null; this.say([['PEPPER', 'Hop from lily pad to lily pad on the beat. Press ' + G.label('confirm') + ' when the ring closes. Misses are damp.']]); } }, { label: 'Back', onPick: () => { this.menu = null; } }]); break;
      case 'lounge': { const who = G.npcsAt(this.id).filter(i => i !== 'sonny'); if (!who.length) { this.say([['PEPPER', 'The loungers are empty. Disappointingly relaxing.']]); break; } this.openMenu('CHAT POOLSIDE (uses the slot)', who.map(id => ({ label: G.CAST[id].name, onPick: () => { this.menu = null; const d = G.addAff(id, 7, 'lounge'); this.say([[G.CAST[id].name, 'Ahh. Warm water, no brawling. Thanks for sitting with me.'], ['PEPPER', G.CAST[id].name + ' liked that. (+' + d + ')']], () => { this.spendSlot(); G.finishSlot(); }); } })).concat([{ label: 'Back', onPick: () => { this.menu = null; } }])); break; }
      case 'hang': { const who = G.npcsAt(this.id).filter(i => i !== 'sonny' && i !== 'pepper'); if (!who.length) { this.say([['PEPPER', 'Nobody to stroll with. The smoothie machine is lonely.']]); break; } this.openMenu('SMOOTHIE STROLL (uses the slot)', who.map(id => ({ label: G.CAST[id].name, onPick: () => { this.menu = null; const gift = G.GIFTS[0]; const rx = G.giftReaction(id, gift), d = G.addAff(id, Math.max(3, rx.pts + 2), 'hang'); this.say([[G.CAST[id].name, rx.line], ['PEPPER', 'Smoothie stroll: ' + G.CAST[id].name + ' ' + (d >= 0 ? '+' : '') + d]], () => { this.spendSlot(); G.finishSlot(); }); } })).concat([{ label: 'Back', onPick: () => { this.menu = null; } }])); break; }
      case 'shopSuit': G.game.go('shop', { kind: 'suit', back: this.id }); break;
      case 'shopGift': G.game.go('shop', { kind: 'gift', back: this.id }); break;
      case 'shopHat': G.game.go('shop', { kind: 'hat', back: this.id }); break;
      case 'statue': this.say([['SONNY', 'This statue is a tribute to my humility. It is eleven metres tall.'], ['PEPPER', 'It is four metres tall, sir.']]); break;
      case 'board': this.say([['PEPPER', 'Season record: ' + s.stats.wins + ' wins, ' + s.stats.losses + ' losses. Spikes ' + s.stats.spikes + ', aces ' + s.stats.aces + ', blocks ' + s.stats.blocks + '.']]); break;
      case 'nap': this.openMenu('NAP (uses the slot)', [{ label: 'Sleep through it', onPick: () => { this.menu = null; if (s.partner) G.addAff(s.partner, -1, 'neglect'); this.say([['JO', 'Zzz. Mmm. Seagulls. Zzz.']], () => { this.spendSlot(); G.finishSlot(); }); } }, { label: 'Not now', onPick: () => { this.menu = null; } }]); break;
      case 'wardrobe': G.game.go('wardrobe', { back: this.id }); break;
      case 'desk': this.openMenu('WRITING DESK', [{ label: 'Save game', onPick: () => { this.menu = null; G.game.saves.show('save'); } }, { label: 'Load game', onPick: () => { this.menu = null; G.game.saves.show('load'); } }, { label: 'Journal', onPick: () => { G.game.go('journal', { back: this.id }); } }, { label: 'Postcard album', onPick: () => { G.game.go('album', { back: this.id }); } }, { label: 'Back', onPick: () => { this.menu = null; } }]); break;
      case 'mirror': if (G.openPhoto) G.openPhoto('Your Villa'); break;
      case 'cashier': this.say([['SONNY', 'The cashier cheerfully swaps your S$ for fun. There is no chip conversion: your wallet IS your stack. Cash is king!']]); break;
      case 'slots': case 'bj': case 'roulette': this.spendSlot(); G.game.go('casino', { game: k, back: this.id }); break;
      default: break;
    }
  },
  courtMenu() {
    const s = G.state, pid = s.partner || s.tempPartner;
    const go = (hard) => { this.menu = null; const rivals = [['ruby', 'tomo'], ['ines', 'hana'], ['tomo', 'ines'], ['ruby', 'gwen']]; const rv = rivals[(s.day + s.slot + (hard ? 1 : 0)) % rivals.length].filter(i => i !== pid);
      const opp = rv.length < 2 ? [rv[0], 'tomo'] : rv; const cfg = { teams: [['you', pid], opp], chem: [G.chemistry() || .3, 0], to: hard ? 9 : 7, skillBonus: [0, hard ? .2 : -.05] };
      G.game.go('match', { cfg, humanTeam: 0, rematch: false, noQuit: true, onEnd: res => { const out = G.afterStoryMatch(hard ? 'challenge' : 'practice', res); this.spendSlot(); G.cutscene([['PEPPER', (res.winner === 0 ? 'A win. ' : 'A loss. ') + 'Prize: ' + G.fmtMoney(out.got) + '. ' + (pid ? G.CAST[pid].name + ' ' + (res.winner === 0 ? 'high-fives you.' : 'pretends not to be disappointed.') : '')]], [pid], () => G.finishSlot(), { bg: 'beach' }); } }); };
    if (!pid) { this.say([['PEPPER', 'You need a partner first. Finish the welcome match.']]); return; }
    this.openMenu('SUNSET COURTS (uses the slot)', [{ label: 'Practice match with ' + G.CAST[pid].name, onPick: () => go(false) }, { label: 'Challenge match (tougher, bigger prize)', onPick: () => go(true) }, { label: 'Back', onPick: () => { this.menu = null; } }]);
  },
  talkMenu(n) {
    const id = n.id, c = G.CAST[id], s = G.state; const items = [];
    items.push({ label: 'Chat', onPick: () => { this.menu = null; const r = G.chat(id); this.say([[c.name, r.line]].concat(r.d ? [['PEPPER', c.name + ' warmed up to you. (+' + r.d + ')']] : []), () => { }); } });
    items.push({ label: 'Give a gift', onPick: () => { this.giftMenu(id); } });
    if (s.owned.suits.length > 1 && id !== 'sonny' && id !== 'pepper') items.push({ label: 'Give a swimsuit', onPick: () => { this.suitMenu(id); } });
    if (G.PARTNERS.includes(id)) items.push({ label: s.partner === id ? 'Your partner' : 'Ask to team up', disabled: s.partner === id, onPick: () => { this.menu = null; if (G.canTeamUp(id)) { G.setPartner(id); this.say([[c.name, 'Partners? ...Okay. Yes. Do not make this weird.']]); } else this.say([[c.name, 'Hm. Maybe when we know each other better. (Friendship 30 needed)']]); } });
    items.push({ label: 'About ' + c.name, onPick: () => { this.menu = null; this.say([[c.name, c.full + '. ' + c.style + '.'], ['PEPPER', c.bio + ' Mood today: ' + G.MOOD_TXT[G.moodOf(id, s.day)] + '. Friendship ' + G.affinity(id) + '/100.']]); } });
    items.push({ label: 'Back', onPick: () => { this.menu = null; } });
    this.openMenu(c.name + '  ' + '♥'.repeat(G.hearts(id)) + '  ' + G.MOOD_TXT[G.moodOf(id, s.day)], items);
  },
  giftMenu(id) {
    const s = G.state, have = G.GIFTS.filter(g => s.bag[g.id] > 0);
    if (!have.length) { this.menu = null; this.say([['PEPPER', 'Your gift bag is empty. The Gift Kiosk on the Promenade has smoothies, charms and dice.']]); return; }
    this.openMenu('GIVE TO ' + G.CAST[id].name, have.map(g => ({ label: g.name, value: 'x' + s.bag[g.id], onPick: () => { this.menu = null; const r = G.giveGift(id, g.id); if (!r) return; s.known = s.known || {}; (s.known[id] = s.known[id] || {})[g.cat] = r.bad ? 'dislike' : r.loved ? 'love' : 'like'; this.say([[G.CAST[id].name, r.line]].concat(r.refused ? [] : [['PEPPER', (r.d >= 0 ? '+' : '') + r.d + ' friendship.']]), () => { }); } })).concat([{ label: 'Back', onPick: () => { this.menu = null; } }]), () => this.talkMenu(this.npcs.find(n => n.id === id)));
  },
  suitMenu(id) {
    const s = G.state, list = G.SUITS.filter(x => s.owned.suits.includes(x.id) && x.id !== s.suit && x.id !== s.npcSuit[id]);
    if (!list.length) { this.menu = null; this.say([['PEPPER', 'No spare swimsuits. Buy another at the Boutique.']]); return; }
    this.openMenu('GIVE A SWIMSUIT', list.map(x => ({ label: x.name, onPick: () => { this.menu = null; G.giftNpcSuit(id, x.id); const d = G.addAff(id, G.CAST[id].loves && G.CAST[id].loves.includes('fashion') ? 12 : 6, 'suit'); this.say([[G.CAST[id].name, 'A swimsuit? For me? I am wearing it right now. Immediately.'], ['PEPPER', G.CAST[id].name + ' wears the ' + x.name + ' from now on. (+' + d + ')']]); } })).concat([{ label: 'Back', onPick: () => { this.menu = null; } }]), () => this.talkMenu(this.npcs.find(n => n.id === id)));
  },
  attractWalk(dt) {
    this.at = (this.at || 0) + dt; if (this.at > (this.d.time || 10)) { G.attractNext(); return; }
    if (!this.target || Math.hypot(this.target[0] - this.me.x, this.target[1] - this.me.y) < 6) { const es = this.entities().filter(e => !(e.kind === 'hot' && e.h.kind === 'exit')); const e = es[Math.floor(this.at / 2.2) % es.length]; if (e) this.target = [e.x, e.y + 12]; }
  },
  /* ---------- update ---------- */
  walk(dt) {
    const me = this.me, L = this.loc; let dx = 0, dy = 0;
    if (this.target) { const tx = this.target[0] - me.x, ty = this.target[1] - me.y, l = Math.hypot(tx, ty); if (l >= 3) { dx = tx / l; dy = ty / l; } }
    const sp = 74; me.vx = approach(me.vx, dx * sp, dt * 600); me.vy = approach(me.vy, dy * sp, dt * 600); me.x = clamp(me.x + me.vx * dt, -L.hw + 6, L.hw - 6); me.y = clamp(me.y + me.vy * dt, -L.hh + 10, L.hh - 4);
    if (Math.hypot(me.vx, me.vy) > 6) me.face = Math.atan2(me.vy, me.vx);
    this.rig.update(dt, { x: me.x, y: me.y, z: 0, vx: me.vx, vy: me.vy, facing: me.face });
    for (const n of this.npcs) { n.face = Math.atan2(me.y - n.y, me.x - n.x); n.rig.update(dt, { x: n.x, y: n.y, z: 0, vx: 0, vy: 0, facing: n.face }); }
    const ents = this.entities(); let best = null, bd = 28; for (const e of ents) { const d = Math.hypot(e.x - me.x, e.y - me.y); if (d < bd) { bd = d; best = e; } } this.sel = best;
    G.game.focus(clamp(me.x, -L.hw + 140, L.hw - 140) * (L.hw > 140 ? 1 : 0), clamp(me.y, -L.hh + 60, L.hh - 60) * .6, 8);
  },
  update(dt) {
    this.t += dt; const I = G.game.input, me = this.me, L = this.loc;
    if (this.d.attract) { this.attractWalk(dt); return this.walk(dt); }
    if (this.sp.open) { this.sp.update(dt); this.pend = null; return; }
    if (this.menu) { this.menu.update(dt); return; }
    // movement: stick/keys, or walk to a clicked target
    const mv = I.move(), len = Math.min(1, Math.hypot(mv[0], mv[1]));
    let dx = 0, dy = 0;
    if (len > .1) { const d = G.game.view.screenDirToGround(mv[0], mv[1]); dx = d[0] * len; dy = d[1] * len; this.pend = null; this.target = null; }
    else if (this.target) { const tx = this.target[0] - me.x, ty = this.target[1] - me.y, l = Math.hypot(tx, ty); if (l < 3) this.target = null; else { dx = tx / l; dy = ty / l; } }
    const sp = 74; me.vx = approach(me.vx, dx * sp, dt * 600); me.vy = approach(me.vy, dy * sp, dt * 600);
    me.x = clamp(me.x + me.vx * dt, -L.hw + 6, L.hw - 6); me.y = clamp(me.y + me.vy * dt, -L.hh + 10, L.hh - 4);
    if (Math.hypot(me.vx, me.vy) > 6) me.face = Math.atan2(me.vy, me.vx);
    this.rig.update(dt, { x: me.x, y: me.y, z: 0, vx: me.vx, vy: me.vy, facing: me.face });
    for (const n of this.npcs) { const a = Math.atan2(me.y - n.y, me.x - n.x); n.face = a; n.rig.update(dt, { x: n.x, y: n.y + Math.sin(this.t * 1.5 + n.ph) * .3, z: 0, vx: 0, vy: 0, facing: n.face }); }
    // nearest interactable
    const ents = this.entities(); let best = null, bd = 28;
    for (const e of ents) { const d = Math.hypot(e.x - me.x, e.y - me.y); if (d < bd) { bd = d; best = e; } }
    // mouse hover/click on entities (screen distance)
    const p = I.pointer(), cl = I.clicked();
    if (this.scr && cl) { let ce = null, cd = 18; for (const e of this.scr) { const d = Math.hypot(e.sx - cl[0], e.sy - cl[1]); if (d < cd) { cd = d; ce = e.e; } } if (ce) { this.pend = ce; this.target = [ce.x, ce.y + (ce.kind === 'npc' ? 10 : 0)]; } else { const gp = this.org && G.game.view.toGround(cl[0] - this.org[0], cl[1] - this.org[1]); if (gp) this.target = [clamp(gp[0], -L.hw, L.hw), clamp(gp[1], -L.hh, L.hh)]; this.pend = null; } }
    this.sel = best;
    if (this.pend) { const d = Math.hypot(this.pend.x - me.x, this.pend.y - me.y); if (d < 24) { const e = this.pend; this.pend = null; this.target = null; this.interact(e); return; } }
    if (I.pressed('confirm') && best) { this.interact(best); return; }
    if (I.pressed('photo') && G.openPhoto) G.openPhoto(L.name);
    void p;
    this.cx = clamp(me.x, -L.hw + 140, L.hw - 140) * (L.hw > 140 ? 1 : 0); this.cy = clamp(me.y, -L.hh + 60, L.hh - 60) * .6;
    G.game.focus(this.cx, this.cy, 8);
  },
  /* ---------- draw ---------- */
  draw(r) {
    const W = r.W, H = r.H, t = this.t, night = this.night, L = this.loc, g = r.tgt;
    // backdrop: sky and sea above the floor
    const far = r.w(0, -L.hh, 0)[1];
    const sky = night ? ['#06061a', '#0e0e3a', '#1a1a5a', '#2a2a7a'] : ['#4aa8e8', '#78c4f0', '#a0daf8', '#c8eefc'];
    const top = Math.max(0, Math.round(far));
    for (let i = 0; i < sky.length; i++) px.rect(g, 0, Math.floor(i * top / sky.length), W, Math.ceil(top / sky.length) + 1, sky[i]);
    px.rect(g, 0, Math.round(top * .6), W, Math.round(top * .4) + 1, night ? '#0a3a6a' : '#2a9ad0');
    px.rect(g, 0, 0, 0, 0, '#000'); px.rect(g, 0, top, W, H - top, night ? '#2a2a3a' : '#f4dca0');
    L.scenery(r, t, night);
    this.scr = []; const ents = this.entities();
    // npcs
    for (const n of this.npcs) { r.shadow(n.x, n.y, 6, .35); r.actor(n.x, n.y, 0, (gg, ox, oy) => n.rig.draw(gg, ox, oy, r.view)); }
    r.shadow(this.me.x, this.me.y, 6, .4); r.actor(this.me.x, this.me.y, 0, (gg, ox, oy) => this.rig.draw(gg, ox, oy, r.view));
    for (const e of ents) { const [sx, sy] = r.w(e.x, e.y, e.kind === 'npc' ? 22 : 8); this.scr.push({ e, sx, sy }); }
    this.org = r.w(0, 0, 0);
    // hotspot markers and labels
    for (const e of ents) {
      const sel = this.sel === e, z = e.kind === 'npc' ? 40 : 14;
      r.queue(e.x, e.y, z, gg => { const [x, y] = r.w(e.x, e.y, z + Math.sin(t * 4 + e.x) * 1.5); const X = Math.round(x), Y = Math.round(y); if (e.kind === 'hot' && e.h.kind !== 'exit') px.poly(gg, [[X - 3, Y - 6], [X + 3, Y - 6], [X, Y]], sel ? '#fff06a' : '#ffd24a'); else if (e.kind === 'npc' && sel) px.poly(gg, [[X - 3, Y - 6], [X + 3, Y - 6], [X, Y]], '#fff06a'); if (e.kind === 'hot' && e.h.kind === 'exit') px.poly(gg, [[X - 4, Y - 3], [X + 4, Y - 3], [X, Y + 3]], sel ? '#fff06a' : '#9be0ff'); }, { emissive: true });
    }
    r.overlay(gg => {
      if (this.sel && !this.menu && !this.sp.open) {
        const e = this.sel, [x, y] = r.w(e.x, e.y, e.kind === 'npc' ? 50 : 22), lab = e.label, w = E.font.width(lab) + 12 + (e.kind === 'npc' ? 20 : 0), X = Math.round(clamp(x - w / 2, 2, W - w - 2)), Y = Math.round(clamp(y - 16, 22, H - 30));
        G.panel(gg, X, Y, w, 13); G.text(gg, lab, X + 6, Y + 3, '#fff6c8'); if (e.kind === 'npc') G.text(gg, '♥'.repeat(G.hearts(e.n.id)), X + w - 4, Y + 3, '#ff6a8a', { align: 'right' });
      }
      E.font.text(gg, L.name.toUpperCase(), W - 66, 5, '#ffe08a', { align: 'right', shadow: '#000', outline: false });
    });
    G.hudTop(r);
    if (this.menu) { r.overlay(gg => { G.text(gg, this.menuTitle, Math.round(W / 2), 52, '#ffd24a', { align: 'center' }); }); this.menu.draw(r); G.drawPrompts(r, [['confirm', 'Select'], ['cancel', 'Back']]); }
    else if (this.sp.open) { this.sp.draw(r); }
    else G.drawPrompts(r, [['confirm', this.sel ? (this.sel.kind === 'npc' ? 'Talk' : 'Use') : 'Interact'], ['photo', 'Postcard'], ['pause', 'Pause']]);
  }
});
