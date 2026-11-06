// Settings, Pause, Telegraph, Claim Form, Claim Denied. All on the pixel UI.
import { app } from '../core/app.js';
import { ui } from '../core/ui.js';
import { settings, saveSettings, resetSettings, applySettings, SETTING_DEFAULTS, LOOKS } from '../core/settings.js';
import { saveGame } from '../core/save.js';
import { TITLE } from '../config.js';
import { CHAPTERS } from '../core/run.js';
import { DevScreen } from './dev.js';

const PAGES = ['AUDIO', 'CONTROLS', 'DISPLAY'];
const pct = (v) => Math.round(v * 100) + '%';
export class SettingsScreen {
  constructor() { this.page = 0; this.st = { i: 0 }; }
  rows() {
    const s = settings;
    if (this.page === 0) return [
      { k: 'music', label: 'MUSIC', min: 0, max: 1, step: 0.05, fmt: pct }, { k: 'sfx', label: 'SOUND EFFECTS', min: 0, max: 1, step: 0.05, fmt: pct },
      { k: 'voice', label: 'VOICES', min: 0, max: 1, step: 0.05, fmt: pct }, { k: 'master', label: 'MASTER', min: 0, max: 1, step: 0.05, fmt: pct },
    ];
    if (this.page === 1) return [
      { k: 'padAim', label: 'AIM SPEED: PAD', min: 0.3, max: 2.5, step: 0.1, fmt: (v) => v.toFixed(1) }, { k: 'mouseAim', label: 'AIM SPEED: MOUSE', min: 0.3, max: 2.5, step: 0.1, fmt: (v) => v.toFixed(1) },
      { k: 'invertY', label: 'INVERT Y', bool: true }, { k: 'aimAssist', label: 'AIM ASSIST', bool: true },
      { k: 'glyphs', label: 'CONTROLLER GLYPHS', choices: ['ps', 'xbox'], names: ['PLAYSTATION', 'XBOX'] }, { k: 'shake', label: 'SCREEN SHAKE', min: 0, max: 1, step: 0.1, fmt: pct },
    ];
    return [
      { k: 'look', label: 'LOOK', choices: LOOKS, names: ['NATIVE', 'SPOOKY', 'PS1 HORROR', 'NOIR'] }, { k: 'pixelSize', label: 'PIXEL SIZE', choices: [1, 2], names: ['FINE', 'CHUNKY'] },
      { k: 'quality', label: 'QUALITY', choices: ['low', 'medium', 'high'], names: ['LOW', 'MEDIUM', 'HIGH'] }, { k: 'fps', label: 'FRAME RATE', choices: [30, 60, 0], names: ['30', '60', 'DISPLAY'] },
      { k: 'fullscreen', label: 'FULLSCREEN', action: true }, { k: 'reset', label: 'RESET TO DEFAULTS', action: true },
    ];
  }
  apply(engine) {
    applySettings(engine);
    try {
      engine.settings.set({ look: settings.look === 'native' ? undefined : settings.look, pixelSize: settings.pixelSize === 2 ? 'chunky' : 'fine', quality: settings.quality, fps: settings.fps });
    } catch { /* optional */ }
  }
  frame(host) {
    const nav = ui.nav, W = ui.W, H = ui.H, ctx = host.ctx || app.engine.context;
    ui.rect(0, 0, W, H, 'ink');
    ui.text(16, 12, 'SETTINGS', { scale: 2, color: 'sand' });
    const c = ui.tabs(16, 34, PAGES, this.page); if (c >= 0) { this.page = c; this.st.i = 0; }
    if (nav.prev) { this.page = (this.page + 2) % 3; this.st.i = 0; } if (nav.next) { this.page = (this.page + 1) % 3; this.st.i = 0; }
    const rows = this.rows();
    const view = rows.map((r) => {
      let value = '';
      if (r.bool) value = settings[r.k] ? 'ON' : 'OFF'; else if (r.choices) value = r.names[Math.max(0, r.choices.indexOf(settings[r.k]))]; else if (r.fmt) value = r.fmt(settings[r.k]);
      return { label: r.label, value: r.min !== undefined ? '' : value };
    });
    const res = ui.list(16, 56, W - 32, view, this.st, { rowH: 22 });
    const sel = rows[this.st.i];
    // sliders drawn inside rows
    rows.forEach((r, i) => {
      if (r.min === undefined) return;
      const x = W - 32 - 100, y = 56 + i * 22 + 7; const s = ui.slider(x, y, 100, settings[r.k], r.min, r.max, r.step, i === this.st.i, SETTING_DEFAULTS[r.k]);
      ui.text(x - 6, y, r.fmt(settings[r.k]), { align: 'right', color: 'sand' });
      if (s.out !== null && s.out !== settings[r.k]) { this.st.i = i; settings[r.k] = Math.max(r.min, Math.min(r.max, s.out)); this.changed(host); }
    });
    if (sel) {
      let dir = 0; if (res.left) dir = -1; if (res.right) dir = 1;
      if (sel.min !== undefined && dir) { settings[sel.k] = Math.round(Math.max(sel.min, Math.min(sel.max, settings[sel.k] + dir * sel.step)) * 100) / 100; this.changed(host); ctx.audio.play('uiMove'); }
      else if (sel.bool && (dir || res.ok >= 0)) { settings[sel.k] = !settings[sel.k]; this.changed(host); ctx.audio.play('uiMove'); }
      else if (sel.choices && (dir || res.ok >= 0)) { const i = sel.choices.indexOf(settings[sel.k]); settings[sel.k] = sel.choices[(i + (dir || 1) + sel.choices.length) % sel.choices.length]; this.changed(host); ctx.audio.play('uiMove'); }
      else if (sel.action && res.ok >= 0) {
        if (sel.k === 'reset') { resetSettings(); this.changed(host); ctx.audio.play('uiOk'); }
        else if (sel.k === 'fullscreen') { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch { /* denied */ } }
      }
    }
    if (nav.back) { saveSettings(); app.pop(); ctx.audio.play('uiBack'); }
    ui.prompts([['confirm', 'CHANGE'], ['prev', 'PAGE'], ['back', 'BACK']]);
  }
  changed(host) { saveSettings(); this.apply(app.engine); }
}

