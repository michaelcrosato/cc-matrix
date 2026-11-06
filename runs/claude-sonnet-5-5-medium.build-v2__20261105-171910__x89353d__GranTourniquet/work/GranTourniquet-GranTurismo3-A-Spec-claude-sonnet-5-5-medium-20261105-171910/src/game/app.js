// App: profile, settings, input, UI, audio mix and scene switching. One instance for the whole page.
import { Actions } from './input/actions.js';
import { UI } from './ui/ui.js';
import { newProfile, migrate, defaultSettings } from './sim/career.js';
import { SAVE_KEY } from './data/meta.js';
export const App = {
  engine: null, profile: null, actions: new Actions(), ui: new UI(), mix: null, scenes: {}, hub: null, touchOnly: false, hubActive: false, couch: null,
  dev: { on: false, sliders: {}, tags: false }, lastRace: null, pendingScreen: null, savedOk: true, params: new URLSearchParams(typeof location !== 'undefined' ? location.search : ''),
};
export function loadProfile() {
  let p = null; try { const s = typeof localStorage !== 'undefined' && !App.hubActive ? localStorage.getItem(SAVE_KEY) : null; if (s) p = migrate(JSON.parse(s)); } catch { p = null; }
  App.profile = p ?? newProfile(); App.fresh = !p; return App.profile;
}
export function saveProfile() { if (App.hubActive || App.dev.changed) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(App.profile)); App.savedOk = true; } catch { App.savedOk = false; } }
export function resetProfile() { App.profile = newProfile(); try { localStorage.removeItem(SAVE_KEY); } catch {} saveProfile(); applySettings(); }
export const S = () => App.profile.settings;
// Apply the player's settings to the engine and input.
export function applySettings() {
  const e = App.engine, s = S(); if (!e) return;
  App.ui.xbox = s.glyphs === 'xbox'; App.actions.cfg.response = s.steerResponse; App.actions.cfg.mouseSteer = s.mouseSteer;
  try { e.settings.set({ look: s.look === 'none' ? undefined : s.look, pixelSize: s.pixelSize, fps: s.fps }); } catch {}
  if (App.mix) App.mix.voiceVol = s.voices;
}
// Music defaults to 10% on a fresh profile and in every hub round. (Engine fact 3: resetVolumes() restores 0.6, so reset sets 0.1 again.)
export function initVolumes(audio) {
  audio.persist = !App.hubActive;
  if (App.hubActive || !App.profile.flags.audioInit) { audio.setVolume('music', 0.1); App.profile.flags.audioInit = true; if (!App.hubActive) saveProfile(); }
}
export function resetVolumes(audio) { audio.resetVolumes(); audio.setVolume('music', 0.1); S().voices = 0.8; if (App.mix) App.mix.voiceVol = 0.8; }
export const kmh = (u) => u * 3.6;
export const speedStr = (u) => (S().units === 'mph' ? Math.round(u * 2.23694) : Math.round(u * 3.6));
export const unitStr = () => (S().units === 'mph' ? 'MPH' : 'KM/H');
export function fmtTime(t, d = 2) { if (t == null || !isFinite(t)) return '-:--.' + '-'.repeat(d); const m = Math.floor(t / 60), s = t - m * 60; return (m ? m + ':' + (s < 10 ? '0' : '') : '') + s.toFixed(d); }
export function fmtGap(t) { return t == null ? '' : (t >= 0 ? '+' : '-') + Math.abs(t).toFixed(1); }
export const money = (n) => Math.round(n).toLocaleString('en-US') + ' CR';
export function safeName(s, i) { const t = String(s ?? '').toUpperCase().replace(/[^A-Z0-9 .\-!?:'+/]/g, ''); return t.trim() ? t.slice(0, 12) : 'P' + (i + 1); }
