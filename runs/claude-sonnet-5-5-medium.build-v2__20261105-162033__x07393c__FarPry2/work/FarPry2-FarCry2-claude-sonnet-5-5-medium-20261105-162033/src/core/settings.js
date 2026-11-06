// Player settings: one versioned localStorage entry of our own, re-applied at boot. Music defaults to 10%.
export const SETTINGS_KEY = 'farpry2.settings.v1';
export const SETTING_DEFAULTS = { master: 0.8, music: 0.1, sfx: 1, voice: 1, sensPad: 1, sensMouse: 1, invertY: false, aimAssist: true, rumble: true, glyphs: 'ps', fullscreen: false, pixel: 'fine', quality: 'auto', fov: 62, subSize: 1, reduceFlash: false, reduceFever: false };
const store = () => { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; } };
export function loadSettings() {
  const s = { ...SETTING_DEFAULTS }; const st = store();
  try { const raw = st && st.getItem(SETTINGS_KEY); if (raw) { const o = JSON.parse(raw); if (o && o.v === 1) Object.assign(s, o.s); } } catch { /* corrupt entry: defaults */ }
  return s;
}
export function saveSettings(s) { const st = store(); try { st && st.setItem(SETTINGS_KEY, JSON.stringify({ v: 1, s })); } catch { /* storage full or blocked */ } }
export function applySettings(g) {
  const s = g.settings, a = g.ctx.audio;
  a.setVolume('master', s.master); a.setVolume('music', s.music); a.setVolume('sfx', s.sfx);
  g.camState.sensPad = s.sensPad; g.camState.sensMouse = s.sensMouse; g.camState.invertY = s.invertY;
  g.glyphSet = s.glyphs; g.voiceVolume = s.voice;
  try { g.ctx.engine.settings.set({ pixelSize: s.pixel, quality: s.quality }); } catch { /* headless */ }
  if (typeof document !== 'undefined') { const want = !!s.fullscreen; try { if (want && !document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {}); else if (!want && document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); } catch { /* not allowed without a gesture */ } }
}
