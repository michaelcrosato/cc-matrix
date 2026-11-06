// Title screen, settings, about: the shell. Drawn with the same widgets as everything else.
import { W, H } from './controls.js';
import { textWidth } from './draw.js';
import { DEFAULTS, saveSettings } from '../core/settings.js';
import { hasSave } from '../core/world.js';
import { tuning, setTuning } from '../data/tuning.js';
export const GAME_TITLE = 'Creditor Creek';
export function drawLogo(d, t, y = 52) {
  const s = 4; const name = GAME_TITLE.toUpperCase(); const cw = (textWidth(name) * s); // scale via hud text for the logo
  const base = d.hud.measure(name, 4).width; const x0 = Math.round(W / 2 - base / 2);
  d.hud.text(x0, y, name, { scale: 4, color: 'sand', shadow: 'navy' });
  d.text(W / 2, y + 40, 'a village, a goose, a very large bill', 'white', { align: 'center', shadow: 'ink' });
}
export class TitleScreen {
  constructor(game) { this.id = 'title'; this.game = game; this.st = { i: 0 }; this.idle = 0; this.noPrompts = false; }
  open(ui) { this.idle = 0; ui.game.setMusic('title'); this.seen = ui.c.anyInput; }
  items(g) { const o = []; if (hasSave()) o.push({ id: 'continue', label: 'Continue' }); o.push({ id: 'new', label: 'New Arrival' }); if (g.sys.visit?.supported()) o.push({ id: 'visit', label: 'Visit' }); o.push({ id: 'settings', label: 'Settings' }); o.push({ id: 'about', label: 'About' }); return o; }
  tick(ui, dt, active) {
    const g = ui.game, d = ui.d; const its = this.items(g);
    if (ui.c.anyInput !== this.seen) { this.seen = ui.c.anyInput; this.idle = 0; } else if (active) this.idle += dt;
    d.rect(0, 0, W, 60, 'night'); d.rect(0, H - 40, W, 40, 'night');
    drawLogo(d, ui.t);
    const x = W / 2 - 80, y = 128; d.panel(x - 10, y - 8, 180, its.length * 18 + 14, { fill: 'white', trim: 'sand' });
    const r = ui.menu(this.st, its.map(i => ({ label: i.label })), { x, y, w: 160, rh: 18, active });
    if (r.pick >= 0) g.titleChoice(its[r.pick].id);
    if (g.touchOnly) { d.text(W / 2, H - 56, 'Controller or keyboard required', 'sand', { align: 'center', shadow: 'ink' }); }
    ui.prompt('confirm', 'Select'); ui.prompt('nav', 'Move');
    if (active && this.idle >= 10 && !g.noAttract) { this.idle = 0; g.startAttract(); }
  }
}
export class SettingsScreen {
  constructor(game) { this.id = 'settings'; this.game = game; this.st = { i: 0 }; this.freeze = true; }
  rows(g) {
    const s = g.settings, pct = (v) => Math.round(v * 100) + '%';
    return [
      { k: 'music', label: 'Music', value: pct(s.music), step: 0.05, min: 0, max: 1 }, { k: 'sfx', label: 'Effects', value: pct(s.sfx), step: 0.1, min: 0, max: 1 }, { k: 'voices', label: 'Voices', value: pct(s.voices), step: 0.1, min: 0, max: 1 },
      { k: 'voiceStyle', label: 'Voice style', value: { gibberish: 'Gibberish', beep: 'Soft beeps', off: 'Off' }[s.voiceStyle], opts: ['gibberish', 'beep', 'off'] },
      { k: 'textSpeed', label: 'Text speed', value: String(s.textSpeed), step: 5, min: 10, max: 200 },
      { k: 'glyphs', label: 'Controller glyphs', value: s.glyphs === 'ps' ? 'PlayStation' : 'Xbox', opts: ['ps', 'xbox'] },
      { k: 'rumble', label: 'Rumble', value: s.rumble ? 'On' : 'Off', toggle: true }, { k: 'shake', label: 'Camera shake', value: s.shake ? 'On' : 'Off', toggle: true },
      { k: 'clock', label: 'Clock', value: s.clock === 'village' ? 'Village Time' : 'Real Clock', opts: ['village', 'real'] },
      { k: 'fullscreen', label: 'Fullscreen', value: (typeof document !== 'undefined' && document.fullscreenElement) ? 'On' : 'Off', act: true },
      { k: 'quality', label: 'Picture quality', value: s.quality === 'high' ? 'High' : 'Medium', opts: ['high', 'medium'] },
      { k: 'pixel', label: 'Pixel size', value: String(s.pixel), step: 1, min: 1, max: 3 },
      { k: 'reset', label: 'Reset to defaults', value: '', act: true },
    ];
  }
  tick(ui, dt, active) {
    const g = ui.game, d = ui.d; const rows = this.rows(g);
    d.rect(0, 0, W, H, 'night'); d.panel(60, 16, 360, 238, { fill: 'white', trim: 'sand' }); d.text(W / 2, 24, 'Settings', 'navy', { align: 'center' });
    const r = ui.menu(this.st, rows, { x: 76, y: 42, w: 328, rh: 16, active, scroll: true, rows: 11 });
    const row = rows[this.st.i];
    const change = (dir) => {
      if (row.opts) { const i = row.opts.indexOf(g.settings[row.k]); g.settings[row.k] = row.opts[(i + dir + row.opts.length) % row.opts.length]; }
      else if (row.toggle) g.settings[row.k] = !g.settings[row.k];
      else if (row.step) g.settings[row.k] = +Math.min(row.max, Math.max(row.min, g.settings[row.k] + dir * row.step)).toFixed(3);
      g.applySettings(); saveSettings(g.settings); g.sfx('tick');
    };
    if (r.adj && !row.act) change(r.adj);
    if (r.pick >= 0) {
      if (row.k === 'reset') { Object.assign(g.settings, DEFAULTS); g.ctx.audio.resetVolumes(); g.applySettings(); saveSettings(g.settings); ui.toast('Back to the defaults'); }
      else if (row.k === 'fullscreen') g.toggleFullscreen(); else if (row.opts || row.toggle) change(1);
    }
    if (r.back) ui.pop(this);
    ui.prompt('back', 'Back'); ui.prompt('nav', 'Adjust');
  }
}
