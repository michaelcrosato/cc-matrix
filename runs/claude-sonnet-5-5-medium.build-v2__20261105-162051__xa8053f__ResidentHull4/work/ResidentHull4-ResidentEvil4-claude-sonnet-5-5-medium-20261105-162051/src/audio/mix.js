// Music through a small fader: fade down, swap, fade up to the player's level. Silence is part of the score.
import { SONGS } from './songs.js';
import { settings } from '../core/settings.js';
export class Mix {
  constructor(audio) { this.audio = audio; this.cur = null; this.want = null; this.gain = 1; this.fade = 0; this.state = 'idle'; this.pending = false; }
  play(name) { if (name === this.want) return; this.want = name; this.pending = true; }
  stop() { this.play(null); }
  /** Call every frame with real-ish dt (menus too). */
  update(dt) {
    const a = this.audio;
    const level = settings.music;
    if (this.pending) {
      if (this.cur && this.gain > 0.02) { this.gain = Math.max(0, this.gain - dt / 0.35); }
      else {
        if (this.cur) this.gain = 0;
        if (this.want) a.playMusic(SONGS[this.want], this.want); else a.stopMusic();
        this.cur = this.want; this.pending = false;
      }
    } else if (this.gain < 1) this.gain = Math.min(1, this.gain + dt / 0.6);
    a.setVolume('music', level * this.gain);
  }
}
