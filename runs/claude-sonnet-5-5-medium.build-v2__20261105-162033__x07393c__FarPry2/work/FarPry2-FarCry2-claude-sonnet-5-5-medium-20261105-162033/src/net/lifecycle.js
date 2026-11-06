// Round lifecycle shared by every session kind: start, time-up, leave, end. The round rules plug in via g.round.
export class Lifecycle {
  name = 'lifecycle';
  started = false; ended = false; finished = false; left = new Set(); endReason = null;
  constructor(session) { this.session = session; }
  setup(g) {
    this.g = g;
    const s = this.session;
    s.on('start', () => { this.started = true; g.round?.onStart?.(); });
    s.on('time-up', () => this.finish('time-up'));
    s.on('leave', (m) => {
      this.left.add(m.id);
      g.round?.onLeave?.(m.id);
      const alive = s.players.filter((p) => !this.left.has(p.id));
      if (s.isHost && alive.length === 0) this.finish('empty');
    });
    s.on('end', (m) => {
      this.ended = true; this.endReason = m && m.reason;
      const a = g.ctx?.audio; a?.stopMusic?.(); a?.stopLoops?.();
      if (a && a.setVolume) { a.setVolume('master', 0); }
      g.round?.onEnd?.();
    });
  }
  finish(why) {
    if (this.finished || !this.session.isHost) return;
    this.finished = true;
    const g = this.g, s = this.session;
    const res = g.round?.results?.() || { standings: [s.players.map((p) => p.id).filter((id) => !this.left.has(id) || true)], scores: {} };
    s.finish(res);
  }
  fixed() { if (this.session.isHost && this.started && !this.finished && this.g.round?.over?.()) this.finish('round-over'); }
}
