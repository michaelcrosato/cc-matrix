// Menus and panels. One list component handles every screen: buttons, on/off toggles, sliders, disabled rows.
// Controller first: D-pad or left stick moves, Cross confirms, Circle goes back. Mouse and touch click rows.
import { audio } from './audio.js';
import { DEFAULTS, resetSettings, saveSettings, settings } from './settings.js';
import { input } from './input.js';

export class UI {
  constructor(root) {
    this.root = root;
    this.items = [];
    this.focus = 0;
    this.onBack = null;
    this.open = false;
    this.header = root.querySelector('#menu-title');
    this.sub = root.querySelector('#menu-sub');
    this.body = root.querySelector('#menu-body');
    this.list = root.querySelector('#menu-list');
    this.footer = root.querySelector('#menu-footer');
  }

  // Shows a screen. items: [{ label, action } | { label, toggle: {get, set} } | { label, slider: {...} }].
  show({ title, sub = '', body = '', items = [], onBack = null, footer = 'Select: Cross / Enter   Back: Circle / Esc' }) {
    this.open = true;
    this.items = items;
    this.onBack = onBack;
    this.header.textContent = title;
    this.sub.textContent = sub;
    this.sub.classList.toggle('hidden', !sub);
    this.body.innerHTML = body;
    this.body.classList.toggle('hidden', !body);
    this.footer.textContent = footer;
    this.focus = Math.max(0, items.findIndex((it) => !it.disabled));
    this.root.classList.remove('hidden');
    this.render();
  }

  hide() {
    this.open = false;
    this.root.classList.add('hidden');
    this.items = [];
  }

  render() {
    this.list.innerHTML = '';
    this.items.forEach((item, i) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'row';
      if (i === this.focus) row.classList.add('focus');
      if (item.disabled) row.classList.add('disabled');
      const label = document.createElement('span');
      label.className = 'row-label';
      label.textContent = item.label;
      row.appendChild(label);
      const value = document.createElement('span');
      value.className = 'row-value';
      value.textContent = this.valueText(item);
      row.appendChild(value);
      if (item.hint) {
        const hint = document.createElement('span');
        hint.className = 'row-hint';
        hint.textContent = item.hint;
        row.appendChild(hint);
      }
      row.addEventListener('pointerenter', () => {
        if (this.focus !== i) {
          this.focus = i;
          this.updateFocus();
        }
      });
      row.addEventListener('click', (e) => {
        this.focus = i;
        this.updateFocus();
        if (item.slider && e.offsetX < row.offsetWidth / 2) this.adjust(-1);
        else if (item.slider) this.adjust(1);
        else this.activate();
      });
      this.list.appendChild(row);
    });
  }

  valueText(item) {
    if (item.toggle) return item.toggle.get() ? 'On' : 'Off';
    if (item.slider) return item.slider.fmt ? item.slider.fmt(item.slider.get()) : String(item.slider.get());
    if (item.value) return item.value();
    return '';
  }

  // Refresh labels and values without rebuilding the list (keeps focus).
  refresh() {
    if (!this.open) return;
    const rows = this.list.querySelectorAll('.row');
    rows.forEach((row, i) => {
      const v = row.querySelector('.row-value');
      if (v) v.textContent = this.valueText(this.items[i]);
    });
  }

  updateFocus() {
    this.list.querySelectorAll('.row').forEach((row, i) => row.classList.toggle('focus', i === this.focus));
    const row = this.list.querySelectorAll('.row')[this.focus];
    if (row && row.scrollIntoView) row.scrollIntoView({ block: 'nearest' });
  }

  // Moves focus by one, skipping disabled rows. Wraps around.
  move(dir) {
    const n = this.items.length;
    if (!n) return;
    let i = this.focus;
    for (let k = 0; k < n; k++) {
      i = (i + dir + n) % n;
      if (!this.items[i].disabled) break;
    }
    if (i !== this.focus) {
      this.focus = i;
      this.updateFocus();
      audio.sfx('menu');
    }
  }

  adjust(dir) {
    const item = this.items[this.focus];
    if (!item || item.disabled) return;
    if (item.toggle) {
      item.toggle.set(!item.toggle.get());
    } else if (item.slider) {
      const s = item.slider;
      const v = Math.round((s.get() + dir * s.step) / s.step) * s.step;
      s.set(Math.min(s.max, Math.max(s.min, v)));
    } else {
      return;
    }
    audio.sfx('menu');
    this.refresh();
  }

  activate() {
    const item = this.items[this.focus];
    if (!item || item.disabled) {
      audio.sfx('back');
      return;
    }
    if (item.toggle || item.slider) {
      if (item.toggle) this.adjust(1);
      return;
    }
    audio.sfx('confirm');
    if (item.action) item.action();
  }

  // Called once per frame by the main loop while a menu is open.
  update() {
    if (!this.open) return;
    if (input.nav === 'up') this.move(-1);
    else if (input.nav === 'down') this.move(1);
    else if (input.nav === 'left') this.adjust(-1);
    else if (input.nav === 'right') this.adjust(1);
    if (input.edge.confirm) this.activate();
    if (input.edge.back && this.onBack) {
      audio.sfx('back');
      this.onBack();
    }
  }
}

