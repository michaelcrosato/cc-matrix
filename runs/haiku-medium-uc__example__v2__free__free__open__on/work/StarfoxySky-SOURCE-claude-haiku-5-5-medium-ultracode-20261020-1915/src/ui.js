// 10-foot menus. Every screen is a Menu driven by the virtual controls from input.js:
// d-pad / stick to move, Cross or Enter to select, Circle or Esc to go back, and
// left/right to change values on steppers and toggles.

import { settings, saveSettings, progress, resetProgress } from './settings.js';
import { MISSIONS, isUnlocked } from './missions.js';
import { CONTROL_ROWS, RULES_CAN, RULES_CANNOT, CREDITS } from './content.js';

export function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

// A focusable list of items. Items:
//   { label, sub?, value?: () => string, run?: () => void, step?: (dir) => void, pos?: {col,row} }
// With `pos` on every item the menu navigates in 2D (used by the map); otherwise it is a list.
export class Menu {
  constructor(container, items, { onBack = null } = {}) {
    this.items = items;
    this.onBack = onBack;
    this.index = 0;
    this.grid = items.every((i) => i.pos);
    this.nodes = items.map((item, i) => {
      const node = el('div', 'menu-item' + (item.sub !== undefined ? ' has-sub' : '') + (item.disabled ? ' disabled' : ''));
      const text = el('div', 'menu-text');
      text.append(el('div', 'menu-label', item.label));
      if (item.sub !== undefined) text.append(el('div', 'menu-sub', item.sub));
      node.append(text);
      if (item.value) node.append(el('div', 'menu-value'));
      if (item.pos) {
        node.style.gridColumn = String(item.pos.col + 1);
        node.style.gridRow = String(item.pos.row + 1);
      }
      node.addEventListener('mouseenter', () => this.focus(i));
      node.addEventListener('click', () => {
        this.focus(i);
        this.activate(i);
      });
      container.append(node);
      return node;
    });
    this.refresh();
    this.focus(0);
  }

  focus(i) {
    this.index = Math.max(0, Math.min(this.items.length - 1, i));
    this.nodes.forEach((n, k) => n.classList.toggle('focus', k === this.index));
    const node = this.nodes[this.index];
    if (node && node.scrollIntoView) node.scrollIntoView({ block: 'nearest' });
  }

  refresh() {
    this.items.forEach((item, i) => {
      const v = this.nodes[i].querySelector('.menu-value');
      if (v && item.value) v.textContent = item.value();
    });
  }

  activate(i) {
    const item = this.items[i];
    if (item.run) item.run();
    this.refresh();
  }

  move(dx, dy) {
    if (!this.grid) {
      if (dy) this.focus(this.index + dy);
      return;
    }
    const cur = this.items[this.index].pos;
    let best = -1;
    let bestScore = Infinity;
    this.items.forEach((item, i) => {
      if (i === this.index) return;
      const p = item.pos;
      const ddx = p.col - cur.col;
      const ddy = p.row - cur.row;
      if (dx && Math.sign(ddx) !== dx) return;
      if (dy && Math.sign(ddy) !== dy) return;
      const score = Math.abs(ddx) * 2 + Math.abs(ddy) * 3;
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    });
    if (best >= 0) this.focus(best);
  }

  // dx/dy are signed step counts: several presses in one frame each apply.
  handle(m) {
    const vStep = Math.sign(m.dy);
    for (let i = 0; i < Math.abs(m.dy); i++) this.move(0, vStep);
    const hStep = Math.sign(m.dx);
    for (let i = 0; i < Math.abs(m.dx); i++) {
      const item = this.items[this.index];
      if (item.step) item.step(hStep);
      else this.move(hStep, 0);
    }
    this.refresh();
    if (m.confirm) this.activate(this.index);
    if (m.back && this.onBack) this.onBack();
  }
}

const btnRow = (input, pairs) => {
  const row = el('div', 'hints');
  for (const [action, text] of pairs) {
    const h = el('span', 'hint');
    h.append(el('b', '', input.label(action)), document.createTextNode(' ' + text));
    row.append(h);
  }
  return row;
};

