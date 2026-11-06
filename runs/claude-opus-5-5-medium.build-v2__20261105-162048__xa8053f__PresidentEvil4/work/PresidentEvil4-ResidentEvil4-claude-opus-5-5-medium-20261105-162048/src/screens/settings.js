// Paged, not dense. Same screen for every input.
import { DEFAULT_SETTINGS, storeSettings } from '../core/save.js';
import { TUNING } from '../data/tuning.js';
const LOOKS = ['native', 'spooky', 'ps1_horror', 'noir'];
const PAGES = ['SOUND', 'CONTROLS', 'PICTURE'];
export class SettingsScreen {
  constructor(app) { this.app = app; this.s = { tab: 0, focus: 0 }; this.done = false; }
  rows(tab) {
    const S = this.app.settings;
    if (tab === 0) return [{ k: 'music', label: 'MUSIC', min: 0, max: 1 }, { k: 'sfx', label: 'SOUND EFFECTS', min: 0, max: 1 }, { k: 'voice', label: 'VOICES', min: 0, max: 1 }, { k: 'master', label: 'MASTER', min: 0, max: 1 }, { reset: true, label: 'RESET ALL SETTINGS' }];
    if (tab === 1) return [{ k: 'padAim', label: 'AIM SPEED, PAD', min: 0.3, max: 2 }, { k: 'mouseAim', label: 'AIM SPEED, MOUSE', min: 0.3, max: 2 }, { k: 'aimAssist', label: 'AIM ASSIST', min: 0, max: 2 }, { k: 'invertY', label: 'INVERT Y', opts: [false, true], names: ['OFF', 'ON'] }, { k: 'glyphs', label: 'CONTROLLER GLYPHS', opts: ['ps', 'xbox'], names: ['PLAYSTATION', 'XBOX'] }];
    return [{ k: 'shake', label: 'SCREEN SHAKE', min: 0, max: 1.5 }, { k: 'look', label: 'LOOK', opts: LOOKS, names: LOOKS.map((l) => l.toUpperCase().replace('_', ' ')) }, { k: 'pixelSize', label: 'PIXEL SIZE', opts: ['fine', 'chunky'], names: ['FINE', 'CHUNKY'] }, { k: 'quality', label: 'QUALITY', opts: ['low', 'medium', 'high'], names: ['LOW', 'MEDIUM', 'HIGH'] }, { k: 'fps', label: 'FRAME RATE', opts: [60, 30, 0], names: ['60', '30', 'DISPLAY'] }, { full: true, label: 'FULLSCREEN' }];
  }
  update(ui) {
    const app = this.app, S = app.settings; ui.rect(0, 0, ui.W, ui.H, 'ink'); ui.center(26, 'SETTINGS', { scale: 2, color: 'sand' }); const tab = ui.tabs(this.s, PAGES, 46); const rows = this.rows(tab);
    const display = rows.map((r) => ({ label: r.label })); const x = Math.round(ui.W / 2 - 170), y = 68; const i = ui.list(this.s, display, { x, y, w: 340, rowH: 20, noConfirm: true });
    rows.forEach((r, k) => {
      const ry = y + k * 20 + 4, on = this.s.focus === k;
      if (r.min != null) { const nv = ui.slider(x + 170, ry, 110, S[r.k], r.min, r.max, { def: DEFAULT_SETTINGS[r.k] }); if (nv !== S[r.k]) { S[r.k] = nv; this.apply(); } ui.text(x + 290, ry, `${Math.round(S[r.k] * 100)}%`, { color: on ? 'white' : 'mist' }); if (on) { const st = (r.max - r.min) / 20; if (ui.nav.left) { S[r.k] = Math.max(r.min, S[r.k] - st); this.apply(); ui.sound('uimove'); } if (ui.nav.right) { S[r.k] = Math.min(r.max, S[r.k] + st); this.apply(); ui.sound('uimove'); } } }
      else if (r.opts) { const n = r.opts.indexOf(S[r.k]); ui.text(x + 170, ry, `< ${r.names[Math.max(0, n)]} >`, { color: on ? 'white' : 'mist' }); const step = (d) => { S[r.k] = r.opts[(Math.max(0, n) + d + r.opts.length) % r.opts.length]; this.apply(); ui.sound('uimove'); }; if (on && ui.nav.left) step(-1); if (on && (ui.nav.right || ui.confirm)) step(1); if (ui.click && ui.within(x + 170, ry - 4, 150, 16, ui.cx, ui.cy)) step(1); }
    });
    const r = rows[this.s.focus]; if (ui.confirm || (ui.click && ui.within(x, y + this.s.focus * 20 - 2, 170, 18, ui.cx, ui.cy))) { if (r?.reset) { Object.assign(S, DEFAULT_SETTINGS); this.apply(); ui.sound('uiconfirm'); } if (r?.full) app.toggleFullscreen(); }
    ui.prompts([['confirm', 'CHANGE'], ['left', 'ADJUST'], ['back', 'BACK']]);
    if (ui.back) { ui.sound('uiback'); this.done = true; }
  }
  apply() { const app = this.app; storeSettings(app.settings); app.applySettings(); }
}
