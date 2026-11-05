/* 62-net: AI Hub Session Protocol v1, shared-world co-op for 1-4 players (lib/hub/README.md).
 * The host runs the authoritative Sim. Each client sends its player's input ('in', unreliable, 15/s: aim, held
 * buttons, cumulative press counters, its own cover with the hub time). The host streams every step's commands
 * ('f', reliable, 10/s, compact: a step with nothing new is a 0), so every copy runs the same deterministic Sim from
 * the same seed and sees the same enemies, bosses and score. Threats on a remote player resolve 0.2 s late, against the
 * cover that player reported for the impact time (the host decides; the outcome rides in the frame stream). A state
 * check ('h', 1/s) carries the host's scores and lives, which replicas adopt. The local camera and reticle are
 * predicted from local input at once. No title, menus or pause in a session; names only ever drawn on the canvas. */
const NET_STEP = 1 / 120;
const enc = c => (c.fireDown ? 1 : 0) | (c.firePressed ? 2 : 0) | (c.coverDown ? 4 : 0) | (c.coverPressed ? 8 : 0) | (c.next ? 16 : 0) | (c.prev ? 32 : 0) | (c.reload ? 64 : 0) | ((c.select || 0) << 7);
const dec = (n, aim) => ({ aim: aim || [0, 0], fireDown: !!(n & 1), firePressed: !!(n & 2), coverDown: !!(n & 4), coverPressed: !!(n & 8), next: !!(n & 16), prev: !!(n & 32), reload: !!(n & 64), select: (n >> 7) & 7 });
TC.netEnc = enc; TC.netDec = dec;

