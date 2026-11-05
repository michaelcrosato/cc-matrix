/* ============ 42-hub: AI Hub session protocol v1, shared-world: the host runs the match, the others send intents and draw snapshots ============ */
EF.RemoteController = class RemoteController {
  constructor() { this.m = [0, 0]; this.sp = false; this.h = 0; this.p = 0; this.r = 0; this.eu = false; }
  set(msg) { this.m = msg.m || [0, 0]; this.sp = !!msg.sp; this.h = msg.h | 0; this.p |= msg.p | 0; this.r |= msg.r | 0; if (msg.eu) this.eu = true; }
  read() { const it = EF.Intent(); it.move = this.m.slice(); it.sprint = this.sp; EF.ACTIONS.forEach((a, i) => { it[a] = { down: !!((this.h >> i) & 1), pressed: !!((this.p >> i) & 1), released: !!((this.r >> i) & 1), held: 0 }; }); it.euphoria = this.eu; this.p = 0; this.r = 0; this.eu = false; return it; }
  stick() { return this.m; } anyFace() { return (this.p & 15) !== 0; }
};
EF.Hub = {
  active: EF.session, info: null, M: null, remote: {}, snap: null, lastSnapAt: 0, lastIn: 0, bits: { p: 0, r: 0, eu: false }, finished: false, lastSeq: 0, sentSeq: 0,
  boot() {
    const H = this; if (!window.AIHub) return;
    AIHub.connect({ mode: 'shared-world', seats: [2, 4] }).then(info => {
      if (!info) { EF.session = false; game.go('title'); return; }
      H.info = info; H.setup(info); AIHub.ready();
    }).catch(e => { console.warn('hub', e); EF.session = false; game.go('title'); });
    AIHub.on('message', (data, from) => H.onMessage(data, from));
    AIHub.on('leave', e => H.onLeave(e)); AIHub.on('time-up', () => H.onTimeUp()); AIHub.on('end', () => { H.ended = true; EF.music(null); EF.crowdAudio.stop(); });
  },
  setup(info) {
    const H = this, server = !!info.server, host = info.isHost, ids = info.players.map(p => p.id);
    const build = () => {
      const M = new EF.Match({ home: 'kip', away: 'opu', stadium: 'euphorium', ref: 'haltwhistle', seed: info.seed || 7, rules: { halfSecs: 75, needWinner: false, noExtra: true, advantage: true }, noReplay: true, noEvents: false, mirror: !host, frozen: host });
      M.rules.halfSecs = 75; M.halfSecs = 75;
      const mine = info.players.find(p => p.id === info.me);
      const order = info.players.slice().sort((a, b) => (a.id === info.me ? -1 : b.id === info.me ? 1 : a.id - b.id));
      for (const p of order) { let ctl = null; if (host) { if (p.id === info.me && !server) ctl = new EF.HumanController(game.input, 0); else { ctl = new EF.RemoteController(); H.remote[p.id] = ctl; } } M.addHuman(p.id, p.id % 2, ctl); }
      H.M = M; return M;
    };
    game.go('match', { mode: 'hub', hub: true, build, hubClient: !host, noResults: true, noReplay: true, noDraw: server, onUpdate: (M, dt) => H.tick(M, dt), music: 'gold', onOver: M => H.finish(M), drawExtra: (r, M) => H.drawExtra(r, M) });
  },
  bitsOf(it) { let h = 0, p = 0, rr = 0; EF.ACTIONS.forEach((a, i) => { if (it[a].down) h |= 1 << i; if (it[a].pressed) p |= 1 << i; if (it[a].released) rr |= 1 << i; }); return [h, p, rr]; },
  tick(M, dt) {
    const info = this.info; if (!info || this.ended) return; const time = AIHub.time(), host = info.isHost;
    if (host) {
      if (M.o.frozen && time >= 0) { M.o.frozen = false; }
      this.lastSnapAt += dt; if (this.lastSnapAt >= .066) { this.lastSnapAt = 0; this.sendSnapshot(M); }
    } else {
      // the client: send what the local player is doing, apply the latest snapshot
      this.lastIn += dt; const me = M.humans[0], ctl = this.local || (this.local = new EF.HumanController(game.input, 0)), it = ctl.read(null, M); const [h, p, rr] = this.bitsOf(it); this.bits.p |= p; this.bits.r |= rr; if (it.euphoria) this.bits.eu = true; M.t += dt;
      if (this.lastIn >= .05 && time > -Infinity) { this.lastIn = 0; AIHub.send({ k: 'i', m: [+it.move[0].toFixed(2), +it.move[1].toFixed(2)], sp: it.sprint ? 1 : 0, h, p: this.bits.p, r: this.bits.r, eu: this.bits.eu ? 1 : 0 }, { to: info.host, reliable: false }); this.bits = { p: 0, r: 0, eu: false }; }
      if (this.snap) this.applySnap(M, this.snap, dt);
    }
  },
  sendSnapshot(M) {
    const ev = M.events.filter(e => e.seq > this.sentSeq).map(e => { const o = { type: e.type, seq: e.seq }; for (const k of ['x', 'y', 'side', 'who', 'name', 'color', 'sup', 'power', 'save', 'perfect', 'overturned', 'kind', 'own', 'header', 'fk', 'pen', 'parry', 'result', 'victim', 'move', 'shot', 'contact', 'cross', 'through', 'by']) if (e[k] !== undefined) o[k] = e[k]; return o; }); if (M.events.length) this.sentSeq = M.events[M.events.length - 1].seq;
    const h = {}; for (const hu of M.humans) if (hu.f) h[hu.idx] = hu.f.id;
    const m = { md: M.mode, hf: M.half, ck: +M.clock.toFixed(2), sc: M.score, eu: M.eu.map(v => +v.toFixed(3)), er: M.europhoria ? [M.europhoria.side, +M.europhoria.t.toFixed(2)] : null, ex: M.extra ? 1 : 0, gd: M.golden ? 1 : 0, rs: M.restartSide, sp: M.sp ? [M.sp.type, M.sp.side, Math.round(M.sp.x), Math.round(M.sp.y), M.sp.taker ? M.sp.taker.id : -1, M.sp.indirect ? 1 : 0] : null, va: M.var ? [M.var.kind, +M.var.t.toFixed(2), M.var.dur] : null, du: M.duel ? [M.duel.side, +M.duel.t.toFixed(2), M.duel.dur] : null, gi: M.goalInfo ? [M.goalInfo.side] : null, rf: [Math.round(M.ref.x), Math.round(M.ref.y)], cd: M.celebrant ? M.celebrant.id : -1, fl: M.flicker > 0 ? 1 : 0, cs: M.refCard ? [M.refCard.color, M.refCard.t] : null };
    try { AIHub.send({ k: 's', c: M.capture(), m, h, e: ev }, { reliable: false }); } catch (e) { /* too big */ }
  },
  onMessage(data, from) {
    if (!data || !this.info) return;
    if (data.k === 'i' && this.info.isHost) { const c = this.remote[from]; if (c) c.set(data); }
    else if (data.k === 's' && !this.info.isHost) this.snap = data;
  },
  applySnap(M, s, dt) {
    const k = 1 - Math.exp(-dt * 16), fr = s.c, m = s.m;
    if (!this.first) { M.restore(fr); this.first = true; } else {
      const B = fr.b, b = M.ball; b.x += (B[0] - b.x) * Math.min(1, k * 1.6); b.y += (B[1] - b.y) * Math.min(1, k * 1.6); b.z = B[2]; b.vx = B[3]; b.vy = B[4]; b.owner = B[5] >= 0 ? M.F[B[5]] : null; b.roll = B[6]; b.sup = B[7] ? { color: '#ffd84a' } : null;
      fr.f.forEach((a, i) => { const f = M.F[i]; const dx = a[0] - f.x, dy = a[1] - f.y; if (Math.hypot(dx, dy) > 60) { f.x = a[0]; f.y = a[1]; } else { f.x += dx * k; f.y += dy * k; } f.z = a[2]; f.facing = E.approachAng(f.facing, a[3], dt * 18); f.vx = a[4]; f.vy = a[5]; f.state = a[6]; f.action = a[7] || null; f.stateT = a[8]; f.tilt = a[9]; f.jump = a[10]; f.celebrate = a[11] ? 2 : 0; f.sentOff = !!a[12]; f.stamina = a[13]; f.charge = a[14]; f.charging = a[14] > 0; });
    }
    M.mode = m.md; M.half = m.hf; M.clock = m.ck; M.score = m.sc; M.eu = m.eu; M.europhoria = m.er ? { side: m.er[0], t: m.er[1] } : null; M.extra = !!m.ex; M.golden = !!m.gd; M.restartSide = m.rs;
    M.sp = m.sp ? { type: m.sp[0], side: m.sp[1], x: m.sp[2], y: m.sp[3], taker: M.F[m.sp[4]], indirect: !!m.sp[5] } : null; M.var = m.va ? { kind: m.va[0], t: m.va[1], dur: m.va[2] } : null; M.duel = m.du ? { side: m.du[0], t: m.du[1], dur: m.du[2] } : null; M.goalInfo = m.gi ? { side: m.gi[0] } : M.goalInfo; M.ref.x = m.rf[0]; M.ref.y = m.rf[1]; M.celebrant = m.cd >= 0 ? M.F[m.cd] : null; M.flicker = m.fl ? 1 : 0; M.refCard = m.cs ? { color: m.cs[0], t: m.cs[1] } : null;
    for (const hu of M.humans) { hu.f = s.h && s.h[hu.idx] !== undefined ? M.F[s.h[hu.idx]] : null; }
    for (const f of M.F) f.human = null; for (const hu of M.humans) if (hu.f) hu.f.human = hu.idx;
    for (const e of s.e || []) if (e.seq > this.lastSeq) { this.lastSeq = e.seq; const t = e.type; delete e.seq; delete e.type; M.emit(t, e); }
    M.over = false;
  },
  finish(M) {
    if (this.finished || !this.info || !this.info.isHost) return; this.finished = true; const res = M.result, ids = this.info.players.map(p => p.id), w = res.winner;
    const win = ids.filter(i => i % 2 === w), lose = ids.filter(i => i % 2 !== w); const standings = w < 0 ? [ids] : [win, lose].filter(a => a.length);
    const scores = {}; for (const i of ids) scores[i] = M.score[i % 2];
    try { AIHub.finish({ standings, scores, won: w < 0 ? undefined : undefined, stats: Object.fromEntries(ids.map(i => [i, { Goals: M.stats[i % 2].goals, Shots: M.stats[i % 2].shots, Tackles: M.stats[i % 2].tackles }])) }); } catch (e) { console.warn(e); }
  },
  onTimeUp() { const M = this.M; if (!M || !this.info || !this.info.isHost) return; const w = M.score[0] > M.score[1] ? 0 : M.score[1] > M.score[0] ? 1 : -1; M.mode = 'over'; M.over = true; M.result = { score: M.score.slice(), winner: w, stats: M.stats, goals: M.goals.slice() }; this.finish(M); },
  onLeave(e) { const M = this.M; if (!M) return; if (this.info && this.info.isHost) { M.humans = M.humans.filter(h => h.idx !== e.id); delete this.remote[e.id]; } else { M.humans = M.humans.filter(h => h.idx !== e.id); } },
  drawExtra(r, M) {
    if (!this.info) return; const t = AIHub.time(); r.overlay(g => { const W = r.W, H = r.H;
      if (t < 0 && t > -Infinity) TXT(g, Math.ceil(-t / 1000) + '', W / 2, H * .3, '#ffe08a', { scale: 6, align: 'center', outline: '#000', shadow: false });
      const me = this.info.me, mySide = me % 2; TXT(g, 'YOU: ' + M.teams[mySide].data.short, W / 2, 6, '#' + 'c8d4ff'.slice(0), { font: 'tiny', align: 'center' });
      if (M.mode === 'over') TXT(g, 'FULL TIME', W / 2, H * .3, '#ffffff', { scale: 3, align: 'center', outline: '#000', shadow: false }); });
  }
};
EF.scenes.hubwait = { view: 'broadcast', input: EF.KEYS, res: 'ps1', touch: [], pausable: false, enter() { EF.Hub.boot(); }, update() {}, draw(r) { r.sky(['#06081a', '#141a3a']); r.overlay(g => TXT(g, 'CONNECTING TO THE HUB...', r.W / 2, r.H / 2, '#ffe7a8', { scale: 2, align: 'center' })); } };
