/* 25-netplay: AI Hub sessions (Protocol v1, shared world). The page opens straight into the hub scene: connect, draw the
 * game's own card (the court at sunset, the fighters lined up, the goal, this player's controls in her glyphs, every
 * player in her colour with a READY tick, the countdown), call ready() at once, and on start play one match to 7.
 * The host runs the rules and the AI; every copy flies the ball from the same launches on the hub clock; each client
 * moves its own fighter and judges its own touches, which the host validates (time within the window, the fighter in
 * reach, the touch still open) before it broadcasts the new launch. Empty seats and leavers are CPUs. Only the host
 * finishes. Messages: m (client fighter, 12/s), c (a touch or block claim), vt / v (a serve's toss and hit), s (the host's
 * snapshot, 12/s), b (a launch), e (events). */
G.SEAT_COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
G.Net = class {
  constructor(info) {
    const H = window.AIHub; this.H = H; this.info = info; this.me = info.me; this.host = !!info.isHost; this.server = !!info.server; this.client = !this.host;
    this.players = info.players || []; this.sendT = 0; this.snapT = 0; this.over = false; this.ended = false; this.reason = null; this.msgs = 0; this.limit = info.limitMs || 0;
    this.peers = {}; this.left = new Set();
  }
  clock() { const t = this.H.time(); return isFinite(t) ? t / 1000 : -10; }
  timeLeft() { if (!this.limit) return null; const t = this.H.time(); return isFinite(t) ? Math.max(0, (this.limit - t) / 1000) : null; }
  send(d, o) { if (this.ended) return; try { this.H.send(d, o); } catch (e) { /* closed */ } }
  /* ---- the host ---- */
  launch(L) { if (!this.host) return; const M = this.M, pl = M.players.find(p => p.plan); this.send({ t: 'b', t0: +L.t0.toFixed(4), p: L.p.map(v => +v.toFixed(2)), v: L.v.map(v => +v.toFixed(2)), k: L.k, g: L.g, ay: L.ay, wob: L.wob, by: L.by, kind: L.kind, side: L.side, nd: L.netDone ? 1 : 0,
    pi: pl ? pl.idx : -1, pt: pl ? +pl.plan.t.toFixed(4) : 0, pk: pl ? pl.plan.kind : 0, px: pl ? pl.plan.P.map(v => Math.round(v)) : null, ap: M.attackPlan ? M.attackPlan.side : -1 }, { reliable: true }); }
  event(e) { if (this.host) this.send(Object.assign({ t: 'e' }, e), { reliable: true }); }
  hostStep(dt) {
    const M = this.M; this.snapT += dt;
    if (this.snapT >= 1 / 12) { this.snapT = 0; this.send({ t: 's', at: Math.round(M.clock * 1000), p: M.players.map(p => [p.idx, Math.round(p.x), Math.round(p.y), +p.facing.toFixed(2), p.act ? p.act.kind : 0, p.act ? +((M.clock - p.act.t0) / p.act.dur).toFixed(2) : 0, Math.round(p.z)]), sc: M.score, st: M.sets, ph: M.phase, sv: M.serveSide, srv: M.server ? M.server.idx : -1 }, { reliable: false }); }
  }
  /* ---- a client ---- */
  clientStep(dt) {
    const M = this.M, t = M.clock, me = M.players.find(p => p.seat === this.me);
    this.sendT += dt;
    if (me && this.sendT >= 1 / 12) { this.sendT = 0; this.send({ t: 'm', at: Math.round(t * 1000), x: Math.round(me.x), y: Math.round(me.y), f: +me.facing.toFixed(2), a: me.act ? me.act.kind : 0 }, { reliable: false }); }
    if (!me || this.ended) return;
    const I = me.input;
    if (M.phase === 'serveSetup' && M.server === me && !this.tossSent) { if (I.pressed('play')) { this.send({ t: 'vt', jump: 0 }); this.tossSent = true; } else if (I.pressed('shot')) { this.send({ t: 'vt', jump: 1 }); this.tossSent = true; } }
    if (M.phase === 'toss' && M.server === me && M.L && !this.hitSent && (I.pressed('play') || I.pressed('shot'))) { const apex = M.L.t0 + G.Ball.apexTau(M.L), q = G.judge(t - apex); this.hitSent = true; M.popup(me, q); this.send({ t: 'v', at: +t.toFixed(4), q: q === 'MISS' ? 'STRETCH' : q, aim: me.aimPoint('serve').map(Math.round) }); }
    if (M.phase === 'rally') {
      if (I.pressed('call')) me.cycleCall();
      if (I.pressed('dive')) me.startDive();
      const sh = I.pressed('shot'), pl2 = I.pressed('play'), pl = me.plan;
      if (sh && M.attackPlan && M.attackPlan.side !== me.side && Math.abs(me.x - G.COURT.NET_X) < 22 && !me.jump) { me.startJump(t, 'block', G.T.blockRise, .18, .3); me.setAct('block', .7); this.send({ t: 'c', block: 1, at: +t.toFixed(4) }); }
      else if (pl && (sh || pl2) && !me.pressed && t - pl.t >= -.6) {
        const w = G.windows(), err = t - pl.t; me.pressed = true;
        if (err <= w.ok) { let q = G.judge(err, w); if (q === 'MISS') M.whiff(me); else { const b = G.Ball.at(M.L, t), d = Math.hypot(b[0] - me.x, b[1] - me.y); if (d > me.reach + 8) M.whiff(me); else { if (d > me.reach) q = G.lower(q); M.popup(me, q); me.setAct(['bump', 'set', 'spike'][pl.kind] || 'bump', .5); this.send({ t: 'c', at: +t.toFixed(4), k: pl.kind, q, aim: me.aimPoint('spike').map(Math.round), sh: sh ? 1 : 0 }, { reliable: true }); } } }
      }
      if (pl && t > pl.t + .5) me.plan = null;
    }
  }
  onMessage(d, from) {
    const M = this.M; if (!M || this.ended) return;
    if (this.host) {
      const p = M.players.find(q => q.seat === from); if (!p || !p.remote) return;
      if (d.t === 'm') { const sp = p.speed * 1.4, dt = Math.max(.05, (d.at / 1000) - (p.lastAt || d.at / 1000 - .1)); const dx = d.x - p.x, dy = d.y - p.y, l = Math.hypot(dx, dy), k = l > sp * dt * 3 ? sp * dt * 3 / l : 1; p.netX = clamp(p.x + dx * k, 40, G.COURT.W - 40); p.netY = clamp(p.y + dy * k, 70, G.COURT.H - 30); p.netF = d.f; p.lastAt = d.at / 1000; }
      else if (d.t === 'c') p.claim = d;
      else if (d.t === 'vt' && M.phase === 'serveSetup' && M.server === p) M.toss(d.jump ? 'jump' : 'float');
      else if (d.t === 'v' && M.phase === 'toss' && M.server === p && !M.tossHit) { M.tossHit = true; M.serveHit(d.q || 'OK', d.aim); }
      return;
    }
    if (from !== this.info.host) return;
    if (d.t === 'b') {
      const L = G.Ball.make(d.t0, d.p, d.v, { k: d.k, g: d.g, ay: d.ay, wob: d.wob, by: d.by, kind: d.kind, side: d.side }); if (d.nd) { L.netDone = true; L.tNet = null; }
      M.L = L; for (const p of M.players) { if (p.seat !== this.me) p.plan = null; }
      const me = M.players.find(p => p.seat === this.me); if (me) { me.plan = null; me.pressed = false; }
      if (d.pi >= 0) { const p = M.players[d.pi]; if (p && p.seat === this.me) { p.plan = { t: d.pt, P: d.px || [L.land[0], L.land[1]], kind: d.pk, h: 18 }; p.pressed = false; if (d.pk === 2) p.startJump(d.pt - p.rise, 'spike'); } }
      M.attackPlan = d.ap >= 0 ? { side: d.ap, p: M.players[d.pi] || M.players[0], t: d.pt } : null;
      if (d.kind === 'toss') { M.phase = 'toss'; this.hitSent = false; } else if (M.phase === 'toss' || M.phase === 'serveSetup') M.phase = 'rally';
      if (d.kind === 'spike') G.sfx('spike'); else if (d.kind === 'set') G.sfx('set'); else if (d.kind === 'pass' || d.kind === 'free') G.sfx('bump'); else if (d.kind === 'serve') G.sfx('serveHit');
    } else if (d.t === 's') {
      for (const [i, x, y, f, a, u, z] of d.p) { const p = M.players[i]; if (!p || p.seat === this.me) continue; p.netX = x; p.netY = y; p.netF = f; p.netZ = z; if (a && (!p.act || p.act.kind !== a)) p.act = { kind: a, t0: M.clock - u * .5, dur: .5 }; }
      M.score = d.sc; M.sets = d.st || M.sets; if (d.ph && d.ph !== 'toss' && d.ph !== 'rally') M.phase = d.ph; M.serveSide = d.sv; if (d.srv >= 0) M.server = M.players[d.srv];
    } else if (d.t === 'e') {
      if (d.ev === 'serve') { M.phase = 'serveSetup'; M.L = null; M.server = M.players[d.server]; this.tossSent = false; this.hitSent = false; for (const p of M.players) p.plan = null; }
      else if (d.ev === 'point') { M.score = d.sc; M.sets = d.sets || M.sets; M.phase = 'dead'; M.phT = 0; M.setBanner(G.Rules.CALLS[d.why] || 'POINT', 1.6, d.why); G.sfx('whistle'); G.sfx('crowdCheer'); M.lastWinner = d.side; M.cheer = 1.2; M.L = null; }
      else if (d.ev === 'over') { M.over = true; M.winner = d.side; M.phase = 'end'; }
    }
  }
  /** host: the round is over (the match ended, or time-up): standings by team, CPUs left out */
  finish(why) {
    if (!this.host || this.over) return; this.over = true;
    const M = this.M, ids = s => M.players.filter(p => p.side === s && p.seatHuman && !this.left.has(p.seat)).map(p => p.seat);
    let w = M.winner; if (w === undefined || w === null || !M.over) w = M.score[0] > M.score[1] ? 0 : M.score[1] > M.score[0] ? 1 : -1;
    const humans = M.players.filter(p => p.seatHuman && !this.left.has(p.seat));
    const scores = {}, stats = {}; for (const p of humans) { scores[p.seat] = M.score[p.side] + M.sets[p.side] * 100; stats[p.seat] = { Points: p.stats.points, Kills: p.stats.kills, Aces: p.stats.aces }; }
    const mvp = humans.slice().sort((a, b) => (b.stats.points * 2 + b.stats.kills) - (a.stats.points * 2 + a.stats.kills))[0];
    const res = { scores, stats, awards: mvp ? [{ id: mvp.seat, title: 'MVP', detail: mvp.stats.points + ' points, ' + mvp.stats.kills + ' kills' }] : [] };
    if (humans.length === 1) { res.standings = [[humans[0].seat]]; res.won = w === humans[0].side; }
    else if (w < 0) res.standings = [humans.map(p => p.seat)];
    else res.standings = [ids(w), ids(1 - w)].filter(a => a.length);
    this.event({ ev: 'over', side: w });
    try { this.H.finish(res); } catch (e) { G.game.fail('hub finish', e); }
  }
};
/* ---- the hub scene: connect, the card, the match, the end ---- */
G.SCENES.hub = {
  view: 'court', input: G.INPUT.MATCH,
  enter() {
    this.state = 'connecting'; this.t = 0; this.card = null; this.cast = null; G.muteAll = false; G.UI.theme = 'day';
    const H = window.AIHub; if (!H) { G.go('title'); return; }
    H.on('card', c => { this.card = c; });
    H.on('start', () => { this.startMatch(); });
    H.on('message', (d, from) => { if (this.net) this.net.onMessage(d, from); });
    H.on('leave', ({ id }) => { if (!this.net) return; this.net.left.add(id); const M = this.net.M; if (M) for (const p of M.players) if (p.seat === id) { p.remote = false; p.human = false; p.viewOnly = false; p.seatHuman = false; } });
    H.on('time-up', () => { if (this.net) { if (this.net.host) this.net.finish('time-up'); } });
    H.on('end', e => { this.endInfo = e; if (this.net) this.net.ended = true; this.state = 'ended'; G.music(null); G.game.audio.stopMusic(); G.muteAll = true; try { const A = G.game.audio; if (A.ctx) A.mute(true); } catch (er) { /* none */ } });
    H.connect({ mode: 'shared-world', seats: [1, 4], card: true }).then(info => {
      if (!info) { G.go('title'); return; }
      this.info = info; this.net = new G.Net(info); this.build(); this.state = 'card'; H.ready();
    }).catch(e => { G.game.fail('hub connect', e); G.go('title'); });
  },
  build() {
    const H = window.AIHub, info = this.info, n = (info.players || []).length, rc = H.rng('cast'), rt = H.rng('court');
    const cast = G.FIGHTERS.slice(); for (let i = cast.length - 1; i > 0; i--) { const j = Math.floor(rc() * (i + 1)); [cast[i], cast[j]] = [cast[j], cast[i]]; }
    this.tod = ['afternoon', 'sunset', 'morning'][Math.floor(rt() * 3)];
    // left = seats 0 and 2, right = 1 and 3
    const seatOf = [[0, 2], [1, 3]], teams = [[], []];
    for (let s = 0; s < 2; s++) for (let k = 0; k < 2; k++) {
      const seat = seatOf[s][k], pl = (info.players || []).find(p => p.id === seat), id = cast[seat], local = pl && seat === info.me && !info.server;
      teams[s].push({ id, suit: G.CAST[id].suit, acc: G.CAST[id].acc, input: local ? G.game.input : null, human: !!pl, base: .5, seat: pl ? seat : null, color: pl ? G.SEAT_COLORS[seat] : null, name: pl ? String(pl.name).slice(0, 12) : G.CAST[id].short + ' (CPU)' });
    }
    this.cfg = { mode: 'hub', teams, pointsToWin: 7, tod: this.tod, weather: 'sunny', difficulty: 'Normal', replays: false, title: 'AHEAD OR ALIVE', subtitle: 'First to 7, win by 2', skipIntro: true, after: () => { if (this.net.host) this.net.finish('over'); } };
    this.lineup = teams.flat().map((t, k) => ({ id: t.id, x: 300 + k * 34, y: 300, rig: G.anim.rig(G.makeRig(t.id)), t }));
  },
  startMatch() {
    if (!this.cfg || this.M) return;
    this.state = 'play'; const net = this.net, M = this.M = G.M = new G.Match(this.cfg); net.M = M; M.net = net;
    for (const p of M.players) { p.seatHuman = p.seat !== null && p.seat !== undefined && p.human; p.remote = net.host && p.seatHuman && (p.seat !== this.info.me || this.info.server); p.viewOnly = net.client && p.seat !== this.info.me; if (p.remote || p.viewOnly) { p.human = p.seatHuman; p.input = null; } }
    M.introT = 0; M.phase = 'intro'; G.music('spike'); G.applyLight(this.tod);
  },
  update(dt) {
    this.t += dt; const H = window.AIHub, I = G.game.input;
    if (this.state === 'card') {
      for (const c of this.lineup || []) { c.rig.vb = { kind: 'ready', u: 0, w: .8 }; c.rig.update(dt, { x: c.x, y: c.y, z: 0, facing: Math.PI / 2 }); }
      G.game.focus(352, 290, 30); G.game.setZoom(1.2);
      if (!this.info.server) {
        const c = I.clicked(), W = G.game.W, Hh = G.game.H, by = Math.round(Hh * .82);
        const onReady = c && c[1] > by && c[1] < by + 20 && c[0] < W / 2, onMore = c && c[1] > by && c[1] < by + 20 && c[0] >= W / 2;
        if (I.pressed('confirm') || I.pressed('start') || I.pressed('play') && false || onReady) H.answer('ready');
        if (I.pressed('call') || onMore || this.keyT) { this.keyT = false; H.answer('more'); }
      }
      return;
    }
    if (this.state === 'play' && this.M) {
      const M = this.M; G.game.setZoom(1);
      if (M.phase === 'intro' && this.net.clock() >= 0 && this.net.host) { M.phase = 'coin'; M.phT = 0; M.setBanner('PLAY!', 1); G.sfx('whistle'); }
      for (const p of M.players) if (p.remote || p.viewOnly) { if (p.netX !== undefined) { p.x += (p.netX - p.x) * Math.min(1, dt * 10); p.y += (p.netY - p.y) * Math.min(1, dt * 10); p.facing = p.netF; } }
      if (!this.net.ended) M.update(dt);
      if (this.net.host) this.net.hostStep(dt);
      if (M.phase === 'end' && !M.left && M.phT > 2.5) { M.left = true; if (M.cfg.after) M.cfg.after(M.result, M); }
    }
  },
  draw(r) {
    const W = r.W, H = r.H, I = G.game.input;
    if (this.state === 'connecting') { G.backdrop('sunset').draw(r); r.overlay(g => { G.drawLogo(g, W, Math.round(H * .2)); E.font.text(g, 'Connecting to the AI Hub...', W / 2, Math.round(H * .6), '#fff8e8', { align: 'center', outline: false }); }); return; }
    if (this.state === 'card') {
      G.backdrop(this.tod || 'sunset').draw(r); G.courtMap().drawFloor(r); G.drawCourtSet(r, null, false);
      for (const c of this.lineup) { r.shadow(c.x, c.y, 6, .3); r.actor(c.x, c.y, 0, (g, ox, oy) => c.rig.draw(g, ox, oy, r.view), { key: c.rig }); r.textAt(c.x, c.y, 50, c.t.human ? c.t.name : 'CPU', c.t.color || '#9fd3d6'); }
      r.overlay(g => {
        G.drawLogo(g, W, Math.round(H * .04), true);
        E.font.text(g, 'Win the beach volleyball match: first to 7, by 2', W / 2, Math.round(H * .26), '#ffd36a', { align: 'center', shadow: '#000', outline: false });
        if (this.info.server) { E.font.text(g, 'Hosting', W / 2, Math.round(H * .5), '#fff8e8', { align: 'center', scale: 2, outline: false }); return; }
        const list = [['play', 'Hit on time'], ['shot', 'Shot / block'], ['dive', 'Dive'], ['call', 'Call']]; let tw = 0; for (const [a, t] of list) tw += G.promptW(a, t, I); let x = Math.round(W / 2 - tw / 2); const y = Math.round(H * .32);
        px.blend(g, .6, 'normal', () => px.rect(g, x - 6, y - 3, tw + 8, 15, '#061a24')); for (const [a, t] of list) x += G.prompt(g, x, y, a, t, I);
        const pls = this.info.players || [], ready = (this.card && this.card.ready) || [];
        pls.forEach((p, k) => { const yy = Math.round(H * .42) + k * 12; px.rect(g, Math.round(W / 2) - 70, yy, 8, 8, G.SEAT_COLORS[p.id] || '#ffffff'); E.font.text(g, String(p.name).slice(0, 16), Math.round(W / 2) - 58, yy, G.SEAT_COLORS[p.id] || '#ffffff', { outline: false, shadow: '#000' }); if (ready.includes(p.id)) E.font.text(g, '✓ READY', Math.round(W / 2) + 40, yy, '#7cff5a', { outline: false }); });
        const c = this.card, left = c && c.left !== null && c.left !== undefined ? Math.ceil(c.left / 1000) : null;
        E.font.text(g, c && c.paused ? 'Paused: more time' : c && c.starting ? 'Starting...' : left !== null ? 'Starts in ' + left + ' s' : '', W / 2, Math.round(H * .74), '#fff8e8', { align: 'center', shadow: '#000', outline: false });
        const by = Math.round(H * .82); G.UI.button(g, { x: Math.round(W / 2) - 110, y: by, w: 100, h: 18, label: 'READY' }, true); G.UI.button(g, { x: Math.round(W / 2) + 10, y: by, w: 100, h: 18, label: c && c.asked ? 'MORE TIME ✓' : 'MORE TIME' }, false);
        G.drawGlyph(g, Math.round(W / 2) - 106, by + 4, G.codeFor('confirm', I), I); G.drawGlyph(g, Math.round(W / 2) + 14, by + 4, G.codeFor('call', I), I);
      });
      return;
    }
    if (this.M) {
      if (this.info && this.info.server) { G.backdrop('sunset').draw(r); r.overlay(g => { E.font.text(g, 'Hosting • ' + this.M.score.join(' - '), W / 2, H / 2, '#fff8e8', { align: 'center', scale: 2, outline: false }); }); }
      else this.M.draw(r);
      const tm = this.net.clock(); if (tm < 0 && tm > -4) r.overlay(g => E.font.title(g, String(Math.ceil(-tm)), W / 2, Math.round(H * .35), { scale: 4, align: 'center', colors: ['#fff7d6', '#ffd36a', '#ff9e5e'] }));
    }
    if (this.state === 'ended') {
      const e = this.endInfo || {}, M = this.M;
      r.overlay(g => { px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, W, H, '#061a24')); E.font.title(g, e.reason === 'host-left' ? 'ROUND CANCELLED' : 'FULL TIME', W / 2, Math.round(H * .25), { scale: 3, align: 'center', colors: ['#fff7d6', '#ffd36a', '#ff9e5e'] });
        if (M) E.font.text(g, 'LEFT ' + M.score[0] + ' - ' + M.score[1] + ' RIGHT', W / 2, Math.round(H * .4), '#fff8e8', { align: 'center', scale: 2, outline: false });
        const st = e.standings || []; st.forEach((grp, k) => E.font.text(g, (k + 1) + '. ' + grp.map(id => { const p = (this.info.players || []).find(q => q.id === id); return p ? String(p.name).slice(0, 12) : '?'; }).join(', '), W / 2, Math.round(H * .52) + k * 12, '#ffd36a', { align: 'center', outline: false })); });
    }
  }
};
