// 97-hub: AI Hub sessions in ghost mode: every copy runs the same seeded hunt on its own device, on one timeline keyed
// to the hub's clock (so every copy is in the same segment and sees the same camera), and shows the other hunters'
// reticles and shots as ghosts, like players at one cabinet. Our own card; progress once a second; one result; the end.
const HUB_TIMELINE = [   // the Hub Hunt-Off: 3:00 in all
  { kind: 'establish', at: 0, dur: 6 }, { kind: 'site', slot: 0, at: 6, dur: 54 }, { kind: 'walk', slot: 1, at: 60, dur: 5 }, { kind: 'site', slot: 1, at: 65, dur: 50 },
  { kind: 'walk', slot: 'bonus', at: 115, dur: 5 }, { kind: 'bonus', at: 120, dur: 30 }, { kind: 'trophy', at: 150, dur: 25 }, { kind: 'final', at: 175, dur: 5 }
];
const HUB_SITES = { hollow: ['hollow-1', 'hollow-2'], bugle: ['bugle-1', 'bugle-3'], muskeg: ['muskeg-1', 'muskeg-3'] };
const HUB_END = 180;
const HubLink = G.hubLink = {
  phase: 'off', info: null, card: null, ghosts: new Map(), progressAt: -9, sendAt: -9, resultSent: false, progressSent: 0, sent: 0, H: null, segI: -1, localT: 0, standings: null, endReason: null,
  snapshot() { return { active: HUB_ON, phase: this.phase, progressSent: this.progressSent, resultSent: this.resultSent, ghosts: [...this.ghosts.values()].map(g => ({ id: g.id, name: g.name, seg: g.s, score: g.p })), seg: this.segI, localT: Math.round(this.localT * 10) / 10, sent: this.sent, hunt: this.huntId }; },
  async connect() {
    this.phase = 'connecting';
    let info = null; try { info = await AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true }); } catch (e) { info = null; }
    if (!info) { this.phase = 'off'; game.go('title', {}, { fade: 0 }); return; }
    this.info = info; this.huntId = HUNT_ORDER[(((info.round || 1) - 1) % 3 + 3) % 3];
    const R = AIHub.rng('hunt'); RNG.seed(Math.floor(R() * 4294967295) || 1);
    this.build();
    for (const p of info.players) if (p.id !== info.me) this.ghosts.set(p.id, { id: p.id, name: String(p.name || 'P' + (p.id + 1)).slice(0, 12), color: p.color || SEAT_COLORS[p.id % 4], seat: info.players.indexOf(p), a: null, s: -1, p: 0, sc: false, puffs: [] });
    AIHub.on('card', c => { this.card = c; });
    AIHub.on('start', () => { this.phase = 'countdown'; });
    AIHub.on('message', (d, from) => this.message(d, from));
    AIHub.on('leave', ({ id }) => this.ghosts.delete(id));
    AIHub.on('time-up', () => this.sendResult());
    AIHub.on('end', ({ reason, standings }) => this.end(reason, standings));
    this.phase = 'card';
    AIHub.ready();
  },
  build() {
    const me = this.info.players.find(p => p.id === this.info.me), seat = me ? this.info.players.indexOf(me) : 0;
    const P1 = new Player(1, game.input, { name: me ? String(me.name).slice(0, 12) : 'YOU' }); P1.color = (me && me.color) || SEAT_COLORS[seat % 4]; P1.shape = SHAPES[seat % 4];
    const sites = HUB_SITES[this.huntId], hunt = reg('hunt', this.huntId);
    const queue = HUB_TIMELINE.map(s => s.kind === 'establish' ? { kind: 'establish', hub: true } : s.kind === 'site' ? { kind: 'site', id: sites[s.slot], timeBoxed: true, time: s.dur - 2 } : s.kind === 'walk' ? { kind: 'walk', to: s.slot === 'bonus' ? reg('bonus', hunt.bonus).vantage : reg('site', sites[s.slot]).vantage, quick: true } : s.kind === 'bonus' ? { kind: 'bonus', id: hunt.bonus, hub: true, time: s.dur - 3 } : s.kind === 'trophy' ? { kind: 'trophy', id: hunt.trophy, timeBoxed: true, time: s.dur - 2 } : { kind: 'hubFinal' });
    this.H = new Hunt({ mode: 'hub', hunt: this.huntId, seed: RNG.run, queue, players: [P1] });
    this.H.drawGhosts = (g, W, Ht) => this.drawGhosts(g, W, Ht);
    this.H.casualDoe = false;
  },
  /** where the hub's clock says the round is: [segment index, seconds into it] */
  segAt(t) { let i = 0; for (let k = 0; k < HUB_TIMELINE.length; k++) if (t >= HUB_TIMELINE[k].at) i = k; return [i, t - HUB_TIMELINE[i].at]; },
  update(dt) {
    if (this.phase === 'card' || this.phase === 'connecting') { if (this.H && this.phase === 'card') this.cardInput(); return; }
    if (this.phase === 'over' || !this.H) return;
    const now = AIHub.time() / 1000;
    if (this.phase === 'countdown') { if (now >= 0) { this.phase = 'play'; this.localT = 0; this.goSeg(0); } else return; }
    // keep the local round on the hub's clock: catch up, hold, or jump to the segment it is in
    const H = this.H, target = Math.min(now, HUB_END);
    let steps = 1; const drift = target - this.localT;
    if (drift > 2) { const [i, into] = this.segAt(target); if (i !== this.segI) this.goSeg(i); this.localT = HUB_TIMELINE[i].at + into; steps = 0; }
    else if (drift > .25) steps = Math.min(12, 1 + Math.ceil((drift - .25) / dt));
    else if (drift < -.25) steps = 0;
    for (let k = 0; k < steps; k++) {
      this.localT += dt; const [i] = this.segAt(this.localT);
      if (i !== this.segI) this.goSeg(i);
      for (const p of H.players) if (p.benched && this.benchSeg !== this.segI) p.benched = false;
      H.update(dt);
    }
    if (this.localT >= HUB_END - .01) this.sendResult();
    // reporting, ghosts
    if (G.game.real - this.progressAt >= 1) { this.progressAt = G.game.real; const p = H.players[0], seg = HUB_TIMELINE[this.segI] || {}; AIHub.progress({ score: p.score, label: (seg.kind === 'site' ? 'Site ' + (seg.slot + 1) : seg.kind === 'bonus' ? 'Bonus' : seg.kind === 'trophy' ? 'Trophy' : 'Hunt-Off') + ' · ' + p.stats.bucks + ' bucks' }); this.progressSent++; }
    if (G.game.real - this.sendAt >= .1) { this.sendAt = G.game.real; const p = H.players[0], a = H.lens.angles(p.rx, p.ry); AIHub.send({ t: 'g', s: this.segI, a: [Math.round(a[0] * 1000), Math.round(a[1] * 1000)], sc: p.scope.up ? 1 : 0, p: p.score }, { reliable: false }); this.sent++; }
    for (const gh of this.ghosts.values()) { gh.puffs = gh.puffs.filter(f => (f.t += dt) < 1.2); }
  },
  goSeg(i) {
    const H = this.H; this.segI = i;
    while (H.segIndex < i + 1 && !H.finished) { if (H.seg && H.seg.exit) H.seg.exit(); H.seg = null; H.nextSeg(); }
    HUD.reset();
  },
  cardInput() {
    const I = game.input, c = I.clicked && I.clicked();
    if (I.pressed('confirm') || I.pressed('start') || I.pressed('fire') || c && this.readyBtn && inRect(c, this.readyBtn)) { AIHub.answer('ready'); this.answered = 'ready'; if (G.sfx) G.sfx.play('confirm'); }
    if (I.pressed('call') || I.pressed('more') || c && this.moreBtn && inRect(c, this.moreBtn)) { AIHub.answer('more'); this.answered = this.answered === 'more' ? null : 'more'; if (G.sfx) G.sfx.play('focus'); }
  },
  /** a shot of ours: tell the others (reliable), so they see the puff */
  shot(p, R) {
    if (this.phase !== 'play') return; const a = this.H.lens.angles(p.aimPoint()[0], p.aimPoint()[1]);
    const res = R.actor ? (R.actor.cat === 'critter' ? 'critter' : R.actor.protected ? 'doe' : 'buck') : 'miss';
    AIHub.send({ t: 'shot', s: this.segI, a: [Math.round(a[0] * 1000), Math.round(a[1] * 1000)], res, pts: p.score - (this.lastScore || 0), zone: R.zone || null }); this.sent++; this.lastScore = p.score;
  },
  message(d, from) {
    const gh = this.ghosts.get(from); if (!gh || !d) return;
    if (d.t === 'g') { gh.a = d.a; gh.s = d.s; gh.sc = !!d.sc; gh.p = d.p | 0; }
    else if (d.t === 'shot') { gh.puffs.push({ a: d.a, res: d.res, pts: d.pts | 0, t: 0, s: d.s }); }
  },
  drawGhosts(g, W, Ht) {
    const L = this.H.lens;
    for (const gh of this.ghosts.values()) {
      if (gh.s === this.segI && gh.a) { const q = L.fromAngles(gh.a[0] / 1000, gh.a[1] / 1000); if (q) px.blend(g, .6, 'normal', () => { drawReticleShape(g, Math.round(q[0]), Math.round(q[1]), SHAPES[gh.seat % 4], gh.color, gh.sc ? 10 : 7); E.font.text(g, gh.name, q[0], q[1] + 11, gh.color, { align: 'center', outline: '#140c08' }); }); }
      for (const f of gh.puffs) { if (f.s !== this.segI) continue; const q = L.fromAngles(f.a[0] / 1000, f.a[1] / 1000); if (!q) continue; const k = f.t / 1.2; px.ddisc(g, q[0], q[1], 4 + k * 6, '#e8e0d0', .6 * (1 - k)); if (f.pts > 0) E.font.text(g, '+' + fmt(f.pts), q[0], q[1] - 12 - k * 10, gh.color, { align: 'center', outline: '#140c08' }); }
    }
    // the standings strip
    const list = [{ name: this.H.players[0].name, score: this.H.players[0].score, color: this.H.players[0].color }].concat([...this.ghosts.values()].map(gh => ({ name: gh.name, score: gh.p, color: gh.color }))).sort((a, b) => b.score - a.score);
    let x = W / 2 - list.length * 46; for (const r of list) { E.font.text(g, r.name + ' ' + fmt(r.score), x + 46, Ht - 46, r.color, { align: 'center', outline: '#140c08' }); x += 92; }
  },
  sendResult() {
    if (this.resultSent || !this.H) return; this.resultSent = true;
    const p = this.H.players[0], st = p.stats, acc = st.shots ? Math.round(st.hits / st.shots * 100) : 0;
    AIHub.result({ score: p.score, stats: { 'Bucks bagged': st.bucks, Accuracy: acc + '%', 'Longest shot': Math.round(st.longest) + ' m' } });
  },
  end(reason, standings) {
    this.phase = 'over'; this.endReason = reason; this.standings = standings || null;
    if (!this.resultSent && this.H && reason !== 'void') this.sendResult();
    game.input.clear(); if (G.sfx) { G.sfx.stopMusic(.2); G.sfx.ambience(null); } G.bab.stop(); game.audio.mute(true);
  }
};
function inRect(c, r) { return c[0] >= r[0] && c[0] < r[0] + r[2] && c[1] >= r[1] && c[1] < r[1] + r[3]; }
bus.on('shot', e => { if (HUB_ON && HubLink.phase === 'play' && e.p && e.p.n === 1 && G.hunt === HubLink.H) G.game.after(0, () => HubLink.shot(e.p, e.R)); });
bus.on('doe', e => { if (HUB_ON) HubLink.benchSeg = HubLink.segI; });
SEG.hubFinal = (H, o) => ({ block: true, canShoot: false, showReticles: false, cinema: true, actorsLive: false, enter() { if (G.sfx) G.sfx.music('results'); HubLink.sendResult(); }, update() { return false; },
  draw(g, W, Ht) { dim(g, W, Ht, .6); const p = H.players[0]; E.font.title(g, 'FINAL TALLY', W / 2, Ht * .28, { scale: 3, colors: ['#fff6d8', '#ffc040', '#e0602a'], outline: '#1a0c08', depth: 2, depthColor: '#5a2a10', align: 'center' }); E.font.text(g, fmt(p.score), W / 2, Ht * .45, '#ffffff', { align: 'center', scale: 4, outline: '#1a0c08' }); E.font.text(g, p.stats.bucks + ' BUCKS · ' + Math.round(p.stats.longest) + ' M LONGEST', W / 2, Ht * .62, '#d8c8a8', { align: 'center', outline: false }); } });
