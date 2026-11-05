// WIRETAP: online play through the AI Hub (Session Protocol v1, shared world). The host's copy runs VersusSim and
// sends snapshots 10 times a second; every copy moves its own character and reports it; actions go to the host, which
// checks them. The host finishes the round once, with standings, scores, stats and awards.
function seatsFor(info, opts = {}) {
  const humans = info.players.map(p => p.id), round = info.round || 0, seats = [];
  const single = humans.length === 1;
  info.players.forEach((p, i) => { const side = single ? 'detail' : (i + round) % 2 === 0 ? 'corner' : 'detail'; seats.push({ id: p.id, name: p.name, color: p.color, side, human: true, remote: p.id !== info.me || !!info.server }); });
  // roles: the first corner human is the lieutenant, the next a lookout
  let lt = false; for (const s of seats) if (s.side === 'corner') { s.role = lt ? 'lookout' : 'lt'; lt = true; } else s.role = 'det';
  let bid = 10; if (!seats.some(s => s.side === 'corner')) seats.push({ id: bid++, name: 'Tee (bot)', side: 'corner', role: 'lt', human: false });
  if (seats.filter(s => s.side === 'detail').length < 1) seats.push({ id: bid++, name: 'Detective (bot)', side: 'detail', role: 'det', human: false });
  if (opts.fill && seats.filter(s => s.side === 'detail').length < 2) seats.push({ id: bid++, name: 'Det. Kowalczyk (bot)', side: 'detail', role: 'det', human: false });
  return seats;
}
const Net = {
  info: null, isHost: false, sendT: 0, meT: 0, rosterKey: '', ended: false, half: 0,
  async connectHub(scenes) {
    const info = await HUB.connect({ mode: 'shared-world', seats: [1, 4] });
    if (!info) return null;
    this.info = info; this.isHost = !!info.isHost; Versus.net = this;
    const seats = seatsFor(info);
    for (const s of seats) if (s.human && !s.remote) s.ctl = new HumanCtl(game.input);
    this.limit = Math.min(VS.len, Math.max(30, (info.limitMs || 360000) / 1000 - 5));
    HUB.on('message', (d, from) => this.onMsg(d, from));
    HUB.on('leave', e => this.onLeave(e));
    HUB.on('time-up', () => { if (this.isHost && Versus.sim && !Versus.sim.over) { const s = Versus.sim; s.end(s.corner.led.banked + s.corner.led.cash >= s.quota() ? 'corner' : s.ev >= 100 ? 'detail' : 'draw'); } });
    HUB.on('end', e => this.onEnd(e));
    // the hidden host tab: keep the world running from a timer
    if (this.isHost && typeof document !== 'undefined') { let last = performance.now(); setInterval(() => { const now = performance.now(); if (document.hidden && !this.ended) { try { game.advance(Math.min(1, (now - last) / 1000)); } catch (e) {} } last = now; }, 250); }
    game.go('versus', { mode: this.isHost ? 'hub-host' : 'hub-client', seats, len: this.limit, rnd: HUB.rng('sim'), rndWorld: HUB.rng('roster'), seed: info.seed });
    return info;
  },
  started() { return HUB.time() >= 0; },
  countdownLeft() { const t = HUB.time(); return t < 0 && t > -1e9 ? -t / 1000 : 0; },
  timeLeft() { const t = HUB.time(); return t < 0 ? this.limit : this.limit - t / 1000; },
  send(d, rel) { if (this.ended) return; try { HUB.send(d, { reliable: rel }); } catch (e) {} },
  tick(dt) {
    if (this.ended) return;
    this.sendT += dt;
    if (this.isHost && Versus.sim) {
      const sim = Versus.sim;
      const key = sim.npcs().length + ':' + sim.nid; if (key !== this.rosterKey || (this.rT = (this.rT || 0) + dt) > 5) { this.rosterKey = key; this.rT = 0; this.send({ t: 'r', a: sim.roster() }, true); }
      if (this.sendT >= .1) { this.sendT = 0; let s = sim.snap(); if (JSON.stringify(s).length > 1100) { s = sim.snap(this.half); this.half ^= 1; } this.send(s, false); }
    } else if (!this.isHost) {
      const me = Versus.locals[0]; if (me && this.sendT >= .1) { this.sendT = 0; const e = me.ent; this.send({ t: 'me', x: Math.round(e.x), y: Math.round(e.y), f: Math.round(((e.facing % TAU) + TAU) % TAU / TAU * 64), st: e.moving ? 1 : 0, w: e.cam.watching ? 1 : 0, bl: e.blending ? 1 : 0 }, false); }
    }
  },
  act(k, o) { this.send({ t: 'act', k, o }, true); },
  event(e) { this.send({ t: 'e', e }, true); },
  onMsg(d, from) {
    if (!d || this.ended) return;
    if (this.isHost && Versus.sim) {
      const p = Versus.sim.players.find(q => q.id === from); if (!p) return;
      if (d.t === 'me') { const e = p.ent, nx = +d.x, ny = +d.y; if (!isFinite(nx) || !isFinite(ny)) return; const now = Versus.sim.t, el = Math.max(.05, now - (p.lastMe || now - .1)); p.lastMe = now;
        const max = 130 * el * 1.5, dd = Math.hypot(nx - e.x, ny - e.y), k = dd > max ? max / dd : 1; const x = e.x + (nx - e.x) * k, y = e.y + (ny - e.y) * k;
        if (World.walkable(x, y)) { e.body.vx = (x - e.x) / el; e.body.vy = (y - e.y) / el; e.body.x = x; e.body.y = y; vClamp(e); }
        e.facing = (+d.f || 0) / 64 * TAU; e.moving = !!d.st; e.still = e.moving ? 0 : (e.still || 0) + el; e.cam.watching = !!d.w; e.blending = !!d.bl; e.rig.update(el, { x: e.x, y: e.y, z: 0, vx: e.body.vx, vy: e.body.vy, facing: e.facing }); }
      if (d.t === 'act' && typeof d.k === 'string') Versus.sim.act(p, d.k, d.o || {});
    } else if (!this.isHost && Versus.vw) {
      if (d.t === 's') Versus.vw.snap(d);
      if (d.t === 'r') Versus.vw.roster(d.a || []);
      if (d.t === 'e' && d.e) { if (d.e.k === 'end') { Versus.vw.outcome = d.e.outcome; Versus.finish(d.e.outcome); } else Versus.onEvent(d.e); }
      if (d.t === 'fin') { Versus.vw.players.forEach(p => { const r = (d.p || []).find(x => x[0] === p.id); if (r) [p.score, p.photos, p.burns, p.callouts, p.count] = r.slice(1); }); Versus.vw.awards = d.aw || []; }
    }
  },
  onLeave(e) {
    if (!this.isHost || !Versus.sim) return;
    const p = Versus.sim.players.find(q => q.id === e.id); if (!p) return;
    p.remote = false; p.left = true; p.name += ' (bot)'; p.ent.bot = p.side === 'corner' ? cornerBot(Versus.sim, p) : detBot(Versus.sim, p);
  },
  finish(sim, outcome) {
    if (this.finished) return; this.finished = true;
    const ids = this.info.players.map(p => p.id).filter(id => !sim.players.find(q => q.id === id && q.left));
    const side = id => (sim.players.find(q => q.id === id) || {}).side;
    const win = ids.filter(id => side(id) === outcome), lose = ids.filter(id => side(id) !== outcome);
    const standings = outcome === 'draw' || !win.length || !lose.length ? (outcome === 'draw' ? [ids] : [win.length ? win : lose]) : [win, lose];
    const humanSides = new Set(ids.map(side)), o = { standings, scores: {}, stats: {}, awards: sim.awards.filter(a => ids.includes(a.id)) };
    if (humanSides.size === 1) o.won = outcome !== 'draw' && [...humanSides][0] === outcome;
    for (const id of ids) { const p = sim.players.find(q => q.id === id); if (!p) continue; o.scores[id] = Math.round(p.score); o.stats[id] = { Photos: p.photos, Burns: p.burns, 'Call-outs': p.callouts, Count: '$' + p.count }; }
    this.send({ t: 'fin', p: sim.players.map(p => [p.id, Math.round(p.score), p.photos, p.burns, p.callouts, p.count]), aw: sim.awards }, true);
    try { HUB.finish(o); } catch (e) { game.fail('hub finish', e); }
  },
  onLocalEnd() {},
  onEnd(e) {
    if (this.ended) return; this.ended = true;
    for (const p of (Versus.sim || Versus.vw || { players: [] }).players) p.ent.ctl = new BotCtl();
    Versus.locals = []; try { game.audio.music(null); } catch (x) {} Amb.set([]);
    if (e && e.reason === 'host-left') toast('Round cancelled', 'The host left.');
    Versus.results = true;
  }
};
/* the "Connecting..." scene of a hub session: no prompts, no menus */
const HubWait = {
  enter() { this.t = 0; if (ui) ui.hud({}); },
  update(dt) { this.t += dt; },
  draw(r) { r.sky(['#050506', '#0a0a0c', '#141210']); r.overlay(g => { E.font.title(g, 'WIRETAP', r.W / 2, r.H / 2 - 30, { scale: 3, align: 'center', colors: ['#fff6dc', '#ffcf7a', '#e08a2a'] }); E.font.text(g, 'Connecting' + '.'.repeat(1 + Math.floor(this.t * 2) % 3), r.W / 2, r.H / 2 + 10, '#e9dcb5', { align: 'center', outline: false }); }); }
};
