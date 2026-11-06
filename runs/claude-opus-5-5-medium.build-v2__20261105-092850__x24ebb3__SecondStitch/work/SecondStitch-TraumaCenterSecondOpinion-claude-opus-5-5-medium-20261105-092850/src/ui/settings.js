// Settings: same screen everywhere, pad-navigable.
import { Menu } from './menu.js';
import { app } from '../core/app.js';
import { DEFAULT_SETTINGS, storeAll } from '../core/save.js';
import { DIFFICULTY } from '../core/config.js';

export const LOOK_OPTIONS = [['field', 'PIXEL (DEFAULT)'], ['spooky', 'SPOOKY'], ['noir', 'NOIR'], ['playstation', 'PS1'], ['vhs_rental', 'VHS'], ['old_photo', 'OLD PHOTO']];
const cycle = (list, v, dir) => list[(list.indexOf(v) + dir + list.length) % list.length];
export function buildSettingsItems(ctx) {
  const s = app.settings, audio = ctx.audio;
  const vol = (key, label) => ({ label, value: () => `${Math.round((key === 'voices' ? s.voices : audio.volume[key]) * 100)}%`, bar: () => (key === 'voices' ? s.voices : audio.volume[key]), adjust: (d) => {
    const base = key === 'voices' ? s.voices : audio.volume[key], v = Math.max(0, Math.min(1, Math.round((base + d * 0.05) * 100) / 100));
    if (key === 'voices') s.voices = v; else { audio.setVolume(key, v); s[key] = v; }
    if (key !== 'music') audio.play(key === 'voices' ? 'syl-1am' : 'uiConfirm');
    app.persist();
  } });
  const opt = (label, get, values, set) => ({ label, value: () => get(), adjust: (d) => { set(cycle(values, currentKey(get, values), d)); app.persist(); } });
  const currentKey = (get, values) => values.find((v) => label(v) === get()) ?? values[0];
  const label = (v) => String(v).toUpperCase();
  const toggle = (lbl, key, on = 'ON', off = 'OFF') => ({ label: lbl, value: () => (s[key] ? on : off), adjust: () => { s[key] = !s[key]; app.persist(); } });
  return [
    vol('music', 'MUSIC'), vol('sfx', 'SOUND'), vol('voices', 'VOICES'),
    { label: 'BUTTON GLYPHS', value: () => (s.glyphs === 'xbox' ? 'XBOX' : 'PLAYSTATION'), adjust: () => { s.glyphs = s.glyphs === 'xbox' ? 'ps' : 'xbox'; app.persist(); } },
    opt('AIM ASSIST', () => s.aim.toUpperCase(), ['off', 'low', 'high'], (v) => { s.aim = v; }),
    { label: 'CURSOR SPEED', value: () => `${Math.round(s.cursor * 100)}%`, adjust: (d) => { s.cursor = Math.max(0.4, Math.min(2, Math.round((s.cursor + d * 0.1) * 10) / 10)); app.persist(); } },
    toggle('RUMBLE', 'rumble'),
    toggle('GIFT', 'giftToggle', 'TOGGLE', 'HOLD'),
    { label: 'LOOK', value: () => LOOK_OPTIONS.find(([k]) => k === s.look)?.[1] ?? 'PIXEL', adjust: (d) => { const keys = LOOK_OPTIONS.map(([k]) => k); s.look = cycle(keys, s.look, d); applySettingsLook(ctx); app.persist(); } },
    { label: 'PIXEL SIZE', value: () => `${s.pixel}X`, adjust: (d) => { s.pixel = Math.max(1, Math.min(4, s.pixel + d)); applySettingsLook(ctx); app.persist(); } },
    { label: 'SCREEN SHAKE', value: () => `${Math.round(s.shake * 100)}%`, adjust: (d) => { s.shake = Math.max(0, Math.min(1, Math.round((s.shake + d * 0.25) * 100) / 100)); app.persist(); } },
    toggle('REDUCE FLASHES', 'reduceFlash'),
    { label: 'TEXT SPEED', value: () => (s.textSpeed <= 0.7 ? 'SLOW' : s.textSpeed >= 1.6 ? 'FAST' : 'NORMAL'), adjust: (d) => { const l = [0.6, 1, 2]; s.textSpeed = cycle(l, l.reduce((a, b) => (Math.abs(b - s.textSpeed) < Math.abs(a - s.textSpeed) ? b : a)), d); app.persist(); } },
    { label: 'DIFFICULTY', value: () => DIFFICULTY[app.save.difficulty ?? 'resident'].label, adjust: (d) => { const l = Object.keys(DIFFICULTY); app.save.difficulty = cycle(l, app.save.difficulty ?? 'resident', d); app.persist(); } },
    { label: 'FULLSCREEN', value: () => (typeof document !== 'undefined' && document.fullscreenElement ? 'ON' : 'OFF'), adjust: () => toggleFull() },
    { label: 'RESET TO DEFAULTS', action: () => { const keep = DEFAULT_SETTINGS(); Object.assign(s, keep); audio.setVolume('music', keep.music); audio.setVolume('sfx', keep.sfx); applySettingsLook(ctx); app.persist(); } },
  ];
}
function toggleFull() { if (typeof document === 'undefined') return; if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.()?.catch?.(() => {}); }
export function applySettingsLook(ctx) {
  const s = app.settings;
  if (s.look === 'field') app.applyLook(1, 0.3, 0);
  else ctx.engine.setLook(ctx.engine.lookPresets[s.look] ?? ctx.engine.lookPresets.none);
}
export class SettingsScreen {
  constructor(ctx, onBack) { this.ctx = ctx; this.onBack = onBack; this.menu = new Menu(app, buildSettingsItems(ctx), { y: 46, rowH: 22, width: Math.min(300, ctx.hud.width - 40), maxRows: Math.min(8, Math.floor((ctx.hud.height - 76) / 22)) }); }
  update(ctx) {
    const r = this.menu.update(ctx);
    if (r === 'back') { storeAll(app.save, app.settings); this.onBack(); return; }
    if (r?.adjust) r.adjust(1);
    if (r?.action) r.action();
    void ctx;
  }
  draw(ctx) {
    const { hud } = ctx, W = hud.width, H = hud.height;
    hud.rect(0, 0, W, H, 0x0d0b14);
    const t = 'SETTINGS', tw = hud.measure(t, 2).width;
    hud.text(Math.round(W / 2 - tw / 2), 12, t, { color: 0xffd24d, scale: 2 });
    this.menu.draw(hud);
    app.prompts.strip(hud, 8, H - 13, [['confirm', 'CHANGE'], ['back', 'BACK']]);
  }
}
