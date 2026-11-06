// Pause (Options or Esc): Resume, Restart, Retire, Assists, Settings, Handbook, Dev Mode. The race is simply not stepped.
import { SettingsScreen } from './settings.js';
import { HandbookScreen } from './handbook.js';
import { AboutScreen } from './about.js';
import { Dialog } from './common.js';
export class PauseScreen {
  constructor(app, scene) { this.id = 'pause'; this.app = app; this.scene = scene; }
  enter() { this.scene.paused = true; this.app.mix.quiet(); this.app.mix.sfx('tick'); }
  onBack(ui) { ui.pop(); return true; }
  exit() { this.scene.paused = false; }
  list() { const a = this.app, s = this.scene; return [['resume', 'RESUME', () => this.app.ui.pop()], ['restart', 'RESTART', () => a.restartRun(s)], ['retire', s.judge ? 'END ATTEMPT' : 'RETIRE', () => this.askRetire()], ['assists', 'ASSISTS', () => a.ui.push(new AssistsScreen(a, s))], ['settings', 'SETTINGS', () => a.ui.push(new SettingsScreen(a, { inRace: true }))], ['handbook', 'HANDBOOK', () => a.ui.push(new HandbookScreen(a))], ...(a.session ? [] : [['dev', 'DEV MODE', () => a.openDev(s)]])]; }
  askRetire() { const a = this.app, s = this.scene, ui = a.ui, d = new Dialog(a, s.judge ? 'END THIS ATTEMPT?' : 'RETIRE FROM THE RACE?', [s.data.event ? 'YOU WILL BE PLACED LAST IN THIS ROUND.' : 'THE RESULT WILL NOT COUNT.'], [['no', 'KEEP DRIVING', () => ui.pop()], ['yes', 'RETIRE', () => { ui.clear(); a.retireRun(s); }]]); d.focus = 'no'; d.under = this; ui.push(d); }
  draw(ui) {
    const list = this.list(), w = 130, h = 15, gap = 3, H = list.length * (h + gap), x = Math.round(ui.cx - w / 2), y = Math.round(ui.h / 2 - H / 2) + 4;
    ui.panel(x - 12, y - 24, w + 24, H + 32, { color: 'ink', border: 'slate' });
    ui.text(ui.cx, y - 19, 'PAUSED', { align: 'center', scale: 2, color: 'sand' });
    list.forEach(([id, label, fn], k) => ui.button(id, x, y + k * (h + gap), w, h, label, { confirm: fn }));
    if (this.app.actions.pressed('pause') && ui.locked <= 0 && ui.top === this && !this.app.actions.pressed('back')) { ui.pop(); return; }
    ui.prompts([['confirm', 'CHOOSE'], ['back', 'RESUME']]);
  }
}
export class MapPause {
  constructor(app) { this.id = 'mapPause'; this.app = app; }
  draw(ui) {
    const a = this.app, list = [['resume', 'BACK TO THE MAP', () => ui.pop()], ['settings', 'SETTINGS', () => ui.push(new SettingsScreen(a))], ['handbook', 'HANDBOOK', () => ui.push(new HandbookScreen(a))], ['about', 'ABOUT', () => ui.push(new AboutScreen(a))], ['dev', 'DEV MODE', () => a.openDev(null)], ['title', 'TITLE SCREEN', () => a.toTitle()]], w = 130, h = 15, gap = 3, H = list.length * (h + gap), x = Math.round(ui.cx - w / 2), y = Math.round(ui.h / 2 - H / 2) + 4;
    ui.panel(x - 12, y - 24, w + 24, H + 32, { color: 'ink', border: 'slate' });
    ui.text(ui.cx, y - 19, 'MENU', { align: 'center', scale: 2, color: 'sand' });
    list.forEach(([id, label, fn], k) => ui.button(id, x, y + k * (h + gap), w, h, label, { confirm: fn }));
    ui.prompts([['confirm', 'CHOOSE'], ['back', 'BACK']]);
  }
}
export class AssistsScreen {
  constructor(app, scene) { this.id = 'assists'; this.app = app; this.scene = scene; }
  draw(ui) {
    const a = this.app, A = a.options.assists, w = Math.min(ui.w - 40, 280), x = Math.round(ui.cx - w / 2), h = 16; let y = 44;
    ui.panel(x - 8, 14, w + 16, 150, { color: 'ink', border: 'slate' }); ui.text(ui.cx, 20, 'ASSISTS', { align: 'center', scale: 2, color: 'sand' });
    const apply = () => { a.saveOptions(); const s = this.scene; for (const e of s?.sim?.players ?? []) if (!s.judge) e.assists = { ...A }; };
    const toggle = (id, label, val, flip) => { const f = ui.item(id, x, y, w, h, { confirm: flip, onX: flip }); ui.rect(x, y, w, h, f ? 'navy' : 'night'); ui.text(x + 6, y + 5, label, { color: f ? 'white' : 'mist' }); ui.text(x + w - 6, y + 5, val, { align: 'right', color: 'sand' }); y += h + 3; };
    toggle('abs', 'ABS', A.abs ? 'ON' : 'OFF', () => { A.abs = !A.abs; apply(); });
    ui.slider('tcs', x, y, w, h, 'TRACTION CONTROL', A.tcs, 0, 10, { step: 1, set: (v) => { A.tcs = Math.round(v); apply(); }, reset: () => { A.tcs = 5; apply(); }, format: (v) => String(v) }); y += h + 3;
    ui.slider('asm', x, y, w, h, 'STABILITY CONTROL', A.asm, 0, 10, { step: 1, set: (v) => { A.asm = Math.round(v); apply(); }, reset: () => { A.asm = 5; apply(); }, format: (v) => String(v) }); y += h + 3;
    toggle('auto', 'GEARS', A.auto ? 'AUTOMATIC' : 'MANUAL', () => { A.auto = !A.auto; apply(); });
    toggle('line', 'DRIVING LINE', A.line ? 'ON' : 'OFF', () => { A.line = !A.line; apply(); });
    if (this.scene?.judge) ui.text(ui.cx, y + 2, 'A TEST MAY OVERRIDE THESE.', { align: 'center', color: 'orange' });
    ui.prompts([['confirm', 'CHANGE'], ['moveX', 'ADJUST'], ['back', 'BACK']]);
  }
}