export class PauseScreen {
  constructor() { this.st = { i: 0 }; }
  frame(host) {
    const nav = ui.nav, W = ui.W, H = ui.H, ctx = host.ctx || app.engine.context;
    ui.rect(0, 0, W, H, 'ink');
    ui.text(W / 2, 22, 'PAUSED', { align: 'center', scale: 3, color: 'sand' });
    ui.text(W / 2, 54, host.def?.name || TITLE, { align: 'center', color: 'mist' });
    const rows = [{ label: 'RESUME' }, { label: 'SETTINGS' }, { label: 'RESTART FROM CHECKPOINT' }, ...(app.hub ? [] : [{ label: 'DEV MODE' }]), { label: 'QUIT TO TITLE' }];
    const x = Math.floor(W / 2) - 100;
    const r = ui.list(x, 76, 200, rows, this.st, { rowH: 18 });
    if (nav.back || nav.third) { app.pop(); return; }
    if (r.ok >= 0) {
      const label = rows[r.ok].label; ctx.audio.play('uiOk');
      if (label === 'RESUME') app.pop();
      else if (label === 'SETTINGS') app.push(new SettingsScreen());
      else if (label === 'RESTART FROM CHECKPOINT') { app.pop(); host.restartFromCheckpoint?.(); }
      else if (label === 'DEV MODE') app.push(new DevScreen());
      else if (label === 'QUIT TO TITLE') { app.pop(); host.quitToTitle?.(); }
    }
    ui.prompts([['confirm', 'SELECT'], ['back', 'RESUME']]);
  }
}

/** Telegraph key: save, open the Case, leave. */
export class TelegraphScreen {
  constructor(spot) { this.st = { i: 0 }; this.spot = spot; this.msg = ''; }
  frame(host) {
    const nav = ui.nav, W = ui.W, H = ui.H, ctx = host.ctx || app.engine.context;
    ui.rect(0, 0, W, H, 'ink');
    ui.text(W / 2, 24, 'TELEGRAPH', { align: 'center', scale: 3, color: 'lime' });
    ui.text(W / 2, 52, 'A DRY ROOM. NOTHING COMES IN.', { align: 'center', color: 'mist' });
    const rows = [{ label: 'SAVE CLAIM' }, { label: 'OPEN THE CASE' }, { label: 'RING THE CLAIMS DESK' }, { label: 'LEAVE' }];
    const r = ui.list(Math.floor(W / 2) - 90, 80, 180, rows, this.st, { rowH: 20 });
    if (this.msg) ui.text(W / 2, 175, this.msg, { align: 'center', color: 'sand' });
    if (nav.back) { app.pop(); return; }
    if (r.ok >= 0) {
      ctx.audio.play('uiOk');
      if (r.ok === 0) { const ok = host.saveCheckpoint?.(this.spot); this.msg = ok ? 'CLAIM SAVED. THE CLERK STAMPS IT.' : 'COULD NOT SAVE.'; ctx.audio.play('telegraph'); }
      else if (r.ok === 1) { app.pop(); host.openCase?.(); }
      else if (r.ok === 2) { app.pop(); host.openCase?.('RADIO'); }
      else app.pop();
    }
    ui.prompts([['confirm', 'SELECT'], ['back', 'LEAVE']]);
  }
}

