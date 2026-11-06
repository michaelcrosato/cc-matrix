// All sound goes through here: effects with pitch variants and panning, music, voices, ambience.
import { Rng, spatialize } from '../../pixel-engine.js';
import { SFX_DEFS } from '../data/sfx.js';
import { SONGS, ZONE_SONGS } from '../data/songs.js';
import { SPEAKERS } from '../data/dialog.js';
import { babble, SYLLABLES, VOICE_STYLES } from './voice.js';

const MUSIC_DEFAULT = 0.1;
const FLAG_KEY = 'diabellical:music-init';

export class AudioSys {
  constructor(game, ctx) {
    this.game = game;
    this.ctx = ctx;
    this.audio = ctx.audio;
    this.rng = new Rng('audio');
    this.lastPlay = new Map();
    this.queue = [];
    this.voiceClock = 0;
    this.voicesVol = 1;
    this.song = null;
    this.bossSong = null;
    this.loops = {};
    this.speaking = 0;
    for (const [k, d] of Object.entries(SFX_DEFS)) this.audio.register(k, d);
    for (const [k, d] of Object.entries(SYLLABLES)) this.audio.register(k, d);
    this.applyMusicDefault();
  }

  /** Music at 10% by default, whatever the engine's defaults, and after its Reset too. */
  applyMusicDefault() {
    const a = this.audio;
    let first = true;
    try { first = !(typeof localStorage !== 'undefined' && localStorage.getItem(FLAG_KEY)); } catch { first = true; }
    if (first) {
      a.setVolume('music', MUSIC_DEFAULT);
      try { if (typeof localStorage !== 'undefined') localStorage.setItem(FLAG_KEY, '1'); } catch { /* storage may be refused */ }
    }
    const orig = a.resetVolumes.bind(a);
    a.resetVolumes = () => { orig(); a.setVolume('music', MUSIC_DEFAULT); };
  }

  /** Effects: name, and optional x, z for space, pitch, volume. */
  sfx(name, o = {}) {
    let id = name;
    if (name === 'mon_attack' || name === 'mon_wake' || name === 'mon_death' || name === 'mon_hurt') {
      if (!o.v) return;
      id = `mon_${o.v}_${name.slice(4)}`;
    }
    if (name === 'cast_grunt') { if (this.rng.next() > 0.3) return; id = o.cls === 'bellwarden' ? 'grunt_low' : 'grunt_mid'; }
    if (!SFX_DEFS[id]) return;
    const now = this.game.frameTime ?? 0;
    const last = this.lastPlay.get(id) ?? -1;
    const gap = id.startsWith('hit_') || id === 'gold' ? 0.045 : 0.03;
    if (now - last < gap) return;
    this.lastPlay.set(id, now);
    let volume = o.volume ?? 1, pan = 0;
    if (o.x !== undefined && this.game.view) {
      const cam = this.game.view.cam;
      const dx = o.x - cam.x, dz = o.z - cam.z;
      const d = Math.hypot(dx, dz);
      if (d > 34) return;
      volume *= Math.min(1, 1.3 - d / 26);
      pan = Math.max(-0.8, Math.min(0.8, ((dx - dz) * 0.71) / 14));
    }
    const pitch = (o.pitch ?? 0) + (o.n ?? 0) + (id.startsWith('bell_true') || id.startsWith('ui_') ? 0 : this.rng.range(-1.2, 1.2));
    this.audio.play(id, { volume, pitch, pan });
  }

  // ---- Music --------------------------------------------------------------------------------
  music(id) {
    const song = id ? SONGS[id] : null;
    if (id === this.song) return;
    this.song = id;
    this.audio.playMusic(song, id ?? 'none');
  }
  zoneChanged(zone) {
    this.bossSong = null;
    this.music(ZONE_SONGS[zone.id] ?? 'under_gloam');
    this.ambience(zone);
  }
  bossMusic(id) { if (id) { this.bossSong = id; this.music(id); } }
  endBoss(zone) { this.bossSong = null; if (zone) this.music(ZONE_SONGS[zone.id] ?? 'under_gloam'); }
  setDrums(on) { if (this.song === 'eventide' && !on) this.music('eventide_bare'); }
  knellRising(high) { if (this.song === 'the_knell' && high) this.music('the_knell_high'); }

  ambience(zone) {
    this.stopAmbience();
    const b = zone.biome;
    const want = { yard: ['rain_loop'], causeway: ['rain_loop', 'wind_loop'], cloister: ['fire_loop'], belfry: ['wind_loop'], ossuary: ['wind_loop'], town: ['fire_loop'], pantry: ['wind_loop'] }[b] ?? [];
    for (const k of want) this.loops[k] = this.audio.loop(k, { volume: 0.55, muffle: k === 'wind_loop' ? 0.6 : 0.2 });
  }
  stopAmbience() { for (const v of Object.values(this.loops)) v.stop(); this.loops = {}; }
  loopAt() { return null; }

  // ---- Voices -------------------------------------------------------------------------------
  /** Say a line. Later lines replace what is left of the last one. */
  speak(who, text) {
    const style = SPEAKERS[who]?.voice ?? (VOICE_STYLES[who] ? who : 'narrator');
    const { syllables, duration } = babble(text, style);
    this.queue = syllables.map((s) => ({ ...s }));
    this.voiceClock = 0;
    this.speaking = duration;
    this.lastLine = { who, text, syllables: syllables.map((s) => s.name) };
    return duration;
  }

  bark(seat) {
    if ((this.barkT ?? 0) > (this.game.frameTime ?? 0)) return;
    this.barkT = (this.game.frameTime ?? 0) + 2;
    const h = this.game.world?.heroes?.find((o) => o.seat === seat);
    const cls = h?.cls ?? 'bellwarden';
    const barks = { bellwarden: ['bark_low', 'Not enough Clangor'], lamplighter: ['bark_mid', 'Not enough Wick'], sexton: ['bark_mid', 'Not enough Tithe'] }[cls] ?? ['bark_mid', 'No'];
    const { syllables } = babble(barks[1], barks[0]);
    for (const s of syllables) this.queue.push({ ...s, at: this.voiceClock + s.at });
  }

  update(realDt) {
    if (this.queue.length) {
      this.voiceClock += realDt;
      while (this.queue.length && this.queue[0].at <= this.voiceClock) {
        const s = this.queue.shift();
        this.audio.play(s.name, { pitch: s.pitch, volume: s.volume * this.voicesVol });
      }
    }
    if (this.speaking > 0) this.speaking -= realDt;
  }

  stopAll() {
    this.queue.length = 0;
    this.audio.playMusic(null);
    this.audio.stopLoops();
    this.loops = {};
    this.song = null;
  }
}

export { spatialize };
