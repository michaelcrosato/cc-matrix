// Everything off the title: The Week, Drop-In Class, Family Hour, Settings, About.
import { App } from '../../app.js';
import { ACTIVITIES, ACTIVITY_IDS } from '../../data/activities.js';
import { PRESET_LOOKS } from '../../data/classmates.js';
import { STATIONS } from '../../data/stations.js';
import { Menu, navX, navY, NavRepeat } from '../menu.js';
import { promptBar } from '../prompts.js';
import { sayCentered } from '../font.js';
import { heading, panel } from '../widgets.js';
import { dim, MenuScreen } from './common.js';
import { SettingsScreen } from './settings.js';
import { AboutScreen } from './about.js';

export class MainMenuScreen extends MenuScreen {
  constructor() {
    const items = [
      { label: 'The Week', id: 'week', action: () => App.stack.push(new SlotScreen()) },
      { label: 'Drop-In Class', id: 'dropin', action: () => App.stack.push(new DropInScreen()) },
      { label: 'Family Hour', id: 'family', action: () => App.go('join') },
      { label: 'Settings', id: 'settings', action: () => App.stack.push(new SettingsScreen()) },
      { label: 'About & Credits', id: 'about', action: () => App.stack.push(new AboutScreen()) },
    ];
    const menu = new Menu(items, { width: 220, align: 'center', y: 96, onBack: () => App.stack.pop(this) });
    super('main', null, menu, { dim: false });
  }
}

export class SlotScreen extends MenuScreen {
  constructor() {
    const menu = new Menu([], { width: 340, y: 70, onBack: () => App.stack.pop(this) });
    super('slots', 'The Week', menu, { remark: 'Three guests may stay. Nobody has ever asked for a fourth.' });
    this.refresh();
  }
  refresh() {
    const slots = App.store.data.slots;
    this.menu.setItems(slots.map((s, i) => ({
      label: s ? s.name : `Guest ${i + 1}: empty`,
      id: `slot${i}`,
      right: () => (s ? (s.week > 1 ? `Week ${s.week}, day ${s.day}` : `Day ${s.day}`) : ''),
      action: () => (s ? App.stack.push(new SlotActions(i, this)) : App.stack.push(new NameEntryScreen(i))),
    })));
  }
  onReturn() { this.refresh(); }
}

class SlotActions extends MenuScreen {
  constructor(i, parent) {
    const s = App.store.data.slots[i];
    const items = [
      { label: s.week > 1 ? `Continue week ${s.week}, day ${s.day}` : `Continue day ${s.day}`, id: 'continue', action: () => { App.store.use(i); App.continueWeek(); } },
      { label: 'Erase this guest', id: 'erase', action: () => App.stack.push(new ConfirmErase(i, parent, this)) },
    ];
    const menu = new Menu(items, { width: 320, y: 80, onBack: () => App.stack.pop(this) });
    super('slot-actions', s.name, menu);
  }
}

class ConfirmErase extends MenuScreen {
  constructor(i, parent, actions) {
    const menu = new Menu([
      { label: 'No. Keep them.', id: 'no', action: () => App.stack.pop(this) },
      { label: 'Yes. Forget them.', id: 'yes', action: () => { App.store.erase(i); App.stack.pop(this); App.stack.pop(actions); parent.refresh(); } },
    ], { width: 280, y: 90, onBack: () => App.stack.pop(this) });
    super('confirm-erase', 'Erase?', menu, { remark: 'Their records will be removed. I will remember anyway.' });
  }
}

const GRID = ['ABCDEFGHIJKLM', 'NOPQRSTUVWXYZ', 'abcdefghijklm', 'nopqrstuvwxyz', "0123456789 -'"];
const DEL = '<', END = '>';
const GRID_ROWS = [...GRID, `${DEL}${END}`];

