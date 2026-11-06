// Settings: paged, not dense. Same screen for every input; used from the title, pause and touch-only panel.
import { app } from '../core/app.js';
import { DEFAULT_SETTINGS } from '../core/save.js';
import { HEADLESS } from '../config.js';

const LOOKS = [['native', 'NATIVE'], ['spooky', 'SPOOKY'], ['ps1_horror', 'PS1 HORROR'], ['noir', 'NOIR']];
const PIXELS = [['fine', 'FINE'], ['chunky', 'CHUNKY']];
const QUALITY = [['high', 'HIGH'], ['medium', 'MEDIUM'], ['low', 'LOW']];
const FPS = [[60, '60'], [30, '30'], [0, 'DISPLAY']];
const GLYPHS = [['ps', 'PLAYSTATION'], ['xbox', 'XBOX']];

function cycle(list, v, dir = 1) {
  const i = list.findIndex((e) => e[0] === v);
  return list[(i + dir + list.length) % list.length][0];
}
const labelOf = (list, v) => list.find((e) => e[0] === v)?.[1] ?? String(v);

export function openSettings() {
  let page = 0;
  const PAGES = ['SOUND', 'CONTROLS', 'PICTURE'];
  const s = app.settings;
  const screen = {
    frozen: true,
    name: 'settings',
    setPage: (n) => { page = n; },
    update(ctx, ui) {
      ctx.hud.clear();
      ctx.hud.rect(0, 0, ui.W, ui.H, 'ink');
      ui.heading('SETTINGS', 8);
      const next = ui.tabs('stabs', 36, PAGES, page);
      if (next !== page) { page = next; ui.focus = null; }
      const w = Math.min(320, ui.W - (ui.W < 260 ? 8 : 40)); const x = (ui.W - w) >> 1;
      let y = 58;
      const changed = () => { app.applySettings(); app.saveSettings(); };
      const slider = (id, label, key, min, max, step, o) => {
        const v = ui.slider(id, x, y, w, label, s[key], min, max, step, { ...o, valueW: 40 });
        if (v !== s[key]) { s[key] = v; changed(); }
        y += 21;
      };
      const choice = (id, label, list, key) => {
        const shown = labelOf(list, s[key]);
        const hit = ui.item(id, x, y, w, label, { scale: 1, right: `< ${shown} >` });
        const left = ui.focus === id && ui.nav.left; const right = ui.focus === id && ui.nav.right;
        if (ui.focus === id) ui.sliderFocused = true;
        if (hit || right || left) {
          s[key] = cycle(list, s[key], left ? -1 : 1);
          ctx.audio.play('uiMove');
          changed();
        }
        y += 21;
      };
      const toggle = (id, label, key) => {
        const hit = ui.item(id, x, y, w, label, { scale: 1, right: s[key] ? 'ON' : 'OFF' });
        if (hit) { s[key] = !s[key]; ctx.audio.play('uiMove'); changed(); }
        y += 21;
      };
      if (page === 0) {
        slider('music', 'MUSIC', 'music', 0, 1, 0.05);
        slider('sfx', 'SFX', 'sfx', 0, 1, 0.05);
        slider('voice', 'VOICE', 'voice', 0, 1, 0.05);
        slider('master', 'MASTER', 'master', 0, 1, 0.05);
      } else if (page === 1) {
        slider('padAim', 'PAD AIM SPEED', 'padAim', 0.3, 2.5, 0.05, { percent: false, format: (v) => `${Math.round(v * 100)}%` });
        slider('mouseAim', 'MOUSE AIM', 'mouseAim', 0.3, 2.5, 0.05, { percent: false, format: (v) => `${Math.round(v * 100)}%` });
        toggle('invert', 'INVERT Y', 'invertY');
        slider('aimAssist', 'AIM ASSIST', 'aimAssist', 0, 1.5, 0.05, { percent: false, format: (v) => `${Math.round(v * 100)}%` });
        choice('glyphs', 'CONTROLLER GLYPHS', GLYPHS, 'glyphs');
        slider('shake', 'SCREEN SHAKE', 'shake', 0, 1, 0.05);
      } else {
        choice('look', 'LOOK', LOOKS, 'look');
        choice('pixel', 'PIXEL SIZE', PIXELS, 'pixelSize');
        choice('quality', 'QUALITY', QUALITY, 'quality');
        choice('fps', 'FRAME RATE', FPS, 'fps');
        const fs = !HEADLESS && !!document.fullscreenElement;
        if (ui.item('fullscreen', x, y, w, 'FULLSCREEN', { scale: 1, right: fs ? 'ON' : 'OFF' })) {
          if (!HEADLESS) {
            if (document.fullscreenElement) document.exitFullscreen?.();
            else document.documentElement.requestFullscreen?.()?.catch?.(() => {});
          }
        }
        y += 21;
      }
      y = Math.max(y + 2, ui.H - 60);
      if (ui.item('reset', x, y, w, 'RESET TO DEFAULTS', { scale: 1, color: 'orange' })) {
        ctx.audio.play('uiBack');
        Object.assign(s, DEFAULT_SETTINGS);
        changed();
      }
      // Nothing to press Back with on a touch-only device, so it gets a row of its own to tap.
      if (app.device.touchOnly && ui.item('touchBack', x, y + 21, w, 'BACK', { scale: 1 })) { ctx.audio.play('uiBack'); app.close(screen); return; }
      ui.promptBar([['tabPrev', ''], ['tabNext', 'PAGE'], ['confirm', 'CHANGE'], ['back', 'BACK']]);
      if (ui.nav.back) { ctx.audio.play('uiBack'); app.close(screen); }
    },
  };
  app.open(screen);
  return screen;
}
