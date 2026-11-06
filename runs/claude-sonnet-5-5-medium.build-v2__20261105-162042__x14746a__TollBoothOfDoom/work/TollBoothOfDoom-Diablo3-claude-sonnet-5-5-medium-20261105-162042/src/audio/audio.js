// Game audio on top of the engine's synthesiser: sound effects with pitch variants, music by place, looping ambience, and
// Animalese-style babble voices (no real speech; the same line always sounds the same).
import { SFX } from '../data/sfx.js';
import { SONGS, ZONE_SONGS } from '../data/songs.js';
import { Rng } from '../../pixel-engine.js';

const VOWELS = [[700, 1200], [500, 1800], [320, 2300], [450, 800], [330, 700], [600, 1500], [400, 1100]];
const REG = { low: 110, mid: 190, high: 330, demon: 62 };
export const SPEAKERS = {
  narrator: { reg: 'low', pitch: -2, rate: 7, vol: 0.9, name: 'NARRATOR', color: 'sand' },
  crier: { reg: 'high', pitch: 2, rate: 13, vol: 0.9, name: 'CRIER MAUDLIN', color: 'sky' },
  brasse: { reg: 'low', pitch: -3, rate: 9, vol: 1.2, name: 'DAME BRASSE', color: 'orange', clip: true },
  ogive: { reg: 'mid', pitch: 1, rate: 5.5, vol: 0.6, name: 'MOTHER OGIVE', color: 'white' },
  penny: { reg: 'mid', pitch: 5, rate: 11, vol: 0.8, name: 'PENNYWHISTLE', color: 'lime' },
  ambrose: { reg: 'mid', pitch: 0, rate: 7, vol: 0.8, name: 'BISHOP AMBROSE', color: 'white' },
  bursar: { reg: 'low', pitch: -5, rate: 8, vol: 1.1, name: 'THE BURSAR', color: 'red', crush: true },
  malison: { reg: 'demon', pitch: 0, rate: 6, vol: 1.2, name: 'MALISON', color: 'cyan', echo: true, double: true },
  hero: { reg: 'mid', pitch: 0, rate: 10, vol: 0.7, name: '', color: 'white' },
};
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

