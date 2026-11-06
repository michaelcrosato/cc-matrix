// Sweat Jar, Locker Room and Hall of Numbers: one focal element each.
import { BaseScene } from './base.js';
import { place, tileFloor, slab } from '../art/world.js';
import { makeAvatar, playerLook, PLAYER_LOOKS, SKINS, HAIR_COLORS, HAIR_STYLES, TOPS, BOTTOMS, HEADBANDS } from '../art/avatar.js';
import { Menu, Tabs, panel, bar, drawStars, layoutLog, inRect } from '../ui/widgets.js';
import { drawChart } from '../ui/chart.js';
import { say, sayWrapped } from '../ui/font.js';
import { drawPrompts } from '../ui/prompts.js';
import { MILESTONES, JAR_MAX, isUnlocked, unlockedAt } from '../data/unlocks.js';
import { ACTIVITIES, ACT_ORDER } from '../data/activities.js';
import { recordsFor } from '../data/classmates.js';
import { key as recKey } from '../core/progress.js';
import { dayLabel } from './labels.js';
import { applySky, skyAt, THREE, toonMaterial, PALETTE } from '../../pixel-engine.js';

export class StationBase extends BaseScene {
  get S() { return this.app.slot; }
  back() { this.app.go('hub', { spawn: this.spawn }); }
  tick(ctx, dt, blocked) { this.world?.(dt); if (!blocked && this.app.nav.back) { this.app.sfx('back'); this.back(); } }
}

export class JarScene extends StationBase {
  static id = 'jar';
  static camera = { preset: 'fixed', position: [0, 3.2, 14.5], target: [0, 2.3, 0], fov: 30 };
  constructor(app, args) { super(app, args); this.spawn = [4, 0, -1]; this.shown = 0; this.phase = 'jar'; }
  async build(ctx) {
    const S = this.S; applySky(ctx.engine, skyAt(11));
    tileFloor(ctx, 14, 10, [0, 0, 0]); slab(ctx, [40, 0.2, 14], [0, -0.1, -9], 'cyan');
    const j = place(ctx, 'sweat-jar', [0, 0, 0], { scale: 1.6 }); this.jar = j.object;
    const frac = Math.min(1, S.drips / JAR_MAX), H = 2.0 * 1.6;
    this.H = H;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.96 * 1.6, 0.96 * 1.6, 1, 12), toonMaterial(PALETTE.sky));
    this.fluid = m; ctx.scene.add(m); this.fluidFrac = 0; this.target = frac;
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.1), toonMaterial(PALETTE.white)); hl.position.set(0.9 * 1.6, 0, 0.6 * 1.6); this.hl = hl; ctx.scene.add(hl);
    this.ounce = place(ctx, 'ounce', [3.6, 0, 1.2], { scale: 1.3 }).object;
    this.menu = new Menu(MILESTONES.map((ms) => ({ label: ms.name, value: () => (S.drips >= ms.at ? 'Unlocked' : `${ms.at}`), disabled: S.drips < ms.at, focusable: true, onSelect: () => this.bark('ounce', ms.remark) })), { w: 240, rowH: 14, maxRows: 7, x: 10, y: 38, name: 'jar-list', onMove: () => this.app.sfx('move', { volume: 0.4 }) });
    this.app.music('plaza'); this.setFluid(0);
    this.bark('ounce', 'Every drip is a minute of you. I did not make that up. I counted.');
  }
  setFluid(f) { const h = Math.max(0.02, f * this.H * 0.9); this.fluid.scale.y = h; this.fluid.position.set(0, 0.3 * 1.6 + h / 2, 0); this.hl.scale.y = Math.max(0.01, h * 0.9); this.hl.position.y = 0.3 * 1.6 + h / 2; }
  tick(ctx, dt, blocked) {
    this.fluidFrac += (this.target - this.fluidFrac) * Math.min(1, dt * 1.5); this.setFluid(this.fluidFrac);
    this.ounce.position.y = Math.abs(Math.sin(this.t * 2)) * 0.1;
    if (!blocked) { this.menu.update(this.app.nav); if (this.app.nav.back) { this.app.sfx('back'); this.back(); } }
  }
  draw(hud) {
    const S = this.S, w = hud.width;
    say(hud, w - 14, 12, `${S.drips}`, { anchor: 'r', scale: 5, color: 'sky', shadow: 'navy' });
    say(hud, w - 14, 46, `Drips of ${JAR_MAX}`, { anchor: 'r', color: 'white' });
    say(hud, 10, 12, 'The Sweat Jar', { scale: 2, color: 'white', shadow: 'navy' });
    this.menu.draw(hud);
    drawPrompts(this.app, hud, [['select', 'Look'], ['back', 'Back']]);
  }
  status() { return `jar | drips ${this.S.drips}`; }
}

