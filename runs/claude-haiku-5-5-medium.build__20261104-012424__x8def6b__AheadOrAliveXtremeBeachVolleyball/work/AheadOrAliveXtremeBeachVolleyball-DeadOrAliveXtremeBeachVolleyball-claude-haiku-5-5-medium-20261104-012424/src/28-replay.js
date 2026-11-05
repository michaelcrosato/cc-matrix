/* 28-replay: highlight replays. The last six seconds are kept (every frame at 60 Hz). After an ace, a stuffed block or a rally
 * of eight touches or more (at most one every three points, and never in a hub session), the last three seconds replay at
 * 0.4 speed with a letterbox and the serve camera. Any button skips it. The replay plays the recorded states back; nothing
 * in the live match moves while it plays. */
G.Match.prototype.recordFrame = function () {
  if (this.replay || this.o.hub) return;
  this.hist = this.hist || [];
  if (this.hist.length && this.t - this.hist[this.hist.length - 1].t < 1 / 60 - 1e-6) return;
  this.hist.push({ t: this.t, L: this.L, tossL: this.tossL, pl: this.players.map(p => ({ x: p.x, y: p.y, facing: p.facing, vx: p.vx, vy: p.vy, act: p.act, actT: p.actT, down: p.down, jumpY: p.jumpY || 0, dive: p.dive ? 1 : 0, diveT: p.diveT || 0 })) });
  while (this.hist.length && this.t - this.hist[0].t > 6) this.hist.shift();
};
G.Match.prototype.maybeReplay = function (why) {
  if (this.o.hub || this.replay) return;
  const big = why === 'ace' || why === 'block' || why === 'stuffed' || (this.stats.rallyLen >= 8);
  if (!big) return;
  if (this.lastReplayAt !== undefined && this.stats.points[0] + this.stats.points[1] - this.lastReplayAt < 3) return;
  if (!this.hist || this.hist.length < 60) return;
  this.lastReplayAt = this.stats.points[0] + this.stats.points[1];
  this.replayCount = (this.replayCount || 0) + 1;
  const end = this.t, start = Math.max(this.hist[0].t, end - 3);
  this.replay = { from: start, t: start, end, rate: .4, cam: G.serveCamView(), frames: this.hist.filter(f => f.t >= start - 1e-6) };
  this.replayHit = why;
  if (G.game) G.game.setView(this.replay.cam);
  this.commentate && this.commentate('ace');
};
G.Match.prototype.replayFrame = function (t) {
  const fr = this.replay.frames; let lo = 0, hi = fr.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (fr[m].t <= t) lo = m; else hi = m - 1; }
  return fr[lo];
};
G.Match.prototype.stepReplay = function (dt) {
  const R = this.replay, I = this.players.find(p => p.human);
  R.t += dt * R.rate;
  const skip = this.players.some(p => p.human && p.human.anyPressed && p.human.anyPressed());
  if (skip || R.t >= R.end) this.endReplay();
};
G.Match.prototype.endReplay = function () {
  this.replay = null;
  if (G.game) G.game.setView(G.courtView());
};
/* draws the recorded frame at the replay's time: the live positions are saved and put back */
G.Match.prototype.drawReplay = function (r) {
  const R = this.replay, f = this.replayFrame(R.t); if (!f) return;
  const saved = { t: this.t, L: this.L, players: this.players.map(p => [p.x, p.y, p.facing, p.vx, p.vy, p.act, p.actT, p.down, p.jumpY, p.dive, p.diveT]) };
  this.t = R.t; this.L = f.L;
  f.pl.forEach((s, i) => { const p = this.players[i]; Object.assign(p, { x: s.x, y: s.y, facing: s.facing, vx: s.vx, vy: s.vy, act: s.act, actT: s.actT, down: s.down, jumpY: s.jumpY, dive: s.dive ? { x: 0, y: 0 } : null, diveT: s.diveT }); });
  this.updateRigs(0);
  this.drawPlayers(r); this.drawBall(r);
  this.players.forEach((p, i) => { const v = saved.players[i]; Object.assign(p, { x: v[0], y: v[1], facing: v[2], vx: v[3], vy: v[4], act: v[5], actT: v[6], down: v[7], jumpY: v[8], dive: v[9], diveT: v[10] }); });
  this.t = saved.t; this.L = saved.L;
  const W = r.W, H = r.H;
  r.overlay(g => {
    E.px.rect(g, 0, 0, W, 16, '#000'); E.px.rect(g, 0, H - 16, W, 16, '#000');
    E.font.text(g, 'REPLAY', W - 8, 4, '#ff5fa2', { align: 'right', shadow: '#000' });
  });
};
