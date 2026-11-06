// AudioSystem: registers every sound, spatial sfx, voices, ambience, footsteps and the music director (12 s minimum dwell).
import { THREE, spatialize } from '../../pixel-engine.js';
import { SFX, LOOPS } from './sfx.js';
import { SONGS } from './music.js';
import { plan, SYLLABLES } from './voice.js';

const V3 = THREE.Vector3;
export class AudioSystem {
  name = 'audio';
  song = ''; songSince = -99; stride = 0; chirpT = 0; loops = {}; right = new V3(); lastFar = 0;
  setup(g) {
    this.g = g; const a = g.ctx.audio; this.a = a;
    for (const [k, d] of Object.entries(SFX)) a.register(k, d);
    for (const [k, d] of Object.entries(LOOPS)) a.register('loop_' + k, d);
    this.rng = g.ctx.random.fork('audio');
    g.sfx = (name, o) => this.sfx(name, o);
    g.voice = (who, text, secs, pos) => this.say(who, text, secs, pos);
    const baseSay = g.say;
    g.say = (text, who = 'player', secs = 2) => { baseSay(text, who, secs); this.say(who, text, secs); };
    g.bark = (s, key) => g.barks?.(s, key);
    g.playMusic = (name, force) => this.music(name, force);
    this.wind = a.loop('loop_wind', { volume: 0 });
    this.fireLoop = a.loop('loop_fire', { volume: 0 });
  }
  listener(out) { const c = this.g.ctx.camera.camera; c.updateMatrixWorld?.(); this.right.set(1, 0, 0).applyQuaternion(c.quaternion); return { position: c.position, right: this.right }; }
  sfx(name, o = {}) {
    const g = this.g; if (g.life?.ended) return;
    let n = name, vol = o.volume ?? 1, pan = 0;
    if (o.pos) {
      const L = this.listener(); const s = spatialize(L, o.pos, { max: o.max || 160 });
      if (s.gain < 0.03) return; vol *= s.gain; pan = s.pan;
      const d = Math.hypot(o.pos.x - L.position.x, o.pos.z - L.position.z);
      if ((o.far || d > 70) && SFX[name + '_far']) n = name + '_far';
    }
    try { this.a.play(n, { volume: vol, pan, pitch: o.pitch || 0 }); } catch { /* sound unavailable */ }
  }
  say(who, text, secs = 2.5, pos) {
    const g = this.g; if (!text || (g.life?.ended)) return;
    const vs = g.voiceVolume ?? 1; if (vs <= 0) return;
    const p = plan(who, text, secs); let vol = vs * 0.8, pan = 0;
    if (pos) { const s = spatialize(this.listener(), pos, { max: 70 }); if (s.gain < 0.05) return; vol *= s.gain; pan = s.pan; }
    for (const syl of p.slice(0, 40)) g.ctx.tweens.call(syl.at, () => { try { this.a.play(SYLLABLES[syl.idx], { pitch: syl.pitch, volume: vol, pan }); } catch { /* none */ } });
    return p;
  }
  music(name, force) {
    const g = this.g; if (!name || name === this.song) return;
    const now = g.ctx.time + (g.frameWall || 0);
    if (!force && now - this.songSince < 12 && this.song && !['fever', 'end', 'title'].includes(name)) return;
    this.song = name; this.songSince = now; this.a.playMusic(SONGS[name], name);
  }
  wanted() {
    const g = this.g;
    if (g.mode === 'title' || g.screen === 'main' || g.screen === 'about') return 'title';
    if (g.endingNow) return 'end';
    if (g.body.fever.active) return 'fever';
    const pf = g.player.feet; let alert = false, sus = false;
    for (const s of g.soldierSys.list) if (s.alive) { const d = Math.hypot(s.pos.x - pf.x, s.pos.z - pf.z); if (d < 90) { if (s.state === 'alert') alert = true; else if (s.state !== 'idle') sus = true; } }
    if (alert || (g.fireSys.nearest && Math.hypot(g.fireSys.nearest.x - pf.x, g.fireSys.nearest.z - pf.z) < 60)) return 'fight';
    if (sus) return 'stalk';
    return g.isNight() ? 'night' : 'day';
  }
  fixed(g, dt) {
    if (g.life?.ended) return;
    if (g.step % 30 === 0) this.music(g.attract?.active ? this.attractSong || 'fight' : this.wanted());
    // footsteps
    if (g.canMove() && g.player.ctrl.grounded) {
      const sp = Math.sqrt(g.player.speed2 || 0); this.stride += sp * dt;
      const len = g.player.sprinting ? 2.4 : g.player.crouched ? 1.2 : 1.8;
      if (this.stride > len && sp > 0.5) { this.stride = 0; const f = g.player.feet, k = g.world.kindAt(f.x, f.z); this.sfx(k === 4 ? 'step_water' : k === 1 ? 'step_road' : k === 6 || k === 8 ? 'step_wood' : k === 0 ? 'step_grass' : 'step_dirt', { volume: g.player.crouched ? 0.4 : 0.8, pitch: this.rng.range(-2, 2) }); }
    }
  }
  frame(g, dt) {
    const w = g.world.wind;
    try { this.wind.set({ volume: Math.min(1, 0.04 + w.speed / 12) * 0.5 }); } catch { /* none */ }
    const fn = g.fireSys.nearest;
    try { if (fn) { const s = spatialize(this.listener(), { x: fn.x, y: g.player.feet.y, z: fn.z }, { max: 140 }); this.fireLoop.set({ volume: Math.min(1, s.gain * Math.min(1, fn.n / 12)), pan: s.pan }); } else this.fireLoop.set({ volume: 0 }); } catch { /* none */ }
    this.chirpT -= dt;
    if (this.chirpT <= 0 && g.canMove()) { this.chirpT = this.rng.range(1.5, 4); this.sfx(g.isNight() ? 'cricket' : this.rng.chance(0.5) ? 'chirp_a' : 'chirp_b', { volume: 0.5, pitch: this.rng.range(-3, 3) }); }
  }
  dispose() { try { this.a.stopLoops(); this.a.stopMusic(); } catch { /* none */ } }
  state() { return { song: this.song, music: +(this.a.volume?.music ?? 0).toFixed(2) }; }
}