const CATS = {
  Body: [['Skin', 'skin', SKINS], ['Hair style', 'style', HAIR_STYLES], ['Hair colour', 'hair', HAIR_COLORS], ['Headband', 'headband', HEADBANDS]],
  Clothes: [['Top', 'top', TOPS], ['Bottoms', 'bottom', BOTTOMS], ['Shoes', 'shoe', ['white', 'ink', 'sand', 'sky']], ['Towel cape', 'cape', [false, true]], ['Badge', 'badge', [false, true]]],
};
const UNLOCK_KEY = { headband: 'headband', top: 'top', bottom: 'bottom', shoe: 'shoe', hair: 'hair', cape: 'cape', badge: 'badge' };
export class LockerScene extends StationBase {
  static id = 'locker';
  static camera = { preset: 'fixed', position: [0, 1.8, 5], target: [0, 1.0, 0], fov: 30 };
  constructor(app, args) { super(app, args); this.spawn = [-4, 0, -2]; this.tabs = new Tabs(Object.keys(CATS)); this.phase = 'locker'; this.idx = {}; }
  async build(ctx) {
    const S = this.S; applySky(ctx.engine, skyAt(10));
    tileFloor(ctx, 12, 8, [0, 0, 0]); slab(ctx, [30, 0.2, 10], [0, -0.1, -8], 'cyan');
    place(ctx, 'lockers', [0, 0, -2.6], { scale: 1.2 });
    this.disc = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.12, 14), toonMaterial(PALETTE.white)); this.disc.position.y = 0.06; ctx.scene.add(this.disc);
    this.look = { ...playerLook(S) }; this.look.cape = this.look.cape ?? false; this.look.badge = this.look.badge ?? false;
    await this.rebuild();
    this.makeMenus();
    this.app.music('plaza');
    this.bark('ounce', 'Change into something less noted.');
  }
  async rebuild() {
    if (this.av) { this.ctx.scene.remove(this.av.root, this.av.shadow); }
    this.av = await makeAvatar(this.ctx, this.look); this.av.setPos(0, 0.12, 0, 0); this.av.addTo(this.ctx.scene); this.av.play('Idle');
  }
  unlocked(field, v) {
    const S = this.S; if (v === false || v === null || v === 'cape' || field === 'cape') return field !== 'cape' || (v === false) || S.drips >= 25;
    return true;
  }
  isOpen(field, v) {
    const d = this.S.drips; const kind = UNLOCK_KEY[field]; if (!kind) return true;
    if (field === 'cape') return v === false || d >= 25; if (field === 'badge') return v === false || d >= 45;
    const m = MILESTONES.find((x) => x.kind === (field === 'hair' ? 'hair' : field) && x.value === v);
    return !m || d >= m.at;
  }
  makeMenus() {
    this.menus = Object.fromEntries(Object.entries(CATS).map(([tab, rows]) => [tab, new Menu(rows.map(([label, field, opts]) => ({
      label, kind: 'choice', options: opts.map((o) => String(o === true ? 'On' : o === false ? 'Off' : o ?? 'None')),
      get: () => { const cur = this.look[field] ?? (field === 'style' ? 'cap' : null); const i = opts.indexOf(cur); return i < 0 ? 0 : i; },
      set: (i) => { if (!this.isOpen(field, opts[i])) { this.app.sfx('deny'); this.bark('ounce', 'That one is in the Jar. Fill the Jar.'); return; } this.look[field] = opts[i]; this.pending = true; },
    })), { w: 250, rowH: 20, name: 'locker-' + tab, x: 10, y: 58, onMove: () => this.app.sfx('move', { volume: 0.4 }) })]));
  }
  tick(ctx, dt, blocked) {
    this.disc.rotation.y += dt * 0.6; this.av.root.rotation.y += dt * 0.6; this.av.update(dt);
    if (this.pending) { this.pending = false; this.rebuild().then(() => { this.av.root.rotation.y = this.disc.rotation.y; }); }
    if (blocked) return;
    const nav = this.app.nav; this.tabs.update(nav); if (nav.tabL || nav.tabR) nav.confirm = false;
    this.menus[Object.keys(CATS)[this.tabs.i]].update(nav);
    if (nav.back || nav.rclick) { this.S.look = { ...this.look }; this.app.commit(); this.app.sfx('back'); this.back(); }
  }
  draw(hud) {
    this.tabs.draw(hud, 10, 38, 250);
    say(hud, 10, 12, 'Locker Room', { scale: 2, color: 'white', shadow: 'navy' });
    this.menus[Object.keys(CATS)[this.tabs.i]].draw(hud);
    drawPrompts(this.app, hud, [['tabs', 'Tab'], ['select', 'Change'], ['back', 'Done']]);
  }
  status() { return `locker | ${JSON.stringify(this.look).slice(0, 80)}`; }
}

