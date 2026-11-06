// MusicDirector: changes tracks at bar lines, from the stage and the vitals. loadGame clears music, so each stage restarts it.
import { songById, SONGS } from '../content/songs.js';
export class MusicDirector {
  constructor() { this.cur = null; this.want = null; this.barT = 0; this.t0 = 0; this.song = null; this.bpm = 0; }
  start(ctx, id, now = 0) { this.cur = null; this.want = id; this.ctx = ctx; this.apply(id, now, true); }
  request(id) { this.want = id; }
  apply(id, now, force) {
    const base = id === 'silence' ? null : songById(id);
    this.cur = id; this.song = base; this.bpm = base?.bpm || 0; this.t0 = now; this.barT = base ? 240 / base.bpm : 1e9;
    this.ctx?.audio.playMusic(base, id || 'none');
  }
  update(now, { vitals = 99, heartBpm = 0, base = null } = {}) {
    let want = this.want;
    if (base && (want === 'or-calm' || want === 'or-tense' || want === 'or-critical' || want === null)) want = vitals < 22 ? 'or-critical' : vitals < 45 ? 'or-tense' : base;
    if (want === 'boss-wrath' && heartBpm && Math.abs(heartBpm - this.bpm) >= 3 && this.cur?.startsWith?.('boss-wrath')) {
      const bar = this.barT, ph = (now - this.t0) % bar;
      if (ph < 0.06 || bar - ph < 0.06) { const s = { ...SONGS['boss-wrath'], bpm: heartBpm }; this.song = s; this.bpm = heartBpm; this.t0 = now; this.barT = 240 / heartBpm; this.ctx?.audio.playMusic(s, 'boss-wrath@' + Math.round(heartBpm)); }
      return;
    }
    if (want !== this.cur && want !== undefined) {
      const bar = this.barT, ph = bar > 1e8 ? 0 : (now - this.t0) % bar;
      if (this.song === null || ph < 0.05 || bar - ph < 0.05 || now - this.t0 > bar * 2) this.apply(want, now, false);
    }
  }
}
