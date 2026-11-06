// Settings screen (own HUD screen, pad navigable).
import { Menu } from './menu.js';
import { ctext, prompts } from './hud.js';
import { DEFAULT_SETTINGS } from '../core/save.js';
const cyc = (arr, v, d) => arr[(arr.indexOf(v) + d + arr.length) % arr.length];
export class SettingsScreen {
  constructor(app, ctx, back) {
    this.app = app; this.ctx = ctx; this.back = back; const s = app.settings, ap = () => app.applySettings(ctx);
    const pct = (k, step = 0.1) => ({ slider: true, value: () => Math.round(s[k] * 100) + '%', frac: () => s[k], onLeft: () => { s[k] = Math.max(0, Math.round((s[k] - step) * 100) / 100); ap(); }, onRight: () => { s[k] = Math.min(1, Math.round((s[k] + step) * 100) / 100); ap(); }, onSet: (f) => { s[k] = Math.round(f * 20) / 20; ap(); } });
    const tog = (k, a = 'ON', b = 'OFF') => ({ value: () => (s[k] ? a : b), onLeft: () => { s[k] = !s[k]; ap(); }, onRight: () => { s[k] = !s[k]; ap(); }, onSelect: () => { s[k] = !s[k]; ap(); } });
    const choice = (k, arr, lab = (x) => x.toUpperCase()) => ({ value: () => lab(s[k]), onLeft: () => { s[k] = cyc(arr, s[k], -1); ap(); }, onRight: () => { s[k] = cyc(arr, s[k], 1); ap(); }, onSelect: () => { s[k] = cyc(arr, s[k], 1); ap(); } });
    this.items = [
      { label: 'MUSIC', ...pct('music') }, { label: 'SOUND', ...pct('sfx') }, { label: 'VOICES', ...pct('voices') },
      { label: 'GLYPHS', ...choice('glyphs', ['ps', 'xbox'], (x) => (x === 'ps' ? 'PLAYSTATION' : 'XBOX')) }, { label: 'AIM ASSIST', ...choice('aim', ['off', 'low', 'high']) },
      { label: 'CURSOR SPEED', slider: true, value: () => s.cursor.toFixed(0), frac: () => (s.cursor - 4) / 16, onLeft: () => { s.cursor = Math.max(4, s.cursor - 1); ap(); }, onRight: () => { s.cursor = Math.min(20, s.cursor + 1); ap(); }, onSet: (f) => { s.cursor = Math.round(4 + f * 16); ap(); } },
      { label: 'RUMBLE', ...tog('rumble') }, { label: 'GIFT', ...tog('giftToggle', 'TOGGLE', 'HOLD') }, { label: 'LOOK', ...choice('look', ['default', 'crisp', 'noir', 'warm']) },
      { label: 'PIXEL SIZE', ...choice('pixel', [1, 2], (x) => x + 'X') }, { label: 'SCREEN SHAKE', ...tog('shake') }, { label: 'REDUCE FLASHES', ...tog('flashes', 'OFF', 'ON'), },
      { label: 'TEXT SPEED', ...choice('textSpeed', [1, 2, 3], (x) => ['SLOW', 'NORMAL', 'FAST'][x - 1]) }, { label: 'DIFFICULTY', ...choice('difficulty', ['intern', 'resident', 'attending']) },
      { label: 'FULLSCREEN', value: () => (typeof document !== 'undefined' && document.fullscreenElement ? 'ON' : 'OFF'), onSelect: () => { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch {} } },
      { label: 'RESET TO DEFAULTS', onSelect: () => { app.resetSettings(ctx); } }, { label: 'BACK', onSelect: () => this.close() },
    ];
    this.items[11].value = () => (s.flashes ? 'ON' : 'OFF'); this.items[11].onLeft = this.items[11].onRight = this.items[11].onSelect = () => { s.flashes = !s.flashes; };
    this.menu = new Menu(this.items); this.scroll = 0;
  }
  close() { this.app.flush(); this.back?.(); }
  update(nav, dt) { const r = this.menu.update(nav, this.app, dt, this.ctx.audio); if (r === 'back') this.close(); }
  draw(hud) {
    hud.rect(0, 0, hud.width, hud.height, 'night'); ctext(hud, 6, 'SETTINGS', { scale: 2, color: 'sand' });
    const n = this.items.length, vis = 11, i = this.menu.i; this.scroll = Math.max(0, Math.min(n - vis, i - 5));
    const saved = this.menu.items; this.menu.items = this.items.slice(this.scroll, this.scroll + vis); const oi = this.menu.i; this.menu.i = i - this.scroll;
    this.menu.draw(hud, 30, { rowH: 20 }); this.menu.items = saved; this.menu.i = oi;
    // restore rect indices to full list
    const rects = this.menu.rects; this.menu.rects = []; rects.forEach((q, k) => { this.menu.rects[k + this.scroll] = q; });
    prompts(hud, this.app, [{ act: 'nav', label: 'MOVE' }, { act: 'confirm', label: 'CHANGE' }, { act: 'back', label: 'BACK' }], 'center', hud.height - 14);
  }
}
