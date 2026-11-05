/* AI HUB (Session Protocol v1, mode ghost, 1-4 players): everyone plays the same Batzooka Derby round on their own device
 * from the same pitch sequence (AIHub.rng('pitches')), and sees the others as ghosts: their home runs fly through the sky
 * as comets in their seat colours and their batters stand as holograms in the on-deck circles. Ghosts never change the
 * local round. The game shows its own card (no Math.random on it), calls ready() with no key press, reports progress
 * every second and one result, answers time-up at once, and after end takes no input, sends nothing and goes quiet. */
const SEAT = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
const HUB = { phase: 'off', api: null, info: null, card: null, ghosts: {}, sent: 0, lastProg: -1, lastG: 0, reported: false, ended: false, standings: null, score: 0, mock: false, roundMs: 120000 };
BZ.hub = HUB;
function hubApi() { return HUB.api || (typeof AIHub !== 'undefined' ? AIHub : null); }
function hubSend(data, reliable = true) { const A_ = hubApi(); if (!A_ || HUB.ended || !A_.send) return; try { A_.send(data, { reliable }); HUB.sent++; } catch (e) { game.fail('hub send', e); } }
function mockHub() {
  // a stand-in session for the dev warp and the headless tests: two ghost players, a 20 s card, the start, and the end
  const h = { active: true, me: 0, handlers: {}, t0: 0, started: false, answers: [], results: [], progs: [], sent: [], rngs: {},
    on(ev, fn) { (this.handlers[ev] = this.handlers[ev] || []).push(fn); return () => {}; }, fire(ev, ...a) { for (const f of this.handlers[ev] || []) f(...a); },
    connect() { return Promise.resolve({ me: 0, players: [{ id: 0, name: 'YOU', color: SEAT[0] }, { id: 1, name: 'GHOSTY', color: SEAT[1] }, { id: 2, name: 'COMET KID', color: SEAT[2] }], mode: 'ghost', round: 1, limitMs: 125000, seed: 7 }); },
    ready() { this.readyCalled = true; }, answer(a) { this.answers.push(a); if (a === 'ready') this.fire('card', { left: null, paused: false, starting: true, ready: [0], asking: 0, asked: false }); },
    time() { return this.started ? (game.real - this.t0) * 1000 - 3000 : -Infinity; },
    start() { this.started = true; this.t0 = game.real; this.fire('start', { in: 3000 }); },
    progress(p) { this.progs.push(p); }, result(r) { this.results.push(r); }, send(d) { this.sent.push(d); return true; },
    rng(label) { return this.rngs[label] || (this.rngs[label] = E.rng(label.length * 97 + 7)); }
  };
  return h;
}
function hubConnect(mock) {
  HUB.mock = !!mock; HUB.api = mock ? mockHub() : null; HUB.phase = 'loading'; HUB.ended = false; HUB.reported = false; HUB.ghosts = {}; HUB.sent = 0; HUB.card = null; HUB.standings = null;
  const A_ = hubApi(); if (!A_) { HUB.phase = 'off'; return game.go('title'); }
  A_.on('card', c => { HUB.card = c; }); A_.on('start', () => { HUB.phase = 'countdown'; buildRound(); });
  A_.on('message', (d, from) => ghostMsg(d, from)); A_.on('leave', d => { delete HUB.ghosts[d.id]; });
  A_.on('time-up', () => { if (M && M.derby) derbyDone(); hubReport(); });
  A_.on('end', d => { HUB.ended = true; HUB.phase = 'end'; HUB.standings = d && d.standings; music(null); BZ.mute = true; A.music(null); });
  A_.connect({ mode: 'ghost', seats: [1, 4], card: true }).then(info => {
    if (!info) { HUB.phase = 'off'; return game.go('title'); }
    HUB.info = info; for (const p of info.players || []) if (p.id !== info.me) HUB.ghosts[p.id] = { id: p.id, name: p.name, color: p.color || SEAT[p.id % 4], sc: 0, o: 0, s: 0, rx: 0, rz: 17, comets: [], swing: 0 };
    HUB.roundMs = info.limitMs ? Math.min(120000, info.limitMs - 5000) : 120000;
    HUB.phase = 'card'; A_.ready();
    if (HUB.mock) game.after(.1, () => {});
  }).catch(e => { game.fail('hub connect', e); HUB.phase = 'off'; game.go('title'); });
}
function buildRound() {
  const A_ = hubApi(); BZ.rng.deal = A_.rng('pitches'); const pr = A_.rng('park');
  newDerby({ park: 'megadome', input: game.input, batter: TEAMS.COM.roster[0], time: HUB.roundMs / 1000, noClock: true, outs: 10, seed: Math.floor(pr() * 1e9), deal: BZ.rng.deal,
    onHit: h => hubSend({ t: 'hit', n: M.derby.hrs, p: [Math.round(h.x), Math.round(h.y), Math.round(h.z)], v: [Math.round(h.vx), Math.round(h.vy), Math.round(h.vz)], kind: h.bz ? 'bz' : 'hr', dist: h.dist, bz: !!h.bz, out: !!h.out }) });
  M.onEnd = () => { hubReport(); hubSend({ t: 'done', score: Math.round(M.derby.score) }); HUB.phase = 'done'; };
  M.phase = 'halfStart'; M.phaseT = 0; music('derby'); game.setView('broadcast');
}
function hubReport() {
  if (HUB.reported || !M || !M.derby) return; HUB.reported = true; const D = M.derby, A_ = hubApi();
  try { A_.result({ score: Math.round(D.score), stats: { 'Home runs': D.hrs, 'Longest': D.longest + ' ft', 'Outs': D.outs }, awards: D.longest ? [{ title: 'Moonshot', detail: D.longest + ' ft' }] : [] }); } catch (e) { game.fail('hub result', e); }
}
function ghostMsg(d, from) {
  const G = HUB.ghosts[from]; if (!G || !d || typeof d !== 'object') return;
  if (d.t === 'g') { G.s = d.s; G.rx = d.rx; G.rz = d.rz; G.sc = d.sc; G.o = d.o; if (d.s) G.swing = .35; }
  else if (d.t === 'hit' && Array.isArray(d.p) && Array.isArray(d.v) && !d.out) G.comets.push({ x: d.p[0], y: d.p[1], z: d.p[2], vx: d.v[0], vy: d.v[1], vz: d.v[2], life: 4, trail: [] });
  else if (d.t === 'done') G.done = true, G.sc = d.score;
}
function ghostsStep(dt) {
  for (const id in HUB.ghosts) { const G = HUB.ghosts[id]; G.swing = Math.max(0, G.swing - dt);
    for (const c of G.comets) { c.vz -= 520 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt; c.life -= dt; c.trail.push([c.x, c.y, c.z]); if (c.trail.length > 18) c.trail.shift(); }
    G.comets = G.comets.filter(c => c.life > 0 && c.z > -40);
    if (G.fake) { G.ft = (G.ft || 0) - dt; if (G.ft <= 0) { G.ft = 1.5 + RF() * 2; const th = (RF() - .5) * 1.2, v = 900 + RF() * 200; G.comets.push({ x: HX, y: PLATE_Y, z: 17, vx: v * .85 * Math.sin(th), vy: -v * .85 * Math.cos(th), vz: v * .55, life: 4, trail: [] }); G.sc += 380 + Math.floor(RF() * 120); G.swing = .35; } } }
}
function ghostsFake() { HUB.ghosts = {}; [['GHOSTY', 1], ['COMET KID', 2], ['MOONBEAM', 3]].forEach(([n, k]) => { HUB.ghosts[k] = { id: k, name: n, color: SEAT[k], sc: 0, o: 0, comets: [], swing: 0, fake: true, ft: k * .7 }; }); }
function ghostsDraw(r) {
  if (!M) return; const kit = parkKit(M.parkId), m7 = kit.m7, plate = M.cam === 'plate' || M.cam === 'moonshot';
  r.overlay(g => {
    const W = r.W; let k = 0;
    for (const id in HUB.ghosts) {
      const G = HUB.ghosts[id];
      for (const c of G.comets) for (let i = 0; i < c.trail.length; i++) { const [x, y, z] = c.trail[i], p = plate ? m7.project(x, y, z) : r.w(x, y, drawZ(z)); if (p) px.blend(g, .3 + i / c.trail.length * .5, 'add', () => px.disc(g, p[0], p[1], 1 + i / 6, G.color)); }
      // their hologram batter in an on-deck circle, and their score
      const ox = HX + (k % 2 ? 78 : -78), oy = HY - 21 - Math.floor(k / 2) * 30, p = plate ? m7.project(ox, oy, 0) : r.w(ox, oy, 0);
      if (p) { const s = plate ? p[2] : 1; px.blend(g, .45, 'add', () => { px.rect(g, p[0] - 3 * s, p[1] - 26 * s, 6 * s, 20 * s, G.color); px.disc(g, p[0], p[1] - 29 * s, 3.5 * s, G.color); if (G.swing > 0) px.line(g, p[0], p[1] - 18 * s, p[0] + 14 * s, p[1] - 22 * s, '#ffffff', Math.max(1, s)); }); }
      text(g, G.name + '  ' + fmt(G.sc) + ' FT', W - SAFE - cornerW(), SAFE + 66 + k * 10, G.color, { align: 'right' }); k++;
    }
  });
}
/* ---- the hubDerby scene: loading, the card, the countdown, the round, the end overlay ---- */
SCENES.hubDerby = {
  input: KEYS, view: 'broadcast', camera: { zoom: false },
  enter(d) { hubConnect(d && d.mock); music('hubcard'); MENUBG.park = 'megadome'; if (HUB.mock) HUB.mockT = 0; },
  exit() { if (HUB.mock) { HUB.phase = 'off'; HUB.api = null; BZ.mute = false; } },
  update(dt) {
    const A_ = hubApi(); if (HUB.ended) { return; }
    commonTick(dt);
    if (HUB.phase === 'card') {
      const I = game.input, c = I.clicked && I.clicked();
      if (I.pressed('confirm') || I.pressed('south') || (c && HUB.readyBtn && inR(c, HUB.readyBtn))) { I.consumeAll(); A_.answer('ready'); }
      if (I.pressed('north') || (c && HUB.moreBtn && inR(c, HUB.moreBtn))) { I.consumeAll(); A_.answer('more'); }
      if (HUB.mock) { HUB.mockT += dt; if (HUB.mockT > 3 && !A_.started) A_.start(); }
      return;
    }
    if (HUB.phase === 'countdown' || HUB.phase === 'round' || HUB.phase === 'done') {
      const t = A_.time();
      if (t < 0) { HUB.phase = 'countdown'; return; }
      if (HUB.phase === 'countdown') HUB.phase = 'round';
      if (M && M.derby) { M.derby.time = Math.max(0, (HUB.roundMs - t) / 1000); if (M.derby.time <= 0) derbyDone(); }
      if (M) { matchUpdate(dt); animateRigs(dt); broadcastFocus(dt); hudTick(dt); }
      ghostsStep(dt);
      const sec = Math.floor(t / 1000), D = M && M.derby;
      if (D && sec !== HUB.lastProg) { HUB.lastProg = sec; HUB.score = Math.round(D.score); try { A_.progress({ score: HUB.score, label: fmt(D.score) + ' ft · ' + D.hrs + ' HR · ' + D.outs + ' outs' }); } catch (e) { game.fail('hub progress', e); } }
      HUB.lastG += dt; if (HUB.lastG >= .1 && D && !D.done) { HUB.lastG = 0; hubSend({ t: 'g', area: 'derby', s: M.swing ? 1 : 0, rx: +M.reticle.x.toFixed(1), rz: +M.reticle.z.toFixed(1), sc: Math.round(D.score), o: D.outs }, false); }
      if (D && D.done && !HUB.reported) { hubReport(); hubSend({ t: 'done', score: Math.round(D.score) }); HUB.phase = 'done'; }
    }
  },
  draw(r) {
    if (HUB.phase === 'round' || HUB.phase === 'done' || (HUB.phase === 'end' && M)) { drawMatchWorld(r); drawHUD(r); ghostsDraw(r); }
    else { r.sky(['#07081c', '#1c1a48', '#5a2a5a']); }
    r.overlay(g => {
      const W = r.W, H = r.H, A_ = hubApi();
      if (HUB.phase === 'loading') text(g, 'CONNECTING...', W / 2, H / 2, '#ffffff', { align: 'center', scale: 2 });
      if (HUB.phase === 'card') hubCard(g, W, H);
      if (HUB.phase === 'countdown') { const t = A_ ? A_.time() : 0; E.font.title(g, t < -2000 ? '3' : t < -1000 ? '2' : t < 0 ? '1' : 'PLAY BALL!', W / 2, H / 2 - 20, { scale: 5, colors: GOLD, align: 'center' }); }
      if (HUB.phase === 'done' && !HUB.ended) banner(g, W, H, 'ROUND DONE', fmt(M.derby.score) + ' FT  ·  WAITING FOR THE OTHERS');
      if (HUB.phase === 'end') { px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, W, H, '#05060c')); title(g, 'ROUND OVER', W / 2, 30, 4); const pl = (HUB.info && HUB.info.players) || []; (HUB.standings || []).forEach((grp, i) => (Array.isArray(grp) ? grp : [grp]).forEach((id, j) => { const p = pl.find(q => q.id === id); if (p) text(g, (i + 1) + '.  ' + String(p.name).slice(0, 18), W / 2 - 60, 80 + (i + j) * 14, p.color || SEAT[id % 4], { scale: 1 }); })); }
    });
  }
};
const inR = (c, b) => c[0] >= b.x && c[0] < b.x + b.w && c[1] >= b.y && c[1] < b.y + b.h;
function hubCard(g, W, H) {
  const c = HUB.card || {}, pl = (HUB.info && HUB.info.players) || [], I = game.input;
  E.font.title(g, 'BATZOOKA', W / 2, 10, { scale: 4, colors: GOLD, align: 'center', depth: 3 }); text(g, 'BATZOOKA DERBY · ONLINE', W / 2, 46, '#c8d8ff', { align: 'center', scale: 2 });
  pl.forEach((p, i) => { const x = W / 2 - (pl.length - 1) * 40 + i * 80, y = 100, col = p.color || SEAT[p.id % 4], ready = (c.ready || []).includes(p.id);
    px.rect(g, x - 6, y - 30, 12, 26, col); px.disc(g, x, y - 34, 6, '#f0c8a8'); px.rect(g, x - 7, y - 41, 14, 4, col); px.line(g, x + 6, y - 22, x + 18, y - 40, '#c89a5a', 2);
    text(g, String(p.name).slice(0, 12), x, y + 2, col, { align: 'center' }); text(g, ready ? '✓ READY' : '...', x, y + 12, ready ? '#4fe0b0' : '#8a8ca8', { align: 'center' }); });
  text(g, 'HOW TO WIN: hit the most home-run feet in 2:00', W / 2, 132, '#ffffff', { align: 'center' });
  promptRow(g, I, [['up', 'AIM'], ['south', 'SWING'], ['west', 'POWER'], ['r1', 'BATZOOKA']], W / 2, 146, 'center');
  const left = c.left === null || c.left === undefined ? null : Math.ceil(c.left / 1000);
  text(g, c.starting ? 'Starting...' : c.paused ? 'Waiting for more time...' : left !== null ? 'Starting in ' + left + ' s' : '', W / 2, 166, '#ffe680', { align: 'center' });
  if (c.asked) text(g, 'You asked for more time', W / 2, 176, '#a8a8c8', { align: 'center' });
  HUB.readyBtn = { x: W / 2 - 110, y: H - 50, w: 100, h: 24 }; HUB.moreBtn = { x: W / 2 + 10, y: H - 50, w: 100, h: 24 };
  E.ui.box(g, HUB.readyBtn.x, HUB.readyBtn.y, 100, 24, { bg: ['#2a6a4a', '#1a4a32'], border: '#4fe0b0' }); const gw = glyph(g, I, 'confirm', HUB.readyBtn.x + 6, HUB.readyBtn.y + 6, 11); text(g, 'READY', HUB.readyBtn.x + 6 + gw + (100 - 12 - gw) / 2, HUB.readyBtn.y + 8, '#ffffff', { align: 'center' });
  E.ui.box(g, HUB.moreBtn.x, HUB.moreBtn.y, 100, 24, { bg: ['#4a3a7a', '#2a1c4a'], border: '#ffe680' }); const gm = glyph(g, I, 'north', HUB.moreBtn.x + 6, HUB.moreBtn.y + 6, 11); text(g, (I.lastDevice === 'gamepad' ? '' : '/ M  ') + 'MORE TIME', HUB.moreBtn.x + 6 + gm + (100 - 12 - gm) / 2, HUB.moreBtn.y + 8, '#ffffff', { align: 'center' });
}
// the card's "More time" key: M (the keyboard has no triangle)
if (typeof addEventListener !== 'undefined') addEventListener('keydown', e => { if (HUB.phase === 'card' && e.code === 'KeyM') { const A_ = hubApi(); if (A_) A_.answer('more'); } });