export class UI {
  constructor(root, input) {
    this.root = root;
    this.input = input;
    this.overlay = el('div', 'overlay');
    this.toastEl = el('div', 'toast');
    this.root.append(this.overlay, this.toastEl);
    this.menu = null;
    this.scrollEl = null;
    this.toastTimer = 0;
  }

  clear() {
    this.overlay.replaceChildren();
    this.menu = null;
    this.scrollEl = null;
    this.overlay.classList.remove('hidden');
  }

  hide() {
    this.overlay.replaceChildren();
    this.overlay.classList.add('hidden');
    this.menu = null;
    this.scrollEl = null;
  }

  panel(title, sub, cls = '') {
    const p = el('div', 'panel ' + cls);
    if (title) p.append(el('h1', '', title));
    if (sub) p.append(el('p', 'sub', sub));
    this.overlay.append(p);
    return p;
  }

  // Passes the frame's menu input to the active screen.
  handle(menuFrame) {
    if (this.menu) this.menu.handle(menuFrame);
    if (this.scrollEl && menuFrame.scroll) {
      this.scrollEl.scrollTop -= menuFrame.scroll * 22; // stick up moves the view up
    }
  }

  toast(text, dur = 2.4) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    this.toastTimer = dur;
  }

  tickToast(dt) {
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastEl.classList.remove('show');
    }
  }

  // ----- Screens -----

  showLoading(text) {
    this.clear();
    const p = this.panel('STARFOXY SKY', text, 'slim');
    p.append(el('div', 'spinner'));
  }

  showError(title, text) {
    this.clear();
    this.panel(title, text, 'slim error');
  }

  showTouchGate(onSettings) {
    this.clear();
    const p = this.panel('Controller or keyboard required', 'Starfoxy Sky is built for a 10-foot setup. Connect a PlayStation-compatible or Xbox-style controller, or use a keyboard, to play.', 'slim');
    const list = el('div', 'menu-list');
    p.append(list);
    this.menu = new Menu(list, [{ label: 'Settings', run: onSettings }]);
  }

  showTitle(a) {
    this.clear();
    const p = this.panel('STARFOXY SKY', 'A spiritual successor demo. Pick your route, learn the lane, and fly.', 'title');
    const list = el('div', 'menu-list');
    p.append(list);
    this.menu = new Menu(list, [
      { label: 'Start Campaign', sub: 'Training, Sky Plains, a route fork, and the Venom Core', run: a.start },
      { label: 'Settings', sub: 'Axis inversion, sensitivity, audio, rumble, labels', run: a.settings },
      { label: 'Controls & Rules', sub: 'What you can and cannot do', run: a.controls },
      { label: 'Credits & About', sub: 'Source information and feedback', run: a.credits },
    ]);
    p.append(btnRow(this.input, [['confirm', 'Select'], ['move', 'Move']]));
  }

  showMap(onPick, onBack) {
    this.clear();
    const p = this.panel('Campaign Map', 'Clear Training to open Sky Plains. Clear Sky Plains to choose the Canyon Run or the Asteroid Belt. Clear either to face the Venom Core.', 'wide');
    const grid = el('div', 'map');
    p.append(grid);
    const items = MISSIONS.map((m) => {
      const unlocked = isUnlocked(m.id, progress.done);
      const done = progress.done[m.id];
      let sub = 'Locked';
      if (done) sub = `Cleared: ${done.medal[0].toUpperCase()}${done.medal.slice(1)}`;
      else if (unlocked) sub = m.boss ? 'Boss' : 'Available';
      return {
        label: m.name,
        sub,
        pos: m.map,
        disabled: !unlocked,
        run: () => (unlocked ? onPick(m) : this.toast(this.lockedText(m.id))),
      };
    });
    this.menu = new Menu(grid, items, { onBack });
    p.append(btnRow(this.input, [['confirm', 'Launch'], ['back', 'Back']]));
  }

  lockedText(id) {
    if (id === 'plains') return 'Locked: clear Training first.';
    if (id === 'canyon' || id === 'belt') return 'Locked: clear Sky Plains first.';
    return 'Locked: clear the Canyon Run or the Asteroid Belt first.';
  }

  showBriefing(m, onLaunch, onBack) {
    this.clear();
    const p = this.panel(m.name, m.boss ? 'Boss sortie' : 'Sortie briefing', 'slim');
    const list = el('div', 'brief');
    for (const line of m.briefing) list.append(el('p', '', line));
    p.append(list);
    const menuEl = el('div', 'menu-list');
    p.append(menuEl);
    this.menu = new Menu(menuEl, [
      { label: 'Launch', run: onLaunch },
      { label: 'Back to map', run: onBack },
    ], { onBack });
    p.append(btnRow(this.input, [['confirm', 'Select'], ['back', 'Back']]));
  }

  showSettings(onBack) {
    this.clear();
    const p = this.panel('Settings', 'Left and right change values. Cross or Enter toggles.', 'wide');
    const list = el('div', 'menu-list scroll-list');
    p.append(list);
    const toggle = (key) => ({
      label: this.settingLabel(key),
      value: () => (settings[key] ? 'On' : 'Off'),
      run: () => { settings[key] = !settings[key]; saveSettings(); },
      step: () => { settings[key] = !settings[key]; saveSettings(); },
    });
    const stepper = (key, values, labels, fmt = (v) => v) => {
      const cycle = (dir) => {
        const i = values.indexOf(settings[key]);
        const n = (i + dir + values.length) % values.length;
        settings[key] = values[n];
        saveSettings();
        if (key.endsWith('Vol')) this.onVolume?.();
      };
      return {
        label: this.settingLabel(key),
        value: () => (labels ? labels[values.indexOf(settings[key])] : fmt(settings[key])),
        run: () => cycle(1),
        step: (dir) => cycle(dir),
      };
    };
    const volumes = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const items = [
      toggle('invertX'),
      toggle('invertY'),
      stepper('sensitivity', [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150], null, (v) => `${v}%`),
      stepper('difficulty', ['rookie', 'normal', 'ace'], ['Rookie', 'Normal', 'Ace']),
      stepper('glyphs', ['ps', 'xbox', 'keys'], ['PlayStation', 'Xbox', 'Keyboard']),
      stepper('masterVol', volumes, null, (v) => `${v}%`),
      stepper('musicVol', volumes, null, (v) => `${v}%`),
      stepper('sfxVol', volumes, null, (v) => `${v}%`),
      toggle('shake'),
      toggle('rumble'),
      toggle('subtitles'),
      {
        label: 'Test rumble',
        sub: 'Plays a short pulse on supported controllers',
        run: () => this.input.rumble(0.9, 0.6, 400),
      },
      {
        label: 'Reset campaign progress',
        value: () => (this.confirmReset ? 'Press again to confirm' : ''),
        run: () => {
          if (!this.confirmReset) {
            this.confirmReset = true;
            this.toast('Press again to reset all medals and unlocks.');
            return;
          }
          resetProgress();
          this.confirmReset = false;
          this.toast('Progress reset.');
        },
      },
      { label: 'Back', run: onBack },
    ];
    this.menu = new Menu(list, items, { onBack });
    p.append(btnRow(this.input, [['confirm', 'Change'], ['back', 'Back']]));
  }

  settingLabel(key) {
    return {
      invertX: 'Invert horizontal axis',
      invertY: 'Invert vertical axis',
      sensitivity: 'Stick sensitivity',
      difficulty: 'Difficulty',
      glyphs: 'Button labels',
      masterVol: 'Master volume',
      musicVol: 'Music volume',
      sfxVol: 'Effects volume',
      shake: 'Screen shake',
      rumble: 'Controller rumble',
      subtitles: 'Subtitles',
    }[key];
  }

  showControls(onBack) {
    this.clear();
    const p = this.panel('Controls & Rules', 'Controller first. Keyboard and mouse map to the same actions.', 'wide');
    const scroll = el('div', 'scroll');
    const table = el('table', 'controls');
    const head = el('tr');
    ['Action', 'PlayStation', 'Xbox', 'Keyboard'].forEach((h) => head.append(el('th', '', h)));
    table.append(head);
    for (const row of CONTROL_ROWS) {
      const tr = el('tr');
      row.forEach((c) => tr.append(el('td', '', c)));
      table.append(tr);
    }
    scroll.append(table);
    const cols = el('div', 'rules');
    const can = el('div', 'rule-col');
    can.append(el('h2', '', 'You can'));
    RULES_CAN.forEach((t) => can.append(el('p', '', t)));
    const cannot = el('div', 'rule-col');
    cannot.append(el('h2', '', 'You cannot'));
    RULES_CANNOT.forEach((t) => cannot.append(el('p', '', t)));
    cols.append(can, cannot);
    scroll.append(cols);
    p.append(scroll);
    this.scrollEl = scroll;
    const menuEl = el('div', 'menu-list');
    p.append(menuEl);
    this.menu = new Menu(menuEl, [{ label: 'Back', run: onBack }], { onBack });
    p.append(btnRow(this.input, [['confirm', 'Select'], ['back', 'Back']]));
  }

  showCredits(onBack) {
    this.clear();
    const p = this.panel('Credits & About', null, 'wide credits');
    const scroll = el('div', 'scroll');
    for (const [heading, lines] of CREDITS) {
      scroll.append(el('h2', '', heading));
      for (const line of lines) scroll.append(el('p', 'credit-line', line));
    }
    p.append(scroll);
    this.scrollEl = scroll;
    const menuEl = el('div', 'menu-list');
    p.append(menuEl);
    this.menu = new Menu(menuEl, [{ label: 'Back', run: onBack }], { onBack });
    p.append(btnRow(this.input, [['confirm', 'Select'], ['back', 'Back'], ['move', 'Scroll with stick']]));
  }

  showPause(a) {
    this.clear();
    const p = this.panel('Paused', 'Mission paused. Your progress is kept on this machine when you clear a sortie.', 'slim');
    const list = el('div', 'menu-list');
    p.append(list);
    this.menu = new Menu(list, [
      { label: 'Resume', run: a.resume },
      { label: 'Restart sortie', run: a.restart },
      { label: 'Settings', run: a.settings },
      { label: 'Controls & Rules', run: a.controls },
      { label: 'Abort to campaign map', run: a.abort },
    ], { onBack: a.resume });
    p.append(btnRow(this.input, [['confirm', 'Select'], ['back', 'Resume']]));
  }

  showResults(r, m, a) {
    this.clear();
    const title = r.state === 'clear' ? 'Sector Clear' : 'Ship Lost';
    const p = this.panel(title, m.name, 'wide results');
    if (r.state === 'clear') {
      const medal = el('div', `medal ${r.medal}`, `${r.medal.toUpperCase()} MEDAL`);
      p.append(medal);
    }
    const stats = el('div', 'stats');
    const rows = [
      ['Score', r.score.toLocaleString('en-US')],
      ['Kills', `${r.kills} / ${r.spawned}`],
      ['Hits taken', String(r.hitsTaken)],
      ['Gate rings', String(r.rings)],
      ['Bombs left', String(r.bombsLeft)],
      ['Time', formatTime(r.time)],
    ];
    for (const [k, v] of rows) {
      const row = el('div', 'stat');
      row.append(el('span', 'k', k), el('span', 'v', v));
      stats.append(row);
    }
    p.append(stats);
    const list = el('div', 'menu-list');
    p.append(list);
    const items = [];
    if (r.state === 'clear') items.push({ label: 'Continue to map', run: a.map });
    else items.push({ label: 'Back to map', run: a.map });
    items.push({ label: 'Retry sortie', run: a.retry });
    this.menu = new Menu(list, items, { onBack: a.map });
    p.append(btnRow(this.input, [['confirm', 'Select'], ['back', 'Map']]));
  }

}

export function formatTime(sec) {
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
