// The music director: changes tracks at bar lines, follows vitals in surgery, keeps Dies Irae on the
// heart's tempo. `loadGame` clears music, so each stage calls `onStage()`.
import { barSeconds, SONGS } from '../content/songs.js';

const OR_FAMILY = new Set(['or-calm', 'or-tense', 'or-critical']);

export class MusicDirector {
  constructor() {
    this.audio = null;
    this.current = null; // id playing
    this.pending = null; // { id, song }
    this.startedAt = 0;
    this.clock = 0;
    this.bpmOverride = null;
    this.moodBase = null;
  }
  attach(audio) { this.audio = audio; }
  onStage() {
    // A level load stopped the music: bring back whatever we were playing, or what's pending.
    if (this.pending) { this._start(this.pending.id, this.pending.song); this.pending = null; return; }
    if (this.current) this._start(this.current, this._songFor(this.current));
  }
  _songFor(id) {
    if (!id || id === 'silence') return null;
    const s = SONGS[id];
    if (!s) return null;
    return this.bpmOverride && id === 'boss-diesirae' ? { ...s, bpm: this.bpmOverride } : s;
  }
  _start(id, song) {
    this.current = id;
    this.startedAt = this.clock;
    this.currentSong = song;
    this.audio?.playMusic(song ?? null, id ?? 'none');
  }
  /** Change music now (between stages) or at the next bar line. */
  play(id, { now = false } = {}) {
    if (id === this.current && !this.pending) return;
    if (this.pending?.id === id) return;
    const song = this._songFor(id);
    if (now || !this.currentSong) { this.pending = null; this._start(id, song); return; }
    this.pending = { id, song };
  }
  /** Follow the vitals inside the or-* family. */
  mood(vitals) {
    if (!OR_FAMILY.has(this.current) && !OR_FAMILY.has(this.pending?.id)) return;
    const want = vitals < 22 ? 'or-critical' : vitals < 45 ? 'or-tense' : this.moodBase ?? this.current;
    if (want !== (this.pending?.id ?? this.current)) this.play(want);
  }
  setBase(id) { this.moodBase = OR_FAMILY.has(id) ? id : null; }
  /** The heart's tempo: two steps a heartbeat, restarted at bar lines. */
  heartTempo(bpm) {
    const b = Math.round(bpm * 2);
    if (this.current !== 'boss-diesirae' || this.bpmOverride === b) return;
    this.bpmOverride = b;
    this.pending = { id: 'boss-diesirae', song: { ...SONGS['boss-diesirae'], bpm: b } };
  }
  update(dt) {
    this.clock += dt;
    if (!this.pending) return;
    const song = this.currentSong;
    const bar = song ? barSeconds(song) : 0;
    const t = this.clock - this.startedAt;
    if (!song || bar <= 0 || t % bar < dt * 1.5) {
      const p = this.pending;
      this.pending = null;
      this._start(p.id, p.song);
    }
  }
  stop() {
    this.pending = null;
    this.current = null;
    this.currentSong = null;
    this.bpmOverride = null;
    this.audio?.playMusic(null);
  }
}
