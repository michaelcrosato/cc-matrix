// Fades between songs. Silence is part of the score.
import { SONGS } from './songs.js';
export class Mix {
  constructor(app) { this.app = app; this.current = null; this.scale = 1; this.fade = null; }
  /** Play a song by name (null: silence), fading through the user's level. */
  play(name, fade = 0.6) { if (name === this.current && !this.fade) return; this.fade = { to: name, t: 0, dur: fade, phase: this.current ? 'out' : 'in' }; if (!this.current) this._swap(name); }
  _swap(name) { const a = this.app.engine.audio; this.current = name; if (name) a.playMusic(SONGS[name], name); else a.stopMusic(); }
  update(dt) {
    if (!this.fade) return;
    const f = this.fade; f.t += dt;
    const k = Math.min(1, f.t / Math.max(0.01, f.dur));
    if (f.phase === 'out') { this.setScale(1 - k); if (k >= 1) { this._swap(f.to); f.phase = 'in'; f.t = 0; } } else { this.setScale(k); if (k >= 1) { this.fade = null; this.setScale(1); } }
  }
  setScale(s) { this.scale = s; this.app.engine.audio.setVolume('music', this.app.settings.music * s); }
  stop() { this.fade = null; this.current = null; const a = this.app.engine.audio; a.stopMusic(); }
}