// Settings screen rows, built fresh each time it is opened.
export function settingsItems({ back, applyHud, refresh }) {
  const commit = () => {
    saveSettings();
    audio.applyVolumes();
  };
  const toggle = (label, key, hint) => ({
    label,
    hint,
    toggle: { get: () => settings[key], set: (v) => { settings[key] = v; commit(); } },
  });
  const slider = (label, key, min, max, step, fmt, extra = {}) => ({
    label,
    slider: { get: () => settings[key], set: (v) => { settings[key] = v; commit(); }, min, max, step, fmt, ...extra },
  });
  return [
    toggle('Invert stick X (left / right)', 'invertX', 'Fixes sticks that read backwards'),
    toggle('Invert stick Y (up / down)', 'invertY', 'Fixes sticks that read backwards'),
    slider('Stick deadzone', 'deadzone', 0.02, 0.4, 0.02, (v) => `${Math.round(v * 100)}%`),
    slider('Music volume', 'musicVol', 0, 10, 1, (v) => String(v)),
    slider('Effects volume', 'sfxVol', 0, 10, 1, (v) => String(v)),
    toggle('Screen shake', 'screenShake'),
    toggle('Controller rumble', 'rumble'),
    {
      label: 'HUD scale',
      slider: {
        get: () => settings.hudScale,
        set: (v) => { settings.hudScale = v; commit(); applyHud(); },
        min: 80, max: 130, step: 5, fmt: (v) => `${v}%`,
      },
    },
    {
      label: 'Reset to defaults',
      hint: `Restores ${Object.keys(DEFAULTS).length} settings`,
      action: () => {
        resetSettings();
        commit();
        applyHud();
        refresh();
      },
    },
    { label: 'Back', action: back },
  ];
}

export const CONTROLS_BODY = `
<div class="help">
  <h3>Controller (PS5 layout)</h3>
  <dl>
    <dt>Left stick</dt><dd>Fly: move the ship inside the stage bounds</dd>
    <dt>Cross</dt><dd>Fire. Tap for lasers. Hold to lock on, release to launch a homing volley</dd>
    <dt>Circle</dt><dd>Nova bomb: clears the screen ahead and hits the boss hard</dd>
    <dt>R1 / L1</dt><dd>Boost / brake</dd>
    <dt>L2 / Triangle</dt><dd>Barrel roll left / right. Rolling deflects enemy shots</dd>
    <dt>Options</dt><dd>Pause</dd>
  </dl>
  <h3>Keyboard</h3>
  <dl>
    <dt>Arrows / WASD</dt><dd>Fly</dd>
    <dt>Space / J / Z</dt><dd>Fire (tap, or hold to lock on)</dd>
    <dt>K / X</dt><dd>Nova bomb</dd>
    <dt>Shift / Ctrl</dt><dd>Boost / brake</dd>
    <dt>Q / E</dt><dd>Barrel roll left / right</dd>
    <dt>Esc / P</dt><dd>Pause</dd>
  </dl>
  <h3>Menus</h3>
  <p>D-pad or left stick moves. Cross or Enter selects. Circle or Esc goes back. Mouse works too.</p>
</div>`;