/** The Claim Form after each chapter: five big lines, a stamp, bonus doubloons. */
export class ClaimForm {
  constructor(o) { this.o = o; this.t = 0; this.done = false; }
  enter() { app.mix?.play('onhold'); }
  frame(host) {
    const nav = ui.nav, W = ui.W, H = ui.H, o = this.o; const ctx = host.ctx || app.engine.context;
    this.t += 1 / 60;
    ui.rect(0, 0, W, H, 'ink');
    ui.panel(30, 16, W - 60, H - 52, { fill: 'night', edge: 'sand' });
    ui.text(W / 2, 26, 'CLAIM FORM', { align: 'center', scale: 2, color: 'sand' });
    ui.text(W / 2, 46, o.title, { align: 'center', color: 'mist' });
    const lines = [['TIME', fmtTime(o.time)], ['ACCURACY', Math.round(o.accuracy * 100) + '%'], ['HEADSHOTS', String(o.heads)], ['KICKS', String(o.kicks)], ['DEDUCTIONS', '-' + o.deductions]];
    lines.forEach(([k, v], i) => { const t = this.t - i * 0.35; if (t < 0) return; const y = 64 + i * 20; ui.text(60, y, k, { scale: 2, color: 'white' }); ui.text(W - 60, y, v, { scale: 2, align: 'right', color: 'sand' }); ui.rect(60, y + 16, W - 120, 1, 'slate'); if (t < 0.05 && !this['s' + i]) { this['s' + i] = 1; ctx.audio.play('uiMove'); } });
    if (this.t > 2.2) {
      if (!this.stamped) { this.stamped = true; ctx.audio.play('stamp'); ctx.engine.shake.add(0.5); }
      const k = Math.min(1, (this.t - 2.2) / 0.15);
      const col = o.grade === 'APPROVED' ? 'lime' : o.grade === 'PENDING' ? 'sand' : 'red';
      const w = ui.measure(o.grade, 3);
      ui.rect(W / 2 - w / 2 - 6, 168 - (1 - k) * 30, w + 12, 28, 'ink'); ui.rect(W / 2 - w / 2 - 4, 170 - (1 - k) * 30, w + 8, 24, col);
      ui.text(W / 2, 174 - (1 - k) * 30, o.grade, { align: 'center', scale: 3, color: 'ink', shadow: false });
      ui.text(W / 2, 204, `BONUS: ${o.bonus} DOUBLOONS`, { align: 'center', color: 'sand' });
    }
    if (this.t > 3.2) { ui.prompts([['confirm', 'CONTINUE']]); if (nav.ok || nav.click || app.autoAdvance || app.attract) { this.done = true; app.pop(); o.onDone?.(); host.scripts?.update(0); } }
  }
}
export const fmtTime = (s) => { const m = Math.floor(s / 60), r = Math.floor(s % 60); return `${m}:${String(r).padStart(2, '0')}`; };
export function claimGrade(o) { if (o.deaths === 0 && o.accuracy >= 0.5) return 'APPROVED'; if (o.deaths <= 2) return 'PENDING'; return 'DENIED'; }

export class DeniedScreen {
  constructor() { this.t = 0; this.st = { i: 0 }; }
  enter() { app.mix?.play(null); }
  frame(host) {
    const nav = ui.nav, W = ui.W, H = ui.H, ctx = host.ctx || app.engine.context;
    this.t += 1 / 60; ui.rect(0, 0, W, H, 'ink');
    const k = Math.min(1, this.t / 0.25);
    const w = ui.measure('CLAIM DENIED', 3);
    ui.rect(W / 2 - w / 2 - 8, 58 - (1 - k) * 60, w + 16, 34, 'red'); ui.text(W / 2, 66 - (1 - k) * 60, 'CLAIM DENIED', { align: 'center', scale: 3, color: 'white' });
    if (this.t > 0.25 && !this.hit) { this.hit = true; ctx.audio.play('stamp'); ctx.engine.shake.add(0.6); }
    if (this.t > 0.8) {
      const rows = [{ label: 'CONTINUE' }, { label: 'QUIT TO TITLE' }];
      const r = ui.list(Math.floor(W / 2) - 80, 120, 160, rows, this.st, { rowH: 20 });
      if (r.ok === 0) { app.pop(); host.restartFromCheckpoint?.(); } else if (r.ok === 1) { app.pop(); host.quitToTitle?.(); }
      ui.prompts([['confirm', 'SELECT']]);
    }
  }
}
