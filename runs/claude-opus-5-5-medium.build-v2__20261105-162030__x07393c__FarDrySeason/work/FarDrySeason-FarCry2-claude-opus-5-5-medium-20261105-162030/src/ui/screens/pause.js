// pause screens.
import { clamp } from '../../world/geom.js';
import { devScreen } from '../../dev/devmode.js';
import { aboutScreen } from '../about.js';
import { ledgerScreen } from './story.js';
function slider(label, get, set, step = 0.05) { return { label, value: () => get(), valueText: () => pct(get()), adjust: (d) => set(clamp(get() + d * step, 0, 1)), set }; }
const toggle = (label, get, set, on = 'ON', off = 'OFF') => ({ label, value: () => (get() ? on : off), adjust: () => set(!get()), action: () => set(!get()) });
const pct = (v) => `${Math.round(v * 100)}%`;
export function pauseScreen(g) {
  const hub = !!g.session;
  const items = hub ? [{ label: 'RESUME', action: () => g.resume() }, { label: 'SETTINGS', action: () => g.ui.push(settingsScreen(g)) }] : [
    { label: 'RESUME', action: () => g.resume() },
    { label: 'LEDGER', action: () => g.ui.push(ledgerScreen(g)) },
    { label: 'SETTINGS', action: () => g.ui.push(settingsScreen(g)) },
    { label: 'DEV MODE', action: () => g.ui.push(devScreen(g)) },
    { label: 'ABOUT AND CREDITS', action: () => g.ui.push(aboutScreen(g)) },
    { label: 'QUIT TO TITLE', action: () => g.toTitle() },
  ];
  return { id: 'pause', title: 'PAUSED', cover: 'ink', top: 70, items, back: () => g.resume() };
}
export function settingsScreen(g) {
  const s = g.settings, a = g.ctx.audio;
  const put = () => g.saveSettings();
  return { id: 'settings', title: 'SETTINGS', cover: 'ink', items: [
    { label: 'SOUND', action: () => g.ui.push({ id: 'settings-sound', title: 'SOUND', cover: 'ink', items: [slider('MUSIC', () => a.volume.music, (v) => { a.setVolume('music', v); put(); }), slider('EFFECTS', () => a.volume.sfx, (v) => { a.setVolume('sfx', v); put(); }), slider('VOICES', () => s.voices, (v) => { s.voices = v; put(); })] }) },
    { label: 'CONTROLS', action: () => g.ui.push({ id: 'settings-controls', title: 'CONTROLS', cover: 'ink', items: [slider('LOOK: PAD', () => s.padSens / 2, (v) => { s.padSens = v * 2; put(); }), slider('LOOK: MOUSE', () => s.mouseSens / 2, (v) => { s.mouseSens = v * 2; put(); }), toggle('INVERT Y', () => s.invertY, (v) => { s.invertY = v; put(); }), toggle('AIM ASSIST', () => s.aimAssist, (v) => { s.aimAssist = v; put(); }), toggle('RUMBLE', () => s.rumble, (v) => { s.rumble = v; put(); }), toggle('GLYPHS', () => s.glyphs === 'xbox', (v) => { s.glyphs = v ? 'xbox' : 'playstation'; put(); }, 'XBOX', 'PLAYSTATION')] }) },
    { label: 'PICTURE', action: () => g.ui.push({ id: 'settings-picture', title: 'PICTURE', cover: 'ink', items: [toggle('FULLSCREEN', () => g.isFullscreen(), (v) => g.setFullscreen(v)), toggle('PIXEL SIZE', () => s.pixel === 'chunky', (v) => { s.pixel = v ? 'chunky' : 'fine'; g.ctx.engine.settings.set({ pixelSize: s.pixel }); put(); }, 'CHUNKY', 'FINE'), { label: 'QUALITY', value: () => s.quality.toUpperCase(), adjust: (d) => { const q = ['low', 'medium', 'high'], i = (q.indexOf(s.quality) + Math.sign(d) + 3) % 3; s.quality = q[i]; g.ctx.engine.setQuality(q[i]); put(); }, action() { this.adjust(1); } }, { label: 'FIELD OF VIEW', value: () => (s.fov - 50) / 40, valueText: () => String(s.fov), adjust: (d) => { s.fov = clamp(s.fov + d * 2, 50, 90); put(); }, set: (v) => { s.fov = Math.round(50 + v * 40); put(); } }] }) },
    { label: 'COMFORT', action: () => g.ui.push({ id: 'settings-comfort', title: 'COMFORT', cover: 'ink', items: [toggle('SUBTITLE SIZE', () => s.subtitle === 'large', (v) => { s.subtitle = v ? 'large' : 'normal'; put(); }, 'LARGE', 'NORMAL'), toggle('REDUCE FLASHES', () => s.reduceFlashes, (v) => { s.reduceFlashes = v; put(); }), toggle('FEVER EFFECTS', () => s.feverReduced, (v) => { s.feverReduced = v; put(); }, 'REDUCED', 'FULL')] }) },
    { label: 'RESET TO DEFAULTS', action: () => { g.resetSettings(); g.notice('SETTINGS RESET'); } },
  ] };
}
