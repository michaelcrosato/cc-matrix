// The game's sound desk: effects, spatial play, music by state, voices, ambience, and the 10% music default.
import { updateAmbience } from './ambience.js';
import { spatialize, THREE } from '../../pixel-engine.js';
import { SFX_DEFS } from './sfx.js';
import { SONGS } from './music.js';
import { speak } from './voice.js';
const { Vector3 } = THREE;
const right = new Vector3(), pos = new Vector3();
const FROM = new THREE.Vector3(), DIR = new THREE.Vector3();
export class Sound {
  dwell = 0; want = null; current = null; voiceQ = []; voices = 1; sfx = 1; clock = 0;
  constructor(game) { this.game = game; }
  build(ctx) {
    this.ctx = ctx; const a = ctx.audio;
    for (const [n, d] of Object.entries(SFX_DEFS)) a.register(n, d);
    this.fire = a.loop('fire-loop', { volume: 0 }); this.windV = a.loop('wind-loop', { volume: 0 }); this.insects = a.loop('insects-loop', { volume: 0 }); this.birds = a.loop('birds-loop', { volume: 0 }); this.rain = a.loop('rain-loop', { volume: 0 });
  }
  play(name, o) { return this.ctx.audio.play(name, o); }
  listener() { const c = this.ctx.camera.camera; right.set(1, 0, 0).applyQuaternion(c.quaternion); c.getWorldPosition(pos); return { position: pos, right }; }
  /** How dull a sound at this place is: 0 in the open, 0.85 with something solid in the way. */
  muffleAt(x, y, z) {
    const ears = this.listener().position, phys = this.ctx.physics; if (!phys || !ears) return 0;
    FROM.set(ears.x ?? ears[0], ears.y ?? ears[1], ears.z ?? ears[2]); DIR.set(x - FROM.x, y - FROM.y, z - FROM.z); const d = DIR.length(); if (d < 1) return 0; DIR.divideScalar(d);
    const hit = phys.castRay(FROM, DIR, d - 0.5, undefined, this.game.player?.ctrl?.body);
    return hit ? 0.85 : 0;
  }
  at(name, x, y, z, max = 100, volume = 1) {
    const s = spatialize(this.listener(), { x, y, z }, { ref: 6, max });
    if (s.gain < 0.01) return;
    const blocked = this.muffleAt(x, y, z) > 0; // One-shots have no filter in the engine: behind a wall they use the far, muffled variant, quieter.
    // Far off, a gun is a thud, not a crack.
    const use = (s.distance > 90 || blocked) && this.ctx.audio.sounds.has(`${name}-far`) ? `${name}-far` : name;
    this.ctx.audio.play(use, { volume: Math.min(1, (use === name ? s.gain : Math.max(s.gain, 0.2)) * volume * (blocked ? 0.6 : 1)), pan: s.pan });
  }
  loopSfx(name, volume) { return this.ctx.audio.loop(name, { volume }); }
  scream(a) { this.at('scream', a.x, a.y + 1.4, a.z, 90, 1); }
  // Voices.
  voice(id, text, o = {}) {
    if (id === 'none') return; const v = speak(id, text), base = this.ctx.time;
    this.voiceQ = this.voiceQ.filter((q) => q.spatial);
    let t = 0; for (const s of v.list) { this.voiceQ.push({ at: t + this.voiceClock(), def: s.def, pitch: s.pitch, volume: (o.volume ?? 0.8), pan: o.pan ?? 0, spatial: !!o.spatial }); t = s.at; }
    void base; return v.duration;
  }
  voiceClock() { return this.clock; }
  voiceAt(id, text, a, seed) { const s = spatialize(this.listener(), { x: a.x, y: a.y + 1.4, z: a.z }, { ref: 5, max: 70 }); if (s.gain < 0.03) return; this.voice(id, text, { volume: s.gain, pan: s.pan, spatial: true }); void seed; }
  setMusic(name) { this.want = name; }
  update(dt) {
    const g = this.game, a = this.ctx.audio; this.clock += dt;
    // Voices run on the clock.
    if (this.voiceQ.length) { const keep = []; for (const q of this.voiceQ) { if (q.at <= this.clock) a.play(q.def, { pitch: q.pitch, volume: q.volume * g.settings.voices, pan: q.pan }); else keep.push(q); } this.voiceQ = keep; }
    this.dwell = Math.max(0, this.dwell - dt);
    if (this.want !== this.current && this.dwell <= 0) { this.current = this.want; a.playMusic(this.want ? SONGS[this.want] : null, this.want ?? 'none'); this.dwell = 12; }
    // Ambience.
    if (g.mode === 'boot') return;
    updateAmbience(this, g, dt);
  }
  sfxK() { return 1; }
  silence() { this.ctx.audio.stopMusic(); this.ctx.audio.stopLoops(); this.voiceQ = []; this.want = null; this.current = null; this.dead = true; }
}