export class GameAudio {
  constructor(ctx, game) {
    this.ctx = ctx; this.game = game; this.a = ctx.audio; this.rng = new Rng(77); this.queue = []; this.t = 0; this.voiceVol = 1; this.loops = {}; this.song = ''; this.unlockedPad = false; this.last = {}; this.counts = this.a.counts; this.camX = 0; this.camZ = 0;
    for (const [k, d] of Object.entries(SFX)) this.a.register(k, d);
    this.buildSyllables();
    // first run: music at 10%; Reset to defaults must put it back to 10%
    let first = true;
    try { first = typeof localStorage === 'undefined' || !localStorage.getItem('tbod:audio-init'); if (first && typeof localStorage !== 'undefined') localStorage.setItem('tbod:audio-init', '1'); } catch { /* storage may be blocked */ }
    if (first) this.a.setVolume('music', 0.1);
    const orig = this.a.resetVolumes.bind(this.a);
    this.a.resetVolumes = () => { orig(); this.a.setVolume('music', 0.1); this.voiceVol = 1; };
  }
  buildSyllables() {
    this.syl = {};
    for (const reg of Object.keys(REG)) {
      const base = REG[reg];
      for (let i = 0; i < 20; i++) {
        const v = VOWELS[i % VOWELS.length]; const cons = 800 + ((i * 7919) % 5) * 900; const glide = 0.85 + ((i * 31) % 7) * 0.05;
        const name = `v_${reg}_${i}`; const dur = 0.06 + (i % 4) * 0.012;
        const def = { wave: reg === 'demon' ? 'square' : 'sine', duty: 0.25, freq: base * (0.9 + (i % 5) * 0.08) * 2, freqEnd: base * (0.9 + (i % 5) * 0.08) * 2 * glide, decay: dur, volume: 0.22, attack: 0.004,
          layers: [{ wave: 'noise', freq: cons, decay: 0.03, volume: 0.1 }, { wave: 'sine', freq: v[0] * (reg === 'low' || reg === 'demon' ? 0.55 : 1), freqEnd: v[0] * 0.9, decay: dur * 0.9, volume: 0.09 }, { wave: 'sine', freq: v[1] * (reg === 'low' || reg === 'demon' ? 0.55 : 1), decay: dur * 0.6, volume: 0.05 }] };
        if (reg === 'demon') def.crush = 10;
        this.a.register(name, def); this.syl[name] = def;
      }
    }
    this.a.register('v_crush', { wave: 'square', freq: 90, decay: 0.07, volume: 0.1, crush: 6, freqEnd: 60 });
  }
  setMasterVoice(v) { this.voiceVol = v; }
  sfx(name, o = {}) {
    if (!SFX[name]) { if (name && !name.startsWith('v_')) return false; }
    // throttle identical sounds within a frame window
    const now = this.ctx.engine.frame; const k = name; if (this.last[k] === now && !o.always) return false; this.last[k] = now;
    let vol = o.volume ?? 1;
    if (o.x != null) { const d = Math.hypot(o.x - this.camX, o.z - this.camZ); vol *= Math.max(0.15, 1 - d / 40); }
    const pitch = (o.pitch || 0) + this.rng.range(-1.5, 1.5);
    return this.a.play(name, { pitch, volume: vol, pan: o.pan || 0 });
  }
  hitSound(e) {
    const mat = e.kind === 'rattlebones' || e.kind === 'choir_skull' || e.kind === 'skeleton' ? 'bone' : e.kind === 'prop' ? 'wood' : e.kind === 'unrung_font' || e.kind === 'clapperjaw' ? 'stone' : 'flesh';
    this.sfx('hit_' + mat, { x: e.x, z: e.z, pitch: e.crit ? 3 : 0 });
    if (e.crit) this.sfx('crit', { x: e.x, z: e.z });
  }
  music(key) {
    const id = ZONE_SONGS[key] || key; if (this.song === id) return; this.song = id;
    const s = SONGS[id]; this.a.playMusic(s || null, id);
  }
  stopMusic() { this.song = ''; this.a.playMusic(null); }
  ambience(kind, on = true) {
    const names = { rain: 'amb_rain', fire: 'amb_fire', wind: 'amb_wind' }; const n = names[kind];
    for (const k of Object.keys(this.loops)) if (k !== n && this.loops[k]) { try { this.loops[k].stop && this.loops[k].stop(); } catch {} this.loops[k] = null; }
    if (!n || !on) return;
    if (!this.loops[n]) { try { this.loops[n] = this.a.loop(n, { volume: 0.5 }); } catch { /* no audio */ } }
  }
  stopAll() { try { this.a.stopLoops(); this.a.stopMusic(); } catch {} this.loops = {}; this.song = ''; this.queue = []; }
  /** Speak a line as babble. Returns its duration in seconds. */
  speak(text, who = 'hero') {
    const sp = SPEAKERS[who] || SPEAKERS.hero; const reg = sp.reg;
    const letters = text.toLowerCase(); let t = 0; const out = []; let word = '';
    const flush = () => {
      if (!word) return;
      for (let i = 0; i < word.length; i += 2 + (hash(word + i) % 2)) {
        const chunk = word.slice(i, i + 3); const idx = hash(chunk) % 20;
        out.push({ t, name: `v_${reg}_${idx}`, pitch: sp.pitch + ((hash(chunk + 'p') % 7) - 3) * 0.6, vol: sp.vol });
        if (sp.double) out.push({ t, name: `v_${reg}_${(idx + 7) % 20}`, pitch: sp.pitch - 12, vol: sp.vol * 0.8 });
        if (sp.echo) out.push({ t: t + 0.16, name: `v_${reg}_${idx}`, pitch: sp.pitch - 7, vol: sp.vol * 0.35 });
        if (sp.crush) out.push({ t, name: 'v_crush', pitch: sp.pitch, vol: sp.vol * 0.6 });
        t += 1 / sp.rate;
      }
      word = '';
    };
    for (const ch of letters) {
      if (/[a-z0-9']/.test(ch)) word += ch;
      else { flush(); if (ch === ',' || ch === ';' || ch === ':') t += 0.14; else if (ch === '.' || ch === '!' || ch === '?') { if (out.length && ch === '!') out[out.length - 1].pitch += 3; if (out.length && ch === '?') { out[out.length - 1].pitch += 4; } t += 0.26; } else t += 0.04; }
    }
    flush();
    for (const o of out) this.queue.push({ at: this.t + o.t, ...o });
    this.speaking = Math.max(this.speaking || 0, this.t + t);
    return t;
  }
  stopVoice() { this.queue = []; this.speaking = 0; }
  update(dt, cam) {
    this.t += dt; if (cam) { this.camX = cam.x; this.camZ = cam.z; }
    if (this.queue.length) {
      const due = this.queue.filter((q) => q.at <= this.t);
      if (due.length) { this.queue = this.queue.filter((q) => q.at > this.t); for (const q of due) this.a.play(q.name, { pitch: q.pitch, volume: q.vol * this.voiceVol * 0.9 }); }
    }
  }
}
