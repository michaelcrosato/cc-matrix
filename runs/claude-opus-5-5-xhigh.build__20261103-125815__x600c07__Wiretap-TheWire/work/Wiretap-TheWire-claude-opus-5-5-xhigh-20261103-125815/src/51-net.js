/* 51-net: THE GAME in an AI Hub session (Protocol v1, shared-world). The host's copy runs the VersusSim; every copy
   moves its own character and reports it (no input lag); the host checks speed and walkable cells, validates every
   claim (a photo needs the target in range and in sight on the host, an ACT needs an act in the host's last 600 ms),
   and sends a snapshot 10 times a second (< 1,100 bytes; NPCs in alternating halves when needed) and events reliably. */
const ST = { idle: 0, walk: 1, run: 2, crouch: 3, watch: 4, act: 5, down: 6, sit: 7, phone: 8, bike: 9 };
const Net = {
  on: false, isHost: false, server: false, me: null, info: null, snapT: 0, meT: 0, half: 0, npc: new Map(), nid: 100, seeds: {}, ended: false, finished: false, lastSnap: null, left: new Set(),
  hubStart() {
    const H = window.AIHub;
    H.on('message', (d, from) => { try { this.onMsg(d, from); } catch (e) { game.fail('net msg', e); } });
    H.on('leave', e => this.onLeave(e)); H.on('time-up', () => { if (this.isHost) this.finish(); }); H.on('end', e => this.onEnd(e)); H.on('start', () => { this.started = true; });
    H.connect({ mode: 'shared-world', seats: [1, 4] }).then(info => {
      if (!info) { game.go('title'); return; }
      this.on = true; this.info = info; this.isHost = !!info.isHost; this.server = !!info.server; this.me = info.me;
      const ps = info.players.slice(), n = ps.length, round = info.round || 0, slots = [];
      ps.forEach((pl, i) => { let side = (i + round) % 2 === 0 ? 'corner' : 'detail'; if (n === 1) side = 'detail'; slots.push({ id: pl.id, name: pl.name, color: pl.color, side, human: true, local: pl.id === this.me && !this.server, remote: pl.id !== this.me || this.server }); });
      let lt = false, run = false;
      for (const s of slots) { if (s.side === 'corner') { if (!lt) { s.role = 'lt'; lt = true; } else if (!run) { s.role = 'runner'; run = true; } else { s.side = 'detail'; s.role = 'det'; } } else s.role = 'det'; }
      if (slots.filter(s => s.side === 'detail').length > 2) { const x = slots.filter(s => s.side === 'detail')[2]; x.side = 'corner'; x.role = lt ? 'runner' : 'lt'; }
      let bid = 10; if (!slots.some(s => s.role === 'lt')) slots.push({ id: bid++, name: 'Bot lieutenant', side: 'corner', role: 'lt' }); if (!slots.some(s => s.side === 'detail')) slots.push({ id: bid++, name: 'Bot detective', side: 'detail', role: 'det' });
      if (slots.filter(s => s.side === 'detail').length < 2 && n < 3) slots.push({ id: bid++, name: 'Bot detective', side: 'detail', role: 'det' });
      for (const s of slots) { if (s.local) s.ctl = new HumanCtl(game.input); else if (s.remote) s.ctl = new RemoteCtl(s.id); }
      const len = Math.max(30, Math.min(300, (info.limitMs || 300000) / 1000 - 5)), seed = Math.floor(H.rng('roster')() * 1e6);
      this.slots = slots; Versus.mode = 'net';
      game.go('versus', { slots, len, minutes: len / 60, seed, split: false }, { fade: 0 });
      this.hiddenStepper();
    }).catch(e => { game.fail('hub connect', e); try { H.fail(String(e && e.message || e)); } catch (e2) { /* gone */ } });
  },
  /** the versus scene calls this once its sim exists: wire it to the network and tell the hub we can start */
  attach(S) {
    S.onEvent = e => { if (this.isHost) this.send(e, true); }; S.clientMode = !this.isHost; S.netWait = true;
    if (!this.readyDone) { this.readyDone = true; try { window.AIHub.ready(); } catch (e) { game.fail('hub ready', e); } }
  },
  send(d, reliable) { if (!this.on || this.ended) return; try { window.AIHub.send(d, { reliable: !!reliable }); } catch (e) { /* dropped */ } },
  /** steps the host's sim while its tab is hidden, so the others don't freeze */
  hiddenStepper() {
    if (HEADLESS) return; let last = performance.now();
    setInterval(() => { const now = performance.now(), el = Math.min(1, (now - last) / 1000); last = now; if (document.hidden && this.isHost && !this.ended) { try { game.advance(el); } catch (e) { /* keep going */ } } }, 250);
  },
  myPlayer() { const S = Versus.sim; return S && S.players.find(p => p.id === this.me && p.local); },
  tick(dt) {
    const S = Versus.sim; if (!S || this.ended) return;
    const t = window.AIHub.time();
    S.netWait = !(t >= 0);
    if (this.isHost) { this.snapT -= dt; if (this.snapT <= 0 && t >= 0) { this.snapT = .1; this.snapshot(); } if (t >= 0 && S.t === 0) S.len = Math.min(S.len, ((this.info.limitMs || 300000) / 1000) - 5); }
    else { this.meT -= dt; const P = this.myPlayer(); if (P && this.meT <= 0) { this.meT = .1; const a = P.agent; this.send({ t: 'me', at: Math.round(t), x: Math.round(a.x), y: Math.round(a.y), f: Math.round(((a.facing % TAU) + TAU) % TAU / TAU * 64) % 64, st: P.w.on ? ST.watch : a.sprinting ? ST.run : Math.hypot(a.vx, a.vy) > 4 ? ST.walk : 0, w: P.w.on ? 1 : 0, ax: P.w.aim ? Math.round(P.w.aim.x) : 0, ay: P.w.aim ? Math.round(P.w.aim.y) : 0 }, false); } }
  },
  /** the client's step: move my own character, smooth everything else toward the snapshot */
  clientTick(dt) {
    const S = Versus.sim; if (!S) return; const P = this.myPlayer();
    if (P && !this.ended && !S.netWait) { S.drive(P, dt); P.agent.update(dt); clampZone(P.agent); }
    const k = Math.min(1, dt * 10);
    for (const p of S.players) if (p !== P && p.net) { const a = p.agent; a.body.x += (p.net.x - a.x) * k; a.body.y += (p.net.y - a.y) * k; a.facing = p.net.f / 64 * TAU; a.vx = (p.net.x - a.x) * 6; a.vy = (p.net.y - a.y) * 6; a.pose = p.net.st === ST.watch ? 'camera' : null; a.update(0); }
    for (const a of this.npc.values()) { if (!a.tgt) continue; a.body.x += (a.tgt[0] - a.x) * k; a.body.y += (a.tgt[1] - a.y) * k; a.facing = a.tgt[2] / 64 * TAU; a.vx = (a.tgt[0] - a.x) * 6; a.vy = (a.tgt[1] - a.y) * 6; a.pose = [null, null, null, 'crouch', 'camera', 'reach', null, 'sit', 'phone', null][a.tgt[3]] || null; a.down = a.tgt[3] === ST.down ? 1 : 0; a.update(0); }
    Crowd.list = [...this.npc.values()].filter(a => a.kind === 'v'); S.corner.customers = [...this.npc.values()].filter(a => a.kind === 'u');
  },
  stCode(a) { if (a.down > .5) return ST.down; if (a.pose === 'sit') return ST.sit; if (a.pose === 'phone') return ST.phone; if (a.watching || a.pose === 'camera') return ST.watch; if (a.act) return ST.act; if (a.crouch) return ST.crouch; const v = Math.hypot(a.vx, a.vy); return v > 70 ? ST.run : v > 4 ? ST.walk : ST.idle; },
  snapshot() {
    const S = Versus.sim, f = a => Math.round(((a.facing % TAU) + TAU) % TAU / TAU * 64) % 64;
    const p = S.players.map(q => { const a = q.agent; return [q.id, Math.round(a.x), Math.round(a.y), f(a), this.stCode(a), (q.burnedT > 0 ? 1 : 0) | (a.carrying ? 2 : 0) | (S.corner.open ? 0 : 4)]; });
    const npcs = [];
    S.corner.crew.forEach((a, i) => { if (S.players.some(q => q.agent === a)) return; npcs.push([i, Math.round(a.x), Math.round(a.y), f(a), this.stCode(a)]); });
    for (const a of S.corner.customers.concat(Crowd.list)) { if (!a.nid) { a.nid = this.nid++; this.send({ t: 'n', id: a.nid, s: a.seed, k: a.role === 'customer' ? 'u' : 'v' }, true); } npcs.push([a.nid, Math.round(a.x), Math.round(a.y), f(a), this.stCode(a)]); }
    let msg = { t: 's', at: Math.round(window.AIHub.time()), tl: Math.round(Math.max(0, S.len - S.t)), ev: Math.round(S.ev), cn: Math.round(S.netCount), ph: S.over ? 1 : 0, p, n: npcs };
    if (JSON.stringify(msg).length > 1080) { this.half ^= 1; msg.n = npcs.filter((_, i) => i % 2 === this.half); msg.h = this.half + 1; }
    this.lastSize = JSON.stringify(msg).length; this.send(msg, false);
  },
  onMsg(d, from) {
    const S = Versus.sim; if (!S || !d || this.ended) return;
    if (d.t === 's' && !this.isHost) {
      for (const [id, x, y, f, st, fl] of d.p) { const q = S.players.find(z => z.id === id); if (!q || q.id === this.me && q.local) continue; q.net = { x, y, f, st }; q.burnedT = fl & 1 ? Math.max(q.burnedT, 1) : 0; q.agent.carrying = fl & 2 ? 1 : 0; S.corner.open = !(fl & 4); }
      for (const [nid, x, y, f, st] of d.n) {
        if (nid < 100) { const a = S.corner.crew[nid]; if (a) { if (!this.npc.has('c' + nid)) { a.tgt = null; } a.netT = [x, y, f, st]; a.body.x += (x - a.x) * .5; a.body.y += (y - a.y) * .5; a.facing = f / 64 * TAU; } continue; }
        let a = this.npc.get(nid); if (!a) { const s = this.seeds[nid]; a = new Agent({ seed: s ? s.s : nid * 7919, x, y, role: s && s.k === 'u' ? 'customer' : 'civ' }); a.kind = s ? s.k : 'v'; a.nid = nid; this.npc.set(nid, a); }
        a.tgt = [x, y, f, st]; a.seen = d.at;
      }
      if (!d.h) for (const [nid, a] of this.npc) if (a.seen !== d.at) this.npc.delete(nid);
      S.ev = d.ev; S.penalty = 0; S.corner.L.taken = d.cn; S.t = S.len - d.tl;
      return;
    }
    if (d.t === 'n' && !this.isHost) { this.seeds[d.id] = d; const a = this.npc.get(d.id); if (a && a.kind !== d.k) { this.npc.delete(d.id); } return; }
    if (d.t === 'e' && !this.isHost) { if (d.k === 'over') S.over = d.outcome; VFX(d, S); return; }
    if (!this.isHost) return;
    const p = S.players.find(z => z.id === from); if (!p || p.left) return;
    if (d.t === 'me') { p.net = { x: +d.x || p.agent.x, y: +d.y || p.agent.y, f: +d.f || 0, st: +d.st || 0, w: d.w, ax: +d.ax, ay: +d.ay, dt: .1 }; p.w.on = !!d.w; p.w.aim = d.w ? { x: +d.ax, y: +d.ay } : null; return; }
    if (d.t === 'act') this.hostAct(p, d);
  },
  findTarget(key) { const S = Versus.sim; if (typeof key !== 'string') return null; if (key[0] === 'p') { const q = S.players.find(z => z.id === +key.slice(1)); return q && q.agent; } if (key[0] === 'c') return S.corner.crew[+key.slice(1)]; const n = +key.slice(1); return S.corner.customers.concat(Crowd.list).find(a => a.nid === n) || null; },
  keyOf(a) { const S = Versus.sim; if (!a) return null; if (a.vp) return 'p' + a.vp.id; const ci = S.corner.crew.indexOf(a); if (ci >= 0) return 'c' + ci; if (a.nid) return 'n' + a.nid; const np = [...this.npc.entries()].find(([, v]) => v === a); return np ? 'n' + np[0] : null; },
  /** the host checks a claim before it counts */
  hostAct(p, d) {
    const S = Versus.sim, a = p.agent, tg = d.target ? this.findTarget(d.target) : null;
    if (d.k === 'photo') {
      if (!tg || dist2(tg, a) > 240 || !World.map.sight(a, tg)) { S.photo(p, null); return; }
      p.w.focus = d.q ? 1 : 0; if (d.act && !(tg.actedWithin && tg.actedWithin(.6))) { /* the host saw no act: score without it */ }
      S.photo(p, tg);
    } else if (d.k === 'callout' && p.role === 'lt' && tg && p.cd <= 0) S.callout(p, tg);
    else if (d.k === 'jump' && p.side === 'detail' && tg && !p.jumpUsed) S.jump(p, tg);
    else if (d.k === 'tap' && p.side === 'detail') { const ph = S.phoneNear(a); if (ph && !S.tapped[ph]) S.tap(p, ph); }
    else if (p.role === 'lt' && d.k === 'shut') { S.corner.manual = true; S.corner.shut('lt', 9999, a); S.emit('shut', {}); }
    else if (p.role === 'lt' && d.k === 'open') { S.corner.manual = false; S.corner.reopen(); S.emit('open', {}); }
    else if (p.role === 'lt' && d.k === 'stash' && dist2(a, S.corner.stash) < 34) S.moveStash(p);
    else if (p.role === 'lt' && d.k === 'reup') { const ph = S.phoneNear(a); if (ph) S.reup(p, ph); }
    else if (p.role === 'runner' && d.k === 'pickup') { if (S.drop && S.drop.ready && dist2(a, S.drop) < 28) S.fetchDrop(a); else if (S.corner.humanPickup(a)) S.emit('pickup', {}); }
    else if (p.role === 'runner' && d.k === 'handoff') { if (S.corner.humanHandoff(a)) S.emit('sale', { by: p.id }); }
    else if (p.role === 'runner' && d.k === 'ditch' && a.carrying) { const n = a.carrying; a.carrying = 0; S.corner.L.carried -= n; S.corner.L.seized += n; S.emit('ditch', { n }); }
  },
  sendAct(k, target, extra = {}) { this.send(Object.assign({ t: 'act', k, target: target ? this.keyOf(target) : null, at: Math.round(window.AIHub.time()) }, extra), true); },
  onLeave(e) {
    const S = Versus.sim; this.left.add(e.id); if (!S) return; const p = S.players.find(z => z.id === e.id); if (!p) return;
    p.left = true; p.human = false; p.remote = false; p.net = null; p.ctl = new BotCtl(); p.brain = p.side === 'detail' ? detBot : p.role === 'lt' ? ltBot : runBot; Toast(p.name + ' left', 'A bot takes their place.');
  },
  /** the host finishes the round, once */
  finish() {
    const S = Versus.sim; if (!this.isHost || this.finished || !S) return; this.finished = true; if (!S.over) S.end(S.netCount >= S.quota ? 'corner' : 'draw');
    const ids = (window.AIHub.players || []).map(p => p.id).filter(id => !this.left.has(id) && id !== (this.server ? this.me : -1));
    const side = id => (S.players.find(p => p.id === id) || {}).side, win = S.over === 'detail' ? 'detail' : S.over === 'corner' ? 'corner' : null;
    const standings = win ? [ids.filter(id => side(id) === win), ids.filter(id => side(id) !== win)].filter(g => g.length) : [ids];
    const sides = new Set(ids.map(side)), o = { standings };
    if (sides.size === 1 && ids.length) o.won = win ? [...sides][0] === win : false;
    o.scores = {}; o.stats = {}; for (const id of ids) { const p = S.players.find(z => z.id === id); if (!p) continue; o.scores[id] = Math.round(p.stats.score); o.stats[id] = { Photos: p.stats.photos, Burns: p.stats.burns, 'Call-outs': p.stats.callouts, Count: money(p.side === 'corner' ? S.netCount : 0) }; }
    o.awards = S.awards().filter(a => ids.includes(a.id));
    try { window.AIHub.finish(o); } catch (e) { game.fail('hub finish', e); }
  },
  onEnd(e) {
    this.ended = true; game.audio.music(null); try { Amb.stop(); } catch (er) { /* none */ }
    for (const p of (Versus.sim ? Versus.sim.players : [])) { p.ctl = new BotCtl(); p.human = false; }
    const S = Versus.sim;
    this.endMsg = e && e.reason === 'host-left' ? 'Round cancelled: the host left.' : S && S.over ? (S.over === 'detail' ? 'The Detail made its case.' : S.over === 'corner' ? 'The Corner made its count.' : 'The game goes on.') : 'Round over.';
    if (S) S.over = S.over || 'draw';
  }
};
/* in a session, versus actions from this copy go to the host */
VersusSim.prototype.route = function (p, k, target, extra) { if (this.clientMode) { Net.sendAct(k, target, extra); return true; } return false; };
