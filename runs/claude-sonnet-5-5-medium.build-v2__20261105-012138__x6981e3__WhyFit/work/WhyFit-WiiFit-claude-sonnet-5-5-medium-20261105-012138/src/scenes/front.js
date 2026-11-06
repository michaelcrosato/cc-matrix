// Title, main menu, guest slots, name entry, avatar choice and Drop-In picker: one scene over the plaza.
import { BaseScene } from './base.js';
import { buildIsland, place } from '../art/world.js';
import { makeAvatar, PLAYER_LOOKS } from '../art/avatar.js';
import { Menu, panel, drawStars, layoutLog } from '../ui/widgets.js';
import { say, wrap, sayWrapped } from '../ui/font.js';
import { drawPrompts } from '../ui/prompts.js';
import { SettingsScreen } from '../ui/screens/settings.js';
import { AboutScreen } from '../ui/screens/about.js';
import { NameEntry } from '../ui/screens/nameentry.js';
import { TITLE, TAGLINE } from '../data/title.js';
import { MISC } from '../data/lines.js';
import { ACTIVITIES, ACT_ORDER, HARD_DAY } from '../data/activities.js';
import { newSlot } from '../core/save.js';
import { THREE } from '../../pixel-engine.js';

class SlotsScreen {
  id = 'slots'; blocks = true; attractOK = true;
  constructor(app, front) {
    this.app = app; this.front = front; this.confirmDel = -1;
    this.items = [0, 1, 2].map((i) => ({
      label: () => { const s = app.save.slot(i); return s ? `Guest ${i + 1}: ${s.name}` : `Guest ${i + 1}: empty`; },
      value: () => { const s = app.save.slot(i); return s ? (s.week2 ? 'Week 2' : `Day ${s.day}`) : 'New week'; },
      onSelect: () => this.pick(i),
    }));
    this.menu = new Menu(this.items, { w: 260, rowH: 22, title: 'The Week', name: 'slots', onMove: () => app.sfx('move', { volume: 0.4 }), onChange: () => app.sfx('confirm', { volume: 0.5 }) });
  }
  pick(i) {
    const s = this.app.save.slot(i);
    if (s) { this.scene.pop(); this.front.continueWeek(i); } else { this.scene.pop(); this.front.newWeek(i); }
  }
  update(nav) {
    if (this.confirmDel >= 0) {
      if (nav.confirm || nav.click) { this.app.save.data.slots[this.confirmDel] = null; this.app.save.write(); this.confirmDel = -1; this.app.sfx('back'); }
      else if (nav.back || nav.rclick) this.confirmDel = -1;
      return;
    }
    this.menu.update(nav);
    if (nav.triangle && this.app.save.slot(this.menu.focus)) { this.confirmDel = this.menu.focus; this.app.sfx('deny'); }
    if (nav.back || nav.rclick) { this.app.sfx('back'); this.scene.pop(); }
  }
  draw(hud) {
    this.menu.draw(hud);
    if (this.confirmDel >= 0) {
      const w = 220, x = (hud.width - w) / 2, y = hud.height / 2 - 24;
      panel(hud, x, y, w, 48, { edge: 'red' });
      say(hud, hud.width / 2, y + 10, 'Delete this guest? Ounce will keep a copy.', { anchor: 'c', color: 'ink', shadow: false });
      say(hud, hud.width / 2, y + 28, 'Confirm to delete. Back to keep.', { anchor: 'c', color: 'slate', shadow: false });
    }
    drawPrompts(this.app, hud, this.confirmDel >= 0 ? [['confirm', 'Delete'], ['back', 'Keep']] : [['confirm', 'Choose'], ['triangle', 'Delete'], ['back', 'Back']]);
  }
}
class DropInScreen {
  id = 'dropin'; blocks = true; attractOK = true;
  constructor(app, front) {
    this.app = app; this.front = front; this.hard = false;
    const rec = (id) => app.save.records[id + (this.hard ? ':hard' : '')];
    const items = ACT_ORDER.map((id) => ({
      label: ACTIVITIES[id].name,
      value: () => { const r = rec(id); return r ? `${'*'.repeat(r.stars)}${'-'.repeat(3 - r.stars)} ${r.score}` : '---'; },
      onSelect: () => { this.scene.pop(); app.go('activity', { id, hard: this.hard, dropIn: true }); },
      hint: ACTIVITIES[id].name,
    }));
    this.menu = new Menu(items, { w: 300, rowH: 17, maxRows: 8, title: 'Drop-In Class', name: 'dropin', onMove: () => app.sfx('move', { volume: 0.4 }), onChange: () => app.sfx('confirm', { volume: 0.5 }) });
  }
  update(nav) {
    this.menu.update(nav);
    if (nav.triangle) { this.hard = !this.hard; this.app.sfx('confirm', { volume: 0.5 }); }
    if (nav.back || nav.rclick) { this.app.sfx('back'); this.scene.pop(); }
  }
  draw(hud) {
    this.menu.draw(hud);
    say(hud, hud.width / 2, hud.height - 50, this.hard ? 'Hard version' : 'Normal version', { anchor: 'c', color: this.hard ? 'orange' : 'white' });
    drawPrompts(this.app, hud, [['confirm', 'Play'], ['triangle', 'Hard / normal'], ['back', 'Back']]);
  }
}
class AvatarPick {
  id = 'avatar'; blocks = true; attractOK = true;
  constructor(app, front, onDone) { this.app = app; this.front = front; this.onDone = onDone; this.i = 0; }
  onOpen() { this.front.showAvatar(this.i); }
  update(nav) {
    if (nav.left) { this.i = (this.i + 5) % 6; this.front.showAvatar(this.i); this.app.sfx('move'); }
    if (nav.right) { this.i = (this.i + 1) % 6; this.front.showAvatar(this.i); this.app.sfx('move'); }
    if (nav.confirm || nav.click) { this.app.sfx('confirm'); this.scene.pop(); this.front.hideAvatars(); this.onDone(this.i); }
    if (nav.back || nav.rclick) { this.app.sfx('back'); this.scene.pop(); this.front.hideAvatars(); }
  }
  draw(hud) {
    say(hud, hud.width / 2, 28, 'Pick someone to be', { anchor: 'c', scale: 2, color: 'white', shadow: 'navy' });
    say(hud, hud.width / 2, 52, `${this.i + 1} / 6`, { anchor: 'c', color: 'white' });
    drawPrompts(this.app, hud, [['select', 'Look'], ['confirm', 'This one'], ['back', 'Back']]);
  }
}