/** Name entry: letter grid (stick, d-pad, click) plus direct typing, 8 characters max. */
export class NameEntryScreen {
  name = 'name-entry';
  cx = 0; cy = 0; text = '';
  vert = new NavRepeat(); horz = new NavRepeat();
  rects = [];
  constructor(slotIndex) { this.slot = slotIndex; }

  onOpen() {
    this.keyHandler = (e) => {
      if (e.repeat) return;
      if (e.key === 'Backspace') { this.del(); e.preventDefault(); return; }
      if (e.key.length === 1 && /[A-Za-z0-9 \-']/.test(e.key)) this.typed = e.key;
    };
    if (typeof window !== 'undefined') window.addEventListener('keydown', this.keyHandler);
  }
  onClose() { if (typeof window !== 'undefined') window.removeEventListener('keydown', this.keyHandler); }

  add(ch) { if (this.text.length < 8) { this.text += ch; App.sfx('menuMove'); } }
  del() { if (this.text.length) { this.text = this.text.slice(0, -1); App.sfx('menuBack'); } }
  finish() {
    const name = this.text.trim() || 'Guest';
    App.sfx('menuConfirm');
    App.stack.pop(this);
    App.stack.push(new AvatarPickScreen(this.slot, name));
  }
  pick() {
    const row = GRID_ROWS[this.cy];
    const ch = row[Math.min(this.cx, row.length - 1)];
    if (ch === DEL) this.del();
    else if (ch === END) this.finish();
    else this.add(ch);
  }

  update(ctx, dt) {
    const { input } = ctx;
    const uiDt = dt || 1 / 60;
    if (this.typed) {
      // Typing is direct, and these letters shouldn't also steer the grid this frame.
      this.add(this.typed);
      this.typed = null;
    } else {
      const usingDesk = App.device.last === 'keyboard';
      const dy = usingDesk ? (input.wasPressed('ArrowDown') ? 1 : input.wasPressed('ArrowUp') ? -1 : 0) : this.vert.step(navY(input), uiDt);
      if (dy) { this.cy = (this.cy + dy + GRID_ROWS.length) % GRID_ROWS.length; App.sfx('menuMove'); }
      const dx = usingDesk ? (input.wasPressed('ArrowRight') ? 1 : input.wasPressed('ArrowLeft') ? -1 : 0) : this.horz.step(navX(input), uiDt);
      if (dx) { const n = GRID_ROWS[this.cy].length; this.cx = (Math.min(this.cx, n - 1) + dx + n) % n; App.sfx('menuMove'); }
    }
    this.cx = Math.min(this.cx, GRID_ROWS[this.cy].length - 1);
    if (input.wasPressed('Enter')) this.finish();
    else if (input.wasPressed('PadCross')) this.pick();
    if (input.wasPressed('PadTriangle')) this.del();
    if (input.wasPressed('PadCircle') || input.wasPressed('Escape') || input.wasPressed('MouseRight')) { if (this.text.length && !input.wasPressed('Escape')) this.del(); else { App.sfx('menuBack'); App.stack.pop(this); } }
    const p = App.device.pointerArt(ctx);
    const hit = this.rects.find((r) => p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h);
    if (hit && App.device.moved > 0) { this.cx = hit.cx; this.cy = hit.cy; }
    if (hit && input.wasPressed('MouseLeft')) { this.cx = hit.cx; this.cy = hit.cy; this.pick(); }
  }

  draw(ctx) {
    const { hud } = ctx;
    dim(hud);
    heading(hud, 'Your name');
    const cx = Math.round(hud.width / 2);
    panel(hud, cx - 56, 34, 112, 18, { fill: 'white', name: 'name-box' });
    sayCentered(hud, cx, 38, `${this.text}${Math.floor(App.uiT * 2) % 2 ? '_' : ' '}`, { color: 'ink', shadow: false, name: 'name' });
    const cell = 18;
    const w = 13 * cell;
    const x0 = Math.round((hud.width - w) / 2);
    const y0 = 62;
    this.rects = [];
    GRID_ROWS.forEach((row, ry) => {
      [...row].forEach((ch, rx) => {
        const wide = ry === GRID_ROWS.length - 1;
        const x = x0 + rx * (wide ? cell * 3 : cell);
        const y = y0 + ry * (cell - 1);
        const cw = wide ? cell * 3 - 2 : cell - 2;
        const on = rx === this.cx && ry === this.cy;
        hud.rect(x, y, cw, cell - 3, on ? 'cyan' : 'navy');
        const label = ch === DEL ? 'Del' : ch === END ? 'Done' : ch;
        sayCentered(hud, x + cw / 2, y + 3, label, { color: on ? 'ink' : 'white', shadow: false, name: 'name-key' });
        this.rects.push({ cx: rx, cy: ry, x, y, w: cw, h: cell - 3 });
      });
    });
    promptBar(hud, App.device, App.device.last === 'keyboard' ? [['confirm', 'Done'], ['back', 'Back']] : [['confirm', 'Pick'], ['back', 'Delete']]);
  }
}

/** One of 6 preset avatars. The Locker Room changes it later. */
export class AvatarPickScreen extends MenuScreen {
  constructor(slotIndex, name) {
    const labels = ['Headband', 'Quiet One', 'Bun', 'Tall Hair', 'Side Part', 'Long Sleeves'];
    const menu = new Menu(labels.map((l, i) => ({ label: l, id: `look${i}`, action: () => this.start(i) })), { x: 12, width: 170, y: 50, onBack: () => App.stack.pop(this) });
    super('avatar-pick', 'Who are you', menu, { dim: false });
    this.slot = slotIndex; this.playerName = name;
  }
  get focusLook() { return PRESET_LOOKS[this.menu.focus]; }
  update(ctx, dt) { super.update(ctx, dt); App.scene?.previewLook?.(this.focusLook); }
  onOpen() { App.scene?.previewLook?.(this.focusLook); }
  onClose() { App.scene?.previewLook?.(null); }
  start(i) {
    App.store.create(this.slot, this.playerName, { ...PRESET_LOOKS[i] });
    App.continueWeek();
  }
}

/** Drop-In Class: any activity at once, all open, records only. */
export class DropInScreen extends MenuScreen {
  constructor() {
    const groups = ['pavilion', 'shed', 'beach', 'lagoon', 'gate'];
    const items = groups.map((g) => ({ label: STATIONS[g].name, id: g, action: () => App.stack.push(new DropInStation(g)) }));
    items.push({ label: 'The Long Stand', id: 'stand', action: () => App.go('activity', { id: 'stand', mode: 'dropin' }) });
    const menu = new Menu(items, { width: 340, y: 50, onBack: () => App.stack.pop(this) });
    super('dropin', 'Drop-In Class', menu, { remark: 'All open. Records only. Nobody is keeping score. I am keeping score.' });
  }
}

export class DropInStation extends MenuScreen {
  hard = false;
  constructor(group) {
    const ids = ACTIVITY_IDS.filter((a) => ACTIVITIES[a].station === group && !ACTIVITIES[a].hidden);
    const menu = new Menu([], { width: 410, y: 44, onBack: () => App.stack.pop(this) });
    super('dropin-station', STATIONS[group].name, menu);
    this.ids = ids;
    this.refresh();
  }
  refresh() {
    const records = App.store.data.dropin ?? {};
    const items = this.ids.map((id) => ({
      label: ACTIVITIES[id].name, id,
      stars: records[id]?.stars ?? 0,
      action: () => App.go('activity', { id, mode: 'dropin', hard: this.hard }),
    }));
    items.push({ label: 'Difficulty', id: 'hard', value: () => (this.hard ? 'Hard' : 'Standard'), adjust: () => { this.hard = !this.hard; }, action: () => { this.hard = !this.hard; } });
    this.menu.setItems(items);
  }
}

