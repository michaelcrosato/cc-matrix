/* 25-netplay: AI Hub sessions (shared world). The game opens straight into its own card (the court at sunset, the four
 * fighters lined up, CPUs tagged, everyone's name in her seat color with a READY tick, the countdown), then one match on
 * the hub's clock. The host runs the rules and the AI; every copy flies the ball from the same launches on the shared
 * clock, so each player judges her own touches fairly and sends a claim the host validates. Clients move their own
 * fighter at once and see the others from snapshots 100 ms behind. Only the host calls finish(). Messages are small JSON:
 * m (a client's fighter), c (a touch claim), v (a serve), s (the host's snapshot), b (a launch and the next contact),
 * e (an event: a point, a phase), and the final s with over: 1. */
G.PRESETS.HUB = Object.assign({}, G.PRESETS.MATCH, { ready: ['Enter', 'NumpadEnter', 'Pad0', 'Space'], more: ['KeyT', 'Pad3'] });
const SEAT_COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
G.Net = {
  info: null, card: null, started: false, ended: null, leftIds: new Set(), lastSend: 0, inbox: [], snaps: [], sentAt: [],
  hub() { return window.AIHub; },
  send(d, reliable = true) { if (this.ended) return false; const now = performance.now(); this.sentAt = this.sentAt.filter(t => now - t < 1000); if (this.sentAt.length >= 16) return false; this.sentAt.push(now); try { return this.hub().send(d, { reliable }); } catch (e) { return false; } },
  /** the teams: seat i plays side i % 2, slot floor(i / 2); empty seats are CPUs */
  lineup(info) {
    const H = this.hub(), r1 = H.rng('cast'), cast = G.FIGHTERS.slice();
    for (let i = cast.length - 1; i > 0; i--) { const j = Math.floor(r1() * (i + 1)); [cast[i], cast[j]] = [cast[j], cast[i]]; }
    const r2 = H.rng('court'), tod = ['sunset', 'afternoon', 'night', 'morning'][Math.floor(r2() * 4)];
    const seats = [0, 1, 2, 3].map(i => { const pl = info.players[i]; return { i, side: i % 2, slot: Math.floor(i / 2), cast: cast[i], player: pl || null }; });
    return { seats, tod, seed: Math.floor(H.rng('match')() * 1e9) };
  },
  /** the match config for this copy (host: humans remote; client: only me local) */
  matchCfg(info, L) {
    const me = info.me, teams = [[], []];
    for (const s of L.seats) {
      const pl = s.player, mine = pl && pl.id === me && !info.server;
      teams[s.side][s.slot] = { cast: s.cast, ctl: mine ? { kind: 'human', input: G.game.input } : pl ? { kind: 'net', pid: pl.id } : { kind: 'ai' }, skill: G.DAY_SKILL.hub, color: pl ? (pl.color || SEAT_COLORS[s.i]) : null, tag: pl ? pl.name : 'CPU', name: G.castName(s.cast) };
    }
    return { mode: 'hub', role: info.isHost ? 'host' : 'client', net: this, teams, pointsToWin: 7, tod: L.tod, seed: L.seed, replay: false, commentary: true, introTime: 999, difficulty: 'Normal',
      teamNames: [0, 1].map(side => L.seats.filter(s => s.side === side).map(s => s.player ? s.player.name : 'CPU').join(' & ')), title: 'BEACH MATCH', onResults: () => null,
      clock: (g, r) => { const t = Math.max(0, window.AIHub.time() / 1000), s = Math.floor(t % 60), m = Math.floor(t / 60), sf = G.safe(r), txt = m + ':' + String(s).padStart(2, '0'); E.ui.box(g, r.W - sf.x - 44, sf.y, 44, 15, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .9 }); E.font.text(g, txt, r.W - sf.x - 22, sf.y + 4, '#fff8e8', { align: 'center', outline: false }); } };
  },
  /* ---- host hooks (the Match calls them) ---- */
  onPhase(M, ph) { this.send({ t: 'e', ev: 'ph', ph, sv: M.server ? M.server.id : -1, sc: M.rules.score }); },
  onLaunch(M, L) { this.pendingB = L; },
  onPlan(M, plan) { const L = M.L; this.send({ t: 'b', t0: +L.t0.toFixed(4), p: L.p.map(v => +v.toFixed(2)), v: L.v.map(v => +v.toFixed(2)), k: L.k, g: L.g, ay: L.ay, wob: L.wob, by: L.by, kind: L.kind, sv: L.serve ? 1 : 0, pl: plan ? [plan.p.id, plan.kind, +plan.tStar.toFixed(4), Math.round(plan.P[0]), Math.round(plan.P[1])] : null }); this.pendingB = null; },
  onPoint(M, pt) { this.send({ t: 'e', ev: 'pt', side: pt.side, why: pt.why, kind: pt.kind, sc: M.rules.score, sets: M.rules.setsWon }); },
  onEnd(M, res) { this.snapshot(M, true); this.finish(M); },
  hostStep(M, dt) {
    if (this.pendingB) { const L = M.L; if (L === this.pendingB) this.onPlan(M, M.plan); this.pendingB = null; }
    this.acc = (this.acc || 0) + dt; if (this.acc >= 1 / 12) { this.acc = 0; this.snapshot(M, false); }
    // a client's claims arrive here
    for (const { d, from } of this.inbox.splice(0)) this.hostMsg(M, d, from);
  },
  snapshot(M, over) { const d = { t: 's', at: Math.round(M.now * 1000), p: M.players.map(p => [p.id, Math.round(p.x), Math.round(p.y), +p.facing.toFixed(2), p.act, Math.round(p.z)]), sc: M.rules.score, ph: M.phase, sv: M.server ? M.server.id : -1, tc: M.touches }; if (over) d.over = 1; this.send(d, !!over); },
  hostMsg(M, d, from) {
    const p = M.players.find(q => q.ctl.kind === 'net' && q.ctl.pid === from); if (!p) return;
    if (d.t === 'm') { p.netTarget = [d.x, d.y]; p.netF = d.f; p.netAct = d.a; p.netSeen = M.now; }
    else if (d.t === 'v') { if (d.toss && M.server === p && M.phase === 'serveSetup') p.netToss = d.toss === 'jump' ? 'jump' : 'float'; if (d.q && M.server === p && M.phase === 'toss') p.netServe = { at: d.at / 1000, q: d.q, aim: d.aim }; }
    else if (d.t === 'c') {
      if (d.k === 'block') { if (M.plan && M.plan.side !== p.side && Math.abs(p.x - G.C.NET_X) < 22) M.startBlock(p); return; }
      p.claim = { at: d.at / 1000, q: d.q, aim: d.aim || [0, 0], sh: !!d.sh };
    }
  },
  /** the host plays a remote player's touch from her claim (or lets the ball by when none comes in time) */
  remoteContact(M, p, plan) {
    const w = G.VB.windows(1), c = p.claim;
    if (c) {
      p.claim = null;
      const ok = Math.abs(c.at - plan.tStar) <= w.o + .12, ball = G.Ball.at(M.L, c.at), near = Math.hypot(ball[0] - p.x, ball[1] - p.y) <= G.VB.reachR(p) + 12 + 30;
      if (ok && near && !plan.done) { const keep = M.now; M.now = Math.max(M.L.t0, c.at); if (plan.kind === 'attack' && !p.jump) G.VB.jumpAt(M, p, M.now, .2); M.contact(p, G.VB.QUAL[c.q] ? c.q : 'OK', { shot: c.sh, aim: c.aim }); M.now = keep; return; }
    }
    if (M.now > plan.tStar + w.o + .3) { plan.done = true; plan.missed = true; M.coverAfterMiss(p); }
  },
  finish(M) {
    if (this.finished || !this.hub().isHost) return; this.finished = true;
    const R = M.rules, humans = M.players.filter(p => p.ctl.kind === 'human' || p.ctl.kind === 'net'), pid = p => p.ctl.kind === 'human' ? this.info.me : p.ctl.pid;
    const ids = s => humans.filter(p => p.side === s && !this.leftIds.has(pid(p))).map(pid);
    const lead = R.score[0] === R.score[1] ? -1 : R.score[0] > R.score[1] ? 0 : 1, scores = {}, stats = {};
    for (const p of humans) { scores[pid(p)] = R.score[p.side]; stats[pid(p)] = { Points: p.stats.points, Kills: p.stats.kills }; }
    const mvp = humans.slice().sort((a, b) => b.stats.points - a.stats.points)[0];
    const out = { scores, stats, awards: mvp ? [{ id: pid(mvp), title: 'MVP', detail: mvp.stats.points + ' points' }] : [] };
    const live = humans.filter(p => !this.leftIds.has(pid(p)));
    if (live.length === 1) { out.standings = [[pid(live[0])]]; out.won = lead === live[0].side; }
    else if (lead < 0) out.standings = [live.map(pid)];
    else out.standings = [ids(lead), ids(1 - lead)].filter(a => a.length);
    try { this.hub().finish(out); } catch (e) { G.game.fail('finish', e); }
  },
  /* ---- client side ---- */
  clientUpdate(M, dt) {
    const H = this.hub(); M.now = H.time() / 1000; M.phaseT += dt; M.talk.update(dt);
    for (const pp of M.popups) pp.t += dt; M.popups = M.popups.filter(pp => pp.t < .9); if (M.banner) { M.banner.t += dt; if (M.banner.t > 1.6) M.banner = null; }
    for (const { d } of this.inbox.splice(0)) this.clientMsg(M, d);
    const me = M.players.find(p => p.ctl.kind === 'human');
    // the others from snapshots, 100 ms behind
    const rt = M.now * 1000 - 100, S = this.snaps; let a = null, b = null;
    for (let i = S.length - 1; i >= 0; i--) if (S[i].at <= rt) { a = S[i]; b = S[i + 1] || S[i]; break; }
    if (!a && S.length) a = b = S[0];
    if (a) for (const p of M.players) { if (p === me) continue; const pa = a.p.find(q => q[0] === p.id), pb = (b.p.find(q => q[0] === p.id)) || pa; if (!pa) continue; const k = b.at > a.at ? clamp((rt - a.at) / (b.at - a.at), 0, 1) : 0; p.x = lerp(pa[1], pb[1], k); p.y = lerp(pa[2], pb[2], k); p.facing = pb[3]; p.z = pb[5] || 0; if (p.act !== pb[4]) M.act(p, pb[4]); }
    // my fighter, at once
    if (me && !this.ended) {
      const inp = G.VB.humanInput(M, me, dt), sp = G.VB.speed(me), serving = M.serverId === me.id;
      if (M.phase === 'serveSetup' && serving) { me.vx = 0; me.vy = approach(me.vy, inp.mv[1] * 60, 600 * dt); me.y = clamp(me.y + me.vy * dt, G.C.Y0 + 4, G.C.Y1 - 4); if (M.phaseT > .4 && (inp.play || inp.shot) && !M.tossAsked) { M.tossAsked = true; this.send({ t: 'v', toss: inp.shot ? 'jump' : 'float' }); } }
      else if (M.phase === 'toss' && serving) { if ((inp.play || inp.shot) && !M.serveSent && M.L && M.L.kind === 'toss') { M.serveSent = true; const apex = G.Ball.apexT(M.L), q = G.VB.judge(M.now - apex); this.send({ t: 'v', at: Math.round(M.now * 1000), q: q === 'MISS' ? 'OK' : q, aim: inp.aim.map(v => +v.toFixed(2)) }); M.popup(me, q === 'PERFECT' ? 'PERFECT!' : q, G.VB.QCOL[q]); } }
      else {
        let mv = inp.mv; const plan = M.plan, mine = plan && plan.pid === me.id && !plan.done;
        if (Math.hypot(mv[0], mv[1]) < .1 && mine) { const dx = plan.P[0] - me.x, dy = plan.P[1] - me.y, d = Math.hypot(dx, dy); if (d > 3) mv = [dx / d * .85, dy / d * .85]; }
        G.VB.steer(me, mv[0] * sp, mv[1] * sp, dt); G.VB.integrate(M, me, dt);
        if (mine && (inp.play || inp.shot)) { const err = M.now - plan.tStar, q = err < -.6 ? null : G.VB.judge(err); if (q) { plan.done = true; this.send({ t: 'c', at: Math.round(Math.max(M.now, plan.tStar) * 1000), k: plan.kind, q: q === 'MISS' ? 'MISS' : q, aim: inp.aim.map(v => +v.toFixed(2)), sh: inp.shot ? 1 : 0 }); M.popup(me, q === 'PERFECT' ? 'PERFECT!' : q, G.VB.QCOL[q]); if (plan.kind === 'attack') { G.VB.jumpAt(M, me, M.now, .2); M.act(me, 'spike', { contactT: M.now }); } else M.act(me, plan.kind === 'set' ? 'set' : 'bump'); } }
        if (!mine && inp.shot && plan && plan.side !== me.side && Math.abs(me.x - G.C.NET_X) < 20 && !me.block) { me.block = { t0: M.now }; M.act(me, 'block'); this.send({ t: 'c', at: Math.round(M.now * 1000), k: 'block' }); }
        if (inp.dive && !me.dive) { const l = Math.hypot(inp.mv[0], inp.mv[1]) || 1; me.dive = { t0: M.now, vx: inp.mv[0] / l * 190, vy: inp.mv[1] / l * 190 }; M.act(me, 'dive'); }
        if (me.dive) { const u = M.now - me.dive.t0; if (u < .22) { me.vx = me.dive.vx; me.vy = me.dive.vy; } if (u > .97) { me.dive = null; M.act(me, 'ready'); } }
        if (M.now - me.actT0 > .6 && me.act !== 'ready' && !me.dive && !me.block && !me.jump) M.act(me, 'ready');
      }
      if (M.ball && Math.hypot(me.vx, me.vy) < 10) me.facing = E.approachAng(me.facing, Math.atan2(M.ball.y - me.y, M.ball.x - me.x), dt * 9);
      this.macc = (this.macc || 0) + dt; if (this.macc >= 1 / 12) { this.macc = 0; this.send({ t: 'm', at: Math.round(M.now * 1000), x: Math.round(me.x), y: Math.round(me.y), f: +me.facing.toFixed(2), a: me.act }, false); }
    }
    // the ball, on the shared clock
    if (M.L && !M.L.frozen) { const q = G.Ball.at(M.L, M.now); M.ball.x = q[0]; M.ball.y = q[1]; M.ball.z = Math.max(G.C.BALL_R, q[2]); M.ball.spin += .2; if (M.now > M.L.tLand + .4) M.L.frozen = true; }
    else if (M.serverId >= 0 && M.phase === 'serveSetup') { const sv = M.players.find(p => p.id === M.serverId); if (sv) { const h = sv.rig.hand('L'); M.ball.x = h[0]; M.ball.y = h[1]; M.ball.z = h[2] + 2; } }
    for (const p of M.players) G.Anim.player(M, p, dt);
  },
  clientMsg(M, d) {
    if (d.t === 's') { this.snaps.push(d); if (this.snaps.length > 30) this.snaps.shift(); M.rules.score = d.sc.slice(); if (d.ph && d.ph !== M.phase) { M.phase = d.ph; M.phaseT = 0; if (d.ph === 'serveSetup') { M.tossAsked = false; M.serveSent = false; M.L = null; } } M.serverId = d.sv; M.rules.serveSide = d.sv >= 0 ? (M.players.find(p => p.id === d.sv) || {}).side : M.rules.serveSide; if (d.over) M.over = true; }
    else if (d.t === 'b') { M.L = G.Ball.make(d.t0, d.p, d.v, { k: d.k, g: d.g, ay: d.ay, wob: d.wob, by: d.by, kind: d.kind }); M.L.serve = !!d.sv; M.plan = d.pl ? { pid: d.pl[0], p: M.players.find(p => p.id === d.pl[0]), kind: d.pl[1], tStar: d.pl[2], P: [d.pl[3], d.pl[4]], side: (M.players.find(p => p.id === d.pl[0]) || {}).side, done: false } : null; if (d.kind !== 'toss') G.sfx(d.kind === 'spike' ? 'spike' : d.kind === 'set' ? 'set' : 'bump'); else G.sfx('serveToss'); }
    else if (d.t === 'e') { if (d.ev === 'pt') { M.rules.score = d.sc.slice(); M.bannerSay(d.kind === 'ace' ? 'ace' : d.kind === 'kill' ? 'kill' : d.kind === 'block' ? 'block' : d.why); G.sfx('whistle'); M.plan = null; if (M.L) M.L.frozen = true; M.talk.say(G.pickLine('sonny', d.kind === 'ace' ? 'ace' : d.kind === 'kill' ? 'kill' : d.why === 'out' ? 'out' : 'in', { name: '' }), 'sonny'); } else if (d.ev === 'ph' && d.ph !== M.phase) { M.phase = d.ph; M.phaseT = 0; M.serverId = d.sv; if (d.ph === 'serveSetup') { M.tossAsked = false; M.serveSent = false; M.L = null; M.plan = null; } } }
  }
};
/* the Match's host-side step for a remote player: follow her reports, no faster than she can run, on her side */
G.Match.prototype.netPlayerStep = function (p, dt) {
  const t = p.netTarget; if (!t) return;
  if (this.phase === 'serveSetup' && this.server === p) { p.y = clamp(t[1], G.C.Y0 + 4, G.C.Y1 - 4); return; }
  const dx = t[0] - p.x, dy = t[1] - p.y, d = Math.hypot(dx, dy), max = G.VB.speed(p) * 1.4 * dt;
  if (d > max) { p.x += dx / d * max; p.y += dy / d * max; } else { p.x = t[0]; p.y = t[1]; }
  p.vx = dx / Math.max(dt, 1e-3) * .1; p.vy = dy / Math.max(dt, 1e-3) * .1;
  if (p.netAct === 'dive' && p.act !== 'dive') this.act(p, 'dive');
};
G.Match.prototype.clientUpdate = function (dt) { G.Net.clientUpdate(this, dt); };

