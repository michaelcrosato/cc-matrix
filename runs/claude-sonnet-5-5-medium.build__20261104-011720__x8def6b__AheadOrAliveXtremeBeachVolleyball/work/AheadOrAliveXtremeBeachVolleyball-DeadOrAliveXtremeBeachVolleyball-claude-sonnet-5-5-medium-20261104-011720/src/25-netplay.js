/* 25-netplay: AI Hub shared-world sessions. The host's copy runs the match; other copies send what their player does and
 * draw the snapshots the host sends. The game's own card shows before the round. No chat, no custom names. */
G.net = { active: false, info: null, isHost: false, seat: -1, started: false, ended: false };

// seat -> player index in the match: seats 0..3 fill (team0,slot0) (team1,slot0) (team0,slot1) (team1,slot1)
G.seatPlayer = seat => [0, 2, 1, 3][seat];
G.netSeatsOfInfo = info => (info.players || []).map((p, i) => ({ id: p.id, seat: i, color: p.color, name: p.name }));

// the AI Hub scene: connect, card, then the match
G.scenes.hub = G.wrapScene({
  view: 'court', input: G.INPUT_MATCH, res: 'ps1', expand: true, name: 'hub', pausable: false,
  enter() {
    this.t = 0; this.state = 'connecting'; this.card = { left: null, ready: [], asked: false, starting: false }; this.info = null; this.err = null; this.rigs = ['mika', 'ruby', 'hana', 'tomo'].map(id => G.rig(id, null, null, 1.2));
    G.hubCardActive = true; G.music('title'); G.game.focus(0, 0, 14); G.game.lights.enabled = false;
    const H = G.hub;
    H.connect({ mode: 'shared-world', seats: [1, 4], card: true }).then(info => {
      if (!info) { G.hubCardActive = false; G.net.active = false; G.game.go('menu'); return; }
      this.info = info; G.net.active = true; G.net.info = info; G.net.isHost = !!info.isHost; G.net.seat = info.players.findIndex(p => p.id === info.me); this.state = 'card';
      H.on('card', c => { Object.assign(this.card, c); });
      H.on('start', () => { this.state = 'starting'; this.startAt = true; });
      H.on('message', (d, from) => G.net.onMessage && G.net.onMessage(d, from));
      H.on('leave', e => { G.net.left = (G.net.left || []).concat([e.id]); if (G.net.onLeave) G.net.onLeave(e); });
      H.on('time-up', () => { if (G.net.onTimeUp) G.net.onTimeUp(); });
      H.on('end', () => { G.net.ended = true; G.hubCardActive = false; });
      H.ready();
    }).catch(e => { this.err = String(e); });
  },
  update(dt) {
    this.t += dt; const H = G.hub, I = G.game.input;
    this.rigs.forEach((rg, i) => rg.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 + Math.sin(this.t + i) * .4 }));
    if (this.state === 'card' && this.info) { if (I.pressed('confirm') || I.clicked()) { H.answer('ready'); G.sfx('confirm'); } if (I.pressed('dive') || I.pressed('tab')) { H.answer('more'); } }
    if (this.state === 'starting' && H.time() >= -1500 && !this.began) { this.began = true; this.begin(); }
    if (this.state === 'starting' && this.began) { }
  },
  begin() {
    const info = this.info, nPl = info.players.length, seat = G.net.seat;
    const teams = [['mika', 'you'], ['ruby', 'tomo']], ctl = [{ type: 'ai' }, { type: 'ai' }, { type: 'ai' }, { type: 'ai' }];
    // humans: each seat controls one player
    info.players.forEach((p, i) => { const idx = G.seatPlayer(i); ctl[idx] = i === seat ? Object.assign(G.localCtl(G.game.input), { pnum: i }) : { type: 'remote', seat: i, pnum: i, read(pl) { Object.assign(pl.in, G.net.remoteIn[i] || {}); } }; });
    const names = [['mika', 'jo'], ['ruby', 'tomo']]; void names;
    const cfg = { teams, to: 7, seed: info.seed || 1, skipIntro: false, skillBonus: [0, 0], fastPoints: true };
    G.net.remoteIn = {}; G.net.ctl = ctl; G.net.cfg = cfg; G.net.humanTeam = seat >= 0 ? (G.seatPlayer(seat) < 2 ? 0 : 1) : 0;
    G.game.go('match', { cfg, ctl, humanTeam: G.net.humanTeam, rematch: false, noQuit: true, net: G.netDriver(), music: 'match', hub: true });
  },
  draw(r) {
    const W = r.W, H = r.H; G.beach(r, this.t, { horizon: .46 });
    this.rigs.forEach((rg, i) => { const x = (i - 1.5) * 42; r.shadow(x, 10, 7, .3); r.actor(x, 10, 0, (g, ox, oy) => rg.draw(g, ox, oy, r.view)); });
    r.overlay(g => {
      G.logo(g, W, 8, 2);
      const info = this.info; const w = 260, x = Math.round(W / 2 - w / 2), y = 54; G.panel(g, x, y, w, 100);
      if (this.err) { G.text(g, 'Could not connect: ' + this.err, W / 2, y + 40, '#ffb0a0', { align: 'center' }); return; }
      if (!info) { G.text(g, 'Connecting to the hub...', W / 2, y + 40, '#fff', { align: 'center' }); return; }
      G.text(g, 'BEACH MATCH: ' + info.players.length + ' PLAYER' + (info.players.length > 1 ? 'S' : ''), x + 8, y + 6, '#ffd24a');
      info.players.forEach((p, i) => { px.disc(g, x + 14 + i * 60, y + 24, 5, p.color); G.text(g, (p.id === info.me ? 'YOU' : 'P' + (i + 1)), x + 22 + i * 60, y + 21, this.card.ready && this.card.ready.includes(p.id) ? '#9bffb0' : '#bfe9ee'); });
      G.text(g, 'Goal: win the match, first to 7 (win by 2).', x + 8, y + 40, '#fff'); G.text(g, 'Move ' + (G.isPad() ? 'L-stick' : 'WASD') + '   Play ' + G.label('play') + '   Dive ' + G.label('dive') + '   Call ' + G.label('call'), x + 8, y + 52, '#fff6c8');
      G.text(g, 'Empty seats are filled by CPUs.', x + 8, y + 64, '#bfe9ee');
      const left = this.card.left; G.text(g, this.state === 'starting' ? 'Get ready!' : (left !== null && left !== undefined ? 'Starting in ' + Math.max(0, Math.ceil(left / 1000)) + 's' : 'Waiting for players'), x + 8, y + 80, '#ffd24a');
      G.text(g, G.label('confirm') + ' Ready   ' + G.label('dive') + ' More time', x + w - 8, y + 80, '#fff', { align: 'right' });
    });
  }
});