export class FrontScene extends BaseScene {
  static id = 'title';
  static camera = { preset: 'fixed', position: [1.5, 3.6, 15], target: [-0.6, 1.5, 3], fov: 36 };
  constructor(app, args) { super(app, args); this.mode = args.menu ? 'menu' : 'title'; this.attractOK = true; this.avatars = []; this.hint = 0; this.menuT = 0; }
  async build(ctx) {
    this.world = buildIsland(ctx);
    const m = place(ctx, 'ounce', [-1.4, 0, 6.6], { scale: 1.7 });
    this.ounce = m.object; this.needle = this.ounce.getObjectByName('needle'); this.face = this.ounce.getObjectByName('face');
    this.kevin = place(ctx, 'kevin', [4.1, 3.1, 0.2], { scale: 0.8 }).object; this.kevin.position.set(-6, 3.55, 0);
    ctx.engine.setSunDirection?.([0.4, 0.8, 0.5]);
    this.buildMenu();
    this.app.music('plaza');
    if (this.mode === 'menu') this.phase = 'menu'; else this.phase = 'title';
  }
  buildMenu() {
    const app = this.app;
    this.menu = new Menu([
      { label: 'The Week', onSelect: () => this.push(new SlotsScreen(app, this)), hint: 'Seven short days. One scale. Many remarks.' },
      { label: 'Drop-In Class', onSelect: () => this.push(new DropInScreen(app, this)), hint: 'Any activity, all open. Records only. No Drips, no story.' },
      { label: 'Family Hour', onSelect: () => app.go('join'), hint: 'One to four players on this screen. Pads and a keyboard.' },
      { label: 'Settings', onSelect: () => this.push(new SettingsScreen(app)) },
      { label: 'About and Credits', onSelect: () => this.push(new AboutScreen(app)) },
    ], { w: 210, rowH: 19, name: 'main', hint: true, y: 60, onMove: () => app.sfx('move', { volume: 0.4 }), onChange: () => app.sfx('confirm', { volume: 0.5 }) });
    for (const o of [SettingsScreen, AboutScreen]) o.prototype.attractOK = true;
  }
  async showAvatar(i) {
    if (!this.avatars.length) {
      this.avatars = [null];
      const list = [];
      for (const look of PLAYER_LOOKS) { const a = await makeAvatar(this.ctx, look); a.setPos(1.4, 0, 5.6, -0.25); a.play('Idle'); a.addTo(this.ctx.scene); a.root.visible = false; a.shadow.visible = false; list.push(a); }
      this.avatars = list;
    }
    this.cur = i;
    this.avatars.forEach((a, k) => { if (a) { a.root.visible = k === i; a.shadow.visible = k === i; } });
  }
  hideAvatars() { this.avatars.forEach((a) => { if (a) { a.root.visible = false; a.shadow.visible = false; } }); }
  newWeek(i) {
    this.push(new NameEntry(this.app, (name) => {
      if (!name) return;
      const pick = new AvatarPick(this.app, this, (av) => { const S = newSlot(name, av); S.look = null; this.app.openSlot(i, S); this.app.go('ferry', {}); });
      this.push(pick); pick.onOpen();
    }, ''));
  }
  continueWeek(i) {
    const S = this.app.openSlot(i);
    if (S.ended && !S.week2) { S.week2 = true; }
    this.app.go(S.phase === 'new' || !S.intro ? 'ferry' : 'hub', {});
  }
  tick(ctx, dt, blocked) {
    const nav = this.app.nav, app = this.app;
    // Ounce hops and fidgets
    const t = this.t;
    const hop = Math.abs(Math.sin(t * 2.4)) * 0.22;
    this.ounce.position.y = hop; this.ounce.rotation.y = Math.sin(t * 0.7) * 0.25;
    this.ounce.scale.y = 1.5 * (1 + (hop < 0.03 ? -0.06 : 0.04));
    if (this.needle) this.needle.rotation.y = Math.PI + Math.sin(t * 3) * 0.5 + (this.mode === 'menu' ? 0.2 : 0);
    if (this.face) this.face.rotation.x = (72 * Math.PI) / 180 + Math.sin(t * 1.3) * 0.08;
    this.kevin.position.y = 3.55 + Math.sin(t * 1.1) * 0.03;
    this.world.update(dt);
    this.avatars.forEach((a) => a?.root.visible && a.update(dt));
    if (blocked) return;
    if (this.mode === 'title') {
      const touchMsg = app.touchOnly && !app.device.padConnected;
      if (!touchMsg && (nav.any || nav.confirm || nav.pause || app.device.anyInput === app.device.frame)) { this.mode = 'menu'; this.phase = 'menu'; app.sfx('confirm'); app.music('plaza'); return; }
      if (touchMsg && app.touchTapped) { app.touchTapped = false; app.device.idle = 0; }
    } else {
      this.menu.update(nav);
      if (nav.back && false) this.mode = 'title';
    }
  }
  draw(hud) {
    const w = hud.width;
    const sc = Math.max(2, Math.min(5, Math.floor((w - 24) / (6 * TITLE.length))));
    say(hud, w / 2, this.mode === 'title' ? 24 : 12, TITLE, { anchor: 'c', scale: this.mode === 'title' ? sc : Math.max(2, sc - 1), color: 'white', shadow: 'navy' });
    if (this.mode === 'title') {
      hud.rect(w / 2 - Math.floor(TAGLINE.length * 3) - 6, 24 + 7 * sc + 6, TAGLINE.length * 6 + 10, 14, 'night'); say(hud, w / 2, 24 + 7 * sc + 9, TAGLINE, { anchor: 'c', color: 'sand' });
      const touchMsg = this.app.touchOnly && !this.app.device.padConnected;
      if (touchMsg) {
        const lines = wrap(MISC.touchMsg, Math.min(w - 24, 300), 1);
        const h = lines.length * 10 + 12;
        panel(hud, 12, hud.height / 2 - h / 2, w - 24, h, { fill: 'night', edge: 'orange' });
        lines.forEach((l, i) => say(hud, w / 2, hud.height / 2 - h / 2 + 7 + i * 10, l, { anchor: 'c', color: 'white' }));
      } else if (Math.floor(this.t * 1.6) % 2 === 0) {
        hud.rect(0, hud.height - 38, w, 20, 'night');
        say(hud, w / 2, hud.height - 33, MISC.titleHint, { anchor: 'c', color: 'white', scale: 1 });
      }
    } else if (!this.stack.length) {
      this.menu.o.x = Math.floor(w - 210 - Math.max(18, w * 0.07)); this.menu.o.y = 52;
      this.menu.draw(hud);
      drawPrompts(this.app, hud, [['confirm', 'Select'], ['select', 'Move']]);
    }
  }
  status() { return `title | ${this.mode} | t ${this.t.toFixed(1)}`; }
  extraState() { return { mode: this.mode }; }
}