const hubScene = {
  camera: { zoom: false }, touch: [],
  enter() { G.scene = 'hub'; HubLink.connect(); },
  update(dt) { HubLink.update(dt); if (G.sfx && HubLink.phase !== 'over') G.sfx.update(dt); },
  draw(r) {
    const L = HubLink, H = L.H;
    if (H) { G.hunt = H; if (L.phase === 'card' || L.phase === 'countdown') { if (!H.seg) { H.nextSeg(); } } H.draw(r); }
    else r.sky(['#1a120a', '#2a1c10']);
    r.overlay(g => {
      const W = r.W, Ht = r.H;
      if (L.phase === 'connecting') { E.font.text(g, 'CALLING THE HUB...', W / 2, Ht / 2, '#ffffff', { align: 'center', scale: 2, shadow: '#000' }); return; }
      if (L.phase === 'card') return drawHubCard(g, W, Ht);
      if (L.phase === 'countdown') { const t = AIHub.time() / 1000, n = Math.ceil(-t); dim(g, W, Ht, .4); E.font.title(g, n > 0 ? String(n) : 'GO!', W / 2, Ht * .38, { scale: 6, colors: ['#ffffff', '#ffd040', '#e0602a'], outline: '#1a0c08', depth: 3, depthColor: '#5a2a10', align: 'center' }); E.font.text(g, reg('hunt', L.huntId).name.toUpperCase() + ' · BUCKS ONLY!', W / 2, Ht * .62, '#f4ead8', { align: 'center', scale: 2, shadow: '#000' }); return; }
      if (L.phase === 'play') { const left = Math.max(0, HUB_END - L.localT); E.font.text(g, Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0'), W - 10, 6, '#ffffff', { align: 'right', scale: 2, shadow: '#000' }); }
      if (L.phase === 'over') {
        dim(g, W, Ht, .7); E.font.title(g, 'ROUND OVER', W / 2, Ht * .2, { scale: 3, colors: ['#fff6d8', '#ffc040', '#e0602a'], outline: '#1a0c08', depth: 2, depthColor: '#5a2a10', align: 'center' });
        const order = (L.standings || []).flat(), all = L.info ? L.info.players : [];
        order.forEach((id, q) => { const p = all.find(x => x.id === id); if (!p) return; E.font.text(g, (q + 1) + '. ' + String(p.name).slice(0, 12), W / 2 - 60, Ht * .4 + q * 18, p.color || SEAT_COLORS[q % 4], { scale: 2, outline: false }); });
        if (!order.length) E.font.text(g, L.endReason === 'void' ? 'THIS ROUND DID NOT COUNT' : 'THANKS FOR HUNTING', W / 2, Ht * .45, '#d8c8a8', { align: 'center', scale: 2, outline: false });
      }
    });
  }
};
function drawHubCard(g, W, Ht) {
  const L = HubLink, c = L.card || {}, hunt = reg('hunt', L.huntId), bw = Math.min(W - 30, 400), bh = 224, x = W / 2 - bw / 2, y = Ht / 2 - bh / 2;
  dim(g, W, Ht, .45);
  px.rect(g, x - 4, y - 4, bw + 8, bh + 8, '#5a3a1e'); px.rect(g, x, y, bw, bh, '#1e2a24'); for (let i = 0; i < 30; i++) px.dot(g, x + (i * 97) % bw, y + (i * 61) % bh, '#2a3a32');
  E.font.title(g, 'BIG BUCK HUNT-OFF', W / 2, y + 8, { scale: 2, colors: ['#fff4c8', '#f0c060', '#c8842a'], outline: '#e8581a', depth: 2, depthColor: '#4a2410', align: 'center' });
  E.font.text(g, hunt.name.toUpperCase() + ' · ' + hunt.when.toUpperCase(), W / 2, y + 32, '#f0ece0', { align: 'center', outline: false });
  E.font.text(g, 'Most points in 3 minutes. Bucks only, never does!', W / 2, y + 46, '#ffd040', { align: 'center', outline: false });
  const all = L.info ? L.info.players : [];
  all.forEach((p, i) => { const px0 = x + 20 + (i % 2) * (bw / 2 - 10), py = y + 64 + Math.floor(i / 2) * 18, ready = (c.ready || []).includes(p.id); drawReticleShape(g, px0 + 6, py + 4, SHAPES[i % 4], p.color || SEAT_COLORS[i % 4], 4); E.font.text(g, String(p.name).slice(0, 12) + (p.id === L.info.me ? ' (YOU)' : ''), px0 + 16, py, p.color || SEAT_COLORS[i % 4], { outline: false }); E.font.text(g, ready ? 'READY ✓' : '...', px0 + bw / 2 - 40, py, ready ? '#7ad04a' : '#8a9a90', { align: 'right', outline: false }); });
  const I = game.input; let ky = y + 112;
  for (const [a, t] of [['fire', 'SHOOT'], ['pump', 'PUMP'], ['scope', 'SCOPE'], ['breath', 'HOLD BREATH'], ['call', 'CALL']]) { Glyph.cue(g, a, t, x + 24 + ((ky - y - 112) / 14 % 2 ? bw / 2 : 0), ky, I, { align: 'left' }); ky += 7; }
  const left = c.left === null || c.left === undefined ? null : Math.ceil(c.left / 1000);
  E.font.text(g, c.starting ? 'STARTING...' : c.paused ? 'WAITING FOR MORE TIME' : left !== null ? 'STARTS IN ' + left : '', W / 2, y + 160, '#ffffff', { align: 'center', scale: 2, outline: false });
  const rb = L.readyBtn = [W / 2 - 150, y + bh - 34, 140, 24], mb = L.moreBtn = [W / 2 + 10, y + bh - 34, 140, 24];
  drawCard(g, rb[0], rb[1], rb[2], rb[3], L.answered === 'ready', 0, false); Glyph.cue(g, 'confirm', 'READY', rb[0] + rb[2] / 2, rb[1] + 12, I);
  drawCard(g, mb[0], mb[1], mb[2], mb[3], L.answered === 'more' || c.asked, 0, false); Glyph.cue(g, 'call', 'MORE TIME', mb[0] + mb[2] / 2, mb[1] + 12, I);
}
