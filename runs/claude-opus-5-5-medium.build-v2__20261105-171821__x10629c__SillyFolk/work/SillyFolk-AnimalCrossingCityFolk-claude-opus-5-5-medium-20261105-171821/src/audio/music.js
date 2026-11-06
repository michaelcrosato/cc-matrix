// What plays now. Priority: script override → venue → home stereo → hourly tune. Music defaults to 10% on a fresh profile.
import { G } from '../state.js';
import { SONGS, hourlySong } from './composer.js';
import { SFX_DEFS, AMBIENCE } from './sfx.js';
import { registerVoices } from './voice.js';
import { storage } from '../core/storage.js';
import { hourOf } from '../core/calendar.js';
export const MUSIC_DEFAULT = 0.1;
export function initAudio(audio) {
  if (!storage.get('pixel-engine:audio') && !(storage.get('sillyfolk:audio-set'))) { audio.setVolume('music', MUSIC_DEFAULT); storage.set('sillyfolk:audio-set', '1'); }
  else if (!storage.get('sillyfolk:audio-set')) { audio.setVolume('music', MUSIC_DEFAULT); storage.set('sillyfolk:audio-set', '1'); }
  const reset = audio.resetVolumes.bind(audio); audio.resetVolumes = () => { reset(); audio.setVolume('music', MUSIC_DEFAULT); };
  for (const [k, d] of Object.entries(SFX_DEFS)) audio.register(k, d);
  registerVoices(audio);
}
export const M = { override: null, venue: null, current: null, stings: 0, cache: new Map() };
const hourly = (h, wx) => { const k = `h${h}-${wx}`; let s = M.cache.get(k); if (!s) { s = hourlySong(h, wx); M.cache.set(k, s); } return s; };
export function chooseMusic() {
  const w = G.world;
  if (M.override) return [M.override, SONGS[M.override]];
  if (!w) return ['title', SONGS.title];
  if (G.mode === 'title' || G.mode === 'attract') return ['title', SONGS.title];
  if (w.p.place === 'home' || w.p.place === 'home_annex' || w.p.place === 'home_up') { const st = w.home.stereo; if (st) return ['rec-' + st, SONGS[st]]; }
  if (M.venue) return [M.venue, SONGS[M.venue]];
  if (w.p.place === 'city') { const h = hourOf(w.clock); return h >= 18 || h < 6 ? ['cityNight', SONGS.cityNight] : ['cityDay', SONGS.cityDay]; }
  const h = hourOf(w.clock), wx = G.view?.weatherKind === 'rain' || G.view?.weatherKind === 'storm' ? 'rain' : G.view?.weatherKind === 'snow' ? 'snow' : 'clear';
  return [`h${h}-${wx}`, hourly(h, wx)];
}
export function updateMusic(audio) { const [k, s] = chooseMusic(); if (k !== M.current) { M.current = k; if (s) audio.playMusic(s, k); else audio.stopMusic(); } }
export function ambienceLoops(audio) { const o = {}; for (const [k, d] of Object.entries(AMBIENCE)) o[k] = audio.loop(d, { volume: 0 }); return o; }
export function playChime(audio, chime, harmon = false) { let t = 0; const base = 0; chime.forEach((n, i) => { if (!n) return; G.chimeQueue ??= []; G.chimeQueue.push({ at: G.time + i * 0.18, note: n, harmon }); }); }
export function updateChime(audio) { const q = G.chimeQueue; if (!q) return; while (q.length && q[0].at <= G.time) { const c = q.shift(); audio.play('bellTone', { pitch: c.note - 12, volume: 0.8 }); if (c.harmon) audio.play('bellTone', { pitch: c.note - 8, volume: 0.5 }); } }
