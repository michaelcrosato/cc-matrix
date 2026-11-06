// Music: one song at a time, faded over the music channel. `level` is the player's setting (10% by
// default); fades only dip below it and always come back to it. Silence is part of the score.
export class Mix {
  constructor(audio, settings) {
    this.audio = audio;
    this.level = settings.music;
    this.current = null;
    this.pending = undefined;
    this.gain = 1;
    this.fade = 0; // seconds per full fade
    audio.setVolume('music', this.level);
  }

  setLevel(v) { this.level = v; this.audio.setVolume('music', v * this.gain); }

  /** Fade to `song` (a Song and a name), or to silence with null. */
  play(song, name, fade = 0.8) {
    if (name === this.current && this.pending === undefined) return;
    if (this.pending && this.pending.name === name) return;
    this.pending = { song, name };
    this.fade = fade;
    if (!this.current) { this.swap(); }
  }

  stop(fade = 0.6) { this.play(null, null, fade); }
  /** At once: a sting, the Foghorn. */
  cut() { this.pending = undefined; this.current = null; this.gain = 1; this.audio.stopMusic(); this.audio.setVolume('music', this.level); }

  swap() {
    const p = this.pending;
    this.pending = undefined;
    this.current = p.name;
    if (p.song) this.audio.playMusic(p.song, p.name);
    else this.audio.stopMusic();
  }

  /** Real seconds; runs through menus at timeScale 0 too. */
  update(dt) {
    if (this.pending !== undefined) {
      this.gain -= dt / Math.max(0.05, this.fade);
      if (this.gain <= 0) { this.gain = 0; this.swap(); }
    } else if (this.gain < 1) {
      this.gain = Math.min(1, this.gain + dt / Math.max(0.05, this.fade));
    }
    this.audio.setVolume('music', this.level * this.gain);
  }
}