export class RecordsScene extends StationBase {
  static id = 'records';
  static camera = { preset: 'fixed', position: [0, 2.4, 8], target: [0, 1.8, 0], fov: 30 };
  constructor(app, args) { super(app, args); this.spawn = [0, 0, -5]; this.page = 0; this.phase = 'records'; this.hard = false; }
  get pages() { return 2 + ACT_ORDER.length; }
  async build(ctx) {
    applySky(ctx.engine, skyAt(11));
    tileFloor(ctx, 14, 8, [0, 0, 0]); slab(ctx, [40, 0.2, 14], [0, -0.1, -9], 'cyan');
    place(ctx, 'hall-board', [0, 0, -1], { scale: 1.3 });
    this.app.music('plaza');
  }
  tick(ctx, dt, blocked) {
    if (blocked) return; const nav = this.app.nav;
    if (nav.tabR || nav.right) { this.page = (this.page + 1) % this.pages; this.app.sfx('move'); }
    if (nav.tabL || nav.left) { this.page = (this.page + this.pages - 1) % this.pages; this.app.sfx('move'); }
    if (nav.triangle) { this.hard = !this.hard; this.app.sfx('confirm', { volume: 0.5 }); }
    if (nav.wheel) this.page = (this.page + (nav.wheel > 0 ? 1 : this.pages - 1)) % this.pages;
    if (nav.back || nav.rclick) { this.app.sfx('back'); this.back(); }
  }
  draw(hud) {
    const S = this.S, w = hud.width, pw = Math.min(w - 24, 320), x = Math.floor((w - pw) / 2), y = 12, h = 160;
    if (this.page === 0) {
      drawChart(hud, x, y, pw, h, S.ages ?? []);
      say(hud, w / 2, y + h + 6, 'Wobble Age, by day', { anchor: 'c', color: 'white' });
    } else if (this.page === 1) {
      panel(hud, x, y, pw, h);
      say(hud, w / 2, y + 8, 'Calendar', { anchor: 'c', scale: 2, color: 'teal', shadow: false });
      const log = S.log ?? [];
      for (let d = 1; d <= 7; d++) {
        const cx = x + 16 + ((d - 1) % 4) * 74, cy = y + 36 + Math.floor((d - 1) / 4) * 54, e = log[d - 1], cur = S.day === d;
        hud.rect(cx, cy, 66, 46, cur ? 'cyan' : 'mist'); say(hud, cx + 4, cy + 4, `Day ${d}`, { color: 'ink', shadow: false });
        if (e) { say(hud, cx + 4, cy + 18, `${e.drips} drips`, { color: 'blue', shadow: false }); say(hud, cx + 4, cy + 30, `${e.stars} stars`, { color: 'orange', shadow: false }); }
        else if (cur) say(hud, cx + 4, cy + 18, 'Today', { color: 'teal', shadow: false });
      }
    } else {
      const id = ACT_ORDER[this.page - 2], A = ACTIVITIES[id], k = recKey(id, this.hard);
      panel(hud, x, y, pw, h);
      say(hud, w / 2, y + 8, A.name, { anchor: 'c', scale: A.name.length > 18 ? 1 : 2, color: 'teal', shadow: false });
      const best = S.best[k]; const stars = S.stars[k] ?? 0;
      drawStars(hud, Math.floor(w / 2 - 33), y + 28, stars, 3, { big: true });
      say(hud, w / 2, y + 46, best != null ? `${best}${A.unit}` : '---', { anchor: 'c', scale: 3, color: 'ink', shadow: false });
      say(hud, w / 2, y + 74, `${this.hard ? 'Hard' : 'Normal'}   played ${S.played[id] ?? 0} times`, { anchor: 'c', color: 'slate', shadow: false });
      recordsFor(id).forEach((c, i) => {
        const beat = best != null && best > c.score;
        say(hud, x + 20, y + 96 + i * 14, c.name, { color: 'ink', shadow: false }); say(hud, x + pw - 20, y + 96 + i * 14, `${c.score}${beat ? '  beaten' : ''}`, { anchor: 'r', color: beat ? 'green' : 'slate', shadow: false });
      });
    }
    say(hud, w / 2, y + h + 20, `${this.page + 1} / ${this.pages}`, { anchor: 'c', color: 'mist' });
    say(hud, 12, 4, '', {});
    drawPrompts(this.app, hud, [['tabs', 'Page'], ['back', 'Back']]);
  }
  status() { return `records | page ${this.page}`; }
}

