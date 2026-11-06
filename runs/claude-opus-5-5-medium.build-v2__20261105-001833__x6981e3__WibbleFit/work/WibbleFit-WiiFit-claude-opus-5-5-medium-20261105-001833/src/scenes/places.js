// Sweat Jar, Hall of Numbers, Locker Room: one focal element each.
import { PALETTE, THREE, toonMaterial } from '../../pixel-engine.js';
import { App } from '../app.js';
import { makeAvatar } from '../art/avatar.js';
import { buildPlaza } from '../art/island.js';
import { place } from '../art/stage.js';
import { ACTIONS } from '../core/actions.js';
import { shownAge } from '../core/progress.js';
import { ACTIVITIES } from '../data/activities.js';
import { AVATARS, LOCKER } from '../data/classmates.js';
import { BARKS } from '../data/lines.js';
import { STATIONS } from '../data/stations.js';
import { ITEM_SLOTS, MILESTONES } from '../data/unlocks.js';
import { center, plateCenter, say, wrap } from '../ui/font.js';
import { Menu, pointerArt } from '../ui/menu.js';
import { promptBar } from '../ui/prompts.js';
import { bar, chart, panel, star, stars } from '../ui/widgets.js';
import { BaseScene } from './base.js';
const { CylinderGeometry, BoxGeometry, Mesh } = THREE;
const backTo = (k) => App.go('hub', { silent: true, at: [STATIONS[k].at[0], 0.1, STATIONS[k].at[1] + 3] });

