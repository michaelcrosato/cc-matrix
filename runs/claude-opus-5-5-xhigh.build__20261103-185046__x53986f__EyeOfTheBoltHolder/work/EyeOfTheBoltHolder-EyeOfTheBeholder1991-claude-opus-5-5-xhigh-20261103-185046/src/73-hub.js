/* =====================================================================================
 * 73-hub: the Rat Run as an AI Hub ghost race (1 to 4 players: our own card, ghosts of the others in their seat colours,
 * progress about once a second, one result) and on its own (a solo time trial against your best run's golden ghost).
 * Names come from the hub and are only ever drawn with the pixel font, never put into the page.
 * ===================================================================================== */
const RATRUN_KEY = 'boltholder.ratrun';
const Hub = {
  active: false, info: null, card: null, started: false, sent: false, ended: null, readySent: false, asked: false, others: {}, sendT: 0, progT: 0, solo: false, trail: [], trailT: 0, best: null,
  /** in a session: connect was called in <head>; here the game takes it up */
  async connect() {
    const p = typeof window !== 'undefined' ? window.__hubInfo : null; if (!p) return null;
    let info = null; try { info = await p; } catch (e) { info = null; }
    if (!info) return null;
    this.active = true; this.info = info;
    const A = window.AIHub;
    A.on('card', c => { this.card = c; });
    A.on('start', () => { this.started = true; });
    A.on('message', (d, from) => this.message(d, from));
    A.on('leave', e => { delete this.others[e.id]; B.view.removeGhost('p' + e.id); });
    A.on('time-up', () => this.timeUp());
    A.on('end', e => this.end(e));
    // the card answers from the first moment, even while the 3D is still loading: Enter or Cross is Ready, Triangle more time
    if (typeof addEventListener === 'function') addEventListener('keydown', e => { if (this.started || e.repeat) return; if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter') A.answer('ready'); }, { capture: true });
    this.padTimer = typeof setInterval === 'function' ? setInterval(() => { if (this.started) { clearInterval(this.padTimer); return; } const gp = navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null; if (!gp) return; const b0 = gp.buttons[0] && gp.buttons[0].pressed, b3 = gp.buttons[3] && gp.buttons[3].pressed; if (b0 && !this._b0) A.answer('ready'); if (b3 && !this._b3) A.answer('more'); this._b0 = b0; this._b3 = b3; }, 50) : null;
    return info;
  },
  /** a seed for the run, the same on every copy */
  seed() { if (this.active && window.AIHub.rng) { const r = window.AIHub.rng('deal'); return Math.floor(r() * 4294967295) >>> 0; } return (Date.now() >>> 0); },
  time() { return this.active ? window.AIHub.time() : S && S.race ? S.race.t * 1000 : 0; },
  ready() { if (this.active && !this.readySent) { this.readySent = true; window.AIHub.ready(); } },
  message(d, from) {
    if (!d || typeof d !== 'object') return;
    if (d.t === 'g') { this.others[from] = Object.assign(this.others[from] || {}, d, { at: game.real }); const pl = (this.info.players || []).find(p => p.id === from); B.view.setGhost('p' + from, { x: d.x, y: d.y, yaw: d.yaw, color: pl ? pl.color : '#c8c8ff', name: pl ? String(pl.name) : 'P' + from, area: d.area }); }
    if (d.t === 'done') this.others[from] = Object.assign(this.others[from] || {}, { done: true, time: d.time });
  },
  timeUp() { if (!this.sent && S && S.race) { this.sent = true; window.AIHub.result({ score: S.race.score, stats: { Kills: S.race.kills, Crowns: S.race.crowns } }); } },
  end(e) { this.ended = e || { reason: 'finished' }; game.input.clear(); game.audio.music(null); game.audio.mute(true); },
  /** each step of the race: send where we are, report how it goes, the result once */
  step(dt) {
    const R = S.race; if (!R) return;
    if (this.active && !this.ended) {
      const A = window.AIHub, P = S.party;
      if ((this.sendT -= dt) <= 0) { this.sendT = .1; const cam = B.view.camera ? B.view.camera() : { x: mid(P.cx), y: mid(P.cy), yaw: YAW(P.dir) }; A.send({ t: 'g', area: 'race', cx: P.cx, cy: P.cy, dir: P.dir, x: Math.round(cam.x), y: Math.round(cam.y), yaw: +cam.yaw.toFixed(2), cp: Object.keys(R.cp).length, hp: B.alive().length }, { reliable: false }); }
      if ((this.progT -= dt) <= 0) { this.progT = 1; A.progress({ score: R.score, label: R.label }); }
      if (R.done && !this.sent) { this.sent = true; if (R.wiped) A.result({ score: R.score, stats: { Kills: R.kills, Crowns: R.crowns } }); else { const tm = Math.round(Math.max(0, A.time())); A.result({ time: tm, stats: { Kills: R.kills, Crowns: R.crowns } }); A.send({ t: 'done', time: tm }); } }
    }
    if (!this.active) {
      // the solo run: record a trail, and run the best one beside us
      if ((this.trailT -= dt) <= 0 && !R.done) { this.trailT = .1; this.trail.push([+R.t.toFixed(2), S.party.cx, S.party.cy, S.party.dir]); }
      if (this.best && this.best.trail) { const tr = this.best.trail; let k = 0; while (k < tr.length - 1 && tr[k + 1][0] <= R.t) k++; const a = tr[k], b2 = tr[Math.min(tr.length - 1, k + 1)], u = b2[0] > a[0] ? clamp((R.t - a[0]) / (b2[0] - a[0]), 0, 1) : 0; B.view.setGhost('best', { x: lerp(mid(a[1]), mid(b2[1]), u), y: lerp(mid(a[2]), mid(b2[2]), u), yaw: YAW(b2[3]), color: '#ffd36a', name: 'Best', area: 'race' }); }
      if (R.done && !this.savedBest) { this.savedBest = true; if (!R.wiped && (!this.best || R.time < this.best.time)) { this.newBest = true; try { localStorage.setItem(RATRUN_KEY, JSON.stringify({ time: R.time, trail: this.trail })); } catch (e) { /* storage blocked */ } } }
    }
    if (B.fakeGhosts) { const t = game.real; B.view.setGhost('fake1', { x: mid(1) + Math.sin(t * .5) * 0, y: mid(5) + Math.sin(t * .7) * 50, yaw: PI / 2, color: '#e8443a', name: 'Fake 1', area: 'race' }); B.view.setGhost('fake2', { x: mid(2) + Math.cos(t * .6) * 30, y: mid(3), yaw: 0, color: '#3b82f6', name: 'Fake 2', area: 'race' }); }
  },
  /** the standings in seat colours (the race HUD) */
  standings(g, r) {
    if (!this.active || !this.info) return;
    const ps = this.info.players || []; let y = 42;
    for (const p of ps) { const me = p.id === this.info.me, o = me ? { cp: S.race ? Object.keys(S.race.cp).length : 0, done: S.race && S.race.done } : this.others[p.id] || {}; panel(g, 4, y, 112, 12, { alpha: .7, rivets: false, border: p.color }); TXT(g, String(p.name).slice(0, 12), 8, y + 2, p.color); TXT(g, o.done ? 'Out!' : (o.cp || 0) + '/5', 92, y + 2, COL.text); y += 13; }
  }
};
B.Hub = Hub;
/** a Rat Run: solo from the title, or the session's race */
B.startRace = (o = {}) => {
  Hub.solo = !Hub.active; Hub.trail = []; Hub.trailT = 0; Hub.sent = false; Hub.savedBest = false; Hub.newBest = false;
  try { Hub.best = Hub.active ? null : JSON.parse(localStorage.getItem(RATRUN_KEY) || 'null'); } catch (e) { Hub.best = null; }
  B.newGame({ mode: 'race', seed: Hub.seed() }); B.raceInit();
  B.view.enter('race');
  game.go(Hub.active ? 'hubcard' : 'play', { race: true });
};
/** our own card in a session: the run's goal, the controls, the players and who is ready, the countdown */
const scenesHub = {};
scenesHub.hubcard = {
  input: KEYS,
  enter() { Hub.ready(); Sound.music('race'); },
  update(dt) {
    const I = game.input, A = typeof window !== 'undefined' && window.AIHub;
    B.view.step(0);
    if (Hub.started) { game.go('play', { race: true, countdown: true }, { fade: 0 }); return; }
    if (!A) return;
    if ((I.pressed('confirm') || I.pressed('start')) && game.input.lastDevice !== 'keyboard') A.answer('ready');
    if (I.pressed('mTri') || I.pressed('party')) { A.answer('more'); Hub.asked = !Hub.asked; }
    const ck = I.clicked(); if (ck && this._btn) { if (ck[0] >= this._btn.r.x && ck[0] < this._btn.r.x + this._btn.r.w && ck[1] >= this._btn.r.y && ck[1] < this._btn.r.y + 14) A.answer('ready'); else if (ck[0] >= this._btn.m.x && ck[0] < this._btn.m.x + this._btn.m.w && ck[1] >= this._btn.m.y && ck[1] < this._btn.m.y + 14) A.answer('more'); }
  },
  draw(r) {
    UI.W = r.W; UI.H = r.H; B.view.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H, c = Hub.card || {}, ps = (Hub.info && Hub.info.players) || [];
      g.save(); g.globalAlpha = .6; px.rect(g, 0, 0, W, H, '#05030a'); g.restore();
      E.font.title(g, 'EYE OF THE BOLT-HOLDER', W / 2, 10, { scale: W < 360 ? 1 : 2, align: 'center', colors: TITLE_COLORS });
      E.font.title(g, 'THE RAT RUN', W / 2, 34, { scale: 2, align: 'center', colors: ['#e8fcff', '#8af4ff', '#2aa0e0'] });
      const goal = 'Fastest party out of the Rat Run wins'; TXT(g, goal, W / 2 - TW(goal) / 2, 58, '#ffe6b0');
      const how = [['move', 'Move'], ['turn', 'Turn'], ['use', 'Use'], ['strike', 'Strike'], ['throw', 'Throw']]; prompts(g, how, W / 2, 74, { align: 'center' });
      TXT(g, 'Pull the lever, clear the rats, find the key, weigh the plate, get out.', W / 2 - TW('Pull the lever, clear the rats, find the key, weigh the plate, get out.') / 2, 90, '#d8ccb8');
      ps.forEach((p, i) => { const y = 108 + i * 14, rd = (c.ready || []).includes(p.id); panel(g, W / 2 - 80, y, 160, 12, { rivets: false, border: p.color, alpha: .85 }); TXT(g, String(p.name).slice(0, 18), W / 2 - 74, y + 2, p.color); TXT(g, rd ? 'Ready' : '...', W / 2 + 46, y + 2, rd ? COL.good : COL.dim); });
      const y2 = 112 + ps.length * 14 + 6; this._btn = { r: { x: W / 2 - 92, y: y2, w: 88 }, m: { x: W / 2 + 4, y: y2, w: 88 } };
      panel(g, this._btn.r.x, y2, 88, 14, { rivets: false }); TXT(g, 'Ready', this._btn.r.x + 30, y2 + 3, COL.text); glyph(g, 'confirm', this._btn.r.x + 4, y2 + 1);
      panel(g, this._btn.m.x, y2, 88, 14, { rivets: false, border: Hub.asked ? COL.focus : COL.border }); TXT(g, 'More time', this._btn.m.x + 22, y2 + 3, COL.text); glyph(g, 'mTri', this._btn.m.x + 4, y2 + 1);
      const left = c.left === null || c.left === undefined ? (c.starting ? 'Starting...' : c.paused ? 'Waiting for more time' : '') : 'Starts in ' + Math.ceil(c.left / 1000) + ' s';
      TXT(g, left, W / 2 - TW(left) / 2, y2 + 22, COL.dim);
    });
  }
};
B.scenesHub = scenesHub;
SCREENS.raceResults = {
  focus: 'b0',
  open() { this.focus = 'b0'; Sound.sting('victory'); },
  items() { return [{ label: 'Run again', act: () => { UI.closeAll(); B.startRace({ solo: true }); } }, { label: 'Title', act: () => { UI.closeAll(); game.go('title'); } }]; },
  update() { if (Hub.active) return; const r = Focus.step(menuList(this.items(), UI.W, Math.round(UI.H * .6)), this.focus); this.focus = r.id; },
  draw(g, r) {
    const W = r.W, H = r.H, R = S.race; g.save(); g.globalAlpha = .65; px.rect(g, 0, 0, W, H, '#05030a'); g.restore();
    E.font.title(g, R.wiped ? 'FELL IN THE RUN' : 'ESCAPED!', W / 2, H * .14, { scale: 3, align: 'center', colors: R.wiped ? ['#ffe0e0', '#ff7a6a', '#c8202a'] : TITLE_COLORS });
    const rows = [['Time', R.wiped ? '-' : B.clock(R.time)], ['Best', Hub.best ? B.clock(Hub.newBest ? R.time : Hub.best.time) : R.wiped ? '-' : B.clock(R.time)], ['Crowns', R.crowns + ' of 6'], ['Kills', R.kills], ['Score', R.score]];
    rows.forEach(([k, v], i) => { TXT(g, k, W / 2 - 60, H * .34 + i * 12, COL.dim); TXT(g, String(v), W / 2 + 10, H * .34 + i * 12, COL.text); });
    if (Hub.newBest) TXT(g, 'A new best run!', W / 2 - TW('A new best run!') / 2, H * .34 + 64, COL.focus);
    if (Hub.active) { const t = Hub.ended ? 'The round is over.' : R.wiped ? 'Your party fell. The others run on.' : 'Escaped in ' + B.clock(R.time) + '. Waiting for the others.'; TXT(g, t, W / 2 - TW(t) / 2, H * .7, '#ffe6b0'); return; }
    drawMenuList(g, menuList(this.items(), W, Math.round(H * .6)), this.focus);
  }
};
