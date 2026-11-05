// 11-director: episode flow, mission results, meters, endings, versus end. Also Net (hub transport).
const Director = {
  mode: 'story',
  newGame() { resetState(); this.mode = 'story'; STATE.beat = 0; this.run(); },
  cont() { if (loadState()) { this.mode = 'story'; this.run(); } else this.newGame(); },
  hasSave() { try { return !!E.store.get(SAVE_KEY, null); } catch (e) { return false; } },
  step() { return STORY[STATE.beat]; },
  nextLabel() { const s = STORY[STATE.beat]; if (!s) return 'Report to the Major.'; if (s.t === 'field') return MISSIONS[s.m].kicker + ' — ' + MISSIONS[s.m].title; if (s.t === 'screen') return ({ board: 'Put names on the Board.', cipher: 'Decode the pager traffic.', paper: 'Write the affidavit and face the judge.', wire: 'Take the wire room shift.', box: 'Interview Dante Wills in the box.' })[s.s]; if (s.t === 'card') return 'EPISODE ' + s.n + ': ' + s.name; return 'Wrap the case.'; },
  run() {
    const s = STORY[STATE.beat]; if (!s) return this.ending();
    if (s.t === 'card') game.go('card', s);
    else if (s.t === 'field') game.go('field', { mission: s.m });
    else if (s.t === 'screen') game.go('annex', { screen: s.s });
    else if (s.t === 'end') this.ending();
  },
  next() { const done = STORY[STATE.beat]; STATE.beat++; saveState(); if (done && (done.t === 'field' || done.t === 'screen') && STORY[STATE.beat] && STORY[STATE.beat].t !== 'card') game.go('annex', { hub: true }); else if (done && done.t !== 'card' && STORY[STATE.beat]) game.go('annex', { hub: true }); else this.run(); },
  advance() { this.run(); },
  restartBeat() { game.go('title'); setTimeout(() => this.run(), 0); },
  toEpisodes() { game.go('title'); },
  missionEnd(id, ok, sum) {
    if (Attract.active) return;
    const m = MISSIONS[id]; Sound.stop();
    if (m.mode === 'tee') { STATE.corner.tees++; STATE.corner.cash += sum.cash; if (ok) { STATE.corner.strong = true; STATE.brass = Math.max(0, STATE.brass - 4); } else STATE.brass = Math.min(100, STATE.brass + 6); }
    else if (ok) { STATE.brass = Math.min(100, STATE.brass + (m.mode === 'chase' ? 6 : 3)); STATE.caseScore += 10; }
    const lines = m.mode === 'tee' ? [ok ? 'Count made: ' + money(sum.cash) : 'Short: ' + money(sum.cash), 'Calls saved: ' + sum.saved, 'Busts: ' + sum.busted, ok ? 'Slim is pleased. That makes Dana\'s next day harder.' : 'Slim is not pleased. The Major, strangely, is.'] : [ok ? 'Objective complete.' : 'It slipped away.', 'Photos: ' + STATE.photos.length + ' · Times made: ' + sum.made, m.mode === 'surv' ? 'Payphone numbers: ' + sum.phones + '/2' : ''];
    UI.closeAll(); const s = UI.open({ kicker: m.kicker, title: ok || m.mode === 'tee' ? 'Done' : 'Try again', body: '<p>' + lines.filter(Boolean).map(esc).join('</p><p>') + '</p>' + meters(), items: [{ label: ok || m.mode === 'tee' ? 'Continue' : 'Retry' }], back: false, legend: [['confirm', 'OK']] });
    s.items[0].fn = () => { UI.closeAll(); if (ok || m.mode === 'tee') this.next(); else { STATE.brass = Math.max(0, STATE.brass - 5); game.go('field', { mission: id }); } };
  },
  shutdown(msg) {
    if (Attract.active) return; Sound.stop(); Sound.music('sad');
    UI.closeAll(); const s = UI.open({ kicker: 'Shut down', title: 'The detail is pulled', body: '<p>' + esc(msg) + '</p>', items: [{ label: 'Retry from the last save', fn: () => { UI.closeAll(); this.cont(); } }, { label: 'Title', fn: () => { UI.closeAll(); game.go('title'); } }], back: false });
  },
  ending() {
    const e = ENDINGS.find(x => x.test(STATE)); STATE.ending = e.id; saveState(); game.go('montage', e);
  },
  versusEnd(F) {
    if (Attract.active) return; Sound.stop(); const sc = F.vs.score;
    if (typeof AIHub !== 'undefined' && AIHub.active) return Net.finish(F);
    if (F.m.mode === 'vs2') { UI.closeAll(); const a = F.vs.score, b = Math.round(F.sim.cash / 2), w = a === b ? 'A draw' : a > b ? 'P1 the detective wins' : 'P2 the corner wins'; UI.open({ kicker: 'The Game · 2 players', title: w, body: `<p>Detective case: ${a} pts</p><p>Corner: ${money(F.sim.cash)} (${b} pts)</p><p>Made ${F.made} times.</p>`, items: [{ label: 'Rematch', fn: () => { UI.closeAll(); game.go('field', { mission: 'vs2', seconds: 120 }); } }, { label: 'Title', fn: () => { UI.closeAll(); game.go('title'); } }], back: false }); return; }
    UI.closeAll(); const bots = [Math.round(sc * (.5 + rnd(rng.cosmetic) * .8)), Math.round(sc * (.4 + rnd(rng.cosmetic) * .9))], names = ['You', 'Bot Mercer', 'Bot Pryor'], all = [sc, ...bots].map((v, i) => [names[i], v]).sort((a, b) => b[1] - a[1]);
    const s = UI.open({ kicker: 'The Game · results', title: all[0][0] === 'You' ? 'Best case on the detail' : 'Outworked', body: '<p>' + all.map((a, i) => `${i + 1}. ${esc(a[0])} — ${a[1]} pts`).join('</p><p>') + '</p><p>Made ' + F.made + ' times.</p>', items: [{ label: 'Play again', fn: () => { UI.closeAll(); game.go('field', { mission: 'vs', seconds: 120 }); } }, { label: 'Title', fn: () => { UI.closeAll(); game.go('title'); } }], back: false });
  }
};
// ---- hub transport: shared-world versus (AI Hub Session Protocol v1) ----
const Net = {
  on: false, isHost: false, remote: {}, scores: {}, stats: {}, ended: false, tSend: 0, round: 300, info: null,
  claim(p, pts) { if (!this.on) return; const me = this.info.me; if (this.isHost) { this.scores[me] = (this.scores[me] || 0) + pts; this.stats[me] = this.stats[me] || { Photos: 0 }; this.stats[me].Photos++; } else AIHub.send({ t: 'act', k: 'photo', target: p.id, pts, x: Field.dana.x, y: Field.dana.y });
  },
  begin(info) {
    this.on = true; this.info = info; this.isHost = !!info.isHost; this.round = Math.max(30, Math.min(300, (info.limitMs || 305000) / 1000 - 5)); this.scores = {}; this.stats = {}; this.remote = {}; this.ended = false;
    Person.n = 0; const r = AIHub.rng('roster'); rng.world = r; rng.sim = AIHub.rng('sim');
    AIHub.on('message', (d, from) => this.recv(d, from));
    AIHub.on('leave', e => { delete this.remote[e.id]; });
    AIHub.on('end', () => { this.ended = true; Sound.stop(); });
    AIHub.on('time-up', () => { if (this.isHost) this.finish(Field); });
    game.go('field', { mission: 'vs', seconds: this.round, hub: true });
  },
  tick(dt, F) {
    if (!this.on || this.ended) return; this.tSend -= dt; if (this.tSend > 0) return; this.tSend = .1; const D = F.dana;
    if (!AIHub.server) AIHub.send({ t: 'me', x: Math.round(D.x), y: Math.round(D.y), f: +(D.facing).toFixed(2), w: F.watching ? 1 : 0, sc: F.vs ? F.vs.score : 0 }, { reliable: false });
    if (this.isHost) AIHub.send({ t: 's', p: F.sim.people.filter(p => !p.gone).map(p => [p.id, Math.round(p.x), Math.round(p.y), +p.facing.toFixed(1), p.act ? 1 : 0, p.hidden ? 1 : 0, p.role]), sc: this.scores, tl: Math.round(F.vs.left) }, { reliable: false });
  },
  recv(d, from) {
    if (!d || this.ended) return;
    if (d.t === 'me') { const r = this.remote[from] = this.remote[from] || { p: new Person({ kind: 'sub', role: 'dana', name: 'P', x: d.x, y: d.y, rig: CAST.dana.rig }), tx: d.x, ty: d.y }; r.tx = d.x; r.ty = d.y; r.p.facing = d.f; r.p.watching = !!d.w; }
    else if (d.t === 's' && !this.isHost && Field.sim) { Field.sim.follow = true; this.scores = d.sc || {}; if (Field.vs) Field.vs.left = d.tl; for (const e of d.p) { let p = Field.sim.people.find(q => q.id === e[0]); if (!p) { const rig = CAST[e[6] === 'cop' ? 'cop' : 'look'].rig; p = Field.sim.add({ kind: 'civ', role: e[6] === 'cop' ? 'cop' : 'buyer', x: e[1], y: e[2], rig: civRig(Math.abs(parseInt(String(e[0]).slice(1)) || 1)) }); p.id = e[0]; } p.tx = e[1]; p.ty = e[2]; p.facing = e[3]; p.act = !!e[4]; p.hidden = !!e[5]; } Field.sim.people.forEach(p => { if (!d.p.some(e => e[0] === p.id) && p.role !== 'sub') p.gone = true; }); }
    else if (d.t === 'act' && this.isHost && d.k === 'photo') { const t = Field.sim.people.find(p => p.id === d.target); if (t && Math.hypot(t.x - d.x, t.y - d.y) < 260) { this.scores[from] = (this.scores[from] || 0) + Math.min(30, d.pts | 0); this.stats[from] = this.stats[from] || { Photos: 0 }; this.stats[from].Photos++; } }
  },
  interp(dt) { for (const id in this.remote) { const r = this.remote[id]; r.p.x += (r.tx - r.p.x) * Math.min(1, dt * 8); r.p.y += (r.ty - r.p.y) * Math.min(1, dt * 8); r.p.poseRig(dt); } if (Field.sim && Field.sim.follow) Field.sim.people.forEach(p => { if (p.tx != null) { p.x += (p.tx - p.x) * Math.min(1, dt * 8); p.y += (p.ty - p.y) * Math.min(1, dt * 8); } }); },
  finish(F) {
    if (this.sent || !this.isHost) { UI.closeAll(); return; } this.sent = true; const me = this.info.me; this.scores[me] = Math.max(this.scores[me] || 0, 0);
    const ids = AIHub.players.map(p => p.id).filter(id => !(AIHub.server && id === me)); ids.sort((a, b) => (this.scores[b] || 0) - (this.scores[a] || 0));
    const sc = {}, st = {}; ids.forEach(i => { sc[i] = this.scores[i] || 0; st[i] = this.stats[i] || { Photos: 0 }; });
    try { AIHub.finish({ standings: ids.length > 1 ? ids.map(i => [i]) : [ids], scores: sc, stats: st, awards: ids.length ? [{ id: ids[0], title: 'Eyes On', detail: sc[ids[0]] + ' points of case' }] : [] }); } catch (e) { game.fail('finish', e); }
    Hud.toast('Round over', 'Results are with the hub');
  }
};