export class JarScene extends BaseScene {
  id = 'jar'; t = 0;
  camera() { return { preset: 'fixed', position: [0, 2.6, 8.6], target: [0, 1.7, 0], fov: 30 }; }
  async build(ctx) {
    await buildPlaza(ctx, { jar: false }); App.music('evening');
    place(ctx, 'sweat-jar', 0, 0, 0, { actors: true, scale: 1.3 });
    const drips = App.slot?.drips ?? 0, f = Math.min(1, drips / 175);
    this.fluidGoal = Math.max(0.03, f * 2.75);
    this.fluid = new Mesh(new CylinderGeometry(1.25, 1.25, 1, 12), toonMaterial(PALETTE.sky)); this.fluid.position.y = 0.52; this.fluid.scale.y = 0.03; ctx.scene.add(this.fluid);
    this.hi = new Mesh(new BoxGeometry(0.12, 1, 0.06), toonMaterial(PALETTE.white)); this.hi.position.set(-0.72, 0, 1.06); ctx.scene.add(this.hi);
    ctx.particles.register('drip', { count: [1, 1], life: [0.6, 0.6], speed: [0, 0], gravity: 8, size: [2, 2], colors: ['cyan', 'sky'] });
    this.line = BARKS.jar[(App.slot?.milestones ?? 0) % BARKS.jar.length].replace('{n}', drips);
    App.say(this.line, 'ounce'); this.dripT = 0;
  }
  frame(ctx, dt, rdt, free) {
    this.t += rdt;
    const h = this.fluid.scale.y + (this.fluidGoal - this.fluid.scale.y) * Math.min(1, dt * 1.2);
    this.fluid.scale.y = h; this.fluid.position.y = 0.42 + h / 2; this.hi.scale.y = Math.max(0.01, h * 0.8); this.hi.position.y = 0.42 + h / 2;
    this.dripT -= dt; if (this.dripT <= 0) { this.dripT = 1.3; ctx.particles.burst('drip', [0, 3.5, 0]); App.sfx('jarDrip', { volume: 0.4 }); }
    if (free && (ctx.input.wasPressed(...ACTIONS.back) || (this.t > 0.3 && ctx.input.wasPressed(...ACTIONS.menuConfirm)))) backTo('jar');
  }
  draw(ctx, hud) {
    const s = App.slot, W = hud.width, H = hud.height, drips = s?.drips ?? 0;
    plateCenter(hud, 14, `${drips} Drips`, { scale: 3, color: 'cyan' });
    const next = MILESTONES.find((m) => m.at > drips) ?? null;
    const prev = [...MILESTONES].reverse().find((m) => m.at <= drips);
    if (next) { const w = Math.min(W - 60, 240); bar(hud, (W - w) / 2, 44, w, 8, (drips - (prev?.at ?? 0)) / (next.at - (prev?.at ?? 0)), 'sky'); plateCenter(hud, 57, `Next at ${next.at}: ${next.name}`, { color: 'white' }); }
    else plateCenter(hud, 44, 'The jar is as full as it gets. Please stop.', { color: 'white' });
    const ls = wrap(prev ? prev.remark : this.line, 52);
    ls.forEach((l, i) => plateCenter(hud, H - 44 + i * 10 - (ls.length - 1) * 10, l, { color: 'white' }));
    promptBar(hud, [['back', 'Back']]);
  }
  status() { return `jar | ${App.slot?.drips}`; }
}
export class RecordsScene extends BaseScene {
  id = 'records'; page = 0; t = 0; nav = { x: 0 };
  camera() { return { preset: 'fixed', position: [0, 2.4, 9], target: [0, 2.2, 0], fov: 30 }; }
  pages() { return ['chart', 'calendar', ...ACTIVITIES.map((a) => a.id)]; }
  async build(ctx) { await buildPlaza(ctx); App.music('still'); place(ctx, 'hall-board', 0, 0, -1, { actors: true, scale: 1.2 }); App.say('These are your numbers. I have kept them warm.', 'ounce'); }
  frame(ctx, dt, rdt, free) {
    this.t += rdt;
    if (!free) return;
    const i = ctx.input, n = this.pages().length; let d = 0;
    if (i.wasPressed(...ACTIONS.tabR, 'ArrowRight', 'KeyD', 'PadRight')) d = 1;
    if (i.wasPressed(...ACTIONS.tabL, 'ArrowLeft', 'KeyA', 'PadLeft')) d = -1;
    if (i.wheel) d = Math.sign(i.wheel);
    const sx = i.padAxis.x; if (Math.abs(sx) > 0.6 && !this.stick) { d = Math.sign(sx); this.stick = true; } else if (Math.abs(sx) < 0.3) this.stick = false;
    if (i.wasPressed('MouseLeft')) { const m = pointerArt(ctx); d = m.x > ctx.hud.width / 2 ? 1 : -1; }
    if (d) { this.page = (this.page + d + n) % n; App.sfx('menuMove'); }
    if (i.wasPressed(...ACTIONS.back)) backTo('hall');
  }
  draw(ctx, hud) {
    const W = hud.width, H = hud.height, s = App.slot, p = this.pages()[this.page], w = Math.min(W - 24, 340), x = (W - w) / 2, y = 14, h = H - 44;
    panel(hud, x, y, w, h, 'white', 'teal');
    if (p === 'chart') {
      center(hud, y + 6, 'Wobble Age', { scale: 2, color: 'teal', shadow: false });
      chart(hud, x + 10, y + 28, w - 20, h - 60, (s?.chart ?? []).slice(-7).map((v) => shownAge(s, v)));
      center(hud, y + h - 22, s?.confessed ? 'These are the true numbers. I checked.' : 'These numbers are correct. I checked.', { color: 'slate', shadow: false });
    } else if (p === 'calendar') {
      center(hud, y + 6, 'The Week', { scale: 2, color: 'teal', shadow: false });
      const cw = Math.floor((w - 24) / 7), cy = y + 40, day = s ? s.day : 1;
      for (let d = 1; d <= 7; d++) { const cx = x + 12 + (d - 1) * cw, done = s && (s.week > 1 || d < day), now = s && s.week === 1 && d === day; hud.rect(cx, cy, cw - 4, 40, now ? 'sand' : done ? 'lime' : 'mist'); say(hud, cx + cw / 2 - 5, cy + 4, String(d), { color: 'ink', shadow: false, scale: 2 }); if (done && s.chart[d - 1] !== undefined) say(hud, cx + 4, cy + 26, String(shownAge(s, s.chart[d - 1])), { color: 'ink', shadow: false }); }
      center(hud, cy + 56, s?.week > 1 ? `Week ${s.week}. You came back.` : `Day ${day}. One small day at a time.`, { color: 'slate', shadow: false });
    } else {
      const a = ACTIVITIES.find((q) => q.id === p), r = (s?.records ?? App.save.data.dropIn)[p];
      center(hud, y + 6, a.name, { color: 'teal', shadow: false, scale: a.name.length * 12 > w - 20 ? 1 : 2 });
      if (r) { center(hud, y + 34, String(Math.round(r.best)), { scale: 4, color: 'ink', shadow: false }); const sw = 66; for (let i = 0; i < 3; i++) star(hud, W / 2 - sw / 2 + i * 22, y + 72, i < r.stars, 2); center(hud, y + 96, `Played ${r.plays} time${r.plays === 1 ? '' : 's'}`, { color: 'slate', shadow: false }); }
      else center(hud, y + 50, 'Not yet attempted. I am not judging. I am.', { color: 'slate', shadow: false });
      const rv = a.rivals; const rows = [['Dennis', rv.dennis], ['June', rv.june], ['Marguerite', rv.marguerite]];
      rows.forEach(([n, v], i) => { say(hud, W / 2 - 60, y + 112 + i * 11, n, { color: 'ink', shadow: false }); const t = String(v); say(hud, W / 2 + 60 - t.length * 6, y + 112 + i * 11, t, { color: 'plum', shadow: false }); });
    }
    
    promptBar(hud, [['tabs', `Page ${this.page + 1}/${this.pages().length}`], ['back', 'Back']]);
    void stars;
  }
  status() { return `records | ${this.page}`; }
}
export class LockerScene extends BaseScene {
  id = 'locker'; spin = 0;
  camera() { return { preset: 'fixed', position: [1.3, 1.5, 5.6], target: [1.1, 0.95, 0], fov: 30 }; }
  async build(ctx) {
    this.ctx = ctx;
    await buildPlaza(ctx, { jar: false }); App.music('plaza');
    place(ctx, 'lockers', -1.8, 0, -1.6, { turn: 18 });
    this.tt = new Mesh(new CylinderGeometry(1, 1.05, 0.14, 12), toonMaterial(PALETTE.mist)); this.tt.position.set(0, 0.07, 0); ctx.scene.add(this.tt);
    await this.rebuild();
    App.say('Change whatever you like. I will still know.', 'ounce');
    this.buildMenu();
  }
  look() { const s = App.slot; if (s && !s.look.equipped) s.look.equipped = []; return s ? s.look : { ...AVATARS[0], equipped: [] }; }
  async rebuild() {
    if (this.a) { this.a.root.visible = false; this.a.shadow.visible = false; this.ctx.scene.remove(this.a.root, this.a.shadow); }
    const look = this.look();
    this.a = await makeAvatar(this.ctx, { ...look, items: look.equipped, bun: look.style === 'bun' });
    this.a.setAt(0, 0.14, 0, this.spin); this.a.groundY = 0.14; this.a.play('Idle');
  }
  cycle(k, list, d) { const l = this.look(), i = list.indexOf(l[k] ?? (k === 'headband' ? 'none' : list[0])); l[k] = list[(i + d + list.length) % list.length]; if (k === 'style') l.bun = l.style === 'bun'; App.writeSave(); this.rebuild(); }
  buildMenu() {
    const s = App.slot, row = (label, k) => ({ label, value: () => this.look()[k] ?? (k === 'headband' ? 'none' : LOCKER[k][0]), adjust: (d) => this.cycle(k, LOCKER[k], d) });
    const items = [row('Skin', 'skin'), row('Hair style', 'style'), row('Hair colour', 'hair'), row('Top', 'top'), row('Bottom', 'bottom'), row('Headband', 'headband')];
    for (const it of s?.items ?? []) items.push({ label: ITEM_SLOTS[it], value: () => (this.look().equipped.includes(it) ? 'Worn' : 'Off'), on: () => this.toggle(it), adjust: () => this.toggle(it) });
    items.push({ label: 'Done', on: () => backTo('locker') });
    this.menu = new Menu({ title: 'Locker Room', items, onBack: () => backTo('locker'), scale: 1, rowH: 14, maxRows: 8, x: null, w: 200 });
  }
  toggle(it) { const e = this.look().equipped, i = e.indexOf(it); if (i >= 0) e.splice(i, 1); else e.push(it); App.writeSave(); this.rebuild(); }
  frame(ctx, dt, rdt, free) {
    this.spin += dt * 0.6; if (this.a) { this.a.root.rotation.y = this.spin; this.a.update(dt); }
    if (free) this.menu?.update(ctx, rdt);
  }
  draw(ctx, hud) { if (!this.menu) return; this.menu.x = hud.width - 212; this.menu.draw(hud); promptBar(hud, [['adjust', 'Change'], ['back', 'Back']]); }
  status() { return `locker | ${JSON.stringify(this.look()).length}`; }
}