class Net {
  constructor(hub, info) {
    this.hub = hub; this.info = info; this.isHost = !!info.isHost; this.server = !!info.server;
    this.ids = info.players.map(p => p.id); this.me = this.server ? -1 : this.ids.indexOf(info.me);
    this.k = 0; this.frames = []; this.out = []; this.sendT = 0; this.inT = 0; this.hT = 0; this.remote = {}; this.counters = { f: 0, c: 0, n: 0, p: 0, r: 0 }; this.lastIn = {};
    this.buf = new Map(); this.next = 0; this.ended = false; this.finished = false; this.tl = []; this.leaves = []; this.pendingLeave = []; this.lastAim = [0, 0]; this.bucket = 18; this.bucketT = 0;
    this.localC = 0;
    this.off = [hub.on('message', (d, from) => this.onMessage(d, from)), hub.on('leave', e => this.onLeave(e)), hub.on('time-up', e => this.onTimeUp(e)), hub.on('end', e => this.onEnd(e))];
  }
  /** a slot in the rate limiter (18 a second, the protocol allows 20) */
  canSend(n = 1) { return this.bucket >= n; }
  send(d, rel = true) { if (this.ended || !this.canSend()) return false; this.bucket--; try { return this.hub.send(d, { reliable: rel }); } catch (e) { return false; } }
  idxOf(hubId) { return this.ids.indexOf(hubId); }
  onMessage(d, from) {
    if (!d || this.ended) return;
    const i = this.idxOf(from);
    if (d.t === 'in' && this.isHost && i >= 0) this.remote[i] = d;
    if (d.t === 'f' && !this.isHost) { for (let j = 0; j < d.s.length; j++) this.buf.set(d.k + j, d.s[j]); }
    if (d.t === 'h' && !this.isHost) this.check = d;
  }
  onLeave(e) {
    const i = this.idxOf(e.id); if (i < 0) return;
    if (this.isHost) this.pendingLeave.push(i);
    if (e.id === this.info.host && !this.isHost) this.hostGone = true;
  }
  onTimeUp() { if (this.isHost && !this.finished) this.finish('time-up'); }
  onEnd(e) {
    this.ended = true; this.endReason = e.reason;
    try { TC.game.input.clear(); TC.game.audio.stopMusic(); TC.game.audio.mute(true); Audio3.ambience(null); } catch (err) { /* no audio */ }
  }
  /** the host's command for remote player i this step: held states from its last input, presses from its counters */
  remoteCmd(i) {
    const d = this.remote[i]; if (!d) return NOCMD;
    const L = this.lastIn[i] || (this.lastIn[i] = { f: d.fp || 0, c: d.cp || 0, n: d.nx || 0, p: d.pv || 0, r: d.rl || 0 });
    const c = { aim: [d.a[0] / 1000, d.a[1] / 1000], fireDown: !!d.fd, coverDown: !!d.cd, firePressed: false, coverPressed: false, next: false, prev: false, reload: false, select: d.w || 0 };
    if ((d.fp || 0) > L.f) { c.firePressed = true; c.fireDown = true; L.f++; }
    if ((d.cp || 0) > L.c) { c.coverPressed = true; L.c++; }
    if ((d.nx || 0) > L.n) { c.next = true; L.n++; }
    if ((d.pv || 0) > L.p) { c.prev = true; L.p++; }
    if ((d.rl || 0) > L.r) { c.reload = true; L.r++; }
    if (d.w === L.w) c.select = 0; L.w = d.w;
    return c;
  }
  /** the host decides a remote player's threat from the cover it reported for the impact's hub time */
  resolver(sim, th, p) {
    const d = this.tlFor(p.id), at = this.hubAt(th.T);
    if (!d || !d.length) return null;
    let c = null; for (const s of d) { if (s[0] <= at) c = s[1]; else break; }
    if (c === null) c = d[0][1];
    return c >= .5 ? 'blocked' : 'hit';
  }
  tlFor(i) { return this.remote[i] && this.remote[i].tl; }
  hubAt(simT) { const T = this.tl; if (!T.length) return simT * 1000; let a = T[0], b = T[T.length - 1]; for (let j = 1; j < T.length; j++) if (T[j][0] >= simT) { a = T[j - 1]; b = T[j]; break; } const u = b[0] === a[0] ? 0 : (simT - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * u; }
  /** one presentation update: steps the Sim (host: from commands; replica: from the host's frames) */
  update(dt, P) {
    const sim = P.sim, hub = this.hub, now = hub.time ? hub.time() : 0;
    this.bucketT += dt; if (this.bucketT >= 1 / 18) { this.bucket = Math.min(18, this.bucket + Math.floor(this.bucketT * 18)); this.bucketT = 0; }
    if (this.ended || now < 0) return;
    const local = this.me >= 0 ? P.localCmd(this.me, dt) : null;
    // the local player's input, to the host (aim, held buttons, cumulative presses, its cover timeline)
    if (local) {
      const C = this.counters; if (local.firePressed) C.f++; if (local.coverPressed) C.c++; if (local.next) C.n++; if (local.prev) C.p++; if (local.reload) C.r++;
      const want = (TC.coverToggle ? this.togOn : local.coverDown); if (TC.coverToggle && local.coverPressed) this.togOn = !this.togOn;
      this.localC = want ? Math.min(1, this.localC + dt / tune.player.coverIn) : Math.max(0, this.localC - dt / tune.player.coverOut);
      (this.myTl || (this.myTl = [])).push([Math.round(now), +this.localC.toFixed(2)]); while (this.myTl.length > 24) this.myTl.shift();
      if (local.select) this.lastSel = local.select;
      this.inT += dt;
      if (!this.isHost && this.inT >= 1 / 15) { this.inT = 0; this.send({ t: 'in', a: [Math.round(local.aim[0] * 1000), Math.round(local.aim[1] * 1000)], fd: local.fireDown ? 1 : 0, cd: local.coverDown ? 1 : 0, fp: C.f, cp: C.c, nx: C.n, pv: C.p, rl: C.r, w: this.lastSel || 0, tl: this.myTl.slice(-12) }, false); }
    }
    if (this.isHost) {
      const n = Math.round(dt / NET_STEP) || 1;
      for (let s = 0; s < n; s++) {
        const cmds = [], frame = { c: [], a: {}, o: {}, l: [] };
        for (let i = 0; i < sim.players.length; i++) cmds[i] = i === this.me ? (s === 0 ? local : Object.assign({}, local, { firePressed: false, coverPressed: false, next: false, prev: false, reload: false, select: 0 })) : this.remoteCmd(i);
        for (const i of this.pendingLeave.splice(0)) { sim.players[i].present = false; sim.players[i].left = true; frame.l.push(i); }
        sim.resolver = (th, p) => this.resolver(sim, th, p); sim.onResolved = (th, r) => { frame.o[th.id] = r === 'hit' ? 1 : 0; };
        sim.step(NET_STEP, cmds);
        this.tl.push([sim.t, now]); if (this.tl.length > 400) this.tl.splice(0, 100);
        let any = frame.l.length || Object.keys(frame.o).length;
        cmds.forEach((c, i) => { const e = enc(c || NOCMD); frame.c[i] = e; if (e) any = true; if (c && (c.fireDown || c.firePressed)) { frame.a[i] = [Math.round(c.aim[0] * 1000), Math.round(c.aim[1] * 1000)]; any = true; } });
        this.out.push(any ? frame : 0); this.k++;
      }
      this.sendT += dt; this.hT += dt;
      if (this.sendT >= .1 && this.out.length) { this.sendT = 0; if (this.send({ t: 'f', k: this.k - this.out.length, s: this.out })) this.out = []; }
      if (this.hT >= 1) { this.hT = 0; this.send({ t: 'h', k: this.k, sc: sim.players.map(p => p.score), lv: sim.players.map(p => p.lives), h: sim.hash() }); }
      if (!this.finished && (sim.phase === 'done' || sim.phase === 'gameover' || sim.players.every(p => p.left))) this.finish(sim.phase === 'done' ? 'won' : 'over');
    } else {
      // play the host's frames as they come, a few steps behind; catch up when far behind
      let steps = 0;
      const ahead = () => { let n = 0; while (this.buf.has(this.next + n)) n++; return n; };
      let budget = ahead() > 30 ? 4 : ahead() > 8 ? 2 : 1;
      while (budget-- > 0 && this.buf.has(this.next)) {
        const f = this.buf.get(this.next); this.buf.delete(this.next); this.next++;
        const cmds = sim.players.map((p, i) => f && f.c ? dec(f.c[i] || 0, f.a && f.a[i] ? [f.a[i][0] / 1000, f.a[i][1] / 1000] : (p.aim || [0, 0])) : NOCMD);
        if (f && f.l) for (const i of f.l) { sim.players[i].present = false; sim.players[i].left = true; }
        sim.forced = f && f.o ? f.o : null;
        sim.step(NET_STEP, cmds); steps++;
      }
      if (this.check && this.check.k <= this.next) { this.check.sc.forEach((v, i) => { if (sim.players[i]) sim.players[i].score = v; }); this.check.lv.forEach((v, i) => { if (sim.players[i]) sim.players[i].lives = v; }); this.check = null; }
      void steps;
    }
  }
  finish(why) {
    if (this.finished) return; this.finished = true;
    const sim = TC.play.sim, ps = sim.players.map((p, i) => ({ i, id: this.ids[i], p }));
    const order = ps.filter(q => !q.p.left).sort((a, b) => b.p.score - a.p.score), standings = [];
    for (const q of order) { const last = standings[standings.length - 1]; if (last && sim.players[this.idxOf(last[0])].score === q.p.score) last.push(q.id); else standings.push([q.id]); }
    const scores = {}, stats = {}; for (const q of ps) { scores[q.id] = q.p.score; const s = q.p.stats; stats[q.id] = { Kills: s.kills, Accuracy: (s.shots ? Math.round(s.hits / s.shots * 100) : 0) + '%', Headshots: s.heads, 'Cover saves': s.saves, 'Lives lost': s.lost }; }
    const best = f => { let b = null; for (const q of ps) if (!b || f(q.p) > f(b.p)) b = q; return b; };
    const acc = p => p.stats.shots ? p.stats.hits / p.stats.shots : 0, awards = [];
    const a1 = best(acc), a2 = best(p => p.stats.kills), a3 = best(p => p.stats.saves);
    if (a1) awards.push({ id: a1.id, title: 'Sharpshooter', detail: Math.round(acc(a1.p) * 100) + '% accuracy' });
    if (a2) awards.push({ id: a2.id, title: 'Pointman', detail: a2.p.stats.kills + ' kills' });
    if (a3) awards.push({ id: a3.id, title: 'Iron Wall', detail: a3.p.stats.saves + ' cover saves' });
    try { this.hub.finish({ standings, scores, won: why === 'won', stats, awards }); } catch (e) { /* the hub is gone */ }
  }
  dispose() { for (const f of this.off) try { f && f(); } catch (e) { /* none */ } }
}
TC.Net = Net;

/** the session scene: connect, our own card, the countdown, the round, the end */
function sessionScene() {
  return {
    camera: { zoom: false }, touch: [], pausable: false,
    enter() {
      this.state = 'connect'; this.t = 0; this.card = null; this.info = null;
      const hub = window.AIHub;
      hub.connect({ mode: 'shared-world', seats: [1, 4], card: true }).then(info => {
        if (!info) { TC.HUBOFF = true; TC.game.go('title'); return; }
        this.info = info; const stage = ((((info.round || 1) - 1) % 3) + 3) % 3 + 1; this.stage = stage;
        const players = info.players.map((p, i) => ({ name: p.name, color: p.color || SEAT_COLORS[i % 4], agent: AGENTS[i % 4] }));
        const sim = new Sim({ mode: 'host', stage, difficulty: 'normal', seed: (info.seed >>> 0) || 1, players, skipIntro: true });
        info.players.forEach((p, i) => { sim.players[i].remote = !(p.id === info.host && !info.server); sim.players[i].hubId = p.id; });
        this.net = new Net(hub, info);
        this.play = new Play({ sim, inputs: [TC.game.input], net: this.net, view: Math.max(0, this.net.me) });
        TC.run = { mode: 'hub', sim, players };
        hub.on('card', c => { this.card = c; });
        hub.on('start', () => { this.state = 'count'; });
        this.state = 'card'; Audio3.music('briefing');
        hub.ready();
      }).catch(() => { TC.game.go('title'); });
    },
    update(dt) {
      this.t += dt; const I = TC.game.input, hub = window.AIHub;
      if (this.net && this.net.ended) { this.state = 'end'; return; }
      if (this.state === 'card') {
        if (I.pressed('confirm') || I.pressed('start') || I.clicked()) { try { hub.answer('ready'); } catch (e) { /* not yet */ } }
        if (I.pressed('more')) { try { hub.answer('more'); } catch (e) { /* not yet */ } }
        return;
      }
      if (this.state === 'count') { if (hub.time() >= 0) { this.state = 'play'; Audio3.music(this.play.sim.stage.music); } return; }
      if (this.state === 'play') { this.play.update(dt); }
    },
    draw(r) {
      const W = r.W, H = r.H;
      if (this.state === 'play' && this.play && !(this.net && this.net.server)) { this.play.draw(r); this.drawStrip(r); return; }
      r.overlay(g => {
        Flyover.draw(g, W, H, 1 / 60); E.px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, W, H, '#04060c'));
        if (this.state === 'connect') { logo(g, W / 2, H * .3, this.t); txt(g, 'CONNECTING TO THE HUB...', W / 2, H * .6, '#ffffff', { align: 'center', scale: 2 }); return; }
        if (this.state === 'end') { const rs = this.net.endReason; F.title(g, rs === 'host-left' ? 'HOST LEFT' : rs === 'sat-out' ? 'SAT OUT' : 'ROUND OVER', W / 2, H * .36, { scale: 3, colors: ['#ffffff', '#9fe3ff', '#3aa0e8', '#1a4f9c'], outline: '#08142a', align: 'center' }); txt(g, rs === 'host-left' ? 'ROUND VOID' : rs === 'sat-out' ? 'YOU SAT THIS ONE OUT' : 'WELL FOUGHT, AGENTS', W / 2, H * .58, '#ffd36a', { align: 'center', scale: 2 }); return; }
        if (this.net && this.net.server && this.state === 'play') { const s = this.play.sim; txt(g, 'HOSTING  •  ' + s.players.filter(p => p.present).length + ' AGENTS  •  AREA ' + s.stage.id + '-' + (s.sceneIdx + 1), W / 2, H / 2, '#ffffff', { align: 'center', scale: 2 }); return; }
        // our own card: the stage, the players with their ready ticks, the goal, this device's controls, the countdown
        const st = reg('stage', this.stage || 1), info = this.info, c = this.card || {};
        logo(g, W / 2, 16, this.t, .5);
        txt(g, 'STAGE ' + st.num + '  •  ' + st.name, W / 2, 56, '#ffd36a', { align: 'center', scale: 2 }); txt(g, st.place + '  •  ' + st.clock, W / 2, 74, '#9fe3ff', { align: 'center' });
        (info ? info.players : []).forEach((p, k) => { const x = W / 2 - 150 + k * 76, ready = (c.ready || []).includes(p.id); E.ui.box(g, x, 88, 70, 46, { bg: ['#10244a', '#081428'], border: p.color || SEAT_COLORS[k] }); txt(g, String(p.name).slice(0, 10), x + 35, 92, p.color || SEAT_COLORS[k], { align: 'center' }); txt(g, reg('speaker', AGENTS[k % 4]).name, x + 35, 104, '#ffffff', { align: 'center' }); txt(g, ready ? 'READY!' : '...', x + 35, 118, ready ? '#5ad17a' : '#8aa0c8', { align: 'center' }); });
        txt(g, 'GOAL: ' + TC.ABOUT.hub.goal, W / 2, 144, '#ffffff', { align: 'center' });
        promptLine(g, TC.game.input, ['AIM: MOUSE OR STICK   ', { a: 'fire' }, ' FIRE   HOLD ', { a: 'cover' }, ' COVER + RELOAD'], W / 2, 158);
        const left = c.left === null || c.left === undefined ? null : Math.ceil(c.left / 1000);
        txt(g, c.starting ? 'STARTING...' : c.paused ? 'PAUSED: MORE TIME ASKED (' + (c.asking || 0) + ')' : left !== null ? 'STARTS IN ' + left : '', W / 2, 176, '#ffd36a', { align: 'center', scale: 2 });
        promptLine(g, TC.game.input, [{ a: 'confirm' }, ' READY   ', { a: 'more' }, c.asked ? ' TAKE BACK MORE TIME' : ' MORE TIME'], W / 2, H - 24);
        if (this.state === 'count') { const s = Math.ceil(-window.AIHub.time() / 1000); F.title(g, String(Math.max(1, s)), W / 2, H / 2 - 20, { scale: 6, colors: ['#fff3b0', '#ffd36a', '#ff8a2a', '#a81e1e'], outline: '#08142a', align: 'center' }); }
      });
    },
    /** teammates at the top right: name in the seat color, lives, a dot when in cover */
    drawStrip(r) {
      const sim = this.play.sim; r.overlay(g => { let y = 4; sim.players.forEach((p, i) => { if (i === this.net.me) return; const x = r.W - 92; E.ui.box(g, x, y, 88, 12, { bg: ['#10244a', '#081428'], border: p.color, alpha: .8 }); txt(g, String(p.name).slice(0, 8), x + 3, y + 2, p.color); txt(g, (p.left ? 'LEFT' : '♥' + p.lives) + (p.c > .5 ? ' •' : ''), x + 85, y + 2, '#ffffff', { align: 'right' }); y += 14; }); });
    }
  };
}
TC.sessionScene = sessionScene;