export class AnimViewerScene extends StationBase {
  static id = 'animviewer';
  static camera = { preset: 'fixed', position: [0, 1.8, 4.6], target: [0, 1.0, 0], fov: 30 };
  constructor(app, args) { super(app, args); this.i = 0; this.phase = 'anim'; }
  async build(ctx) {
    applySky(ctx.engine, skyAt(10)); tileFloor(ctx, 10, 8, [0, 0, 0]); slab(ctx, [30, 0.2, 10], [0, -0.1, -8], 'cyan');
    this.av = await makeAvatar(ctx, playerLook(this.S ?? null)); this.av.setPos(0, 0, 0, 0.3); this.av.addTo(ctx.scene);
    this.names = Object.keys(this.av.clips.map); this.set(0);
  }
  set(i) { this.i = (i + this.names.length) % this.names.length; this.av.play(this.names[this.i], { fade: 0.1, restart: true }); }
  tick(ctx, dt, blocked) {
    this.av.update(dt);
    if (blocked) return; const nav = this.app.nav;
    if (nav.right || nav.tabR) this.set(this.i + 1); if (nav.left || nav.tabL) this.set(this.i - 1); if (nav.down) this.set(this.i + 10); if (nav.up) this.set(this.i - 10);
    if (nav.back || nav.rclick) { this.app.sfx('back'); this.app.go('title', { menu: true }); }
  }
  draw(hud) {
    say(hud, hud.width / 2, 12, 'Animation viewer', { anchor: 'c', scale: 2, color: 'white', shadow: 'navy' });
    say(hud, hud.width / 2, 36, `${this.names[this.i]}   ${this.i + 1} / ${this.names.length}`, { anchor: 'c', color: 'sand' });
    drawPrompts(this.app, hud, [['select', 'Clip'], ['back', 'Back']]);
  }
  status() { return `animviewer | ${this.names?.[this.i]}`; }
}