/* ---- the driver: attached to the match scene ---- */
G.netDriver = () => {
  const H = G.hub; let sendT = 0, seq = 0, scene = null, lastSnap = null, finished = false;
  const driver = {
    start(sc) {
      scene = sc; G.net.remoteIn = G.net.remoteIn || {}; const m = sc.m;
      if (G.net.isHost) {
        if (H.rng) { /* match uses its own seeded stream from info.seed */ }
        G.net.onMessage = (d, from) => { if (d && d.k === 'in') { const i = (G.hub.players || []).findIndex(p => p.id === from); if (i >= 0) G.net.remoteIn[i] = { mx: +d.mx || 0, my: +d.my || 0, play: !!d.play, dive: !!d.dive, call: !!d.call, ax: +d.ax || 0, ay: +d.ay || 0 }; } };
        G.net.onLeave = e => { };
        G.net.onTimeUp = () => this.finish();
        m.cfg.net = 'host';
      } else {
        m.cfg.net = 'client'; m.netClient = true;
        G.net.onMessage = (d, from) => { if (d && d.k === 'snap') lastSnap = d; if (d && d.k === 'ev') { sc.m.events.push(d); } };
      }
    },
    stop() { G.net.onMessage = null; G.net.onTimeUp = null; },
    // called every update by the scene (after step for the host)
    tick(dt) {
      const m = scene.m; sendT += dt; if (G.net.ended) return;
      if (G.net.isHost) {
        if (sendT > 1 / 15) { sendT = 0; H.send(driver.pack(m), { reliable: false }); }
        if (m.phase === 'end' && !finished) { finished = true; this.finish(); }
      } else {
        if (sendT > 1 / 15) { sendT = 0; const p = m.players[G.seatPlayer(G.net.seat)]; if (p) H.send({ k: 'in', mx: +p.in.mx.toFixed(2), my: +p.in.my.toFixed(2), play: p.in.play, dive: p.in.dive, call: p.in.call, ax: +p.in.ax.toFixed(2), ay: +p.in.ay.toFixed(2), s: seq++ }, { reliable: false, to: H.info ? H.host : undefined }); }
        if (lastSnap) { driver.apply(m, lastSnap); lastSnap = null; }
      }
    },
    pack(m) { const b = m.ball; return { k: 'snap', t: +m.t.toFixed(2), sc: m.score, ph: m.phase, sv: m.serving, srv: m.server, msg: m.msgT > 0 ? m.msg : '', b: [+b.x.toFixed(1), +b.y.toFixed(1), +b.z.toFixed(1), b.state === 'held' ? 1 : b.state === 'dead' ? 2 : 0], tc: b.touches, lt: b.lastTeam, w: m.winner, p: m.players.map(p => [+p.x.toFixed(1), +p.y.toFixed(1), +p.z.toFixed(1), +p.vx.toFixed(0), +p.vy.toFixed(0), p.swing ? +(p.swing.t / p.swing.dur).toFixed(2) : -1, p.diveT > 0 ? 1 : p.downT > 0 ? 2 : 0, p.celeb ? 1 : 0]), ev: m.events.splice(0).slice(-4).map(e => [e.ev, e.kind || '', e.q || 0]) }; },
    apply(m, s) {
      const b = m.ball; b.x = s.b[0]; b.y = s.b[1]; b.z = s.b[2]; b.state = s.b[3] === 1 ? 'held' : s.b[3] === 2 ? 'dead' : 'flight'; b.touches = s.tc; b.lastTeam = s.lt; b.vx = b.vy = b.vz = 0;
      m.score = s.sc.slice(); m.phase = s.ph; m.serving = s.sv; m.server = s.srv; m.winner = s.w; m.t = s.t; if (s.msg) { m.msg = s.msg; m.msgT = .5; }
      s.p.forEach((q, i) => { const p = m.players[i]; p.x = q[0]; p.y = q[1]; p.z = q[2]; p.vx = q[3]; p.vy = q[4]; p.swing = q[5] >= 0 ? { t: q[5] * .3, dur: .3, hit: true } : null; p.diveT = q[6] === 1 ? .2 : 0; p.downT = q[6] === 2 ? .2 : 0; p.celeb = q[7]; });
      for (const e of s.ev || []) { if (e[0] === 'touch') G.sfx(e[1] === 'spike' ? 'spike' : e[1] === 'serve' ? 'serve' : 'bump', { vol: .5 }); else if (e[0] === 'point') G.sfx('whistle'); }
    },
    finish() {
      if (G.net.ended || !G.net.isHost || driver.sent) return; driver.sent = true; const m = scene.m; const win = m.score[0] === m.score[1] ? null : m.score[0] > m.score[1] ? 0 : 1, ids = (H.players || []).map(p => p.id);
      const teamOf = i => (G.seatPlayer(i) < 2 ? 0 : 1); const winners = ids.filter((id, i) => win === null || teamOf(i) === win), losers = ids.filter((id, i) => !(win === null || teamOf(i) === win));
      const standings = win === null ? [ids] : [winners, losers].filter(a => a.length); const scores = {}; ids.forEach((id, i) => { scores[id] = m.score[teamOf(i)]; });
      try { H.finish({ standings, scores, won: undefined, stats: Object.fromEntries(ids.map((id, i) => [id, { Spikes: m.stats[teamOf(i)].spikes, Aces: m.stats[teamOf(i)].aces, Blocks: m.stats[teamOf(i)].blocks }])) }); } catch (e) { G.game.fail('hub.finish', e); }
    }
  };
  return driver;
};
G.hubReady = null;
