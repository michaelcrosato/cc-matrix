// ---- AI Hub sessions (5.17): Session Protocol v1, parallel mode, 1-4 players. Each copy plays the same seeded over
// from the Thrumptonator at the Megadome; our own card before the start; progress after every ball; one result; an
// immediate result at time-up; at the end, no input and no sound.
const HUBS = { info: null, card: null, phase: 'connecting', sent: { progress: 0, result: 0 }, ended: null, deliveries: null, started: false };
function hubConnect() {
  if (!HUB) return;
  game.hubActive = true;
  HUB.connect({ mode: 'parallel', seats: [1, 4], card: true }).then(info => {
    if (!info) { HUBS.phase = 'none'; game.hubActive = false; game.go('title'); return; }
    HUBS.info = info; HUBS.phase = 'card';
    // the round from the seed: six deliveries, the same on every copy whatever anyone presses
    const R = HUB.rng('over'), kinds = ['piston', 'steamBouncer', 'spinCycle', 'piston', 'steamBouncer', 'piston'];
    HUBS.deliveries = kinds.map((d, k) => ({ del: d, target: [-(1 + R() * 7), d === 'steamBouncer' ? 165 + R() * 15 : d === 'spinCycle' ? 70 + R() * 30 : 50 + R() * 70], grade: 'green', special: k === 5 }));
    HUBS.seed = (info.seed >>> 0) || 1;
    HUB.on('card', c => { HUBS.card = c; });
    HUB.on('start', () => { HUBS.started = true; HUBS.phase = 'countdown'; game.go('match', { cfg: hubConfig() }, { fade: 0 }); });
    HUB.on('time-up', () => { hubResult(true); });
    HUB.on('end', d => { HUBS.ended = d && d.reason === 'sat-out' ? 'You sat this one out' : 'Round over'; HUBS.phase = 'end'; game.input.clear(); game.input.consumeAll(); try { game.audio.music(null); game.audio.mute && game.audio.mute(true); } catch (e) { /* no sound */ } crowdSilence(); });
    game.go('hubcard', {}, { fade: 0 });
    HUB.ready();
  });
}
function hubConfig() {
  const script = { k: 0, next(what) { if (what !== 'bowl') return null; return HUBS.deliveries[Math.min(5, this.k++)]; } };
  return { mode: 'hub', teams: ['ker', 'thr'], ground: 'dome', timeOfDay: 'night', weather: 'clear', overs: 1, wickets: 2, kerfuffle: true, humans: [[game.input], []], batFirst: 'ker', single: true, superOver: false, script, seed: HUBS.seed, order: { ker: ['edie', 'dev', 'pip'] }, noReplays: true, difficulty: 'county', reviews: 0 };
}
function hubProgress(m) {
  if (!HUB || !HUBS.info || HUBS.sent.result || HUBS.ended) return;
  const I = m.I; HUB.progress({ score: I.runs, label: I.runs + '/' + I.wkts + ' (' + I.legal + ' balls)' }); HUBS.sent.progress++;
}
function hubResult(now) {
  if (!HUB || !HUBS.info || HUBS.sent.result || HUBS.ended) return;
  const m = MATCH && MATCH.cfg.mode === 'hub' ? MATCH : null, I = m ? m.I : { runs: 0, wkts: 0, fours: 0, sixes: 0 };
  const best = m && m.records.filter(r => r.shot).sort((a, b) => (b.runs + (b.boundary || 0)) - (a.runs + (a.boundary || 0)))[0];
  HUB.result({ score: I.runs, stats: { boundaries: (I.fours || 0) + (I.sixes || 0), sixes: I.sixes || 0, 'best shot': best && SHOT[best.shot] ? SHOT[best.shot].name : 'none' } });
  HUBS.sent.result++; HUBS.phase = 'waiting';
}
on('ball:done', () => { if (MATCH && MATCH.cfg.mode === 'hub') hubProgress(MATCH); });
on('match:end', () => { if (MATCH && MATCH.cfg.mode === 'hub') hubResult(); });
on('match:start', d => { if (d.mode === 'hub' && MATCH) hubProgress(MATCH); });
SC.hubcard = {
  enter() { this.t = 0; music('showdown'); const R = HUB ? HUB.rng('card') : E.rng(3); this.stars = Array.from({ length: 40 }, () => [R(), R(), .3 + R()]); },
  update(dt) {
    this.t += dt; if (HUBS.ended) return;
    const I = game.input;
    if (I.pressed('confirm') || I.pressed('shot') || I.pressed('start')) HUB && HUB.answer('ready');
    if (I.pressed('special') || I.pressed('more')) HUB && HUB.answer('more');
    const c = I.clicked && I.clicked();
    if (c && this.btns) { if (inR(c, this.btns[0])) HUB.answer('ready'); else if (inR(c, this.btns[1])) HUB.answer('more'); }
  },
  draw(r) {
    drawBackdrop(r, 1 / 60, { gid: 'dome', time: 'night' });
    r.overlay(g => {
      const W = r.W, H = r.H; px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, W, H, '#05040e'));
      for (const [x, y, s] of this.stars) px.dot(g, Math.floor(x * W), Math.floor((y * H + this.t * 20 * s) % H), '#8a8ac8');
      bigTitle(g, 'CRICKET KERFUFFLE', W / 2, 10, { scale: 2 });
      E.font.text(g, 'SUPER OVER AT THE MEGADOME', W / 2, 30, '#c890ff', { align: 'center', shadow: '#000' });
      E.font.text(g, 'MOST RUNS FROM ONE OVER WINS: 6 BALLS, 2 WICKETS', W / 2, 44, '#ffd23a', { align: 'center', shadow: '#000' });
      const info = HUBS.info, card = HUBS.card || {};
      if (info) info.players.forEach((p, k) => { const y = 60 + k * 14, ready = (card.ready || []).includes(p.id); panel(g, W / 2 - 110, y, 220, 12, { alpha: .6, rule: p.color }); px.rect(g, W / 2 - 110, y, 4, 12, p.color); E.font.text(g, String(p.name).slice(0, 24) + (p.id === info.me ? ' (YOU)' : ''), W / 2 - 100, y + 3, '#f4f0e0'); E.font.text(g, ready ? 'READY •'.replace('•', '•') : '...', W / 2 + 104, y + 3, ready ? '#5fd38a' : '#8a84a8', { align: 'right' }); });
      const y0 = 124;
      prompts(g, game.input, [['left', 'Aim'], ['shot', 'Hit'], ['loft', 'Loft'], ['block', 'Defend'], ['run', 'Run']], W / 2, y0, { align: 'center' });
      let msg = 'GET READY...';
      if (card.starting) msg = 'STARTING...'; else if (card.paused) msg = 'PAUSED: MOST PLAYERS WANT MORE TIME'; else if (card.left !== null && card.left !== undefined) msg = 'STARTS IN ' + Math.ceil(card.left / 1000) + ' S';
      E.font.text(g, msg, W / 2, y0 + 16, card.paused ? '#ffd23a' : '#f4f0e0', { align: 'center', scale: 2, shadow: '#000' });
      const bw = 90; this.btns = [[W / 2 - bw - 6, H - 44, bw, 20], [W / 2 + 6, H - 44, bw, 20]];
      const asked = card.asked, me = info && (card.ready || []).includes(info.me);
      px.rect(g, ...this.btns[0], me ? '#2a6a3a' : '#5fd38a'); E.font.text(g, 'READY', this.btns[0][0] + bw / 2 + 14, H - 38, '#101018', { align: 'center' , outline: false, shadow: false }); glyph(g, game.input, 'confirm', this.btns[0][0] + 6, H - 34);
      px.rect(g, ...this.btns[1], asked ? '#8a6a1a' : '#ffd23a'); E.font.text(g, 'MORE TIME', this.btns[1][0] + bw / 2 + 8, H - 38, '#101018', { align: 'center' , outline: false, shadow: false }); glyph(g, game.input, 'special', this.btns[1][0] + 4, H - 34);
      if (HUBS.ended) { panel(g, 0, H / 2 - 16, W, 32); E.font.text(g, upper(HUBS.ended), W / 2, H / 2 - 6, '#ffd23a', { align: 'center', scale: 2 }); }
    });
  }
};
const inR = (p, r) => p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[3];
function hubTime() { return HUB && HUB.time ? HUB.time() : 0; }
function drawHubHud(g, r, m) {
  const W = r.W, H = r.H, t = hubTime();
  if (t < 0 && isFinite(t)) bigTitle(g, String(Math.ceil(-t / 1000)), W / 2, H / 2 - 30, { scale: 4 });
  else if (HUBS.phase === 'countdown' && m.t < 1) bigTitle(g, 'PLAY!', W / 2, H / 2 - 30, { scale: 4 });
  if (HUBS.phase === 'waiting' && !HUBS.ended) { panel(g, 0, H / 2 - 14, W, 28); E.font.text(g, 'WAITING FOR THE OTHERS...', W / 2, H / 2 - 6, '#f4f0e0', { align: 'center', scale: 2 }); }
  if (HUBS.ended) { panel(g, 0, H / 2 - 16, W, 32); E.font.text(g, upper(HUBS.ended), W / 2, H / 2 - 6, '#ffd23a', { align: 'center', scale: 2 }); }
}
// the hub's round waits for AIHub.time() >= 0 and stops for good at the end
const _matchUpdate = SC.match.update;
SC.match.update = function (dt) {
  const m = this.m;
  if (m && m.cfg.mode === 'hub') {
    if (HUBS.ended) { game.input.consumeAll(); return; }
    const t = hubTime(); if (t < 0) { director(m, dt); return; }
    if (m.state === 'over') { hubResult(); director(m, dt); hudStep(dt); return; }
  }
  return _matchUpdate.call(this, dt);
};
