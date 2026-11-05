/* MULTIPLAYER: the Rat Run. In an AI Hub session (ghost mode, 1 to 4 players) every copy runs the same race from the
 * same seed, shows the others as cloaked ghosts in their seat colours, reports progress and its result. On its own it
 * is a solo time trial against the best run's golden ghost (storage 'boltholder.ratrun'). */
B.Ghosts = {
  list: {}, fake: false,
  set(id, d) { const g = this.list[id] || (this.list[id] = { id, x: d.x, y: d.y, yaw: d.yaw }); Object.assign(g, d, { at: Date.now() }); },
  remove(id) { delete this.list[id]; },
  clear() { this.list = {}; },
  /** draw them in the 3D view (pen): a hooded cloak in the seat colour, a lantern glow; the names on the HUD */
  draw(world, t) {
    const all = Object.values(this.list).filter(g => g.area === B.S.floor || g.area === 'race' && B.S.floor === 'race');
    if (this.fake && B.S) { const P = B.S.party; for (let k = 0; k < 2; k++) { const a = t * .6 + k * PI; all.push({ fakeName: k ? 'Ghost B' : 'Ghost A', color: k ? '#3b82f6' : '#22c55e', x: mid(P.cx) + Math.cos(a) * 40, y: mid(P.cy) + Math.sin(a) * 40, yaw: a + PI / 2, rx: 0, ry: 0 }); } }
    for (const g of all) {
      g.rx = g.rx === undefined ? g.x : lerp(g.rx, g.x, .2); g.ry = g.ry === undefined ? g.y : lerp(g.ry, g.y, .2);
      const p = world.pen.at(g.rx, g.ry, 0, g.yaw || 0, 1), c = g.color || '#ffd36a';
      p.cone(0, 0, 0, 0, 0, 24, 7, E.shade(c, -.2)).ball(0, 0, 25, 4, 4, 4.6, E.shade(c, -.35)).ball(2.4, 0, 25, 1.2, 2.6, 2.4, '#141018').glow(5, 4, 14, 1.6, c);
    }
    return all;
  },
  tags(g, world) { for (const gh of this.lastDrawn || []) { const p = world.project(gh.rx, gh.ry, 34); if (p) B.text(g, B.cut(gh.fakeName || gh.name || 'Ghost', 70), p[0], p[1], gh.color || '#ffd36a', { align: 'center', font: 'tiny' }); } }
};
/* ---- the solo Rat Run and its best ghost ---- */
B.Race = {
  best: null, trail: [], trailT: 0, ghostT: 0, results: null, countdown: 0, solo: true,
  load() { this.best = B.store.get('boltholder.ratrun', null); },
  begin(solo, seed) {
    this.solo = solo; this.results = null; this.trail = []; this.trailT = 0; this.ghostT = 0; this.countdown = solo ? 3 : 0; this.sent = false;
    B.newRace(seed); B.drain(); B.Ghosts.clear(); this.load();
  },
  update(dt) {
    const S = B.S; if (!S || !S.race) return;
    const R = S.race;
    if (!R.done) { this.trailT += dt; if (this.trailT >= .1) { this.trailT = 0; this.trail.push([Math.round(R.t * 10) / 10, S.party.cx, S.party.cy, S.party.dir]); } }
    if (this.solo && this.best && this.best.trail) {   // the golden ghost of the best run, replayed beside you
      this.ghostT = R.t; const tr = this.best.trail; let k = 0; while (k < tr.length - 1 && tr[k + 1][0] <= this.ghostT) k++;
      const a = tr[k], b = tr[Math.min(tr.length - 1, k + 1)], u = b[0] > a[0] ? clamp((this.ghostT - a[0]) / (b[0] - a[0]), 0, 1) : 0;
      B.Ghosts.set('best', { area: 'race', name: 'Best run', color: '#ffd36a', x: lerp(mid(a[1]), mid(b[1]), u), y: lerp(mid(a[2]), mid(b[2]), u), yaw: YAW(a[3]) });
    }
  },
  finished(e) {
    const S = B.S, R = S.race; if (this.results) return;
    this.results = { time: R.finishT, crowns: R.crowns, kills: R.kills, wiped: R.wiped, score: R.score };
    if (this.solo && !R.wiped && (!this.best || R.finishT < this.best.t)) { this.best = { t: R.finishT, trail: this.trail }; this.results.record = true; if (S.mode !== 'attract') B.store.set('boltholder.ratrun', this.best); }
    if (B.Hub.active) B.Hub.finish(this.results);
  },
  drawOver(g, r, G) {
    if (B.view && B.view.world) { B.Ghosts.lastDrawn = B.Ghosts.lastDrawn || []; B.Ghosts.tags(g, B.view.world); }
    const W = r.W, H = r.H;
    const cd = B.Hub.active ? B.Hub.countdown() : this.countdown;
    if (cd > 0) E.font.title(g, String(Math.ceil(cd)), W / 2, H / 2 - 30, { align: 'center', scale: 4, colors: B.TITLE_COLORS, depthColor: '#2a1a08' });
    if (this.results) {
      const R = this.results; B.panel(g, W / 2 - 110, 60, 220, 90);
      B.text(g, R.wiped ? 'Your party fell.' : 'Escaped in ' + B.fmtTime(R.time) + (R.record ? '  New best!' : ''), W / 2, 68, B.COL.focus, { align: 'center' });
      B.text(g, 'Crowns ' + R.crowns + '   Kills ' + R.kills + '   Score ' + R.score, W / 2, 82, B.COL.text, { align: 'center' });
      if (B.Hub.active) B.text(g, B.Hub.endReason ? 'The round is over.' : R.wiped ? 'The others run on.' : 'Waiting for the others.', W / 2, 96, B.COL.dim, { align: 'center' });
      else { if (this.best) B.text(g, 'Best ' + B.fmtTime(this.best.t), W / 2, 96, B.COL.dim, { align: 'center' }); B.prompts(g, G, [['confirm', 'Run again'], ['cancel', 'Title']], W / 2, 128, 'center'); }
    }
  }
};
/* ---- the race scene: solo or in a session ---- */
B.RaceScene = {
  get pausable() { return !B.Hub.active && B.Play.pausable; },
  enter(d = {}) { B.Race.begin(!B.Hub.active, B.Hub.active ? B.Hub.seed() : (Date.now() & 0xffff)); B.Play.enter({ resume: true }); B.Music.play('race'); B.UI.toast = { text: 'The Rat Run', t: B.UI.t }; },
  update(dt) {
    const G = B.game, I = G.input;
    if (B.Hub.active && B.Hub.ended) { I.clear && I.clear(); return; }
    if (B.Race.results && !B.Hub.active) { B.UI.t = G.real; if (I.pressed('confirm') || I.pressed('use')) G.go('race', {}); else if (I.pressed('cancel') || I.pressed('pause')) G.go('title'); B.Play.sync(dt); return; }
    const cd = B.Hub.active ? B.Hub.countdown() : B.Race.countdown;
    if (cd > 0) { if (!B.Hub.active) B.Race.countdown -= dt; B.UI.t = G.real; B.Play.sync(dt); return; }
    if (B.Hub.active && B.Hub.inputLocked()) { B.Play.sync(dt); return; }
    B.Play.update(dt); B.Race.update(dt);
    if (B.Hub.active) B.Hub.tick(dt);
  },
  draw(r) { B.Play.draw(r); }
};
/* ---- the AI Hub session ---- */
B.Hub = {
  active: false, info: null, card: null, startAt: null, ended: false, endReason: null, sendT: 0, progT: 0, resultSent: false, more: false, readyAnswered: false, createOptions: false, ready: false,
  async connect() {
    const p = typeof window !== 'undefined' && window.__hubInfo; if (!p) return null;
    let info = null; try { info = await p; } catch (e) { info = null; }
    if (!info) return null;
    this.active = true; this.info = info;
    const A = window.AIHub;
    A.on('card', c => { this.card = c; });
    A.on('start', () => { this.startAt = true; });
    A.on('message', (d, from) => { if (!d || typeof d !== 'object') return; const pl = (this.info.players || []).find(p => p.id === from); if (d.t === 'g') B.Ghosts.set(from, { area: d.area, x: d.x, y: d.y, yaw: d.yaw, name: pl ? String(pl.name) : 'Player ' + (from + 1), color: pl ? pl.color : '#ffd36a', score: d.score || 0 }); if (d.t === 'done') { const gh = B.Ghosts.list[from]; if (gh) gh.done = d.time; } });
    A.on('leave', e => { B.Ghosts.remove(e.id); });
    A.on('time-up', () => { this.sendResult(true); });
    A.on('end', e => { this.ended = true; this.endReason = e && e.reason || 'finished'; try { B.game.input.clear(); B.game.audio.music(null); B.game.audio.mute(true); } catch (er) { /* best effort */ } });
    return info;
  },
  seed() { const r = window.AIHub.rng('deal'); return Math.floor(r() * 2147483647) + 1; },
  callReady() { if (this.ready) return; this.ready = true; try { window.AIHub.ready(); } catch (e) { /* the hub's */ } },
  countdown() { if (!this.active) return 0; const t = window.AIHub.time(); if (!isFinite(t)) return 0; return t < 0 ? -t / 1000 : 0; },
  inputLocked() { if (!this.active) return false; const t = window.AIHub.time(); return !isFinite(t) || t < 0; },
  tick(dt) {
    const A = window.AIHub, S = B.S; if (!S || !S.race || this.ended) return;
    // paced on the hub's clock (wall time): a slow machine's game steps must not slow the reports
    const now = A.time(), P = S.party, pose = B.view && B.view.pose || { x: mid(P.cx), y: mid(P.cy), yaw: YAW(P.dir) };
    if (this.lastSend === undefined) { this.lastSend = -1e9; this.lastProg = -1e9; }
    if (now - this.lastSend >= 100) { this.lastSend = now; A.send({ t: 'g', area: 'race', cx: P.cx, cy: P.cy, dir: P.dir, x: Math.round(pose.x), y: Math.round(pose.y), yaw: Math.round(pose.yaw * 100) / 100, cp: S.race.label, hp: B.alive().length, score: S.race.score }, { reliable: false }); }
    if (now - this.lastProg >= 1000) { this.lastProg = now; A.progress({ score: S.race.score, label: S.race.label }); }
  },
  finish(res) {
    if (this.resultSent) return; const A = window.AIHub;
    if (res.wiped) { this.resultSent = true; A.result({ score: res.score, stats: { Kills: res.kills, Crowns: res.crowns } }); return; }
    this.resultSent = true; const time = Math.max(0, Math.round(A.time()));
    A.result({ time, stats: { Kills: res.kills, Crowns: res.crowns } }); A.send({ t: 'done', time }, { reliable: true });
  },
  sendResult() { if (this.resultSent || !this.active) return; this.resultSent = true; const S = B.S; window.AIHub.result({ score: S && S.race ? S.race.score : 0, stats: S && S.race ? { Kills: S.race.kills, Crowns: S.race.crowns } : {} }); },
  standings() {
    if (!this.active || !this.info) return null;
    const me = this.info.me, out = (this.info.players || []).map(p => ({ name: String(p.name), color: p.color, score: p.id === me ? (B.S && B.S.race ? B.S.race.score : 0) : (B.Ghosts.list[p.id] ? B.Ghosts.list[p.id].score || 0 : 0) }));
    return out.sort((a, b) => b.score - a.score);
  }
};
/* ---- our own card: the logo, the goal, the controls, the players and who is ready, the countdown ---- */
B.HubCard = {
  enter() { this.t = 0; B.Race.begin(false, B.Hub.seed()); B.Play.enter({ resume: true }); B.Music.play('race'); B.Hub.callReady(); },
  update(dt) {
    const G = B.game, I = G.input; this.t += dt; B.UI.t = G.real;
    if (B.Hub.startAt) { G.go('race', {}, { fade: 0 }); return; }
    if (I.pressed('confirm') || I.held.has('Enter') && I.pressed('start')) { if (!B.Hub.readyAnswered) { B.Hub.readyAnswered = true; window.AIHub.answer('ready'); G.audio.sfx('uiConfirm'); } }
    if (I.pressed('alt2') || I.pressed('party')) { B.Hub.more = !B.Hub.more; window.AIHub.answer('more'); G.audio.sfx('uiTab'); }
    const cl = I.clicked(); if (cl) { const W = B.UI.W, H = B.UI.H; if (cl[1] > H - 40) { if (cl[0] < W / 2) { if (!B.Hub.readyAnswered) { B.Hub.readyAnswered = true; window.AIHub.answer('ready'); } } else { B.Hub.more = !B.Hub.more; window.AIHub.answer('more'); } } }
    B.Play.sync(dt);
  },
  draw(r) {
    const G = B.game, W = r.W, H = r.H; B.UI.W = W; B.UI.H = H;
    if (B.view) B.view.draw(r);
    r.overlay(g => {
      g.save(); g.globalAlpha = .7; px.rect(g, 0, 0, W, H, '#0a0806'); g.restore();
      B.logo(g, W, 10, 2);
      B.text(g, 'THE RAT RUN', W / 2, 44, B.COL.focus, { align: 'center' });
      B.text(g, 'Fastest party out of the Rat Run wins.', W / 2, 58, B.COL.text, { align: 'center' });
      B.glyphText(g, G, 'Move {fwd}{strafeL}  Turn {turnL}{turnR}  Use {use}  Strike {strike}', W / 2, 72, '#e8d8a8', 'center');
      B.text(g, 'Pull the lever, clear the rats, find the key, weigh the plate. Crowns and kills add to your score.', W / 2, 86, B.COL.dim, { align: 'center', font: 'tiny' });
      const pl = (B.Hub.info && B.Hub.info.players) || [], c = B.Hub.card || {};
      pl.forEach((p, i) => { const y = 102 + i * 13, ready = (c.ready || []).includes(p.id); px.rect(g, W / 2 - 80, y, 8, 8, p.color); B.text(g, B.cut(String(p.name), 120), W / 2 - 66, y, B.COL.text); if (ready) B.text(g, 'READY', W / 2 + 60, y, B.COL.good); });
      if (c.left !== null && c.left !== undefined) B.text(g, 'Starting in ' + Math.ceil(c.left / 1000) + ' s', W / 2, H - 52, B.COL.focus, { align: 'center' });
      else if (c.paused) B.text(g, 'Waiting: more time was asked for.', W / 2, H - 52, B.COL.dim, { align: 'center' });
      else if (c.starting) B.text(g, 'Starting...', W / 2, H - 52, B.COL.focus, { align: 'center' });
      B.prompts(g, G, [['confirm', B.Hub.readyAnswered ? 'Ready!' : 'Ready'], ['alt2', B.Hub.more ? 'More time (asked)' : 'More time']], W / 2, H - 30, 'center');
    });
  }
};
