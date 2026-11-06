// Settings: Sound, Picture, Controls, Assists. Tabs, one idea at a time. Reset restores music to 10%.
import { DEFAULT_OPTIONS } from '../../app.js';
import { AboutScreen } from './about.js';
const LOOKS = ['none', 'playstation', 'arcade', 'vhs_rental', 'no_filters'], LOOK_NAMES = { none: 'NATIVE', playstation: 'PLAYSTATION', arcade: 'ARCADE', vhs_rental: 'VHS RENTAL', no_filters: 'NO FILTERS' };
const QUAL = ['auto', 'low', 'medium', 'high'], FPS = [60, 30, 0];
export class SettingsScreen {
  constructor(app, o = {}) { this.id = 'settings'; this.app = app; this.tab = 0; this.o = o; this.inRace = !!o.inRace; }
  tabs() { return this.o.limited ? ['SOUND', 'CONTROLS'] : ['SOUND', 'PICTURE', 'CONTROLS', 'ASSISTS']; }
  draw(ui, dt) {
    const app = this.app, o = app.options, tabs = this.tabs(), audio = app.engine.audio, w = Math.min(ui.w - 40, 340), x = Math.round(ui.cx - w / 2), H = 15;
    if (this.inRace) ui.panel(x - 8, 6, w + 16, ui.h - 22, { color: 'ink', border: 'slate' });
    ui.text(ui.cx, 12, 'SETTINGS', { align: 'center', scale: 2, color: 'sand' });
    ui.tabs('tabs', x, 34, w, tabs, this.tab, (i) => { this.tab = i; this.focus = null; ui.box.ready = false; });
    let y = 52;
    const row = (id, label, fn) => { fn(id, label, y); y += H + 3; };
    const slider = (id, label, value, min, max, step, set, fmt, def) => row(id, label, () => ui.slider(id, x, y, w, H, label, value, min, max, { step, set, format: fmt, reset: () => set(def) }));
    const choice = (id, label, value, list, names, set) => { const idx = list.indexOf(value), cur = names ? names[value] ?? value : value; const next = (d) => set(list[(idx + d + list.length) % list.length]); row(id, label, () => { const f = ui.item(id, x, y, w, H, { confirm: () => next(1), onX: (d) => { next(d); app.mix.sfx('tick'); } }); ui.rect(x, y, w, H, f ? 'navy' : 'night'); ui.text(x + 6, y + 4, label, { color: f ? 'white' : 'mist' }); ui.text(x + w - 6, y + 4, `< ${cur} >`, { align: 'right', color: f ? 'sand' : 'mist' }); }); };
    const pct = (v) => `${Math.round(v * 100)}%`, tab = tabs[this.tab];
    if (tab === 'SOUND') {
      slider('master', 'MASTER', o.master, 0, 1, 0.05, (v) => { o.master = Math.round(v * 20) / 20; audio.setVolume('master', o.master); app.saveOptions(); }, pct, 0.8);
      slider('sfx', 'EFFECTS', o.sfx, 0, 1, 0.05, (v) => { o.sfx = Math.round(v * 20) / 20; audio.setVolume('sfx', o.sfx); app.saveOptions(); }, pct, 1);
      slider('music', 'MUSIC', o.music, 0, 1, 0.05, (v) => { o.music = Math.round(v * 20) / 20; audio.setVolume('music', o.music); app.saveOptions(); }, pct, 0.1);
      slider('voices', 'VOICES', o.voices, 0, 1, 0.05, (v) => { o.voices = Math.round(v * 20) / 20; app.saveOptions(); }, pct, 0.8);
      choice('raceMusic', 'MUSIC IN RACES', o.raceMusic ? 'ON' : 'OFF', ['ON', 'OFF'], null, (v) => { o.raceMusic = v === 'ON'; app.saveOptions(); });
    } else if (tab === 'PICTURE') {
      choice('pixel', 'PIXEL SIZE', o.pixel, ['fine', 'chunky'], { fine: 'FINE', chunky: 'CHUNKY' }, (v) => { o.pixel = v; app.applyPicture(); app.saveOptions(); });
      choice('look', 'LOOK', o.look, LOOKS, LOOK_NAMES, (v) => { o.look = v; app.applyPicture(); app.saveOptions(); });
      choice('quality', 'QUALITY', o.quality, QUAL, { auto: 'AUTOMATIC', low: 'LOW', medium: 'MEDIUM', high: 'HIGH' }, (v) => { o.quality = v; app.applyPicture(); app.saveOptions(); });
      choice('fps', 'FRAME CAP', o.fps, FPS, { 60: '60', 30: '30', 0: 'DISPLAY' }, (v) => { o.fps = v; app.applyPicture(); app.saveOptions(); });
      if (!app.session) row('fullscreen', 'FULLSCREEN', () => ui.button('fullscreen', x, y, w, H, 'FULLSCREEN', { left: true, confirm: () => { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch { /* refused */ } }, right: typeof document !== 'undefined' && document.fullscreenElement ? 'ON' : 'OFF' }));
    } else if (tab === 'CONTROLS') {
      choice('glyphs', 'BUTTON GLYPHS', o.glyphs, ['ps', 'xbox'], { ps: 'PLAYSTATION', xbox: 'XBOX' }, (v) => { o.glyphs = v; app.saveOptions(); });
      choice('vibration', 'VIBRATION', o.vibration ? 'ON' : 'OFF', ['ON', 'OFF'], null, (v) => { o.vibration = v === 'ON'; app.applyActionOptions(); app.saveOptions(); });
      slider('steerCurve', 'STEERING RESPONSE', o.steerCurve, 1, 2.2, 0.1, (v) => { o.steerCurve = Math.round(v * 10) / 10; app.applyActionOptions(); app.saveOptions(); }, (v) => v.toFixed(1), 1.4);
      choice('mouseSteer', 'MOUSE STEERING', o.mouseSteer ? 'ON' : 'OFF', ['ON', 'OFF'], null, (v) => { o.mouseSteer = v === 'ON'; app.applyActionOptions(); app.saveOptions(); });
      choice('units', 'UNITS', o.units, ['kmh', 'mph'], { kmh: 'KM/H', mph: 'MPH' }, (v) => { o.units = v; app.saveOptions(); });
    } else {
      const A = o.assists;
      choice('abs', 'ABS', A.abs ? 'ON' : 'OFF', ['ON', 'OFF'], null, (v) => { A.abs = v === 'ON'; app.saveOptions(); });
      slider('tcs', 'TRACTION CONTROL', A.tcs, 0, 10, 1, (v) => { A.tcs = Math.round(v); app.saveOptions(); }, (v) => String(v), 5);
      slider('asm', 'STABILITY CONTROL', A.asm, 0, 10, 1, (v) => { A.asm = Math.round(v); app.saveOptions(); }, (v) => String(v), 5);
      choice('auto', 'GEARS', A.auto ? 'AUTOMATIC' : 'MANUAL', ['AUTOMATIC', 'MANUAL'], null, (v) => { A.auto = v === 'AUTOMATIC'; app.saveOptions(); });
      choice('line', 'DRIVING LINE', A.line ? 'ON' : 'OFF', ['ON', 'OFF'], null, (v) => { A.line = v === 'ON'; app.saveOptions(); });
    }
    if (!app.mix.audio?.unlocked) { ui.sprite(x, ui.h - 56, ['..x....', '.xx..x.', 'xxx.x.x', 'xxx..x.', 'xxx.x.x', '.xx....', '..x....'], { x: 'red' }); ui.text(x + 10, ui.h - 56, 'PRESS A KEY OR CLICK FOR SOUND', { color: 'mist' }); }
    y = ui.h - 42; const half = (w - 6) / 2;
    if (!this.o.limited) { ui.button('reset', x, y, half, H, 'RESET TO DEFAULTS', { confirm: () => this.reset() }); ui.button('about', x + half + 6, y, half, H, 'ABOUT', { confirm: () => ui.push(new AboutScreen(app)) }); }
    if (app.touchGate) ui.button('backBtn', ui.cx - 40, y - 18, 80, H, 'BACK', { confirm: () => ui.pop() });
    ui.prompts([['confirm', 'CHANGE'], ['moveX', 'ADJUST'], ['tabs', 'TAB'], ['back', 'BACK']]);
    void dt;
  }
  reset() {
    const app = this.app, d = DEFAULT_OPTIONS(), audio = app.engine.audio; audio.resetVolumes();
    Object.assign(app.options, d); audio.setVolume('music', 0.1); audio.setVolume('sfx', d.sfx); audio.setVolume('master', d.master);
    app.applyPicture(); app.applyActionOptions(); app.saveOptions(); app.ui.note('RESTORED TO DEFAULTS.');
  }
}
