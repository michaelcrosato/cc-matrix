/* ---- AI HUB (Session Protocol v1, shared-world): "Banners of the Wheel" for 2-4 players. The host's copy runs the
 * BattleSim and is the authority; the others draw its state, animate its events and send commands for their own troop.
 * G.NetDriver ticks on setInterval(50), outside the engine's pausable update, so a pause menu never stalls the host.
 * Messages: snap (host->all), ev (host->all, ordered by n, with the state), turn, cmd (client->host), need, cur, over ---- */
G.HUB_SEATS = [{ realm: 'verdance', ruler: 'gareth', mons: [['unicorn', 10], ['pixie', 10]] }, { realm: 'solmark', ruler: 'morgause', mons: [['cinderhound', 10], ['sunbird', 10]] }, { realm: 'amberlyn', ruler: 'pellam', mons: [['scarecrow', 10], ['griffin', 9]] }, { realm: 'hoarfast', ruler: 'mordrain', mons: [['frostwolf', 10], ['icegolem', 9]] }];
G.hubSpec = (players, seed) => {
  const n = players.length, seats = n === 2 ? [0, 2] : n === 3 ? [0, 1, 2] : [0, 1, 2, 3];
  return { map: 'wheel_shrine', season: 'spring', seed, mode: 'shrine', region: 'spring', sides: players.map((p, i) => { const S = G.HUB_SEATS[seats[i]]; return { realm: S.realm, name: String(p.name || 'P' + (i + 1)).slice(0, 14), human: true, color: G.SEAT_COLORS[i], seat: i, anchor: String(seats[i] + 1), troops: [{ knight: Object.assign(G.makeKnightRec(S.ruler, 10), { equip: {} }), monsters: S.mons.map(([sp, l], k) => ({ uid: 'h' + i + k, sp, tier: 1, lvl: l, exp: 0 })), formation: 'vanguard' }], items: [] }; }) };
};
// the protocol driver, also testable against a fake AIHub in Node
class NetDriver {
  constructor(hub, info, o = {}) {
    this.hub = hub; this.info = info; this.isHost = !!info.isHost; this.me = info.me; this.q = []; this.n = 0; this.applied = 0; this.left = new Set(); this.auto = new Set(); this.ended = false; this.finished = false; this.deadline = null; this.turnTroop = null; this.lastAI = 0; this.curSent = 0; this.cursors = {}; this.o = o;
    this.mySide = info.players.findIndex(p => p.id === this.me);
    const seed = Math.floor(hub.rng('battle')() * 1e9);
    this.sim = G.BattleSim.create(G.hubSpec(info.players, seed));
    this.offs = [hub.on('message', (d, from) => this.q.push([d, from])), hub.on('leave', e => this.onLeave(e)), hub.on('time-up', () => { if (this.isHost) this.finish(); }), hub.on('end', e => this.onEnd(e))];
  }
  sideOf(id) { return this.info.players.findIndex(p => p.id === id); }
  now() { return this.hub.time(); }
  started() { return this.now() >= 0; }
  // host: apply a command and tell everyone
  exec(cmd) { const ev = this.sim.apply(cmd); if (ev.length && ev[0].type === 'illegal') return ev; this.n++; this.hub.send({ t: 'ev', n: this.n, events: ev, state: this.compact() }); if (this.o.onEvents) this.o.onEvents(ev); this.checkOver(); return ev; }
  compact() { const s = Object.assign({}, this.sim.state); delete s.base; return s; }
  // a client's own command goes to the host
  send(cmd) { if (this.ended) return; if (this.isHost) return this.exec(cmd); this.hub.send({ t: 'cmd', seq: ++this.seq || (this.seq = 1), cmd }); return []; }
  myTurn() { const tr = this.sim.active; return !!tr && !this.ended && this.started() && tr.side === this.mySide && !this.auto.has(tr.side) && !this.sim.state.over; }
  tick(dt) {
    if (this.ended) return;
    while (this.q.length) { const [d, from] = this.q.shift(); this.onMessage(d, from); }
    if (this.started() && this.mySide >= 0 && !this.sim.state.over) this.sendCursor(this.cursorCell || [Math.floor(this.sim.state.w / 2), Math.floor(this.sim.state.h / 2)]);   // every copy shares its look cursor
    if (!this.isHost || this.finished || !this.started()) return;
    const S = this.sim.state, tr = this.sim.active; if (S.over) { this.finish(); return; }
    if (!tr) return;
    if (this.turnTroop !== tr.id) { this.turnTroop = tr.id; this.deadline = this.now() + G.TUNE_DEFAULTS.hubTurnSeconds * 1000; this.hub.send({ t: 'turn', n: this.n, seat: tr.side, troop: tr.id, deadline: this.deadline }); }
    const owner = this.info.players[tr.side], human = owner && !this.left.has(owner.id);
    const aiTurn = !human || this.auto.has(tr.side) || this.left.has(owner.id);
    if (!aiTurn && this.now() > this.deadline) { this.auto.add(tr.side); this.hub.send({ t: 'auto', side: tr.side }); }
    if ((aiTurn || this.auto.has(tr.side)) && this.now() - this.lastAI > 300) { this.lastAI = this.now(); for (const c of G.BattleAI.next(this.sim, { diff: 'normal' })) { const ev = this.exec(c); if (ev.length && ev[0].type === 'illegal') { this.exec({ t: 'end' }); break; } } if (this.sim.active && this.sim.active.id !== tr.id) this.auto.delete(tr.side); }
  }
  onMessage(d, from) {
    if (!d || typeof d !== 'object') return;
    if (this.isHost) {
      if (d.t === 'cmd') { const side = this.sideOf(from), tr = this.sim.active; if (!tr || tr.side !== side || this.auto.has(side)) { this.hub.send({ t: 'snap', n: this.n, state: this.compact() }, { to: from }); return; } const ev = this.exec(d.cmd); if (ev.length && ev[0].type === 'illegal') this.hub.send({ t: 'snap', n: this.n, state: this.compact() }, { to: from }); }
      else if (d.t === 'need') this.hub.send({ t: 'snap', n: this.n, state: this.compact() }, { to: from });
      else if (d.t === 'cur') this.cursors[from] = d.cell;
      return;
    }
    if (from !== this.info.host) { if (d.t === 'cur') this.cursors[from] = d.cell; return; }
    if (d.t === 'ev') { if (d.n <= this.applied) return; if (d.n > this.applied + 1) this.hub.send({ t: 'need', n: this.applied }); this.load(d.state); this.applied = d.n; if (this.o.onEvents) this.o.onEvents(d.events); }
    else if (d.t === 'snap') { if (d.n >= this.applied) { this.load(d.state); this.applied = d.n; if (this.o.onSnap) this.o.onSnap(); } }
    else if (d.t === 'turn') this.deadline = d.deadline;
    else if (d.t === 'auto') this.auto.add(d.side);
    else if (d.t === 'over') { this.standings = d.standings; this.glory = d.glory; }
  }
  load(state) { const base = this.sim.state.base; this.sim.state = Object.assign({}, state, { base }); }
  sendCursor(cell) { const t = this.now(); if (t - this.curSent < 250) return; this.curSent = t; this.hub.send({ t: 'cur', seat: this.mySide, cell }, { reliable: false }); }
  onLeave(e) { this.left.add(e.id); const side = this.sideOf(e.id); if (this.isHost && side >= 0) { const S = this.sim.state, k = S.units.find(u => u.side === side && u.kind === 'knight' && !u.out); if (k) { const ev = []; this.sim.knightOut(k, 'retreat', ev); this.sim.checkWin(ev, false); if (this.sim.active && this.sim.active.gone) this.sim.nextTroop(ev); this.n++; this.hub.send({ t: 'ev', n: this.n, events: ev, state: this.compact() }); if (this.o.onEvents) this.o.onEvents(ev); } if (this.info.players.filter(p => !this.left.has(p.id)).length < 2) this.finish(); } }
  checkOver() { if (this.sim.state.over) this.finish(); }
  standingsNow() { const S = this.sim.state, live = this.info.players.map((p, i) => ({ id: p.id, g: S.sides[i].glory })).filter(x => !this.left.has(x.id)).sort((a, b) => b.g - a.g), out = []; for (const x of live) { const last = out[out.length - 1]; if (last && last.g === x.g) last.ids.push(x.id); else out.push({ g: x.g, ids: [x.id] }); } return out.map(o => o.ids); }
  finish() {
    if (!this.isHost || this.finished) return; this.finished = true;
    const S = this.sim.state, standings = this.standingsNow(), scores = {}, stats = {}, awards = [];
    this.info.players.forEach((p, i) => { scores[p.id] = S.sides[i].glory; const us = S.units.filter(u => u.side === i); stats[p.id] = { damage: us.reduce((a, u) => a + u.dealt, 0), kos: us.reduce((a, u) => a + u.kos, 0) }; });
    const best = (f, title, detail) => { let bi = -1, bv = 0; this.info.players.forEach((p, i) => { const v = f(i); if (v > bv) { bv = v; bi = i; } }); if (bi >= 0) awards.push({ id: this.info.players[bi].id, title, detail: detail(bv) }); };
    best(i => stats[this.info.players[i].id].damage, 'Giant Slayer', v => v + ' damage dealt'); best(i => stats[this.info.players[i].id].kos, 'Last Standing', v => v + ' knockouts');
    this.hub.send({ t: 'over', standings, glory: S.sides.map(s => s.glory) }); this.standings = standings;
    try { this.hub.finish({ standings, scores, stats, awards }); } catch (e) { /* the hub refused */ }
  }
  onEnd(e) { this.ended = true; this.endReason = e && e.reason; if (e && e.standings) this.standings = e.standings; for (const off of this.offs) try { off(); } catch (x) { /* gone */ } if (this.o.onEnd) this.o.onEnd(e); }
}
G.NetDriver = NetDriver;
// the hub scene: connect, build, ready, then the battle scene in hub mode
G.scenes.hub = {
  view: 'side', res: 'ps1', input: G.INPUT, touch: [],
  enter() {
    this.t = 0; this.msg = 'Connecting...';
    if (G.touchOnly()) { try { AIHub.fail('Controller or keyboard required'); } catch (e) { /* no hub */ } this.msg = 'Controller or keyboard required'; return; }
    AIHub.connect({ mode: 'shared-world', seats: [2, 4] }).then(info => {
      if (!info) { G.hubActive = false; G.game.go('title'); return; }
      const net = new NetDriver(AIHub, info, { onEvents: ev => { if (G.battle && G.battle.view) { G.battle.waitNet = 0; G.battle.view.ensureUnits(); G.battle.view.play(ev); } }, onEnd: () => { try { G.game.audio.stopMusic(.1); G.game.audio.mute(true); } catch (e) { /* no sound */ } } });
      G.net = net; G.hubView = { cursors: () => Object.entries(net.cursors).map(([id, c]) => [c, G.SEAT_COLORS[net.sideOf(+id)] || '#fff']).filter(x => x[0]) };
      setInterval(() => { try { net.tick(.05); } catch (e) { if (G.game.fail) G.game.fail('hub tick', e); } }, 50);
      G.startBattle(null, { sim: net.sim, hub: true, shrine: true, back: 'hub', fade: 0, onDone: () => {} });
      AIHub.ready();
    });
  },
  update(dt) { this.t += dt; }, draw(r) { r.sky(['#0a0812', '#2a2838']); r.overlay(g => { E.font.title(g, 'BANNERS OF THE WHEEL', r.W / 2, r.H / 2 - 30, { align: 'center', scale: 2, colors: ['#fff8e0', '#f0d070', '#a07a30'] }); G.ui.text(g, this.msg, r.W / 2, r.H / 2 + 4, '#e8e0d0', { align: 'center' }); }); }
};
