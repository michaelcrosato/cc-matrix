/* 34-story: the story. A cutscene is a list of steps run on a staged place (its map, props and cast): say, walk, face,
 * act (a move), emote balloons, waits, camera moves, choices, effects. Options asks "Skip scene?". The events: the
 * invitation and character select, the arrival, the welcome match, the casino opening, the villa visit, the rain, the
 * overheard call, Pepper's letter, the semifinal, the Fortuna Cup final, the farewell party, two endings, credits. */
G.SCENES.cutscene = {
  pausable: false, view: 'threequarter', input: G.INPUT.MENU, camera: { zoom: [.9, 1.6], start: 1.25 },
  enter(d) {
    this.d = d; this.i = -1; this.wait = 0; this.t = 0; this.emotes = []; this.skipAsk = false; this.busy = null;
    this.loc = d.loc || 'beach'; this.map = G.locMaps()[this.loc]; this.tod = d.tod || (G.state ? G.todNow() : 'afternoon'); G.curTod = this.tod;
    this.cast = (d.cast || []).map(c => { const w = c.suit ? { suit: c.suit, acc: c.acc || [] } : G.wearOf(c.id); const rig = G.anim.rig(G.makeRig(c.id, (G.CAST[c.id].shirt || G.CAST[c.id].robe) && !c.suit ? {} : { suit: w.suit, acc: w.acc })); return Object.assign({ rig, f: Math.PI / 2, z: 0, act: null }, c); });
    G.applyLight(this.tod, 'sunny', this.tod === 'night'); G.UI.theme = this.tod === 'night' ? 'night' : 'day';
    G.music(d.music || 'island'); G.ambience.set(this.tod === 'night' ? 'night' : 'beach');
    this.cam = d.cam ? d.cam.slice() : [352, 260]; this.zoom = d.zoom || 1.2; G.game.setZoom(this.zoom); G.game.cam.bounds = null; G.game.cam.smooth = .3;
    G.talkBox().close(); this.next();
    G.photoSubjects = () => this.cast.map(c => ({ id: c.id, rig: c.rig }));
  },
  exit() { G.game.setZoom(1); G.photoSubjects = null; },
  who(id) { return this.cast.find(c => c.id === id); },
  next() {
    this.i++; const st = this.d.steps[this.i];
    if (!st) { const then = this.d.then; this.d.then = null; if (then) then(); return; }
    const [op, a, b, c, e] = st;
    if (op === 'say') { this.busy = 'say'; G.say(a, b, Object.assign({}, c || {}, { onDone: () => { this.busy = null; this.next(); } })); }
    else if (op === 'choice') { this.busy = 'say'; G.say(a, b, { choices: c, onChoice: k => { this.busy = null; if (e) e(k); this.next(); } }); }
    else if (op === 'walk') { const w = this.who(a); if (w) { this.tw = { w, x0: w.x, y0: w.y, x1: b, y1: c, t: 0, dur: e || 1 }; w.f = Math.atan2(c - w.y, b - w.x); } this.wait = e || 1; }
    else if (op === 'face') { const w = this.who(a); if (w) w.f = b; this.next(); }
    else if (op === 'act') { const w = this.who(a); if (w) w.act = { kind: b, t: 0, dur: c || 1, o: e || {} }; this.next(); }
    else if (op === 'emote') { const w = this.who(a); if (w) this.emotes.push({ w, kind: b, t: 0 }); G.sfx(b === 'heart' ? 'heart_up' : 'ui_tick'); this.next(); }
    else if (op === 'wait') this.wait = a;
    else if (op === 'cam') { this.camTo = { x0: this.cam[0], y0: this.cam[1], x1: a, y1: b, z0: this.zoom, z1: c || this.zoom, t: 0, dur: e || 1 }; this.wait = e || 1; }
    else if (op === 'fx') { if (a) a(this); this.next(); }
    else if (op === 'fade') { G.game.flash(a || '#000000', .4); this.next(); }
    else this.next();
  },
  skip() { G.talkBox().close(); this.busy = null; const then = this.d.then; this.d.then = null; this.d.steps = []; if (this.d.onSkip) this.d.onSkip(); if (then) then(); },
  update(dt) {
    this.t += dt; const I = G.game.input;
    if (this.skipAsk) { if (I.pressed('confirm')) { this.skipAsk = false; this.skip(); } else if (I.pressed('cancel') || I.pressed('pause')) this.skipAsk = false; return; }
    if (I.pressed('pause') || I.pressed('start') && !G.talkBox().open) { this.skipAsk = true; return; }
    if (this.tw) { const T = this.tw; T.t += dt; const u = Math.min(1, T.t / T.dur); T.w.x = lerp(T.x0, T.x1, u); T.w.y = lerp(T.y0, T.y1, u); T.w.moving = u < 1; if (u >= 1) this.tw = null; }
    if (this.camTo) { const C = this.camTo; C.t += dt; const u = E.ease.inOutSine(Math.min(1, C.t / C.dur)); this.cam = [lerp(C.x0, C.x1, u), lerp(C.y0, C.y1, u)]; this.zoom = lerp(C.z0, C.z1, u); G.game.setZoom(this.zoom); if (u >= 1) this.camTo = null; }
    G.game.focus(this.cam[0], this.cam[1], 10);
    for (const c of this.cast) {
      let vb = null, pose = c.pose || null, z = c.z || 0, flip = 0, down = c.down || 0;
      if (c.act) { c.act.t += dt; const u = c.act.t / c.act.dur; if (u >= 1) c.act = null; else { const k = c.act.kind; vb = G.MOVES[k] ? { kind: k, u, w: G.anim.weight(u) } : null; pose = G.anim.pose(k) || c.act.o.pose || pose; if (c.act.o.hop) z += Math.abs(Math.sin(u * Math.PI * 3)) * c.act.o.hop; if (c.act.o.flip) flip = u; if (c.act.o.fall) down = Math.min(1, u * 2); } }
      c.rig.vb = vb; const sp = c.moving ? 60 : 0;
      c.rig.update(dt, { x: c.x, y: c.y, z, vx: Math.cos(c.f) * sp, vy: Math.sin(c.f) * sp, facing: c.f, pose, flip, down, air: flip > 0, expr: c.expr || (G.talkBox().open && G.talkBox().name === G.CAST[c.id].short.toUpperCase() ? 'smile' : null) });
      c.moving = false;
    }
    this.emotes = this.emotes.filter(e => (e.t += dt) < 1.4);
    if (this.d.tick) this.d.tick(this, dt);
    if (this.busy === 'say') { G.talkBox().update(dt); return; }
    if (this.wait > 0) { this.wait -= dt; if (this.wait <= 0) this.next(); }
    if (G.talkBox().open) G.talkBox().update(dt);
  },
  draw(r) {
    const night = this.tod === 'night';
    if (this.loc !== 'villa' && this.loc !== 'casino') G.backdrop(this.tod).draw(r);
    this.map.drawFloor(r); this.map.queueWalls(r); G.drawLocProps(r, this.loc, night);
    if (this.d.drawExtra) this.d.drawExtra(r, this);
    for (const c of this.cast) { r.shadow(c.x, c.y, 6, .3); r.actor(c.x, c.y, c.z || 0, (g, ox, oy) => c.rig.draw(g, ox, oy, r.view), { key: c.rig }); }
    for (const e of this.emotes) { const w = e.w, z = 52 + e.t * 6; r.queue(w.x, w.y, z, g => { const [sx, sy] = r.w(w.x, w.y, z), X = Math.round(sx), Y = Math.round(sy); px.disc(g, X, Y, 6, '#ffffff'); px.disc(g, X, Y, 5, '#fff8e8'); const ic = { heart: '♥', '!': '!', '?': '?', note: '♪', dots: '...' }[e.kind] || '!'; E.font.text(g, ic, X, Y - 3, e.kind === 'heart' ? '#ff5f7a' : '#2a2e3c', { align: 'center', outline: false }); }, { bias: 80 }); }
    if (night) G.game.lights.add(this.cam[0], this.cam[1], 30, 140, .6, { color: '#ffd8a0' });
    G.talkBox().draw(r);
    r.overlay(g => {
      if (this.d.caption && this.t < 6) { E.font.title(g, this.d.caption, r.W / 2, Math.round(r.H * .12), { scale: 2, colors: ['#fff7d6', '#ffd36a', '#ff9e5e'], align: 'center', depth: 2 }); }
      if (this.skipAsk) { G.UI.panel(g, r.W / 2 - 90, r.H * .4, 180, 40); E.font.text(g, 'Skip scene?', r.W / 2, r.H * .4 + 8, '#ffd36a', { align: 'center', outline: false }); E.font.text(g, G.btn('confirm') + ' Yes   ' + G.btn('cancel') + ' No', r.W / 2, r.H * .4 + 24, '#fff8e8', { align: 'center', outline: false }); }
    });
    if (!this.skipAsk) G.promptBar(r, [['confirm', 'Next'], ['pause', 'Skip']], G.game.input, 6);
  }
};
G.cutscene = (d, o) => G.go('cutscene', d, o || { fade: .5 });
/* ---- the invitation, on parchment with Sonny's gold seal ---- */
G.SCENES.invitation = {
  input: G.INPUT.MENU,
  exit() { G.game.setZoom(1); },
  enter(d) { this.d = d || {}; this.t = 0; G.applyLight('sunset'); this.text = 'You are cordially invited to the AHEAD OR ALIVE Invitational on the private island of Isla Fortuna.\n\nPrize: everything.\n\n— S. Fortuna, Esq.'; this.hook = G.voice.hook('sonny'); this.shown = 0; G.music('sunrise'); },
  update(dt) {
    this.t += dt; const I = G.game.input, prev = Math.floor(this.shown); this.shown = Math.min(this.text.length, this.shown + dt * 40); for (let n = prev; n < Math.floor(this.shown); n++) this.hook(this.text[n], n, this.text);
    if (I.pressed('cancel')) { G.go('menu'); return; }
    if (I.pressed('confirm') || I.clicked()) { if (this.shown < this.text.length) this.shown = this.text.length; else G.go('charselect', this.d); }
  },
  draw(r) {
    if (!this.cast) this.cast = G.titleCast(); G.updateCast(this.cast, 1 / 60, this.t || 0); G.game.focus(352, 96, 30); G.game.setZoom(1.3);
    G.drawBeachStage(r, this.cast, 'sunset');
    r.overlay(g => {
      const W = r.W, H = r.H, w = Math.min(300, W - 40), h = Math.round(H * .72), x = Math.round(W / 2 - w / 2), y = Math.round(H * .1);
      px.blend(g, .45, 'multiply', () => px.rect(g, 0, 0, W, H, '#5a3a6a'));
      E.ui.box(g, x + 4, y + 4, w, h, { bg: '#2a1020', border: '#2a1020', gradient: false, alpha: .5 });
      E.ui.box(g, x, y, w, h, { bg: ['#fbf2dc', '#e0c890'], border: '#c89020' });
      for (let k = 0; k < 40; k++) { const sx = x + 6 + (E.hash2(k, 3) * (w - 12)) | 0, sy = y + 6 + (E.hash2(k, 7) * (h - 12)) | 0; px.dot(g, sx, sy, k % 2 ? '#e8d4a8' : '#f0dcb0'); }
      for (const [cx, cy] of [[x + 8, y + 8], [x + w - 9, y + 8], [x + 8, y + h - 9], [x + w - 9, y + h - 9]]) { px.disc(g, cx, cy, 3, '#ffd36a'); px.dot(g, cx - 1, cy - 1, '#fff3c0'); }
      for (let k = 0; k < 6; k++) px.dot(g, x + 6 + k * 40, y + h - 5, '#c8a870');
      E.font.title(g, 'AN INVITATION', W / 2, y + 10, { scale: 2, colors: ['#c89020', '#8a5a10'], align: 'center', depth: 1, depthColor: '#5a3a10' });
      E.font.text(g, this.text.slice(0, Math.floor(this.shown)), x + 16, y + 40, '#3a2410', { outline: false, wrap: w - 32, lineGap: 2 });
      px.disc(g, x + w - 32, y + h - 30, 14, '#c89020'); px.disc(g, x + w - 32, y + h - 30, 11, '#ffd36a'); E.font.text(g, 'SF', x + w - 32, y + h - 34, '#8a5a10', { align: 'center', outline: false });
      if (this.shown >= this.text.length) E.font.text(g, 'Who opened it?', W / 2, y + h + 8, '#fff8e8', { align: 'center', shadow: '#000', outline: false, scale: 1 });
    });
    G.promptBar(r, [['confirm', 'Continue'], ['cancel', 'Back']]);
  }
};
/* ---- character select: six cards with portraits, epithets, styles, stats as bars and tastes ---- */
G.SCENES.charselect = {
  input: G.INPUT.MENU,
  enter(d) { this.d = d || {}; this.focus = new G.Focus(); this.t = 0; this.rigs = {}; },
  layout() { const W = G.game.W, H = G.game.H, cw = Math.round(W * .14), ch = Math.round(H * .3), x0 = Math.round(W / 2 - (cw * 3 + 12) / 2), y0 = Math.round(H * .14); return G.FIGHTERS.map((id, k) => ({ id, x: x0 + (k % 3) * (cw + 6), y: y0 + Math.floor(k / 3) * (ch + 6), w: cw, h: ch })); },
  update(dt) {
    this.t += dt; const f = this.focus.set(this.layout()).update();
    if (f.back) { G.go('invitation', this.d); return; }
    if (f.pick) G.beginVacation(f.pick.id, this.d.ngPlus);
  },
  draw(r) {
    G.backdrop('afternoon').draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H, L = this.layout(); G.UI.title(g, 'WHO OPENED IT?', W / 2, Math.round(H * .03), { scale: 2 });
      L.forEach((it, k) => { const c = G.CAST[it.id], foc = k === this.focus.i; E.ui.box(g, it.x, it.y - (foc ? 1 : 0), it.w, it.h, { bg: foc ? ['#1f7a8c', '#12475a'] : G.UI.T.bg, border: foc ? '#ffd36a' : c.color }); if (foc) G.UI.focus(g, it.x, it.y, it.w, it.h);
        G.portrait(g, it.id, it.x + it.w / 2 - 16, it.y + 4, 32); E.font.text(g, c.short, it.x + it.w / 2, it.y + 40, '#ffd36a', { align: 'center', outline: false }); E.font.text(g, c.epithet, it.x + it.w / 2, it.y + 50, '#fff8e8', { align: 'center', outline: false, wrap: it.w - 4 }); });
      const cur = G.CAST[this.focus.cur.id], x = Math.round(W * .06), y = Math.round(H * .78);
      G.UI.panel(g, x - 4, y - 4, Math.round(W * .88), Math.round(H * .18));
      E.font.text(g, cur.name + ' • ' + cur.from + ' • ' + cur.style + ' • ' + cur.age, x + 2, y, '#ffd36a', { outline: false });
      E.font.text(g, cur.personality, x + 2, y + 10, '#fff8e8', { outline: false, wrap: Math.round(W * .5) });
      G.STATS_ORDER.forEach((s, k) => { const bx = Math.round(W * .6) + (k % 2) * Math.round(W * .17), by = y + Math.floor(k / 2) * 14; E.font.text(g, G.STAT_NAMES[s], bx, by, '#9fd3d6', { outline: false }); E.ui.bar(g, bx + 46, by + 1, 40, 5, cur.stats[s] / 10, '#ff9e5e'); });
      E.font.text(g, 'Likes: ' + cur.tastes.join(', ') + ' styles', x + 2, y + 30, '#ff8ac8', { outline: false });
    });
    G.promptBar(r, [['confirm', 'Choose'], ['cancel', 'Back']]);
  }
};
G.newVacationFlow = (ngPlus) => G.go('invitation', { ngPlus });
G.beginVacation = (me, ngPlus) => {
  const old = G.state, seed = (G.hash(me + ':' + Date.now()) % 100000) + 1;
  G.state = G.newState(me, seed); const S = G.state;
  if (ngPlus && old) { S.ngPlus = (old.ngPlus || 0) + 1; S.wardrobe.suits = Array.from(new Set(old.wardrobe.suits.concat(S.wardrobe.suits))); S.wardrobe.acc = Array.from(new Set(old.wardrobe.acc.concat(S.wardrobe.acc))); S.album = old.album.slice(); S.stats = Object.assign({}, old.stats); S.money = G.T.startMoney + Math.round(old.money * .1); for (const id of G.npcs()) S.affinity[id] = clamp(G.baseAff(me, id) + 10, 0, 100); }
  G.rigs = {}; G.dayStart(); G.unlock(S.wardrobe.suits);
  G.storyArrival();
};
/* ---- D1 morning: the arrival at the dock, then the welcome match ---- */
G.storyArrival = () => {
  const S = G.state, me = S.me, others = G.npcs(), line = id => ({ rin: 'Hm. No ring. No referee. Suspicious.', lola: '¡Hola, island! La Tormenta has ARRIVED!', ingrid: 'It is hot. Why is it so hot.', amara: 'Okay, this place is GORGEOUS.', tess: 'Waves look sick. Where\'s the fight, though?', mei: 'I already found three hiding spots. Hehe.' }[id]);
  const cast = [{ id: me, x: 120, y: 150, f: 0 }].concat(others.map((id, k) => ({ id, x: [116, 148, 232, 264, 290][k], y: [168, 176, 176, 168, 156][k], f: Math.PI / 2 }))).concat([{ id: 'sonny', x: 176, y: 120, f: Math.PI / 2 }, { id: 'pepper', x: 210, y: 116, f: Math.PI / 2 }]);
  const steps = [['wait', .6], ['walk', me, 190, 150, 1.4], ['face', me, Math.PI / 2], ['say', 'pepper', 'Welcome to Isla Fortuna. Please keep your hands and fists inside the island at all times.']];
  for (const id of others) steps.push(['act', id, 'wave', 1], ['say', id, line(id)]);
  steps.push(['act', 'sonny', 'cheer', 1.4, { hop: 4 }], ['say', 'sonny', ['WELCOME, FIGHTERS, TO ISLA FORTUNA!', 'The tournament of the century is... drumroll... BEACH VOLLEYBALL!']], ['emote', me, '?'], ['emote', others[0], '!'],
    ['say', 'sonny', 'And a VACATION! You\'re welcome!'], ['say', 'pepper', ['Villa keys. Sunscreen is in the minibar. The Cup is in five days.', 'Every activity takes a morning, an afternoon or a night. Mr. Fortuna is not taking questions.']],
    ['say', 'pepper', 'Please don\'t feed him.'], ['say', 'sonny', 'Allow me to DEMONSTRATE! A friendly match, CHAMP!']);
  G.cutscene({ loc: 'dock', tod: 'morning', cast, cam: [190, 136], zoom: 1.4, music: 'island', caption: 'DAY 1 • ARRIVAL', steps, then: () => S.ngPlus ? G.say('pepper', 'You have done this before. Skip the Welcome Match?', { choices: ['Play it again', 'Skip it'], onChoice: k => k ? G.skipWelcome() : G.storyWelcome() }) : G.storyWelcome() });
};
/** New Vacation+: the starter partner and the prize, without the match */
G.skipWelcome = () => {
  const S = G.state, partner = G.npcs().slice().sort((a, b) => G.aff(b) - G.aff(a))[0];
  S.partner = partner; S.flags.tutorial = true; G.earn(10000, 'tutorial');
  G.say('pepper', 'Very well. ' + G.CAST[partner].short + ' is your partner. The prize money is in your account.', { onDone: () => G.endSlot('match') });
};
G.storyWelcome = () => {
  const S = G.state, partner = G.npcs().slice().sort((a, b) => G.aff(b) - G.aff(a))[0]; S.partner = partner;
  G.say('pepper', 'I have paired you with ' + G.CAST[partner].short + '. You get along best. Statistically.');
  const cfg = G.vacationMatchCfg(['sonny', 'pepper'], { partner, points: 5, title: 'THE WELCOME MATCH', base: [.2, .35], kits: ['house_sonny', 'pinstripe'], accs: [['aviators'], []], tutorial: true, prize: 10000, losePrize: 10000,
    next: () => { S.flags.tutorial = true; G.cutscene({ loc: 'beach', tod: 'morning', cam: [352, 250], cast: [{ id: 'sonny', x: 360, y: 240, f: Math.PI }, { id: 'pepper', x: 390, y: 236, f: Math.PI }, { id: S.me, x: 320, y: 240, f: 0 }, { id: partner, x: 300, y: 250, f: 0 }],
      steps: [['act', 'sonny', 'cheer', .8], ['say', 'sonny', 'FIVE PERCENT EFFORT! I was giving you FIVE PERCENT!'], ['act', 'sonny', 'fall', 2.2], ['wait', .5], ['say', 'pepper', 'He tripped on the sand. Again. Your prize money is in your account.'], ['say', partner, G.LINES[partner].win[0]]],
      then: () => G.endSlot('match') }); } });
  G.startMatch(cfg);
};
/* ---- the events that start a slot ---- */
G.slotEvent = () => {
  const S = G.state;
  if (S.day === 4 && S.slot === 1 && !S.flags.semiDone) return () => G.storySemifinal();
  if (S.day === 5 && S.slot === 1 && !S.flags.finalDone) return () => G.storyFinal();
  if (S.day === 5 && S.slot === 2 && !S.flags.partyDone) return () => G.storyParty();
  if (S.day === 3 && S.slot === 1 && !S.flags.rainPA) return () => { S.flags.rainPA = true; G.go('map'); G.game.after(.8, () => G.say('sonny', ['LIQUID SUNSHINE, PEOPLE!', 'The courts are OPEN! Wet balls are a FEATURE!'])); };
  return null;
};
/** the partner for a big match: yours, or Pepper assigns the free fighter */
G.ensurePartner = () => { const S = G.state; if (S.partner) return S.partner; const p = S.solo || G.npcs().sort((a, b) => G.aff(b) - G.aff(a))[0]; S.partner = p; S.teams = S.teams.filter(t => !t.includes(p)); return p; };
G.storySemifinal = () => {
  const S = G.state, partner = G.ensurePartner();
  const teams = S.teams.filter(t => !t.includes(partner)), best = teams.slice().sort((a, b) => { const ra = S.record[a.slice().sort().join('+')] || [0, 0], rb = S.record[b.slice().sort().join('+')] || [0, 0]; return (rb[0] - rb[1]) - (ra[0] - ra[1]); })[0] || G.npcs().filter(x => x !== partner).slice(0, 2);
  G.cutscene({ loc: 'beach', tod: 'afternoon', cam: [352, 240], caption: 'DAY 4 • THE SEMIFINAL', cast: [{ id: S.me, x: 320, y: 250, f: 0 }, { id: partner, x: 300, y: 262, f: 0 }, { id: best[0], x: 390, y: 244, f: Math.PI }, { id: best[1], x: 410, y: 258, f: Math.PI }, { id: 'sonny', x: 352, y: 200, f: Math.PI / 2 }],
    steps: [['say', 'sonny', 'SEMIFINAL TIME! The best record on the island wants a piece of YOU!'], ['say', best[0], G.LINES[best[0]].taunt[0]], ['say', best[1], G.LINES[best[1]].taunt[1]], ['say', partner, 'Let\'s show them.']],
    then: () => G.startMatch(G.vacationMatchCfg(best, { partner, title: 'SEMIFINAL', base: [.74, .74], prize: 30000, losePrize: 5000, onResult: won => { S.flags.semiDone = true; S.flags.seeded = won; }, next: () => G.endSlot('match') })) });
};
G.storyFinal = () => {
  const S = G.state, partner = G.ensurePartner();
  G.cutscene({ loc: 'beach', tod: 'sunset', cam: [352, 240], caption: 'THE FORTUNA CUP FINAL', music: 'house', cast: [{ id: S.me, x: 320, y: 250, f: 0 }, { id: partner, x: 300, y: 262, f: 0 }, { id: 'sonny', x: 392, y: 244, f: Math.PI, suit: 'house_sonny', acc: ['aviators'] }, { id: 'pepper', x: 412, y: 258, f: Math.PI, suit: 'pinstripe' }],
    drawExtra: r => { r.shape('banner', 250, 116, 0, { facing: Math.PI / 2 }); r.shape('banner', 454, 116, 0, { facing: Math.PI / 2 }); },
    steps: [['act', 'sonny', 'cheer', 1.2, { hop: 3 }], ['say', 'sonny', ['LADIES AND... LADIES!', 'Presenting the undefeated, the unstoppable... THE HOUSE!']], ['say', 'pepper', 'I bet the island on this. On him. On us. Mostly on me.'],
      ['say', 'sonny', 'Pepper! That was SUPPOSED to be a secret!'], ['say', partner, 'The island? Okay. No pressure.'], ['say', 'pepper', 'First to eleven. The house has... specials. You were warned.']],
    then: () => G.startMatch(G.vacationMatchCfg(['sonny', 'pepper'], { partner, title: 'THE FORTUNA CUP FINAL', subtitle: 'versus THE HOUSE', final: true, points: 11, base: [.7, .85], kits: ['house_sonny', 'pinstripe'], accs: [['aviators'], []], specials: { glare: true, houseEdge: true, luckySeven: true }, serveFirst: S.flags.seeded ? 0 : 1, prize: 100000, losePrize: 10000,
      onResult: won => { S.flags.finalDone = true; S.flags.wonFinal = won; if (won) { if (!S.wardrobe.suits.includes('fortunagold')) S.wardrobe.suits.push('fortunagold'); G.unlock(['fortunagold']); } }, next: () => G.endSlot('match') })) });
};
G.storyParty = () => {
  const S = G.state, others = G.npcs(), cast = [{ id: S.me, x: 352, y: 250, f: Math.PI / 2 }].concat(others.map((id, k) => ({ id, x: 290 + k * 30, y: 220 + (k % 2) * 16, f: Math.PI / 2 }))).concat([{ id: 'sonny', x: 420, y: 270, f: Math.PI }, { id: 'pepper', x: 280, y: 270, f: 0 }]);
  const steps = [['say', 'sonny', 'FAREWELL PARTY! Fireworks! Dancing! A BUFFET!']];
  for (const id of others) steps.push(['act', id, G.rpick('cosmetic', ['partydance', 'dance', 'groove', 'cheer2']), 2.4], ['say', id, G.LINES[id].farewell[G.aff(id) >= 60 ? 1 : 0]]);
  steps.push(['fx', sc => { for (const c of sc.cast) c.act = { kind: G.rpick('cosmetic', ['partydance', 'groove', 'dance']), t: 0, dur: 3, o: {} }; }], ['say', 'pepper', 'Everyone, squeeze in. Group postcard.'], ['fx', () => { G.sfx('shutter'); G.game.flash('#ffffff', .2); S.album.push({ loc: 'beach', day: 5, slot: 2, tod: 'night', people: cast.map(c => ({ id: c.id, pose: 'cheer' })), filter: 'Night Glow', frame: 'Postcard', img: G.photo.capture ? (G.photo.st = { filter: 4, frame: 1 }, G.photo.capture()) : null, at: Date.now(), party: true }); }], ['wait', 1.5]);
  G.cutscene({ loc: 'beach', tod: 'night', music: 'farewell', cam: [352, 240], zoom: 1.1, caption: 'FAREWELL PARTY', cast, steps,
    tick: (sc, dt) => { if (G.rng('cosmetic') < dt * 1.5) G.fx.firework(300 + G.rng('cosmetic') * 120, 110, 80 + G.rng('cosmetic') * 40); },
    then: () => { S.flags.partyDone = true; S.flags.wonFinal ? G.storyEndingA() : G.storyEndingB(); } });
};
G.storyEndingA = () => {
  const S = G.state;
  G.cutscene({ loc: 'dock', tod: 'morning', music: 'farewell', cam: [190, 160], zoom: 1.4, caption: 'THE HOUSE FOLDS', cast: [{ id: 'sonny', x: 190, y: 150, f: Math.PI / 2 }, { id: 'pepper', x: 230, y: 160, f: Math.PI }, { id: S.me, x: 160, y: 180, f: -Math.PI / 4 }],
    steps: [['say', 'sonny', 'A deal is a deal. The island is... yours. All of it. My beautiful island.'], ['say', 'pepper', ['Actually.', 'I hold Mr. Fortuna\'s IOUs. All of them. The island is mine.']], ['emote', 'sonny', '!'], ['act', 'sonny', 'confused', 2], ['say', 'sonny', 'PEPPER?!'],
      ['walk', 'sonny', 190, 260, 2], ['say', 'sonny', 'I\'LL BE BACK... NEXT SUMMER!'], ['say', 'pepper', 'Breakfast is at eight. The island is under new management.'], ['say', S.me, G.LINES[S.me].ending]],
    then: () => { S.flags.ending = 'A'; G.go('credits'); } });
};
G.storyEndingB = () => {
  const S = G.state;
  G.cutscene({ loc: 'beach', tod: 'night', music: 'house', cam: [352, 220], zoom: 1.3, caption: 'THE HOUSE ALWAYS WINS', cast: [{ id: 'sonny', x: 360, y: 220, f: Math.PI / 2 }, { id: 'pepper', x: 400, y: 226, f: Math.PI }, { id: S.me, x: 320, y: 240, f: 0 }],
    steps: [['act', 'sonny', 'cheer', 1.2, { hop: 3 }], ['say', 'sonny', 'THE HOUSE WINS! As is TRADITION!'], ['say', 'sonny', 'But to make it INTERESTING... the island on ONE spin of the giant wheel!'], ['say', 'pepper', 'Red.'], ['wait', 1], ['fx', () => G.sfx('ball_rattle')], ['wait', .6], ['act', 'sonny', 'angry', 2], ['say', 'sonny', '...It\'s red. Why is it always red.'],
      ['walk', 'sonny', 360, 340, 2], ['say', 'sonny', 'I\'LL BE BACK... NEXT SUMMER!'], ['say', 'pepper', 'The house always wins. I am the house.'], ['say', S.me, G.LINES[S.me].ending]],
    drawExtra: r => r.shape('roulettetable', 400, 180, 0, { scale: 1.6 }),
    then: () => { S.flags.ending = 'B'; G.go('credits'); } });
};
/* ---- events on arrival at a place ---- */
G.storyArrive = (id, sc) => {
  const S = G.state;
  if (id === 'casino' && !S.flags.casinoOpened) { S.flags.casinoOpened = true; S.flags.casinoVisited = true; S.chips += 20; G.say('sonny', ['WELCOME TO CASINO FORTUNA, CHAMP!', 'Twenty free chips! Slots, blackjack, roulette! The house LOVES you!'], { onDone: () => G.toast('+20 chips', 'Cash out at the cashier for S$100 each.') }); return; }
  if (id === 'casino') S.flags.casinoVisited = true;
  if (id === 'casino' && S.day === 3 && !S.flags.callSeen) G.game.after(.8, () => G.say('pepper', 'Mr. Fortuna is in the VIP lounge. On the phone. Loudly.'));
};
G.vipLounge = sc => {
  const S = G.state;
  if (S.day === 3 && !S.flags.callSeen) {
    S.flags.callSeen = true;
    G.say('sonny', ['...Yeah. Yeah, I put the island on the Cup.', 'What could go wrong? I\'m SONNY FORTUNA!'], { onDone: () => G.say('pepper', 'You heard that. Of course you did.', { choices: ['Your secret\'s safe.', 'Everyone\'s going to hear this.'], onChoice: k => { S.flags.kind = k === 0; G.say('pepper', k === 0 ? 'Thank you. I will remember it.' : 'Noted. So will I.'); } }) });
    return;
  }
  G.say('sonny', G.rpick('cosmetic', ['THE VIP LOUNGE! Velvet ropes! Free peanuts!', 'Shh! I\'m on the phone with my yacht.', 'Bet BIG, champ! The house is generous! Sometimes!']));
};
G.villaVisit = () => {
  const S = G.state; if (S.flags.visitDone || S.day < 2 || S.slot !== 2) return false;
  const who = G.npcs().filter(id => G.aff(id) >= 50).sort((a, b) => G.aff(b) - G.aff(a))[0]; if (!who) return false;
  S.flags.visitDone = true; const V = G.LINES[who].visit;
  G.cutscene({ loc: 'villa', tod: 'night', music: 'siesta', cam: [112, 100], zoom: 1.6, cast: [{ id: S.me, x: 112, y: 100, f: Math.PI / 2 }, { id: who, x: 112, y: 150, f: -Math.PI / 2 }],
    steps: [['emote', who, 'note'], ['say', who, V.lines[0]], ['choice', who, V.lines[1], V.choices, k => { const d = k === V.good ? 4 : -4; G.addAff(who, d); }], ['emote', who, 'heart'], ['wait', .8]],
    then: () => G.endSlot('rest') });
  return true;
};
/** dev jumps */
G.storyJump = id => {
  const S = G.state; if (!S.partner) S.partner = G.npcs()[0];
  if (id === 'semifinal') { S.day = 4; S.slot = 1; S.flags.semiDone = false; G.dayStart(); S.slot = 1; G.scheduleSlot(); G.storySemifinal(); }
  else if (id === 'final') { S.day = 5; S.slot = 1; S.flags.finalDone = false; G.dayStart(); S.slot = 1; G.scheduleSlot(); G.storyFinal(); }
  else if (id === 'party') { S.day = 5; S.slot = 2; S.flags.finalDone = true; G.storyParty(); }
  else if (id === 'endingA') { S.flags.wonFinal = true; G.storyEndingA(); }
  else if (id === 'endingB') { S.flags.wonFinal = false; G.storyEndingB(); }
};
