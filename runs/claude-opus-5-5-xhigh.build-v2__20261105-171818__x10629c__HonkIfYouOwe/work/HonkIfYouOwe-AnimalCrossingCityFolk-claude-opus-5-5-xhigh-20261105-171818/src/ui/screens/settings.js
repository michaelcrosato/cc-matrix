// Settings: everything a player wants, big and few to a page. Reset to defaults restores 10% music.
import { Menu } from '../ui.js';
import { tuning } from '../../dev/tuning.js';
import { store } from '../../core/storage.js';
import { DEFAULT_SETTINGS, DEFAULT_MUSIC } from '../../gameDefaults.js';

const pct = (v) => `${Math.round(v * 100)}%`;
const STYLES = ['gibberish', 'beeps', 'off'];
const SPEEDS = [null, 20, 35, 60, 120];
const speedName = (v) => (v == null ? 'Normal' : v <= 20 ? 'Slow' : v <= 35 ? 'Normal' : v <= 60 ? 'Quick' : 'Very quick');
export function settingsScreen(g) {
  const a = g.ctx.audio;
  const vol = (label, ch) => ({
    label, value: (gg) => pct(a.volume[ch]),
    left: () => { a.setVolume(ch, Math.max(0, Math.round((a.volume[ch] - 0.1) * 10) / 10)); g.sound('uiTick'); },
    right: () => { a.setVolume(ch, Math.min(1, Math.round((a.volume[ch] + 0.1) * 10) / 10)); g.sound('uiTick'); },
    action: () => {},
  });
  const toggle = (label, get, set, on = 'On', off = 'Off') => ({ label, value: () => (get() ? on : off), action: () => { set(!get()); g.saveSettings(); }, left: () => { set(!get()); g.saveSettings(); }, right: () => { set(!get()); g.saveSettings(); } });
  const s = g.settings;
  const items = [
    vol('Music', 'music'),
    vol('Effects', 'sfx'),
    { label: 'Voices', value: () => pct(s.voices), left: () => { s.voices = Math.max(0, Math.round((s.voices - 0.1) * 10) / 10); g.saveSettings(); g.voice.syllable('a', 'player', ''); }, right: () => { s.voices = Math.min(1, Math.round((s.voices + 0.1) * 10) / 10); g.saveSettings(); g.voice.syllable('a', 'player', ''); }, action: () => {} },
    { label: 'Voice style', value: () => ({ gibberish: 'Gibberish', beeps: 'Soft beeps', off: 'Off' }[s.voiceStyle]), left: () => cycle(-1), right: () => cycle(1), action: () => cycle(1) },
    { label: 'Text speed', value: () => speedName(s.textSpeed), left: () => speed(-1), right: () => speed(1), action: () => speed(1) },
    toggle('Controller glyphs', () => s.xbox, (v) => { s.xbox = v; }, 'Xbox', 'PlayStation'),
    toggle('Rumble', () => s.rumble, (v) => { s.rumble = v; }),
    toggle('Camera shake', () => s.shake, (v) => { s.shake = v; }),
    { label: 'Clock', value: () => (g.world.clock.mode === 'real' ? 'Real Clock' : 'Village Time'), left: () => clock(), right: () => clock(), action: () => clock() },
    { label: 'Fullscreen', value: () => (typeof document !== 'undefined' && document.fullscreenElement ? 'On' : 'Off'), action: () => fullscreen(), left: () => fullscreen(), right: () => fullscreen() },
    { label: 'Pixel size', value: () => (g.engine.settings.values.pixelSize === 'chunky' ? 'Chunky' : 'Fine'), action: () => pixel(), left: () => pixel(), right: () => pixel() },
    { label: 'Picture quality', value: () => qualityName(), action: () => quality(1), left: () => quality(-1), right: () => quality(1) },
    { label: 'Reset to defaults', action: () => reset() },
    { label: 'Back', action: (gg, m) => gg.ui.pop(m) },
  ];
  function cycle(d) { const i = STYLES.indexOf(s.voiceStyle); s.voiceStyle = STYLES[(i + d + STYLES.length) % STYLES.length]; g.saveSettings(); g.voice.syllable('a', 'player', ''); }
  function speed(d) { const i = SPEEDS.indexOf(s.textSpeed); s.textSpeed = SPEEDS[(Math.max(0, i) + d + SPEEDS.length) % SPEEDS.length]; g.saveSettings(); }
  function clock() { const w = g.world; w.clock.mode = w.clock.mode === 'real' ? 'village' : 'real'; g.weatherKey = null; g.refreshSeason(); g.sound('uiTick'); g.events.emit('clockMode', { mode: w.clock.mode }); }
  function fullscreen() { if (typeof document === 'undefined') return; if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.(); }
  function pixel() { const v = g.engine.settings.values.pixelSize === 'chunky' ? 'fine' : 'chunky'; g.engine.settings.set({ pixelSize: v }); }
  function qualityName() { const q = g.engine.settings.values.quality ?? 'high'; return q[0].toUpperCase() + q.slice(1); }
  function quality(d) { const list = ['low', 'medium', 'high']; const q = g.engine.settings.values.quality ?? 'high'; g.engine.settings.set({ quality: list[(list.indexOf(q) + d + 3) % 3] }); }
  function reset() {
    Object.assign(s, DEFAULT_SETTINGS);
    g.saveSettings();
    a.resetVolumes();
    a.setVolume('music', DEFAULT_MUSIC);
    g.engine.settings.reset();
    g.events.emit('settingsReset', {});
    g.ui.toastMsg('Back to how it was. Music at 10%.');
  }
  const m = new Menu({ id: 'settings', title: 'Settings', items, x: 110, y: 46, w: 260, itemH: 19, gap: 2, back: (gg, mm) => gg.ui.pop(mm), prompts: [['confirm', 'Change'], ['back', 'Back']] });
  m.perPage = 8;
  return m;
}
export { tuning, store };