/* ---- the hub scene: connect, the card, the match, the end ---- */
G.scenes.hub = {
  view: 'court', input: G.PRESETS.HUB, camera: false,
  enter() {
    const H = window.AIHub, N = G.Net; this.state = 'connecting'; this.t = 0; G.applyLight('sunset'); G.useInput('HUB');
    if (!H || !H.active) { G.game.go('title'); return; }
    H.on('card', c => { N.card = c; });
    H.on('start', () => { N.started = true; this.beginMatch(); });
    H.on('message', (d, from) => { if (d && typeof d === 'object') N.inbox.push({ d, from }); });
    H.on('leave', ({ id }) => { N.leftIds.add(id); if (G.M) for (const p of G.M.players) if (p.ctl.kind === 'net' && p.ctl.pid === id) { p.ctl = { kind: 'ai' }; p.tag = 'CPU'; } });
    H.on('time-up', () => { if (G.M && H.isHost) N.finish(G.M); });
    H.on('end', e => { N.ended = e || { reason: 'finished' }; G.endedQuiet = true; G.game.audio.music(null); G.game.audio.mute(true); this.state = 'end'; });
    H.connect({ mode: 'shared-world', seats: [1, 4], card: true }).then(info => {
      if (!info) { G.hub = false; G.game.go('title'); return; }
      N.info = info; this.lineup = N.lineup(info); this.rigs = this.lineup.seats.map(s => G.makeRig(s.cast));
      this.state = 'card'; G.music('sunrise');
      H.ready();
    });
  },
  beginMatch() {
    if (this.state === 'match' || !G.Net.info) return;
    const cfg = G.Net.matchCfg(G.Net.info, this.lineup);
    const M = G.M = new G.Match(cfg); M.mapRef = G.courtMap; M.hubClock = () => window.AIHub.time() / 1000;
    if (cfg.role === 'client') { M.phase = 'intro'; M.serverId = -1; }
    this.state = 'match'; G.inMatchScene = true; G.useInput('MATCH'); G.applyLight(M.tod); G.music('spike', { restart: true }); G.ambience('court'); G.game.cam.snap = true;
  },
  update(dt) {
    this.t += dt; const I = G.game.input, H = window.AIHub, N = G.Net;
    if (this.state === 'card') {
      for (const r of this.rigs) G.Anim.idle(r, dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2, pose: 'hips' });
      const c = I.clicked(), R = this.btn || {};
      const hit = k => c && R[k] && c[0] >= R[k].x && c[0] < R[k].x + R[k].w && c[1] >= R[k].y && c[1] < R[k].y + R[k].h;
      if (!N.info.server && (I.pressed('ready') || hit('ready'))) { H.answer('ready'); G.sfx('ui_select'); }
      if (!N.info.server && (I.pressed('more') || hit('more'))) { H.answer('more'); G.sfx('ui_tick'); }
      return;
    }
    if (this.state === 'match' && G.M) {
      const M = G.M;
      if (M.role === 'host' && M.phase === 'intro' && M.now >= 0) { M.setPhase('coin'); M.bannerSay('SERVE'); }
      if (!N.ended) M.update(dt);
      M.camera(G.game);
      G.tickAmbience(dt);
    }
  },
  draw(r) {
    const N = G.Net;
    if (this.state === 'match' && G.M) {
      if (N.info && N.info.server) { r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, '#0a2d3d'); E.font.text(g, 'Hosting the match', r.W / 2, r.H / 2 - 8, '#ffd36a', { align: 'center', outline: false }); E.font.text(g, G.M.rules.score.join(' - '), r.W / 2, r.H / 2 + 6, '#fff8e8', { align: 'center', scale: 2, outline: false }); }); return; }
      G.M.draw(r);
      r.overlay(g => {
        const tm = window.AIHub.time();
        if (tm < 0 && tm > -4000) E.font.title(g, String(Math.ceil(-tm / 1000)), r.W / 2, Math.round(r.H * .35), { scale: 4, align: 'center' });
        if (this.state === 'end' || N.ended) this.drawEnd(g, r);
      });
      return;
    }
    G.titleWorld.draw(r);
    r.overlay(g => { if (this.state === 'card') this.drawCard(g, r); else if (this.state === 'end') this.drawEnd(g, r); else E.font.text(g, 'Connecting to the AI Hub...', r.W / 2, r.H / 2, '#fff8e8', { align: 'center', shadow: '#000', outline: false }); });
  },
  drawCard(g, r) {
    const N = G.Net, info = N.info, c = N.card || {}, W = r.W, H = r.H;
    px.blend(g, .35, 'multiply', () => px.rect(g, 0, 0, W, H, '#203040'));
    G.drawLogo(g, r, Math.round(H * .04), { scale: 3 });
    E.font.text(g, 'Win the beach volleyball match: first to 7, by 2', W / 2, Math.round(H * .27), '#ffd36a', { align: 'center', shadow: '#000', outline: false });
    this.lineup.seats.forEach((s, i) => {
      const x = Math.round(W * (.17 + i * .22)), y = Math.round(H * .6), pl = s.player;
      px.ell(g, x, y + 2, 18, 5, '#0a2d3d'); px.ell(g, x, y, 16, 4, pl ? (pl.color || SEAT_COLORS[i]) : '#5a6a7a');
      this.rigs[i].draw(g, x, y, E.VIEWS.court);
      const name = pl ? pl.name : 'CPU', col = pl ? (pl.color || SEAT_COLORS[i]) : '#9aa4b8', ready = pl && (c.ready || []).includes(pl.id);
      E.font.text(g, G.fit(name, 80), x, y + 8, col, { align: 'center', shadow: '#000', outline: false });
      E.font.text(g, G.castName(s.cast) + (s.side ? ' · RIGHT' : ' · LEFT'), x, y + 18, '#c8d0e8', { align: 'center', outline: false });
      if (ready) G.icon(g, 'check', x - 3, y + 28); else if (!pl) G.icon(g, 'cpu', x - 3, y + 28);
    });
    const I = G.game.input, me = info.server ? null : info.me;
    if (me !== null) {
      let x = Math.round(W * .08); const y = Math.round(H * .82);
      for (const [a, t] of [['move', 'Move'], ['play', 'Hit on time'], ['shot', 'Shot / block'], ['dive', 'Dive'], ['call', 'Call']]) x += G.prompt(g, x, y, a, t, { input: I });
    }
    const left = c.left === null || c.left === undefined ? null : Math.ceil(c.left / 1000);
    E.font.text(g, c.paused ? 'Paused: more time' : c.starting ? 'Starting...' : left !== null ? 'Starts in ' + left + ' s' : '', W / 2, Math.round(H * .32), '#fff8e8', { align: 'center', shadow: '#000', outline: false });
    if (me !== null) {
      const bw = 86, y = Math.round(H * .9) - 12; this.btn = { ready: { x: Math.round(W / 2 - bw - 6), y, w: bw, h: 16 }, more: { x: Math.round(W / 2 + 6), y, w: bw, h: 16 } };
      G.ui.button(g, Object.assign({ label: (c.ready || []).includes(me) ? 'READY ✓' : 'READY', primary: true }, this.btn.ready), true);
      G.ui.button(g, Object.assign({ label: c.asked ? 'MORE TIME ✓' : 'MORE TIME' }, this.btn.more), false);
      G.glyph(g, this.btn.ready.x - 12, y + 3, 'ready', I); G.glyph(g, this.btn.more.x + bw + 3, y + 3, 'more', I);
    }
  },
  drawEnd(g, r) {
    const N = G.Net, e = N.ended || {}, W = r.W, H = r.H, info = N.info || { players: [] };
    px.blend(g, .6, 'multiply', () => px.rect(g, 0, 0, W, H, '#102030'));
    if (e.reason === 'host-left') { E.font.title(g, 'ROUND CANCELLED', W / 2, Math.round(H * .4), { scale: 2, align: 'center' }); E.font.text(g, 'The host left the round.', W / 2, Math.round(H * .4) + 24, '#fff8e8', { align: 'center', outline: false }); return; }
    E.font.title(g, 'FINAL', W / 2, Math.round(H * .2), { scale: 3, align: 'center' });
    if (G.M) E.font.text(g, G.M.teamNames[0] + '  ' + G.M.rules.score.join(' - ') + '  ' + G.M.teamNames[1], W / 2, Math.round(H * .2) + 30, '#fff8e8', { align: 'center', shadow: '#000', outline: false });
    (e.standings || []).forEach((grp, i) => grp.forEach((id, k) => { const pl = info.players.find(p => p.id === id); E.font.text(g, (i + 1) + '. ' + (pl ? pl.name : 'Player ' + id), W / 2, Math.round(H * .42) + i * 14 + k * 10, pl ? pl.color || '#fff8e8' : '#fff8e8', { align: 'center', outline: false }); }));
  }
};
