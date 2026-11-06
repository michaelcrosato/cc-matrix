// Picks tracks from vitals and stage; changes at bar lines so a switch sounds intentional.
import { SONGS } from '../content/songs.js';
export class MusicDirector {
  current = null; want = null; barT = 0; bpmApplied = 0;
  constructor(audio) { this.audio = audio; }
  play(id) { this.want = id; if (this.current === null) this.apply(); }
  stopNow() { this.want = null; this.current = null; this.audio.playMusic(null); }
  apply() {
    if (this.want === this.current) return;
    this.current = this.want;
    if (!this.want || this.want === 'silence') { this.audio.playMusic(null); this.barT = 1; return; }
    const song = SONGS[this.want];
    if (song) { this.audio.playMusic(song, this.want); this.barT = this.barLen(song); }
  }
  barLen(song) { return (16 / (song.stepsPerBeat ?? 4)) * (60 / song.bpm); }
  /** Dies Irae's tempo follows the heart: restart with a new bpm at bar lines. */
  setBpm(bpm) {
    if (this.current !== 'boss-irae' && this.current !== 'boss-libera') return;
    const song = { ...SONGS[this.current], bpm };
    if (Math.abs(bpm - this.bpmApplied) >= 6) { this.bpmApplied = bpm; this.pending = song; }
  }
  update(dt, vitals = null, base = null) {
    let want = this.want;
    if (base && vitals != null && (base === 'or-calm' || base === 'or-tense' || base === 'or-critical')) want = vitals < 30 ? 'or-critical' : vitals < 50 && base === 'or-calm' ? 'or-tense' : base;
    this.want = want;
    this.barT -= dt;
    if (this.barT <= 0) {
      if (this.pending) { this.audio.playMusic(this.pending, this.current); this.barT = this.barLen(this.pending); this.pending = null; }
      else if (this.want !== this.current) this.apply();
      else if (this.current && SONGS[this.current]) this.barT = this.barLen(SONGS[this.current]);
      else this.barT = 0.5;
    }
  }
}
